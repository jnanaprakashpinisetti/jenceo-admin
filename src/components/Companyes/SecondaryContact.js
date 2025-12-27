// SecondaryContact.js
import React from "react";

const SecondaryContact = ({ formData, errors, handleChange }) => {
  return (
    <div className="form-section">
      <h5>Point of Contact – Secondary</h5>
      <div className="row">
        <Input name="secondaryContactName" label="Contact Person Name *" 
               formData={formData} errors={errors} handleChange={handleChange} />
        <Input name="secondaryDesignation" label="Designation *" 
               formData={formData} errors={errors} handleChange={handleChange} />
        <Input name="secondaryDepartment" label="Department" 
               formData={formData} errors={errors} handleChange={handleChange} />
        <Input name="secondaryMobile" label="Mobile No *" 
               formData={formData} errors={errors} handleChange={handleChange} />
        <Input name="secondaryAlternateMobile" label="Alternate Mobile No" 
               formData={formData} errors={errors} handleChange={handleChange} />
        <Input name="secondaryEmail" label="Official Email ID" 
               formData={formData} errors={errors} handleChange={handleChange} />
        <Select
          name="secondaryPreferredMethod"
          label="Preferred Contact Method *"
          options={["Call", "WhatsApp", "Email"]}
          formData={formData}
          errors={errors}
          handleChange={handleChange}
        />
      </div>
    </div>
  );
};

function Input({ name, label, formData, errors, handleChange }) {
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

function Select({ name, label, options, formData, errors, handleChange }) {
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
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {errors[name] && <div className="invalid-feedback">{errors[name]}</div>}
    </div>
  );
}

export default SecondaryContact;