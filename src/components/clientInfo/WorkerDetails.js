import React from "react";

const WorkerDetails = ({ formData, handleChange, addWorker, removeWorker, errors = {} }) => {
  const workersErrors = errors.workers || [];

  const getErr = (idx, key) => (workersErrors[idx] ? workersErrors[idx][key] : "");

  return (
    <div>
      {formData.workers.map((worker, index) => (
        <div key={worker.id} className="worker-card mb-3 p-3 border rounded">
          <h5>Worker #{index + 1}</h5>
          <div className="row">
            <div className="col-md-6">
              {/* Worker ID No */}
              <div className="form-group mb-3">
                <label>
                  Worker ID No<span className="star">*</span>
                </label>
                <input
                  type="text"
                  className={`form-control ${getErr(index, "workerIdNo") ? "is-invalid" : ""}`}
                  name="workerIdNo"
                  value={worker.workerIdNo}
                  onChange={(e) => handleChange(e, "workers", index)}
                  id={`workerIdNo-${index}`}
                />
                {getErr(index, "workerIdNo") && (
                  <div className="invalid-feedback">{getErr(index, "workerIdNo")}</div>
                )}
              </div>

              {/* Name */}
              <div className="form-group mb-3">
                <label>
                  Name <span className="star">*</span>
                </label>
                <input
                  type="text"
                  className={`form-control ${getErr(index, "cName") ? "is-invalid" : ""}`}
                  name="cName"
                  value={worker.cName}
                  onChange={(e) => handleChange(e, "workers", index)}
                  id={`cName-${index}`}
                />
                {getErr(index, "cName") && (
                  <div className="invalid-feedback">{getErr(index, "cName")}</div>
                )}
              </div>

              {/* Basic Salary */}
              <div className="form-group mb-3">
                <label>
                  Basic Salary <span className="star">*</span>
                </label>
                <input
                  type="number"
                  className={`form-control ${getErr(index, "basicSalary") ? "is-invalid" : ""}`}
                  name="basicSalary"
                  value={worker.basicSalary}
                  onChange={(e) => handleChange(e, "workers", index)}
                  id={`basicSalary-${index}`}
                />
                {getErr(index, "basicSalary") && (
                  <div className="invalid-feedback">{getErr(index, "basicSalary")}</div>
                )}
              </div>
            </div>

            <div className="col-md-6">
              {/* Starting Date */}
              <div className="form-group mb-3">
                <label>
                  Starting Date <span className="star">*</span>
                </label>
                <input
                  type="date"
                  className={`form-control ${getErr(index, "startingDate") ? "is-invalid" : ""}`}
                  name="startingDate"
                  value={worker.startingDate}
                  onChange={(e) => handleChange(e, "workers", index)}
                  id={`startingDate-${index}`}
                />
                {getErr(index, "startingDate") && (
                  <div className="invalid-feedback">{getErr(index, "startingDate")}</div>
                )}
              </div>

              {/* Ending Date */}
              <div className="form-group mb-3">
                <label>Ending Date</label>
                <input
                  type="date"
                  className="form-control"
                  name="endingDate"
                  value={worker.endingDate}
                  onChange={(e) => handleChange(e, "workers", index)}
                  id={`endingDate-${index}`}
                />
              </div>

              {/* Mobile 1 */}
              <div className="form-group mb-3">
                <label>
                  Mobile 1 <span className="star">*</span>
                </label>
                <input
                  type="tel"
                  className={`form-control ${getErr(index, "mobile1") ? "is-invalid" : ""}`}
                  name="mobile1"
                  value={worker.mobile1}
                  onChange={(e) => handleChange(e, "workers", index)}
                  maxLength="10"
                  id={`mobile1-${index}`}
                />
                {getErr(index, "mobile1") && (
                  <div className="invalid-feedback">{getErr(index, "mobile1")}</div>
                )}
              </div>

              {/* Mobile 2 */}
              <div className="form-group mb-3">
                <label>Mobile 2</label>
                <input
                  type="tel"
                  className={`form-control ${getErr(index, "mobile2") ? "is-invalid" : ""}`}
                  name="mobile2"
                  value={worker.mobile2}
                  onChange={(e) => handleChange(e, "workers", index)}
                  maxLength="10"
                  id={`mobile2-${index}`}
                />
                {getErr(index, "mobile2") && (
                  <div className="invalid-feedback">{getErr(index, "mobile2")}</div>
                )}
              </div>

              {/* Remarks */}
              <div className="form-group mb-3">
                <label>Remarks</label>
                <input
                  type="text"
                  className="form-control"
                  name="remarks"
                  value={worker.remarks}
                  onChange={(e) => handleChange(e, "workers", index)}
                  id={`remarks-${index}`}
                />
              </div>
            </div>
          </div>

          {formData.workers.length > 1 && (
            <button type="button" className="btn btn-danger btn-sm" onClick={() => removeWorker(index)}>
              Remove Worker
            </button>
          )}
        </div>
      ))}

      <button type="button" className="btn btn-primary" onClick={addWorker}>
        Add Worker
      </button>
    </div>
  );
};

export default WorkerDetails;