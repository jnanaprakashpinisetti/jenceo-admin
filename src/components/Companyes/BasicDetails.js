// BasicDetails.js
import React from "react";

const companyTypeOptions = [
  "Home Care",
  "Housekeeping",
  "Office / Corporate",
  "Factory / Manufacturing",
  "Industrial",
  "Construction",
  "Retail / Shop",
  "Hospital / Healthcare",
  "Hotel / Hospitality",
  "Warehouse / Logistics",
  "Security Services",
  "Driving / Transport",
  "Technical / Maintenance",
  "Customer Service / BPO",
  "Management / Administration",
  "Government / Public Sector",
  "Education Institutions",
  "Others"
];

const businessCategoryOptions = [
  "Manufacturing",
  "Service Provider",
  "Trading",
  "Contractor",
  "Consultant",
  "Non-Profit",
  "Government Agency",
  "Educational Institution",
  "Healthcare Provider",
  "Hospitality",
  "Logistics & Transport",
  "IT Services",
  "Construction & Real Estate",
  "Retail & Wholesale",
  "Financial Services",
  "Agriculture",
  "Others"
];

const branchTypeOptions = [
  "Head Office",
  "Branch Office",
  "Regional Office",
  "Corporate Office",
  "Factory Unit",
  "Warehouse",
  "Retail Outlet",
  "Site Office",
  "Project Office",
  "Liaison Office",
  "Others"
];

const ownershipTypeOptions = [
  "Proprietorship",
  "Partnership",
  "Private Limited",
  "Public Limited",
  "LLP (Limited Liability Partnership)",
  "Government Undertaking",
  "Trust/Society",
  "Non-Profit Organization",
  "Foreign Company",
  "Joint Venture",
  "Others"
];

const BasicDetails = ({ formData, errors, handleChange, handleBlur }) => {
  return (
    <div className="step-container">
      <h4 className="step-title mb-4">Basic Details</h4>
      <div className="row g-3">
        {/* Company Name */}
        <div className="col-md-6">
          <label htmlFor="companyName" className="form-label required">
            Company Name
          </label>
          <input
            type="text"
            className={`form-control ${errors.companyName ? "is-invalid" : ""}`}
            id="companyName"
            name="companyName"
            value={formData.companyName || ""}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter company name"
          />
          {errors.companyName && (
            <div className="invalid-feedback">{errors.companyName}</div>
          )}
        </div>

        {/* Company Type */}
        <div className="col-md-6">
          <label htmlFor="companyType" className="form-label required">
            Company Type
          </label>
          <select
            className={`form-select ${errors.companyType ? "is-invalid" : ""}`}
            id="companyType"
            name="companyType"
            value={formData.companyType || ""}
            onChange={handleChange}
            onBlur={handleBlur}
          >
            <option value="">Select Company Type</option>
            {companyTypeOptions.map((type, idx) => (
              <option key={idx} value={type}>
                {type}
              </option>
            ))}
          </select>
          {errors.companyType && (
            <div className="invalid-feedback">{errors.companyType}</div>
          )}
        </div>

        {/* Company ID */}
        <div className="col-md-6">
          <label htmlFor="companyId" className="form-label required">
            Company ID
          </label>
          <input
            type="text"
            className={`form-control ${errors.companyId ? "is-invalid" : ""}`}
            id="companyId"
            name="companyId"
            value={formData.companyId || ""}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Auto-generated"
            readOnly
          />
          <small className="text-muted">Auto-generated based on company type</small>
          {errors.companyId && (
            <div className="invalid-feedback">{errors.companyId}</div>
          )}
        </div>

        {/* Business Category */}
        <div className="col-md-6">
          <label htmlFor="businessCategory" className="form-label">
            Business Category
          </label>
          <select
            className="form-select"
            id="businessCategory"
            name="businessCategory"
            value={formData.businessCategory || ""}
            onChange={handleChange}
            onBlur={handleBlur}
          >
            <option value="">Select Business Category</option>
            {businessCategoryOptions.map((category, idx) => (
              <option key={idx} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Branch Type */}
        <div className="col-md-6">
          <label htmlFor="branchType" className="form-label">
            Branch Type
          </label>
          <select
            className="form-select"
            id="branchType"
            name="branchType"
            value={formData.branchType || ""}
            onChange={handleChange}
            onBlur={handleBlur}
          >
            <option value="">Select Branch Type</option>
            {branchTypeOptions.map((type, idx) => (
              <option key={idx} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Branch Name */}
        <div className="col-md-6">
          <label htmlFor="branchName" className="form-label">
            Branch Name (if applicable)
          </label>
          <input
            type="text"
            className="form-control"
            id="branchName"
            name="branchName"
            value={formData.branchName || ""}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter branch name"
          />
        </div>

        {/* Year of Establishment */}
        <div className="col-md-4">
          <label htmlFor="yearOfEstablishment" className="form-label">
            Year of Establishment
          </label>
          <input
            type="number"
            className="form-control"
            id="yearOfEstablishment"
            name="yearOfEstablishment"
            value={formData.yearOfEstablishment || ""}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="YYYY"
            min="1900"
            max={new Date().getFullYear()}
          />
        </div>

        {/* Ownership Type */}
        <div className="col-md-4">
          <label htmlFor="ownershipType" className="form-label">
            Ownership Type
          </label>
          <select
            className="form-select"
            id="ownershipType"
            name="ownershipType"
            value={formData.ownershipType || ""}
            onChange={handleChange}
            onBlur={handleBlur}
          >
            <option value="">Select Ownership Type</option>
            {ownershipTypeOptions.map((type, idx) => (
              <option key={idx} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Website URL */}
        <div className="col-md-4">
          <label htmlFor="websiteUrl" className="form-label">
            Website URL
          </label>
          <input
            type="text"
            className={`form-control ${errors.websiteUrl ? "is-invalid" : ""}`}
            id="websiteUrl"
            name="websiteUrl"
            value={formData.websiteUrl || ""}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="https://example.com"
          />
          {errors.websiteUrl && (
            <div className="invalid-feedback">{errors.websiteUrl}</div>
          )}
        </div>

        {/* Official Email */}
        <div className="col-md-6">
          <label htmlFor="officialEmail" className="form-label required">
            Official Email
          </label>
          <input
            type="email"
            className={`form-control ${errors.officialEmail ? "is-invalid" : ""}`}
            id="officialEmail"
            name="officialEmail"
            value={formData.officialEmail || ""}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="company@example.com"
          />
          {errors.officialEmail && (
            <div className="invalid-feedback">{errors.officialEmail}</div>
          )}
        </div>

        {/* Official Phone */}
        <div className="col-md-6">
          <label htmlFor="officialPhone" className="form-label">
            Official Phone
          </label>
          <input
            type="tel"
            className={`form-control ${errors.officialPhone ? "is-invalid" : ""}`}
            id="officialPhone"
            name="officialPhone"
            value={formData.officialPhone || ""}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="10-digit mobile number"
            maxLength="10"
          />
          {errors.officialPhone && (
            <div className="invalid-feedback">{errors.officialPhone}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BasicDetails;