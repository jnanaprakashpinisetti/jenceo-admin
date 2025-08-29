import React from "react";

export default function Address({ formData, handleChange, errors = {} }) {
  return (
    <>
      <div className="row">
        <div className="col-md-6">
          {/* Door No */}
          <div className="form-group">
            <label>Door No<span className="text-danger">*</span></label>
            <input
              type="text"
              className={`form-control ${errors.dNo ? "is-invalid" : ""}`}
              name="dNo"
              value={formData.dNo}
              onChange={handleChange}
            />
            {errors.dNo && <div className="invalid-feedback">{errors.dNo}</div>}
          </div>
        </div>
        <div className="col-md-6">
          {/* Landmark */}
          <div className="form-group">
            <label>Landmark</label>
            <input
              type="text"
              className="form-control"
              name="landMark"
              value={formData.landMark}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-md-6">
          {/* Street */}
          <div className="form-group">
            <label>Street</label>
            <input
              type="text"
              className="form-control"
              name="street"
              value={formData.street}
              onChange={handleChange}
            />
          </div>
        </div>
        <div className="col-md-6">
          {/* Village / Town */}
          <div className="form-group">
            <label>Village/Town<span className="text-danger">*</span></label>
            <input
              type="text"
              className={`form-control ${errors.villageTown ? "is-invalid" : ""}`}
              name="villageTown"
              value={formData.villageTown}
              onChange={handleChange}
            />
            {errors.villageTown && <div className="invalid-feedback">{errors.villageTown}</div>}
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-md-6">
          {/* Mandal */}
          <div className="form-group">
            <label>Mandal<span className="text-danger">*</span></label>
            <input
              type="text"
              className={`form-control ${errors.mandal ? "is-invalid" : ""}`}
              name="mandal"
              value={formData.mandal}
              onChange={handleChange}
            />
            {errors.mandal && <div className="invalid-feedback">{errors.mandal}</div>}
          </div>
        </div>
        <div className="col-md-6">
          {/* District */}
          <div className="form-group">
            <label>District<span className="text-danger">*</span></label>
            <input
              type="text"
              className={`form-control ${errors.district ? "is-invalid" : ""}`}
              name="district"
              value={formData.district}
              onChange={handleChange}
            />
            {errors.district && <div className="invalid-feedback">{errors.district}</div>}
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-md-6">
          {/* State */}
          <div className="form-group">
            <label>State<span className="text-danger">*</span></label>
            <input
              type="text"
              className={`form-control ${errors.state ? "is-invalid" : ""}`}
              name="state"
              value={formData.state}
              onChange={handleChange}
            />
            {errors.state && <div className="invalid-feedback">{errors.state}</div>}
          </div>

        </div>
        <div className="col-md-6">
          {/* Pincode */}
          <div className="form-group">
            <label>Pincode<span className="text-danger">*</span></label>
            <input
              type="text"
              className={`form-control ${errors.pincode ? "is-invalid" : ""}`}
              name="pincode"
              value={formData.pincode}
              onChange={handleChange}
              maxLength="6"
            />
            {errors.pincode && <div className="invalid-feedback">{errors.pincode}</div>}
          </div>
        </div>
      </div>
    </>
  );
}
