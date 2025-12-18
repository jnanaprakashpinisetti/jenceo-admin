import React from "react";
import BaseModal from "./BaseModal";

const ConfirmModal = ({
    open,
    title = "Confirm",
    message,
    error,
    confirmText = "Yes",
    cancelText = "No",
    onConfirm,
    onCancel,
}) => (
    <BaseModal
        open={open}
        title={title}
        onClose={onCancel}
        footer={
            <>
                <button className="btn btn-secondary" onClick={onCancel}>
                    {cancelText}
                </button>
                <button className="btn btn-danger" onClick={onConfirm}>
                    {confirmText}
                </button>
            </>
        }
    >
        <div className="alert alert-warning mb-0">
            <div style={{ paddingLeft: "1.25rem" }}>{message}</div>
            {error && <div className="text-danger mt-2" style={{ paddingLeft: '1.25rem' }}>{error}</div>}
        </div>
    </BaseModal>
);

export default ConfirmModal;