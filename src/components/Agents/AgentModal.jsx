import React, { useMemo, useState } from "react";
import AgentForm from "./AgentForm";

export default function AgentModal({ show, onClose, data, mode = "view", onSaved }) {
    const isEdit = mode === "edit";
    const isAdd = mode === "add";
    const isView = mode === "view";

    const title = isAdd ? "Add New Agent" : isEdit ? "Edit Agent" : "Agent Details";

    const [localOpen, setLocalOpen] = useState(!!show);
    const [activeTab, setActiveTab] = useState("basic");
    
    React.useEffect(() => setLocalOpen(!!show), [show]);

    const safeData = useMemo(() => data || {}, [data]);

    if (!localOpen) return null;

    const close = () => {
        setLocalOpen(false);
        onClose && onClose();
    };

    const onEdit = () => {
        onClose && onClose();
    };

    // Payment History Component
    const PaymentHistory = () => {
        const payments = safeData.payments || [];
        
        return (
            <div className="payment-history">
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
                                                    {new Date(payment.timestamp).toLocaleString()}
                                                </span>
                                            </small>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="text-center text-muted py-4">
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
                            <div className="detail-item">
                                <label className="text-muted small mb-1">ID No</label>
                                <div className="fw-semibold text-dark">{D("idNo")}</div>
                            </div>
                        </div>
                        <div className="col-sm-6">
                            <div className="detail-item">
                                <label className="text-muted small mb-1">Gender</label>
                                <div className="fw-semibold text-dark">{D("gender")}</div>
                            </div>
                        </div>
                        <div className="col-sm-6">
                            <div className="detail-item">
                                <label className="text-muted small mb-1">Mobile</label>
                                <div className="fw-semibold text-dark">
                                    <i className="bi bi-phone me-2 text-primary"></i>
                                    {D("mobile")}
                                </div>
                            </div>
                        </div>
                        <div className="col-sm-6">
                            <div className="detail-item">
                                <label className="text-muted small mb-1">UPI</label>
                                <div className="fw-semibold text-dark">
                                    <i className="bi bi-wallet2 me-2 text-success"></i>
                                    {D("upiNo")}
                                </div>
                            </div>
                        </div>
                        <div className="col-sm-6">
                            <div className="detail-item">
                                <label className="text-muted small mb-1">Commission</label>
                                <div className="fw-semibold text-success">₹{D("commission")}</div>
                            </div>
                        </div>
                        <div className="col-sm-6">
                            <div className="detail-item">
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
                    <div className="detail-item">
                        <label className="text-muted small mb-1">Village / Town</label>
                        <div className="fw-semibold text-dark">{D("villageTown")}</div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="detail-item">
                        <label className="text-muted small mb-1">Mandal</label>
                        <div className="fw-semibold text-dark">{D("mandal")}</div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="detail-item">
                        <label className="text-muted small mb-1">District</label>
                        <div className="fw-semibold text-dark">{D("district")}</div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="detail-item">
                        <label className="text-muted small mb-1">State</label>
                        <div className="fw-semibold text-dark">{D("state")}</div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="detail-item">
                        <label className="text-muted small mb-1">Working Place</label>
                        <div className="fw-semibold text-dark">{D("workingPlace")}</div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="detail-item">
                        <label className="text-muted small mb-1">Proficiency</label>
                        <div className="fw-semibold text-dark">{D("workingProficiency")}</div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="detail-item">
                        <label className="text-muted small mb-1">Experience</label>
                        <div className="fw-semibold text-dark">{D("experience")} years</div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="detail-item">
                        <label className="text-muted small mb-1">Emergency Contact</label>
                        <div className="fw-semibold text-dark">{D("emergencyContact")}</div>
                    </div>
                </div>
                <div className="col-12">
                    <div className="detail-item">
                        <label className="text-muted small mb-1">Address</label>
                        <div className="fw-semibold text-dark">
                            {[D("address1"), D("streetName"), D("landMark")].filter(Boolean).join(", ")}
                        </div>
                    </div>
                </div>
                {D("notes") && (
                    <div className="col-12">
                        <div className="detail-item">
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
                <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
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
                                <button className="btn btn-sm btn-light" onClick={() => onEdit()}>
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
                            <div className="p-4">
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

    return (
        <>
            {isView ? (
                <ViewCard />
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