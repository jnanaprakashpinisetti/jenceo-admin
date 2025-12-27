import React from "react";

const RegistrationCompliance = ({ formData, errors, handleChange, handleBlur }) => {
  return (
    <div className="form-section">
      <h5>Registration & Compliance Details</h5>

      <div className="row">
        <Input name="registrationNo" label="Registration No *" {...props()} />
        <Input name="cinNo" label="CIN No" {...props()} />
        <Input name="tanNo" label="TAN No" {...props()} />
        <Input name="gstinNo" label="GSTIN No *" {...props()} />
        <Input name="labourLicenseNo" label="Labour License No" {...props()} />
        <Input name="googleLocation" label="Google Location (Map URL)" {...props()} />
      </div>
    </div>
  );

  function props() {
    return { value: formData, errors, handleChange, handleBlur };
  }
};

const Input = ({ name, label, value, errors, handleChange, handleBlur }) => (
  <div className="col-md-6 mb-3">
    <label>{label}</label>
    <input
      type="text"
      className={`form-control ${errors[name] ? "is-invalid" : ""}`}
      name={name}
      value={value[name] || ""}
      onChange={handleChange}
      onBlur={handleBlur}
    />
    {errors[name] && <div className="invalid-feedback">{errors[name]}</div>}
  </div>
);

export default RegistrationCompliance;
