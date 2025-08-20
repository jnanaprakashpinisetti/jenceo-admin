import React, { useState, useEffect } from 'react';

const PresentAddress = ({ formData, errors, handleChange, handleBlur, nextStep, prevStep }) => {
  const [sameAsPermanent, setSameAsPermanent] = useState(false);

  // Effect to handle checkbox state changes
  useEffect(() => {
    if (sameAsPermanent) {
      // Copy permanent address data to present address
      const addressFields = [
        'Address', 'Street', 'Landmark', 'Village', 
        'Mandal', 'District', 'State', 'Pincode'
      ];
      
      addressFields.forEach(field => {
        const permanentField = `permanent${field}`;
        const presentField = `present${field}`;
        
        if (formData[permanentField]) {
          // Create a synthetic event to update the form data
          const syntheticEvent = {
            target: {
              name: presentField,
              value: formData[permanentField]
            }
          };
          handleChange(syntheticEvent);
        }
      });
    }
  }, [sameAsPermanent, formData, handleChange]);

  const handleCheckboxChange = (e) => {
    setSameAsPermanent(e.target.checked);
  };

  return (
    <div>
      <h3 className="mb-4">Present Address</h3>
      
      {/* Same as Permanent Address Checkbox */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="sameAsPermanent"
              checked={sameAsPermanent}
              onChange={handleCheckboxChange}
            />
            <label className="form-check-label" htmlFor="sameAsPermanent">
              Same as Permanent Address
            </label>
          </div>
        </div>
      </div>
      
      <div className="row g-3">
        <div className="col-6">
          <label htmlFor="presentAddress" className="form-label">Address / D.No<span className="star">*</span></label>
          <input 
            type="text" 
            className={`form-control ${errors.presentAddress ? 'is-invalid' : ''}`}
            id="presentAddress" 
            name="presentAddress" 
            value={formData.presentAddress} 
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={sameAsPermanent}
          />
          {errors.presentAddress && <div className="invalid-feedback">{errors.presentAddress}</div>}
        </div>
        
        <div className="col-md-6">
          <label htmlFor="presentStreet" className="form-label">Street Name <span className="star">*</span></label>
          <input 
            type="text" 
            className={`form-control ${errors.presentStreet ? 'is-invalid' : ''}`}
            id="presentStreet" 
            name="presentStreet" 
            value={formData.presentStreet} 
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={sameAsPermanent}
          />
          {errors.presentStreet && <div className="invalid-feedback">{errors.presentStreet}</div>}
        </div>
        
        <div className="col-md-6">
          <label htmlFor="presentLandmark" className="form-label">Land Mark</label>
          <input 
            type="text" 
            className="form-control" 
            id="presentLandmark" 
            name="presentLandmark" 
            value={formData.presentLandmark} 
            onChange={handleChange}
            disabled={sameAsPermanent}
          />
        </div>
        
        <div className="col-md-6">
          <label htmlFor="presentVillage" className="form-label">Village / Town<span className="star">*</span></label>
          <input 
            type="text" 
            className={`form-control ${errors.presentVillage ? 'is-invalid' : ''}`}
            id="presentVillage" 
            name="presentVillage" 
            value={formData.presentVillage} 
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={sameAsPermanent}
          />
          {errors.presentVillage && <div className="invalid-feedback">{errors.presentVillage}</div>}
        </div>
        
        <div className="col-md-6">
          <label htmlFor="presentMandal" className="form-label">Mandal<span className="star">*</span></label>
          <input 
            type="text" 
            className={`form-control ${errors.presentMandal ? 'is-invalid' : ''}`}
            id="presentMandal" 
            name="presentMandal" 
            value={formData.presentMandal} 
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={sameAsPermanent}
          />
          {errors.presentMandal && <div className="invalid-feedback">{errors.presentMandal}</div>}
        </div>
        
        <div className="col-md-6">
          <label htmlFor="presentDistrict" className="form-label">District<span className="star">*</span></label>
          <input 
            type="text" 
            className={`form-control ${errors.presentDistrict ? 'is-invalid' : ''}`}
            id="presentDistrict" 
            name="presentDistrict" 
            value={formData.presentDistrict} 
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={sameAsPermanent}
          />
          {errors.presentDistrict && <div className="invalid-feedback">{errors.presentDistrict}</div>}
        </div>
        
        <div className="col-md-6">
          <label htmlFor="presentState" className="form-label">State<span className="star">*</span></label>
          <input 
            type="text" 
            className={`form-control ${errors.presentState ? 'is-invalid' : ''}`}
            id="presentState" 
            name="presentState" 
            value={formData.presentState} 
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={sameAsPermanent}
          />
          {errors.presentState && <div className="invalid-feedback">{errors.presentState}</div>}
        </div>
        
        <div className="col-md-6">
          <label htmlFor="presentPincode" className="form-label">Pin Code<span className="star">*</span></label>
          <input 
            type="text" 
            className={`form-control ${errors.presentPincode ? 'is-invalid' : ''}`}
            id="presentPincode" 
            name="presentPincode" 
            value={formData.presentPincode} 
            onChange={(e) => {
              if (/^\d{0,6}$/.test(e.target.value)) {
                handleChange(e);
              }
            }}
            onBlur={handleBlur}
            maxLength={6}
            disabled={sameAsPermanent}
          />
          {errors.presentPincode && <div className="invalid-feedback">{errors.presentPincode}</div>}
        </div>
        
        <div className="col-12 mt-4">
          <button type="button" className="btn btn-primary float-end" onClick={nextStep}>
            Next <i className="bi bi-arrow-right"></i>
          </button>
          <button type="button" className="btn btn-secondary me-2" onClick={prevStep}>
            <i className="bi bi-arrow-left"></i> Previous
          </button>
        </div>
      </div>
    </div>
  );
};

export default PresentAddress;