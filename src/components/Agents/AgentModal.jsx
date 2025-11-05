import React, { useMemo, useState, useRef } from "react";
import AgentForm from "./AgentForm";
import firebaseDB from "../../firebase";
import { useAuth } from "../../context/AuthContext";

export default function AgentModal({ show, onClose, data, mode = "view", onSaved }) {
    const authCtx = useAuth() || {};
    const { currentUser, user, dbUser, profile } = authCtx;

    const signedInName = dbUser?.name || user?.name || profile?.name || currentUser?.displayName || "Admin";
    const signedInUid = currentUser?.uid || user?.uid || dbUser?.uid || null;

    const isEdit = mode === "edit";
    const isAdd = mode === "add";
    const isView = mode === "view";

    const title = isAdd ? "Add New Agent" : isEdit ? "Edit Agent" : "Agent Details";
    const editDataRef = useRef({});

    const [localOpen, setLocalOpen] = useState(!!show);
    const [activeTab, setActiveTab] = useState("basic");
    const [localMode, setLocalMode] = useState(mode);
    const [paymentData, setPaymentData] = useState({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        paymentMode: 'cash',
        clientName: '',
        clientId: '',
        charges: '',
        receiptNo: '',
        remarks: ''
    });
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [uploadingProof, setUploadingProof] = useState(false);

    const fileInputRef = useRef(null);
    const proofInputRef = useRef(null);

    React.useEffect(() => {
        setLocalOpen(!!show);
        setLocalMode(mode);
        if (show) {
            setActiveTab("basic");
        }
    }, [show, mode]);

    const safeData = useMemo(() => data || {}, [data]);

    if (!localOpen) return null;

    const close = () => {
        setLocalOpen(false);
        setLocalMode("view");
        setShowPaymentForm(false);
        onClose && onClose();
    };

    const handleEdit = () => {
        setLocalMode("edit");
    };

    const handleSave = () => {
        setLocalMode("view");
        onSaved && onSaved();
    };

    const handleCancelEdit = () => {
        if (JSON.stringify(editDataRef.current || {}) !== JSON.stringify(data || {})) {
            if (!window.confirm("Discard unsaved changes?")) return;
        }

        setLocalMode("view");
    };

    // Upload photo to Firebase Storage
    const uploadPhoto = async (file) => {
        setUploadingPhoto(true);
        try {
            // Simulate upload - you'll need to implement actual Firebase Storage upload
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Return a mock URL - replace with actual Firebase Storage URL
            const mockUrl = `https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/agent-photos%2F${Date.now()}-${file.name}`;

            return mockUrl;
        } catch (error) {
throw error;
        } finally {
            setUploadingPhoto(false);
        }
    };

    // Upload proof document
    const uploadProof = async (file) => {
        setUploadingProof(true);
        try {
            // Simulate upload - you'll need to implement actual Firebase Storage upload
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Return a mock URL - replace with actual Firebase Storage URL
            const mockUrl = `https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/agent-proofs%2F${Date.now()}-${file.name}`;

            return mockUrl;
        } catch (error) {
throw error;
        } finally {
            setUploadingProof(false);
        }
    };

    // Payment History Component - Fixed with better state management
    const PaymentHistory = ({ editData, onEditDataChange, isEditing }) => {
        const payments = editData?.payments || [];
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

        const handleAddPayment = () => {
            setLocalShowPaymentForm(true);
        };

        const handlePaymentSubmit = async (e) => {
            e.preventDefault();

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
                const updatedPayments = [...payments, newPayment];

                if (isEditing) {
                    onEditDataChange('payments', updatedPayments);
                } else {
                    const agentRef = firebaseDB.child(`JenCeo-DataBase/AgentData/${safeData.agentType === "client" ? "ClientAgent" : "WorkerAgent"}/${safeData.id}`);
                    await agentRef.update({ payments: updatedPayments });
                    onSaved && onSaved();
                }

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
alert('Failed to add payment: ' + error.message);
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

        const deletePayment = async (index) => {
            if (!window.confirm('Are you sure you want to delete this payment?')) return;

            try {
                const updatedPayments = payments.filter((_, i) => i !== index);

                if (isEditing) {
                    onEditDataChange('payments', updatedPayments);
                } else {
                    const agentRef = firebaseDB.child(`JenCeo-DataBase/AgentData/${safeData.agentType === "client" ? "ClientAgent" : "WorkerAgent"}/${safeData.id}`);
                    await agentRef.update({ payments: updatedPayments });
                    onSaved && onSaved();
                }
            } catch (error) {
alert('Failed to delete payment: ' + error.message);
            }
        };

        return (
            <div className="payment-history">
                {/* Add Payment Button */}
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

                {/* Payment Form */}
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
                            <form onSubmit={handlePaymentSubmit}>
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
                                        >
                                            <option value="cash">Cash</option>
                                            <option value="online">Online</option>
                                            <option value="check">Check</option>
                                            <option value="card">Card</option>
                                        </select>
                                    </div>
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
                                    <div className="col-md-6">
                                        <label className="form-label">Remarks</label>
                                        <input
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

                {/* Payments Table */}
                <div className="table-responsive">
                    <table className="table table-hover table-striped">
                        <thead className="table-secondary">
                            <tr>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Type</th>
                                <th>Client Charges</th>
                                <th>Receipt No</th>
                                <th>Added By</th>
                                <th>Remarks</th>
                                {isEditing && <th>Action</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {payments.length > 0 ? (
                                payments.map((payment, index) => (
                                    <tr key={index}>
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
                                        {isEditing && (
                                            <td>
                                                <button
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() => deletePayment(index)}
                                                    type="button"
                                                >
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={isEditing ? "8" : "7"} className="text-center small-text py-4">
                                        <i className="bi bi-receipt me-2"></i>
                                        No payment records found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <style jsx>{`
                 table tr:nth-child(even) td {
                 background-color:#e5edf9
                 }
            `}</style>
            </div>
        );
    };



    // Enhanced View Card with Tabs
    const ViewCard = () => {
        const D = (k, alt = "-") => safeData?.[k] ?? alt;
        const photo = safeData?.agentPhotoUrl || safeData?.photoUrl;

        const renderBasicDetails = ({ editData, onEditDataChange, isEditing }) => (
            <div className="row g-4">
                <div className="col-md-4 text-center">
                    <div className="position-relative">
                        <img
                            src={editData?.agentPhotoUrl || photo}
                            alt="agent"
                            className="agent-photo img-fluid"
                            style={{
                                width: 140,
                                height: 140,
                                objectFit: "cover",
                                borderRadius: "12px",
                                border: "3px solid #e9ecef",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                            }}
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                            }}
                        />
                        <div className="photo-placeholder" style={{
                            width: 140,
                            height: 140,
                            borderRadius: "12px",
                            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            display: "none",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: "2rem"
                        }}>
                            👤
                        </div>

                        {isEditing && (
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
                                                onEditDataChange('agentPhotoUrl', photoUrl);
                                            } catch (error) {
                                                alert('Failed to upload photo: ' + error.message);
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
                                    {uploadingPhoto ? 'Uploading...' : 'Change Photo'}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="mt-3">
                        <div className="rating-stars">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <i
                                    key={star}
                                    className={`bi ${star <= (editData?.rating || 0) ? "bi-star-fill text-warning" : "bi-star text-muted"
                                        }`}
                                    style={{ fontSize: "1.2rem", margin: "0 2px" }}
                                />
                            ))}
                            <span className="ms-2 text-muted small">({editData?.rating || 0}/5)</span>
                        </div>
                    </div>
                </div>

                <div className="col-md-8">
                    <div className="row g-3">
                        <div className="col-sm-6">
                            <div className="detail-item border rounded p-3 bg-light">
                                <label className="small-text small mb-1">ID No</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={editData?.idNo || ''}
                                        disabled
                                    />
                                ) : (
                                    <div className="fw-semibold text-dark">{D("idNo")}</div>
                                )}
                            </div>
                        </div>
                        <div className="col-sm-6">
                            <div className="detail-item border rounded p-3 bg-light">
                                <label className="small-text small mb-1">Agent Name</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={editData?.agentName || ''}
                                        onChange={(e) => onEditDataChange('agentName', e.target.value)}
                                    />
                                ) : (
                                    <div className="fw-semibold text-dark">{D("agentName")}</div>
                                )}
                            </div>
                        </div>
                        <div className="col-sm-6">
                            <div className="detail-item border rounded p-3 bg-light">
                                <label className="small-text small mb-1">Gender</label>
                                {isEditing ? (
                                    <select
                                        className="form-select"
                                        value={editData?.gender || ''}
                                        onChange={(e) => onEditDataChange('gender', e.target.value)}
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                ) : (
                                    <div className="fw-semibold text-dark">{D("gender")}</div>
                                )}
                            </div>
                        </div>
                        <div className="col-sm-6">
                            <div className="detail-item border rounded p-3 bg-light">
                                <label className="small-text small mb-1">Mobile</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={editData?.mobile || ''}
                                        onChange={(e) => onEditDataChange('mobile', e.target.value)}
                                    />
                                ) : (
                                    <div className="fw-semibold text-dark">
                                        <i className="bi bi-phone me-2 text-primary"></i>
                                        {D("mobile")}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="col-sm-6">
                            <div className="detail-item border rounded p-3 bg-light">
                                <label className="small-text small mb-1">UPI</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={editData?.upiNo || ''}
                                        onChange={(e) => onEditDataChange('upiNo', e.target.value)}
                                    />
                                ) : (
                                    <div className="fw-semibold text-dark">
                                        <i className="bi bi-wallet2 me-2 text-success"></i>
                                        {D("upiNo")}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="col-sm-6">
                            <div className="detail-item border rounded p-3 bg-light">
                                <label className="small-text small mb-1">Commission</label>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={editData?.commission || ''}
                                        onChange={(e) => onEditDataChange('commission', parseFloat(e.target.value) || 0)}
                                        step="0.01"
                                    />
                                ) : (
                                    <div className="fw-semibold text-success">₹{D("commission")}</div>
                                )}
                            </div>
                        </div>
                        <div className="col-sm-6">
                            <div className="detail-item border rounded p-3 bg-light">
                                <label className="small-text small mb-1">Status</label>
                                {isEditing ? (
                                    <select
                                        className="form-select"
                                        value={editData?.status || ''}
                                        onChange={(e) => onEditDataChange('status', e.target.value)}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="On Duty">On Duty</option>
                                        <option value="Off Duty">Off Duty</option>
                                    </select>
                                ) : (
                                    <div className="fw-semibold">
                                        <span className={`badge ${editData?.status === 'active' ? 'bg-success' :
                                            editData?.status === 'inactive' ? 'bg-secondary' : 'bg-warning'
                                            }`}>
                                            {D("status", "Active")}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="col-sm-6">
                            <div className="detail-item border rounded p-3 bg-light">
                                <label className="small-text small mb-1">Rating</label>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        className="form-control"
                                        min="0"
                                        max="5"
                                        step="0.1"
                                        value={editData?.rating || ''}
                                        onChange={(e) => onEditDataChange('rating', parseFloat(e.target.value) || 0)}
                                    />
                                ) : (
                                    <div className="fw-semibold text-warning">{D("rating", "0")}/5</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );

        const renderFullDetails = ({ editData, onEditDataChange, isEditing }) => (
            <div className="row g-3">
                <div className="col-md-6">
                    <div className="detail-item border rounded p-3 bg-light">
                        <label className="small-text small mb-1">Village / Town</label>
                        {isEditing ? (
                            <input
                                type="text"
                                className="form-control"
                                value={editData?.villageTown || ''}
                                onChange={(e) => onEditDataChange('villageTown', e.target.value)}
                            />
                        ) : (
                            <div className="fw-semibold text-dark">{D("villageTown")}</div>
                        )}
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="detail-item border rounded p-3 bg-light">
                        <label className="small-text small mb-1">Mandal</label>
                        {isEditing ? (
                            <input
                                type="text"
                                className="form-control"
                                value={editData?.mandal || ''}
                                onChange={(e) => onEditDataChange('mandal', e.target.value)}
                            />
                        ) : (
                            <div className="fw-semibold text-dark">{D("mandal")}</div>
                        )}
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="detail-item border rounded p-3 bg-light">
                        <label className="small-text small mb-1">District</label>
                        {isEditing ? (
                            <input
                                type="text"
                                className="form-control"
                                value={editData?.district || ''}
                                onChange={(e) => onEditDataChange('district', e.target.value)}
                            />
                        ) : (
                            <div className="fw-semibold text-dark">{D("district")}</div>
                        )}
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="detail-item border rounded p-3 bg-light">
                        <label className="small-text small mb-1">State</label>
                        {isEditing ? (
                            <input
                                type="text"
                                className="form-control"
                                value={editData?.state || ''}
                                onChange={(e) => onEditDataChange('state', e.target.value)}
                            />
                        ) : (
                            <div className="fw-semibold text-dark">{D("state")}</div>
                        )}
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="detail-item border rounded p-3 bg-light">
                        <label className="small-text small mb-1">Working Place</label>
                        {isEditing ? (
                            <input
                                type="text"
                                className="form-control"
                                value={editData?.workingPlace || ''}
                                onChange={(e) => onEditDataChange('workingPlace', e.target.value)}
                            />
                        ) : (
                            <div className="fw-semibold text-dark">{D("workingPlace")}</div>
                        )}
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="detail-item border rounded p-3 bg-light">
                        <label className="small-text small mb-1">Proficiency</label>
                        {isEditing ? (
                            <input
                                type="text"
                                className="form-control"
                                value={editData?.workingProficiency || ''}
                                onChange={(e) => onEditDataChange('workingProficiency', e.target.value)}
                            />
                        ) : (
                            <div className="fw-semibold text-dark">{D("workingProficiency")}</div>
                        )}
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="detail-item border rounded p-3 bg-light">
                        <label className="small-text small mb-1">Experience</label>
                        {isEditing ? (
                            <input
                                type="number"
                                className="form-control"
                                value={editData?.experience || ''}
                                onChange={(e) => onEditDataChange('experience', parseFloat(e.target.value) || 0)}
                                step="0.1"
                            />
                        ) : (
                            <div className="fw-semibold text-dark">{D("experience")} years</div>
                        )}
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="detail-item border rounded p-3 bg-light">
                        <label className="small-text small mb-1">Emergency Contact</label>
                        {isEditing ? (
                            <input
                                type="text"
                                className="form-control"
                                value={editData?.emergencyContact || ''}
                                onChange={(e) => onEditDataChange('emergencyContact', e.target.value)}
                            />
                        ) : (
                            <div className="fw-semibold text-dark">{D("emergencyContact")}</div>
                        )}
                    </div>
                </div>
                <div className="col-12">
                    <div className="detail-item border rounded p-3 bg-light">
                        <label className="small-text small mb-1">Address</label>
                        {isEditing ? (
                            <div className="row g-2">
                                <div className="col-12">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Address 1"
                                        value={editData?.address1 || ''}
                                        onChange={(e) => onEditDataChange('address1', e.target.value)}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Street Name"
                                        value={editData?.streetName || ''}
                                        onChange={(e) => onEditDataChange('streetName', e.target.value)}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Land Mark"
                                        value={editData?.landMark || ''}
                                        onChange={(e) => onEditDataChange('landMark', e.target.value)}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="fw-semibold text-dark">
                                {[D("address1"), D("streetName"), D("landMark")].filter(Boolean).join(", ")}
                            </div>
                        )}
                    </div>
                </div>

                {/* Proof Documents Section */}
                <div className="col-12">
                    <div className="detail-item border rounded p-3 bg-light">
                        <label className="small-text small mb-1">Proof Documents</label>
                        {isEditing ? (
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
                                                onEditDataChange('proofDocuments', [...currentProofs, {
                                                    name: file.name,
                                                    url: proofUrl,
                                                    uploadedAt: new Date().toISOString()
                                                }]);
                                            } catch (error) {
                                                alert('Failed to upload proof: ' + error.message);
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
                                    {uploadingProof ? 'Uploading...' : 'Add Proof Document'}
                                </button>

                                {editData?.proofDocuments?.map((proof, index) => (
                                    <div key={index} className="d-flex justify-content-between align-items-center border rounded p-2 mb-1">
                                        <span>{proof.name}</span>
                                        <button
                                            className="btn btn-sm btn-outline-danger"
                                            onClick={() => {
                                                const updatedProofs = editData.proofDocuments.filter((_, i) => i !== index);
                                                onEditDataChange('proofDocuments', updatedProofs);
                                            }}
                                            type="button"
                                        >
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div>
                                {safeData?.proofDocuments?.length > 0 ? (
                                    safeData.proofDocuments.map((proof, index) => (
                                        <div key={index} className="border rounded p-2 mb-1">
                                            <a href={proof.url} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                                                <i className="bi bi-file-earmark me-2"></i>
                                                {proof.name}
                                            </a>
                                            <small className="text-muted d-block">
                                                Uploaded: {new Date(proof.uploadedAt).toLocaleDateString()}
                                            </small>
                                        </div>
                                    ))
                                ) : (
                                    <div className="small-text">No proof documents uploaded</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {D("notes") && (
                    <div className="col-12">
                        <div className="detail-item border rounded p-3 bg-light">
                            <label className="small-text small mb-1">Notes</label>
                            {isEditing ? (
                                <textarea
                                    className="form-control"
                                    rows="3"
                                    value={editData?.notes || ''}
                                    onChange={(e) => onEditDataChange('notes', e.target.value)}
                                />
                            ) : (
                                <div className="fw-semibold text-dark" style={{ whiteSpace: 'pre-wrap' }}>{D("notes")}</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );

        const renderTabContent = (editData, onEditDataChange, isEditing) => {
            switch (activeTab) {
                case "basic":
                    return renderBasicDetails({ editData, onEditDataChange, isEditing });
                case "full":
                    return renderFullDetails({ editData, onEditDataChange, isEditing });
                case "payments":
                    return <PaymentHistory editData={editData} onEditDataChange={onEditDataChange} isEditing={isEditing} />;

                default:
                    return null;
            }
        };

        return (
            <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }} onClick={close}>
                <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-content border-0 shadow-lg">
                        {/* Header */}
                        <div className="modal-header bg-secondary text-white justify-content-between">
                            <div className="d-flex align-items-center gap-3">
                                <div style={{
                                    width: 50,
                                    height: 50,
                                    borderRadius: "8px",
                                    background: "rgba(255,255,255,0.2)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "1.5rem"
                                }}>
                                    👤
                                </div>
                                <div>
                                    <h5 className="modal-title mb-0">{safeData?.agentName || "Agent"}</h5>
                                    <small className="opacity-75">
                                        {safeData?.agentType === "client" ? "Client Agent" : "Worker Agent"} • {D("idNo")}
                                    </small>
                                </div>
                            </div>
                            <div className="d-flex gap-2 align-items-center">
                                <button className="btn btn-sm btn-warning" onClick={handleEdit}>
                                    <i className="bi bi-pencil me-1"></i>Edit
                                </button>
                                <button type="button" className="btn-close btn-close-white" onClick={close}></button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="modal-body p-0">
                            <ul className="nav nav-tabs nav-justified">
                                <li className="nav-item">
                                    <button
                                        className={`nav-link ${activeTab === "basic" ? "active" : ""}`}
                                        onClick={() => setActiveTab("basic")}
                                        type="button"
                                    >
                                        <i className="bi bi-person me-2"></i>Basic
                                    </button>
                                </li>
                                <li className="nav-item">
                                    <button
                                        className={`nav-link ${activeTab === "full" ? "active" : ""}`}
                                        onClick={() => setActiveTab("full")}
                                        type="button"
                                    >
                                        <i className="bi bi-file-text me-2"></i>Full Details
                                    </button>
                                </li>
                                <li className="nav-item">
                                    <button
                                        className={`nav-link ${activeTab === "payments" ? "active" : ""}`}
                                        onClick={() => setActiveTab("payments")}
                                        type="button"
                                    >
                                        <i className="bi bi-credit-card me-2"></i>Payments
                                    </button>
                                </li>

                            </ul>

                            {/* Tab Content */}
                            <div className="p-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                {renderTabContent(safeData, () => { }, false)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Edit Mode Component - Updated with tab-based editing
    const EditCard = () => {
        const [editData, setEditData] = useState(safeData);

        const handleEditDataChange = (field, value) => {
            setEditData(prev => ({ ...prev, [field]: value }));
        };

        const handleSaveEdit = async () => {
            try {
                const agentRef = firebaseDB.child(`AgentData/${editData.agentType === "client" ? "ClientAgent" : "WorkerAgent"}/${editData.id}`);
                await agentRef.update(editData);
                handleSave();
            } catch (error) {
alert('Failed to update agent: ' + error.message);
            }
        };

        const renderTabContent = () => {
            switch (activeTab) {
                case "basic":
                    return (
                        <div className="row g-4">
                            <div className="col-md-4 text-center">
                                <div className="position-relative">
                                    <img
                                        src={editData?.agentPhotoUrl || safeData?.agentPhotoUrl}
                                        alt="agent"
                                        className="agent-photo img-fluid"
                                        style={{
                                            width: 140,
                                            height: 140,
                                            objectFit: "cover",
                                            borderRadius: "12px",
                                            border: "3px solid #e9ecef",
                                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                                        }}
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'block';
                                        }}
                                    />
                                    <div className="photo-placeholder" style={{
                                        width: 140,
                                        height: 140,
                                        borderRadius: "12px",
                                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                        display: "none",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "white",
                                        fontSize: "2rem"
                                    }}>
                                        👤
                                    </div>

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
                                                    } catch (error) {
                                                        alert('Failed to upload photo: ' + error.message);
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
                                            {uploadingPhoto ? 'Uploading...' : 'Change Photo'}
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
                                            className="form-control bg-light"
                                            value={editData.idNo || ''}
                                            disabled
                                        />
                                    </div>
                                    <div className="col-sm-6">
                                        <label className="form-label">Agent Name</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={editData.agentName || ''}
                                            onChange={(e) => handleEditDataChange('agentName', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-sm-6">
                                        <label className="form-label">Gender</label>
                                        <select
                                            className="form-select"
                                            value={editData.gender || ''}
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
                                            value={editData.mobile || ''}
                                            onChange={(e) => handleEditDataChange('mobile', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-sm-6">
                                        <label className="form-label">UPI No</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={editData.upiNo || ''}
                                            onChange={(e) => handleEditDataChange('upiNo', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-sm-6">
                                        <label className="form-label">Commission</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            value={editData.commission || ''}
                                            onChange={(e) => handleEditDataChange('commission', parseFloat(e.target.value) || 0)}
                                            step="0.01"
                                        />
                                    </div>
                                    <div className="col-sm-6">
                                        <label className="form-label">Status</label>
                                        <select
                                            className="form-select"
                                            value={editData.status || ''}
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
                case "full":
                    return (
                        <div className="row g-3">
                            <div className="col-6">
                                <label className="form-label">D.No</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={editData.address1 || ''}
                                    onChange={(e) => handleEditDataChange('address1', e.target.value)}
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">Street Name</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={editData.streetName || ''}
                                    onChange={(e) => handleEditDataChange('streetName', e.target.value)}
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">Land Mark</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={editData.landMark || ''}
                                    onChange={(e) => handleEditDataChange('landMark', e.target.value)}
                                />
                            </div>

                            <div className="col-md-6">
                                <label className="form-label">Village/Town</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={editData.villageTown || ''}
                                    onChange={(e) => handleEditDataChange('villageTown', e.target.value)}
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">Mandal</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={editData.mandal || ''}
                                    onChange={(e) => handleEditDataChange('mandal', e.target.value)}
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">District</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={editData.district || ''}
                                    onChange={(e) => handleEditDataChange('district', e.target.value)}
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">State</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={editData.state || ''}
                                    onChange={(e) => handleEditDataChange('state', e.target.value)}
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">PIN Code</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={editData.pinCode || ''}
                                    onChange={(e) => handleEditDataChange('state', e.target.value)}
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">Working Place</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={editData.workingPlace || ''}
                                    onChange={(e) => handleEditDataChange('workingPlace', e.target.value)}
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">Working Proficiency</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={editData.workingProficiency || ''}
                                    onChange={(e) => handleEditDataChange('workingProficiency', e.target.value)}
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">Experience (years)</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={editData.experience || ''}
                                    onChange={(e) => handleEditDataChange('experience', parseFloat(e.target.value) || 0)}
                                    step="0.1"
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">Emergency Contact</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={editData.emergencyContact || ''}
                                    onChange={(e) => handleEditDataChange('emergencyContact', e.target.value)}
                                />
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
                                                    handleEditDataChange('proofDocuments', [...currentProofs, {
                                                        name: file.name,
                                                        url: proofUrl,
                                                        uploadedAt: new Date().toISOString()
                                                    }]);
                                                } catch (error) {
                                                    alert('Failed to upload proof: ' + error.message);
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
                                        {uploadingProof ? 'Uploading...' : 'Add Proof Document'}
                                    </button>

                                    {editData?.proofDocuments?.map((proof, index) => (
                                        <div key={index} className="d-flex justify-content-between align-items-center border rounded p-2 mb-1">
                                            <span>{proof.name}</span>
                                            <button
                                                className="btn btn-sm btn-outline-danger"
                                                onClick={() => {
                                                    const updatedProofs = editData.proofDocuments.filter((_, i) => i !== index);
                                                    handleEditDataChange('proofDocuments', updatedProofs);
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
                                    value={editData.notes || ''}
                                    onChange={(e) => handleEditDataChange('notes', e.target.value)}
                                />
                            </div>
                        </div>
                    );
                case "payments":
                    return <PaymentHistory editData={editData} onEditDataChange={handleEditDataChange} isEditing={true} />;

                default:
                    return null;
            }
        };

        return (
            <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={close}>
                <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-content border-0 shadow-lg">
                        <div className="modal-header bg-secondary text-white justify-content-between">
                            <h5 className="modal-title">Edit Agent - {editData?.agentName}</h5>
                            <div className="d-flex gap-2">
                                <button className="btn btn-sm btn-success" onClick={handleSaveEdit}>
                                    <i className="bi bi-check-lg me-1"></i>Save
                                </button>
                                <button className="btn btn-sm btn-danger" onClick={handleCancelEdit}>
                                    <i className="bi bi-x-lg me-1"></i>Cancel
                                </button>
                            </div>
                        </div>

                        {/* Tabs in Edit Mode */}
                        <div className="modal-body p-0">
                            <ul className="nav nav-tabs nav-justified">
                                <li className="nav-item">
                                    <button
                                        className={`nav-link ${activeTab === "basic" ? "active" : ""}`}
                                        onClick={() => setActiveTab("basic")}
                                        type="button"
                                    >
                                        <i className="bi bi-person me-2"></i>Basic
                                    </button>
                                </li>
                                <li className="nav-item">
                                    <button
                                        className={`nav-link ${activeTab === "full" ? "active" : ""}`}
                                        onClick={() => setActiveTab("full")}
                                        type="button"
                                    >
                                        <i className="bi bi-file-text me-2"></i>Full Details
                                    </button>
                                </li>
                                <li className="nav-item">
                                    <button
                                        className={`nav-link ${activeTab === "payments" ? "active" : ""}`}
                                        onClick={() => setActiveTab("payments")}
                                        type="button"
                                    >
                                        <i className="bi bi-credit-card me-2"></i>Payments
                                    </button>
                                </li>

                            </ul>

                            <div className="p-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                {renderTabContent()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            {localMode === "view" ? (
                <ViewCard />
            ) : localMode === "edit" ? (
                <EditCard />
            ) : (
                <AgentForm
                    show={localOpen}
                    onClose={close}
                    title={title}
                    initialData={safeData}
                    isEdit={isEdit}
                    onSubmit={() => onSaved && onSaved()}
                />
            )}
        </>
    );
}