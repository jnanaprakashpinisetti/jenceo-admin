import React, { useState } from "react";
import firebaseDB from "../../firebase";
import SuccessModal from "../common/SuccessModal";

export default function WorkerCallForm({ isOpen, onClose }) {
  const [step, setStep] = useState(1);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [formData, setFormData] = useState({
    mobileNo: "",
    name: "",
    location: "",
    source: "",
    gender: "",
    maritalStatus: "",
    age: "",
    experience: "No",
    years: "",
    skills: "",
    homeCareSkills: [],
    otherSkills: [],
    languages: [],
    education: "",
    workingHours: "",
    conversationLevel: "",
    callReminderDate: "",
    comment: "",
    commentDateTime: "",
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      const updated = formData[name] || [];
      if (checked) {
        setFormData({ ...formData, [name]: [...updated, value] });
      } else {
        setFormData({
          ...formData,
          [name]: updated.filter((item) => item !== value),
        });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  // Validation per step
  const validateStep = () => {
    const newErrors = {};
    if (step === 1) {
      if (!formData.mobileNo) {
        newErrors.mobileNo = "Mobile No is required";
      } else if (!/^\d{10}$/.test(formData.mobileNo)) {
        newErrors.mobileNo = "Mobile No must be exactly 10 digits";
      }

      if (!formData.name) newErrors.name = "Name is required";
      if (!formData.location) newErrors.location = "Location is required";
      if (!formData.source) newErrors.source = "Source is required";
      if (!formData.gender) newErrors.gender = "Gender is required";
      if (!formData.age) newErrors.age = "Age is required";
      if (formData.experience === "Yes") {
        if (!formData.years) newErrors.years = "Years required";
        if (!formData.skills) newErrors.skills = "Skills required";
      }
    } else if (step === 2) {
      if (!formData.education) newErrors.education = "Education is required";
      if (!formData.conversationLevel)
        newErrors.conversationLevel = "Conversation level is required";
      if (formData.callReminderDate) {
        const today = new Date();
        const reminderDate = new Date(formData.callReminderDate);
        if (reminderDate < today.setHours(0, 0, 0, 0)) {
          newErrors.callReminderDate = "Reminder date cannot be in the past";
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep()) setStep(step + 1);
  };
  const prevStep = () => setStep(step - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep()) return;

    try {
      const dataToSave = {
        ...formData,
        commentDateTime: formData.comment
          ? new Date().toISOString()
          : "", // save comment timestamp if comment exists
      };
      await firebaseDB.child("WorkerCallData").push(dataToSave);

      setShowSuccessModal(true);
      // ✅ Reset form after submit
      setFormData({
        mobileNo: "",
        name: "",
        location: "",
        source: "",
        gender: "",
        maritalStatus: "",
        age: "",
        experience: "No",
        years: "",
        skills: "",
        homeCareSkills: [],
        otherSkills: [],
        languages: [],
        education: "",
        workingHours: "",
        conversationLevel: "",
        callReminderDate: "",
        comment: "",
        commentDateTime: "",
      });
      setStep(1);
    } catch (err) {
      console.error("Error saving Worker:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Main Modal */}
      <div
        className="modal fade show"
        style={{ display: "block", backgroundColor: "rgba(0,0,0,0.6)" }}
      >
        <div className="modal-dialog modal-lg modal-dialog-centered client-form">
          <div className="modal-content shadow-lg border-0 rounded-4">
            <div className="modal-header">
              <h3 className="modal-title">Worker Call Form</h3>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
              ></button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                {/* Step 1: Basic Details */}
                {step === 1 && (
                  <div>
                    <h5 className="mb-3">Basic Details</h5>
                    <hr />
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">Mobile No <span class="star">*</span></label>
                        <input
                          type="tel"
                          name="mobileNo"
                          value={formData.mobileNo}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`form-control ${
                            errors.mobileNo ? "is-invalid" : ""
                          }`}
                          maxLength={10}
                        />
                        {errors.mobileNo && (
                          <div className="invalid-feedback">{errors.mobileNo}</div>
                        )}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Name <span class="star">*</span></label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`form-control ${
                            errors.name ? "is-invalid" : ""
                          }`}
                        />
                        {errors.name && (
                          <div className="invalid-feedback">{errors.name}</div>
                        )}
                      </div>
                    </div>

                    {/* Location + Source */}
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">From / Location <span class="star">*</span></label>
                        <input
                          type="text"
                          name="location"
                          value={formData.location}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`form-control ${
                            errors.location ? "is-invalid" : ""
                          }`}
                        />
                        {errors.location && (
                          <div className="invalid-feedback">{errors.location}</div>
                        )}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Source <span class="star">*</span></label>
                        <select
                          name="source"
                          value={formData.source}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`form-select ${
                            errors.source ? "is-invalid" : ""
                          }`}
                        >
                          <option value="">Select</option>
                          {[
                            "Apana",
                            "WorkerIndian",
                            "Reference",
                            "Poster",
                            "Agent",
                            "Facebook",
                            "LinkedIn",
                            "Instagram",
                            "YouTube",
                            "Website",
                            "Just Dail",
                            "News Paper",
                          ].map((src) => (
                            <option key={src} value={src}>
                              {src}
                            </option>
                          ))}
                        </select>
                        {errors.source && (
                          <div className="invalid-feedback">{errors.source}</div>
                        )}
                      </div>
                    </div>

                    {/* Gender + Marital Status + Age */}
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">Gender <span class="star">*</span></label>
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`form-select ${
                            errors.gender ? "is-invalid" : ""
                          }`}
                        >
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Others">Others</option>
                        </select>
                        {errors.gender && (
                          <div className="invalid-feedback">{errors.gender}</div>
                        )}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Marital Status</label>
                        <select
                          name="maritalStatus"
                          value={formData.maritalStatus}
                          onChange={handleChange}
                          className="form-select"
                        >
                          <option value="">Select</option>
                          <option value="Married">Married</option>
                          <option value="Un Married">Un Married</option>
                          <option value="Single">Single</option>
                          <option value="Widow">Widow</option>
                        </select>
                      </div>
                    </div>

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">Age <span class="star">*</span></label>
                        <input
                          type="number"
                          name="age"
                          value={formData.age}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`form-control ${
                            errors.age ? "is-invalid" : ""
                          }`}
                        />
                        {errors.age && (
                          <div className="invalid-feedback">{errors.age}</div>
                        )}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Experience <span class="star">*</span></label>
                        <div>
                          <div className="form-check form-check-inline">
                            <input
                              type="radio"
                              name="experience"
                              value="Yes"
                              checked={formData.experience === "Yes"}
                              onChange={handleChange}
                            />
                            <label className="form-check-label">Yes</label>
                          </div>
                          <div className="form-check form-check-inline">
                            <input
                              type="radio"
                              name="experience"
                              value="No"
                              checked={formData.experience === "No"}
                              onChange={handleChange}
                            />
                            <label className="form-check-label">No</label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {formData.experience === "Yes" && (
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <label className="form-label">Years</label>
                          <input
                            type="text"
                            name="years"
                            value={formData.years}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={`form-control ${
                              errors.years ? "is-invalid" : ""
                            }`}
                          />
                          {errors.years && (
                            <div className="invalid-feedback">{errors.years}</div>
                          )}
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Skills</label>
                          <input
                            type="text"
                            name="skills"
                            value={formData.skills}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={`form-control ${
                              errors.skills ? "is-invalid" : ""
                            }`}
                          />
                          {errors.skills && (
                            <div className="invalid-feedback">{errors.skills}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: Skills Details */}
                {step === 2 && (
                  <div>
                    <h4 className="mb-3">Skills Details</h4>
                    <hr />
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">
                          <strong>Home Care Skills</strong>
                        </label>
                        {[
                          "Nursing",
                          "Patient Care",
                          "Care Taker",
                          "Old Age Care",
                          "Baby Care",
                          "Bedside Attender",
                          "Supporting",
                          "Maid",
                          "Cook",
                          "House Keeper",
                          "Chauffeur",
                          "Cleaner",
                          "Compounder",
                        ].map((skill) => (
                          <div className="form-check" key={skill}>
                            <input
                              type="checkbox"
                              className="form-check-input"
                              name="homeCareSkills"
                              value={skill}
                              checked={formData.homeCareSkills.includes(skill)}
                              onChange={handleChange}
                            />
                            <label className="form-check-label">{skill}</label>
                          </div>
                        ))}
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">
                          <strong>Other Skills</strong>
                        </label>
                        {[
                          "Computer Operating",
                          "Tele Calling",
                          "Driving",
                          "Supervisor",
                          "Manager",
                          "Attender",
                          "Security",
                          "Carpenter",
                          "Painter",
                          "Plumber",
                          "Electrician",
                          "Mason (Home maker)",
                          "Tailor",
                          "Labour",
                          "Farmer",
                          "Delivery Boy",
                        ].map((skill) => (
                          <div className="form-check" key={skill}>
                            <input
                              type="checkbox"
                              className="form-check-input"
                              name="otherSkills"
                              value={skill}
                              checked={formData.otherSkills.includes(skill)}
                              onChange={handleChange}
                            />
                            <label className="form-check-label">{skill}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <hr />

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">Education<span class="star">*</span></label>
                        <input
                          type="text"
                          name="education"
                          value={formData.education}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`form-control ${
                            errors.education ? "is-invalid" : ""
                          }`}
                        />
                        {errors.education && (
                          <div className="invalid-feedback">{errors.education}</div>
                        )}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Working Hours</label>
                        <div>
                          <div className="form-check form-check-inline">
                            <input
                              type="radio"
                              name="workingHours"
                              value="12"
                              checked={formData.workingHours === "12"}
                              onChange={handleChange}
                            />
                           
                            <label className="form-check-label"> &nbsp;&nbsp;12 Hours</label>
                          </div>
                          <div className="form-check form-check-inline">
                            <input
                              type="radio"
                              name="workingHours"
                              value="24"
                              checked={formData.workingHours === "24"}
                              onChange={handleChange}
                            />
                            <label className="form-check-label">&nbsp;&nbsp;24 Hours</label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Languages */}
                    <div className="mb-3">
                      <p className="form-label">
                        <strong>Languages Known</strong>
                      </p>
                      {[
                        "Telugu",
                        "Hindi",
                        "English",
                        "Urdu",
                        "Kannada",
                        "Malayalam",
                        "Tamil",
                        "Oriya",
                        "Bengali",
                        "Marathi",
                      ].map((lang) => (
                        <div className="form-check form-check-inline" key={lang}>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            name="languages"
                            value={lang}
                            checked={formData.languages.includes(lang)}
                            onChange={handleChange}
                          />
                          <label className="form-check-label">{lang}</label>
                        </div>
                      ))}
                    </div>

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">Conversation Level<span class="star">*</span></label>
                        <select
                          name="conversationLevel"
                          value={formData.conversationLevel}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`form-select ${
                            errors.conversationLevel ? "is-invalid" : ""
                          }`}
                        >
                          <option value="">Select</option>
                          <option value="Very Good">Very Good</option>
                          <option value="Good">Good</option>
                          <option value="Average">Average</option>
                          <option value="Below Average">Below Average</option>
                          <option value="Bad">Bad</option>
                          <option value="Very Bad">Very Bad</option>
                        </select>
                        {errors.conversationLevel && (
                          <div className="invalid-feedback">
                            {errors.conversationLevel}
                          </div>
                        )}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Call Reminder Date</label>
                        <div className="input-group">
                          <input
                            type="date"
                            name="callReminderDate"
                            value={formData.callReminderDate}
                            onChange={handleChange}
                            className={`form-control ${
                              errors.callReminderDate ? "is-invalid" : ""
                            }`}
                            min={new Date().toISOString().split("T")[0]}
                          />
                          {formData.callReminderDate && (
                            <button
                              type="button"
                              className="btn btn-outline-secondary mb-0"
                              onClick={() =>
                                setFormData({ ...formData, callReminderDate: "" })
                              }
                            >
                              ×
                            </button>
                          )}
                          {errors.callReminderDate && (
                            <div className="invalid-feedback d-block">
                              {errors.callReminderDate}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Comment</label>
                      <textarea
                        name="comment"
                        value={formData.comment}
                        onChange={handleChange}
                        className="form-control"
                        rows="3"
                      ></textarea>
                    </div>
                  </div>
                )}

                <div className="card-footer d-flex justify-content-end w-100">
                  {step > 1 && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={prevStep}
                    >
                      Previous
                    </button>
                  )}
                  {step < 2 && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={nextStep}
                    >
                      Next
                    </button>
                  )}
                  {step === 2 && (
                    <button type="submit" className="btn btn-success">
                      Submit
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Success Modal */}
      <SuccessModal
        show={showSuccessModal}
        title="Worker Added Successfully"
        message={`Worker Name: ${formData.name}`}
        onClose={() => {
          setShowSuccessModal(false);
          onClose();
        }}
      />
    </>
  );
}
