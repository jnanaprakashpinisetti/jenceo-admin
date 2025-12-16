import React from "react";

const BankDetails = ({ formData, canEdit, handleInputChange }) => {
    const renderInputField = (label, name, value, type = "text") => (
        <div className="">
            <label className="form-label">
                <strong>{label}</strong>
            </label>
            {canEdit ? (
                <input
                    type={type}
                    className="form-control form-control-sm"
                    name={name}
                    value={value || ""}
                    onChange={handleInputChange}
                />
            ) : (
                <div className="form-control form-control-sm bg-light">{String(value || "N/A")}</div>
            )}
        </div>
    );

    const renderPhoneField = (label, name, value) => {
        const digitsOnly = String(value || "").replace(/\D/g, "");
        const canCall = !!digitsOnly;
        return (
            <div className="">
                <label className="form-label">
                    <strong>{label}</strong>
                </label>
                {canEdit ? (
                    <input
                        type="tel"
                        className="form-control form-control-sm"
                        name={name}
                        value={value || ""}
                        onChange={handleInputChange}
                        inputMode="numeric"
                        maxLength={10}
                        pattern="^[0-9]{10}$"
                    />
                ) : (
                    <div className="form-control form-control-sm bg-light d-flex align-items-center">
                        <span>{value || "N/A"}</span>
                        {canCall && (
                            <a href={`tel:${digitsOnly}`} className="btn btn-sm btn-outline-primary ms-2 mb-1">
                                Call
                            </a>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="modal-card">
            <div className="modal-card-header">
                <h4 className="mb-0">Bank Details</h4>
            </div>
            <div className="modal-card-body">
                <div className="row">
                    <div className="col-md-3">{renderInputField("Account No", "accountNo", formData.accountNo)}</div>
                    <div className="col-md-3">{renderInputField("Bank Name", "bankName", formData.bankName)}</div>
                    <div className="col-md-3">{renderInputField("Branch Name", "branchName", formData.branchName)}</div>
                    <div className="col-md-3">{renderInputField("IFSC Code", "ifscCode", formData.ifscCode)}</div>
                </div>
                <div className="row">
                    <div className="col-md-3">{renderPhoneField("Phone Pay Number", "phonePayNo", formData.phonePayNo)}</div>
                    <div className="col-md-3">{renderInputField("Phone Pay Name", "phonePayName", formData.phonePayName)}</div>
                    <div className="col-md-3">{renderPhoneField("Google Pay Number", "googlePayNo", formData.googlePayNo)}</div>
                    <div className="col-md-3">{renderInputField("Google Pay Name", "googlePayName", formData.googlePayName)}</div>
                </div>
            </div>
        </div>
    );
};

export default BankDetails;