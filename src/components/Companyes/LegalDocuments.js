// LegalDocuments.js
import React from "react";

const LegalDocuments = ({ formData, errors, handleChange }) => {
  const docs = [
    ["companyLogoFile", "Company Logo (<100 KB)"],
    ["incorporationCertFile", "Certificate of Incorporation"],
    ["panCardFile", "PAN Card Copy *"],
    ["gstCertFile", "GST Certificate *"],
    ["labourLicenseFile", "Labour License"],
    ["pfRegFile", "PF Registration Certificate"],
    ["esiRegFile", "ESI Registration Certificate"],
    ["agreementFile", "Agreement Copy"],
    ["bondFile", "Bond / Undertaking"],
    ["insuranceFile", "Insurance Policy Copy"],
  ];

  return (
    <div className="form-section">
      <h5>Legal Documents</h5>
      <div className="row">
        {docs.map(([name, label]) => (
          <div className="col-md-6 mb-3" key={name}>
            <label>{label}</label>
            <input 
              type="file" 
              name={name} 
              onChange={handleChange} 
              className="form-control" 
            />
            {errors[name] && <small className="text-danger">{errors[name]}</small>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LegalDocuments;