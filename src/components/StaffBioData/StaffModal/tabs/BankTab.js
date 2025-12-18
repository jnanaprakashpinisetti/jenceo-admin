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
                    <label className="form-label">
                        <strong>{label}</strong>
                    </label>
                    <div className="form-control bg-light d-flex align-items-center" style={{ minHeight: '38px' }}>
                        <i className="bi bi-info-circle text-muted me-2"></i>
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
                <div className="input-group">
                    <span className="input-group-text">
                        <i className="bi bi-pencil"></i>
                    </span>
                    <input {...inputProps} />
                </div>
            </div>
        );
    };

    const renderPhoneField = (label, name, value, extraProps = {}, icon = "bi-phone") => {
        return (
            <div className="form-group">
                <label className="form-label">
                    <strong>{label}</strong>
                </label>
                {isEditMode ? (
                    <div className="input-group input-group-sm">
                        <span className="input-group-text">
                            <i className={`bi ${icon}`}></i>
                        </span>
                        <input
                            type="tel"
                            className="form-control form-control-sm"
                            name={name}
                            value={value || ""}
                            onChange={handleInputChange}
                            inputMode="numeric"
                            maxLength={10}
                            pattern="^[0-9]{10}$"
                            placeholder="Enter 10-digit number"
                            {...extraProps}
                        />
                    </div>
                ) : (
                    <div className="form-control form-control-sm bg-light d-flex align-items-center" style={{ minHeight: '38px' }}>
                        <i className={`bi ${icon} text-muted me-2`}></i>
                        {value || <span className="text-muted">N/A</span>}
                    </div>
                )}
            </div>
        );
    };

    const renderPaymentField = (label, name, value, icon, isPhone = false) => {
        if (isPhone) {
            return renderPhoneField(label, name, value, {}, icon);
        }
        return renderInputField(label, name, value, "text", `Enter ${label.toLowerCase()}`, false, {});
    };

    return (
        <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-0 pt-4 pb-3">
                <div className="d-flex align-items-center">
                    <div className="avatar-circle bg-info me-3">
                        <i className="bi bi-bank text-white"></i>
                    </div>
                    <div>
                        <h4 className="card-title mb-0">Bank Details</h4>
                        <p className="text-muted mb-0">Your bank account and payment information</p>
                    </div>
                </div>
                <hr className="mt-3"></hr>
            </div>
            <div className="card-body p-4">
                {/* Bank Account Section */}
                <div className="mb-4">
                    <h5 className="mb-3 d-flex align-items-center">
                        <i className="bi bi-credit-card text-primary me-2"></i>
                        Bank Account Information
                    </h5>
                    <div className="row g-3">
                        <div className="col-md-3">
                            {renderInputField("Account No", "accountNo", formData.accountNo, "text", "Enter account number", true)}
                        </div>
                        <div className="col-md-3">
                            {renderInputField("Bank Name", "bankName", formData.bankName, "text", "Enter bank name", true)}
                        </div>
                        <div className="col-md-3">
                            {renderInputField("Branch Name", "branchName", formData.branchName, "text", "Enter branch name", true)}
                        </div>
                        <div className="col-md-3">
                            {renderInputField("IFSC Code", "ifscCode", formData.ifscCode, "text", "Enter IFSC code", true, {
                                maxLength: 11,
                                pattern: "^[A-Za-z]{4}0[A-Za-z0-9]{6}$"
                            })}
                        </div>
                    </div>
                </div>

                {/* UPI Payment Section */}
                <div className="mt-4 pt-3 border-top">
                    <h5 className="mb-3 d-flex align-items-center">
                        <i className="bi bi-cash-coin text-success me-2"></i>
                        UPI Payment Details
                    </h5>
                    
                    {/* PhonePay Section */}
                    <div className="mb-4">
                        <h6 className="mb-3 d-flex align-items-center">
                            <i className="bi bi-phone-vibrate text-primary me-2"></i>
                            PhonePay
                        </h6>
                        <div className="row g-3">
                            <div className="col-md-3">
                                {renderPaymentField("Phone Pay Number", "phonePayNo", formData.phonePayNo, "bi-phone-vibrate", true)}
                            </div>
                            <div className="col-md-3">
                                {renderPaymentField("Phone Pay Name", "phonePayName", formData.phonePayName, "bi-person")}
                            </div>
                        </div>
                    </div>

                    {/* Google Pay Section */}
                    <div>
                        <h6 className="mb-3 d-flex align-items-center">
                            <i className="bi bi-google text-warning me-2"></i>
                            Google Pay
                        </h6>
                        <div className="row g-3">
                            <div className="col-md-3">
                                {renderPaymentField("Google Pay Number", "googlePayNo", formData.googlePayNo, "bi-google", true)}
                            </div>
                            <div className="col-md-3">
                                {renderPaymentField("Google Pay Name", "googlePayName", formData.googlePayName, "bi-person")}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="card-footer bg-white border-0 pb-4">
                <div className="d-flex align-items-center text-muted">
                    <i className="bi bi-shield-check me-2"></i>
                    <small>Your financial information is securely stored and encrypted</small>
                </div>
            </div>

            {/* CSS for avatar circle */}
            <style jsx>{`
                .avatar-circle {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .avatar-circle i {
                    font-size: 1.2rem;
                }
                .card-header {
                    border-bottom: 1px solid rgba(0,0,0,.125);
                }
                .card-footer {
                    border-top: 1px solid rgba(0,0,0,.125);
                }
            `}</style>
        </div>
    );
};

export default BankTab;