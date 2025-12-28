import React from "react";

const BasicInfoTab = ({ formData, editMode, errors, handleChange, setField }) => {
  const businessCategories = [
    "Home Care", "Housekeeping", "Office / Corporate", "Factory / Manufacturing",
    "Industrial", "Construction", "Retail / Shop", "Hospital / Healthcare",
    "Hotel / Hospitality", "Warehouse / Logistics", "Security Services",
    "Driving / Transport", "Technical / Maintenance", "Customer Service / BPO",
    "Management / Administration", "Government / Public Sector",
    "Education / Institutions", "Others"
  ];

  const ownershipTypes = [
    "Sole Proprietorship", "Partnership", "Private Limited", "Public Limited",
    "LLP", "Government", "Non-Profit", "Other"
  ];

  const branchTypes = ["Head Office", "Branch", "Subsidiary", "Regional Office", "Other"];

  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="row">
      <div className="col-md-6">
        <div className="mb-3">
          <label className="form-label"><strong>Company ID</strong></label>
          <input
            type="text"
            className={`form-control ${errors.companyId ? "is-invalid" : ""}`}
            name="companyId"
            value={formData.companyId || ""}
            onChange={handleChange}
            readOnly={!editMode}
            disabled
          />
          {errors.companyId && <div className="invalid-feedback">{errors.companyId}</div>}
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Company Name *</strong></label>
          <input
            type="text"
            className={`form-control ${errors.companyName ? "is-invalid" : ""}`}
            name="companyName"
            value={formData.companyName || ""}
            onChange={handleChange}
            readOnly={!editMode}
            disabled={!editMode}
          />
          {errors.companyName && <div className="invalid-feedback">{errors.companyName}</div>}
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Business Category *</strong></label>
          <select
            className={`form-control ${errors.companyType ? "is-invalid" : ""}`}
            name="companyType"
            value={formData.companyType || ""}
            onChange={handleChange}
            disabled={!editMode}
          >
            <option value="">Select Category</option>
            {businessCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {errors.companyType && <div className="invalid-feedback">{errors.companyType}</div>}
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Ownership Type</strong></label>
          <select
            className="form-control"
            name="ownershipType"
            value={formData.ownershipType || ""}
            onChange={handleChange}
            disabled={!editMode}
          >
            <option value="">Select Ownership</option>
            {ownershipTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="col-md-6">
        <div className="mb-3">
          <label className="form-label"><strong>Branch Type</strong></label>
          <select
            className="form-control"
            name="branchType"
            value={formData.branchType || ""}
            onChange={handleChange}
            disabled={!editMode}
          >
            <option value="">Select Branch Type</option>
            {branchTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Branch Name</strong></label>
          <input
            type="text"
            className="form-control"
            name="branchName"
            value={formData.branchName || ""}
            onChange={handleChange}
            readOnly={!editMode}
            disabled={!editMode}
          />
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Year Established</strong></label>
          <select
            className="form-control"
            name="yearOfEstablishment"
            value={formData.yearOfEstablishment || ""}
            onChange={handleChange}
            disabled={!editMode}
          >
            <option value="">Select Year</option>
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label"><strong>Official Email *</strong></label>
              <input
                type="email"
                className={`form-control ${errors.officialEmail ? "is-invalid" : ""}`}
                name="officialEmail"
                value={formData.officialEmail || ""}
                onChange={handleChange}
                readOnly={!editMode}
                disabled={!editMode}
              />
              {errors.officialEmail && <div className="invalid-feedback">{errors.officialEmail}</div>}
            </div>
          </div>
          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label"><strong>Official Phone</strong></label>
              <input
                type="tel"
                className="form-control"
                name="officialPhone"
                value={formData.officialPhone || ""}
                onChange={handleChange}
                readOnly={!editMode}
                disabled={!editMode}
                maxLength="10"
              />
            </div>
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Website</strong></label>
          <input
            type="url"
            className="form-control"
            name="websiteUrl"
            value={formData.websiteUrl || ""}
            onChange={handleChange}
            readOnly={!editMode}
            disabled={!editMode}
            placeholder="https://example.com"
          />
        </div>
      </div>
    </div>
  );
};

export default BasicInfoTab;