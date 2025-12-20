// HomeCareServiceDetails.js
import React, { useState, useEffect } from "react";

export default function HomeCareServiceDetails({ formData, handleChange, errors = {}, setErrors, isViewMode = false }) {
  const [dateErrors, setDateErrors] = useState({});
  
  const timeSlots = [
    "5-6am", "6-7am", "7-8am", "8-9am", "9-10am", "10-11am", "11-12pm",
    "12-1pm", "2-3pm", "3-4pm", "4-5pm", "5-6pm", "6-7pm", "7-8pm", "8-9pm"
  ];

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

  useEffect(() => {
    validateDates();
  }, [formData.startingDate]);

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
    
    setDateErrors(newDateErrors);
    
    if (setErrors) {
      setErrors(prevErrors => ({
        ...prevErrors,
        ...newDateErrors
      }));
    }
  };

  const handleDateChange = (e) => {
    handleChange(e);
    
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
        <div className="col-md-6">
          <div className="form-group">
            <label>Type of Service<span className="text-danger">*</span></label>
            <select
              className={`form-control ${errors.typeOfService ? "is-invalid" : ""}`}
              name="typeOfService"
              value={formData.typeOfService}
              onChange={handleChange}
              disabled={isViewMode}
            >
              <option value="">Select Service Type</option>
              <option value="Cleaning">Cleaning</option>
              <option value="Cooking">Cooking</option>
              <option value="Cleaning & Cooking">Cleaning & Cooking</option>
            </select>
            {errors.typeOfService && (
              <div className="invalid-feedback">{errors.typeOfService}</div>
            )}
          </div>
        </div>
        <div className="col-md-6">
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
          <div className="form-group">
            <label>Time Slot<span className="text-danger">*</span></label>
            <select
              className={`form-control ${errors.timeSlot ? "is-invalid" : ""}`}
              name="timeSlot"
              value={formData.timeSlot}
              onChange={handleChange}
              disabled={isViewMode}
            >
              <option value="">Select Time Slot</option>
              {timeSlots.map(slot => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </select>
            <input
              type="text"
              className="form-control mt-2"
              name="timeSlot"
              value={formData.timeSlot && !timeSlots.includes(formData.timeSlot) ? formData.timeSlot : ''}
              onChange={handleChange}
              placeholder="Or enter custom time slot"
              readOnly={isViewMode}
            />
            {errors.timeSlot && (
              <div className="invalid-feedback">{errors.timeSlot}</div>
            )}
          </div>
        </div>
        <div className="col-md-6">
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
      </div>
      <div className="row">
        <div className="col-md-6">
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
          <div className="form-group">
            <label>Page No</label>
            <input
              type="tel"
              className={`form-control ${errors.pageNo ? "is-invalid" : ""}`}
              name="pageNo"
              value={formData.pageNo}
              onChange={handleChange}
              maxLength={5}
              readOnly={isViewMode}
            />
            {errors.pageNo && (
              <div className="invalid-feedback">{errors.pageNo}</div>
            )}
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-md-12">
          <div className="form-group">
            <label>About Client Recipients<span className="text-danger">*</span></label>
            <textarea
              className={`form-control ${errors.aboutClientRecipients ? "is-invalid" : ""}`}
              name="aboutClientRecipients"
              value={formData.aboutClientRecipients}
              onChange={handleChange}
              rows="4"
              readOnly={isViewMode}
            />
            {errors.aboutClientRecipients && (
              <div className="invalid-feedback">{errors.aboutClientRecipients}</div>
            )}
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-md-12">
          <div className="form-group">
            <label>About Work<span className="text-danger">*</span></label>
            <textarea
              className={`form-control ${errors.aboutWork ? "is-invalid" : ""}`}
              name="aboutWork"
              value={formData.aboutWork}
              onChange={handleChange}
              rows="4"
              readOnly={isViewMode}
            />
            {errors.aboutWork && (
              <div className="invalid-feedback">{errors.aboutWork}</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}