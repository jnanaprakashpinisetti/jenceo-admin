// Department.js
import React, { useState, useEffect } from "react";

const Department = ({ formData, setFormData, canEdit, handleInputChange }) => {
    const departmentOptions = [
        "Home Care",
        "Housekeeping",
        "Office & Administrative",
        "Customer Service",
        "Management & Supervision",
        "Security",
        "Driving & Logistics",
        "Technical & Maintenance",
        "Retail & Sales",
        "Industrial & Labor",
        "Others"
    ];

    const roleOptions = {
        "Home Care": ["Nurse", "Caregiver", "Nursing Assistant", "Senior Nurse", "Head Nurse"],
        "Housekeeping": ["Cleaner", "Supervisor", "Manager", "Housekeeping Assistant"],
        "Office & Administrative": ["Clerk", "Coordinator", "Manager", "Admin Assistant", "Receptionist"],
        "Customer Service": ["CS Representative", "Support Executive", "Team Lead", "Manager"],
        "Management & Supervision": ["Supervisor", "Manager", "Team Lead", "Department Head"],
        "Security": ["Security Guard", "Security Officer", "Security Supervisor", "Security Manager"],
        "Driving & Logistics": ["Driver", "Delivery Executive", "Logistics Coordinator", "Fleet Manager"],
        "Technical & Maintenance": ["Technician", "Electrician", "Plumber", "Maintenance Supervisor"],
        "Retail & Sales": ["Sales Executive", "Store Assistant", "Sales Manager", "Retail Supervisor"],
        "Industrial & Labor": ["Laborer", "Machine Operator", "Production Supervisor", "Factory Worker"],
        "Others": ["General Worker", "Trainee", "Intern", "Contract Worker"]
    };

    const departmentPaths = {
        "Home Care": "EmployeeBioData",
        "Housekeeping": "WorkerData/Housekeeping",
        "Office & Administrative": "WorkerData/Office",
        "Customer Service": "WorkerData/Customer",
        "Management & Supervision": "WorkerData/Management",
        "Security": "WorkerData/Security",
        "Driving & Logistics": "WorkerData/Driving",
        "Technical & Maintenance": "WorkerData/Technical",
        "Retail & Sales": "WorkerData/Retail",
        "Industrial & Labor": "WorkerData/Industrial",
        "Others": "WorkerData/Others"
    };

    const [availableRoles, setAvailableRoles] = useState(
        roleOptions[formData.department] || []
    );

    const handleDepartmentChange = (e) => {
        const { value } = e.target;
        handleInputChange(e);
        
        // Update available roles based on selected department
        setAvailableRoles(roleOptions[value] || []);
        
        // Clear role if department changes
        if (formData.role && !roleOptions[value]?.includes(formData.role)) {
            setFormData(prev => ({ ...prev, role: "" }));
        }
        
        // Set department path for data storage
        if (value && departmentPaths[value]) {
            setFormData(prev => ({ 
                ...prev, 
                departmentPath: departmentPaths[value] 
            }));
        }
    };

    const employmentTypes = [
        "Permanent",
        "Temporary",
        "Contract",
        "Probation",
        "Intern",
        "Part-time",
        "Freelance"
    ];

    // Auto-generate employee code based on department and idNo
    useEffect(() => {
        if (formData.department && formData.idNo && !formData.employeeCode) {
            const deptCode = formData.department.substring(0, 3).toUpperCase();
            const idPart = formData.idNo.substring(formData.idNo.length - 4);
            const generatedCode = `${deptCode}-${idPart}`;
            setFormData(prev => ({ ...prev, employeeCode: generatedCode }));
        }
    }, [formData.department, formData.idNo]);

    return (
        <div className="department-tab p-3">
            <div className="row">
                <div className="col-md-6 mb-3">
                    <label htmlFor="department" className="form-label">
                        Department <span className="text-danger">*</span>
                    </label>
                    <select
                        id="department"
                        name="department"
                        className="form-select"
                        value={formData.department || ""}
                        onChange={handleDepartmentChange}
                        disabled={!canEdit}
                        required
                    >
                        <option value="">Select Department</option>
                        {departmentOptions.map((dept) => (
                            <option key={dept} value={dept}>
                                {dept}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="col-md-6 mb-3">
                    <label htmlFor="role" className="form-label">
                        Role/Position <span className="text-danger">*</span>
                    </label>
                    <select
                        id="role"
                        name="role"
                        className="form-select"
                        value={formData.role || ""}
                        onChange={handleInputChange}
                        disabled={!canEdit || !formData.department}
                        required
                    >
                        <option value="">Select Role</option>
                        {availableRoles.map((role) => (
                            <option key={role} value={role}>
                                {role}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="row">
                <div className="col-md-6 mb-3">
                    <label htmlFor="employmentType" className="form-label">
                        Employment Type
                    </label>
                    <select
                        id="employmentType"
                        name="employmentType"
                        className="form-select"
                        value={formData.employmentType || ""}
                        onChange={handleInputChange}
                        disabled={!canEdit}
                    >
                        <option value="">Select Type</option>
                        {employmentTypes.map((type) => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="col-md-6 mb-3">
                    <label htmlFor="joiningDate" className="form-label">
                        Joining Date
                    </label>
                    <input
                        type="date"
                        id="joiningDate"
                        name="joiningDate"
                        className="form-control"
                        value={formData.joiningDate || ""}
                        onChange={handleInputChange}
                        disabled={!canEdit}
                        max={new Date().toISOString().split('T')[0]}
                    />
                </div>
            </div>

            <div className="row">
                <div className="col-md-6 mb-3">
                    <label htmlFor="supervisorId" className="form-label">
                        Supervisor ID
                    </label>
                    <input
                        type="text"
                        id="supervisorId"
                        name="supervisorId"
                        className="form-control"
                        value={formData.supervisorId || ""}
                        onChange={handleInputChange}
                        disabled={!canEdit}
                        placeholder="Enter supervisor ID"
                    />
                </div>

                <div className="col-md-6 mb-3">
                    <label htmlFor="employeeCode" className="form-label">
                        Employee Code
                    </label>
                    <input
                        type="text"
                        id="employeeCode"
                        name="employeeCode"
                        className="form-control"
                        value={formData.employeeCode || ""}
                        onChange={handleInputChange}
                        disabled={!canEdit}
                        placeholder="Auto-generated code"
                    />
                </div>
            </div>

            <div className="row">
                <div className="col-md-12 mb-3">
                    <label htmlFor="jobDescription" className="form-label">
                        Job Description
                    </label>
                    <textarea
                        id="jobDescription"
                        name="jobDescription"
                        className="form-control"
                        value={formData.jobDescription || ""}
                        onChange={handleInputChange}
                        disabled={!canEdit}
                        rows="3"
                        placeholder="Brief job description or responsibilities"
                    />
                </div>
            </div>

            <div className="row">
                <div className="col-md-6 mb-3">
                    <label htmlFor="workLocation" className="form-label">
                        Work Location
                    </label>
                    <input
                        type="text"
                        id="workLocation"
                        name="workLocation"
                        className="form-control"
                        value={formData.workLocation || ""}
                        onChange={handleInputChange}
                        disabled={!canEdit}
                        placeholder="e.g., Main Office, Branch A, Remote"
                    />
                </div>

                <div className="col-md-6 mb-3">
                    <label htmlFor="workShift" className="form-label">
                        Work Shift
                    </label>
                    <select
                        id="workShift"
                        name="workShift"
                        className="form-select"
                        value={formData.workShift || ""}
                        onChange={handleInputChange}
                        disabled={!canEdit}
                    >
                        <option value="">Select Shift</option>
                        <option value="Morning">Morning (9 AM - 5 PM)</option>
                        <option value="Evening">Evening (2 PM - 10 PM)</option>
                        <option value="Night">Night (10 PM - 6 AM)</option>
                        <option value="Rotating">Rotating Shifts</option>
                        <option value="Flexible">Flexible Hours</option>
                    </select>
                </div>
            </div>

            {/* Hidden field to store department path */}
            <input
                type="hidden"
                name="departmentPath"
                value={formData.departmentPath || ""}
            />
        </div>
    );
};

export default Department;