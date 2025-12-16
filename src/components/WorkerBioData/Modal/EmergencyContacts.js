import React from "react";

const EmergencyContacts = ({ formData, setFormData, canEdit, handleInputChange }) => {
    const renderInputField = (label, name, value, type = "text") => (
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
                />
            ) : (
                <div className="form-control form-control-sm bg-light">{String(value || "N/A")}</div>
            )}
        </div>
    );

    const renderPhoneField = (label, name, value) => {
        const digitsOnly = String(value || "").replace(/\D/g, "");
        const canCall = !!digitsOnly;
        return (
            <div className="">
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
                    />
                ) : (
                    <div className="form-control form-control-sm bg-light d-flex align-items-center">
                        <span>{value || "N/A"}</span>
                        {canCall && (
                            <a href={`tel:${digitsOnly}`} className="btn btn-sm btn-outline-primary ms-2 mb-1">
                                Call
                            </a>
                        )}
                        <a
                            className="btn btn-sm btn-warning ms-1 mb-1"
                            href={`https://wa.me/${digitsOnly?.replace(/\D/g, '')}?text=${encodeURIComponent(
                                "Hello, This is Sudheer From JenCeo Home Care Services"
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            WAP
                        </a>
                    </div>
                )}
            </div>
        );
    };

    const renderEmergencyContact = (contactKey, title) => {
        const contact = formData[contactKey] || {};
        const setNested = (obj, path, value) => {
            const keys = path.split(".");
            const next = { ...obj };
            let cur = next;
            for (let i = 0; i < keys.length - 1; i++) {
                const k = keys[i];
                cur[k] = typeof cur[k] === "object" && cur[k] !== null ? { ...cur[k] } : {};
                cur = cur[k];
            }
            cur[keys[keys.length - 1]] = value;
            return next;
        };

        const handleContactChange = (e) => {
            const { name, value } = e.target;
            setFormData((prev) => (name.includes(".") ? setNested(prev || {}, name, value) : { ...prev, [name]: value }));
        };

        return (
            <div className="modal-card">
                <div className="modal-card-header bg-light py-1">
                    <strong>{title}</strong>
                </div>
                <div className="modal-card-body py-2">
                    <div className="row">
                        <div className="col-md-4">{renderInputField("Name", `${contactKey}.name`, contact.name)}</div>
                        <div className="col-md-4">{renderInputField("Relation", `${contactKey}.relation`, contact.relation)}</div>
                        <div className="col-md-4">{renderInputField("Door No", `${contactKey}.address`, contact.address)}</div>
                    </div>
                    <div className="row">
                        <div className="col-md-4">{renderInputField("Village / Town", `${contactKey}.village`, contact.village)}</div>
                        <div className="col-md-4">{renderInputField("Mandal / Dist", `${contactKey}.mandal`, contact.mandal)}</div>
                        <div className="col-md-4">{renderInputField("State", `${contactKey}.state`, contact.state)}</div>
                    </div>
                    <div className="row">
                        <div className="col-md-4">{renderPhoneField("Mobile 1", `${contactKey}.mobile1`, contact.mobile1)}</div>
                        <div className="col-md-4">{renderPhoneField("Mobile 2", `${contactKey}.mobile2`, contact.mobile2)}</div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="modal-card">
            <div className="modal-card-header">
                <h4 className="mb-0">Emergency Contacts</h4>
            </div>
            <div className="modal-card-body">
                {renderEmergencyContact("emergencyContact1", "Emergency Contact 1")}
                {renderEmergencyContact("emergencyContact2", "Emergency Contact 2")}
                {renderEmergencyContact("emergencyContact3", "Emergency Contact 3")}
            </div>
        </div>
    );
};

export default EmergencyContacts;