// BasicInformation.js
import React, { useMemo } from "react";

const BasicInformation = ({
  formData,
  errors,
  handleChange,
  handleBlur,
  handleFileChange,
  setErrors,
  nextStep,
}) => {
  // Calculate max date for 18 years ago
  const maxDateString = useMemo(() => {
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() - 18);
    return maxDate.toISOString().split("T")[0];
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

  // Handle file change for both employee photo and ID proof
  const handleFileUpload = (e) => {
    const { name, files } = e.target;
    const file = files?.[0] || null;
    
    if (!file) {
      handleChange({
        target: {
          name: name + "File",
          value: null,
        },
      });
      return;
    }

    // Validate file type
    const validImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
    const validPdfType = "application/pdf";
    
    if (name === "employeePhoto" && !validImageTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, [name]: "Only JPG/PNG/GIF images allowed" }));
      return;
    }
    
    if (name === "idProof" && file.type !== validPdfType && !validImageTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, [name]: "Only PDF or JPG/PNG images allowed" }));
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
        name: name + "File",
        value: file,
      },
    });
  };

  return (
    <div>
      <div className="form-card-header mb-4">
        <h3 className="text-center">Basic Information</h3>
      </div>
      <hr />
      <div className="row g-3">
        {/* Employee Photo */}
        <div className="col-md-6">
          <label htmlFor="employeePhoto" className="form-label">
            Employee Photo <small className="text-muted">(optional)</small>
          </label>
          <input
            type="file"
            className={`form-control opacity-50 ${errors.employeePhoto ? "is-invalid" : ""}`}
            id="employeePhoto"
            name="employeePhoto"
            onChange={handleFileUpload}
            accept=".jpg,.jpeg,.png,.gif"
          />
          <div style={{ fontSize: "9px", color: "#f2f2f2", marginTop: "5px" }}>
            Default photo will be used if not provided:
            <a
              href="https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FSample-Photo.jpg?alt=media&token=01855b47-c9c2-490e-b400-05851192dde7"
              target="_blank"
              rel="noopener noreferrer"
              className="ms-1"
              style={{ fontSize: "9px", color: "#f2f2f2", marginTop: "5px" }}
            >
              View sample photo
            </a>
          </div>
          {errors.employeePhoto && <div className="invalid-feedback">{errors.employeePhoto}</div>}
        </div>

        {/* ID Proof */}
        <div className="col-md-6">
          <label htmlFor="idProof" className="form-label">
            ID Proof <small className="text-muted">(optional)</small>
          </label>
          <input
            type="file"
            className={`form-control opacity-50 ${errors.idProof ? "is-invalid" : ""}`}
            id="idProof"
            name="idProof"
            onChange={handleFileUpload}
            accept=".jpg,.jpeg,.png,.pdf"
          />
          <div style={{ fontSize: "9px", color: "#f2f2f2", marginTop: "5px" }}>
            Accepts PDF or JPG/PNG images (max 150KB)
          </div>
          {errors.idProof && <div className="invalid-feedback">{errors.idProof}</div>}
        </div>

        {/* First Name */}
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

        {/* Last Name */}
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

        {/* Gender */}
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

        {/* Date of Birth */}
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

        {/* Years (auto-calculated) */}
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

        {/* C/o */}
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

        {/* Aadhar No */}
        <div className="col-md-6">
          <label htmlFor="aadharNo" className="form-label">
            Aadhar No
          </label>
          <input
            type="text"
            className="form-control"
            id="aadharNo"
            name="aadharNo"
            value={formData.aadharNo}
            onChange={handleChange}
            onBlur={handleBlur}
            maxLength={12}
          />
        </div>

        {/* Local ID */}
        <div className="col-md-6">
          <label htmlFor="localId" className="form-label">
            Local ID
          </label>
          <input
            type="text"
            className="form-control"
            id="localId"
            name="localId"
            value={formData.localId}
            onChange={handleChange}
          />
        </div>
      </div>
    </div>
  );
};

export default BasicInformation;