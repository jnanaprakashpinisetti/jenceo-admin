const EmergencyContact2 = ({ formData, errors, handleChange, handleBlur, nextStep, prevStep }) => {
  return (
    <div>
      <h3 className="mb-4">Emergency Contact-2</h3>
      <div className="row g-3">
        <div className="col-md-6">
          <label htmlFor="emergencyContact2.name" className="form-label">Contact Name<span className="star">*</span></label>
          <input 
            type="text" 
            className={`form-control ${errors.emergencyContact2?.name ? 'is-invalid' : ''}`}
            id="emergencyContact2.name" 
            name="emergencyContact2.name" 
            value={formData.emergencyContact2.name} 
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.emergencyContact2?.name && <div className="invalid-feedback">{errors.emergencyContact2.name}</div>}
        </div>
        
        <div className="col-md-6">
          <label htmlFor="emergencyContact2.relation" className="form-label">Relation<span className="star">*</span></label>
          <input 
            type="text" 
            className={`form-control ${errors.emergencyContact2?.relation ? 'is-invalid' : ''}`}
            id="emergencyContact2.relation" 
            name="emergencyContact2.relation" 
            value={formData.emergencyContact2.relation} 
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.emergencyContact2?.relation && <div className="invalid-feedback">{errors.emergencyContact2.relation}</div>}
        </div>
        
        <div className="col-md-6">
          <label htmlFor="emergencyContact2.address" className="form-label">D.No / Street</label>
          <input 
            type="text" 
            className="form-control" 
            id="emergencyContact2.address" 
            name="emergencyContact2.address" 
            value={formData.emergencyContact2.address} 
            onChange={handleChange}
          />
        </div>
        
        <div className="col-md-6">
          <label htmlFor="emergencyContact2.village" className="form-label">Village / Town</label>
          <input 
            type="text" 
            className="form-control" 
            id="emergencyContact2.village" 
            name="emergencyContact2.village" 
            value={formData.emergencyContact2.village} 
            onChange={handleChange}
          />
        </div>
        
        <div className="col-md-6">
          <label htmlFor="emergencyContact2.mandal" className="form-label">Mandal / District</label>
          <input 
            type="text" 
            className="form-control" 
            id="emergencyContact2.mandal" 
            name="emergencyContact2.mandal" 
            value={formData.emergencyContact2.mandal} 
            onChange={handleChange}
          />
        </div>
        
        <div className="col-md-6">
          <label htmlFor="emergencyContact2.state" className="form-label">State</label>
          <input 
            type="text" 
            className="form-control" 
            id="emergencyContact2.state" 
            name="emergencyContact2.state" 
            value={formData.emergencyContact2.state} 
            onChange={handleChange}
          />
        </div>
        
        <div className="col-md-6">
          <label htmlFor="emergencyContact2.mobile1" className="form-label">Mobile-1<span className="star">*</span></label>
          <div className="input-group">
            <span className="input-group-text">+91</span>
          <input 
            type="tel" 
            className={`form-control ${errors.emergencyContact2?.mobile1 ? 'is-invalid' : ''}`}
            id="emergencyContact2.mobile1" 
            name="emergencyContact2.mobile1" 
            value={formData.emergencyContact2.mobile1} 
            onChange={(e) => {
              if (/^\d{0,10}$/.test(e.target.value)) {
                handleChange(e);
              }
            }}
            onBlur={handleBlur}
            maxLength={10}
          />
          {errors.emergencyContact2?.mobile1 && <div className="invalid-feedback">{errors.emergencyContact2.mobile1}</div>}
        </div>
        </div>
        
        <div className="col-md-6">
          <label htmlFor="emergencyContact2.mobile2" className="form-label">Mobile-2</label>
          <div className="input-group">
            <span className="input-group-text">+91</span>
          <input 
            type="tel" 
            className={`form-control ${errors.emergencyContact2?.mobile2 ? 'is-invalid' : ''}`}
            id="emergencyContact2.mobile2" 
            name="emergencyContact2.mobile2" 
            value={formData.emergencyContact2.mobile2} 
            onChange={(e) => {
              if (/^\d{0,10}$/.test(e.target.value)) {
                handleChange(e);
              }
            }}
            onBlur={handleBlur}
            maxLength={10}
          />
          {errors.emergencyContact2?.mobile2 && <div className="invalid-feedback">{errors.emergencyContact2.mobile2}</div>}
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

export default EmergencyContact2;