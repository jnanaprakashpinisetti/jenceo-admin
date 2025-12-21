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
                <h5 className="mb-0">Housekeeping Service Details</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label className="form-label"><strong>Type of Service</strong></label>
                    <select className="form-control" name="typeOfService" value={formData.typeOfService || ""} onChange={handleChange}>
                      <option value="">Select Service Type</option>
                      <option value="daily-cleaning">Daily Cleaning</option>
                      <option value="weekly-cleaning">Weekly Cleaning</option>
                      <option value="monthly-deep-cleaning">Monthly Deep Cleaning</option>
                      <option value="office-cleaning">Office Cleaning</option>
                      <option value="post-construction">Post-Construction Cleaning</option>
                      <option value="carpet-cleaning">Carpet Cleaning</option>
                      <option value="window-cleaning">Window Cleaning</option>
                      <option value="disinfection">Disinfection Service</option>
                    </select>
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label"><strong>Service Frequency</strong></label>
                    <select className="form-control" name="servicePeriod" value={formData.servicePeriod || ""} onChange={handleChange}>
                      <option value="">Select Frequency</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="fortnightly">Fortnightly</option>
                      <option value="monthly">Monthly</option>
                      <option value="one-time">One Time</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label"><strong>Service Charges</strong></label>
                    <input className="form-control" name="serviceCharges" value={formData.serviceCharges || ""} onChange={handleChange} placeholder="Monthly/One-time charges" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Charges & Dates Card */}
          <div className="col-12 mb-4">
            <div className="card shadow-sm">
              <div className="card-header bg-secondary text-white">
                <h5 className="mb-0">Schedule & Additional Details</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label className="form-label"><strong>Travelling Charges</strong></label>
                    <input className="form-control" name="travellingCharges" value={formData.travellingCharges || ""} onChange={handleChange} placeholder="If applicable" />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label"><strong>Starting Date</strong></label>
                    <input className="form-control" name="startingDate" type="date" value={formData.startingDate || ""} onChange={handleChange} />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label"><strong>Ending Date</strong></label>
                    <input className="form-control" name="endingDate" type="date" value={formData.endingDate || ""} onChange={handleChange} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label"><strong>Preferred Time Slot</strong></label>
                    <input className="form-control" name="preferredTime" value={formData.preferredTime || ""} onChange={handleChange} placeholder="e.g., 9:00 AM - 12:00 PM" />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label"><strong>Service Hours/Day</strong></label>
                    <input className="form-control" name="serviceHours" value={formData.serviceHours || ""} onChange={handleChange} placeholder="Hours per service day" />
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
                    <input className="form-control" name="pageNo" value={formData.pageNo || ""} onChange={handleChange} />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label"><strong>Gap if Any</strong></label>
                    <input className="form-control" name="gapIfAny" value={formData.gapIfAny || ""} onChange={handleChange} placeholder="Any service gaps" />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label text-primary"><strong>Service Status</strong></label>
                    <select className="form-control" name="serviceStatus" value={formData.serviceStatus || ""} onChange={handleChange}>
                      <option value="running">Running</option>
                      <option value="closed">Closed</option>
                      <option value="stop">Stop</option>
                      <option value="re-open">Re-open</option>
                      <option value="re-start">Re-start</option>
                      <option value="re-place">Re-place</option>
                      <option value="on-hold">On Hold</option>
                    </select>
                  </div>
                  <div className="col-12 mb-3">
                    <label className="form-label"><strong>Special Instructions</strong></label>
                    <textarea className="form-control" name="serviceRemarks" value={formData.serviceRemarks || ""} onChange={handleChange} rows="3" placeholder="Any special instructions or requirements" />
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
                    <strong className="text-muted">Service Frequency</strong>
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

                <div className="row border-bottom py-2">
                  <div className="col-6">
                    <strong className="text-muted">Preferred Time Slot</strong>
                  </div>
                  <div className="col-6">
                    {formData.preferredTime || "—"}
                  </div>
                </div>

                <div className="row py-2">
                  <div className="col-6">
                    <strong className="text-muted">Service Hours/Day</strong>
                  </div>
                  <div className="col-6">
                    {formData.serviceHours || "—"}
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
                    <span className={`badge ${formData.serviceStatus === "running" ? "bg-success" : formData.serviceStatus === "closed" ? "bg-danger" : formData.serviceStatus === "on-hold" ? "bg-warning" : "bg-secondary"}`}>
                      {formData.serviceStatus ? formData.serviceStatus.charAt(0).toUpperCase() + formData.serviceStatus.slice(1) : "—"}
                    </span>
                  </div>
                </div>
                
                <div className="row py-2">
                  <div className="col-6">
                    <strong className="text-muted">Special Instructions</strong>
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
 