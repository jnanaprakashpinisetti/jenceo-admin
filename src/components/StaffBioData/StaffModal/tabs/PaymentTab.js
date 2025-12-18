import React from "react";

const PaymentTab = ({
    formData,
    isEditMode,
    paymentErrors,
    Err,
    handleArrayChange,
    removePaymentSection,
    addPaymentSection,
    PAY_MIN,
    PAY_MAX
}) => {
    return (
        <div className="modal-card">
            <div className="modal-card-header">
                <h4 className="mb-0">Payment</h4>
            </div>
            <div className="modal-card-body">
                <div className="row">
                    {(formData.payments || []).map((p, i) => {
                        const locked = !!p.__locked;
                        const invalidClass = (field) => (paymentErrors[i]?.[field] ? " is-invalid" : "");
                        return (
                            <div key={i} className="col-12 mb-4">
                                <div className="card shadow-sm border-0">
                                    <div className="card-header bg-light d-flex justify-content-between align-items-center py-2">
                                        <h6 className="mb-0 fw-bold">
                                            <i className="bi bi-credit-card me-2"></i>
                                            Payment #{i + 1} 
                                            {locked && <span className="badge bg-secondary ms-2">Locked</span>}
                                        </h6>
                                        {isEditMode && !locked && (
                                            <button 
                                                className="btn btn-outline-danger btn-sm" 
                                                onClick={() => removePaymentSection(i)}
                                            >
                                                <i className="bi bi-trash me-1"></i> Remove
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className="card-body p-4">
                                        {/* First Row: Date, Amount, Balance */}
                                        <div className="row mb-4">
                                            <div className="col-md-4 mb-3">
                                                <div className="form-group">
                                                    <label className="form-label fw-semibold text-primary">
                                                        <i className="bi bi-calendar-date me-1"></i>
                                                        Date
                                                        <span className="text-danger ms-1">*</span>
                                                    </label>
                                                    {isEditMode ? (
                                                        <input
                                                            type="date"
                                                            className={`form-control${invalidClass("date")}`}
                                                            value={p.date || ""}
                                                            min={PAY_MIN}
                                                            max={PAY_MAX}
                                                            onChange={(e) => handleArrayChange("payments", i, "date", e.target.value)}
                                                            disabled={locked}
                                                        />
                                                    ) : (
                                                        <div className="form-control-plaintext border rounded p-2 bg-light">
                                                            {p.date || "N/A"}
                                                        </div>
                                                    )}
                                                    <Err msg={paymentErrors[i]?.date} />
                                                </div>
                                            </div>

                                            <div className="col-md-4 mb-3">
                                                <div className="form-group">
                                                    <label className="form-label fw-semibold text-primary">
                                                        <i className="bi bi-currency-rupee me-1"></i>
                                                        Amount
                                                        <span className="text-danger ms-1">*</span>
                                                    </label>
                                                    {isEditMode ? (
                                                        <input
                                                            type="tel"
                                                            inputMode="numeric"
                                                            className={`form-control${invalidClass("amount")}`}
                                                            value={p.amount || ""}
                                                            onChange={(e) => handleArrayChange("payments", i, "amount", e.target.value)}
                                                            disabled={locked}
                                                            maxLength={5}
                                                            pattern="^[0-9]{1,5}$"
                                                        />
                                                    ) : (
                                                        <div className="form-control-plaintext border rounded p-2 bg-light">
                                                            {p.amount || "N/A"}
                                                        </div>
                                                    )}
                                                    <Err msg={paymentErrors[i]?.amount} />
                                                </div>
                                            </div>

                                            <div className="col-md-4 mb-3">
                                                <div className="form-group">
                                                    <label className="form-label fw-semibold text-primary">
                                                        <i className="bi bi-wallet me-1"></i>
                                                        Balance Amount
                                                    </label>
                                                    {isEditMode ? (
                                                        <input
                                                            type="tel"
                                                            inputMode="numeric"
                                                            pattern="^[0-9]+$"
                                                            className={`form-control${invalidClass("balanceAmount")}`}
                                                            value={p.balanceAmount || ""}
                                                            onChange={(e) => handleArrayChange("payments", i, "balanceAmount", e.target.value)}
                                                            disabled={locked}
                                                            maxLength={5}
                                                        />
                                                    ) : (
                                                        <div className="form-control-plaintext border rounded p-2 bg-light">
                                                            {p.balanceAmount || "N/A"}
                                                        </div>
                                                    )}
                                                    <Err msg={paymentErrors[i]?.balanceAmount} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Second Row: Payment Type, Payment For, Receipt No */}
                                        <div className="row mb-4">
                                            <div className="col-md-4 mb-3">
                                                <div className="form-group">
                                                    <label className="form-label fw-semibold text-primary">
                                                        <i className="bi bi-cash-stack me-1"></i>
                                                        Type of Payment
                                                        <span className="text-danger ms-1">*</span>
                                                    </label>
                                                    {isEditMode ? (
                                                        <select
                                                            className={`form-select${invalidClass("typeOfPayment")}`}
                                                            value={p.typeOfPayment || ""}
                                                            onChange={(e) => handleArrayChange("payments", i, "typeOfPayment", e.target.value)}
                                                            disabled={locked}
                                                        >
                                                            <option value="">Select</option>
                                                            <option value="cash">Cash</option>
                                                            <option value="online">Online</option>
                                                            <option value="cheque">Cheque</option>
                                                        </select>
                                                    ) : (
                                                        <div className="form-control-plaintext border rounded p-2 bg-light">
                                                            {p.typeOfPayment || "N/A"}
                                                        </div>
                                                    )}
                                                    <Err msg={paymentErrors[i]?.typeOfPayment} />
                                                </div>
                                            </div>

                                            <div className="col-md-4 mb-3">
                                                <div className="form-group">
                                                    <label className="form-label fw-semibold text-primary">
                                                        <i className="bi bi-receipt me-1"></i>
                                                        Payment For
                                                        <span className="text-danger ms-1">*</span>
                                                    </label>
                                                    {isEditMode ? (
                                                        <select
                                                            className={`form-select${invalidClass("status")}`}
                                                            value={p.status || ""}
                                                            onChange={(e) => handleArrayChange("payments", i, "status", e.target.value)}
                                                            disabled={locked}
                                                        >
                                                            <option value="" disabled>Select</option>
                                                            <option value="salary">Salary</option>
                                                            <option value="advance">Advance</option>
                                                            <option value="commition">Commition</option>
                                                            <option value="bonus">Bonus</option>
                                                        </select>
                                                    ) : (
                                                        <div className="form-control-plaintext border rounded p-2 bg-light">
                                                            {p.status || "N/A"}
                                                        </div>
                                                    )}
                                                    <Err msg={paymentErrors[i]?.status} />
                                                </div>
                                            </div>

                                            <div className="col-md-4 mb-3">
                                                <div className="form-group">
                                                    <label className="form-label fw-semibold text-primary">
                                                        <i className="bi bi-file-text me-1"></i>
                                                        Receipt No
                                                    </label>
                                                    {isEditMode ? (
                                                        <input
                                                            type="tel"
                                                            className="form-control"
                                                            value={p.receiptNo || ""}
                                                            onChange={(e) => handleArrayChange("payments", i, "receiptNo", e.target.value)}
                                                            disabled={locked}
                                                            maxLength={3}
                                                        />
                                                    ) : (
                                                        <div className="form-control-plaintext border rounded p-2 bg-light">
                                                            {p.receiptNo || "N/A"}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Third Row: Total Days, Worked Days, Book No */}
                                        <div className="row mb-4">
                                            <div className="col-md-4 mb-3">
                                                <div className="form-group">
                                                    <label className="form-label fw-semibold text-primary">
                                                        <i className="bi bi-calendar-week me-1"></i>
                                                        Total Days
                                                        <span className="text-danger ms-1">*</span>
                                                    </label>
                                                    {isEditMode ? (
                                                        <input
                                                            type="tel"
                                                            maxLength={2}
                                                            className={`form-control${invalidClass("clientName")}`}
                                                            value={p.clientName || ""}
                                                            onChange={(e) => handleArrayChange("payments", i, "clientName", e.target.value)}
                                                            disabled={locked}
                                                        />
                                                    ) : (
                                                        <div className="form-control-plaintext border rounded p-2 bg-light">
                                                            {p.clientName || "N/A"}
                                                        </div>
                                                    )}
                                                    <Err msg={paymentErrors[i]?.clientName} />
                                                </div>
                                            </div>

                                            <div className="col-md-4 mb-3">
                                                <div className="form-group">
                                                    <label className="form-label fw-semibold text-primary">
                                                        <i className="bi bi-calendar-check me-1"></i>
                                                        Worked Days
                                                        <span className="text-danger ms-1">*</span>
                                                    </label>
                                                    {isEditMode ? (
                                                        <input
                                                            type="tel"
                                                            className={`form-control${invalidClass("days")}`}
                                                            value={p.days || ""}
                                                            onChange={(e) => handleArrayChange("payments", i, "days", e.target.value)}
                                                            disabled={locked}
                                                            maxLength={2}
                                                        />
                                                    ) : (
                                                        <div className="form-control-plaintext border rounded p-2 bg-light">
                                                            {p.days || "N/A"}
                                                        </div>
                                                    )}
                                                    <Err msg={paymentErrors[i]?.days} />
                                                </div>
                                            </div>

                                            <div className="col-md-4 mb-3">
                                                <div className="form-group">
                                                    <label className="form-label fw-semibold text-primary">
                                                        <i className="bi bi-journal me-1"></i>
                                                        Book No
                                                    </label>
                                                    {isEditMode ? (
                                                        <input
                                                            type="tel"
                                                            className="form-control"
                                                            value={p.bookNo || ""}
                                                            onChange={(e) => handleArrayChange("payments", i, "bookNo", e.target.value)}
                                                            disabled={locked}
                                                            maxLength={3}
                                                        />
                                                    ) : (
                                                        <div className="form-control-plaintext border rounded p-2 bg-light">
                                                            {p.bookNo || "N/A"}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Remarks Section */}
                                        <div className="row">
                                            <div className="col-12 mb-3">
                                                <div className="form-group">
                                                    <label className="form-label fw-semibold text-primary">
                                                        <i className="bi bi-chat-left-text me-1"></i>
                                                        Remarks
                                                    </label>
                                                    {isEditMode ? (
                                                        <textarea
                                                            className="form-control"
                                                            rows={2}
                                                            value={p.remarks || ""}
                                                            onChange={(e) => handleArrayChange("payments", i, "remarks", e.target.value)}
                                                            disabled={locked}
                                                        />
                                                    ) : (
                                                        <div className="form-control-plaintext border rounded p-2 bg-light">
                                                            {p.remarks || "N/A"}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Added By Information */}
                                        <div className="row mt-3 pt-3 border-top">
                                            <div className="col-12">
                                                <div className="d-flex align-items-center text-muted small">
                                                    <i className="bi bi-person-circle me-2"></i>
                                                    <span>Added by <strong className="text-dark">{p.createdByName || "*"}</strong></span>
                                                    {p.createdAt && (
                                                        <>
                                                            <span className="mx-2">•</span>
                                                            <i className="bi bi-clock-history me-1"></i>
                                                            <span>{new Date(p.createdAt).toLocaleString()}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {isEditMode && (
                    <div className="row">
                        <div className="col-12">
                            <div className="d-grid">
                                <button 
                                    className="btn btn-outline-primary btn-lg" 
                                    onClick={addPaymentSection}
                                >
                                    <i className="bi bi-plus-circle me-2"></i>
                                    Add New Payment
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentTab;