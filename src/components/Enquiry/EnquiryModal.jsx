// src/components/Enquiries/EnquiryModal.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import firebaseDB from "../../firebase";

const MAX_COMMENT_LEN = 500;

/* ---------- helpers ---------- */
const toDateStr = (iso) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "" : d.toLocaleString();
  } catch {
    return "";
  }
};

/** Normalize raw comments to [{text, date, id}] */
const normalizeComments = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((c, i) => {
        if (!c) return null;
        if (typeof c === "string") {
          return { text: c, date: new Date().toISOString(), id: Date.now() + i };
        }
        if (typeof c === "object") {
          const text = c.text ?? c.message ?? "";
          const date = c.date ?? c.ts ?? new Date().toISOString();
          const id = c.id ?? Date.now() + i;
          return text ? { text, date, id } : null;
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
          return { text: v, date: new Date().toISOString(), id: Date.now() + i };
        }
        if (typeof v === "object") {
          const text = v.text ?? v.message ?? "";
          const date = v.date ?? v.ts ?? new Date().toISOString();
          const id = v.id ?? Date.now() + i;
          return text ? { text, date, id } : null;
        }
        return null;
      })
      .filter(Boolean);
  }
  if (typeof raw === "string") return [{ text: raw, date: new Date().toISOString(), id: Date.now() }];
  return [];
};

export default function EnquiryModal({
  show,
  onClose,
  enquiry,
  mode = "view",          // "view" | "edit"
  currentUser,            // optional; not persisted per-comment
  onSaveSuccess,
}) {
  const [formData, setFormData] = useState(enquiry || {});
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // local edit/view toggle
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
    const entry = { text, date: new Date().toISOString(), id: Date.now() };
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
    if (s.includes("on boarding")) return "bg-info";
    if (s.includes("pending")) return "bg-warning";
    if (s.includes("no response")) return "bg-secondary";
    if (s.includes("enquiry")) return "bg-primary";
    return "bg-light text-dark";
  }, [formData.status]);

  if (!show) return null;

  return (
    <>
      {/* Main Enquiry Modal */}
      <div className="modal fade show d-block enquiry-modal" tabIndex="-1" style={{ background: "rgba(0,0,0,0.5)" }}>
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content shadow-lg border-0">
            {/* Header */}
            <div className="modal-header bg-primary text-white">
              <div>
                <h5 className="modal-title mb-0">{localMode === "edit" ? "Edit Enquiry" : "View Enquiry"}</h5>
                {formData?.status ? <span className={`badge mt-1 ${badgeForStatus}`}>{formData.status}</span> : null}
              </div>
              <button type="button" className="btn-close btn-close-white" onClick={handleClose}></button>
            </div>

            {/* Body */}
            <div className="modal-body">
              {/* Edit toggle in view mode */}
              {localMode === "view" && (
                <div className="d-flex justify-content-end mb-2">
                  <button
                    className="btn btn-sm btn-outline-warning"
                    title="Switch to Edit"
                    onClick={(e) => { e.stopPropagation(); setLocalMode("edit"); }}
                  >
                    ✏️ Edit
                  </button>
                </div>
              )}

              {/* Name / Mobile */}
              <div className="modal-card border-0 mb-3">
                <div className="modal-card-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Name</label>
                      <input type="text" name="name" className="form-control" value={formData.name || ""} disabled />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Mobile</label>
                      <div className="input-group">
                        <span className="input-group-text">+91</span>
                        <input type="text" name="mobile" className="form-control" value={formData.mobile || ""} disabled />
                        {formData.mobile && (
                          <>
                            <a className="btn btn-outline-primary" href={`tel:${formData.mobile}`} title="Call">Call</a>
                            <a
                              className="btn btn-outline-success"
                              href={`https://wa.me/${String(formData.mobile).replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="WhatsApp"
                            >
                              WAP
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service / Amount */}
              <div className="modal-card border-0 mb-3">
                <div className="modal-card-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Service</label>
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
                        <span className="input-group-text">₹</span>
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
              <div className="modal-card border-0 mb-3">
                <div className="modal-card-body">
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
                        <span className="input-group-text">kg</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location & Service Period */}
              <div className="modal-card border-0 mb-3">
                <div className="modal-card-body">
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
              <div className="modal-card border-0 mb-3">
                <div className="modal-card-body">
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

              {/* Comments */}
              <div className="modal-card border-0">
                  <h6 className="mb-0">Comments</h6>
                <div className="modal-card-body">
                  {/* Add new comment */}
                  {localMode === "edit" && (
                    <div className="mb-3">
                      <textarea
                        className="form-control"
                        placeholder="Add a comment"
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
                      />
                      <div className="d-flex justify-content-between align-items-center mt-2">
                        <small className={commentLeft < 30 ? "text-danger" : "text-muted"}>
                          {commentLeft} characters left
                        </small>
                        <button className="btn btn-sm btn-warning" onClick={addComment} disabled={!newComment.trim()}>
                          Add Comment
                        </button>
                      </div>
                    </div>
                  )}

                  {/* History (newest first) */}
                  {comments && comments.length > 0 ? (
                    <div ref={listRef} className="mt-2" style={{ maxHeight: 240, overflowY: "auto" }}>
                      {comments.map((c) => (
                        <div key={c.id || c.date} className="border-bottom pb-2 mb-2">
                          <p className="mb-0">{c.text}</p>
                          <small className="text-muted">{toDateStr(c.date)}</small>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted mb-0">No comments added</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer">
              {localMode === "edit" && (
                <button className="btn btn-success" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" />
                      Saving…
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              )}
              <button className="btn btn-secondary" onClick={handleClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Thank You */}
      {showThankYou && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title mb-0">Success</h5>
              </div>
              <div className="modal-body text-center">
                <h5 className="mb-1">Enquiry Updated Successfully!</h5>
                <p className="text-muted mb-0">
                  Enquiry for <strong>{formData.name}</strong> ({formData.mobile}) has been updated.
                </p>
              </div>
              <div className="modal-footer justify-content-center">
                <button
                  className="btn btn-success"
                  onClick={() => {
                    setShowThankYou(false);
                    onClose && onClose();
                  }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Confirmation */}
      {showUnsavedConfirm && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-warning">
                <h5 className="modal-title mb-0">Unsaved Changes</h5>
                <button type="button" className="btn-close" onClick={() => setShowUnsavedConfirm(false)} />
              </div>
              <div className="modal-body">
                <p className="mb-1">You have unsaved changes. Are you sure you want to close?</p>
                <small className="text-muted">All changes will be lost.</small>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowUnsavedConfirm(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    setShowUnsavedConfirm(false);
                    onClose && onClose();
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
