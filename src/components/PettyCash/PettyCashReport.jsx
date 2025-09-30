// src/components/PettyCash/PettyCashReport.jsx
import React, { useEffect, useState, useRef, useMemo } from "react";
import firebaseDB from "../../firebase";
import { Tabs, Tab } from "react-bootstrap";
import * as XLSX from "xlsx";

/**
 * PettyCashReport.jsx (v4.1 - dedupe + stable updates + syntax fix)
 * - Fix: duplicate rows by de-duplicating on `_fullPath` across multiple Firebase roots
 * - Fix: status changes persist and row moves between tabs (updates use `_fullPath`)
 * - Category-wise table retained
 * - Syntax error fixed in othersKeys useMemo
 */

// ---- Helpers ----
function parseDateString(input) {
  if (!input) return null;
  if (input instanceof Date && !isNaN(input)) return input;

  // Native first
  const native = new Date(input);
  if (!isNaN(native)) return native;

  // DD-MM-YYYY or DD/MM/YYYY
  const m = String(input).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const dd = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    let yyyy = parseInt(m[3], 10);
    if (yyyy < 100) yyyy = 2000 + yyyy;
    const d = new Date(yyyy, (mm - 1), dd);
    if (!isNaN(d)) return d;
  }

  // YYYY-MM-DD or YYYY/MM/DD
  const m2 = String(input).match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m2) {
    const yyyy = parseInt(m2[1], 10);
    const mm = parseInt(m2[2], 10);
    const dd = parseInt(m2[3], 10);
    const d = new Date(yyyy, (mm - 1), dd);
    if (!isNaN(d)) return d;
  }
  return null;
}

const monthsList = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

// Determine if an object resembles a record
function looksLikeRecord(obj) {
  if (!obj || typeof obj !== "object") return false;
  const keys = Object.keys(obj);
  const hints = ["date","description","price","total","mainCategory","subCategory","approval","comments","quantity","employeeName","createdAt"];
  return keys.some(k => hints.includes(k));
}

// Deeply flatten nested maps into an array of records and capture the relative path
function flattenRecords(node, keyPath = []) {
  const out = [];
  if (!node || typeof node !== "object") return out;

  // If this node is a record, stop descending and return it with its rel path
  if (looksLikeRecord(node)) {
    const relPath = keyPath.join("/"); // e.g., "admin/-NtAbc123"
    const idGuess = keyPath[keyPath.length - 1] || Math.random().toString(36).slice(2);
    out.push({ id: idGuess, _relPath: relPath, ...node });
    return out;
  }

  // Otherwise descend
  Object.entries(node).forEach(([k, v]) => {
    if (v && typeof v === "object") {
      out.push(...flattenRecords(v, [...keyPath, k]));
    }
  });
  return out;
}

// Normalize a Firebase path
function normPath(p) {
  return String(p || "").replace(/\/+/g, "/").replace(/\/$/,"").replace(/^\//,"");
}

export default function PettyCashReport({ currentUser = "Admin", currentUserRole = "employee" }) {
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

  // Status tab
  const [statusTab, setStatusTab] = useState("Approved");

  // Clarification modal state
  const [showClarModal, setShowClarModal] = useState(false);
  const [clarText, setClarText] = useState("");
  const [clarItem, setClarItem] = useState(null);

  // Delete modal state (role-based)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleteItem, setDeleteItem] = useState(null);

  // Category accordion state
  const [collapsedCats, setCollapsedCats] = useState({});

  const tableRef = useRef(null);

  // --------- Data Fetch (multi-root flatten + de-dupe) ---------
  useEffect(() => {
    const candidateRoots = [
      "PettyCash",
      "FB/PettyCash",
      "PettyCash/admin",
      "FB/PettyCash/admin"
    ];

    const detach = [];
    const pathData = {}; // path -> raw flattened records
    const handleSnapshot = (path) => (snapshot) => {
      const next = [];
      if (snapshot && snapshot.exists && snapshot.exists()) {
        const rootVal = snapshot.val();
        const flattened = flattenRecords(rootVal, []);
        flattened.forEach((val) => {
          const pd = parseDateString(val.date || val.createdAt);
          const safeDate = pd ? pd.toISOString().slice(0, 10) : (val.date || "");
          const rel = normPath(val._relPath || val.id || "");
          const fullPath = normPath(`${path}/${rel}`); // stable location inside Firebase
          const id = `${fullPath}`; // use full path as unique id to avoid duplicates across roots
          next.push({ id, ...val, _parsedDate: pd, _safeDate: safeDate, _sourcePath: path, _relPath: rel, _fullPath: fullPath });
        });
      }
      pathData[path] = next;

      // --- De-duplicate across roots by _fullPath ---
      const mergedMap = new Map();
      Object.values(pathData).flat().forEach((rec) => {
        const prev = mergedMap.get(rec._fullPath);
        if (!prev || (prev._fullPath.length < rec._fullPath.length)) {
          mergedMap.set(rec._fullPath, rec);
        }
      });

      const merged = Array.from(mergedMap.values());
      merged.sort((a, b) => {
        const da = a._parsedDate ? a._parsedDate.getTime() : 0;
        const db = b._parsedDate ? b._parsedDate.getTime() : 0;
        return db - da;
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

  // Status matching (case-insensitive)
  const recordMatchesStatus = (r) => {
    const isDel = !!r.isDeleted;
    const approvalStatus = String(r.approval || "Pending").toLowerCase();
    const currentTab = statusTab.toLowerCase();

    if (currentTab === "delete") return isDel === true;
    if (currentTab === "clarification") return !isDel && approvalStatus === "clarification";
    if (currentTab === "approved") return !isDel && approvalStatus === "approved";
    if (currentTab === "rejected") return !isDel && approvalStatus === "rejected";
    if (currentTab === "pending") return !isDel && (approvalStatus === "pending" || !r.approval);
    if (currentTab === "all") return !isDel;
    return true;
  };

  // derive years dynamically
  const years = useMemo(() => {
    const set = new Set();
    data.forEach((d) => {
      const dt = d._parsedDate;
      if (dt) set.add(String(dt.getFullYear()));
    });
    if (set.size === 0) {
      return [String(new Date().getFullYear())];
    }
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [data]);

  // Counts per status for current Year/Month (for notification badges)
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
      const isDel = !!r.isDeleted;
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

  // year -> total count (for current status tab)
  const yearCounts = useMemo(() => {
    const map = {};
    years.forEach(y => map[y] = 0);
    data.forEach(d => {
      const dt = d._parsedDate;
      if (!dt) return;
      const y = String(dt.getFullYear());
      if (recordMatchesStatus(d) && map[y] !== undefined) map[y]++;
    });
    return map;
  }, [data, years, statusTab]);

  // month -> count for active year (for current status tab)
  const monthCountsForYear = useMemo(() => {
    const map = {}; monthsList.forEach(m => map[m] = 0);
    const yearRecs = data.filter(d => {
      const dt = d._parsedDate;
      return dt && String(dt.getFullYear()) === activeYear;
    });
    const statusApplied = yearRecs.filter(recordMatchesStatus);
    statusApplied.forEach(d => {
      const dt = d._parsedDate;
      if (!dt) return;
      const m = monthsList[dt.getMonth()];
      map[m]++;
    });
    return map;
  }, [data, activeYear, statusTab]);

  // Records for selected year and month (unfiltered by search/filters yet)
  const recordsForYearMonth = useMemo(() => {
    const filteredByYear = data.filter((d) => {
      const dt = d._parsedDate;
      return dt && String(dt.getFullYear()) === activeYear;
    });

    const filteredByStatus = filteredByYear.filter(recordMatchesStatus);

    if (activeMonth) {
      const monthFiltered = filteredByStatus.filter((d) => {
        const dt = d._parsedDate;
        return dt && monthsList[dt.getMonth()] === activeMonth;
      });
      return monthFiltered;
    }
    return filteredByStatus;
  }, [data, activeYear, activeMonth, statusTab]);

  // Case-insensitive Filters
  const applyFilters = (records) => {
    let recordsFiltered = records.slice();

    if (search) {
      const q = String(search).toLowerCase();
      recordsFiltered = recordsFiltered.filter((r) =>
        String(r.description || "").toLowerCase().includes(q) ||
        String(r.comments || "").toLowerCase().includes(q) ||
        String(r.mainCategory || "").toLowerCase().includes(q) ||
        String(r.subCategory || "").toLowerCase().includes(q) ||
        String(r.employeeName || "").toLowerCase().includes(q)
      );
    }

    if (mainCategory) {
      const m = String(mainCategory).toLowerCase();
      recordsFiltered = recordsFiltered.filter((r) => String(r.mainCategory || "").toLowerCase() === m);
    }
    if (subCategory) {
      const s = String(subCategory).toLowerCase();
      recordsFiltered = recordsFiltered.filter((r) => String(r.subCategory || "").toLowerCase() === s);
    }
    if (dateFrom) {
      const df = parseDateString(dateFrom);
      if (df) recordsFiltered = recordsFiltered.filter((r) => {
        const rd = r._parsedDate;
        return rd && rd >= df;
      });
    }
    if (dateTo) {
      const dt = parseDateString(dateTo);
      if (dt) {
        const dtEnd = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 23, 59, 59, 999);
        recordsFiltered = recordsFiltered.filter((r) => {
          const rd = r._parsedDate;
          return rd && rd <= dtEnd;
        });
      }
    }

    return recordsFiltered;
  };

  const filteredRecords = useMemo(
    () => applyFilters(recordsForYearMonth),
    [recordsForYearMonth, search, mainCategory, subCategory, dateFrom, dateTo]
  );

  // pagination helpers
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / rowsPerPage));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const indexOfLast = safePage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const pageItems = filteredRecords.slice(indexOfFirst, indexOfLast);

  useEffect(() => { 
    setCurrentPage(1); 
  }, [search, mainCategory, subCategory, dateFrom, dateTo, activeYear, activeMonth, rowsPerPage, statusTab]);

  // Export Excel (single function)
  const exportExcel = (records, label) => {
    const exportData = records.map((r) => ({
      Date: r._safeDate || r.date || "",
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
      "Source Path": r._sourcePath || "",
      "Full Path": r._fullPath || ""
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${label}-PettyCash`);
    XLSX.writeFile(wb, `${label}-PettyCash.xlsx`);
  };

  // Status badge class
  const statusColorClass = (status) => {
    const s = String(status || "Pending").toLowerCase();
    if (s === "approved") return "badge bg-success";
    if (s === "rejected") return "badge bg-danger";
    if (s === "clarification") return "badge bg-info text-dark";
    return "badge bg-warning text-dark";
  };

  // Category summary definitions
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

  // Build a map for summary with months + total (ONLY Approved and not deleted)
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

  // compute month totals & grand total (from summaryData)
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

  // totals for table (page total + filtered total) — ONLY Approved and not deleted
  const pageTotal = useMemo(() => {
    return pageItems
      .filter(r => !r.isDeleted && String(r.approval || "Pending").toLowerCase() === "approved")
      .reduce((s, r) => s + (Number(r.total || 0) || 0), 0);
  }, [pageItems]);

  const filteredTotal = useMemo(() => {
    return filteredRecords
      .filter(r => !r.isDeleted && String(r.approval || "Pending").toLowerCase() === "approved")
      .reduce((s, r) => s + (Number(r.total || 0) || 0), 0);
  }, [filteredRecords]);

  // Reset filters helper
  const resetFilters = () => {
    setSearch("");
    setMainCategory("");
    setSubCategory("");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  // Export
  const handleExportClick = (records) => {
    setMainCategory("");
    setSubCategory("");
    const label = `${activeYear}-${activeMonth || "all"}-${statusTab}`;
    exportExcel(records, label);
  };

  // UI options for main/sub dropdowns (case-insensitive unique)
  const mainOptions = useMemo(() => {
    const map = new Map();
    data.forEach(d => {
      const k = (d.mainCategory || "").trim();
      if (k) map.set(k.toLowerCase(), k);
    });
    map.set("others", "Others");
    return Array.from(map.values()).sort((a,b)=>a.localeCompare(b));
  }, [data]);

  const subOptions = useMemo(() => {
    if (!mainCategory) return [];
    const map = new Map();
    data.forEach(d => {
      if (String(d.mainCategory || "").toLowerCase() === String(mainCategory).toLowerCase()) {
        const sub = (d.subCategory || "").trim();
        if (sub) map.set(sub.toLowerCase(), sub);
      }
    });
    return Array.from(map.values()).sort((a,b)=>a.localeCompare(b));
  }, [data, mainCategory]);

  // compute others keys (FIXED SYNTAX)
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

  // Clarification
  const openClarModal = (item) => {
    setClarItem(item);
    setClarText("");
    setShowClarModal(true);
  };
  const closeClarModal = () => {
    setShowClarModal(false);
    setClarItem(null);
    setClarText("");
  };
  const submitClarification = async () => {
    if (!clarItem) return;
    const payload = {
      approval: "Clarification",
      clarificationRequest: {
        text: clarText || "No details provided",
        requestedBy: currentUser || "System",
        requestedAt: new Date().toISOString(),
      },
    };
    try {
      const target = clarItem._fullPath || `${clarItem._sourcePath}/${clarItem._relPath}`;
      await firebaseDB.child(target).update(payload);
      closeClarModal();
    } catch (err) {
      console.error("Error saving clarification request:", err);
    }
  };

  // Delete (mark as deleted) — only managers/admin
  const canDelete = ["manager", "admin"].includes(String(currentUserRole || "").toLowerCase());

  return (
    <div className="pettyCashReport">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Petty Cash Report</h3>
        {/* Status tabs */}
        <div className="btn-group" role="group" aria-label="Status tabs">
          {["All","Approved","Pending","Rejected","Clarification","Delete"].map(s => (
            <button
              key={s}
              className={`btn btn-sm ${statusTab.toLowerCase() === s.toLowerCase() ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => { setStatusTab(s); setCurrentPage(1); }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Notification-style status counts for current Year/Month selection */}
      <div className="d-flex flex-wrap gap-2 mb-3">
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

      {/* Year tabs */}
      <Tabs
        activeKey={activeYear}
        onSelect={(k) => { setActiveYear(String(k)); setActiveMonth(""); setCurrentPage(1); }}
        mountOnEnter
        unmountOnExit
        className="petty-tabs"
      >
        {years.map((y) => (
          <Tab eventKey={y} title={`${y} (${yearCounts[y] || 0})`} key={y}>
            {/* month tabs inside each year */}
            <div className="mb-3">
              <div className="d-flex gap-2 flex-wrap">
                {monthsList.map((m) => (
                  <button
                    key={m}
                    className={`btn btn-sm ${activeMonth === m ? "btn-primary" : "btn-outline-secondary"}`}
                    onClick={() => { setActiveMonth(m); setCurrentPage(1); }}
                    title={`Records: ${monthCountsForYear[m] || 0}`}
                  >
                    {m} <small className="opacity-75">({monthCountsForYear[m] || 0})</small>
                  </button>
                ))}
                <button
                  className={`btn btn-sm ${activeMonth === "" ? "btn-primary" : "btn-outline-secondary"}`}
                  onClick={() => { setActiveMonth(""); setCurrentPage(1); }}
                >
                  All months <small className="opacity-75">({recordsForYearMonth.length})</small>
                </button>
              </div>
            </div>

            {/* Filters row + reset + export */}
            <div className="row mb-3 g-2 align-items-center">
              <div className="col-md-4">
                <input type="text" className="form-control" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="col-md-2">
                <select className="form-select" value={mainCategory} onChange={(e) => { setMainCategory(e.target.value); setSubCategory(""); }}>
                  <option value="">All Main Categories</option>
                  {mainOptions.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="col-md-2">
                <select className="form-select" value={subCategory} onChange={(e) => setSubCategory(e.target.value)} disabled={!mainCategory}>
                  <option value="">All Sub Categories</option>
                  {subOptions.map((sub)=> <option key={sub} value={sub}>{sub}</option>)}
                </select>
              </div>
              <div className="col-md-1">
                <input type="date" className="form-control" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="col-md-1">
                <input type="date" className="form-control" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>

              {/* Reset + Export buttons column */}
              <div className="col-md-2 d-flex flex-row gap-2">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => resetFilters()} title="Reset filters">Reset</button>
                <button className="btn btn-primary btn-sm" onClick={() => handleExportClick(filteredRecords)} title="Export visible records">Export</button>
              </div>
            </div>

            {/* Table */}
            <div className="table-responsive" ref={tableRef}>
              {filteredRecords.length === 0 ? (
                <div className="alert alert-warning text-center">
                  No records found for the selected filters. 
                  <br />
                  Status: <strong>{statusTab}</strong> | Year: <strong>{activeYear}</strong> | Month: <strong>{activeMonth || "All"}</strong>
                </div>
              ) : (
                <table className="table table-dark table-hover table-sm align-middle">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Date</th>
                      <th>Main Category</th>
                      <th>Sub Category</th>
                      <th>Description</th>
                      <th>Quantity</th>
                      <th>Price</th>
                      <th>Total</th>
                      <th>Comments</th>
                      <th>Purchased By</th>
                      <th>Actions</th>
                      <th>Approval</th>
                      <th>Clarification</th>
                      <th>Delete Note</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((item, idx) => {
                      return (
                        <tr key={item.id}>
                          <td>{indexOfFirst + idx + 1}</td>
                          <td>{item._safeDate || item.date}</td>
                          <td>{item.mainCategory}</td>
                          <td>{item.subCategory}</td>
                          <td>{item.description}</td>
                          <td>{item.quantity}</td>
                          <td>{item.price}</td>
                          <td>{item.total}</td>
                          <td style={{ maxWidth: 220, whiteSpace: "pre-wrap" }}>{item.comments}</td>
                          <td>{item.employeeName || "—"}</td>
                          <td>
                            <div className="d-flex gap-1">
                              <button className="btn btn-sm btn-outline-warning" title="Ask Clarification" onClick={() => openClarModal(item)}>❓</button>
                              {canDelete && (
                                <button className="btn btn-sm btn-outline-danger" title="Delete (mark as deleted)" onClick={() => { setDeleteItem(item); setDeleteText(""); setShowDeleteModal(true); }}>🗑️</button>
                              )}
                            </div>
                          </td>
                          <td style={{ minWidth: 260 }}>
                            <div className="d-flex align-items-center gap-2">
                              <span className={statusColorClass(item.approval)} style={{ minWidth: 96, textAlign: "center" }}>
                                {item.approval || "Pending"}
                              </span>
                              <select
                                className="form-select form-select-sm"
                                value={item.approval || "Pending"}
                                onChange={async (e) => {
                                  try {
                                    const target = item._fullPath || `${item._sourcePath}/${item._relPath}`;
                                    await firebaseDB.child(target).update({ approval: e.target.value });
                                  } catch (err) {
                                    console.error("Error updating approval", err);
                                  }
                                }}
                              >
                                <option value="Pending">Pending</option>
                                <option value="Approved">Approved</option>
                                <option value="Clarification">Clarification</option>
                                <option value="Rejected">Rejected</option>
                              </select>
                            </div>
                          </td>
                          <td style={{ maxWidth: 240, whiteSpace: "pre-wrap" }}>
                            {item.clarificationRequest?.text ? (
                              <small>
                                <strong>Req:</strong> {item.clarificationRequest.text}{" "}
                                <em className="text-muted">
                                  ({item.clarificationRequest.requestedBy || ""} @{" "}
                                  {item.clarificationRequest.requestedAt ? new Date(item.clarificationRequest.requestedAt).toLocaleString() : ""})
                                </em>
                              </small>
                            ) : <span className="text-muted">—</span>}
                          </td>
                          <td style={{ maxWidth: 240, whiteSpace: "pre-wrap" }}>
                            {item.isDeleted && item.deleteInfo?.reason ? (
                              <small>
                                <strong>Del:</strong> {item.deleteInfo.reason}{" "}
                                <em className="text-muted">
                                  ({item.deleteInfo.deletedBy || ""} @ {item.deleteInfo.deletedAt ? new Date(item.deleteInfo.deletedAt).toLocaleString() : ""})
                                </em>
                              </small>
                            ) : <span className="text-muted">—</span>}
                          </td>
                          <td><code>{item._fullPath}</code></td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* table footer: page total + filtered total (Approved only, not deleted) */}
                  <tfoot>
                    <tr className="table-secondary">
                      <td colSpan={7} className="text-end"><strong>Page Total (Approved)</strong></td>
                      <td><strong>{pageTotal.toLocaleString()}</strong></td>
                      <td colSpan={8}></td>
                    </tr>
                    <tr className="table-secondary">
                      <td colSpan={7} className="text-end"><strong>Filtered Total (Approved)</strong></td>
                      <td><strong>{filteredTotal.toLocaleString()}</strong></td>
                      <td colSpan={8}></td>
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

      {/* Category Summary (global) — Approved only, not deleted */}
      <div className="d-flex justify-content-between align-items-center mb-2 mt-5">
        <h4 className="opacity-85">Category Wise Summary (All Years, Approved Only)</h4>
      </div>

      <div className="table-responsive">
        <table className="table table-bordered table-hover pettyCash-Category table-sm table-striped align-middle">
          <thead className="table-light">
            <tr>
              <th style={{width: 220}}>Main Category</th>
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

      {/* Clarification Modal */}
      {showClarModal && clarItem && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Ask Clarification</h5>
                <button type="button" className="btn-close" onClick={closeClarModal}></button>
              </div>
              <div className="modal-body">
                <p className="mb-2">
                  Please enter the clarification reason. This will be saved with the record and visible in the list.
                </p>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Enter reason..."
                  value={clarText}
                  onChange={(e) => setClarText(e.target.value)}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeClarModal}>Cancel</button>
                <button type="button" className="btn btn-primary" disabled={!clarText.trim()} onClick={submitClarification}>
                  Save Clarification
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal (Managers/Admin only) */}
      {showDeleteModal && deleteItem && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Delete (Mark as Deleted)</h5>
                <button type="button" className="btn-close" onClick={() => { setShowDeleteModal(false); setDeleteItem(null); setDeleteText(""); }}></button>
              </div>
              <div className="modal-body">
                <p className="mb-2">Provide a reason for deleting this entry. It will be saved and shown in the list. Deleted entries are excluded from all calculations.</p>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Delete reason..."
                  value={deleteText}
                  onChange={(e) => setDeleteText(e.target.value)}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowDeleteModal(false); setDeleteItem(null); setDeleteText(""); }}>Cancel</button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={!deleteText.trim()}
                  onClick={async () => {
                    if (!deleteItem) return;
                    try {
                      const target = `${deleteItem._sourcePath}`;
                      await firebaseDB.child(target).update({
                        isDeleted: true,
                        deleteInfo: {
                          reason: deleteText,
                          deletedBy: currentUser || "System",
                          deletedAt: new Date().toISOString(),
                        },
                      });
                      setShowDeleteModal(false);
                      setDeleteItem(null);
                      setDeleteText("");
                    } catch (err) {
                      console.error("Error deleting entry:", err);
                    }
                  }}
                >
                  Save Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
