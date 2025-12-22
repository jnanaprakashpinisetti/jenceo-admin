// Department.js - Fixed version
import React, { useEffect, useState, useRef } from "react";
import firebaseDB from "../../../firebase";

const Department = ({
    formData = {},
    errors = {},
    handleChange,
    handleBlur,
    nextStep,
    setErrors,
    canEdit = true,
    onSaveComplete,
    isSaving = false,
}) => {
    const [supervisorData, setSupervisorData] = useState(null);
    const [loadingSupervisor, setLoadingSupervisor] = useState(false);
    const [localFormData, setLocalFormData] = useState({});
    const [showDiscardModal, setShowDiscardModal] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null);
    const [oldDepartment, setOldDepartment] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const previousFormDataRef = useRef({});
    const isInitialMount = useRef(true);
    const saveInProgressRef = useRef(false);

    const [showDeptChangeModal, setShowDeptChangeModal] = useState(false);
    const [pendingDepartment, setPendingDepartment] = useState("");
    const [deptChangeReason, setDeptChangeReason] = useState("");

    // Initialize local form data - only when formData changes
    useEffect(() => {
        if (isInitialMount.current) {
            setLocalFormData(formData || {});
            previousFormDataRef.current = formData || {};
            isInitialMount.current = false;
        } else {
            // Only update if formData has actually changed
            const formDataString = JSON.stringify(formData);
            const localDataString = JSON.stringify(localFormData);
            
            if (formDataString !== localDataString && 
                formDataString !== JSON.stringify(previousFormDataRef.current)) {
                setLocalFormData(formData || {});
                previousFormDataRef.current = formData || {};
                setHasChanges(false);
                setOldDepartment(""); // Reset old department when form data is reset
            }
        }
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
        "Home Care", "Housekeeping", "Office & Administrative", "Customer Service",
        "Management & Supervision", "Security", "Driving & Logistics", "Technical & Maintenance",
        "Retail & Sales", "Industrial & Labor", "Others"
    ];

    // Safe handleChange function
    const safeHandleChange = (e) => {
        const { name, value } = e.target;

        const updatedData = {
            ...localFormData,
            [name]: value
        };

        setLocalFormData(updatedData);

        // Notify parent only if there's an actual change
        if (handleChange && typeof handleChange === "function") {
            handleChange(e);
        }

        // Mark that changes have been made
        if (canEdit) {
            setHasChanges(true);
        }
    };

    // Safe handleBlur function
    const safeHandleBlur = (e) => {
        if (handleBlur && typeof handleBlur === 'function') {
            handleBlur(e);
        }
    };

    // Function to get department save path
    const getDepartmentSavePath = (department) => {
        const pathMap = {
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
        
        return pathMap[department] || null;
    };

    // Auto-generate Employee ID based on department
    const generateEmployeeId = async (department) => {
        if (!department) return "";

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
            let dbNode = null;
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

            dbNode = nodeMap[department];

            if (!dbNode) {
                return `${prefix}01`;
            }

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
    const handleDepartmentChange = (e) => {
        if (!canEdit || saveInProgressRef.current) return;
    
        const newDept = e.target.value;
        const currentDept = localFormData.department || formData.department;
    
        // If editing & department actually changes → ask confirmation
        if (currentDept && newDept && currentDept !== newDept) {
            setPendingDepartment(newDept);
            setOldDepartment(currentDept);
            setShowDeptChangeModal(true);
            return;
        }
    
        // If no existing department or same department, just update
        safeHandleChange(e);
    };

    // Handle supervisor ID blur - only in edit mode
    const handleSupervisorIdBlur = async (e) => {
        if (!canEdit || saveInProgressRef.current) return;

        const supervisorId = e.target.value;
        if (supervisorId) {
            await fetchSupervisorData(supervisorId);
        }
        safeHandleBlur(e);
    };

    const confirmDepartmentChange = async () => {
        if (!deptChangeReason.trim()) {
            alert("Please enter reason for department change");
            return;
        }

        // Generate new employee ID for the new department
        try {
            const generatedId = await generateEmployeeId(pendingDepartment);
            
            // Update all fields at once to prevent multiple re-renders
            const updatedData = {
                ...localFormData,
                department: pendingDepartment,
                departmentChangeReason: deptChangeReason,
                idNo: generatedId, // Update the ID
                role: "" // Clear role when department changes
            };

            setLocalFormData(updatedData);
            
            // Notify parent of all changes at once
            if (handleChange && typeof handleChange === "function") {
                // Update department
                handleChange({
                    target: { name: "department", value: pendingDepartment }
                });
                
                // Update reason
                handleChange({
                    target: { name: "departmentChangeReason", value: deptChangeReason }
                });
                
                // Update ID
                handleChange({
                    target: { name: "idNo", value: generatedId }
                });
                
                // Clear role
                handleChange({
                    target: { name: "role", value: "" }
                });
            }
            
            setHasChanges(true);
            
        } catch (error) {
            console.error("Error generating new employee ID:", error);
            alert("Error generating new employee ID. Please try again.");
            return;
        }

        setShowDeptChangeModal(false);
        setPendingDepartment("");
        setDeptChangeReason("");
    };

    // Handle save button click
    const handleSaveClick = async () => {
        if (!canEdit || !hasChanges || saveStatus === 'saving' || saveInProgressRef.current) return;

        // Validate required fields
        const requiredFields = ['department', 'role', 'idNo', 'joiningDate'];
        const missingFields = requiredFields.filter(field => !localFormData[field]);
        
        if (missingFields.length > 0) {
            const fieldNames = {
                department: 'Department',
                role: 'Role',
                idNo: 'Employee ID',
                joiningDate: 'Joining Date'
            };
            
            alert(`Please fill in the following required fields:\n${missingFields.map(f => `• ${fieldNames[f]}`).join('\n')}`);
            return;
        }

        // Check if we have a valid department path
        const departmentPath = getDepartmentSavePath(localFormData.department);
        if (!departmentPath) {
            alert("Invalid department selected. Cannot save.");
            return;
        }

        setSaveStatus('saving');
        saveInProgressRef.current = true;
        setIsProcessing(true);
        
        try {
            // Notify parent component to save the data
            if (onSaveComplete && typeof onSaveComplete === 'function') {
                const saveData = {
                    ...localFormData,
                    departmentSavePath: departmentPath,
                    oldDepartment: oldDepartment // Pass old department for cleanup
                };
                
                const success = await onSaveComplete(saveData);
                
                if (success) {
                    // Reset changes flag and clear old department
                    setHasChanges(false);
                    setOldDepartment("");
                    previousFormDataRef.current = { ...localFormData };
                    
                    setSaveStatus('success');
                    
                    // Auto-navigate to next step if nextStep function is provided
                    if (nextStep && typeof nextStep === 'function') {
                        setTimeout(() => {
                            nextStep();
                        }, 1000);
                    }
                    
                    // Keep success message visible for longer
                    setTimeout(() => {
                        setSaveStatus(null);
                        saveInProgressRef.current = false;
                        setIsProcessing(false);
                    }, 3000);
                } else {
                    throw new Error("Save failed");
                }
            } else {
                throw new Error("Save handler not available");
            }
        } catch (error) {
            console.error("Error saving data:", error);
            setSaveStatus('error');
            
            setTimeout(() => {
                setSaveStatus(null);
                saveInProgressRef.current = false;
                setIsProcessing(false);
            }, 3000);
        }
    };

    // Handle discard changes
    const handleDiscardChanges = () => {
        if (!canEdit || !hasChanges || saveStatus === 'saving' || saveInProgressRef.current) return;
        
        setShowDiscardModal(true);
    };

    // Confirm discard changes
    const confirmDiscardChanges = () => {
        // Reset to original form data
        setLocalFormData({ ...previousFormDataRef.current });
        
        // Reset all changes
        if (handleChange && typeof handleChange === "function") {
            Object.entries(previousFormDataRef.current).forEach(([name, value]) => {
                handleChange({
                    target: { name, value }
                });
            });
        }
        
        setHasChanges(false);
        setOldDepartment(""); // Clear old department reference
        setShowDiscardModal(false);
    };

    // Set current date for joining date - only in edit mode and only once
    useEffect(() => {
        if (canEdit && !localFormData.joiningDate && isInitialMount.current) {
            const today = new Date().toISOString().split("T")[0];
            safeHandleChange({
                target: {
                    name: "joiningDate",
                    value: today
                }
            });
        }
    }, [canEdit]);

    // Load supervisor data on component mount if supervisorId exists - only once
    useEffect(() => {
        if (localFormData.supervisorId && isInitialMount.current) {
            fetchSupervisorData(localFormData.supervisorId);
        }
    }, []); // Empty dependency array - only run once on mount

    // Check if current department is "Others"
    const isOthersDepartment = localFormData.department === "Others";

    // Use formData from props if available, otherwise use localFormData
    const displayData = canEdit ? localFormData : formData;

    return (
        <div>
            {/* Header Card */}
            <div className="card shadow-sm border-primary mb-4">
                <div className="card-header bg-primary text-white">
                    <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center">
                            <i className="bi bi-building me-3 fs-4"></i>
                            <h4 className="mb-0">Department & Supervisor Details</h4>
                            <span className={`badge ms-3 ${canEdit ? "bg-warning" : "bg-info"}`}>
                                {canEdit ? "Edit Mode" : "View Mode"}
                            </span>
                        </div>
                        
                        {/* Save/Discard Buttons */}
                        {canEdit && hasChanges && (
                            <div className="d-flex align-items-center">
                                <div className="me-3">
                                    <span className="badge bg-danger animate-pulse">
                                        <i className="bi bi-exclamation-triangle me-1"></i>
                                        Unsaved Changes
                                    </span>
                                </div>
                                <button
                                    className="btn btn-outline-light btn-sm me-2"
                                    onClick={handleDiscardChanges}
                                    disabled={saveStatus === 'saving' || isProcessing}
                                >
                                    <i className="bi bi-x-circle me-1"></i>
                                    Discard
                                </button>
                                <button
                                    className="btn btn-light btn-sm"
                                    onClick={handleSaveClick}
                                    disabled={saveStatus === 'saving' || isProcessing}
                                >
                                    {saveStatus === 'saving' || isProcessing ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-save me-1"></i>
                                            Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Save Status Alert - Fixed to not auto-close immediately */}
            {saveStatus === 'success' && (
                <div className="alert alert-success alert-dismissible fade show mb-4" role="alert">
                    <i className="bi bi-check-circle-fill me-2"></i>
                    <strong>Success!</strong> Department details saved successfully.
                    <button type="button" className="btn-close" onClick={() => {
                        setSaveStatus(null);
                        saveInProgressRef.current = false;
                        setIsProcessing(false);
                    }}></button>
                </div>
            )}
            
            {saveStatus === 'error' && (
                <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    <strong>Error!</strong> Failed to save department details. Please try again.
                    <button type="button" className="btn-close" onClick={() => {
                        setSaveStatus(null);
                        saveInProgressRef.current = false;
                        setIsProcessing(false);
                    }}></button>
                </div>
            )}

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
                                            disabled={saveStatus === 'saving' || isProcessing}
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
                                                disabled={saveStatus === 'saving' || isProcessing}
                                            />
                                        ) : (
                                            <select
                                                className={`form-select ${errors.role ? "is-invalid" : ""}`}
                                                name="role"
                                                value={displayData.role || ""}
                                                onChange={safeHandleChange}
                                                onBlur={safeHandleBlur}
                                                disabled={!displayData.department || saveStatus === 'saving' || isProcessing}
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
                                    <strong>Starting Date <span className="text-danger">*</span></strong>
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
                                            disabled={saveStatus === 'saving' || isProcessing}
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
                                    Service starting date
                                </small>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Department Change History Card - Only show if there's a change reason */}
                {displayData.departmentChangeReason && (
                    <div className="col-12">
                        <div className="card shadow-sm border-info">
                            <div className="card-header bg-info text-white">
                                <div className="d-flex align-items-center">
                                    <i className="bi bi-clock-history me-2"></i>
                                    <h5 className="mb-0">Department Change History</h5>
                                </div>
                            </div>
                            <div className="card-body">
                                <div className="row">
                                    <div className="col-md-12">
                                        <div className="bg-secondary bg-opacity-25 p-3 rounded">
                                            <div className="d-flex align-items-start">
                                                <i className="bi bi-info-circle-fill fs-4 me-3"></i>
                                                <div>
                                                    <h6 className="alert-heading">
                                                        <i className="bi bi-building me-1"></i>
                                                        Department Change Reason
                                                    </h6>
                                                    <p className="mb-0">
                                                        {displayData.departmentChangeReason}
                                                    </p>
                                                    {oldDepartment && (
                                                        <small className="text-muted mt-2 d-block">
                                                            <i className="bi bi-arrow-right me-1"></i>
                                                            Changed from <strong>{oldDepartment}</strong> to <strong>{displayData.department}</strong>
                                                        </small>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

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
                                <div className="col-md-4">
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
                                                    disabled={saveStatus === 'saving' || isProcessing}
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

                                <div className="col-md-4">
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
                                    <div className="col-md-4">
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
                                        <h6 className="text-muted mb-1 d-block">Department</h6>
                                        <p className="fw-bold text-primary fs-5 mb-0">
                                            {displayData.department || "Not Selected"}
                                        </p>
                                        {displayData.departmentChangeReason && (
                                            <small className="text-info">
                                                <i className="bi bi-clock-history me-1"></i>
                                                Recently Changed
                                            </small>
                                        )}
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="summary-item text-center p-3 border rounded">
                                        <div className="summary-icon mb-2">
                                            <i className="bi bi-person-badge fs-1 text-success"></i>
                                        </div>
                                        <h6 className="text-muted mb-1 d-block">Role</h6>
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
                                        <h6 className="text-muted mb-1 d-block">Joining Date</h6>
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
                                        <h6 className="text-muted mb-1 d-block">Supervisor</h6>
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

            {/* Discard Changes Modal */}
            {showDiscardModal && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header bg-danger text-white">
                                <h5 className="modal-title">
                                    <i className="bi bi-exclamation-triangle me-2"></i>
                                    Discard Changes
                                </h5>
                                <button 
                                    type="button" 
                                    className="btn-close btn-close-white" 
                                    onClick={() => setShowDiscardModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <p>Are you sure you want to discard all changes? This action cannot be undone.</p>
                                <div className="alert alert-warning">
                                    <i className="bi bi-info-circle me-2"></i>
                                    All unsaved changes will be lost.
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button 
                                    type="button" 
                                    className="btn btn-secondary" 
                                    onClick={() => setShowDiscardModal(false)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-danger" 
                                    onClick={confirmDiscardChanges}
                                >
                                    <i className="bi bi-trash me-1"></i>
                                    Discard Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Department Change Confirmation Modal */}
            {showDeptChangeModal && (
                <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,0.6)", zIndex: 1055 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header bg-warning text-dark">
                                <h5 className="modal-title">
                                    <i className="bi bi-exclamation-triangle me-2"></i>
                                    Confirm Department Change
                                </h5>
                                <button 
                                    type="button" 
                                    className="btn-close" 
                                    onClick={() => {
                                        setShowDeptChangeModal(false);
                                        setPendingDepartment("");
                                        setDeptChangeReason("");
                                    }}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="alert alert-warning">
                                    <i className="bi bi-info-circle me-2"></i>
                                    You are changing department from
                                    <strong className="mx-1">{oldDepartment}</strong> 
                                    <i className="bi bi-arrow-right mx-1"></i>
                                    <strong>{pendingDepartment}</strong>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label">
                                        <i className="bi bi-chat-left-text me-1"></i>
                                        Reason for Department Change <span className="text-danger">*</span>
                                    </label>
                                    <textarea
                                        className="form-control"
                                        rows="4"
                                        placeholder="Enter the reason for changing department (required)..."
                                        value={deptChangeReason}
                                        onChange={(e) => setDeptChangeReason(e.target.value)}
                                        autoFocus
                                    />
                                    <small className="text-muted">
                                        This reason will be recorded in the employee's history.
                                    </small>
                                </div>

                                <div className="alert alert-info text-info">
                                    <i className="bi bi-lightbulb me-2"></i>
                                    <strong>Note:</strong> Employee ID will be regenerated based on the new department.
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowDeptChangeModal(false);
                                        setPendingDepartment("");
                                        setDeptChangeReason("");
                                    }}
                                >
                                    <i className="bi bi-x-circle me-1"></i>
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-warning"
                                    onClick={confirmDepartmentChange}
                                    disabled={!deptChangeReason.trim()}
                                >
                                    <i className="bi bi-check-circle me-1"></i>
                                    Confirm Change
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Department;