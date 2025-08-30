import React from "react";

const PaymentDetails = ({ formData, handleChange, addPayment, removePayment, errors = {} }) => {
  const paymentsErrors = errors.payments || [];

  // Min date (today)
  const today = new Date();
  const minDate = new Date();
  minDate.setDate(today.getDate());
  const minDateFormatted = minDate.toISOString().split("T")[0];

  const getErr = (idx, key) => (paymentsErrors[idx] ? paymentsErrors[idx][key] : "");

  // Custom handler for radio buttons
  const handleRadioChange = (e, index, value) => {
    const fakeEvent = {
      target: {
        name: "paymentMethod",
        value: value,
      },
    };
    handleChange(fakeEvent, "payments", index);
  };

  // Format amount input (only allow numbers)
  const formatAmount = (value) => {
    return value.replace(/[^\d]/g, '');
  };

  // Custom handler for amount fields
  const handleAmountChange = (e, index, fieldName) => {
    const formattedValue = formatAmount(e.target.value);
    const fakeEvent = {
      target: {
        name: fieldName,
        value: formattedValue,
      },
    };
    handleChange(fakeEvent, "payments", index);
  };

  return (
    <div>
      {formData.payments.map((payment, index) => (
        <div key={payment.id || index} className="payment-card mb-3 p-3 border rounded">
          <h5>Payment #{index + 1}</h5>

          {/* Payment Method */}
          <div className="row">
            <div className="col-md-12">
              <div className="form-group">
                <label>
                  Payment Method <span className="star">*</span>
                </label>
                <div>
                  <div className="form-check form-check-inline">
                    <input
                      type="radio"
                      className={`form-check-input ${getErr(index, "paymentMethod") ? "is-invalid" : ""}`}
                      name={`paymentMethod-${index}`}
                      value="cash"
                      checked={payment.paymentMethod === "cash"}
                      onChange={(e) => handleRadioChange(e, index, "cash")}
                      id={`paymentMethod-cash-${index}`}
                    />
                    <label className="form-check-label" htmlFor={`paymentMethod-cash-${index}`}>
                      Cash
                    </label>
                  </div>
                  <div className="form-check form-check-inline">
                    <input
                      type="radio"
                      className={`form-check-input ${getErr(index, "paymentMethod") ? "is-invalid" : ""}`}
                      name={`paymentMethod-${index}`}
                      value="online"
                      checked={payment.paymentMethod === "online"}
                      onChange={(e) => handleRadioChange(e, index, "online")}
                      id={`paymentMethod-online-${index}`}
                    />
                    <label className="form-check-label" htmlFor={`paymentMethod-online-${index}`}>
                      Online
                    </label>
                  </div>
                  <div className="form-check form-check-inline">
                    <input
                      type="radio"
                      className={`form-check-input ${getErr(index, "paymentMethod") ? "is-invalid" : ""}`}
                      name={`paymentMethod-${index}`}
                      value="check"
                      checked={payment.paymentMethod === "check"}
                      onChange={(e) => handleRadioChange(e, index, "check")}
                      id={`paymentMethod-check-${index}`}
                    />
                    <label className="form-check-label" htmlFor={`paymentMethod-check-${index}`}>
                      Check
                    </label>
                  </div>
                </div>
                {getErr(index, "paymentMethod") && (
                  <div className="text-danger mt-1">{getErr(index, "paymentMethod")}</div>
                )}
              </div>
            </div>
          </div>

          {/* Paid Amount + Balance */}
          <div className="row">
            <div className="col-md-6">
              {/* Paid Amount */}
              <div className="form-group">
                <label>
                  Paid Amount <span className="star">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  className={`form-control ${getErr(index, "paidAmount") ? "is-invalid" : ""}`}
                  name="paidAmount"
                  value={payment.paidAmount || ""}
                  onChange={(e) => handleAmountChange(e, index, "paidAmount")}
                  id={`paidAmount-${index}`}
                  maxLength={5}
                  placeholder="Enter amount"
                />
                {getErr(index, "paidAmount") && (
                  <div className="invalid-feedback">{getErr(index, "paidAmount")}</div>
                )}
              </div>
            </div>

            <div className="col-md-6">
              {/* Balance */}
              <div className="form-group">
                <label>
                  Balance <span className="star">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  className={`form-control ${getErr(index, "balance") ? "is-invalid" : ""}`}
                  name="balance"
                  value={payment.balance || ""}
                  onChange={(e) => handleAmountChange(e, index, "balance")}
                  id={`balance-${index}`}
                  maxLength={5}
                  placeholder="Enter balance"
                />
                {getErr(index, "balance") && (
                  <div className="invalid-feedback">{getErr(index, "balance")}</div>
                )}
              </div>
            </div>
          </div>

          {/* Receipt No + Book No */}
          <div className="row">
            <div className="col-md-6">
              {/* Receipt No */}
              <div className="form-group">
                <label>
                  Receipt No <span className="star">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  className={`form-control ${getErr(index, "receptNo") ? "is-invalid" : ""}`}
                  name="receptNo"
                  value={payment.receptNo || ""}
                  onChange={(e) => handleChange(e, "payments", index)}
                  id={`receptNo-${index}`}
                  maxLength={10}
                  placeholder="Enter receipt number"
                />
                {getErr(index, "receptNo") && (
                  <div className="invalid-feedback">{getErr(index, "receptNo")}</div>
                )}
              </div>
            </div>

            <div className="col-md-6">
              {/* Book No */}
              <div className="form-group">
                <label>Book No</label>
                <input
                  type="text"
                  className={`form-control ${getErr(index, "bookNo") ? "is-invalid" : ""}`}
                  name="bookNo"
                  value={payment.bookNo || ""}
                  onChange={(e) => handleChange(e, "payments", index)}
                  id={`bookNo-${index}`}
                  maxLength={20}
                  placeholder="Enter book number"
                />
                {getErr(index, "bookNo") && <div className="invalid-feedback">{getErr(index, "bookNo")}</div>}
              </div>
            </div>
          </div>

          {/* Reminder Date + Remarks */}
          <div className="row">
            <div className="col-md-6">
              {/* Reminder Date */}
              <div className="form-group">
                <label>Reminder Date</label>
                <input
                  type="date"
                  className="form-control"
                  name="reminderDate"
                  value={payment.reminderDate || ""}
                  onChange={(e) => handleChange(e, "payments", index)}
                  id={`reminderDate-${index}`}
                  min={minDateFormatted}
                />
                <small className="form-text text-muted">Must be today or later</small>
              </div>
            </div>

            <div className="col-md-6">
              {/* Remarks */}
              <div className="form-group">
                <label>Remarks</label>
                <input
                  type="text"
                  className="form-control"
                  name="remarks"
                  value={payment.remarks || ""}
                  onChange={(e) => handleChange(e, "payments", index)}
                  id={`remarks-${index}`}
                  placeholder="Any additional notes"
                />
              </div>
            </div>
          </div>

          {formData.payments.length > 1 && (
            <button
              type="button"
              className="btn btn-danger btn-sm btn-remove"
              onClick={() => removePayment(index)}
            >
              Remove Payment
            </button>
          )}
        </div>
      ))}

      <button type="button" className="btn btn-primary btn-sm mt-2" onClick={addPayment}>
        + Add Another Payment
      </button>
    </div>
  );
};

export default PaymentDetails;