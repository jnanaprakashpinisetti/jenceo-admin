import React from "react";

const PrimaryContact = ({ formData, errors, handleChange }) => {
  return (
    <div className="form-section">
      <h5>Point of Contact – Primary</h5>
      <div className="row">
        <Input name="primaryContactName" label="Contact Person Name *" />
        <Input name="primaryDesignation" label="Designation *" />
        <Input name="primaryDepartment" label="Department" />
        <Input name="primaryMobile" label="Mobile No *" />
        <Input name="primaryAlternateMobile" label="Alternate Mobile No" />
        <Input name="primaryEmail" label="Official Email ID" />
        <Select
          name="primaryPreferredMethod"
          label="Preferred Contact Method *"
          options={["Call", "WhatsApp", "Email"]}
        />
      </div>
    </div>
  );

  function Input({ name, label }) {
    return (
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
  }

  function Select({ name, label, options }) {
    return (
      <div className="col-md-6 mb-3">
        <label>{label}</label>
        <select
          className={`form-control ${errors[name] ? "is-invalid" : ""}`}
          name={name}
          value={formData[name] || ""}
          onChange={handleChange}
        >
          <option value="">Select</option>
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
        {errors[name] && <div className="invalid-feedback">{errors[name]}</div>}
      </div>
    );
  }
};

export default PrimaryContact;
