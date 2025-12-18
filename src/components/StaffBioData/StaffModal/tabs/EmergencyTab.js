import React from "react";

const EmergencyTab = ({ formData, isEditMode, handleInputChange }) => {
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

    const renderPhoneField = (label, name, value, extraProps = {}) => {
        const digitsOnly = String(value || "").replace(/\D/g, "");
        const canCall = !!digitsOnly;
        
        return (
            <div className="form-group">
                <label className="form-label">
                    <strong>{label}</strong>
                </label>
                {isEditMode ? (
                    <div className="input-group input-group-sm">
                        <span className="input-group-text">
                            <i className="bi bi-telephone"></i>
                        </span>
                        <input
                            type="tel"
                            className="form-control form-control-sm"
                            name={name}
                            value={value || ""}
                            onChange={handleInputChange}
                            inputMode="numeric"
                            maxLength={10}
                            pattern="^[0-9]{10}$"
                            placeholder="Enter 10-digit number"
                            {...extraProps}
                        />
                    </div>
                ) : (
                    <div className="form-control form-control-sm bg-light d-flex align-items-center" style={{ minHeight: '38px' }}>
                        <i className="bi bi-telephone text-muted me-2"></i>
                        <span className="flex-grow-1">{value || <span className="text-muted">N/A</span>}</span>
                        {canCall && (
                            <a href={`tel:${digitsOnly}`} className="btn btn-sm btn-outline-danger ms-2">
                                <i className="bi bi-telephone-outbound me-1"></i>Call
                            </a>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderEmergencyContact = (contactKey, title, index) => {
        const contact = formData[contactKey] || {};
        const colors = ["danger", "warning", "primary"];
        const color = colors[index] || "secondary";
        const icons = ["bi-person-exclamation", "bi-people", "bi-person-badge"];
        const icon = icons[index] || "bi-person";
        
        return (
            <div className="card shadow-sm border-0 mb-4">
                <div className="card-header bg-white border-0 pt-3 pb-2">
                    <div className="d-flex align-items-center">
                        <div className={`avatar-circle bg-${color} me-3`}>
                            <i className={`bi ${icon} text-white`}></i>
                        </div>
                        <div>
                            <h5 className="card-title mb-0">{title}</h5>
                            <p className="text-muted mb-0">Emergency contact information</p>
                        </div>
                    </div>
                    <hr className="mt-2"></hr>
                </div>
                <div className="card-body p-4">
                    {/* Basic Information Row */}
                    <div className="row g-3 mb-3">
                        <div className="col-md-4">
                            {renderInputField("Name", `${contactKey}.name`, contact.name, "text", "Enter full name", true)}
                        </div>
                        <div className="col-md-4">
                            {renderInputField("Relation", `${contactKey}.relation`, contact.relation, "text", "Enter relationship", true)}
                        </div>
                        <div className="col-md-4">
                            {renderInputField("Door No", `${contactKey}.address`, contact.address, "text", "Enter door number")}
                        </div>
                    </div>
                    
                    {/* Address Information Row */}
                    <div className="row g-3 mb-3">
                        <div className="col-md-4">
                            {renderInputField("Village / Town", `${contactKey}.village`, contact.village, "text", "Enter village or town")}
                        </div>
                        <div className="col-md-4">
                            {renderInputField("Mandal / District", `${contactKey}.mandal`, contact.mandal, "text", "Enter mandal or district")}
                        </div>
                        <div className="col-md-4">
                            {renderInputField("State", `${contactKey}.state`, contact.state, "text", "Enter state")}
                        </div>
                    </div>
                    
                    {/* Contact Numbers Row */}
                    <div className="row g-3">
                        <div className="col-md-6">
                            <h6 className="mb-2 d-flex align-items-center">
                                <i className="bi bi-phone text-primary me-2"></i>
                                Primary Contact
                            </h6>
                            {renderPhoneField("Mobile 1", `${contactKey}.mobile1`, contact.mobile1)}
                        </div>
                        <div className="col-md-6">
                            <h6 className="mb-2 d-flex align-items-center">
                                <i className="bi bi-phone text-secondary me-2"></i>
                                Secondary Contact
                            </h6>
                            {renderPhoneField("Mobile 2", `${contactKey}.mobile2`, contact.mobile2)}
                        </div>
                    </div>
                </div>
                <div className="card-footer bg-white border-0 pb-3">
                    <div className="d-flex align-items-center text-muted">
                        <i className="bi bi-info-circle me-2"></i>
                        <small>This contact will be notified in case of emergencies</small>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-0 pt-4 pb-3">
                <div className="d-flex align-items-center">
                    <div className="avatar-circle bg-danger me-3">
                        <i className="bi bi-exclamation-triangle text-white"></i>
                    </div>
                    <div>
                        <h4 className="card-title mb-0">Emergency Contacts</h4>
                        <p className="text-muted mb-0">Emergency contact information for critical situations</p>
                    </div>
                </div>
                <hr className="mt-3"></hr>
            </div>
            <div className="card-body p-4">
                <div className="mb-4">
                    <div className="alert alert-warning d-flex align-items-center">
                        <i className="bi bi-exclamation-circle me-2"></i>
                        <div>
                            <strong>Important:</strong> Please ensure at least one emergency contact is always up-to-date.
                            These contacts will be notified in case of emergencies.
                        </div>
                    </div>
                </div>
                
                {renderEmergencyContact("emergencyContact1", "Emergency Contact 1", 0)}
                {renderEmergencyContact("emergencyContact2", "Emergency Contact 2", 1)}
                {renderEmergencyContact("emergencyContact3", "Emergency Contact 3", 2)}
            </div>
            <div className="card-footer bg-white border-0 pb-4">
                <div className="d-flex align-items-center text-muted">
                    <i className="bi bi-shield me-2"></i>
                    <small>Emergency contacts are critical for your safety and well-being</small>
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

export default EmergencyTab;