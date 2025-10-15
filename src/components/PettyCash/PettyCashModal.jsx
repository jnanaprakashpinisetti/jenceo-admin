import React from "react";
import PettyCashForm from "./PettyCashForm";

export default function PettyCashModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      className="modal fade show"
      style={{ display: "block", background: "rgba(2, 1, 1, 0.9)" }}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered client-form">
        <div className="modal-content">
          <div className="modal-header  text-white">
            <h5 className="modal-title">Petty Cash Entry</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <PettyCashForm />
          </div>
        </div>
      </div>
    </div>
  );
}
