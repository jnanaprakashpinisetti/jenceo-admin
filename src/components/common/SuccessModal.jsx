import React from "react";

export default function SuccessModal({ show, title, message, onClose }) {
  if (!show) return null;

  return (
    <div
      className="modal fade show"
      style={{ display: "block", backgroundColor: "rgba(0,0,0,0.6)" }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg border-0 rounded-4">
          <div className="modal-header bg-success text-white">
            <span className="me-2 fs-3">✔️</span>
            <h5 className="modal-title">{title}</h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
            ></button>
          </div>
          <div className="modal-body text-center">
            <p className="mt-2 text-success fw-bold">{message}</p>
          </div>
          <div className="modal-footer justify-content-center">
            <button type="button" className="btn btn-success px-4" onClick={onClose}>
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
