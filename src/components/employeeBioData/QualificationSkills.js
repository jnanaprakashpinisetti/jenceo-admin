const QualificationSkills = ({ formData, errors, handleChange, handleBlur, nextStep, prevStep }) => {
  const workingSkillsOptions = [
    'Cook', 'Baby Care Cook', 'House Made', 
    'Nursing', 'Elder Care', 'Patient Care', 'Others'
  ];

  return (
    <div>
      <h3 className="mb-4">Qualification & Skills Details</h3>
      <div className="row g-3">
        <div className="col-md-6">
          <label htmlFor="qualification" className="form-label">Qualification<span className="star">*</span></label>
          <input 
            type="text" 
            className={`form-control ${errors.qualification ? 'is-invalid' : ''}`}
            id="qualification" 
            name="qualification" 
            value={formData.qualification} 
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.qualification && <div className="invalid-feedback">{errors.qualification}</div>}
        </div>
        
        <div className="col-md-6">
          <label htmlFor="schoolCollege" className="form-label">School / College</label>
          <input 
            type="text" 
            className="form-control" 
            id="schoolCollege" 
            name="schoolCollege" 
            value={formData.schoolCollege} 
            onChange={handleChange}
          />
        </div>
        
        <div className="col-md-6">
          <label htmlFor="primarySkill" className="form-label">Primary Skill<span className="star">*</span></label>
          <input 
            type="text" 
            className={`form-control ${errors.primarySkill ? 'is-invalid' : ''}`}
            id="primarySkill" 
            name="primarySkill" 
            value={formData.primarySkill} 
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.primarySkill && <div className="invalid-feedback">{errors.primarySkill}</div>}
        </div>

        <div className="col-md-6">
          <label htmlFor="primarySkill" className="form-label">Work Experince</label>
          <input 
            type="text" 
            className={`form-control`}
            id="workExperince" 
            name="workExperince" 
            value={formData.workExperince} 
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </div>
        
        <div className="col-12">
          <label className="form-label">Work Experience<span className="star">*</span></label>
          <div className={`d-flex flex-wrap gap-3 ${errors.workingSkills ? 'is-invalid' : ''}`}>
            {workingSkillsOptions.map(option => (
              <div className="form-check" key={option}>
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="workingSkills"
                  id={`work-${option}`}
                  value={option}
                  checked={formData.workingSkills.includes(option)}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
                <label className="form-check-label" htmlFor={`work-${option}`}>
                  {option}
                </label>
              </div>
            ))}
          </div>
          {errors.workingSkills && <div className="invalid-feedback d-block">{errors.workingSkills}</div>}
        </div>
        
        <div className="col-md-6">
          <label htmlFor="motherTongue" className="form-label">Mother Tongue<span className="star">*</span></label>
          <input 
            type="text" 
            className={`form-control ${errors.motherTongue ? 'is-invalid' : ''}`}
            id="motherTongue" 
            name="motherTongue" 
            value={formData.motherTongue} 
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.motherTongue && <div className="invalid-feedback">{errors.motherTongue}</div>}
        </div>
        
        <div className="col-md-6">
          <label htmlFor="languages" className="form-label">Languages<span className="star">*</span></label>
          <input 
            type="text" 
            className={`form-control ${errors.languages ? 'is-invalid' : ''}`}
            id="languages" 
            name="languages" 
            value={formData.languages} 
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.languages && <div className="invalid-feedback">{errors.languages}</div>}
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

export default QualificationSkills;