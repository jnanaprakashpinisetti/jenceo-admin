import React, { useState } from "react";
import firebaseDB from "../../firebase";

export default function WorkerCallModal({ worker, isOpen, onClose, isEditMode }) {
  const [activeTab, setActiveTab] = useState("basic");
  const [localWorker, setLocalWorker] = useState({ ...worker });
  const [comments, setComments] = useState(worker.comments || []);
  const [newComment, setNewComment] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLocalWorker({ ...localWorker, [name]: value });
  };

  const handleSave = async () => {
    await firebaseDB.child(`WorkerCallData/${worker.id}`).update(localWorker);
    setShowSaveModal(true);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    const commentObj = {
      text: newComment,
      date: new Date().toISOString(),
      user: "Admin",
    };
    const updated = [commentObj, ...comments];
    setComments(updated);
    setNewComment("");
    await firebaseDB.child(`WorkerCallData/${worker.id}/comments`).set(updated);
  };

  // 🔹 Normalize strings or arrays into arrays
  const normalizeArray = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === "string") return val.split(",").map((s) => s.trim());
    return [];
  };

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: "block", background: "rgba(0,0,0,0.6)" }}
      >
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header bg-dark text-white">
              <h5 className="modal-title">Worker Details</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
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
                    {/* Name */}
                    <div className="mb-2">
                      <label className="form-label">Name</label>
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

                    {/* Location */}
                    <div className="mb-2">
                      <label className="form-label">Location</label>
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

                    {/* Gender */}
                    <div className="mb-2">
                      <label className="form-label">Gender</label>
                      {isEditMode ? (
                        <select
                          name="gender"
                          value={localWorker.gender || ""}
                          onChange={handleChange}
                          className="form-select"
                        >
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Others">Others</option>
                        </select>
                      ) : (
                        <p>{localWorker.gender}</p>
                      )}
                    </div>

                    {/* Mobile (always disabled) */}
                    <div className="mb-2">
                      <label className="form-label">Mobile</label>
                      <input
                        type="text"
                        name="mobileNo"
                        value={localWorker.mobileNo || ""}
                        disabled
                        className="form-control"
                      />
                    </div>

                    {/* Comments */}
                    <h6 className="mt-3">Comments</h6>
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
                    {/* Education */}
                    <div className="mb-2">
                      <label className="form-label">Education</label>
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

                    {/* Working Hours */}
                    <div className="mb-2">
                      <label className="form-label">Working Hours</label>
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

                    {/* Languages */}
                    <div className="mb-2">
                      <label className="form-label">Languages</label>
                      {isEditMode ? (
                        <textarea
                          className="form-control"
                          rows="2"
                          value={normalizeArray(localWorker.languages).join(", ")}
                          onChange={(e) =>
                            setLocalWorker({
                              ...localWorker,
                              languages: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter((s) => s),
                            })
                          }
                        />
                      ) : (
                        <p>{normalizeArray(localWorker.languages).join(", ")}</p>
                      )}
                    </div>

                    {/* Skills */}
                    <div className="mb-2">
                      <label className="form-label">Skills</label>
                      {isEditMode ? (
                        <textarea
                          className="form-control"
                          rows="3"
                          value={normalizeArray(localWorker.skills).join(", ")}
                          onChange={(e) =>
                            setLocalWorker({
                              ...localWorker,
                              skills: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter((s) => s),
                            })
                          }
                        />
                      ) : (
                        <p>{normalizeArray(localWorker.skills).join(", ")}</p>
                      )}
                    </div>

                    {/* Reminder Date */}
                    <div className="mb-2">
                      <label className="form-label">Reminder Date</label>
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

                    {/* Conversation Level */}
                    <div className="mb-2">
                      <label className="form-label">Conversation Level</label>
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
                        <p>{localWorker.conversationLevel}</p>
                      )}
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
              <button className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal after Save */}
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
                  onClick={() => setShowSaveModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>Worker <strong>{worker.name}</strong> details have been updated.</p>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-success"
                  onClick={() => setShowSaveModal(false)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
