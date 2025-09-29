import React from 'react';

// Dropdown options
const PRIMARY_SKILL_OPTIONS = [
  'Cook', 'Baby Care', 'House Maid', 'Nursing', 'Elder Care', 'Patient Care', 'Others'
];

const MOTHER_TONGUE_OPTIONS = [
  'Telugu','English','Hindi','Urdu','Tamil','Kannada','Malayalam','Marathi','Gujarati','Bengali',
  'Punjabi','Odia','Assamese'
];

const QualificationSkills = ({ formData, errors, handleChange, handleBlur, nextStep, prevStep }) => {
  const workingSkillsOptions = [
    'Cook', 'Baby Care', 'House Maid', 'Nursing', 'Elder Care', 'Patient Care', 'Others'
  ];

  return (
    <div>
      <div className="form-card-header mb-4">
        <h3 className="text-center">Qualification & Skills Details</h3>
      </div>
      <hr />

      <div className="row g-3">
        {/* Qualification */}
        <div className="col-md-6">
          <label htmlFor="qualification" className="form-label">
            Qualification<span className="star">*</span>
          </label>
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

        {/* School / College */}
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

        {/* Primary Skill (dropdown) */}
        <div className="col-md-6">
          <label htmlFor="primarySkill" className="form-label">
            Primary Skill<span className="star">*</span>
          </label>
          <select
            className={`form-select ${errors.primarySkill ? 'is-invalid' : ''}`}
            id="primarySkill"
            name="primarySkill"
            value={formData.primarySkill}
            onChange={handleChange}
            onBlur={handleBlur}
          >
            <option value="">Select</option>
            {PRIMARY_SKILL_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          {errors.primarySkill && <div className="invalid-feedback">{errors.primarySkill}</div>}
        </div>

        {/* Work Experience (free text years/months) */}
        <div className="col-md-6">
          <label htmlFor="workExperince" className="form-label">Work Experience</label>
          <input
            type="text"
            className="form-control"
            id="workExperince"
            name="workExperince"
            value={formData.workExperince}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </div>

        {/* Working Skills (checkbox list) */}
        <div className="col-12">
          <label className="form-label">
            Work Experience<span className="star">*</span>
          </label>
          <div className={`d-flex flex-wrap gap-3 ${errors.workingSkills ? 'is-invalid' : ''}`}>
            {workingSkillsOptions.map((option) => (
              <div className="form-check" key={option}>
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="workingSkills"
                  id={`work-${option}`}
                  value={option}
                  checked={(formData.workingSkills || []).includes(option)}
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

        {/* Mother Tongue (dropdown) */}
        <div className="col-md-6">
          <label htmlFor="motherTongue" className="form-label">
            Mother Tongue<span className="star">*</span>
          </label>
          <select
            className={`form-select ${errors.motherTongue ? 'is-invalid' : ''}`}
            id="motherTongue"
            name="motherTongue"
            value={formData.motherTongue}
            onChange={handleChange}
            onBlur={handleBlur}
          >
            <option value="">Select</option>
            {MOTHER_TONGUE_OPTIONS.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
          {errors.motherTongue && <div className="invalid-feedback">{errors.motherTongue}</div>}
        </div>

        {/* Languages (free text) */}
        <div className="col-md-6">
          <label htmlFor="languages" className="form-label">
            Languages<span className="star">*</span>
          </label>
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

        {/* Nav buttons (kept commented as in your file) */}
        {/*
        <div className="col-12 mt-4">
          <button type="button" className="btn btn-primary float-end" onClick={nextStep}>
            Next <i className="bi bi-arrow-right"></i>
          </button>
          <button type="button" className="btn btn-secondary me-2" onClick={prevStep}>
            <i className="bi bi-arrow-left"></i> Previous
          </button>
        </div>
        */}
      </div>
    </div>
  );
};

export default QualificationSkills;
