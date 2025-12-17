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
            "Ryle’s Tube Feeding (Nose Feeding)", "PEG Tube Feeding", "Oxygen Administration",
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
    const renderInputField = (label, name, value, type = "text") => (
        <div className="">
            <label className="form-label">
                <strong>{label}</strong>
            </label>
            {canEdit ? (
                <input
                    type={type}
                    className={"form-control form-control-sm" + (isEditMode ? " mb-2" : "")}
                    name={name}
                    value={value || ""}
                    onChange={handleInputChange}
                />
            ) : (
                <div className="form-control form-control-sm bg-light">{String(value || "N/A")}</div>
            )}
        </div>
    );

    const renderSelectField = (label, name, value, options) => (
        <div className="">
            <label className="form-label">
                <strong>{label}</strong>
            </label>
            {canEdit ? (
                <select className={"form-select" + (isEditMode ? " mb-2" : "")} name={name} value={value || ""} onChange={handleInputChange}>
                    <option value="">Select {label}</option>
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            ) : (
                <div className="form-control form-control-sm bg-light">{String(value || "N/A")}</div>
            )}
        </div>
    );

    return (
        <div className="modal-card">
            <div className="modal-card-header">
                <h4 className="mb-0">Qualification & Skills</h4>
            </div>
            <div className="modal-card-body">
                {/* Row 1: Qualification / School */}
                <div className="row">
                    <div className="col-md-4">
                        {renderInputField("Qualification", "qualification", formData.qualification)}
                    </div>
                    <div className="col-md-4">
                        {renderInputField("School/College", "schoolCollege", formData.schoolCollege)}
                    </div>
                    <div className="col-md-4">
                        {renderInputField("Work Experience", "workExperince", formData.workExperince, "text")}
                    </div>
                </div>

                {/* Row 2: Primary Skill + Mother Tongue + Languages */}
                <div className="row mt-2">
                    <div className="col-md-4">
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
                            ]
                        )}
                    </div>

                    <div className="col-md-4">
                        {renderSelectField(
                            "Mother Tongue",
                            "motherTongue",
                            formData.motherTongue,
                            [{ value: "", label: "Select" }, ...LANGUAGE_OPTIONS.map((l) => ({ value: l, label: l }))],
                        )}
                    </div>

                    <div className="col-md-4">
                        <label className="form-label"><strong>Languages</strong></label>
                        {isEditMode ? (
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
                        ) : (
                            <div>
                                {(Array.isArray(formData.languages) ? formData.languages : String(formData.languages || "").split(",").map(s => s.trim()).filter(Boolean)).map((l) => (
                                    <Chip key={l}>{l}</Chip>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Row 3: Nursing Skills (only when Primary Skill is Nursing) */}
                <div className="mt-3">
                    {String(formData.primarySkill || "").toLowerCase() === "nursing" && (
                        <>
                            <h6 className="mb-2">
                                <span className="badge bg-success me-2">Primary: Nursing</span>
                                <small className="text-muted">Select applicable nursing tasks</small>
                            </h6>

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
                                <div className="d-flex flex-wrap">
                                    {(Array.isArray(formData.nursingSkills) ? formData.nursingSkills : []).map((s) => (
                                        <Chip key={s}>{s}</Chip>
                                    ))}
                                    {(!formData.nursingSkills || formData.nursingSkills.length === 0) && (
                                        <div className="text-muted">No nursing tasks selected.</div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Row 4: Other Skills (ALWAYS VISIBLE) */}
                <div className="row mt-3">
                    <div className="col-md-12">
                        <h6 className="mb-2">
                            <span className="badge bg-warning text-dark me-2">Other Skills</span>
                            <small className="text-muted">Select additional skills from different categories</small>
                        </h6>

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
                            <div className="d-flex flex-wrap">
                                {(Array.isArray(formData.otherSkills) ? formData.otherSkills : []).map((s) => (
                                    <Chip key={s}>{s}</Chip>
                                ))}
                                {(!formData.otherSkills || formData.otherSkills.length === 0) && (
                                    <div className="text-muted">No other skills selected.</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QualificationSkills;