import React, { useState, useEffect } from "react";
import firebaseDB from "../../firebase";

export default function WorkerCallModal({ worker, isOpen, onClose, isEditMode }) {
  const homeCareSkillOptions = [
    "Nursing", "Patient Care", "Care Taker", "Old Age Care", "Baby Care",
    "Bedside Attender", "Supporting", "Any duty", "Daiper"
  ];
  const otherSkillOptions = [
    "Computer Operating", "Tele Calling", "Driving", "Supervisor", "Manager", "Attender", "Security",
    "Carpenter", "Painter", "Plumber", "Electrician", "Mason (Home maker)", "Tailor", "Labour", "Farmer", "Delivery Boy"
  ];

  const languageOptions = [
    "Telugu", "English", "Hindi", "Urdu", "Kannada", 
    "Malayalam", "Tamil", "Bengali", "Marati"
  ];

  const sourceOptions = [
    "Apana", "WorkerIndian", "Reference", "Poster", "Agent",
    "Facebook", "LinkedIn", "Instagram", "YouTube", "Website",
    "Just Dial", "News Paper", "Other"
  ];
  
  const [activeTab, setActiveTab] = useState("basic");
  const [localWorker, setLocalWorker] = useState({ ...worker });
  const [comments, setComments] = useState(worker.comments || []);
  const [newComment, setNewComment] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const [languageSearch, setLanguageSearch] = useState("");
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  useEffect(() => {
    setLocalWorker({ ...worker });
    setComments(worker.comments || []);
  }, [worker]);

  if (!isOpen) return null;

  const normalizeArray = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === "string") {
      return val.split(",").map((s) => s.trim()).filter((s) => s);
    }
    return [];
  };

  const handleMultiToggle = (field, value) => {
    setLocalWorker(prev => {
      const arr = normalizeArray(prev[field]);
      const has = arr.some(v => String(v).toLowerCase() === String(value).toLowerCase());
      return { ...prev, [field]: has ? arr.filter(v => String(v).toLowerCase() !== String(value).toLowerCase()) : [...arr, value] };
    });
    setDirty(true);
  };

  const handleAddCustom = (field, inputId) => {
    const el = document.getElementById(inputId);
    if (!el) return;
    const value = (el.value || '').trim();
    if (!value) return;
    setLocalWorker(prev => {
      const arr = normalizeArray(prev[field]);
      if (arr.some(v => String(v).toLowerCase() === value.toLowerCase())) return prev;
      return { ...prev, [field]: [...arr, value] };
    });
    el.value = "";
    setDirty(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLocalWorker({ ...localWorker, [name]: value });
    setDirty(true);
  };

  const handleSave = async () => {
    const toSave = {
      ...localWorker,
      skills: normalizeArray(localWorker.skills),
      languages: normalizeArray(localWorker.languages),
      homeCareSkills: normalizeArray(localWorker.homeCareSkills),
      otherSkills: normalizeArray(localWorker.otherSkills),
    };
    await firebaseDB.child(`WorkerCallData/${worker.id}`).update(toSave);
    setShowSaveModal(true);
    setDirty(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    const commentObj = {
      text: newComment,
      date: new Date().toISOString(),
      user: "", // lowercase as requested
    };
    const updated = [commentObj, ...comments];
    setComments(updated);
    setNewComment("");
    await firebaseDB.child(`WorkerCallData/${worker.id}/comments`).set(updated);
    setDirty(true);
  };

  const handleTagAdd = (field, value) => {
    if (!value.trim()) return;
    setLocalWorker((prev) => {
      const arr = normalizeArray(prev[field]);
      return { ...prev, [field]: [...arr, value.trim()] };
    });
    setDirty(true);
  };

  const handleTagRemove = (field, idx) => {
    setLocalWorker((prev) => {
      const arr = normalizeArray(prev[field]);
      arr.splice(idx, 1);
      return { ...prev, [field]: arr };
    });
    setDirty(true);
  };

  const handleLanguageSelect = (language) => {
    handleTagAdd("languages", language);
    setLanguageSearch("");
    setShowLanguageDropdown(false);
  };

  const confirmClose = () => {
    if (dirty) {
      setShowUnsavedConfirm(true);
    } else {
      onClose();
    }
  };

  const filteredLanguages = languageOptions.filter(lang =>
    lang.toLowerCase().includes(languageSearch.toLowerCase())
  );

  const formatCommentDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) + ' ' + date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: "block", background: "rgba(0,0,0,0.6)" }}
      >
        <div className="modal-dialog modal-lg modal-dialog-centered weker-call-modal">
          <div className="modal-content border-0 shadow-lg">
            {/* Enhanced Header */}
            <div className="modal-header bg-gradient bg-primary text-white">
              <h5 className="modal-title fw-bold">
                <i className="bi bi-person-badge me-2"></i>
                Worker Call Details
              </h5>
              <button 
                type="button" 
                className="btn-close btn-close-white" 
                onClick={confirmClose}
              ></button>
            </div>

            <div className="modal-body p-0">
              {/* Enhanced Tabs */}
              <ul className="nav nav-tabs nav-justified bg-light">
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === "basic" ? "active bg-white border-primary" : "text-dark"}`}
                    onClick={() => setActiveTab("basic")}
                  >
                    <i className="bi bi-person me-2"></i>
                    Basic Info
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === "skills" ? "active bg-white border-primary" : "text-dark"}`}
                    onClick={() => setActiveTab("skills")}
                  >
                    <i className="bi bi-tools me-2"></i>
                    Skills Info
                  </button>
                </li>
              </ul>

              <div className="tab-content p-4 bg-white">
                {/* Basic Info Tab */}
                {activeTab === "basic" && (
                  <div className="fade show">
                    <div className="row g-3">
                      {/* Mobile */}
                      <div className="col-md-6">
                        <div className="form-group">
                          <label className="form-label fw-semibold text-dark">
                            <i className="bi bi-phone me-2"></i>Mobile
                          </label>
                          <input
                            type="text"
                            name="mobileNo"
                            value={localWorker.mobileNo || ""}
                            disabled
                            className="form-control border-secondary bg-light"
                          />
                        </div>
                      </div>
                      
                      {/* Name */}
                      <div className="col-md-6">
                        <div className="form-group">
                          <label className="form-label fw-semibold text-dark">
                            <i className="bi bi-person me-2"></i>Name
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
                            <p className="form-control-plaintext border rounded p-2 bg-light">{localWorker.name || "—"}</p>
                          )}
                        </div>
                      </div>

                      {/* Gender */}
                      <div className="col-md-6">
                        <div className="form-group">
                          <label className="form-label fw-semibold text-dark">
                            <i className="bi bi-gender-ambiguous me-2"></i>Gender
                          </label>
                          {isEditMode ? (
                            <div className="d-flex gap-4">
                              {["Male", "Female", "Others"].map((g) => (
                                <div key={g} className="form-check">
                                  <input
                                    type="radio"
                                    name="gender"
                                    value={g}
                                    checked={localWorker.gender === g}
                                    onChange={handleChange}
                                    className="form-check-input"
                                    id={`gender-${g}`}
                                  />
                                  <label className="form-check-label" htmlFor={`gender-${g}`}>
                                    {g}
                                  </label>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className={`badge ${localWorker.gender === "Male" ? "bg-primary" : localWorker.gender === "Female" ? "bg-danger" : "bg-secondary"} fs-6 p-2`}>
                              {localWorker.gender || "—"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Location */}
                      <div className="col-md-6">
                        <div className="form-group">
                          <label className="form-label fw-semibold text-dark">
                            <i className="bi bi-geo-alt me-2"></i>Location
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
                            <p className="form-control-plaintext border rounded p-2 bg-light">{localWorker.location || "—"}</p>
                          )}
                        </div>
                      </div>

                      {/* Source */}
                      <div className="col-md-6">
                        <div className="form-group">
                          <label className="form-label fw-semibold text-dark">
                            <i className="bi bi-source me-2"></i>Source
                          </label>
                          {isEditMode ? (
                            <select
                              name="source"
                              value={localWorker.source || ""}
                              onChange={handleChange}
                              className="form-select border-primary"
                            >
                              <option value="">Select Source</option>
                              {sourceOptions.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          ) : (
                            <span className="badge bg-info text-dark fs-6 p-2">{localWorker.source || "—"}</span>
                          )}
                        </div>
                      </div>

                      {/* Marital Status */}
                      <div className="col-md-6">
                        <div className="form-group">
                          <label className="form-label fw-semibold text-dark">
                            <i className="bi bi-heart me-2"></i>Marital Status
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
                            <span className="badge bg-secondary fs-6 p-2">{localWorker.maritalStatus || "—"}</span>
                          )}
                        </div>
                      </div>

                      {/* Age */}
                      <div className="col-md-4">
                        <div className="form-group">
                          <label className="form-label fw-semibold text-dark">
                            <i className="bi bi-calendar me-2"></i>Age
                          </label>
                          {isEditMode ? (
                            <input
                              type="tel"
                              maxLength={2}
                              name="age"
                              value={localWorker.age || ""}
                              onChange={handleChange}
                              className="form-control border-primary text-center"
                              min="10"
                              max="80"
                              placeholder="Age"
                            />
                          ) : (
                            <p className="form-control-plaintext border rounded p-2 bg-light text-center">{localWorker.age || "—"}</p>
                          )}
                        </div>
                      </div>

                      {/* Experience */}
                      <div className="col-md-4">
                        <div className="form-group">
                          <label className="form-label fw-semibold text-dark">
                            <i className="bi bi-briefcase me-2"></i>Experience
                          </label>
                          {isEditMode ? (
                            <select
                              name="experience"
                              value={localWorker.experience || "No"}
                              onChange={handleChange}
                              className="form-select border-primary"
                            >
                              <option value="No">No</option>
                              <option value="Yes">Yes</option>
                            </select>
                          ) : (
                            <span className={`badge ${localWorker.experience === "Yes" ? "bg-success" : "bg-secondary"} fs-6 p-2`}>
                              {localWorker.experience || "No"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Years */}
                      <div className="col-md-4">
                        <div className="form-group">
                          <label className="form-label fw-semibold text-dark">
                            <i className="bi bi-clock me-2"></i>Years
                          </label>
                          {isEditMode ? (
                            <input
                              type="tel"
                              maxLength={2}
                              name="years"
                              value={localWorker.years || ""}
                              onChange={handleChange}
                              className="form-control border-primary text-center"
                              min="0"
                              max="50"
                              placeholder="Years"
                            />
                          ) : (
                            <p className="form-control-plaintext border rounded p-2 bg-light text-center">{localWorker.years || "—"}</p>
                          )}
                        </div>
                      </div>

                      {/* Recent Comment */}
                      <div className="col-12">
                        <div className="form-group">
                          <label className="form-label fw-semibold text-dark">
                            <i className="bi bi-chat-text me-2"></i>Recent Comment
                          </label>
                          {isEditMode ? (
                            <textarea
                              name="comment"
                              value={localWorker.comment || ""}
                              onChange={handleChange}
                              className="form-control border-primary"
                              rows="2"
                              placeholder="Add recent comment..."
                            />
                          ) : (
                            <p className="form-control-plaintext border rounded p-2 bg-light">{localWorker.comment || "—"}</p>
                          )}
                        </div>
                      </div>

                      {/* Conversation Level */}
                      <div className="col-md-6">
                        <div className="form-group">
                          <label className="form-label fw-semibold text-dark">
                            <i className="bi bi-megaphone me-2"></i>Conversation Level
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
                              className={`badge ${
                                localWorker.conversationLevel === "Very Good" ? "bg-success" :
                                localWorker.conversationLevel === "Good" ? "bg-primary" :
                                localWorker.conversationLevel === "Average" ? "bg-warning" :
                                "bg-danger"
                              } fs-6 p-2`}
                            >
                              {localWorker.conversationLevel || "N/A"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Reminder Date */}
                      <div className="col-md-6">
                        <div className="form-group">
                          <label className="form-label fw-semibold text-dark">
                            <i className="bi bi-alarm me-2"></i>Reminder Date
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
                            <p className="form-control-plaintext border rounded p-2 bg-light">
                              {localWorker.callReminderDate
                                ? new Date(localWorker.callReminderDate).toLocaleDateString("en-GB")
                                : "—"}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Comments Section */}
                    <div className="mt-4 p-3 border rounded bg-light">
                      <h6 className="fw-bold text-dark mb-3">
                        <i className="bi bi-chat-left-text me-2"></i>Comments
                      </h6>
                      
                      {/* Comments List */}
                      <div className="mb-3" style={{ maxHeight: "200px", overflowY: "auto" }}>
                        {comments.length > 0 ? (
                          comments.map((c, idx) => (
                            <div key={idx} className=" mb-2 border-0 bg-white shadow-sm">
                              <div className="card-body p-3">
                                <div className="text-dark mb-2">{c.text}</div>
                                <div className="d-flex justify-content-between align-items-center">
                                  <small className="small-text">Commented By: {c.user}</small>
                                  <small className="small-text">{formatCommentDate(c.date)}</small>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-muted py-3">
                            <i className="bi bi-chat-square-text display-6"></i>
                            <p className="mt-2">No comments yet</p>
                          </div>
                        )}
                      </div>

                      {/* Add Comment */}
                      <div className="border-top pt-3">
                        <textarea
                          className="form-control border-primary"
                          rows="3"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add a new comment..."
                        />
                        <button
                          className="btn btn-primary mt-2"
                          onClick={handleAddComment}
                          disabled={!newComment.trim()}
                        >
                          <i className="bi bi-plus-circle me-2"></i>
                          Add Comment
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Skills Info Tab */}
                {activeTab === "skills" && (
                  <div className="fade show">
                    <div className="row g-3">
                      {/* Education */}
                      <div className="col-md-4">
                        <div className="form-group">
                          <label className="form-label fw-semibold text-dark">
                            <i className="bi bi-mortarboard me-2"></i>Education
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
                            <p className="form-control-plaintext border rounded p-2 bg-light">{localWorker.education || "—"}</p>
                          )}
                        </div>
                      </div>

                      {/* Working Hours */}
                      <div className="col-md-4">
                        <div className="form-group">
                          <label className="form-label fw-semibold text-dark">
                            <i className="bi bi-clock me-2"></i>Working Hours
                          </label>
                          {isEditMode ? (
                            <select
                              name="workingHours"
                              value={localWorker.workingHours || ""}
                              onChange={handleChange}
                              className="form-select border-primary"
                            >
                              <option value="">Select Hours</option>
                              <option value="12">12 Hours</option>
                              <option value="24">24 Hours</option>
                            </select>
                          ) : (
                            <span className="badge bg-info text-dark fs-6 p-2">
                              {localWorker.workingHours ? `${localWorker.workingHours} Hours` : "—"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Languages - Enhanced with Searchable Dropdown */}
                      <div className="col-md-4">
                        <div className="form-group">
                          <label className="form-label fw-semibold text-dark">
                            <i className="bi bi-translate me-2"></i>Languages
                          </label>
                          
                          {isEditMode && (
                            <div className="position-relative">
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
                          
                          {/* Language Tags */}
                          <div className="d-flex flex-wrap gap-2 mt-2">
                            {normalizeArray(localWorker.languages).map((lang, idx) => (
                              <span key={idx} className="badge bg-success d-flex align-items-center">
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

                    {/* Skills Sections */}
                    <div className="row mt-4">
                      {/* Skills */}
                      <div className="col-12">
                        <div className=" border-0 shadow-sm">
                          <div className="card-header bg-primary text-white p-2">
                            <h6 className="mb-0">
                              <i className="bi bi-tools me-2"></i>Skills
                            </h6>
                          </div>
                          <div className="card-body">
                            {isEditMode ? (
                              <>
                                <div className="border rounded p-3 bg-light" style={{ maxHeight: "160px", overflowY: "auto" }}>
                                  {homeCareSkillOptions.map(opt => (
                                    <div key={opt} className="form-check form-check-inline me-3 mb-2">
                                      <input
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={normalizeArray(localWorker.skills).map(x => String(x).toLowerCase()).includes(String(opt).toLowerCase())}
                                        onChange={() => handleMultiToggle('skills', opt)}
                                        id={`skill-${opt}`}
                                      />
                                      <label className="form-check-label" htmlFor={`skill-${opt}`}>
                                        {opt}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                                <div className="input-group mt-3">
                                  <input id="custom-skills" type="text" className="form-control border-primary" placeholder="Add custom skill" />
                                  <button type="button" className="btn btn-outline-primary" onClick={() => handleAddCustom('skills', 'custom-skills')}>
                                    <i className="bi bi-plus-circle me-2"></i>Add
                                  </button>
                                </div>
                              </>
                            ) : null}
                            
                            <div className="d-flex flex-wrap gap-2 p-2">
                              {normalizeArray(localWorker.skills).map((skill, idx) => (
                                <span key={idx} className="badge bg-info text-dark d-flex align-items-center">
                                  {skill}
                                  {isEditMode && (
                                    <button
                                      type="button"
                                      className="btn-close btn-close-white ms-2"
                                      onClick={() => handleTagRemove("skills", idx)}
                                      style={{ fontSize: "0.7rem" }}
                                    ></button>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Home Care Skills */}
                      <div className="col-12 mt-3">
                        <div className=" border-0 shadow-sm">
                          <div className="card-header bg-success text-white p-2">
                            <h6 className="mb-0">
                              <i className="bi bi-house-heart me-2"></i>Home Care Skills
                            </h6>
                          </div>
                          <div className="card-body">
                            {isEditMode ? (
                              <>
                                <div className="border rounded p-3 bg-light" style={{ maxHeight: "160px", overflowY: "auto" }}>
                                  {homeCareSkillOptions.map(opt => (
                                    <div key={opt} className="form-check form-check-inline me-3 mb-2">
                                      <input
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={normalizeArray(localWorker.homeCareSkills).map(x => String(x).toLowerCase()).includes(String(opt).toLowerCase())}
                                        onChange={() => handleMultiToggle('homeCareSkills', opt)}
                                        id={`homecare-${opt}`}
                                      />
                                      <label className="form-check-label" htmlFor={`homecare-${opt}`}>
                                        {opt}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                                <div className="input-group mt-3">
                                  <input id="custom-homeCareSkills" type="text" className="form-control border-primary" placeholder="Add custom home care skill" />
                                  <button type="button" className="btn btn-outline-success" onClick={() => handleAddCustom('homeCareSkills', 'custom-homeCareSkills')}>
                                    <i className="bi bi-plus-circle me-2"></i>Add
                                  </button>
                                </div>
                              </>
                            ) : null}
                            
                            <div className="d-flex flex-wrap gap-2 p-2">
                              {normalizeArray(localWorker.homeCareSkills).map((skill, idx) => (
                                <span key={idx} className="badge bg-success text-white d-flex align-items-center">
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
                        </div>
                      </div>

                      {/* Other Skills */}
                      <div className="col-12 mt-3">
                        <div className=" border-0 shadow-sm">
                          <div className="card-header bg-warning text-dark p-2">
                            <h6 className="mb-0">
                              <i className="bi bi-briefcase me-2"></i>Other Skills
                            </h6>
                          </div>
                          <div className="card-body">
                            {isEditMode ? (
                              <>
                                <div className="border rounded p-3 bg-light" style={{ maxHeight: "160px", overflowY: "auto" }}>
                                  {otherSkillOptions.map(opt => (
                                    <div key={opt} className="form-check form-check-inline me-3 mb-2">
                                      <input
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={normalizeArray(localWorker.otherSkills).map(x => String(x).toLowerCase()).includes(String(opt).toLowerCase())}
                                        onChange={() => handleMultiToggle('otherSkills', opt)}
                                        id={`other-${opt}`}
                                      />
                                      <label className="form-check-label" htmlFor={`other-${opt}`}>
                                        {opt}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                                <div className="input-group mt-3">
                                  <input id="custom-otherSkills" type="text" className="form-control border-primary" placeholder="Add custom other skill" />
                                  <button type="button" className="btn btn-outline-warning" onClick={() => handleAddCustom('otherSkills', 'custom-otherSkills')}>
                                    <i className="bi bi-plus-circle me-2"></i>Add
                                  </button>
                                </div>
                              </>
                            ) : null}
                            
                            <div className="d-flex flex-wrap gap-2 p-2">
                              {normalizeArray(localWorker.otherSkills).map((skill, idx) => (
                                <span key={idx} className="badge bg-warning text-dark d-flex align-items-center">
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
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Footer */}
            <div className="modal-footer bg-light">
              {isEditMode && (
                <button className="btn btn-success px-4" onClick={handleSave}>
                  <i className="bi bi-check-circle me-2"></i>
                  Save Changes
                </button>
              )}
              <button className="btn btn-secondary px-4" onClick={confirmClose}>
                <i className="bi bi-x-circle me-2"></i>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Save Success Modal */}
      {showSaveModal && (
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">
                  <i className="bi bi-check-circle-fill me-2"></i>
                  Saved Successfully
                </h5>
              </div>
              <div className="modal-body text-center py-4">
                <i className="bi bi-check-circle text-success display-4"></i>
                <p className="mt-3 mb-0">
                  Worker <strong className="text-success">{worker.name}</strong> details have been updated.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-success"
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
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-warning text-dark">
                <h5 className="modal-title">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Unsaved Changes
                </h5>
              </div>
              <div className="modal-body text-center py-4">
                <i className="bi bi-exclamation-circle text-warning display-4"></i>
                <p className="mt-3">You have unsaved changes. Are you sure you want to close?</p>
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
    </>
  );
}