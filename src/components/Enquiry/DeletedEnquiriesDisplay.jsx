import React, { useState, useEffect } from "react";
import { firebaseDB } from "../../firebase";
import viewIcon from "../../assets/view.svg";
import editIcon from "../../assets/eidt.svg";
import revertIcon from "../../assets/return.svg";
import deleteIcon from "../../assets/delete.svg";
import EnquiryModal from "./EnquiryModal";

const DeletedEnquiriesDisplay = () => {
  const [deletedEnquiries, setDeletedEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("view");
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [actionType, setActionType] = useState(""); // "revert" or "delete"
  const [targetEnquiry, setTargetEnquiry] = useState(null);

  // 🔹 Fetch deleted enquiries
  useEffect(() => {
    setLoading(true);
    firebaseDB.child("DeletedEnquiries").on("value", (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setDeletedEnquiries(list);
      } else {
        setDeletedEnquiries([]);
      }
      setLoading(false);
    });
  }, []);

  const handleView = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setModalMode("view");
    setShowModal(true);
  };

  const handleEdit = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setModalMode("edit");
    setShowModal(true);
  };

  const confirmRevert = (enquiry) => {
    setTargetEnquiry(enquiry);
    setActionType("revert");
    setShowRevertModal(true);
  };

  const confirmDelete = (enquiry) => {
    setTargetEnquiry(enquiry);
    setActionType("delete");
    setShowDeleteModal(true);
  };

  // ✅ FIXED: Revert with proper Firebase operations
  const handleRevert = async () => {
    if (!targetEnquiry) return;

    try {
      const { id, ...enquiryData } = targetEnquiry;

      // ✅ Method 1: Use separate operations (more reliable)
      // Add to EnquiryData with the SAME ID
      await firebaseDB.child(`EnquiryData/${id}`).set(enquiryData);
      
      // Remove from DeletedEnquiries
      await firebaseDB.child(`DeletedEnquiries/${id}`).remove();

      // ✅ Method 2: Alternative using update (commented out)
      // const updates = {};
      // updates[`EnquiryData/${id}`] = enquiryData;
      // updates[`DeletedEnquiries/${id}`] = null;
      // await firebaseDB.update(updates);

      setShowRevertModal(false);
      setShowSuccessModal(true);

      // Update local state
      setDeletedEnquiries((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Error reverting enquiry:", err);
      alert("Error reverting enquiry. Please try again.");
    }
  };

  // ✅ Permanent Delete
  const handlePermanentDelete = async () => {
    if (!targetEnquiry) return;

    try {
      const { id } = targetEnquiry;
      await firebaseDB.child(`DeletedEnquiries/${id}`).remove();

      setShowDeleteModal(false);
      setShowSuccessModal(true);

      setDeletedEnquiries((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Error deleting enquiry:", err);
      alert("Error deleting enquiry. Please try again.");
    }
  };

  return (
    <div className="container-fluid mt-4">
      <h3 className="mb-4 text-center">Deleted Enquiries</h3>

      {loading ? (
        <div className="text-center my-4">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-2">Loading deleted enquiries...</p>
        </div>
      ) : deletedEnquiries.length === 0 ? (
        <div className="alert alert-info text-center">
          <h5>No deleted enquiries found</h5>
          <p className="mb-0">All deleted enquiries will appear here</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover table-striped">
            <thead className="table-dark">
              <tr>
                <th>S.No</th>
                <th>Name</th>
                <th>Mobile</th>
                <th>Service</th>
                <th>Amount</th>
                <th>Through</th>
                <th>Status</th>
                <th>Reminder Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deletedEnquiries.map((enq, idx) => (
                <tr key={enq.id}>
                  <td>{idx + 1}</td>
                  <td>{enq.name}</td>
                  <td>{enq.mobile}</td>
                  <td>{enq.service}</td>
                  <td>{enq.amount}</td>
                  <td>{enq.through}</td>
                  <td>{enq.status}</td>
                  <td>{enq.reminderDate || "-"}</td>
                  <td>
                    <div className="btn-group" role="group">
                      <button className="btn btn-outline-info btn-sm" onClick={() => handleView(enq)} title="View">
                        <img src={viewIcon} alt="view" width="16" height="16" />
                      </button>
                      <button className="btn btn-outline-warning btn-sm" onClick={() => handleEdit(enq)} title="Edit">
                        <img src={editIcon} alt="edit" width="14" height="14" />
                      </button>
                      <button className="btn btn-outline-success btn-sm" onClick={() => confirmRevert(enq)} title="Revert">
                        <img src={revertIcon} alt="revert" width="16" height="16" />
                      </button>
                      <button className="btn btn-outline-danger btn-sm" onClick={() => confirmDelete(enq)} title="Delete Permanently">
                        <img src={deleteIcon} alt="delete" width="14" height="14" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Revert Confirmation Modal */}
      {showRevertModal && targetEnquiry && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-warning text-dark">
                <h5 className="modal-title">Confirm Revert</h5>
                <button type="button" className="btn-close" onClick={() => setShowRevertModal(false)}></button>
              </div>
              <div className="modal-body text-center">
                Are you sure you want to move enquiry <strong>{targetEnquiry.name}</strong> back to active enquiries?
              </div>
              <div className="modal-footer justify-content-center">
                <button className="btn btn-secondary" onClick={() => setShowRevertModal(false)}>Cancel</button>
                <button className="btn btn-warning" onClick={handleRevert}>Yes, Revert</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Modal */}
      {showDeleteModal && targetEnquiry && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">Confirm Permanent Delete</h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)}></button>
              </div>
              <div className="modal-body text-center">
                This action cannot be undone!<br />
                Do you really want to permanently delete enquiry <strong>{targetEnquiry.name}</strong>?
              </div>
              <div className="modal-footer justify-content-center">
                <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                <button className="btn btn-danger" onClick={handlePermanentDelete}>Yes, Delete Permanently</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && targetEnquiry && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Success!</h5>
                <button type="button" className="btn-close" onClick={() => setShowSuccessModal(false)}></button>
              </div>
              <div className="modal-body text-center">
                The enquiry for <strong>{targetEnquiry.name}</strong> has been{" "}
                {actionType === "revert" ? "reverted to active enquiries" : "permanently deleted"}.
              </div>
              <div className="modal-footer justify-content-center">
                <button
                  className="btn btn-success"
                  onClick={() => {
                    setShowSuccessModal(false);
                    setTargetEnquiry(null);
                  }}
                >
                  OK
                </button>
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
          currentUser="Admin"
          onSaveSuccess={() => {}}
        />
      )}
    </div>
  );
};

export default DeletedEnquiriesDisplay;