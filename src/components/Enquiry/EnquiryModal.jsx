// src/components/Enquiries/EnquiryModal.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import firebaseDB from "../../firebase";

const MAX_COMMENT_LEN = 500;

/* ---------- helpers ---------- */
const toDateStr = (iso) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "" : d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return "";
  }
};

/** Normalize raw comments to [{text, date, id, user}] */
const normalizeComments = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((c, i) => {
        if (!c) return null;
        if (typeof c === "string") {
          return {
            text: c,
            date: new Date().toISOString(),
            id: Date.now() + i,
            user: "System"
          };
        }
        if (typeof c === "object") {
          const text = c.text ?? c.message ?? "";
          const date = c.date ?? c.ts ?? new Date().toISOString();
          const id = c.id ?? Date.now() + i;
          const user = c.user ?? c.userName ?? c.by ?? "System";
          return text ? { text, date, id, user } : null;
        }
        return null;
      })
      .filter(Boolean);
  }
  if (typeof raw === "object") {
    return Object.keys(raw)
      .sort()
      .map((k, i) => raw[k])
      .map((v, i) => {
        if (!v) return null;
        if (typeof v === "string") {
          return {
            text: v,
            date: new Date().toISOString(),
            id: Date.now() + i,
            user: "System"
          };
        }
        if (typeof v === "object") {
          const text = v.text ?? v.message ?? "";
          const date = v.date ?? v.ts ?? new Date().toISOString();
          const id = v.id ?? Date.now() + i;
          const user = v.user ?? v.userName ?? v.by ?? "System";
          return text ? { text, date, id, user } : null;
        }
        return null;
      })
      .filter(Boolean);
  }
  if (typeof raw === "string") return [{
    text: raw,
    date: new Date().toISOString(),
    id: Date.now(),
    user: "System"
  }];
  return [];
};

export default function EnquiryModal({
  show,
  onClose,
  enquiry,
  mode = "view",
  currentUser,
  onSaveSuccess,
}) {
  const [formData, setFormData] = useState(enquiry || {});
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [localMode, setLocalMode] = useState(mode);
  useEffect(() => setLocalMode(mode), [mode, show]);

  const listRef = useRef(null);

  /* hydrate */
  useEffect(() => {
    if (enquiry) {
      setFormData(enquiry);
      setComments(normalizeComments(enquiry.comments));
      setIsDirty(false);
    }
  }, [enquiry]);

  /* auto-scroll comments list */
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [comments]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  /* Add comment (prepend) */
  const addComment = () => {
    const text = (newComment || "").trim();
    if (!text) return;
    const entry = {
      text,
      date: new Date().toISOString(),
      id: Date.now(),
      user: currentUser?.name || currentUser?.displayName || "Unknown User"
    };
    setComments((prev) => [entry, ...prev]);
    setNewComment("");
    setIsDirty(true);
  };

  /* Save */
  const handleSave = async () => {
    if (!formData?.id) return;
    setIsSaving(true);
    try {
      await firebaseDB.child(`EnquiryData/${formData.id}`).update({
        ...formData,
        comments,
      });
      setShowThankYou(true);
      setIsDirty(false);
      setLocalMode("view");
      onSaveSuccess && onSaveSuccess();
      setTimeout(() => {
        setShowThankYou(false);
        onClose && onClose();
      }, 1200);
    } catch (err) {
      console.error("Error saving enquiry:", err);
      alert("Error saving enquiry. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isDirty) setShowUnsavedConfirm(true);
    else onClose && onClose();
  };

  const commentLeft = Math.max(0, MAX_COMMENT_LEN - newComment.length);

  const badgeForStatus = useMemo(() => {
    const s = String(formData.status || "").toLowerCase();
    if (s.includes("on boarding")) return "bg-info text-dark";
    if (s.includes("pending")) return "bg-warning text-dark";
    if (s.includes("no response")) return "bg-secondary";
    if (s.includes("enquiry")) return "bg-primary";
    return "bg-light text-dark";
  }, [formData.status]);

  if (!show) return null;

  return (
    <>
      {/* Main Enquiry Modal */}
      <div className="modal fade show d-block enquiry-modal" tabIndex="-1" style={{ background: "rgba(0,0,0,0.6)" }}>
        <div className="modal-dialog modal-xl modal-dialog-centered">
          <div className="modal-content shadow-lg border-0" style={{ borderRadius: "16px" }}>
            {/* Header */}
            <div className="modal-header bg-gradient-primary text-white" style={{
              borderTopLeftRadius: "16px",
              borderTopRightRadius: "16px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            }}>
              <div className="d-flex align-items-center gap-3">
                <div>
                  <h5 className="modal-title mb-0 fw-bold">{localMode === "edit" ? "✏️ Edit Enquiry" : "👁️ View Enquiry"}</h5>
                  {formData?.status && (
                    <span className={`badge mt-2 fw-normal ${badgeForStatus}`} style={{ fontSize: "0.75rem" }}>
                      {formData.status}
                    </span>
                  )}
                </div>
              </div>
              <button type="button" className="btn-close btn-close-white" onClick={handleClose}></button>
            </div>

            {/* Body */}
            <div className="modal-body p-4">
              {/* Edit toggle in view mode */}
              {localMode === "view" && (
                <div className="d-flex justify-content-end mb-3">
                  <button
                    className="btn btn-outline-warning btn-sm fw-semibold d-flex align-items-center gap-2"
                    title="Switch to Edit"
                    onClick={(e) => { e.stopPropagation(); setLocalMode("edit"); }}
                  >
                    <i className="fas fa-edit"></i>
                    Edit Enquiry
                  </button>
                </div>
              )}

              {/* Name / Mobile */}
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                  <h6 className="card-title text-primary mb-3 fw-semibold">
                    <i className="fas fa-user me-2"></i>Contact Information
                  </h6>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Name</label>
                      <input type="text" name="name" className="form-control form-control-lg" value={formData.name || ""} disabled />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Mobile</label>
                      <div className="input-group input-group-lg">
                        <span className="input-group-text bg-light">+91</span>
                        <input type="text" name="mobile" className="form-control" value={formData.mobile || ""} disabled />
                        {formData.mobile && (
                          <>
                            <a className="btn btn-outline-primary" href={`tel:${formData.mobile}`} title="Call">
                              <i className="fas fa-phone"></i>
                            </a>
                            <a
                              className="btn btn-outline-success"
                              href={`https://wa.me/${String(formData.mobile).replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="WhatsApp"
                            >
                              <i className="fab fa-whatsapp"></i>
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service / Amount */}
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                  <h6 className="card-title text-primary mb-3 fw-semibold">
                    <i className="fas fa-concierge-bell me-2"></i>Service Details
                  </h6>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Service Type</label>
                      <input
                        type="text"
                        name="service"
                        className="form-control"
                        value={formData.service || ""}
                        onChange={handleChange}
                        disabled={localMode === "view"}
                        placeholder="e.g., Old Age Care"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Amount</label>
                      <div className="input-group">
                        <span className="input-group-text bg-light">₹</span>
                        <input
                          type="number"
                          name="amount"
                          className="form-control"
                          value={formData.amount || ""}
                          onChange={handleChange}
                          disabled={localMode === "view"}
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Care Recipient Details */}
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                  <h6 className="card-title text-primary mb-3 fw-semibold">
                    <i className="fas fa-user-injured me-2"></i>Care Recipient Details
                  </h6>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Care Recipient Name</label>
                      <input
                        type="text"
                        name="careRecipientName"
                        className="form-control"
                        value={formData.careRecipientName || ""}
                        onChange={handleChange}
                        disabled={localMode === "view"}
                        placeholder="Enter care recipient name"
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Age</label>
                      <input
                        type="number"
                        name="age"
                        className="form-control"
                        value={formData.age || ""}
                        onChange={handleChange}
                        disabled={localMode === "view"}
                        placeholder="Age"
                        min="0"
                        max="120"
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Weight</label>
                      <div className="input-group">
                        <input
                          type="number"
                          name="weight"
                          className="form-control"
                          value={formData.weight || ""}
                          onChange={handleChange}
                          disabled={localMode === "view"}
                          placeholder="Weight"
                          min="0"
                          step="0.1"
                        />
                        <span className="input-group-text bg-light">kg</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location & Service Period */}
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                  <h6 className="card-title text-primary mb-3 fw-semibold">
                    <i className="fas fa-map-marker-alt me-2"></i>Location & Duration
                  </h6>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Location</label>
                      <input
                        type="text"
                        name="location"
                        className="form-control"
                        value={formData.location || ""}
                        onChange={handleChange}
                        disabled={localMode === "view"}
                        placeholder="Enter location"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Service Required Period</label>
                      <input
                        type="text"
                        name="serviceRequiredPeriod"
                        className="form-control"
                        value={formData.serviceRequiredPeriod || ""}
                        onChange={handleChange}
                        disabled={localMode === "view"}
                        placeholder="e.g., 1 month, 15 days, etc."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Status / Through / Communication / Reminder */}
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                  <h6 className="card-title text-primary mb-3 fw-semibold">
                    <i className="fas fa-cogs me-2"></i>Enquiry Management
                  </h6>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Status</label>
                      <select
                        name="status"
                        className="form-select"
                        value={formData.status || ""}
                        onChange={handleChange}
                        disabled={localMode === "view"}
                      >
                        <option value="">Select Status</option>
                        <option value="Enquiry">Enquiry</option>
                        <option value="Pending">Pending</option>
                        <option value="On Boarding">On Boarding</option>
                        <option value="No Response">No Response</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Through</label>
                      <select
                        name="through"
                        className="form-select"
                        value={formData.through || ""}
                        onChange={handleChange}
                        disabled
                      >
                        <option value="">Select Source</option>
                        <option value="Poster">Poster</option>
                        <option value="Reference">Reference</option>
                        <option value="Hospital-Agent">Hospital-Agent</option>
                        <option value="Medical Cover">Medical Cover</option>
                        <option value="JustDial">JustDial</option>
                        <option value="Facebook">Facebook</option>
                        <option value="Instagram">Instagram</option>
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="YouTube">YouTube</option>
                        <option value="Website">Website</option>
                        <option value="Google">Google</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Communication</label>
                      <select
                        name="communication"
                        className="form-select"
                        value={formData.communication || ""}
                        onChange={handleChange}
                        disabled={localMode === "view"}
                      >
                        <option value="">Select Communication</option>
                        <option value="Very Good">Very Good</option>
                        <option value="Good">Good</option>
                        <option value="Average">Average</option>
                        <option value="Below Average">Below Average</option>
                        <option value="Bad">Bad</option>
                        <option value="Very Bad">Very Bad</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Reminder Date</label>
                      <input
                        type="date"
                        name="reminderDate"
                        className="form-control"
                        value={formData.reminderDate || ""}
                        onChange={handleChange}
                        disabled={localMode === "view"}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments Section */}
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  {/* Comments History */}
                  <div>
                    {comments && comments.length > 0 ? (
                      <div
                        ref={listRef}
                        className="mt-2"
                        style={{ maxHeight: 280, overflowY: "auto" }}
                      >
                        {comments.map((c) => (
                          <div key={c.id || c.date} className="p-3 border-bottom bg-white">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <span className="text-primary small">
                                <i className="fas fa-user me-1"></i>
                                By {c.user}
                              </span>
                              <small className="text-muted">
                                <i className="fas fa-clock me-1"></i>
                                {toDateStr(c.date)}
                              </small>
                            </div>
                            <p className="mb-0 text-dark" style={{ lineHeight: "1.5" }}>
                              {c.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted">
                        <i className="fas fa-comment-slash fa-2x mb-2"></i>
                        <p className="mb-0">No comments added yet</p>
                      </div>
                    )}
                  </div>

                  <h6 className="card-title text-primary mb-3 fw-semibold">
                    <i className="fas fa-comments me-2"></i>Comments & Notes
                  </h6>

                  {/* Add new comment */}
                  {localMode === "edit" && (
                    <div className="mb-4 p-3 bg-light rounded">
                      <label className="form-label fw-semibold">Add New Comment</label>
                      <textarea
                        className="form-control"
                        placeholder="Type your comment here..."
                        rows={3}
                        value={newComment}
                        maxLength={MAX_COMMENT_LEN}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            addComment();
                          }
                        }}
                        style={{ resize: "none" }}
                      />
                      <div className="d-flex justify-content-between align-items-center mt-2">
                        <small className={commentLeft < 30 ? "text-danger fw-semibold" : "text-muted"}>
                          {commentLeft} characters left
                        </small>
                        <button
                          className="btn btn-warning btn-sm fw-semibold d-flex align-items-center gap-2"
                          onClick={addComment}
                          disabled={!newComment.trim()}
                        >
                          <i className="fas fa-plus"></i>
                          Add Comment
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer bg-light" style={{ borderBottomLeftRadius: "16px", borderBottomRightRadius: "16px" }}>
              {localMode === "edit" && (
                <button className="btn btn-success fw-semibold px-4 d-flex align-items-center gap-2" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save"></i>
                      Save Changes
                    </>
                  )}
                </button>
              )}
              <button className="btn btn-secondary fw-semibold px-4 d-flex align-items-center gap-2" onClick={handleClose}>
                <i className="fas fa-times"></i>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Thank You Modal */}
      {showThankYou && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow" style={{ borderRadius: "16px" }}>
              <div className="modal-header bg-success text-white" style={{ borderTopLeftRadius: "16px", borderTopRightRadius: "16px" }}>
                <h5 className="modal-title mb-0 fw-bold">
                  <i className="fas fa-check-circle me-2"></i>
                  Success
                </h5>
              </div>
              <div className="modal-body text-center py-4">
                <div className="mb-3">
                  <i className="fas fa-check-circle text-success" style={{ fontSize: "3rem" }}></i>
                </div>
                <h5 className="mb-2 fw-bold">Enquiry Updated Successfully!</h5>
                <p className="text-muted mb-0">
                  Enquiry for <strong className="text-dark">{formData.name}</strong>
                  ({formData.mobile}) has been updated.
                </p>
              </div>
              <div className="modal-footer justify-content-center bg-light" style={{ borderBottomLeftRadius: "16px", borderBottomRightRadius: "16px" }}>
                <button
                  className="btn btn-success fw-semibold px-4"
                  onClick={() => {
                    setShowThankYou(false);
                    onClose && onClose();
                  }}
                >
                  <i className="fas fa-thumbs-up me-2"></i>
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Confirmation Modal */}
      {showUnsavedConfirm && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow" style={{ borderRadius: "16px" }}>
              <div className="modal-header bg-warning" style={{ borderTopLeftRadius: "16px", borderTopRightRadius: "16px" }}>
                <h5 className="modal-title mb-0 fw-bold">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  Unsaved Changes
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowUnsavedConfirm(false)} />
              </div>
              <div className="modal-body py-4">
                <div className="text-center mb-3">
                  <i className="fas fa-exclamation-circle text-warning" style={{ fontSize: "2.5rem" }}></i>
                </div>
                <p className="mb-1 text-center fw-semibold">You have unsaved changes. Are you sure you want to close?</p>
                <small className="text-muted text-center d-block">All changes will be lost.</small>
              </div>
              <div className="modal-footer justify-content-center bg-light" style={{ borderBottomLeftRadius: "16px", borderBottomRightRadius: "16px" }}>
                <button className="btn btn-secondary fw-semibold px-4" onClick={() => setShowUnsavedConfirm(false)}>
                  <i className="fas fa-arrow-left me-2"></i>
                  Cancel
                </button>
                <button
                  className="btn btn-danger fw-semibold px-4"
                  onClick={() => {
                    setShowUnsavedConfirm(false);
                    onClose && onClose();
                  }}
                >
                  <i className="fas fa-trash me-2"></i>
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