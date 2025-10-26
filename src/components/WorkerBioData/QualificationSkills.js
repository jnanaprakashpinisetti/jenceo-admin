import React, { useEffect, useMemo, useRef, useState } from "react";
import LanguagesDropdown from "../common/LangaugesDropdown";


// Dropdown options
const PRIMARY_SKILL_OPTIONS = [
  "Nursing",
  "Patent Care",
  "Care Taker",
  "Baby Care",
  "Supporting",
  "Cook",
  "Housekeeping",
  "Old Age Care",
];

const MOTHER_TONGUE_OPTIONS = [
  'Telugu', 'English', 'Hindi', 'Urdu', 'Tamil', 'Kannada', 'Malayalam', 'Marathi', 'Gujarati', 'Bengali',
  'Punjabi', 'Odia', 'Assamese'
];

const QualificationSkills = ({ formData, errors, handleChange, handleBlur, nextStep, prevStep }) => {
  const workingSkillsOptions = [
    "Diaper",
    "Patent Care",
    "Baby Care",
    "Cook",
    "Supporting",
    "Old Age Care",
  ];

  // ---------------- Nursing & Patient Care (Accordion Data) ----------------
  const NURSING_SECTIONS = [
    "Vital Signs Monitoring",
    "BP Check",
    "Sugar Check (Glucometer)",
    "Medication Administration",
    "IV/IM Injection",
    "IV Cannulation",
    "IV Infusion",
    "Wound Dressing",
    "Catheter Care",
    "Catheterization",
    "Ryle's Tube / NG Feeding",
    "Ryles/Nasogastric Feeding",
    "NG Tube Care",
    "PEG Feeding",
    "Nebulization",
    "Suctioning",
    "Oxygen Support",
    "Tracheostomy Care",
    "Bedsore Care",
    "Positioning & Mobility",
    "Bed Bath & Hygiene",
    "Diaper Change",
    "Urine Bag Change",
    "Post-Operative Care",
  ];

  const isNursing = String(formData.primarySkill || "").toLowerCase() === "nursing";
  const selected = Array.isArray(formData.nursingSkills) ? formData.nursingSkills : [];

  // Other Skills – grouped sections
  const OTHER_SECTIONS = [
    {
      title: "Office & Administrative",
      color: "primary",
      skills: [
        "Computer Operating", "Data Entry", "Office Assistant", "Receptionist",
        "Front Desk Executive", "Admin Assistant", "Office Boy", "Peon", "Office Attendant",
      ],
    },
    {
      title: "Customer Service & Telecommunication",
      color: "success",
      skills: [
        "Tele Calling", "Customer Support", "Telemarketing", "BPO Executive",
        "Call Center Agent", "Customer Care Executive",
      ],
    },
    {
      title: "Management & Supervision",
      color: "warning",
      skills: [
        "Supervisor", "Manager", "Team Leader", "Site Supervisor", "Project Coordinator",
      ],
    },
    {
      title: "Security",
      color: "danger",
      skills: ["Security Guard", "Security Supervisor", "Gatekeeper", "Watchman"],
    },
    {
      title: "Driving & Logistics",
      color: "info",
      skills: [
        "Driving", "Delivery Boy", "Delivery Executive", "Rider", "Driver",
        "Car Driver", "Bike Rider", "Logistics Helper",
      ],
    },
    {
      title: "Technical & Maintenance",
      color: "secondary",
      skills: [
        "Electrician", "Plumber", "Carpenter", "Painter", "Mason", "AC Technician",
        "Mechanic", "Maintenance Staff", "House Keeping", "Housekeeping Supervisor",
      ],
    },
    {
      title: "Industrial & Labor",
      color: "danger",
      skills: [
        "Labour", "Helper", "Loading Unloading", "Warehouse Helper",
        "Factory Worker", "Production Helper", "Packaging Staff",
      ],
    },
    {
      title: "Retail & Sales",
      color: "primary",
      skills: [
        "Sales Boy", "Sales Girl", "Store Helper", "Retail Assistant", "Shop Attendant",
      ],
    },
  ];

  // Handle primary skill change - clear nursing skills when not nursing
  const handlePrimarySkillChange = (e) => {
    const { name, value } = e.target;
    
    // If changing from nursing to something else, clear nursing skills
    if (name === "primarySkill" && String(value).toLowerCase() !== "nursing" && selected.length > 0) {
      // Create a synthetic event to clear nursing skills
      handleChange({
        target: {
          name: "nursingSkills",
          value: []
        }
      });
    }
    
    // Call the original handleChange
    handleChange(e);
  };

  // Count selected other skills for each section
  const getSectionSelectionCount = (sectionSkills) => {
    const otherSelected = Array.isArray(formData.otherSkills) ? formData.otherSkills : [];
    return sectionSkills.filter(skill => otherSelected.includes(skill)).length;
  };

  // Get total selected other skills count
  const totalOtherSkillsSelected = Array.isArray(formData.otherSkills) ? formData.otherSkills.length : 0;

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

        {/* Mother Tongue */}
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

        {/* Languages */}
        <div className="col-md-6">
          <label htmlFor="languages" className="form-label">
            Languages <span className="star">*</span>
          </label>

          <LanguagesDropdown
            value={formData.languages}
            onChange={(selectedLanguages) => {
              // Convert to synthetic event for your handleChange
              handleChange({
                target: {
                  name: "languages",
                  value: selectedLanguages
                }
              });
            }}
            error={errors.languages}
          />
        </div>

        {/* Primary Skill */}
        <div className="col-md-6">
          <label htmlFor="primarySkill" className="form-label">
            Primary Skill<span className="star">*</span>
          </label>
          <select
            className={`form-select ${errors.primarySkill ? 'is-invalid' : ''}`}
            id="primarySkill"
            name="primarySkill"
            value={formData.primarySkill}
            onChange={handlePrimarySkillChange} // Use the new handler
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

        {/* -------------- NEW: Nursing & Patient Care Accordion (when Nursing chosen) -------------- */}
        {isNursing && (
          <div className="col-12">
            <label className="form-label d-flex align-items-center justify-content-between">
              <span className='text-warning'>NURSING SKILLS<span className="star">*</span></span>
              {errors.nursingSkills && <span className="text-danger small">{errors.nursingSkills}</span>}
            </label>

            <div className="d-flex flex-wrap gap-2 bg-dark rounded p-3">
              {NURSING_SECTIONS.map((skill, i) => {
                const isChecked = selected.includes(skill);

                return (
                  <div key={skill} className="d-inline-block">
                    <input
                      className="btn-check"
                      type="checkbox"
                      id={`nursing-${i}`}
                      name="nursingSkills"
                      value={skill}
                      checked={isChecked}
                      onChange={handleChange}
                    />
                    <label
                      className={`btn btn-sm rounded-pill ${isChecked ? 'btn-warning' : 'btn-outline-warning'}`}
                      htmlFor={`nursing-${i}`}
                    >
                      {skill}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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

        <hr></hr>
        {/* -------------- NEW: Others Skills Accordion (when Primary Skill = Others) -------------- */}
        <div className="col-12">
          <label className="form-label d-flex align-items-center justify-content-between">
            <span className='text-warning'>
              OTHER SKILLS 
              {totalOtherSkillsSelected > 0 && (
                <span className="badge bg-warning text-dark ms-2">{totalOtherSkillsSelected} selected</span>
              )}
              <span className="star">*</span>
            </span>
            {errors.otherSkills && <span className="text-danger small">{errors.otherSkills}</span>}
          </label>

          <div className="accordion" id="otherSkillsAccordion">
            {OTHER_SECTIONS.map((sec, i) => {
              const collapseId = `otherSec${i}`;
              const headingId = `otherHead${i}`;
              const sectionSelectedCount = getSectionSelectionCount(sec.skills);
              
              return (
                <div className="accordion-item bg-dark text-white border-0 mb-2 rounded-3" key={sec.title}>
                  <h2 className="accordion-header" id={headingId}>
                    <button
                      className="accordion-button collapsed bg-acc text-white"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target={`#${collapseId}`}
                      aria-expanded="false"
                      aria-controls={collapseId}
                      style={{ borderRadius: "0.5rem" }}
                    >
                      <span className="d-flex justify-content-between align-items-center w-100">
                        <span>{sec.title}</span>
                        {sectionSelectedCount > 0 && (
                          <span className="badge bg-warning text-dark ms-2">{sectionSelectedCount}</span>
                        )}
                      </span>
                    </button>
                  </h2>
                  <div
                    id={collapseId}
                    className="accordion-collapse collapse"
                    aria-labelledby={headingId}
                    data-bs-parent="#otherSkillsAccordion"
                  >
                    <div className="accordion-body">
                      <div className="d-flex flex-wrap gap-2">
                        {sec.skills.map((skill) => {
                          const checked = Array.isArray(formData.otherSkills) ? formData.otherSkills.includes(skill) : false;
                          const inputId = `other-${i}-${skill.replace(/\W+/g, "_")}`;
                          const pillNeedsDark = (sec.color === "warning" || sec.color === "info") && checked;
                          return (
                            <div key={skill} className="d-inline-block">
                              <input
                                className="btn-check"
                                type="checkbox"
                                id={inputId}
                                name="otherSkills"
                                value={skill}
                                checked={checked}
                                onChange={handleChange}
                              />
                              <label
                                className={`btn btn-sm rounded-pill ${checked
                                  ? `btn-${sec.color}${pillNeedsDark ? " text-dark" : ""}`
                                  : `btn-outline-${sec.color}`
                                  }`}
                                htmlFor={inputId}
                              >
                                {skill}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QualificationSkills;