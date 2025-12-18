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
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingWorkIndex, setEditingWorkIndex] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});
    const [clientOptions, setClientOptions] = useState([]);
    const [clientSearchTerm, setClientSearchTerm] = useState("");
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const [newWork, setNewWork] = useState({
        clientId: "",
        clientName: "",
        location: "",
        serviceType: "",
        fromDate: "",
        toDate: "",
        timesheetID: "",
        days: "",
        remarks: "",
        __locked: false,
    });

    const [editWorkDraft, setEditWorkDraft] = useState({ 
        toDate: "", 
        days: "", 
        timesheetID: "",
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

    // Mock client data - in real app, this would come from API
    const mockClients = [
        { clientId: "CL001", clientName: "John Doe", location: "New York" },
        { clientId: "CL002", clientName: "Jane Smith", location: "Los Angeles" },
        { clientId: "CL003", clientName: "Robert Johnson", location: "Chicago" },
        { clientId: "CL004", clientName: "Mary Williams", location: "Houston" },
        { clientId: "CL005", clientName: "Michael Brown", location: "Phoenix" },
    ];

    // Load client options
    useEffect(() => {
        // In real app, fetch from API
        setClientOptions(mockClients);
    }, []);

    // Filter clients based on search term
    const filteredClients = clientOptions.filter(client =>
        client.clientId?.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
        client.clientName?.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
        client.location?.toLowerCase().includes(clientSearchTerm.toLowerCase())
    );

    // Handle client selection
    const handleClientSelect = (client) => {
        setNewWork(prev => ({
            ...prev,
            clientId: client.clientId,
            clientName: client.clientName,
            location: client.location
        }));
        setClientSearchTerm(`${client.clientId} - ${client.clientName}`);
        setShowClientDropdown(false);
    };

    // Update new work field
    const updateNewWork = (field, value) => {
        const updatedWork = { ...newWork, [field]: value };
        
        // If client ID changes manually, try to find and auto-fill
        if (field === "clientId" && value) {
            const foundClient = clientOptions.find(client => 
                client.clientId.toLowerCase() === value.toLowerCase()
            );
            if (foundClient) {
                updatedWork.clientName = foundClient.clientName;
                updatedWork.location = foundClient.location;
            } else {
                // Clear auto-filled fields if client not found
                updatedWork.clientName = "";
                updatedWork.location = "";
            }
        }
        
        setNewWork(updatedWork);
        
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
            serviceType: "",
            fromDate: "",
            toDate: "",
            timesheetID: "",
            days: "",
            remarks: "",
            __locked: false,
        });
        setClientSearchTerm("");
        setShowClientDropdown(false);
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
            setNewWork(prev => ({ ...prev, days }));
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
        setShowAddModal(false);
        resetWorkForm();
    };

    // Open add work modal
    const openAddWorkModal = () => {
        resetWorkForm();
        setShowAddModal(true);
    };

    // Close add work modal
    const closeAddWorkModal = () => {
        setShowAddModal(false);
        resetWorkForm();
    };

    // Start editing a work record
    const startEditWork = (index) => {
        const work = (formData.workDetails || [])[index];
        if (!work) return;

        setEditWorkDraft({
            toDate: work.toDate || "",
            days: (work.days || "").toString(),
            timesheetID: work.timesheetID || "",
            remarks: work.remarks || ""
        });
        setEditingWorkIndex(index);
        setShowEditModal(true);
    };

    // Close edit modal
    const closeEditModal = () => {
        setShowEditModal(false);
        setEditingWorkIndex(null);
        setEditWorkDraft({ toDate: "", days: "", timesheetID: "", remarks: "" });
    };

    // Save edited work
    const handleSaveEditWork = () => {
        if (editingWorkIndex == null) return;

        const originalWork = formData.workDetails?.[editingWorkIndex];
        if (!originalWork || originalWork.__locked) {
            alert("This work record is locked and cannot be edited.");
            closeEditModal();
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
            if (editWorkDraft.timesheetID !== undefined) updatedWork.timesheetID = editWorkDraft.timesheetID;
            if (editWorkDraft.remarks !== undefined) updatedWork.remarks = editWorkDraft.remarks;

            updatedWorkDetails[editingWorkIndex] = updatedWork;
            return { ...prev, workDetails: updatedWorkDetails };
        });

        setHasUnsavedChanges(true);
        closeEditModal();
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
        <>
            {/* Add Work Modal */}
            {showAddModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content bg-dark text-white border-secondary">
                            <div className="modal-header bg-dark border-secondary">
                                <h5 className="modal-title">
                                    <i className="bi bi-plus-circle me-2"></i>
                                    Add New Work Record
                                </h5>
                                <button 
                                    type="button" 
                                    className="btn-close btn-close-white" 
                                    onClick={closeAddWorkModal}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="row g-3">
                                    {/* Client Search - Similar to WorkerSearch */}
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold">
                                            Client ID <span className="text-danger">*</span>
                                        </label>
                                        <div className="position-relative">
                                            <div className="input-group">
                                                <span className="input-group-text bg-dark border-secondary">
                                                    <i className="bi bi-search text-warning"></i>
                                                </span>
                                                <input
                                                    type="text"
                                                    className={`form-control bg-dark text-white border-secondary ${validationErrors.clientId ? 'is-invalid' : ''}`}
                                                    placeholder="Search by Client ID or Name..."
                                                    value={clientSearchTerm}
                                                    onChange={(e) => {
                                                        setClientSearchTerm(e.target.value);
                                                        setShowClientDropdown(true);
                                                    }}
                                                    onFocus={() => setShowClientDropdown(true)}
                                                />
                                            </div>

                                            {/* Client Dropdown */}
                                            {showClientDropdown && clientSearchTerm && (
                                                <div 
                                                    className="position-absolute top-100 start-0 end-0 bg-dark border border-secondary rounded mt-1 z-3"
                                                    style={{ maxHeight: '300px', overflowY: 'auto' }}
                                                >
                                                    {filteredClients.map(client => (
                                                        <div
                                                            key={client.clientId}
                                                            className="p-3 border-bottom border-secondary hover-bg-secondary"
                                                            onClick={() => handleClientSelect(client)}
                                                            style={{cursor:'pointer'}}
                                                        >
                                                            <div className="d-flex justify-content-between align-items-center">
                                                                <div>
                                                                    <strong className="text-white">{client.clientId} - {client.clientName}</strong>
                                                                    <div className="text-info small">
                                                                        Location: {client.location}
                                                                    </div>
                                                                </div>
                                                                <div className="text-end">
                                                                    <i className="bi bi-chevron-right text-warning"></i>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {filteredClients.length === 0 && (
                                                        <div className="p-3 text-muted text-center">No clients found</div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Click outside to close */}
                                            {showClientDropdown && (
                                                <div 
                                                    className="position-fixed top-0 left-0 w-100 h-100" 
                                                    style={{ zIndex: 2 }}
                                                    onClick={() => setShowClientDropdown(false)}
                                                />
                                            )}
                                        </div>
                                        {validationErrors.clientId && (
                                            <div className="invalid-feedback d-block">{validationErrors.clientId}</div>
                                        )}
                                    </div>

                                    {/* Client Name (auto-filled) */}
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold">
                                            Client Name <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className={`form-control bg-dark text-white border-secondary ${validationErrors.clientName ? 'is-invalid' : ''}`}
                                            value={newWork.clientName}
                                            readOnly
                                            placeholder="Auto-filled from Client ID"
                                        />
                                        {validationErrors.clientName && (
                                            <div className="invalid-feedback d-block">{validationErrors.clientName}</div>
                                        )}
                                    </div>

                                    {/* Location (auto-filled) */}
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold">Location</label>
                                        <input
                                            type="text"
                                            className="form-control bg-dark text-white border-secondary"
                                            value={newWork.location}
                                            readOnly
                                            placeholder="Auto-filled from Client ID"
                                        />
                                    </div>

                                    {/* Service Type */}
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold">
                                            Service Type <span className="text-danger">*</span>
                                        </label>
                                        <select
                                            className={`form-select bg-dark text-white border-secondary ${validationErrors.serviceType ? 'is-invalid' : ''}`}
                                            value={newWork.serviceType}
                                            onChange={(e) => updateNewWork("serviceType", e.target.value)}
                                        >
                                            <option value="" className="bg-dark">Select Service Type</option>
                                            {serviceTypes.map(type => (
                                                <option key={type} value={type} className="bg-dark">{type}</option>
                                            ))}
                                        </select>
                                        {validationErrors.serviceType && (
                                            <div className="invalid-feedback d-block">{validationErrors.serviceType}</div>
                                        )}
                                    </div>

                                    {/* From Date and To Date in one row */}
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold">
                                            From Date <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            className={`form-control bg-dark text-white border-secondary ${validationErrors.fromDate ? 'is-invalid' : ''}`}
                                            value={newWork.fromDate}
                                            onChange={(e) => updateNewWork("fromDate", e.target.value)}
                                        />
                                        {validationErrors.fromDate && (
                                            <div className="invalid-feedback d-block">{validationErrors.fromDate}</div>
                                        )}
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold">To Date</label>
                                        <input
                                            type="date"
                                            className={`form-control bg-dark text-white border-secondary ${validationErrors.toDate ? 'is-invalid' : ''}`}
                                            value={newWork.toDate}
                                            onChange={(e) => updateNewWork("toDate", e.target.value)}
                                            min={newWork.fromDate}
                                        />
                                        {validationErrors.toDate && (
                                            <div className="invalid-feedback d-block">{validationErrors.toDate}</div>
                                        )}
                                    </div>

                                    {/* Timesheet ID and Days in one row */}
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold">Timesheet ID</label>
                                        <input
                                            type="text"
                                            className="form-control bg-dark text-white border-secondary"
                                            value={newWork.timesheetID}
                                            onChange={(e) => updateNewWork("timesheetID", e.target.value)}
                                            placeholder="Enter timesheet ID"
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold">Days</label>
                                        <div className="input-group">
                                            <input
                                                type="number"
                                                className="form-control bg-dark text-white border-secondary"
                                                value={newWork.days}
                                                readOnly={!!(newWork.fromDate && newWork.toDate)}
                                                placeholder="Auto-calculated from dates"
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-outline-warning border-secondary"
                                                onClick={() => {
                                                    if (newWork.fromDate && newWork.toDate) {
                                                        const days = calculateDays(newWork.fromDate, newWork.toDate);
                                                        updateNewWork("days", days);
                                                    }
                                                }}
                                                title="Calculate days"
                                            >
                                                <i className="bi bi-calculator"></i>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Remarks */}
                                    <div className="col-12">
                                        <label className="form-label fw-semibold">Remarks</label>
                                        <textarea
                                            className="form-control bg-dark text-white border-secondary"
                                            rows="3"
                                            value={newWork.remarks}
                                            onChange={(e) => updateNewWork("remarks", e.target.value)}
                                            placeholder="Any additional remarks..."
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer bg-dark border-secondary">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={closeAddWorkModal}
                                >
                                    <i className="bi bi-x-lg me-1"></i> Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-info"
                                    onClick={handleAddWork}
                                >
                                    <i className="bi bi-check-lg me-1"></i> Add Work Record
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Work Modal */}
            {showEditModal && editingWorkIndex !== null && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content bg-dark text-white border-secondary">
                            <div className="modal-header bg-dark border-warning">
                                <h5 className="modal-title">
                                    <i className="bi bi-pencil-square me-2"></i>
                                    Edit Work Record (Row #{editingWorkIndex + 1})
                                </h5>
                                <button 
                                    type="button" 
                                    className="btn-close btn-close-white" 
                                    onClick={closeEditModal}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="alert alert-warning bg-dark border-warning text-warning mb-3">
                                    <i className="bi bi-exclamation-triangle me-2"></i>
                                    You can only edit <strong>To Date</strong>, <strong>Timesheet ID</strong>, <strong>Days</strong>, and <strong>Remarks</strong> fields.
                                </div>
                                
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold">
                                            To Date <small className="text-muted">(optional)</small>
                                        </label>
                                        <input
                                            type="date"
                                            className="form-control bg-dark text-white border-secondary"
                                            value={editWorkDraft.toDate}
                                            onChange={(e) => setEditWorkDraft(prev => ({ ...prev, toDate: e.target.value }))}
                                            min={formData.workDetails?.[editingWorkIndex]?.fromDate}
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold">Timesheet ID</label>
                                        <input
                                            type="text"
                                            className="form-control bg-dark text-white border-secondary"
                                            value={editWorkDraft.timesheetID}
                                            onChange={(e) => setEditWorkDraft(prev => ({ 
                                                ...prev, 
                                                timesheetID: e.target.value 
                                            }))}
                                            placeholder="Update timesheet ID"
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold">
                                            Days <small className="text-muted">(optional)</small>
                                        </label>
                                        <input
                                            type="number"
                                            className="form-control bg-dark text-white border-secondary"
                                            value={editWorkDraft.days}
                                            onChange={(e) => setEditWorkDraft(prev => ({ 
                                                ...prev, 
                                                days: e.target.value.replace(/\D/g, "") 
                                            }))}
                                            min="1"
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold">Calculate Days</label>
                                        <button
                                            type="button"
                                            className="btn btn-outline-warning w-100"
                                            onClick={() => {
                                                const work = formData.workDetails?.[editingWorkIndex];
                                                const toDate = editWorkDraft.toDate || work?.toDate;
                                                const fromDate = work?.fromDate;
                                                if (fromDate && toDate) {
                                                    const days = calculateDays(fromDate, toDate);
                                                    setEditWorkDraft(prev => ({ ...prev, days }));
                                                }
                                            }}
                                        >
                                            <i className="bi bi-calculator me-1"></i> Calculate from Dates
                                        </button>
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label fw-semibold">Remarks</label>
                                        <textarea
                                            className="form-control bg-dark text-white border-secondary"
                                            rows="3"
                                            value={editWorkDraft.remarks}
                                            onChange={(e) => setEditWorkDraft(prev => ({ ...prev, remarks: e.target.value }))}
                                            placeholder="Update remarks..."
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer bg-dark border-secondary">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={closeEditModal}
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
                </div>
            )}

            {/* Main Work Component */}
            <div className="card bg-dark text-white border-secondary">
                <div className="card-header bg-dark border-secondary d-flex justify-content-between align-items-center">
                    <h4 className="mb-0">
                        <i className="bi bi-briefcase me-2"></i>
                        Work Details
                    </h4>
                    {canEdit && (
                        <button
                            type="button"
                            className="btn btn-outline-info btn-sm"
                            onClick={openAddWorkModal}
                        >
                            <i className="bi bi-plus-lg me-1"></i>
                            Add Work
                        </button>
                    )}
                </div>

                <div className="card-body">
                    {/* Summary Stats */}
                    {workDetails.length > 0 && (
                        <div className="row g-3 mb-4">
                            <div className="col-md-4">
                                <div className="card bg-dark border-info">
                                    <div className="card-body text-center py-3">
                                        <div className="text-info small">Total Assignments</div>
                                        <div className="h3 text-info fw-bold">{workDetails.length}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="card bg-dark border-primary">
                                    <div className="card-body text-center py-3">
                                        <div className="text-primary small">Total Days Worked</div>
                                        <div className="h3 text-primary fw-bold">
                                            {workDetails.reduce((sum, work) => sum + (parseInt(work.days) || 0), 0)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="card bg-dark border-success">
                                    <div className="card-body text-center py-3">
                                        <div className="text-success small">Active Services</div>
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
                        <div className="alert alert-info border-info text-info text-center">
                            <i className="bi bi-info-circle me-2"></i>
                            No work records found. Click "Add Work" to record work assignments.
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-dark table-hover table-bordered align-middle">
                                <thead className="table-info">
                                    <tr>
                                        <th width="40">#</th>
                                        <th width="100">Client ID</th>
                                        <th>Client Name</th>
                                        <th>Location</th>
                                        <th width="150">Service Type</th>
                                        <th width="100">From Date</th>
                                        <th width="100">To Date</th>
                                        <th width="100">Timesheet ID</th>
                                        <th width="80">Days</th>
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
                                                <span className="badge bg-dark border border-info">#{work.clientId}</span>
                                            </td>
                                            <td className="fw-semibold">{work.clientName || "—"}</td>
                                            <td>{work.location || "—"}</td>
                                            <td>
                                                <span className="badge bg-info text-dark">{work.serviceType || "—"}</span>
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
                                                {work.timesheetID ? (
                                                    <small className="text-muted">#{work.timesheetID}</small>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>
                                            <td className="text-center">
                                                <span className="badge bg-primary">{work.days || "—"}</span>
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
                                                                    className="btn btn-outline-warning btn-sm border-warning"
                                                                    onClick={() => startEditWork(index)}
                                                                    title="Edit work record"
                                                                >
                                                                    <i className="bi bi-pencil"></i>
                                                                </button>
                                                                <button
                                                                    className="btn btn-outline-danger btn-sm border-danger"
                                                                    onClick={() => handleRemoveWork(index)}
                                                                    title="Remove work record"
                                                                >
                                                                    <i className="bi bi-trash"></i>
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <span className="badge bg-secondary border border-light" title="Locked record">
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
                                        <td colSpan="8" className="text-end">Totals:</td>
                                        <td className="text-center">
                                            {workDetails.reduce((sum, work) => sum + (parseInt(work.days) || 0), 0)}
                                        </td>
                                        <td colSpan={canEdit ? "3" : "2"} className="text-center">
                                            <span className="badge bg-dark border border-light">
                                                Total Records: {workDetails.length}
                                            </span>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default Working;