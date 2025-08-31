import React from "react";

export default function DuplicateModal({ show, duplicateInfo, onClose, onView }) {
  if (!show || !duplicateInfo) return null;

  return (
    <div
      className="modal fade show"
      style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg border-0">
          <div className="modal-header bg-warning text-dark">
            <h5 className="modal-title">Duplicate Entry Found</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            <p>
              The mobile number <strong>{duplicateInfo.mobileNo}</strong> is already
              registered.
            </p>
            <p>
              <strong>Name:</strong> {duplicateInfo.name || "N/A"} <br />
              <strong>ID / Serial:</strong> {duplicateInfo.id || "N/A"}
            </p>
            <small className="text-muted">
              Please check before adding a new worker.
            </small>
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            {onView && (
              <button className="btn btn-info" onClick={onView}>
                View Record
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
