const PermanentAddress = ({ formData, errors, handleChange, handleBlur, nextStep, prevStep }) => {
  return (
    <div>
      <div className="form-card-header mb-4">
        <h3 className="text-center">Permanent Address</h3>
      </div>
      <hr></hr>
      <div className="row g-3">
        <div className="col-6">
          <label htmlFor="permanentAddress" className="form-label">Address / D.No<span className="star">*</span></label>
          <input
            type="text"
            className={`form-control ${errors.permanentAddress ? 'is-invalid' : ''}`}
            id="permanentAddress"
            name="permanentAddress"
            value={formData.permanentAddress}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.permanentAddress && <div className="invalid-feedback">{errors.permanentAddress}</div>}
        </div>

        <div className="col-md-6">
          <label htmlFor="permanentStreet" className="form-label">Street Name<span className="star">*</span></label>
          <input
            type="text"
            className={`form-control ${errors.permanentStreet ? 'is-invalid' : ''}`}
            id="permanentStreet"
            name="permanentStreet"
            value={formData.permanentStreet}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.permanentStreet && <div className="invalid-feedback">{errors.permanentStreet}</div>}
        </div>

        <div className="col-md-6">
          <label htmlFor="permanentLandmark" className="form-label">Land Mark</label>
          <input
            type="text"
            className="form-control"
            id="permanentLandmark"
            name="permanentLandmark"
            value={formData.permanentLandmark}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-6">
          <label htmlFor="permanentVillage" className="form-label">Village / Town<span className="star">*</span></label>
          <input
            type="text"
            className={`form-control ${errors.permanentVillage ? 'is-invalid' : ''}`}
            id="permanentVillage"
            name="permanentVillage"
            value={formData.permanentVillage}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.permanentVillage && <div className="invalid-feedback">{errors.permanentVillage}</div>}
        </div>

        <div className="col-md-6">
          <label htmlFor="permanentMandal" className="form-label">Mandal<span className="star">*</span></label>
          <input
            type="text"
            className={`form-control ${errors.permanentMandal ? 'is-invalid' : ''}`}
            id="permanentMandal"
            name="permanentMandal"
            value={formData.permanentMandal}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.permanentMandal && <div className="invalid-feedback">{errors.permanentMandal}</div>}
        </div>

        <div className="col-md-6">
          <label htmlFor="permanentDistrict" className="form-label">District<span className="star">*</span></label>
          <input
            type="text"
            className={`form-control ${errors.permanentDistrict ? 'is-invalid' : ''}`}
            id="permanentDistrict"
            name="permanentDistrict"
            value={formData.permanentDistrict}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.permanentDistrict && <div className="invalid-feedback">{errors.permanentDistrict}</div>}
        </div>

        <div className="col-md-6">
          <label htmlFor="permanentState" className="form-label">State<span className="star">*</span></label>
          <input
            type="text"
            className={`form-control ${errors.permanentState ? 'is-invalid' : ''}`}
            id="permanentState"
            name="permanentState"
            value={formData.permanentState}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.permanentState && <div className="invalid-feedback">{errors.permanentState}</div>}
        </div>

        <div className="col-md-6">
          <label htmlFor="permanentPincode" className="form-label">Pin Code<span className="star">*</span></label>
          <input
            type="text"
            className={`form-control ${errors.permanentPincode ? 'is-invalid' : ''}`}
            id="permanentPincode"
            name="permanentPincode"
            value={formData.permanentPincode}
            onChange={(e) => {
              if (/^\d{0,6}$/.test(e.target.value)) {
                handleChange(e);
              }
            }}
            onBlur={handleBlur}
            maxLength={6}
          />
          {errors.permanentPincode && <div className="invalid-feedback">{errors.permanentPincode}</div>}
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

export default PermanentAddress;