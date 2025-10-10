// src/components/workerCalles/WorkerCallModal.jsx
import React, { useEffect, useMemo, useState } from "react";
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
  isEditMode, // keep existing prop / behavior
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
    "Nursing",
    "Patient Care",
    "Care Taker",
    "Old Age Care",
    "Baby Care",
    "Bedside Attender",
    "Supporting",
    "Any duty",
    "Diaper",
    "Cooking",
  ];

  const homeCareSkillOptions = [
    "Injection",
    "BP Check",
    "Sugar Check",
    "Wound Dressing",
    "Catheter Care",
    "Ryle's Tube",
    "IV Fluids",
    "Nebulization",
    "Physio Support",
    "Post-Operative Care",
  ];

  const otherSkillOptions = [
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
  ];

  const languageOptions = [
    "Telugu",
    "English",
    "Hindi",
    "Urdu",
    "Kannada",
    "Malayalam",
    "Tamil",
    "Bengali",
    "Marati",
  ];

  const sourceOptions = [
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
    "Just Dial",
    "News Paper",
    "Other",
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
    if (!isEditMode) return; // ignore in view mode
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
    // Save is gated by "Add Comment", so do NOT enable here.
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
    // still gated by comment
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

      const updated = [entry, ...comments]; // latest on top
      setComments(updated);
      setNewComment("");

      // Persist full array back (keeps existing, adds new on top)
      await firebaseDB.child(`WorkerCallData/${worker.id}/comments`).set(updated);

      // Reflect in localWorker (helpful if other parts rely on it)
      setLocalWorker((prev) => ({ ...prev, comments: updated, updatedAt: Date.now(), updatedById: currentUserId || null, updatedByName: currentUserName || "" }));

      // Now Save can be used
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
    // still gated by comment
  };

  const handleLanguageSelect = (language) => {
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
  };

  const confirmClose = () => {
    if (dirty) setShowUnsavedConfirm(true);
    else onClose();
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

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: "block", background: "rgba(0,0,0,0.8)" }}
      >
        <div className="modal-dialog modal-xl modal-dialog-centered">
          <div
            className="modal-content border-0 shadow-lg"
            style={{ borderRadius: "15px", maxWidth: "800px", margin: "auto" }}
          >
            {/* Header */}
            <div
              className="modal-header bg-gradient-primary text-white"
              style={{ background: "#69656e" }}
            >
              <div className="d-flex align-items-center w-100">
                <div className="flex-grow-1">
                  <h5 className="modal-title fw-bold mb-1">
                    {isEditMode ? "Edit Worker" : "Worker Details"}
                  </h5>
                  <div className="d-flex flex-wrap align-items-center gap-3 text-white-50 small">
                    <span>{localWorker?.name || "—"}</span>
                    <span>{localWorker?.mobileNo || "—"}</span>
                    <span>{localWorker?.location || "—"}</span>
                  </div>

                </div>

                {/* Close */}
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={confirmClose}
                ></button>
              </div>
            </div>

            <div className="modal-body p-0">
              {/* Tabs */}
              <div className="bg-light border-bottom">
                <div className="container-fluid">
                  <ul className="nav nav-pills nav-justified gap-2 p-2">
                    <li className="nav-item">
                      <button
                        className={`nav-link ${activeTab === "basic"
                          ? "active btn-primary text-white"
                          : "btn-outline-primary text-primary"
                          }`}
                        onClick={() => setActiveTab("basic")}
                        style={{ borderRadius: "5px", fontWeight: "600" }}
                      >
                        Basic Information
                      </button>
                    </li>
                    <li className="nav-item">
                      <button
                        className={`nav-link ${activeTab === "skills"
                          ? "active btn-primary text-white"
                          : "btn-outline-primary text-primary"
                          }`}
                        onClick={() => setActiveTab("skills")}
                        style={{ borderRadius: "5px", fontWeight: "600" }}
                      >
                        Skills & Languages
                      </button>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="tab-content p-2 bg-white" style={{ minHeight: "500px" }}>
                {/* Basic Info Tab */}
                {activeTab === "basic" && (
                  <div className="fade show">
                    <div className="row g-4">
                      {/* Personal Information */}
                      <div className="col-12">
                        <div className="border-0 shadow-sm p-3">
                          <div className="card-header bg-light">
                            <h6 className="mb-0 fw-bold text-primary">
                              Personal Information
                            </h6>
                          </div>
                          <div className="card-body">
                            <div className="row g-3">
                              <div className="col-md-6" style={{ opacity: 0 }}>
                                <label className="form-label fw-semibold text-dark">
                                  Mobile Number
                                </label>
                                <input
                                  type="text"
                                  name="mobileNo"
                                  value={localWorker.mobileNo || ""}
                                  disabled
                                  className="form-control border-secondary bg-light"
                                />
                              </div>

                              <div className="col-md-6">
                                <label className="form-label fw-semibold text-dark">
                                  Full Name
                                </label>
                                {isEditMode ? (
                                  <input
                                    type="text"
                                    name="name"
                                    value={localWorker.name || ""}
                                    onChange={handleChange}
                                    className="form-control border-primary"
                                    placeholder="Enter worker name"
                                  />
                                ) : (
                                  <div className="form-control border bg-light">
                                    {localWorker.name || "—"}
                                  </div>
                                )}
                              </div>

                              <div className="col-md-6">
                                <label className="form-label fw-semibold text-dark d-block">
                                  Gender
                                </label>
                                {isEditMode ? (
                                  <div className="d-flex gap-2 flex-wrap">
                                    {["Male", "Female", "Others"].map((g) => (
                                      <button
                                        key={g}
                                        type="button"
                                        onClick={() =>
                                          handleChange({
                                            target: { name: "gender", value: g },
                                          })
                                        }
                                        className={`btn ${localWorker.gender === g
                                          ? "btn-info"
                                          : "btn-outline-secondary"
                                          } btn-sm`}
                                      >
                                        {g}
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <span
                                    className={`badge ${localWorker.gender === "Male"
                                      ? "bg-primary"
                                      : localWorker.gender === "Female"
                                        ? "bg-pink"
                                        : "bg-secondary"
                                      } fs-6 p-2`}
                                  >
                                    {localWorker.gender || "—"}
                                  </span>
                                )}
                              </div>

                              <div className="col-md-6">
                                <label className="form-label fw-semibold text-dark">
                                  Location
                                </label>
                                {isEditMode ? (
                                  <input
                                    type="text"
                                    name="location"
                                    value={localWorker.location || ""}
                                    onChange={handleChange}
                                    className="form-control border-primary"
                                    placeholder="Enter location"
                                  />
                                ) : (
                                  <div className="form-control border bg-light">
                                    {localWorker.location || "—"}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Professional Information */}
                      <div className="col-12">
                        <div className="border-0 shadow-sm p-3">
                          <div className="card-header bg-light">
                            <h6 className="mb-0 fw-bold text-primary">
                              Professional Information
                            </h6>
                          </div>
                          <div className="card-body">
                            <div className="row g-3">
                              <div className="col-md-4">
                                <label className="form-label fw-semibold text-dark">
                                  Source
                                </label>
                                {isEditMode ? (
                                  <select
                                    name="source"
                                    value={localWorker.source || ""}
                                    onChange={handleChange}
                                    className="form-select border-primary"
                                  >
                                    <option value="">Select Source</option>
                                    {sourceOptions.map((s) => (
                                      <option key={s} value={s}>
                                        {s}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <div className="form-control border bg-light">
                                    {localWorker.source || "—"}
                                  </div>
                                )}
                              </div>

                              <div className="col-md-4">
                                <label className="form-label fw-semibold text-dark">
                                  Marital Status
                                </label>
                                {isEditMode ? (
                                  <select
                                    name="maritalStatus"
                                    value={localWorker.maritalStatus || ""}
                                    onChange={handleChange}
                                    className="form-select border-primary"
                                  >
                                    <option value="">Select Status</option>
                                    <option value="Single">Single</option>
                                    <option value="Married">Married</option>
                                    <option value="Separated">Separated</option>
                                    <option value="Widow">Widow</option>
                                  </select>
                                ) : (
                                  <div className="form-control border bg-light">
                                    {localWorker.maritalStatus || "—"}
                                  </div>
                                )}
                              </div>

                              <div className="col-md-4">
                                <label className="form-label fw-semibold text-dark">
                                  Education
                                </label>
                                {isEditMode ? (
                                  <input
                                    type="text"
                                    name="education"
                                    value={localWorker.education || ""}
                                    onChange={handleChange}
                                    className="form-control border-primary"
                                    placeholder="Enter education"
                                  />
                                ) : (
                                  <div className="form-control border bg-light">
                                    {localWorker.education || "—"}
                                  </div>
                                )}
                              </div>

                              <div className="col-md-4">
                                <label className="form-label fw-semibold text-dark">
                                  Age
                                </label>
                                {isEditMode ? (
                                  <input
                                    type="number"
                                    name="age"
                                    value={localWorker.age || ""}
                                    onChange={handleChange}
                                    className="form-control border-primary text-center"
                                    min="10"
                                    max="80"
                                    placeholder="Age"
                                  />
                                ) : (
                                  <div className="form-control border bg-light text-center">
                                    {localWorker.age || "—"}
                                  </div>
                                )}
                              </div>

                              <div className="col-md-4">
                                <label className="form-label fw-semibold text-dark">
                                  Experience
                                </label>
                                {isEditMode ? (
                                  <select
                                    name="experience"
                                    value={localWorker.experience || "No"}
                                    onChange={handleChange}
                                    className="form-select border-primary"
                                  >
                                    <option value="No">No Experience</option>
                                    <option value="Yes">Has Experience</option>
                                  </select>
                                ) : (
                                  <div className="form-control border bg-light">
                                    {localWorker.experience || "No"}
                                  </div>
                                )}
                              </div>

                              <div className="col-md-4">
                                <label className="form-label fw-semibold text-dark">
                                  Years
                                </label>
                                {isEditMode ? (
                                  <input
                                    type="number"
                                    name="years"
                                    value={localWorker.years || ""}
                                    onChange={handleChange}
                                    className="form-control border-primary text-center"
                                    min="0"
                                    max="50"
                                    placeholder="Years"
                                  />
                                ) : (
                                  <div className="form-control border bg-light text-center">
                                    {localWorker.years || "—"}
                                  </div>
                                )}
                              </div>

                              <div className="col-md-4">
                                <label className="form-label fw-semibold text-dark d-block">
                                  Working Hours
                                </label>
                                {isEditMode ? (
                                  <select
                                    name="workingHours"
                                    value={localWorker.workingHours || ""}
                                    onChange={handleChange}
                                    className="form-select border-primary"
                                  >
                                    <option value="">Select Working Hours</option>
                                    <option value="24">24HR</option>
                                    <option value="12">12HR</option>
                                  </select>
                                ) : (
                                  <div className="p-2 bg-light rounded">
                                    {localWorker.workingHours || "N/A"}
                                  </div>
                                )}
                              </div>

                              <div className="col-md-4">
                                <label className="form-label fw-semibold text-dark d-block">
                                  Conversation Level
                                </label>
                                {isEditMode ? (
                                  <select
                                    name="conversationLevel"
                                    value={localWorker.conversationLevel || ""}
                                    onChange={handleChange}
                                    className="form-select border-primary"
                                  >
                                    <option value="">Select Level</option>
                                    <option value="Very Good">Very Good</option>
                                    <option value="Good">Good</option>
                                    <option value="Average">Average</option>
                                    <option value="Below Average">Below Average</option>
                                    <option value="Bad">Bad</option>
                                    <option value="Very Bad">Very Bad</option>
                                  </select>
                                ) : (
                                  <span
                                    className={`badge ${localWorker.conversationLevel === "Very Good"
                                      ? "bg-success"
                                      : localWorker.conversationLevel === "Good"
                                        ? "bg-primary"
                                        : localWorker.conversationLevel === "Average"
                                          ? "bg-warning"
                                          : "bg-danger"
                                      } fs-6 p-2  text-center`}
                                  >
                                    {localWorker.conversationLevel || "N/A"}
                                  </span>
                                )}
                              </div>

                              <div className="col-md-4">
                                <label className="form-label fw-semibold text-dark">
                                  Reminder Date
                                </label>
                                {isEditMode ? (
                                  <input
                                    type="date"
                                    name="callReminderDate"
                                    value={localWorker.callReminderDate || ""}
                                    onChange={handleChange}
                                    className="form-control border-primary"
                                  />
                                ) : (
                                  <div className="form-control border bg-light">
                                    {localWorker.callReminderDate
                                      ? new Date(localWorker.callReminderDate).toLocaleDateString(
                                        "en-GB"
                                      )
                                      : "—"}
                                  </div>
                                )}
                              </div>

                              {/* Removed "Recent Comment" section as requested */}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Comments (All, latest first). In view mode: no textarea/button */}
                      <div className="col-12">
                        <div className="border-0 shadow-sm p-3">
                          <div className="card-header">
                            <h6 className="mb-0 fw-bold text-primary mb-2">
                              Comments
                            </h6>
                          </div>
                          <div className="card-body">
                            <div className="border rounded p-2 mb-3 bg-light">
                              <p className="mb-0 text-dark">{localWorker.formComment}</p>

                            </div>

                            <div className="mb-3" style={{ maxHeight: "420px", overflowY: "auto" }}>
                              {comments && comments.length > 0 ? (
                                comments.map((c, idx) => (
                                  <div key={idx} className="border rounded p-2 mb-3 bg-light">
                                    <p className="mb-0 text-dark">{c.text}</p>
                                    <div className="d-flex justify-content-between align-items-start mt-2">
                                      <small className="text-primary small-text">
                                        {c.user || pickUserName(usersMap[c.userId]) || "user"}
                                      </small>
                                      <small className="small-text">
                                        {formatDateTime(c.date)}
                                      </small>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-4">
                                  <p className="mb-0 small-text">No comments yet</p>
                                </div>
                              )}
                            </div>

                            {isEditMode && (
                              <div className="align-items-start gap-2 border-top pt-3">
                                <p>Add Comment  <span className="star">*</span></p>
                                <textarea
                                  className="form-control border-primary wc"
                                  rows="3"
                                  value={newComment}
                                  onChange={(e) => setNewComment(e.target.value)}
                                  placeholder="Add a new comment..."
                                />
                                <div className="wc">
                                  <button
                                    className="btn btn-primary mt-3"
                                    onClick={handleAddComment}
                                    disabled={!newComment.trim()}
                                  >
                                    Add Comment
                                  </button>
                                </div>
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
                    <div className="row g-4">
                      {/* Languages */}
                      <div className="col-12">
                        <div className="border-0 shadow-sm p-3">
                          <div className="card-header bg-light">
                            <h6 className="fw-bold text-primary">Languages</h6>
                          </div>
                          <div className="card-body">
                            {isEditMode && (
                              <div className="position-relative mb-3">
                                <input
                                  type="text"
                                  className="form-control border-primary"
                                  placeholder="Search or type language..."
                                  value={languageSearch}
                                  onChange={(e) => {
                                    setLanguageSearch(e.target.value);
                                    setShowLanguageDropdown(true);
                                  }}
                                  onFocus={() => setShowLanguageDropdown(true)}
                                />
                                {showLanguageDropdown && (
                                  <div
                                    className="position-absolute top-100 start-0 end-0 bg-white border border-primary rounded mt-1 shadow-lg z-3"
                                    style={{ maxHeight: "200px", overflowY: "auto" }}
                                  >
                                    {filteredLanguages.map((lang) => (
                                      <div
                                        key={lang}
                                        className="dropdown-item p-2 border-bottom"
                                        onClick={() => handleLanguageSelect(lang)}
                                        style={{ cursor: "pointer" }}
                                      >
                                        {lang}
                                      </div>
                                    ))}
                                    {filteredLanguages.length === 0 && (
                                      <div className="dropdown-item p-2 text-muted">
                                        No languages found
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="d-flex flex-wrap gap-2">
                              {normalizeArray(localWorker.languages).map((lang, idx) => (
                                <span
                                  key={idx}
                                  className="badge bg-success d-flex align-items-center p-2"
                                >
                                  {lang}
                                  {isEditMode && (
                                    <button
                                      type="button"
                                      className="btn-close btn-close-white ms-2"
                                      onClick={() => handleTagRemove("languages", idx)}
                                      style={{ fontSize: "0.7rem" }}
                                    ></button>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Primary Skills (pill buttons) */}
                      <div className="col-md-6">
                        <h6 className="fw-bold">Primary Skills</h6>
                        <div className="d-flex flex-wrap justify-content-center gap-2 border rounded p-3 bg-light mb-3">
                          {primarySkillOptions.map((opt) => {
                            const active = normalizeArray(localWorker.skills)
                              .map((x) => String(x).toLowerCase())
                              .includes(String(opt).toLowerCase());
                            return (
                              <button
                                type="button"
                                key={`primary-${opt}`}
                                className={`btn btn-sm rounded-pill ${active
                                  ? "btn-outline-info btn-info text-black"
                                  : "btn-outline-info"
                                  } disabled-keep`}
                                onClick={() => handleMultiToggle("skills", opt)}
                                disabled={!isEditMode}
                                aria-pressed={active}
                                title={!isEditMode ? "Switch to Edit to modify skills" : ""}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom primary skill */}
                        <div className="input-group mb-2">
                          <input
                            id="custom-skills"
                            type="text"
                            className="form-control border-primary"
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

                        <div className="d-flex flex-wrap gap-2 mt-2">
                          {normalizeArray(localWorker.skills).map((skill, idx) => (
                            <span
                              key={idx}
                              className="badge bg-info text-dark align-items-center p-2"
                            >
                              {skill}
                              {isEditMode && (
                                <button
                                  type="button"
                                  className="btn-close btn-close-dark ms-2"
                                  onClick={() => handleTagRemove("skills", idx)}
                                  style={{ fontSize: "0.7rem" }}
                                ></button>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Home Care Skills (pill buttons) */}
                      <div className="col-md-6">
                        <h6 className="fw-bold">Home Care Skills</h6>
                        <div className="d-flex flex-wrap gap-2 border rounded p-3 bg-light mb-3 justify-content-center">
                          {homeCareSkillOptions.map((opt) => {
                            const active = normalizeArray(localWorker.homeCareSkills)
                              .map((x) => String(x).toLowerCase())
                              .includes(String(opt).toLowerCase());
                            return (
                              <button
                                type="button"
                                key={`homecare-${opt}`}
                                className={`btn btn-sm rounded-pill ${active
                                  ? "btn-outline-success btn-success text-black"
                                  : "btn-outline-success"
                                  } disabled-keep`}
                                onClick={() => handleMultiToggle("homeCareSkills", opt)}
                                disabled={!isEditMode}
                                aria-pressed={active}
                                title={!isEditMode ? "Switch to Edit to modify home care skills" : ""}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom home care */}
                        <div className="input-group mb-2">
                          <input
                            id="custom-homeCareSkills"
                            type="text"
                            className="form-control border-primary"
                            placeholder="Add custom home care skill"
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

                        <div className="d-flex flex-wrap gap-2 mt-3 justify-content-center">
                          {normalizeArray(localWorker.homeCareSkills).map((skill, idx) => (
                            <span
                              key={idx}
                              className="badge bg-success text-white align-items-center p-2"
                            >
                              {skill}
                              {isEditMode && (
                                <button
                                  type="button"
                                  className="btn-close btn-close-white ms-2"
                                  onClick={() => handleTagRemove("homeCareSkills", idx)}
                                  style={{ fontSize: "0.7rem" }}
                                ></button>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Other Skills — two columns, pill buttons */}
                      <div className="col-12">
                        <h6 className="fw-bold">Other Skills</h6>
                        <div className="border rounded p-3 bg-light mb-3">
                          <div className="row row-cols-1 row-cols-sm-2 g-2 justify-content-center">
                            {otherSkillOptions.map((opt) => {
                              const active = normalizeArray(localWorker.otherSkills)
                                .map((x) => String(x).toLowerCase())
                                .includes(String(opt).toLowerCase());
                              return (
                                <button
                                  key={`other-${opt}`}
                                  type="button"
                                  className={` w-auto me-2 btn btn-sm rounded-pill ${active
                                    ? "btn-outline-warning btn-warning text-black"
                                    : "btn-outline-warning"
                                    } disabled-keep`}
                                  onClick={() => handleMultiToggle("otherSkills", opt)}
                                  disabled={!isEditMode}
                                  aria-pressed={active}
                                  title={!isEditMode ? "Switch to Edit to modify other skills" : ""}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="input-group mb-2">
                          <input
                            id="custom-otherSkills"
                            type="text"
                            className="form-control border-primary"
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

                        <div className="d-flex flex-wrap gap-2 mt-2">
                          {normalizeArray(localWorker.otherSkills).map((skill, idx) => (
                            <span
                              key={idx}
                              className="badge bg-warning text-dark p-2"
                            >
                              {skill}
                              {isEditMode && (
                                <button
                                  type="button"
                                  className="btn-close btn-close-dark ms-2"
                                  onClick={() => handleTagRemove("otherSkills", idx)}
                                  style={{ fontSize: "0.7rem" }}
                                ></button>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Footer */}
                    <div className="modal-footer bg-light border-top wc mt-3">
                      {isEditMode && (
                        <button
                          className="btn btn-success px-4 fw-bold "
                          onClick={handleSave}
                          disabled={!canSave}
                          title={!canSave ? "Add a comment first to enable saving" : ""}
                        >
                          Save Changes
                        </button>
                      )}
                      <button className="btn btn-secondary px-4" onClick={confirmClose}>
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>


          </div>
        </div>
      </div>

      {/* Save Success Modal */}
      {showSaveModal && (
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.6)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div
              className="modal-content border-0 shadow-lg"
              style={{ borderRadius: "15px", maxWidth: "800px", margin: "auto" }}
            >
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title fw-bold">Successfully Saved</h5>
              </div>
              <div className="modal-body text-center py-4">
                <p className="mb-0">
                  Worker{" "}
                  <strong className="text-success">
                    {localWorker?.name || "record"}
                  </strong>{" "}
                  details have been updated successfully!
                </p>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-success fw-bold"
                  onClick={() => {
                    setShowSaveModal(false);
                    onClose();
                  }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Confirmation Modal */}
      {showUnsavedConfirm && (
        <div
          className="modal fade show"
          style={{ display: "block", background: "rgba(0,0,0,0.6)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div
              className="modal-content border-0 shadow-lg"
              style={{ borderRadius: "15px" }}
            >
              <div className="modal-header bg-warning text-dark">
                <h5 className="modal-title fw-bold">Unsaved Changes</h5>
              </div>
              <div className="modal-body text-center py-4">
                <p className="mb-0">
                  You have unsaved changes. Are you sure you want to close?
                </p>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowUnsavedConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    setShowUnsavedConfirm(false);
                    setDirty(false);
                    onClose();
                  }}
                >
                  Discard Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keep disabled buttons' colors the same */}
      <style>{`
        .bg-gradient-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .bg-pink { background-color: #e83e8c !important; }
        .form-control, .form-select { border-radius: 8px; }
        .badge { border-radius: 20px; font-size: 0.85rem; }
        .nav-pills .nav-link { border-radius: 10px; transition: all 0.3s ease; }
        .nav-pills .nav-link:hover { opacity: 0.9; }

        /* Keep same look even when disabled */
        .btn.disabled-keep:disabled { opacity: 1 !important; }
        .btn-outline-info.btn-info.text-black:disabled,
        .btn-outline-success.btn-success.text-black:disabled,
        .btn-outline-warning.btn-warning.text-black:disabled,
        .btn-success:disabled,
        .btn-primary:disabled,
        .btn-warning:disabled {
          opacity: 1 !important;
        }
      `}</style>
    </>
  );
}
