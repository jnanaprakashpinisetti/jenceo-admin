import React, { useMemo } from "react";

const BasicInformation = ({
  formData,
  errors,
  handleChange,
  handleBlur,
  handleFileChange,   // <-- fixed: now accepted as prop
  nextStep,
}) => {
  // Calculate max date for 18 years ago
  const maxDateString = useMemo(() => {
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() - 18);
    return maxDate.toISOString().split("T")[0];
  }, []);

  return (
    <div>


      <div className="form-card-header mb-4">
        <h3 className="text-center">Basic Information</h3>
      </div>
      <hr></hr>
      <div className="row g-3">
        {/* Employee Photo */}
        <div className="col-12">
          <label htmlFor="employeePhoto" className="form-label">
            Employee Photo <span className="text-danger">*</span>
          </label>
          <input
            type="file"
            className={`form-control ${errors.employeePhoto ? "is-invalid" : ""}`}
            id="employeePhoto"
            name="employeePhoto"
            onChange={handleFileChange}
            accept=".jpg,.jpeg,.png,.gif"
          />
          {errors.employeePhoto && (
            <div className="invalid-feedback">{errors.employeePhoto}</div>
          )}
        </div>

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
            value={formData.date}
            onChange={handleChange}
            onBlur={handleBlur}
            min={new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
            max={new Date().toISOString().split("T")[0]}
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
          {errors.firstName && (
            <div className="invalid-feedback">{errors.firstName}</div>
          )}
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
          {errors.lastName && (
            <div className="invalid-feedback">{errors.lastName}</div>
          )}
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
          {errors.gender && (
            <div className="invalid-feedback">{errors.gender}</div>
          )}
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
            onChange={handleChange}
            onBlur={handleBlur}
            max={maxDateString}
          />
          {errors.dateOfBirth && (
            <div className="invalid-feedback">{errors.dateOfBirth}</div>
          )}
        </div>

        <div className="col-md-6">
          <label htmlFor="years" className="form-label">
            Years <span className="star">*</span>
          </label>
          <input
            type="number"
            className={`form-control ${errors.years ? "is-invalid" : ""}`}
            id="years"
            name="years"
            value={formData.years}
            onChange={handleChange}
            onBlur={handleBlur}
            min={18}
            max={55}
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
          {errors.mobileNo1 && (
            <div className="invalid-feedback">{errors.mobileNo1}</div>
          )}
        </div>

        {/* Mobile No-2 (optional, validate only if provided) */}
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
          {errors.mobileNo2 && (
            <div className="invalid-feedback">{errors.mobileNo2}</div>
          )}
        </div>
      </div>

      <div className="d-flex justify-content-end mt-3">
        <button type="button" className="btn btn-primary" onClick={nextStep}>
          Next
        </button>
      </div>
    </div>
  );
};

export default BasicInformation;
