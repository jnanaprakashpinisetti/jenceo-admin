import React, { useMemo, useState, useRef } from "react";
import AgentForm from "./AgentForm";
import firebaseDB from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { getStorage, ref as sRef, uploadBytes, getDownloadURL } from "firebase/storage";

// Helper functions
const agentPath = (editData) => {
    const t = editData?.agentType === "client" ? "ClientAgent" : "WorkerAgent";
    return `AgentData/${t}/${editData.id}`;
};

const convertPaymentsToArray = (payments) => {
    if (!payments) return [];
    if (Array.isArray(payments)) return payments;
    
    return Object.entries(payments).map(([key, value]) => ({
        id: key,
        ...value
    }));
};

// Success Modal Component
const SuccessModal = ({ show, title, message, onClose }) => {
    if (!show) return null;

    return (
        <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,0.6)" }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header bg-success text-white justify-content-between">
                        <h5 className="modal-title">{title}</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        <div className="d-flex align-items-center gap-3">
                            <i className="bi bi-check-circle-fill text-success" style={{ fontSize: "2rem" }}></i>
                            <div>
                                <p className="mb-0">{message}</p>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-success" onClick={onClose}>
                            OK
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Confirmation Modal Component
const ConfirmationModal = ({ show, title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel" }) => {
    if (!show) return null;

    return (
        <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,0.6)" }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header bg-warning text-dark justify-content-between">
                        <h5 className="modal-title">{title}</h5>
                        <button type="button" className="btn-close" onClick={onCancel}></button>
                    </div>
                    <div className="modal-body">
                        <div className="d-flex align-items-center gap-3">
                            <i className="bi bi-exclamation-triangle-fill text-warning" style={{ fontSize: "2rem" }}></i>
                            <div>
                                <p className="mb-0">{message}</p>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onCancel}>
                            {cancelText}
                        </button>
                        <button type="button" className="btn btn-warning" onClick={onConfirm}>
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Discard Changes Modal Component
const DiscardModal = ({ show, onConfirm, onCancel }) => {
    if (!show) return null;

    return (
        <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,0.6)" }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header bg-danger text-white justify-content-between">
                        <h5 className="modal-title">Discard Changes?</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onCancel}></button>
                    </div>
                    <div className="modal-body">
                        <div className="d-flex align-items-center gap-3">
                            <i className="bi bi-x-circle-fill text-danger" style={{ fontSize: "2rem" }}></i>
                            <div>
                                <p className="mb-0">You have unsaved changes. Are you sure you want to discard them?</p>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onCancel}>
                            Continue Editing
                        </button>
                        <button type="button" className="btn btn-danger" onClick={onConfirm}>
                            Discard Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Error Modal Component
const ErrorModal = ({ show, message, onClose }) => {
    if (!show) return null;

    return (
        <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,0.6)" }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header bg-danger text-white justify-content-between">
                        <h5 className="modal-title">Error</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        <div className="d-flex align-items-center gap-3">
                            <i className="bi bi-exclamation-triangle-fill text-danger" style={{ fontSize: "2rem" }}></i>
                            <div>
                                <p className="mb-0">{message}</p>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

function ViewCardBody({ safeData, activeTab, setActiveTab, showError, onEdit }) {
    const D = (k, alt = "-") => safeData?.[k] ?? alt;
    const photo = safeData?.agentPhotoUrl || safeData?.photoUrl;
    
    const renderBasicDetails = () => (
        <div className="row g-4">
            <div className="col-md-4 text-center">
                <img
                    src={photo}
                    alt="agent"
                    className="img-fluid"
                    style={{ width: 140, height: 140, objectFit: "cover", borderRadius: 12 }}
                    onError={(e) => (e.currentTarget.style.display = "none")}
                />
            </div>
            <div className="col-md-8">
                <div className="row g-3">
                    <div className="col-sm-6"><strong>ID No:</strong> {D("idNo")}</div>
                    <div className="col-sm-6"><strong>Name:</strong> {D("agentName")}</div>
                    <div className="col-sm-6"><strong>Gender:</strong> {D("gender")}</div>
                    <div className="col-sm-6"><strong>Location:</strong> {D("villageTown")}</div>
                    <div className="col-sm-6"><strong>Mobile:</strong> {D("mobile")}</div>
                    <div className="col-sm-6"><strong>Status:</strong> 
                        <span className={`badge ${D("status") === 'active' ? 'bg-success' : 'bg-secondary'} ms-1`}>
                            {D("status")}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderFullDetails = () => (
        <div className="row g-3">
            <div className="col-md-6"><strong>Mandal:</strong> {D("mandal")}</div>
            <div className="col-md-6"><strong>District:</strong> {D("district")}</div>
            <div className="col-md-6"><strong>State:</strong> {D("state")}</div>
            <div className="col-md-6"><strong>Working Place:</strong> {D("workingPlace")}</div>
            <div className="col-md-6"><strong>Proficiency:</strong> {D("workingProficiency")}</div>
            <div className="col-md-6"><strong>Experience:</strong> {D("experience")} years</div>
            <div className="col-12"><strong>Address:</strong> {[D("address1"), D("streetName"), D("landMark")].filter(Boolean).join(", ")}</div>
            {D("notes") && <div className="col-12"><strong>Notes:</strong> {D("notes")}</div>}
        </div>
    );

    const PaymentHistoryView = () => {
        const payments = convertPaymentsToArray(safeData?.payments);
        const totalAmount = payments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
        const totalCharges = payments.reduce((sum, payment) => sum + (parseFloat(payment.charges) || 0), 0);

        return (
            <div className="payment-history">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="mb-0">Payment Records ({payments.length})</h6>
                </div>

                <div className="table-responsive">
                    <table className="table table-hover table-striped">
                        <thead className="table-secondary">
                            <tr>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Type</th>
                                <th>Client Charges</th>
                                <th>Client Name</th>
                                <th>Receipt No</th>
                                <th>Added By</th>
                                <th>Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.length > 0 ? (
                                payments.map((payment, index) => (
                                    <tr key={payment.id || index}>
                                        <td>{new Date(payment.date).toLocaleDateString()}</td>
                                        <td className="text-success fw-bold">₹{payment.amount}</td>
                                        <td>
                                            <span className={`badge ${payment.type === 'cash' ? 'bg-success' :
                                                payment.type === 'online' ? 'bg-primary' :
                                                    payment.type === 'check' ? 'bg-info' : 'bg-warning'
                                                }`}>
                                                {payment.type}
                                            </span>
                                        </td>
                                        <td>₹{payment.charges || 0}</td>
                                        <td>{payment.clientName || "-"}</td>
                                        <td>{payment.receiptNo}</td>
                                        <td>
                                            <small>
                                                {payment.addedBy} <br />
                                                <span className="small-text">
                                                    {payment.timestamp ? new Date(payment.timestamp).toLocaleString() : 'N/A'}
                                                </span>
                                            </small>
                                        </td>
                                        <td>
                                            <small className="small-text">{payment.remarks || '-'}</small>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="text-center small-text py-4">
                                        <i className="bi bi-receipt me-2"></i>
                                        No payment records found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {payments.length > 0 && (
                            <tfoot className="table-dark">
                                <tr>
                                    <td className="fw-bold">Total</td>
                                    <td className="fw-bold text-success">₹{totalAmount.toFixed(2)}</td>
                                    <td></td>
                                    <td className="fw-bold">₹{totalCharges.toFixed(2)}</td>
                                    <td colSpan="4"></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        );
    };

    switch (activeTab) {
        case "basic":
            return renderBasicDetails();
        case "full":
            return renderFullDetails();
        case "payments":
            return <PaymentHistoryView />;
        default:
            return renderBasicDetails();
    }
}

function EditCardBody({
    safeData,
    activeTab,
    setActiveTab,
    onSaved,
    handleCancelEdit,
    showError,
    showConfirm,
    setLocalMode,
    hasUnsavedChanges,
    setHasUnsavedChanges
}) {
    const authCtx = useAuth() || {};
    const { currentUser, user, dbUser, profile } = authCtx;
    const signedInName = dbUser?.name || user?.name || profile?.name || currentUser?.displayName || "Admin";
    const signedInUid = currentUser?.uid || user?.uid || dbUser?.uid || null;

    const [editData, setEditData] = useState(safeData || {});
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [uploadingProof, setUploadingProof] = useState(false);
    
    const fileInputRef = useRef(null);
    const proofInputRef = useRef(null);

    React.useEffect(() => {
        setEditData(safeData || {});
        setHasUnsavedChanges(false);
    }, [safeData, setHasUnsavedChanges]);

    const handleEditDataChange = (field, value) => {
        setEditData(prev => ({ ...prev, [field]: value }));
        setHasUnsavedChanges(true);
    };

    // Real photo upload
    const uploadPhoto = async (file) => {
        setUploadingPhoto(true);
        try {
            const storage = getStorage();
            const path = `agent-photos/${Date.now()}-${file.name}`;
            const storageRef = sRef(storage, path);
            const snap = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snap.ref);
            return url;
        } catch (err) {
            throw err;
        } finally {
            setUploadingPhoto(false);
        }
    };
    
    // Real proof upload
    const uploadProof = async (file) => {
        setUploadingProof(true);
        try {
            const storage = getStorage();
            const path = `agent-proofs/${Date.now()}-${file.name}`;
            const storageRef = sRef(storage, path);
            const snap = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snap.ref);
            return url;
        } catch (err) {
            throw err;
        } finally {
            setUploadingProof(false);
        }
    };

    // Save changes with proper data structure
    const handleSaveChanges = async () => {
        if (!editData) return;

        try {
            setSaving(true);

            const agentRef = firebaseDB.child(agentPath(editData));

            // Create update data - convert payments back to object if needed
            const updateData = {
                ...editData,
                lastUpdated: new Date().toISOString(),
                updatedBy: signedInName,
                updatedById: signedInUid
            };

            // If payments is an array, convert it to object for Firebase
            if (Array.isArray(updateData.payments)) {
                const paymentsObject = {};
                updateData.payments.forEach((payment, index) => {
                    paymentsObject[`payment_${index}`] = payment;
                });
                updateData.payments = paymentsObject;
            }

            // Use update to save changes
            await agentRef.update(updateData);
            
            // Reset unsaved changes flag
            setHasUnsavedChanges(false);
            
            // Call onSaved to refresh parent component
            if (onSaved) {
                onSaved({
                    id: editData.id,
                    agentType: editData.agentType,
                    ...updateData
                });
            }

            return true; // Success
        } catch (error) {
            showError('Failed to save changes: ' + error.message);
            return false; // Failure
        } finally {
            setSaving(false);
        }
    };

    const handleSaveClick = () => {
        const hasChanges = JSON.stringify(editData || {}) !== JSON.stringify(safeData || {});
        
        if (hasChanges) {
            showConfirm(
                "Save Changes?",
                "Are you sure you want to save the changes made to this agent?",
                handleSaveChanges,
                "Save",
                "Cancel"
            );
        } else {
            // No changes, just switch back to view mode
            if (setLocalMode) {
                setLocalMode("view");
            }
        }
    };

    // Payment History Component for Edit Mode
    const PaymentHistoryEdit = () => {
        const payments = convertPaymentsToArray(editData?.payments);
        const [localShowPaymentForm, setLocalShowPaymentForm] = useState(false);
        const [localPaymentData, setLocalPaymentData] = useState({
            date: new Date().toISOString().split('T')[0],
            amount: '',
            paymentMode: 'cash',
            clientName: '',
            clientId: '',
            charges: '',
            receiptNo: '',
            remarks: ''
        });

        const totalAmount = payments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
        const totalCharges = payments.reduce((sum, payment) => sum + (parseFloat(payment.charges) || 0), 0);

        const handleAddPayment = () => {
            setLocalShowPaymentForm(true);
        };

        const handlePaymentSubmit = async (e) => {
            e.preventDefault();
            e.stopPropagation(); 

            const newPayment = {
                ...localPaymentData,
                amount: parseFloat(localPaymentData.amount) || 0,
                charges: parseFloat(localPaymentData.charges) || 0,
                timestamp: new Date().toISOString(),
                addedBy: signedInName,
                addedById: signedInUid,
                type: localPaymentData.paymentMode
            };

            try {
                // Add payment to Firebase using push
                const ref = firebaseDB.child(agentPath(editData) + "/payments");
                const newPaymentRef = await ref.push(newPayment);
                
                // Update local state with the new payment including Firebase ID
                const updatedPayments = [...payments, { id: newPaymentRef.key, ...newPayment }];
                
                // Convert to object for Firebase storage
                const paymentsObject = {};
                updatedPayments.forEach((payment, index) => {
                    const { id, ...paymentData } = payment;
                    paymentsObject[id || `payment_${index}`] = paymentData;
                });
                
                handleEditDataChange('payments', paymentsObject);
                setHasUnsavedChanges(true);

                // Reset form
                setLocalPaymentData({
                    date: new Date().toISOString().split('T')[0],
                    amount: '',
                    paymentMode: 'cash',
                    clientName: '',
                    clientId: '',
                    charges: '',
                    receiptNo: '',
                    remarks: ''
                });
                setLocalShowPaymentForm(false);

            } catch (error) {
                showError('Failed to add payment: ' + error.message);
            }
        };

        const handlePaymentCancel = () => {
            setLocalShowPaymentForm(false);
            setLocalPaymentData({
                date: new Date().toISOString().split('T')[0],
                amount: '',
                paymentMode: 'cash',
                clientName: '',
                clientId: '',
                charges: '',
                receiptNo: '',
                remarks: ''
            });
        };

        const deletePayment = async (paymentId) => {
            showConfirm(
                "Delete Payment?",
                "Are you sure you want to delete this payment? This action cannot be undone.",
                async () => {
                    try {
                        // Remove payment from Firebase
                        await firebaseDB.child(agentPath(editData) + `/payments/${paymentId}`).remove();
                        
                        // Update local state
                        const updatedPayments = payments.filter(payment => payment.id !== paymentId);
                        
                        // Convert to object for Firebase storage
                        const paymentsObject = {};
                        updatedPayments.forEach((payment, index) => {
                            const { id, ...paymentData } = payment;
                            paymentsObject[id || `payment_${index}`] = paymentData;
                        });
                        
                        handleEditDataChange('payments', paymentsObject);
                        setHasUnsavedChanges(true);
                    } catch (error) {
                        showError('Failed to delete payment: ' + error.message);
                    }
                }
            );
        };

        return (
            <div className="payment-history">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="mb-0">Payment Records ({payments.length})</h6>
                    <button
                        className="btn btn-info btn-sm"
                        onClick={handleAddPayment}
                        type="button"
                    >
                        <i className="bi bi-plus-circle me-1"></i>
                        Add Payment
                    </button>
                </div>

                {localShowPaymentForm && (
                    <div className="card border-primary mb-4">
                        <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
                            <h6 className="mb-0">Add New Payment</h6>
                            <button
                                type="button"
                                className="btn-close btn-close-white"
                                onClick={handlePaymentCancel}
                            ></button>
                        </div>
                           <div className="card-body">
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handlePaymentSubmit(e);
                            }}>
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label">Date</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={localPaymentData.date}
                                            onChange={(e) => setLocalPaymentData({ ...localPaymentData, date: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Amount (₹)</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            placeholder="Enter amount"
                                            value={localPaymentData.amount}
                                            onChange={(e) => setLocalPaymentData({ ...localPaymentData, amount: e.target.value })}
                                            required
                                            step="0.01"
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Payment Mode</label>
                                        <select
                                            className="form-select"
                                            value={localPaymentData.paymentMode}
                                            onChange={(e) => setLocalPaymentData({ ...localPaymentData, paymentMode: e.target.value })}
                                            required
                                        >
                                            <option value="cash">Cash</option>
                                            <option value="online">Online</option>
                                            <option value="check">Check</option>
                                            <option value="card">Card</option>
                                        </select>
                                    </div>

                                    {/* Client-specific fields */}
                                    {safeData?.agentType === "client" && (
                                        <>
                                            <div className="col-md-6">
                                                <label className="form-label">Client Charges (₹)</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    placeholder="Client charges"
                                                    value={localPaymentData.charges}
                                                    onChange={(e) => setLocalPaymentData({ ...localPaymentData, charges: e.target.value })}
                                                    step="0.01"
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label">Client Name</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="Client name"
                                                    value={localPaymentData.clientName}
                                                    onChange={(e) => setLocalPaymentData({ ...localPaymentData, clientName: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label">Client ID</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="Client ID"
                                                    value={localPaymentData.clientId}
                                                    onChange={(e) => setLocalPaymentData({ ...localPaymentData, clientId: e.target.value })}
                                                />
                                            </div>
                                        </>
                                    )}

                                    <div className="col-md-6">
                                        <label className="form-label">Receipt No</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Receipt number"
                                            value={localPaymentData.receiptNo}
                                            onChange={(e) => setLocalPaymentData({ ...localPaymentData, receiptNo: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-md-12">
                                        <label className="form-label">Remarks</label>
                                        <textarea
                                            type="text"
                                            className="form-control"
                                            placeholder="Remarks"
                                            value={localPaymentData.remarks}
                                            onChange={(e) => setLocalPaymentData({ ...localPaymentData, remarks: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-12">
                                        <div className="d-flex gap-2 justify-content-end">
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={handlePaymentCancel}
                                            >
                                                Cancel
                                            </button>
                                            <button type="submit" className="btn btn-primary">
                                                Save Payment
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <div className="table-responsive">
                    <table className="table table-hover table-striped">
                        <thead className="table-secondary">
                            <tr>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Type</th>
                                <th>Client Charges</th>
                                <th>Client Name</th>
                                <th>Receipt No</th>
                                <th>Added By</th>
                                <th>Remarks</th>
                                {/* <th>Action</th> */}
                            </tr>
                        </thead>
                        <tbody>
                            {payments.length > 0 ? (
                                payments.map((payment, index) => (
                                    <tr key={payment.id || index}>
                                        <td>{new Date(payment.date).toLocaleDateString()}</td>
                                        <td className="text-success fw-bold">₹{payment.amount}</td>
                                        <td>
                                            <span className={`badge ${payment.type === 'cash' ? 'bg-success' :
                                                payment.type === 'online' ? 'bg-primary' :
                                                    payment.type === 'check' ? 'bg-info' : 'bg-warning'
                                                }`}>
                                                {payment.type}
                                            </span>
                                        </td>
                                        <td>₹{payment.charges || 0}</td>
                                        <td>{payment.clientName || '-'}</td>
                                        <td>{payment.receiptNo}</td>
                                        <td>
                                            <small>
                                                {payment.addedBy} <br />
                                                <span className="small-text">
                                                    {payment.timestamp ? new Date(payment.timestamp).toLocaleString() : 'N/A'}
                                                </span>
                                            </small>
                                        </td>
                                        <td>
                                            <small className="small-text">{payment.remarks || '-'}</small>
                                        </td>
                                        {/* <td>
                                            <button
                                                className="btn btn-sm btn-outline-danger"
                                                onClick={() => deletePayment(payment.id)}
                                                type="button"
                                            >
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </td> */}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="text-center small-text py-4">
                                        <i className="bi bi-receipt me-2"></i>
                                        No payment records found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {payments.length > 0 && (
                            <tfoot className="table-dark">
                                <tr>
                                    <td className="fw-bold">Total</td>
                                    <td className="fw-bold text-success">₹{totalAmount.toFixed(2)}</td>
                                    <td></td>
                                    <td className="fw-bold">₹{totalCharges.toFixed(2)}</td>
                                    <td colSpan="4"></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        );
    };

    const renderBasicDetails = () => (
        <div className="row g-4">
            <div className="col-md-4 text-center">
                <div className="position-relative">
                    <img
                        src={editData?.agentPhotoUrl}
                        alt="agent"
                        className="agent-photo img-fluid"
                        style={{
                            width: 140,
                            height: 140,
                            objectFit: "cover",
                            borderRadius: "12px",
                            border: "3px solid #e9ecef",
                        }}
                        onError={(e) => {
                            e.target.style.display = 'none';
                        }}
                    />
                    
                    {!editData?.agentPhotoUrl && (
                        <div className="photo-placeholder" style={{
                            width: 140,
                            height: 140,
                            borderRadius: "12px",
                            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: "2rem"
                        }}>
                            👤
                        </div>
                    )}

                    <div className="mt-3">
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            accept="image/*"
                            onChange={async (e) => {
                                const file = e.target.files[0];
                                if (file) {
                                    try {
                                        const photoUrl = await uploadPhoto(file);
                                        handleEditDataChange('agentPhotoUrl', photoUrl);
                                        // Save photo URL immediately to database
                                        await firebaseDB.child(agentPath(editData)).update({ 
                                            agentPhotoUrl: photoUrl,
                                            lastUpdated: new Date().toISOString(),
                                            updatedBy: signedInName,
                                            updatedById: signedInUid
                                        });
                                        setHasUnsavedChanges(true);
                                    } catch (error) {
                                        showError('Failed to upload photo: ' + error.message);
                                    }
                                }
                            }}
                        />
                        <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingPhoto}
                            type="button"
                        >
                            {uploadingPhoto ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                    Uploading...
                                </>
                            ) : (
                                'Change Photo'
                            )}
                        </button>
                    </div>
                </div>

                <div className="mt-3">
                    <label className="form-label">Rating</label>
                    <input
                        type="number"
                        className="form-control"
                        min="0"
                        max="5"
                        step="0.1"
                        value={editData?.rating || ''}
                        onChange={(e) => handleEditDataChange('rating', parseFloat(e.target.value) || 0)}
                    />
                </div>
            </div>

            <div className="col-md-8">
                <div className="row g-3">
                    <div className="col-sm-6">
                        <label className="form-label">ID No</label>
                        <input
                            type="text"
                            className="form-control"
                            value={editData?.idNo || ''}
                            disabled
                        />
                    </div>
                    <div className="col-sm-6">
                        <label className="form-label">Agent Name</label>
                        <input
                            type="text"
                            className="form-control"
                            value={editData?.agentName || ''}
                            onChange={(e) => handleEditDataChange('agentName', e.target.value)}
                        />
                    </div>
                    <div className="col-sm-6">
                        <label className="form-label">Gender</label>
                        <select
                            className="form-select"
                            value={editData?.gender || ''}
                            onChange={(e) => handleEditDataChange('gender', e.target.value)}
                        >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div className="col-sm-6">
                        <label className="form-label">Mobile</label>
                        <input
                            type="text"
                            className="form-control"
                            value={editData?.mobile || ''}
                            onChange={(e) => handleEditDataChange('mobile', e.target.value)}
                        />
                    </div>
                    <div className="col-sm-6">
                        <label className="form-label">UPI</label>
                        <input
                            type="text"
                            className="form-control"
                            value={editData?.upiNo || ''}
                            onChange={(e) => handleEditDataChange('upiNo', e.target.value)}
                        />
                    </div>
                    <div className="col-sm-6">
                        <label className="form-label">Commission</label>
                        <input
                            type="number"
                            className="form-control"
                            value={editData?.commission || ''}
                            onChange={(e) => handleEditDataChange('commission', parseFloat(e.target.value) || 0)}
                            step="0.01"
                        />
                    </div>
                    <div className="col-sm-6">
                        <label className="form-label">Status</label>
                        <select
                            className="form-select"
                            value={editData?.status || ''}
                            onChange={(e) => handleEditDataChange('status', e.target.value)}
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="On Duty">On Duty</option>
                            <option value="Off Duty">Off Duty</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderFullDetails = () => (
        <div className="row g-3">
            <div className="col-md-6">
                <label className="form-label">Village / Town</label>
                <input
                    type="text"
                    className="form-control"
                    value={editData?.villageTown || ''}
                    onChange={(e) => handleEditDataChange('villageTown', e.target.value)}
                />
            </div>
            <div className="col-md-6">
                <label className="form-label">Mandal</label>
                <input
                    type="text"
                    className="form-control"
                    value={editData?.mandal || ''}
                    onChange={(e) => handleEditDataChange('mandal', e.target.value)}
                />
            </div>
            <div className="col-md-6">
                <label className="form-label">District</label>
                <input
                    type="text"
                    className="form-control"
                    value={editData?.district || ''}
                    onChange={(e) => handleEditDataChange('district', e.target.value)}
                />
            </div>
            <div className="col-md-6">
                <label className="form-label">State</label>
                <input
                    type="text"
                    className="form-control"
                    value={editData?.state || ''}
                    onChange={(e) => handleEditDataChange('state', e.target.value)}
                />
            </div>
            <div className="col-md-6">
                <label className="form-label">Working Place</label>
                <input
                    type="text"
                    className="form-control"
                    value={editData?.workingPlace || ''}
                    onChange={(e) => handleEditDataChange('workingPlace', e.target.value)}
                />
            </div>
            <div className="col-md-6">
                <label className="form-label">Proficiency</label>
                <input
                    type="text"
                    className="form-control"
                    value={editData?.workingProficiency || ''}
                    onChange={(e) => handleEditDataChange('workingProficiency', e.target.value)}
                />
            </div>
            <div className="col-md-6">
                <label className="form-label">Experience</label>
                <input
                    type="number"
                    className="form-control"
                    value={editData?.experience || ''}
                    onChange={(e) => handleEditDataChange('experience', parseFloat(e.target.value) || 0)}
                    step="0.1"
                />
            </div>
            <div className="col-md-6">
                <label className="form-label">Emergency Contact</label>
                <input
                    type="text"
                    className="form-control"
                    value={editData?.emergencyContact || ''}
                    onChange={(e) => handleEditDataChange('emergencyContact', e.target.value)}
                />
            </div>
            <div className="col-12">
                <label className="form-label">Address</label>
                <div className="row g-2">
                    <div className="col-12">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Address 1"
                            value={editData?.address1 || ''}
                            onChange={(e) => handleEditDataChange('address1', e.target.value)}
                        />
                    </div>
                    <div className="col-md-6">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Street Name"
                            value={editData?.streetName || ''}
                            onChange={(e) => handleEditDataChange('streetName', e.target.value)}
                        />
                    </div>
                    <div className="col-md-6">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Land Mark"
                            value={editData?.landMark || ''}
                            onChange={(e) => handleEditDataChange('landMark', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="col-12">
                <label className="form-label">Proof Documents</label>
                <div>
                    <input
                        type="file"
                        ref={proofInputRef}
                        style={{ display: 'none' }}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={async (e) => {
                            const file = e.target.files[0];
                            if (file) {
                                try {
                                    const proofUrl = await uploadProof(file);
                                    const currentProofs = editData?.proofDocuments || [];
                                    const next = [...currentProofs, {
                                        name: file.name,
                                        url: proofUrl,
                                        uploadedAt: new Date().toISOString()
                                    }];
                                    handleEditDataChange('proofDocuments', next);
                                    // Save proof documents immediately to database
                                    await firebaseDB.child(agentPath(editData)).update({ 
                                        proofDocuments: next,
                                        lastUpdated: new Date().toISOString(),
                                        updatedBy: signedInName,
                                        updatedById: signedInUid
                                    });
                                    setHasUnsavedChanges(true);
                                } catch (error) {
                                    showError('Failed to upload proof: ' + error.message);
                                }
                            }
                        }}
                    />
                    <button
                        className="btn btn-sm btn-outline-primary mb-2"
                        onClick={() => proofInputRef.current?.click()}
                        disabled={uploadingProof}
                        type="button"
                    >
                        {uploadingProof ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2"></span>
                                Uploading...
                            </>
                        ) : (
                            'Add Proof Document'
                        )}
                    </button>

                    {editData?.proofDocuments?.map((proof, index) => (
                        <div key={index} className="d-flex justify-content-between align-items-center border rounded p-2 mb-1">
                            <span>{proof.name}</span>
                            <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={async () => {
                                    const updatedProofs = editData.proofDocuments.filter((_, i) => i !== index);
                                    handleEditDataChange('proofDocuments', updatedProofs);
                                    // Update proof documents in database immediately
                                    await firebaseDB.child(agentPath(editData)).update({ 
                                        proofDocuments: updatedProofs,
                                        lastUpdated: new Date().toISOString(),
                                        updatedBy: signedInName,
                                        updatedById: signedInUid
                                    });
                                    setHasUnsavedChanges(true);
                                }}
                                type="button"
                            >
                                <i className="bi bi-trash"></i>
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="col-12">
                <label className="form-label">Notes</label>
                <textarea
                    className="form-control"
                    rows="3"
                    value={editData?.notes || ''}
                    onChange={(e) => handleEditDataChange('notes', e.target.value)}
                />
            </div>
        </div>
    );

    // Hidden save button that can be triggered from the header
    return (
        <div>
            <button 
                id="agent-edit-save-btn" 
                style={{ display: "none" }} 
                onClick={handleSaveClick}
            />
            
            {activeTab === "basic" && renderBasicDetails()}
            {activeTab === "full" && renderFullDetails()}
            {activeTab === "payments" && <PaymentHistoryEdit />}
        </div>
    );
}

export default function AgentModal({ show, onClose, data, mode = "view", onSaved }) {
    const authCtx = useAuth() || {};
    const { currentUser, user, dbUser, profile } = authCtx;

    const signedInName = dbUser?.name || user?.name || profile?.name || currentUser?.displayName || "Admin";
    const signedInUid = currentUser?.uid || user?.uid || dbUser?.uid || null;

    const [localOpen, setLocalOpen] = useState(!!show);
    const [activeTab, setActiveTab] = useState("basic");
    const [localMode, setLocalMode] = useState(mode);
    
    // Modal states
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showDiscardModal, setShowDiscardModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    
    const [confirmModalConfig, setConfirmModalConfig] = useState({
        title: "",
        message: "",
        onConfirm: null,
        onCancel: null,
        confirmText: "Confirm",
        cancelText: "Cancel"
    });
    const [errorMessage, setErrorMessage] = useState("");
    const [liveAgent, setLiveAgent] = useState(data || {});

    // Real-time listener for agent data
    React.useEffect(() => {
        if (!data?.id) return;
        const ref = firebaseDB.child(agentPath(data));
        const onVal = (snap) => {
            const v = typeof snap.val === "function" ? snap.val() : snap?.val;
            setLiveAgent({ id: data.id, ...(v || {}) });
        };
        ref.on("value", onVal);
        return () => ref.off("value", onVal);
    }, [data?.id, data?.agentType]);

    React.useEffect(() => {
        setLocalOpen(!!show);
        setLocalMode(mode);
        setHasUnsavedChanges(false);
        if (show) {
            setActiveTab("basic");
        }
    }, [show, mode]);

    if (!localOpen) return null;

    const close = () => {
        if (localMode === "edit" && hasUnsavedChanges) {
            // Show discard confirmation before closing
            setShowDiscardModal(true);
        } else {
            setLocalOpen(false);
            setLocalMode("view");
            onClose && onClose();
        }
    };

    const showError = (message) => {
        setErrorMessage(message);
        setShowErrorModal(true);
    };

    const showConfirm = (title, message, onConfirm, confirmText = "Confirm", cancelText = "Cancel") => {
        setConfirmModalConfig({
            title,
            message,
            onConfirm: () => {
                setShowConfirmModal(false);
                onConfirm();
            },
            onCancel: () => {
                setShowConfirmModal(false);
            },
            confirmText,
            cancelText
        });
        setShowConfirmModal(true);
    };

    const handleEdit = () => {
        setLocalMode("edit");
    };

    const handleSave = async (updatedData) => {
        // Show success modal after save
        setShowSuccessModal(true);
        
        // Call parent's onSaved to refresh the parent component
        if (onSaved) {
            onSaved(updatedData);
        }
    };

    const handleCancelEdit = () => {
        if (hasUnsavedChanges) {
            // Show discard confirmation before canceling edit
            setShowDiscardModal(true);
        } else {
            setLocalMode("view");
        }
    };

    const handleSaveFromHeader = () => {
        document.getElementById("agent-edit-save-btn")?.click();
    };

    const handleDiscardConfirm = () => {
        setShowDiscardModal(false);
        setHasUnsavedChanges(false);
        setLocalMode("view");
    };

    const handleSuccessClose = () => {
        setShowSuccessModal(false);
        setLocalOpen(false);
        setLocalMode("view");
        onClose && onClose();
    };

    return (
        <>
            {localOpen && (
                <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,0.6)" }} onClick={close}>
                    <div
                        className="modal-dialog modal-lg modal-dialog-centered"
                        style={{ maxWidth: 820 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-content border-0 shadow-lg">
                            {/* Header */}
                            <div className={`modal-header justify-content-between ${localMode === "edit" ? "bg-warning text-dark" : "bg-dark text-white"}`}>
                                <h5 className="modal-title">
                                    {localMode === "edit" 
                                        ? `Editing: ${liveAgent?.agentName || "Agent"}` 
                                        : `${liveAgent?.agentName || "Agent"} — ${liveAgent?.idNo || ""}`}
                                </h5>

                                <div className="d-flex gap-2">
                                    {localMode === "edit" ? (
                                        <>
                                            <button
                                                className="btn btn-sm bg-success text-white"
                                                onClick={handleSaveFromHeader}
                                            >
                                                <i className="bi bi-check-lg me-1 "></i>Save
                                            </button>
                                            {/* <button className="btn btn-sm btn-secondary" onClick={handleCancelEdit}>
                                                <i className="bi bi-x me-1"></i>Cancel
                                            </button> */}
                                        </>
                                    ) : (
                                        <button className="btn btn-sm btn-warning" onClick={handleEdit}>
                                            <i className="bi bi-pencil me-1"></i>Edit
                                        </button>
                                    )}
                                    <button 
                                        type="button" 
                                        className="btn btn-sm btn-outline-light" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            close();
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            {/* Tabs header */}
                            <div className="px-3 pt-2">
                                <ul className="nav nav-tabs border-bottom">
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link ${activeTab === "basic" ? "active" : ""}`}
                                            onClick={() => setActiveTab("basic")}
                                        >
                                            <i className="bi bi-person me-1"></i>Basic Details
                                        </button>
                                    </li>
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link ${activeTab === "full" ? "active" : ""}`}
                                            onClick={() => setActiveTab("full")}
                                        >
                                            <i className="bi bi-file-text me-1"></i>Full Details
                                        </button>
                                    </li>
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link ${activeTab === "payments" ? "active" : ""}`}
                                            onClick={() => setActiveTab("payments")}
                                        >
                                            <i className="bi bi-credit-card me-1"></i>Payments
                                        </button>
                                    </li>
                                </ul>
                            </div>

                            {/* Body */}
                            <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                                {localMode === "view" && (
                                    <ViewCardBody
                                        safeData={liveAgent}
                                        activeTab={activeTab}
                                        setActiveTab={setActiveTab}
                                        showError={showError}
                                        onEdit={handleEdit}
                                    />
                                )}
                                {localMode === "edit" && (
                                    <EditCardBody
                                        safeData={liveAgent}
                                        activeTab={activeTab}
                                        setActiveTab={setActiveTab}
                                        onSaved={handleSave}
                                        handleCancelEdit={handleCancelEdit}
                                        showError={showError}
                                        showConfirm={showConfirm}
                                        setLocalMode={setLocalMode}
                                        hasUnsavedChanges={hasUnsavedChanges}
                                        setHasUnsavedChanges={setHasUnsavedChanges}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            <SuccessModal
                show={showSuccessModal}
                title="Changes Saved Successfully!"
                message="Your changes have been saved successfully. The agent information has been updated."
                onClose={handleSuccessClose}
            />

            {/* Confirmation Modal */}
            <ConfirmationModal
                show={showConfirmModal}
                title={confirmModalConfig.title}
                message={confirmModalConfig.message}
                onConfirm={confirmModalConfig.onConfirm}
                onCancel={confirmModalConfig.onCancel}
                confirmText={confirmModalConfig.confirmText}
                cancelText={confirmModalConfig.cancelText}
            />

            {/* Discard Changes Modal */}
            <DiscardModal
                show={showDiscardModal}
                onConfirm={handleDiscardConfirm}
                onCancel={() => setShowDiscardModal(false)}
            />

            {/* Error Modal */}
            <ErrorModal
                show={showErrorModal}
                message={errorMessage}
                onClose={() => setShowErrorModal(false)}
            />

<style>{`
        table tr:nth-child(even) td {
        background-color:#e6ecf5
        }
      `}</style>
        </>
    );
}