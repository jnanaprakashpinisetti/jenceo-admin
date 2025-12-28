import React from "react";

const RatingApproval = ({ formData, handleChange, handleSubmit, isSubmitting }) => {
  // Star rating handler
  const handleStarClick = (rating) => {
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
            cursor: 'pointer',
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

  // Check if document exists
  const hasDocument = (url) => {
    return url && url !== "" && !url.includes("placeholder");
  };

  // Document types with icons
  const documents = [
    { 
      name: "companyLogoUrl", 
      label: "Company Logo", 
      icon: "🏢",
      hasFile: hasDocument(formData.companyLogoUrl)
    },
    { 
      name: "cancelledChequeUrl", 
      label: "Cancelled Cheque", 
      icon: "🏦",
      hasFile: hasDocument(formData.cancelledChequeUrl)
    },
    { 
      name: "incorporationCertUrl", 
      label: "Incorporation Certificate", 
      icon: "📄",
      hasFile: hasDocument(formData.incorporationCertUrl)
    },
    { 
      name: "panCardUrl", 
      label: "PAN Card", 
      icon: "📋",
      hasFile: hasDocument(formData.panCardUrl)
    },
    { 
      name: "gstCertUrl", 
      label: "GST Certificate", 
      icon: "🧾",
      hasFile: hasDocument(formData.gstCertUrl)
    },
    { 
      name: "labourLicenseUrl", 
      label: "Labour License", 
      icon: "⚖️",
      hasFile: hasDocument(formData.labourLicenseUrl)
    },
    { 
      name: "pfRegUrl", 
      label: "PF Registration", 
      icon: "👥",
      hasFile: hasDocument(formData.pfRegUrl)
    },
    { 
      name: "esiRegUrl", 
      label: "ESI Registration", 
      icon: "🏥",
      hasFile: hasDocument(formData.esiRegUrl)
    },
    { 
      name: "agreementUrl", 
      label: "Agreement", 
      icon: "📜",
      hasFile: hasDocument(formData.agreementUrl)
    },
    { 
      name: "bondUrl", 
      label: "Bond", 
      icon: "🔗",
      hasFile: hasDocument(formData.bondUrl)
    },
    { 
      name: "insuranceUrl", 
      label: "Insurance", 
      icon: "🛡️",
      hasFile: hasDocument(formData.insuranceUrl)
    }
  ];

  return (
    <div className="form-section">
      <h5 className="text-warning mb-4">Rating & Approval</h5>

      {/* Rating Section */}
      <div className="mb-4">
        <label className="form-label"><strong>Internal Rating</strong></label>
        <div className="d-flex align-items-center mb-2">
          <div className="me-3">
            {renderStars()}
          </div>
          <span className="text-warning fs-5">
            {formData.rating ? `${formData.rating}/5` : "Click stars to rate"}
          </span>
        </div>
        <small className="text-muted">Click on the stars to set the rating (1-5)</small>
      </div>

      {/* Approval Status Section */}
      <div className="mb-4">
        <label className="form-label"><strong>Approval Status</strong></label>
        <select
          name="approvalStatus"
          value={formData.approvalStatus || "Pending"}
          onChange={handleChange}
          className="form-select"
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
          <span className={`badge bg-${approvalOptions.find(opt => opt.value === formData.approvalStatus)?.color || 'warning'}`}>
            {formData.approvalStatus || "Pending"}
          </span>
        </div>
      </div>

      {/* Documents Visualization Section */}
      <div className="mb-4">
        <label className="form-label"><strong>Uploaded Documents</strong></label>
        <div className="row g-3">
          {documents.map(doc => (
            <div key={doc.name} className="col-md-6 col-lg-4">
              <div className={`card ${doc.hasFile ? 'border-success' : 'border-warning'} h-100`}>
                <div className="card-body text-center">
                  <div className="mb-2" style={{ fontSize: '2rem' }}>
                    {doc.icon}
                  </div>
                  <h6 className="card-title">{doc.label}</h6>
                  <div className="mt-2">
                    {doc.hasFile ? (
                      <span className="badge bg-success">Uploaded ✓</span>
                    ) : (
                      <span className="badge bg-warning">Not Uploaded</span>
                    )}
                  </div>
                  {doc.hasFile && doc.name === "companyLogoUrl" && formData.companyLogoUrl && (
                    <div className="mt-3">
                      <img 
                        src={formData.companyLogoUrl} 
                        alt="Company Logo Preview" 
                        className="img-fluid rounded"
                        style={{ maxHeight: '80px' }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2Fcompany-placeholder.jpg?alt=media&token=placeholder";
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Section */}
      <div className="alert alert-dark">
        <h6 className="alert-heading">Ready to Submit</h6>
        <div className="row">
          <div className="col-md-6">
            <p className="mb-1"><strong>Company:</strong> {formData.companyName || "N/A"}</p>
            <p className="mb-1"><strong>Company ID:</strong> {formData.companyId || "N/A"}</p>
            <p className="mb-1"><strong>Category:</strong> {formData.companyType || "N/A"}</p>
          </div>
          <div className="col-md-6">
            <p className="mb-1"><strong>Documents Uploaded:</strong> 
              <span className="text-success"> {documents.filter(d => d.hasFile).length}</span> / {documents.length}
            </p>
            <p className="mb-1"><strong>Rating:</strong> {formData.rating ? `${formData.rating}/5` : "Not set"}</p>
            <p className="mb-1"><strong>Status:</strong> {formData.approvalStatus || "Pending"}</p>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="d-grid">
        <button 
          className="btn btn-lg btn-success" 
          onClick={handleSubmit} 
          disabled={isSubmitting}
          style={{ padding: '10px 20px' }}
        >
          {isSubmitting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Submitting...
            </>
          ) : (
            <>
              <i className="bi bi-check-circle me-2"></i>
              Submit Company Registration
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default RatingApproval;