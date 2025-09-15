const PersonalInformation = ({ formData, errors, handleChange, handleBlur, nextStep, prevStep }) => {
  return (
    <div>
      <div className="form-card-header mb-4">
        <h3 className="text-center">Personal Information</h3>
      </div>
      <hr></hr>
      <div className="row g-3">
        <div className="col-12">
          <label className="form-label">Marital Status<span className="star">*</span></label>
          <div className={`d-flex gap-3 ${errors.maritalStatus ? 'is-invalid' : ''}`}>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                name="maritalStatus"
                id="married"
                value="Married"
                checked={formData.maritalStatus === 'Married'}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              <label className="form-check-label" htmlFor="married">Married</label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                name="maritalStatus"
                id="unmarried"
                value="Unmarried"
                checked={formData.maritalStatus === 'Unmarried'}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              <label className="form-check-label" htmlFor="unmarried">Unmarried</label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                name="maritalStatus"
                id="single"
                value="Single"
                checked={formData.maritalStatus === 'Single'}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              <label className="form-check-label" htmlFor="single">Single</label>
            </div>
          </div>
          {errors.maritalStatus && <div className="invalid-feedback d-block">{errors.maritalStatus}</div>}
        </div>

        {formData.maritalStatus === 'Married' && (
          <>
            <div className="col-md-6">
              <label htmlFor="dateOfMarriage" className="form-label">Date Of Marriage</label>
              <input
                type="date"
                className="form-control"
                id="dateOfMarriage"
                name="dateOfMarriage"
                value={formData.dateOfMarriage}
                onChange={handleChange}
                max={new Date().toISOString().split('T')[0]}
                min={new Date(Date.now() - 109800 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              />
            </div>

            <div className="col-md-6">
              <label htmlFor="marriageYears" className="form-label">Years</label>
              <input
                type="number"
                className="form-control"
                id="marriageYears"
                name="marriageYears"
                value={formData.marriageYears}
                onChange={handleChange}
                max={35}
              />
            </div>

            <div className="col-md-6">
              <label htmlFor="childName1" className="form-label">Child Name-1</label>
              <input
                type="text"
                className="form-control"
                id="childName1"
                name="childName1"
                value={formData.childName1}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-6">
              <label htmlFor="childName2" className="form-label">Child Name-2</label>
              <input
                type="text"
                className="form-control"
                id="childName2"
                name="childName2"
                value={formData.childName2}
                onChange={handleChange}
              />
            </div>
          </>
        )}

        <div className="col-md-6">
          <label htmlFor="religion" className="form-label">Religion<span className="star">*</span></label>
          <input
            type="text"
            className={`form-control ${errors.religion ? 'is-invalid' : ''}`}
            id="religion"
            name="religion"
            value={formData.religion}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.religion && <div className="invalid-feedback">{errors.religion}</div>}
        </div>

        <div className="col-md-6">
          <label htmlFor="cast" className="form-label">Cast<span className="star">*</span></label>
          <input
            type="text"
            className={`form-control ${errors.cast ? 'is-invalid' : ''}`}
            id="cast"
            name="cast"
            value={formData.cast}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.cast && <div className="invalid-feedback">{errors.cast}</div>}
        </div>

        {/* <div className="col-12 mt-4">
          <button type="button" className="btn btn-primary float-end" onClick={nextStep}>
            Next <i className="bi bi-arrow-right"></i>
          </button>
          <button type="button" className="btn btn-secondary me-2" onClick={prevStep}>
            <i className="bi bi-arrow-left"></i> Previous
          </button>

        </div> */}
      </div>
    </div>
  );
};

export default PersonalInformation;