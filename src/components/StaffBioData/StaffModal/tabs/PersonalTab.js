import React from "react";
import { DOM_MIN, DOM_MAX } from "../utils";

const PersonalTab = ({ formData, isEditMode, handleInputChange }) => {
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

    const renderSelectField = (label, name, value, options) => (
        <div className="">
            <label className="form-label">
                <strong>{label}</strong>
            </label>
            {isEditMode ? (
                <select className="form-select" name={name} value={value || ""} onChange={handleInputChange}>
                    <option value="">Select {label}</option>
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            ) : (
                <div className="form-control form-control-sm bg-light">{String(value || "N/A")}</div>
            )}
        </div>
    );

    return (
        <div className="modal-card ">
            <div className="modal-card-header">
                <h4 className="mb-0">Personal Information</h4>
            </div>
            <div className="modal-card-body">
                <div className="row">
                    <div className="col-md-4">
                        {renderSelectField("Marital Status", "maritalStatus", formData.maritalStatus, [
                            { value: "Single", label: "Single" },
                            { value: "Married", label: "Married" },
                            { value: "Divorced", label: "Divorced" },
                            { value: "Widowed", label: "Widowed" },
                        ])}
                    </div>
                    <div className="col-md-4">
                        {renderInputField("Date of Marriage", "dateOfMarriage", formData.dateOfMarriage, "date", "", false, {
                            min: DOM_MIN,
                            max: DOM_MAX,
                            disabled: formData.maritalStatus !== "Married",
                        })}
                    </div>
                    <div className="col-md-4">
                        {renderInputField("Marriage Years", "marriageYears", formData.marriageYears, "number", "", false, {
                            maxLength: 2,
                            inputMode: "numeric",
                        })}
                    </div>
                </div>
                <div className="row">
                    <div className="col-md-4">{renderInputField("Husband / Wife Name", "careOfPersonal", formData.careOfPersonal)}</div>
                    <div className="col-md-4">{renderInputField("Child 1", "childName1", formData.childName1)}</div>
                    <div className="col-md-4">{renderInputField("Child 2", "childName2", formData.childName2)}</div>
                </div>
                <div className="row">
                    <div className="col-md-4">{renderInputField("Religion", "religion", formData.religion)}</div>
                    <div className="col-md-4">{renderInputField("Caste", "cast", formData.cast)}</div>
                    <div className="col-md-4">{renderInputField("Sub Caste", "subCast", formData.subCast)}</div>
                </div>
            </div>
        </div>
    );
};

export default PersonalTab;