// PaymentDetails.js
import React from "react";

const PaymentDetails = ({ formData, handleChange, addPayment, removePayment, errors = {}, isViewMode = false }) => {
  const paymentsErrors = errors.payments || [];

  // Min date (today)
  const today = new Date();
  const minDate = new Date();
  minDate.setDate(today.getDate());
  const minDateFormatted = minDate.toISOString().split("T")[0];

  const getErr = (idx, key) => (paymentsErrors[idx] ? paymentsErrors[idx][key] : "");

  // Custom handler for radio buttons
  const handleRadioChange = (e, index, value) => {
    const fakeEvent = { target: { name: "paymentMethod", value: value } };
    handleChange(fakeEvent, "payments", index);
  };

  // Format amount input (only allow numbers)
  const formatAmount = (value) => value.replace(/[^\d]/g, "");

  // Custom handler for amount fields
  const handleAmountChange = (e, index, fieldName) => {
    const formattedValue = formatAmount(e.target.value);
    const fakeEvent = { target: { name: fieldName, value: formattedValue } };
    handleChange(fakeEvent, "payments", index);
  };

  return (
    <div>
      {(formData.payments || []).map((payment, index) => (
        <div key={payment.id || index} className="payment-card mb-3 p-3 border rounded">
          <h5>Payment #{index + 1}</h5>

          {/* Payment Method */}
          <div className="row">
            <div className="col-md-12">
              <div className="form-group">
                <label><strong>Payment Method</strong> <span className="text-danger">*</span></label>
                <div>
                  <div className="form-check form-check-inline">
                    <input type="radio" className={`form-check-input ${getErr(index, "paymentMethod") ? "is-invalid" : ""}`}
                      name={`paymentMethod-${index}`} value="cash" checked={payment.paymentMethod === "cash"}
                      onChange={(e) => handleRadioChange(e, index, "cash")} id={`paymentMethod-cash-${index}`} disabled={isViewMode} />
                    <label className="form-check-label" htmlFor={`paymentMethod-cash-${index}`}>Cash</label>
                  </div>
                  <div className="form-check form-check-inline">
                    <input type="radio" className={`form-check-input ${getErr(index, "paymentMethod") ? "is-invalid" : ""}`}
                      name={`paymentMethod-${index}`} value="online" checked={payment.paymentMethod === "online"}
                      onChange={(e) => handleRadioChange(e, index, "online")} id={`paymentMethod-online-${index}`} disabled={isViewMode} />
                    <label className="form-check-label" htmlFor={`paymentMethod-online-${index}`}>Online</label>
                  </div>
                  <div className="form-check form-check-inline">
                    <input type="radio" className={`form-check-input ${getErr(index, "paymentMethod") ? "is-invalid" : ""}`}
                      name={`paymentMethod-${index}`} value="check" checked={payment.paymentMethod === "check"}
                      onChange={(e) => handleRadioChange(e, index, "check")} id={`paymentMethod-check-${index}`} disabled={isViewMode} />
                    <label className="form-check-label" htmlFor={`paymentMethod-check-${index}`}>Check</label>
                  </div>
                </div>
                {getErr(index, "paymentMethod") && <div className="text-danger mt-1">{getErr(index, "paymentMethod")}</div>}
              </div>
            </div>
          </div>

          {/* Paid Amount + Balance */}
          <div className="row">
            <div className="col-md-6">
              <div className="form-group">
                <label><strong>Paid Amount</strong> <span className="text-danger">*</span></label>
                <input type="tel" inputMode="numeric"
                  className={`form-control ${getErr(index, "paidAmount") ? "is-invalid" : ""}`}
                  name="paidAmount" value={payment.paidAmount || ""} onChange={(e) => handleAmountChange(e, index, "paidAmount")}
                  id={`paidAmount-${index}`} placeholder="Enter amount" readOnly={isViewMode} maxLength={5} />
                {getErr(index, "paidAmount") && <div className="invalid-feedback">{getErr(index, "paidAmount")}</div>}
              </div>
            </div>

            <div className="col-md-6">
              <div className="form-group">
                <label><strong>Balance</strong></label>
                <input type="text" inputMode="numeric"
                  className={`form-control ${getErr(index, "balance") ? "is-invalid" : ""}`}
                  name="balance" value={payment.balance || ""} onChange={(e) => handleAmountChange(e, index, "balance")}
                  id={`balance-${index}`} placeholder="Enter balance" readOnly={isViewMode} maxLength={5} />
                {getErr(index, "balance") && <div className="invalid-feedback">{getErr(index, "balance")}</div>}
              </div>
            </div>
          </div>

          {/* Receipt No + Book No */}
          <div className="row">
            <div className="col-md-6">
              <div className="form-group">
                <label><strong>Receipt No</strong> <span className="text-danger">*</span></label>
                <input type="text" inputMode="numeric"
                  className={`form-control ${getErr(index, "receptNo") ? "is-invalid" : ""}`}
                  name="receptNo" value={payment.receptNo || ""} onChange={(e) => handleChange(e, "payments", index)}
                  id={`receptNo-${index}`} placeholder="Enter receipt number" readOnly={isViewMode} maxLength={2} />
                {getErr(index, "receptNo") && <div className="invalid-feedback">{getErr(index, "receptNo")}</div>}
              </div>
            </div>

            <div className="col-md-6">
              <div className="form-group">
                <label><strong>Book No</strong></label>
                <input type="text" className={`form-control ${getErr(index, "bookNo") ? "is-invalid" : ""}`}
                  name="bookNo" value={payment.bookNo || ""} onChange={(e) => handleChange(e, "payments", index)}
                  id={`bookNo-${index}`} placeholder="Enter book number" readOnly={isViewMode} />
                {getErr(index, "bookNo") && <div className="invalid-feedback">{getErr(index, "bookNo")}</div>}
              </div>
            </div>
          </div>

          {/* Reminder Days + Reminder Date */}
          <div className="row">
            <div className="col-md-4">
              <div className="form-group">
                <label><strong>Reminder Days</strong></label>
                <input type="number" min="0"
                  className={`form-control ${getErr(index, "reminderDays") ? "is-invalid" : ""}`}
                  name="reminderDays" value={payment.reminderDays || ""} onChange={(e) => handleChange(e, "payments", index)}
                  id={`reminderDays-${index}`} placeholder="Days before reminder" readOnly={isViewMode} />
                {getErr(index, "reminderDays") && <div className="invalid-feedback">{getErr(index, "reminderDays")}</div>}
                <small className="form-text text-muted">Enter number of days; reminder date will auto-update.</small>
              </div>
            </div>

            <div className="col-md-4">
              <div className="form-group">
                <label><strong>Reminder Date</strong></label>
                <input type="date" className="form-control" name="reminderDate" value={payment.reminderDate || ""} onChange={(e) => handleChange(e, "payments", index)} id={`reminderDate-${index}`} min={minDateFormatted} readOnly={isViewMode ? true : false} />
                <small className="form-text text-muted">You can modify the date after Reminder Days sets it.</small>
              </div>
            </div>

            <div className="col-md-4">
              <div className="form-group">
                <label><strong>Payment Date</strong></label>
                <input type="date" className={`form-control ${getErr(index, "date") ? "is-invalid" : ""}`} name="date" value={payment.date || ""} onChange={(e) => handleChange(e, "payments", index)} id={`date-${index}`} />
                {getErr(index, "date") && <div className="invalid-feedback">{getErr(index, "date")}</div>}
              </div>
            </div>
          </div>

          {/* Remarks row - full width, textarea */}
          <div className="row mt-2">
            <div className="col-12">
              <div className="form-group">
                <label><strong>Remarks</strong></label>
                <textarea className="form-control" name="remarks" rows="3" value={payment.remarks || ""} onChange={(e) => handleChange(e, "payments", index)} id={`remarks-${index}`} placeholder="Any additional notes" readOnly={isViewMode} />
              </div>
            </div>
          </div>

          {(formData.payments || []).length > 1 && !isViewMode && (
            <div className="mt-2">
              <button type="button" className="btn btn-danger btn-sm btn-remove" onClick={() => removePayment(index)}>Remove Payment</button>
            </div>
          )}
        </div>
      ))}

      {!isViewMode && (
        <button type="button" className="btn btn-primary btn-sm mt-2" onClick={addPayment}>
          + Add Another Payment
        </button>
      )}
    </div>
  );
};

export default PaymentDetails;
