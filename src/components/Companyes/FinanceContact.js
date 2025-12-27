import React from "react";

const FinanceContact = ({ formData, errors, handleChange }) => (
  <div className="form-section">
    <h5>Finance / Billing Contact</h5>
    <div className="row">
      <Input name="financeContactName" label="Finance Contact Name *" />
      <Input name="financeDesignation" label="Designation" />
      <Input name="financeMobile" label="Mobile No" />
      <Input name="financeEmail" label="Email ID" />

      <div className="col-md-6 mb-3">
        <label>Billing Address Same as Registered</label>
        <select
          name="billingAddressSame"
          className="form-control"
          value={formData.billingAddressSame ? "Yes" : "No"}
          onChange={e =>
            handleChange({
              target: {
                name: "billingAddressSame",
                value: e.target.value === "Yes",
              },
            })
          }
        >
          <option>Yes</option>
          <option>No</option>
        </select>
      </div>
    </div>
  </div>
);

const Input = ({ name, label, formData, errors, handleChange }) => (
  <div className="col-md-6 mb-3">
    <label>{label}</label>
    <input
      className={`form-control ${errors[name] ? "is-invalid" : ""}`}
      name={name}
      value={formData[name] || ""}
      onChange={handleChange}
    />
    {errors[name] && <div className="invalid-feedback">{errors[name]}</div>}
  </div>
);

export default FinanceContact;
