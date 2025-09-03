import React, { useState, useEffect } from "react";
import { firebaseDB } from "../../firebase";

const EnquiryModal = ({
  show,
  onClose,
  enquiry,
  mode = "view",
  currentUser,
  onSaveSuccess,
}) => {
  const [formData, setFormData] = useState(enquiry || {});
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (enquiry) {
      setFormData(enquiry);
      
      // Ensure comments is always an array
      if (Array.isArray(enquiry.comments)) {
        setComments(enquiry.comments);
      } else if (typeof enquiry.comments === 'string') {
        // If comments is a string, convert it to an array with one item
        setComments([enquiry.comments]);
      } else {
        // If comments is undefined or null, set to empty array
        setComments([]);
      }
    }
  }, [enquiry]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const timestamp = new Date().toLocaleString();
    const commentEntry = `${timestamp} - ${
      mode === "edit" ? currentUser + ": " : ""
    }${newComment}`;
    setComments((prev) => [...prev, commentEntry]);
    setNewComment("");
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!formData.id) return;
    setIsSaving(true);
    try {
      await firebaseDB.child(`EnquiryData/${formData.id}`).update({
        ...formData,
        comments,
      });
      setShowThankYou(true);
      setIsDirty(false);

      if (onSaveSuccess) onSaveSuccess();

      setTimeout(() => {
        setShowThankYou(false);
        onClose();
      }, 3000);
    } catch (err) {
      console.error("Error saving enquiry:", err);
      alert("Error saving enquiry. Please try again.");
    }
    setIsSaving(false);
  };

  const handleClose = () => {
    if (isDirty) {
      setShowUnsavedConfirm(true);
    } else {
      onClose();
    }
  };

  if (!show) return null;

  return (
    <>
      {/* Main Enquiry Modal */}
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        style={{ background: "rgba(0,0,0,0.5)" }}
      >
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header bg-primary text-white">
              <h5 className="modal-title">
                {mode === "edit" ? "Edit Enquiry" : "View Enquiry"}
              </h5>
              <button type="button" className="btn-close" onClick={handleClose}></button>
            </div>
            <div className="modal-body">
              {/* Name & Mobile (always disabled) */}
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    value={formData.name || ""}
                    disabled
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Mobile</label>
                  <input
                    type="text"
                    name="mobile"
                    className="form-control"
                    value={formData.mobile || ""}
                    disabled
                  />
                </div>
              </div>

              {/* Service & Amount */}
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Service</label>
                  <input
                    type="text"
                    name="service"
                    className="form-control"
                    value={formData.service || ""}
                    onChange={handleChange}
                    disabled={mode === "view"}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Amount</label>
                  <input
                    type="number"
                    name="amount"
                    className="form-control"
                    value={formData.amount || ""}
                    onChange={handleChange}
                    disabled={mode === "view"}
                  />
                </div>
              </div>

              {/* Status & Through */}
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Status</label>
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
                <div className="col-md-6 mb-3">
                  <label className="form-label">Through</label>
                  <select
                    name="through"
                    className="form-select"
                    value={formData.through || ""}
                    onChange={handleChange}
                    disabled={mode === "view"}
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
              </div>

              {/* Communication & Reminder Date */}
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Communication</label>
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
                <div className="col-md-6 mb-3">
                  <label className="form-label">Reminder Date</label>
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

              {/* Comments */}
              <div className="mb-3">
                <label className="form-label">Comments History</label>
                {comments.length > 0 ? (
                  <div className="border rounded p-2 mb-2" style={{ maxHeight: "200px", overflowY: "auto" }}>
                    {comments.map((c, idx) => (
                      <div key={idx} className="mb-1 p-1 border-bottom">
                        <small>{c}</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted">No comments yet.</p>
                )}
                
                {mode === "edit" && (
                  <div className="d-flex">
                    <input
                      type="text"
                      className="form-control"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a new comment"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') handleAddComment();
                      }}
                    />
                    <button
                      className="btn btn-primary ms-2"
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              {mode === "edit" && (
                <button
                  className="btn btn-success"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Saving...
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

      {/* Thank You Modal */}
      {showThankYou && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">
                  <i className="fas fa-check-circle me-2"></i>
                  Success!
                </h5>
              </div>
              <div className="modal-body text-center">
                <i className="fas fa-check-circle text-success mb-3" style={{ fontSize: "3rem" }}></i>
                <h5>Enquiry Updated Successfully!</h5>
                <p>
                  Enquiry for <strong>{formData.name}</strong> ({formData.mobile}) has
                  been successfully updated.
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

      {/* Unsaved Confirmation Modal */}
      {showUnsavedConfirm && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-warning">
                <h5 className="modal-title">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  Unsaved Changes
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowUnsavedConfirm(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>You have unsaved changes. Are you sure you want to close?</p>
                <p className="text-muted">All changes will be lost.</p>
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
};

export default EnquiryModal;