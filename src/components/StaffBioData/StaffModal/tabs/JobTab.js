import React, { useState } from "react";

const JobTab = ({ formData, isEditMode, handleInputChange, isSuperAdmin }) => {
    const [superAdminUnlock, setSuperAdminUnlock] = useState(false);
    const lockJob = isEditMode && (!isSuperAdmin || !superAdminUnlock);

    const renderInputField = (label, name, value, type = "text", placeholder = "", required = false, extraProps = {}, icon = "bi-pencil") => {
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
                        <i className={`bi ${icon}`}></i>
                    </span>
                    <input {...inputProps} />
                </div>
            </div>
        );
    };

    const renderSelectField = (label, name, value, options, placeholder, disabled = false, icon = "bi-list-ul") => {
        return (
            <div className="form-group">
                <label className="form-label">
                    <strong>{label}</strong>
                </label>
                {isEditMode ? (
                    <div className="input-group input-group-sm">
                        <span className="input-group-text">
                            <i className={`bi ${icon}`}></i>
                        </span>
                        <select
                            className="form-select form-select-sm"
                            name={name}
                            value={value || ""}
                            onChange={handleInputChange}
                            disabled={disabled}
                        >
                            <option value="">{placeholder}</option>
                            {options.map((option, index) => (
                                <option key={index} value={option}>{option}</option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <div className="form-control form-control-sm bg-light d-flex align-items-center" style={{ minHeight: '38px' }}>
                        <i className="bi bi-info-circle text-muted me-2"></i>
                        {value || <span className="text-muted">Not selected</span>}
                    </div>
                )}
            </div>
        );
    };

    const renderSalaryField = (label, name, value, disabled = false) => {
        return renderInputField(
            label, 
            name, 
            value, 
            "tel", 
            "Enter amount", 
            false, 
            { 
                maxLength: 7, 
                disabled: disabled,
                inputMode: "numeric",
                pattern: "^[0-9]*$"
            }, 
            "bi-cash-coin"
        );
    };

    return (
        <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-0 pt-4 pb-3">
                <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                        <div className="avatar-circle bg-primary me-3">
                            <i className="bi bi-briefcase text-white"></i>
                        </div>
                        <div>
                            <h4 className="card-title mb-0">Job & Payroll</h4>
                            <p className="text-muted mb-0">Job designation and salary information</p>
                        </div>
                    </div>
                    {isSuperAdmin && isEditMode && (
                        <button
                            type="button"
                            className={`btn btn-sm ${superAdminUnlock ? "btn-warning" : "btn-outline-warning"}`}
                            onClick={() => setSuperAdminUnlock(v => !v)}
                            title="Super Admin unlock for sensitive fields"
                        >
                            <i className={`bi ${superAdminUnlock ? "bi-lock-fill" : "bi-unlock"} me-1`}></i>
                            {superAdminUnlock ? "Lock Sensitive Fields" : "Unlock Sensitive Fields"}
                        </button>
                    )}
                </div>
                <hr className="mt-3"></hr>
            </div>
            <div className="card-body p-4">
                {/* Department & Designation Section */}
                <div className="mb-4">
                    <h5 className="mb-3 d-flex align-items-center">
                        <i className="bi bi-building text-primary me-2"></i>
                        Department & Designation
                    </h5>
                    <div className="row g-3">
                        <div className="col-md-6">
                            {renderSelectField(
                                "Department", 
                                "department", 
                                formData.department, 
                                [
                                    "Founders", "Management / Executive", "Human Resources (HR)", "Finance & Accounts",
                                    "Administration", "Operations", "Information Technology (IT)", "Engineering / Technical",
                                    "Design / Creative", "Sales & Marketing", "Customer Support / Service",
                                    "Procurement / Purchase", "Quality Assurance (QA)", "Legal & Compliance",
                                    "Research & Development (R&D)", "Training & Development", "Security / Facility",
                                    "Logistics / Fleet"
                                ], 
                                "-- Select Department --", 
                                lockJob,
                                "bi-buildings"
                            )}
                        </div>
                        <div className="col-md-6">
                            {(() => {
                                const designationsMap = {
                                    "Founders": ["Founder", "Co-Founder", "Managing Director", "Executive Director"],
                                    "Management / Executive": ["CEO", "COO", "General Manager", "Assistant General Manager", "Branch / Unit Manager"],
                                    "Human Resources (HR)": ["HR Manager", "HR Executive", "Talent Acquisition Specialist", "Payroll Executive", "HR Assistant"],
                                    "Finance & Accounts": ["Chief Accountant", "Accounts Manager", "Accountant", "Billing Executive", "Finance Analyst"],
                                    "Administration": ["Admin Manager", "Admin Coordinator", "Front Office Executive", "Admin Assistant", "Receptionist"],
                                    "Operations": ["Operations Manager", "Operations Executive", "Field Supervisor", "Coordinator", "Operations Assistant"],
                                    "Information Technology (IT)": ["IT Manager", "System Administrator", "Software Developer", "Web Developer", "Network Engineer", "Technical Support Engineer", "QA Tester"],
                                    "Engineering / Technical": ["Project Engineer", "Mechanical Engineer", "Electrical Engineer", "Civil Engineer", "Technician"],
                                    "Design / Creative": ["Creative Director", "UI/UX Designer", "Graphic Designer", "Animator / Video Editor", "Brand Designer"],
                                    "Sales & Marketing": ["Sales Manager", "Marketing Executive", "Business Development Executive", "Sales Coordinator", "Digital Marketing Specialist"],
                                    "Customer Support / Service": ["Customer Service Manager", "Support Executive", "Call Center Agent", "Helpdesk Associate"],
                                    "Procurement / Purchase": ["Purchase Manager", "Procurement Officer", "Vendor Coordinator", "Storekeeper"],
                                    "Quality Assurance (QA)": ["QA Manager", "QA Engineer", "Quality Inspector"],
                                    "Legal & Compliance": ["Legal Advisor", "Compliance Officer", "Contract Manager"],
                                    "Research & Development (R&D)": ["R&D Manager", "Research Analyst", "Product Analyst"],
                                    "Training & Development": ["Training Manager", "L&D Executive", "Trainer / Mentor"],
                                    "Security / Facility": ["Security Manager", "Security Officer", "Housekeeping Supervisor", "Maintenance Staff"],
                                    "Logistics / Fleet": ["Fleet Manager", "Driver Supervisor", "Dispatcher", "Driver"],
                                };
                                
                                const options = formData.department ? (designationsMap[formData.department] || []) : [];
                                const placeholder = formData.department ? "-- Select Designation --" : "Select Department first";
                                
                                return renderSelectField(
                                    "Designation",
                                    "designation",
                                    formData.designation,
                                    options,
                                    placeholder,
                                    !formData.department,
                                    "bi-person-badge"
                                );
                            })()}
                        </div>
                    </div>
                </div>

                {/* Superior Information Section */}
                <div className="mb-4 pt-3 border-top">
                    <h5 className="mb-3 d-flex align-items-center">
                        <i className="bi bi-person-bounding-box text-success me-2"></i>
                        Reporting Manager
                    </h5>
                    <div className="row g-3">
                        <div className="col-md-6">
                            {renderInputField("Superior ID", "superiorId", formData.superiorId, "text", "Enter superior ID", false, { disabled: lockJob }, "bi-person-badge")}
                        </div>
                        <div className="col-md-6">
                            {renderInputField("Superior Name", "superiorName", formData.superiorName, "text", "Enter superior name", false, { disabled: lockJob }, "bi-person")}
                        </div>
                    </div>
                </div>

                {/* Salary Information Section */}
                <div className="mb-4 pt-3 border-top">
                    <h5 className="mb-3 d-flex align-items-center">
                        <i className="bi bi-cash-stack text-warning me-2"></i>
                        Salary Components
                    </h5>
                    <div className="alert alert-info text-info d-flex align-items-center mb-3">
                        <i className="bi bi-info-circle me-2"></i>
                        <small>Salary fields are {lockJob ? 'locked' : 'editable'}. Only super admins can edit when unlocked.</small>
                    </div>
                    <div className="row g-3">
                        <div className="col-md-6">
                            {renderSalaryField("Basic Salary", "basicSalary", formData.basicSalary, lockJob)}
                        </div>
                        <div className="col-md-6">
                            {renderSalaryField("Allowance", "allowance", formData.allowance, lockJob)}
                        </div>
                    </div>
                    <div className="row g-3 mt-2">
                        <div className="col-md-6">
                            {renderSalaryField("HRA", "hra", formData.hra, lockJob)}
                        </div>
                        <div className="col-md-6">
                            {renderSalaryField("Travel Allowance", "travelAllowance", formData.travelAllowance, lockJob)}
                        </div>
                    </div>
                </div>

                {/* Official Documents Section */}
                <div className="mb-4 pt-3 border-top">
                    <h5 className="mb-3 d-flex align-items-center">
                        <i className="bi bi-file-text text-info me-2"></i>
                        Official Documents
                    </h5>
                    <div className="row g-3">
                        <div className="col-md-6">
                            {renderInputField("PAN No", "panNo", formData.panNo, "text", "ABCDE1234F", false, { maxLength: 10 }, "bi-credit-card")}
                            <small className="text-muted">Format: ABCDE1234F</small>
                        </div>
                        <div className="col-md-6">
                            {renderInputField("PF No", "pfNo", formData.pfNo, "text", "Enter PF number", false, {}, "bi-bank")}
                        </div>
                    </div>
                    <div className="row g-3 mt-2">
                        <div className="col-md-6">
                            {renderInputField("Insurance No", "insuranceNo", formData.insuranceNo, "text", "Enter insurance number", false, {}, "bi-shield-check")}
                        </div>
                        <div className="col-md-6">
                            {renderInputField("Health Card No", "healthCardNo", formData.healthCardNo, "text", "Enter health card number", false, {}, "bi-heart-pulse")}
                        </div>
                    </div>
                </div>

                {/* Access & Role Section */}
                <div className="pt-3 border-top">
                    <h5 className="mb-3 d-flex align-items-center">
                        <i className="bi bi-key text-danger me-2"></i>
                        Access & Role
                    </h5>
                    <div className="row g-3">
                        <div className="col-md-6">
                            {renderInputField("User ID", "userId", formData.userId, "text", "Enter user ID", false, {}, "bi-person-circle")}
                        </div>
                        <div className="col-md-6">
                            {renderInputField("Password", "password", formData.password, "text", "Enter password", false, {}, "bi-key")}
                        </div>
                    </div>
                    <div className="row g-3 mt-2">
                        <div className="col-md-6">
                            {renderInputField("Role", "role", formData.role, "text", "Enter role", false, {}, "bi-person-rolodex")}
                        </div>
                        <div className="col-md-6">
                            {renderInputField("Page No", "pageNo", formData.pageNo, "tel", "Enter page number", false, { maxLength: 4 }, "bi-file-earmark")}
                        </div>
                    </div>
                </div>
            </div>
            <div className="card-footer bg-white border-0 pb-4">
                <div className="d-flex align-items-center text-muted">
                    <i className="bi bi-shield-lock me-2"></i>
                    <small>Sensitive fields are protected and require super admin privileges to edit</small>
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

export default JobTab;