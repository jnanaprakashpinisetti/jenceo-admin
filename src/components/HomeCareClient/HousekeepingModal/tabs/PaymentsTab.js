import React, { useState, useEffect } from "react";

const PaymentsTab = ({
  formData,
  editMode,
  handleChange,
  removePayment,
  addPayment,
  usersMap,
  client,
  effectiveUserName,
  formatDDMMYY,
  formatTime12h,
  formatINR,
  formatDateForInput,
  bulkReminderDate,
  setBulkReminderDate,
  removeAllPaymentReminders,
  updateLastReminderDate,
  getLastBalance,
  quickRefund,
  setQuickRefund,
  balancePay,
  setBalancePay,
  selectedAction,
  setSelectedAction,
  getLastVisiblePaymentIndex,
  setFormData,
  markDirty
}) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [newPaymentData, setNewPaymentData] = useState({
    paymentMethod: "cash",
    date: new Date().toISOString().split('T')[0],
    paidAmount: "",
    balance: "",
    receptNo: "",
    reminderDate: "",
    remarks: ""
  });
  const [refundData, setRefundData] = useState({
    paymentIndex: "",
    refundAmount: "",
    refundDate: new Date().toISOString().split('T')[0],
    refundPaymentMethod: "cash",
    refundRemarks: ""
  });
  const [balanceData, setBalanceData] = useState({
    paymentIndex: "",
    amount: "",
    date: new Date().toISOString().split('T')[0],
    method: "cash",
    remarks: ""
  });

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

  // Get all payments (excluding adjustments) sorted by date descending (newest first)
  const allPayments = (formData.payments || [])
    .map((p, originalIndex) => ({ ...p, originalIndex }))
    .filter(p => !p?.__adjustment);

  // For display: sort in descending order (newest first)
  const payments = [...allPayments].sort((a, b) => {
    const dateA = a.date ? new Date(a.date) : new Date(0);
    const dateB = b.date ? new Date(b.date) : new Date(0);
    return dateB - dateA;
  });

  // For operations: keep original order
  const originalPayments = [...allPayments].sort((a, b) => a.originalIndex - b.originalIndex);

  // Get payments with positive balance for balance payment dropdown
  const paymentsWithBalance = originalPayments.filter(p => Number(p.balance || 0) > 0);

  // Handle add payment correctly
  const handleAddPayment = () => {
    if (!newPaymentData.paidAmount || parseFloat(newPaymentData.paidAmount) <= 0) {
      alert("Please enter a valid payment amount");
      return;
    }

    const now = new Date();
    const newPayment = {
      id: Date.now(),
      paymentMethod: newPaymentData.paymentMethod,
      paidAmount: newPaymentData.paidAmount,
      balance: newPaymentData.balance || "0",
      receptNo: newPaymentData.receptNo,
      remarks: newPaymentData.remarks,
      reminderDays: "",
      reminderDate: newPaymentData.reminderDate,
      date: newPaymentData.date,
      refund: false,
      refundAmount: 0,
      refundDate: "",
      refundPaymentMethod: "",
      refundRemarks: "",
      __locked: false,
      addedByName: effectiveUserName,
      addedAt: now.toISOString(),
      createdByName: effectiveUserName,
      createdAt: now.toISOString()
    };

    // Use the addPayment function from props
    addPayment();

    // Update the newly added payment with our data
    setFormData(prev => {
      const payments = [...(prev.payments || [])];
      if (payments.length > 0) {
        const newIndex = payments.findIndex(p => !p.__locked);
        if (newIndex >= 0) {
          payments[newIndex] = { ...payments[newIndex], ...newPayment };
        }
      }
      const next = { ...prev, payments };
      markDirty(next);
      return next;
    });

    // Reset form
    setNewPaymentData({
      paymentMethod: "cash",
      date: new Date().toISOString().split('T')[0],
      paidAmount: "",
      balance: "",
      receptNo: "",
      reminderDate: "",
      remarks: ""
    });
    setShowPaymentModal(false);
  };

  const handleApplyRefund = () => {
    const { paymentIndex, refundAmount, refundDate, refundPaymentMethod, refundRemarks } = refundData;
    const idx = parseInt(paymentIndex);

    if (idx >= 0 && idx < originalPayments.length && refundAmount > 0) {
      setFormData(prev => {
        const payments = [...prev.payments];
        const paymentIdx = payments.findIndex((p, i) => i === idx);
        if (paymentIdx >= 0) {
          payments[paymentIdx] = {
            ...payments[paymentIdx],
            refund: true,
            refundAmount: parseFloat(refundAmount),
            refundDate,
            refundPaymentMethod,
            refundRemarks
          };
          const next = { ...prev, payments };
          markDirty(next);
          return next;
        }
        return prev;
      });

      setRefundData({
        paymentIndex: "",
        refundAmount: "",
        refundDate: new Date().toISOString().split('T')[0],
        refundPaymentMethod: "cash",
        refundRemarks: ""
      });
      setShowRefundModal(false);
    }
  };

  // Improved: Handle balance payment same as refund
  const handleApplyBalancePayment = () => {
    const { paymentIndex, amount, date, method, remarks } = balanceData;
    const idx = parseInt(paymentIndex);

    if (idx >= 0 && idx < originalPayments.length && amount > 0) {
      const selectedPayment = originalPayments[idx];
      const currentBalance = Number(selectedPayment.balance || 0);
      const paymentAmount = parseFloat(amount);

      if (paymentAmount <= 0 || paymentAmount > currentBalance) {
        alert(`Please enter a valid amount between 0 and ${currentBalance}`);
        return;
      }

      const newBalance = currentBalance - paymentAmount;

      // Update the selected payment's balance
      setFormData(prev => {
        const payments = [...prev.payments];
        const paymentIdx = payments.findIndex((p, i) => i === idx);
        if (paymentIdx >= 0) {
          payments[paymentIdx] = {
            ...payments[paymentIdx],
            balance: newBalance.toString()
          };

          // Add adjustment entry for tracking
          if (paymentAmount > 0) {
            const adjustment = {
              __adjustment: true,
              __type: "balance",
              date: date || new Date().toISOString().split('T')[0],
              paymentMethod: method || "cash",
              paidAmount: paymentAmount,
              balance: newBalance,
              receptNo: "",
              remarks: remarks || `Balance payment for payment #${idx + 1}`,
              refund: false,
              refundAmount: 0,
              addedByName: effectiveUserName,
              addedAt: new Date().toISOString()
            };
            payments.push(adjustment);
          }

          const next = { ...prev, payments };
          markDirty(next);
          return next;
        }
        return prev;
      });

      setBalanceData({
        paymentIndex: "",
        amount: "",
        date: new Date().toISOString().split('T')[0],
        method: "cash",
        remarks: ""
      });
      setShowBalanceModal(false);
      setSelectedAction("");
    }
  };

  const handleNewPaymentChange = (e) => {
    const { name, value } = e.target;
    setNewPaymentData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRefundChange = (e) => {
    const { name, value } = e.target;
    setRefundData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBalanceChange = (e) => {
    const { name, value } = e.target;
    setBalanceData(prev => {
      const updated = { ...prev, [name]: value };
      
      // Auto-fill amount when payment is selected
      if (name === 'paymentIndex' && value !== "") {
        const idx = parseInt(value);
        if (idx >= 0 && idx < originalPayments.length) {
          const selectedPayment = originalPayments[idx];
          updated.amount = selectedPayment.balance || "";
        }
      }
      
      return updated;
    });
  };

  // Get payments with reminders sorted by nearest date first
  const paymentsWithReminders = payments
    .filter(p => p.reminderDate)
    .sort((a, b) => {
      const dateA = a.reminderDate ? new Date(a.reminderDate) : new Date('9999-12-31');
      const dateB = b.reminderDate ? new Date(b.reminderDate) : new Date('9999-12-31');
      return dateA - dateB; // Nearest first
    });

  const refundedPayments = payments.filter(p => p.refund || Number(p.refundAmount || 0) > 0);

  // Calculate totals
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0);
  const totalBalance = payments.reduce((sum, p) => sum + (Number(p.balance) || 0), 0);
  const totalRefund = refundedPayments.reduce((sum, p) => sum + (Number(p.refundAmount) || 0), 0);

  // Get adjustment payments
  const adjustmentPayments = (formData.payments || []).filter(p => p?.__adjustment);

  // Handle clear all reminders with confirmation
  const handleClearAllReminders = () => {
    if (window.confirm("Are you sure you want to clear all reminder dates from all payments?")) {
      removeAllPaymentReminders();
    }
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
                  <h6 className="text-white-50 mb-1">Total Paid</h6>
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
                Last: {formatINR(getLastBalance())}
              </small>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-sm-6 mb-3">
          <div className="card bg-gradient-danger text-white shadow border-0">
            <div className="card-header bg-danger bg-opacity-25 border-0 pb-2">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-white-50 mb-1">Total Refund</h6>
                  <h4 className="mb-0">{formatINR(totalRefund)}</h4>
                </div>
                <div className="icon-circle bg-white-10">
                  <i className="bi bi-arrow-return-left text-white"></i>
                </div>
              </div>
            </div>
            <div className="card-body py-2">
              <small className="opacity-75">
                {refundedPayments.length} refunded payments
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {editMode && (
        <div className="row mb-4">
          <div className="col-md-4 mb-2">
            <button
              className="btn btn-primary btn-lg w-100 d-flex align-items-center justify-content-center"
              onClick={() => setShowPaymentModal(true)}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Add Payment
            </button>
          </div>
          <div className="col-md-4 mb-2">
            <button
              className="btn btn-warning btn-lg w-100 d-flex align-items-center justify-content-center"
              onClick={() => setShowRefundModal(true)}
            >
              <i className="bi bi-arrow-return-left me-2"></i>
              Apply Refund
            </button>
          </div>
          <div className="col-md-4 mb-2">
            <button
              className="btn btn-success btn-lg w-100 d-flex align-items-center justify-content-center"
              onClick={() => setShowBalanceModal(true)}
              disabled={paymentsWithBalance.length === 0}
            >
              <i className="bi bi-check-circle me-2"></i>
              Balance Payment
              {paymentsWithBalance.length > 0 && (
                <span className="badge bg-light text-dark ms-2">
                  {paymentsWithBalance.length} pending
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions Bar */}
      {editMode && (
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
                  onClick={updateLastReminderDate}
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

      {/* Payment History - Tabs Layout */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white border-bottom">
          <ul className="nav nav-tabs card-header-tabs" role="tablist">
            <li className="nav-item" role="presentation">
              <button
                className="nav-link active"
                data-bs-toggle="tab"
                data-bs-target="#all-payments"
                type="button"
              >
                <i className="bi bi-list-check me-1"></i>
                All Payments ({payments.length})
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className="nav-link"
                data-bs-toggle="tab"
                data-bs-target="#refunded"
                type="button"
              >
                <i className="bi bi-arrow-return-left me-1"></i>
                Refunded ({refundedPayments.length})
              </button>
            </li>
            {adjustmentPayments.length > 0 && (
              <li className="nav-item" role="presentation">
                <button
                  className="nav-link"
                  data-bs-toggle="tab"
                  data-bs-target="#adjustments"
                  type="button"
                >
                  <i className="bi bi-gear me-1"></i>
                  Adjustments ({adjustmentPayments.length})
                </button>
              </li>
            )}
            {paymentsWithReminders.length > 0 && (
              <li className="nav-item" role="presentation">
                <button
                  className="nav-link"
                  data-bs-toggle="tab"
                  data-bs-target="#reminders"
                  type="button"
                >
                  <i className="bi bi-bell me-1"></i>
                  Reminders ({paymentsWithReminders.length})
                </button>
              </li>
            )}
          </ul>
        </div>

        <div className="card-body">
          <div className="tab-content">
            {/* All Payments Tab - NEWEST FIRST */}
            <div className="tab-pane fade show active" id="all-payments">
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
                      resolveAddedByFromUsers(client, usersMap) ||
                      effectiveUserName;

                    const addedAtDisplay = p.addedAt || p.timestamp || p.createdAt || p.date || "";
                    const hasRefund = p.refund || Number(p.refundAmount || 0) > 0;
                    const hasReminder = p.reminderDate;

                    return (
                      <div key={p.originalIndex} className="col-md-6 col-lg-4">
                        <div className={`card h-100 border shadow-sm hover-lift ${hasRefund ? 'border-warning' : 'border-light'}`}>
                          <div className={`card-header ${hasRefund ? 'bg-warning' : hasReminder ? 'bg-info' : Number(p.balance || 0) > 0 ? 'bg-danger' : 'bg-success'} d-flex justify-content-between align-items-center py-2 text-white`}>
                            <div className="d-flex align-items-center gap-2">
                              <span className="badge bg-dark">#{payments.length - idx}</span>
                              {hasRefund && (
                                <span className="badge bg-dark">
                                  <i className="bi bi-arrow-return-left me-1"></i>
                                  Refunded
                                </span>
                              )}
                              {hasReminder && (
                                <span className="badge bg-light text-dark">
                                  <i className="bi bi-bell me-1"></i>
                                  Reminder
                                </span>
                              )}
                              {Number(p.balance || 0) > 0 && (
                                <span className="badge bg-warning text-dark">
                                  <i className="bi bi-clock me-1"></i>
                                  Balance: {formatINR(p.balance)}
                                </span>
                              )}
                            </div>
                            {editMode && !locked && (
                              <button
                                className="btn btn-sm btn-outline-light"
                                onClick={() => removePayment(p.originalIndex)}
                                title="Remove payment"
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            )}
                          </div>

                          <div className="card-body p-3">
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

                            {hasRefund && (
                              <div className="mt-3 pt-2 border-top border-danger bg-danger bg-opacity-10 p-2 rounded">
                                <small className="text-danger d-block">
                                  <i className="bi bi-arrow-return-left me-1"></i>
                                  Refund Details
                                </small>
                                <div className="small text-dark">
                                  <div><strong>Amount:</strong> {formatINR(p.refundAmount)}</div>
                                  <div><strong>Date:</strong> {p.refundDate ? formatDDMMYY(p.refundDate) : "—"}</div>
                                  <div><strong>Method:</strong> {p.refundPaymentMethod || "—"}</div>
                                  {p.refundRemarks && <div><strong>Remarks:</strong> {p.refundRemarks}</div>}
                                </div>
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

            {/* Refunded Payments Tab */}
            <div className="tab-pane fade" id="refunded">
              {refundedPayments.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-arrow-return-left text-muted" style={{ fontSize: '3rem' }}></i>
                  <h5 className="mt-3 text-muted">No Refunded Payments</h5>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-warning">
                      <tr>
                        <th>#</th>
                        <th>Payment Date</th>
                        <th>Refund Date</th>
                        <th>Original Amount</th>
                        <th>Refund Amount</th>
                        <th>Refund Method</th>
                        <th>Remarks</th>
                        <th>Added By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {refundedPayments.map((p, idx) => {
                        const addedByDisplay = p.addedByName ||
                          resolveUserName(p) ||
                          resolveAddedByFromUsers(p, usersMap) ||
                          effectiveUserName;
                        return (
                          <tr key={p.originalIndex} className={idx % 2 === 0 ? 'table-light' : ''}>
                            <td>{refundedPayments.length - idx}</td>
                            <td>{p.date ? formatDDMMYY(p.date) : "—"}</td>
                            <td>{p.refundDate ? formatDDMMYY(p.refundDate) : "—"}</td>
                            <td>{formatINR(p.paidAmount)}</td>
                            <td className="text-danger fw-bold">{formatINR(p.refundAmount)}</td>
                            <td>
                              <span className="badge bg-warning">
                                {p.refundPaymentMethod || "Cash"}
                              </span>
                            </td>
                            <td>{p.refundRemarks || "—"}</td>
                            <td>{addedByDisplay}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="table-warning">
                      <tr>
                        <th colSpan="3">Total Refunded</th>
                        <th>{formatINR(refundedPayments.reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0))}</th>
                        <th className="text-danger">{formatINR(totalRefund)}</th>
                        <th colSpan="3"></th>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Adjustments Tab - Now shows balance payment adjustments */}
            {adjustmentPayments.length > 0 && (
              <div className="tab-pane fade" id="adjustments">
                <div className="alert alert-info text-info">
                  <i className="bi bi-info-circle me-2"></i>
                  <strong>About Adjustments:</strong> This tab shows balance payments made against outstanding balances. 
                  When you use the "Balance Payment" feature, it creates an adjustment entry here for tracking purposes.
                </div>
                
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-info">
                      <tr>
                        <th>#</th>
                        <th>Type</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Remarks</th>
                        <th>Added By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adjustmentPayments.map((a, i) => {
                        const type = a.__type === "balance" ? "Balance Paid" : "Adjustment";
                        const amt = a.paidAmount || 0;
                        const addedByDisplay = a.addedByName || effectiveUserName;
                        return (
                          <tr key={i} className={i % 2 === 0 ? 'table-light' : ''}>
                            <td>{i + 1}</td>
                            <td>
                              <span className="badge bg-success">
                                {type}
                              </span>
                            </td>
                            <td>{a.date ? formatDDMMYY(a.date) : "—"}</td>
                            <td className="text-success fw-bold">
                              {formatINR(amt)}
                            </td>
                            <td>{a.paymentMethod || "—"}</td>
                            <td>{a.remarks || "—"}</td>
                            <td>{addedByDisplay}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Reminders Tab */}
            {paymentsWithReminders.length > 0 && (
              <div className="tab-pane fade" id="reminders">
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-primary">
                      <tr>
                        <th>#</th>
                        <th>Payment Date</th>
                        <th>Amount</th>
                        <th>Reminder Date</th>
                        <th>Days Remaining</th>
                        <th>Balance</th>
                        <th>Method</th>
                        <th>Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentsWithReminders.map((p, idx) => {
                        const today = new Date();
                        const reminderDate = p.reminderDate ? new Date(p.reminderDate) : null;
                        const daysRemaining = reminderDate ? Math.ceil((reminderDate - today) / (1000 * 60 * 60 * 24)) : null;

                        let daysClass = "";
                        if (daysRemaining !== null) {
                          if (daysRemaining < 0) daysClass = "text-danger";
                          else if (daysRemaining === 0) daysClass = "text-warning";
                          else if (daysRemaining <= 3) daysClass = "text-warning";
                          else daysClass = "text-success";
                        }

                        return (
                          <tr key={idx} className={idx % 2 === 0 ? 'table-light' : ''}>
                            <td>{idx + 1}</td>
                            <td>{p.date ? formatDDMMYY(p.date) : "—"}</td>
                            <td>{formatINR(p.paidAmount)}</td>
                            <td className="fw-bold">{p.reminderDate ? formatDDMMYY(p.reminderDate) : "—"}</td>
                            <td className={daysClass}>
                              {daysRemaining !== null ? (
                                daysRemaining < 0 ?
                                  `Overdue by ${Math.abs(daysRemaining)} days` :
                                  `${daysRemaining} days`
                              ) : "—"}
                            </td>
                            <td>{formatINR(p.balance)}</td>
                            <td>
                              <span className="badge bg-secondary">
                                {p.paymentMethod || "Cash"}
                              </span>
                            </td>
                            <td>{p.receptNo || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
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
                  <label className="form-label"><strong>Date</strong></label>
                  <input
                    className="form-control"
                    name="date"
                    type="date"
                    value={newPaymentData.date}
                    onChange={handleNewPaymentChange}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label"><strong>Paid Amount</strong> <span className="text-danger">*</span></label>
                  <input
                    className="form-control"
                    name="paidAmount"
                    type="number"
                    placeholder="Enter amount"
                    value={newPaymentData.paidAmount}
                    onChange={handleNewPaymentChange}
                    required
                  />
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

      {/* Apply Refund Modal */}
      {showRefundModal && (
        <div className="modal-backdrop-custom" onClick={() => setShowRefundModal(false)}>
          <div className="modal-card-custom modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom bg-warning text-dark">
              <h5 className="mb-0">
                <i className="bi bi-arrow-return-left me-2"></i>
                Apply Refund
              </h5>
              <button className="btn-close-custom" onClick={() => setShowRefundModal(false)}>
                <i className="bi bi-x-lg text-dark"></i>
              </button>
            </div>
            <div className="modal-body-custom">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label"><strong>Select Payment</strong></label>
                  <select
                    className="form-control"
                    name="paymentIndex"
                    value={refundData.paymentIndex}
                    onChange={handleRefundChange}
                  >
                    <option value="">-- Select Payment --</option>
                    {originalPayments.map((p, idx) => (
                      <option key={idx} value={idx}>
                        Payment #{idx + 1} - {formatINR(p.paidAmount)} on {p.date ? formatDDMMYY(p.date) : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label"><strong>Refund Date</strong> <span className="text-danger">*</span></label>
                  <input
                    className="form-control"
                    name="refundDate"
                    type="date"
                    value={refundData.refundDate}
                    onChange={handleRefundChange}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label"><strong>Refund Amount</strong> <span className="text-danger">*</span></label>
                  <input
                    className="form-control"
                    name="refundAmount"
                    type="number"
                    placeholder="Enter refund amount"
                    value={refundData.refundAmount}
                    onChange={handleRefundChange}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label"><strong>Refund Method</strong></label>
                  <select
                    className="form-control"
                    name="refundPaymentMethod"
                    value={refundData.refundPaymentMethod}
                    onChange={handleRefundChange}
                  >
                    <option value="cash">Cash</option>
                    <option value="online">Online</option>
                    <option value="check">Check</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="col-12">
                  <label className="form-label"><strong>Refund Remarks</strong></label>
                  <textarea
                    className="form-control"
                    name="refundRemarks"
                    rows="3"
                    placeholder="Reason for refund"
                    value={refundData.refundRemarks}
                    onChange={handleRefundChange}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer-custom">
              <button
                className="btn btn-secondary"
                onClick={() => setShowRefundModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-warning"
                onClick={handleApplyRefund}
                disabled={!refundData.paymentIndex || !refundData.refundAmount || parseFloat(refundData.refundAmount) <= 0}
              >
                <i className="bi bi-check-circle me-1"></i>
                Apply Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Balance Payment Modal - UPDATED: Same as refund modal */}
      {showBalanceModal && (
        <div className="modal-backdrop-custom" onClick={() => setShowBalanceModal(false)}>
          <div className="modal-card-custom modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom bg-success text-white">
              <h5 className="mb-0">
                <i className="bi bi-check-circle me-2"></i>
                Balance Payment
              </h5>
              <button className="btn-close-custom" onClick={() => setShowBalanceModal(false)}>
                <i className="bi bi-x-lg text-white"></i>
              </button>
            </div>
            <div className="modal-body-custom">
              <div className="alert alert-info text-info">
                <i className="bi bi-info-circle me-2"></i>
                <strong>Note:</strong> Select a payment with outstanding balance to make a partial/full payment against it.
                This will reduce the balance on the selected payment and create an adjustment entry.
              </div>

              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label"><strong>Select Payment with Balance</strong> <span className="text-danger">*</span></label>
                  <select
                    className="form-control"
                    name="paymentIndex"
                    value={balanceData.paymentIndex}
                    onChange={handleBalanceChange}
                  >
                    <option value="">-- Select Payment with Balance --</option>
                    {paymentsWithBalance.map((p, idx) => (
                      <option key={p.originalIndex} value={p.originalIndex}>
                        Payment #{p.originalIndex + 1} - {formatINR(p.paidAmount)} (Balance: {formatINR(p.balance)}) on {p.date ? formatDDMMYY(p.date) : ''}
                      </option>
                    ))}
                  </select>
                  {paymentsWithBalance.length === 0 && (
                    <div className="form-text text-warning">
                      No payments with outstanding balance found.
                    </div>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="form-label"><strong>Payment Date</strong> <span className="text-danger">*</span></label>
                  <input
                    className="form-control"
                    name="date"
                    type="date"
                    value={balanceData.date}
                    onChange={handleBalanceChange}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label"><strong>Amount to Pay</strong> <span className="text-danger">*</span></label>
                  <input
                    className="form-control"
                    name="amount"
                    type="number"
                    placeholder="Enter payment amount"
                    value={balanceData.amount}
                    onChange={handleBalanceChange}
                    required
                  />
                  {balanceData.paymentIndex && (
                    <div className="form-text">
                      Maximum: {formatINR(originalPayments[parseInt(balanceData.paymentIndex)]?.balance || 0)}
                    </div>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="form-label"><strong>Payment Method</strong></label>
                  <select
                    className="form-control"
                    name="method"
                    value={balanceData.method}
                    onChange={handleBalanceChange}
                  >
                    <option value="cash">Cash</option>
                    <option value="online">Online</option>
                    <option value="check">Check</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="col-12">
                  <label className="form-label"><strong>Remarks</strong></label>
                  <textarea
                    className="form-control"
                    name="remarks"
                    rows="2"
                    placeholder="Payment remarks (optional)"
                    value={balanceData.remarks}
                    onChange={handleBalanceChange}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer-custom">
              <button
                className="btn btn-secondary"
                onClick={() => setShowBalanceModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-success"
                onClick={handleApplyBalancePayment}
                disabled={!balanceData.paymentIndex || !balanceData.amount || parseFloat(balanceData.amount) <= 0 || 
                  (balanceData.paymentIndex && parseFloat(balanceData.amount) > parseFloat(originalPayments[parseInt(balanceData.paymentIndex)]?.balance || 0))}
              >
                <i className="bi bi-check-circle me-1"></i>
                Process Balance Payment
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
        
        .bg-gradient-danger {
          background: linear-gradient(135deg, #f85032 0%, #e73827 100%);
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
        
        .table-hover tbody tr:hover {
          background-color: rgba(0, 123, 255, 0.05);
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
        
        .card-header.bg-danger.bg-opacity-25 {
          background-color: rgba(220, 53, 69, 0.1) !important;
        }
      `}</style>
    </div>
  );
};

export default PaymentsTab;
 