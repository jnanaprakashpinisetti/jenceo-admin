import React, { useState, useEffect } from "react";

const Working = ({
    formData,
    setFormData,
    canEdit,
    effectiveUserName,
    formatDDMMYY,
    formatTime12h,
    setHasUnsavedChanges
}) => {
    const [showWorkForm, setShowWorkForm] = useState(false);
    const [editingWorkIndex, setEditingWorkIndex] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});
    const [newWork, setNewWork] = useState({
        clientId: "",
        clientName: "",
        location: "",
        days: "",
        fromDate: "",
        toDate: "",
        serviceType: "",
        remarks: "",
        __locked: false,
    });

    const [editWorkDraft, setEditWorkDraft] = useState({ 
        toDate: "", 
        days: "", 
        remarks: "" 
    });

    // Common service types
    const serviceTypes = [
        "Home Care",
        "Nursing Care",
        "Elderly Care",
        "Post-Operative Care",
        "Critical Care",
        "Physiotherapy",
        "Palliative Care",
        "Live-in Care",
        "Other"
    ];

    // Update new work field
    const updateNewWork = (field, value) => {
        setNewWork(prev => ({ ...prev, [field]: value }));
        // Clear validation error for this field
        if (validationErrors[field]) {
            setValidationErrors(prev => ({ ...prev, [field]: "" }));
        }
    };

    // Reset form to initial state
    const resetWorkForm = () => {
        setNewWork({
            clientId: "",
            clientName: "",
            location: "",
            days: "",
            fromDate: "",
            toDate: "",
            serviceType: "",
            remarks: "",
            __locked: false,
        });
        setValidationErrors({});
    };

    // Validate form fields
    const validateWorkForm = () => {
        const errors = {};
        
        if (!newWork.clientId.trim()) errors.clientId = "Client ID is required";
        if (!newWork.clientName.trim()) errors.clientName = "Client name is required";
        if (!newWork.fromDate) errors.fromDate = "From date is required";
        if (!newWork.serviceType) errors.serviceType = "Service type is required";
        
        // Validate date range
        if (newWork.fromDate && newWork.toDate) {
            const fromDate = new Date(newWork.fromDate);
            const toDate = new Date(newWork.toDate);
            if (fromDate > toDate) {
                errors.toDate = "To date must be after From date";
            }
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Calculate days between dates
    const calculateDays = (fromDate, toDate) => {
        if (!fromDate || !toDate) return "";
        const from = new Date(fromDate);
        const to = new Date(toDate);
        const diffTime = Math.abs(to - from);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays.toString();
    };

    // Auto-calculate days when dates change
    useEffect(() => {
        if (newWork.fromDate && newWork.toDate) {
            const days = calculateDays(newWork.fromDate, newWork.toDate);
            updateNewWork("days", days);
        }
    }, [newWork.fromDate, newWork.toDate]);

    // Add stamp with user info and timestamp
    const addAuditStamp = (row) => {
        const timestamp = new Date().toISOString();
        return {
            ...row,
            addedByName: effectiveUserName,
            addedAt: timestamp,
            createdByName: effectiveUserName,
            createdAt: timestamp
        };
    };

    // Add new work record
    const handleAddWork = () => {
        if (!validateWorkForm()) {
            return;
        }

        const workData = {
            ...newWork,
            days: newWork.days || calculateDays(newWork.fromDate, newWork.toDate) || "0"
        };

        const workWithAudit = addAuditStamp(workData);

        setFormData(prev => ({
            ...prev,
            workDetails: [...(prev.workDetails || []), workWithAudit]
        }));

        setHasUnsavedChanges(true);
        setShowWorkForm(false);
        resetWorkForm();
    };

    // Start editing a work record
    const startEditWork = (index) => {
        const work = (formData.workDetails || [])[index];
        if (!work) return;

        setEditWorkDraft({
            toDate: work.toDate || "",
            days: (work.days || "").toString(),
            remarks: work.remarks || ""
        });
        setEditingWorkIndex(index);
    };

    // Cancel editing
    const cancelEditWork = () => {
        setEditingWorkIndex(null);
        setEditWorkDraft({ toDate: "", days: "", remarks: "" });
    };

    // Save edited work
    const handleSaveEditWork = () => {
        if (editingWorkIndex == null) return;

        const originalWork = formData.workDetails?.[editingWorkIndex];
        if (!originalWork || originalWork.__locked) {
            alert("This work record is locked and cannot be edited.");
            return;
        }

        // Validate edit
        if (editWorkDraft.toDate && editWorkDraft.toDate < originalWork.fromDate) {
            alert("To date must be after the from date.");
            return;
        }

        setFormData(prev => {
            const updatedWorkDetails = [...(prev.workDetails || [])];
            const updatedWork = { ...updatedWorkDetails[editingWorkIndex] };

            // Update fields if provided
            if (editWorkDraft.toDate !== "") updatedWork.toDate = editWorkDraft.toDate;
            if (editWorkDraft.days !== "") updatedWork.days = editWorkDraft.days.replace(/\D/g, "");
            if (editWorkDraft.remarks !== undefined) updatedWork.remarks = editWorkDraft.remarks;

            updatedWorkDetails[editingWorkIndex] = updatedWork;
            return { ...prev, workDetails: updatedWorkDetails };
        });

        setHasUnsavedChanges(true);
        cancelEditWork();
    };

    // Remove work record
    const handleRemoveWork = (index) => {
        const work = formData.workDetails?.[index];
        if (work?.__locked) {
            alert("This work record is locked and cannot be removed.");
            return;
        }

        if (window.confirm("Are you sure you want to remove this work record?")) {
            setFormData(prev => {
                const updatedWorkDetails = [...(prev.workDetails || [])];
                updatedWorkDetails.splice(index, 1);
                return { ...prev, workDetails: updatedWorkDetails };
            });
            setHasUnsavedChanges(true);
        }
    };

    // Format date for display
    const formatDateDisplay = (dateString) => {
        if (!dateString) return "—";
        try {
            return new Date(dateString).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch {
            return dateString;
        }
    };

    const workDetails = formData.workDetails || [];

    return (
        <div className="card">
            <div className="card-header bg-info text-white d-flex justify-content-between align-items-center">
                <h4 className="mb-0">
                    <i className="bi bi-briefcase me-2"></i>
                    Work Details
                </h4>
                {canEdit && (
                    <button
                        type="button"
                        className={`btn btn-sm ${showWorkForm ? 'btn-outline-light' : 'btn-light'}`}
                        onClick={() => {
                            setShowWorkForm(!showWorkForm);
                            if (showWorkForm) resetWorkForm();
                        }}
                    >
                        <i className={`bi ${showWorkForm ? 'bi-x-lg' : 'bi-plus-lg'} me-1`}></i>
                        {showWorkForm ? "Close Form" : "Add Work"}
                    </button>
                )}
            </div>

            <div className="card-body">
                {/* Add Work Form */}
                {canEdit && showWorkForm && (
                    <div className="card border-info mb-4">
                        <div className="card-header bg-light">
                            <h5 className="mb-0 text-info">
                                <i className="bi bi-plus-circle me-2"></i>
                                Add New Work Record
                            </h5>
                        </div>
                        <div className="card-body">
                            <div className="row g-3">
                                {/* Client ID */}
                                <div className="col-md-6 col-lg-4">
                                    <label className="form-label fw-semibold">
                                        Client ID <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className={`form-control ${validationErrors.clientId ? 'is-invalid' : ''}`}
                                        value={newWork.clientId}
                                        onChange={(e) => updateNewWork("clientId", e.target.value)}
                                        placeholder="Enter client ID"
                                    />
                                    {validationErrors.clientId && (
                                        <div className="invalid-feedback">{validationErrors.clientId}</div>
                                    )}
                                </div>

                                {/* Client Name */}
                                <div className="col-md-6 col-lg-4">
                                    <label className="form-label fw-semibold">
                                        Client Name <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className={`form-control ${validationErrors.clientName ? 'is-invalid' : ''}`}
                                        value={newWork.clientName}
                                        onChange={(e) => updateNewWork("clientName", e.target.value)}
                                        placeholder="Enter client name"
                                    />
                                    {validationErrors.clientName && (
                                        <div className="invalid-feedback">{validationErrors.clientName}</div>
                                    )}
                                </div>

                                {/* Location */}
                                <div className="col-md-6 col-lg-4">
                                    <label className="form-label fw-semibold">Location</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={newWork.location}
                                        onChange={(e) => updateNewWork("location", e.target.value)}
                                        placeholder="Enter location"
                                    />
                                </div>

                                {/* From Date */}
                                <div className="col-md-6 col-lg-3">
                                    <label className="form-label fw-semibold">
                                        From Date <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        className={`form-control ${validationErrors.fromDate ? 'is-invalid' : ''}`}
                                        value={newWork.fromDate}
                                        onChange={(e) => updateNewWork("fromDate", e.target.value)}
                                    />
                                    {validationErrors.fromDate && (
                                        <div className="invalid-feedback">{validationErrors.fromDate}</div>
                                    )}
                                </div>

                                {/* To Date */}
                                <div className="col-md-6 col-lg-3">
                                    <label className="form-label fw-semibold">To Date</label>
                                    <input
                                        type="date"
                                        className={`form-control ${validationErrors.toDate ? 'is-invalid' : ''}`}
                                        value={newWork.toDate}
                                        onChange={(e) => updateNewWork("toDate", e.target.value)}
                                        min={newWork.fromDate}
                                    />
                                    {validationErrors.toDate && (
                                        <div className="invalid-feedback">{validationErrors.toDate}</div>
                                    )}
                                </div>

                                {/* Days */}
                                <div className="col-md-4 col-lg-2">
                                    <label className="form-label fw-semibold">Days</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={newWork.days}
                                        min="1"
                                        onChange={(e) => updateNewWork("days", e.target.value)}
                                        placeholder="Auto-calculated"
                                        readOnly={!!(newWork.fromDate && newWork.toDate)}
                                    />
                                </div>

                                {/* Service Type */}
                                <div className="col-md-8 col-lg-4">
                                    <label className="form-label fw-semibold">
                                        Service Type <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        className={`form-select ${validationErrors.serviceType ? 'is-invalid' : ''}`}
                                        value={newWork.serviceType}
                                        onChange={(e) => updateNewWork("serviceType", e.target.value)}
                                    >
                                        <option value="">Select Service Type</option>
                                        {serviceTypes.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                    {validationErrors.serviceType && (
                                        <div className="invalid-feedback">{validationErrors.serviceType}</div>
                                    )}
                                </div>

                                {/* Remarks */}
                                <div className="col-12">
                                    <label className="form-label fw-semibold">Remarks</label>
                                    <textarea
                                        className="form-control"
                                        rows="2"
                                        value={newWork.remarks}
                                        onChange={(e) => updateNewWork("remarks", e.target.value)}
                                        placeholder="Any additional remarks..."
                                    />
                                </div>
                            </div>

                            <div className="d-flex justify-content-end gap-2 mt-4">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => {
                                        setShowWorkForm(false);
                                        resetWorkForm();
                                    }}
                                >
                                    <i className="bi bi-x-lg me-1"></i> Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-info text-white"
                                    onClick={handleAddWork}
                                >
                                    <i className="bi bi-check-lg me-1"></i> Add Work Record
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Summary Stats */}
                {workDetails.length > 0 && (
                    <div className="row g-3 mb-4">
                        <div className="col-md-4">
                            <div className="card bg-light">
                                <div className="card-body text-center py-3">
                                    <div className="text-muted small">Total Assignments</div>
                                    <div className="h3 text-info fw-bold">{workDetails.length}</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="card bg-light">
                                <div className="card-body text-center py-3">
                                    <div className="text-muted small">Total Days Worked</div>
                                    <div className="h3 text-primary fw-bold">
                                        {workDetails.reduce((sum, work) => sum + (parseInt(work.days) || 0), 0)}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="card bg-light">
                                <div className="card-body text-center py-3">
                                    <div className="text-muted small">Active Services</div>
                                    <div className="h3 text-success fw-bold">
                                        {[...new Set(workDetails.map(w => w.serviceType))].length}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Work Details Table */}
                {workDetails.length === 0 ? (
                    <div className="alert alert-info text-center text-info">
                        <i className="bi bi-info-circle me-2"></i>
                        No work records found. Click "Add Work" to record work assignments.
                    </div>
                ) : (
                    <>
                        <div className="table-responsive">
                            <table className="table table-hover table-bordered align-middle">
                                <thead className="table-info">
                                    <tr>
                                        <th width="40">#</th>
                                        <th width="100">Client ID</th>
                                        <th>Client Name</th>
                                        <th>Location</th>
                                        <th width="80">Days</th>
                                        <th width="120">From Date</th>
                                        <th width="120">To Date</th>
                                        <th width="150">Service Type</th>
                                        <th>Remarks</th>
                                        <th width="140">Added By</th>
                                        {canEdit && <th width="120">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {workDetails.map((work, index) => (
                                        <tr key={index} className={work.__locked ? "table-secondary" : ""}>
                                            <td className="text-center fw-semibold">{index + 1}</td>
                                            <td>
                                                <span className="badge bg-dark">#{work.clientId}</span>
                                            </td>
                                            <td className="fw-semibold">{work.clientName || "—"}</td>
                                            <td>{work.location || "—"}</td>
                                            <td className="text-center">
                                                <span className="badge bg-primary">{work.days || "—"}</span>
                                            </td>
                                            <td>
                                                <span className="badge bg-success">{formatDateDisplay(work.fromDate)}</span>
                                            </td>
                                            <td>
                                                {work.toDate ? (
                                                    <span className="badge bg-warning text-dark">{formatDateDisplay(work.toDate)}</span>
                                                ) : (
                                                    <span className="badge bg-secondary">Ongoing</span>
                                                )}
                                            </td>
                                            <td>
                                                <span className="badge bg-info text-white">{work.serviceType || "—"}</span>
                                            </td>
                                            <td style={{ maxWidth: '200px' }}>
                                                <div className="text-truncate" title={work.remarks}>
                                                    {work.remarks || "—"}
                                                </div>
                                            </td>
                                            <td className="small">
                                                <div className="fw-semibold">{work.addedByName || work.createdByName || effectiveUserName}</div>
                                                <div className="text-muted">
                                                    {formatDDMMYY(work.addedAt || work.createdAt)}<br />
                                                    {formatTime12h(work.addedAt || work.createdAt)}
                                                </div>
                                            </td>
                                            {canEdit && (
                                                <td>
                                                    <div className="d-flex gap-1">
                                                        {!work.__locked ? (
                                                            <>
                                                                <button
                                                                    className="btn btn-outline-warning btn-sm"
                                                                    onClick={() => startEditWork(index)}
                                                                    title="Edit work record"
                                                                >
                                                                    <i className="bi bi-pencil"></i>
                                                                </button>
                                                                <button
                                                                    className="btn btn-outline-danger btn-sm"
                                                                    onClick={() => handleRemoveWork(index)}
                                                                    title="Remove work record"
                                                                >
                                                                    <i className="bi bi-trash"></i>
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <span className="badge bg-secondary" title="Locked record">
                                                                <i className="bi bi-lock me-1"></i>Locked
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="table-active">
                                    <tr className="fw-bold">
                                        <td colSpan="4" className="text-end">Totals:</td>
                                        <td className="text-center">
                                            {workDetails.reduce((sum, work) => sum + (parseInt(work.days) || 0), 0)}
                                        </td>
                                        <td colSpan={canEdit ? "6" : "5"} className="text-center">
                                            <span className="badge bg-dark">
                                                Total Records: {workDetails.length}
                                            </span>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Edit Form */}
                        {canEdit && editingWorkIndex !== null && (
                            <div className="card border-warning mt-4">
                                <div className="card-header bg-warning text-dark">
                                    <h5 className="mb-0">
                                        <i className="bi bi-pencil-square me-2"></i>
                                        Edit Work Record (Row #{editingWorkIndex + 1})
                                    </h5>
                                </div>
                                <div className="card-body">
                                    <div className="alert alert-warning mb-3">
                                        <i className="bi bi-exclamation-triangle me-2"></i>
                                        You can only edit <strong>To Date</strong>, <strong>Days</strong>, and <strong>Remarks</strong> fields.
                                    </div>
                                    
                                    <div className="row g-3">
                                        <div className="col-md-4">
                                            <label className="form-label fw-semibold">
                                                To Date <small className="text-muted">(optional)</small>
                                            </label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={editWorkDraft.toDate}
                                                onChange={(e) => setEditWorkDraft(prev => ({ ...prev, toDate: e.target.value }))}
                                                min={formData.workDetails?.[editingWorkIndex]?.fromDate}
                                            />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label fw-semibold">
                                                Days <small className="text-muted">(optional)</small>
                                            </label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={editWorkDraft.days}
                                                onChange={(e) => setEditWorkDraft(prev => ({ 
                                                    ...prev, 
                                                    days: e.target.value.replace(/\D/g, "") 
                                                }))}
                                                min="1"
                                            />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label fw-semibold">Remarks</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={editWorkDraft.remarks}
                                                onChange={(e) => setEditWorkDraft(prev => ({ ...prev, remarks: e.target.value }))}
                                                placeholder="Update remarks..."
                                            />
                                        </div>
                                    </div>

                                    <div className="d-flex justify-content-end gap-2 mt-4">
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={cancelEditWork}
                                        >
                                            <i className="bi bi-x-lg me-1"></i> Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-warning"
                                            onClick={handleSaveEditWork}
                                        >
                                            <i className="bi bi-check-lg me-1"></i> Save Changes
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Working;