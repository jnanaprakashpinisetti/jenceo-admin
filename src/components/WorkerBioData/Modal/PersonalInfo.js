import React from "react";

const PersonalInfo = ({ formData, canEdit, handleInputChange, DOM_MIN, DOM_MAX }) => {
    const renderInputField = (label, name, value, type = "text", extraProps = {}, iconName) => (
        <div className="mb-3">
            <label className="form-label text-muted small mb-1 d-flex align-items-center">
                {iconName && <i className={`bi bi-${iconName} me-1`}></i>}
                <strong>{label}</strong>
            </label>
            {canEdit ? (
                <div className="input-group input-group-sm">
                    {iconName && (
                        <span className="input-group-text">
                            <i className={`bi bi-${iconName}`}></i>
                        </span>
                    )}
                    <input
                        type={type}
                        className="form-control"
                        name={name}
                        value={value || ""}
                        onChange={handleInputChange}
                        {...extraProps}
                    />
                </div>
            ) : (
                <div className={`d-flex align-items-center border rounded p-2 bg-light ${!iconName ? 'ps-3' : ''}`}>
                    {iconName && <i className={`bi bi-${iconName} text-primary me-2`}></i>}
                    <span>{String(value || "Not specified")}</span>
                </div>
            )}
        </div>
    );

    const renderSelectField = (label, name, value, options, iconName) => (
        <div className="mb-3">
            <label className="form-label text-muted small mb-1 d-flex align-items-center">
                {iconName && <i className={`bi bi-${iconName} me-1`}></i>}
                <strong>{label}</strong>
            </label>
            {canEdit ? (
                <div className="input-group input-group-sm">
                    {iconName && (
                        <span className="input-group-text">
                            <i className={`bi bi-${iconName}`}></i>
                        </span>
                    )}
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
                <div className={`d-flex align-items-center border rounded p-2 bg-light ${!iconName ? 'ps-3' : ''}`}>
                    {iconName && <i className={`bi bi-${iconName} text-primary me-2`}></i>}
                    <span>{String(value || "Not specified")}</span>
                </div>
            )}
        </div>
    );

    return (
        <div className="card shadow-sm border-0">
            <div className="card-header bg-info bg-opacity-10 border-0 d-flex align-items-center">
                <i className="bi bi-person-vcard fs-4 text-info me-2"></i>
                <h4 className="mb-0 text-info">Personal Information</h4>
            </div>
            <div className="card-body p-4">
                <div className="row g-4">
                    {/* Marriage Status Section */}
                    <div className="col-lg-6">
                        <div className="card h-100 border">
                            <div className="card-body">
                                <h5 className="card-title d-flex align-items-center text-muted mb-3">
                                    <i className="bi bi-hearts me-2"></i>
                                    Marital Status
                                </h5>
                                <div className="row">
                                    <div className="col-md-12 mb-3">
                                        {renderSelectField("Marital Status", "maritalStatus", formData.maritalStatus, [
                                            { value: "Single", label: "Single" },
                                            { value: "UnMarried", label: "Un Married" },
                                            { value: "Married", label: "Married" },
                                            { value: "Divorced", label: "Divorced" },
                                            { value: "Widowed", label: "Widowed" },
                                        ], "heart")}
                                    </div>
                                    <div className="col-md-6">
                                        {renderInputField("Date of Marriage", "dateOfMarriage", formData.dateOfMarriage, "date", {
                                            min: DOM_MIN,
                                            max: DOM_MAX,
                                            disabled: formData.maritalStatus !== "Married",
                                        }, "calendar-heart")}
                                    </div>
                                    <div className="col-md-6">
                                        {renderInputField("Marriage Years", "marriageYears", formData.marriageYears, "number", {
                                            maxLength: 2,
                                            inputMode: "numeric",
                                        }, "calendar-check")}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Family Information Section */}
                    <div className="col-lg-6">
                        <div className="card h-100 border">
                            <div className="card-body">
                                <h5 className="card-title d-flex align-items-center text-muted mb-3">
                                    <i className="bi bi-people me-2"></i>
                                    Family Information
                                </h5>
                                <div className="row">
                                    <div className="col-md-12 mb-3">
                                        {renderInputField("Husband / Wife Name", "careOfPersonal", formData.co, "text", {}, "person-heart")}
                                    </div>
                                    <div className="col-md-6">
                                        {renderInputField("Child 1", "childName1", formData.childName1, "text", {}, "person")}
                                    </div>
                                    <div className="col-md-6">
                                        {renderInputField("Child 2", "childName2", formData.childName2, "text", {}, "person")}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Religious & Cultural Information */}
                    <div className="col-12">
                        <div className="card border">
                            <div className="card-body">
                                <h5 className="card-title d-flex align-items-center text-muted mb-3">
                                    <i className="bi bi-building me-2"></i>
                                    Religious & Cultural Information
                                </h5>
                                <div className="row">
                                    <div className="col-md-4">
                                        {renderInputField("Religion", "religion", formData.religion, "text", {}, "bank")}
                                    </div>
                                    <div className="col-md-4">
                                        {renderInputField("Caste", "cast", formData.cast, "text", {}, "diagram-3")}
                                    </div>
                                    <div className="col-md-4">
                                        {renderInputField("Sub Caste", "subCast", formData.subCast, "text", {}, "diagram-3-fill")}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Helper Text for Disabled Date Field */}
                {canEdit && formData.maritalStatus !== "Married" && formData.maritalStatus && (
                    <div className="alert alert-warning alert-sm mt-3 d-flex align-items-center">
                        <i className="bi bi-info-circle me-2"></i>
                        <small>
                            Date of Marriage is only available when marital status is set to "Married"
                        </small>
                    </div>
                )}

                {/* View-only Mode Indicator */}
                {!canEdit && (
                    <div className="text-center mt-4 pt-3 border-top">
                        <small className="text-muted d-flex align-items-center justify-content-center">
                            <i className="bi bi-eye me-1"></i>
                            This information is view-only. Contact administrator to edit.
                        </small>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PersonalInfo;