import React from "react";

const BankDetails = ({ formData, canEdit, handleInputChange }) => {
    const renderInputField = (label, name, value, type = "text", extraProps = {}, icon = "bi-card-text") => (
        <div className="">
            <label className="form-label">
                <i className={`bi ${icon} me-1`}></i>
                <strong>{label}</strong>
            </label>
            {canEdit ? (
                <div className="input-group">
                    <span className="input-group-text">
                        <i className={`bi ${icon}`}></i>
                    </span>
                    <input
                        type={type}
                        className="form-control form-control-sm"
                        name={name}
                        value={value || ""}
                        onChange={handleInputChange}
                        {...extraProps}
                    />
                </div>
            ) : (
                <div className="input-group">
                    <span className="input-group-text">
                        <i className={`bi ${icon}`}></i>
                    </span>
                    <div className="form-control form-control-sm bg-light">{String(value || "N/A")}</div>
                </div>
            )}
        </div>
    );

    const renderPhoneField = (label, name, value, icon = "bi-phone") => {
        const digitsOnly = String(value || "").replace(/\D/g, "");
        const canCall = !!digitsOnly;
        return (
            <div className="">
                <label className="form-label">
                    <i className={`bi ${icon} me-1`}></i>
                    <strong>{label}</strong>
                </label>
                {canEdit ? (
                    <div className="input-group">
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
                        />
                    </div>
                ) : (
                    <div className="input-group">
                        <span className="input-group-text">
                            <i className={`bi ${icon}`}></i>
                        </span>
                        <div className="form-control form-control-sm bg-light d-flex align-items-center justify-content-between">
                            <span>{value || "N/A"}</span>
                            {canCall && (
                                <a href={`tel:${digitsOnly}`} className="btn btn-sm btn-outline-primary">
                                    <i className="bi bi-telephone-outbound me-1"></i>Call
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            {/* Bank Account Card */}
            <div className="card shadow-sm border-primary mb-4">
                <div className="card-header bg-primary text-white d-flex align-items-center">
                    <i className="bi bi-bank me-2 fs-5"></i>
                    <h4 className="mb-0">Bank Account Details</h4>
                </div>
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-3">
                            {renderInputField(
                                "Account No", 
                                "accountNo", 
                                formData.accountNo, 
                                "text", 
                                { maxLength: 18 },
                                "bi-123"
                            )}
                        </div>
                        <div className="col-md-3">
                            {renderInputField(
                                "Bank Name", 
                                "bankName", 
                                formData.bankName, 
                                "text", 
                                {},
                                "bi-building"
                            )}
                        </div>
                        <div className="col-md-3">
                            {renderInputField(
                                "Branch Name", 
                                "branchName", 
                                formData.branchName, 
                                "text", 
                                {},
                                "bi-geo-alt"
                            )}
                        </div>
                        <div className="col-md-3">
                            {renderInputField(
                                "IFSC Code", 
                                "ifscCode", 
                                formData.ifscCode, 
                                "text", 
                                { 
                                    style: { textTransform: "uppercase" },
                                    maxLength: 11 
                                },
                                "bi-code-slash"
                            )}
                        </div>
                    </div>
                    
                    {/* Bank Info */}
                    <div className="mt-4 pt-3 border-top">
                        <div className="d-flex align-items-center">
                            <i className="bi bi-info-circle-fill text-info me-2"></i>
                            <small className="text-muted">
                                Bank details are used for salary transfers and other official payments.
                            </small>
                        </div>
                    </div>
                </div>
            </div>

            {/* UPI Payment Card */}
            <div className="card shadow-sm border-success">
                <div className="card-header bg-success text-white d-flex align-items-center">
                    <i className="bi bi-wallet2 me-2 fs-5"></i>
                    <h4 className="mb-0">UPI Payment Details</h4>
                </div>
                <div className="card-body">
                    <div className="row g-3">
                        {/* PhonePe Section */}
                        <div className="col-md-6">
                            <div className="card border-primary mb-3 h-100">
                                <div className="card-header bg-primary bg-opacity-10 border-primary">
                                    <h6 className="mb-0 d-flex align-items-center">
                                        <i className="bi bi-phone-vibrate text-primary me-2"></i>
                                        PhonePe Details
                                    </h6>
                                </div>
                                <div className="card-body">
                                    <div className="mb-3">
                                        {renderPhoneField(
                                            "PhonePe Number", 
                                            "phonePayNo", 
                                            formData.phonePayNo,
                                            "bi-phone-vibrate"
                                        )}
                                    </div>
                                    
                                    <div className="mb-3">
                                        {renderInputField(
                                            "PhonePe Name", 
                                            "phonePayName", 
                                            formData.phonePayName, 
                                            "text", 
                                            {},
                                            "bi-person-badge"
                                        )}
                                    </div>
                                    
                                    {formData.phonePayNo && (
                                        <div className="alert alert-primary py-2 px-3 mb-0">
                                            <div className="d-flex align-items-center">
                                                <i className="bi bi-check-circle-fill text-primary me-2"></i>
                                                <small>PhonePe registered: {formData.phonePayNo}</small>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Google Pay Section */}
                        <div className="col-md-6">
                            <div className="card border-warning mb-3 h-100">
                                <div className="card-header bg-warning bg-opacity-10 border-warning">
                                    <h6 className="mb-0 d-flex align-items-center">
                                        <i className="bi bi-google text-warning me-2"></i>
                                        Google Pay Details
                                    </h6>
                                </div>
                                <div className="card-body">
                                    <div className="mb-3">
                                        {renderPhoneField(
                                            "Google Pay Number", 
                                            "googlePayNo", 
                                            formData.googlePayNo,
                                            "bi-phone"
                                        )}
                                    </div>
                                    
                                    <div className="mb-3">
                                        {renderInputField(
                                            "Google Pay Name", 
                                            "googlePayName", 
                                            formData.googlePayName, 
                                            "text", 
                                            {},
                                            "bi-person-badge"
                                        )}
                                    </div>
                                    
                                    {formData.googlePayNo && (
                                        <div className="alert alert-warning py-2 px-3 mb-0">
                                            <div className="d-flex align-items-center">
                                                <i className="bi bi-check-circle-fill text-warning me-2"></i>
                                                <small>Google Pay registered: {formData.googlePayNo}</small>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* UPI Info */}
                    <div className="mt-4 pt-3 border-top">
                        <div className="row">
                            <div className="col-md-6">
                                <div className="d-flex align-items-center mb-2">
                                    <i className="bi bi-lightbulb-fill text-warning me-2"></i>
                                    <small className="text-muted">
                                        UPI details enable instant salary transfers
                                    </small>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="d-flex align-items-center mb-2">
                                    <i className="bi bi-shield-check text-success me-2"></i>
                                    <small className="text-muted">
                                        Ensure mobile numbers are registered with UPI apps
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Help/Info Card */}
            <div className="card shadow-sm border-info mt-4">
                <div className="card-header bg-info bg-opacity-10 border-info d-flex align-items-center">
                    <i className="bi bi-question-circle text-info me-2 fs-5"></i>
                    <h5 className="mb-0 text-info">Payment Information</h5>
                </div>
                <div className="card-body">
                    <div className="row">
                        <div className="col-md-4">
                            <div className="d-flex align-items-start mb-3">
                                <i className="bi bi-bank text-primary me-2 mt-1"></i>
                                <div>
                                    <h6 className="mb-1">Bank Transfer</h6>
                                    <p className="mb-0 text-muted small">
                                        Primary method for salary payments. Ensure account details are accurate.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="d-flex align-items-start mb-3">
                                <i className="bi bi-phone text-success me-2 mt-1"></i>
                                <div>
                                    <h6 className="mb-1">PhonePe</h6>
                                    <p className="mb-0 text-muted small">
                                        Instant UPI transfers. Number must be registered with PhonePe app.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="d-flex align-items-start mb-3">
                                <i className="bi bi-google text-warning me-2 mt-1"></i>
                                <div>
                                    <h6 className="mb-1">Google Pay</h6>
                                    <p className="mb-0 text-muted small">
                                        Alternative UPI option. Works with any bank account linked to Google Pay.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="alert alert-warning mt-2 mb-0">
                        <div className="d-flex">
                            <i className="bi bi-exclamation-triangle-fill me-2"></i>
                            <div>
                                <small>
                                    <strong>Important:</strong> For UPI payments, the mobile number must be 
                                    the same as registered with the respective UPI application. 
                                    Bank account details are mandatory for payroll processing.
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default BankDetails;