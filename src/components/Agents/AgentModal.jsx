import React, { useMemo, useState } from "react";
import AgentForm from "./AgentForm";
import firebaseDB from "../../firebase";

export default function AgentModal({ show, onClose, data, mode = "view", onSaved }) {
    const isEdit = mode === "edit";
    const isAdd = mode === "add";
    const isView = mode === "view";

    const title = isAdd ? "Add New Agent" : isEdit ? "Edit Agent" : "Agent Details";

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
    
    React.useEffect(() => {
        setLocalOpen(!!show);
        setLocalMode(mode);
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
        setLocalMode("view");
    };

    // Payment History Component
    const PaymentHistory = () => {
        const payments = safeData.payments || [];

        const handleAddPayment = () => {
            setShowPaymentForm(true);
        };

        const handlePaymentSubmit = async (e) => {
            e.preventDefault();
            
            const newPayment = {
                ...paymentData,
                amount: parseFloat(paymentData.amount) || 0,
                charges: parseFloat(paymentData.charges) || 0,
                timestamp: new Date().toISOString(),
                addedBy: "Admin", // You can get this from your auth context
                type: paymentData.paymentMode
            };

            try {
                const agentRef = firebaseDB.child(`AgentData/${safeData.agentType === "client" ? "ClientAgent" : "WorkerAgent"}/${safeData.id}`);
                
                // Get current payments
                const snapshot = await agentRef.child('payments').once('value');
                const currentPayments = snapshot.exists() ? snapshot.val() : [];
                
                // Add new payment
                const updatedPayments = [...currentPayments, newPayment];
                
                // Update in Firebase
                await agentRef.update({
                    payments: updatedPayments
                });

                // Reset form and refresh
                setPaymentData({
                    date: new Date().toISOString().split('T')[0],
                    amount: '',
                    paymentMode: 'cash',
                    clientName: '',
                    clientId: '',
                    charges: '',
                    receiptNo: '',
                    remarks: ''
                });
                setShowPaymentForm(false);
                onSaved && onSaved(); // Refresh data
                
            } catch (error) {
                console.error('Error adding payment:', error);
                alert('Failed to add payment: ' + error.message);
            }
        };

        const handlePaymentCancel = () => {
            setShowPaymentForm(false);
            setPaymentData({
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

        return (
            <div className="payment-history">
                {/* Add Payment Button */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="mb-0">Payment Records</h6>
                    <button 
                        className="btn btn-primary btn-sm"
                        onClick={handleAddPayment}
                    >
                        <i className="bi bi-plus-circle me-1"></i>
                        Add Payment
                    </button>
                </div>

                {/* Payment Form */}
                {showPaymentForm && (
                    <div className="card border-primary mb-4">
                        <div className="card-header bg-primary text-white">
                            <h6 className="mb-0">Add New Payment</h6>
                        </div>
                        <div className="card-body">
                            <form onSubmit={handlePaymentSubmit}>
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label">Date</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={paymentData.date}
                                            onChange={(e) => setPaymentData({...paymentData, date: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Amount (₹)</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            placeholder="Enter amount"
                                            value={paymentData.amount}
                                            onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Payment Mode</label>
                                        <select
                                            className="form-select"
                                            value={paymentData.paymentMode}
                                            onChange={(e) => setPaymentData({...paymentData, paymentMode: e.target.value})}
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
                                            value={paymentData.charges}
                                            onChange={(e) => setPaymentData({...paymentData, charges: e.target.value})}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Client Name</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Client name"
                                            value={paymentData.clientName}
                                            onChange={(e) => setPaymentData({...paymentData, clientName: e.target.value})}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Client ID</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Client ID"
                                            value={paymentData.clientId}
                                            onChange={(e) => setPaymentData({...paymentData, clientId: e.target.value})}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Receipt No</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Receipt number"
                                            value={paymentData.receiptNo}
                                            onChange={(e) => setPaymentData({...paymentData, receiptNo: e.target.value})}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Remarks</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Remarks"
                                            value={paymentData.remarks}
                                            onChange={(e) => setPaymentData({...paymentData, remarks: e.target.value})}
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
                        <thead className="table-dark">
                            <tr>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Type</th>
                                <th>Client Charges</th>
                                <th>Receipt No</th>
                                <th>Added By</th>
                                <th>Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.length > 0 ? (
                                payments.map((payment, index) => (
                                    <tr key={index}>
                                        <td>{new Date(payment.date).toLocaleDateString()}</td>
                                        <td className="text-success fw-bold">₹{payment.amount}</td>
                                        <td>
                                            <span className={`badge ${
                                                payment.type === 'cash' ? 'bg-success' : 
                                                payment.type === 'online' ? 'bg-primary' :
                                                payment.type === 'check' ? 'bg-info' : 'bg-warning'
                                            }`}>
                                                {payment.type}
                                            </span>
                                        </td>
                                        <td>₹{payment.clientCharges || 0}</td>
                                        <td>{payment.receiptNo}</td>
                                        <td>
                                            <small>
                                                {payment.addedBy} <br />
                                                <span className="text-muted">
                                                    {payment.timestamp ? new Date(payment.timestamp).toLocaleString() : 'N/A'}
                                                </span>
                                            </small>
                                        </td>
                                        <td>
                                            <small className="text-muted">{payment.remarks || '-'}</small>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="text-center text-muted py-4">
                                        <i className="bi bi-receipt me-2"></i>
                                        No payment records found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // Pay Info Component
    const PayInfo = () => {
        const payRecords = safeData.payRecords || [];
        
        return (
            <div className="pay-info">
                <div className="table-responsive">
                    <table className="table table-hover">
                        <thead className="table-primary">
                            <tr>
                                <th>Date</th>
                                <th>Client</th>
                                <th>Charges</th>
                                <th>Amount</th>
                                <th>Type</th>
                                <th>Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payRecords.length > 0 ? (
                                payRecords.map((record, index) => (
                                    <tr key={index}>
                                        <td className="fw-semibold">
                                            {new Date(record.date).toLocaleDateString('en-IN')}
                                        </td>
                                        <td>
                                            <div className="fw-bold text-dark">{record.clientName}</div>
                                            <small className="text-muted">{record.clientId}</small>
                                        </td>
                                        <td className="text-info fw-bold">₹{record.charges || 0}</td>
                                        <td className="text-success fw-bold">₹{record.amount}</td>
                                        <td>
                                            <span className={`badge ${
                                                record.type === 'salary' ? 'bg-success' : 
                                                record.type === 'commission' ? 'bg-primary' :
                                                record.type === 'bonus' ? 'bg-warning' :
                                                record.type === 'advance' ? 'bg-danger' : 'bg-secondary'
                                            }`}>
                                                {record.type}
                                            </span>
                                        </td>
                                        <td>
                                            <small className="text-muted">{record.remarks || '-'}</small>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="text-center text-muted py-5">
                                        <div className="py-3">
                                            <i className="bi bi-wallet2 display-6 text-muted mb-3"></i>
                                            <h6 className="text-muted">No pay records found</h6>
                                            <small>Payment records will appear here</small>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // Enhanced View Card with Tabs
    const ViewCard = () => {
        const D = (k, alt = "-") => safeData?.[k] ?? alt;
        const photo = safeData?.agentPhotoUrl || safeData?.photoUrl;

        const renderBasicDetails = () => (
            <div className="row g-4">
                <div className="col-md-4 text-center">
                    <img
                        src={photo}
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
                        <div className="rating-stars">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <i 
                                    key={star}
                                    className={`bi ${
                                        star <= (safeData.rating || 0) ? "bi-star-fill text-warning" : "bi-star text-muted"
                                    }`}
                                    style={{ fontSize: "1.2rem", margin: "0 2px" }}
                                />
                            ))}
                            <span className="ms-2 text-muted small">({safeData.rating || 0}/5)</span>
                        </div>
                    </div>
                </div>
                
                <div className="col-md-8">
                    <div className="row g-3">
                        <div className="col-sm-6">
                            <div className="detail-item border rounded p-3 bg-light">
                                <label className="text-muted small mb-1">ID No</label>
                                <div className="fw-semibold text-dark">{D("idNo")}</div>
                            </div>
                        </div>
                        <div className="col-sm-6">
                            <div className="detail-item border rounded p-3 bg-light">
                                <label className="text-muted small mb-1">Gender</label>
                                <div className="fw-semibold text-dark">{D("gender")}</div>
                            </div>
                        </div>
                        <div className="col-sm-6">
                            <div className="detail-item border rounded p-3 bg-light">
                                <label className="text-muted small mb-1">Mobile</label>
                                <div className="fw-semibold text-dark">
                                    <i className="bi bi-phone me-2 text-primary"></i>
                                    {D("mobile")}
                                </div>
                            </div>
                        </div>
                        <div className="col-sm-6">
                            <div className="detail-item border rounded p-3 bg-light">
                                <label className="text-muted small mb-1">UPI</label>
                                <div className="fw-semibold text-dark">
                                    <i className="bi bi-wallet2 me-2 text-success"></i>
                                    {D("upiNo")}
                                </div>
                            </div>
                        </div>
                        <div className="col-sm-6">
                            <div className="detail-item border rounded p-3 bg-light">
                                <label className="text-muted small mb-1">Commission</label>
                                <div className="fw-semibold text-success">₹{D("commission")}</div>
                            </div>
                        </div>
                        <div className="col-sm-6">
                            <div className="detail-item border rounded p-3 bg-light">
                                <label className="text-muted small mb-1">Status</label>
                                <div className="fw-semibold">
                                    <span className={`badge ${
                                        safeData.status === 'active' ? 'bg-success' : 
                                        safeData.status === 'inactive' ? 'bg-secondary' : 'bg-warning'
                                    }`}>
                                        {D("status", "Active")}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );

        const renderFullDetails = () => (
            <div className="row g-3">
                <div className="col-md-6">
                    <div className="detail-item border rounded p-3 bg-light">
                        <label className="text-muted small mb-1">Village / Town</label>
                        <div className="fw-semibold text-dark">{D("villageTown")}</div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="detail-item border rounded p-3 bg-light">
                        <label className="text-muted small mb-1">Mandal</label>
                        <div className="fw-semibold text-dark">{D("mandal")}</div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="detail-item border rounded p-3 bg-light">
                        <label className="text-muted small mb-1">District</label>
                        <div className="fw-semibold text-dark">{D("district")}</div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="detail-item border rounded p-3 bg-light">
                        <label className="text-muted small mb-1">State</label>
                        <div className="fw-semibold text-dark">{D("state")}</div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="detail-item border rounded p-3 bg-light">
                        <label className="text-muted small mb-1">Working Place</label>
                        <div className="fw-semibold text-dark">{D("workingPlace")}</div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="detail-item border rounded p-3 bg-light">
                        <label className="text-muted small mb-1">Proficiency</label>
                        <div className="fw-semibold text-dark">{D("workingProficiency")}</div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="detail-item border rounded p-3 bg-light">
                        <label className="text-muted small mb-1">Experience</label>
                        <div className="fw-semibold text-dark">{D("experience")} years</div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="detail-item border rounded p-3 bg-light">
                        <label className="text-muted small mb-1">Emergency Contact</label>
                        <div className="fw-semibold text-dark">{D("emergencyContact")}</div>
                    </div>
                </div>
                <div className="col-12">
                    <div className="detail-item border rounded p-3 bg-light">
                        <label className="text-muted small mb-1">Address</label>
                        <div className="fw-semibold text-dark">
                            {[D("address1"), D("streetName"), D("landMark")].filter(Boolean).join(", ")}
                        </div>
                    </div>
                </div>
                {D("notes") && (
                    <div className="col-12">
                        <div className="detail-item border rounded p-3 bg-light">
                            <label className="text-muted small mb-1">Notes</label>
                            <div className="fw-semibold text-dark" style={{ whiteSpace: 'pre-wrap' }}>{D("notes")}</div>
                        </div>
                    </div>
                )}
            </div>
        );

        const renderPaymentInfo = () => <PaymentHistory />;
        const renderPayInfo = () => <PayInfo />;

        return (
            <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={close}>
                <div className="modal-dialog modal-xl modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-content border-0 shadow-lg">
                        {/* Header */}
                        <div className="modal-header bg-primary text-white">
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
                            <div className="d-flex gap-2">
                                <button className="btn btn-sm btn-light" onClick={handleEdit}>
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
                                    >
                                        <i className="bi bi-person me-2"></i>Basic
                                    </button>
                                </li>
                                <li className="nav-item">
                                    <button 
                                        className={`nav-link ${activeTab === "full" ? "active" : ""}`}
                                        onClick={() => setActiveTab("full")}
                                    >
                                        <i className="bi bi-file-text me-2"></i>Full Details
                                    </button>
                                </li>
                                <li className="nav-item">
                                    <button 
                                        className={`nav-link ${activeTab === "payments" ? "active" : ""}`}
                                        onClick={() => setActiveTab("payments")}
                                    >
                                        <i className="bi bi-credit-card me-2"></i>Payments
                                    </button>
                                </li>
                                <li className="nav-item">
                                    <button 
                                        className={`nav-link ${activeTab === "payinfo" ? "active" : ""}`}
                                        onClick={() => setActiveTab("payinfo")}
                                    >
                                        <i className="bi bi-wallet2 me-2"></i>Pay Info
                                    </button>
                                </li>
                            </ul>

                            {/* Tab Content */}
                            <div className="p-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                {activeTab === "basic" && renderBasicDetails()}
                                {activeTab === "full" && renderFullDetails()}
                                {activeTab === "payments" && renderPaymentInfo()}
                                {activeTab === "payinfo" && renderPayInfo()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Edit Mode Component
    const EditCard = () => {
        return (
            <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={close}>
                <div className="modal-dialog modal-xl modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-content border-0 shadow-lg">
                        <div className="modal-header bg-warning text-dark">
                            <h5 className="modal-title">Edit Agent - {safeData?.agentName}</h5>
                            <div className="d-flex gap-2">
                                <button className="btn btn-sm btn-dark" onClick={handleSave}>
                                    <i className="bi bi-check-lg me-1"></i>Save
                                </button>
                                <button className="btn btn-sm btn-secondary" onClick={handleCancelEdit}>
                                    <i className="bi bi-x-lg me-1"></i>Cancel
                                </button>
                            </div>
                        </div>
                        <div className="modal-body">
                            <AgentForm
                                show={true}
                                onClose={handleCancelEdit}
                                title="Edit Agent"
                                initialData={safeData}
                                isEdit={true}
                                onSubmit={handleSave}
                                embedded={true}
                            />
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