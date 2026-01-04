import React, { useState } from "react";

const DeleteConfirmationModal = ({ 
  isOpen = false, 
  onClose = () => {},
  onConfirm = () => {},
  workerName = "",
  workerId = "",
  isExitMode = false
}) => {
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (isExitMode && !remarks.trim()) {
      setError("Exit remarks are required");
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(isExitMode ? remarks : null);
      handleClose();
    } catch (error) {
      console.error("Error:", error);
      setError("Failed to process request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRemarks("");
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.9)" }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header bg-danger text-white">
            <h5 className="modal-title">
              {isExitMode ? "Exit Worker" : "Delete Worker"}
            </h5>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              onClick={handleClose}
              disabled={isSubmitting}
            />
          </div>
          
          <div className="modal-body">
            <div className="alert alert-warning">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              <strong>Warning!</strong> You are about to {isExitMode ? 'exit' : 'delete'} a worker.
            </div>
            
            <div className="mb-3">
              <p className="mb-1">
                <strong>Worker ID:</strong> {workerId}
              </p>
              <p className="mb-1">
                <strong>Worker Name:</strong> {workerName}
              </p>
              <p className="text-danger mb-0">
                <i className="bi bi-info-circle me-1"></i>
                {isExitMode 
                  ? "This action will move the worker to Exited Workers tab. Worker can be restored later."
                  : "This action will permanently delete the worker from the system."
                }
              </p>
            </div>
            
            {isExitMode && (
              <div className="mb-3">
                <label className="form-label">
                  Exit Remarks <span className="text-danger">*</span>
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => {
                    setRemarks(e.target.value);
                    if (error) setError("");
                  }}
                  className={`form-control ${error ? 'is-invalid' : ''}`}
                  placeholder="Enter reason for exit (e.g., Contract completed, Resigned, Terminated, etc.)"
                  rows="3"
                />
                {error && <div className="invalid-feedback">{error}</div>}
                <small className="text-muted">
                  Provide detailed reason for worker exit. This will help in future reference.
                </small>
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`btn ${isExitMode ? 'btn-warning' : 'btn-danger'}`}
              onClick={handleConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Processing...
                </>
              ) : (
                isExitMode ? 'Exit Worker' : 'Delete Permanently'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;