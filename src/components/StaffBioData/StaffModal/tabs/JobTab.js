import React, { useState } from "react";
import { useAuth } from "../../../../context/AuthContext";

const JobTab = ({ formData, isEditMode, handleInputChange, isSuperAdmin }) => {
    const [superAdminUnlock, setSuperAdminUnlock] = useState(false);
    const lockJob = isEditMode && (!isSuperAdmin || !superAdminUnlock);

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
                    <label className="form-label"><strong>{label}</strong></label>
                    <div className="form-control bg-light">
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
                <input {...inputProps} />
            </div>
        );
    };

    return (
        <div className="modal-card ">
            <div className="modal-card-header d-flex align-items-center justify-content-between">
                <h4 className="mb-0">Job / Designation & Payroll</h4>
                {isSuperAdmin && (
                    <button
                        type="button"
                        className={`btn btn-sm ${superAdminUnlock ? "btn-warning" : "btn-outline-warning"}`}
                        onClick={() => setSuperAdminUnlock(v => !v)}
                        title="Super Admin unlock for sensitive fields"
                    >
                        {superAdminUnlock ? "Lock Sensitive Fields" : "Unlock Sensitive Fields"}
                    </button>
                )}
            </div>

            <div className="modal-card-body">
                <div className="row">
                    <div className="col-md-6">
                        <label className="form-label"><strong>Department</strong></label>
                        <select
                            className="form-select form-select-sm"
                            name="department"
                            value={formData.department || ""}
                            onChange={handleInputChange}
                            disabled={(!formData.department) || lockJob}
                        >
                            <option value="">-- Select Department --</option>
                            {[
                                "Founders", "Management / Executive", "Human Resources (HR)", "Finance & Accounts",
                                "Administration", "Operations", "Information Technology (IT)", "Engineering / Technical",
                                "Design / Creative", "Sales & Marketing", "Customer Support / Service",
                                "Procurement / Purchase", "Quality Assurance (QA)", "Legal & Compliance",
                                "Research & Development (R&D)", "Training & Development", "Security / Facility",
                                "Logistics / Fleet"
                            ].map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>

                    <div className="col-md-6">
                        <label className="form-label"><strong>Designation</strong></label>
                        <select
                            className="form-select form-select-sm"
                            name="designation"
                            value={formData.designation || ""}
                            onChange={handleInputChange}
                            disabled={!formData.department}
                        >
                            <option value="">{formData.department ? "-- Select Designation --" : "Select Department first"}</option>
                            {(() => {
                                const MAP = {
                                    "Founders": ["Founder", "Co-Founder", "Managing Director", "Executive Director"],
                                    "Management / Executive": ["CEO", "COO", "General Manager", "Assistant General Manager", "Branch / Unit Manager"],
                                    "Human Resources (HR)": ["HR Manager", "HR Executive", "Talent Acquisition Specialist", "Payroll Executive", "HR Assistant"],
                                    "Finance & Accounts": ["Chief Accountant", "Accounts Manager", "Accountant", "Billing Executive", "Finance Analyst"],
                                    "Administration": ["Admin Manager", "Admin Coordinator", "Front Office Executive", "Admin Assistent", "Receptionist"],
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
                                return (MAP[formData.department] || []).map((r) => <option key={r} value={r}>{r}</option>);
                            })()}
                        </select>
                    </div>
                </div>

                <div className="row mt-2">
                    <div className="col-md-6">
                        {renderInputField("Superior ID", "superiorId", formData.superiorId, "text", "", false, { disabled: lockJob })}
                    </div>
                    <div className="col-md-6">
                        {renderInputField("Superior Name", "superiorName", formData.superiorName, "text", "", false, { disabled: lockJob })}
                    </div>
                </div>

                <div className="row mt-2">
                    <div className="col-md-6">
                        {renderInputField("Basic Salary", "basicSalary", formData.basicSalary, "tel", "", false, { maxLength: 7, disabled: lockJob })}
                    </div>
                    <div className="col-md-6">
                        {renderInputField("Allowance", "allowance", formData.allowance, "tel", "", false, { maxLength: 7, disabled: lockJob })}
                    </div>
                </div>

                <div className="row mt-2">
                    <div className="col-md-6">
                        {renderInputField("HRA", "hra", formData.hra, "tel", "", false, { maxLength: 7, disabled: lockJob })}
                    </div>
                    <div className="col-md-6">
                        {renderInputField("Travel Allowance", "travelAllowance", formData.travelAllowance, "tel", "", false, { maxLength: 7, disabled: lockJob })}
                    </div>
                </div>

                <div className="row mt-2">
                    <div className="col-md-6">{renderInputField("PAN No", "panNo", formData.panNo, "text", "ABCDE1234F", false, { maxLength: 10 })}</div>
                    <div className="col-md-6">{renderInputField("PF No", "pfNo", formData.pfNo)}</div>
                </div>

                <div className="row mt-2">
                    <div className="col-md-6">{renderInputField("Insurance No", "insuranceNo", formData.insuranceNo)}</div>
                    <div className="col-md-6">{renderInputField("Health Card No", "healthCardNo", formData.healthCardNo)}</div>
                </div>

                <div className="row mt-2">
                    <div className="col-md-6">{renderInputField("User ID", "userId", formData.userId)}</div>
                    <div className="col-md-6">{renderInputField("Password", "password", formData.password, "text")}</div>
                </div>

                <div className="row mt-2">
                    <div className="col-md-6">{renderInputField("Role", "role", formData.role)}</div>
                    <div className="col-md-6">{renderInputField("Page No", "pageNo", formData.pageNo, "tel", "", false, { maxLength: 4 })}</div>
                </div>
            </div>
        </div>
    );
};

export default JobTab;