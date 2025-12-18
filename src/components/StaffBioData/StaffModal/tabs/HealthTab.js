import React from "react";

const HealthTab = ({ formData, setFormData, isEditMode }) => {
    const renderArrayField = (label, field, placeholder = "Add item", icon = "bi-plus-circle") => (
        <div className="form-group">
            <label className="form-label">
                <strong>{label}</strong>
            </label>
            {isEditMode ? (
                <>
                    <div className="input-group input-group-sm mb-2">
                        <span className="input-group-text">
                            <i className={`bi ${icon}`}></i>
                        </span>
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder={placeholder}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && e.currentTarget.value.trim()) {
                                    const v = e.currentTarget.value.trim();
                                    const currentArray = Array.isArray(formData[field]) ? formData[field] : [];
                                    if (!currentArray.includes(v)) {
                                        setFormData((prev) => ({ ...prev, [field]: [...currentArray, v] }));
                                    }
                                    e.currentTarget.value = "";
                                    e.preventDefault();
                                }
                            }}
                        />
                        {Array.isArray(formData[field]) && formData[field].length > 0 && (
                            <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => setFormData((prev) => ({ ...prev, [field]: [] }))}
                            >
                                <i className="bi bi-trash"></i>
                            </button>
                        )}
                    </div>
                    <div className="d-flex flex-wrap gap-2 mt-2">
                        {(formData[field] || []).map((item, index) => (
                            <span key={index} className="badge bg-info d-flex align-items-center p-2">
                                <i className="bi bi-heart-pulse me-1"></i>
                                {item}
                                {isEditMode && (
                                    <button
                                        type="button"
                                        className="btn-close btn-close-white ms-2"
                                        style={{ fontSize: "0.6rem" }}
                                        onClick={() =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                [field]: prev[field].filter((_, i) => i !== index),
                                            }))
                                        }
                                        aria-label="Remove"
                                    />
                                )}
                            </span>
                        ))}
                    </div>
                </>
            ) : (
                <div className="form-control form-control-sm bg-light d-flex align-items-center" style={{ minHeight: '38px' }}>
                    <i className="bi bi-heart text-muted me-2"></i>
                    {(formData[field] || []).length ? (
                        <div className="d-flex flex-wrap gap-1">
                            {(formData[field] || []).map((item, index) => (
                                <span key={index} className="badge bg-light text-dark">
                                    {item}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <span className="text-muted">N/A</span>
                    )}
                </div>
            )}
        </div>
    );

    const renderInputField = (label, name, value, type = "text", placeholder = "", required = false, extraProps = {}, icon = "bi-pencil") => {
        const isDisabled = extraProps.disabled || (!isEditMode);
        const inputProps = {
            type,
            className: `form-control ${!isEditMode ? 'bg-light' : ''}`,
            name,
            value: value || "",
            onChange: (e) => {
                const { name, value } = e.target;
                setFormData((prev) => ({ ...prev, [name]: value }));
            },
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
                        <i className={`bi ${icon}`}></i>
                    </span>
                    <input {...inputProps} />
                </div>
            </div>
        );
    };

    const renderMeasurementField = (label, name, value, unit, icon) => {
        return (
            <div className="form-group">
                <label className="form-label">
                    <strong>{label}</strong>
                </label>
                {isEditMode ? (
                    <div className="input-group">
                        <span className="input-group-text">
                            <i className={`bi ${icon}`}></i>
                        </span>
                        <input
                            type="text"
                            className="form-control"
                            name={name}
                            value={value || ""}
                            onChange={(e) => {
                                const { name, value } = e.target;
                                setFormData((prev) => ({ ...prev, [name]: value }));
                            }}
                            placeholder={`Enter ${label.toLowerCase()}`}
                        />
                        <span className="input-group-text">{unit}</span>
                    </div>
                ) : (
                    <div className="form-control bg-light d-flex align-items-center" style={{ minHeight: '38px' }}>
                        <i className={`bi ${icon} text-muted me-2`}></i>
                        {value ? (
                            <span>{value} <small className="text-muted ms-1">{unit}</small></span>
                        ) : (
                            <span className="text-muted">Not provided</span>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-0 pt-4 pb-3">
                <div className="d-flex align-items-center">
                    <div className="avatar-circle bg-success me-3">
                        <i className="bi bi-heart-pulse text-white"></i>
                    </div>
                    <div>
                        <h4 className="card-title mb-0">Health Details</h4>
                        <p className="text-muted mb-0">Your medical and health information</p>
                    </div>
                </div>
                <hr className="mt-3"></hr>
            </div>
            <div className="card-body p-4">
                {/* Health Issues Section */}
                <div className="mb-4">
                    <h5 className="mb-3 d-flex align-items-center">
                        <i className="bi bi-clipboard2-pulse text-danger me-2"></i>
                        Health Conditions
                    </h5>
                    <div className="row g-3">
                        <div className="col-md-6">
                            {renderArrayField("Health Issues", "healthIssues", "Add health issue (press Enter)", "bi-plus-circle")}
                            <small className="text-muted">Press Enter to add multiple health issues</small>
                        </div>
                        <div className="col-md-6">
                            {renderInputField("Other Issues", "otherIssues", formData.otherIssues, "text", "Describe other health concerns", false, {}, "bi-clipboard-plus")}
                        </div>
                    </div>
                </div>

                {/* Physical Measurements Section */}
                <div className="mb-4 pt-3 border-top">
                    <h5 className="mb-3 d-flex align-items-center">
                        <i className="bi bi-rulers text-primary me-2"></i>
                        Physical Measurements
                    </h5>
                    <div className="row g-3">
                        <div className="col-md-6">
                            {renderMeasurementField("Height", "height", formData.height, "cm", "bi-rulers")}
                        </div>
                        <div className="col-md-6">
                            {renderMeasurementField("Weight", "weight", formData.weight, "kg", "bi-speedometer2")}
                        </div>
                    </div>
                </div>

                {/* Medical Information Section */}
                <div className="pt-3 border-top">
                    <h5 className="mb-3 d-flex align-items-center">
                        <i className="bi bi-droplet text-danger me-2"></i>
                        Medical Information
                    </h5>
                    <div className="row g-3">
                        <div className="col-md-6">
                            {renderInputField("Blood Group", "bloodGroup", formData.bloodGroup, "text", "e.g., A+, B-, O+", false, { 
                                maxLength: 3,
                                pattern: "^(A|B|AB|O)[+-]$"
                            }, "bi-droplet")}
                            <small className="text-muted">Enter blood group (e.g., A+, B-, O+)</small>
                        </div>
                        <div className="col-md-6">
                            {renderInputField("Health Card No", "healthCardNo", formData.healthCardNo, "text", "Enter health card number", false, {}, "bi-card-checklist")}
                            <small className="text-muted">Enter your health insurance card number</small>
                        </div>
                    </div>
                </div>
            </div>
            <div className="card-footer bg-white border-0 pb-4">
                <div className="d-flex align-items-center text-muted">
                    <i className="bi bi-shield-lock me-2"></i>
                    <small>Your health information is confidential and securely stored</small>
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
                .badge.bg-info {
                    background-color: #0dcaf0 !important;
                }
            `}</style>
        </div>
    );
};

export default HealthTab;