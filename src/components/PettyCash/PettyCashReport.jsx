// src/components/PettyCash/PettyCashReport.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import firebaseDB from "../../firebase";
import { Tabs, Tab } from "react-bootstrap";
import * as XLSX from "xlsx";
import { useAuth } from "../../context/AuthContext";

/**
 * PettyCashReport.jsx (Updated)
 * - Added Main Category column after Date
 * - Added Time below Date
 * - Removed Action TH and TD
 * - Added username in Source
 * - Enhanced modal with cards and styling
 * - Added admin dropdown for status management
 * - Added comment system with user tracking
 */

function parseDateString(input) {
  if (!input) return null;
  if (input instanceof Date && !isNaN(input)) return input;
  const native = new Date(input);
  if (!isNaN(native)) return native;
  const m = String(input).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const dd = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    let yyyy = parseInt(m[3], 10);
    if (yyyy < 100) yyyy = 2000 + yyyy;
    const d = new Date(yyyy, mm - 1, dd);
    if (!isNaN(d)) return d;
  }
  const m2 = String(input).match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m2) {
    const yyyy = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    const dd = parseInt(m[3], 10);
    const d = new Date(yyyy, mm - 1, dd);
    if (!isNaN(d)) return d;
  }
  return null;
}

// ✅ Ensure India timezone date handling & remove undefined refs
function formatIST(dateString) {
  try {
    const d = new Date(dateString);
    return isNaN(d)
      ? ""
      : d.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
  } catch {
    return "";
  }
}


const monthsList = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function looksLikeRecord(obj) {
  if (!obj || typeof obj !== "object") return false;
  const keys = Object.keys(obj);
  const hints = ["date", "description", "price", "total", "mainCategory", "subCategory", "approval", "comments", "quantity", "employeeName", "createdAt"];
  return keys.some(k => hints.includes(k));
}

function flattenRecords(node, keyPath = []) {
  const out = [];
  if (!node || typeof node !== "object") return out;
  if (looksLikeRecord(node)) {
    const relPath = keyPath.join("/");
    const idGuess = keyPath[keyPath.length - 1] || Math.random().toString(36).slice(2);
    out.push({ id: idGuess, _relPath: relPath, ...node });
    return out;
  }
  Object.entries(node).forEach(([k, v]) => {
    if (v && typeof v === "object") out.push(...flattenRecords(v, [...keyPath, k]));
  });
  return out;
}

function normPath(p) {
  return String(p || "").replace(/\/+/g, "/").replace(/\/$/, "").replace(/^\//, "");
}

export default function PettyCashReport({ effectiveName: propUser, effectiveRole: propRole, approverDirectory: propApproverDir } = {}) {
  const [data, setData] = useState([]);
  const [activeYear, setActiveYear] = useState(String(new Date().getFullYear()));
  const [activeMonth, setActiveMonth] = useState("");
  const [search, setSearch] = useState("");
  const [mainCategory, setMainCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusTab, setStatusTab] = useState("All");

  // Action modal
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState(""); // Rejected | Clarification | Delete
  const [actionText, setActionText] = useState("");
  const [actionItem, setActionItem] = useState(null);

  // Details modal
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsItem, setDetailsItem] = useState(null);

  // Category accordion state
  const [collapsedCats, setCollapsedCats] = useState({});

  // Admin dropdown state
  const [adminAction, setAdminAction] = useState("");
  const [adminComment, setAdminComment] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState("all");

  const tableRef = useRef(null);
  // === Resolve current user & roles dynamically ===
  const { user: authUser } = useAuth?.() || {};
  const [usersDir, setUsersDir] = useState([]);

  const [selectedIds, setSelectedIds] = useState(new Set());
  // small lookup helpers for avatars
  const userIndexByName = useMemo(() => {
    const m = new Map();
    usersDir.forEach(u => m.set(String(u.name || "").trim(), u));
    return m;
  }, [usersDir]);

  const avatarFor = (name) => {
    const u = userIndexByName.get(String(name || "").trim());
    // Try many common photo fields
    return u?.photoURL || u?.photoUrl || u?.avatar || u?.image || u?.photo || u?.picture || null;
  };


  const Avatar = ({ name, size = 22, className = "" }) => {
    const url = avatarFor(name);
    const initials = String(name || "")
      .split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase() || "U";
    return url ? (
      <img
        src={url}
        alt={name}
        width={size}
        height={size}
        className={`rounded-circle me-1 ${className}`}
        style={{ objectFit: "cover", border: "1px solid rgba(255,255,255,.2)" }}
      />
    ) : (
      <span
        className={`rounded-circle d-inline-flex align-items-center justify-content-center me-1 ${className}`}
        style={{
          width: size, height: size, background: "#334155", color: "#e2e8f0",
          fontSize: size > 20 ? 12 : 10, border: "1px solid rgba(255,255,255,.15)"
        }}
      >{initials}</span>
    );
  };

  const isApprovedLike = (s) => {
    const v = String(s || "").toLowerCase();
    return v === "approved" || v === "approve" || v === "acknowledge" || v === "acknowledged" || v === "ack";
  };

  const isRejectedLike = (s) => /reject/.test(String(s || "").toLowerCase());


  useEffect(() => {
    const paths = ["Users", "FB/Users"];
    const detach = [];
    const cache = {};

    const handler = (path) => (snap) => {
      const val = snap && snap.exists && snap.exists() ? snap.val() : null;
      const arr = [];
      if (val && typeof val === "object") {
        Object.entries(val).forEach(([k, v]) => {
          if (v && typeof v === "object") {
            arr.push({
              key: k,
              uiId: v.uiId || v.uiID || v.userId || v.uid || v.id || "",
              name: v.name || v.fullName || v.displayName || v.email || "User",
              role: String(v.role || v.userRole || "employee").toLowerCase(),
              email: v.email || "",
            });
          }
        });
      }
      cache[path] = arr;
      const byMap = new Map();
      Object.values(cache).flat().forEach((u) => {
        const idKey = u.uiId || ("key:" + u.key);
        if (!byMap.has(idKey)) byMap.set(idKey, u);
      });
      setUsersDir(Array.from(byMap.values()));
    };

    paths.forEach((path) => {
      const ref = firebaseDB.child(path);
      ref.on("value", handler(path), (err) => console.error("Users path error", err));
      detach.push(() => ref.off("value", handler(path)));
    });

    return () => detach.forEach((fn) => fn());
  }, []);


  const normalizeRole = (r) => {
    const s = String(r || "").toLowerCase().replace(/\s+/g, "");
    if (s.includes("superadmin")) return "Super Admin";
    if (s === "admin") return "Admin";
    if (s === "manager") return "Manager";
    return "Employee";
  };

  const myUiId = authUser?.uiId || authUser?.uid || authUser?.id || authUser?.userId || "";
  const myRecord =
    usersDir.find((u) => u.uiId && u.uiId === myUiId) ||
    (authUser?.email ? usersDir.find((u) => u.email === authUser.email) : null) ||
    null;

  const effectiveName = (myRecord?.name || authUser?.displayName || authUser?.name || propUser || "Admin");
  const effectiveRole = normalizeRole(
    myRecord?.role || authUser?.role || authUser?.userRole || propRole || "employee"
  );

  const isAdminLike = React.useMemo(
    () => ["Admin", "Manager", "Super Admin"].includes(effectiveRole),
    [effectiveRole]
  );

  // helps check ownership for a given record
  const isCreatorOf = React.useCallback(
    (rec) => (rec?.employeeName || rec?.createdByName) === effectiveName,
    [effectiveName]
  );

  // whether the current user can assign the *currently opened* details item
  const canAssignThis = React.useMemo(
    () => isAdminLike || (detailsItem ? isCreatorOf(detailsItem) : false),
    [isAdminLike, detailsItem, isCreatorOf]
  );


  // Build approverDirectory dynamically (fallback to prop)
  const approverDirectory = (propApproverDir && Array.isArray(propApproverDir) && propApproverDir.length)
    ? propApproverDir
    : usersDir;

  // Category definitions
  const categoryColors = {
    Food: "table-success",
    "Office Maintenance": "table-warning",
    Marketing: "table-secondary",
    Stationery: "table-info",
    Medical: "table-danger",
    Welfare: "table-primary",
    Assets: "table-light",
    "Transport & Travel": "table-info",
    Others: "table-dark",
  };

  const subCategories = [
    { cat: "Food", items: ["Groceries", "Vegetables", "Fruits", "Non-Veg", "Curd / Milk", "Tiffins", "Meals", "Curries", "Rice Bag", "Water Cans", "Client Food", "Snacks"] },
    { cat: "Transport & Travel", items: ["Petrol", "Staff Transport", "Worker Transport", "Business Trips", "Vehicle Maintenance", "Vehicle Insurance", "Vehicle Documents", "Vehicle Fine"] },
    { cat: "Office Maintenance", items: ["Office Rent", "Electricity Bill", "Water Bill", "Internet Bill", "Mobile Bill", "Repairs & Maintenance", "Waste Disposal"] },
    { cat: "Marketing", items: ["Apana Fee", "Worker India Fee", "Lamination Covers", "Printings", "Digital Marketing", "Offline Marketing", "Adds", "Off-Food", "Off-Snacks", "Off-Breakfast", "Off-Lunch", "Off-Dinner", "Off-Staying", "Petrol", "Transport", "Health", "Others"] },
    { cat: "Stationery", items: ["Books", "Files", "Papers", "Stationery", "Office Equipment", "IT Accessories", "Others"] },
    { cat: "Medical", items: ["For Staff", "For Workers", "First Aid", "Tablets", "Insurance"] },
    { cat: "Welfare", items: ["Team Outings", "Team Lunch", "Movies", "Gifts", "Festivals", "Entertainment"] },
    { cat: "Assets", items: ["Furniture", "Electronics", "IT Equipment", "Kitchen Items", "Vehicles", "Lands", "Properties", "Domain", "Investments", "Software", "Advances"] },
    { cat: "Others", items: [] },
  ];

  // Collapse all category groups by default (including 'Others')
  useEffect(() => {
    setCollapsedCats(prev => {
      // do this only on first mount or when there's nothing yet
      if (Object.keys(prev || {}).length) return prev;
      const init = {};
      subCategories.forEach(b => { init[b.cat] = true; });
      init["Others"] = true;
      return init;
    });
  }, [subCategories]);


  // Fetch
  useEffect(() => {
    const candidateRoots = ["PettyCash", "FB/PettyCash", "PettyCash/admin", "FB/PettyCash/admin"];
    const detach = [];
    const pathData = {};

    const handleSnapshot = (path) => (snapshot) => {
      const next = [];
      if (snapshot && snapshot.exists && snapshot.exists()) {
        const rootVal = snapshot.val();
        const flattened = flattenRecords(rootVal, []);
        flattened.forEach((val) => {
          // Prefer precise timestamp fields for time; fall back to parsed date
          const rawCreated =
            val.createdAt || val.created_at || val.timestamp || val.updatedAt || null;
          const rawDate = val.date || null;
          const pd = rawCreated ? new Date(rawCreated) : parseDateString(rawDate);
          const displayDate = rawCreated
            ? new Date(rawCreated).toLocaleDateString("en-in", { timeZone: "Asia/Kolkata" }) // 2025-10-15 style
            : (rawDate || "");

          // show date from explicit "date" if provided, else from createdAt’s date part
          const time = rawCreated
            ? new Date(rawCreated).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
              timeZone: "Asia/Kolkata",
            })
            : (pd
              ? pd.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
                timeZone: "Asia/Kolkata",
              })
              : "");

          const rel = normPath(val._relPath || val.id || "");
          const fullPath = normPath(`${path}/${rel}`);

          const id = `${fullPath}`;
          next.push({
            id,
            ...val,
            _parsedDate: pd,
            _safeDate: displayDate,
            _time: time,
            _sourcePath: path,
            _relPath: rel,
            _fullPath: fullPath,
          });
        });
      }
      pathData[path] = next;

      // Merge all paths and sort by date
      const mergedMap = new Map();
      Object.values(pathData).flat().forEach((rec) => {
        if (!mergedMap.has(rec._fullPath)) mergedMap.set(rec._fullPath, rec);
      });

      const merged = Array.from(mergedMap.values()).sort((a, b) => {
        const da = a._parsedDate ? a._parsedDate.getTime() : 0;
        const db = b._parsedDate ? b._parsedDate.getTime() : 0;
        return db - da; // newest first
      });

      setData(merged);
    };

    const handleError = (err) => console.error("Firebase error:", err);

    candidateRoots.forEach((root) => {
      const ref = firebaseDB.child(root);
      ref.on("value", handleSnapshot(root), handleError);
      detach.push(() => ref.off("value", handleSnapshot(root)));
    });

    return () => detach.forEach((fn) => fn());
  }, []);
  const [userFilter, setUserFilter] = useState("All");
  const userOptions = useMemo(() => {
    const s = new Set();
    data.forEach(d => {
      const n = (d.employeeName || d.createdByName || "").trim();
      if (n) s.add(n);
    });
    return ["All", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [data]);

  const approverNames = React.useMemo(() => {
    try {
      const list = (approverDirectory || [])
        .filter(u =>
          ["admin", "manager", "superadmin", "super admin"].includes(String(u?.role || "").toLowerCase())
        )
        .map(u => u?.name)
        .filter(Boolean);
      const uniq = Array.from(new Set(list));
      return uniq.sort((a, b) => a.localeCompare(b));
    } catch {
      return [];
    }
  }, [approverDirectory]);



  // helpers
  const statusColorClass = (status) => {
    const s = String(status || "Pending").toLowerCase();
    if (s === "approved") return "badge bg-success";
    if (s === "rejected") return "badge bg-danger";
    if (s === "clarification") return "badge bg-info text-dark";
    if (s === "delete") return "badge bg-secondary";
    return "badge bg-warning text-dark";
  };

  const recordMatchesStatus = (r) => {
    const isDel = !!r.isDeleted || String(r.approval || "").toLowerCase() === "delete";
    const s = String(r.approval || "Pending");
    const tab = statusTab.toLowerCase();
    if (tab === "delete") return isDel;
    if (tab === "clarification") return !isDel && String(s).toLowerCase() === "clarification";
    if (tab === "approved") return !isDel && isApprovedLike(s);
    if (tab === "rejected") return !isDel && isRejectedLike(s);
    if (tab === "pending") return !isDel && !isApprovedLike(s) && !isRejectedLike(s) && String(s).toLowerCase() !== "clarification";
    if (tab === "all") return !isDel;
    return true;
  };



  const years = useMemo(() => {
    const setY = new Set();
    data.forEach(d => { const dt = d._parsedDate; if (dt) setY.add(String(dt.getFullYear())); });
    return (setY.size ? Array.from(setY) : [String(new Date().getFullYear())]).sort((a, b) => Number(b) - Number(a));
  }, [data]);

  const statusCountsForSelection = useMemo(() => {
    const counters = { all: 0, approved: 0, pending: 0, rejected: 0, clarification: 0, delete: 0 };
    const withinSelection = data.filter((d) => {
      const dt = d._parsedDate;
      if (!dt) return false;
      const matchesYear = String(dt.getFullYear()) === activeYear;
      const matchesMonth = !activeMonth || monthsList[dt.getMonth()] === activeMonth;
      return matchesYear && matchesMonth;
    });
    withinSelection.forEach((r) => {
      const isDel = !!r.isDeleted || String(r.approval || "").toLowerCase() === "delete";
      const st = String(r.approval || "Pending").toLowerCase();
      if (isDel) { counters.delete += 1; return; }
      counters.all += 1;
      if (st === "approved") counters.approved += 1;
      else if (st === "rejected") counters.rejected += 1;
      else if (st === "clarification") counters.clarification += 1;
      else counters.pending += 1;
    });
    return counters;
  }, [data, activeYear, activeMonth]);

  const yearCounts = useMemo(() => {
    const map = {}; years.forEach(y => map[y] = 0);
    data.forEach(d => { const dt = d._parsedDate; if (!dt) return; const y = String(dt.getFullYear()); if (recordMatchesStatus(d) && map[y] !== undefined) map[y]++; });
    return map;
  }, [data, years, statusTab]);

  const monthCountsForYear = useMemo(() => {
    const map = {}; monthsList.forEach(m => map[m] = 0);
    const yearRecs = data.filter(d => d._parsedDate && String(d._parsedDate.getFullYear()) === activeYear);
    const statusApplied = yearRecs.filter(recordMatchesStatus);
    statusApplied.forEach(d => { const dt = d._parsedDate; if (!dt) return; const m = monthsList[dt.getMonth()]; map[m]++; });
    return map;
  }, [data, activeYear, statusTab]);

  const recordsForYearMonth = useMemo(() => {

    const filteredByYear = data.filter(d => {
      if (!d._parsedDate) return false;
      const yearMatch = String(d._parsedDate.getFullYear()) === activeYear;
      return yearMatch;
    });


    const filteredByStatus = filteredByYear.filter(recordMatchesStatus);

    if (activeMonth) {
      const monthFiltered = filteredByStatus.filter(d => {
        if (!d._parsedDate) return false;
        const monthMatch = monthsList[d._parsedDate.getMonth()] === activeMonth;
        return monthMatch;
      });
      return monthFiltered;
    }

    return filteredByStatus;
  }, [data, activeYear, activeMonth, statusTab]);

  const applyFilters = (records) => {
    let out = records.slice();
    if (search) {
      const q = String(search).toLowerCase();
      out = out.filter((r) =>
        String(r.description || "").toLowerCase().includes(q) ||
        String(r.comments || "").toLowerCase().includes(q) ||
        String(r.mainCategory || "").toLowerCase().includes(q) ||
        String(r.subCategory || "").toLowerCase().includes(q) ||
        String(r.employeeName || "").toLowerCase().includes(q)
      );
    }
    if (mainCategory) out = out.filter(r => String(r.mainCategory || "").toLowerCase() === String(mainCategory).toLowerCase());
    if (subCategory) out = out.filter(r => String(r.subCategory || "").toLowerCase() === String(subCategory).toLowerCase());
    if (dateFrom) {
      const df = parseDateString(dateFrom);
      if (df) out = out.filter(r => r._parsedDate && r._parsedDate >= df);
    }
    if (dateTo) {
      const dt = parseDateString(dateTo);
      if (dt) {
        const end = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 23, 59, 59, 999);
        out = out.filter(r => r._parsedDate && r._parsedDate <= end);
      }
    }

    if (!isAdminLike) {
      out = out.filter(r => (r.employeeName || r.createdByName) === effectiveName);
    }

    // Assignment filter
    if (assignmentFilter === "assigned") {
      out = out.filter(r => r.assignedTo);
    } else if (assignmentFilter === "unassigned") {
      out = out.filter(r => !r.assignedTo);
    } else if (assignmentFilter === "assignedToMe") {
      out = out.filter(r => r.assignedTo === effectiveName);
    }

    if (userFilter && userFilter !== "All") {
      out = out.filter(r => (r.employeeName || r.createdByName) === userFilter);
    }

    return out;
  };

  // include assignmentFilter, userFilter in deps
  const filteredRecords = useMemo(
    () => applyFilters(recordsForYearMonth),
    [recordsForYearMonth, search, mainCategory, subCategory, dateFrom, dateTo, assignmentFilter, userFilter]
  );

  // reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [
    search, mainCategory, subCategory, dateFrom, dateTo, activeYear, activeMonth, rowsPerPage, statusTab,
    assignmentFilter, userFilter
  ]);


  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / rowsPerPage));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const indexOfLast = safePage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const pageItems = filteredRecords.slice(indexOfFirst, indexOfLast);

  useEffect(() => { setCurrentPage(1); }, [search, mainCategory, subCategory, dateFrom, dateTo, activeYear, activeMonth, rowsPerPage, statusTab]);

  const exportExcel = (records, label) => {
    const exportData = records.map((r) => ({
      Date: r._safeDate || r.date || "",
      Time: r._time || "",
      "Main Category": r.mainCategory,
      "Sub Category": r.subCategory,
      Description: r.description,
      Quantity: r.quantity,
      Price: r.price,
      Total: r.total,
      Comments: r.comments,
      "Purchased By": r.employeeName || "",
      Approval: r.approval || "Pending",
      Deleted: r.isDeleted ? "Yes" : "No",
      "Delete Reason": r.deleteInfo?.reason || "",
      "Delete By": r.deleteInfo?.deletedBy || "",
      "Delete At": r.deleteInfo?.deletedAt || "",
      "Clarification Request": r.clarificationRequest?.text || "",
      "Clarification By": r.clarificationRequest?.requestedBy || "",
      "Clarification At": r.clarificationRequest?.requestedAt || "",
      "Source Path": r._fullPath || ""
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${label}-PettyCash`);
    XLSX.writeFile(wb, `${label}-PettyCash.xlsx`);
  };

  // Category Summary Data
  const summaryData = useMemo(() => {
    const summary = {};
    const othersMap = {};

    // Seed known subcategories
    subCategories.forEach(block => {
      (block.items || []).forEach(sub => {
        summary[sub] = {};
        monthsList.forEach(m => summary[sub][m] = 0);
        summary[sub]["Total"] = 0;
      });
    });

    data.forEach((rec) => {
      const approvalLower = String(rec.approval || "Pending").toLowerCase();
      if (rec.isDeleted || approvalLower !== "approved") return;

      const dt = rec._parsedDate;
      const m = (dt && !isNaN(dt)) ? monthsList[dt.getMonth()] : "Unknown";
      const t = Number(rec.total ?? rec.price ?? 0) || 0;
      const main = rec.mainCategory || "Unspecified";
      const sub = rec.subCategory || "Unspecified";

      if (main === "Others") {
        if (!othersMap[sub]) {
          othersMap[sub] = {};
          monthsList.forEach(mm => othersMap[sub][mm] = 0);
          othersMap[sub]["Total"] = 0;
        }
        othersMap[sub][m] = (othersMap[sub][m] || 0) + t;
        othersMap[sub]["Total"] += t;
        return;
      }

      if (!summary[sub]) {
        summary[sub] = {};
        monthsList.forEach(mm => summary[sub][mm] = 0);
        summary[sub]["Total"] = 0;
      }
      summary[sub][m] = (summary[sub][m] || 0) + t;
      summary[sub]["Total"] += t;
    });

    Object.keys(othersMap).forEach((key) => {
      summary[key] = othersMap[key];
    });

    return summary;
  }, [data]);

  // Compute month totals & grand total
  const monthTotals = useMemo(() => {
    const mTotals = {};
    monthsList.forEach(m => { mTotals[m] = 0; });
    Object.keys(summaryData).forEach(sub => {
      monthsList.forEach(m => {
        mTotals[m] += summaryData[sub][m] || 0;
      });
    });
    return mTotals;
  }, [summaryData]);

  const grandTotal = useMemo(() => {
    return Object.keys(summaryData).reduce((acc, sub) => acc + (summaryData[sub]["Total"] || 0), 0);
  }, [summaryData]);

  // Compute others keys
  const othersKeys = useMemo(() => {
    const knownSet = new Set();
    subCategories.forEach(block => (block.items || []).forEach(i => knownSet.add(i)));
    return Object.keys(summaryData).filter(k => !knownSet.has(k));
  }, [summaryData]);

  const othersTotals = useMemo(() => {
    const totals = {};
    monthsList.forEach(m => totals[m] = 0);
    totals["Total"] = 0;
    othersKeys.forEach(key => {
      monthsList.forEach(m => { totals[m] += summaryData[key][m] || 0; });
      totals["Total"] += summaryData[key]["Total"] || 0;
    });
    return totals;
  }, [othersKeys, summaryData]);

  const canUseAdminDropdown = ["Admin", "Manager", "Super Admin"].includes(effectiveRole);
  const canDeleteOrRejectLock = canUseAdminDropdown;

  const handleAdminAction = (item) => {
    if (!adminAction) return;

    if (adminAction === "Approved") {
      // Direct approval without comment
      const target = item._fullPath || `${item._sourcePath}/${item._relPath}`;
      firebaseDB.child(target).update({
        approval: "Approved",
        statusComments: [...(item.statusComments || []), {
          action: "Approved",
          comment: adminComment || "Approved",
          user: effectiveName,
          role: effectiveRole,
          timestamp: new Date().toISOString()
        }]
      }).catch(err => console.error("Error updating approval", err));
    } else {
      // For other actions, open modal for comment
      setActionItem(item);
      setActionType(adminAction);
      setActionText(adminComment || "");
      setActionModalOpen(true);
    }

    setAdminAction("");
    setAdminComment("");
  };




  const saveAction = async () => {
    if (!actionItem) return;
    try {
      const target = actionItem._fullPath || `${actionItem._sourcePath}/${actionItem._relPath}`;
      const base = { approval: actionType };
      const lock = canDeleteOrRejectLock ? {
        approvalLock: {
          locked: true,
          lockedBy: effectiveName || "System",
          lockedByRole: effectiveRole || "",
          lockedAt: new Date().toISOString(),
          reason: actionText
        }
      } : {};

      // Add status comment
      const newComment = {
        action: actionType,
        comment: actionText,
        user: effectiveName,
        role: effectiveRole,
        timestamp: new Date().toISOString()
      };

      const statusComments = [...(actionItem.statusComments || []), newComment];

      if (actionType === "Clarification") {
        await firebaseDB.child(target).update({
          ...base,
          clarificationRequest: {
            text: actionText,
            requestedBy: effectiveName || "System",
            requestedAt: new Date().toISOString(),
          },
          statusComments,
          ...lock
        });
      } else if (actionType === "Rejected") {
        await firebaseDB.child(target).update({
          ...base,
          rejectionInfo: {
            reason: actionText,
            rejectedBy: effectiveName || "System",
            rejectedAt: new Date().toISOString(),
          },
          statusComments,
          ...lock
        });
      } else if (actionType === "Delete") {
        await firebaseDB.child(target).update({
          approval: "Delete",
          isDeleted: true,
          deleteInfo: {
            reason: actionText,
            deletedBy: effectiveName || "System",
            deletedAt: new Date().toISOString(),
          },
          statusComments,
          ...lock
        });
      }
      setActionModalOpen(false); setActionItem(null); setActionText(""); setActionType("");
    } catch (err) {
      console.error("Error saving action:", err);
    }
  };

  const mainOptions = useMemo(() => {
    const m = new Map(); data.forEach(d => { const k = (d.mainCategory || "").trim(); if (k) m.set(k.toLowerCase(), k); });
    m.set("others", "Others"); return Array.from(m.values()).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const subOptions = useMemo(() => {
    if (!mainCategory) return [];
    const m = new Map();
    data.forEach(d => {
      if (String(d.mainCategory || "").toLowerCase() === String(mainCategory).toLowerCase()) {
        const s = (d.subCategory || "").trim(); if (s) m.set(s.toLowerCase(), s);
      }
    });
    return Array.from(m.values()).sort((a, b) => a.localeCompare(b));
  }, [data, mainCategory]);

  const pageTotal = useMemo(() => pageItems.filter(r => !r.isDeleted && String(r.approval || "Pending").toLowerCase() === "approved").reduce((s, r) => s + (Number(r.total || 0) || 0), 0), [pageItems]);
  const filteredTotal = useMemo(() => filteredRecords.filter(r => !r.isDeleted && String(r.approval || "Pending").toLowerCase() === "approved").reduce((s, r) => s + (Number(r.total || 0) || 0), 0), [filteredRecords]);

  const resetFilters = () => {
    setSearch("");
    setMainCategory("");
    setSubCategory("");
    setDateFrom("");
    setDateTo("");
    setAssignmentFilter("all");
    setUserFilter("All");
    setStatusTab("All");        // 🔄 reset current tab
    setActiveMonth("");         // 🔄 clear month
    setSelectedIds(new Set());  // 🔄 clear selected checkboxes
    setCurrentPage(1);
    // (Optional) jump back to current year:
    // setActiveYear(String(new Date().getFullYear()));
  };
  const visibleComments = React.useMemo(() => {
    const list = detailsItem?.statusComments;
    const all = Array.isArray(list) ? list : [];
    return canUseAdminDropdown ? all : all.filter(c => c?.user === effectiveName);
  }, [detailsItem, canUseAdminDropdown, effectiveName]);
  return (
    <div className="pettyCashReport">
      <div className="actionBar">
        <h3>Petty Cash Report</h3>
        <div className="btn-group" role="group" aria-label="Status tabs">
          {/* {["All", "Approved", "Pending", "Rejected", "Clarification", "Delete"].map(s => (
            <button key={s} className={`btn btn-sm ${statusTab.toLowerCase() === s.toLowerCase() ? "btn-primary" : "btn-outline-secondary"}`} onClick={() => { setStatusTab(s); setCurrentPage(1); }}>
              {s}
            </button>
          ))} */}
        </div>

        {/* Notification counters for year/month */}
        <div className="badgeWrapper">
          <span className="badge rounded-pill bg-secondary" role="button" onClick={() => setStatusTab("All")}>
            All <span className="ms-1 badge bg-light text-dark">{statusCountsForSelection.all}</span>
          </span>
          <span className="badge rounded-pill bg-success" role="button" onClick={() => setStatusTab("Approved")}>
            Approved <span className="ms-1 badge bg-light text-dark">{statusCountsForSelection.approved}</span>
          </span>
          <span className="badge rounded-pill bg-warning text-dark" role="button" onClick={() => setStatusTab("Pending")}>
            Pending <span className="ms-1 badge bg-light text-dark">{statusCountsForSelection.pending}</span>
          </span>
          <span className="badge rounded-pill bg-danger" role="button" onClick={() => setStatusTab("Rejected")}>
            Rejected <span className="ms-1 badge bg-light text-dark">{statusCountsForSelection.rejected}</span>
          </span>
          <span className="badge rounded-pill bg-info text-dark" role="button" onClick={() => setStatusTab("Clarification")}>
            Clarification <span className="ms-1 badge bg-light text-dark">{statusCountsForSelection.clarification}</span>
          </span>
          <span className="badge rounded-pill bg-secondary" role="button" onClick={() => setStatusTab("Delete")}>
            Delete <span className="ms-1 badge bg-light text-dark">{statusCountsForSelection.delete}</span>
          </span>
        </div>
      </div>

      {/* Admin Quick Actions - Enhanced Dark Design */}
      {canUseAdminDropdown && (
        <div className="card bg-dark border-secondary  mb-4 shadow-lg filter">
          <div className="card-header bg-gradient-primary border-bottom border-secondary ">
            <div className="d-flex align-items-center">
              <i className="bi bi-lightning-fill text-warning me-2 fs-5"></i>
              <h6 className="mb-0 text-white fw-bold">Quick Actions</h6>
              <span className="badge bg-warning text-dark ms-2">
                {selectedIds.size} selected
              </span>
            </div>
          </div>
          <div className="card-body bg-dark-2">
            <div className="row g-3 align-items-end">
              <div className="col-xl-3 col-lg-4">
                <label className="form-label text-light mb-1 small fw-semibold">
                  <i className="bi bi-gear me-1"></i>Action Type
                </label>
                <select
                  className="form-select form-select-sm bg-dark border-secondary text-light"
                  value={adminAction}
                  onChange={(e) => setAdminAction(e.target.value)}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%236ea8fe' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.75rem center',
                    backgroundSize: '16px 12px'
                  }}
                >
                  <option value="" className="text-dark">Select Action</option>
                  <option value="Approved" className="text-dark">
                    ✅ Approve Selected
                  </option>
                  <option value="Rejected" className="text-dark">
                    ❌ Reject Selected
                  </option>
                  <option value="Clarification" className="text-dark">
                    ❓ Request Clarification
                  </option>
                </select>
              </div>

              <div className="col-xl-5 col-lg-6">
                <label className="form-label text-light mb-1 small fw-semibold">
                  <i className="bi bi-chat-text me-1"></i>Comment
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm bg-dark border-secondary text-light"
                  placeholder="Add comment (optional for approval)..."
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                />
              </div>

              <div className="col-xl-2 col-lg-4 col-md-6">
                <button
                  className="btn btn-primary btn-sm w-100 fw-semibold gradient-btn"
                  disabled={!adminAction || selectedIds.size === 0}
                  onClick={() => {
                    const selectedRows = pageItems.filter(item => selectedIds.has(item.id));
                    if (selectedRows.length === 0) {
                      alert("Please select at least one row to perform action");
                      return;
                    }
                    selectedRows.forEach(item => handleAdminAction(item));
                    setSelectedIds(new Set());
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <i className="bi bi-send-check me-1"></i>
                  Apply to {selectedIds.size} Selected
                </button>
              </div>

              <div className="col-xl-2 col-lg-4 col-md-6">
                <button
                  className="btn btn-outline-secondary btn-sm w-100"
                  onClick={() => setSelectedIds(new Set())}
                  disabled={selectedIds.size === 0}
                >
                  <i className="bi bi-x-circle me-1"></i>
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Section - Enhanced Dark Design */}
      <div className="card bg-dark border-secondary  mb-4 shadow-lg filter">
        <div className="card-header bg-gradient-dark border-bottom border-secondary ">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <i className="bi bi-funnel-fill text-info me-2 fs-5"></i>
              <h6 className="mb-0 text-white fw-bold">Filters & Controls</h6>
            </div>
            <div className="text-muted small">
              Showing {filteredRecords.length} records
            </div>
          </div>
        </div>

        <div className="card-body bg-dark-2 p-3">
          <div className="row g-3 align-items-end">
            {/* Search */}
            <div className="col-xl-2 col-lg-3 col-md-3">
              <label className="form-label text-light mb-1 small fw-semibold">
                <i className="bi bi-search me-1"></i>Search
              </label>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-dark border-secondary text-light">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control bg-dark border-secondary text-light"
                  placeholder="Search records..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Main Category */}
            <div className="col-xl-2 col-lg-3 col-md-3">
              <label className="form-label text-light mb-1 small fw-semibold">
                <i className="bi bi-tags me-1"></i>Main Category
              </label>
              <select
                className="form-select form-select-sm bg-dark border-secondary text-light"
                value={mainCategory}
                onChange={(e) => { setMainCategory(e.target.value); setSubCategory(""); }}
              >
                <option value="">All Categories</option>
                {mainOptions.map((cat) => (
                  <option key={cat} value={cat} className="text-dark">{cat}</option>
                ))}
              </select>
            </div>

            {/* Sub Category */}
            <div className="col-xl-2 col-lg-3 col-md-3">
              <label className="form-label text-light mb-1 small fw-semibold">
                <i className="bi bi-tag me-1"></i>Sub Category
              </label>
              <select
                className="form-select form-select-sm bg-dark border-secondary text-light"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                disabled={!mainCategory}
              >
                <option value="">All Sub Categories</option>
                {subOptions.map((sub) => (
                  <option key={sub} value={sub} className="text-dark">{sub}</option>
                ))}
              </select>
            </div>

            {/* User Filter */}
            {isAdminLike && (
              <div className="col-xl-2 col-lg-3 col-md-3">
                <label className="form-label text-light mb-1 small fw-semibold">
                  <i className="bi bi-person me-1"></i>User
                </label>
                <select
                  className="form-select form-select-sm bg-dark border-secondary text-light"
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                >
                  {userOptions.map(u => (
                    <option key={u} value={u} className="text-dark">{u}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Assignment Filter */}
            <div className="col-xl-2 col-lg-3 col-md-3">
              <label className="form-label text-light mb-1 small fw-semibold">
                <i className="bi bi-person-check me-1"></i>Assignment
              </label>
              <select
                className="form-select form-select-sm bg-dark border-secondary text-light"
                value={assignmentFilter}
                onChange={(e) => setAssignmentFilter(e.target.value)}
              >
                <option value="all" className="text-dark">All Assignments</option>
                <option value="assigned" className="text-dark">Assigned</option>
                <option value="unassigned" className="text-dark">Unassigned</option>
                <option value="assignedToMe" className="text-dark">Assigned to Me</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="col-xl-4 col-lg-6">
              <label className="form-label text-light mb-1 small fw-semibold">
                <i className="bi bi-calendar-range me-1"></i>Date Range
              </label>
              <div className="row g-2">
                <div className="col-6">
                  <input
                    type="date"
                    className="form-control form-control-sm bg-dark border-secondary text-light"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <input
                    type="date"
                    className="form-control form-control-sm bg-dark border-secondary text-light"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="col-xl-2 col-lg-3 col-md-6">
              <div className="d-grid gap-2">
                <button
                  className="btn btn-outline-warning btn-sm fw-semibold"
                  onClick={() => resetFilters()}
                  title="Reset all filters"
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  Reset All
                </button>
                <button
                  className="btn btn-success btn-sm fw-semibold gradient-btn"
                  onClick={() => exportExcel(filteredRecords, `${activeYear}-${activeMonth || "all"}-${statusTab}`)}
                  title="Export visible records"
                  style={{
                    background: 'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)',
                    border: 'none'
                  }}
                >
                  <i className="bi bi-download me-1"></i>
                  Export Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Year tabs */}
      <Tabs activeKey={activeYear} onSelect={(k) => { setActiveYear(String(k)); setActiveMonth(""); setCurrentPage(1); }} mountOnEnter unmountOnExit className="petty-tabs">
        {years.map((y) => (
          <Tab eventKey={y} title={`${y} (${yearCounts[y] || 0})`} key={y}>
            {/* month buttons */}
            <div className="mb-3">
              <div className="d-flex gap-2 flex-wrap">
                {monthsList.map((m) => (
                  <button key={m} className={`btn btn-sm ${activeMonth === m ? "btn-primary" : "btn-outline-info"}`} onClick={() => { setActiveMonth(m); setCurrentPage(1); }} title={`Records: ${monthCountsForYear[m] || 0}`}>
                    {m} <small className="opacity-75">({monthCountsForYear[m] || 0})</small>
                  </button>
                ))}
                <button className={`btn btn-sm ${activeMonth === "" ? "btn-primary" : "btn-outline-info"}`} onClick={() => { setActiveMonth(""); setCurrentPage(1); }}>
                  All months <small className="opacity-75">({recordsForYearMonth.length})</small>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="table-responsive" ref={tableRef}>
              {filteredRecords.length === 0 ? (
                <div className="alert alert-info text-center text-white">
                  No records found for the selected filters.
                  <br />
                  Status: <strong>{statusTab}</strong> | Year: <strong>{activeYear}</strong> | Month: <strong>{activeMonth || "All"}</strong>
                </div>
              ) : (
                <table className="table table-dark table-hover table-sm align-middle">
                  <thead>
                    <tr>
                      {canUseAdminDropdown && <th style={{ width: '30px' }}>✓</th>}
                      <th>S.No</th>
                      <th>Date & Time</th>
                      <th>Main Category</th>
                      <th>Sub Cat</th>
                      <th>Qty</th>
                      <th>Total</th>
                      <th>Assign To</th>
                      <th>Approval</th>
                      <th>Purchased By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((item, idx) => {
                      const lockedByAdmin = !!(item.approvalLock?.locked && (String(effectiveRole || "").toLowerCase() === "employee"));
                      const approvalLower = String(item.approval || "Pending").toLowerCase();
                      const rowClass = item.isDeleted ? "table-secondary" : (approvalLower === "rejected" ? "table-danger" : approvalLower === "clarification" ? "table-warning" : "");
                      const isCreator = item.employeeName === effectiveName;

                      return (
                        <tr
                          key={item.id}
                          className={rowClass}
                          style={{ cursor: "pointer" }}
                          onClick={(e) => {
                            const tag = (e.target.tagName || "").toLowerCase();
                            if (tag === "input" || tag === "select" || tag === "option") return;
                            setDetailsItem(item); setDetailsOpen(true);
                          }}
                        >
                          {canUseAdminDropdown && (
                            <td onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                className="form-check-input"
                                data-id={item.id}
                                disabled={isCreator}
                                title={isCreator ? "Cannot act on your own entries" : "Select for action"}
                                checked={selectedIds.has(item.id)}
                                onChange={(e) => {
                                  const next = new Set(selectedIds);
                                  if (e.target.checked) next.add(item.id); else next.delete(item.id);
                                  setSelectedIds(next);
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                          )}

                          <td>{indexOfFirst + idx + 1}</td>
                          <td>
                            <div>{item._safeDate || item.date}</div>
                            <small className="small-text text-info opacity-75">{item._time}</small>
                          </td>
                          <td>{item.mainCategory}</td>
                          <td>{item.subCategory}</td>
                          <td>{item.quantity}</td>
                          <td><strong>{Number(item.total ?? 0).toLocaleString()}</strong></td>
                          <td>
                            {item.assignedTo ? (
                              <>
                                <small className="d-block">{item.assignedTo === effectiveName ? "You" : item.assignedTo}</small>
                                <span className="badge bg-info me-1" style={{ maxWidth: "max-content;", margin: "auto", textAlign: "center" }}>Assigned</span>
                              </>
                            ) : (
                              <small className="text-muted">Unassigned</small>
                            )}
                          </td>

                          <td>
                            <span className={statusColorClass(item.approval)} style={{ minWidth: 96, textAlign: "center", textTransform: "capitalize" }}>
                              {item.approval || "Pending"}
                            </span>
                          </td>
                          <td>
                            {(() => {
                              const name = item.employeeName || item.createdByName || "—";
                              return (
                                <span className="d-inline-flex align-items-center">
                                  <Avatar name={name} size={20} className="me-1" />
                                  <span>{name}</span>
                                </span>
                              );
                            })()}
                          </td>


                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="table-secondary">
                      <td colSpan={canUseAdminDropdown ? 6 : 5} className="text-end"><strong>Page Total (Approved)</strong></td>
                      <td><strong>{pageTotal.toLocaleString()}</strong></td>
                      <td colSpan={3}></td>
                    </tr>
                    <tr className="table-secondary">
                      <td colSpan={canUseAdminDropdown ? 6 : 5} className="text-end"><strong>Filtered Total (Approved)</strong></td>
                      <td><strong>{filteredTotal.toLocaleString()}</strong></td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            {/* pagination */}
            {filteredRecords.length > 0 && (
              <div className="d-flex justify-content-between align-items-center mt-3">
                <div>Showing {filteredRecords.length} items</div>
                <div className="d-flex gap-2 align-items-center">
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>Prev</button>
                  <div>Page {safePage} / {totalPages}</div>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>Next</button>
                </div>
              </div>
            )}
          </Tab>
        ))}
      </Tabs>

      {/* Category Summary Table */}
      <div className="d-flex justify-content-between align-items-center mb-2 mt-5">
        <h4 className="opacity-85">Category Wise Summary (All Years, Approved Only)</h4>
      </div>

      <div className="table-responsive">
        <table className="table table-bordered table-hover pettyCash-Category table-sm table-striped align-middle">
          <thead className="table-light">
            <tr>
              <th style={{ width: 220 }}>Main Category</th>
              <th>Sub Category</th>
              {monthsList.map((m) => <th key={m} className="text-end">{m}</th>)}
              <th className="text-end">Grand Total</th>
            </tr>
          </thead>
          <tbody>
            {subCategories.map((block) => {
              const blockTotals = {};
              monthsList.forEach((m) => (blockTotals[m] = 0));
              let blockGrand = 0;

              block.items.forEach((sub) => {
                monthsList.forEach((m) => {
                  blockTotals[m] += (summaryData[sub] && summaryData[sub][m]) ? summaryData[sub][m] : 0;
                });
                blockGrand += (summaryData[sub] && summaryData[sub]["Total"]) ? summaryData[sub]["Total"] : 0;
              });

              if (block.cat !== "Others") {
                const isCollapsed = !!collapsedCats[block.cat];
                return (
                  <React.Fragment key={block.cat}>
                    <tr className={`table-category-total ${categoryColors[block.cat] || ""}`}>
                      <td colSpan={2}>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary me-2"
                          onClick={() => setCollapsedCats(prev => ({ ...prev, [block.cat]: !prev[block.cat] }))}
                          title={isCollapsed ? "Expand" : "Collapse"}
                        >
                          {isCollapsed ? "➕" : "➖"}
                        </button>
                        <strong>{block.cat}</strong>
                      </td>
                      {monthsList.map((m) => <td key={m} className="text-end"><strong>{blockTotals[m].toLocaleString()}</strong></td>)}
                      <td className="text-end"><strong>{blockGrand.toLocaleString()}</strong></td>
                    </tr>
                    {!isCollapsed && block.items.map((sub) => (
                      <tr key={block.cat + "-" + sub} className={categoryColors[block.cat] || ""}>
                        <td></td>
                        <td>{sub}</td>
                        {monthsList.map((m) => (
                          <td key={m} className="text-end">
                            {summaryData[sub] && summaryData[sub][m] ? summaryData[sub][m].toLocaleString() : ""}
                          </td>
                        ))}
                        <td className="text-end"><strong>{summaryData[sub] && summaryData[sub]["Total"] ? summaryData[sub]["Total"].toLocaleString() : ""}</strong></td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              }
              return null;
            })}

            {/* Others section */}
            {othersKeys.length > 0 && (
              <React.Fragment>
                <tr className="table-category-total table-dark">
                  <td colSpan={2}>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-light me-2"
                      onClick={() => setCollapsedCats(prev => ({ ...prev, "Others": !prev["Others"] }))}
                      title={collapsedCats["Others"] ? "Expand" : "Collapse"}
                    >
                      {collapsedCats["Others"] ? "➕" : "➖"}
                    </button>
                    <strong>Others</strong>
                  </td>
                  {monthsList.map((m) => <td key={m} className="text-end"><strong>{othersTotals[m].toLocaleString()}</strong></td>)}
                  <td className="text-end"><strong>{othersTotals["Total"].toLocaleString()}</strong></td>
                </tr>
                {!collapsedCats["Others"] && othersKeys.map((key) => (
                  <tr key={"others-" + key} className="table-dark">
                    <td></td>
                    <td>{key}</td>
                    {monthsList.map((m) => (
                      <td key={m} className="text-end">
                        {summaryData[key] && summaryData[key][m] ? summaryData[key][m].toLocaleString() : ""}
                      </td>
                    ))}
                    <td className="text-end"><strong>{summaryData[key] && summaryData[key]["Total"] ? summaryData[key]["Total"].toLocaleString() : ""}</strong></td>
                  </tr>
                ))}
              </React.Fragment>
            )}

            {/* Grand Totals */}
            <tr className="table-success sticky-grand-total">
              <td colSpan={2}><strong>Grand Total</strong></td>
              {monthsList.map((m) => <td key={m} className="text-end"><strong>{monthTotals[m].toLocaleString()}</strong></td>)}
              <td className="text-end"><strong>{grandTotal.toLocaleString()}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Unified Action Modal */}
      {actionModalOpen && actionItem && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.9)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">🚨 {actionType} — Provide details</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => { setActionModalOpen(false); setActionItem(null); setActionText(""); setActionType(""); }}></button>
              </div>
              <div className="modal-body">
                <div className="card bg-white mb-3">
                  <div className="card-body">
                    <h6 className="card-title">Entry Details</h6>
                    <p className="mb-1"><strong>Amount:</strong> ₹{Number(actionItem.total ?? 0).toLocaleString()}</p>
                    <p className="mb-1"><strong>Category:</strong> {actionItem.mainCategory} / {actionItem.subCategory}</p>
                    <p className="mb-0"><strong>Description:</strong> {actionItem.description}</p>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    {actionType === "Clarification" ? "📝 Clarification Request" :
                      actionType === "Rejected" ? "❌ Rejection Reason" :
                        "🗑️ Delete Reason"}
                  </label>
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder={
                      actionType === "Clarification" ? "What information do you need from the user?" :
                        actionType === "Rejected" ? "Why is this expense being rejected?" :
                          "Why is this expense being deleted?"
                    }
                    value={actionText}
                    onChange={(e) => setActionText(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setActionModalOpen(false); setActionItem(null); setActionText(""); setActionType(""); }}>Cancel</button>
                <button type="button" className={`btn ${actionType === "Delete" ? "btn-danger" : actionType === "Rejected" ? "btn-warning" : "btn-primary"}`} disabled={!actionText.trim()} onClick={saveAction}>
                  {actionType === "Delete" ? "🗑️ Delete" : actionType === "Rejected" ? "❌ Reject" : "❓ Request Clarification"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Row Details Modal */}
      {detailsOpen && detailsItem && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.9)" }} onClick={() => { setDetailsOpen(false); setDetailsItem(null); }}>
          <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content" style={{ border: "none", borderRadius: "12px", overflow: "hidden" }}>
              <div className="modal-header" style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                borderBottom: "none"
              }}>
                <h5 className="modal-title">
                  📋 Entry Details
                  {detailsItem.assignedTo && (
                    <span className="badge bg-info ms-2" title={`Assigned to ${detailsItem.assignedTo}`}>
                      Assigned: {detailsItem.assignedTo === effectiveName ? "You" : detailsItem.assignedTo}
                    </span>
                  )}
                </h5>

                <button type="button" className="btn-close btn-close-white" onClick={() => { setDetailsOpen(false); setDetailsItem(null); }}></button>
              </div>
              <div className="modal-body p-4" style={{ background: "#f8f9fa" }}>
                {detailsItem.assignedTo === effectiveName && (
                  <div className="alert alert-warning py-2">
                    This Entry is <strong>Assigned to you</strong>.
                  </div>
                )}

                <div className="row g-3">
                  {/* Basic Information Card */}
                  <div className="col-12">
                    <div className="card bg-white">
                      <div className="card-header bg-light">
                        <h6 className="mb-0">📊 Basic Information</h6>
                      </div>
                      <div className="card-body">
                        <div className="row g-3">
                          <div className="col-md-6">
                            <div className="small ">Date & Time</div>
                            <div className="fw-semibold">
                              {detailsItem._safeDate || detailsItem.date || "-"}
                              <br />
                              <small className="">{detailsItem._time}</small>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="small ">Amount</div>
                            <div className="h5 text-primary fw-bold">₹{Number(detailsItem.total ?? 0).toLocaleString()}</div>
                          </div>
                          <div className="col-md-6">
                            <div className="small ">Main Category</div>
                            <div className="fw-semibold">{detailsItem.mainCategory || "-"}</div>
                          </div>
                          <div className="col-md-6">
                            <div className="small ">Sub Category</div>
                            <div className="fw-semibold">{detailsItem.subCategory || "-"}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description & Comments Row */}
                  <div className="col-12">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="card bg-white h-100">
                          <div className="card-header bg-light">
                            <h6 className="mb-0">📝 Description</h6>
                          </div>
                          <div className="card-body">
                            <div style={{ whiteSpace: "pre-wrap" }}>
                              {detailsItem.description || "-"}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="card bg-white h-100">
                          <div className="card-header bg-light">
                            <h6 className="mb-0">💬 Comments</h6>
                          </div>
                          <div className="card-body">
                            <div style={{ whiteSpace: "pre-wrap" }}>
                              {detailsItem.comments || "-"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financial Details Card */}
                  <div className="col-12">
                    <div className="card bg-white">
                      <div className="card-header bg-light">
                        <h6 className="mb-0">💰 Financial Details</h6>
                      </div>
                      <div className="card-body">
                        <div className="row g-3">
                          <div className="col-md-4">
                            <div className="small ">Quantity</div>
                            <div className="fw-semibold">{detailsItem.quantity ?? "-"}</div>
                          </div>
                          <div className="col-md-4">
                            <div className="small ">Price</div>
                            <div className="fw-semibold">
                              {detailsItem.price ? `₹${Number(detailsItem.price).toLocaleString()}` : "-"}
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="small ">Total</div>
                            <div className="h6 fw-bold text-success">
                              ₹{Number(detailsItem.total ?? 0).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* User Information & Assignment Row */}
                  <div className="col-12">
                    <div className="row g-3">
                      <div className="col-md-4">
                        <div className="card bg-white h-100">
                          <div className="card-header bg-light">
                            <h6 className="mb-0">👤 User Information</h6>
                          </div>
                          <div className="card-body">
                            <div className="small ">Purchased By</div>
                            <div className="fw-semibold">{detailsItem.employeeName || "-"}</div>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-4">
                        <div className="card bg-white h-100">
                          <div className="card-header bg-light">
                            <h6 className="mb-0">👥 Assignment</h6>
                          </div>
                          <div className="card-body">
                            <div className="d-flex flex-column gap-2">
                              <select
                                className="form-select form-select-sm"
                                value={detailsItem._pendingAssignedTo || detailsItem.assignedTo || ""}
                                onChange={(e) => setDetailsItem(prev => ({ ...prev, _pendingAssignedTo: e.target.value }))}
                                style={{ backgroundColor: "transparent", color: "#444" }}
                                disabled={!canAssignThis}
                              >
                                <option value="">Unassigned</option>
                                {(isAdminLike ? (approverNames.length ? approverNames : userOptions.filter(u => u !== "All"))
                                  : (approverNames))
                                  .map(user => <option key={user} value={user}>{user}</option>)}
                              </select>

                              <button
                                className="btn btn-outline-primary btn-sm"
                                disabled={!canAssignThis || (!detailsItem._pendingAssignedTo && !detailsItem.assignedTo)}
                                onClick={async () => {
                                  const target = detailsItem._fullPath || `${detailsItem._sourcePath}/${detailsItem._relPath}`;
                                  const assignedTo = detailsItem._pendingAssignedTo || "";
                                  try {
                                    await firebaseDB.child(target).update({
                                      assignedTo: assignedTo || null,
                                      assignedAt: assignedTo ? new Date().toISOString() : null,
                                      assignedBy: assignedTo ? effectiveName : null
                                    });
                                    setDetailsItem(prev => ({
                                      ...prev,
                                      assignedTo,
                                      _pendingAssignedTo: undefined
                                    }));
                                    alert(assignedTo ? `Assigned to ${assignedTo}` : "Assignment removed");
                                  } catch (error) {
                                    alert("Error updating assignment.");
                                  }
                                }}
                              >
                                {detailsItem._pendingAssignedTo ? "💾 Save" : "🗑️ Remove"}
                              </button>

                              {detailsItem.assignedTo && (
                                <div className="mt-1">
                                  <small className="">
                                    Currently assigned to: <strong>{detailsItem.assignedTo}</strong>
                                    {detailsItem.assignedBy && (
                                      <> by {detailsItem.assignedBy}</>
                                    )}
                                  </small>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Approval Status Card */}
                      <div className="col-md-4">
                        <div className="card bg-white h-100">
                          <div className="card-header bg-light">
                            <h6 className="mb-0">✅ Approval Status</h6>
                          </div>
                          <div className="card-body">
                            <div className="d-flex flex-column gap-2">
                              {/* Current Status Display */}
                              <div className="d-flex align-items-center gap-2 mb-2">
                                <span
                                  className={statusColorClass(detailsItem.approval)}
                                  style={{
                                    fontSize: "0.8rem",
                                    textTransform: "capitalize",
                                    padding: "4px 8px"
                                  }}
                                >
                                  {detailsItem.approval || "Pending"}
                                </span>
                              </div>

                              {/* Status Change Controls - Only for admins/managers and not for own entries */}
                              {canUseAdminDropdown && (detailsItem.employeeName !== effectiveName) && (
                                <>
                                  <select
                                    className="form-select form-select-sm"
                                    value={detailsItem._pendingApproval || detailsItem.approval || "Pending"}
                                    onChange={(e) => setDetailsItem(prev => ({ ...prev, _pendingApproval: e.target.value }))}
                                    title="Change status"
                                    style={{ backgroundColor: "transparent", color: "#444" }}
                                  >
                                    <option value="Pending">Pending</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Clarification">Clarification</option>
                                    <option value="Rejected">Rejected</option>
                                  </select>

                                  <textarea
                                    className="form-control form-control-sm"
                                    rows={2}
                                    placeholder="Add comment for status change..."
                                    value={detailsItem._pendingStatusComment || ""}
                                    onChange={(e) => setDetailsItem(prev => ({ ...prev, _pendingStatusComment: e.target.value }))}
                                  />

                                  <button
                                    className="btn btn-primary btn-sm"
                                    disabled={!detailsItem._pendingApproval}
                                    onClick={async () => {
                                      const target = detailsItem._fullPath || `${detailsItem._sourcePath}/${detailsItem._relPath}`;
                                      const nextStatus = detailsItem._pendingApproval;
                                      const nowIso = new Date().toISOString();

                                      const newComment = {
                                        action: nextStatus,
                                        comment: detailsItem._pendingStatusComment || `Status changed to ${nextStatus}`,
                                        user: effectiveName,
                                        role: effectiveRole,
                                        timestamp: nowIso,
                                      };

                                      const updateData = {
                                        approval: nextStatus,
                                        statusComments: [...(detailsItem.statusComments || []), newComment],
                                      };

                                      if (nextStatus === "Clarification") {
                                        updateData.clarificationRequest = {
                                          text: detailsItem._pendingStatusComment || "",
                                          requestedBy: effectiveName,
                                          requestedAt: nowIso,
                                        };
                                      } else if (nextStatus === "Rejected") {
                                        updateData.rejectionInfo = {
                                          reason: detailsItem._pendingStatusComment || "",
                                          rejectedBy: effectiveName,
                                          rejectedAt: nowIso,
                                        };
                                      } else if (nextStatus === "Approved") {
                                        updateData.clarificationRequest = null;
                                        updateData.rejectionInfo = null;
                                      }

                                      try {
                                        await firebaseDB.child(target).update(updateData);
                                        setDetailsItem(prev => ({
                                          ...prev,
                                          ...updateData,
                                          _pendingApproval: undefined,
                                          _pendingStatusComment: "",
                                        }));
                                        alert("Status updated successfully!");
                                      } catch (error) {
                                        alert("Error updating status. Please try again.");
                                      }
                                    }}
                                  >
                                    💾 Save Status
                                  </button>
                                </>
                              )}

                              {/* Permission Messages */}
                              {(String(effectiveRole || "").toLowerCase() === "employee") && !canUseAdminDropdown && (
                                <div className="alert alert-warning small mb-0 p-2">
                                  You don't have permission to change status.
                                </div>
                              )}
                              {detailsItem.employeeName === effectiveName && (
                                <div className="alert alert-warning small mb-0 p-2">
                                  You cannot change the status of your own entries.
                                </div>
                              )}

                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Add Status Comment Card */}
                  <div className="col-12">
                    <div className="card bg-white">
                      <div className="card-header bg-light">
                        <h6 className="mb-0">💬 Add Status Comment</h6>
                      </div>
                      <div className="card-body">
                        <textarea
                          className="form-control"
                          rows={2}
                          placeholder="Add a status comment..."
                          value={detailsItem._pendingComment || ""}
                          onChange={(e) => setDetailsItem(prev => ({ ...prev, _pendingComment: e.target.value }))}
                          disabled={detailsItem.employeeName === effectiveName && !canUseAdminDropdown}
                        />
                        <div className="form-text small-text opacity-75">
                          {detailsItem.employeeName === effectiveName && !canUseAdminDropdown
                            ? "You can't change status comments on your own entry."
                            : "This note will be appended to status history with your name and timestamp."}
                        </div>
                        <div className="mt-2 d-flex justify-content-end">
                          <button
                            className="btn btn-outline-primary btn-sm"
                            disabled={!detailsItem?._pendingComment?.trim()}
                            onClick={async () => {
                              const target = detailsItem._fullPath || `${detailsItem._sourcePath}/${detailsItem._relPath}`;
                              const nowIso = new Date().toISOString();
                              const commentObj = {
                                action: "Comment",
                                comment: detailsItem._pendingComment || "",
                                user: effectiveName, // Use effectiveName instead of effectiveName
                                role: effectiveRole, // Use effectiveRole instead of effectiveRole
                                timestamp: nowIso,
                              };
                              const nextThread = [...(detailsItem.statusComments || []), commentObj];
                              await firebaseDB.child(target).update({ statusComments: nextThread });
                              setDetailsItem(prev => ({ ...prev, statusComments: nextThread, _pendingComment: "" }));
                            }}
                          >
                            Save Comment
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status Comments History */}
                  {visibleComments.length > 0 && (
                    <div className="col-12">
                      <div className="card bg-white">
                        <div className="card-header bg-light">
                          <h6 className="mb-0">📋 Status History</h6>
                        </div>
                        <div className="card-body">
                          <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                            {visibleComments.map((comment, index) => (
                              <div
                                key={index}
                                className={`border-start border-${comment.action === 'Rejected' ? 'danger' : comment.action === 'Clarification' ? 'warning' : 'success'} border-3 ps-3 mb-3`}
                              >
                                <p className="mb-0 mt-1">{comment.comment}</p>
                                <div className="d-flex justify-content-between align-items-start">
                                  <div>
                                    {/* <span className={`badge bg-${comment.action === 'Rejected' ? 'danger' : comment.action === 'Clarification' ? 'warning' : 'success'} me-2`}>
                                      {comment.action}
                                    </span> */}
                                    <small className="small-text opacity-75">{comment.user}</small>
                                    <small className="small-text opacity-75"> ({comment.role})</small>
                                  </div>
                                  <small className="small-text opacity-75">
                                    {new Date(comment.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                                  </small>
                                </div>

                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Special Notifications */}
                  {detailsItem.clarificationRequest?.text && (
                    <div className="col-12">
                      <div className="alert alert-warning mb-0">
                        <strong>❓ Clarification Requested:</strong> {detailsItem.clarificationRequest.text}
                        <br />
                        <small className="">
                          By {detailsItem.clarificationRequest.requestedBy || ""} • {detailsItem.clarificationRequest.requestedAt ?
                            new Date(detailsItem.clarificationRequest.requestedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : ""}
                        </small>
                      </div>
                    </div>
                  )}
                  {detailsItem.rejectionInfo?.reason && (
                    <div className="col-12">
                      <div className="alert alert-danger mb-0">
                        <strong>❌ Rejected:</strong> {detailsItem.rejectionInfo.reason}
                        <br />
                        <small className="">
                          By {detailsItem.rejectionInfo.rejectedBy || ""} • {detailsItem.rejectionInfo.rejectedAt ?
                            new Date(detailsItem.rejectionInfo.rejectedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : ""}
                        </small>
                      </div>
                    </div>
                  )}
                  {detailsItem.isDeleted && detailsItem.deleteInfo?.reason && (
                    <div className="col-12">
                      <div className="alert alert-secondary mb-0">
                        <strong>🗑️ Deleted:</strong> {detailsItem.deleteInfo.reason}
                        <br />
                        <small className="">
                          By {detailsItem.deleteInfo.deletedBy || ""} • {detailsItem.deleteInfo.deletedAt ?
                            new Date(detailsItem.deleteInfo.deletedAt).toLocaleString() : ""}
                        </small>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer" style={{ borderTop: "1px solid #dee2e6" }}>
                <button className="btn btn-secondary" onClick={() => { setDetailsOpen(false); setDetailsItem(null); }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}