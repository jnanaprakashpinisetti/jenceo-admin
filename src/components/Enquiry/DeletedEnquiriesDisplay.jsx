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

    const [actionType, setActionType] = useState(""); // "revert" | "delete"
    const [targetEnquiry, setTargetEnquiry] = useState(null);

    // Load DeletedEnquiries
    useEffect(() => {
        setLoading(true);
        const ref = firebaseDB.child("DeletedEnquiries");
        ref.on("value", (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const list = Object.keys(data).map((delKey) => {
                    const item = data[delKey] || {};
                    // Keep BOTH keys:
                    // - delKey: the key under DeletedEnquiries (for removal)
                    // - id: original EnquiryData key (for restoring)
                    return {
                        delKey,           // Firebase key in DeletedEnquiries (must use for remove)
                        ...item,          // includes 'id' from original enquiry if present
                    };
                });
                setDeletedEnquiries(list);
            } else {
                setDeletedEnquiries([]);
            }
            setLoading(false);
        });

        // Cleanup
        return () => ref.off();
    }, []);

    // View/Edit handlers
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

    // Revert/Delete confirmations
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

    // 🔧 Revert with SAME original key & correct delete path (atomic)
    const handleRevert = async () => {
        if (!targetEnquiry) return;

        try {
            const { delKey, id: originalId, ...rest } = targetEnquiry;

            // Destination id = original enquiry id if present, otherwise fall back to delKey
            const destId = originalId || delKey;

            // Remove any helper keys from the record we write back
            const { delKey: _x, id: _y, ...enquiryData } = targetEnquiry;

            // Atomic move: write to EnquiryData/<destId>, remove DeletedEnquiries/<delKey>
            const updates = {};
            updates[`EnquiryData/${destId}`] = enquiryData;
            updates[`DeletedEnquiries/${delKey}`] = null;

            await firebaseDB.update(updates);

            // Local UI updates
            setShowRevertModal(false);
            setShowSuccessModal(true);
            setDeletedEnquiries((prev) => prev.filter((row) => row.delKey !== delKey));
        } catch (err) {
            console.error("Error reverting enquiry:", err);
            alert("Error reverting enquiry. Please try again.");
        }
    };

    // 🔧 Permanent delete (correctly uses delKey)
    const handlePermanentDelete = async () => {
        if (!targetEnquiry) return;

        try {
            const { delKey } = targetEnquiry;
            await firebaseDB.child(`DeletedEnquiries/${delKey}`).remove();

            setShowDeleteModal(false);
            setShowSuccessModal(true);
            setDeletedEnquiries((prev) => prev.filter((row) => row.delKey !== delKey));
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
                    <div className="spinner-border text-primary" role="status" />
                    <p className="mt-2">Loading deleted enquiries...</p>
                </div>
            ) : deletedEnquiries.length === 0 ? (
                <div className="alert alert-info text-center">
                    <h5>No deleted enquiries found</h5>
                </div>
            ) : (
                <div className="table-responsive">
                    <table className="table table-dark table-striped">
                        <thead>
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
                                <tr key={enq.delKey} style={{cursor:"pointer"}} onClick={(e)=>{ if (e.target.closest("button,a,.btn")) return; handleView(enq); }}>
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
                                            <button className="btn btn-sm" onClick={() => handleView(enq)} title="View">
                                                <img src={viewIcon} alt="view" width="16" />
                                            </button>
                                            <button className="btn btn-sm" onClick={() => handleEdit(enq)} title="Edit">
                                                <img src={editIcon} alt="edit" width="14" />
                                            </button>
                                            <button className="btn btn-sm" onClick={() => confirmRevert(enq)} title="Revert">
                                                <img src={revertIcon} alt="revert" width="16" />
                                            </button>
                                            {/* Permenent delete button */}
                                            {/* <button className="btn btn-sm" onClick={() => confirmDelete(enq)} title="Delete Permanently">
                                                <img src={deleteIcon} alt="delete" width="14" />
                                            </button> */}
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
                                <button type="button" className="btn-close" onClick={() => setShowRevertModal(false)} />
                            </div>
                            <div className="modal-body text-center">
                                Move enquiry <strong>{targetEnquiry.name}</strong> back to active enquiries?
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
                                <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)} />
                            </div>
                            <div className="modal-body text-center">
                                Permanently delete enquiry <strong>{targetEnquiry.name}</strong>?
                            </div>
                            <div className="modal-footer justify-content-center">
                                <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                                <button className="btn btn-danger" onClick={handlePermanentDelete}>Yes, Delete</button>
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
                                <button type="button" className="btn-close" onClick={() => setShowSuccessModal(false)} />
                            </div>
                            <div className="modal-body text-center">
                                Enquiry for <strong>{targetEnquiry.name}</strong> has been{" "}
                                {actionType === "revert" ? "reverted to EnquiryData" : "deleted permanently"}.
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

            {/* View/Edit Modal */}
            {showModal && selectedEnquiry && (
                <EnquiryModal
                    show={showModal}
                    onClose={() => setShowModal(false)}
                    enquiry={selectedEnquiry}
                    mode={modalMode}
                    currentUser="Admin"
                    onSaveSuccess={() => { }}
                />
            )}
        </div>
    );
};

export default DeletedEnquiriesDisplay;
