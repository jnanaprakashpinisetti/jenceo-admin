import React from "react";

const AddressTab = ({ formData, isEditMode, handleInputChange }) => {
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

    return (
        <>
            <div className="modal-card ">
                <div className="modal-card-header">
                    <h4 className="mb-0">Permanent Address</h4>
                </div>
                <div className="modal-card-body">
                    <div className="row">
                        <div className="col-md-4">{renderInputField("Door No", "permanentAddress", formData.permanentAddress)}</div>
                        <div className="col-md-4">{renderInputField("Street", "permanentStreet", formData.permanentStreet)}</div>
                        <div className="col-md-4">{renderInputField("Landmark", "permanentLandmark", formData.permanentLandmark)}</div>
                    </div>
                    <div className="row">
                        <div className="col-md-4">{renderInputField("Village / Town", "permanentVillage", formData.permanentVillage)}</div>
                        <div className="col-md-4">{renderInputField("Mandal", "permanentMandal", formData.permanentMandal)}</div>
                        <div className="col-md-4">{renderInputField("District", "permanentDistrict", formData.permanentDistrict)}</div>
                    </div>
                    <div className="row">
                        <div className="col-md-4">{renderInputField("State", "permanentState", formData.permanentState)}</div>
                        <div className="col-md-4">
                            {renderInputField("Pincode", "permanentPincode", formData.permanentPincode, "tel", "", false, {
                                inputMode: "numeric",
                                maxLength: 6,
                                pattern: "^[0-9]{6}$",
                            })}
                        </div>
                    </div>
                </div>
            </div>
            <hr />
            <div className="modal-card ">
                <div className="modal-card-header">
                    <h4 className="mb-0">Present Address</h4>
                </div>
                <div className="modal-card-body">
                    <div className="row">
                        <div className="col-md-4">{renderInputField("Door No", "presentAddress", formData.presentAddress)}</div>
                        <div className="col-md-4">{renderInputField("Street", "presentStreet", formData.presentStreet)}</div>
                        <div className="col-md-4">{renderInputField("Landmark", "presentLandmark", formData.presentLandmark)}</div>
                    </div>
                    <div className="row">
                        <div className="col-md-4">{renderInputField("Village / Town", "presentVillage", formData.presentVillage)}</div>
                        <div className="col-md-4">{renderInputField("Mandal", "presentMandal", formData.presentMandal)}</div>
                        <div className="col-md-4">{renderInputField("District", "presentDistrict", formData.presentDistrict)}</div>
                    </div>
                    <div className="row">
                        <div className="col-md-4">{renderInputField("State", "presentState", formData.presentState)}</div>
                        <div className="col-md-4">
                            {renderInputField("Pincode", "presentPincode", formData.presentPincode, "tel", "", false, {
                                inputMode: "numeric",
                                maxLength: 6,
                                pattern: "^[0-9]{6}$",
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AddressTab;