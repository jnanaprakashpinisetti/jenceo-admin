// src/components/Enquiries/EnquiriesDisplay.jsx
import React, { useState, useEffect, useMemo } from "react";
import firebaseDB from "../../firebase";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import editIcon from "../../assets/eidt.svg";
import viewIcon from "../../assets/view.svg";
import deleteIcon from "../../assets/delete.svg";
import EnquiryModal from "./EnquiryModal";
import { useAuth } from "../../context/AuthContext";

/* ========= Helpers (aligned with WorkerCalleDisplay) ========= */
// Date parsing + formatting like WorkerCalleDisplay
const parseDate = (v) => {
  if (!v) return null;
  if (typeof v === "object" && v && "seconds" in v) return new Date(v.seconds * 1000);
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  if (typeof v === "number") {
    const n = new Date(v);
    return isNaN(n.getTime()) ? null : n;
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    const iso = new Date(s);
    if (!isNaN(iso.getTime())) return iso;
    const parts = s.split(/[\/-]/);
    if (parts.length === 3) {
      let y, m, d;
      if (parts[0].length === 4) { y = +parts[0]; m = +parts[1] - 1; d = +parts[2]; }
      else if (+parts[0] > 12) { d = +parts[0]; m = +parts[1] - 1; y = +parts[2]; }
      else { m = +parts[0] - 1; d = +parts[1]; y = +parts[2]; }
      const dt = new Date(y, m, d);
      if (!isNaN(dt.getTime())) return dt;
    }
  }
  const dt = new Date(v);
  return isNaN(dt.getTime()) ? null : dt;
};
const isValidDate = (d) => d instanceof Date && !isNaN(d.getTime());
const formatDDMMYYYY = (v) => {
  const d = parseDate(v);
  return isValidDate(d) ? d.toLocaleDateString("en-GB") : "—";
};
const formatTime = (v, mode = "12hr") => {
  const d = parseDate(v);
  if (!isValidDate(d)) return "";
  const opts = mode === "24hr"
    ? { hour12: false, hour: "2-digit", minute: "2-digit" }
    : { hour12: true, hour: "numeric", minute: "2-digit" };
  return d.toLocaleTimeString([], opts);
};
const ordinal = (n) => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
const formatPrettyDate = (v) => {
  const d = parseDate(v);
  if (!isValidDate(d)) return "—";
  const day = d.getDate();
  const month = d.toLocaleString("en-GB", { month: "short" });
  const year = String(d.getFullYear()).slice(-2);
  return `${ordinal(day)} ${month} ${year}`;
};
const hasTimeData = (raw) => {
  const d = parseDate(raw);
  if (!isValidDate(d)) return false;
  const hasNonMidnight = !(d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0);
  const s = String(raw || "");
  const hasTimeInStr = s.includes("T") || s.includes(":") || /am|pm/i.test(s);
  return hasNonMidnight || hasTimeInStr;
};
const daysUntil = (v) => {
  const d = parseDate(v);
  if (!isValidDate(d)) return Number.POSITIVE_INFINITY;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const dd = new Date(d);
  dd.setHours(0, 0, 0, 0);
  return Math.ceil((dd - t) / (1000 * 60 * 60 * 24));
};

// Uniformly resolve "Added By" from Users like WorkerCalleDisplay
const resolveAddedBy = (row, usersMap = {}) => {
  if (!row) return "";
  const direct = [row.addedBy, row.createdBy, row.userName, row.username, row.createdByName, row.addedByName];
  for (const d of direct) {
    const clean = String(d || "").trim().replace(/@.*/, "");
    if (clean) return clean;
  }
  const ids = [row.createdById, row.addedById, row.createdByUid, row.addedByUid, row.uid, row.userId];
  for (const id of ids) {
    if (id && usersMap[id]) {
      const u = usersMap[id];
      const cands = [u.name, u.displayName, u.username, u.email];
      for (const c of cands) {
        const clean = String(c || "").trim().replace(/@.*/, "");
        if (clean) return clean;
      }
    }
  }
  if (row.user && typeof row.user === "object") {
    const cands = [row.user.name, row.user.displayName, row.user.userName, row.user.email];
    for (const c of cands) {
      const clean = String(c || "").trim().replace(/@.*/, "");
      if (clean) return clean;
    }
  }
  return "";
};

/* Permissions same style as WorkerCalleDisplay */
const derivePermissions = (authUser, explicit) => {
  if (explicit && typeof explicit === "object") {
    return {
      canView: explicit.view ?? true,
      canEdit: explicit.edit ?? false,
      canDelete: explicit.delete ?? false,
      canExport: explicit.export ?? false,
      canManageUsers: explicit.manageUsers ?? false,
    };
  }
  const role = String(authUser?.role || "viewer").toLowerCase();
  const base = {
    canView: true,
    canEdit: ["admin", "editor", "manager", "supervisor"].includes(role),
    canDelete: ["admin", "manager"].includes(role),
    canExport: ["admin", "manager", "supervisor"].includes(role),
    canManageUsers: role === "admin",
  };
  if (authUser?.permissions && typeof authUser.permissions === "object") {
    const p = authUser.permissions["Enquiry Data"] || authUser.permissions["Enquiries"] || authUser.permissions;
    return {
      canView: p.view ?? base.canView,
      canEdit: p.edit ?? base.canEdit,
      canDelete: p.delete ?? base.canDelete,
      canExport: p.export ?? base.canExport,
      canManageUsers: p.manageUsers ?? base.canManageUsers,
    };
  }
  return base;
};

/* ID helpers */
const twoDigit = (n) => String(Math.max(1, Number(n) || 1)).padStart(2, "0");
const buildEnqId = (n) => `E-${twoDigit(n)}`;

/* ========= Component ========= */
const EnquiriesDisplay = ({ permissions: permissionsProp }) => {
  const { user: authUser } = useAuth();
  const permissions = derivePermissions(authUser, permissionsProp);

  // Data + UI
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterThrough, setFilterThrough] = useState("");
  const [filterReminder, setFilterReminder] = useState(""); // now used for active badges
  const [sortDir, setSortDir] = useState("desc");

  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  const [reminderCounts, setReminderCounts] = useState({
    overdue: 0, today: 0, tomorrow: 0, upcoming: 0,
  });

  const [activeYear, setActiveYear] = useState(new Date().getFullYear());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [sortBy, setSortBy] = useState("date");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("view");
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);


  // Users map (for “By {user}” under ID)
  const [usersMap, setUsersMap] = useState({});
  useEffect(() => {
    const ref = firebaseDB.child("Users");
    const cb = ref.on("value", (snap) => setUsersMap(snap.val() || {}));
    return () => ref.off("value", cb);
  }, []);

  // Fetch
  useEffect(() => {
    setLoading(true);
    const ref = firebaseDB.child("EnquiryData");
    const handler = (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.keys(data).map((key) => ({ id: key, ...data[key] }));
        setEnquiries(list);
        updateReminderCounts(list);
      } else {
        setEnquiries([]);
        setReminderCounts({ overdue: 0, today: 0, tomorrow: 0, upcoming: 0 });
      }
      setLoading(false);
    };
    ref.on("value", handler);
    return () => ref.off("value", handler);
  }, []); // :contentReference[oaicite:7]{index=7}

  // Reminder counts + class helpers (kept from your file)
  const updateReminderCounts = (list) => {
    const today = new Date();
    const tStr = today.toISOString().split("T")[0];
    const tm = new Date(today); tm.setDate(today.getDate() + 1);
    const tmStr = tm.toISOString().split("T")[0];

    const counts = { overdue: 0, today: 0, tomorrow: 0, upcoming: 0 };
    list.forEach((enq) => {
      if (!enq.reminderDate) return;
      if (enq.reminderDate < tStr) counts.overdue++;
      else if (enq.reminderDate === tStr) counts.today++;
      else if (enq.reminderDate === tmStr) counts.tomorrow++;
      else counts.upcoming++;
    });
    setReminderCounts(counts);
  }; // :contentReference[oaicite:8]{index=8}

  const getReminderClass = (date) => {
    if (!date) return "";
    const today = new Date();
    const tStr = today.toISOString().split("T")[0];
    const tm = new Date(today); tm.setDate(today.getDate() + 1);
    const tmStr = tm.toISOString().split("T")[0];

    if (date < tStr) return "overdue";
    if (date === tStr) return "today";
    if (date === tmStr) return "tomorrow";
    return "upcoming";
  }; // :contentReference[oaicite:9]{index=9}

  const getStatusClass = (status) => {
    switch (status) {
      case "Enquiry": return "status-enquiry";
      case "Pending": return "status-pending";
      case "On Boarding": return "status-onboarding";
      case "No Response": return "status-noresponse";
      default: return "";
    }
  }; // :contentReference[oaicite:10]{index=10}


  // Filtering + Sorting (existing)
  const filteredEnquiries = enquiries
    .filter((enq) => {
      const q = search.trim().toLowerCase();
      const idTerm = q.replace(/[\s_-]/g, "");

      const fields = [
        enq.name, enq.mobile, enq.amount, enq.service,
        enq.through, enq.status, enq.comments, enq.location, enq.gender
      ].map(v => String(v || "").toLowerCase());

      // include id & idNo
      const idText = String(enq.id || "").toLowerCase().replace(/[\s_-]/g, "");
      const idNoText = String(enq.idNo || "").toLowerCase().replace(/[\s_-]/g, "");

      const matchesSearch = !q || fields.some(f => f.includes(q)) || idText.includes(idTerm) || idNoText.includes(idTerm);

      const matchesStatus = filterStatus ? String(enq.status || "").toLowerCase() === String(filterStatus).toLowerCase() : true;
      const matchesThrough = filterThrough ? String(enq.through || "").toLowerCase() === String(filterThrough).toLowerCase() : true;
      const matchesReminder = filterReminder ? getReminderClass(enq.reminderDate) === filterReminder : true;

      return matchesSearch && matchesStatus && matchesThrough && matchesReminder;
    })
    // sorting continues below …

    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;

      if (sortBy === "id") {
        const num = (s) => {
          const m = /e[\s_-]*0*?(\d+)/i.exec(String(s || "")) || /^0*?(\d+)$/.exec(String(s || ""));
          return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
        };
        return dir * (num(a.idNo) - num(b.idNo));
      }

      if (sortBy === "name") return dir * String(a.name || "").localeCompare(String(b.name || ""));
      if (sortBy === "amount") return dir * ((Number(a.amount) || 0) - (Number(b.amount) || 0));

      if (sortBy === "reminderDate") {
        const da = a.reminderDate ? new Date(a.reminderDate).getTime() : Number.POSITIVE_INFINITY;
        const db = b.reminderDate ? new Date(b.reminderDate).getTime() : Number.POSITIVE_INFINITY;
        return dir * (da - db);
      }

      // default: date
      const da = a.date ? new Date(a.date).getTime() : -Infinity;
      const db = b.date ? new Date(b.date).getTime() : -Infinity;
      return dir * (da - db);
    });


  // === Daily Activity (bar graph + pie) — same logic style as WorkerCalleDisplay ===
  // Use createdAt/createdOn/date, and updatedAt where available; count user’s NEW/MODIFIED per day.
  const currentUserId = authUser?.dbId || authUser?.uid || authUser?.id || null;

  // Daily Activity Logic
  const currentUserName =
    (currentUserId && (usersMap[currentUserId]?.name || usersMap[currentUserId]?.displayName)) ||
    authUser?.displayName ||
    (authUser?.email ? authUser.email.replace(/@.*/, "") : "") ||
    "User";

  // === helper to build per-day grid for Daily Activity ===
  const buildDayGrid = (byUser = true) => {
    const grid = {};
    const bump = (m, d, kind) => {
      if (!grid[m]) grid[m] = {};
      if (!grid[m][d]) grid[m][d] = { new: 0, modified: 0, total: 0 };
      grid[m][d][kind] += 1;
      grid[m][d].total += 1;
    };
    const processed = new Set();

    enquiries.forEach((e) => {
      const createdBy = e.createdById || e.addedById || e.createdByUid || e.addedByUid || e.uid || e.userId;
      const updatedBy = e.updatedById || e.updatedByUid;
      const createdAt = parseDate(e.createdAt || e.createdOn || getBaseDate(e));
      const updatedAt = parseDate(e.updatedAt || e.updated_on || e.editedAt);

      const createdYearMatch = isValidDate(createdAt) && createdAt.getFullYear() === activeYear;
      const updatedYearMatch = isValidDate(updatedAt) && updatedAt.getFullYear() === activeYear;

      const userCreated = byUser ? (createdBy && currentUserId && createdBy === currentUserId) : true;
      const userUpdated = byUser ? (updatedBy && currentUserId && updatedBy === currentUserId) : true;

      const key = `${e.id}-${activeYear}`;
      if (createdYearMatch && userCreated && !processed.has(key)) {
        processed.add(key);
        bump(createdAt.getMonth(), createdAt.getDate(), "new");
      } else if (updatedYearMatch && userUpdated && !processed.has(key)) {
        processed.add(key);
        bump(updatedAt.getMonth(), updatedAt.getDate(), "modified");
      }
    });

    return grid;
  };

  // Use a consistent "base date" like WorkerCalleDisplay
  const getBaseDate = (e) => {
    // Prefer explicit timestamp fields if present
    if (e?.timestamp) return e.timestamp;
    if (e?.createdAt) return e.createdAt;
    if (e?.createdOn) return e.createdOn;
    // Fallback to date
    return e?.date ?? null;
  };



  // Pagination
  const indexOfLast = currentPage * recordsPerPage;
  const indexOfFirst = indexOfLast - recordsPerPage;
  const currentEnquiries = filteredEnquiries.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredEnquiries.length / recordsPerPage);

  const paginate = (n) => setCurrentPage(n);
  const getDisplayedPageNumbers = () => {
    if (totalPages <= 1) return [1];
    const delta = 2;
    const range = [];
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }
    if (currentPage - delta > 2) range.unshift("...");
    if (currentPage + delta < totalPages - 1) range.push("...");
    range.unshift(1);
    range.push(totalPages);
    return range;
  }; // :contentReference[oaicite:12]{index=12}

  // Month-wise summary
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const years = Array.from(
    new Set(
      enquiries
        .map((e) => parseDate(getBaseDate(e)))
        .filter((d) => isValidDate(d))
        .map((d) => d.getFullYear())
    )
  ).sort((a, b) => a - b);

  const throughOptions = ["Poster", "Reference", "Hospital-Agent", "Medical Cover", "JustDial", "Facebook", "Instagram", "LinkedIn", "YouTube", "Website", "Google"];

  const getSummaryData = (year) => {
    const summaryData = {};
    throughOptions.forEach((t) => { summaryData[t] = Array(12).fill(0); });
    enquiries.forEach((enq) => {
      if (enq.through && enq.date) {
        const d = new Date(enq.date);
        if (d.getFullYear() === year && summaryData[enq.through]) {
          summaryData[enq.through][d.getMonth()]++;
        }
      }
    });
    return summaryData;
  };
  const summaryData = useMemo(() => getSummaryData(activeYear), [enquiries, activeYear]); // :contentReference[oaicite:13]{index=13}



  // helper stays outside hooks
  const isGridEmpty = (g) => Object.values(g || {}).every(mo => !mo || Object.keys(mo).length === 0);

  // Build BOTH grids with hooks (stable order)
  const userDayGrid = useMemo(() => buildDayGrid(true), [enquiries, activeYear, currentUserId]);
  const allDayGrid = useMemo(() => buildDayGrid(false), [enquiries, activeYear]);

  // Choose which one to use (also a hook, but not conditional)
  const dayGrid = useMemo(
    () => (isGridEmpty(userDayGrid) ? allDayGrid : userDayGrid),
    [userDayGrid, allDayGrid]
  );





  const [activeMonth, setActiveMonth] = useState(new Date().getMonth());

  const classifyCount = (n) => {
    if (!n || n === 0) return { label: "No Calls", cls: "perf-none" };
    if (n <= 20) return { label: "Poor Performance", cls: "perf-poor" };
    if (n <= 40) return { label: "Average", cls: "perf-avg" };
    if (n <= 60) return { label: "Good", cls: "perf-good" };
    if (n <= 80) return { label: "Very Good", cls: "perf-vgood" };
    if (n <= 90) return { label: "Excellent", cls: "perf-exc" };
    return { label: "Marvelous", cls: "perf-marv" };
  };

  // graphDays — aggregates all months when activeMonth === 'all'
  const graphDays = useMemo(() => {
    if (activeMonth === 'all') {
      const dim = 31;
      const arr = [];
      for (let d = 1; d <= dim; d++) {
        let total = 0;
        for (let m = 0; m < 12; m++) {
          total += (dayGrid[m] && dayGrid[m][d]?.total) || 0;
        }
        total = Math.min(100, total);
        arr.push({ day: d, total, ...classifyCount(total) });
      }
      return arr;
    } else {
      const dim = new Date(activeYear, (activeMonth ?? 0) + 1, 0).getDate();
      const arr = [];
      for (let d = 1; d <= dim; d++) {
        const cell = (dayGrid[activeMonth] && dayGrid[activeMonth][d]) || { total: 0 };
        const total = Math.min(100, cell.total || 0);
        arr.push({ day: d, total, ...classifyCount(total) });
      }
      return arr;
    }
  }, [dayGrid, activeYear, activeMonth]);

  // pieAgg — aggregates buckets across all months when activeMonth === 'all'
  const pieAgg = useMemo(() => {
    const agg = { none: 0, poor: 0, avg: 0, good: 0, vgood: 0, exc: 0, marv: 0 };
    if (activeMonth === 'all') {
      for (let m = 0; m < 12; m++) {
        const dim = new Date(activeYear, m + 1, 0).getDate();
        for (let d = 1; d <= dim; d++) {
          const total = (dayGrid[m] && dayGrid[m][d]?.total) || 0;
          const { cls } = classifyCount(total);
          if (cls === "perf-none") agg.none++; else if (cls === "perf-poor") agg.poor++;
          else if (cls === "perf-avg") agg.avg++; else if (cls === "perf-good") agg.good++;
          else if (cls === "perf-vgood") agg.vgood++; else if (cls === "perf-exc") agg.exc++; else agg.marv++;
        }
      }
    } else {
      const dim = new Date(activeYear, (activeMonth ?? 0) + 1, 0).getDate();
      for (let d = 1; d <= dim; d++) {
        const total = (dayGrid[activeMonth] && dayGrid[activeMonth][d]?.total) || 0;
        const { cls } = classifyCount(total);
        if (cls === "perf-none") agg.none++; else if (cls === "perf-poor") agg.poor++;
        else if (cls === "perf-avg") agg.avg++; else if (cls === "perf-good") agg.good++;
        else if (cls === "perf-vgood") agg.vgood++; else if (cls === "perf-exc") agg.exc++; else agg.marv++;
      }
    }
    return agg;
  }, [dayGrid, activeYear, activeMonth]);



  const hasActiveFilter =
    !!search || !!filterStatus || !!filterThrough || !!filterReminder ||
    sortBy !== "date" || sortDir !== "desc" || currentPage !== 1;



  // Exports (enabled by permissions)
  const exportToExcel = () => {
    if (!permissions.canExport) return;
    const ws = XLSX.utils.json_to_sheet(filteredEnquiries);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Enquiries");
    XLSX.writeFile(wb, "Enquiries.xlsx");
  };
  const exportToCSV = () => {
    if (!permissions.canExport) return;
    const ws = XLSX.utils.json_to_sheet(filteredEnquiries);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Enquiries.csv";
    link.click();
  }; // :contentReference[oaicite:14]{index=14}


  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Enquiries Report", 14, 10);
    if (doc.autoTable) {
      doc.autoTable({
        head: [["Name", "Mobile", "Service", "Amount", "Through", "Status", "Reminder Date"]],
        body: filteredEnquiries.map((e) => [
          e.name || "", e.mobile || "", e.service || "", e.amount || "", e.through || "", e.status || "", e.reminderDate || "",
        ]),
      });
    } else {
      filteredEnquiries.forEach((e, i) => {
        doc.text(
          `${i + 1}. ${e.name} | ${e.mobile} | ${e.service} | ${e.amount} | ${e.through} | ${e.status} | ${e.reminderDate}`,
          10, 20 + i * 10
        );
      });
    }
    doc.save("Enquiries.pdf");
  }; // :contentReference[oaicite:15]{index=15}

  const resetFilters = () => {
    setSearch("");
    setFilterStatus("");
    setFilterThrough("");
    setFilterReminder("");
    setSortBy("date");
    setCurrentPage(1);
  }; // :contentReference[oaicite:16]{index=16}

  // Modal handlers
  const handleView = (enquiry) => { setSelectedEnquiry(enquiry); setModalMode("view"); setShowModal(true); };
  const handleEdit = (enquiry) => { if (!permissions.canEdit) return; setSelectedEnquiry(enquiry); setModalMode("edit"); setShowModal(true); };
  const confirmDelete = (enquiry) => { if (!permissions.canDelete) return; setDeleteItem(enquiry); setDeleteReason(""); setShowDeleteModal(true); };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      // keep a note in comments
      const deleteComment = {
        text: `Deleted Reason: ${deleteReason}`.trim(),
        date: new Date().toISOString(),
        id: Date.now()
      };

      const existing = Array.isArray(deleteItem.comments) ? deleteItem.comments : [];
      const updatedComments = [deleteComment, ...existing];

      const payload = {
        ...deleteItem,
        comments: updatedComments,
        deleteReason,
        deletedAt: new Date().toISOString(),
        originalId: deleteItem.id
      };

      // move to DeletedEnquiries, then remove original
      const newRef = firebaseDB.child("DeletedEnquiries").push();
      await newRef.set(payload);
      await firebaseDB.child(`EnquiryData/${deleteItem.id}`).remove();

      // local state updates
      setEnquiries((prev) => prev.filter((e) => e.id !== deleteItem.id));
      setShowDeleteModal(false);
      setDeleteItem(null);
      setDeleteReason("");
    } catch (err) {
      console.error("Error deleting enquiry:", err);
      alert("There was an error deleting the enquiry. Please try again.");
    }
  };


  /* Totals row for month-wise table */
  const monthTotals = useMemo(() => {
    const totals = Array(12).fill(0);
    throughOptions.forEach((t) => {
      summaryData[t].forEach((cnt, i) => totals[i] += cnt);
    });
    const grand = totals.reduce((a, b) => a + b, 0);
    return { totals, grand };
  }, [summaryData, throughOptions]);



  return (
    <>
      <h3 className="mb-3 text-info">Enquiries</h3>

      {/* Reminder badges with active state (click to filter) */}
      <div className="alert alert-info d-flex justify-content-around flex-wrap reminder-badges">
        {[
          { key: "overdue", label: "Overdue", count: reminderCounts.overdue },
          { key: "today", label: "Today", count: reminderCounts.today },
          { key: "tomorrow", label: "Tomorrow", count: reminderCounts.tomorrow },
          { key: "upcoming", label: "Upcoming", count: reminderCounts.upcoming },
        ].map((b) => (
          <span
            key={b.key}
            role="button"
            className={`reminder-badge ${b.key} ${filterReminder === b.key ? "active" : ""}`}
            onClick={() => setFilterReminder(filterReminder === b.key ? "" : b.key)}
          >
            {b.label}: <strong>{b.count}</strong>
          </span>
        ))}
      </div> {/* Styled like WorkerCalleDisplay’s active reminder badges. :contentReference[oaicite:17]{index=17} */}

      {/* Search + Filters + Admin-style controls */}
      <div className="row mb-3">
        <div className="col-md-3 mb-2">
          <input
            type="text"
            className="form-control"
            placeholder="Search by name, mobile, service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="col-md-2 mb-2">
          <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option>Enquiry</option>
            <option>Pending</option>
            <option>On Boarding</option>
            <option>No Response</option>
          </select>
        </div>
        <div className="col-md-2 mb-2">
          <select className="form-select" value={filterThrough} onChange={(e) => setFilterThrough(e.target.value)}>
            <option value="">All Through</option>
            {throughOptions.map((t) => (<option key={t}>{t}</option>))}
          </select>
        </div>
        <div className="col-md-2 mb-2">
          <select className="form-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="amount">Sort by Amount</option>
            <option value="reminderDate">Sort by Reminder Date</option>
          </select>
        </div>
        <div className="col-md-2 mb-2">
          <select className="form-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="date">Sort by Date</option>
            <option value="id">Sort by ID</option>
            <option value="name">Sort by Name</option>
            <option value="amount">Sort by Amount</option>
            <option value="reminderDate">Sort by Reminder Date</option>
          </select>
        </div>
        <div className="col-md-1 mb-2">
          <select className="form-select" value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
            <option value="asc">▲ Ass</option>
            <option value="desc">▼ Dess</option>
          </select>
        </div>

        <div className="col-md-3 d-flex gap-2 flex-wrap">
          <button
            className={`btn flex-fill mb-2 ${permissions.canExport ? "btn-success" : "btn-outline-secondary"}`}
            onClick={exportToExcel}
            disabled={!permissions.canExport}
            title={permissions.canExport ? "Export to Excel" : "Export disabled"}
          >
            Excel
          </button>
          <button
            className={`btn flex-fill mb-2 ${permissions.canExport ? "btn-info" : "btn-outline-secondary"}`}
            onClick={exportToCSV}
            disabled={!permissions.canExport}
            title={permissions.canExport ? "Export to CSV" : "Export disabled"}
          >
            CSV
          </button>
          {/* <button className="btn btn-danger flex-fill mb-2" onClick={exportToPDF}>PDF</button> */}
          <button
            className={`btn flex-fill mb-2 btn-warning ${hasActiveFilter ? "btn-reset-pulse" : ""}`}
            onClick={resetFilters}
            title="Reset filters"
          >
            Reset
          </button>

        </div>
      </div>

      <div className="row d-flex">
        <div className="mb-3">
          <select
            className="form-select form-select-sm w-auto"
            value={recordsPerPage}
            onChange={(e) => { setRecordsPerPage(Number(e.target.value)); setCurrentPage(1); }}
          >
            <option value={10}>10 / Rows</option>
            <option value={25}>25 / Rows</option>
            <option value={50}>50 / Rows</option>
            <option value={100}>100 / Rows</option>
          </select>
        </div>
      </div>

      {/* Main table */}
      {loading ? (
        <div className="text-center my-4"><div className="spinner-border text-primary" role="status"></div></div>
      ) : filteredEnquiries.length === 0 ? (
        <div className="alert alert-warning">No records found.</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-dark table-hover">
            <thead className="table-dark">
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Name</th>
                <th>Gender</th>
                <th>Mobile No</th>
                <th>Service</th>
                <th>Amount</th>
                <th>Through</th>
                <th>Status</th>
                <th>Reminder</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentEnquiries.map((enq, idx) => {
                const idNo = enq.idNo || buildEnqId(indexOfFirst + idx + 1);
                const addedBy = resolveAddedBy(enq, usersMap); // author who actually created/added
                const createdWhen = enq.createdAt || enq.addedAt || enq.timestamp || enq.date || null;
                const reminder = enq.reminderDate || null;
                const hasRem = isValidDate(parseDate(reminder));
                const du = hasRem ? daysUntil(reminder) : Number.POSITIVE_INFINITY;
                const remTextClass = !hasRem ? "text-secondary" : du < 0 ? "text-danger" : du === 0 ? "text-warning" : du === 1 ? "text-info" : "text-success";
                return (
                  <tr
                    key={enq.id}
                    style={{ cursor: "pointer" }}
                    onClick={(e) => {
                      if (e.target.closest("button,a,.btn")) return;
                      handleView(enq);
                    }}
                  >
                    <td>
                      {idNo}
                      {addedBy && (
                      <small className="d-block small-text text-info opacity-75" >
                      By <strong>{addedBy}</strong>
                      {/* {createdWhen ? (
                      <> on {formatDDMMYYYY(createdWhen)} {formatTime(createdWhen, "12hr")}</>
                      ) : null} */}
                      </small>
                      )}
                      </td>


                    <td>
                      {formatPrettyDate(enq.date)}
                      {hasTimeData(enq.timestamp || enq.date) &&
                        <small className="d-block small-text text-info opacity-75">{formatTime(enq.timestamp || enq.date, "12hr")}</small>}
                    </td>
                    <td>{enq.name || "—"}</td>
                    <td>
                      <span className={enq.gender === "Male" ? "badge opacity-75 bg-primary" : enq.gender === "Female" ? "badge badge-female" : "badge bg-secondary"}>
                        {enq.gender || "—"}
                      </span>
                    </td>
                    <td>
                      <a href={`tel:${enq.mobile}`} className="btn btn-sm btn-outline-info me-2">Call</a>
                      <a
                        href={`https://wa.me/${String(enq.mobile || "").replace(/\D/g, "")}?text=${encodeURIComponent("Hello, This is Sudheer from JenCeo Home Care Services")}`}
                        target="_blank" rel="noreferrer"
                        className="btn btn-sm btn-outline-warning"
                        onClick={(e) => e.stopPropagation()}
                      >
                        WAP
                      </a>
                    </td>
                    <td>{enq.service}</td>
                    <td>{enq.amount}</td>
                    <td>{enq.through}</td>
                    <td className={getStatusClass(enq.status)}>
                      <span className="status-badge">{enq.status || "—"}</span>
                    </td>
                    <td className={remTextClass}>
                      <span className={`d-inline-block px-2 py-1 rounded ${getReminderClass(enq.reminderDate)}`}>
                        {hasRem ? formatDDMMYYYY(reminder) : "N/A"}
                      </span>
                      {hasRem && (
                        <small className="d-block">
                          {du === 0 ? "Today" : du > 0 ? `in ${du} day${du > 1 ? "s" : ""}` : `${Math.abs(du)} day${Math.abs(du) > 1 ? "s" : ""} ago`}
                        </small>
                      )}
                    </td>
                    <td>
                      <button className="btn btn-sm me-1" onClick={() => handleView(enq)}>
                        <img src={viewIcon} alt="view" width="18" height="18" />
                      </button>
                      <button className="btn btn-sm me-1" onClick={() => handleEdit(enq)} disabled={!permissions.canEdit} title={!permissions.canEdit ? "Edit disabled" : "Edit"}>
                        <img src={editIcon} alt="edit" width="15" height="15" />
                      </button>
                      <button className="btn btn-sm" onClick={() => confirmDelete(enq)} disabled={!permissions.canDelete} title={!permissions.canDelete ? "Delete disabled" : "Delete"}>
                        <img src={deleteIcon} alt="delete" width="14" height="14" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination w/ First & Last */}
      <div className="d-flex justify-content-center align-items-center mt-3 flex-wrap">
        {totalPages > 1 && (
          <nav aria-label="Enquiry pagination" className="pagination-wrapper mb-2">
            <ul className="pagination justify-content-center">
              <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                <button className="page-link" onClick={() => paginate(1)} disabled={currentPage === 1} aria-label="First">«</button>
              </li>
              <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                <button className="page-link" onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} aria-label="Previous">‹</button>
              </li>
              {getDisplayedPageNumbers().map((number, i) => (
                <li key={i} className={`page-item ${number === currentPage ? "active" : ""} ${number === "..." ? "disabled" : ""}`}>
                  {number === "..." ? <span className="page-link">…</span> : <button className="page-link" onClick={() => paginate(number)}>{number}</button>}
                </li>
              ))}
              <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                <button className="page-link" onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} aria-label="Next">›</button>
              </li>
              <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                <button className="page-link" onClick={() => paginate(totalPages)} disabled={currentPage === totalPages} aria-label="Last">»</button>
              </li>
            </ul>
          </nav>
        )}
      </div>

      {/* Daily Activity Section */}
      <hr />
      <h4 className="mt-2 mb-3 text-info">Daily Activity — <span className="text-warning">{currentUserName}</span></h4>
      <div className="d-flex align-items-center justify-content-between flex-wrap">
        <div className="d-flex flex-wrap gap-2 mb-3">
          {months.map((m, mi) => (
            <button
              key={m}
              type="button"
              className={`btn btn-sm w-auto ${mi === activeMonth ? "btn-warning text-dark" : "btn-outline-warning"}`}
              onClick={() => setActiveMonth(mi)}
            >
              {m}
            </button>
          ))}
          <button
            type="button"
            className={`btn btn-sm w-auto ${activeMonth === 'all' ? "btn-warning text-dark" : "btn-outline-warning"}`}
            onClick={() => setActiveMonth('all')}
          >
            All
          </button>


        </div>
        <div className="d-flex gap-2 mb-3">
          <select className="form-select form-select-sm" value={activeYear} onChange={(e) => setActiveYear(parseInt(e.target.value, 10))}>
            {years.map((y) => (<option key={y} value={y}>{y}</option>))}
          </select>
        </div>
      </div>

      {/* Desktop Table - hidden on mobile */}
      <div className="table-responsive mb-3 d-none d-lg-block">
        <div className="bg-dark border border-secondary rounded p-3">
          <table className="table table-dark table-hover" style={{ fontSize: "12px" }}>
            <thead>
              <tr>
                <th style={{ whiteSpace: "nowrap" }}>Month \\ Day</th>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (<th key={d} style={{ textAlign: "center" }}>{d}</th>))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m, mi) => (
                (activeMonth === 'all' || mi === activeMonth) ? (
                  <tr key={m}>
                    <td className="text-info fw-bold">{m}</td>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                      const dim = new Date(activeYear, mi + 1, 0).getDate();
                      const cell = (dayGrid[mi] && dayGrid[mi][d]) || { new: 0, modified: 0, total: 0 };
                      const within = d <= dim; const total = within ? cell.total : 0;
                      const { cls } = classifyCount(total);
                      return (
                        <td key={d} className={within ? `text-center perf-text ${cls}` : "bg-secondary-subtle"}>
                          {within ? (total > 0 ? `${cell.new}/${cell.modified} (${total})` : "•") : ""}
                        </td>
                      );
                    })}
                    <td className="fw-bold">
                      {Array.from({ length: new Date(activeYear, mi + 1, 0).getDate() }, (_, i) => {
                        const d = i + 1;
                        return (dayGrid[mi] && dayGrid[mi][d]?.total) || 0;
                      }).reduce((a, b) => a + b, 0)}
                    </td>
                  </tr>
                ) : null
              ))}
            </tbody>


          </table>
        </div>
      </div>

      {/* Mobile Table - hidden on desktop */}
      <div className="d-lg-none mb-3">
        <div className="bg-dark border border-secondary rounded p-3">
          <h6 className="text-info mb-3">Monthly Performance - {activeYear}</h6>
          <div className="table-responsive">
            <table className="table table-dark table-sm" style={{ fontSize: "11px" }}>
              <thead>
                <tr>
                  <th>Day</th>
                  {months.map((month, index) =>
                    (activeMonth === 'all' || index === activeMonth)
                      ? <th key={month} className="text-center">{month.substring(0, 3)}</th>
                      : null
                  )}
                </tr>
              </thead>

              <tbody>
                {Array.from({ length: 31 }, (_, dayIndex) => dayIndex + 1).map((day) => (
                  <tr key={day}>
                    <td className="fw-bold text-info">{day}</td>
                    {months.map((month, monthIndex) => {
                      if (!(activeMonth === 'all' || monthIndex === activeMonth)) return null;
                      const dim = new Date(activeYear, monthIndex + 1, 0).getDate();
                      const within = day <= dim;
                      const cell = (dayGrid[monthIndex] && dayGrid[monthIndex][day]) || { new: 0, modified: 0, total: 0 };
                      const { cls } = classifyCount(cell.total);

                      return (
                        <td key={`${month}-${day}`} className={`text-center ${within ? `perf-text ${cls}` : "bg-secondary"}`}>
                          {within ? (cell.total > 0 ? cell.total : "•") : ""}
                        </td>
                      );
                    })}


                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Charts */}
      {/* Charts */}
      {activeMonth != null && (
        <div className="row g-4 mb-4">
          {/* Desktop Bar Chart */}
          <div className="col-md-8 d-none d-lg-block">
            <div className="bg-dark border border-secondary rounded p-3 h-100">
              <div className="d-flex justify-content-between align-items-center">
                <div className="text-info"><strong>Daily Calls</strong> — {activeMonth === 'all' ? 'All Months' : months[activeMonth]} {activeYear} (0–100)</div>
                <span className="small text-muted">New + Modified</span>
              </div>
              <div className="mt-3">
                <div className="bar-graph">
                  {graphDays.map((g) => (
                    <div key={g.day} className={`bar ${g.cls}`} title={`${activeMonth === 'all' ? 'All Months' : months[activeMonth]} ${g.day}: ${g.total}`} style={{ height: `${g.total}%` }}>
                      <span className="bar-label">{g.day}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 small d-flex flex-wrap gap-3 align-items-center pt-3 justify-content-between">
                  <span className="legend perf-none">No Call Days (0)</span>
                  <span className="legend perf-poor">Poor (1–20)</span>
                  <span className="legend perf-avg">Average (21–40)</span>
                  <span className="legend perf-good">Good (41–60)</span>
                  <span className="legend perf-vgood">Very Good (61–80)</span>
                  <span className="legend perf-exc">Excellent (81–90)</span>
                  <span className="legend perf-marv">Marvelous (91+)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Bar Chart */}
          <div className="col-12 d-lg-none">
            <div className="bg-dark p-3 border border-secondary">
              <div className="d-flex justify-content-between align-items-center">
                <div className="text-info"><strong>Daily Calls</strong> — {activeMonth === 'all' ? 'All Months' : months[activeMonth]} {activeYear}</div>
                <span className="small text-muted">New + Modified</span>
              </div>
              <div className="mt-3">
                <div className="horizontal-bar-graph">
                  {graphDays.map((g) => (
                    <div key={g.day} className="bar-row border rounded p-2 mb-2">
                      <div className="d-flex justify-content-between align-items-center mb-0">
                        <span className="bar-label small text-info">Day {g.day}</span>
                        <div className="d-flex" style={{ width: "80%" }}>
                          {g.total > 0 ? (
                            <div
                              className={`bar-horizontal mChart ${g.cls}`}
                              style={{
                                width: `${g.total}%`,
                                height: "15px",
                                minWidth: "8px",
                                borderRadius: "0px 4px 4px 0"
                              }}
                              title={`${activeMonth === 'all' ? 'All Months' : months[activeMonth]} ${g.day}: ${g.total}`}
                            ></div>
                          ) : (
                            <div
                              className="bar-horizontal perf-none"
                              style={{
                                width: "8px",
                                height: "15px"
                              }}
                              title={`${activeMonth === 'all' ? 'All Months' : months[activeMonth]} ${g.day}: No calls`}
                            ></div>
                          )}
                        </div>
                        <span className="bar-value small text-warning">{g.total}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 small d-flex flex-wrap gap-2 align-items-center pt-3 justify-content-center">
                  <span className="legend perf-none">0</span>
                  <span className="legend perf-poor">1-20</span>
                  <span className="legend perf-avg">21-40</span>
                  <span className="legend perf-good">41-60</span>
                  <span className="legend perf-vgood">61-80</span>
                  <span className="legend perf-exc">81-90</span>
                  <span className="legend perf-marv">91-100</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="col-md-4 col-12">
            <div className="bg-dark border border-secondary rounded p-3 h-100">
              <div className="text-info"><strong>Performance Mix</strong> — {activeMonth === 'all' ? 'All Months' : months[activeMonth]} {activeYear}</div>
              <div className="d-flex flex-column align-items-center justify-content-center mt-3 gap-3">
                {(() => {
                  const total = Object.values(pieAgg).reduce((a, b) => a + b, 0) || 1;
                  const seg = (k) => (pieAgg[k] / total) * 360;
                  const grads = [
                    `var(--perf-none) 0 ${seg("none")}deg`,
                    `var(--perf-poor) ${seg("none")}deg ${seg("none") + seg("poor")}deg`,
                    `var(--perf-avg) ${seg("none") + seg("poor")}deg ${seg("none") + seg("poor") + seg("avg")}deg`,
                    `var(--perf-good) ${seg("none") + seg("poor") + seg("avg")}deg ${seg("none") + seg("poor") + seg("avg") + seg("good")}deg`,
                    `var(--perf-vgood) ${seg("none") + seg("poor") + seg("avg") + seg("good")}deg ${seg("none") + seg("poor") + seg("avg") + seg("good") + seg("vgood")}deg`,
                    `var(--perf-exc) ${seg("none") + seg("poor") + seg("avg") + seg("good") + seg("vgood")}deg ${seg("none") + seg("poor") + seg("avg") + seg("good") + seg("vgood") + seg("exc")}deg`,
                    `var(--perf-marv) ${seg("none") + seg("poor") + seg("avg") + seg("good") + seg("vgood") + seg("exc")}deg 360deg`
                  ].join(", ");
                  return (
                    <div className="pie-wrap">
                      <div
                        className="pie"
                        style={{
                          background: `conic-gradient(${grads})`,
                          width: window.innerWidth < 768 ? "150px" : "200px",
                          height: window.innerWidth < 768 ? "150px" : "200px"
                        }}
                      />
                    </div>
                  );
                })()}
                <div className="mt-3 small w-100 d-flex flex-wrap justify-content-center gap-2">
                  <span className="legend perf-none">No Call Days: {pieAgg.none}</span>
                  <span className="legend perf-poor">Poor: {pieAgg.poor}</span>
                  <span className="legend perf-avg">Average: {pieAgg.avg}</span>
                  <span className="legend perf-good">Good: {pieAgg.good}</span>
                  <span className="legend perf-vgood">Very Good: {pieAgg.vgood}</span>
                  <span className="legend perf-exc">Excellent: {pieAgg.exc}</span>
                  <span className="legend perf-marv">Marvelous: {pieAgg.marv}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Month-wise summary (with totals row) */}
      <h4 className="mt-4">Month-wise Enquiry Summary</h4>
      <div className="summary-tabs-container">
        <ul className="nav nav-tabs summary-tabs mb-3">
          {years.map((y) => (
            <li className="nav-item" key={y}>
              <button className={`nav-link summary-tab ${activeYear === y ? "active" : ""}`} onClick={() => setActiveYear(y)}>
                {y}
              </button>
            </li>
          ))}
        </ul>
        <div className="table-responsive summary-table-container">
          <table className="table table-dark summary-table table-hover">
            <thead className="summary-table-header">
              <tr>
                <th>Through</th>
                {months.map((m) => <th key={m}>{m}</th>)}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {throughOptions.map((t) => (
                <tr key={t} className="summary-table-row">
                  <td className="source-name">{t}</td>
                  {summaryData[t].map((count, idx) => (
                    <td key={idx} className={count > 0 ? "has-data" : ""}>{count || ""}</td>
                  ))}
                  <td className="total-cell">{summaryData[t].reduce((a, b) => a + b, 0)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="fw-bold">
                <td>Monthly Total</td>
                {monthTotals.totals.map((n, i) => <td key={i}>{n}</td>)}
                <td>{monthTotals.grand}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal (unchanged behavior) */}
      {showDeleteModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-warning">
                <h5 className="modal-title">Confirm Delete</h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)}></button>
              </div>
              <div className="modal-body">
                <p className="mb-2">Please enter a delete reason. The enquiry will be moved to Deleted Enquiries and the reason will be saved and shown in the modal comments.</p>
                <textarea className="form-control" rows={4} value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} placeholder="Delete reason."></textarea>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleDelete} disabled={!deleteReason.trim()}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enquiry Modal */}
      {showModal && selectedEnquiry && (
        <EnquiryModal
          show={showModal}
          onClose={() => setShowModal(false)}
          enquiry={selectedEnquiry}
          mode={modalMode}
          currentUser={authUser?.displayName || "Admin"}
          onSaveSuccess={() => {/* refetch handled by realtime */ }}
        />
      )}

      <style>{`
  .badge-female { background: #e83e8c; color: white; }

  .bar-graph { display:grid; grid-template-columns: repeat(31, minmax(6px,1fr)); gap:6px; align-items:end; height:220px; }
  .bar { position:relative; background: var(--perf-avg); border-radius:3px 3px 0 0; }
  .bar .bar-label { position:absolute; bottom:-18px; left:50%; transform:translateX(-50%); font-size:10px; color:#999; }
  
  .horizontal-bar-graph { max-height: 400px; overflow-y: auto; }
  .bar-horizontal { transition: width 0.3s ease; }
  
  .legend { display:inline-flex; align-items:center; gap:6px; padding:2px 8px; border-radius:999px; }
  .legend::before { content:""; display:inline-block; width:12px; height:12px; border-radius:50%; background: currentColor; }

  .perf-text.perf-none { color: var(--perf-none) !important; font-size:10px}
  .perf-text.perf-poor { color: var(--perf-poor) !important; font-size:10px}
  .perf-text.perf-avg { color: var(--perf-avg) !important; font-size:10px}
  .perf-text.perf-good { color: var(--perf-good) !important; font-size:10px}
  .perf-text.perf-vgood { color: var(--perf-vgood) !important; font-size:10px}
  .perf-text.perf-exc { color: var(--perf-exc) !important; font-size:10px}
  .perf-text.perf-marv { color: var(--perf-marv) !important; font-size:10px}

  .legend.perf-none { background-color: var(--perf-none) !important; }
  .legend.perf-poor { background-color: var(--perf-poor) !important; }
  .legend.perf-avg { background-color: var(--perf-avg) !important; }
  .legend.perf-good { background-color: var(--perf-good) !important; }
  .legend.perf-vgood { background-color: var(--perf-vgood) !important; }
  .legend.perf-exc { background-color: var(--perf-exc) !important; }
  .legend.perf-marv { background-color: var(--perf-marv) !important; }
  
  .bar.perf-none { background-color: var(--perf-none) !important; }
  .bar.perf-poor { background-color: var(--perf-poor) !important; }
  .bar.perf-avg { background-color: var(--perf-avg) !important; }
  .bar.perf-good { background-color: var(--perf-good) !important; }
  .bar.perf-vgood { background-color: var(--perf-vgood) !important; }
  .bar.perf-exc { background-color: var(--perf-exc) !important; }
  .bar.perf-marv { background-color: var(--perf-marv) !important; }
  

  
  .mChart.perf-poor { background-color: var(--perf-poor); }
  .mChart.perf-avg { background-color: var(--perf-avg); }
  .mChart.perf-good { background-color: var(--perf-good); }
  .mChart.perf-vgood { background-color: var(--perf-vgood); }
  .mChart.perf-exc { background-color: var(--perf-exc); }
  .mChart.perf-marv { background-color: var(--perf-marv); }
  
  .perf-text.perf-none, .perf-text.perf-poor, .perf-text.perf-avg, .perf-text.perf-good, .perf-text.perf-vgood, .perf-text.perf-exc, .perf-text.perf-marv { font-weight:600; }
  
  .pie-wrap { width:180px; height:180px; display:grid; place-items:center; }
  .pie { width:160px; height:160px; border-radius:50%; }

  :root {
    --perf-none:#44434e; 
    --perf-poor:#dc3545; 
    --perf-avg:#ffc107;
    --perf-good:#0dcaf0; 
    --perf-vgood:#20c997; 
    --perf-exc:#198754; 
    --perf-marv:#6f42c1;
  }
`}</style>
    </>
  );
};

export default EnquiriesDisplay;
