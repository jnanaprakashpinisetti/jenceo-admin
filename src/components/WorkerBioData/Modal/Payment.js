import React, { useState, useEffect, useMemo } from "react";

const Payment = ({
    formData,
    setFormData,
    canEdit,
    PAY_MIN,
    PAY_MAX,
    effectiveUserName,
    formatDDMMYY,
    formatTime12h,
    setHasUnsavedChanges,
    clients = [] // Pass clients list from parent component
}) => {
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const [clientSearch, setClientSearch] = useState("");
    const [clientList, setClientList] = useState([]);
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const [newPayment, setNewPayment] = useState({
        date: "",
        days: "",
        clientId: "",
        clientName: "",
        amount: "",
        balanceAmount: "",
        typeOfPayment: "",
        timesheetID: "",
        status: "",
        receiptNo: "",
        remarks: "",
        __locked: false,
    });

    // Mock client data if no clients provided
    const MOCK_CLIENTS = [
        { id: "CL001", name: "John Smith", phone: "9876543210" },
        { id: "CL002", name: "Sarah Johnson", phone: "9876543211" },
        { id: "CL003", name: "Robert Williams", phone: "9876543212" },
        { id: "CL004", name: "Emily Davis", phone: "9876543213" },
        { id: "CL005", name: "Michael Brown", phone: "9876543214" },
    ];

    // Use provided clients or mock data
    const allClients = clients.length > 0 ? clients : MOCK_CLIENTS;

    const paymentTypes = [
        { value: "cash", label: "Cash" },
        { value: "online", label: "Online" },
        { value: "cheque", label: "Cheque" }
    ];

    const paymentForOptions = [
        { value: "salary", label: "Salary" },
        { value: "advance", label: "Advance" },
        { value: "commission", label: "Commission" },
        { value: "bonus", label: "Bonus" },
        { value: "other", label: "Other" }
    ];

    // Filter clients based on search term
    const filteredClients = useMemo(() => {
        if (!clientSearch.trim()) return [];
        
        const term = clientSearch.toLowerCase();
        return allClients.filter(client => 
            client.id?.toLowerCase().includes(term) ||
            client.name?.toLowerCase().includes(term) ||
            client.phone?.includes(term)
        ).slice(0, 5);
    }, [allClients, clientSearch]);

    // Select a client from dropdown
    const selectClient = (client) => {
        setNewPayment(prev => ({
            ...prev,
            clientId: client.id,
            clientName: client.name
        }));
        setClientSearch("");
        setClientList([]);
        setShowClientDropdown(false);
        
        // Clear validation errors
        setValidationErrors(prev => ({
            ...prev,
            clientId: "",
            clientName: ""
        }));
    };

    // Handle client ID input - auto-fill name when ID matches
    const handleClientIdChange = (clientId) => {
        setNewPayment(prev => ({ ...prev, clientId }));
        
        // Find client by ID and auto-fill name
        if (clientId.trim()) {
            const foundClient = allClients.find(client => 
                client.id.toLowerCase() === clientId.toLowerCase().trim()
            );
            
            if (foundClient) {
                setNewPayment(prev => ({ 
                    ...prev, 
                    clientName: foundClient.name,
                    clientId: foundClient.id // Ensure exact ID format
                }));
            } else {
                // Clear name if no client found
                setNewPayment(prev => ({ ...prev, clientName: "" }));
            }
        } else {
            setNewPayment(prev => ({ ...prev, clientName: "" }));
        }
        
        // Clear validation error
        if (validationErrors.clientId) {
            setValidationErrors(prev => ({ ...prev, clientId: "" }));
        }
    };

    // Handle client name search input
    const handleClientSearchChange = (value) => {
        setClientSearch(value);
        setShowClientDropdown(true);
        
        // If user clears search, hide dropdown
        if (!value.trim()) {
            setShowClientDropdown(false);
        }
    };

    // Update new payment field
    const updateNewPayment = (field, value) => {
        setNewPayment(prev => ({ ...prev, [field]: value }));
        // Clear validation error for this field
        if (validationErrors[field]) {
            setValidationErrors(prev => ({ ...prev, [field]: "" }));
        }
    };

    // Reset form to initial state
    const resetPaymentForm = () => {
        setNewPayment({
            date: "",
            days: "",
            clientId: "",
            clientName: "",
            amount: "",
            balanceAmount: "",
            typeOfPayment: "",
            timesheetID: "",
            status: "",
            receiptNo: "",
            remarks: "",
            __locked: false,
        });
        setClientSearch("");
        setClientList([]);
        setShowClientDropdown(false);
        setValidationErrors({});
    };

    // Validate form fields
    const validatePaymentForm = () => {
        const errors = {};
        
        if (!newPayment.date.trim()) errors.date = "Date is required";
        if (!newPayment.days) errors.days = "Days is required";
        
        const days = parseInt(newPayment.days);
        if (!newPayment.days || isNaN(days) || days <= 0) errors.days = "Enter valid number of days";
        
        if (!newPayment.clientId.trim()) errors.clientId = "Client ID is required";
        if (!newPayment.clientName.trim()) errors.clientName = "Client name is required";
        
        const amount = parseInt(newPayment.amount.replace(/\D/g, ""));
        if (!newPayment.amount || isNaN(amount) || amount <= 0) errors.amount = "Enter valid amount";
        
        if (!newPayment.typeOfPayment) errors.typeOfPayment = "Payment type is required";
        if (!newPayment.status) errors.status = "Payment purpose is required";

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Format currency
    const formatCurrency = (amount) => {
        const num = parseInt(amount) || 0;
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(num);
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

    // Add new payment
    const handleAddPayment = () => {
        if (!validatePaymentForm()) {
            return;
        }

        const paymentData = {
            ...newPayment,
            amount: parseInt(newPayment.amount.replace(/\D/g, "")) || 0,
            balanceAmount: parseInt(newPayment.balanceAmount.replace(/\D/g, "")) || 0,
            days: parseInt(newPayment.days) || 0
        };

        const paymentWithAudit = addAuditStamp(paymentData);

        setFormData(prev => ({
            ...prev,
            payments: [...(prev.payments || []), paymentWithAudit]
        }));

        setHasUnsavedChanges(true);
        setShowPaymentForm(false);
        resetPaymentForm();
    };

    // Open add payment modal
    const openAddPaymentModal = () => {
        resetPaymentForm();
        setShowPaymentForm(true);
    };

    // Close add payment modal
    const closeAddPaymentModal = () => {
        setShowPaymentForm(false);
        resetPaymentForm();
    };

    // Remove payment
    const handleRemovePayment = (index) => {
        if (formData.payments?.[index]?.__locked) {
            alert("This payment is locked and cannot be removed.");
            return;
        }

        if (window.confirm("Are you sure you want to remove this payment?")) {
            setFormData(prev => {
                const updatedPayments = [...(prev.payments || [])];
                updatedPayments.splice(index, 1);
                return { ...prev, payments: updatedPayments };
            });
            setHasUnsavedChanges(true);
        }
    };

    // Calculate totals
    const calculateTotals = () => {
        const payments = formData.payments || [];
        return payments.reduce((totals, payment) => {
            totals.totalAmount += parseInt(payment.amount) || 0;
            totals.totalBalance += parseInt(payment.balanceAmount) || 0;
            return totals;
        }, { totalAmount: 0, totalBalance: 0 });
    };

    const totals = calculateTotals();
    const payments = formData.payments || [];

    return (
        <>
            {/* Add Payment Modal */}
            {showPaymentForm && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content bg-dark text-light border border-secondary">
                            <div className="modal-header bg-dark border-secondary">
                                <h5 className="modal-title d-flex align-items-center">
                                    <i className="bi bi-plus-circle text-info me-2"></i>
                                    <span className="text-light">Add New Payment</span>
                                </h5>
                                <button 
                                    type="button" 
                                    className="btn-close btn-close-white" 
                                    onClick={closeAddPaymentModal}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="row g-3">
                                    {/* Date and Days in one row */}
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold text-light">
                                            <i className="bi bi-calendar text-info me-1"></i>
                                            Date <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            className={`form-control bg-dark text-light border-secondary ${validationErrors.date ? 'is-invalid' : ''}`}
                                            value={newPayment.date}
                                            min={PAY_MIN}
                                            max={PAY_MAX}
                                            onChange={(e) => updateNewPayment("date", e.target.value)}
                                        />
                                        {validationErrors.date && (
                                            <div className="invalid-feedback">{validationErrors.date}</div>
                                        )}
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold text-light">
                                            <i className="bi bi-calendar-day text-info me-1"></i>
                                            Days <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            className={`form-control bg-dark text-light border-secondary ${validationErrors.days ? 'is-invalid' : ''}`}
                                            value={newPayment.days}
                                            min="1"
                                            max="31"
                                            onChange={(e) => updateNewPayment("days", e.target.value)}
                                            placeholder="Days"
                                        />
                                        {validationErrors.days && (
                                            <div className="invalid-feedback">{validationErrors.days}</div>
                                        )}
                                    </div>

                                    {/* Client ID and Name in separate inputs */}
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold text-light">
                                            <i className="bi bi-person-badge text-info me-1"></i>
                                            Client ID <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className={`form-control bg-dark text-light border-secondary ${validationErrors.clientId ? 'is-invalid' : ''}`}
                                            value={newPayment.clientId}
                                            onChange={(e) => handleClientIdChange(e.target.value)}
                                            placeholder="Enter Client ID (e.g., CL001)"
                                        />
                                        {validationErrors.clientId && (
                                            <div className="invalid-feedback">{validationErrors.clientId}</div>
                                        )}
                                        {newPayment.clientId && newPayment.clientName && (
                                            <div className="mt-2 p-2 border border-success rounded bg-dark">
                                                <div className="d-flex align-items-center">
                                                    <i className="bi bi-check-circle text-success me-2"></i>
                                                    <div>
                                                        <small className="text-muted">Auto-filled from ID:</small>
                                                        <div className="text-success fw-bold">{newPayment.clientName}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold text-light">
                                            <i className="bi bi-person text-info me-1"></i>
                                            Client Name <span className="text-danger">*</span>
                                        </label>
                                        <div className="position-relative">
                                            <input
                                                type="text"
                                                className={`form-control bg-dark text-light border-secondary ${validationErrors.clientName ? 'is-invalid' : ''}`}
                                                value={newPayment.clientName}
                                                onChange={(e) => updateNewPayment("clientName", e.target.value)}
                                                onFocus={() => setShowClientDropdown(true)}
                                                placeholder="Enter Client Name or Search..."
                                            />
                                            {validationErrors.clientName && (
                                                <div className="invalid-feedback">{validationErrors.clientName}</div>
                                            )}

                                            {/* Client Search Dropdown */}
                                            {showClientDropdown && (
                                                <div 
                                                    className="position-absolute top-100 start-0 end-0 bg-dark border border-secondary rounded mt-1 z-3"
                                                    style={{ maxHeight: '250px', overflowY: 'auto' }}
                                                >
                                                    {/* Search input inside dropdown */}
                                                    <div className="p-2 border-bottom border-secondary">
                                                        <div className="input-group input-group-sm">
                                                            <span className="input-group-text bg-dark border-secondary">
                                                                <i className="bi bi-search text-info"></i>
                                                            </span>
                                                            <input
                                                                type="text"
                                                                className="form-control bg-dark text-white border-secondary"
                                                                placeholder="Search by name or ID..."
                                                                value={clientSearch}
                                                                onChange={(e) => handleClientSearchChange(e.target.value)}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Client list */}
                                                    {filteredClients.map(client => (
                                                        <div
                                                            key={client.id}
                                                            className={`p-2 border-bottom border-secondary hover-bg-secondary`}
                                                            onClick={() => selectClient(client)}
                                                            style={{cursor:'pointer'}}
                                                        >
                                                            <div className="d-flex justify-content-between align-items-center">
                                                                <div>
                                                                    <strong className="text-white">{client.name}</strong>
                                                                    <div className="text-info small">
                                                                        ID: {client.id}
                                                                    </div>
                                                                </div>
                                                                <div className="text-end">
                                                                    <div className="text-muted small">{client.phone}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    
                                                    {filteredClients.length === 0 && clientSearch && (
                                                        <div className="p-3 text-muted text-center">
                                                            No clients found for "{clientSearch}"
                                                        </div>
                                                    )}
                                                    
                                                    {!clientSearch && (
                                                        <div className="p-3 text-muted text-center">
                                                            Start typing to search clients
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Amount and Balance in one row */}
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold text-light">
                                            <i className="bi bi-cash text-info me-1"></i>
                                            Amount <span className="text-danger">*</span>
                                        </label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-dark text-light border-secondary">₹</span>
                                            <input
                                                type="text"
                                                className={`form-control bg-dark text-light border-secondary ${validationErrors.amount ? 'is-invalid' : ''}`}
                                                value={newPayment.amount}
                                                onChange={(e) => updateNewPayment("amount", e.target.value.replace(/\D/g, ""))}
                                                placeholder="Amount"
                                            />
                                        </div>
                                        {validationErrors.amount && (
                                            <div className="invalid-feedback">{validationErrors.amount}</div>
                                        )}
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold text-light">
                                            <i className="bi bi-wallet text-info me-1"></i>
                                            Balance Amount
                                        </label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-dark text-light border-secondary">₹</span>
                                            <input
                                                type="text"
                                                className="form-control bg-dark text-light border-secondary"
                                                value={newPayment.balanceAmount}
                                                onChange={(e) => updateNewPayment("balanceAmount", e.target.value.replace(/\D/g, ""))}
                                                placeholder="Balance"
                                            />
                                        </div>
                                    </div>

                                    {/* Payment Type and Payment For */}
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold text-light">
                                            <i className="bi bi-credit-card text-info me-1"></i>
                                            Payment Type <span className="text-danger">*</span>
                                        </label>
                                        <select
                                            className={`form-select bg-dark text-light border-secondary ${validationErrors.typeOfPayment ? 'is-invalid' : ''}`}
                                            value={newPayment.typeOfPayment}
                                            onChange={(e) => updateNewPayment("typeOfPayment", e.target.value)}
                                        >
                                            <option value="" className="bg-dark">Select Type</option>
                                            {paymentTypes.map(type => (
                                                <option key={type.value} value={type.value} className="bg-dark">
                                                    {type.label}
                                                </option>
                                            ))}
                                        </select>
                                        {validationErrors.typeOfPayment && (
                                            <div className="invalid-feedback">{validationErrors.typeOfPayment}</div>
                                        )}
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold text-light">
                                            <i className="bi bi-tag text-info me-1"></i>
                                            Payment For <span className="text-danger">*</span>
                                        </label>
                                        <select
                                            className={`form-select bg-dark text-light border-secondary ${validationErrors.status ? 'is-invalid' : ''}`}
                                            value={newPayment.status}
                                            onChange={(e) => updateNewPayment("status", e.target.value)}
                                        >
                                            <option value="" className="bg-dark">Select Purpose</option>
                                            {paymentForOptions.map(option => (
                                                <option key={option.value} value={option.value} className="bg-dark">
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                        {validationErrors.status && (
                                            <div className="invalid-feedback">{validationErrors.status}</div>
                                        )}
                                    </div>

                                    {/* Receipt No and Timesheet ID */}
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold text-light">
                                            <i className="bi bi-receipt text-info me-1"></i>
                                            Receipt Number
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control bg-dark text-light border-secondary"
                                            value={newPayment.receiptNo}
                                            onChange={(e) => updateNewPayment("receiptNo", e.target.value)}
                                            placeholder="Enter receipt number"
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold text-light">
                                            <i className="bi bi-clock-history text-info me-1"></i>
                                            Timesheet ID
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control bg-dark text-light border-secondary"
                                            value={newPayment.timesheetID}
                                            onChange={(e) => updateNewPayment("timesheetID", e.target.value)}
                                            placeholder="Enter timesheet ID"
                                        />
                                    </div>

                                    {/* Remarks */}
                                    <div className="col-12">
                                        <label className="form-label fw-semibold text-light">
                                            <i className="bi bi-chat-left-text text-info me-1"></i>
                                            Remarks
                                        </label>
                                        <textarea
                                            className="form-control bg-dark text-light border-secondary"
                                            rows="3"
                                            value={newPayment.remarks}
                                            onChange={(e) => updateNewPayment("remarks", e.target.value)}
                                            placeholder="Any additional remarks..."
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer bg-dark border-secondary">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={closeAddPaymentModal}
                                >
                                    <i className="bi bi-x-lg me-1"></i> Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-info text-dark"
                                    onClick={handleAddPayment}
                                >
                                    <i className="bi bi-check-lg me-1"></i> Add Payment
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Payment Component */}
            <div className="card bg-dark text-light border-secondary">
                <div className="card-header bg-dark border-secondary d-flex justify-content-between align-items-center">
                    <h4 className="mb-0 d-flex align-items-center">
                        <i className="bi bi-cash-coin text-info me-2"></i>
                        <span className="text-light">Payments</span>
                    </h4>
                    {canEdit && (
                        <button
                            type="button"
                            className="btn btn-info btn-sm text-dark"
                            onClick={openAddPaymentModal}
                        >
                            <i className="bi bi-plus-lg me-1"></i>
                            Add Payment
                        </button>
                    )}
                </div>

                <div className="card-body">
                    {/* Summary Cards */}
                    {payments.length > 0 && (
                        <div className="row g-3 mb-4">
                            <div className="col-md-4">
                                <div className="card bg-secondary">
                                    <div className="card-body text-center py-3">
                                        <div className="text-light-50 small">Total Payments</div>
                                        <div className="h3 text-info fw-bold">{payments.length}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="card bg-success">
                                    <div className="card-body text-center py-3">
                                        <div className="small">Total Amount</div>
                                        <div className="h3 fw-bold">{formatCurrency(totals.totalAmount)}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className={`card ${totals.totalBalance > 0 ? 'bg-danger' : 'bg-success'}`}>
                                    <div className="card-body text-center py-3">
                                        <div className="small">Total Balance</div>
                                        <div className="h3 fw-bold">{formatCurrency(totals.totalBalance)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Payments Table */}
                    {payments.length === 0 ? (
                        <div className="alert alert-info text-center border-secondary">
                            <i className="bi bi-info-circle text-info me-2"></i>
                            <span className="text-light">No payments recorded yet. Click "Add Payment" to get started.</span>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-dark table-hover table-bordered align-middle border-secondary">
                                <thead className="bg-secondary">
                                    <tr>
                                        <th width="40">#</th>
                                        <th width="120">Date</th>
                                        <th width="100">Days</th>
                                        <th width="100">Client ID</th>
                                        <th>Client Name</th>
                                        <th width="120">Amount</th>
                                        <th width="120">Balance</th>
                                        <th width="100">Type</th>
                                        <th width="100">For</th>
                                        <th width="120">Receipt</th>
                                        <th width="120">Timesheet ID</th>
                                        <th>Remarks</th>
                                        <th width="140">Added By</th>
                                        {canEdit && <th width="90">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.map((payment, index) => (
                                        <tr key={index} className={payment.__locked ? "bg-secondary" : ""}>
                                            <td className="text-center fw-semibold">{index + 1}</td>
                                            <td>
                                                <span className="badge bg-info text-dark">{formatDateDisplay(payment.date)}</span>
                                            </td>
                                            <td className="text-center">
                                                <span className="badge bg-dark border border-info">{payment.days || "—"}</span>
                                            </td>
                                            <td className="fw-semibold text-info">{payment.clientId || "—"}</td>
                                            <td className="fw-semibold">{payment.clientName || "—"}</td>
                                            <td className="text-end fw-bold text-success">
                                                {formatCurrency(payment.amount)}
                                            </td>
                                            <td className="text-end">
                                                <span className={`fw-bold ${payment.balanceAmount > 0 ? 'text-danger' : 'text-success'}`}>
                                                    {formatCurrency(payment.balanceAmount)}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${
                                                    payment.typeOfPayment === 'cash' ? 'bg-success' :
                                                    payment.typeOfPayment === 'online' ? 'bg-info text-dark' :
                                                    'bg-secondary'
                                                }`}>
                                                    {payment.typeOfPayment || "—"}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="badge bg-warning text-dark">
                                                    {payment.status || "—"}
                                                </span>
                                            </td>
                                            <td>
                                                {payment.receiptNo ? (
                                                    <span className="badge bg-dark border border-info">#{payment.receiptNo}</span>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>
                                            <td>
                                                {payment.timesheetID ? (
                                                    <small className="text-muted">#{payment.timesheetID}</small>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>
                                            <td style={{ maxWidth: '200px' }}>
                                                <div className="text-truncate" title={payment.remarks}>
                                                    {payment.remarks || "—"}
                                                </div>
                                            </td>
                                            <td className="small">
                                                <div className="fw-semibold text-info">{payment.addedByName || payment.createdByName || effectiveUserName}</div>
                                                <div className="text-light-50">
                                                    {formatDDMMYY(payment.addedAt || payment.createdAt)}<br />
                                                    {formatTime12h(payment.addedAt || payment.createdAt)}
                                                </div>
                                            </td>
                                            {canEdit && (
                                                <td>
                                                    {!payment.__locked ? (
                                                        <button
                                                            className="btn btn-outline-danger btn-sm"
                                                            onClick={() => handleRemovePayment(index)}
                                                            title="Remove payment"
                                                        >
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    ) : (
                                                        <span className="badge bg-secondary" title="Locked payment">
                                                            <i className="bi bi-lock me-1"></i>Locked
                                                        </span>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-secondary">
                                    <tr className="fw-bold">
                                        <td colSpan="2" className="text-end">Totals:</td>
                                        <td className="text-center">
                                            {payments.reduce((sum, p) => sum + (parseInt(p.days) || 0), 0)}
                                        </td>
                                        <td colSpan="2"></td>
                                        <td className="text-end text-success">{formatCurrency(totals.totalAmount)}</td>
                                        <td className="text-end">
                                            <span className={totals.totalBalance > 0 ? 'text-danger' : 'text-success'}>
                                                {formatCurrency(totals.totalBalance)}
                                            </span>
                                        </td>
                                        <td colSpan={canEdit ? "6" : "5"} className="text-center">
                                            <span className="badge bg-dark border border-info">
                                                Total Records: {payments.length}
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

export default Payment;