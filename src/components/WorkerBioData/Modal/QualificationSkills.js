import React from "react";
import MultiSelectDropdown from "./Common/MultiSelectDropdown";
import SkillAccordion from "./Common/SkillAccordion";
import Chip from "./Common/Chip";

const NURSING_SECTIONS = [
    {
        title: "Basic Patient Care", color: "success", skills: [
            "Bed Making", "Linen Change", "Bed Bath / Sponge Bath", "Oral Hygiene / Mouth Care",
            "Feeding Assistance", "Changing Diapers / Pads", "Elimination Assistance (Bedpan/Urinal)",
            "Perineal Care", "Comfort Positioning", "Patient Positioning / Turning",
            "Mobility Support (Wheelchair/Walker)", "Dressing Assistance",
        ]
    },
    {
        title: "Monitoring & Observation", color: "primary", skills: [
            "Vital Signs Monitoring", "Blood Pressure Check", "Temperature Monitoring",
            "Pulse and Respiration Check", "Blood Sugar Monitoring", "Intake/Output Charting",
            "Patient Observation & Reporting",
        ]
    },
    {
        title: "Feeding & Tubes", color: "info", skills: [
            "Ryle's Tube Feeding (Nose Feeding)", "PEG Tube Feeding", "Oxygen Administration",
            "Nebulization", "Suctioning (Oral/Nasal)",
        ]
    },
    {
        title: "Wounds & Skin", color: "warning", skills: [
            "Wound Dressing", "Pressure Sore Care & Prevention", "Skin Inspection & Hygiene",
        ]
    },
    {
        title: "Catheters & Special Care", color: "danger", skills: [
            "Catheterization (Male/Female)", "Catheter Care & Cleaning", "Colostomy Care",
            "Tracheostomy Care", "IV Line Observation", "Drip Monitoring", "Injection Assistance",
        ]
    },
    {
        title: "Documentation & Coordination", color: "secondary", skills: [
            "Medication Assistance (as per schedule)", "Daily Nursing Notes",
            "Family Coordination / Updates", "Emergency Response Assistance",
            "Hygiene & Sanitization (Handwash/PPE)",
        ]
    },
];

const OTHER_SECTIONS = [
    {
        title: "Office & Administrative", color: "primary", skills: [
            "Computer Operating", "Data Entry", "Office Assistant", "Receptionist", "Front Desk Executive",
            "Admin Assistant", "Office Boy", "Peon", "Office Attendant",
        ]
    },
    {
        title: "Customer Service & Telecommunication", color: "success", skills: [
            "Tele Calling", "Customer Support", "Telemarketing", "BPO Executive", "Call Center Agent",
            "Customer Care Executive",
        ]
    },
    {
        title: "Management & Supervision", color: "warning", skills: [
            "Supervisor", "Manager", "Team Leader", "Site Supervisor", "Project Coordinator",
        ]
    },
    {
        title: "Security", color: "danger", skills: [
            "Security Guard", "Security Supervisor", "Gatekeeper", "Watchman",
        ]
    },
    {
        title: "Driving & Logistics", color: "info", skills: [
            "Driving", "Delivery Boy", "Delivery Executive", "Rider", "Driver", "Car Driver",
            "Bike Rider", "Logistics Helper",
        ]
    },
    {
        title: "Technical & Maintenance", color: "secondary", skills: [
            "Electrician", "Plumber", "Carpenter", "Painter", "Mason", "AC Technician", "Mechanic",
            "Maintenance Staff", "House Keeping", "Housekeeping Supervisor",
        ]
    },
    {
        title: "Industrial & Labor", color: "danger", skills: [
            "Labour", "Helper", "Loading Unloading", "Warehouse Helper", "Factory Worker",
            "Production Helper", "Packaging Staff",
        ]
    },
    {
        title: "Retail & Sales", color: "primary", skills: [
            "Sales Boy", "Sales Girl", "Store Helper", "Retail Assistant", "Shop Attendant",
        ]
    },
];

const QualificationSkills = ({
    formData,
    setFormData,
    canEdit,
    isEditMode,
    LANGUAGE_OPTIONS,
    handleInputChange,
    setHasUnsavedChanges
}) => {
    const renderInputField = (label, name, value, type = "text", iconName) => (
        <div className="mb-3">
            <label className="form-label text-muted small mb-1 d-flex align-items-center">
                {iconName && <i className={`bi bi-${iconName} me-1`}></i>}
                <strong>{label}</strong>
            </label>
            {canEdit ? (
                <div className="input-group input-group-sm">
                    {iconName && (
                        <span className="input-group-text">
                            <i className={`bi bi-${iconName}`}></i>
                        </span>
                    )}
                    <input
                        type={type}
                        className="form-control"
                        name={name}
                        value={value || ""}
                        onChange={handleInputChange}
                    />
                </div>
            ) : (
                <div className={`d-flex align-items-center border rounded p-2 bg-light ${!iconName ? 'ps-3' : ''}`}>
                    {iconName && <i className={`bi bi-${iconName} text-primary me-2`}></i>}
                    <span>{String(value || "Not specified")}</span>
                </div>
            )}
        </div>
    );

    const renderSelectField = (label, name, value, options, iconName) => (
        <div className="mb-3">
            <label className="form-label text-muted small mb-1 d-flex align-items-center">
                {iconName && <i className={`bi bi-${iconName} me-1`}></i>}
                <strong>{label}</strong>
            </label>
            {canEdit ? (
                <div className="input-group input-group-sm">
                    {iconName && (
                        <span className="input-group-text">
                            <i className={`bi bi-${iconName}`}></i>
                        </span>
                    )}
                    <select className="form-select" name={name} value={value || ""} onChange={handleInputChange}>
                        <option value="">Select {label}</option>
                        {options.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            ) : (
                <div className={`d-flex align-items-center border rounded p-2 bg-light ${!iconName ? 'ps-3' : ''}`}>
                    {iconName && <i className={`bi bi-${iconName} text-primary me-2`}></i>}
                    <span>{String(value || "Not specified")}</span>
                </div>
            )}
        </div>
    );

    return (
        <div className="card shadow-sm border-0">
            <div className="card-header bg-warning bg-opacity-10 border-0 d-flex align-items-center">
                <i className="bi bi-mortarboard-fill fs-4 text-warning me-2"></i>
                <h4 className="mb-0 text-warning">Qualification & Skills</h4>
            </div>
            <div className="card-body p-4">
                <div className="row g-4">
                    {/* Education & Qualification Section */}
                    <div className="col-lg-6">
                        <div className="card h-100 border">
                            <div className="card-body">
                                <h5 className="card-title d-flex align-items-center text-muted mb-3">
                                    <i className="bi bi-book me-2"></i>
                                    Education & Qualification
                                </h5>
                                <div className="row">
                                    <div className="col-md-12 mb-3">
                                        {renderInputField("Qualification", "qualification", formData.qualification, "text", "award")}
                                    </div>
                                    <div className="col-md-6">
                                        {renderInputField("School/College", "schoolCollege", formData.schoolCollege, "text", "building")}
                                    </div>
                                    <div className="col-md-6">
                                        {renderInputField("Work Experience", "workExperince", formData.workExperince, "text", "briefcase")}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Skills & Languages Section */}
                    <div className="col-lg-6">
                        <div className="card h-100 border">
                            <div className="card-body">
                                <h5 className="card-title d-flex align-items-center text-muted mb-3">
                                    <i className="bi bi-tools me-2"></i>
                                    Skills & Languages
                                </h5>
                                <div className="row">
                                    <div className="col-md-12 mb-3">
                                        {renderSelectField(
                                            "Primary Skill",
                                            "primarySkill",
                                            formData.primarySkill,
                                            [
                                                { value: "", label: "Select" },
                                                { value: "Nursing", label: "Nursing" },
                                                { value: "Patient Care", label: "Patient Care" },
                                                { value: "Care Taker", label: "Care Taker" },
                                                { value: "Baby Care", label: "Baby Care" },
                                                { value: "Supporting", label: "Supporting" },
                                                { value: "Diaper", label: "Diaper" },
                                                { value: "Cook", label: "Cook" },
                                                { value: "Housekeeping", label: "Housekeeping" },
                                                { value: "Old Age Care", label: "Old Age Care" },
                                                { value: "Any Duty", label: "Any Duty" },
                                            ],
                                            "star"
                                        )}
                                    </div>
                                    <div className="col-md-6">
                                        {renderSelectField(
                                            "Mother Tongue",
                                            "motherTongue",
                                            formData.motherTongue,
                                            [{ value: "", label: "Select" }, ...LANGUAGE_OPTIONS.map((l) => ({ value: l, label: l }))],
                                            "chat-left-text"
                                        )}
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label text-muted small mb-1 d-flex align-items-center">
                                                <i className="bi bi-translate me-1"></i>
                                                <strong>Languages</strong>
                                            </label>
                                            {isEditMode ? (
                                                <div className="input-group input-group-sm">
                                                    <span className="input-group-text">
                                                        <i className="bi bi-translate"></i>
                                                    </span>
                                                    <MultiSelectDropdown
                                                        label="Languages"
                                                        options={LANGUAGE_OPTIONS}
                                                        value={Array.isArray(formData.languages) ? formData.languages : []}
                                                        onChange={(arr) => {
                                                            setFormData((p) => ({ ...p, languages: arr }));
                                                            setHasUnsavedChanges(true);
                                                        }}
                                                        btnClass="btn-outline-info"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="border rounded p-2 bg-light">
                                                    {(Array.isArray(formData.languages) ? formData.languages : String(formData.languages || "").split(",").map(s => s.trim()).filter(Boolean)).length > 0 ? (
                                                        <div className="d-flex flex-wrap gap-1">
                                                            {(Array.isArray(formData.languages) ? formData.languages : String(formData.languages || "").split(",").map(s => s.trim()).filter(Boolean)).map((l) => (
                                                                <Chip key={l}>
                                                                    <i className="bi bi-translate me-1"></i>
                                                                    {l}
                                                                </Chip>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-muted d-flex align-items-center">
                                                            <i className="bi bi-dash-circle me-2"></i>
                                                            No languages specified
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Nursing Skills Section - Conditional */}
                    {String(formData.primarySkill || "").toLowerCase() === "nursing" && (
                        <div className="col-12">
                            <div className="card border border-success">
                                <div className="card-header bg-success bg-opacity-10 border-0 d-flex align-items-center">
                                    <i className="bi bi-heart-pulse fs-5 text-success me-2"></i>
                                    <h5 className="mb-0 text-success d-flex align-items-center">
                                        Nursing Skills
                                        <span className="badge bg-success ms-2">Primary Skill</span>
                                    </h5>
                                </div>
                                <div className="card-body">
                                    {isEditMode ? (
                                        <SkillAccordion
                                            idPrefix="nursing"
                                            sections={NURSING_SECTIONS}
                                            selected={Array.isArray(formData.nursingSkills) ? formData.nursingSkills : []}
                                            onToggle={(skill) => {
                                                setFormData((p) => {
                                                    const arr = Array.isArray(p.nursingSkills) ? p.nursingSkills.slice() : [];
                                                    const has = arr.includes(skill);
                                                    return { ...p, nursingSkills: has ? arr.filter((x) => x !== skill) : [...arr, skill] };
                                                });
                                                setHasUnsavedChanges(true);
                                            }}
                                        />
                                    ) : (
                                        <div className="border rounded p-3 bg-light">
                                            {(Array.isArray(formData.nursingSkills) ? formData.nursingSkills : []).length > 0 ? (
                                                <div className="d-flex flex-wrap gap-2">
                                                    {(Array.isArray(formData.nursingSkills) ? formData.nursingSkills : []).map((s) => (
                                                        <Chip key={s} color="success">
                                                            <i className="bi bi-check-circle me-1"></i>
                                                            {s}
                                                        </Chip>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-muted d-flex align-items-center">
                                                    <i className="bi bi-info-circle me-2"></i>
                                                    No nursing tasks selected
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Other Skills Section - Always Visible */}
                    <div className="col-12">
                        <div className="card border border-warning">
                            <div className="card-header bg-warning bg-opacity-10 border-0 d-flex align-items-center">
                                <i className="bi bi-puzzle fs-5 text-warning me-2"></i>
                                <h5 className="mb-0 text-warning">Other Skills & Capabilities</h5>
                            </div>
                            <div className="card-body">
                                {isEditMode ? (
                                    <SkillAccordion
                                        idPrefix="others"
                                        sections={OTHER_SECTIONS}
                                        selected={Array.isArray(formData.otherSkills) ? formData.otherSkills : []}
                                        onToggle={(skill) => {
                                            setFormData((p) => {
                                                const arr = Array.isArray(p.otherSkills) ? p.otherSkills.slice() : [];
                                                const has = arr.includes(skill);
                                                return { ...p, otherSkills: has ? arr.filter((x) => x !== skill) : [...arr, skill] };
                                            });
                                            setHasUnsavedChanges(true);
                                        }}
                                    />
                                ) : (
                                    <div className="border rounded p-3 bg-light">
                                        {(Array.isArray(formData.otherSkills) ? formData.otherSkills : []).length > 0 ? (
                                            <div className="d-flex flex-wrap gap-2">
                                                {(Array.isArray(formData.otherSkills) ? formData.otherSkills : []).map((s) => (
                                                    <Chip key={s} color="warning">
                                                        <i className="bi bi-check-circle me-1"></i>
                                                        {s}
                                                    </Chip>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-muted d-flex align-items-center">
                                                <i className="bi bi-info-circle me-2"></i>
                                                No other skills selected
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* View-only Mode Indicator */}
                {!canEdit && (
                    <div className="text-center mt-4 pt-3 border-top">
                        <small className="text-muted d-flex align-items-center justify-content-center">
                            <i className="bi bi-eye me-1"></i>
                            This information is view-only. Contact administrator to edit.
                        </small>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QualificationSkills;