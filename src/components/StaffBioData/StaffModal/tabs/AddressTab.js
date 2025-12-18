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

    return (
        <>
            {/* Permanent Address Card */}
            <div className="card shadow-sm border-0 mb-4">
                <div className="card-header bg-white border-0 pt-4 pb-3">
                    <div className="d-flex align-items-center">
                        <div className="avatar-circle bg-primary me-3">
                            <i className="bi bi-house-door text-white"></i>
                        </div>
                        <div>
                            <h4 className="card-title mb-0">Permanent Address</h4>
                            <p className="text-muted mb-0">Your permanent residential address</p>
                        </div>
                    </div>
                    <hr className="mt-3"></hr>
                </div>
                <div className="card-body p-4">
                    <div className="row g-3">
                        <div className="col-md-4">
                            {renderInputField("Door No", "permanentAddress", formData.permanentAddress, "text", "Enter door number")}
                        </div>
                        <div className="col-md-4">
                            {renderInputField("Street", "permanentStreet", formData.permanentStreet, "text", "Enter street name")}
                        </div>
                        <div className="col-md-4">
                            {renderInputField("Landmark", "permanentLandmark", formData.permanentLandmark, "text", "Enter nearby landmark")}
                        </div>
                    </div>
                    <div className="row g-3 mt-2">
                        <div className="col-md-4">
                            {renderInputField("Village / Town", "permanentVillage", formData.permanentVillage, "text", "Enter village or town")}
                        </div>
                        <div className="col-md-4">
                            {renderInputField("Mandal", "permanentMandal", formData.permanentMandal, "text", "Enter mandal")}
                        </div>
                        <div className="col-md-4">
                            {renderInputField("District", "permanentDistrict", formData.permanentDistrict, "text", "Enter district")}
                        </div>
                    </div>
                    <div className="row g-3 mt-2">
                        <div className="col-md-4">
                            {renderInputField("State", "permanentState", formData.permanentState, "text", "Enter state")}
                        </div>
                        <div className="col-md-4">
                            {renderInputField("Pincode", "permanentPincode", formData.permanentPincode, "tel", "Enter 6-digit pincode", false, {
                                inputMode: "numeric",
                                maxLength: 6,
                                pattern: "^[0-9]{6}$",
                            })}
                        </div>
                    </div>
                </div>
                <div className="card-footer bg-white border-0 pb-4">
                    <div className="d-flex align-items-center text-muted">
                        <i className="bi bi-info-circle me-2"></i>
                        <small>This is your permanent address as per official records</small>
                    </div>
                </div>
            </div>

            {/* Present Address Card */}
            <div className="card shadow-sm border-0">
                <div className="card-header bg-white border-0 pt-4 pb-3">
                    <div className="d-flex align-items-center">
                        <div className="avatar-circle bg-success me-3">
                            <i className="bi bi-geo-alt text-white"></i>
                        </div>
                        <div>
                            <h4 className="card-title mb-0">Present Address</h4>
                            <p className="text-muted mb-0">Your current residential address</p>
                        </div>
                    </div>
                    <hr className="mt-3"></hr>
                </div>
                <div className="card-body p-4">
                    <div className="row g-3">
                        <div className="col-md-4">
                            {renderInputField("Door No", "presentAddress", formData.presentAddress, "text", "Enter door number")}
                        </div>
                        <div className="col-md-4">
                            {renderInputField("Street", "presentStreet", formData.presentStreet, "text", "Enter street name")}
                        </div>
                        <div className="col-md-4">
                            {renderInputField("Landmark", "presentLandmark", formData.presentLandmark, "text", "Enter nearby landmark")}
                        </div>
                    </div>
                    <div className="row g-3 mt-2">
                        <div className="col-md-4">
                            {renderInputField("Village / Town", "presentVillage", formData.presentVillage, "text", "Enter village or town")}
                        </div>
                        <div className="col-md-4">
                            {renderInputField("Mandal", "presentMandal", formData.presentMandal, "text", "Enter mandal")}
                        </div>
                        <div className="col-md-4">
                            {renderInputField("District", "presentDistrict", formData.presentDistrict, "text", "Enter district")}
                        </div>
                    </div>
                    <div className="row g-3 mt-2">
                        <div className="col-md-4">
                            {renderInputField("State", "presentState", formData.presentState, "text", "Enter state")}
                        </div>
                        <div className="col-md-4">
                            {renderInputField("Pincode", "presentPincode", formData.presentPincode, "tel", "Enter 6-digit pincode", false, {
                                inputMode: "numeric",
                                maxLength: 6,
                                pattern: "^[0-9]{6}$",
                            })}
                        </div>
                    </div>
                </div>
                <div className="card-footer bg-white border-0 pb-4">
                    <div className="d-flex align-items-center text-muted">
                        <i className="bi bi-info-circle me-2"></i>
                        <small>This is your current residential address</small>
                    </div>
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
        </>
    );
};

export default AddressTab;