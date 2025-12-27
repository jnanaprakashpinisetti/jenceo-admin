// PrimaryContact.js
import React from "react";

const PrimaryContact = ({ formData, errors, handleChange }) => {
  return (
    <div className="form-section">
      <h5>Point of Contact – Primary</h5>
      <div className="row">
        <Input name="primaryContactName" label="Contact Person Name *" 
               formData={formData} errors={errors} handleChange={handleChange} />
        <Input name="primaryDesignation" label="Designation *" 
               formData={formData} errors={errors} handleChange={handleChange} />
        <Input name="primaryDepartment" label="Department" 
               formData={formData} errors={errors} handleChange={handleChange} />
        <Input name="primaryMobile" label="Mobile No *" 
               formData={formData} errors={errors} handleChange={handleChange} />
        <Input name="primaryAlternateMobile" label="Alternate Mobile No" 
               formData={formData} errors={errors} handleChange={handleChange} />
        <Input name="primaryEmail" label="Official Email ID" 
               formData={formData} errors={errors} handleChange={handleChange} />
        <Select
          name="primaryPreferredMethod"
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

// Make Input and Select separate components or keep them as functions but pass props
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

export default PrimaryContact;