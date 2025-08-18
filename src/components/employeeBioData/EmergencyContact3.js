const EmergencyContact3 = ({ formData, handleChange, handleBlur, nextStep, prevStep }) => {
  return (
    <div>
      <h3 className="mb-4">Emergency Contact-3</h3>
      <div className="row g-3">
        <div className="col-md-6">
          <label htmlFor="emergencyContact3.name" className="form-label">Contact Name</label>
          <input 
            type="text" 
            className="form-control" 
            id="emergencyContact3.name" 
            name="emergencyContact3.name" 
            value={formData.emergencyContact3.name} 
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </div>
        
        <div className="col-md-6">
          <label htmlFor="emergencyContact3.relation" className="form-label">Relation</label>
          <input 
            type="text" 
            className="form-control" 
            id="emergencyContact3.relation" 
            name="emergencyContact3.relation" 
            value={formData.emergencyContact3.relation} 
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </div>
        
         <div className="col-md-6">
          <label htmlFor="emergencyContact3.address" className="form-label">D.No / Street</label>
          <input 
            type="text" 
            className="form-control" 
            id="emergencyContact3.address" 
            name="emergencyContact3.address" 
            value={formData.emergencyContact3.address} 
            onChange={handleChange}
          />
        </div>
        
        <div className="col-md-6">
          <label htmlFor="emergencyContact3.village" className="form-label">Village / Town</label>
          <input 
            type="text" 
            className="form-control" 
            id="emergencyContact3.village" 
            name="emergencyContact3.village" 
            value={formData.emergencyContact3.village} 
            onChange={handleChange}
          />
        </div>
        
        <div className="col-md-6">
          <label htmlFor="emergencyContact3.mandal" className="form-label">Mandal / District</label>
          <input 
            type="text" 
            className="form-control" 
            id="emergencyContact3.mandal" 
            name="emergencyContact3.mandal" 
            value={formData.emergencyContact3.mandal} 
            onChange={handleChange}
          />
        </div>
        
        <div className="col-md-6">
          <label htmlFor="emergencyContact3.state" className="form-label">State</label>
          <input 
            type="text" 
            className="form-control" 
            id="emergencyContact3.state" 
            name="emergencyContact3.state" 
            value={formData.emergencyContact3.state} 
            onChange={handleChange}
          />
        </div>
        
        <div className="col-md-6">
          <label htmlFor="emergencyContact3.mobile1" className="form-label">Mobile-1</label>
          <div className="input-group">
            <span className="input-group-text">+91</span>
          <input 
            type="tel" 
            className="form-control" 
            id="emergencyContact3.mobile1" 
            name="emergencyContact3.mobile1" 
            value={formData.emergencyContact3.mobile1} 
            onChange={(e) => {
              if (/^\d{0,10}$/.test(e.target.value)) {
                handleChange(e);
              }
            }}
            onBlur={handleBlur}
            maxLength={10}
          />
        </div>
        </div>
        
        <div className="col-md-6">
          <label htmlFor="emergencyContact3.mobile2" className="form-label">Mobile-2</label>
          <div className="input-group">
            <span className="input-group-text">+91</span>
          <input 
            type="tel" 
            className="form-control" 
            id="emergencyContact3.mobile2" 
            name="emergencyContact3.mobile2" 
            value={formData.emergencyContact3.mobile2} 
            onChange={(e) => {
              if (/^\d{0,10}$/.test(e.target.value)) {
                handleChange(e);
              }
            }}
            onBlur={handleBlur}
            maxLength={10}
          />
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

export default EmergencyContact3;