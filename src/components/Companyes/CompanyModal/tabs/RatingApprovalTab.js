import React from "react";

const RatingApprovalTab = ({ formData, editMode, handleChange, formatDateForInput }) => {
  // Star rating handler
  const handleStarClick = (rating) => {
    if (!editMode) return;
    handleChange({ target: { name: "rating", value: rating } });
  };

  // Render stars
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          className={`star ${i <= (formData.rating || 0) ? 'filled' : ''}`}
          onClick={() => handleStarClick(i)}
          style={{
            fontSize: '2rem',
            cursor: editMode ? 'pointer' : 'default',
            color: i <= (formData.rating || 0) ? '#ffc107' : '#e4e5e9',
            marginRight: '5px',
            transition: 'color 0.2s'
          }}
        >
          ★
        </span>
      );
    }
    return stars;
  };

  // Approval status options
  const approvalOptions = [
    { value: "Pending", label: "⏳ Pending", color: "warning" },
    { value: "Approved", label: "✅ Approved", color: "success" },
    { value: "Rejected", label: "❌ Rejected", color: "danger" },
    { value: "On Hold", label: "⏸️ On Hold", color: "info" }
  ];

  return (
    <div className="row">
      <div className="col-md-6">
        <div className="card h-100">
          <div className="card-body">
            <h5 className="card-title">Rating & Performance</h5>
            
            <div className="mb-4">
              <label className="form-label"><strong>Internal Rating (1-5)</strong></label>
              <div className="d-flex align-items-center mb-2">
                <div className="me-3">
                  {renderStars()}
                </div>
                <span className="text-warning fs-5">
                  {formData.rating ? `${formData.rating}/5` : "Not rated"}
                </span>
              </div>
              <small className="text-muted">Click on the stars to set the rating (1-5)</small>
            </div>

            <div className="mb-3">
              <label className="form-label"><strong>Remarks</strong></label>
              <textarea
                className="form-control"
                name="ratingRemarks"
                value={formData.ratingRemarks || ""}
                onChange={handleChange}
                readOnly={!editMode}
                disabled={!editMode}
                rows="3"
                placeholder="Any remarks about company performance..."
              />
            </div>
          </div>
        </div>
      </div>

      <div className="col-md-6">
        <div className="card h-100">
          <div className="card-body">
            <h5 className="card-title">Approval & Status</h5>
            
            <div className="mb-3">
              <label className="form-label"><strong>Approval Status</strong></label>
              <select
                name="approvalStatus"
                value={formData.approvalStatus || "Pending"}
                onChange={handleChange}
                className="form-select"
                disabled={!editMode}
                style={{
                  borderColor: approvalOptions.find(opt => opt.value === formData.approvalStatus)?.color || '#6c757d'
                }}
              >
                {approvalOptions.map(option => (
                  <option key={option.value} value={option.value} className={`text-${option.color}`}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="mt-2">
                <span className={`badge bg-${approvalOptions.find(opt => opt.value === formData.approvalStatus)?.color || 'warning'} fs-6`}>
                  {formData.approvalStatus || "Pending"}
                </span>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label"><strong>Approved By</strong></label>
              <input
                type="text"
                className="form-control"
                name="approvedBy"
                value={formData.approvedBy || ""}
                onChange={handleChange}
                readOnly={!editMode}
                disabled={!editMode}
                placeholder="Name of approver"
              />
            </div>

            <div className="mb-3">
              <label className="form-label"><strong>Approval Date</strong></label>
              <input
                type="date"
                className="form-control"
                name="approvalDate"
                value={formData.approvalDate ? formatDateForInput(new Date(formData.approvalDate)) : ""}
                onChange={handleChange}
                readOnly={!editMode}
                disabled={!editMode}
              />
            </div>

            <div className="mb-3">
              <label className="form-label"><strong>Reason for Status</strong></label>
              <textarea
                className="form-control"
                name="approvalReason"
                value={formData.approvalReason || ""}
                onChange={handleChange}
                readOnly={!editMode}
                disabled={!editMode}
                rows="2"
                placeholder="Reason for current status..."
              />
            </div>
          </div>
        </div>
      </div>

      <div className="col-12 mt-4">
        <div className="alert alert-info text-info">
          <h6 className="alert-heading">Status Summary</h6>
          <div className="row">
            <div className="col-md-6">
              <p className="mb-1"><strong>Current Status:</strong> {formData.approvalStatus || "Pending"}</p>
              <p className="mb-1"><strong>Rating:</strong> {formData.rating ? `${formData.rating}/5` : "Not rated"}</p>
            </div>
            <div className="col-md-6">
              <p className="mb-1"><strong>Approved By:</strong> {formData.approvedBy || "Not approved yet"}</p>
              <p className="mb-1"><strong>Approval Date:</strong> {formData.approvalDate ? new Date(formData.approvalDate).toLocaleDateString() : "N/A"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RatingApprovalTab;