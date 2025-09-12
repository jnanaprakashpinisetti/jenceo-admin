const EmergencyContact1 = ({ formData, errors, handleChange, handleBlur, nextStep, prevStep }) => {
  return (
    <div>
      <div className="form-card-header mb-4">
        <h3 className="text-center">Emergency Contact-1</h3>
      </div>
      <hr></hr>


      <div className="row g-3">
        <div className="col-md-6">
          <label htmlFor="emergencyContact1.name" className="form-label">Contact Name<span className="star">*</span></label>
          <input 
            type="text" 
            className={`form-control ${errors.emergencyContact1?.name ? 'is-invalid' : ''}`}
            id="emergencyContact1.name" 
            name="emergencyContact1.name" 
            value={formData.emergencyContact1.name} 
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.emergencyContact1?.name && <div className="invalid-feedback">{errors.emergencyContact1.name}</div>}
        </div>
        
        <div className="col-md-6">
          <label htmlFor="emergencyContact1.relation" className="form-label">Relation<span className="star">*</span></label>
          <input 
            type="text" 
            className={`form-control ${errors.emergencyContact1?.relation ? 'is-invalid' : ''}`}
            id="emergencyContact1.relation" 
            name="emergencyContact1.relation" 
            value={formData.emergencyContact1.relation} 
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.emergencyContact1?.relation && <div className="invalid-feedback">{errors.emergencyContact1.relation}</div>}
        </div>
        
         <div className="col-md-6">
          <label htmlFor="emergencyContact1.address" className="form-label">D.No / Street</label>
          <input 
            type="text" 
            className="form-control" 
            id="emergencyContact1.address" 
            name="emergencyContact1.address" 
            value={formData.emergencyContact1.address} 
            onChange={handleChange}
          />
        </div>
        
        <div className="col-md-6">
          <label htmlFor="emergencyContact1.village" className="form-label">Village / Town</label>
          <input 
            type="text" 
            className="form-control" 
            id="emergencyContact1.village" 
            name="emergencyContact1.village" 
            value={formData.emergencyContact1.village} 
            onChange={handleChange}
          />
        </div>
        
        <div className="col-md-6">
          <label htmlFor="emergencyContact1.mandal" className="form-label">Mandal / District</label>
          <input 
            type="text" 
            className="form-control" 
            id="emergencyContact1.mandal" 
            name="emergencyContact1.mandal" 
            value={formData.emergencyContact1.mandal} 
            onChange={handleChange}
          />
        </div>
        
        <div className="col-md-6">
          <label htmlFor="emergencyContact1.state" className="form-label">State</label>
          <input 
            type="text" 
            className="form-control" 
            id="emergencyContact1.state" 
            name="emergencyContact1.state" 
            value={formData.emergencyContact1.state} 
            onChange={handleChange}
          />
        </div>
        
        <div className="col-md-6">
          <label htmlFor="emergencyContact1.mobile1" className="form-label">Mobile-1<span className="star">*</span></label>
          <div className="input-group">
            <span className="input-group-text">+91</span>
          <input 
            type="tel" 
            className={`form-control ${errors.emergencyContact1?.mobile1 ? 'is-invalid' : ''}`}
            id="emergencyContact1.mobile1" 
            name="emergencyContact1.mobile1" 
            value={formData.emergencyContact1.mobile1} 
            onChange={(e) => {
              if (/^\d{0,10}$/.test(e.target.value)) {
                handleChange(e);
              }
            }}
            onBlur={handleBlur}
            maxLength={10}
          />
          {errors.emergencyContact1?.mobile1 && <div className="invalid-feedback">{errors.emergencyContact1.mobile1}</div>}
        </div>
        </div>
        
        <div className="col-md-6">
          <label htmlFor="emergencyContact1.mobile2" className="form-label">Mobile-2</label>
          <div className="input-group">
            <span className="input-group-text">+91</span>
          <input 
            type="tel" 
            className={`form-control ${errors.emergencyContact1?.mobile2 ? 'is-invalid' : ''}`}
            id="emergencyContact1.mobile2" 
            name="emergencyContact1.mobile2" 
            value={formData.emergencyContact1.mobile2} 
            onChange={(e) => {
              if (/^\d{0,10}$/.test(e.target.value)) {
                handleChange(e);
              }
            }}
            onBlur={handleBlur}
            maxLength={10}
          />
          {errors.emergencyContact1?.mobile2 && <div className="invalid-feedback">{errors.emergencyContact1.mobile2}</div>}
        </div>
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

export default EmergencyContact1;