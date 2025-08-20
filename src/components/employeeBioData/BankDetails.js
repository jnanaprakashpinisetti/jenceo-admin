import React, { useState } from 'react';

const BankDetails = ({ formData, handleChange, handleBlur, handleFileChange, prevStep, handleSubmit, errors,   isSubmitting  }) => {
  const [imagePreview, setImagePreview] = useState(null);

 // Handle file input change
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        alert('Please select a valid image file (JPEG, PNG, GIF)');
        e.target.value = '';
        return;
      }
      
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('Image size should be less than 2MB');
        e.target.value = '';
        return;
      }
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
      
      // Call the parent handler
      handleFileChange(e);
    }
  };

  return (
    <div className="bank-details-form">
      <h3 className="mb-4">Bank Account Details</h3>
      <div className="row g-3">
        {/* Account Number */}
        <div className="col-md-6">
          <label htmlFor="accountNo" className="form-label">
            Account No
          </label>
          <input 
            type="text"
            className={`form-control ${errors.accountNo ? 'is-invalid' : ''}`}
            id="accountNo" 
            name="accountNo" 
            value={formData.accountNo} 
            onChange={handleChange}
            onBlur={handleBlur}
            maxLength="18"
            placeholder="Enter account number"
          />
          {errors.accountNo && <div className="invalid-feedback">{errors.accountNo}</div>}
        </div>
        
        {/* Bank Name */}
        <div className="col-md-6">
          <label htmlFor="bankName" className="form-label">
            Bank Name
          </label>
          <input 
            type="text" 
            className={`form-control ${errors.bankName ? 'is-invalid' : ''}`}
            id="bankName" 
            name="bankName" 
            value={formData.bankName} 
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter bank name"
          />
          {errors.bankName && <div className="invalid-feedback">{errors.bankName}</div>}
        </div>
        
        {/* Branch Name */}
        <div className="col-md-6">
          <label htmlFor="branchName" className="form-label">
            Branch Name
          </label>
          <input 
            type="text" 
            className={`form-control ${errors.branchName ? 'is-invalid' : ''}`}
            id="branchName" 
            name="branchName" 
            value={formData.branchName} 
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter branch name"
          />
          {errors.branchName && <div className="invalid-feedback">{errors.branchName}</div>}
        </div>
        
        {/* IFSC Code */}
        <div className="col-md-6">
          <label htmlFor="ifscCode" className="form-label">
            IFSC Code
          </label>
          <input 
            type="text" 
            className={`form-control ${errors.ifscCode ? 'is-invalid' : ''}`}
            id="ifscCode" 
            name="ifscCode" 
            value={formData.ifscCode} 
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter IFSC code"
            style={{ textTransform: "uppercase" }}
            maxLength="11"
          />
          {errors.ifscCode && <div className="invalid-feedback">{errors.ifscCode}</div>}
        </div>
        
        {/* UPI Payment Sections */}
        <div className="col-12 mt-3">
          <h6 className="border-bottom pb-2">UPI Payment Details</h6>
        </div>
        
        {/* PhonePe */}
        <div className="col-md-6">
          <label htmlFor="phonePayNo" className="form-label">PhonePe Number</label>
          <div className="input-group">
            <span className="input-group-text">+91</span>
            <input 
              type="text" 
              className={`form-control ${errors.phonePayNo ? 'is-invalid' : ''}`}
              id="phonePayNo" 
              name="phonePayNo" 
              value={formData.phonePayNo} 
              onChange={handleChange}
              onBlur={handleBlur}
              maxLength={10}
              placeholder="Enter PhonePe number"
            />
          </div>
          {errors.phonePayNo && <div className="invalid-feedback">{errors.phonePayNo}</div>}
        </div>
        
        <div className="col-md-6">
          <label htmlFor="phonePayName" className="form-label">PhonePe Name</label>
          <input 
            type="text" 
            className={`form-control ${errors.phonePayName ? 'is-invalid' : ''}`}
            id="phonePayName" 
            name="phonePayName" 
            value={formData.phonePayName} 
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter name registered with PhonePe"
          />
          {errors.phonePayName && <div className="invalid-feedback">{errors.phonePayName}</div>}
        </div>
        
        {/* Google Pay */}
        <div className="col-md-6">
          <label htmlFor="googlePayNo" className="form-label">Google Pay Number</label>
          <div className="input-group">
            <span className="input-group-text">+91</span>
            <input 
              type="text" 
              className={`form-control ${errors.googlePayNo ? 'is-invalid' : ''}`}
              id="googlePayNo" 
            name="googlePayNo" 
            value={formData.googlePayNo} 
            onChange={handleChange}
            onBlur={handleBlur}
            maxLength={10}
            placeholder="Enter Google Pay number"
          />
          </div>
          {errors.googlePayNo && <div className="invalid-feedback">{errors.googlePayNo}</div>}
        </div>
        
        <div className="col-md-6">
          <label htmlFor="googlePayName" className="form-label">Google Pay Name</label>
          <input 
            type="text" 
            className={`form-control ${errors.googlePayName ? 'is-invalid' : ''}`}
            id="googlePayName" 
            name="googlePayName" 
            value={formData.googlePayName} 
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter name registered with Google Pay"
          />
          {errors.googlePayName && <div className="invalid-feedback">{errors.googlePayName}</div>}
        </div>
        
        {/* Salary Information */}
        <div className="col-12 mt-3">
          <h6 className="border-bottom pb-2">Salary Information</h6>
        </div>
        
        <div className="col-md-6">
          <label htmlFor="basicSalary" className="form-label">
            Basic salary<span className="text-danger">*</span>
          </label>
          <div className="input-group">
            <span className="input-group-text">₹</span>
            <input 
              type="text" 
              className={`form-control ${errors.basicSalary ? 'is-invalid' : ''}`}
              id="basicSalary" 
              name="basicSalary" 
              value={formData.basicSalary} 
              onChange={handleChange}
              onBlur={handleBlur}
              min="10000"
              maxLength={5}
              step="0.01"
              placeholder="Enter basic salary"
            />
          </div>
          {errors.basicSalary && <div className="invalid-feedback">{errors.basicSalary}</div>}
        </div>
        
        <div className="col-md-6">
          <label htmlFor="pageNo" className="form-label">
            Page No<span className="text-danger">*</span>
          </label>
          <input 
            type="number" 
            className={`form-control ${errors.pageNo ? 'is-invalid' : ''}`}
            id="pageNo" 
            name="pageNo" 
            value={formData.pageNo} 
            onChange={handleChange}
            onBlur={handleBlur}
            min="1"
            placeholder="Enter document page number"
          />
          {errors.pageNo && <div className="invalid-feedback">{errors.pageNo}</div>}
        </div>

        {/* About Employee */}
        <div className="col-12">
          <label htmlFor="aboutEmployee" className="form-label">
            About Employee
          </label>
          <textarea
            className={`form-control ${errors.aboutEmployee ? 'is-invalid' : ''}`}
            id="aboutEmployee" 
            name="aboutEmployee" 
            value={formData.aboutEmployee} 
            onChange={handleChange}
            onBlur={handleBlur}
            rows="4"
            maxLength="500"
            placeholder="Brief description about the employee (max 500 characters)"
          />
          {errors.aboutEmployee && <div className="invalid-feedback">{errors.aboutEmployee}</div>}
        </div>
        
        {/* Employee Photo */}
        <div className="col-12">
          <label htmlFor="employeePhoto" className="form-label">
            Employee Photo<span className="text-danger">*</span>
          </label>
          <input 
            type="file" 
            className={`form-control ${errors.employeePhoto ? 'is-invalid' : ''}`}
            id="employeePhoto" 
            name="employeePhoto" 
            onChange={handleImageChange}
            onBlur={handleBlur}
            accept=".jpg,.jpeg,.png,.gif"
          />
          {errors.employeePhoto && <div className="invalid-feedback">{errors.employeePhoto}</div>}
          {imagePreview && (
            <div className="mt-2">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="img-thumbnail" 
                style={{ maxWidth: '150px', maxHeight: '150px' }}
              />
            </div>
          )}
        </div>
        
        {/* Form Navigation */}
<div className="col-12 mt-4">
          <button 
            type="button" 
            className="btn btn-success me-2" 
            onClick={handleSubmit}
            disabled={isSubmitting} // Added disabled attribute
          >
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Saving...
              </>
            ) : (
              'Save Details'
            )}
          </button>
          <button type="button" className="btn btn-secondary" onClick={prevStep}>
            Previous
          </button>
        </div>
      </div>
    </div>
  );
};

export default BankDetails;