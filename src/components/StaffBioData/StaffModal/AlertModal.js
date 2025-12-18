import React from "react";
import BaseModal from "./BaseModal";

const AlertModal = ({ open, title = "Notice", variant = "info", onClose, children }) => (
    <BaseModal
        open={open}
        title={title}
        onClose={onClose}
        footer={
            <button
                className={`btn btn-${variant === "danger" ? "danger" : variant === "success" ? "success" : "secondary"}`}
                onClick={onClose}
            >
                OK
            </button>
        }
    >
        <div className={`alert alert-${variant} mb-0`}>
            <div className="alert-list" style={{ paddingLeft: "1.25rem" }}>{children}</div>
        </div>
    </BaseModal>
);

export default AlertModal;