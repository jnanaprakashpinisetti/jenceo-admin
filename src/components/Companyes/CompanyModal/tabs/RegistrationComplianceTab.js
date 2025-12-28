import React from "react";

const RegistrationComplianceTab = ({ formData, editMode, errors, handleChange }) => {
  return (
    <div className="row">
      <div className="col-md-6">
        <div className="mb-3">
          <label className="form-label"><strong>Registration No *</strong></label>
          <input
            type="text"
            className={`form-control ${errors.registrationNo ? "is-invalid" : ""}`}
            name="registrationNo"
            value={formData.registrationNo || ""}
            onChange={handleChange}
            readOnly={!editMode}
            disabled={!editMode}
          />
          {errors.registrationNo && <div className="invalid-feedback">{errors.registrationNo}</div>}
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>CIN No</strong></label>
          <input
            type="text"
            className="form-control"
            name="cinNo"
            value={formData.cinNo || ""}
            onChange={handleChange}
            readOnly={!editMode}
            disabled={!editMode}
          />
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>TAN No</strong></label>
          <input
            type="text"
            className="form-control"
            name="tanNo"
            value={formData.tanNo || ""}
            onChange={handleChange}
            readOnly={!editMode}
            disabled={!editMode}
          />
        </div>
      </div>

      <div className="col-md-6">
        <div className="mb-3">
          <label className="form-label"><strong>GSTIN No *</strong></label>
          <input
            type="text"
            className={`form-control ${errors.gstinNo ? "is-invalid" : ""}`}
            name="gstinNo"
            value={formData.gstinNo || ""}
            onChange={handleChange}
            readOnly={!editMode}
            disabled={!editMode}
          />
          {errors.gstinNo && <div className="invalid-feedback">{errors.gstinNo}</div>}
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Labour License No</strong></label>
          <input
            type="text"
            className="form-control"
            name="labourLicenseNo"
            value={formData.labourLicenseNo || ""}
            onChange={handleChange}
            readOnly={!editMode}
            disabled={!editMode}
          />
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Google Location</strong></label>
          <input
            type="text"
            className="form-control"
            name="googleLocation"
            value={formData.googleLocation || ""}
            onChange={handleChange}
            readOnly={!editMode}
            disabled={!editMode}
            placeholder="Google Maps link or coordinates"
          />
        </div>
      </div>
    </div>
  );
};

export default RegistrationComplianceTab;