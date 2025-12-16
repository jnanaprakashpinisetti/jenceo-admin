import React from "react";

const Address = ({ formData, canEdit, handleInputChange }) => {
    const renderInputField = (label, name, value, type = "text", extraProps = {}) => (
        <div className="">
            <label className="form-label">
                <strong>{label}</strong>
            </label>
            {canEdit ? (
                <input
                    type={type}
                    className="form-control form-control-sm"
                    name={name}
                    value={value || ""}
                    onChange={handleInputChange}
                    {...extraProps}
                />
            ) : (
                <div className="form-control form-control-sm bg-light">{String(value || "N/A")}</div>
            )}
        </div>
    );

    return (
        <>
            <div className="modal-card">
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
                            {renderInputField("Pincode", "permanentPincode", formData.permanentPincode, "tel", {
                                inputMode: "numeric",
                                maxLength: 6,
                                pattern: "^[0-9]{6}$",
                            })}
                        </div>
                    </div>
                </div>
            </div>
            <hr />
            <div className="modal-card">
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
                            {renderInputField("Pincode", "presentPincode", formData.presentPincode, "tel", {
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

export default Address;