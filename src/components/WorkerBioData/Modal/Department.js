// Department.js
import React, { useEffect, useState } from "react";
import firebaseDB from "../../../firebase";

const Department = ({
    formData = {},
    errors = {},
    handleChange,
    handleBlur,
    nextStep,
    setErrors,
    canEdit = true,
}) => {
    const [supervisorData, setSupervisorData] = useState(null);
    const [loadingSupervisor, setLoadingSupervisor] = useState(false);
    const [localFormData, setLocalFormData] = useState({});

    // Initialize local form data
    useEffect(() => {
        setLocalFormData(formData || {});
    }, [formData]);

    // Role options based on department
    const roleOptions = {
        "Home Care": [
            "Nursing", "Patient Care", "Care Taker", "Old Age Care", "Baby Care",
            "Bedside Attender", "Supporting", "Compounder", "Diaper", "Elder Care"
        ],
        "Housekeeping": [
            "Maid", "Cook", "House Keeper", "Chauffeur", "Cleaner", "Gardeen", "Dishwasher"
        ],
        "Office & Administrative": [
            "Computer Operating", "Data Entry", "Office Assistant", "Receptionist",
            "Front Desk Executive", "Admin Assistant", "Office Boy", "Peon", "Office Attendant"
        ],
        "Customer Service": [
            "Tele Calling", "Customer Support", "Telemarketing", "BPO Executive",
            "Call Center Agent", "Customer Care Executive"
        ],
        "Management & Supervision": [
            "Supervisor", "Manager", "Team Leader", "Site Supervisor", "Project Coordinator"
        ],
        "Security": [
            "Security Guard", "Security Supervisor", "Gatekeeper", "Watchman"
        ],
        "Driving & Logistics": [
            "Driving", "Delivery Boy", "Delivery Executive", "Rider", "Driver",
            "Car Driver", "Bike Rider", "Logistics Helper"
        ],
        "Technical & Maintenance": [
            "Electrician", "Plumber", "Carpenter", "Painter", "Mason", "AC Technician",
            "Mechanic", "Maintenance Staff", "House Keeping", "Housekeeping Supervisor"
        ],
        "Retail & Sales": [
            "Sales Boy", "Sales Girl", "Store Helper", "Retail Assistant", "Shop Attendant"
        ],
        "Industrial & Labor": [
            "Labour", "Helper", "Loading Unloading", "Warehouse Helper",
            "Factory Worker", "Production Helper", "Packaging Staff"
        ],
        "Others": []
    };

    // Department options
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

    // Safe handleChange function
    const safeHandleChange = (e) => {
        const { name, value } = e.target;

        setLocalFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (handleChange && typeof handleChange === "function") {
            handleChange(e);
        }
    };


    // Safe handleBlur function
    const safeHandleBlur = (e) => {
        if (handleBlur && typeof handleBlur === 'function') {
            handleBlur(e);
        }
    };

    // Auto-generate Employee ID based on department
    const generateEmployeeId = async (department) => {
        if (!department) return "";

        // Map department to prefix
        const prefixMap = {
            "Home Care": "HC",
            "Housekeeping": "HKW-",
            "Office & Administrative": "OFW-",
            "Customer Service": "CW-",
            "Management & Supervision": "MW-",
            "Security": "SW-",
            "Driving & Logistics": "DW-",
            "Technical & Maintenance": "TW-",
            "Retail & Sales": "RW-",
            "Industrial & Labor": "IW-",
            "Others": "OW-"
        };

        const prefix = prefixMap[department] || "JW";

        try {
            // Determine which database node to check based on department
            let dbNode = "EmployeeBioData";
            const nodeMap = {
                "Home Care": "WorkerData/HomeCare/Running",
                "Housekeeping": "WorkerData/Housekeeping/Running",
                "Office & Administrative": "WorkerData/Office/Running",
                "Customer Service": "WorkerData/Customer/Running",
                "Management & Supervision": "WorkerData/Management/Running",
                "Security": "WorkerData/Security/Running",
                "Driving & Logistics": "WorkerData/Driving/Running",
                "Technical & Maintenance": "WorkerData/Technical/Running",
                "Retail & Sales": "WorkerData/Retail/Running",
                "Industrial & Labor": "WorkerData/Industrial/Running",
                "Others": "WorkerData/Others/Running"
            };

            dbNode = nodeMap[department] || "EmployeeBioData";

            // Get existing IDs
            const snapshot = await firebaseDB.child(dbNode).once("value");
            const data = snapshot.val();

            if (!data) {
                return `${prefix}01`;
            }

            // Extract IDs and find max
            const ids = Object.values(data).map(emp => emp.idNo || emp.employeeId || "").filter(Boolean);
            let maxNum = 0;

            ids.forEach(id => {
                const match = id.match(/\d+/);
                if (match) {
                    const num = parseInt(match[0], 10);
                    if (num > maxNum) maxNum = num;
                }
            });

            const nextNum = maxNum + 1;
            const formattedNum = nextNum.toString().padStart(2, '0');

            return `${prefix}${formattedNum}`;

        } catch (error) {
            console.error("Error generating employee ID:", error);
            return `${prefix}01`;
        }
    };

    // Fetch supervisor data when supervisorId changes
    const fetchSupervisorData = async (supervisorId) => {
        if (!supervisorId) {
            setSupervisorData(null);
            return;
        }

        setLoadingSupervisor(true);
        try {
            // Search in StaffBioData
            const snapshot = await firebaseDB
                .child("StaffBioData")
                .orderByChild("idNo")
                .equalTo(supervisorId)
                .once("value");

            if (snapshot.exists()) {
                const data = snapshot.val();
                const firstKey = Object.keys(data)[0];
                const supervisor = data[firstKey];

                const supervisorName = `${supervisor.firstName || ""} ${supervisor.lastName || ""}`.trim();

                setSupervisorData({
                    name: supervisorName,
                    photo: supervisor.employeePhoto || ""
                });

                // Auto-fill supervisor name
                safeHandleChange({
                    target: {
                        name: "supervisorName",
                        value: supervisorName
                    }
                });
            } else {
                setSupervisorData(null);
                safeHandleChange({
                    target: {
                        name: "supervisorName",
                        value: ""
                    }
                });
            }
        } catch (error) {
            console.error("Error fetching supervisor data:", error);
        } finally {
            setLoadingSupervisor(false);
        }
    };

    // Handle department change - only in edit mode
    const handleDepartmentChange = async (e) => {
        if (!canEdit) return;

        const department = e.target.value;

        // Update form data
        safeHandleChange(e);

        // Clear role when department changes
        safeHandleChange({
            target: {
                name: "role",
                value: ""
            }
        });

        // Generate employee ID
        if (department) {
            const generatedId = await generateEmployeeId(department);
            safeHandleChange({
                target: {
                    name: "idNo",
                    value: generatedId
                }
            });
        }
    };

    // Handle supervisor ID blur - only in edit mode
    const handleSupervisorIdBlur = async (e) => {
        if (!canEdit) return;

        const supervisorId = e.target.value;
        if (supervisorId) {
            await fetchSupervisorData(supervisorId);
        }
        safeHandleBlur(e);
    };

    // Set current date for joining date - only in edit mode
    useEffect(() => {
        if (canEdit && !localFormData.joiningDate) {
            const today = new Date().toISOString().split("T")[0];
            safeHandleChange({
                target: {
                    name: "joiningDate",
                    value: today
                }
            });
        }
    }, [canEdit]);

    // Load supervisor data on component mount if supervisorId exists
    useEffect(() => {
        if (localFormData.supervisorId) {
            fetchSupervisorData(localFormData.supervisorId);
        }
    }, [localFormData.supervisorId]);

    useEffect(() => {
        if (canEdit && handleChange && typeof handleChange === "function") {
            Object.entries(localFormData).forEach(([name, value]) => {
                handleChange({
                    target: { name, value }
                });
            });
        }
    }, [localFormData]);


    // Check if current department is "Others"
    const isOthersDepartment = localFormData.department === "Others";

    // Use formData from props if available, otherwise use localFormData
    const displayData = canEdit ? localFormData : formData;

    return (
        <div>
            {/* Header Card */}
            <div className="card shadow-sm border-primary mb-4">
                <div className="card-header bg-primary text-white">
                    <div className="d-flex align-items-center">
                        <i className="bi bi-building me-3 fs-4"></i>
                        <h4 className="mb-0">Department & Joining Details</h4>
                        <span className={`badge ms-3 ${canEdit ? "bg-warning" : "bg-info"}`}>
                            {canEdit ? "Edit Mode" : "View Mode"}
                        </span>
                    </div>
                </div>
            </div>

            <div className="row g-4">
                {/* Department Selection Card */}
                <div className="col-md-6">
                    <div className="card shadow-sm border-info h-100">
                        <div className="card-header bg-info text-white">
                            <div className="d-flex align-items-center">
                                <i className="bi bi-diagram-3 me-2"></i>
                                <h5 className="mb-0">Department Assignment</h5>
                            </div>
                        </div>
                        <div className="card-body">
                            <div className="mb-3">
                                <label className="form-label">
                                    <i className="bi bi-building me-1"></i>
                                    <strong>Department <span className="text-danger">*</span></strong>
                                </label>
                                {canEdit ? (
                                    <>
                                        <select
                                            className={`form-select ${errors.department ? "is-invalid" : ""}`}
                                            name="department"
                                            value={displayData.department || ""}
                                            onChange={handleDepartmentChange}
                                            onBlur={safeHandleBlur}
                                        >
                                            <option value="">Select Department</option>
                                            {departmentOptions.map((dept) => (
                                                <option key={dept} value={dept}>
                                                    {dept}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.department && (
                                            <div className="invalid-feedback d-block">{errors.department}</div>
                                        )}
                                    </>
                                ) : (
                                    <div className="form-control bg-light">
                                        {displayData.department || "N/A"}
                                    </div>
                                )}
                                <small className="text-muted mt-1 d-block">
                                    <i className="bi bi-info-circle me-1"></i>
                                    Select the department for this employee
                                </small>
                            </div>

                            <div className="mb-3">
                                <label className="form-label">
                                    <i className="bi bi-person-badge me-1"></i>
                                    <strong>Role <span className="text-danger">*</span></strong>
                                </label>
                                {canEdit ? (
                                    <>
                                        {isOthersDepartment ? (
                                            <input
                                                type="text"
                                                className={`form-control ${errors.role ? "is-invalid" : ""}`}
                                                name="role"
                                                value={displayData.role || ""}
                                                onChange={safeHandleChange}
                                                onBlur={safeHandleBlur}
                                                placeholder="Enter role"
                                            />
                                        ) : (
                                            <select
                                                className={`form-select ${errors.role ? "is-invalid" : ""}`}
                                                name="role"
                                                value={displayData.role || ""}
                                                onChange={safeHandleChange}
                                                onBlur={safeHandleBlur}
                                                disabled={!displayData.department}
                                            >
                                                <option value="">Select Role</option>
                                                {roleOptions[displayData.department]?.map((role) => (
                                                    <option key={role} value={role}>
                                                        {role}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                        {errors.role && (
                                            <div className="invalid-feedback d-block">{errors.role}</div>
                                        )}
                                    </>
                                ) : (
                                    <div className="form-control bg-light">
                                        {displayData.role || "N/A"}
                                    </div>
                                )}
                                <small className="text-muted mt-1 d-block">
                                    <i className="bi bi-info-circle me-1"></i>
                                    {isOthersDepartment
                                        ? "Custom role for Others department"
                                        : "Employee's role in the department"}
                                </small>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Employee Identification Card */}
                <div className="col-md-6">
                    <div className="card shadow-sm border-success h-100">
                        <div className="card-header bg-success text-white">
                            <div className="d-flex align-items-center">
                                <i className="bi bi-person-badge me-2"></i>
                                <h5 className="mb-0">Employee Identification</h5>
                            </div>
                        </div>
                        <div className="card-body">
                            <div className="mb-3">
                                <label className="form-label">
                                    <i className="bi bi-tag me-1"></i>
                                    <strong>Employee ID <span className="text-danger">*</span></strong>
                                </label>
                                <div className="input-group">
                                    <span className="input-group-text bg-light">
                                        <i className="bi bi-qr-code"></i>
                                    </span>
                                    {canEdit ? (
                                        <input
                                            type="text"
                                            className={`form-control bg-light ${errors.idNo ? "is-invalid" : ""}`}
                                            name="idNo"
                                            value={displayData.idNo || ""}
                                            readOnly
                                        />
                                    ) : (
                                        <div className="form-control bg-light">
                                            {displayData.idNo || "N/A"}
                                        </div>
                                    )}
                                </div>
                                {errors.idNo && (
                                    <div className="invalid-feedback d-block">{errors.idNo}</div>
                                )}
                                <small className="text-success mt-1 d-block">
                                    <i className="bi bi-check-circle me-1"></i>
                                    Auto-generated based on department
                                </small>
                            </div>

                            <div className="mb-3">
                                <label className="form-label">
                                    <i className="bi bi-calendar-check me-1"></i>
                                    <strong>Joining Date <span className="text-danger">*</span></strong>
                                </label>
                                <div className="input-group">
                                    <span className="input-group-text bg-light">
                                        <i className="bi bi-calendar"></i>
                                    </span>
                                    {canEdit ? (
                                        <input
                                            type="date"
                                            className={`form-control ${errors.joiningDate ? "is-invalid" : ""}`}
                                            name="joiningDate"
                                            value={displayData.joiningDate || ""}
                                            onChange={safeHandleChange}
                                            onBlur={safeHandleBlur}
                                            max={new Date().toISOString().split("T")[0]}
                                        />
                                    ) : (
                                        <div className="form-control bg-light">
                                            {displayData.joiningDate || "N/A"}
                                        </div>
                                    )}
                                </div>
                                {errors.joiningDate && (
                                    <div className="invalid-feedback d-block">{errors.joiningDate}</div>
                                )}
                                <small className="text-muted mt-1 d-block">
                                    <i className="bi bi-info-circle me-1"></i>
                                    Employee's date of joining
                                </small>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Supervisor Information Card */}
                <div className="col-12">
                    <div className="card shadow-sm border-warning">
                        <div className="card-header bg-warning text-white">
                            <div className="d-flex align-items-center">
                                <i className="bi bi-people me-2"></i>
                                <h5 className="mb-0">Supervisor Information</h5>
                            </div>
                        </div>
                        <div className="card-body">
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <label className="form-label">
                                            <i className="bi bi-person-vcard me-1"></i>
                                            <strong>Supervisor ID</strong>
                                        </label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light">
                                                <i className="bi bi-person"></i>
                                            </span>
                                            {canEdit ? (
                                                <input
                                                    type="text"
                                                    className={`form-control ${errors.supervisorId ? "is-invalid" : ""}`}
                                                    name="supervisorId"
                                                    value={displayData.supervisorId || ""}
                                                    onChange={safeHandleChange}
                                                    onBlur={handleSupervisorIdBlur}
                                                    placeholder="Enter Supervisor ID"
                                                />
                                            ) : (
                                                <div className="form-control bg-light">
                                                    {displayData.supervisorId || "N/A"}
                                                </div>
                                            )}
                                        </div>
                                        {loadingSupervisor && (
                                            <small className="text-info mt-1 d-block">
                                                <i className="bi bi-hourglass-split me-1"></i>
                                                Loading supervisor data...
                                            </small>
                                        )}
                                        {errors.supervisorId && (
                                            <div className="invalid-feedback d-block">{errors.supervisorId}</div>
                                        )}
                                        <small className="text-muted mt-1 d-block">
                                            <i className="bi bi-info-circle me-1"></i>
                                            Supervisor's employee ID
                                        </small>
                                    </div>
                                </div>

                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <label className="form-label">
                                            <i className="bi bi-person-lines-fill me-1"></i>
                                            <strong>Supervisor Name</strong>
                                        </label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light">
                                                <i className="bi bi-person-badge"></i>
                                            </span>
                                            <div className="form-control bg-light">
                                                {displayData.supervisorName || supervisorData?.name || "N/A"}
                                            </div>
                                        </div>
                                        <small className="text-muted mt-1 d-block">
                                            <i className="bi bi-info-circle me-1"></i>
                                            Auto-filled from supervisor ID
                                        </small>
                                    </div>
                                </div>

                                {/* Supervisor Photo Preview */}
                                {(supervisorData?.photo) && (
                                    <div className="col-12">
                                        <div className="card border-success bg-light">
                                            <div className="card-body">
                                                <div className="d-flex align-items-center">
                                                    <div className="me-3">
                                                        <img
                                                            src={supervisorData?.photo}
                                                            alt="Supervisor"
                                                            className="rounded-circle border border-success"
                                                            style={{ width: "80px", height: "80px", objectFit: "cover" }}
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                e.target.parentElement.innerHTML = `
                                  <div class="rounded-circle border border-success d-flex align-items-center justify-content-center bg-light" 
                                       style="width: 80px; height: 80px;">
                                    <i class="bi bi-person fs-4 text-muted"></i>
                                  </div>
                                `;
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <h6 className="text-success mb-1">
                                                            <i className="bi bi-person-check me-1"></i>
                                                            Supervisor
                                                        </h6>
                                                        <p className="mb-0">
                                                            <strong>Name:</strong> {supervisorData?.name || "N/A"}
                                                        </p>
                                                        <p className="mb-0">
                                                            <strong>ID:</strong> {displayData.supervisorId || "N/A"}
                                                        </p>
                                                        <small className="text-muted">
                                                            {canEdit ? "Supervisor photo loaded successfully" : "Supervisor photo"}
                                                        </small>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Summary Card */}
                <div className="col-12">
                    <div className="card shadow-sm border-secondary">
                        <div className="card-header bg-secondary text-white">
                            <div className="d-flex align-items-center">
                                <i className="bi bi-clipboard-data me-2"></i>
                                <h5 className="mb-0">Summary</h5>
                            </div>
                        </div>
                        <div className="card-body">
                            <div className="row">
                                <div className="col-md-3">
                                    <div className="summary-item text-center p-3 border rounded">
                                        <div className="summary-icon mb-2">
                                            <i className="bi bi-building fs-1 text-primary"></i>
                                        </div>
                                        <h6 className="text-muted mb-1">Department</h6>
                                        <p className="fw-bold text-primary fs-5 mb-0">
                                            {displayData.department || "Not Selected"}
                                        </p>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="summary-item text-center p-3 border rounded">
                                        <div className="summary-icon mb-2">
                                            <i className="bi bi-person-badge fs-1 text-success"></i>
                                        </div>
                                        <h6 className="text-muted mb-1">Role</h6>
                                        <p className="fw-bold text-success fs-5 mb-0">
                                            {displayData.role || "Not Selected"}
                                        </p>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="summary-item text-center p-3 border rounded">
                                        <div className="summary-icon mb-2">
                                            <i className="bi bi-calendar-check fs-1 text-warning"></i>
                                        </div>
                                        <h6 className="text-muted mb-1">Joining Date</h6>
                                        <p className="fw-bold text-warning fs-5 mb-0">
                                            {displayData.joiningDate || "Not Set"}
                                        </p>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="summary-item text-center p-3 border rounded">
                                        <div className="summary-icon mb-2">
                                            <i className="bi bi-person-check fs-1 text-info"></i>
                                        </div>
                                        <h6 className="text-muted mb-1">Supervisor</h6>
                                        <p className="fw-bold text-info fs-5 mb-0">
                                            {displayData.supervisorName || supervisorData?.name || "Not Assigned"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Department;