// src/components/workerCalles/WorkerCalleForm.jsx
import React, { useState, useEffect } from "react";
import firebaseDB from "../../firebase";
import SuccessModal from "../common/SuccessModal";
import { useAuth } from "../../context/AuthContext";

export default function WorkerCallForm({ isOpen, onClose }) {
  const { user: currentUser } = useAuth(); // <- GLOBAL AUTH (has dbId, name, email, role, etc.)

  const [step, setStep] = useState(1);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [existingWorker, setExistingWorker] = useState(null);
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    callId: "",
    callDate: today(),
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

    // 🔗 GLOBAL AUTH FIELDS (no local auth)
    createdById: "", // <-- global Users/<dbId>
    createdByName: "", // convenience label
    createdAt: "", // ISO

    // keep legacy aliases (optional; helps old views/exports)
    addedBy: "",
    userName: "",
    joiningType: "",
    expectedSalary: "",
  });

  function today() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  const hasUnsavedChanges = () => {
    const base = {
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
      oiningType: "",
      expectedSalary: "",
    };
    for (const k in base) if (formData[k] !== base[k]) return true;
    return false;
  };

  const fetchNextCallId = async () => {
    try {
      const snap = await firebaseDB.child("WorkerCallData").once("value");
      let maxN = 0;
      if (snap.exists()) {
        snap.forEach((child) => {
          const id = (child.val()?.callId || "").trim();
          const m = /^WC-(\d+)$/.exec(id);
          if (m) maxN = Math.max(maxN, parseInt(m[1], 10) || 0);
        });
      }
      return `WC-${String(maxN + 1).padStart(2, "0")}`;
    } catch {
      return "WC-01";
    }
  };

  // Prefill IDs/dates + creator from GLOBAL AUTH
  useEffect(() => {
    let alive = true;
    const init = async () => {
      if (!isOpen) return;
      const nextId = await fetchNextCallId();
      if (!alive) return;

      const createdById = currentUser?.dbId || ""; // <- global Users/<dbId>
      const createdByName =
        currentUser?.name ||
        currentUser?.username ||
        currentUser?.email?.split("@")[0] ||
        "Unknown";

      setFormData((p) => ({
        ...p,
        callId: nextId,
        callDate: p.callDate || today(),
        createdById,
        createdByName,
        createdAt: new Date().toISOString(),
        // legacy aliases for compatibility
        addedBy: createdByName,
        userName: createdByName,
      }));
    };
    init();
    return () => {
      alive = false;
    };
  }, [isOpen, currentUser]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      const arr = Array.isArray(formData[name]) ? formData[name] : [];
      setFormData({
        ...formData,
        [name]: checked ? [...arr, value] : arr.filter((x) => x !== value),
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
  };

  const validateStep = () => {
    const err = {};
    if (step === 1) {
      if (!formData.callId) err.callId = "Call ID is required";
      if (!formData.callDate) err.callDate = "Call Date is required";
      if (!formData.mobileNo) err.mobileNo = "Mobile No is required";
      else if (!/^\d{10}$/.test(formData.mobileNo))
        err.mobileNo = "Mobile No must be 10 digits";
      if (!formData.name) err.name = "Name is required";
      if (!formData.location) err.location = "Location is required";
      if (!formData.source) err.source = "Source is required";
      if (!formData.gender) err.gender = "Gender is required";
      if (!formData.age) err.age = "Age is required";
      if (formData.experience === "Yes") {
        if (!formData.years) err.years = "Years required";
        if (!formData.skills) err.skills = "Skills required";
      }
    } else if (step === 2) {
      if (!formData.education) err.education = "Education is required";
      if (!formData.conversationLevel)
        err.conversationLevel = "Conversation level is required";
      if (formData.callReminderDate) {
        const d = new Date(formData.callReminderDate);
        if (d < new Date().setHours(0, 0, 0, 0))
          err.callReminderDate = "Reminder date cannot be in the past";
      }
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const checkDuplicateMobile = async (mobileNo) => {
    try {
      const snap = await firebaseDB
        .child("WorkerCallData")
        .orderByChild("mobileNo")
        .equalTo(mobileNo)
        .once("value");
      return snap.exists() ? snap.val() : null;
    } catch {
      return null;
    }
  };

  const dupiliCateNo = async () => {
    if (step === 1) {
      const dup = await checkDuplicateMobile(formData.mobileNo);
      if (dup) {
        const existing = Object.values(dup)[0];
        setExistingWorker(existing);
        setShowDuplicateModal(true);
        return;
      }
    }

  }
  const nextStep = async () => {
    if (!validateStep()) return;
    dupiliCateNo()

    setStep((s) => s + 1);
  };


  const prevStep = () => setStep((s) => s - 1);

  const resetForm = () => {
    setFormData({
      callId: "",
      callDate: today(),
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
      createdById: "",
      createdByName: "",
      createdAt: "",
      addedBy: "",
      userName: "",
      formComment: "",
      joiningType: "",
      expectedSalary: "",
    });
    setStep(1);
    setErrors({});
  };

  const handleCloseClick = () =>
    hasUnsavedChanges() ? setShowCloseConfirmModal(true) : onClose();
  const confirmClose = () => {
    setShowCloseConfirmModal(false);
    resetForm();
    onClose();
  };
  const cancelClose = () => setShowCloseConfirmModal(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep()) return;

    // final duplicate check
    const dup = await checkDuplicateMobile(formData.mobileNo);
    if (dup) {
      const existing = Object.values(dup)[0];
      setExistingWorker(existing);
      setShowDuplicateModal(true);
      return;
    }

    // ensure GLOBAL creator fields
    const createdById = currentUser?.dbId || "";
    const createdByName =
      currentUser?.name ||
      currentUser?.username ||
      currentUser?.email?.split("@")[0] ||
      "Unknown";

    const payload = {
      ...formData,
      createdById,
      createdByName,
      createdAt: formData.createdAt || new Date().toISOString(),
      // legacy aliases
      addedBy: formData.addedBy || createdByName,
      userName: formData.userName || createdByName,
      commentDateTime: formData.comment ? new Date().toISOString() : "",
    };

    try {
      await firebaseDB.child("WorkerCallData").push(payload);
      setShowSuccessModal(true);
    } catch (err) {
      console.error("Error saving Worker:", err);
      alert("Error saving worker call. Please try again.");
    }
  };

  if (!isOpen) return null;

  // --- Helper functions (inside component for ESLint/local scope) ---
  const getToday = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // Toggle array field helper used by pill buttons (skills)
  const toggleArrayField = (field, value) => {
    setFormData((prev) => {
      const current = Array.isArray(prev[field]) ? prev[field] : [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  };

  return (
    <>
      {/* Main Modal */}
      <div
        className="modal fade show"
        style={{ display: "block", backgroundColor: "rgba(0,0,0,1)" }}
      >
        <div className="modal-dialog modal-lg modal-dialog-centered client-form workerCallForm">
          <div className="modal-content shadow-lg border-0 rounded-4">
            <div className="modal-header">
              <h3 className="modal-title">Worker Call Form</h3>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={handleCloseClick}
              ></button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                {/* Step 1: Basic Details */}
                {step === 1 && (
                  <div>
                    <h5 className="mb-3">Basic Details</h5>
                    <hr />

                    {/* Call ID + Date */}
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">
                          Call ID <span className="star">*</span>
                        </label>
                        <input
                          type="text"
                          name="callId"
                          value={formData.callId}
                          className={`form-control ${errors.callId ? "is-invalid" : ""
                            }`}
                          disabled
                          readOnly
                          style={{ backgroundColor: "transparent" }}
                        />
                        {errors.callId && (
                          <div className="invalid-feedback">
                            {errors.callId}
                          </div>
                        )}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">
                          Date <span className="star">*</span>
                        </label>
                        <input
                          type="date"
                          name="callDate"
                          value={formData.callDate}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`form-control ${errors.callDate ? "is-invalid" : ""
                            }`}
                          max={getToday()}
                          disabled
                        />
                        {errors.callDate && (
                          <div className="invalid-feedback">
                            {errors.callDate}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">
                          Mobile No <span className="star">*</span>
                        </label>
                        <input
                          type="tel"
                          name="mobileNo"
                          value={formData.mobileNo}
                          onChange={handleChange}
                          onBlur={dupiliCateNo}
                          className={`form-control ${errors.mobileNo ? "is-invalid" : ""
                            }`}
                          maxLength={10}
                          autoFocus
                        />
                        {errors.mobileNo && (
                          <div className="invalid-feedback">
                            {errors.mobileNo}
                          </div>
                        )}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">
                          Name <span className="star">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`form-control ${errors.name ? "is-invalid" : ""
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
                        <label className="form-label">
                          From / Location <span className="star">*</span>
                        </label>
                        <input
                          type="text"
                          name="location"
                          value={formData.location}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`form-control ${errors.location ? "is-invalid" : ""
                            }`}
                        />
                        {errors.location && (
                          <div className="invalid-feedback">
                            {errors.location}
                          </div>
                        )}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">
                          Source <span className="star">*</span>
                        </label>
                        <select
                          name="source"
                          value={formData.source}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`form-select ${errors.source ? "is-invalid" : ""
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
                          <div className="invalid-feedback">
                            {errors.source}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Gender + Marital Status + Age */}
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">
                          Gender <span className="star">*</span>
                        </label>
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`form-select ${errors.gender ? "is-invalid" : ""
                            }`}
                        >
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Others">Others</option>
                        </select>
                        {errors.gender && (
                          <div className="invalid-feedback">
                            {errors.gender}
                          </div>
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
                        <label className="form-label">
                          Age <span className="star">*</span>
                        </label>
                        <input
                          type="number"
                          name="age"
                          value={formData.age}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`form-control ${errors.age ? "is-invalid" : ""
                            }`}
                        />
                        {errors.age && (
                          <div className="invalid-feedback">{errors.age}</div>
                        )}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">
                          Experience <span className="star">*</span>
                        </label>
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
                            className={`form-control ${errors.years ? "is-invalid" : ""
                              }`}
                          />
                          {errors.years && (
                            <div className="invalid-feedback">
                              {errors.years}
                            </div>
                          )}
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Primary Skills</label>
                          <select
                            name="skills"
                            value={formData.skills}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={`form-select ${errors.skills ? "is-invalid" : ""
                              }`}
                          >
                            <option value="">-- Select Skill --</option>
                            {[
                              "Nursing",
                              "Patient Care",
                              "Care Taker",
                              "Bedside Attender",
                              "Old Age Care",
                              "Baby Care",
                              "Supporting",
                              "Cook",
                              "Housekeeping",
                              "Diaper",
                              "Injection",
                              "BP Check",
                              "Sugar Check",
                              "Wound Dressing",
                              "Nebulization",
                              "Post-Operative Care",
                              "Any Duty",
                            ].map((skill) => (
                              <option key={skill} value={skill}>
                                {skill}
                              </option>
                            ))}
                          </select>
                          {errors.skills && (
                            <div className="invalid-feedback">
                              {errors.skills}
                            </div>
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

                    <div className="row g-3  ">
                      {/* Home Care Skills */}
                      <div className="col-md-12">
                        <div className="p-3 bg-dark rounded-3 h-100">
                          <h6 className="mb-2 text-warning">
                            HOME CARES SKILLS
                          </h6>
                          <div className="d-flex flex-wrap gap-2 justify-content-center">
                            {[
                              "Nursing",
                              "Patient Care",
                              "Care Taker",
                              "Bedside Attender",
                              "Old Age Care",
                              "Baby Care",
                              "Supporting",
                              "Cook",
                              "Housekeeping",
                              "Diaper",
                              "Injection",
                              "BP Check",
                              "Sugar Check",
                              "Wound Dressing",
                              "Nebulization",
                              "Post-Operative Care",
                              "Any Duty",
                            ].map((skill) => {
                              const active =
                                formData.homeCareSkills.includes(skill);
                              return (
                                <button
                                  type="button"
                                  key={skill}
                                  className={`btn btn-sm ${active
                                    ? "btn-warning"
                                    : "btn-outline-warning"
                                    } rounded-pill skill-pill`}
                                  onClick={() =>
                                    toggleArrayField("homeCareSkills", skill)
                                  }
                                >
                                  {skill}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <hr />

                      {/* Other Skills */}
                      <div className="col-md-12 mt-0">
                        <div className="d-flex flex-column">
                          {/* Office & Administrative */}
                          <div className="category-section bg-dark rounded-3">
                            <h6 className="category-heading text-primary mb-2">
                              Office & Administrative
                            </h6>
                            <div className="d-flex flex-wrap gap-2">
                              {[
                                "Computer Operating",
                                "Data Entry",
                                "Office Assistant",
                                "Receptionist",
                                "Front Desk Executive",
                                "Admin Assistant",
                                "Office Boy",
                                "Peon",
                                "Office Attendant",
                              ].map((skill) => {
                                const active =
                                  formData.otherSkills.includes(skill);
                                return (
                                  <button
                                    type="button"
                                    key={skill}
                                    className={`btn btn-sm ${active
                                      ? "btn-primary"
                                      : "btn-outline-primary"
                                      } rounded-pill skill-pill`}
                                    onClick={() =>
                                      toggleArrayField("otherSkills", skill)
                                    }
                                  >
                                    {skill}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <hr />

                          {/* Customer Service & Telecommunication */}
                          <div className="category-section bg-dark rounded-3">
                            <h6 className="category-heading text-success mb-2">
                              Customer Service & Telecommunication
                            </h6>
                            <div className="d-flex flex-wrap gap-2">
                              {[
                                "Tele Calling",
                                "Customer Support",
                                "Telemarketing",
                                "BPO Executive",
                                "Call Center Agent",
                                "Customer Care Executive",
                              ].map((skill) => {
                                const active =
                                  formData.otherSkills.includes(skill);
                                return (
                                  <button
                                    type="button"
                                    key={skill}
                                    className={`btn btn-sm ${active
                                      ? "btn-success"
                                      : "btn-outline-success"
                                      } rounded-pill skill-pill`}
                                    onClick={() =>
                                      toggleArrayField("otherSkills", skill)
                                    }
                                  >
                                    {skill}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <hr />

                          {/* Management & Supervision */}
                          <div className="category-section bg-dark rounded-3">
                            <h6 className="category-heading text-warning mb-2">
                              Management & Supervision
                            </h6>
                            <div className="d-flex flex-wrap gap-2">
                              {[
                                "Supervisor",
                                "Manager",
                                "Team Leader",
                                "Site Supervisor",
                                "Project Coordinator",
                              ].map((skill) => {
                                const active =
                                  formData.otherSkills.includes(skill);
                                return (
                                  <button
                                    type="button"
                                    key={skill}
                                    className={`btn btn-sm ${active
                                      ? "btn-warning text-dark"
                                      : "btn-outline-warning"
                                      } rounded-pill skill-pill`}
                                    onClick={() =>
                                      toggleArrayField("otherSkills", skill)
                                    }
                                  >
                                    {skill}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <hr />

                          {/* Security */}
                          <div className="category-section bg-dark rounded-3">
                            <h6 className="category-heading text-danger mb-2">
                              Security
                            </h6>
                            <div className="d-flex flex-wrap gap-2">
                              {[
                                "Security Guard",
                                "Security Supervisor",
                                "Gatekeeper",
                                "Watchman",
                              ].map((skill) => {
                                const active =
                                  formData.otherSkills.includes(skill);
                                return (
                                  <button
                                    type="button"
                                    key={skill}
                                    className={`btn btn-sm ${active
                                      ? "btn-danger"
                                      : "btn-outline-danger"
                                      } rounded-pill skill-pill`}
                                    onClick={() =>
                                      toggleArrayField("otherSkills", skill)
                                    }
                                  >
                                    {skill}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <hr />

                          {/* Driving & Logistics */}
                          <div className="category-section bg-dark rounded-3">
                            <h6 className="category-heading text-info mb-2">
                              Driving & Logistics
                            </h6>
                            <div className="d-flex flex-wrap gap-2">
                              {[
                                "Driving",
                                "Delivery Boy",
                                "Delivery Executive",
                                "Rider",
                                "Driver",
                                "Car Driver",
                                "Bike Rider",
                                "Logistics Helper",
                              ].map((skill) => {
                                const active =
                                  formData.otherSkills.includes(skill);
                                return (
                                  <button
                                    type="button"
                                    key={skill}
                                    className={`btn btn-sm ${active
                                      ? "btn-info text-dark"
                                      : "btn-outline-info"
                                      } rounded-pill skill-pill`}
                                    onClick={() =>
                                      toggleArrayField("otherSkills", skill)
                                    }
                                  >
                                    {skill}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <hr />

                          {/* Technical & Maintenance */}
                          <div className="category-section bg-dark rounded-3">
                            <h6 className="category-heading text-secondary mb-2">
                              Technical & Maintenance
                            </h6>
                            <div className="d-flex flex-wrap gap-2">
                              {[
                                "Electrician",
                                "Plumber",
                                "Carpenter",
                                "Painter",
                                "Mason",
                                "AC Technician",
                                "Mechanic",
                                "Maintenance Staff",
                                "House Keeping",
                                "Housekeeping Supervisor",
                              ].map((skill) => {
                                const active =
                                  formData.otherSkills.includes(skill);
                                return (
                                  <button
                                    type="button"
                                    key={skill}
                                    className={`btn btn-sm ${active
                                      ? "btn-secondary"
                                      : "btn-outline-secondary"
                                      } rounded-pill skill-pill`}
                                    onClick={() =>
                                      toggleArrayField("otherSkills", skill)
                                    }
                                  >
                                    {skill}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <hr />
                          {/* Industrial & Labor */}
                          <div className="category-section bg-dark rounded-3">
                            <h6 className="category-heading text-danger mb-2">
                              Industrial & Labor
                            </h6>
                            <div className="d-flex flex-wrap gap-2">
                              {[
                                "Labour",
                                "Helper",
                                "Loading Unloading",
                                "Warehouse Helper",
                                "Factory Worker",
                                "Production Helper",
                                "Packaging Staff",
                              ].map((skill) => {
                                const active =
                                  formData.otherSkills.includes(skill);
                                return (
                                  <button
                                    type="button"
                                    key={skill}
                                    className={`btn btn-sm ${active
                                      ? "btn-danger"
                                      : "btn-outline-danger"
                                      } rounded-pill skill-pill`}
                                    onClick={() =>
                                      toggleArrayField("otherSkills", skill)
                                    }
                                  >
                                    {skill}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <hr></hr>

                          {/* Retail & Sales */}
                          <div className="category-section bg-dark rounded-3">
                            <h6 className="category-heading text-primary mb-2">
                              Retail & Sales
                            </h6>
                            <div className="d-flex flex-wrap gap-2">
                              {[
                                "Sales Boy",
                                "Sales Girl",
                                "Store Helper",
                                "Retail Assistant",
                                "Shop Attendant",
                              ].map((skill) => {
                                const active =
                                  formData.otherSkills.includes(skill);
                                return (
                                  <button
                                    type="button"
                                    key={skill}
                                    className={`btn btn-sm ${active
                                      ? "btn-primary"
                                      : "btn-outline-primary"
                                      } rounded-pill skill-pill`}
                                    onClick={() =>
                                      toggleArrayField("otherSkills", skill)
                                    }
                                  >
                                    {skill}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <hr />

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">
                          Education<span className="star">*</span>
                        </label>
                        <input
                          type="text"
                          name="education"
                          value={formData.education}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`form-control ${errors.education ? "is-invalid" : ""
                            }`}
                        />
                        {errors.education && (
                          <div className="invalid-feedback">
                            {errors.education}
                          </div>
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
                            <label className="form-check-label">
                              &nbsp;&nbsp;12 Hours
                            </label>
                          </div>
                          <div className="form-check form-check-inline">
                            <input
                              type="radio"
                              name="workingHours"
                              value="24"
                              checked={formData.workingHours === "24"}
                              onChange={handleChange}
                            />
                            <label className="form-check-label">
                              &nbsp;&nbsp;24 Hours
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Languages */}
                    <div className="mb-3 category-section bg-dark rounded-3">
                      <p className="form-label text-warning">
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
                        <div
                          className="form-check form-check-inline"
                          key={lang}
                        >
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
                        <label className="form-label">Joining Type</label>
                        <select
                          name="joiningType"
                          value={formData.joiningType}
                          onChange={handleChange}
                          className="form-select"
                        >
                          <option value="">Select Joining Type</option>
                          <option value="Immediate">Immediate</option>
                          <option value="1 Week">1 Week</option>
                          <option value="15 Days">15 Days</option>
                          <option value="Flexible">Flexible</option>
                          <option value="Negotiable">Negotiable</option>
                        </select>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Expected Salary</label>

                        <input
                          type="tel"
                          name="expectedSalary"
                          value={formData.expectedSalary}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`form-control`}
                          maxLength={5}
                        />
                      </div>
                    </div>

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">
                          Conversation Level<span className="star">*</span>
                        </label>
                        <select
                          name="conversationLevel"
                          value={formData.conversationLevel}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`form-select ${errors.conversationLevel ? "is-invalid" : ""
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
                            className={`form-control ${errors.callReminderDate ? "is-invalid" : ""
                              }`}
                            min={getToday()}
                          />
                          {formData.callReminderDate && (
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  callReminderDate: "",
                                }))
                              }
                            >
                              Clear
                            </button>
                          )}
                          {errors.callReminderDate && (
                            <div className="invalid-feedback d-block">
                              {errors.callReminderDate}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="col-md-12">
                        <label className="form-label mt-2">
                          Add Comment <span className="star">*</span>
                        </label>
                        <textarea
                          className="form-control border-secondary "
                          name="formComment"
                          value={formData.formComment}
                          onChange={handleChange}
                        ></textarea>
                      </div>
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
                      className="btn btn-info"
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
                {/* Hidden Fields */}
                <input type="hidden" name="addedBy" value={formData.addedBy} />
                <input
                  type="hidden"
                  name="addedByUid"
                  value={formData.addedByUid}
                />
                <input
                  type="hidden"
                  name="createdBy"
                  value={formData.createdBy}
                />
                <input
                  type="hidden"
                  name="createdByName"
                  value={formData.createdByName}
                />
                <input
                  type="hidden"
                  name="userName"
                  value={formData.userName}
                />
                <input
                  type="hidden"
                  name="timestamp"
                  value={formData.timestamp}
                />
                <div></div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        show={showSuccessModal}
        title="Worker Added Successfully"
        message={`Worker Name: ${formData.name}, Mobile: ${formData.mobileNo}`}
        onClose={() => {
          setShowSuccessModal(false);
          resetForm();
          onClose();
        }}
      />

      {/* Duplicate Modal */}
      {showDuplicateModal && existingWorker && (
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.6)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">Duplicate Mobile Number</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDuplicateModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>This mobile number already exists in our system:</p>
                <p className="text-danger">
                  <strong>ID:</strong> {existingWorker.callId}
                </p>
                <p>
                  <strong>Name:</strong> {existingWorker.name}
                </p>
                <p className="text-danger">
                  <strong>Mobile:</strong> {existingWorker.mobileNo}
                </p>
                <p>
                  <strong>Location:</strong> {existingWorker.location}
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDuplicateModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Close Confirmation Modal */}
      {showCloseConfirmModal && (
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.6)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-warning">
                <h5 className="modal-title">Unsaved Changes</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={cancelClose}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  You have unsaved changes. Are you sure you want to close the
                  form? All changes will be lost.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={cancelClose}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-warning"
                  onClick={confirmClose}
                >
                  Yes, Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subtle animation for skill pills */}
      <style>{`
        .skill-pill {
          transition: transform .12s ease, box-shadow .12s ease;
        }
        .skill-pill:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        }
      `}</style>
    </>
  );
}
