import React, { useState, useEffect } from "react";
import firebaseDB from "../../firebase";
import viewIcon from "../../assets/view.svg";
import deleteIcon from "../../assets/delete.svg";
import returnIcon from '../../assets/return.svg';
import HospitalModal from "./HospitalModal";

export default function DeletedHospital() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedHospital, setSelectedHospital] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Delete flow
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hospitalToDelete, setHospitalToDelete] = useState(null);

  // Return/Restore flow
  const [showReturnConfirm, setShowReturnConfirm] = useState(false);
  const [showReturnReason, setShowReturnReason] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [hospitalToReturn, setHospitalToReturn] = useState(null);
  const [showReturnSuccess, setShowReturnSuccess] = useState(false);
  const [returnedHospital, setReturnedHospital] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Search
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchDeletedHospitals = () => {
      try {
        firebaseDB.child("DeletedHospitalData").on("value", (snapshot) => {
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

    fetchDeletedHospitals();
    return () => {
      firebaseDB.child("DeletedHospitalData").off("value");
    };
  }, []);

  // Search filter
  const filteredHospitals = hospitals.filter((h) =>
    [h.hospitalName, h.location, h.type, h.idNo]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(String(search).toLowerCase()))
  );

  // Pagination logic
  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentHospitals = filteredHospitals.slice(indexOfFirst, indexOfLast);
  const totalFilteredPages = Math.ceil(filteredHospitals.length / rowsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleView = (hospital) => {
    setSelectedHospital(hospital);
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
    try {
      await firebaseDB.child(`DeletedHospitalData/${hospitalToDelete.id}`).remove();
      closeDeleteConfirm();
    } catch (err) {
      setError("Error deleting hospital: " + err.message);
      closeDeleteConfirm();
    }
  };

  const openReturnConfirm = (hospital) => {
    setHospitalToReturn(hospital);
    setShowReturnConfirm(true);
  };

  const closeReturnConfirm = () => {
    setShowReturnConfirm(false);
    setHospitalToReturn(null);
  };

  const handleReturnConfirmed = async () => {
    if (!hospitalToReturn) return;
    setShowReturnConfirm(false);
    setReturnReason("");
    setShowReturnReason(true);
  };

  const handleReturnWithReason = async () => {
    if (!hospitalToReturn) return;
    try {
      // Remove from deleted
      await firebaseDB.child(`DeletedHospitalData/${hospitalToReturn.id}`).remove();
      // Add back to main with reason & timestamps
      const { id, movedAt, deleteReason, originalId, ...hospitalData } = hospitalToReturn;
      const newRef = firebaseDB.child("HospitalData").push();
      await newRef.set({
        ...hospitalData,
        id: newRef.key,
        restoredAt: new Date().toISOString(),
        revertReason: returnReason || "No reason provided",
        deleteReason: deleteReason || null,
        originalId: originalId || id
      });
      setShowReturnReason(false);
      setHospitalToReturn(null);
    } catch (err) {
      setError("Error restoring hospital: " + err.message);
      setShowReturnReason(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedHospital(null);
  };

  if (loading) return <div className="text-center my-5">Loading deleted hospitals...</div>;
  if (error) return <div className="alert alert-danger">Error: {error}</div>;
  if (hospitals.length === 0)
    return <div className="alert alert-info text-info">No deleted hospitals found</div>;

  return (
    <>
      {/* Header: Search & Rows per page */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap" style={{ gap: "10px" }}>
        <div className="d-flex align-items-center">
          <span className="me-2">Show</span>
          <select
            className="form-select form-select-sm"
            style={{ width: "80px" }}
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={30}>30</option>
          </select>
          <span className="ms-2">entries</span>
        </div>

        <input
          type="text"
          className="form-control w-50"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div>
          Showing {indexOfFirst + 1} to{" "}
          {Math.min(indexOfLast, filteredHospitals.length)} of{" "}
          {filteredHospitals.length} entries
        </div>
      </div>

      {/* Table */}
      <div className="table-responsive">
        <table className="table table-dark table-hover">
          <thead className="table-dark">
            <tr>
              <th>ID No ↓</th>
              <th>Hospital Name</th>
              <th>Location</th>
              <th>Type</th>
              <th>No of Beds</th>
              <th>Deleted At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentHospitals.map((hospital) => (
              <tr key={hospital.id} style={{cursor:"pointer"}} onClick={(e) => { e.stopPropagation(); handleView(hospital); }}>
                <td>{hospital.idNo || "N/A"}</td>
                <td>{hospital.hospitalName || "N/A"}</td>
                <td>{hospital.location || "N/A"}</td>
                <td>{hospital.hospitalType || "N/A"}</td>
                <td>{hospital.noOfBeds || "N/A"}</td>
                <td>
                  {hospital.movedAt
                    ? new Date(hospital.movedAt).toLocaleString()
                    : "—"}
                </td>
                <td>
                  <div className="d-flex">
                    <button
                      className="btn btn-sm me-2"
                      title="View"
                      onClick={(e) => { e.stopPropagation(); handleView(hospital); }}
                    >
                      <img
                        src={viewIcon}
                        alt="view Icon"
                        style={{ opacity: 0.6, width: "18px", height: "18px" }}
                      />
                    </button>
                    <button
                      className="btn btn-sm me-2"
                      title="Restore to Hospital Data"
                      onClick={(e) => { e.stopPropagation(); openReturnConfirm(hospital); }}
                    >
                      <img
                        src={returnIcon}
                        alt="return Icon"
                        style={{ width: "16px", height: "16px" }}
                      />
                    </button>
                    {/* Delete Hospital Code */}
                    {/* <button
                      className="btn btn-sm"
                      title="Delete Permanently"
                      onClick={(e) => { e.stopPropagation(); openDeleteConfirm(hospital); }}
                    >
                      <img
                        src={deleteIcon}
                        alt="delete Icon"
                        style={{ width: "14px", height: "14px" }}
                      />
                    </button> */}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      
      
      {totalFilteredPages > 1 && (
        <nav aria-label="Hospital pagination" className="pagination-wrapper">
          <ul className="pagination justify-content-center">
            <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
              <button
                className="page-link"
                onClick={() => paginate(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
            </li>
            {/* Numbered pages: show at most 10 */}
            {(() => {
              const items = [];
              const maxToShow = 10;
              let start = Math.max(1, currentPage - Math.floor(maxToShow / 2));
              let end = start + maxToShow - 1;
              if (end > totalFilteredPages) { end = totalFilteredPages; start = Math.max(1, end - maxToShow + 1); }
              for (let n = start; n <= end; n++) {
                items.push(
                  <li key={n} className={`page-item ${n === currentPage ? "active" : ""}`}>
                    <button className="page-link" onClick={() => paginate(n)}>{n}</button>
                  </li>
                );
              }
              return items;
            })()}
            <li className={`page-item ${currentPage === totalFilteredPages ? "disabled" : ""}`}>
              <button
                className="page-link"
                onClick={() => paginate(Math.min(totalFilteredPages, currentPage + 1))}
                disabled={currentPage === totalFilteredPages}
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      )}

 
       
    

      {/* Hospital Modal */}
      {selectedHospital && (
        <HospitalModal
          hospital={selectedHospital}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          isEditMode={false} // Read-only in deleted view
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && hospitalToDelete && (
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Permanent Delete</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeDeleteConfirm}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to permanently delete this record?
                </p>
                <p>
                  <strong>ID:</strong> {hospitalToDelete.idNo || hospitalToDelete.id} <br />
                  <strong>Name:</strong> {hospitalToDelete.hospitalName || "N/A"}
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeDeleteConfirm}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDeleteConfirmed}
                >
                  Yes, Delete Permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      
      {/* Return Reason Modal */}
      {showReturnReason && hospitalToReturn && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }} onClick={(e)=>e.stopPropagation()}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" onClick={(e)=>e.stopPropagation()}>
              <div className="modal-header">
                <h5 className="modal-title">Please Confirm Restore</h5>
                <button type="button" className="btn-close" onClick={() => { setShowReturnReason(false); setHospitalToReturn(null); }}></button>
              </div>
              <div className="modal-body">
                <p className="mb-2">Provide a reason for restoring this hospital to main data. This will be stored with the record.</p>
                <textarea className="form-control" rows="4" value={returnReason} onChange={(e)=>setReturnReason(e.target.value)} placeholder="Reason (required)" />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowReturnReason(false); setHospitalToReturn(null); }}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleReturnWithReason} disabled={!returnReason.trim()}>Restore</button>
              </div>
            </div>
          </div>
        </div>
      )}
    
      {/* Return/Restore Confirmation Modal */}
      {showReturnConfirm && hospitalToReturn && (
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Restore Hospital</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeReturnConfirm}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to restore this hospital to the main Hospital Data?
                </p>
                <p>
                  <strong>ID:</strong> {hospitalToReturn.idNo || hospitalToReturn.id} <br />
                  <strong>Name:</strong> {hospitalToReturn.hospitalName || "N/A"}
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeReturnConfirm}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleReturnConfirmed}
                >
                  Yes, Restore Hospital
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Return Success Modal */}
      {showReturnSuccess && returnedHospital && (
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Thank You!</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowReturnSuccess(false)}
                ></button>
              </div>
              <div className="modal-body text-center">
                <div className="mb-4">
                  <i className="fas fa-check-circle text-success" style={{ fontSize: "3rem" }}></i>
                </div>
                <h4>Hospital Successfully Restored</h4>
                <p className="mb-1">Thank you for restoring the hospital to the database.</p>
                <p><strong>Hospital ID:</strong> {returnedHospital.idNo}</p>
                <p><strong>Hospital Name:</strong> {returnedHospital.hospitalName}</p>
              </div>
              <div className="modal-footer justify-content-center">
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => setShowReturnSuccess(false)}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}