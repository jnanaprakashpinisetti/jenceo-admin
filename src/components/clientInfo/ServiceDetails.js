import React, { useState, useEffect } from "react";

export default function ServiceDetails({ formData, handleChange, errors = {}, setErrors, isViewMode = false }) {
  const [dateErrors, setDateErrors] = useState({});

  // Calculate date ranges
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
    validateDates();
  }, [formData.startingDate, formData.endingDate]);

  const validateDates = () => {
    const newDateErrors = {};

    if (formData.startingDate) {
      const startDate = new Date(formData.startingDate);
      const minDateObj = new Date(minDate);
      const maxDateObj = new Date(maxDate);

      if (startDate < minDateObj) {
        newDateErrors.startingDate = `Start date cannot be before ${minDate}`;
      } else if (startDate > maxDateObj) {
        newDateErrors.startingDate = `Start date cannot be after ${maxDate}`;
      }
    }

    if (formData.startingDate && formData.endingDate) {
      const startDate = new Date(formData.startingDate);
      const endDate = new Date(formData.endingDate);

      if (endDate <= startDate) {
        newDateErrors.endingDate = "End date must be after start date";
      }
    }

    setDateErrors(newDateErrors);

    // Update the main errors object if setErrors function is provided
    if (setErrors) {
      setErrors(prevErrors => ({
        ...prevErrors,
        ...newDateErrors
      }));
    }
  };

  const handleDateChange = (e) => {
    handleChange(e);

    // Clear the error for the changed field
    if (dateErrors[e.target.name]) {
      setDateErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[e.target.name];
        return newErrors;
      });
    }
  };

  return (
    <>
      <div className="row">
        <div className="form-card-header mb-4">
          <h3 className="text-center"> Service Details</h3>
        </div>
        <hr />
        <div className="col-md-6">
          {/* Type of Service */}
          <div className="form-group">
            <label>Type of Service<span className="text-danger">*</span></label>
            <input
              type="text"
              className={`form-control ${errors.typeOfService ? "is-invalid" : ""}`}
              name="typeOfService"
              value={formData.typeOfService}
              onChange={handleChange}
              readOnly={isViewMode}
            />
            {errors.typeOfService && (
              <div className="invalid-feedback">{errors.typeOfService}</div>
            )}
          </div>

        </div>
        <div className="col-md-6">
          {/* Service Period */}
          <div className="form-group">
            <label>Service Period<span className="text-danger">*</span></label>
            <input
              type="text"
              className={`form-control ${errors.servicePeriod ? "is-invalid" : ""}`}
              name="servicePeriod"
              value={formData.servicePeriod}
              onChange={handleChange}
              readOnly={isViewMode}
            />
            {errors.servicePeriod && (
              <div className="invalid-feedback">{errors.servicePeriod}</div>
            )}
          </div>

        </div>
      </div>
      <div className="row">
        <div className="col-md-6">
          {/* Service Charges */}
          <div className="form-group">
            <label>Service Charges<span className="text-danger">*</span></label>
            <input
              type="tel"
              className={`form-control ${errors.serviceCharges ? "is-invalid" : ""}`}
              name="serviceCharges"
              value={formData.serviceCharges}
              onChange={handleChange}
              maxLength={5}
              readOnly={isViewMode}
            />
            {errors.serviceCharges && (
              <div className="invalid-feedback">{errors.serviceCharges}</div>
            )}
          </div>

        </div>
        <div className="col-md-6">
          {/* Travelling Charges */}
          <div className="form-group">
            <label>Travelling Charges</label>
            <input
              type="tel"
              className="form-control"
              name="travellingCharges"
              value={formData.travellingCharges}
              onChange={handleChange}
              maxLength={4}
              readOnly={isViewMode}
            />
          </div>

        </div>
      </div>
      <div className="row">
        <div className="col-md-6">
          {/* Starting Date */}
          <div className="form-group">
            <label>Starting Date<span className="text-danger">*</span></label>
            <input
              type="date"
              className={`form-control ${errors.startingDate || dateErrors.startingDate ? "is-invalid" : ""}`}
              name="startingDate"
              value={formData.startingDate}
              onChange={handleDateChange}
              min={minDate}
              max={maxDate}
              readOnly={isViewMode}
            />
            {errors.startingDate && (
              <div className="invalid-feedback">{errors.startingDate}</div>
            )}
            {dateErrors.startingDate && !errors.startingDate && (
              <div className="invalid-feedback">{dateErrors.startingDate}</div>
            )}
          </div>

        </div>
        <div className="col-md-6">
          {/* Ending Date */}
          <div className="form-group">
            <label>Ending Date</label>
            <input
              type="date"
              className={`form-control ${dateErrors.endingDate ? "is-invalid" : ""}`}
              name="endingDate"
              value={formData.endingDate}
              onChange={handleDateChange}
              min={formData.startingDate || minDate}
              readOnly={isViewMode}
            />
            {dateErrors.endingDate && (
              <div className="invalid-feedback">{dateErrors.endingDate}</div>
            )}
          </div>

        </div>
      </div>
      <div className="row">
        {/* Page No */}
        <div className="col-md-6">
          <div className="form-group">
            <label>Page No<span className="text-danger">*</span></label>
            <input
              type="tel"
              className={`form-control ${errors.pageNo ? "is-invalid" : ""}`}
              name="pageNo"
              value={formData.pageNo}
              onChange={handleChange}
              maxLength={3}
              readOnly={isViewMode}
            />
            {errors.pageNo && (
              <div className="invalid-feedback">{errors.pageNo}</div>
            )}
          </div>

        </div>
        <div className="col-md-6">
          {/* Gap If Any */}
          <div className="form-group">
            <label>Gap If Any</label>
            <input
              type="text"
              className="form-control"
              name="gapIfAny"
              value={formData.gapIfAny}
              onChange={handleChange}
              readOnly={isViewMode}
            />
          </div>

        </div>
      </div>

    </>
  );
}