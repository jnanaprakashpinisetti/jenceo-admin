import React from "react";

const RatingApproval = ({ formData, handleChange, handleSubmit, isSubmitting }) => (
  <div className="form-section">
    <h5>Rating & Approval</h5>

    <div className="mb-3">
      <label>Internal Rating (1–5)</label>
      <input
        type="number"
        min="1"
        max="5"
        name="rating"
        value={formData.rating}
        onChange={handleChange}
        className="form-control"
      />
    </div>

    <div className="alert alert-info">
      Approval Status: <b>{formData.approvalStatus}</b>
    </div>

    <button className="btn btn-success" onClick={handleSubmit} disabled={isSubmitting}>
      {isSubmitting ? "Submitting..." : "Submit Company"}
    </button>
  </div>
);

export default RatingApproval;
