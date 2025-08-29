import React from "react";

export default function PatientDetails({ formData, handleChange, errors = {} }) {
  return (
    <div className="row">

      <div className="row">
        <div className="col-md-6">
          {/* Care Recipients Name */}
          <div className="form-group mb-3">
            <label>Care Recipients Name<span className="text-danger">*</span></label>
            <input
              type="text"
              className={`form-control ${errors.patientName ? "is-invalid" : ""}`}
              name="patientName"
              value={formData.patientName}
              onChange={handleChange}
            />
            {errors.patientName && <div className="invalid-feedback">{errors.patientName}</div>}
          </div>
        </div>
        <div className="col-md-6">
          {/* Care Recipients Age */}
          <div className="form-group mb-3">
            <label>Care Recipients Age<span className="text-danger">*</span></label>
            <input
              type="number"
              className={`form-control ${errors.patentAge ? "is-invalid" : ""}`}
              name="patentAge"
              value={formData.patentAge}
              onChange={handleChange}
            />
            {errors.patentAge && <div className="invalid-feedback">{errors.patentAge}</div>}
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-md-6">
          {/* Service Status */}
          <div className="form-group mb-3">
            <label>Service Status<span className="text-danger">*</span></label>
            <select
              className={`form-control ${errors.serviceStatus ? "is-invalid" : ""}`}
              name="serviceStatus"
              value={formData.serviceStatus}
              onChange={handleChange}
            >
              <option value="">Select Status</option>
              <option value="running">Running</option>
              <option value="closed">Closed</option>
              <option value="stop">Stop</option>
              <option value="re-open">Re-open</option>
              <option value="re-start">Re-start</option>
              <option value="re-place">Re-place</option>
            </select>
            {errors.serviceStatus && <div className="invalid-feedback">{errors.serviceStatus}</div>}
          </div>
        </div>
        <div className="col-md-6">
          {/* Dropper Name */}
          <div className="form-group mb-3">
            <label>Dropper Name<span className="text-danger">*</span></label>
            <input
              type="text"
              className={`form-control ${errors.dropperName ? "is-invalid" : ""}`}
              name="dropperName"
              value={formData.dropperName}
              onChange={handleChange}
            />
            {errors.dropperName && <div className="invalid-feedback">{errors.dropperName}</div>}
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-md-12">
          {/* About Care Recipients */}
          <div className="form-group mb-3">
            <label>About Care Recipients<span className="text-danger">*</span></label>
            <textarea
              className={`form-control ${errors.aboutPatent ? "is-invalid" : ""}`}
              name="aboutPatent"
              value={formData.aboutPatent}
              onChange={handleChange}
              rows="4"
            />
            {errors.aboutPatent && <div className="invalid-feedback">{errors.aboutPatent}</div>}
          </div>
        </div>
        <div className="col-md-12">
          {/* About Work */}
          <div className="form-group mb-3">
            <label>About Work<span className="text-danger">*</span></label>
            <textarea
              className={`form-control ${errors.aboutWork ? "is-invalid" : ""}`}
              name="aboutWork"
              value={formData.aboutWork}
              onChange={handleChange}
              rows="4"
            />
            {errors.aboutWork && <div className="invalid-feedback">{errors.aboutWork}</div>}
          </div>
        </div>
      </div>

    </div>
  );
}