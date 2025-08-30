import React, { useState, useEffect } from "react";

const WorkerDetails = ({ formData, handleChange, addWorker, removeWorker, errors = {}, setErrors, isViewMode = false }) => {
  const workersErrors = errors.workers || [];
  const [dateErrors, setDateErrors] = useState({});
  
  // Calculate date ranges (1 month previous to 2 months future)
  const getMinMaxDates = () => {
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);
    
    const twoMonthsLater = new Date();
    twoMonthsLater.setMonth(today.getMonth() + 2);
    
    return {
      minDate: oneMonthAgo.toISOString().split('T')[0],
      maxDate: twoMonthsLater.toISOString().split('T')[0],
      today: today.toISOString().split('T')[0]
    };
  };

  const { minDate, maxDate, today } = getMinMaxDates();

  // Validate dates when they change
  useEffect(() => {
    validateAllWorkerDates();
  }, [formData.workers]);

  const validateAllWorkerDates = () => {
    const newDateErrors = {};
    
    formData.workers.forEach((worker, index) => {
      if (worker.startingDate) {
        const startDate = new Date(worker.startingDate);
        const minDateObj = new Date(minDate);
        const maxDateObj = new Date(maxDate);
        
        if (startDate < minDateObj) {
          newDateErrors[`worker-${index}-startingDate`] = `Start date cannot be before ${minDate}`;
        } else if (startDate > maxDateObj) {
          newDateErrors[`worker-${index}-startingDate`] = `Start date cannot be after ${maxDate}`;
        }
      }
      
      if (worker.startingDate && worker.endingDate) {
        const startDate = new Date(worker.startingDate);
        const endDate = new Date(worker.endingDate);
        
        if (endDate <= startDate) {
          newDateErrors[`worker-${index}-endingDate`] = "End date must be after start date";
        }
      }
    });
    
    setDateErrors(newDateErrors);
    
    // Update the main errors object if setErrors function is provided
    if (setErrors) {
      setErrors(prevErrors => ({
        ...prevErrors,
        ...newDateErrors
      }));
    }
  };

  const handleDateChange = (e, arrayName, index) => {
    handleChange(e, arrayName, index);
    
    // Clear the error for the changed field
    const errorKey = `worker-${index}-${e.target.name}`;
    if (dateErrors[errorKey]) {
      setDateErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const getDateErr = (index, fieldName) => {
    return dateErrors[`worker-${index}-${fieldName}`];
  };

  const getErr = (idx, key) => (workersErrors[idx] ? workersErrors[idx][key] : "");

  return (
    <div>
      {formData.workers.map((worker, index) => (
        <div key={index} className="worker-card mb-3 p-3 border rounded">
          <h5>Worker #{index + 1}</h5>

          <div className="row">
            <div className="col-md-6">
              {/* Worker ID No */}
              <div className="form-group">
                <label htmlFor={`workerIdNo-${index}`}>
                  Worker ID No <span className="star">*</span>
                </label>
                <input
                  type="text"
                  id={`workerIdNo-${index}`}
                  className={`form-control ${getErr(index, "workerIdNo") ? "is-invalid" : ""}`}
                  name="workerIdNo"
                  maxLength={7}
                  value={worker.workerIdNo}
                  onChange={(e) => handleChange(e, "workers", index)}
                  readOnly={isViewMode}
                />
                {getErr(index, "workerIdNo") && (
                  <div className="invalid-feedback">{getErr(index, "workerIdNo")}</div>
                )}
              </div>
            </div>
            <div className="col-md-6">
              {/* Name */}
              <div className="form-group">
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
                  readOnly={isViewMode}
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
              <div className="form-group">
                <label htmlFor={`startingDate-${index}`}>
                  Starting Date <span className="star">*</span>
                </label>
                <input
                  type="date"
                  id={`startingDate-${index}`}
                  className={`form-control ${getErr(index, "startingDate") || getDateErr(index, "startingDate") ? "is-invalid" : ""}`}
                  name="startingDate"
                  value={worker.startingDate}
                  onChange={(e) => handleDateChange(e, "workers", index)}
                  min={minDate}
                  max={maxDate}
                  readOnly={isViewMode}
                />
                {getErr(index, "startingDate") && (
                  <div className="invalid-feedback">{getErr(index, "startingDate")}</div>
                )}
                {getDateErr(index, "startingDate") && !getErr(index, "startingDate") && (
                  <div className="invalid-feedback">{getDateErr(index, "startingDate")}</div>
                )}
              </div>
            </div>
            <div className="col-md-6">
              {/* Ending Date */}
              <div className="form-group">
                <label htmlFor={`endingDate-${index}`}>Ending Date</label>
                <input
                  type="date"
                  id={`endingDate-${index}`}
                  className={`form-control ${getDateErr(index, "endingDate") ? "is-invalid" : ""}`}
                  name="endingDate"
                  value={worker.endingDate}
                  onChange={(e) => handleDateChange(e, "workers", index)}
                  min={worker.startingDate || minDate}
                  max={maxDate}
                  readOnly={isViewMode}
                />
                {getDateErr(index, "endingDate") && (
                  <div className="invalid-feedback">{getDateErr(index, "endingDate")}</div>
                )}
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-md-6">
              {/* Mobile 1 */}
              <div className="form-group">
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
                  readOnly={isViewMode}
                />
                {getErr(index, "mobile1") && (
                  <div className="invalid-feedback">{getErr(index, "mobile1")}</div>
                )}
              </div>
            </div>
            <div className="col-md-6">
              {/* Mobile 2 */}
              <div className="form-group">
                <label htmlFor={`mobile2-${index}`}>Mobile 2</label>
                <input
                  type="tel"
                  id={`mobile2-${index}`}
                  className={`form-control ${getErr(index, "mobile2") ? "is-invalid" : ""}`}
                  name="mobile2"
                  value={worker.mobile2}
                  onChange={(e) => handleChange(e, "workers", index)}
                  maxLength="10"
                  readOnly={isViewMode}
                />
                {getErr(index, "mobile2") && (
                  <div className="invalid-feedback">{getErr(index, "mobile2")}</div>
                )}
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-md-6">
              {/* Basic Salary - REMOVED VALIDATION REQUIREMENT */}
              <div className="form-group">
                <label htmlFor={`basicSalary-${index}`}>
                  Basic {/* Removed required asterisk */}
                </label>
                <input
                  type="tel"
                  id={`basicSalary-${index}`}
                  className="form-control" 
                  name="basicSalary"
                  value={worker.basicSalary}
                  onChange={(e) => handleChange(e, "workers", index)}
                  maxLength={5}
                  readOnly={isViewMode}
                />
                {/* Removed error feedback */}
              </div>
            </div>
            <div className="col-md-6">
              {/* Remarks */}
              <div className="form-group">
                <label htmlFor={`remarks-${index}`}>Remarks</label>
                <input
                  type="text"
                  id={`remarks-${index}`}
                  className="form-control"
                  name="remarks"
                  value={worker.remarks}
                  onChange={(e) => handleChange(e, "workers", index)}
                  readOnly={isViewMode}
                />
              </div>
            </div>
          </div>

          {formData.workers.length > 1 && !isViewMode && (
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

      {!isViewMode && (
        <button type="button" className="btn btn-primary btn-sm" onClick={addWorker}>
          Add Worker
        </button>
      )}
    </div>
  );
};

export default WorkerDetails;