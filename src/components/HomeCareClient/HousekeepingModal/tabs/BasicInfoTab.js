import React from "react";

const BasicInfoTab = ({ formData, editMode, errors, handleChange, setField }) => {
  return (
    <div className="card border-0 shadow-sm">
      {/* Card Header */}
      <div className="card-header bg-white border-0 py-3">
        <div className="d-flex align-items-center">
          <div className="bg-primary bg-opacity-10 p-2 rounded me-3">
            <i className="bi bi-person-badge-fill text-primary fs-4"></i>
          </div>
          <div>
            <h4 className="mb-0 fw-bold text-primary">Basic Information</h4>
            <small className="text-muted">Client's primary details and contact information</small>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="card-body">
        {editMode ? (
          <div className="row g-4">
            {/* ID No */}
            <div className="col-md-6 col-lg-4">
              <div className="form-group">
                <label className="form-label fw-semibold">
                  <i className="bi bi-card-text me-2 text-muted"></i>
                  ID No
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light">
                    <i className="bi bi-hash"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control bg-light"
                    name="idNo"
                    value={formData.idNo || ""}
                    onChange={handleChange}
                    disabled
                    readOnly
                  />
                </div>
              </div>
            </div>

            {/* Client Name */}
            <div className="col-md-6 col-lg-4">
              <div className="form-group">
                <label className="form-label fw-semibold">
                  <i className="bi bi-person-circle me-2 text-muted"></i>
                  Client Name <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light">
                    <i className="bi bi-person"></i>
                  </span>
                  <input
                    className={`form-control ${errors.clientName ? "is-invalid" : ""}`}
                    name="clientName"
                    value={formData.clientName || ""}
                    onChange={handleChange}
                    placeholder="Enter client name"
                  />
                </div>
                {errors.clientName && (
                  <div className="invalid-feedback d-flex align-items-center mt-1">
                    <i className="bi bi-exclamation-circle me-1"></i>
                    {errors.clientName}
                  </div>
                )}
              </div>
            </div>

            {/* Gender */}
            <div className="col-md-6 col-lg-4">
              <div className="form-group">
                <label className="form-label fw-semibold">
                  <i className="bi bi-gender-ambiguous me-2 text-muted"></i>
                  Gender
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light">
                    <i className="bi bi-gender-ambiguous"></i>
                  </span>
                  <select
                    className="form-select"
                    name="gender"
                    value={formData.gender || ""}
                    onChange={handleChange}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Care Of */}
            <div className="col-md-6 col-lg-4">
              <div className="form-group">
                <label className="form-label fw-semibold">
                  <i className="bi bi-person-heart me-2 text-muted"></i>
                  Care Of
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light">
                    <i className="bi bi-person-heart"></i>
                  </span>
                  <input
                    className="form-control"
                    name="careOf"
                    value={formData.careOf || ""}
                    onChange={handleChange}
                    placeholder="Father/Guardian name"
                  />
                </div>
                <small className="text-muted">Guardian or parent information</small>
              </div>
            </div>

            {/* Relation */}
            <div className="col-md-6 col-lg-4">
              <div className="form-group">
                <label className="form-label fw-semibold">
                  <i className="bi bi-people me-2 text-muted"></i>
                  Relation
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light">
                    <i className="bi bi-diagram-3"></i>
                  </span>
                  <input
                    className="form-control"
                    name="relation"
                    value={formData.relation || ""}
                    onChange={handleChange}
                    placeholder="Relationship"
                  />
                </div>
                <small className="text-muted">Relationship with guardian</small>
              </div>
            </div>

            {/* Location */}
            <div className="col-md-6 col-lg-4">
              <div className="form-group">
                <label className="form-label fw-semibold">
                  <i className="bi bi-geo-alt me-2 text-muted"></i>
                  Location
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light">
                    <i className="bi bi-pin-map"></i>
                  </span>
                  <input
                    className="form-control"
                    name="location"
                    value={formData.location || ""}
                    onChange={handleChange}
                    placeholder="Area/Village/Town"
                  />
                </div>
                <small className="text-muted">Primary residence location</small>
              </div>
            </div>

            {/* Mobile 1 */}
            <div className="col-md-6 col-lg-4">
              <div className="form-group">
                <label className="form-label fw-semibold">
                  <i className="bi bi-phone me-2 text-muted"></i>
                  Mobile 1
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light">
                    <i className="bi bi-telephone"></i>
                  </span>
                  <input
                    className="form-control"
                    name="mobileNo1"
                    value={formData.mobileNo1 || ""}
                    onChange={handleChange}
                    placeholder="Primary contact number"
                    maxLength={10}
                  />
                </div>
                {formData.mobileNo1 && (
                  <div className="mt-2">
                    <a
                      href={`tel:${formData.mobileNo1}`}
                      className="btn btn-sm btn-outline-primary me-2"
                    >
                      <i className="bi bi-telephone-outbound me-1"></i> Call
                    </a>
                    <a
                      href={`https://wa.me/${formData.mobileNo1}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-outline-success"
                    >
                      <i className="bi bi-whatsapp me-1"></i> WhatsApp
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile 2 */}
            <div className="col-md-6 col-lg-4">
              <div className="form-group">
                <label className="form-label fw-semibold">
                  <i className="bi bi-phone me-2 text-muted"></i>
                  Mobile 2
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light">
                    <i className="bi bi-telephone"></i>
                  </span>
                  <input
                    className="form-control"
                    name="mobileNo2"
                    value={formData.mobileNo2 || ""}
                    onChange={handleChange}
                    placeholder="Alternate contact number"
                    maxLength={10}
                  />
                </div>
                {formData.mobileNo2 && (
                  <div className="mt-2">
                    <a
                      href={`tel:${formData.mobileNo2}`}
                      className="btn btn-sm btn-outline-primary me-2"
                    >
                      <i className="bi bi-telephone-outbound me-1"></i> Call
                    </a>
                    <a
                      href={`https://wa.me/${formData.mobileNo2}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-outline-success"
                    >
                      <i className="bi bi-whatsapp me-1"></i> WhatsApp
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Google Location */}
            <div className="col-md-12 col-lg-4">
              <div className="form-group">
                <label className="form-label fw-semibold">
                  <i className="bi bi-google me-2 text-muted"></i>
                  Google Location
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light">
                    <i className="bi bi-geo-alt-fill"></i>
                  </span>
                  <input
                    className="form-control bg-light"
                    name="googleLocation"
                    value={formData.googleLocation || ""}
                    onChange={handleChange}
                    disabled
                    readOnly
                  />
                </div>
                <small className="text-muted">Auto-detected location (read-only)</small>
              </div>
            </div>
          </div>
        ) : (
          // Read-only View Mode
          <div className="row g-4">
            {/* ID & Name Card */}
            <div className="col-md-6">
              <div className="card border h-100">
                <div className="card-header bg-light py-2">
                  <h6 className="mb-0 fw-semibold">
                    <i className="bi bi-person-badge me-2"></i>
                    Identification
                  </h6>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-6 mb-3">
                      <div className="d-flex align-items-center">
                        <div className="bg-primary bg-opacity-10 p-2 rounded me-2">
                          <i className="bi bi-hash text-primary"></i>
                        </div>
                        <div>
                          <small className="text-muted d-block">ID No</small>
                          <span className="fw-semibold">{formData.idNo || "—"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-6 mb-3">
                      <div className="d-flex align-items-center">
                        <div className="bg-info bg-opacity-10 p-2 rounded me-2">
                          <i className="bi bi-person text-info"></i>
                        </div>
                        <div>
                          <small className="text-muted d-block">Client Name</small>
                          <span className="fw-semibold">{formData.clientName || "—"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Gender & Guardian Card */}
            <div className="col-md-6">
              <div className="card border h-100">
                <div className="card-header bg-light py-2">
                  <h6 className="mb-0 fw-semibold">
                    <i className="bi bi-people me-2"></i>
                    Personal Details
                  </h6>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-6 mb-3">
                      <div className="d-flex align-items-center">
                        <div className={`p-2 rounded me-2 ${formData.gender === 'Male' ? 'bg-primary bg-opacity-10' : formData.gender === 'Female' ? 'bg-pink bg-opacity-10' : 'bg-secondary bg-opacity-10'}`}>
                          <i className={`bi ${formData.gender === 'Male' ? 'bi-gender-male text-primary' : formData.gender === 'Female' ? 'bi-gender-female text-pink' : 'bi-gender-ambiguous text-secondary'}`}></i>
                        </div>
                        <div>
                          <small className="text-muted d-block">Gender</small>
                          <span className="fw-semibold">{formData.gender || "—"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-6 mb-3">
                      <div className="d-flex align-items-center">
                        <div className="bg-warning bg-opacity-10 p-2 rounded me-2">
                          <i className="bi bi-person-heart text-warning"></i>
                        </div>
                        <div>
                          <small className="text-muted d-block">Care Of</small>
                          <span className="fw-semibold">{formData.careOf || "—"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="d-flex align-items-center">
                        <div className="bg-success bg-opacity-10 p-2 rounded me-2">
                          <i className="bi bi-diagram-3 text-success"></i>
                        </div>
                        <div>
                          <small className="text-muted d-block">Relation</small>
                          <span className="fw-semibold">{formData.relation || "—"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information Card */}
            <div className="col-md-6">
              <div className="card border h-100">
                <div className="card-header bg-light py-2">
                  <h6 className="mb-0 fw-semibold">
                    <i className="bi bi-telephone me-2"></i>
                    Contact Information
                  </h6>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-6 mb-3">
                      <div className="d-flex align-items-center">
                        <div className="bg-primary bg-opacity-10 p-2 rounded me-2">
                          <i className="bi bi-phone text-primary"></i>
                        </div>
                        <div>
                          <small className="text-muted d-block">Mobile 1</small>
                          <span className="fw-semibold">{formData.mobileNo1 || "—"}</span>
                          {formData.mobileNo1 && (
                            <div className="mt-1">
                              <a href={`tel:${formData.mobileNo1}`} className="btn btn-xs btn-outline-primary btn-sm py-0 px-2 me-1">
                                <i className="bi bi-telephone"></i>
                              </a>
                              <a href={`https://wa.me/${formData.mobileNo1}`} target="_blank" rel="noopener noreferrer" className="btn btn-xs btn-outline-success btn-sm py-0 px-2">
                                <i className="bi bi-whatsapp"></i>
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="col-6 mb-3">
                      <div className="d-flex align-items-center">
                        <div className="bg-info bg-opacity-10 p-2 rounded me-2">
                          <i className="bi bi-phone text-info"></i>
                        </div>
                        <div>
                          <small className="text-muted d-block">Mobile 2</small>
                          <span className="fw-semibold">{formData.mobileNo2 || "—"}</span>
                          {formData.mobileNo2 && (
                            <div className="mt-1">
                              <a href={`tel:${formData.mobileNo2}`} className="btn btn-xs btn-outline-primary btn-sm py-0 px-2 me-1">
                                <i className="bi bi-telephone"></i>
                              </a>
                              <a href={`https://wa.me/${formData.mobileNo2}`} target="_blank" rel="noopener noreferrer" className="btn btn-xs btn-outline-success btn-sm py-0 px-2">
                                <i className="bi bi-whatsapp"></i>
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Location Card */}
            <div className="col-md-6">
              <div className="card border h-100">
                <div className="card-header bg-light py-2">
                  <h6 className="mb-0 fw-semibold">
                    <i className="bi bi-geo-alt me-2"></i>
                    Location Details
                  </h6>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-12 mb-3">
                      <div className="d-flex align-items-start">
                        <div className="bg-warning bg-opacity-10 p-2 rounded me-2">
                          <i className="bi bi-pin-map text-warning"></i>
                        </div>
                        <div className="flex-grow-1">
                          <small className="text-muted d-block">Location</small>
                          <span className="fw-semibold">{formData.location || "—"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="d-flex align-items-start">
                        <div className="bg-danger bg-opacity-10 p-2 rounded me-2">
                          <i className="bi bi-google text-danger"></i>
                        </div>
                        <div className="flex-grow-1">
                          <small className="text-muted d-block">Google Location</small>
                          <span className="fw-semibold">{formData.googleLocation || "—"}</span>
                          {formData.googleLocation && (
                            <div className="mt-1">
                              <a 
                                href={`https://maps.google.com/?q=${encodeURIComponent(formData.googleLocation)}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-outline-danger"
                              >
                                <i className="bi bi-geo-alt me-1"></i> View on Maps
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Card Footer (only in edit mode) */}
      {editMode && (
        <div className="card-footer bg-secondary border-0 pt-0">
          <div className="d-flex justify-content-between align-items-center w-100 text-white">
            <small className="d-flex">
              <i className="bi bi-info-circle me-1"></i>
              Fields marked with <span className="text-danger">*</span> are required
            </small>
            <div className="border-0">
              <button 
                type="button" 
                className="btn btn-outline-primary btn-sm me-2"
                onClick={() => setField('activeTab', 'address')}
              >
                <i className="bi bi-arrow-left me-1"></i> Previous
              </button>
              <button 
                type="button" 
                className="btn btn-primary btn-sm"
                onClick={() => setField('activeTab', 'service')}
              >
                Next <i className="bi bi-arrow-right ms-1"></i>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BasicInfoTab;
 