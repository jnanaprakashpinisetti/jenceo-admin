import React from "react";

export default function ServiceDetails({ formData, handleChange, errors = {} }) {
  return (
    <div className="row">
      <div className="col-md-6">
        {/* Type of Service */}
        <div className="form-group mb-3">
          <label>Type of Service<span className="text-danger">*</span></label>
          <input
            type="text"
            className={`form-control ${errors.typeOfService ? "is-invalid" : ""}`}
            name="typeOfService"
            value={formData.typeOfService}
            onChange={handleChange}
          />
          {errors.typeOfService && (
            <div className="invalid-feedback">{errors.typeOfService}</div>
          )}
        </div>

        {/* Service Period */}
        <div className="form-group mb-3">
          <label>Service Period<span className="text-danger">*</span></label>
          <input
            type="text"
            className={`form-control ${errors.servicePeriod ? "is-invalid" : ""}`}
            name="servicePeriod"
            value={formData.servicePeriod}
            onChange={handleChange}
          />
          {errors.servicePeriod && (
            <div className="invalid-feedback">{errors.servicePeriod}</div>
          )}
        </div>

        {/* Service Charges */}
        <div className="form-group mb-3">
          <label>Service Charges<span className="text-danger">*</span></label>
          <input
            type="number"
            className={`form-control ${errors.serviceCharges ? "is-invalid" : ""}`}
            name="serviceCharges"
            value={formData.serviceCharges}
            onChange={handleChange}
          />
          {errors.serviceCharges && (
            <div className="invalid-feedback">{errors.serviceCharges}</div>
          )}
        </div>

        {/* Travelling Charges */}
        <div className="form-group mb-3">
          <label>Travelling Charges</label>
          <input
            type="number"
            className="form-control"
            name="travellingCharges"
            value={formData.travellingCharges}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="col-md-6">
        {/* Starting Date */}
        <div className="form-group mb-3">
          <label>Starting Date<span className="text-danger">*</span></label>
          <input
            type="date"
            className={`form-control ${errors.startingDate ? "is-invalid" : ""}`}
            name="startingDate"
            value={formData.startingDate}
            onChange={handleChange}
          />
          {errors.startingDate && (
            <div className="invalid-feedback">{errors.startingDate}</div>
          )}
        </div>

        {/* Ending Date */}
        <div className="form-group mb-3">
          <label>Ending Date</label>
          <input
            type="date"
            className="form-control"
            name="endingDate"
            value={formData.endingDate}
            onChange={handleChange}
          />
        </div>

        {/* Gap If Any */}
        <div className="form-group mb-3">
          <label>Gap If Any</label>
          <input
            type="text"
            className="form-control"
            name="gapIfAny"
            value={formData.gapIfAny}
            onChange={handleChange}
          />
        </div>

        {/* Page No */}
        <div className="form-group mb-3">
          <label>Page No<span className="text-danger">*</span></label>
          <input
            type="text"
            className={`form-control ${errors.pageNo ? "is-invalid" : ""}`}
            name="pageNo"
            value={formData.pageNo}
            onChange={handleChange}
          />
          {errors.pageNo && (
            <div className="invalid-feedback">{errors.pageNo}</div>
          )}
        </div>
      </div>
    </div>
  );
}