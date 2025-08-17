const BankDetails = ({ formData, handleChange, handleBlur, handleFileChange, prevStep, handleSubmit, errors }) => {
  return (
    <div>
      <h3 className="mb-4">Bank Account Details</h3>
      <div className="row g-3">
        <div className="col-md-6">
          <label htmlFor="accountNo" className="form-label">Account No</label>
          <input 
            type="text" 
            className="form-control" 
            id="accountNo" 
            name="accountNo" 
            value={formData.accountNo} 
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </div>
        
        <div className="col-md-6">
          <label htmlFor="bankName" className="form-label">Bank Name</label>
          <input 
            type="text" 
            className="form-control" 
            id="bankName" 
            name="bankName" 
            value={formData.bankName} 
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </div>
        
        <div className="col-md-6">
          <label htmlFor="branchName" className="form-label">Branch Name</label>
          <input 
            type="text" 
            className="form-control" 
            id="branchName" 
            name="branchName" 
            value={formData.branchName} 
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </div>
        
        <div className="col-md-6">
          <label htmlFor="ifscCode" className="form-label">IFSC Code</label>
          <input 
            type="text" 
            className="form-control" 
            id="ifscCode" 
            name="ifscCode" 
            value={formData.ifscCode} 
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </div>
        
        <div className="col-md-6">
          <label htmlFor="phonePayNo" className="form-label">Phone Pay No</label>
          <input 
            type="text" 
            className="form-control" 
            id="phonePayNo" 
            name="phonePayNo" 
            value={formData.phonePayNo} 
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </div>
        
        <div className="col-md-6">
          <label htmlFor="phonePayName" className="form-label">Phone Pay Name</label>
          <input 
            type="text" 
            className="form-control" 
            id="phonePayName" 
            name="phonePayName" 
            value={formData.phonePayName} 
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </div>
        
        <div className="col-md-6">
          <label htmlFor="googlePayNo" className="form-label">Google Pay No</label>
          <input 
            type="text" 
            className="form-control" 
            id="googlePayNo" 
            name="googlePayNo" 
            value={formData.googlePayNo} 
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </div>
        
        <div className="col-md-6">
          <label htmlFor="googlePayName" className="form-label">Google Pay Name</label>
          <input 
            type="text" 
            className="form-control" 
            id="googlePayName" 
            name="googlePayName" 
            value={formData.googlePayName} 
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </div>
        
        <div className="col-12">
          <label htmlFor="employeePhoto" className="form-label">Choose Employee Photo*</label>
          <input 
            type="file" 
            className={`form-control ${errors.employeePhoto ? 'is-invalid' : ''}`}
            id="employeePhoto" 
            name="employeePhoto" 
            onChange={handleFileChange}
            onBlur={handleBlur}
            accept="image/jpeg, image/png, image/gif"
          />
          {errors.employeePhoto && <div className="invalid-feedback">{errors.employeePhoto}</div>}
          <small className="text-muted">Only JPG/PNG/GIF images under 200KB</small>
        </div>
        
        <div className="col-12 mt-4">
          <button type="button" className="btn btn-secondary me-2" onClick={prevStep}>
            <i className="bi bi-arrow-left"></i> Previous
          </button>
          <button type="button" className="btn btn-success float-end" onClick={handleSubmit}>
            <i className="bi bi-save"></i> Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default BankDetails;