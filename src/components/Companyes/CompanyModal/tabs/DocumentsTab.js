import React, { useState } from "react";

const DocumentsTab = ({ formData, editMode, handleChange, handleFileUpload }) => {
  const [uploadingFile, setUploadingFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const documents = [
    { 
      name: "companyLogoUrl", 
      label: "Company Logo", 
      icon: "🏢",
      color: "primary",
      accept: "image/*",
      preview: true
    },
    { 
      name: "cancelledChequeUrl", 
      label: "Cancelled Cheque", 
      icon: "🏦",
      color: "info",
      accept: ".jpg,.jpeg,.png,.pdf",
      preview: false
    },
    { 
      name: "incorporationCertUrl", 
      label: "Incorporation Certificate", 
      icon: "📄",
      color: "success",
      accept: ".jpg,.jpeg,.png,.pdf",
      preview: false
    },
    { 
      name: "panCardUrl", 
      label: "PAN Card", 
      icon: "📋",
      color: "warning",
      accept: ".jpg,.jpeg,.png,.pdf",
      preview: false
    },
    { 
      name: "gstCertUrl", 
      label: "GST Certificate", 
      icon: "🧾",
      color: "danger",
      accept: ".jpg,.jpeg,.png,.pdf",
      preview: false
    },
    { 
      name: "labourLicenseUrl", 
      label: "Labour License", 
      icon: "⚖️",
      color: "secondary",
      accept: ".jpg,.jpeg,.png,.pdf",
      preview: false
    },
    { 
      name: "pfRegUrl", 
      label: "PF Registration", 
      icon: "👥",
      color: "primary",
      accept: ".jpg,.jpeg,.png,.pdf",
      preview: false
    },
    { 
      name: "esiRegUrl", 
      label: "ESI Registration", 
      icon: "🏥",
      color: "info",
      accept: ".jpg,.jpeg,.png,.pdf",
      preview: false
    },
    { 
      name: "agreementUrl", 
      label: "Agreement", 
      icon: "📜",
      color: "success",
      accept: ".jpg,.jpeg,.png,.pdf",
      preview: false
    },
    { 
      name: "bondUrl", 
      label: "Bond", 
      icon: "🔗",
      color: "warning",
      accept: ".jpg,.jpeg,.png,.pdf",
      preview: false
    },
    { 
      name: "insuranceUrl", 
      label: "Insurance", 
      icon: "🛡️",
      color: "danger",
      accept: ".jpg,.jpeg,.png,.pdf",
      preview: false
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
        icon: "✓",
        badge: "success"
      };
    }
    return {
      text: "Not Uploaded",
      class: "text-warning",
      icon: "⚠",
      badge: "warning"
    };
  };

  const handleFileSelect = async (fieldName, e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(fieldName);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      // Call the handleFileUpload prop if provided
      if (handleFileUpload) {
        const fileUrl = await handleFileUpload(fieldName, file);
        
        // Update form data
        if (fileUrl) {
          handleChange({
            target: {
              name: fieldName,
              value: fileUrl
            }
          });
        }
      }

      // Complete upload
      clearInterval(interval);
      setUploadProgress(100);
      
      // Reset after success
      setTimeout(() => {
        setUploadingFile(null);
        setUploadProgress(0);
      }, 1000);

    } catch (error) {
      console.error("Upload failed:", error);
      setUploadingFile(null);
      setUploadProgress(0);
    }
  };

  const renderDocumentCard = (doc) => {
    const status = getDocumentStatus(formData[doc.name]);
    const isUploading = uploadingFile === doc.name;

    return (
      <div key={doc.name} className="col-md-4 mb-3">
        <div className={`card border-${doc.color} h-100`}>
          <div className="card-body">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="d-flex align-items-center">
                <div className="me-2" style={{ fontSize: '1.5rem' }}>
                  {doc.icon}
                </div>
                <h6 className="card-title mb-0">{doc.label}</h6>
              </div>
              <span className={`badge bg-${status.badge}`}>
                {status.text} {status.icon}
              </span>
            </div>
            
            {/* Preview for images */}
            {doc.preview && formData[doc.name] && hasDocument(formData[doc.name]) && (
              <div className="mb-3 text-center">
                <img 
                  src={formData[doc.name]} 
                  alt={doc.label}
                  className="img-fluid rounded border"
                  style={{ maxHeight: '80px' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2Fcompany-placeholder.jpg?alt=media&token=placeholder";
                  }}
                />
              </div>
            )}

            {/* Upload Section in Edit Mode */}
            {editMode && (
              <div className="mb-3">
                <div className="input-group">
                  <input
                    type="file"
                    id={`file-${doc.name}`}
                    className="form-control form-control-sm"
                    accept={doc.accept}
                    onChange={(e) => handleFileSelect(doc.name, e)}
                    disabled={isUploading}
                    style={{ display: 'none' }}
                  />
                  <label 
                    htmlFor={`file-${doc.name}`}
                    className={`btn btn-sm w-100 ${isUploading ? 'btn-secondary' : `btn-outline-${doc.color}`}`}
                    style={{ cursor: isUploading ? 'not-allowed' : 'pointer' }}
                  >
                    {isUploading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <i className={`fas ${hasDocument(formData[doc.name]) ? 'fa-sync' : 'fa-upload'} me-1`}></i>
                        {hasDocument(formData[doc.name]) ? 'Replace' : 'Upload'}
                      </>
                    )}
                  </label>
                </div>
                
                {/* Progress Bar */}
                {isUploading && (
                  <div className="mt-2">
                    <div className="progress" style={{ height: '5px' }}>
                      <div 
                        className="progress-bar progress-bar-striped progress-bar-animated bg-success" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <small className="text-muted d-block text-center mt-1">
                      {uploadProgress}% uploaded
                    </small>
                  </div>
                )}
              </div>
            )}

            {/* View/Download Section */}
            {hasDocument(formData[doc.name]) && (
              <div className="d-flex gap-2">
                <a 
                  href={formData[doc.name]} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`btn btn-sm btn-${doc.color} flex-grow-1`}
                >
                  <i className="fas fa-eye me-1"></i>
                  View
                </a>
                <a 
                  href={formData[doc.name]} 
                  download
                  className="btn btn-sm btn-outline-secondary"
                >
                  <i className="fas fa-download"></i>
                </a>
              </div>
            )}

            {/* File Info */}
            {hasDocument(formData[doc.name]) && (
              <div className="mt-2">
                <small className="text-muted">
                  <i className="fas fa-link me-1"></i>
                  <a 
                    href={formData[doc.name]} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-decoration-none"
                  >
                    View URL
                  </a>
                </small>
              </div>
            )}
          </div>
          
          {/* Card Footer */}
          <div className="card-footer bg-transparent border-top-0 pt-0">
            <small className="text-muted d-flex justify-content-between align-items-center">
              <span>
                <i className={`fas fa-${doc.preview ? 'image' : 'file'} me-1`}></i>
                {doc.accept.includes('image') ? 'Image' : 'Document'}
              </span>
              {!editMode && (
                <span className={`badge bg-${status.badge} bg-opacity-25 text-${status.badge}`}>
                  {status.text}
                </span>
              )}
            </small>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-lg-10">
        <div className="card shadow-sm border-0">
          {/* Card Header */}
          <div className="card-header bg-light border-bottom">
            <div className="d-flex align-items-center">
              <div className="bg-primary bg-opacity-10 p-2 rounded-circle me-3">
                <i className="bi bi-folder-fill text-primary fs-5"></i>
              </div>
              <div>
                <h5 className="mb-0 text-dark">Company Documents</h5>
                <small className="text-muted">Upload and manage all company documents</small>
              </div>
            </div>
          </div>

          <div className="card-body">
            <div className="row">
              {/* Company Logo Preview (Special Card) */}
              <div className="col-md-6 mb-4">
                <div className="card border-primary">
                  <div className="card-header bg-primary bg-opacity-10 border-primary">
                    <h6 className="mb-0 d-flex align-items-center">
                      <i className="bi bi-image me-2"></i>
                      Company Logo
                    </h6>
                  </div>
                  <div className="card-body text-center">
                    <div className="my-3">
                      <img 
                        src={formData.companyLogoUrl || "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2Fcompany-placeholder.jpg?alt=media&token=placeholder"}
                        alt="Company Logo" 
                        className="img-fluid rounded border"
                        style={{ maxHeight: '150px', maxWidth: '100%' }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2Fcompany-placeholder.jpg?alt=media&token=placeholder";
                        }}
                      />
                    </div>
                    
                    {/* Upload for Logo in Edit Mode */}
                    {editMode && (
                      <div className="mt-3">
                        <div className="input-group">
                          <input
                            type="file"
                            id="file-companyLogoUrl"
                            className="form-control"
                            accept="image/*"
                            onChange={(e) => handleFileSelect("companyLogoUrl", e)}
                            disabled={uploadingFile === "companyLogoUrl"}
                            style={{ display: 'none' }}
                          />
                          <label 
                            htmlFor="file-companyLogoUrl"
                            className={`btn w-100 ${uploadingFile === "companyLogoUrl" ? 'btn-secondary' : 'btn-primary'}`}
                            style={{ cursor: uploadingFile === "companyLogoUrl" ? 'not-allowed' : 'pointer' }}
                          >
                            {uploadingFile === "companyLogoUrl" ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Uploading Logo...
                              </>
                            ) : (
                              <>
                                <i className={`fas ${hasDocument(formData.companyLogoUrl) ? 'fa-sync' : 'fa-upload'} me-1`}></i>
                                {hasDocument(formData.companyLogoUrl) ? 'Replace Logo' : 'Upload Logo'}
                              </>
                            )}
                          </label>
                        </div>
                      </div>
                    )}

                    <div className="mt-3">
                      <span className={`badge bg-${getDocumentStatus(formData.companyLogoUrl).badge}`}>
                        {getDocumentStatus(formData.companyLogoUrl).text} {getDocumentStatus(formData.companyLogoUrl).icon}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Document Status Summary Card */}
              <div className="col-md-6 mb-4">
                <div className="card border-info">
                  <div className="card-header bg-info bg-opacity-10 border-info">
                    <h6 className="mb-0 d-flex align-items-center">
                      <i className="bi bi-graph-up me-2"></i>
                      Documents Summary
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-6 mb-3">
                        <div className="border rounded p-3 text-center">
                          <div className="text-muted small">Total Documents</div>
                          <div className="fw-bold fs-4">{documents.length}</div>
                        </div>
                      </div>
                      <div className="col-6 mb-3">
                        <div className="border rounded p-3 text-center">
                          <div className="text-muted small">Uploaded</div>
                          <div className="fw-bold fs-4 text-success">
                            {documents.filter(d => hasDocument(formData[d.name])).length}
                          </div>
                        </div>
                      </div>
                      <div className="col-12">
                        <div className="border rounded p-3">
                          <div className="text-muted small mb-2">Compliance Score</div>
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <span className="fw-semibold">
                              {Math.round((documents.filter(d => hasDocument(formData[d.name])).length / documents.length) * 100)}%
                            </span>
                            <span className={`badge ${
                              (documents.filter(d => hasDocument(formData[d.name])).length / documents.length) > 0.8 
                                ? 'bg-success' 
                                : (documents.filter(d => hasDocument(formData[d.name])).length / documents.length) > 0.5 
                                  ? 'bg-warning' 
                                  : 'bg-danger'
                            }`}>
                              {
                                (documents.filter(d => hasDocument(formData[d.name])).length / documents.length) > 0.8 
                                  ? 'Excellent' 
                                  : (documents.filter(d => hasDocument(formData[d.name])).length / documents.length) > 0.5 
                                    ? 'Good' 
                                    : 'Poor'
                              }
                            </span>
                          </div>
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
              </div>

              {/* All Other Documents */}
              {documents
                .filter(doc => doc.name !== "companyLogoUrl")
                .map(doc => renderDocumentCard(doc))}
            </div>
          </div>

          {/* Card Footer */}
          <div className="card-footer bg-light border-top">
            <div className="d-flex justify-content-between align-items-center w-100">
              <div className="d-flex align-items-center">
                {editMode ? (
                  <>
                    <div className="bg-warning bg-opacity-10 p-2 rounded-circle me-3">
                      <i className="bi bi-cloud-upload text-warning"></i>
                    </div>
                    <div>
                      <div className="text-dark fw-medium">Upload Mode Active</div>
                      <small className="text-muted">You can upload or replace documents</small>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-success bg-opacity-10 p-2 rounded-circle me-3">
                      <i className="bi bi-eye text-success"></i>
                    </div>
                    <div>
                      <div className="text-dark fw-medium">View Mode Active</div>
                      <small className="text-muted">Documents are read-only</small>
                    </div>
                  </>
                )}
              </div>
              <div className="text-muted small d-flex align-items-center">
                <i className="bi bi-files me-1"></i>
                <span>Document Management</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentsTab;