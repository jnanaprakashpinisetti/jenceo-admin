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
        <div className="modal-card ">
            <div className="modal-card-header">
                <h4 className="mb-0">Payment</h4>
            </div>
            <div className="modal-card-body">
                {(formData.payments || []).map((p, i) => {
                    const locked = !!p.__locked;
                    const invalidClass = (field) => (paymentErrors[i]?.[field] ? " is-invalid" : "");
                    return (
                        <div key={i} className="border rounded p-3 ">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h6 className="mb-0">
                                    Payment #{i + 1} {locked && <span className="badge bg-secondary ms-2">Locked</span>}
                                </h6>
                                {isEditMode && !locked && (
                                    <button className="btn btn-outline-danger btn-sm" onClick={() => removePaymentSection(i)}>
                                        Remove
                                    </button>
                                )}
                            </div>

                            <div className="row">
                                <div className="col-md-4 mb-2">
                                    <label className="form-label">
                                        <strong>Date</strong>
                                        <span className="star">*</span>
                                    </label>
                                    {isEditMode ? (
                                        <input
                                            type="date"
                                            className={`form-control form-control-sm${invalidClass("date")}`}
                                            value={p.date || ""}
                                            min={PAY_MIN}
                                            max={PAY_MAX}
                                            onChange={(e) => handleArrayChange("payments", i, "date", e.target.value)}
                                            disabled={locked}
                                        />
                                    ) : (
                                        <div className="form-control form-control-sm bg-light">{p.date || "N/A"}</div>
                                    )}
                                    <Err msg={paymentErrors[i]?.date} />
                                </div>

                                <div className="col-md-4 mb-2">
                                    <label className="form-label">
                                        <strong>Amount</strong>
                                        <span className="star">*</span>
                                    </label>
                                    {isEditMode ? (
                                        <input
                                            type="tel"
                                            inputMode="numeric"
                                            maxLength={5}
                                            pattern="^[0-9]{1,5}$"
                                            className={`form-control form-control-sm${invalidClass("amount")}`}
                                            value={p.amount || ""}
                                            onChange={(e) => handleArrayChange("payments", i, "amount", e.target.value)}
                                            disabled={locked}
                                        />
                                    ) : (
                                        <div className="form-control form-control-sm bg-light">{p.amount || "N/A"}</div>
                                    )}
                                    <Err msg={paymentErrors[i]?.amount} />
                                </div>

                                <div className="col-md-4 mb-2">
                                    <label className="form-label">
                                        <strong>Balance Amount</strong>
                                    </label>
                                    {isEditMode ? (
                                        <input
                                            type="tel"
                                            inputMode="numeric"
                                            pattern="^[0-9]+$"
                                            className={`form-control form-control-sm${invalidClass("balanceAmount")}`}
                                            value={p.balanceAmount || ""}
                                            onChange={(e) => handleArrayChange("payments", i, "balanceAmount", e.target.value)}
                                            disabled={locked}
                                            maxLength={5}
                                        />
                                    ) : (
                                        <div className="form-control form-control-sm bg-light">{p.balanceAmount || "N/A"}</div>
                                    )}
                                    <Err msg={paymentErrors[i]?.balanceAmount} />
                                </div>
                            </div>

                            <div className="row">
                                <div className="col-md-4 mb-2">
                                    <label className="form-label">
                                        <strong>Type of payment</strong>
                                        <span className="star">*</span>
                                    </label>
                                    {isEditMode ? (
                                        <select
                                            className={`form-select ${invalidClass("typeOfPayment")}`}
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
                                        <div className="form-control form-control-sm bg-light">{p.typeOfPayment || "N/A"}</div>
                                    )}
                                    <Err msg={paymentErrors[i]?.typeOfPayment} />
                                </div>

                                <div className="col-md-4 mb-2">
                                    <label className="form-label">
                                        <strong>Payment For</strong>
                                        <span className="star">*</span>
                                    </label>
                                    {isEditMode ? (
                                        <select
                                            className={`form-select ${invalidClass("status")}`}
                                            value={p.status || ""}
                                            onChange={(e) => handleArrayChange("payments", i, "status", e.target.value)}
                                            disabled={locked}
                                        >
                                            <option value="" disabled>
                                                Select
                                            </option>
                                            <option value="salary">Salary</option>
                                            <option value="advance">Advance</option>
                                            <option value="commition">Commition</option>
                                            <option value="bonus">Bonus</option>
                                        </select>
                                    ) : (
                                        <div className="form-control form-control-sm bg-light">{p.status || "N/A"}</div>
                                    )}
                                    <Err msg={paymentErrors[i]?.status} />
                                </div>

                                <div className="col-md-4 mb-2">
                                    <label className="form-label">
                                        <strong>Receipt No</strong>
                                    </label>
                                    {isEditMode ? (
                                        <input
                                            type="tel"
                                            className="form-control form-control-sm"
                                            value={p.receiptNo || ""}
                                            onChange={(e) => handleArrayChange("payments", i, "receiptNo", e.target.value)}
                                            disabled={locked}
                                            maxLength={3}
                                        />
                                    ) : (
                                        <div className="form-control form-control-sm bg-light">{p.receiptNo || "N/A"}</div>
                                    )}
                                </div>
                            </div>

                            <div className="row">
                                <div className="col-md-4 mb-2">
                                    <label className="form-label">
                                        <strong>Total Days</strong>
                                        <span className="star">*</span>
                                    </label>
                                    {isEditMode ? (
                                        <input
                                            type="tel"
                                            maxLength={2}
                                            className={`form-control form-control-sm${invalidClass("clientName")}`}
                                            value={p.clientName || ""}
                                            onChange={(e) => handleArrayChange("payments", i, "clientName", e.target.value)}
                                            disabled={locked}
                                        />
                                    ) : (
                                        <div className="form-control form-control-sm bg-light">{p.clientName || "N/A"}</div>
                                    )}
                                    <Err msg={paymentErrors[i]?.clientName} />
                                </div>

                                <div className="col-md-4 mb-2">
                                    <label className="form-label">
                                        <strong>Worked Days</strong>
                                        <span className="star">*</span>
                                    </label>
                                    {isEditMode ? (
                                        <input
                                            type="tel"
                                            className={`form-control form-control-sm${invalidClass("days")}`}
                                            value={p.days || ""}
                                            onChange={(e) => handleArrayChange("payments", i, "days", e.target.value)}
                                            disabled={locked}
                                            maxLength={2}
                                        />
                                    ) : (
                                        <div className="form-control form-control-sm bg-light">{p.days || "N/A"}</div>
                                    )}
                                    <Err msg={paymentErrors[i]?.days} />
                                </div>

                                <div className="col-md-4 mb-2">
                                    <label className="form-label">
                                        <strong>Book No</strong>
                                    </label>
                                    {isEditMode ? (
                                        <input
                                            type="tel"
                                            className="form-control form-control-sm"
                                            value={p.bookNo || ""}
                                            onChange={(e) => handleArrayChange("payments", i, "bookNo", e.target.value)}
                                            disabled={locked}
                                            maxLength={3}
                                        />
                                    ) : (
                                        <div className="form-control form-control-sm bg-light">{p.bookNo || "N/A"}</div>
                                    )}
                                </div>
                            </div>

                            <div className="row">
                                <div className="col-12 mb-2">
                                    <label className="form-label">
                                        <strong>Remarks</strong>
                                    </label>
                                    {isEditMode ? (
                                        <textarea
                                            className="form-control form-control-sm"
                                            rows={2}
                                            value={p.remarks || ""}
                                            onChange={(e) => handleArrayChange("payments", i, "remarks", e.target.value)}
                                            disabled={locked}
                                        />
                                    ) : (
                                        <div className="form-control form-control-sm bg-light">{p.remarks || "N/A"}</div>
                                    )}
                                </div>
                            </div>

                            <span className="small-text">Added By  <strong> {p.createdByName || "*"}{" "}</strong> </span>
                            {p.createdAt ? (
                                <small className="small-text">
                                    - {new Date(p.createdAt).toLocaleString()}
                                </small>
                            ) : null}
                        </div>
                    );
                })}

                {isEditMode && (
                    <div className="d-flex justify-content-end">
                        <button className="btn btn-outline-primary btn-sm mt-2" onClick={addPaymentSection}>
                            + Add Payment
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentTab;