import React from "react";

const BankDetails = ({ formData, errors, handleChange }) => (
  <div className="form-section">
    <h5>Bank & Payment Details</h5>
    <div className="row">
      <Input 
        name="bankName" 
        label="Bank Name *" 
        formData={formData}
        errors={errors}
        handleChange={handleChange}
      />
      <Input 
        name="branchName" 
        label="Branch Name" 
        formData={formData}
        errors={errors}
        handleChange={handleChange}
      />
      <Input 
        name="accountHolderName" 
        label="Account Holder Name *" 
        formData={formData}
        errors={errors}
        handleChange={handleChange}
      />
      <Input 
        name="accountNumber" 
        label="Account Number *" 
        formData={formData}
        errors={errors}
        handleChange={handleChange}
      />
      <Input 
        name="ifscCode" 
        label="IFSC Code *" 
        formData={formData}
        errors={errors}
        handleChange={handleChange}
      />
      <Input 
        name="upiId" 
        label="UPI ID" 
        formData={formData}
        errors={errors}
        handleChange={handleChange}
      />
      <File 
        name="cancelledChequeFile" 
        label="Cancelled Cheque" 
        handleChange={handleChange}
      />
    </div>
  </div>
);

const Input = ({ name, label, formData, errors, handleChange }) => (
  <div className="col-md-6 mb-3">
    <label>{label}</label>
    <input
      name={name}
      value={formData[name] || ""}
      onChange={handleChange}
      className={`form-control ${errors[name] ? "is-invalid" : ""}`}
    />
    {errors[name] && <div className="invalid-feedback">{errors[name]}</div>}
  </div>
);

const File = ({ name, label, handleChange }) => (
  <div className="col-md-6 mb-3">
    <label>{label}</label>
    <input 
      type="file" 
      name={name} 
      onChange={handleChange} 
      className="form-control" 
    />
  </div>
);

export default BankDetails;