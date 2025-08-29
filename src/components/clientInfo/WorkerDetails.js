import React from "react";

const WorkerDetails = ({ formData, handleChange, addWorker, removeWorker, errors = {} }) => {
  const workersErrors = errors.workers || [];
  const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format

  const getErr = (idx, key) => (workersErrors[idx] ? workersErrors[idx][key] : "");

  return (
    <div>
      {formData.workers.map((worker, index) => (
        <div key={index} className="worker-card mb-3 p-3 border rounded">
          <h5>Worker #{index + 1}</h5>

          <div className="row">
            <div className="col-md-6">
              {/* Worker ID No */}
              <div className="form-group mb-3">
                <label htmlFor={`workerIdNo-${index}`}>
                  Worker ID No <span className="star">*</span>
                </label>
                <input
                  type="text"
                  id={`workerIdNo-${index}`}
                  className={`form-control ${getErr(index, "workerIdNo") ? "is-invalid" : ""}`}
                  name="workerIdNo"
                  value={worker.workerIdNo}
                  onChange={(e) => handleChange(e, "workers", index)}
                />
                {getErr(index, "workerIdNo") && (
                  <div className="invalid-feedback">{getErr(index, "workerIdNo")}</div>
                )}
              </div>
            </div>
            <div className="col-md-6">
              {/* Name */}
              <div className="form-group mb-3">
                <label htmlFor={`cName-${index}`}>
                  Name <span className="star">*</span>
                </label>
                <input
                  type="text"
                  id={`cName-${index}`}
                  className={`form-control ${getErr(index, "cName") ? "is-invalid" : ""}`}
                  name="cName"
                  value={worker.cName}
                  onChange={(e) => handleChange(e, "workers", index)}
                />
                {getErr(index, "cName") && (
                  <div className="invalid-feedback">{getErr(index, "cName")}</div>
                )}
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-md-6">
              {/* Starting Date */}
              <div className="form-group mb-3">
                <label htmlFor={`startingDate-${index}`}>
                  Starting Date <span className="star">*</span>
                </label>
                <input
                  type="date"
                  id={`startingDate-${index}`}
                  className={`form-control ${getErr(index, "startingDate") ? "is-invalid" : ""}`}
                  name="startingDate"
                  value={worker.startingDate}
                  onChange={(e) => handleChange(e, "workers", index)}
                  max={today}
                />
                {getErr(index, "startingDate") && (
                  <div className="invalid-feedback">{getErr(index, "startingDate")}</div>
                )}
              </div>
            </div>
            <div className="col-md-6">
              {/* Ending Date */}
              <div className="form-group mb-3">
                <label htmlFor={`endingDate-${index}`}>Ending Date</label>
                <input
                  type="date"
                  id={`endingDate-${index}`}
                  className="form-control"
                  name="endingDate"
                  value={worker.endingDate}
                  onChange={(e) => handleChange(e, "workers", index)}
                  max={today}
                />
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-md-6">
              {/* Mobile 1 */}
              <div className="form-group mb-3">
                <label htmlFor={`mobile1-${index}`}>
                  Mobile 1 <span className="star">*</span>
                </label>
                <input
                  type="tel"
                  id={`mobile1-${index}`}
                  className={`form-control ${getErr(index, "mobile1") ? "is-invalid" : ""}`}
                  name="mobile1"
                  value={worker.mobile1}
                  onChange={(e) => handleChange(e, "workers", index)}
                  maxLength="10"
                />
                {getErr(index, "mobile1") && (
                  <div className="invalid-feedback">{getErr(index, "mobile1")}</div>
                )}
              </div>
            </div>
            <div className="col-md-6">
              {/* Mobile 2 */}
              <div className="form-group mb-3">
                <label htmlFor={`mobile2-${index}`}>Mobile 2</label>
                <input
                  type="tel"
                  id={`mobile2-${index}`}
                  className={`form-control ${getErr(index, "mobile2") ? "is-invalid" : ""}`}
                  name="mobile2"
                  value={worker.mobile2}
                  onChange={(e) => handleChange(e, "workers", index)}
                  maxLength="10"
                />
                {getErr(index, "mobile2") && (
                  <div className="invalid-feedback">{getErr(index, "mobile2")}</div>
                )}
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-md-6">
              {/* Basic Salary */}
              <div className="form-group mb-3">
                <label htmlFor={`basicSalary-${index}`}>
                  Basic <span className="star">*</span>
                </label>
                <input
                  type="tel"
                  id={`basicSalary-${index}`}
                  className={`form-control ${getErr(index, "basicSalary") ? "is-invalid" : ""}`}
                  name="basicSalary"
                  value={worker.basicSalary}
                  onChange={(e) => handleChange(e, "workers", index)}
                  maxLength={5}
                />
                {getErr(index, "basicSalary") && (
                  <div className="invalid-feedback">{getErr(index, "basicSalary")}</div>
                )}
              </div>
            </div>
            <div className="col-md-6">
              {/* Remarks */}
              <div className="form-group mb-3">
                <label htmlFor={`remarks-${index}`}>Remarks</label>
                <input
                  type="text"
                  id={`remarks-${index}`}
                  className="form-control"
                  name="remarks"
                  value={worker.remarks}
                  onChange={(e) => handleChange(e, "workers", index)}
                />
              </div>
            </div>
          </div>

          {formData.workers.length > 1 && (
            <button
              type="button"
              className="btn btn-danger btn-sm btn-remov"
              onClick={() => removeWorker(index)}
            >
              Remove
            </button>
          )}
        </div>
      ))}

      <button type="button" className="btn btn-primary btn-sm" onClick={addWorker}>
        Add
      </button>
    </div>
  );
};

export default WorkerDetails;