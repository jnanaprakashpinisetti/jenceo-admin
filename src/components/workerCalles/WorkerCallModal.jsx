import React, { useState, useEffect } from "react";
import firebaseDB from "../../firebase";

export default function WorkerCallModal({ worker, isOpen, onClose, isEditMode }) {
  const [activeTab, setActiveTab] = useState("basic");
  const [localWorker, setLocalWorker] = useState({ ...worker });
  const [comments, setComments] = useState(worker.comments || []);
  const [newComment, setNewComment] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [dirty, setDirty] = useState(false); // track unsaved edits
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLocalWorker({ ...localWorker, [name]: value });
    setDirty(true);
  };

  const handleSave = async () => {
    // Always normalize before saving
    const toSave = {
      ...localWorker,
      skills: normalizeArray(localWorker.skills),
      languages: normalizeArray(localWorker.languages),
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
      user: "Mounica",
    };
    const updated = [commentObj, ...comments];
    setComments(updated);
    setNewComment("");
    await firebaseDB.child(`WorkerCallData/${worker.id}/comments`).set(updated);
    setDirty(true);
  };

  // 🔹 Tag Input handler (skills & languages)
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

  const confirmClose = () => {
    if (dirty) {
      setShowUnsavedConfirm(true);
    } else {
      onClose();
    }
  };

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: "block", background: "rgba(0,0,0,0.6)" }}
      >
        <div className="modal-dialog modal-lg modal-dialog-centered weker-call-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Worker Details</h5>
              <button type="button" className="btn-close" onClick={confirmClose}></button>
            </div>

            <div className="modal-body">
              {/* Tabs */}
              <ul className="nav nav-tabs">
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === "basic" ? "active" : ""}`}
                    onClick={() => setActiveTab("basic")}
                  >
                    Basic Info
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === "skills" ? "active" : ""}`}
                    onClick={() => setActiveTab("skills")}
                  >
                    Skills Info
                  </button>
                </li>
              </ul>

              <div className="tab-content mt-3">
                {/* Basic Info Tab */}
                {activeTab === "basic" && (
                  <div>
                    <div className="row">
                      <div className="col-md-6">
                        {/* Mobile */}
                        <div className="mb-2">
                          <label className="form-label"><strong>Mobile</strong></label>
                          <input
                            type="text"
                            name="mobileNo"
                            value={localWorker.mobileNo || ""}
                            disabled
                            className="form-control"
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        {/* Name */}
                        <div className="mb-2">
                          <label className="form-label"><strong>Name</strong></label>
                          {isEditMode ? (
                            <input
                              type="text"
                              name="name"
                              value={localWorker.name || ""}
                              onChange={handleChange}
                              className="form-control"
                            />
                          ) : (
                            <p>{localWorker.name}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6">
                        {/* Gender */}
                        <div className="mb-2">
                          <label className="form-label"><strong>Gender</strong></label>
                          {isEditMode ? (
                            <div className="d-flex gap-3">
                              {["Male", "Female", "Others"].map((g) => (
                                <label key={g}>
                                  <input
                                    type="radio"
                                    name="gender"
                                    value={g}
                                    checked={localWorker.gender === g}
                                    onChange={handleChange}
                                  />{" "}
                                  {g}
                                </label>
                              ))}
                            </div>
                          ) : (
                            <p>{localWorker.gender}</p>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        {/* Location */}
                        <div className="mb-2">
                          <label className="form-label"><strong>Location</strong></label>
                          {isEditMode ? (
                            <input
                              type="text"
                              name="location"
                              value={localWorker.location || ""}
                              onChange={handleChange}
                              className="form-control"
                            />
                          ) : (
                            <p>{localWorker.location}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Comments */}
                    <h6 className="mt-3"><strong>Comments</strong></h6>
                    <ul className="list-group mb-2">
                      {comments.map((c, idx) => (
                        <li key={idx} className="list-group-item">
                          <div>{c.text}</div>
                          <small className="text-muted">
                            {c.user} – {new Date(c.date).toLocaleString()}
                          </small>
                        </li>
                      ))}
                    </ul>
                    <div className="mb-2">
                      <textarea
                        className="form-control"
                        rows="2"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                      />
                      <button
                        className="btn btn-sm btn-primary mt-2"
                        onClick={handleAddComment}
                      >
                        Add Comment
                      </button>
                    </div>
                  </div>
                )}

                {/* Skills Info Tab */}
                {activeTab === "skills" && (
                  <div>
                    <div className="row">
                      <div className="col-md-6">
                        {/* Education */}
                        <div className="mb-2">
                          <label className="form-label"><strong>Education</strong></label>
                          {isEditMode ? (
                            <input
                              type="text"
                              name="education"
                              value={localWorker.education || ""}
                              onChange={handleChange}
                              className="form-control"
                            />
                          ) : (
                            <p>{localWorker.education}</p>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        {/* Working Hours */}
                        <div className="mb-2">
                          <label className="form-label"><strong>Working Hours</strong></label>
                          {isEditMode ? (
                            <select
                              name="workingHours"
                              value={localWorker.workingHours || ""}
                              onChange={handleChange}
                              className="form-select"
                            >
                              <option value="">Select</option>
                              <option value="12">12 Hours</option>
                              <option value="24">24 Hours</option>
                            </select>
                          ) : (
                            <p>{localWorker.workingHours}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6">
                        {/* Languages */}
                        <div className="mb-2">
                          <label className="form-label"><strong>Languages</strong></label>
                          <div className="d-flex flex-wrap gap-2">
                            {normalizeArray(localWorker.languages).map((lang, idx) => (
                              <span key={idx} className="badge bg-secondary">
                                {lang}
                                {isEditMode && (
                                  <button
                                    type="button"
                                    className="btn-close btn-close-white ms-2"
                                    onClick={() => handleTagRemove("languages", idx)}
                                  ></button>
                                )}
                              </span>
                            ))}
                          </div>
                          {isEditMode && (
                            <input
                              type="text"
                              className="form-control mt-2"
                              placeholder="Add language"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleTagAdd("languages", e.target.value);
                                  e.target.value = "";
                                }
                              }}
                            />
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        {/* Skills */}
                        <div className="mb-2">
                          <label className="form-label"><strong>Skills</strong></label>
                          <div className="d-flex flex-wrap gap-2">
                            {normalizeArray(localWorker.skills).map((skill, idx) => (
                              <span key={idx} className="badge bg-info">
                                {skill}
                                {isEditMode && (
                                  <button
                                    type="button"
                                    className="btn-close btn-close-white ms-2"
                                    onClick={() => handleTagRemove("skills", idx)}
                                  ></button>
                                )}
                              </span>
                            ))}
                          </div>
                          {isEditMode && (
                            <input
                              type="text"
                              className="form-control mt-2"
                              placeholder="Add skill"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleTagAdd("skills", e.target.value);
                                  e.target.value = "";
                                }
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6">
                        {/* Conversation Level */}
                        <div className="mb-2">
                          <label className="form-label"><strong>Conversation Level</strong></label>
                          {isEditMode ? (
                            <select
                              name="conversationLevel"
                              value={localWorker.conversationLevel || ""}
                              onChange={handleChange}
                              className="form-select"
                            >
                              <option value="">Select</option>
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
                                localWorker.conversationLevel === "Very Good"
                                  ? "bg-success"
                                  : localWorker.conversationLevel === "Good"
                                  ? "bg-primary"
                                  : localWorker.conversationLevel === "Average"
                                  ? "bg-warning"
                                  : "bg-danger"
                              }`}
                            >
                              {localWorker.conversationLevel || "N/A"}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        {/* Reminder Date */}
                        <div className="mb-2">
                          <label className="form-label"><strong>Reminder Date</strong></label>
                          {isEditMode ? (
                            <input
                              type="date"
                              name="callReminderDate"
                              value={localWorker.callReminderDate || ""}
                              onChange={handleChange}
                              className="form-control"
                            />
                          ) : (
                            <p>
                              {localWorker.callReminderDate
                                ? new Date(localWorker.callReminderDate).toLocaleDateString("en-GB")
                                : "—"}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              {isEditMode && (
                <button className="btn btn-success me-2" onClick={handleSave}>
                  Save
                </button>
              )}
              <button className="btn btn-secondary" onClick={confirmClose}>
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
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Saved Successfully</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowSaveModal(false);
                    onClose();
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  Worker <strong>{worker.name}</strong> details have been updated.
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
            <div className="modal-content">
              <div className="modal-header bg-warning">
                <h5 className="modal-title">Unsaved Changes</h5>
              </div>
              <div className="modal-body">
                <p>You have unsaved changes. Are you sure you want to close?</p>
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
                  Discard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
