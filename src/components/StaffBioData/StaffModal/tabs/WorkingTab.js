import React from "react";

const WorkingTab = ({ 
    formData, 
    isEditMode, 
    workErrors, 
    Err, 
    handleArrayChange, 
    removeWorkSection, 
    addWorkSection 
}) => {
    return (
        <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-0 pt-4 pb-3">
                <div className="d-flex align-items-center">
                    <div className="avatar-circle bg-purple me-3" style={{ backgroundColor: '#6f42c1' }}>
                        <i className="bi bi-briefcase text-white"></i>
                    </div>
                    <div>
                        <h4 className="card-title mb-0">Working Details</h4>
                        <p className="text-muted mb-0">Client work history and project details</p>
                    </div>
                </div>
                <hr className="mt-3"></hr>
            </div>
            <div className="card-body p-4">
                {(formData.workDetails || []).map((w, i) => {
                    const locked = !!w.__locked;
                    const invalidClass = (field) => (workErrors[i]?.[field] ? " is-invalid" : "");
                    return (
                        <div key={i} className="card border shadow-sm mb-4">
                            <div className="card-header bg-light border-bottom">
                                <div className="d-flex justify-content-between align-items-center">
                                    <div className="d-flex align-items-center">
                                        <div className="work-number-circle bg-primary text-white d-flex align-items-center justify-content-center me-2" style={{ 
                                            width: '30px', 
                                            height: '30px', 
                                            borderRadius: '50%',
                                            fontSize: '0.9rem',
                                            fontWeight: 'bold'
                                        }}>
                                            {i + 1}
                                        </div>
                                        <h6 className="mb-0">
                                            Work Assignment {i + 1}
                                            {locked && (
                                                <span className="badge bg-secondary ms-2 d-inline-flex align-items-center">
                                                    <i className="bi bi-lock me-1"></i> Locked
                                                </span>
                                            )}
                                        </h6>
                                    </div>
                                    {isEditMode && !locked && (
                                        <button 
                                            className="btn btn-outline-danger btn-sm d-flex align-items-center"
                                            onClick={() => removeWorkSection(i)}
                                            title="Remove this work section"
                                        >
                                            <i className="bi bi-trash me-1"></i> Remove
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="card-body p-3">
                                {/* Client Information Row */}
                                <div className="row g-3 mb-3">
                                    <div className="col-md-4">
                                        <label className="form-label">
                                            <strong>Client ID</strong>
                                            <span className="text-danger">*</span>
                                        </label>
                                        {isEditMode ? (
                                            <div className="input-group input-group-sm">
                                                <span className="input-group-text">
                                                    <i className="bi bi-person-badge"></i>
                                                </span>
                                                <input
                                                    type="text"
                                                    className={`form-control form-control-sm${invalidClass("clientId")}`}
                                                    value={w.clientId || ""}
                                                    onChange={(e) => handleArrayChange("workDetails", i, "clientId", e.target.value)}
                                                    disabled={locked}
                                                    placeholder="Enter client ID"
                                                />
                                            </div>
                                        ) : (
                                            <div className="form-control form-control-sm bg-light d-flex align-items-center" style={{ minHeight: '38px' }}>
                                                <i className="bi bi-person-badge text-muted me-2"></i>
                                                {w.clientId || <span className="text-muted">N/A</span>}
                                            </div>
                                        )}
                                        <Err msg={workErrors[i]?.clientId} />
                                    </div>

                                    <div className="col-md-4">
                                        <label className="form-label">
                                            <strong>Client Name</strong>
                                            <span className="text-danger">*</span>
                                        </label>
                                        {isEditMode ? (
                                            <div className="input-group input-group-sm">
                                                <span className="input-group-text">
                                                    <i className="bi bi-building"></i>
                                                </span>
                                                <input
                                                    type="text"
                                                    className={`form-control form-control-sm${invalidClass("clientName")}`}
                                                    value={w.clientName || ""}
                                                    onChange={(e) => handleArrayChange("workDetails", i, "clientName", e.target.value)}
                                                    disabled={locked}
                                                    placeholder="Enter client name"
                                                />
                                            </div>
                                        ) : (
                                            <div className="form-control form-control-sm bg-light d-flex align-items-center" style={{ minHeight: '38px' }}>
                                                <i className="bi bi-building text-muted me-2"></i>
                                                {w.clientName || <span className="text-muted">N/A</span>}
                                            </div>
                                        )}
                                        <Err msg={workErrors[i]?.clientName} />
                                    </div>

                                    <div className="col-md-4">
                                        <label className="form-label">
                                            <strong>Location</strong>
                                        </label>
                                        {isEditMode ? (
                                            <div className="input-group input-group-sm">
                                                <span className="input-group-text">
                                                    <i className="bi bi-geo-alt"></i>
                                                </span>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    value={w.location || ""}
                                                    onChange={(e) => handleArrayChange("workDetails", i, "location", e.target.value)}
                                                    disabled={locked}
                                                    placeholder="Enter work location"
                                                />
                                            </div>
                                        ) : (
                                            <div className="form-control form-control-sm bg-light d-flex align-items-center" style={{ minHeight: '38px' }}>
                                                <i className="bi bi-geo-alt text-muted me-2"></i>
                                                {w.location || <span className="text-muted">N/A</span>}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Duration & Dates Row */}
                                <div className="row g-3 mb-3">
                                    <div className="col-md-4">
                                        <label className="form-label">
                                            <strong>Days</strong>
                                            <span className="text-danger">*</span>
                                        </label>
                                        {isEditMode ? (
                                            <div className="input-group input-group-sm">
                                                <span className="input-group-text">
                                                    <i className="bi bi-calendar-day"></i>
                                                </span>
                                                <input
                                                    type="number"
                                                    className={`form-control form-control-sm${invalidClass("days")}`}
                                                    value={w.days || ""}
                                                    onChange={(e) => handleArrayChange("workDetails", i, "days", e.target.value)}
                                                    disabled={locked}
                                                    placeholder="Number of days"
                                                    min="1"
                                                    max="365"
                                                />
                                            </div>
                                        ) : (
                                            <div className="form-control form-control-sm bg-light d-flex align-items-center" style={{ minHeight: '38px' }}>
                                                <i className="bi bi-calendar-day text-muted me-2"></i>
                                                {w.days ? `${w.days} days` : <span className="text-muted">N/A</span>}
                                            </div>
                                        )}
                                        <Err msg={workErrors[i]?.days} />
                                    </div>

                                    <div className="col-md-4">
                                        <label className="form-label">
                                            <strong>From Date</strong>
                                            <span className="text-danger">*</span>
                                        </label>
                                        {isEditMode ? (
                                            <div className="input-group input-group-sm">
                                                <span className="input-group-text">
                                                    <i className="bi bi-calendar"></i>
                                                </span>
                                                <input
                                                    type="date"
                                                    className={`form-control form-control-sm${invalidClass("fromDate")}`}
                                                    value={w.fromDate || ""}
                                                    onChange={(e) => handleArrayChange("workDetails", i, "fromDate", e.target.value)}
                                                    disabled={locked}
                                                />
                                            </div>
                                        ) : (
                                            <div className="form-control form-control-sm bg-light d-flex align-items-center" style={{ minHeight: '38px' }}>
                                                <i className="bi bi-calendar text-muted me-2"></i>
                                                {w.fromDate ? new Date(w.fromDate).toLocaleDateString('en-IN') : <span className="text-muted">N/A</span>}
                                            </div>
                                        )}
                                        <Err msg={workErrors[i]?.fromDate} />
                                    </div>

                                    <div className="col-md-4">
                                        <label className="form-label">
                                            <strong>To Date</strong>
                                            <span className="text-danger">*</span>
                                        </label>
                                        {isEditMode ? (
                                            <div className="input-group input-group-sm">
                                                <span className="input-group-text">
                                                    <i className="bi bi-calendar-check"></i>
                                                </span>
                                                <input
                                                    type="date"
                                                    className={`form-control form-control-sm${invalidClass("toDate")}`}
                                                    value={w.toDate || ""}
                                                    onChange={(e) => handleArrayChange("workDetails", i, "toDate", e.target.value)}
                                                    disabled={locked}
                                                />
                                            </div>
                                        ) : (
                                            <div className="form-control form-control-sm bg-light d-flex align-items-center" style={{ minHeight: '38px' }}>
                                                <i className="bi bi-calendar-check text-muted me-2"></i>
                                                {w.toDate ? new Date(w.toDate).toLocaleDateString('en-IN') : <span className="text-muted">N/A</span>}
                                            </div>
                                        )}
                                        <Err msg={workErrors[i]?.toDate} />
                                    </div>
                                </div>

                                {/* Service Details Row */}
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label">
                                            <strong>Service Type</strong>
                                            <span className="text-danger">*</span>
                                        </label>
                                        {isEditMode ? (
                                            <div className="input-group input-group-sm">
                                                <span className="input-group-text">
                                                    <i className="bi bi-tools"></i>
                                                </span>
                                                <input
                                                    type="text"
                                                    className={`form-control form-control-sm${invalidClass("serviceType")}`}
                                                    value={w.serviceType || ""}
                                                    onChange={(e) => handleArrayChange("workDetails", i, "serviceType", e.target.value)}
                                                    disabled={locked}
                                                    placeholder="Enter service type"
                                                />
                                            </div>
                                        ) : (
                                            <div className="form-control form-control-sm bg-light d-flex align-items-center" style={{ minHeight: '38px' }}>
                                                <i className="bi bi-tools text-muted me-2"></i>
                                                {w.serviceType || <span className="text-muted">N/A</span>}
                                            </div>
                                        )}
                                        <Err msg={workErrors[i]?.serviceType} />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label">
                                            <strong>Remarks</strong>
                                        </label>
                                        {isEditMode ? (
                                            <div className="input-group input-group-sm">
                                                <span className="input-group-text">
                                                    <i className="bi bi-chat-left-text"></i>
                                                </span>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    value={w.remarks || ""}
                                                    onChange={(e) => handleArrayChange("workDetails", i, "remarks", e.target.value)}
                                                    disabled={locked}
                                                    placeholder="Enter remarks"
                                                />
                                            </div>
                                        ) : (
                                            <div className="form-control form-control-sm bg-light d-flex align-items-center" style={{ minHeight: '38px' }}>
                                                <i className="bi bi-chat-left-text text-muted me-2"></i>
                                                {w.remarks || <span className="text-muted">N/A</span>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="card-footer bg-white border-top py-2">
                                <div className="text-muted small">
                                    <i className="bi bi-info-circle me-1"></i>
                                    Work assignment details
                                </div>
                            </div>
                        </div>
                    );
                })}

                {isEditMode && (
                    <div className="d-flex justify-content-end mt-3">
                        <button 
                            className="btn btn-primary d-flex align-items-center"
                            onClick={addWorkSection}
                        >
                            <i className="bi bi-plus-circle me-2"></i>
                            Add Work Assignment
                        </button>
                    </div>
                )}
            </div>
            <div className="card-footer bg-white border-0 pb-4">
                <div className="d-flex align-items-center text-muted">
                    <i className="bi bi-clipboard-data me-2"></i>
                    <small>Track your work history and project assignments here</small>
                </div>
            </div>

            {/* CSS for avatar circle */}
            <style jsx>{`
                .avatar-circle {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .avatar-circle i {
                    font-size: 1.2rem;
                }
                .card-header {
                    border-bottom: 1px solid rgba(0,0,0,.125);
                }
                .card-footer {
                    border-top: 1px solid rgba(0,0,0,.125);
                }
                .bg-purple {
                    background-color: #6f42c1;
                }
            `}</style>
        </div>
    );
};

export default WorkingTab;