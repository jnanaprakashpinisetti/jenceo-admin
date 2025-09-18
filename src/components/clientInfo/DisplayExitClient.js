// src/components/clientInfo/DisplayExitClient.js
import React, { useState, useEffect } from "react";
import firebaseDB from "../../firebase";
import editIcon from "../../assets/eidt.svg";
import viewIcon from "../../assets/view.svg";
import returnIcon from "../../assets/return.svg";
import ClientModal from "./ClientModal";

export default function DisplayExitClient() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Combined action form for Return/Revert (we store everything in returnHistory)
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
    // load exit clients
    const ref = firebaseDB.child("ExitClients");
    ref.on("value", (snapshot) => {
      if (snapshot.exists()) {
        const arr = [];
        snapshot.forEach((snap) => arr.push({ id: snap.key, ...snap.val() }));
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

  // pagination helpers
  const indexOfLastClient = currentPage * rowsPerPage;
  const indexOfFirstClient = indexOfLastClient - rowsPerPage;
  const currentClients = clients.slice(indexOfFirstClient, indexOfLastClient);
  const paginate = (n) => setCurrentPage(n);

  // View -> open modal in view mode (load returnHistory from ExitClients node if present)
  const handleView = async (client) => {
    const id = client?.id;
    const clientRec = { ...client };
    if (id) {
      try {
        const snap = await firebaseDB.child(`ExitClients/${id}`).once("value");
        const val = snap.val();
        if (val && val.returnHistory) clientRec.returnHistory = Object.values(val.returnHistory);
      } catch (e) {
        console.warn("fetch history failed", e);
      }
    }
    clientRec.returnHistory = clientRec.returnHistory || [];
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
    setActionType(type); // "return" or "revert" — we treat both similarly but store type in entry
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

  // Finalise action: restore to ClientData, push to returnHistory under both ClientData and ExitClients, remove ExitClients node
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

      // 1) restore to active ClientData
      await firebaseDB.child(`ClientData/${id}`).set({
        ...payload,
        restoredFromExit: true,
      });

      // 2) append to ClientData/{id}/returnHistory
      try {
        await firebaseDB.child(`ClientData/${id}/returnHistory`).push(entry);
      } catch (err) {
        console.warn("push to ClientData returnHistory failed", err);
      }

      // 3) append to ExitClients/{id}/returnHistory (non-fatal)
      try {
        await firebaseDB.child(`ExitClients/${id}/returnHistory`).push(entry);
      } catch (err) {
        console.warn("push to ExitClients returnHistory failed", err);
      }

      // 4) remove ExitClients node
      await firebaseDB.child(`ExitClients/${id}`).remove();

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
  if (clients.length === 0) return <div className="alert alert-info">No exit clients</div>;

  return (
    <div>
      <div className="table-responsive">
        <table className="table table-dark table-hover">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Location</th>
              <th>Service</th>
              <th>Mobile</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentClients.map((c) => (
              <tr key={c.id} onClick={() => handleView(c)} style={{ cursor: "pointer" }}>
                <td>{c.idNo}</td>
                <td>{c.clientName}</td>
                <td>{c.location}</td>
                <td>{c.typeOfService}</td>
                <td>{c.mobileNo1}</td>
                <td>
                  <div className="d-flex">
                    <button
                      className="btn btn-sm me-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleView(c);
                      }}
                      title="View"
                    >
                      <img src={viewIcon} alt="view" width={18} />
                    </button>

                    <button
                      className="btn btn-sm me-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(c);
                      }}
                      title="Edit"
                    >
                      <img src={editIcon} alt="edit" width={16} />
                    </button>

                    <button
                      className="btn btn-sm"
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
                <p>Do you want to {actionType} this client?</p>
                <p>
                  <strong>ID:</strong> {clientToAct.idNo || clientToAct.id} <br />
                  <strong>Name:</strong> {clientToAct.clientName || "N/A"}
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
                  />
                  {actionErrors.comment && <div className="text-danger small mt-1">{actionErrors.comment}</div>}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closeActionDetails}>Cancel</button>
                <button className="btn btn-primary" onClick={handleActionFinal}>Confirm</button>
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
                <p>Client moved back to active with history recorded.</p>
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

// small helper for status badges (unchanged)
const getStatusBadgeClass = (status) => {
  switch (status) {
    case "Running":
      return "bg-success";
    case "Closed":
      return "bg-secondary";
    case "Stop":
      return "bg-warning";
    case "Re-open":
      return "bg-info";
    case "Re-start":
      return "bg-primary";
    case "Re-place":
      return "bg-dark";
    default:
      return "bg-info";
  }
};
