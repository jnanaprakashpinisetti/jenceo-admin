import React from "react";

const Address = ({ formData, canEdit, handleInputChange }) => {
    const renderInputField = (label, name, value, type = "text", extraProps = {}, icon = "bi-geo-alt") => (
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

    return (
        <>
            {/* Permanent Address Card */}
            <div className="card shadow-sm border-primary mb-4">
                <div className="card-header bg-primary text-white d-flex align-items-center">
                    <i className="bi bi-house-door-fill me-2 fs-5"></i>
                    <h4 className="mb-0">Permanent Address</h4>
                </div>
                <div className="card-body">
                    <div className="row g-3">
                        {/* Row 1 */}
                        <div className="col-md-4">
                            {renderInputField("Door No", "permanentAddress", formData.permanentAddress, "text", {}, "bi-door-open")}
                        </div>
                        <div className="col-md-4">
                            {renderInputField("Street", "permanentStreet", formData.permanentStreet, "text", {}, "bi-signpost")}
                        </div>
                        <div className="col-md-4">
                            {renderInputField("Landmark", "permanentLandmark", formData.permanentLandmark, "text", {}, "bi-geo")}
                        </div>
                        
                        {/* Row 2 */}
                        <div className="col-md-4">
                            {renderInputField("Village / Town", "permanentVillage", formData.permanentVillage, "text", {}, "bi-buildings")}
                        </div>
                        <div className="col-md-4">
                            {renderInputField("Mandal", "permanentMandal", formData.permanentMandal, "text", {}, "bi-map")}
                        </div>
                        <div className="col-md-4">
                            {renderInputField("District", "permanentDistrict", formData.permanentDistrict, "text", {}, "bi-globe")}
                        </div>
                        
                        {/* Row 3 */}
                        <div className="col-md-4">
                            {renderInputField("State", "permanentState", formData.permanentState, "text", {}, "bi-geo-alt-fill")}
                        </div>
                        <div className="col-md-4">
                            {renderInputField("Pincode", "permanentPincode", formData.permanentPincode, "tel", {
                                inputMode: "numeric",
                                maxLength: 6,
                                pattern: "^[0-9]{6}$",
                            }, "bi-mailbox")}
                        </div>
                    </div>
                    
                    {/* Status Indicator */}
                    <div className="mt-4 pt-3 border-top">
                        <div className="d-flex align-items-center">
                            <i className="bi bi-info-circle-fill text-info me-2"></i>
                            <small className="text-muted">
                                This is the permanent residential address as per official records.
                            </small>
                        </div>
                    </div>
                </div>
            </div>

            {/* Present Address Card */}
            <div className="card shadow-sm border-success">
                <div className="card-header bg-success text-white d-flex align-items-center">
                    <i className="bi bi-house-fill me-2 fs-5"></i>
                    <h4 className="mb-0">Present Address</h4>
                </div>
                <div className="card-body">
                    <div className="row g-3">
                        {/* Row 1 */}
                        <div className="col-md-4">
                            {renderInputField("Door No", "presentAddress", formData.presentAddress, "text", {}, "bi-door-open")}
                        </div>
                        <div className="col-md-4">
                            {renderInputField("Street", "presentStreet", formData.presentStreet, "text", {}, "bi-signpost")}
                        </div>
                        <div className="col-md-4">
                            {renderInputField("Landmark", "presentLandmark", formData.presentLandmark, "text", {}, "bi-geo")}
                        </div>
                        
                        {/* Row 2 */}
                        <div className="col-md-4">
                            {renderInputField("Village / Town", "presentVillage", formData.presentVillage, "text", {}, "bi-buildings")}
                        </div>
                        <div className="col-md-4">
                            {renderInputField("Mandal", "presentMandal", formData.presentMandal, "text", {}, "bi-map")}
                        </div>
                        <div className="col-md-4">
                            {renderInputField("District", "presentDistrict", formData.presentDistrict, "text", {}, "bi-globe")}
                        </div>
                        
                        {/* Row 3 */}
                        <div className="col-md-4">
                            {renderInputField("State", "presentState", formData.presentState, "text", {}, "bi-geo-alt-fill")}
                        </div>
                        <div className="col-md-4">
                            {renderInputField("Pincode", "presentPincode", formData.presentPincode, "tel", {
                                inputMode: "numeric",
                                maxLength: 6,
                                pattern: "^[0-9]{6}$",
                            }, "bi-mailbox")}
                        </div>
                    </div>
                    
                    {/* Status Indicator */}
                    <div className="mt-4 pt-3 border-top">
                        <div className="d-flex align-items-center">
                            <i className="bi bi-info-circle-fill text-info me-2"></i>
                            <small className="text-muted">
                                This is the current residential address where the employee currently resides.
                            </small>
                        </div>
                    </div>
                </div>
            </div>

            {/* Help/Info Card */}
            <div className="card shadow-sm border-info mt-4">
                <div className="card-header bg-info bg-opacity-10 border-info d-flex align-items-center">
                    <i className="bi bi-question-circle text-info me-2 fs-5"></i>
                    <h5 className="mb-0 text-info">Address Information</h5>
                </div>
                <div className="card-body">
                    <div className="row">
                        <div className="col-md-6">
                            <div className="d-flex align-items-start mb-3">
                                <i className="bi bi-check-circle-fill text-success me-2 mt-1"></i>
                                <div>
                                    <h6 className="mb-1">Permanent Address</h6>
                                    <p className="mb-0 text-muted small">
                                        The permanent address is usually the hometown or native place address.
                                        This should match with Aadhar card or other official documents.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="d-flex align-items-start mb-3">
                                <i className="bi bi-check-circle-fill text-success me-2 mt-1"></i>
                                <div>
                                    <h6 className="mb-1">Present Address</h6>
                                    <p className="mb-0 text-muted small">
                                        The present address is where the employee currently lives and can be contacted.
                                        This is used for local communication and emergency purposes.
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
                                    <strong>Note:</strong> If both addresses are same, please ensure to fill both sections with identical information.
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Address;