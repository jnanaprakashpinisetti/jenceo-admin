import React from "react";

const HealthInfo = ({ formData, setFormData, canEdit, handleInputChange }) => {
    const renderInputField = (label, name, value, type = "text", placeholder = "", iconName) => (
        <div className="mb-3">
            <label className="form-label text-muted small mb-1">
                <i className={`bi bi-${iconName} me-1`}></i>
                <strong>{label}</strong>
            </label>
            {canEdit ? (
                <div className="input-group input-group-sm">
                    <span className="input-group-text">
                        <i className={`bi bi-${iconName}`}></i>
                    </span>
                    <input
                        type={type}
                        className="form-control"
                        name={name}
                        value={value || ""}
                        onChange={handleInputChange}
                        placeholder={placeholder}
                    />
                </div>
            ) : (
                <div className="d-flex align-items-center border rounded p-2 bg-light">
                    <i className={`bi bi-${iconName} text-primary me-2`}></i>
                    <span>{String(value || "Not specified")}</span>
                </div>
            )}
        </div>
    );

    const renderArrayField = (label, field, placeholder = "Add item", iconName) => (
        <div className="mb-3">
            <label className="form-label text-muted small mb-1">
                <i className={`bi bi-${iconName} me-1`}></i>
                <strong>{label}</strong>
            </label>
            {canEdit ? (
                <>
                    <div className="input-group input-group-sm mb-2">
                        <span className="input-group-text">
                            <i className={`bi bi-${iconName}`}></i>
                        </span>
                        <input
                            type="text"
                            className="form-control"
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
                                className="btn btn-outline-danger"
                                onClick={() => setFormData((prev) => ({ ...prev, [field]: [] }))}
                                title="Clear All"
                            >
                                <i className="bi bi-trash"></i>
                            </button>
                        )}
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                        {(formData[field] || []).map((item, index) => (
                            <div key={index} className="badge bg-primary bg-opacity-10 text-white border border-primary border-opacity-25 d-flex align-items-center p-2">
                                <i className="bi bi-check-circle me-1"></i>
                                {item}
                                {canEdit && (
                                    <button
                                        type="button"
                                        className="btn-close btn-close-sm ms-2"
                                        style={{ fontSize: "0.5rem" }}
                                        onClick={() =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                [field]: prev[field].filter((_, i) => i !== index),
                                            }))
                                        }
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="border rounded p-2 bg-light">
                    {(formData[field] || []).length ? (
                        <div className="d-flex flex-wrap gap-2">
                            {(formData[field] || []).map((item, index) => (
                                <span key={index} className="badge bg-primary bg-opacity-10 text-white border border-primary border-opacity-25 p-2">
                                    <i className="bi bi-check-circle me-1"></i>
                                    {item}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <div className="text-muted d-flex align-items-center">
                            <i className="bi bi-dash-circle me-2"></i>
                            Not specified
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div className="card shadow-sm border-0">
            <div className="card-header bg-primary bg-opacity-10 border-0 d-flex align-items-center">
                <i className="bi bi-heart-pulse fs-4 text-primary me-2"></i>
                <h4 className="mb-0 text-primary">Health Details</h4>
            </div>
            <div className="card-body p-4">
                <div className="row g-4">
                    <div className="col-lg-6">
                        <div className="card h-100 border">
                            <div className="card-body">
                                <h5 className="card-title d-flex align-items-center text-muted mb-3">
                                    <i className="bi bi-clipboard2-pulse me-2"></i>
                                    Medical Information
                                </h5>
                                {renderArrayField("Health Issues", "healthIssues", "Add health issue", "clipboard2-pulse")}
                                {renderInputField("Other Issues", "otherIssues", formData.otherIssues, "text", "Additional health concerns", "journal-medical")}
                            </div>
                        </div>
                    </div>
                    
                    <div className="col-lg-6">
                        <div className="card h-100 border">
                            <div className="card-body">
                                <h5 className="card-title d-flex align-items-center text-muted mb-3">
                                    <i className="bi bi-person-lines-fill me-2"></i>
                                    Physical Details
                                </h5>
                                <div className="row">
                                    <div className="col-md-6">
                                        {renderInputField("Height", "height", formData.height, "text", "e.g., 5'10\" or 178cm", "arrows-expand")}
                                    </div>
                                    <div className="col-md-6">
                                        {renderInputField("Weight", "weight", formData.weight, "text", "e.g., 70kg or 154lbs", "speedometer")}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="col-12">
                        <div className="card border">
                            <div className="card-body">
                                <h5 className="card-title d-flex align-items-center text-muted mb-3">
                                    <i className="bi bi-droplet me-2"></i>
                                    Blood & Dietary Information
                                </h5>
                                <div className="row">
                                    <div className="col-md-6">
                                        {renderInputField("Blood Group", "bloodGroup", formData.bloodGroup, "text", "e.g., A+, O-", "droplet")}
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label text-muted small mb-1 d-flex align-items-center">
                                                <i className="bi bi-egg-fried me-1"></i>
                                                <strong>Dietary Preference</strong>
                                            </label>
                                            {canEdit ? (
                                                <div className="input-group">
                                                    <span className="input-group-text">
                                                        <i className="bi bi-egg-fried"></i>
                                                    </span>
                                                    <select
                                                        className="form-control"
                                                        name="dietaryPreference"
                                                        id="dietaryPreference"
                                                        value={formData.dietaryPreference || ""}
                                                        onChange={(e) =>
                                                            setFormData((prev) => ({ ...prev, dietaryPreference: e.target.value }))
                                                        }
                                                    >
                                                        <option value="">Select Dietary Preference</option>
                                                        <option value="Vegetarian">Vegetarian</option>
                                                        <option value="Non-Vegetarian">Non-Vegetarian</option>
                                                        <option value="Veg & Non-Veg">Veg & Non-Veg</option>
                                                        <option value="Eggetarian">Eggetarian</option>
                                                        <option value="Vegan">Vegan</option>
                                                        <option value="Jain">Jain</option>
                                                        <option value="No Onion No Garlic">No Onion No Garlic</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                </div>
                                            ) : (
                                                <div className="d-flex align-items-center border rounded p-2 bg-light">
                                                    <i className="bi bi-egg-fried text-primary me-2"></i>
                                                    <span>{formData.dietaryPreference || "Not specified"}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {!canEdit && (
                    <div className="text-center mt-4 pt-3 border-top">
                        <small className="text-muted">
                            <i className="bi bi-info-circle me-1"></i>
                            This information is view-only. Contact administrator to edit.
                        </small>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HealthInfo;