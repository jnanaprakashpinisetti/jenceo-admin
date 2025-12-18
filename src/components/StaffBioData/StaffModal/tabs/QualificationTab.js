import React from "react";

const QualificationTab = ({ formData, setFormData, isEditMode }) => {
    const renderInputField = (label, name, value, type = "text", placeholder = "", required = false, extraProps = {}) => {
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

    const renderArrayField = (label, field, placeholder = "Add item") => (
        <div className="">
            <label className="form-label">
                <strong>{label}</strong>
            </label>
            {isEditMode ? (
                <>
                    <div className="d-flex">
                        <input
                            type="text"
                            className="form-control form-control-sm me-2"
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
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => setFormData((prev) => ({ ...prev, [field]: [] }))}
                            >
                                Clear All
                            </button>
                        )}
                    </div>
                    <div className="d-flex flex-wrap gap-1 mt-2">
                        {(formData[field] || []).map((item, index) => (
                            <span key={index} className="badge bg-secondary d-flex align-items-center">
                                {item}
                                {isEditMode && (
                                    <button
                                        type="button"
                                        className="btn-close btn-close-white ms-1"
                                        style={{ fontSize: "0.6rem" }}
                                        onClick={() =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                [field]: prev[field].filter((_, i) => i !== index),
                                            }))
                                        }
                                    />
                                )}
                            </span>
                        ))}
                    </div>
                </>
            ) : (
                <div className="form-control form-control-sm bg-light">
                    {(formData[field] || []).length ? (formData[field] || []).join(", ") : "N/A"}
                </div>
            )}
        </div>
    );

    return (
        <div className="modal-card ">
            <div className="modal-card-header">
                <h4 className="mb-0">Qualification & Skills</h4>
            </div>
            <div className="modal-card-body">
                <div className="row">
                    <div className="col-md-4">{renderInputField("Qualification", "qualification", formData.qualification)}</div>
                    <div className="col-md-4">{renderInputField("School/College", "schoolCollege", formData.schoolCollege)}</div>
                    <div className="col-md-4">{renderInputField("Primary Skill", "primarySkill", formData.primarySkill)}</div>
                </div>
                <div className="row">
                    <div className="col-md-4">{renderArrayField("Secondary Skills", "secondarySkills", "Add secondary skill")}</div>
                    <div className="col-md-4">{renderArrayField("Other Skills", "workingSkills", "Add skill")}</div>
                    <div className="col-md-4">{renderInputField("Work Experience", "workExperince", formData.workExperince, "text")}</div>
                </div>
                <div className="row">
                    <div className="col-md-4">{renderInputField("Mother Tongue", "motherTongue", formData.motherTongue)}</div>
                    <div className="col-md-4">{renderInputField("Languages", "languages", formData.languages)}</div>
                </div>
            </div>
        </div>
    );
};

export default QualificationTab;