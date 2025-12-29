import React, { useState, useEffect } from "react";

const PaymentTab = ({
  formData,
  editMode,
  setFormData,
  markDirty,
  usersMap,
  effectiveUserName,
  formatDDMMYY,
  formatTime12h,
  formatINR,
  bulkReminderDate,
  setBulkReminderDate
}) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [newPaymentData, setNewPaymentData] = useState({
    jenceoInvoiceNo: "",
    companyInvoiceNo: "",
    paymentMethod: "cash",
    date: new Date().toISOString().split('T')[0],
    paidAmount: "",
    balance: "",
    receptNo: "",
    reminderDate: "",
    employeeId: "",
    employeeName: "",
    remarks: ""
  });
  const [errors, setErrors] = useState({});

  const resolveAddedByFromUsers = (obj, users) => {
    if (!obj || !users) return "";
    const candidateIds = [
      obj.user_key, obj.userKey, obj.userId, obj.uid,
      obj.addedById, obj.createdById, obj.addedByUid, obj.createdByUid,
      obj.key, obj.ownerId
    ].filter(Boolean);
    for (const id of candidateIds) {
      const u = users[id];
      if (u) {
        const nm = u.name || u.displayName || u.username || u.email;
        if (nm) return String(nm).trim().replace(/@.*/, "");
      }
    }
    return "";
  };

  const resolveUserName = (obj, fallback) => {
    const tryKeys = [
      "addedByName", "addedBy", "userName", "username", "createdByName", "createdBy",
      "enteredBy", "enteredByName", "created_user", "updatedBy", "ownerName",
    ];
    for (const k of tryKeys) {
      const v = obj && obj[k];
      if (v && String(v).trim()) return String(v).trim().replace(/@.*/, "");
    }
    const u = obj && obj.user;
    if (u) {
      const tryUser = [u.name, u.displayName, u.username, u.email];
      for (const t of tryUser) {
        if (t && String(t).trim()) return String(t).trim().replace(/@.*/, "");
      }
    }
    return (fallback && String(fallback).trim()) || "System";
  };

  // Get all payments sorted by date descending (newest first)
  const allPayments = (formData?.payments || [])
    .map((p, originalIndex) => ({ ...p, originalIndex }));

  // For display: sort in descending order (newest first)
  const payments = [...allPayments].sort((a, b) => {
    const dateA = a.date ? new Date(a.date) : new Date(0);
    const dateB = b.date ? new Date(b.date) : new Date(0);
    return dateB - dateA;
  });

  // Get payments with reminders sorted by nearest date first
  const paymentsWithReminders = payments
    .filter(p => p.reminderDate)
    .sort((a, b) => {
      const dateA = a.reminderDate ? new Date(a.reminderDate) : new Date('9999-12-31');
      const dateB = b.reminderDate ? new Date(b.reminderDate) : new Date('9999-12-31');
      return dateA - dateB; // Nearest first
    });

  // Calculate totals
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0);
  const totalBalance = payments.reduce((sum, p) => sum + (Number(p.balance) || 0), 0);

  // Handle add payment
  const handleAddPayment = () => {
    const validationErrors = {};
    
    if (!newPaymentData.paidAmount || parseFloat(newPaymentData.paidAmount) <= 0) {
      validationErrors.paidAmount = "Paid Amount is required";
    }
    
    if (!newPaymentData.date) {
      validationErrors.date = "Date is required";
    }
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const now = new Date();
    const newPayment = {
      id: Date.now(),
      jenceoInvoiceNo: newPaymentData.jenceoInvoiceNo,
      companyInvoiceNo: newPaymentData.companyInvoiceNo,
      paymentMethod: newPaymentData.paymentMethod,
      paidAmount: newPaymentData.paidAmount,
      balance: newPaymentData.balance || "0",
      receptNo: newPaymentData.receptNo,
      remarks: newPaymentData.remarks,
      reminderDays: "",
      reminderDate: newPaymentData.reminderDate,
      date: newPaymentData.date,
      employeeId: newPaymentData.employeeId,
      employeeName: newPaymentData.employeeName,
      __locked: false,
      addedByName: effectiveUserName,
      addedAt: now.toISOString(),
      createdByName: effectiveUserName,
      createdAt: now.toISOString()
    };

    // Add new payment to form data
    setFormData(prev => {
      const payments = [...(prev.payments || []), newPayment];
      const next = { ...prev, payments };
      markDirty(next);
      return next;
    });

    // Reset form
    setNewPaymentData({
      jenceoInvoiceNo: "",
      companyInvoiceNo: "",
      paymentMethod: "cash",
      date: new Date().toISOString().split('T')[0],
      paidAmount: "",
      balance: "",
      receptNo: "",
      reminderDate: "",
      employeeId: "",
      employeeName: "",
      remarks: ""
    });
    setErrors({});
    setShowPaymentModal(false);
  };

  const handleNewPaymentChange = (e) => {
    const { name, value } = e.target;
    setNewPaymentData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  // Handle clear all reminders with confirmation
  const handleClearAllReminders = () => {
    if (window.confirm("Are you sure you want to clear all reminder dates from all payments?")) {
      setFormData(prev => {
        const payments = (prev.payments || []).map(p => ({
          ...p,
          reminderDate: "",
          reminderDays: ""
        }));
        const next = { ...prev, payments };
        markDirty(next);
        return next;
      });
    }
  };

  // Handle remove payment
  const handleRemovePayment = (originalIndex) => {
    if (window.confirm("Are you sure you want to remove this payment?")) {
      setFormData(prev => {
        const payments = prev.payments.filter((p, idx) => idx !== originalIndex);
        const next = { ...prev, payments };
        markDirty(next);
        return next;
      });
    }
  };

  // Handle update last reminder date
  const handleUpdateLastReminderDate = () => {
    if (!bulkReminderDate) return;
    
    setFormData(prev => {
      const payments = [...(prev.payments || [])];
      if (payments.length > 0) {
        payments[payments.length - 1] = {
          ...payments[payments.length - 1],
          reminderDate: bulkReminderDate
        };
      }
      const next = { ...prev, payments };
      markDirty(next);
      return next;
    });
    
    setBulkReminderDate("");
  };

  // Get last balance
  const getLastPaymentBalance = () => {
    if (!payments || payments.length === 0) return 0;
    return Number(payments[0].balance || 0);
  };

  return (
    <div>
      {/* Stats Overview Cards */}
      <div className="row mb-4">
        <div className="col-md-3 col-sm-6 mb-3">
          <div className="card bg-gradient-primary text-white shadow border-0">
            <div className="card-header bg-primary bg-opacity-25 border-0 pb-2">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-white-50 mb-1">Total Payments</h6>
                  <h4 className="mb-0">{payments.length}</h4>
                </div>
                <div className="icon-circle bg-white-10">
                  <i className="bi bi-cash-coin text-white"></i>
                </div>
              </div>
            </div>
            <div className="card-body py-2">
              <small className="opacity-75">
                {paymentsWithReminders.length} with reminders
              </small>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-sm-6 mb-3">
          <div className="card bg-gradient-success text-white shadow border-0">
            <div className="card-header bg-success bg-opacity-25 border-0 pb-2">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-white-50 mb-1">Total Received</h6>
                  <h4 className="mb-0">{formatINR(totalPaid)}</h4>
                </div>
                <div className="icon-circle bg-white-10">
                  <i className="bi bi-wallet2 text-white"></i>
                </div>
              </div>
            </div>
            <div className="card-body py-2">
              <small className="opacity-75">
                Avg: {formatINR(payments.length > 0 ? totalPaid / payments.length : 0)}
              </small>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-sm-6 mb-3">
          <div className="card bg-gradient-warning text-white shadow border-0">
            <div className="card-header bg-warning bg-opacity-25 border-0 pb-2">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-white-50 mb-1">Balance Due</h6>
                  <h4 className="mb-0">{formatINR(totalBalance)}</h4>
                </div>
                <div className="icon-circle bg-white-10">
                  <i className="bi bi-clock text-white"></i>
                </div>
              </div>
            </div>
            <div className="card-body py-2">
              <small className="opacity-75">
                Last: {formatINR(getLastPaymentBalance())}
              </small>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-sm-6 mb-3">
          <div className="card bg-gradient-info text-white shadow border-0">
            <div className="card-header bg-info bg-opacity-25 border-0 pb-2">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-white-50 mb-1">Pending</h6>
                  <h4 className="mb-0">{payments.filter(p => Number(p.balance || 0) > 0).length}</h4>
                </div>
                <div className="icon-circle bg-white-10">
                  <i className="bi bi-hourglass-split text-white"></i>
                </div>
              </div>
            </div>
            <div className="card-body py-2">
              <small className="opacity-75">
                {paymentsWithReminders.length} reminders set
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {editMode && (
        <div className="row mb-4">
          <div className="col-md-12 mb-2">
            <button
              className="btn btn-primary btn-lg w-100 d-flex align-items-center justify-content-center"
              onClick={() => setShowPaymentModal(true)}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Add Payment
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions Bar */}
      {editMode && payments.length > 0 && (
        <div className="card shadow-sm mb-4 border-primary">
          <div className="card-header bg-primary text-white">
            <h6 className="mb-0">
              <i className="bi bi-lightning-charge me-2"></i>
              Quick Actions
            </h6>
          </div>
          <div className="card-body">
            <div className="d-flex flex-wrap gap-3 align-items-center">
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={handleClearAllReminders}
                title="Clear reminder date from all payments"
              >
                <i className="bi bi-calendar-x me-1"></i>
                Clear All Reminders
              </button>

              <div className="d-flex align-items-center gap-2">
                <span className="text-muted">Set Reminder:</span>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  style={{ width: '180px' }}
                  value={bulkReminderDate}
                  onChange={(e) => setBulkReminderDate(e.target.value)}
                />

                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={handleUpdateLastReminderDate}
                  disabled={!bulkReminderDate}
                  title="Set reminder date on the latest payment row"
                >
                  <i className="bi bi-calendar-check me-1"></i>
                  Apply to Last
                </button>
              </div>
            </div>

            {/* Upcoming Reminders */}
            {paymentsWithReminders.length > 0 && (
              <div className="mt-3 pt-3 border-top">
                <h6 className="text-primary mb-2">
                  <i className="bi bi-bell me-1"></i>
                  Upcoming Reminders
                </h6>
                <div className="d-flex flex-wrap gap-2">
                  {paymentsWithReminders.slice(0, 3).map((p, idx) => (
                    <div key={idx} className="badge bg-info text-dark">
                      {formatDDMMYY(p.reminderDate)} - {formatINR(p.paidAmount)}
                    </div>
                  ))}
                  {paymentsWithReminders.length > 3 && (
                    <span className="badge bg-secondary">
                      +{paymentsWithReminders.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white border-bottom">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="bi bi-clock-history me-2"></i>
              Payment History ({payments.length})
            </h5>
            {editMode && payments.length > 0 && (
              <button
                className="btn btn-outline-primary btn-sm"
                onClick={() => setShowPaymentModal(true)}
              >
                <i className="bi bi-plus-circle me-1"></i>
                Add Payment
              </button>
            )}
          </div>
        </div>

        <div className="card-body">
          {payments.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-wallet2 text-muted" style={{ fontSize: '3rem' }}></i>
              <h5 className="mt-3 text-muted">No Payments Yet</h5>
              <p className="text-muted">Start by adding your first payment</p>
              {editMode && (
                <button
                  className="btn btn-primary mt-2"
                  onClick={() => setShowPaymentModal(true)}
                >
                  <i className="bi bi-plus-circle me-1"></i>
                  Add First Payment
                </button>
              )}
            </div>
          ) : (
            <div className="row g-3">
              {payments.map((p, idx) => {
                const locked = !!p.__locked;
                const addedByDisplay = p.addedByName ||
                  resolveUserName(p) ||
                  resolveAddedByFromUsers(p, usersMap) ||
                  effectiveUserName;

                const addedAtDisplay = p.addedAt || p.timestamp || p.createdAt || p.date || "";
                const hasReminder = p.reminderDate;

                return (
                  <div key={p.originalIndex} className="col-md-6 col-lg-4">
                    <div className={`card h-100 border shadow-sm hover-lift ${hasReminder ? 'border-info' : Number(p.balance || 0) > 0 ? 'border-warning' : 'border-success'}`}>
                      <div className={`card-header ${hasReminder ? 'bg-info' : Number(p.balance || 0) > 0 ? 'bg-warning' : 'bg-success'} d-flex justify-content-between align-items-center py-2 text-white`}>
                        <div className="d-flex align-items-center gap-2">
                          <span className="badge bg-dark">#{payments.length - idx}</span>
                          {hasReminder && (
                            <span className="badge bg-light text-dark">
                              <i className="bi bi-bell me-1"></i>
                              Reminder
                            </span>
                          )}
                          {Number(p.balance || 0) > 0 && (
                            <span className="badge bg-danger text-white">
                              <i className="bi bi-clock me-1"></i>
                              Balance: {formatINR(p.balance)}
                            </span>
                          )}
                        </div>
                        {editMode && !locked && (
                          <button
                            className="btn btn-sm btn-outline-light"
                            onClick={() => handleRemovePayment(p.originalIndex)}
                            title="Remove payment"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        )}
                      </div>

                      <div className="card-body p-3">
                        {/* Invoice Numbers */}
                        {(p.jenceoInvoiceNo || p.companyInvoiceNo) && (
                          <div className="row g-2 mb-3">
                            {p.jenceoInvoiceNo && (
                              <div className="col-6">
                                <small className="text-muted d-block">JenCeo Invoice</small>
                                <div className="fw-semibold text-primary">
                                  {p.jenceoInvoiceNo}
                                </div>
                              </div>
                            )}
                            {p.companyInvoiceNo && (
                              <div className="col-6">
                                <small className="text-muted d-block">Company Invoice</small>
                                <div className="fw-semibold text-info">
                                  {p.companyInvoiceNo}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Employee Info */}
                        {(p.employeeId || p.employeeName) && (
                          <div className="row g-2 mb-3">
                            {p.employeeId && (
                              <div className="col-6">
                                <small className="text-muted d-block">Employee ID</small>
                                <div className="fw-semibold">
                                  {p.employeeId}
                                </div>
                              </div>
                            )}
                            {p.employeeName && (
                              <div className="col-6">
                                <small className="text-muted d-block">Employee Name</small>
                                <div className="fw-semibold">
                                  {p.employeeName}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="row g-2 mb-3">
                          <div className="col-6">
                            <small className="text-muted d-block">Method</small>
                            <span className={`badge ${p.paymentMethod === 'online' ? 'bg-primary' : p.paymentMethod === 'check' ? 'bg-info' : 'bg-success'}`}>
                              {p.paymentMethod || "Cash"}
                            </span>
                          </div>
                          <div className="col-6">
                            <small className="text-muted d-block">Date</small>
                            <div className="fw-semibold">
                              {p.date ? formatDDMMYY(p.date) : "—"}
                            </div>
                          </div>
                        </div>

                        <div className="row g-2 mb-3">
                          <div className="col-6">
                            <small className="text-muted d-block">Paid Amount</small>
                            <h5 className="text-success mb-0">
                              {formatINR(p.paidAmount)}
                            </h5>
                          </div>
                          <div className="col-6">
                            <small className="text-muted d-block">Balance</small>
                            <h5 className={`mb-0 ${Number(p.balance || 0) > 0 ? 'text-danger fw-bold' : 'text-success'}`}>
                              {formatINR(p.balance)}
                            </h5>
                          </div>
                        </div>

                        <div className="row g-2">
                          <div className="col-6">
                            <small className="text-muted d-block">Receipt No</small>
                            <div className="fw-semibold">
                              {p.receptNo || "—"}
                            </div>
                          </div>
                          <div className="col-6">
                            <small className="text-muted d-block">
                              <i className="bi bi-bell me-1"></i>
                              Reminder
                            </small>
                            <div className="small">
                              {p.reminderDate ? formatDDMMYY(p.reminderDate) : "—"}
                            </div>
                          </div>
                        </div>

                        {p.remarks && (
                          <div className="mt-3 pt-2 border-top">
                            <small className="text-muted d-block">Remarks</small>
                            <div className="small text-muted">{p.remarks}</div>
                          </div>
                        )}

                        <div className="mt-3 pt-2 border-top">
                          <small className="text-muted d-flex justify-content-between">
                            <span>
                              <i className="bi bi-person-circle me-1"></i>
                              {addedByDisplay}
                            </span>
                            <span>
                              <i className="bi bi-clock me-1"></i>
                              {formatDDMMYY(addedAtDisplay)} {formatTime12h(addedAtDisplay)}
                            </span>
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Payment Modal */}
      {showPaymentModal && (
        <div className="modal-backdrop-custom" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-card-custom modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom bg-primary text-white">
              <h5 className="mb-0">
                <i className="bi bi-plus-circle me-2"></i>
                Add New Payment
              </h5>
              <button className="btn-close-custom" onClick={() => setShowPaymentModal(false)}>
                <i className="bi bi-x-lg text-white"></i>
              </button>
            </div>
            <div className="modal-body-custom">
              <div className="row g-3">
                {/* Invoice Numbers */}
                <div className="col-md-6">
                  <label className="form-label"><strong>JenCeo Invoice No</strong></label>
                  <input
                    className="form-control"
                    name="jenceoInvoiceNo"
                    type="text"
                    placeholder="JenCeo invoice number"
                    value={newPaymentData.jenceoInvoiceNo}
                    onChange={handleNewPaymentChange}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label"><strong>Company Invoice No</strong></label>
                  <input
                    className="form-control"
                    name="companyInvoiceNo"
                    type="text"
                    placeholder="Company invoice number"
                    value={newPaymentData.companyInvoiceNo}
                    onChange={handleNewPaymentChange}
                  />
                </div>

                {/* Payment Method and Date */}
                <div className="col-md-6">
                  <label className="form-label"><strong>Payment Method</strong></label>
                  <select
                    className="form-control"
                    name="paymentMethod"
                    value={newPaymentData.paymentMethod}
                    onChange={handleNewPaymentChange}
                  >
                    <option value="cash">Cash</option>
                    <option value="online">Online</option>
                    <option value="check">Check</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label"><strong>Date</strong> <span className="text-danger">*</span></label>
                  <input
                    className={`form-control ${errors.date ? 'is-invalid' : ''}`}
                    name="date"
                    type="date"
                    value={newPaymentData.date}
                    onChange={handleNewPaymentChange}
                    required
                  />
                  {errors.date && (
                    <div className="invalid-feedback">{errors.date}</div>
                  )}
                </div>

                {/* Amount Fields */}
                <div className="col-md-6">
                  <label className="form-label"><strong>Paid Amount</strong> <span className="text-danger">*</span></label>
                  <input
                    className={`form-control ${errors.paidAmount ? 'is-invalid' : ''}`}
                    name="paidAmount"
                    type="number"
                    placeholder="Enter amount"
                    value={newPaymentData.paidAmount}
                    onChange={handleNewPaymentChange}
                    required
                  />
                  {errors.paidAmount && (
                    <div className="invalid-feedback">{errors.paidAmount}</div>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="form-label"><strong>Balance</strong></label>
                  <input
                    className="form-control"
                    name="balance"
                    type="number"
                    placeholder="Remaining balance"
                    value={newPaymentData.balance}
                    onChange={handleNewPaymentChange}
                  />
                </div>

                {/* Receipt and Reminder */}
                <div className="col-md-6">
                  <label className="form-label"><strong>Receipt No</strong></label>
                  <input
                    className="form-control"
                    name="receptNo"
                    type="text"
                    placeholder="Receipt number"
                    value={newPaymentData.receptNo}
                    onChange={handleNewPaymentChange}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label"><strong>Reminder Date</strong></label>
                  <input
                    className="form-control"
                    name="reminderDate"
                    type="date"
                    value={newPaymentData.reminderDate}
                    onChange={handleNewPaymentChange}
                  />
                </div>

                {/* Employee Info */}
                <div className="col-md-6">
                  <label className="form-label"><strong>Employee ID</strong></label>
                  <input
                    className="form-control"
                    name="employeeId"
                    type="text"
                    placeholder="Employee ID"
                    value={newPaymentData.employeeId}
                    onChange={handleNewPaymentChange}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label"><strong>Employee Name</strong></label>
                  <input
                    className="form-control"
                    name="employeeName"
                    type="text"
                    placeholder="Employee Name"
                    value={newPaymentData.employeeName}
                    onChange={handleNewPaymentChange}
                  />
                </div>

                {/* Remarks */}
                <div className="col-12">
                  <label className="form-label"><strong>Remarks</strong></label>
                  <textarea
                    className="form-control"
                    name="remarks"
                    rows="3"
                    placeholder="Additional notes"
                    value={newPaymentData.remarks}
                    onChange={handleNewPaymentChange}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer-custom">
              <button
                className="btn btn-secondary"
                onClick={() => setShowPaymentModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddPayment}
                disabled={!newPaymentData.paidAmount || parseFloat(newPaymentData.paidAmount) <= 0}
              >
                <i className="bi bi-check-circle me-1"></i>
                Save Payment
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .icon-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .bg-gradient-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .bg-gradient-success {
          background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        }
        
        .bg-gradient-warning {
          background: linear-gradient(135deg, #f7971e 0%, #ffd200 100%);
        }
        
        .bg-gradient-info {
          background: linear-gradient(135deg, #00c6ff 0%, #0072ff 100%);
        }
        
        .hover-lift {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .hover-lift:hover {
          box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important;
        }
        
        .modal-backdrop-custom {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0,0,0,0.5);
          z-index: 1050;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .modal-card-custom {
          background: white;
          border-radius: 8px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          animation: modalSlideIn 0.3s ease;
          max-width: 95%;
          max-height: 90vh;
          overflow-y: auto;
        }
        
        .modal-lg {
          width: 800px;
        }
        
        .modal-header-custom {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #dee2e6;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-radius: 8px 8px 0 0;
        }
        
        .modal-body-custom {
          padding: 1.5rem;
          max-height: 60vh;
          overflow-y: auto;
        }
        
        .modal-footer-custom {
          padding: 1rem 1.5rem;
          border-top: 1px solid #dee2e6;
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
        }
        
        .btn-close-custom {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.2s;
        }
        
        .btn-close-custom:hover {
          opacity: 1;
        }
        
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .bg-white-10 {
          background-color: rgba(255, 255, 255, 0.1);
        }
        
        .card-header.bg-primary.bg-opacity-25 {
          background-color: rgba(13, 110, 253, 0.1) !important;
        }
        
        .card-header.bg-success.bg-opacity-25 {
          background-color: rgba(25, 135, 84, 0.1) !important;
        }
        
        .card-header.bg-warning.bg-opacity-25 {
          background-color: rgba(255, 193, 7, 0.1) !important;
        }
        
        .card-header.bg-info.bg-opacity-25 {
          background-color: rgba(13, 202, 240, 0.1) !important;
        }
      `}</style>
    </div>
  );
};

export default PaymentTab;