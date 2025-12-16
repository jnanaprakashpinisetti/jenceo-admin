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

    const updateNewPayment = (field, val) =>
        setNewPayment((p) => ({ ...p, [field]: val }));

    const resetPaymentDraft = () => setNewPayment({
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

    const validateNewPayment = () => {
        const e = {};
        if (!newPayment.date) e.date = "Date is required";
        if (!newPayment.clientName) e.clientName = "Client name is required";
        if (!newPayment.days || Number(newPayment.days) <= 0) e.days = "Days is required";
        if (!String(newPayment.amount || "").replace(/\D/g, "")) e.amount = "Amount is required";
        if (!newPayment.typeOfPayment) e.typeOfPayment = "Type is required";
        if (!newPayment.status) e.status = "Payment For is required";
        return e;
    };

    const addPaymentFromForm = () => {
        const errs = validateNewPayment();
        if (Object.keys(errs).length) {
            alert("Fix Payment Form: " + Object.values(errs).join(", "));
            return;
        }
        
        const stampAuthorOnRow = (row) => ({
            ...row,
            addedByName: effectiveUserName,
            addedAt: new Date().toISOString(),
            createdByName: effectiveUserName,
            createdAt: new Date().toISOString(),
        });

        const row = stampAuthorOnRow(newPayment);
        setFormData((prev) => ({
            ...prev,
            payments: [...(prev.payments || []), { ...row }]
        }));
        setHasUnsavedChanges(true);
        setShowPaymentForm(false);
        resetPaymentDraft();
    };

    const removePaymentSection = (index) => {
        setFormData((prev) => {
            const list = [...(prev.payments || [])];
            if (list[index]?.__locked) return prev;
            list.splice(index, 1);
            return { ...prev, payments: list.length ? list : [] };
        });
        setHasUnsavedChanges(true);
    };

    return (
        <div className="modal-card">
            <div className="modal-card-header d-flex justify-content-between align-items-center">
                <strong>Payments</strong>
                {canEdit && (
                    <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => setShowPaymentForm((s) => !s)}
                    >
                        {showPaymentForm ? "Close" : "+ Add Payment"}
                    </button>
                )}
            </div>

            <div className="modal-card-body">
                {/* Inline small add form */}
                {canEdit && showPaymentForm && (
                    <div className="border rounded p-3 mb-3 bg-light">
                        <div className="row">
                            <div className="col-md-3 mb-2">
                                <label className="form-label"><strong>Date</strong><span className="star">*</span></label>
                                <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    value={newPayment.date || ""}
                                    min={PAY_MIN}
                                    max={PAY_MAX}
                                    onChange={(e) => updateNewPayment("date", e.target.value)}
                                />
                            </div>
                            <div className="col-md-3 mb-2">
                                <label className="form-label"><strong>Client Name</strong><span className="star">*</span></label>
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={newPayment.clientName || ""}
                                    onChange={(e) => updateNewPayment("clientName", e.target.value)}
                                />
                            </div>
                            <div className="col-md-2 mb-2">
                                <label className="form-label"><strong>Days</strong><span className="star">*</span></label>
                                <input
                                    type="tel"
                                    className="form-control form-control-sm"
                                    maxLength={2}
                                    value={newPayment.days || ""}
                                    onChange={(e) => updateNewPayment("days", e.target.value.replace(/\D/g, ""))}
                                />
                            </div>
                            <div className="col-md-2 mb-2">
                                <label className="form-label"><strong>Amount</strong><span className="star">*</span></label>
                                <input
                                    type="tel"
                                    className="form-control form-control-sm"
                                    maxLength={5}
                                    value={newPayment.amount || ""}
                                    onChange={(e) => updateNewPayment("amount", e.target.value.replace(/\D/g, ""))}
                                />
                            </div>
                            <div className="col-md-2 mb-2">
                                <label className="form-label"><strong>Balance</strong></label>
                                <input
                                    type="tel"
                                    className="form-control form-control-sm"
                                    value={newPayment.balanceAmount || ""}
                                    onChange={(e) => updateNewPayment("balanceAmount", e.target.value.replace(/\D/g, ""))}
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-3 mb-2">
                                <label className="form-label"><strong>Type of payment</strong><span className="star">*</span></label>
                                <select
                                    className="form-select form-select-sm"
                                    value={newPayment.typeOfPayment || ""}
                                    onChange={(e) => updateNewPayment("typeOfPayment", e.target.value)}
                                >
                                    <option value="">Select</option>
                                    <option value="cash">Cash</option>
                                    <option value="online">Online</option>
                                    <option value="cheque">Cheque</option>
                                </select>
                            </div>
                            <div className="col-md-3 mb-2">
                                <label className="form-label"><strong>Payment For</strong><span className="star">*</span></label>
                                <select
                                    className="form-select form-select-sm"
                                    value={newPayment.status || ""}
                                    onChange={(e) => updateNewPayment("status", e.target.value)}
                                >
                                    <option value="" disabled>Select</option>
                                    <option value="salary">Salary</option>
                                    <option value="advance">Advance</option>
                                    <option value="commition">Commition</option>
                                    <option value="bonus">Bonus</option>
                                </select>
                            </div>
                            <div className="col-md-3 mb-2">
                                <label className="form-label"><strong>Receipt No</strong></label>
                                <input
                                    className="form-control form-control-sm"
                                    value={newPayment.receiptNo || ""}
                                    onChange={(e) => updateNewPayment("receiptNo", e.target.value)}
                                    maxLength={12}
                                />
                            </div>
                            <div className="col-md-3 mb-2">
                                <label className="form-label"><strong>Timesheet ID</strong></label>
                                <input
                                    className="form-control form-control-sm"
                                    value={newPayment.timesheetID || ""}
                                    onChange={(e) => updateNewPayment("timesheetID", e.target.value)}
                                    maxLength={12}
                                />
                            </div>
                        </div>

                        <div className="mb-2">
                            <label className="form-label"><strong>Remarks</strong></label>
                            <textarea
                                className="form-control form-control-sm"
                                rows={2}
                                value={newPayment.remarks || ""}
                                onChange={(e) => updateNewPayment("remarks", e.target.value)}
                            />
                        </div>

                        <div className="d-flex gap-2 justify-content-end">
                            <button className="btn btn-secondary btn-sm" onClick={() => { setShowPaymentForm(false); resetPaymentDraft(); }}>
                                Cancel
                            </button>
                            <button className="btn btn-primary btn-sm" onClick={addPaymentFromForm}>
                                Save Payment
                            </button>
                        </div>
                    </div>
                )}

                {/* Table of existing payments */}
                {(formData.payments?.length ?? 0) === 0 ? (
                    <div className="text-muted text-center">No payments added yet.</div>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-sm table-bordered align-middle">
                            <thead className="table-dark">
                                <tr>
                                    <th>#</th>
                                    <th>Date</th>
                                    <th>Client</th>
                                    <th>Days</th>
                                    <th>Amount</th>
                                    <th>Balance</th>
                                    <th>Type</th>
                                    <th>For</th>
                                    <th>Receipt</th>
                                    <th>Timesheet ID</th>
                                    <th>Remarks</th>
                                    <th>Added By</th>
                                    {canEdit && <th>Action</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {(formData.payments || []).map((p, i) => (
                                    <tr key={i}>
                                        <td>{i + 1}</td>
                                        <td>{p.date || "—"}</td>
                                        <td>{p.clientName || "—"}</td>
                                        <td>{p.days || "—"}</td>
                                        <td>{p.amount || "—"}</td>
                                        <td>{p.balanceAmount || "—"}</td>
                                        <td>{p.typeOfPayment || "—"}</td>
                                        <td>{p.status || "—"}</td>
                                        <td>{p.receiptNo || "—"}</td>
                                        <td>{p.timesheetID || "—"}</td>
                                        <td style={{ maxWidth: 240, whiteSpace: 'pre-wrap' }}>{p.remarks || "—"}</td>
                                        <td className="small text-muted">
                                            {(p.addedByName || p.createdByName || effectiveUserName)}<br />
                                            <span>{formatDDMMYY(p.addedAt || p.createdAt)} {formatTime12h(p.addedAt || p.createdAt)}</span>
                                        </td>
                                        {canEdit && (
                                            <td>
                                                {!p.__locked ? (
                                                    <button className="btn btn-outline-danger btn-sm" onClick={() => removePaymentSection(i)}>
                                                        Remove
                                                    </button>
                                                ) : (
                                                    <span className="badge bg-secondary">Locked</span>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Payment;