import React from "react";
import { DOM_MIN, DOM_MAX } from "../utils";

const PersonalTab = ({ formData, isEditMode, handleInputChange }) => {
    const renderInputField = (label, name, value, type = "text", placeholder = "", required = false, extraProps = {}, icon = "bi-pencil") => {
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
                        <i className={`bi ${icon}`}></i>
                    </span>
                    <input {...inputProps} />
                </div>
            </div>
        );
    };

    const renderSelectField = (label, name, value, options, icon = "bi-list-ul") => {
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
                        <select className="form-select" name={name} value={value || ""} onChange={handleInputChange}>
                            <option value="">Select {label}</option>
                            {options.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <div className="form-control bg-light d-flex align-items-center" style={{ minHeight: '38px' }}>
                        <i className="bi bi-info-circle text-muted me-2"></i>
                        {value || <span className="text-muted">Not selected</span>}
                    </div>
                )}
            </div>
        );
    };

    const renderDateField = (label, name, value, disabled = false) => {
        return (
            <div className="form-group">
                <label className="form-label">
                    <strong>{label}</strong>
                </label>
                {isEditMode ? (
                    <div className="input-group">
                        <span className="input-group-text">
                            <i className="bi bi-calendar"></i>
                        </span>
                        <input
                            type="date"
                            className="form-control"
                            name={name}
                            value={value || ""}
                            onChange={handleInputChange}
                            min={DOM_MIN}
                            max={DOM_MAX}
                            disabled={disabled}
                            placeholder="Select date"
                        />
                    </div>
                ) : (
                    <div className="form-control bg-light d-flex align-items-center" style={{ minHeight: '38px' }}>
                        <i className="bi bi-calendar text-muted me-2"></i>
                        {value ? new Date(value).toLocaleDateString('en-IN') : <span className="text-muted">Not provided</span>}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-0 pt-4 pb-3">
                <div className="d-flex align-items-center">
                    <div className="avatar-circle bg-info me-3">
                        <i className="bi bi-person-heart text-white"></i>
                    </div>
                    <div>
                        <h4 className="card-title mb-0">Personal Information</h4>
                        <p className="text-muted mb-0">Personal and family details</p>
                    </div>
                </div>
                <hr className="mt-3"></hr>
            </div>
            <div className="card-body p-4">
                {/* Marital Status Section */}
                <div className="mb-4">
                    <h5 className="mb-3 d-flex align-items-center">
                        <i className="bi bi-heart text-danger me-2"></i>
                        Marital Status
                    </h5>
                    <div className="row g-3">
                        <div className="col-md-4">
                            {renderSelectField("Marital Status", "maritalStatus", formData.maritalStatus, [
                                { value: "Single", label: "Single" },
                                { value: "Married", label: "Married" },
                                { value: "Divorced", label: "Divorced" },
                                { value: "Widowed", label: "Widowed" },
                            ], "bi-heart")}
                        </div>
                        <div className="col-md-4">
                            {renderDateField(
                                "Date of Marriage", 
                                "dateOfMarriage", 
                                formData.dateOfMarriage, 
                                formData.maritalStatus !== "Married"
                            )}
                            <small className="text-muted">
                                {formData.maritalStatus !== "Married" ? "Only applicable if married" : "Select marriage date"}
                            </small>
                        </div>
                        <div className="col-md-4">
                            {renderInputField(
                                "Marriage Years", 
                                "marriageYears", 
                                formData.marriageYears, 
                                "number", 
                                "Enter years", 
                                false, 
                                { 
                                    maxLength: 2,
                                    inputMode: "numeric",
                                    min: 0,
                                    max: 70
                                },
                                "bi-calendar-week"
                            )}
                            <small className="text-muted">Number of years married</small>
                        </div>
                    </div>
                </div>

                {/* Family Details Section */}
                <div className="mb-4 pt-3 border-top">
                    <h5 className="mb-3 d-flex align-items-center">
                        <i className="bi bi-people text-success me-2"></i>
                        Family Details
                    </h5>
                    <div className="row g-3">
                        <div className="col-md-4">
                            {renderInputField(
                                "Husband / Wife Name", 
                                "careOfPersonal", 
                                formData.careOfPersonal, 
                                "text", 
                                "Enter spouse name", 
                                false, 
                                { 
                                    disabled: formData.maritalStatus !== "Married" 
                                },
                                "bi-person-check"
                            )}
                            <small className="text-muted">
                                {formData.maritalStatus !== "Married" ? "Only applicable if married" : "Enter spouse name"}
                            </small>
                        </div>
                        <div className="col-md-4">
                            {renderInputField(
                                "Child 1", 
                                "childName1", 
                                formData.childName1, 
                                "text", 
                                "Enter child name", 
                                false, 
                                {},
                                "bi-person"
                            )}
                        </div>
                        <div className="col-md-4">
                            {renderInputField(
                                "Child 2", 
                                "childName2", 
                                formData.childName2, 
                                "text", 
                                "Enter child name", 
                                false, 
                                {},
                                "bi-person"
                            )}
                        </div>
                    </div>
                </div>

                {/* Religious Information Section */}
                <div className="pt-3 border-top">
                    <h5 className="mb-3 d-flex align-items-center">
                        <i className="bi bi-globe text-primary me-2"></i>
                        Religious & Caste Information
                    </h5>
                    <div className="row g-3">
                        <div className="col-md-4">
                            {renderInputField(
                                "Religion", 
                                "religion", 
                                formData.religion, 
                                "text", 
                                "Enter religion", 
                                false, 
                                {},
                                "bi-globe-asia-australia"
                            )}
                        </div>
                        <div className="col-md-4">
                            {renderInputField(
                                "Caste", 
                                "cast", 
                                formData.cast, 
                                "text", 
                                "Enter caste", 
                                false, 
                                {},
                                "bi-people"
                            )}
                        </div>
                        <div className="col-md-4">
                            {renderInputField(
                                "Sub Caste", 
                                "subCast", 
                                formData.subCast, 
                                "text", 
                                "Enter sub-caste", 
                                false, 
                                {},
                                "bi-diagram-3"
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="card-footer bg-white border-0 pb-4">
                <div className="d-flex align-items-center text-muted">
                    <i className="bi bi-shield-check me-2"></i>
                    <small>Your personal information is kept confidential</small>
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

export default PersonalTab;