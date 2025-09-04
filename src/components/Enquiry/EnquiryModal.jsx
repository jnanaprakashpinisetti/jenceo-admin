// src/.../EnquiryModal.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import firebaseDB from "../../firebase"; // align with HospitalModal's default import

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

/** Normalize raw comments into HospitalModal shape: [{text, date, id}] */
const normalizeComments = (raw) => {
  if (!raw) return [];
  // Already array of objects?
  if (Array.isArray(raw)) {
    return raw
      .map((c) => {
        if (!c) return null;
        if (typeof c === "string") {
          return { text: c, date: new Date().toISOString(), id: Date.now() + Math.random() };
        }
        if (typeof c === "object") {
          // Accept previous EnquiryModal shapes too (text/author/ts)
          const text = c.text ?? c.message ?? String(c) ?? "";
          const date =
            c.date ??
            (c.ts ? new Date(c.ts).toISOString() : undefined) ??
            new Date().toISOString();
          const id = c.id ?? Date.now() + Math.random();
          return { text, date, id };
        }
        return { text: String(c), date: new Date().toISOString(), id: Date.now() + Math.random() };
      })
      .filter((x) => x && x.text);
  }

  // Firebase array-like object: { "0": {...}, "1": "...", ... }
  if (typeof raw === "object") {
    return Object.keys(raw)
      .sort()
      .map((k) => raw[k])
      .map((v) => {
        if (!v) return null;
        if (typeof v === "string") {
          return { text: v, date: new Date().toISOString(), id: Date.now() + Math.random() };
        }
        if (typeof v === "object") {
          const text = v.text ?? v.message ?? String(v) ?? "";
          const date =
            v.date ??
            (v.ts ? new Date(v.ts).toISOString() : undefined) ??
            new Date().toISOString();
          const id = v.id ?? Date.now() + Math.random();
          return { text, date, id };
        }
        return { text: String(v), date: new Date().toISOString(), id: Date.now() + Math.random() };
      })
      .filter((x) => x && x.text);
  }

  // Single string fallback
  if (typeof raw === "string") return [{ text: raw, date: new Date().toISOString(), id: Date.now() }];

  return [];
};

const EnquiryModal = ({
  show,
  onClose,
  enquiry,
  mode = "view",          // "view" | "edit"
  currentUser,            // not used for comments now (to match HospitalModal)
  onSaveSuccess,
}) => {
  const [formData, setFormData] = useState(enquiry || {});
  const [comments, setComments] = useState([]); // [{ text, date, id }]
  const [newComment, setNewComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const listRef = useRef(null);

  /* hydrate */
  useEffect(() => {
    if (enquiry) {
      setFormData(enquiry);
      setComments(normalizeComments(enquiry.comments));
    }
  }, [enquiry]);

  /* autoscroll on comments change */
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [comments]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  /* Add comment — same behavior as HospitalModal (prepend newest) */
  const addComment = () => {
    const text = (newComment || "").trim();
    if (!text) return;
    const entry = { text, date: new Date().toISOString(), id: Date.now() };
    setComments((prev) => [entry, ...prev]); // unshift/newest first
    setNewComment("");
    setIsDirty(true);
  };

  /* Save */
  const handleSave = async () => {
    if (!formData.id) return;
    setIsSaving(true);
    try {
      await firebaseDB.child(`EnquiryData/${formData.id}`).update({
        ...formData,
        comments, // store as [{ text, date, id }]
      });
      setShowThankYou(true);
      setIsDirty(false);
      onSaveSuccess && onSaveSuccess();
      setTimeout(() => {
        setShowThankYou(false);
        onClose();
      }, 1400);
    } catch (err) {
      console.error("Error saving enquiry:", err);
      alert("Error saving enquiry. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isDirty) setShowUnsavedConfirm(true);
    else onClose();
  };

  const commentLen = newComment.length;
  const commentLeft = Math.max(0, MAX_COMMENT_LEN - commentLen);

  const badgeForStatus = useMemo(() => {
    const s = (formData.status || "").toLowerCase();
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
                <h5 className="modal-title mb-0">{mode === "edit" ? "Edit Enquiry" : "View Enquiry"}</h5>
                {formData?.status ? <span className={`badge mt-1 ${badgeForStatus}`}>{formData.status}</span> : null}
              </div>
              <button type="button" className="btn-close btn-close-white" onClick={handleClose}></button>
            </div>

            {/* Body */}
            <div className="modal-body">
              {/* Name / Mobile */}
              <div className="modal-card border-0 mb-3">
                <div className="modal-card-body p-3">
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
                <div className="modal-card-body p-3">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Service</label>
                      <input
                        type="text"
                        name="service"
                        className="form-control"
                        value={formData.service || ""}
                        onChange={handleChange}
                        disabled={mode === "view"}
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
                          disabled={mode === "view"}
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status / Through / Communication / Reminder */}
              <div className="modal-card border-0 mb-3">
                <div className="modal-card-body p-3">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Status</label>
                      <select
                        name="status"
                        className="form-select"
                        value={formData.status || ""}
                        onChange={handleChange}
                        disabled={mode === "view"}
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
                        disabled={mode === "view"}
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
                        disabled={mode === "view"}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments — identical behavior and structure to HospitalModal */}
              <div className="modal-card border-0">
                <div className="modal-card-header bg-light">
                  <h6 className="mb-0">Comments</h6>
                </div>
                <div className="modal-card-body p-3">
                  {/* Input */}
                  {mode === "edit" && (
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
              {mode === "edit" && (
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
                    onClose();
                  }}
                >
                  Dismodal-card Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EnquiryModal;
