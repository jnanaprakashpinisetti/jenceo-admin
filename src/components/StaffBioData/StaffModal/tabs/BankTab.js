import React from "react";

const BankTab = ({ formData, isEditMode, handleInputChange }) => {
    const renderInputField = (label, name, value, type = "text", placeholder = "", required = false, extraProps = {}) => {
        const isDisabled = extraProps.disabled || (!isEditMode);
        const inputProps = {
            type,
            className: `form-control ${!isEditMode ? 'bg-light' : ''}`,
            name,
            value: value || "",
            onChange: handleInputChange,
            placeholder,
            required,
            disabled: isDisabled,
            ...extraProps
        };

        if (!isEditMode) {
            return (
                <div className="form-group">
                    <label className="form-label"><strong>{label}</strong></label>
                    <div className="form-control bg-light">
                        {value || <span className="text-muted">Not provided</span>}
                    </div>
                </div>
            );
        }

        return (
            <div className="form-group">
                <label className="form-label">
                    <strong>{label}</strong> {required && <span className="text-danger">*</span>}
                </label>
                <input {...inputProps} />
            </div>
        );
    };

    const renderPhoneField = (label, name, value, extraProps = {}) => {
        return (
            <div className="">
                <label className="form-label">
                    <strong>{label}</strong>
                </label>
                {isEditMode ? (
                    <input
                        type="tel"
                        className="form-control form-control-sm"
                        name={name}
                        value={value || ""}
                        onChange={handleInputChange}
                        inputMode="numeric"
                        maxLength={10}
                        pattern="^[0-9]{10}$"
                        {...extraProps}
                    />
                ) : (
                    <div className="form-control form-control-sm bg-light">
                        {value || "N/A"}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="modal-card ">
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

export default BankTab;