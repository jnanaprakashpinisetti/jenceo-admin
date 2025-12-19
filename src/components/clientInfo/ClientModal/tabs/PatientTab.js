import React from "react";

const PatientTab = ({ formData, editMode, handleChange }) => {
  return (
    <div>
      {editMode ? (
        <div className="row mb-2">
          <div className="col-md-3 mb-3">
            <div className="card">
              <div className="card-body">
                <label className="form-label"><strong>Care Recipient Name</strong></label>
                <input className="form-control" name="patientName" value={formData.patientName || ""} onChange={handleChange} disabled={!editMode} />
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-3">
            <div className="card">
              <div className="card-body">
                <label className="form-label"><strong>Age</strong></label>
                <input className="form-control" name="patientAge" value={formData.patientAge || ""} onChange={handleChange} disabled={!editMode} />
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-3">
            <div className="card">
              <div className="card-body">
                <label className="form-label"><strong>Service Status</strong></label>
                <select className="form-control" name="serviceStatus" value={formData.serviceStatus || ""} onChange={handleChange} disabled={!editMode} >
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
          <div className="col-md-3 mb-3">
            <div className="card">
              <div className="card-body">
                <label className="form-label"><strong>Dropper Name</strong></label>
                <input className="form-control" name="dropperName" value={formData.dropperName || ""} onChange={handleChange} disabled={!editMode} />
              </div>
            </div>
          </div>
          <div className="col-md-6 mb-3">
            <div className="card h-100">
              <div className="card-body">
                <label className="form-label"><strong>About Care Recipient</strong></label>
                <textarea className="form-control" name="aboutPatent" value={formData.aboutPatent || ""} onChange={handleChange} disabled={!editMode} rows="4" />
              </div>
            </div>
          </div>
          <div className="col-md-6 mb-3">
            <div className="card h-100">
              <div className="card-body">
                <label className="form-label"><strong>About Work</strong></label>
                <textarea className="form-control" name="aboutWork" value={formData.aboutWork || ""} onChange={handleChange} disabled={!editMode} rows="4" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="row">
          <div className="col-md-3 mb-3">
            <div className="card">
              <div className="card-body">
                <h6 className="card-subtitle mb-2 text-muted">Care Recipient</h6>
                <p className="card-text">{formData.patientName || "—"}</p>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-3">
            <div className="card">
              <div className="card-body">
                <h6 className="card-subtitle mb-2 text-muted">Age</h6>
                <p className="card-text">{formData.patientAge || "—"}</p>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-3">
            <div className="card">
              <div className="card-body">
                <h6 className="card-subtitle mb-2 text-muted">Service Status</h6>
                <p className="card-text">{formData.serviceStatus || "—"}</p>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-3">
            <div className="card">
              <div className="card-body">
                <h6 className="card-subtitle mb-2 text-muted">Dropper Name</h6>
                <p className="card-text">{formData.dropperName || "—"}</p>
              </div>
            </div>
          </div>
          <div className="col-md-6 mb-3">
            <div className="card h-100">
              <div className="card-body">
                <h6 className="card-subtitle mb-2 text-muted">About Care Recipient</h6>
                <p className="card-text">{formData.aboutPatent || "—"}</p>
              </div>
            </div>
          </div>
          <div className="col-md-6 mb-3">
            <div className="card h-100">
              <div className="card-body">
                <h6 className="card-subtitle mb-2 text-muted">About Work</h6>
                <p className="card-text">{formData.aboutWork || "—"}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientTab;