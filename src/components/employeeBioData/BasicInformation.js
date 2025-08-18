const BasicInformation = ({ formData, errors, handleChange, handleBlur, nextStep }) => {
  // Calculate max date for 18 years ago
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 18);
  const maxDateString = maxDate.toISOString().split('T')[0];

  return (
    <div>
      <h3 className="mb-4">Basic Information</h3>
      <div className="row g-3">
        <div className="col-md-6">
          <label htmlFor="firstName" className="form-label">First Name<span className="star">*</span></label>
          <input 
            type="text" 
            className={`form-control ${errors.firstName ? 'is-invalid' : ''}`}
            id="firstName" 
            name="firstName" 
            value={formData.firstName} 
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.firstName && <div className="invalid-feedback">{errors.firstName}</div>}
        </div>
        
        <div className="col-md-6">
          <label htmlFor="lastName" className="form-label">Last Name<span className="star">*</span></label>
          <input 
            type="text" 
            className={`form-control ${errors.lastName ? 'is-invalid' : ''}`}
            id="lastName" 
            name="lastName" 
            value={formData.lastName} 
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.lastName && <div className="invalid-feedback">{errors.lastName}</div>}
        </div>
        
        <div className="col-md-6">
          <label htmlFor="gender" className="form-label">Gender<span className="star">*</span></label>
          <select 
            className={`form-select ${errors.gender ? 'is-invalid' : ''}`}
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
          <label htmlFor="dateOfBirth" className="form-label">Date Of Birth<span className="star">*</span></label>
          <input 
            type="date" 
            className={`form-control ${errors.dateOfBirth ? 'is-invalid' : ''}`}
            id="dateOfBirth" 
            name="dateOfBirth" 
            value={formData.dateOfBirth} 
            onChange={handleChange}
            onBlur={handleBlur}
            max={maxDateString}
          />
          {errors.dateOfBirth && <div className="invalid-feedback">{errors.dateOfBirth}</div>}
        </div>
        
        <div className="col-md-6">
          <label htmlFor="years" className="form-label">Years<span className="star">*</span></label>
          <input 
            type="number" 
            className={`form-control ${errors.years ? 'is-invalid' : ''}`}
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
        
        <div className="col-md-6">
          <label htmlFor="mobileNo1" className="form-label">Mobile No-1<span className="star">*</span></label>
          <div className="input-group">
            <span className="input-group-text">+91</span>
          <input 
            type="tel" 
            className={`form-control ${errors.mobileNo1 ? 'is-invalid' : ''}`}
            id="mobileNo1" 
            name="mobileNo1" 
            value={formData.mobileNo1} 
            onChange={handleChange}
            onBlur={handleBlur}
            maxLength={10}
          />
          {errors.mobileNo1 && <div className="invalid-feedback">{errors.mobileNo1}</div>}
        </div>
        </div>
        
        <div className="col-md-6">
          <label htmlFor="mobileNo2" className="form-label">Mobile No-2</label>
          <div className="input-group">
            <span className="input-group-text">+91</span>
          <input 
            type="tel" 
            className={`form-control ${errors.mobileNo2 ? 'is-invalid' : ''}`}
            id="mobileNo2" 
            name="mobileNo2" 
            value={formData.mobileNo2} 
            onChange={handleChange}
            onBlur={handleBlur}
            maxLength={10}
          />
          {errors.mobileNo2 && <div className="invalid-feedback">{errors.mobileNo2}</div>}
        </div>
        </div>
        
        <div className="col-md-6">
          <label htmlFor="aadharNo" className="form-label">Aadhar No<span className="star">*</span></label>
          <input 
            type="text" 
            className={`form-control ${errors.aadharNo ? 'is-invalid' : ''}`}
            id="aadharNo" 
            name="aadharNo" 
            value={formData.aadharNo} 
            onChange={handleChange}
            onBlur={handleBlur}
            maxLength={12}
          />
          {errors.aadharNo && <div className="invalid-feedback">{errors.aadharNo}</div>}
        </div>
        
        <div className="col-md-6">
          <label htmlFor="localId" className="form-label">Local ID</label>
          <input 
            type="text" 
            className="form-control" 
            id="localId" 
            name="localId" 
            value={formData.localId} 
            onChange={handleChange}
          />
        </div>
        
        <div className="col-12 mt-4">
          <button type="button" className="btn btn-primary float-end" onClick={nextStep}>
            Next <i className="bi bi-arrow-right"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BasicInformation;