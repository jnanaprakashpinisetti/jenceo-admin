import React from "react";

const PaymentDetails = ({ formData, handleChange, addPayment, removePayment, errors = {} }) => {
  const paymentsErrors = errors.payments || [];
  const getErr = (idx, key) => (paymentsErrors[idx] ? paymentsErrors[idx][key] : "");

  return (
    <div>
      {formData.payments.map((payment, index) => (
        <div key={payment.id} className="payment-card mb-3 p-3 border rounded">
          <h5>Payment #{index + 1}</h5>
          <div className="row">
            <div className="col-md-6">
              {/* Payment Method */}
              <div className="form-group mb-3">
                <label>
                  Payment Method <span className="star">*</span>
                </label>
                <div>
                  <div className="form-check form-check-inline">
                    <input
                      type="radio"
                      className={`form-check-input ${getErr(index, "paymentMethod") ? "is-invalid" : ""}`}
                      name={`paymentMethod`}
                      value="cash"
                      checked={payment.paymentMethod === "cash"}
                      onChange={(e) => handleChange(e, "payments", index)}
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
                      name={`paymentMethod`}
                      value="online"
                      checked={payment.paymentMethod === "online"}
                      onChange={(e) => handleChange(e, "payments", index)}
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
                      name={`paymentMethod`}
                      value="check"
                      checked={payment.paymentMethod === "check"}
                      onChange={(e) => handleChange(e, "payments", index)}
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

              {/* Balance */}
              <div className="form-group mb-3">
                <label>
                  Balance <span className="star">*</span>
                </label>
                <input
                  type="number"
                  className={`form-control ${getErr(index, "balance") ? "is-invalid" : ""}`}
                  name="balance"
                  value={payment.balance}
                  onChange={(e) => handleChange(e, "payments", index)}
                  id={`balance-${index}`}
                />
                {getErr(index, "balance") && (
                  <div className="invalid-feedback">{getErr(index, "balance")}</div>
                )}
              </div>

              {/* Receipt No */}
              <div className="form-group mb-3">
                <label>
                  Receipt No <span className="star">*</span>
                </label>
                <input
                  type="text"
                  className={`form-control ${getErr(index, "receptNo") ? "is-invalid" : ""}`}
                  name="receptNo"
                  value={payment.receptNo}
                  onChange={(e) => handleChange(e, "payments", index)}
                  id={`receptNo-${index}`}
                />
                {getErr(index, "receptNo") && (
                  <div className="invalid-feedback">{getErr(index, "receptNo")}</div>
                )}
              </div>
            </div>

            <div className="col-md-6">
              {/* Remarks */}
              <div className="form-group mb-3">
                <label>Remarks</label>
                <input
                  type="text"
                  className="form-control"
                  name="remarks"
                  value={payment.remarks}
                  onChange={(e) => handleChange(e, "payments", index)}
                  id={`remarks-${index}`}
                />
              </div>

              {/* Reminder Date */}
              <div className="form-group mb-3">
                <label>Reminder Date</label>
                <input
                  type="date"
                  className="form-control"
                  name="reminderDate"
                  value={payment.reminderDate}
                  onChange={(e) => handleChange(e, "payments", index)}
                  id={`reminderDate-${index}`}
                />
              </div>
            </div>
          </div>

          {formData.payments.length > 1 && (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => removePayment(index)}
            >
              Remove Payment
            </button>
          )}
        </div>
      ))}

      <button type="button" className="btn btn-primary" onClick={addPayment}>
        Add Payment
      </button>
    </div>
  );
};

export default PaymentDetails;