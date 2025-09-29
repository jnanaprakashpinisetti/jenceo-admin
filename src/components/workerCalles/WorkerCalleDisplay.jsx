// src/components/workerCalles/WorkerCalleDisplay.jsx
import React, { useEffect, useMemo, useState } from "react";
import firebaseDB from "../../firebase";
import WorkerCallModal from "./WorkerCallModal";
import viewIcon from "../../assets/view.svg";
import editIcon from "../../assets/eidt.svg";
import deleteIcon from "../../assets/delete.svg";
import * as XLSX from "xlsx";

/* ------------ date helpers ------------ */
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const parseDate = (v) => {
  if (!v) return null;
  if (typeof v === "object" && v && "seconds" in v) return new Date(v.seconds * 1000);
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  if (typeof v === "string") {
    const s = v.trim(); if (!s) return null;
    const iso = new Date(s); if (!isNaN(iso.getTime())) return iso;
    const parts = s.split(/[\/-]/);
    if (parts.length === 3) {
      let y, m, d;
      if (parts[0].length === 4) { y = +parts[0]; m = +parts[1] - 1; d = +parts[2]; }
      else if (+parts[0] > 12) { d = +parts[0]; m = +parts[1] - 1; y = +parts[2]; }
      else { m = +parts[0] - 1; d = +parts[1]; y = +parts[2]; }
      const dt = new Date(y, m, d); if (!isNaN(dt.getTime())) return dt;
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
const daysUntil = (v) => {
  const d = parseDate(v);
  if (!isValidDate(d)) return Number.POSITIVE_INFINITY;
  return Math.ceil((startOfDay(d) - startOfDay(new Date())) / (1000 * 60 * 60 * 24));
};
const urgencyClass = (v) => {
  const du = daysUntil(v);
  if (!isFinite(du)) return "";
  if (du < 0) return "reminder-overdue";
  if (du === 0) return "reminder-today";
  if (du === 1) return "reminder-tomorrow";
  return "reminder-upcoming";
};
const normalizeArray = (val) =>
  Array.isArray(val)
    ? val.filter(Boolean)
    : typeof val === "string"
    ? val.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

/* ------------ looks-like-a-worker detector ------------ */
const isWorkerShape = (v) => {
  if (!v || typeof v !== "object") return false;
  return Boolean(v.name || v.mobileNo || v.location || v.gender || v.skills || v.conversationLevel || v.callThrough || v.through || v.source);
};

/* ------------ flatten up to depth=3 under WorkerCallData ------------ */
function collectWorkersFromSnapshot(rootSnap) {
  const rows = [];
  if (!rootSnap.exists()) return rows;
  const collectChild = (snap, depth = 1) => {
    if (!snap) return;
    const val = snap.val();
    if (isWorkerShape(val)) {
      rows.push({ id: snap.key, ...val });
      return;
    }
    if (typeof val === "object" && snap.hasChildren() && depth < 3) {
      snap.forEach((child) => collectChild(child, depth + 1));
    }
  };
  rootSnap.forEach((child) => collectChild(child, 1));
  return rows;
}


export default function WorkerCalleDisplay() {
  // data
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // view/modals
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // filters & sort
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]); // NEW: Job Roles filter
  const [selectedGender, setSelectedGender] = useState([]);
  const [reminderFilter, setReminderFilter] = useState(""); // '', 'overdue','today','tomorrow','upcoming'
  const [sortBy, setSortBy] = useState("id"); // 'id' | 'name' | 'callReminderDate'
  const [sortDir, setSortDir] = useState("desc");

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // summary (year / month / day)
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const callThroughOptions = [
    "Apana","WorkerIndian","Reference","Poster","Agent","Facebook","LinkedIn","Instagram","YouTube","Website","Just Dail","News Paper"
  ];
  const [activeYear, setActiveYear] = useState(new Date().getFullYear());
  const [activeMonth, setActiveMonth] = useState(null); // 0-11 or null

  /* --- FETCH --- */
  useEffect(() => {
    const ref = firebaseDB.child("WorkerCallData");
    const cb = ref.on("value", (snap) => {
      try {
        const list = collectWorkersFromSnapshot(snap);
        setWorkers(list);
        setLoading(false);
      } catch (e) {
        setError(e.message || "Failed to load data");
        setLoading(false);
      }
    });
    return () => ref.off("value", cb);
  }, []);

  /* badge counts (from ALL rows) */
  const badgeCounts = useMemo(() => {
    const c = { overdue: 0, today: 0, tomorrow: 0, upcoming: 0 };
    workers.forEach((w) => {
      const du = daysUntil(w?.callReminderDate);
      if (!isFinite(du)) return;
      if (du < 0) c.overdue++;
      else if (du === 0) c.today++;
      else if (du === 1) c.tomorrow++;
      else c.upcoming++;
    });
    return c;
  }, [workers]);

  // Options for filters
  const skillOptions = ["Nursing", "Patient Care", "Care Taker", "Old Age Care", "Baby Care", "Bedside Attender", "Supporting", "Any duty", "Daiper"];
  const roleOptions = [
    "Computer Operating","Tele Calling","Driving","Supervisor","Manager","Attender","Security",
    "Carpenter","Painter","Plumber","Electrician","Mason (Home maker)","Tailor","Labour","Farmer","Delivery Boy"
  ];

  // Helper to get a worker's roles value across possible keys (string or array)
  const getWorkerRoles = (w) => {
    const val = w?.jobRole ?? w?.role ?? w?.roles ?? w?.profession ?? w?.designation ?? w?.workType ?? "";
    return normalizeArray(val).map((s) => String(s).toLowerCase());
  };
  // Helper to get a worker's skills (string or array)
  const getWorkerSkills = (w) => normalizeArray(w?.skills).map((s) => String(s).toLowerCase());

  /* filtering (case-insensitive for ALL filters & search) */
  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return workers.filter((w) => {
      // search
      if (term) {
        const hay = `${w?.name ?? ""} ${w?.location ?? ""} ${String(w?.mobileNo ?? "")}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      // gender (case-insensitive)
      if (selectedGender.length > 0) {
        const g = String(w?.gender ?? "").toLowerCase();
        const wanted = selectedGender.map((x) => String(x).toLowerCase());
        if (!wanted.includes(g)) return false;
      }
      // skills (any-match; case-insensitive)
      if (selectedSkills.length > 0) {
        const have = getWorkerSkills(w);
        const want = selectedSkills.map((s) => String(s).toLowerCase());
        if (!want.some((s) => have.includes(s))) return false;
      }
      // roles (any-match; case-insensitive)
      if (selectedRoles.length > 0) {
        const have = getWorkerRoles(w);
        const want = selectedRoles.map((s) => String(s).toLowerCase());
        if (!want.some((s) => have.includes(s))) return false;
      }
      // reminder bucket
      if (reminderFilter) {
        const du = daysUntil(w?.callReminderDate);
        if (!isFinite(du)) return false;
        if (reminderFilter === "overdue" && !(du < 0)) return false;
        if (reminderFilter === "today" && du !== 0) return false;
        if (reminderFilter === "tomorrow" && du !== 1) return false;
        if (reminderFilter === "upcoming" && !(du >= 2)) return false;
      }
      return true;
    });
  }, [workers, searchTerm, selectedGender, selectedSkills, selectedRoles, reminderFilter]);

  /* sorting (case-insensitive where applicable) */
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      if (sortBy === "name") {
        return dir * String(a?.name ?? "").toLowerCase().localeCompare(String(b?.name ?? "").toLowerCase());
      }
      if (sortBy === "callReminderDate") {
        const da = parseDate(a?.callReminderDate);
        const db = parseDate(b?.callReminderDate);
        const av = isValidDate(da) ? da.getTime() : Number.POSITIVE_INFINITY;
        const bv = isValidDate(db) ? db.getTime() : Number.POSITIVE_INFINITY;
        return dir * (av - bv);
      }
      // default id (string compare, insensitive)
      return dir * String(a?.id ?? "").toLowerCase().localeCompare(String(b?.id ?? "").toLowerCase());
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  /* pagination */
  const totalPages = useMemo(() => Math.max(1, Math.ceil(sorted.length / rowsPerPage)), [sorted, rowsPerPage]);
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const indexOfLast = safePage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const pageItems = useMemo(() => sorted.slice(indexOfFirst, indexOfLast), [sorted, indexOfFirst, indexOfLast]);

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedGender, selectedSkills, selectedRoles, reminderFilter, rowsPerPage]);

  /* actions */
  const handleView = (w) => { setSelectedWorker(w); setIsEditMode(false); setIsModalOpen(true); };
  const handleEdit = (w) => { setSelectedWorker(w); setIsEditMode(true); setIsModalOpen(true); };
  const handleDelete = (w) => { setSelectedWorker(w); setShowDeleteConfirm(true); };
  const handleDeleteConfirmed = async () => {
    if (!selectedWorker) return;
    try {
      await firebaseDB.child(`DeletedWorkersData/${selectedWorker.id}`).set({
        ...selectedWorker, originalId: selectedWorker.id, deletedAt: new Date().toISOString(),
      });
      await firebaseDB.child(`WorkerCallData/${selectedWorker.id}`).remove();
      setShowDeleteConfirm(false);
      setSelectedWorker(null);
    } catch (err) { console.error("Error deleting worker:", err); }
  };

  const resetFilters = () => {
    setSearchTerm(""); setSelectedSkills([]); setSelectedRoles([]); setSelectedGender([]);
    setReminderFilter(""); setSortBy("id"); setSortDir("desc");
    setRowsPerPage(10); setCurrentPage(1);
  };

  /* export current filtered view */
  const handleExport = () => {
    const exportData = sorted.map((w, i) => {
      const du = daysUntil(w?.callReminderDate);
      const duText = isFinite(du)
        ? du === 0 ? "Today" : du === 1 ? "Tomorrow" : du < 0 ? `${Math.abs(du)} days ago` : `${du} days`
        : "";
      const comms = (w?.communications ?? w?.communication ?? w?.conversation ?? w?.conversationLevel ?? "") || "";
      const callThrough = w?.callThrough || w?.through || w?.source || "";
      return {
        "S.No": i + 1,
        Name: w?.name ?? "",
        Location: w?.location ?? "",
        Gender: w?.gender ?? "",
        Skills: normalizeArray(w?.skills).join(", "),
        Roles: normalizeArray(w?.jobRole ?? w?.role ?? w?.roles ?? w?.profession ?? w?.designation ?? w?.workType ?? "").join(", "),
        "Reminder Date": formatDDMMYYYY(w?.callReminderDate),
        "Days Until": duText,
        Mobile: w?.mobileNo ?? "",
        Communications: comms,
        "Call Through": callThrough
      };
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Workers");
    XLSX.writeFile(wb, "WorkerCallData.xlsx");
  };

  // ---------- YEAR / MONTH / DAY SUMMARY ----------
  const years = useMemo(() => {
    const ys = new Set();
    workers.forEach((w) => {
      const d = parseDate(w?.date || w?.callReminderDate || w?.createdAt);
      if (isValidDate(d)) ys.add(d.getFullYear());
    });
    const sortedYs = Array.from(ys).sort((a, b) => a - b);
    return sortedYs.length ? sortedYs : [new Date().getFullYear()];
  }, [workers]);

  // keep activeYear valid (hook must not be conditional)
  useEffect(() => {
    if (!years.includes(activeYear)) {
      setActiveYear(years[years.length - 1]);
      setActiveMonth(null);
    }
  }, [years, activeYear]);

  // month summary per "callThrough"
  const monthSummary = useMemo(() => {
    const summary = {};
    callThroughOptions.forEach((t) => { summary[t] = Array(12).fill(0); });
    workers.forEach((w) => {
      const d = parseDate(w?.date || w?.callReminderDate || w?.createdAt);
      if (!isValidDate(d) || d.getFullYear() !== activeYear) return;
      const m = d.getMonth();
      const src = (w?.callThrough || w?.through || w?.source || "").trim();
      const key = callThroughOptions.find(o => o.toLowerCase() === src.toLowerCase());
      if (key) summary[key][m] += 1;
    });
    return summary;
  }, [workers, activeYear]);

  // day summary for active month (compute always, guard with null)
  const daySummary = useMemo(() => {
    if (activeMonth === null) return null;
    const daysInMonth = new Date(activeYear, activeMonth + 1, 0).getDate();
    const summary = {};
    callThroughOptions.forEach((t) => { summary[t] = Array(daysInMonth).fill(0); });
    workers.forEach((w) => {
      const d = parseDate(w?.date || w?.callReminderDate || w?.createdAt);
      if (!isValidDate(d) || d.getFullYear() !== activeYear || d.getMonth() !== activeMonth) return;
      const day = d.getDate(); // 1..days
      const src = (w?.callThrough || w?.through || w?.source || "").trim();
      const key = callThroughOptions.find(o => o.toLowerCase() === src.toLowerCase());
      if (key) summary[key][day - 1] += 1;
    });
    return summary;
  }, [workers, activeYear, activeMonth]);

  // helper to build max-10 page numbers around current page
  const getDisplayedPageNumbers = () => {
    const totalPagesCalc = totalPages;
    const maxBtns = 10;
    if (totalPagesCalc <= maxBtns) return Array.from({ length: totalPagesCalc }, (_, i) => i + 1);
    const half = Math.floor(maxBtns / 2);
    let start = Math.max(1, safePage - half);
    let end = start + maxBtns - 1;
    if (end > totalPagesCalc) { end = totalPagesCalc; start = end - maxBtns + 1; }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  /* ---- RENDER ---- */
  if (loading) return <div className="text-center my-5">Loading…</div>;
  if (error) return <div className="alert alert-danger">Error: {error}</div>;

  return (
    <div className="p-3">
      {/* top controls */}
      <div className="alert alert-info d-flex justify-content-between flex-wrap reminder-badges">
        <div className="d-flex align-items-center">
          <span className="me-2 text-white opacity-75">Show</span>
          <select
            className="form-select form-select-sm"
            style={{ width: 80 }}
            value={rowsPerPage}
            onChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10) || 10); setCurrentPage(1); }}
          >
            {[10, 20, 30, 40, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <span className="ms-2 text-white opacity-75">entries</span>
        </div>

        <input
          type="text"
          className="form-control opacity-75"
          placeholder="Search name, location, mobile…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: 500 }}
        />

        <div className="d-flex gap-2">
          <select className="form-select opacity-75" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="id">Sort by ID</option>
            <option value="name">Sort by Name</option>
            <option value="callReminderDate">Sort by Reminder Date</option>
          </select>
          <select className="form-select opacity-75" value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>

        <div className="d-flex gap-2">
          <button className="btn btn-success" onClick={handleExport}>Export Excel</button>
          <button className="btn btn-secondary" onClick={resetFilters}>Reset</button>
        </div>
      </div>

      {/* reminder badges as filters */}
      <div className="alert alert-info d-flex justify-content-around flex-wrap reminder-badges">
        {["overdue", "today", "tomorrow", "upcoming"].map((k) => (
          <span
            key={k}
            role="button"
            className={`reminder-badge ${k} ${reminderFilter === k ? "active" : ""}`}
            onClick={() => setReminderFilter(reminderFilter === k ? "" : k)}
          >
            {k[0].toUpperCase() + k.slice(1)}:{" "}
            <strong>
              {k === "overdue"
                ? badgeCounts.overdue
                : k === "today"
                  ? badgeCounts.today
                  : k === "tomorrow"
                    ? badgeCounts.tomorrow
                    : badgeCounts.upcoming}
            </strong>
          </span>
        ))}
      </div>

      {/* extra filters */}
      <div className="mb-3 d-flex gap-4 flex-wrap opacity-75">
        <div>
          <h6 className="mb-1">Gender</h6>
          {["Male", "Female"].map((g) => (
            <label key={g} className="me-3">
              <input
                type="checkbox"
                className="form-check-input me-1"
                checked={selectedGender.map(x=>String(x).toLowerCase()).includes(String(g).toLowerCase())}
                onChange={(e) =>
                  setSelectedGender((prev) => {
                    const low = String(g).toLowerCase();
                    if (e.target.checked) {
                      return Array.from(new Set([...prev.map(x=>String(x).toLowerCase()), low]));
                    } else {
                      return prev.map(x=>String(x).toLowerCase()).filter(x => x !== low);
                    }
                  })
                }
              />{g}
            </label>
          ))}
        </div>
        <div>
          <h6 className="mb-1">Skills</h6>
          {skillOptions.map((s) => (
            <label key={s} className="me-3">
              <input
                type="checkbox"
                className="form-check-input me-1"
                checked={selectedSkills.map(x=>String(x).toLowerCase()).includes(String(s).toLowerCase())}
                onChange={(e) =>
                  setSelectedSkills((prev) => {
                    const low = String(s).toLowerCase();
                    if (e.target.checked) {
                      return Array.from(new Set([...prev.map(x=>String(x).toLowerCase()), low]));
                    } else {
                      return prev.map(x=>String(x).toLowerCase()).filter(x => x !== low);
                    }
                  })
                }
              />{s}
            </label>
          ))}
        </div>
        <div>
        <hr></hr>
          <h6 className="mb-1">Job Role</h6>
          {roleOptions.map((r) => (
            <label key={r} className="me-3">
              <input
                type="checkbox"
                className="form-check-input me-1"
                checked={selectedRoles.map(x=>String(x).toLowerCase()).includes(String(r).toLowerCase())}
                onChange={(e) =>
                  setSelectedRoles((prev) => {
                    const low = String(r).toLowerCase();
                    if (e.target.checked) {
                      return Array.from(new Set([...prev.map(x=>String(x).toLowerCase()), low]));
                    } else {
                      return prev.map(x=>String(x).toLowerCase()).filter(x => x !== low);
                    }
                  })
                }
              />{r}
            </label>
          ))}
        </div>
      </div>
      <hr></hr>

      {/* status line */}
      <div className="mb-2 text-muted small">
        Showing <strong>{pageItems.length}</strong> of <strong>{sorted.length}</strong> (from <strong>{workers.length}</strong> total)
        {reminderFilter ? ` — ${reminderFilter}` : ""}
      </div>

      {/* table */}
      <div className="table-responsive">
        <table className="table table-hover table-dark">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Name</th>
              <th>Location</th>
              <th>Gender</th>
              <th>Reminder Date</th>
              <th>Skills</th>
              <th>Roles</th>
              <th>Mobile</th>
              <th>Communications</th>
              <th>Call Through</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((w, idx) => {
              const du = daysUntil(w?.callReminderDate);
              const duLabel = isFinite(du)
                ? du === 0 ? "Today" : du === 1 ? "Tomorrow" : du < 0 ? `${Math.abs(du)} days ago` : `${du} days`
                : "";
              const callThrough = w?.callThrough || w?.through || w?.source || "—";
              const comms = (w?.communications ?? w?.communication ?? w?.conversation ?? w?.conversationLevel ?? "") || "N/A";
              const roles = normalizeArray(w?.jobRole ?? w?.role ?? w?.roles ?? w?.profession ?? w?.designation ?? w?.workType ?? "");
              return (
                <tr
                  key={`${w.id}-${idx}`}
                  className={urgencyClass(w?.callReminderDate)}
                  onClick={(e) => {
                    if (e.target.closest("button, a, .btn, .page-link")) return;
                    handleView(w);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <td>{indexOfFirst + idx + 1}</td>
                  <td>{w?.name || "N/A"}</td>
                  <td>{w?.location || "N/A"}</td>
                  <td>{w?.gender || "N/A"}</td>
                  <td>
                    {formatDDMMYYYY(w?.callReminderDate)}
                    {duLabel && <small className="d-block text-muted">{duLabel}</small>}
                  </td>
                  <td>{normalizeArray(w?.skills).join(", ") || "N/A"}</td>
                  <td>{roles.length ? roles.join(", ") : "N/A"}</td>
                  <td>{w?.mobileNo || "N/A"}</td>
                  <td>{comms}</td>
                  <td><span className="badge bg-secondary">{callThrough}</span></td>
                  <td>
                    {w?.mobileNo && (
                      <>
                        <a href={`tel:${w.mobileNo}`} className="btn btn-sm btn-info me-2">Call</a>
                        <a
                          className="btn btn-sm btn-warning me-2"
                          href={`https://wa.me/${String(w.mobileNo).replace(/\D/g, "")}?text=${encodeURIComponent(
                            "Hello, This is Sudheer From JenCeo Home Care Services"
                          )}`}
                          target="_blank" rel="noopener noreferrer"
                        >
                          WAP
                        </a>
                      </>
                    )}
                    <button className="btn btn-sm me-2" title="View" onClick={() => handleView(w)}>
                      <img src={viewIcon} alt="view" width="18" height="18" />
                    </button>
                    <button className="btn btn-sm me-2" title="Edit" onClick={() => handleEdit(w)}>
                      <img src={editIcon} alt="edit" width="16" height="16" />
                    </button>
                    <button className="btn btn-sm" title="Delete" onClick={() => handleDelete(w)}>
                      <img src={deleteIcon} alt="delete" width="14" height="14" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan="11"><div className="alert alert-warning mb-0">No records match your filters.</div></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* pagination (min 1, max 10 numbers) */}
      {totalPages > 1 && (
        <nav aria-label="Worker pagination" className="pagination-wrapper">
          <ul className="pagination justify-content-center">
            <li className={`page-item ${safePage === 1 ? "disabled" : ""}`}>
              <button className="page-link" onClick={() => setCurrentPage(safePage - 1)} disabled={safePage === 1}>
                Previous
              </button>
            </li>
            {getDisplayedPageNumbers().map((num) => (
              <li key={num} className={`page-item ${safePage === num ? "active" : ""}`}>
                <button className="page-link" onClick={() => setCurrentPage(num)}>{num}</button>
              </li>
            ))}
            <li className={`page-item ${safePage === totalPages ? "disabled" : ""}`}>
              <button className="page-link" onClick={() => setCurrentPage(safePage + 1)} disabled={safePage === totalPages}>
                Next
              </button>
            </li>
          </ul>
        </nav>
      )}

      {/* ---------- YEAR / MONTH / DAY SUMMARY UI ---------- */}
      <hr />
      <h4 className="mt-4">Call Through Summary</h4>

      {/* Year Tabs */}
      <ul className="nav nav-tabs summary-tabs mb-3">
        {years.map((y) => (
          <li className="nav-item" key={y}>
            <button
              className={`nav-link summary-tab ${activeYear === y ? "active" : ""}`}
              onClick={() => { setActiveYear(y); setActiveMonth(null); }}
            >
              {y}
            </button>
          </li>
        ))}
      </ul>

      {/* Month-wise table */}
      <div className="table-responsive summary-table-container">
        <table className="table table-dark summary-table table-hover">
          <thead className="summary-table-header">
            <tr>
              <th>Call Through</th>
              {months.map((m, mi) => (
                <th key={m} style={{cursor:"pointer"}} onClick={() => setActiveMonth(mi)}>
                  {m}
                </th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {callThroughOptions.map((t) => (
              <tr key={t} className="summary-table-row">
                <td className="source-name">{t}</td>
                {monthSummary[t].map((count, idx) => (
                  <td key={idx} className={count > 0 ? "has-data" : ""} style={{cursor:"pointer"}} onClick={() => setActiveMonth(idx)}>
                    {count > 0 ? count : ""}
                  </td>
                ))}
                <td className="total-cell">{monthSummary[t].reduce((a, b) => a + b, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Day-wise table for selected month */}
      {activeMonth !== null && (
        <div className="mt-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="mb-0">
              {months[activeMonth]} {activeYear} — Day-wise
            </h5>
            <button className="btn btn-sm btn-outline-light" onClick={() => setActiveMonth(null)}>Close</button>
          </div>
          <div className="table-responsive summary-table-container">
            <table className="table table-dark summary-table table-hover">
              <thead className="summary-table-header">
                <tr>
                  <th>Call Through</th>
                  {Array.from({ length: new Date(activeYear, activeMonth + 1, 0).getDate() }, (_, i) => i + 1).map((d) => (
                    <th key={d}>{d}</th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {callThroughOptions.map((t) => (
                  <tr key={t} className="summary-table-row">
                    <td className="source-name">{t}</td>
                    {daySummary && daySummary[t].map((count, idx) => (
                      <td key={idx} className={count > 0 ? "has-data" : ""}>
                        {count > 0 ? count : ""}
                      </td>
                    ))}
                    <td className="total-cell">{daySummary ? daySummary[t].reduce((a, b) => a + b, 0) : 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* modal */}
      {selectedWorker && isModalOpen && (
        <WorkerCallModal
          worker={selectedWorker}
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setSelectedWorker(null); setIsEditMode(false); }}
          isEditMode={isEditMode}
        />
      )}

      {/* delete confirm */}
      {showDeleteConfirm && selectedWorker && (
        <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,0.6)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">Confirm Delete</h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteConfirm(false)} />
              </div>
              <div className="modal-body">
                <p>Delete worker {selectedWorker?.name || ""}?</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDeleteConfirmed}>Yes, Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
