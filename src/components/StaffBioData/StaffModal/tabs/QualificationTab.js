import React from "react";

const QualificationTab = ({ formData, setFormData, isEditMode }) => {
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

    const renderArrayField = (label, field, placeholder = "Add item", icon = "bi-plus-circle", badgeIcon = "bi-check-circle") => (
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
                                title="Clear all items"
                            >
                                <i className="bi bi-trash"></i>
                            </button>
                        )}
                    </div>
                    <div className="d-flex flex-wrap gap-2 mt-2">
                        {(formData[field] || []).map((item, index) => (
                            <span key={index} className="badge bg-primary d-flex align-items-center p-2">
                                <i className={`bi ${badgeIcon} me-1`}></i>
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
                    <small className="text-muted">Press Enter to add items</small>
                </>
            ) : (
                <div className="form-control form-control-sm bg-light d-flex align-items-center" style={{ minHeight: '38px' }}>
                    <i className="bi bi-list-check text-muted me-2"></i>
                    {(formData[field] || []).length ? (
                        <div className="d-flex flex-wrap gap-1">
                            {(formData[field] || []).map((item, index) => (
                                <span key={index} className="badge bg-light text-dark border">
                                    <i className="bi bi-check-circle me-1"></i>
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

    return (
        <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-0 pt-4 pb-3">
                <div className="d-flex align-items-center">
                    <div className="avatar-circle bg-warning me-3">
                        <i className="bi bi-mortarboard text-white"></i>
                    </div>
                    <div>
                        <h4 className="card-title mb-0">Qualification & Skills</h4>
                        <p className="text-muted mb-0">Educational background and professional skills</p>
                    </div>
                </div>
                <hr className="mt-3"></hr>
            </div>
            <div className="card-body p-4">
                {/* Educational Background Section */}
                <div className="mb-4">
                    <h5 className="mb-3 d-flex align-items-center">
                        <i className="bi bi-book text-primary me-2"></i>
                        Educational Background
                    </h5>
                    <div className="row g-3">
                        <div className="col-md-4">
                            {renderInputField(
                                "Qualification", 
                                "qualification", 
                                formData.qualification, 
                                "text", 
                                "e.g., B.Tech, MBA, Diploma", 
                                false, 
                                {}, 
                                "bi-award"
                            )}
                            <small className="text-muted">Highest qualification</small>
                        </div>
                        <div className="col-md-4">
                            {renderInputField(
                                "School/College", 
                                "schoolCollege", 
                                formData.schoolCollege, 
                                "text", 
                                "Enter institution name", 
                                false, 
                                {}, 
                                "bi-building"
                            )}
                            <small className="text-muted">Educational institution</small>
                        </div>
                        <div className="col-md-4">
                            {renderInputField(
                                "Primary Skill", 
                                "primarySkill", 
                                formData.primarySkill, 
                                "text", 
                                "Enter primary skill", 
                                false, 
                                {}, 
                                "bi-star"
                            )}
                            <small className="text-muted">Main professional skill</small>
                        </div>
                    </div>
                </div>

                {/* Skills Section */}
                <div className="mb-4 pt-3 border-top">
                    <h5 className="mb-3 d-flex align-items-center">
                        <i className="bi bi-tools text-success me-2"></i>
                        Skills & Expertise
                    </h5>
                    <div className="row g-3">
                        <div className="col-md-4">
                            {renderArrayField(
                                "Secondary Skills", 
                                "secondarySkills", 
                                "Add secondary skill", 
                                "bi-plus-circle",
                                "bi-gear"
                            )}
                            <small className="text-muted">Additional professional skills</small>
                        </div>
                        <div className="col-md-4">
                            {renderArrayField(
                                "Other Skills", 
                                "workingSkills", 
                                "Add skill", 
                                "bi-plus-circle",
                                "bi-briefcase"
                            )}
                            <small className="text-muted">Working skills</small>
                        </div>
                        <div className="col-md-4">
                            {renderInputField(
                                "Work Experience", 
                                "workExperince", 
                                formData.workExperince, 
                                "text", 
                                "e.g., 5 years in IT", 
                                false, 
                                {}, 
                                "bi-clock-history"
                            )}
                            <small className="text-muted">Total work experience</small>
                        </div>
                    </div>
                </div>

                {/* Language Proficiency Section */}
                <div className="pt-3 border-top">
                    <h5 className="mb-3 d-flex align-items-center">
                        <i className="bi bi-translate text-info me-2"></i>
                        Language Proficiency
                    </h5>
                    <div className="row g-3">
                        <div className="col-md-6">
                            {renderInputField(
                                "Mother Tongue", 
                                "motherTongue", 
                                formData.motherTongue, 
                                "text", 
                                "Enter mother tongue", 
                                false, 
                                {}, 
                                "bi-house"
                            )}
                            <small className="text-muted">Native language</small>
                        </div>
                        <div className="col-md-6">
                            {renderInputField(
                                "Languages", 
                                "languages", 
                                formData.languages, 
                                "text", 
                                "e.g., English, Hindi, Telugu", 
                                false, 
                                {}, 
                                "bi-chat-dots"
                            )}
                            <small className="text-muted">Languages known (comma separated)</small>
                        </div>
                    </div>
                </div>
            </div>
            <div className="card-footer bg-white border-0 pb-4">
                <div className="d-flex align-items-center text-muted">
                    <i className="bi bi-lightbulb me-2"></i>
                    <small>Your skills and qualifications help in career growth and project assignments</small>
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
                .badge.bg-primary {
                    background-color: #0d6efd !important;
                }
            `}</style>
        </div>
    );
};

export default QualificationTab;