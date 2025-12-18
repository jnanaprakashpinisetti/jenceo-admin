import React, { useState } from "react";

const Payment = ({
    formData,
    setFormData,
    canEdit,
    PAY_MIN,
    PAY_MAX,
    effectiveUserName,
    formatDDMMYY,
    formatTime12h,
    setHasUnsavedChanges
}) => {
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const [newPayment, setNewPayment] = useState({
        date: "",
        clientName: "",
        days: "",
        amount: "",
        balanceAmount: "",
        typeOfPayment: "",
        timesheetID: "",
        status: "",
        receiptNo: "",
        remarks: "",
        __locked: false,
    });

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
            clientName: "",
            days: "",
            amount: "",
            balanceAmount: "",
            typeOfPayment: "",
            timesheetID: "",
            status: "",
            receiptNo: "",
            remarks: "",
            __locked: false,
        });
        setValidationErrors({});
    };

    // Validate form fields
    const validatePaymentForm = () => {
        const errors = {};
        
        if (!newPayment.date.trim()) errors.date = "Date is required";
        if (!newPayment.clientName.trim()) errors.clientName = "Client name is required";
        
        const days = parseInt(newPayment.days);
        if (!newPayment.days || isNaN(days) || days <= 0) errors.days = "Enter valid number of days";
        
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

    // Add stamp with user info and timestamp
    const addAuditStamp = (row) => {
        const timestamp = new Date().toISOString();
        return {
            ...row,
            addedByName: effectiveUserName,
            addedAt: timestamp,
            createdByName: effectiveUserName,
            createdAt: timestamp,
            // Format amount for display
            formattedAmount: formatCurrency(row.amount),
            formattedBalance: formatCurrency(row.balanceAmount)
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
        <div className="card">
            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                <h4 className="mb-0">
                    <i className="bi bi-cash-coin me-2"></i>
                    Payments
                </h4>
                {canEdit && (
                    <button
                        type="button"
                        className={`btn btn-sm ${showPaymentForm ? 'btn-outline-light' : 'btn-light'}`}
                        onClick={() => {
                            setShowPaymentForm(!showPaymentForm);
                            if (showPaymentForm) resetPaymentForm();
                        }}
                    >
                        <i className={`bi ${showPaymentForm ? 'bi-x-lg' : 'bi-plus-lg'} me-1`}></i>
                        {showPaymentForm ? "Close Form" : "Add Payment"}
                    </button>
                )}
            </div>

            <div className="card-body">
                {/* Add Payment Form */}
                {canEdit && showPaymentForm && (
                    <div className="card border-primary mb-4">
                        <div className="card-header bg-light">
                            <h5 className="mb-0 text-primary">
                                <i className="bi bi-plus-circle me-2"></i>
                                Add New Payment
                            </h5>
                        </div>
                        <div className="card-body">
                            <div className="row g-3">
                                {/* Date */}
                                <div className="col-md-4 col-lg-3">
                                    <label className="form-label fw-semibold">
                                        Date <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        className={`form-control ${validationErrors.date ? 'is-invalid' : ''}`}
                                        value={newPayment.date}
                                        min={PAY_MIN}
                                        max={PAY_MAX}
                                        onChange={(e) => updateNewPayment("date", e.target.value)}
                                    />
                                    {validationErrors.date && (
                                        <div className="invalid-feedback">{validationErrors.date}</div>
                                    )}
                                </div>

                                {/* Client Name */}
                                <div className="col-md-8 col-lg-5">
                                    <label className="form-label fw-semibold">
                                        Client Name <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className={`form-control ${validationErrors.clientName ? 'is-invalid' : ''}`}
                                        value={newPayment.clientName}
                                        onChange={(e) => updateNewPayment("clientName", e.target.value)}
                                        placeholder="Enter client name"
                                    />
                                    {validationErrors.clientName && (
                                        <div className="invalid-feedback">{validationErrors.clientName}</div>
                                    )}
                                </div>

                                {/* Days */}
                                <div className="col-md-4 col-lg-2">
                                    <label className="form-label fw-semibold">
                                        Days <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        className={`form-control ${validationErrors.days ? 'is-invalid' : ''}`}
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

                                {/* Amount */}
                                <div className="col-md-4 col-lg-3">
                                    <label className="form-label fw-semibold">
                                        Amount <span className="text-danger">*</span>
                                    </label>
                                    <div className="input-group">
                                        <span className="input-group-text">₹</span>
                                        <input
                                            type="text"
                                            className={`form-control ${validationErrors.amount ? 'is-invalid' : ''}`}
                                            value={newPayment.amount}
                                            onChange={(e) => updateNewPayment("amount", e.target.value.replace(/\D/g, ""))}
                                            placeholder="Amount"
                                        />
                                    </div>
                                    {validationErrors.amount && (
                                        <div className="invalid-feedback">{validationErrors.amount}</div>
                                    )}
                                </div>

                                {/* Balance */}
                                <div className="col-md-4 col-lg-3">
                                    <label className="form-label fw-semibold">Balance Amount</label>
                                    <div className="input-group">
                                        <span className="input-group-text">₹</span>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={newPayment.balanceAmount}
                                            onChange={(e) => updateNewPayment("balanceAmount", e.target.value.replace(/\D/g, ""))}
                                            placeholder="Balance"
                                        />
                                    </div>
                                </div>

                                {/* Payment Type */}
                                <div className="col-md-6 col-lg-4">
                                    <label className="form-label fw-semibold">
                                        Payment Type <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        className={`form-select ${validationErrors.typeOfPayment ? 'is-invalid' : ''}`}
                                        value={newPayment.typeOfPayment}
                                        onChange={(e) => updateNewPayment("typeOfPayment", e.target.value)}
                                    >
                                        <option value="">Select Type</option>
                                        {paymentTypes.map(type => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                    {validationErrors.typeOfPayment && (
                                        <div className="invalid-feedback">{validationErrors.typeOfPayment}</div>
                                    )}
                                </div>

                                {/* Payment For */}
                                <div className="col-md-6 col-lg-4">
                                    <label className="form-label fw-semibold">
                                        Payment For <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        className={`form-select ${validationErrors.status ? 'is-invalid' : ''}`}
                                        value={newPayment.status}
                                        onChange={(e) => updateNewPayment("status", e.target.value)}
                                    >
                                        <option value="">Select Purpose</option>
                                        {paymentForOptions.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    {validationErrors.status && (
                                        <div className="invalid-feedback">{validationErrors.status}</div>
                                    )}
                                </div>

                                {/* Receipt No */}
                                <div className="col-md-6 col-lg-4">
                                    <label className="form-label fw-semibold">Receipt Number</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={newPayment.receiptNo}
                                        onChange={(e) => updateNewPayment("receiptNo", e.target.value)}
                                        placeholder="Enter receipt number"
                                    />
                                </div>

                                {/* Timesheet ID */}
                                <div className="col-md-6 col-lg-4">
                                    <label className="form-label fw-semibold">Timesheet ID</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={newPayment.timesheetID}
                                        onChange={(e) => updateNewPayment("timesheetID", e.target.value)}
                                        placeholder="Enter timesheet ID"
                                    />
                                </div>

                                {/* Remarks */}
                                <div className="col-12">
                                    <label className="form-label fw-semibold">Remarks</label>
                                    <textarea
                                        className="form-control"
                                        rows="2"
                                        value={newPayment.remarks}
                                        onChange={(e) => updateNewPayment("remarks", e.target.value)}
                                        placeholder="Any additional remarks..."
                                    />
                                </div>
                            </div>

                            <div className="d-flex justify-content-end gap-2 mt-4">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => {
                                        setShowPaymentForm(false);
                                        resetPaymentForm();
                                    }}
                                >
                                    <i className="bi bi-x-lg me-1"></i> Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleAddPayment}
                                >
                                    <i className="bi bi-check-lg me-1"></i> Add Payment
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Summary Cards */}
                {payments.length > 0 && (
                    <div className="row g-3 mb-4">
                        <div className="col-md-4">
                            <div className="card bg-light">
                                <div className="card-body text-center py-3">
                                    <div className="text-small small">Total Payments</div>
                                    <div className="h3 text-primary fw-bold">{payments.length}</div>
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
                    <div className="alert alert-info text-center text-info">
                        <i className="bi bi-info-circle me-2"></i>
                        No payments recorded yet. Click "Add Payment" to get started.
                    </div>
                ) : (
                    <>
                        <div className="table-responsive">
                            <table className="table table-hover table-bordered align-middle">
                                <thead className="table-dark">
                                    <tr>
                                        <th width="40">#</th>
                                        <th width="100">Date</th>
                                        <th>Client</th>
                                        <th width="70">Days</th>
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
                                        <tr key={index} className={payment.__locked ? "table-secondary" : ""}>
                                            <td className="text-center fw-semibold">{index + 1}</td>
                                            <td>
                                                <span className="badge bg-primary">{payment.date || "—"}</span>
                                            </td>
                                            <td className="fw-semibold">{payment.clientName || "—"}</td>
                                            <td className="text-center">
                                                <span className="badge bg-info">{payment.days || "—"}</span>
                                            </td>
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
                                                    payment.typeOfPayment === 'online' ? 'bg-info' :
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
                                                    <span className="badge bg-dark">#{payment.receiptNo}</span>
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
                                                <div className="fw-semibold">{payment.addedByName || payment.createdByName || effectiveUserName}</div>
                                                <div className="text-muted">
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
                                <tfoot className="table-active">
                                    <tr className="fw-bold">
                                        <td colSpan="3" className="text-end">Totals:</td>
                                        <td className="text-center">
                                            {payments.reduce((sum, p) => sum + (parseInt(p.days) || 0), 0)}
                                        </td>
                                        <td className="text-end text-success">{formatCurrency(totals.totalAmount)}</td>
                                        <td className="text-end">
                                            <span className={totals.totalBalance > 0 ? 'text-danger' : 'text-success'}>
                                                {formatCurrency(totals.totalBalance)}
                                            </span>
                                        </td>
                                        <td colSpan={canEdit ? "7" : "6"} className="text-center">
                                            <span className="badge bg-dark">
                                                Total Records: {payments.length}
                                            </span>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Payment;