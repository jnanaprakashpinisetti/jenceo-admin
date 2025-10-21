// src/components/workerCalles/WorkerCallModal.jsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import firebaseDB from "../../firebase";
import { useAuth } from "../../context/AuthContext";

/** Resolve a nice display name for a user id from the global Users node */
const pickUserName = (u) => {
  if (!u) return "";
  return (
    u.name ||
    u.displayName ||
    u.username ||
    (u.email ? u.email.replace(/@.*/, "") : "") ||
    ""
  );
};

const normalizeArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === "string") {
    return val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

const parseDate = (dLike) => {
  if (dLike instanceof Date) return dLike;
  if (typeof dLike === "number") return new Date(dLike);
  return new Date(String(dLike));
};

const formatDateTime = (dLike) => {
  const d = parseDate(dLike);
  if (Number.isNaN(d.getTime())) return "—";
  return (
    d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) +
    " " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true })
  );
};

export default function WorkerCallModal({
  worker,
  isOpen,
  onClose,
  isEditMode,
}) {
  const { user: authUser } = useAuth();

  // Global Users map (no local auth)
  const [usersMap, setUsersMap] = useState({});
  useEffect(() => {
    const ref = firebaseDB.child("Users");
    const cb = ref.on("value", (snap) => setUsersMap(snap.val() || {}));
    return () => ref.off("value", cb);
  }, []);

  const currentUserId = authUser?.dbId || authUser?.uid || authUser?.id || null;
  const currentUserName =
    (currentUserId && pickUserName(usersMap[currentUserId])) ||
    authUser?.displayName ||
    (authUser?.email ? authUser.email.replace(/@.*/, "") : "") ||
    "user";

  // Distinct option catalogs
  const primarySkillOptions = [
    "Nursing", "Patient Care", "Care Taker", "Bedside Attender", "Old Age Care",
    "Baby Care", "Supporting", "Cook", "Housekeeping", "Diaper", "Injection",
    "BP Check", "Sugar Check", "Wound Dressing", "Nebulization", "Post-Operative Care", "Any Duty"
  ];

  const homeCareSkillOptions = [
    "Nursing", "Patient Care", "Care Taker", "Bedside Attender", "Old Age Care",
    "Baby Care", "Supporting", "Cook", "Housekeeping", "Diaper", "Injection",
    "BP Check", "Sugar Check", "Wound Dressing", "Nebulization", "Post-Operative Care", "Any Duty"
  ];

  const otherSkillOptions = [
    "Computer Operating", "Data Entry", "Office Assistant", "Receptionist", "Front Desk Executive",
    "Admin Assistant", "Office Boy", "Peon", "Office Attendant", "Tele Calling", "Customer Support",
    "Telemarketing", "BPO Executive", "Call Center Agent", "Customer Care Executive", "Supervisor",
    "Manager", "Team Leader", "Site Supervisor", "Project Coordinator", "Security Guard",
    "Security Supervisor", "Gatekeeper", "Watchman", "Driving", "Delivery Boy", "Delivery Executive",
    "Rider", "Driver", "Car Driver", "Bike Rider", "Logistics Helper", "Electrician", "Plumber",
    "Carpenter", "Painter", "Mason", "AC Technician", "Mechanic", "Maintenance Staff", "House Keeping",
    "Housekeeping Supervisor", "Sales Boy", "Sales Girl", "Store Helper", "Retail Assistant",
    "Shop Attendant", "Labour", "Helper", "Loading Unloading", "Warehouse Helper", "Factory Worker",
    "Production Helper", "Packaging Staff"
  ];

  const languageOptions = [
    "Telugu", "English", "Hindi", "Urdu", "Kannada", "Malayalam", "Tamil", "Bengali", "Marati"
  ];

  const sourceOptions = [
    "Apana", "WorkerIndian", "Reference", "Poster", "Agent", "Facebook", "LinkedIn",
    "Instagram", "YouTube", "Website", "Just Dial", "News Paper", "Other",
  ];

  const [activeTab, setActiveTab] = useState("basic");
  const [localWorker, setLocalWorker] = useState({ ...worker });

  // Canonical comments array; ALWAYS sorted desc by date
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const [languageSearch, setLanguageSearch] = useState("");
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  const languageInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Save remains disabled until a comment is added this session
  const [canSave, setCanSave] = useState(false);

  // Rehydrate when the record changes
  useEffect(() => {
    setLocalWorker({ ...worker });
    const list = Array.isArray(worker?.comments) ? worker.comments.slice() : [];
    list.sort((a, b) => {
      const da = parseDate(a?.date).getTime() || 0;
      const db = parseDate(b?.date).getTime() || 0;
      return db - da; // latest first
    });
    setComments(list);
    setNewComment("");
    setDirty(false);
    setCanSave(false); // locked until a comment is added
  }, [worker?.id]);

  // Click outside dropdown handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        languageInputRef.current &&
        !languageInputRef.current.contains(event.target)
      ) {
        setShowLanguageDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && showLanguageDropdown) {
        setShowLanguageDropdown(false);
        // Optional: Focus back on the input
        if (languageInputRef.current) {
          languageInputRef.current.focus();
        }
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showLanguageDropdown]);

  // Update handleLanguageSelect to close dropdown
  const handleLanguageSelect = useCallback((language) => {
    if (!isEditMode) return;
    setLocalWorker((prev) => {
      const arr = normalizeArray(prev.languages);
      if (arr.some((v) => String(v).toLowerCase() === language.toLowerCase()))
        return prev;
      return { ...prev, languages: [...arr, language] };
    });
    setLanguageSearch("");
    setShowLanguageDropdown(false);
    setDirty(true);

    // Focus back on input after selection
    if (languageInputRef.current) {
      languageInputRef.current.focus();
    }
  }, [isEditMode]);

  // Hooks above any early returns
  const filteredLanguages = useMemo(
    () =>
      languageOptions.filter((lang) =>
        lang.toLowerCase().includes(languageSearch.toLowerCase())
      ),
    [languageSearch]
  );

  if (!isOpen) return null;

  // ====== Handlers ======
  const handleMultiToggle = (field, value) => {
    if (!isEditMode) return;
    setLocalWorker((prev) => {
      const arr = normalizeArray(prev[field]);
      const lower = String(value).toLowerCase();
      const hit = arr.some((v) => String(v).toLowerCase() === lower);
      const next = hit
        ? arr.filter((v) => String(v).toLowerCase() !== lower)
        : [...arr, value];
      return { ...prev, [field]: next };
    });
    setDirty(true);
  };

  const handleAddCustom = (field, inputId) => {
    if (!isEditMode) return;
    const el = document.getElementById(inputId);
    if (!el) return;
    const value = (el.value || "").trim();
    if (!value) return;
    setLocalWorker((prev) => {
      const arr = normalizeArray(prev[field]);
      if (arr.some((v) => String(v).toLowerCase() === value.toLowerCase()))
        return prev;
      return { ...prev, [field]: [...arr, value] };
    });
    el.value = "";
    setDirty(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLocalWorker((prev) => ({ ...prev, [name]: value }));
    setDirty(true);
  };

  /** Save worker details (disabled until a comment is added) */
  const handleSave = async () => {
    if (!canSave) return;
    try {
      const now = Date.now();
      const toSave = {
        ...localWorker,
        skills: normalizeArray(localWorker.skills),
        languages: normalizeArray(localWorker.languages),
        homeCareSkills: normalizeArray(localWorker.homeCareSkills),
        otherSkills: normalizeArray(localWorker.otherSkills),
        updatedAt: now,
        updatedById: currentUserId || localWorker.updatedById || null,
        updatedByName: currentUserName || localWorker.updatedByName || "",
      };

      if (!localWorker.createdAt) {
        toSave.createdAt = localWorker.date || now;
      }
      if (!localWorker.createdById && currentUserId) {
        toSave.createdById = currentUserId;
        toSave.createdByName = currentUserName;
      }

      await firebaseDB.child(`WorkerCallData/${worker.id}`).update(toSave);
      setLocalWorker((prev) => ({ ...prev, ...toSave }));
      setShowSaveModal(true);
      setDirty(false);
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save worker details.");
    }
  };

  /** Add a comment → enables Save; shows at the top; never overwrites history */
  const handleAddComment = async () => {
    if (!isEditMode) return;
    const text = newComment.trim();
    if (!text) return;
    try {
      const entry = {
        text,
        date: new Date().toISOString(),
        userId: currentUserId || null,
        user: currentUserName || "user",
      };

      const updated = [entry, ...comments];
      setComments(updated);
      setNewComment("");

      await firebaseDB.child(`WorkerCallData/${worker.id}/comments`).set(updated);

      setLocalWorker((prev) => ({
        ...prev,
        comments: updated,
        updatedAt: Date.now(),
        updatedById: currentUserId || null,
        updatedByName: currentUserName || ""
      }));

      setCanSave(true);
      setDirty(true);
    } catch (err) {
      console.error("Adding comment failed:", err);
      alert("Failed to add comment.");
    }
  };

  const handleTagRemove = (field, idx) => {
    if (!isEditMode) return;
    setLocalWorker((prev) => {
      const arr = normalizeArray(prev[field]);
      arr.splice(idx, 1);
      return { ...prev, [field]: [...arr] };
    });
    setDirty(true);
  };

  const confirmClose = () => {
    if (dirty) setShowUnsavedConfirm(true);
    else onClose();
  };

  // Action handlers
  const handleCall = () => {
    if (localWorker.mobileNo) {
      window.open(`tel:${localWorker.mobileNo}`);
    }
  };

  const handleWhatsApp = () => {
    if (localWorker.mobileNo) {
      const message = `Hello ${localWorker.name || ''}, I found your contact from Apana Staff.`;
      const encodedMessage = encodeURIComponent(message);
      window.open(`https://wa.me/${localWorker.mobileNo.replace('+', '')}?text=${encodedMessage}`);
    }
  };

  // Created/Updated stamps (global Users)
  const createdByName =
    pickUserName(usersMap[localWorker?.createdById]) ||
    localWorker?.createdByName ||
    "";
  const updatedByName =
    pickUserName(usersMap[localWorker?.updatedById]) ||
    localWorker?.updatedByName ||
    "";

  // Helper function to render info cards for view mode
  const renderInfoCard = (label, value, badgeType = null) => {
    let displayValue = value || "—";
    let badgeClass = "";

    if (badgeType === "gender") {
      badgeClass = value === "Male" ? "badge-gender-male" :
        value === "Female" ? "badge-gender-female" : "badge-gender-other";
    } else if (badgeType === "conversation") {
      badgeClass = value === "Very Good" ? "badge-conv-vgood" :
        value === "Good" ? "badge-conv-good" :
          value === "Average" ? "badge-conv-average" : "badge-conv-poor";
    }

    return (
      <div className="info-card-item">
        <div className="info-card-label">{label}</div>
        <div className={`info-card-value ${badgeClass}`}>
          {badgeClass ? (
            <span className="info-badge">
              {displayValue}
            </span>
          ) : (
            displayValue
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        className="modal fade show dark-modal"
        style={{ display: "block", background: "rgba(0,0,0,0.95)" }}
      >
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div
            className="modal-content border-0"
            style={{
              borderRadius: "8px",
              maxWidth: "900px",
              margin: "auto",
              maxHeight: "90vh"
            }}
          >
            {/* Header */}
            <div
              className="modal-header dark-header"
            >
              <div className="d-flex align-items-center w-100">
                <div className="flex-grow-1">
                  <h5 className="modal-title fw-bold mb-2 text-white">
                    {isEditMode ? "✏️ Edit Worker" : "👤 Worker Details"}
                  </h5>
                  <div className="d-flex flex-wrap align-items-center gap-3 text-white-90 small">
                    <span className="d-flex align-items-center gap-2">
                      <i className="bi bi-person-fill"></i>
                      {localWorker?.name || "—"}
                    </span>
                    <span className="d-flex align-items-center gap-2">
                      <i className="bi bi-telephone-fill"></i>
                      {localWorker?.mobileNo || "—"}
                    </span>
                    <span className="d-flex align-items-center gap-2">
                      <i className="bi bi-geo-alt-fill"></i>
                      {localWorker?.location || "—"}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="d-flex align-items-center gap-2">
                  {localWorker.mobileNo && (
                    <>
                      <button
                        type="button"
                        className="btn btn-success btn-sm d-flex align-items-center gap-2 action-btn"
                        onClick={handleCall}
                        title="Call Worker"
                      >
                        <i className="bi bi-telephone-fill"></i>
                        Call
                      </button>
                      <button
                        type="button"
                        className="btn btn-success btn-sm d-flex align-items-center gap-2 action-btn"
                        onClick={handleWhatsApp}
                        title="WhatsApp Worker"
                        style={{ backgroundColor: '#25D366', borderColor: '#25D366' }}
                      >
                        <i className="bi bi-whatsapp"></i>
                        WhatsApp
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={confirmClose}
                  ></button>
                </div>
              </div>
            </div>

            <div className="modal-body p-0 dark-body">
              {/* Tabs */}
              <div className="dark-tabs-container">
                <div className="container-fluid px-3">
                  <ul className="nav nav-pills nav-justified gap-2 p-2">
                    <li className="nav-item">
                      <button
                        className={`nav-link dark-tab ${activeTab === "basic"
                          ? "active"
                          : ""
                          }`}
                        onClick={() => setActiveTab("basic")}
                      >
                        <i className="bi bi-person-vcard me-2"></i>
                        Basic Info
                      </button>
                    </li>
                    <li className="nav-item">
                      <button
                        className={`nav-link dark-tab ${activeTab === "skills"
                          ? "active"
                          : ""
                          }`}
                        onClick={() => setActiveTab("skills")}
                      >
                        <i className="bi bi-tools me-2"></i>
                        Skills & Languages
                      </button>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="tab-content p-3" style={{ minHeight: "400px", maxHeight: "60vh", overflowY: "auto" }}>
                {/* Basic Info Tab */}
                {activeTab === "basic" && (
                  <div className="fade show">
                    <div className="row g-3">
                      {/* Personal Information */}
                      <div className="col-12">
                        <div className="dark-card">
                          <div className="card-header dark-card-header">
                            <h6 className="mb-0 fw-bold d-flex align-items-center text-warning">
                              <i className="bi bi-person-badge me-2"></i>
                              Personal Information
                            </h6>
                          </div>
                          <div className="card-body p-3">
                            {isEditMode ? (
                              <div className="row g-3">
                                <div className="col-md-4">
                                  <label className="form-label fw-semibold text-secondary">
                                    Mobile Number
                                  </label>
                                  <input
                                    type="text"
                                    name="mobileNo"
                                    value={localWorker.mobileNo || ""}
                                    disabled
                                    className="form-control dark-input"
                                  />
                                </div>

                                <div className="col-md-4">
                                  <label className="form-label fw-semibold text-secondary">
                                    Full Name
                                  </label>
                                  <input
                                    type="text"
                                    name="name"
                                    value={localWorker.name || ""}
                                    onChange={handleChange}
                                    className="form-control dark-input"
                                    placeholder="Enter worker name"
                                  />
                                </div>

                                <div className="col-md-4">
                                  <label className="form-label fw-semibold text-secondary">
                                    Gender
                                  </label>
                                  <select
                                    name="gender"
                                    value={localWorker.gender || ""}
                                    onChange={handleChange}
                                    className="form-select dark-input"
                                  >
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Others">Others</option>
                                  </select>
                                </div>


                                <div className="col-md-4">
                                  <label className="form-label fw-semibold text-secondary">
                                    Age
                                  </label>
                                  <input
                                    type="number"
                                    name="age"
                                    value={localWorker.age || ""}
                                    onChange={handleChange}
                                    className="form-control dark-input text-center"
                                    min="10"
                                    max="80"
                                    placeholder="Age"
                                  />
                                </div>

                                <div className="col-md-4">
                                  <label className="form-label fw-semibold text-secondary">
                                    Education
                                  </label>
                                  <input
                                    type="text"
                                    name="education"
                                    value={localWorker.education || ""}
                                    onChange={handleChange}
                                    className="form-control dark-input"
                                    placeholder="Enter education"
                                  />
                                </div>

                                <div className="col-md-4">
                                  <label className="form-label fw-semibold text-secondary">
                                    Location
                                  </label>
                                  <input
                                    type="text"
                                    name="location"
                                    value={localWorker.location || ""}
                                    onChange={handleChange}
                                    className="form-control dark-input"
                                    placeholder="Enter location"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="info-grid-compact">
                                {renderInfoCard("Mobile Number", localWorker.mobileNo)}
                                {renderInfoCard("Full Name", localWorker.name)}
                                {renderInfoCard("Gender", localWorker.gender, "gender")}
                                {renderInfoCard("Education", localWorker.education)}
                                {renderInfoCard("Age", localWorker.age)}
                                {renderInfoCard("Location", localWorker.location)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Professional Information */}
                      <div className="col-12">
                        <div className="dark-card">
                          <div className="card-header dark-card-header">
                            <h6 className="mb-0 fw-bold d-flex align-items-center text-warning">
                              <i className="bi bi-briefcase me-2"></i>
                              Professional Information
                            </h6>
                          </div>
                          <div className="card-body p-3">
                            {isEditMode ? (
                              <div className="row g-3">

                                <div className="col-md-4">
                                  <label className="form-label fw-semibold text-secondary">
                                    Marital Status
                                  </label>
                                  <select
                                    name="maritalStatus"
                                    value={localWorker.maritalStatus || ""}
                                    onChange={handleChange}
                                    className="form-select dark-input"
                                  >
                                    <option value="">Select Status</option>
                                    <option value="Single">Single</option>
                                    <option value="Married">Married</option>
                                    <option value="Separated">Separated</option>
                                    <option value="Widow">Widow</option>
                                  </select>
                                </div>


                                <div className="col-md-4">
                                  <label className="form-label fw-semibold text-secondary">
                                    Source
                                  </label>
                                  <select
                                    name="source"
                                    value={localWorker.source || ""}
                                    onChange={handleChange}
                                    className="form-select dark-input"
                                  >
                                    <option value="">Select Source</option>
                                    {sourceOptions.map((s) => (
                                      <option key={s} value={s}>
                                        {s}
                                      </option>
                                    ))}
                                  </select>
                                </div>


                                <div className="col-md-4">
                                  <label className="form-label fw-semibold text-secondary">
                                    Experience
                                  </label>
                                  <select
                                    name="experience"
                                    value={localWorker.experience || "No"}
                                    onChange={handleChange}
                                    className="form-select dark-input"
                                  >
                                    <option value="No">No Experience</option>
                                    <option value="Yes">Has Experience</option>
                                  </select>
                                </div>

                                <div className="col-md-4">
                                  <label className="form-label fw-semibold text-secondary">
                                    Years
                                  </label>
                                  <input
                                    type="number"
                                    name="years"
                                    value={localWorker.years || ""}
                                    onChange={handleChange}
                                    className="form-control dark-input text-center"
                                    min="0"
                                    max="50"
                                    placeholder="Years"
                                  />
                                </div>

                                <div className="col-md-4">
                                  <label className="form-label fw-semibold text-secondary d-block">
                                    Working Hours
                                  </label>
                                  <select
                                    name="workingHours"
                                    value={localWorker.workingHours || ""}
                                    onChange={handleChange}
                                    className="form-select dark-input"
                                  >
                                    <option value="">Select Hours</option>
                                    <option value="24">24HR</option>
                                    <option value="12">12HR</option>
                                  </select>
                                </div>





                                <div className="col-md-4">
                                  <label className="form-label fw-semibold text-secondary">
                                    Joining Type
                                  </label>

                                  <select
                                    name="joiningType"
                                    value={localWorker.joiningType || "No"}
                                    onChange={handleChange}
                                    className="form-select dark-input"
                                  >
                                    <option value="">Select Joining Type</option>
                                    <option value="Immediate">Immediate</option>
                                    <option value="1 Week">1 Week</option>
                                    <option value="15 Days">15 Days</option>
                                    <option value="Flexible">Flexible</option>
                                    <option value="Negotiable">Negotiable</option>
                                  </select>

                                </div>

                                <div className="col-md-4">
                                  <label className="form-label fw-semibold text-secondary">
                                    Expeted Salary
                                  </label>
                                  <input
                                    type="tel"
                                    name="expectedSalary"
                                    value={localWorker.expectedSalary || ""}
                                    onChange={handleChange}
                                    className="form-control dark-input"
                                    placeholder=" Expected Salary"
                                    maxLength={5}
                                  />
                                </div>



                                <div className="col-md-4">
                                  <label className="form-label fw-semibold text-secondary d-block">
                                    Conversation Level
                                  </label>
                                  <select
                                    name="conversationLevel"
                                    value={localWorker.conversationLevel || ""}
                                    onChange={handleChange}
                                    className="form-select dark-input"
                                  >
                                    <option value="">Select Level</option>
                                    <option value="Very Good">Very Good</option>
                                    <option value="Good">Good</option>
                                    <option value="Average">Average</option>
                                    <option value="Below Average">Below Average</option>
                                    <option value="Bad">Bad</option>
                                    <option value="Very Bad">Very Bad</option>
                                  </select>
                                </div>

                                <div className="col-md-4">
                                  <label className="form-label fw-semibold text-secondary">
                                    Reminder Date
                                  </label>
                                  <input
                                    type="date"
                                    name="callReminderDate"
                                    value={localWorker.callReminderDate || ""}
                                    onChange={handleChange}
                                    className="form-control dark-input"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="info-grid-compact">
                                {renderInfoCard("Marital Status", localWorker.maritalStatus)}
                                {renderInfoCard("Source", localWorker.source)}
                                {renderInfoCard("Experience", localWorker.experience)}
                                {renderInfoCard("Years", localWorker.years)}
                                {renderInfoCard("Working Hours", localWorker.workingHours ? `${localWorker.workingHours}HR` : "N/A")}
                                {renderInfoCard("Joining Type", localWorker.joiningType, "joiningType")}
                                {renderInfoCard("Expected Salary", localWorker.expectedSalary, "expectedSalary")}
                                {renderInfoCard("Conversation Level", localWorker.conversationLevel, "conversation")}
                                {renderInfoCard("Reminder Date", localWorker.callReminderDate ? new Date(localWorker.callReminderDate).toLocaleDateString("en-GB") : "—")}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Comments */}
                      <div className="col-12">
                        <div className="dark-card">
                          <div className="card-header dark-card-header">
                            <h6 className="mb-0 fw-bold d-flex align-items-center text-warning">
                              <i className="bi bi-chat-left-text me-2"></i>
                              Comments & Activity
                            </h6>
                          </div>
                          <div className="card-body p-3">
                            {/* Initial Form Comment */}
                            {localWorker.formComment && (
                              <div className="comment-initial mb-3">
                                <div className="comment-header d-flex justify-content-between align-items-center mb-2">
                                  <small className="text-primary fw-bold">Initial Comment</small>
                                </div>
                                <p className="mb-0 text-info">{localWorker.formComment}</p>
                              </div>
                            )}

                            {/* Comments List */}
                            <div className="comments-list-compact " style={{ maxHeight: "200px", overflowY: "auto" }}>
                              {comments && comments.length > 0 ? (
                                comments.map((c, idx) => (
                                  <div key={idx} className="comment-item-compact">
                                    <p className="comment-text mb-2">{c.text}</p>
                                    <div className="comment-footer d-flex justify-content-between align-items-center opacity-50">
                                      <small className="comment-author text-muted">
                                        <i className="bi bi-person-circle me-1"></i>
                                        {c.user || pickUserName(usersMap[c.userId]) || "user"}
                                      </small>
                                      <small className="comment-date text-muted">
                                        {formatDateTime(c.date)}
                                      </small>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="empty-state-compact text-center py-3">
                                  <i className="bi bi-chat-square-text text-muted"></i>
                                  <p className="mt-2 mb-0 text-muted">No comments yet</p>
                                </div>
                              )}
                            </div>

                            {isEditMode && (
                              <div className="add-comment-section">
                                <label className="form-label fw-semibold text-light">
                                  Add Comment <span className="text-danger">*</span>
                                </label>
                                <textarea
                                  className="form-control dark-input mb-2"
                                  rows="2"
                                  value={newComment}
                                  onChange={(e) => setNewComment(e.target.value)}
                                  placeholder="Add a new comment... (Required to enable saving)"
                                />
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={handleAddComment}
                                  disabled={!newComment.trim()}
                                >
                                  Add Comment
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Skills Tab */}
                {activeTab === "skills" && (
                  <div className="fade show">
                    <div className="row g-3">
                      {/* Languages */}
                      <div className="col-12">
                        <div className="dark-card">
                          <div className="card-header dark-card-header">
                            <h6 className="mb-0 fw-bold d-flex align-items-center">
                              <i className="bi bi-translate me-2"></i>
                              Languages
                            </h6>
                          </div>
                          <div className="card-body p-3">
                            {isEditMode && (
                              <div className="position-relative mb-3">
                                <input
                                  type="text"
                                  className="form-control dark-input"
                                  placeholder="🔍 Search or type language..."
                                  value={languageSearch}
                                  onChange={(e) => {
                                    setLanguageSearch(e.target.value);
                                    setShowLanguageDropdown(true);
                                  }}
                                  onFocus={() => setShowLanguageDropdown(true)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                      setShowLanguageDropdown(false);
                                    }
                                  }}
                                  ref={languageInputRef}
                                />
                                {showLanguageDropdown && (
                                  <div
                                    className="language-dropdown dark-dropdown"
                                    ref={dropdownRef}
                                  >
                                    {filteredLanguages.map((lang) => (
                                      <div
                                        key={lang}
                                        className="dropdown-item text-secondary"
                                        onClick={() => handleLanguageSelect(lang)}
                                      >
                                        {lang}
                                      </div>
                                    ))}
                                    {filteredLanguages.length === 0 && (
                                      <div className="dropdown-item text-muted">
                                        No languages found
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="languages-container-compact">
  {normalizeArray(localWorker.languages).length > 0 ? (
    <div className="d-flex flex-wrap gap-2">
      {normalizeArray(localWorker.languages).map((lang, idx) => (
        <div
          key={idx}
          className="language-tag-compact btn btn-outline-warning btn-sm position-relative"
        >
          {lang}
          {isEditMode && (
            <button
              type="button"
              className="btn-close btn-close-white tag-remove position-absolute top-0 start-100 translate-middle"
              onClick={() => handleTagRemove("languages", idx)}
              style={{
                width: '0.5rem',
                height: '0.5rem',
                fontSize: '0.6rem',
                padding: '0.25rem'
              }}
            >
            </button>
          )}
        </div>
      ))}
    </div>
  ) : (
    <div className="empty-state-compact text-center py-3">
      <i className="bi bi-translate text-muted"></i>
      <p className="mt-2 mb-0 text-muted">No languages selected</p>
    </div>
  )}
</div>
                          </div>
                        </div>
                      </div>

                      {/* Skills Columns */}
                      {/* <div className="col-md-6">
                        <div className="dark-card h-100">
                          <div className="card-header dark-card-header">
                            <h6 className="mb-0 fw-bold text-warning">PRIMARY SKILLS</h6>
                          </div>
                          <div className="card-body p-3">
                            {isEditMode ? (
                              <>
                                <div className="skills-pills-compact mb-3">
                                  {primarySkillOptions.map((opt) => {
                                    const active = normalizeArray(localWorker.skills)
                                      .map((x) => String(x).toLowerCase())
                                      .includes(String(opt).toLowerCase());
                                    return (
                                      <button
                                        type="button"
                                        key={`primary-${opt}`}
                                        className={`btn btn-sm rounded-pill ${active
                                          ? "btn-primary"
                                          : "btn-outline-light"
                                          } disabled-keep skill-pill-compact`}
                                        onClick={() => handleMultiToggle("skills", opt)}
                                        disabled={!isEditMode}
                                        aria-pressed={active}
                                      >
                                        {opt}
                                      </button>
                                    );
                                  })}
                                </div>

                                <div className="input-group input-group-sm mb-2">
                                  <input
                                    id="custom-skills"
                                    type="text"
                                    className="form-control dark-input"
                                    placeholder="Add custom skill"
                                    disabled={!isEditMode}
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-primary disabled-keep"
                                    onClick={() => handleAddCustom("skills", "custom-skills")}
                                    disabled={!isEditMode}
                                  >
                                    Add
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div className="skills-display-compact">
                                {normalizeArray(localWorker.skills).length > 0 ? (
                                  <div className="d-flex flex-wrap gap-2">
                                    {normalizeArray(localWorker.skills).map((skill, idx) => (
                                      <span
                                        key={idx}
                                        className="skill-tag-compact primary"
                                      >
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="empty-state-compact text-center py-3">
                                    <i className="bi bi-tools text-muted"></i>
                                    <p className="mt-2 mb-0 text-muted">No primary skills</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div> */}

                      <div className="col-md-12">
                        <div className="dark-card">
                          <div className="card-header dark-card-header">
                            <h6 className="mb-0 fw-bold text-warning">HOME CARE SKILLS</h6>
                          </div>
                          <div className="card-body p-3">
                            {isEditMode ? (
                              <>
                                <div className="skills-pills-compact mb-3">
                                  {homeCareSkillOptions.map((opt) => {
                                    const active = normalizeArray(localWorker.homeCareSkills)
                                      .map((x) => String(x).toLowerCase())
                                      .includes(String(opt).toLowerCase());
                                    return (
                                      <button
                                        type="button"
                                        key={`homecare-${opt}`}
                                        className={`btn btn-sm rounded-pill ${active
                                          ? "btn-success"
                                          : "btn-outline-light"
                                          } disabled-keep skill-pill-compact`}
                                        onClick={() => handleMultiToggle("homeCareSkills", opt)}
                                        disabled={!isEditMode}
                                        aria-pressed={active}
                                      >
                                        {opt}
                                      </button>
                                    );
                                  })}
                                </div>

                                <div className="input-group input-group-sm mb-2">
                                  <input
                                    id="custom-homeCareSkills"
                                    type="text"
                                    className="form-control dark-input"
                                    placeholder="Add custom skill"
                                    disabled={!isEditMode}
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-success disabled-keep"
                                    onClick={() =>
                                      handleAddCustom("homeCareSkills", "custom-homeCareSkills")
                                    }
                                    disabled={!isEditMode}
                                  >
                                    Add
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div className="skills-display-compact">
                                {normalizeArray(localWorker.homeCareSkills).length > 0 ? (
                                  <div className="d-flex flex-wrap gap-2">
                                    {normalizeArray(localWorker.homeCareSkills).map((skill, idx) => (
                                      <span
                                        key={idx}
                                        className="skill-tag-compact success"
                                      >
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="empty-state-compact text-center py-3">
                                    <i className="bi bi-house-heart text-muted"></i>
                                    <p className="mt-2 mb-0 text-muted">No home care skills</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Other Skills */}
                      <div className="col-12">
                        <div className="dark-card">
                          <div className="card-header dark-card-header">
                            <h6 className="mb-0 fw-bold text-warning">OTHER SKILLS</h6>
                          </div>
                          <div className="card-body">
                            {isEditMode ? (
                              <>
                                <div className="other-skills-categories">
                                  {[
                                    { title: "💼 Office & Administrative", skills: otherSkillOptions.slice(0, 9), color: "office", bgClass: "bg-office", btnClass: "btn-office" },
                                    { title: "📞 Customer Service", skills: otherSkillOptions.slice(9, 15), color: "customer", bgClass: "bg-customer", btnClass: "btn-customer" },
                                    { title: "👔 Management", skills: otherSkillOptions.slice(15, 20), color: "management", bgClass: "bg-management", btnClass: "btn-management" },
                                    { title: "🛡️ Security", skills: otherSkillOptions.slice(20, 24), color: "security", bgClass: "bg-security", btnClass: "btn-security" },
                                    { title: "🚗 Driving & Logistics", skills: otherSkillOptions.slice(24, 32), color: "driving", bgClass: "bg-driving", btnClass: "btn-driving" },
                                    { title: "🔧 Technical", skills: otherSkillOptions.slice(32, 42), color: "technical", bgClass: "bg-technical", btnClass: "btn-technical" },
                                    { title: "🛍️ Retail & Sales", skills: otherSkillOptions.slice(42, 47), color: "retail", bgClass: "bg-retail", btnClass: "btn-retail" },
                                    { title: "🏭 Industrial", skills: otherSkillOptions.slice(47), color: "industrial", bgClass: "bg-industrial", btnClass: "btn-industrial" }
                                  ].map((category, catIndex) => (
                                    <div key={catIndex} className={`skill-category-compact p-3 mb-2 ${category.bgClass} rounded`}>
                                      <h6 className="category-title-compact text-dark fw-bold">{category.title}</h6>
                                      <div className="skills-pills-compact">
                                        {category.skills.map((opt) => {
                                          const active = normalizeArray(localWorker.otherSkills)
                                            .map((x) => String(x).toLowerCase())
                                            .includes(String(opt).toLowerCase());
                                          return (
                                            <button
                                              key={`other-${opt}`}
                                              type="button"
                                              className={`btn btn-sm rounded-pill ${active
                                                ? category.btnClass
                                                : "btn-outline-light"
                                                } disabled-keep skill-pill-compact`}
                                              onClick={() => handleMultiToggle("otherSkills", opt)}
                                              disabled={!isEditMode}
                                              aria-pressed={active}
                                            >
                                              {opt}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <div className="input-group input-group-sm mt-2">
                                  <input
                                    id="custom-otherSkills"
                                    type="text"
                                    className="form-control dark-input"
                                    placeholder="Add custom other skill"
                                    disabled={!isEditMode}
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-warning disabled-keep"
                                    onClick={() => handleAddCustom("otherSkills", "custom-otherSkills")}
                                    disabled={!isEditMode}
                                  >
                                    Add
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div className="skills-display-compact">
                                {normalizeArray(localWorker.otherSkills).length > 0 ? (
                                  <div className="d-flex flex-wrap gap-2 p-3">
                                    {normalizeArray(localWorker.otherSkills).map((skill, idx) => (
                                      <span
                                        key={idx}
                                        className="skill-tag-compact warning"
                                      >
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="empty-state-compact text-center py-3">
                                    <i className="bi bi-grid-3x3-gap text-muted"></i>
                                    <p className="mt-2 mb-0 text-muted">No other skills</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="modal-footer dark-footer py-2 px-3">
                <div className="d-flex justify-content-between align-items-center w-100">
                  <div className="meta-info-compact">
                    {createdByName && (
                      <small className="text-muted opacity-50">
                        Created by: <strong>{createdByName}</strong>
                        {localWorker.createdAt && ` on ${formatDateTime(localWorker.createdAt)}`}
                      </small>
                    )}
                  </div>

                  <div className="d-flex gap-2">
                    {isEditMode && (
                      <button
                        className="btn btn-success px-3 fw-bold btn-sm"
                        onClick={handleSave}
                        disabled={!canSave}
                        title={!canSave ? "Add a comment first to enable saving" : ""}
                      >
                        Save Changes
                      </button>
                    )}
                    <button className="btn btn-secondary px-3 btn-sm" onClick={confirmClose}>
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Success Modal */}
      {showSaveModal && (
        <div
          className="modal fade show dark-modal"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.8)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content dark-card">
              <div className="modal-body text-center p-4">
                <div className="text-success mb-3">
                  <i className="bi bi-check-circle" style={{ fontSize: "2.5rem" }}></i>
                </div>
                <h5 className="fw-bold text-success mb-3">Success!</h5>
                <p className="text-light mb-4">
                  Worker details have been saved successfully.
                </p>
                <button
                  className="btn btn-success px-4 btn-sm"
                  onClick={() => {
                    setShowSaveModal(false);
                    onClose();
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Confirmation */}
      {showUnsavedConfirm && (
        <div
          className="modal fade show dark-modal"
          style={{ display: "block", background: "rgba(0,0,0,0.8)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content dark-card">
              <div className="modal-body text-center p-4">
                <div className="text-warning mb-3">
                  <i className="bi bi-exclamation-triangle" style={{ fontSize: "2.5rem" }}></i>
                </div>
                <h5 className="fw-bold text-warning mb-3">Unsaved Changes</h5>
                <p className="text-light mb-4">
                  You have unsaved changes. Are you sure you want to close without saving?
                </p>
                <div className="d-flex gap-2 justify-content-center">
                  <button
                    className="btn btn-secondary px-3 btn-sm"
                    onClick={() => setShowUnsavedConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-warning px-3 btn-sm"
                    onClick={() => {
                      setShowUnsavedConfirm(false);
                      onClose();
                    }}
                  >
                    Discard Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
}