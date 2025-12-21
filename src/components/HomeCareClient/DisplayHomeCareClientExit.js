import React, { useState, useEffect } from "react";
import firebaseDB from "../../firebase";
import editIcon from "../../assets/eidt.svg";
import viewIcon from "../../assets/view.svg";
import returnIcon from "../../assets/return.svg";
import ClientModal from "./HousekeepingModal/HousekeepingClientModal";

export default function DisplayHomeCareClientExit() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);

    // Combined action form for Return/Revert
    const [actionForm, setActionForm] = useState({ reason: "", comment: "" });
    const [actionErrors, setActionErrors] = useState({});
    const [showActionConfirm, setShowActionConfirm] = useState(false);
    const [showActionDetails, setShowActionDetails] = useState(false);
    const [clientToAct, setClientToAct] = useState(null);
    const [actionType, setActionType] = useState(null); // "return" or "revert"
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const [selectedClient, setSelectedClient] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        // Load exit clients from HouseKeeping/ExitClients
        const ref = firebaseDB.child("HouseKeeping/ExitClients");
        ref.on("value", (snapshot) => {
            if (snapshot.exists()) {
                const arr = [];
                snapshot.forEach((snap) => {
                    const clientData = snap.val();
                    // Remove nested removalHistory structure if present
                    if (clientData && typeof clientData === 'object') {
                        const cleanData = { ...clientData };
                        // Extract actual client data from the structure
                        arr.push({ id: snap.key, ...cleanData });
                    }
                });
                setClients(arr);
                setTotalPages(Math.ceil(arr.length / rowsPerPage));
            } else {
                setClients([]);
                setTotalPages(1);
            }
            setLoading(false);
        });
        return () => ref.off("value");
    }, [rowsPerPage]);

    // Pagination helpers
    const indexOfLastClient = currentPage * rowsPerPage;
    const indexOfFirstClient = indexOfLastClient - rowsPerPage;
    const currentClients = clients.slice(indexOfFirstClient, indexOfLastClient);
    const paginate = (n) => setCurrentPage(n);

    // View -> open modal in view mode (load returnHistory from HouseKeeping/ExitClients node if present)
    const handleView = async (client) => {
        const id = client?.id;
        const clientRec = { ...client };
        if (id) {
            try {
                const snap = await firebaseDB.child(`HouseKeeping/ExitClients/${id}`).once("value");
                const val = snap.val();
                if (val) {
                    // Check for nested removalHistory
                    if (val.removalHistory && typeof val.removalHistory === 'object') {
                        const removalKeys = Object.keys(val.removalHistory);
                        if (removalKeys.length > 0) {
                            // Extract the first removal history entry
                            const removalEntry = val.removalHistory[removalKeys[0]];
                            clientRec.removalHistory = [removalEntry];
                        }
                    }
                    if (val.returnHistory) clientRec.returnHistory = Object.values(val.returnHistory);
                }
            } catch (e) {
                console.warn("fetch history failed", e);
            }
        }
        clientRec.returnHistory = clientRec.returnHistory || [];
        clientRec.removalHistory = clientRec.removalHistory || [];
        setSelectedClient(clientRec);
        setIsEditMode(false);
        setIsModalOpen(true);
    };

    const handleEdit = (client) => {
        setSelectedClient(client);
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    // Open confirm (step 1)
    const openActionConfirm = (client, type = "revert") => {
        setClientToAct(client);
        setActionType(type); // "return" or "revert"
        setShowActionConfirm(true);
    };
    const closeActionConfirm = () => {
        setShowActionConfirm(false);
        setClientToAct(null);
    };

    // Open details (step 2)
    const openActionDetails = () => {
        setShowActionConfirm(false);
        setShowActionDetails(true);
    };
    const closeActionDetails = () => {
        setShowActionDetails(false);
        setActionForm({ reason: "", comment: "" });
        setActionErrors({});
        setClientToAct(null);
        setActionType(null);
    };

    // Finalise action: restore to HouseKeeping, push to returnHistory under both HouseKeeping and ExitClients, remove ExitClients node
    const handleActionFinal = async () => {
        if (!clientToAct) return;
        const { id, ...payload } = clientToAct;
        const errs = {};
        if (!actionForm.reason) errs.reason = "Select reason";
        if (!actionForm.comment || !actionForm.comment.trim()) errs.comment = "Enter comment";
        setActionErrors(errs);
        if (Object.keys(errs).length > 0) return;

        try {
            const now = new Date().toISOString();
            const user = window?.CURRENT_USER_NAME || "System";

            const entry = {
                returnedAt: now,
                returnedBy: user,
                returnReason: actionForm.reason,
                returnComment: actionForm.comment.trim(),
                actionType, // "return" or "revert"
            };

            // Clean up the payload before restoring
            const cleanPayload = { ...payload };
            // Remove any metadata fields that shouldn't be in the active record
            delete cleanPayload.removalHistory;
            delete cleanPayload.returnHistory;
            delete cleanPayload.__locked;
            delete cleanPayload.__edited;

            // 1) restore to active HouseKeeping
            await firebaseDB.child(`HouseKeeping/ClientData/${id}`).set({
                ...cleanPayload,
                restoredFromExit: true,
                restoredAt: now,
                restoredBy: user,
            });

            // 2) append to HouseKeeping/{id}/returnHistory
            try {
                const returnHistoryRef = firebaseDB.child(`HouseKeeping/ClientData/${id}/returnHistory`);
                const newReturnRef = returnHistoryRef.push();
                await newReturnRef.set(entry);
            } catch (err) {
                console.warn("push to HouseKeeping returnHistory failed", err);
            }

            // 3) append to HouseKeeping/ExitClients/{id}/returnHistory
            try {
                const exitReturnHistoryRef = firebaseDB.child(`HouseKeeping/ExitClients/${id}/returnHistory`);
                const newExitReturnRef = exitReturnHistoryRef.push();
                await newExitReturnRef.set(entry);
            } catch (err) {
                console.warn("push to ExitClients returnHistory failed", err);
            }

            // 4) remove ExitClients node
            await firebaseDB.child(`HouseKeeping/ExitClients/${id}`).remove();

            // 5) Update local state
            setClients(prev => prev.filter(client => client.id !== id));

            closeActionDetails();
            setShowSuccessModal(true);
        } catch (err) {
            console.error("Action finalization error:", err);
            closeActionDetails();
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedClient(null);
        setIsEditMode(false);
    };

    if (loading) return <div className="text-center my-4">Loading exit clients...</div>;
    if (clients.length === 0) return <div className="alert alert-info text-info mmt-3">No exit clients found</div>;

    return (
        <div>
            <h2 className="mb-3">Home Care Existing Clients</h2>

            {/* Pagination Controls */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center">
                    <label className="me-2">Rows per page:</label>
                    <select
                        className="form-select form-select-sm w-auto"
                        value={rowsPerPage}
                        onChange={(e) => {
                            setRowsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                    >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                    </select>
                </div>

                <div>
                    <nav>
                        <ul className="pagination pagination-sm mb-0">
                            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                <button className="page-link" onClick={() => paginate(currentPage - 1)}>&laquo;</button>
                            </li>
                            {[...Array(totalPages)].map((_, i) => (
                                <li key={i} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                                    <button className="page-link" onClick={() => paginate(i + 1)}>{i + 1}</button>
                                </li>
                            ))}
                            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                <button className="page-link" onClick={() => paginate(currentPage + 1)}>&raquo;</button>
                            </li>
                        </ul>
                    </nav>
                </div>
            </div>

            <div className="table-responsive">
                <table className="table table-dark table-hover">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Location</th>
                            <th>Service</th>
                            <th>Mobile</th>
                            <th>Exit Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentClients.map((c) => (
                            <tr key={c.id} onClick={() => handleView(c)} style={{ cursor: "pointer" }}>
                                <td>{c.idNo || c.id || "N/A"}</td>
                                <td>{c.clientName || "N/A"}</td>
                                <td>{c.location || "N/A"}</td>
                                <td>{c.typeOfService || "N/A"}</td>
                                <td>{c.mobileNo1 || "N/A"}</td>
                                <td>
                                    {c.removalHistory?.[0]?.removedAt ?
                                        new Date(c.removalHistory[0].removedAt).toLocaleDateString() :
                                        "N/A"}
                                </td>
                                <td>
                                    <div className="d-flex">
                                        <button
                                            className="btn btn-sm me-2 btn-info"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleView(c);
                                            }}
                                            title="View"
                                        >
                                            <img src={viewIcon} alt="view" width={18} />
                                        </button>

                                        <button
                                            className="btn btn-sm me-2 btn-warning"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEdit(c);
                                            }}
                                            title="Edit"
                                        >
                                            <img src={editIcon} alt="edit" width={16} />
                                        </button>

                                        <button
                                            className="btn btn-sm btn-success"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openActionConfirm(c, "revert");
                                            }}
                                            title="Revert / Reopen"
                                        >
                                            <img src={returnIcon} alt="revert" width={18} style={{ transform: "rotate(90deg)" }} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Client view/edit modal */}
            {selectedClient && (
                <ClientModal
                    client={selectedClient}
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    isEditMode={isEditMode}
                    onSave={() => {
                        // Refresh the list after save
                        const ref = firebaseDB.child("HouseKeeping/ExitClients");
                        ref.once("value", (snapshot) => {
                            if (snapshot.exists()) {
                                const arr = [];
                                snapshot.forEach((snap) => {
                                    const clientData = snap.val();
                                    if (clientData && typeof clientData === 'object') {
                                        arr.push({ id: snap.key, ...clientData });
                                    }
                                });
                                setClients(arr);
                                setTotalPages(Math.ceil(arr.length / rowsPerPage));
                            }
                        });
                    }}
                />
            )}

            {/* Step 1: confirm */}
            {showActionConfirm && clientToAct && (
                <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Confirm {actionType}</h5>
                                <button className="btn-close" onClick={closeActionConfirm} />
                            </div>
                            <div className="modal-body">
                                <p>Do you want to {actionType} this client back to active?</p>
                                <p>
                                    <strong>ID:</strong> {clientToAct.idNo || clientToAct.id || "N/A"} <br />
                                    <strong>Name:</strong> {clientToAct.clientName || "N/A"} <br />
                                    <strong>Service:</strong> {clientToAct.typeOfService || "N/A"}
                                </p>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={closeActionConfirm}>Cancel</button>
                                <button className="btn btn-primary" onClick={openActionDetails}>Yes</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2: reason/comment */}
            {showActionDetails && clientToAct && (
                <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">{actionType} Details</h5>
                                <button className="btn-close" onClick={closeActionDetails} />
                            </div>
                            <div className="modal-body">
                                <div className="mb-2">
                                    <label className="form-label">Reason</label>
                                    <select
                                        className="form-select"
                                        value={actionForm.reason}
                                        onChange={(e) => setActionForm((p) => ({ ...p, reason: e.target.value }))}
                                    >
                                        <option value="">--Select--</option>
                                        <option value="Re-open">Re-open</option>
                                        <option value="Re-start">Re-start</option>
                                        <option value="New-Start">New-Start</option>
                                        <option value="Renewal">Renewal</option>
                                        <option value="Client Request">Client Request</option>
                                        <option value="Error Correction">Error Correction</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    {actionErrors.reason && <div className="text-danger small mt-1">{actionErrors.reason}</div>}
                                </div>

                                <div className="mb-2">
                                    <label className="form-label">Comment</label>
                                    <textarea
                                        className="form-control"
                                        rows="4"
                                        value={actionForm.comment}
                                        onChange={(e) => setActionForm((p) => ({ ...p, comment: e.target.value }))}
                                        placeholder="Add additional details about why this client is being restored..."
                                    />
                                    {actionErrors.comment && <div className="text-danger small mt-1">{actionErrors.comment}</div>}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={closeActionDetails}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleActionFinal}>Confirm {actionType}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Success modal */}
            {showSuccessModal && (
                <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header bg-success text-white">
                                <h5 className="modal-title">Success</h5>
                                <button className="btn-close btn-close-white" onClick={() => setShowSuccessModal(false)} />
                            </div>
                            <div className="modal-body">
                                <p>Client successfully restored to active clients with history recorded.</p>
                                <p className="small text-muted">The client has been moved from exit clients back to active housekeeping clients.</p>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-success" onClick={() => setShowSuccessModal(false)}>OK</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}