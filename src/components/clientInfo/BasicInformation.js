import React from "react";

export default function BasicInformation({ formData, handleChange, errors = {} }) {
  return (
    <div className="row">
      <div className="col-md-6">
        {/* Client Name */}
        <div className="form-group mb-3">
          <label>Client Name<span className="text-danger">*</span></label>
          <input
            type="text"
            className={`form-control ${errors.clientName ? "is-invalid" : ""}`}
            name="clientName"
            value={formData.clientName}
            onChange={handleChange}
          />
          {errors.clientName && <div className="invalid-feedback">{errors.clientName}</div>}
        </div>

        {/* Gender */}
        <div className="form-group mb-3">
          <label>Gender<span className="text-danger">*</span></label>
          <select
            className={`form-control ${errors.gender ? "is-invalid" : ""}`}
            name="gender"
            value={formData.gender}
            onChange={handleChange}
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          {errors.gender && <div className="invalid-feedback">{errors.gender}</div>}
        </div>

        {/* Care Of */}
        <div className="form-group mb-3">
          <label>Care Of</label>
          <input
            type="text"
            className="form-control"
            name="careOf"
            value={formData.careOf}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="col-md-6">
        {/* Location */}
        <div className="form-group mb-3">
          <label>Location<span className="text-danger">*</span></label>
          <input
            type="text"
            className={`form-control ${errors.location ? "is-invalid" : ""}`}
            name="location"
            value={formData.location}
            onChange={handleChange}
          />
          {errors.location && <div className="invalid-feedback">{errors.location}</div>}
        </div>

        {/* Mobile No 1 */}
        <div className="form-group mb-3">
          <label>Mobile No 1<span className="text-danger">*</span></label>
          <input
            type="tel"
            className={`form-control ${errors.mobileNo1 ? "is-invalid" : ""}`}
            name="mobileNo1"
            value={formData.mobileNo1}
            onChange={handleChange}
            maxLength="10"
          />
          {errors.mobileNo1 && <div className="invalid-feedback">{errors.mobileNo1}</div>}
        </div>

        {/* Mobile No 2 */}
        <div className="form-group mb-3">
          <label>Mobile No 2</label>
          <input
            type="tel"
            className={`form-control ${errors.mobileNo2 ? "is-invalid" : ""}`}
            name="mobileNo2"
            value={formData.mobileNo2}
            onChange={handleChange}
            maxLength="10"
          />
          {errors.mobileNo2 && <div className="invalid-feedback">{errors.mobileNo2}</div>}
        </div>
      </div>
    </div>
  );
}