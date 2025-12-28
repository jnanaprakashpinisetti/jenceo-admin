import React from "react";

const DocumentsTab = ({ formData, editMode }) => {
  const documents = [
    { 
      name: "companyLogoUrl", 
      label: "Company Logo", 
      icon: "🏢",
      color: "primary"
    },
    { 
      name: "cancelledChequeUrl", 
      label: "Cancelled Cheque", 
      icon: "🏦",
      color: "info"
    },
    { 
      name: "incorporationCertUrl", 
      label: "Incorporation Certificate", 
      icon: "📄",
      color: "success"
    },
    { 
      name: "panCardUrl", 
      label: "PAN Card", 
      icon: "📋",
      color: "warning"
    },
    { 
      name: "gstCertUrl", 
      label: "GST Certificate", 
      icon: "🧾",
      color: "danger"
    },
    { 
      name: "labourLicenseUrl", 
      label: "Labour License", 
      icon: "⚖️",
      color: "secondary"
    },
    { 
      name: "pfRegUrl", 
      label: "PF Registration", 
      icon: "👥",
      color: "primary"
    },
    { 
      name: "esiRegUrl", 
      label: "ESI Registration", 
      icon: "🏥",
      color: "info"
    },
    { 
      name: "agreementUrl", 
      label: "Agreement", 
      icon: "📜",
      color: "success"
    },
    { 
      name: "bondUrl", 
      label: "Bond", 
      icon: "🔗",
      color: "warning"
    },
    { 
      name: "insuranceUrl", 
      label: "Insurance", 
      icon: "🛡️",
      color: "danger"
    }
  ];

  const hasDocument = (url) => {
    return url && url !== "" && !url.includes("placeholder");
  };

  const getDocumentStatus = (url) => {
    if (hasDocument(url)) {
      return {
        text: "Uploaded",
        class: "text-success",
        icon: "✓"
      };
    }
    return {
      text: "Not Uploaded",
      class: "text-warning",
      icon: "⚠"
    };
  };

  return (
    <div>
      <div className="row">
        {/* Company Logo Preview */}
        <div className="col-md-4 mb-4">
          <div className="card border-primary h-100">
            <div className="card-body text-center">
              <h6 className="card-title">Company Logo</h6>
              <div className="my-3">
                <img 
                  src={formData.companyLogoUrl || "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2Fcompany-placeholder.jpg?alt=media&token=placeholder"}
                  alt="Company Logo" 
                  className="img-fluid rounded"
                  style={{ maxHeight: '120px' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2Fcompany-placeholder.jpg?alt=media&token=placeholder";
                  }}
                />
              </div>
              <div className="mt-2">
                <span className={`badge bg-${hasDocument(formData.companyLogoUrl) ? 'success' : 'warning'}`}>
                  {hasDocument(formData.companyLogoUrl) ? 'Uploaded ✓' : 'Not Uploaded'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* All Documents */}
        {documents.filter(doc => doc.name !== "companyLogoUrl").map(doc => {
          const status = getDocumentStatus(formData[doc.name]);
          return (
            <div key={doc.name} className="col-md-4 mb-3">
              <div className={`card border-${doc.color} h-100`}>
                <div className="card-body">
                  <div className="d-flex align-items-center mb-2">
                    <div className="me-2" style={{ fontSize: '1.5rem' }}>
                      {doc.icon}
                    </div>
                    <h6 className="card-title mb-0">{doc.label}</h6>
                  </div>
                  
                  <div className="mb-3">
                    <span className={`badge bg-${hasDocument(formData[doc.name]) ? 'success' : 'warning'}`}>
                      {status.text} {status.icon}
                    </span>
                  </div>

                  {hasDocument(formData[doc.name]) && (
                    <div>
                      <a 
                        href={formData[doc.name]} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline-primary w-100"
                      >
                        <i className="fas fa-eye me-1"></i>
                        View Document
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4">
        <div className="alert alert-dark">
          <h6 className="alert-heading">Documents Summary</h6>
          <div className="row">
            <div className="col-md-6">
              <p className="mb-1"><strong>Total Documents:</strong> {documents.length}</p>
              <p className="mb-1"><strong>Uploaded:</strong> 
                <span className="text-success"> {documents.filter(d => hasDocument(formData[d.name])).length}</span>
              </p>
              <p className="mb-1"><strong>Pending:</strong> 
                <span className="text-warning"> {documents.filter(d => !hasDocument(formData[d.name])).length}</span>
              </p>
            </div>
            <div className="col-md-6">
              <p className="mb-1"><strong>Compliance Score:</strong> 
                {Math.round((documents.filter(d => hasDocument(formData[d.name])).length / documents.length) * 100)}%
              </p>
              <div className="progress" style={{ height: '10px' }}>
                <div 
                  className="progress-bar bg-success" 
                  style={{ 
                    width: `${(documents.filter(d => hasDocument(formData[d.name])).length / documents.length) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentsTab;