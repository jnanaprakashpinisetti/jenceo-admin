import React from "react";

const ServiceTab = ({ formData, editMode, handleChange }) => {
  return (
    <div>
      {editMode ? (
        <div className="row mb-2">
          {/* Service Details Card */}
          <div className="col-12 mb-4">
            <div className="card shadow-sm">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">Service Details</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label className="form-label"><strong>Type of Service</strong></label>
                    <input className="form-control" name="typeOfService" value={formData.typeOfService || ""} onChange={handleChange} disabled={!editMode} />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label"><strong>Service Period</strong></label>
                    <input className="form-control" name="servicePeriod" value={formData.servicePeriod || ""} onChange={handleChange} disabled={!editMode} />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label"><strong>Service Charges</strong></label>
                    <input className="form-control" name="serviceCharges" value={formData.serviceCharges || ""} onChange={handleChange} disabled />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Charges & Dates Card */}
          <div className="col-12 mb-4">
            <div className="card shadow-sm">
              <div className="card-header bg-secondary text-white">
                <h5 className="mb-0">Additional Details</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label className="form-label"><strong>Travelling Charges</strong></label>
                    <input className="form-control" name="travellingCharges" value={formData.travellingCharges || ""} onChange={handleChange} disabled />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label"><strong>Starting Date</strong></label>
                    <input className="form-control" name="startingDate" value={formData.startingDate || ""} onChange={handleChange} disabled={!editMode} />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label"><strong>Ending Date</strong></label>
                    <input className="form-control" name="endingDate" value={formData.endingDate || ""} onChange={handleChange} disabled={!editMode} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status & Other Info Card */}
          <div className="col-12 mb-4">
            <div className="card shadow-sm">
              <div className="card-header bg-info text-white">
                <h5 className="mb-0">Status & Other Information</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label className="form-label"><strong>Page No</strong></label>
                    <input className="form-control" name="pageNo" value={formData.pageNo || ""} onChange={handleChange} disabled={!editMode} />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label"><strong>Gap if Any</strong></label>
                    <input className="form-control" name="gapIfAny" value={formData.gapIfAny || ""} onChange={handleChange} disabled={!editMode} />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label text-primary"><strong>Service Status</strong></label>
                    <select className="form-control" name="serviceStatus" value={formData.serviceStatus || ""} onChange={handleChange} disabled={!editMode}>
                      <option value="running">Running</option>
                      <option value="closed">Closed</option>
                      <option value="stop">Stop</option>
                      <option value="re-open">Re-open</option>
                      <option value="re-start">Re-start</option>
                      <option value="re-place">Re-place</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="row">
          {/* Readonly Card Layout - Left Column */}
          <div className="col-md-6 mb-4">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">Service Information</h5>
              </div>
              <div className="card-body">
                {/* Row 1: Type of Service & Service Charges */}
                <div className="row border-bottom py-2">
                  <div className="col-6">
                    <strong className="text-muted">Type of Service</strong>
                  </div>
                  <div className="col-6">
                    {formData.typeOfService || "—"}
                  </div>
                </div>
                
                {/* Row 2: Service Period & Service Remarks */}
                <div className="row border-bottom py-2">
                  <div className="col-6">
                    <strong className="text-muted">Service Period</strong>
                  </div>
                  <div className="col-6">
                    {formData.servicePeriod || "—"}
                  </div>
                </div>
                
                {/* Row 3: Service Charges & Travelling Charges */}
                <div className="row border-bottom py-2">
                  <div className="col-6">
                    <strong className="text-muted">Service Charges</strong>
                  </div>
                  <div className="col-6">
                    {formData.serviceCharges || "—"}
                  </div>
                </div>
                
                <div className="row border-bottom py-2">
                  <div className="col-6">
                    <strong className="text-muted">Travelling Charges</strong>
                  </div>
                  <div className="col-6">
                    {formData.travellingCharges || "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Readonly Card Layout - Right Column */}
          <div className="col-md-6 mb-4">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-secondary text-white">
                <h5 className="mb-0">Dates & Status</h5>
              </div>
              <div className="card-body">
                {/* Row 1: Starting Date & Ending Date */}
                <div className="row border-bottom py-2">
                  <div className="col-6">
                    <strong className="text-muted">Starting Date</strong>
                  </div>
                  <div className="col-6">
                    {formData.startingDate || "—"}
                  </div>
                </div>
                
                <div className="row border-bottom py-2">
                  <div className="col-6">
                    <strong className="text-muted">Ending Date</strong>
                  </div>
                  <div className="col-6">
                    {formData.endingDate || "—"}
                  </div>
                </div>
                
                {/* Row 2: Page No & Gap If Any */}
                <div className="row border-bottom py-2">
                  <div className="col-6">
                    <strong className="text-muted">Page No</strong>
                  </div>
                  <div className="col-6">
                    {formData.pageNo || "—"}
                  </div>
                </div>
                
                <div className="row border-bottom py-2">
                  <div className="col-6">
                    <strong className="text-muted">Gap If Any</strong>
                  </div>
                  <div className="col-6">
                    {formData.gapIfAny || "—"}
                  </div>
                </div>
                
                {/* Row 3: Service Status & Service Remarks */}
                <div className="row border-bottom py-2">
                  <div className="col-6">
                    <strong className="text-muted">Service Status</strong>
                  </div>
                  <div className="col-6">
                    <span className={`badge ${formData.serviceStatus === "running" ? "bg-success" : formData.serviceStatus === "closed" ? "bg-danger" : "bg-warning"}`}>
                      {formData.serviceStatus ? formData.serviceStatus.charAt(0).toUpperCase() + formData.serviceStatus.slice(1) : "—"}
                    </span>
                  </div>
                </div>
                
                <div className="row py-2">
                  <div className="col-6">
                    <strong className="text-muted">Service Remarks</strong>
                  </div>
                  <div className="col-6">
                    {formData.serviceRemarks || "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceTab;