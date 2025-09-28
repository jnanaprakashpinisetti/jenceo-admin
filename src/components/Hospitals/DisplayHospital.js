// src/pages/hospitals/DisplayHospital.js
import React, { useState, useEffect, useMemo } from "react";
import firebaseDB from "../../firebase";
import HospitalModal from "./HospitalModal";
import viewIcon from "../../assets/view.svg";
import editIcon from "../../assets/eidt.svg";
import deleteIcon from "../../assets/delete.svg";

/*
  Updated:
  - reminder badges with classes like `reminder-badge reminder-overdue` (same as ClientDisplay)
  - reminder badge filters (toggle)
  - Reset button to clear filters/sort/pagination
  - extended sorting (hospitalName, location, idNo, beds, reminder, visitType)
  - badge counts computed from nearest reminder across agents/payments
*/

export default function DisplayHospital() {
    const [hospitals, setHospitals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [selectedHospital, setSelectedHospital] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [hospitalToDelete, setHospitalToDelete] = useState(null);
    const [showDeleteReason, setShowDeleteReason] = useState(false);
    const [deleteReason, setDeleteReason] = useState("");


    // Filters
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("");
    const [filterLocation, setFilterLocation] = useState("");
    const [reminderFilter, setReminderFilter] = useState(""); // '', 'overdue','today','tomorrow','upcoming'

    // Sorting
    const [sortField, setSortField] = useState("idNo");
    const [sortOrder, setSortOrder] = useState("asc");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Date helpers
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
        return "reminder-upcoming"; // >=2
    };

    const getVisitClass = (visitType) => {
        switch (visitType) {
            case "Visit Low":
                return "bg-warning";
            case "Visit Medium":
                return "bg-info";
            case "Visit Fully":
                return "bg-success";
            default:
                return "bg-secondary";
        }
    };

    // Nearest reminder date (agents + payments)
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
        const ref = firebaseDB.child("HospitalData");
        const onValue = (snapshot) => {
            try {
                if (snapshot.exists()) {
                    const arr = [];
                    snapshot.forEach((child) => {
                        arr.push({ id: child.key, ...child.val() });
                    });
                    setHospitals(arr);
                } else {
                    setHospitals([]);
                }
                setLoading(false);
            } catch (e) {
                setError(e.message || "Failed to load hospitals");
                setLoading(false);
            }
        };

        ref.on("value", onValue);
        return () => ref.off("value", onValue);
    }, []);

    // Badge counts computed from nearest reminder date across all hospitals
    const badgeCounts = useMemo(() => {
        const counts = { overdue: 0, today: 0, tomorrow: 0, upcoming: 0 };
        hospitals.forEach((h) => {
            const nr = getNearestReminderDate(h);
            if (!nr) return;
            const du = daysUntil(nr);
            if (!isFinite(du)) return;
            if (du < 0) counts.overdue++;
            else if (du === 0) counts.today++;
            else if (du === 1) counts.tomorrow++;
            else counts.upcoming++;
        });
        return counts;
    }, [hospitals]);

    // Filtered list
    const filteredHospitals = useMemo(() => {
        return hospitals.filter((h) => {
            const term = search.trim().toLowerCase();
            const searchMatch =
                !term ||
                (h.hospitalName || "").toLowerCase().includes(term) ||
                (h.location || "").toLowerCase().includes(term) ||
                (h.type || "").toLowerCase().includes(term) ||
                (h.idNo || "").toLowerCase().includes(term);

            const typeMatch = filterType ? (h.type || '').toLowerCase() === filterType.toLowerCase() : true;
            const locationMatch = filterLocation ? (h.location || '').toLowerCase() === filterLocation.toLowerCase() : true;

            // reminder filter toggle
            if (reminderFilter) {
                const nr = getNearestReminderDate(h);
                if (!nr) return false;
                const du = daysUntil(nr);
                if (reminderFilter === "overdue" && !(du < 0)) return false;
                if (reminderFilter === "today" && du !== 0) return false;
                if (reminderFilter === "tomorrow" && du !== 1) return false;
                if (reminderFilter === "upcoming" && !(du >= 2)) return false;
            }

            return searchMatch && typeMatch && locationMatch;
        });
    }, [hospitals, search, filterType, filterLocation, reminderFilter]);

    // Sorting
    const sortedHospitals = useMemo(() => {
        const arr = [...filteredHospitals];
        if (!sortField) return arr;
        const dir = sortOrder === "asc" ? 1 : -1;

        arr.sort((a, b) => {
            let valA, valB;

            if (sortField === "beds") {
                valA = parseInt(a.noOfBeds) || 0;
                valB = parseInt(b.noOfBeds) || 0;
            } else if (sortField === "reminder") {
                valA = getNearestReminderDate(a)?.getTime() || Infinity;
                valB = getNearestReminderDate(b)?.getTime() || Infinity;
            } else if (sortField === "idNo") {
                const ida = a.idNo || "";
                const idb = b.idNo || "";
                const numA = parseInt((ida.match(/\d+/) || ["0"])[0], 10) || 0;
                const numB = parseInt((idb.match(/\d+/) || ["0"])[0], 10) || 0;
                if (numA !== numB) return (numA - numB) * dir;
                valA = ida.toLowerCase();
                valB = idb.toLowerCase();
            } else if (sortField === "visitType") {
                valA = (a.visitType || "").toLowerCase();
                valB = (b.visitType || "").toLowerCase();
            } else {
                valA = ((a[sortField] || "") + "").toString().toLowerCase();
                valB = ((b[sortField] || "") + "").toString().toLowerCase();
            }

            if (valA < valB) return -1 * dir;
            if (valA > valB) return 1 * dir;
            return 0;
        });

        return arr;
    }, [filteredHospitals, sortField, sortOrder]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(sortedHospitals.length / rowsPerPage));
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const indexOfLastHospital = safePage * rowsPerPage;
    const indexOfFirstHospital = indexOfLastHospital - rowsPerPage;
    const currentHospitals = sortedHospitals.slice(indexOfFirstHospital, indexOfLastHospital);

    useEffect(() => {
        // keep current page valid if rowsPerPage or filtered length changes
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [totalPages, currentPage]);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const toggleSort = (field) => {
        if (sortField === field) {
            setSortOrder((s) => (s === "asc" ? "desc" : "asc"));
        } else {
            setSortField(field);
            setSortOrder("asc");
        }
        setCurrentPage(1);
    };

    // Reset all filters/sort/pagination
    const handleReset = () => {
        setSearch("");
        setFilterType("");
        setFilterLocation("");
        setReminderFilter("");
        setSortField("idNo");
        setSortOrder("asc");
        setRowsPerPage(10);
        setCurrentPage(1);
    };

    // Modal actions
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
        setShowDeleteConfirm(false);
        setDeleteReason("");
        setShowDeleteReason(true);
    };


    const handleDeleteWithReason = async () => {
        if (!hospitalToDelete) return;
        const { id, ...payload } = hospitalToDelete;
        try {
            const movedAt = new Date().toISOString();
            await firebaseDB.child(`DeletedHospitalData/${id}`).set({
                ...payload,
                originalId: id,
                movedAt,
                deleteReason: deleteReason || "No reason provided"
            });
            await firebaseDB.child(`HospitalData/${id}`).remove();
            setShowDeleteReason(false);
            setHospitalToDelete(null);
        } catch (err) {
            setError("Error deleting hospital: " + err.message);
            setShowDeleteReason(false);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedHospital(null);
        setIsEditMode(false);
    };

    if (loading) return <div className="text-center my-5">Loading hospitals...</div>;
    if (error) return <div className="alert alert-danger">Error: {error}</div>;
    if (hospitals.length === 0) return <div className="alert alert-info">No hospitals found</div>;

    // unique filter options
    const types = [...new Set(hospitals.map((h) => h.type).filter(Boolean))];
    const locations = [...new Set(hospitals.map((h) => h.location).filter(Boolean))];

    return (
        <div className="p-3">
     

            {/* Reminder badges (same class scheme as ClientDisplay) */}
            <div className="alert alert-info d-flex justify-content-around flex-wrap reminder-badges">
                {["overdue", "today", "tomorrow", "upcoming"].map((k) => (
                    <span
                        key={k}
                        role="button"
                        className={`reminder-badge ${k} ${reminderFilter === k ? "active" : ""}`}
                        onClick={() => { setReminderFilter(reminderFilter === k ? "" : k); setCurrentPage(1); }}
                    >
                        {k[0].toUpperCase() + k.slice(1)}: <strong className="ms-1">
                            {k === "overdue" ? badgeCounts.overdue : k === "today" ? badgeCounts.today : k === "tomorrow" ? badgeCounts.tomorrow : badgeCounts.upcoming}
                        </strong>
                    </span>
                ))}
            </div>

                   {/* Top row: search, filters, reset */}
            <div className="mb-3">
                <div className="row gap-2">
                <div className="col-md-6">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Search by name, id, location, type..."
                        style={{ minWidth: 240 }}
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    />
                </div>
                <div className="col-md-2">
                    <select
                        className="form-select"
                        value={filterType}
                        onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="">All Types</option>
                        {types.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div className="col-md-2">
                    <select
                        className="form-select"
                        value={filterLocation}
                        onChange={(e) => { setFilterLocation(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="">All Locations</option>
                        {locations.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                </div>
                <div className="col-md-1">
                    <button className="btn btn-secondary" onClick={handleReset}>Reset</button>
                </div>

            </div>
            </div>

            {/* Table */}
            <div className="table-responsive">
                <table className="table table-dark table-hover">
                    <thead className="table-dark">
                        <tr>
                            <th onClick={() => toggleSort("idNo")} style={{ cursor: "pointer" }}>
                                ID No {sortField === "idNo" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
                            </th>
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
                            <th onClick={() => toggleSort("visitType")} style={{ cursor: "pointer" }}>
                                Auto Visit {sortField === "visitType" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
                            </th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentHospitals.map((hospital) => {
                            const nearestReminder = getNearestReminderDate(hospital);
                            const reminderClass = getReminderClass(nearestReminder);
                            return (
                                <tr key={hospital.id} style={{cursor:'pointer'}} onClick={(e) => { if (e.target.closest('button, a, .btn, .page-link')) return; handleView(hospital); }}>
                                    <td>{hospital.idNo || hospital.id || "N/A"}</td>
                                    <td>{hospital.hospitalName || "N/A"}</td>
                                    <td>{hospital.location || "N/A"}</td>
                                    <td>{hospital.type || "N/A"}</td>
                                    <td>{hospital.noOfBeds || "N/A"}</td>
                                    <td className={reminderClass}>
                                        {nearestReminder ? new Date(nearestReminder).toLocaleDateString("en-GB") : "—"}
                                    </td>
                                    <td>
                                        <span className={`badge ${getVisitClass(hospital.visitType)}`}>
                                            {hospital.visitType || "N/A"}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="d-flex">
                                            <button className="btn btn-sm me-2" title="View" onClick={(e) => { e.stopPropagation(); handleView(hospital); }}>
                                                <img src={viewIcon} alt="view" style={{ width: 18, height: 18, opacity: 0.8 }} />
                                            </button>
                                            <button className="btn btn-sm" title="Delete" onClick={(e) => { e.stopPropagation(); openDeleteConfirm(hospital); }}>
                                                <img src={deleteIcon} alt="delete" style={{ width: 14, height: 14 }} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {currentHospitals.length === 0 && (
                            <tr>
                                <td colSpan="8">
                                    <div className="alert alert-warning mb-0">No records match your filters.</div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            
            {totalPages > 1 && (
                <nav aria-label="Hospital pagination" className="pagination-wrapper">
                    <ul className="pagination justify-content-center">
                        <li className={`page-item ${safePage === 1 ? "disabled" : ""}`}>
                            <button className="page-link" onClick={() => paginate(Math.max(1, safePage - 1))} disabled={safePage === 1}>
                                Previous
                            </button>
                        </li>
                        {/* Numbered pages: show at most 10 */}
                        {(() => {
                            const pages = [];
                            const maxToShow = 10;
                            let start = Math.max(1, safePage - Math.floor(maxToShow / 2));
                            let end = start + maxToShow - 1;
                            if (end > totalPages) { end = totalPages; start = Math.max(1, end - maxToShow + 1); }
                            for (let n = start; n <= end; n++) {
                                pages.push(
                                    <li key={n} className={`page-item ${n === safePage ? "active" : ""}`}>
                                        <button className="page-link" onClick={() => paginate(n)}>{n}</button>
                                    </li>
                                );
                            }
                            return pages;
                        })()}
                        <li className={`page-item ${safePage === totalPages ? "disabled" : ""}`}>
                            <button className="page-link" onClick={() => paginate(Math.min(totalPages, safePage + 1))} disabled={safePage === totalPages}>
                                Next
                            </button>
                        </li>
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

            
            {/* Delete Reason Modal */}
            {showDeleteReason && hospitalToDelete && (
                <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Delete Reason</h5>
                                <button type="button" className="btn-close" onClick={() => { setShowDeleteReason(false); setHospitalToDelete(null); }}></button>
                            </div>
                            <div className="modal-body">
                                <p className="mb-2">Please provide a reason for deleting:</p>
                                <textarea
                                    className="form-control"
                                    rows="4"
                                    value={deleteReason}
                                    onChange={(e) => setDeleteReason(e.target.value)}
                                    placeholder="Reason for deletion"
                                />
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => { setShowDeleteReason(false); setHospitalToDelete(null); }}>Cancel</button>
                                <button type="button" className="btn btn-danger" onClick={handleDeleteWithReason} disabled={deleteReason.trim().length === 0}>
                                    Confirm Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            
            {/* Delete Reason Modal */}
            {showDeleteReason && hospitalToDelete && (
                <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }} onClick={(e)=>e.stopPropagation()}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content" onClick={(e)=>e.stopPropagation()}>
                            <div className="modal-header">
                                <h5 className="modal-title">Please Confirm Delete</h5>
                                <button type="button" className="btn-close" onClick={() => { setShowDeleteReason(false); setHospitalToDelete(null); }}></button>
                            </div>
                            <div className="modal-body">
                                <p className="mb-2">Provide a reason for deleting this hospital. This will be stored in DeletedHospitalData.</p>
                                <textarea className="form-control" rows="4" value={deleteReason} onChange={(e)=>setDeleteReason(e.target.value)} placeholder="Reason (required)" />
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => { setShowDeleteReason(false); setHospitalToDelete(null); }}>Cancel</button>
                                <button type="button" className="btn btn-danger" onClick={handleDeleteWithReason} disabled={!deleteReason.trim()}>Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
    
            {/* Delete Confirmation */}
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
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeDeleteConfirm}>Cancel</button>
                                <button type="button" className="btn btn-danger" onClick={handleDeleteConfirmed}>Yes, Move & Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
