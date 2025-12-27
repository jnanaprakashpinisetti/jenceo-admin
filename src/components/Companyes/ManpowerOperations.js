import React from "react";

const ManpowerOperations = ({ formData, errors, handleChange }) => {
  return (
    <div className="form-section">
      <h5>Manpower & Operations</h5>

      <div className="row">
        <Input name="manpowerTypes" label="Types of Manpower" />
        <Select name="shiftCoverage" label="Shift Coverage" options={["Day", "Night", "Both"]} />
        <Input name="deploymentAreas" label="Deployment Areas (Cities / States)" />
        <Input type="date" name="contractStartDate" label="Contract Start Date *" />
        <Input type="date" name="contractEndDate" label="Contract End Date *" />
        <Select name="billingCycle" label="Billing Cycle *" options={["Weekly", "Fortnight", "Monthly"]} />
        <Select name="paymentTerms" label="Payment Terms *" options={["Advance", "Net 15", "Net 30", "Net 45"]} />
        <Select name="gstApplicable" label="GST Applicable *" options={["Yes", "No"]} />
        <Select name="tdsApplicable" label="TDS Applicable *" options={["Yes", "No"]} />
      </div>
    </div>
  );
};

const Input = ({ type = "text", name, label, formData, errors, handleChange }) => (
  <div className="col-md-6 mb-3">
    <label>{label}</label>
    <input
      type={type}
      name={name}
      value={formData[name] || ""}
      onChange={handleChange}
      className={`form-control ${errors[name] ? "is-invalid" : ""}`}
    />
    {errors[name] && <div className="invalid-feedback">{errors[name]}</div>}
  </div>
);

const Select = ({ name, label, options, formData, errors, handleChange }) => (
  <div className="col-md-6 mb-3">
    <label>{label}</label>
    <select
      name={name}
      value={formData[name] || ""}
      onChange={handleChange}
      className={`form-control ${errors[name] ? "is-invalid" : ""}`}
    >
      <option value="">Select</option>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
    {errors[name] && <div className="invalid-feedback">{errors[name]}</div>}
  </div>
);

export default ManpowerOperations;
