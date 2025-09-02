import React, { useState, useEffect } from "react";
import firebaseDB from "../../firebase";
import HospitalModal from "./HospitalModal";
import viewIcon from "../../assets/view.svg";
import editIcon from "../../assets/eidt.svg";
import deleteIcon from "../../assets/delete.svg";

export default function DisplayHospital() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hospitalToDelete, setHospitalToDelete] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterLocation, setFilterLocation] = useState("");

  // Sorting
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // ✅ Reminder logic helpers
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parseDate = (val) => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

  const daysUntil = (date) => {
    if (!date) return Infinity;
    const reminderDate = new Date(date);
    reminderDate.setHours(0, 0, 0, 0);
    return Math.ceil((reminderDate - today) / (1000 * 60 * 60 * 24));
  };

  const getReminderClass = (date) => {
    const d = parseDate(date);
    if (!d) return "";
    const du = daysUntil(d);
    if (du < 0) return "reminder-overdue";
    if (du === 0) return "reminder-today";
    if (du === 1) return "reminder-tomorrow";
    if (du === 2) return "reminder-upcoming";
    return "";
  };

  // ✅ Nearest reminder date (agents + payments)
  const getNearestReminderDate = (hospital) => {
    const dates = [
      ...(hospital.agents || []).map((a) => a.reminderDate).filter(Boolean),
      ...(hospital.payments || []).map((p) => p.reminderDate).filter(Boolean),
    ];
    if (dates.length === 0) return null;

    const validDates = dates
      .map((d) => new Date(d))
      .filter((d) => !isNaN(d.getTime()));

    if (validDates.length === 0) return null;

    return validDates.reduce((a, b) => (a < b ? a : b));
  };

  useEffect(() => {
    const fetchHospitals = () => {
      try {
        firebaseDB.child("HospitalData").on("value", (snapshot) => {
          if (snapshot.exists()) {
            const hospitalData = [];
            snapshot.forEach((childSnapshot) => {
              hospitalData.push({
                id: childSnapshot.key,
                ...childSnapshot.val(),
              });
            });
            setHospitals(hospitalData);
            setTotalPages(Math.ceil(hospitalData.length / rowsPerPage));
          } else {
            setHospitals([]);
            setTotalPages(1);
          }
          setLoading(false);
        });
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchHospitals();
    return () => {
      firebaseDB.child("HospitalData").off("value");
    };
  }, []);

  // ✅ Apply filters & search
  const filteredHospitals = hospitals.filter((h) => {
    const searchMatch =
      h.hospitalName?.toLowerCase().includes(search.toLowerCase()) ||
      h.location?.toLowerCase().includes(search.toLowerCase()) ||
      h.type?.toLowerCase().includes(search.toLowerCase()) ||
      h.idNo?.toLowerCase().includes(search.toLowerCase());

    const typeMatch = filterType ? h.type === filterType : true;
    const locationMatch = filterLocation ? h.location === filterLocation : true;

    return searchMatch && typeMatch && locationMatch;
  });

  // ✅ Sorting
  const sortedHospitals = [...filteredHospitals].sort((a, b) => {
    let valA, valB;
    if (sortField === "beds") {
      valA = parseInt(a.noOfBeds) || 0;
      valB = parseInt(b.noOfBeds) || 0;
    } else if (sortField === "reminder") {
      valA = getNearestReminderDate(a)?.getTime() || Infinity;
      valB = getNearestReminderDate(b)?.getTime() || Infinity;
    } else {
      valA = (a[sortField] || "").toString().toLowerCase();
      valB = (b[sortField] || "").toString().toLowerCase();
    }

    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination logic
  const indexOfLastHospital = currentPage * rowsPerPage;
  const indexOfFirstHospital = indexOfLastHospital - rowsPerPage;
  const currentHospitals = sortedHospitals.slice(
    indexOfFirstHospital,
    indexOfLastHospital
  );
  const totalFilteredPages = Math.ceil(sortedHospitals.length / rowsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Modal logic
  const handleView = (hospital) => {
    setSelectedHospital(hospital);
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleEdit = (hospital) => {
    setSelectedHospital(hospital);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const openDeleteConfirm = (hospital) => {
    setHospitalToDelete(hospital);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setHospitalToDelete(null);
  };

  const handleDeleteConfirmed = async () => {
    if (!hospitalToDelete) return;
    const { id, ...payload } = hospitalToDelete;

    try {
      const movedAt = new Date().toISOString();
      await firebaseDB.child(`DeletedHospitalData/${id}`).set({
        ...payload,
        originalId: id,
        movedAt,
      });

      await firebaseDB.child(`HospitalData/${id}`).remove();

      closeDeleteConfirm();
    } catch (err) {
      setError("Error deleting hospital: " + err.message);
      closeDeleteConfirm();
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedHospital(null);
    setIsEditMode(false);
  };

  if (loading) return <div className="text-center my-5">Loading hospitals...</div>;
  if (error) return <div className="alert alert-danger">Error: {error}</div>;
  if (hospitals.length === 0)
    return <div className="alert alert-info">No hospitals found</div>;

  return (
    <div>
      {/* ✅ Filters & Search */}
      <div className="d-flex flex-wrap gap-2 mb-3">
        <input
          type="text"
          className="form-control w-50"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="form-select w-auto"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">All Types</option>
          {[...new Set(hospitals.map((h) => h.type).filter(Boolean))].map(
            (t, idx) => (
              <option key={idx} value={t}>
                {t}
              </option>
            )
          )}
        </select>
        <select
          className="form-select w-auto"
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
        >
          <option value="">All Locations</option>
          {[...new Set(hospitals.map((h) => h.location).filter(Boolean))].map(
            (l, idx) => (
              <option key={idx} value={l}>
                {l}
              </option>
            )
          )}
        </select>
      </div>

      {/* ✅ Table */}
      <div className="table-responsive">
        <table className="table table-dark table-hover">
          <thead className="table-dark">
            <tr>
              <th>ID No ↓</th>
              <th onClick={() => toggleSort("hospitalName")} style={{ cursor: "pointer" }}>
                Hospital Name {sortField === "hospitalName" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
              </th>
              <th onClick={() => toggleSort("location")} style={{ cursor: "pointer" }}>
                Location {sortField === "location" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
              </th>
              <th>Type</th>
              <th onClick={() => toggleSort("beds")} style={{ cursor: "pointer" }}>
                No of Beds {sortField === "beds" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
              </th>
              <th onClick={() => toggleSort("reminder")} style={{ cursor: "pointer" }}>
                Reminder Date {sortField === "reminder" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
              </th>
              <th>Auto Visit</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentHospitals.map((hospital) => {
              const nearestReminder = getNearestReminderDate(hospital);

              return (
                <tr key={hospital.id}>
                  <td>{hospital.idNo || "N/A"}</td>
                  <td>{hospital.hospitalName || "N/A"}</td>
                  <td>{hospital.location || "N/A"}</td>
                  <td>{hospital.type || "N/A"}</td>
                  <td>{hospital.noOfBeds || "N/A"}</td>
                  {/* Reminder Date */}
                  <td className={getReminderClass(nearestReminder)}>
                    {nearestReminder
                      ? new Date(nearestReminder).toLocaleDateString("en-GB")
                      : "—"}
                  </td>
                  <td>{hospital.autoVisit || "N/A"}</td>
                  <td>
                    <div className="d-flex">
                      <button
                        className="btn btn-sm me-2"
                        title="View"
                        onClick={() => handleView(hospital)}
                      >
                        <img src={viewIcon} alt="view" style={{ width: "18px", height: "18px", opacity: 0.7 }} />
                      </button>
                      <button
                        className="btn btn-sm me-2"
                        title="Edit"
                        onClick={() => handleEdit(hospital)}
                      >
                        <img src={editIcon} alt="edit" style={{ width: "15px", height: "15px" }} />
                      </button>
                      <button
                        className="btn btn-sm"
                        title="Delete"
                        onClick={() => openDeleteConfirm(hospital)}
                      >
                        <img src={deleteIcon} alt="delete" style={{ width: "14px", height: "14px" }} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalFilteredPages > 1 && (
        <nav aria-label="Hospital pagination" className="pagination-wrapper">
          <ul className="pagination justify-content-center">
            {Array.from({ length: totalFilteredPages }, (_, i) => i + 1).map((n) => (
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
      {selectedHospital && (
        <HospitalModal
          hospital={selectedHospital}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          isEditMode={isEditMode}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && hospitalToDelete && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button type="button" className="btn-close" onClick={closeDeleteConfirm}></button>
              </div>
              <div className="modal-body">
                <p className="mb-0">Are you sure you want to delete this hospital?</p>
                <p className="mt-2">
                  <strong>ID:</strong> {hospitalToDelete.idNo || hospitalToDelete.id} <br />
                  <strong>Name:</strong> {hospitalToDelete.hospitalName || "N/A"}
                </p>
                <small className="text-muted">
                  This will move the record to the <strong>DeletedHospitalData</strong> section.
                </small>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeDeleteConfirm}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-danger" onClick={handleDeleteConfirmed}>
                    Yes, Move & Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
