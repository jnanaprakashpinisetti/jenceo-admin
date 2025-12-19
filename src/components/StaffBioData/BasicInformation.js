// BasicInformation.js
import React, { useMemo, useState } from "react";
import firebaseDB from "../../firebase";

const BasicInformation = ({
  formData,
  errors,
  handleChange,
  handleBlur,
  setErrors, // Add setErrors to props
  nextStep,
}) => {
  const [showIdExistsModal, setShowIdExistsModal] = useState(false);
  const [existingEmployee, setExistingEmployee] = useState(null);

  // Calculate max date for 18 years ago
  const maxDateString = useMemo(() => {
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() - 18);
    return maxDate.toISOString().split("T")[0];
  }, []);

  // Set current date for date of joining
  const currentDateString = useMemo(() => {
    return new Date().toISOString().split("T")[0];
  }, []);

  // Auto-calculate years based on date of birth
  const calculateAge = (dob) => {
    if (!dob) return "";
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  };

  // Handle date of birth change
  const handleDobChange = (e) => {
    handleChange(e);
    const years = calculateAge(e.target.value);
    handleChange({
      target: {
        name: "years",
        value: years,
      },
    });
  };

  // Handle file change for employee photo
  const handleEmployeePhotoChange = (e) => {
    const { name, files } = e.target;
    const file = files?.[0] || null;
    
    if (!file) {
      handleChange({
        target: {
          name: "employeePhotoFile",
          value: null,
        },
      });
      return;
    }

    // Validate file type for employee photo
    const validImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
    
    if (!validImageTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, [name]: "Only JPG/PNG/GIF images allowed" }));
      return;
    }

    // Validate file size (150KB max)
    if (file.size > 150 * 1024) {
      setErrors(prev => ({ ...prev, [name]: "File must be less than 150KB" }));
      return;
    }

    // Clear any previous errors for this field
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });

    // Update form data
    handleChange({
      target: {
        name: "employeePhotoFile",
        value: file,
      },
    });
  };

  // Handle file change for ID proof (multiple files)
  const handleIdProofChange = (e) => {
    const { files } = e.target;
    
    if (!files || files.length === 0) {
      handleChange({
        target: {
          name: "idProofFiles",
          value: [],
        },
      });
      handleChange({
        target: {
          name: "idProofPreviews",
          value: [],
        },
      });
      return;
    }

    // Check maximum files limit (5)
    if (files.length > 5) {
      setErrors(prev => ({ ...prev, idProof: "Maximum 5 files allowed" }));
      return;
    }

    const validImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
    const validPdfType = "application/pdf";
    const newFiles = [];
    const newPreviews = [];

    // Validate each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type
      if (file.type !== validPdfType && !validImageTypes.includes(file.type)) {
        setErrors(prev => ({ ...prev, idProof: "Only PDF or JPG/PNG/GIF files allowed" }));
        return;
      }

      // Validate file size (200KB max)
      if (file.size > 200 * 1024) {
        setErrors(prev => ({ ...prev, idProof: `File "${file.name}" must be less than 200KB` }));
        return;
      }

      newFiles.push(file);
      
      // Create preview for image files
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          newPreviews.push(e.target.result);
          // Update previews when all images are loaded
          if (newPreviews.length === newFiles.filter(f => f.type.startsWith('image/')).length) {
            handleChange({
              target: {
                name: "idProofPreviews",
                value: [...newPreviews],
              },
            });
          }
        };
        reader.readAsDataURL(file);
      }
    }

    // Clear any previous errors
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.idProof;
      return newErrors;
    });

    // Update form data
    handleChange({
      target: {
        name: "idProofFiles",
        value: newFiles,
      },
    });
  };

  // Remove ID proof file
  const removeIdProofFile = (index) => {
    const newFiles = [...formData.idProofFiles];
    newFiles.splice(index, 1);
    
    const newPreviews = [...(formData.idProofPreviews || [])];
    if (newPreviews[index]) {
      newPreviews.splice(index, 1);
    }
    
    handleChange({
      target: {
        name: "idProofFiles",
        value: newFiles,
      },
    });
    
    handleChange({
      target: {
        name: "idProofPreviews",
        value: newPreviews,
      },
    });
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Get file icon based on type
  const getFileIcon = (fileType) => {
    if (fileType.includes('pdf')) return 'far fa-file-pdf text-danger';
    if (fileType.includes('image')) return 'far fa-file-image text-success';
    if (fileType.includes('jpeg') || fileType.includes('jpg')) return 'far fa-file-image text-warning';
    if (fileType.includes('png')) return 'far fa-file-image text-info';
    return 'far fa-file text-secondary';
  };

  // Real ID check using Firebase Realtime Database
  const checkIdExists = async (idNo) => {
    if (!idNo) return null;
    try {
      const snapshot = await firebaseDB
        .child("StaffBioData")
        .orderByChild("idNo")
        .equalTo(idNo)
        .once("value");
      if (snapshot.exists()) {
        const val = snapshot.val();
        const firstKey = Object.keys(val)[0];
        const existing = val[firstKey];
        const name = `${existing.firstName || ""} ${existing.lastName || ""}`.trim() || existing.name || "";
        return { name, recordId: firstKey, ...existing };
      }
      return null;
    } catch (err) {
      console.error("Error checking ID existence:", err);
      return null;
    }
  };

  // Handle next step with ID validation
  const handleNextStep = async () => {
    if (formData.idNo) {
      const existingEmployeeData = await checkIdExists(formData.idNo);
      if (existingEmployeeData) {
        setExistingEmployee(existingEmployeeData);
        setShowIdExistsModal(true);
        return;
      }
    }
    nextStep();
  };

  return (
    <div>
      {/* ID Exists Modal */}
      {showIdExistsModal && (
        <div className="id-exists-backdrop">
          <div className="id-exists-card">
            <div className="id-exists-head">
              <div>
                <div className="id-exists-title">ID Already Exists</div>
                <div className="id-exists-sub">The provided ID number matches an existing staff</div>
              </div>

              <button
                className="id-exists-close"
                onClick={() => setShowIdExistsModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="id-exists-body">
              <div className="id-exists-warning">
                <div className="id-exists-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                      fill="#fff"
                      opacity="0.06"
                    />
                    <path
                      d="M12 9v4"
                      stroke="#ff6b6b"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 17h.01"
                      stroke="#ff6b6b"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div className="id-exists-text">
                  <p>
                    This ID number <strong>{existingEmployee?.idNo || "-"}</strong> is
                    already associated with an existing staff. Please check the
                    details below.
                  </p>
                </div>
              </div>

              <div className="text-center">
                <p className="label mb-0">Staff Name</p>
                <p className="val"><strong>{existingEmployee?.name || "N/A"}</strong></p>
              </div>
            </div>

            <div className="id-exists-footer">
              <button
                className="btn-danger"
                onClick={() => setShowIdExistsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="form-card-header mb-4">
        <h3 className="text-center">Basic Information</h3>
      </div>
      <hr />
      <div className="row g-3">
        {/* Staff Photo - Optional */}
        <div className="col-md-6">
          <label htmlFor="employeePhoto" className="form-label">
            Staff Photo <small className="text-muted">(optional)</small>
          </label>
          <input
            type="file"
            className={`form-control ${errors.employeePhoto ? "is-invalid" : ""}`}
            id="employeePhoto"
            name="employeePhoto"
            onChange={handleEmployeePhotoChange}
            accept=".jpg,.jpeg,.png,.gif"
          />
          <div style={{ fontSize: "9px", color: "#f2f2f2", marginTop: "5px" }}>
            Default photo will be used if not provided:
            <a
              href="https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FSample-Photo.jpg?alt=media&token=01855b47-c9c2-490e-b400-05851192dde7"
              target="_blank"
              rel="noopener noreferrer"
              className="ms-1"
              style={{ fontSize: "9px", color: "#f2f2f2" }}
            >
              View sample photo
            </a>
          </div>
          {errors.employeePhoto && <div className="invalid-feedback">{errors.employeePhoto}</div>}
        </div>

        {/* ID Proof Documents */}
        <div className="col-md-6">
          <label htmlFor="idProof" className="form-label">
            ID Proof <span className="star">*</span>
            <span className="ms-2" data-bs-toggle="tooltip" data-bs-placement="top" 
                  title="Acceptable documents: Aadhar Card, PAN Card, Passport, Driver's License, Voter ID, or any government-issued ID in PDF or image format.">
              <i className="bi bi-info-circle text-primary" style={{ cursor: "pointer" }}></i>
            </span>
          </label>
          <input
            type="file"
            className={`form-control ${errors.idProof ? "is-invalid" : ""}`}
            id="idProof"
            name="idProof"
            onChange={handleIdProofChange}
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.gif"
          />
             <small className="text-muted ms-2">
              (Upload 1-5 files, PDF/JPG/PNG/up to 200KB each)
            </small>
          {errors.idProof && <div className="invalid-feedback">{errors.idProof}</div>}
          
          {/* Uploaded files preview */}
          {formData.idProofFiles && formData.idProofFiles.length > 0 && (
            <div className="mt-3">
              <small className="text-muted">
                Uploaded files ({formData.idProofFiles.length}/5):
              </small>
              <div className="mt-2">
                {formData.idProofFiles.map((file, index) => (
                  <div 
                    key={index} 
                    className="border rounded p-2 mb-2 d-flex align-items-center justify-content-between bg-light text-dark"
                  >
                    <div className="d-flex align-items-center">
                      {file.type.startsWith('image/') && formData.idProofPreviews?.[index] ? (
                        <div className="me-2 position-relative">
                          <img 
                            src={formData.idProofPreviews[index]} 
                            alt="Preview" 
                            style={{
                              width: '40px', 
                              height: '40px', 
                              objectFit: 'cover',
                              borderRadius: '4px'
                            }}
                          />
                          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-info">
                            <i className="fas fa-image fa-xs"></i>
                          </span>
                        </div>
                      ) : (
                        <div className="me-2">
                          <i className={`${getFileIcon(file.type)} fa-2x`}></i>
                        </div>
                      )}
                      <div>
                        <div className="fw-bold" style={{ fontSize: '0.85rem' }}>
                          {file.name.length > 25 ? file.name.substring(0, 25) + '...' : file.name}
                        </div>
                        <div className="small-text" style={{ fontSize: '0.75rem' }}>
                          {formatFileSize(file.size)} • {file.type.split('/')[1].toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <button 
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => removeIdProofFile(index)}
                      title="Remove file"
                      style={{ border: 'none', background: 'transparent' }}
                    >
                      <i className="bi bi-x-lg" style={{ fontSize: '1.2rem', color: '#dc3545' }}></i>
                    </button>
                  </div>
                ))}
              </div>
              
              {/* File count warning */}
              {formData.idProofFiles.length >= 5 && (
                <div className="alert alert-warning mt-2 py-2" style={{ fontSize: '0.8rem' }}>
                  <i className="fas fa-exclamation-triangle me-1"></i>
                  Maximum 5 files reached. Remove some files to upload more.
                </div>
              )}
            </div>
          )}
          
        </div>

        {/* Rest of the form fields */}
        <div className="col-md-6">
          <label htmlFor="idNo" className="form-label">
            ID Number <span className="star">*</span>
          </label>
          <input
            type="text"
            className={`form-control ${errors.idNo ? "is-invalid" : ""}`}
            id="idNo"
            name="idNo"
            value={formData.idNo}
            onChange={handleChange}
            onBlur={handleBlur}
            maxLength={7}
          />
          {errors.idNo && <div className="invalid-feedback">{errors.idNo}</div>}
        </div>

        <div className="col-md-6">
          <label htmlFor="date" className="form-label">
            Date Of Joining <span className="star">*</span>
          </label>
          <input
            type="date"
            className={`form-control ${errors.date ? "is-invalid" : ""}`}
            id="date"
            name="date"
            value={formData.date || currentDateString}
            onChange={handleChange}
            onBlur={handleBlur}
            min={new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
            max={currentDateString}
          />
          {errors.date && <div className="invalid-feedback">{errors.date}</div>}
        </div>

        <div className="col-md-6">
          <label htmlFor="firstName" className="form-label">
            First Name <span className="star">*</span>
          </label>
          <input
            type="text"
            className={`form-control ${errors.firstName ? "is-invalid" : ""}`}
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.firstName && <div className="invalid-feedback">{errors.firstName}</div>}
        </div>

        <div className="col-md-6">
          <label htmlFor="lastName" className="form-label">
            Last Name <span className="star">*</span>
          </label>
          <input
            type="text"
            className={`form-control ${errors.lastName ? "is-invalid" : ""}`}
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.lastName && <div className="invalid-feedback">{errors.lastName}</div>}
        </div>

        <div className="col-md-6">
          <label htmlFor="gender" className="form-label">
            Gender <span className="star">*</span>
          </label>
          <select
            className={`form-select ${errors.gender ? "is-invalid" : ""}`}
            id="gender"
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            onBlur={handleBlur}
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          {errors.gender && <div className="invalid-feedback">{errors.gender}</div>}
        </div>

        <div className="col-md-6">
          <label htmlFor="dateOfBirth" className="form-label">
            Date Of Birth <span className="star">*</span>
          </label>
          <input
            type="date"
            className={`form-control ${errors.dateOfBirth ? "is-invalid" : ""}`}
            id="dateOfBirth"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleDobChange}
            onBlur={handleBlur}
            max={maxDateString}
          />
          {errors.dateOfBirth && <div className="invalid-feedback">{errors.dateOfBirth}</div>}
        </div>

        <div className="col-md-6">
          <label htmlFor="years" className="form-label">
            Years <span className="star">*</span>
          </label>
          <input
            type="tel"
            className={`form-control ${errors.years ? "is-invalid" : ""}`}
            id="years"
            name="years"
            value={formData.years}
            onChange={handleChange}
            onBlur={handleBlur}
            min={18}
            max={55}
            maxLength={2}
            readOnly
          />
          {errors.years && <div className="invalid-feedback">{errors.years}</div>}
        </div>

        <div className="col-md-6">
          <label htmlFor="co" className="form-label">C/o</label>
          <input
            type="text"
            className="form-control"
            id="co"
            name="co"
            value={formData.co}
            onChange={handleChange}
          />
        </div>

        {/* Mobile No-1 (required) */}
        <div className="col-md-6">
          <label htmlFor="mobileNo1" className="form-label">
            Mobile No-1 <span className="star">*</span>
          </label>
          <div className="input-group">
            <span className="input-group-text">+91</span>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              className={`form-control ${errors.mobileNo1 ? "is-invalid" : ""}`}
              id="mobileNo1"
              name="mobileNo1"
              value={formData.mobileNo1}
              onChange={handleChange}
              onBlur={handleBlur}
              maxLength={10}
            />
          </div>
          {errors.mobileNo1 && <div className="invalid-feedback">{errors.mobileNo1}</div>}
        </div>

        {/* Mobile No-2 (optional) */}
        <div className="col-md-6">
          <label htmlFor="mobileNo2" className="form-label">
            Mobile No-2 <small className="text-muted">(optional)</small>
          </label>
          <div className="input-group">
            <span className="input-group-text">+91</span>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              className={`form-control ${errors.mobileNo2 ? "is-invalid" : ""}`}
              id="mobileNo2"
              name="mobileNo2"
              value={formData.mobileNo2 || ""}
              onChange={handleChange}
              onBlur={handleBlur}
              maxLength={10}
              placeholder="Optional"
            />
          </div>
          {errors.mobileNo2 && <div className="invalid-feedback">{errors.mobileNo2}</div>}
        </div>
        
        {/* Aadhar Number */}
        <div className="col-md-6">
          <label htmlFor="aadharNo" className="form-label">
            Aadhar Number <small className="text-muted">(optional)</small>
          </label>
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            className="form-control"
            id="aadharNo"
            name="aadharNo"
            value={formData.aadharNo || ""}
            onChange={handleChange}
            onBlur={handleBlur}
            maxLength={12}
            placeholder="12-digit Aadhar number"
          />
        </div>
        
        {/* Local ID */}
        <div className="col-md-6">
          <label htmlFor="localId" className="form-label">
            Local ID <small className="text-muted">(optional)</small>
          </label>
          <input
            type="text"
            className="form-control"
            id="localId"
            name="localId"
            value={formData.localId || ""}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Any local/company ID"
          />
        </div>
      </div>
    </div>
  );
};

export default BasicInformation;