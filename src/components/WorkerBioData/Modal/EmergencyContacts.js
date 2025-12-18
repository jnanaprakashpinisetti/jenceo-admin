import React from "react";

const EmergencyContacts = ({ formData, setFormData, canEdit, handleInputChange }) => {
    
    // Helper function to set nested form data
    const setNestedFormData = (obj, path, value) => {
        const keys = path.split(".");
        const next = { ...obj };
        let current = next;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            current[key] = typeof current[key] === "object" && current[key] !== null 
                ? { ...current[key] } 
                : {};
            current = current[key];
        }
        
        current[keys[keys.length - 1]] = value;
        return next;
    };

    // Render a standard input field
    const renderInputField = (label, name, value, type = "text") => (
        <div className="form-group">
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
                    placeholder={`Enter ${label.toLowerCase()}`}
                />
            ) : (
                <div className="form-control form-control-sm bg-light">
                    {String(value || "N/A")}
                </div>
            )}
        </div>
    );

    // Render a phone field with call and WhatsApp buttons
    const renderPhoneField = (label, name, value) => {
        const digitsOnly = String(value || "").replace(/\D/g, "");
        const canCall = digitsOnly.length > 0;
        const whatsappMessage = "Hello, This is Sudheer From JenCeo Home Care Services";

        return (
            <div className="form-group">
                <label className="form-label">
                    <strong>{label}</strong>
                </label>
                {canEdit ? (
                    <input
                        type="tel"
                        className="form-control form-control-sm"
                        name={name}
                        value={value || ""}
                        onChange={handleInputChange}
                        inputMode="numeric"
                        maxLength={10}
                        pattern="^[0-9]{10}$"
                        placeholder="Enter 10-digit phone number"
                    />
                ) : (
                    <div className="form-control form-control-sm bg-light d-flex align-items-center justify-content-between">
                        <span className="text-truncate">{value || "N/A"}</span>
                        <div className="d-flex gap-1">
                            {canCall && (
                                <a 
                                    href={`tel:${digitsOnly}`} 
                                    className="btn btn-sm btn-outline-primary"
                                    title="Call"
                                >
                                    <i className="bi bi-telephone"></i> Call
                                </a>
                            )}
                            {canCall && (
                                <a
                                    href={`https://wa.me/${digitsOnly}?text=${encodeURIComponent(whatsappMessage)}`}
                                    className="btn btn-sm btn-success"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="WhatsApp"
                                >
                                    <i className="bi bi-whatsapp"></i> WhatsApp
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Render an emergency contact section
    const renderEmergencyContact = (contactKey, title) => {
        const contact = formData[contactKey] || {};

        const handleContactChange = (e) => {
            const { name, value } = e.target;
            setFormData((prev) => 
                name.includes(".") 
                    ? setNestedFormData(prev || {}, name, value) 
                    : { ...prev, [name]: value }
            );
        };

        return (
            <div className="card mb-3">
                <div className="card-header bg-light py-2">
                    <h5 className="mb-0">
                        <strong>{title}</strong>
                    </h5>
                </div>
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-4">
                            {renderInputField("Name", `${contactKey}.name`, contact.name)}
                        </div>
                        <div className="col-md-4">
                            {renderInputField("Relation", `${contactKey}.relation`, contact.relation)}
                        </div>
                        <div className="col-md-4">
                            {renderInputField("Door No", `${contactKey}.address`, contact.address)}
                        </div>
                        
                        <div className="col-md-4">
                            {renderInputField("Village / Town", `${contactKey}.village`, contact.village)}
                        </div>
                        <div className="col-md-4">
                            {renderInputField("Mandal / Dist", `${contactKey}.mandal`, contact.mandal)}
                        </div>
                        <div className="col-md-4">
                            {renderInputField("State", `${contactKey}.state`, contact.state)}
                        </div>
                        
                        <div className="col-md-4">
                            {renderPhoneField("Mobile 1", `${contactKey}.mobile1`, contact.mobile1)}
                        </div>
                        <div className="col-md-4">
                            {renderPhoneField("Mobile 2", `${contactKey}.mobile2`, contact.mobile2)}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="card">
            <div className="card-header bg-primary text-white">
                <h4 className="mb-0">Emergency Contacts</h4>
            </div>
            <div className="card-body">
                {renderEmergencyContact("emergencyContact1", "Emergency Contact 1")}
                {renderEmergencyContact("emergencyContact2", "Emergency Contact 2")}
                {renderEmergencyContact("emergencyContact3", "Emergency Contact 3")}
            </div>
        </div>
    );
};

export default EmergencyContacts;