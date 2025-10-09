import React, { useState, useEffect, useMemo } from 'react';
import firebaseDB from '../../firebase';
import viewIcon from '../../assets/view.svg';
import returnIcon from '../../assets/return.svg';
import deleteIcon from '../../assets/delete.svg';
import * as XLSX from 'xlsx';

/* ------------ date helpers ------------ */
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
const normalizeArray = (val) =>
  Array.isArray(val)
    ? val.filter(Boolean)
    : typeof val === "string"
      ? val.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

// Canonicalize various spellings/inputs into a fixed set
const normalizeSource = (raw) => {
  if (!raw) return "Other";
  const s = String(raw).trim().toLowerCase();
  const map = new Map([
    ["apna", "Apana"], ["apana", "Apana"],
    ["workerindian", "WorkerIndian"],
    ["reference", "Reference"],
    ["poster", "Poster"],
    ["agent", "Agent"],
    ["facebook", "Facebook"],
    ["linkedin", "LinkedIn"], ["linked in", "LinkedIn"],
    ["instagram", "Instagram"],
    ["youtube", "YouTube"], ["you tube", "YouTube"],
    ["website", "Website"],
    ["just dial", "Just Dial"], ["just dail", "Just Dial"], ["justdail", "Just Dial"], ["justdial", "Just Dial"],
    ["news paper", "News Paper"], ["newspaper", "News Paper"],
  ]);
  if (map.has(s)) return map.get(s);

  // try relaxed matches
  if (s.includes("apna") || s.includes("apana")) return "Apana";
  if (s.includes("worker")) return "WorkerIndian";
  if (s.includes("refer")) return "Reference";
  if (s.includes("poster")) return "Poster";
  if (s.includes("agent")) return "Agent";
  if (s.includes("facebook")) return "Facebook";
  if (s.includes("link") && s.includes("in")) return "LinkedIn";
  if (s.includes("insta")) return "Instagram";
  if (s.includes("you") && s.includes("tube")) return "YouTube";
  if (s.includes("site") || s.includes("web")) return "Website";
  if (s.replace(/\s+/g, "") === "justdial" || s.replace(/\s+/g, "") === "justdail") return "Just Dial";
  if (s.includes("news") && s.includes("paper")) return "News Paper";

  return "Other";
};

export default function WorkerCalDeletedDisplay() {
  const [deletedWorkers, setDeletedWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search and filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [selectedGender, setSelectedGender] = useState([]);
  const [selectedSource, setSelectedSource] = useState("All");
  const [sortBy, setSortBy] = useState("deletedAt");
  const [sortDir, setSortDir] = useState("desc");

  // Modals
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Options for filters
  const skillOptions = ["Nursing", "Cooking", "Patient Care", "Care Taker", "Old Age Care", "Baby Care", "Bedside Attender", "Supporting", "Any duty", "Daiper",  "Others"];
  const roleOptions = [
    "Computer Operating", "Tele Calling", "Driving", "Supervisor", "Manager", "Attender", "Security",
    "Carpenter", "Painter", "Plumber", "Electrician", "Mason (Home maker)", "Tailor", "Labour", "Farmer", "Delivery Boy"
  ];
  const languageOptions = ["Telugu", "English", "Hindi", "Urdu", "Kannada", "Malayalam", "Tamil"];
  const callThroughOptions = [
    "Apana", "WorkerIndian", "Reference", "Poster", "Agent", "Facebook", "LinkedIn", "Instagram", "YouTube", "Website", "Just Dial", "News Paper", "Other"
  ];

  // Helpers
  const getWorkerRoles = (w) => {
    const val = w?.jobRole ?? w?.role ?? w?.roles ?? w?.profession ?? w?.designation ?? w?.workType ?? w?.otherSkills ?? w?.otherskills ?? w?.other_skills ?? w?.["other skils"] ?? "";
    return normalizeArray(val).map((s) => String(s).toLowerCase());
  };
  const getWorkerSkills = (w) => normalizeArray(w?.skills).map((s) => String(s).toLowerCase());
  const getWorkerLanguages = (w) => {
    const val = w?.languages ?? w?.language ?? w?.knownLanguages ?? w?.speaks ?? "";
    return normalizeArray(val).map((s) => String(s).toLowerCase());
  };

  /* --- FETCH DELETED WORKERS --- */
  useEffect(() => {
    const ref = firebaseDB.child("WorkerCalDeletedData");
    const cb = ref.on("value", (snap) => {
      try {
        if (snap.exists()) {
          const data = snap.val();
          const workersList = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
          }));
          setDeletedWorkers(workersList);
        } else {
          setDeletedWorkers([]);
        }
        setLoading(false);
      } catch (e) {
        setError(e.message || "Failed to load deleted workers");
        setLoading(false);
      }
    });
    return () => ref.off("value", cb);
  }, []);

  /* --- RESTORE WORKER --- */
  const handleRestore = async (worker) => {
    if (!worker) return;

    try {
      // Move back to WorkerCallData
      await firebaseDB.child(`WorkerCallData/${worker.originalId || worker.id}`).set({
        ...worker,
        restoredAt: new Date().toISOString(),
        deleteReason: null // Clear delete reason
      });

      // Remove from WorkerCalDeletedData
      await firebaseDB.child(`WorkerCalDeletedData/${worker.id}`).remove();

      setShowRestoreConfirm(false);
      setSelectedWorker(null);
      setSuccessMessage(`Worker "${worker.name}" restored successfully!`);
      setShowSuccessModal(true);
    } catch (err) {
      console.error("Error restoring worker:", err);
      setSuccessMessage("Error restoring worker");
      setShowSuccessModal(true);
    }
  };

  /* --- PERMANENT DELETE --- */
  const handlePermanentDelete = async (worker) => {
    if (!worker) return;

    try {
      await firebaseDB.child(`WorkerCalDeletedData/${worker.id}`).remove();
      setShowDeleteConfirm(false);
      setSelectedWorker(null);
      setSuccessMessage(`Worker "${worker.name}" permanently deleted!`);
      setShowSuccessModal(true);
    } catch (err) {
      console.error("Error permanently deleting worker:", err);
      setSuccessMessage("Error deleting worker");
      setShowSuccessModal(true);
    }
  };

  /* --- FILTERING --- */
  const filteredWorkers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return deletedWorkers.filter((w) => {
      // call-through dropdown
      if (selectedSource !== "All") {
        const srcRaw = (w?.callThrough || w?.through || w?.source || "").trim();
        const canon = normalizeSource(srcRaw);
        if (canon !== selectedSource) return false;
      }

      // search
      if (term) {
        const hay = `${w?.name ?? ""} ${w?.location ?? ""} ${String(w?.mobileNo ?? "")} ${w?.deleteReason ?? ""}`.toLowerCase();
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

      // languages (any-match; case-insensitive)
      if (selectedLanguages.length > 0) {
        const have = getWorkerLanguages(w);
        const want = selectedLanguages.map((s) => String(s).toLowerCase());
        if (!want.some((s) => have.includes(s))) return false;
      }

      return true;
    });
  }, [deletedWorkers, searchTerm, selectedGender, selectedSkills, selectedRoles, selectedLanguages, selectedSource]);

  /* --- SORTING --- */
  const sorted = useMemo(() => {
    const arr = [...filteredWorkers];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      if (sortBy === "name") {
        return dir * String(a?.name ?? "").toLowerCase().localeCompare(String(b?.name ?? "").toLowerCase());
      }
      if (sortBy === "deletedAt") {
        const da = parseDate(a?.deletedAt);
        const db = parseDate(b?.deletedAt);
        const av = isValidDate(da) ? da.getTime() : Number.POSITIVE_INFINITY;
        const bv = isValidDate(db) ? db.getTime() : Number.POSITIVE_INFINITY;
        return dir * (av - bv);
      }
      return dir * String(a?.id ?? "").toLowerCase().localeCompare(String(b?.id ?? "").toLowerCase());
    });
    return arr;
  }, [filteredWorkers, sortBy, sortDir]);

  /* --- PAGINATION --- */
  const totalPages = useMemo(() => Math.max(1, Math.ceil(sorted.length / rowsPerPage)), [sorted, rowsPerPage]);
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const indexOfLast = safePage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const pageItems = useMemo(() => sorted.slice(indexOfFirst, indexOfLast), [sorted, indexOfFirst, indexOfLast]);

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedGender, selectedSkills, selectedRoles, selectedLanguages, selectedSource, rowsPerPage]);

  /* --- EXPORT --- */
  const handleExport = () => {
    const exportData = sorted.map((w, i) => ({
      "S.No": i + 1,
      "Original ID": w.originalId || w.id,
      "Deleted Date": formatDDMMYYYY(w.deletedAt),
      "Delete Reason": w.deleteReason || "No reason provided",
      "Name": w.name || "",
      "Gender": w.gender || "",
      "Skills": normalizeArray(w.skills).join(", "),
      "Roles": normalizeArray(w?.jobRole ?? w?.role ?? w?.roles ?? w?.profession ?? w?.designation ?? w?.workType ?? "").join(", "),
      "Languages": normalizeArray(w?.languages ?? w?.language ?? w?.knownLanguages ?? w?.speaks ?? "").join(", "),
      "Mobile": w.mobileNo || "",
      "Location": w.location || "",
      "Call Through": normalizeSource(w?.callThrough || w?.through || w?.source || ""),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Deleted Workers");
    XLSX.writeFile(wb, "DeletedWorkerData.xlsx");
  };

  const handleView = (worker) => {
    setSelectedWorker(worker);
    setIsModalOpen(true);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedSkills([]);
    setSelectedRoles([]);
    setSelectedLanguages([]);
    setSelectedGender([]);
    setSelectedSource("All");
    setSortBy("deletedAt");
    setSortDir("desc");
    setRowsPerPage(10);
    setCurrentPage(1);
  };

  // Helper to build max-10 page numbers around current page
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

  if (loading) return <div className="text-center my-5 text-white">Loading deleted workers…</div>;
  if (error) return <div className="alert alert-danger">Error: {error}</div>;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="text-white">Deleted Workers</h3>
        <div className="d-flex gap-2">
          <button className="btn btn-success" onClick={handleExport}>
            Export Excel
          </button>
        </div>
      </div>

      {/* Search and Controls - Dark Theme */}
      <div className="alert alert-dark d-flex justify-content-between flex-wrap reminder-badges" style={{ background: "#444" }}>
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
          <span className="ms-2 text-white opacity-75">Entries</span>
        </div>

        <input
          type="text"
          className="form-control bg-dark text-white border-secondary"
          placeholder="Search deleted workers…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: 300 }}
        />

        {/* Call Through filter */}
        <select
          className="form-select bg-dark text-white border-secondary ms-2"
          style={{ maxWidth: 220 }}
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value)}
        >
          <option value="All">All Call Through</option>
          {callThroughOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>

        <div className="d-flex gap-2">
          <select className="form-select bg-dark text-white border-secondary" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="id">Sort by ID</option>
            <option value="name">Sort by Name</option>
            <option value="deletedAt">Sort by Deleted Date</option>
          </select>
          <select className="form-select bg-dark text-white border-secondary" value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>

        <div className="d-flex gap-2">
          <button className="btn btn-secondary" onClick={resetFilters}>Reset</button>
        </div>
      </div>

      {/* extra filters */}
      <div className="filterData mb-3">
        <div>
          <h6 className="mb-1 text-info">Gender</h6>
          {["Male", "Female"].map((g) => (
            <label key={g} className="me-3 text-white">
              <input
                type="checkbox"
                className="form-check-input me-1"
                checked={selectedGender.map(x => String(x).toLowerCase()).includes(String(g).toLowerCase())}
                onChange={(e) =>
                  setSelectedGender((prev) => {
                    const low = String(g).toLowerCase();
                    if (e.target.checked) {
                      return Array.from(new Set([...prev.map(x => String(x).toLowerCase()), low]));
                    } else {
                      return prev.map(x => String(x).toLowerCase()).filter(x => x !== low);
                    }
                  })
                }
              />{g}
            </label>
          ))}
        </div>

        <div>
          <h6 className="mb-1 text-info">Languages</h6>
          {languageOptions.map((l) => (
            <label key={l} className="me-3 text-white">
              <input
                type="checkbox"
                className="form-check-input me-1"
                checked={selectedLanguages.map(x => String(x).toLowerCase()).includes(String(l).toLowerCase())}
                onChange={(e) =>
                  setSelectedLanguages((prev) => {
                    const low = String(l).toLowerCase();
                    if (e.target.checked) {
                      return Array.from(new Set([...prev.map(x => String(x).toLowerCase()), low]));
                    } else {
                      return prev.map(x => String(x).toLowerCase()).filter(x => x !== low);
                    }
                  })
                }
              />{l}
            </label>
          ))}
        </div>
      </div>

      <h6 className="mb-1 text-info">Skills</h6>
      <div className="filterData mb-3">
        {skillOptions.map((s) => (
          <label key={s} className="me-3 text-white">
            <input
              type="checkbox"
              className="form-check-input me-1"
              checked={selectedSkills.map(x => String(x).toLowerCase()).includes(String(s).toLowerCase())}
              onChange={(e) =>
                setSelectedSkills((prev) => {
                  const low = String(s).toLowerCase();
                  if (e.target.checked) {
                    return Array.from(new Set([...prev.map(x => String(x).toLowerCase()), low]));
                  } else {
                    return prev.map(x => String(x).toLowerCase()).filter(x => x !== low);
                  }
                })
              }
            />{s}
          </label>
        ))}
      </div>

      <h6 className="mb-1 text-info">Job Role</h6>
      <div className="filterData mb-3">
        {roleOptions.map((r) => (
          <label key={r} className="me-3 text-white">
            <input
              type="checkbox"
              className="form-check-input me-1"
              checked={selectedRoles.map(x => String(x).toLowerCase()).includes(String(r).toLowerCase())}
              onChange={(e) =>
                setSelectedRoles((prev) => {
                  const low = String(r).toLowerCase();
                  if (e.target.checked) {
                    return Array.from(new Set([...prev.map(x => String(x).toLowerCase()), low]));
                  } else {
                    return prev.map(x => String(x).toLowerCase()).filter(x => x !== low);
                  }
                })
              }
            />{r}
          </label>
        ))}
      </div>

      <hr className="border-secondary" />

      {/* status line */}
      <div className="mb-3 small" style={{ color: "yellow" }}>
        Showing <strong>{pageItems.length}</strong> of <strong>{sorted.length}</strong> (from <strong>{deletedWorkers.length}</strong> total deleted workers)
      </div>

      {/* Table */}
      <div className="table-responsive">
        <table className="table table-hover table-dark">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Deleted Date</th>
              <th>Name</th>
              <th>Gender</th>
              <th>Mobile</th>
              <th>Delete Reason</th>
              <th>Skills</th>
              <th>Languages</th>
              <th>Call Through</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((worker, idx) => {
              const callThrough = normalizeSource(worker?.callThrough || worker?.through || worker?.source || "");
              const languages = normalizeArray(worker?.languages ?? worker?.language ?? worker?.knownLanguages ?? worker?.speaks ?? "");
              return (
                <tr key={worker.id} style={{ opacity: 0.8 }}>
                  <td>{indexOfFirst + idx + 1}</td>
                  <td>{formatDDMMYYYY(worker.deletedAt)}</td>
                  <td>{worker.name || "N/A"}</td>
                  <td>{worker.gender || "N/A"}</td>
                  <td>{worker.mobileNo || "N/A"}</td>
                  <td title={worker.deleteReason}>
                    {worker.deleteReason ?
                      (worker.deleteReason.length > 50 ?
                        `${worker.deleteReason.substring(0, 50)}...` : worker.deleteReason
                      ) : "No reason provided"
                    }
                  </td>
                  <td>{normalizeArray(worker.skills).join(", ") || "N/A"}</td>
                  <td>{languages.join(", ") || "N/A"}</td>
                  <td><span className="badge bg-secondary">{callThrough}</span></td>
                  <td>
                    <button
                      className="btn btn-sm me-2"
                      title="View Details"
                      onClick={() => handleView(worker)}
                    >
                      <img src={viewIcon} alt="view" width="18" height="18" />
                    </button>
                    <button
                      className="btn btn-sm btn-success me-2"
                      title="Restore Worker"
                      onClick={() => { setSelectedWorker(worker); setShowRestoreConfirm(true); }}
                    >
                      <img src={returnIcon} alt="restore" width="16" height="16" />
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      title="Permanent Delete"
                      onClick={() => { setSelectedWorker(worker); setShowDeleteConfirm(true); }}
                    >
                      <img src={deleteIcon} alt="delete" width="14" height="14" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan="10">
                  <div className="alert alert-info mb-0 text-center">
                    {deletedWorkers.length === 0 ?
                      "No workers have been deleted yet." :
                      "No deleted workers match your filters."
                    }
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      {totalPages > 1 && (
        <nav aria-label="Deleted workers pagination" className="pagination-wrapper">
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

      {/* View Details Modal */}
      {selectedWorker && isModalOpen && (
        <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,0.6)" }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-warning text-dark">
                <h5 className="modal-title">Deleted Worker Details</h5>
                <button type="button" className="btn-close" onClick={() => setIsModalOpen(false)} />
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <p><strong>Name:</strong> {selectedWorker.name || "N/A"}</p>
                    <p style={{opacity:0}}><strong>Mobile:</strong> {selectedWorker.mobileNo || "N/A"}</p>
                    <p><strong>Gender:</strong> {selectedWorker.gender || "N/A"}</p>
                    <p><strong>Location:</strong> {selectedWorker.location || "N/A"}</p>
                  </div>
                  <div className="col-md-6">
                    <p><strong>Deleted Date:</strong> {formatDDMMYYYY(selectedWorker.deletedAt)}</p>
                    <p><strong>Original ID:</strong> {selectedWorker.originalId || selectedWorker.id}</p>
                    <p><strong>Call Through:</strong> {selectedWorker.callThrough || selectedWorker.through || selectedWorker.source || "N/A"}</p>
                  </div>
                </div>
                <div className="row mt-3">
                  <div className="col-12">
                    <p><strong>Skills:</strong> {normalizeArray(selectedWorker.skills).join(", ") || "N/A"}</p>
                    <p><strong>Roles:</strong> {normalizeArray(selectedWorker?.jobRole ?? selectedWorker?.role ?? selectedWorker?.roles ?? selectedWorker?.profession ?? selectedWorker?.designation ?? selectedWorker?.workType ?? "").join(", ") || "N/A"}</p>
                    <p><strong>Languages:</strong> {normalizeArray(selectedWorker?.languages ?? selectedWorker?.language ?? selectedWorker?.knownLanguages ?? selectedWorker?.speaks ?? "").join(", ") || "N/A"}</p>
                    <p><strong>Delete Reason:</strong></p>
                    <div className="border p-2 bg-light text-dark rounded">
                      {selectedWorker.deleteReason || "No reason provided"}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Close</button>
                <button className="btn btn-success" onClick={() => { setIsModalOpen(false); setShowRestoreConfirm(true); }}>
                  Restore Worker
                </button>
                <button className="btn btn-danger" onClick={() => { setIsModalOpen(false); setShowDeleteConfirm(true); }}>
                  Permanent Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {showRestoreConfirm && selectedWorker && (
        <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,0.6)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Confirm Restore</h5>
                <button type="button" className="btn-close" onClick={() => setShowRestoreConfirm(false)} />
              </div>
              <div className="modal-body">
                <p>Restore worker <strong>{selectedWorker?.name || ""}</strong> back to active workers?</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowRestoreConfirm(false)}>Cancel</button>
                <button className="btn btn-success" onClick={() => handleRestore(selectedWorker)}>
                  Yes, Restore
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedWorker && (
        <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,0.6)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">Confirm Permanent Delete</h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteConfirm(false)} />
              </div>
              <div className="modal-body">
                <p>Permanently delete worker <strong>{selectedWorker?.name || ""}</strong>?</p>
                <p className="text-warning"><small>This action cannot be undone!</small></p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => handlePermanentDelete(selectedWorker)}>
                  Yes, Delete Permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,0.6)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-info text-white">
                <h5 className="modal-title">Success</h5>
                <button type="button" className="btn-close" onClick={() => setShowSuccessModal(false)} />
              </div>
              <div className="modal-body">
                <p>{successMessage}</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-primary" onClick={() => setShowSuccessModal(false)}>OK</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}