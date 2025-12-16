import React from "react";

const HealthInfo = ({ formData, setFormData, canEdit, handleInputChange }) => {
    const renderInputField = (label, name, value, type = "text", placeholder = "") => (
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
                    placeholder={placeholder}
                />
            ) : (
                <div className="form-control form-control-sm bg-light">{String(value || "N/A")}</div>
            )}
        </div>
    );

    const renderArrayField = (label, field, placeholder = "Add item") => (
        <div className="">
            <label className="form-label">
                <strong>{label}</strong>
            </label>
            {canEdit ? (
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
                                {canEdit && (
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
        <div className="modal-card">
            <div className="modal-card-header">
                <h4 className="mb-0">Health Details</h4>
            </div>
            <div className="modal-card-body">
                <div className="row">
                    <div className="col-md-6">{renderArrayField("Health Issues", "healthIssues", "Add health issue")}</div>
                    <div className="col-md-6">{renderInputField("Other Issues", "otherIssues", formData.otherIssues)}</div>
                </div>
                <div className="row">
                    <div className="col-md-6">{renderInputField("Height", "height", formData.height)}</div>
                    <div className="col-md-6">{renderInputField("Weight", "weight", formData.weight)}</div>
                </div>
                <div className="row">
                    <div className="col-md-6">{renderInputField("Blood Group", "bloodGroup", formData.bloodGroup)}</div>
                    <div className="col-md-6">
                        <label className="form-label">Dietary Preference</label>
                        <select
                            className="form-control"
                            name="dietaryPreference"
                            id="dietaryPreference"
                            value={formData.dietaryPreference || ""}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, dietaryPreference: e.target.value }))
                            }
                            disabled={!canEdit}
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
                </div>
            </div>
        </div>
    );
};

export default HealthInfo;