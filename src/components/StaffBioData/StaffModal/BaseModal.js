import React from "react";

const BaseModal = ({ open, title, children, onClose, footer }) => {
    if (!open) return null;
    return (
        <div
            className="fixed-top d-flex align-items-center justify-content-center"
            style={{ inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1060 }}
            role="dialog"
            aria-modal="true"
        >
            <div className="card shadow-lg" style={{ width: "min(980px, 96vw)" }}>
                <div className="card-header d-flex align-items-center justify-content-between">
                    <strong className="me-3">{title}</strong>
                    <button type="button" className="btn-close" onClick={onClose} />
                </div>
                <div className="card-body">{children}</div>
                {footer && <div className="card-footer d-flex gap-2 justify-content-end">{footer}</div>}
            </div>
        </div>
    );
};

export default BaseModal;