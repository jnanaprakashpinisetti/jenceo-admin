import React, { useState, useEffect } from "react";
import firebaseDB from "../../firebase";
import WorkerCallModal from "./WorkerCallModal";
import viewIcon from "../../assets/view.svg";
import editIcon from "../../assets/eidt.svg";
import deleteIcon from "../../assets/delete.svg";
import * as XLSX from "xlsx";

export default function WorkerCallDisplay() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedWorker, setSelectedWorker] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [selectedGender, setSelectedGender] = useState([]);
  const [selectedHours, setSelectedHours] = useState("");
  const [reminderFilter, setReminderFilter] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Sorting
  const [sortConfig, setSortConfig] = useState({ key: "id", direction: "desc" });

  // Reminder helpers
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parseDate = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };

  const getReminderDate = (w) => parseDate(w?.callReminderDate);

  const daysUntil = (d) => {
    if (!d) return Infinity;
    const reminderDate = new Date(d);
    reminderDate.setHours(0, 0, 0, 0);
    const timeDiff = reminderDate.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  };

  const getUrgencyClass = (w) => {
    const d = getReminderDate(w);
    if (!d) return "";
    const du = daysUntil(d);
    if (du < 0) return "reminder-overdue";
    if (du === 0) return "reminder-today";
    if (du === 1) return "reminder-tomorrow";
    if (du === 2) return "reminder-upcoming";
    return "";
  };

  // Fetch workers
  useEffect(() => {
    try {
      firebaseDB.child("WorkerCallData").on("value", (snapshot) => {
        if (snapshot.exists()) {
          const workersData = [];
          snapshot.forEach((child) => {
            workersData.push({ id: child.key, ...child.val() });
          });
          setWorkers(workersData);
          setTotalPages(Math.ceil(workersData.length / rowsPerPage));
        } else {
          setWorkers([]);
          setTotalPages(1);
        }
        setLoading(false);
      });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
    return () => firebaseDB.child("WorkerCallData").off("value");
  }, [rowsPerPage]);

  useEffect(() => {
    setTotalPages(Math.ceil(workers.length / rowsPerPage));
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [workers, rowsPerPage, totalPages, currentPage]);

  // Normalize
  const normalizeArray = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === "string") return val.split(",").map((s) => s.trim());
    return [];
  };

  // Filters
  const filteredWorkers = workers.filter((w) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      w.name?.toLowerCase().includes(term) ||
      w.location?.toLowerCase().includes(term) ||
      w.mobileNo?.toLowerCase().includes(term);

    const matchesSkill =
      selectedSkills.length > 0
        ? selectedSkills.some((skill) =>
          normalizeArray(w.skills).includes(skill)
        )
        : true;

    const matchesGender =
      selectedGender.length > 0 ? selectedGender.includes(w.gender) : true;

    const matchesHours = selectedHours ? w.workingHours === selectedHours : true;

    const d = getReminderDate(w);
    const du = daysUntil(d);
    let matchesReminder = true;
    if (reminderFilter === "overdue") matchesReminder = du < 0;
    if (reminderFilter === "today") matchesReminder = du === 0;
    if (reminderFilter === "tomorrow") matchesReminder = du === 1;
    if (reminderFilter === "upcoming") matchesReminder = du === 2;

    return (
      matchesSearch && matchesSkill && matchesGender && matchesHours && matchesReminder
    );
  });

  // Sorting
  const sortedWorkers = [...filteredWorkers].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const valA = a[sortConfig.key] || "";
    const valB = b[sortConfig.key] || "";
    if (sortConfig.key === "id") {
      return sortConfig.direction === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }
    if (sortConfig.key === "callReminderDate") {
      return sortConfig.direction === "asc"
        ? new Date(valA) - new Date(valB)
        : new Date(valB) - new Date(valA);
    }
    if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
    if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination slice
  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentWorkers = sortedWorkers.slice(indexOfFirst, indexOfLast);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Reminder count
  const reminderCount = workers.filter((w) => {
    const d = getReminderDate(w);
    const du = daysUntil(d);
    return du <= 2;
  }).length;

  // Actions
  const handleView = (worker) => {
    setSelectedWorker(worker);
    setIsEditMode(false);
    setIsModalOpen(true);
  };
  const handleEdit = (worker) => {
    setSelectedWorker(worker);
    setIsEditMode(true);
    setIsModalOpen(true);
  };
  const handleDelete = (worker) => {
    setSelectedWorker(worker);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!selectedWorker) return;
    try {
      await firebaseDB.child(`DeletedWorkersData/${selectedWorker.id}`).set({
        ...selectedWorker,
        originalId: selectedWorker.id,
        deletedBy: "Admin",
        deletedAt: new Date().toISOString(),
      });
      await firebaseDB.child(`WorkerCallData/${selectedWorker.id}`).remove();
      setShowDeleteConfirm(false);
      setSelectedWorker(null);
    } catch (err) {
      console.error("Error deleting worker:", err);
    }
  };

  // Export to Excel
  const handleExport = () => {
    const exportData = filteredWorkers.map((w, idx) => ({
      SNo: idx + 1,
      Name: w.name,
      Location: w.location,
      Gender: w.gender,
      Skills: normalizeArray(w.skills).join(", "),
      ReminderDate: w.callReminderDate
        ? new Date(w.callReminderDate).toLocaleDateString("en-GB")
        : "—",
      Mobile: w.mobileNo,
      Communication: w.conversationLevel,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Workers");
    XLSX.writeFile(wb, "WorkerCallData.xlsx");
  };

  if (loading) return <div className="text-center my-5">Loading...</div>;
  if (error) return <div className="alert alert-danger">Error: {error}</div>;

  // Home care skills for filters
  const homeCareSkills = [
    "Nursing",
    "Patient Care",
    "Care Taker",
    "Old Age Care",
    "Baby Care",
    "Bedside Attender",
    "Supporting",
  ];

  return (
    <div className="p-3">
      {/* Controls */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div className="d-flex align-items-center">
          <span className="me-2">Show</span>
          <select
            className="form-select form-select-sm"
            style={{ width: "80px" }}
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(parseInt(e.target.value));
              setCurrentPage(1);
            }}
          >
            {[10, 20, 30, 40, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span className="ms-2">entries</span>
        </div>
        <div className="search-box">
          <input
            type="text"
            className="form-control"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

        </div>

        {/* Export Excel Function */}
        {/* <button className="btn btn-success" onClick={handleExport}>
          Export Excel
        </button> */}

        <div className="reminder-pill">Reminder Calls: {reminderCount}</div>
      </div>

      {/* Filters */}
      <div className="mb-3">
        <div className="filter-wrapper">
          {/* Gender filter */}
          <div className="d-flex gap-2">
            <h5>Gender:</h5>
            {["Male", "Female", "Others"].map((g) => (
              <label key={g} className="form-check-label me-2">
                <input
                  type="checkbox"
                  className="form-check-input me-1"
                  checked={selectedGender.includes(g)}
                  onChange={(e) =>
                    setSelectedGender((prev) =>
                      e.target.checked
                        ? [...prev, g]
                        : prev.filter((x) => x !== g)
                    )
                  }
                />
                {g}
              </label>
            ))}
          </div>

          {/* Skill filter */}
          <div className="d-flex flex-wrap gap-2">
            <h5>Skills:</h5>
            {homeCareSkills.map((skill) => (
              <label key={skill} className="form-check-label me-2">
                <input
                  type="checkbox"
                  className="form-check-input me-1"
                  checked={selectedSkills.includes(skill)}
                  onChange={(e) =>
                    setSelectedSkills((prev) =>
                      e.target.checked
                        ? [...prev, skill]
                        : prev.filter((s) => s !== skill)
                    )
                  }
                />
                {skill}
              </label>
            ))}
          </div>

          {/* Reset button */}
          <button
            className="btn btn-secondary"
            onClick={() => {
              setSearchTerm("");
              setSelectedSkills([]);
              setSelectedGender([]);
              setSelectedHours("");
              setReminderFilter("");
            }}
          >
            Reset Filters
          </button>
        </div>


      </div>

      {/* Dispaly Table */}
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
              <th>Mobile</th>
              <th>Communication</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentWorkers.map((w, idx) => (
              <tr key={w.id} className={`client-row ${getUrgencyClass(w)}`}>
                <td>{indexOfFirst + idx + 1}</td>
                <td>{w.name || "N/A"}</td>
                <td>{w.location || "N/A"}</td>
                <td>{w.gender || "N/A"}</td>
                <td>
                  {w.callReminderDate
                    ? new Date(w.callReminderDate).toLocaleDateString("en-GB")
                    : "—"}
                </td>
                <td>{normalizeArray(w.skills).join(", ") || "N/A"}</td>

                <td>
                  {w.mobileNo}{" "}
                  {w.mobileNo && (
                    <a
                      href={`tel:${w.mobileNo}`}
                      className="btn btn-sm btn-info ms-2"
                    >
                      Call
                    </a>
                  )}
                  <a
                    className="btn btn-sm btn-warning ms-1"
                    href={`https://wa.me/${w.mobileNo?.replace(/\D/g, '')}?text=${encodeURIComponent(
                      "Hello, This is Sudheer From JenCeo Home Care Services"
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WAP
                  </a>
                </td>
                <td>
                  <span className={`badge ${w.conversationLevel === "Very Good"
                    ? "bg-success"
                    : w.conversationLevel === "Good"
                      ? "bg-primary"
                      : w.conversationLevel === "Average"
                        ? "bg-warning"
                        : "bg-danger"
                    }`}>
                    {w.conversationLevel || "N/A"}
                  </span>
                </td>
                <td>
                  <button className="btn btn-sm me-2" onClick={() => handleView(w)}>
                    <img src={viewIcon} alt="view" />
                  </button>
                  <button className="btn btn-sm me-2" onClick={() => handleEdit(w)}>
                    <img src={editIcon} alt="edit" />
                  </button>
                  <button className="btn btn-sm" onClick={() => handleDelete(w)}>
                    <img src={deleteIcon} alt="delete" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav>
          <ul className="pagination justify-content-center">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <li key={n} className={`page-item ${n === currentPage ? "active" : ""}`}>
                <button className="page-link" onClick={() => paginate(n)}>
                  {n}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Modal */}
      {selectedWorker && isModalOpen && (
        <WorkerCallModal
          worker={selectedWorker}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedWorker(null);
            setIsEditMode(false);
          }}
          isEditMode={isEditMode}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && selectedWorker && (
        <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,0.6)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">Confirm Delete</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDeleteConfirm(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>Delete worker {selectedWorker.name}?</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={handleDeleteConfirmed}>
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
