 import React from "react";

const ServiceSchedule = ({ formData, editMode, handleChange }) => {
  return (
    <div>
      <div className="alert alert-info text-info">
        <i className="bi bi-info-circle me-2"></i>
        <strong>Note:</strong> This tab is specific to Care Recipients. For Housekeeping, this tab is not applicable.
      </div>
      
      {editMode ? (
        <div className="row mb-2">
          <div className="col-md-12">
            <div className="card">
              <div className="card-header bg-info text-white">
                <h5 className="mb-0">Housekeeping Service Details payments</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label"><strong>Service Type</strong></label>
                    <select className="form-control" name="serviceType" value={formData.serviceType || ""} onChange={handleChange}>
                      <option value="">Select Service Type</option>
                      <option value="daily">Daily Cleaning</option>
                      <option value="weekly">Weekly Cleaning</option>
                      <option value="monthly">Monthly Deep Cleaning</option>
                      <option value="office">Office Cleaning</option>
                      <option value="post-construction">Post-Construction Cleaning</option>
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label"><strong>Service Frequency</strong></label>
                    <select className="form-control" name="serviceFrequency" value={formData.serviceFrequency || ""} onChange={handleChange}>
                      <option value="">Select Frequency</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="fortnightly">Fortnightly</option>
                      <option value="monthly">Monthly</option>
                      <option value="one-time">One Time</option>
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label"><strong>Service Hours/Day</strong></label>
                    <input className="form-control" name="serviceHours" value={formData.serviceHours || ""} onChange={handleChange} placeholder="Hours per day" />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label"><strong>Preferred Time</strong></label>
                    <input className="form-control" name="preferredTime" value={formData.preferredTime || ""} onChange={handleChange} placeholder="Preferred time slot" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="row">
          <div className="col-md-12">
            <div className="card">
              <div className="card-header bg-info text-white">
                <h5 className="mb-0">Housekeeping Service Details p2</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-4 mb-3">
                    <div className="card h-100">
                      <div className="card-body">
                        <h6 className="card-subtitle mb-2 text-muted">Service Type</h6>
                        <p className="card-text">{formData.serviceType || "—"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4 mb-3">
                    <div className="card h-100">
                      <div className="card-body">
                        <h6 className="card-subtitle mb-2 text-muted">Service Frequency</h6>
                        <p className="card-text">{formData.serviceFrequency || "—"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4 mb-3">
                    <div className="card h-100">
                      <div className="card-body">
                        <h6 className="card-subtitle mb-2 text-muted">Service Hours/Day</h6>
                        <p className="card-text">{formData.serviceHours || "—"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-12 mb-3">
                    <div className="card h-100">
                      <div className="card-body">
                        <h6 className="card-subtitle mb-2 text-muted">Preferred Time</h6>
                        <p className="card-text">{formData.preferredTime || "—"}</p>
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
  );
};

export default ServiceSchedule;
 