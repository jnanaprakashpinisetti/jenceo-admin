import React, { useEffect, useState, useRef, useCallback } from "react";
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

    const [showHistory, setShowHistory] = useState(false);
    const [departmentHistory, setDepartmentHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const [showDeptChangeModal, setShowDeptChangeModal] = useState(false);
    const [pendingDepartment, setPendingDepartment] = useState("");
    const [deptChangeReason, setDeptChangeReason] = useState("");

    // Get current user info
    const [currentUser, setCurrentUser] = useState({
        uid: "system",
        name: "System User"
    });

    // Track initial department on component mount
    const initialDepartmentRef = useRef("");

    // Load current user from Firebase
    useEffect(() => {
        const uid = localStorage.getItem("uid") || localStorage.getItem("userUid") || "system";

        if (uid !== "system") {
            firebaseDB.child(`Users/${uid}`).once("value").then(snap => {
                if (snap.exists()) {
                    const userData = snap.val();
                    setCurrentUser({
                        uid,
                        name: userData.name ||
                            userData.displayName ||
                            userData.email ||
                            "Unknown User"
                    });
                }
            }).catch(() => {
                // Use fallback if user not found
                setCurrentUser({
                    uid,
                    name: "Unknown User"
                });
            });
        }
    }, []);

    // In Department.js, update the useEffect that watches formData:
    useEffect(() => {
        // Only update if there are actual changes
        const shouldUpdate = formData &&
            JSON.stringify(formData) !== JSON.stringify(previousFormDataRef.current);

        if (shouldUpdate) {
            setLocalFormData(formData || {});
            previousFormDataRef.current = formData || {};

            // Set initial department only once
            if (formData.department && !initialDepartmentRef.current) {
                initialDepartmentRef.current = formData.department;
                setOldDepartment(formData.department);
            }

            // Only reset changes if not processing
            if (!isProcessing) {
                setHasChanges(false);
            }

            // Load department history when formData changes
            const employeeId = formData.idNo || formData.employeeId;
            const currentDept = formData.department;
            if (employeeId && currentDept) {
                loadDepartmentHistory(employeeId, currentDept);
            }
        }
    }, [formData, isProcessing]);

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

    // Function to get department save path
    const getDepartmentSavePath = useCallback((department) => {
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
    }, []);

    // Safe handleChange function - DO NOT REGENERATE ID
    const safeHandleChange = (e) => {
        const { name, value } = e.target;

        const updatedData = {
            ...localFormData,
            [name]: value
        };

        setLocalFormData(updatedData);

        // Update parent immediately for all changes
        if (handleChange) {
            handleChange(e);
        }

        // Mark that changes have been made
        if (canEdit) {
            setHasChanges(true);
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
                const e = {
                    target: {
                        name: "supervisorName",
                        value: supervisorName
                    }
                };
                safeHandleChange(e);
            } else {
                setSupervisorData(null);
                const e = {
                    target: {
                        name: "supervisorName",
                        value: ""
                    }
                };
                safeHandleChange(e);
            }
        } catch (error) {
            console.error("Error fetching supervisor data:", error);
        } finally {
            setLoadingSupervisor(false);
        }
    };

    // FIXED: loadDepartmentHistory - searches across ALL departments
    const loadDepartmentHistory = async (employeeId, department) => {
        if (!employeeId) return;

        setLoadingHistory(true);
        try {
            const allDepartments = [
                "Home Care", "Housekeeping", "Office & Administrative", "Customer Service",
                "Management & Supervision", "Security", "Driving & Logistics", "Technical & Maintenance",
                "Retail & Sales", "Industrial & Labor", "Others"
            ];

            let allHistory = [];

            // Search in ALL departments for history
            for (const dept of allDepartments) {
                const path = getDepartmentSavePath(dept);
                if (!path) continue;

                const historyPath = `${path}/${employeeId}/DepartmentHistory`;
                const snapshot = await firebaseDB.child(historyPath).once("value");

                if (snapshot.exists()) {
                    const historyData = snapshot.val();

                    // Convert object to array
                    if (historyData && typeof historyData === 'object') {
                        Object.keys(historyData).forEach(key => {
                            const entry = historyData[key];
                            if (entry && typeof entry === 'object') {
                                allHistory.push({
                                    id: key,
                                    ...entry,
                                    sourceDepartment: dept
                                });
                            }
                        });
                    }
                }
            }

            // Sort by timestamp descending (newest first)
            allHistory.sort((a, b) => {
                const dateA = new Date(a.timestamp || 0);
                const dateB = new Date(b.timestamp || 0);
                return dateB - dateA;
            });

            setDepartmentHistory(allHistory);

        } catch (error) {
            console.error("Error loading department history:", error);
            setDepartmentHistory([]);
        } finally {
            setLoadingHistory(false);
        }
    };

    // FIXED: Save department change to history - saves to BOTH old and new departments
    const saveDepartmentChangeToHistory = async (employeeId, oldDept, newDept, reason) => {
        if (!employeeId || !oldDept || !newDept) return null;

        try {
            const historyEntry = {
                oldDepartment: oldDept,
                newDepartment: newDept,
                reason: reason.trim(),
                timestamp: new Date().toISOString(),
                changedBy: currentUser.name,
                changedById: currentUser.uid,
                employeeId: employeeId
            };

            // Save to OLD department history
            const oldPath = getDepartmentSavePath(oldDept);
            if (oldPath) {
                const historyKey = Date.now().toString();
                const historyPath = `${oldPath}/${employeeId}/DepartmentHistory/${historyKey}`;
                await firebaseDB.child(historyPath).set(historyEntry);
                console.log(`✓ History saved in old department (${oldDept}): ${historyKey}`);
            }

            // Save to NEW department history
            const newPath = getDepartmentSavePath(newDept);
            if (newPath) {
                const historyKey = (Date.now() + 1).toString();
                const historyPath = `${newPath}/${employeeId}/DepartmentHistory/${historyKey}`;
                await firebaseDB.child(historyPath).set(historyEntry);
                console.log(`✓ History saved in new department (${newDept}): ${historyKey}`);
            }

            // Update local history state
            setDepartmentHistory(prev => [historyEntry, ...prev]);

            return historyEntry;
        } catch (error) {
            console.error("Error saving to history:", error);
            throw error;
        }
    };

    // Department.js - REMOVED: removeFromOldDepartment function
    // 🔥 CRITICAL FIX: Department tab should NOT delete old data
    // Only WorkerModal.js should handle deletion

    // Handle department change
    const handleDepartmentChange = (e) => {
        const newDept = e.target.value;
        const currentDept = localFormData.department || formData.department;

        // If there's a current department and it's different, show modal
        if (currentDept && newDept && newDept !== currentDept) {
            setPendingDepartment(newDept);
            setShowDeptChangeModal(true);
        } else {
            // Direct change if no current department
            safeHandleChange(e);
            setHasChanges(true);
        }
    };

    // Handle supervisor ID blur
    const handleSupervisorIdBlur = async (e) => {
        if (!canEdit) return;

        const supervisorId = e.target.value;
        if (supervisorId) {
            await fetchSupervisorData(supervisorId);
        }
        if (handleBlur) handleBlur(e);
    };

    // Confirm department change - Save history before moving
    const confirmDepartmentChange = async () => {
        if (!deptChangeReason.trim()) {
            alert("Please enter reason for department change");
            return;
        }

        setIsProcessing(true);

        try {
            const currentDept = localFormData.department || formData.department;
            const currentId = localFormData.idNo || formData.idNo;
            const employeeId = currentId;

            // 1. Save to history in CURRENT (old) department FIRST
            if (employeeId && currentDept && pendingDepartment) {
                await saveDepartmentChangeToHistory(
                    employeeId,
                    currentDept,
                    pendingDepartment,
                    deptChangeReason.trim()
                );
            }

            // 2. Update local state
            const updatedData = {
                ...localFormData,
                department: pendingDepartment,
                departmentChangeReason: deptChangeReason.trim(),
                departmentChangedAt: new Date().toISOString(),
                departmentChangedBy: currentUser.name,
                idNo: currentId, // Keep same ID
                role: ""
            };

            setLocalFormData(updatedData);
            setOldDepartment(currentDept);

            // 3. Update parent formData
            if (handleChange) {
                handleChange({
                    target: { name: "department", value: pendingDepartment }
                });

                handleChange({
                    target: { name: "departmentChangeReason", value: deptChangeReason.trim() }
                });

                handleChange({
                    target: { name: "departmentChangedAt", value: updatedData.departmentChangedAt }
                });

                handleChange({
                    target: { name: "departmentChangedBy", value: updatedData.departmentChangedBy }
                });

                handleChange({
                    target: { name: "role", value: "" }
                });
            }

            setHasChanges(true);

            // Close modal and reset
            setShowDeptChangeModal(false);
            setPendingDepartment("");
            setDeptChangeReason("");

        } catch (error) {
            console.error("Error changing department:", error);
            alert("Error changing department. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    // Cancel department change
    const cancelDepartmentChange = () => {
        setShowDeptChangeModal(false);
        setPendingDepartment("");
        setDeptChangeReason("");

        // Reset select to current department
        const currentDept = localFormData.department || formData.department;
        if (currentDept) {
            // Trigger change event to reset the select
            const resetEvent = {
                target: {
                    name: "department",
                    value: currentDept
                }
            };
            safeHandleChange(resetEvent);
        }
    };

    // FIXED: Handle save button click - Department tab does NOT delete old data
    const handleSaveClick = async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        if (!canEdit || !hasChanges || isSaving || isProcessing) return;

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
        setIsProcessing(true);

        try {
            const employeeId = localFormData.idNo;
            const oldDept = oldDepartment || initialDepartmentRef.current;
            const newDept = localFormData.department;

            // 🔥 CRITICAL FIX: Department tab should NOT delete old data
            // Only pass oldDepartment to WorkerModal for handling
            // WorkerModal.js will handle the deletion

            if (onSaveComplete) {
                // Prepare data for saving
                const saveData = {
                    ...localFormData,
                    key: localFormData.key || localFormData.idNo,
                    departmentSavePath: departmentPath,
                    oldDepartment: oldDept, // Pass old department to parent
                    lastUpdatedAt: new Date().toISOString(),
                    lastUpdatedBy: currentUser.name
                };

                const success = await onSaveComplete(saveData);

                if (success) {
                    setHasChanges(false);
                    setOldDepartment(localFormData.department);
                    initialDepartmentRef.current = localFormData.department;
                    previousFormDataRef.current = { ...localFormData };

                    // Reload history from ALL departments
                    if (employeeId) {
                        await loadDepartmentHistory(employeeId, localFormData.department);
                    }

                    setSaveStatus('success');

                    setTimeout(() => {
                        setSaveStatus(null);
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
                setIsProcessing(false);
            }, 3000);
        }
    };

    // Handle discard changes
    const handleDiscardChanges = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        if (!canEdit || !hasChanges || isSaving || isProcessing) return;
        setShowDiscardModal(true);
    };

    // Confirm discard changes
    const confirmDiscardChanges = () => {
        setLocalFormData({ ...previousFormDataRef.current });

        if (handleChange) {
            Object.entries(previousFormDataRef.current).forEach(([name, value]) => {
                handleChange({
                    target: { name, value }
                });
            });
        }

        setHasChanges(false);
        setShowDiscardModal(false);
    };

    // Set current date for joining date on initial mount
    useEffect(() => {
        if (canEdit && !localFormData.joiningDate) {
            const today = new Date().toISOString().split("T")[0];
            const event = {
                target: {
                    name: "joiningDate",
                    value: today
                }
            };
            safeHandleChange(event);
        }
    }, [canEdit]);

    // Load supervisor data on component mount if supervisorId exists
    useEffect(() => {
        if (localFormData.supervisorId) {
            fetchSupervisorData(localFormData.supervisorId);
        }
    }, [localFormData.supervisorId]);

    // Check if current department is "Others"
    const isOthersDepartment = localFormData.department === "Others";

    // Use formData from props if available, otherwise use localFormData
    const displayData = canEdit ? localFormData : formData;

    // Format timestamp
    const formatDateTime = (timestamp) => {
        if (!timestamp) return "N/A";

        try {
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) {
                return "Invalid Date";
            }
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (error) {
            console.error("Error formatting date:", error);
            return timestamp;
        }
    };

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
                                    type="button"
                                    className="btn btn-outline-light btn-sm me-2"
                                    onClick={handleDiscardChanges}
                                    disabled={isSaving || isProcessing}
                                >
                                    <i className="bi bi-x-circle me-1"></i>
                                    Discard
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-light btn-sm"
                                    onClick={handleSaveClick}
                                    disabled={isSaving || isProcessing}
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

            {/* Save Status Alert */}
            {saveStatus === 'success' && (
                <div className="alert alert-success alert-dismissible fade show mb-4" role="alert">
                    <i className="bi bi-check-circle-fill me-2"></i>
                    <strong>Success!</strong> Department details saved successfully.
                    <button type="button" className="btn-close" onClick={() => setSaveStatus(null)}></button>
                </div>
            )}

            {saveStatus === 'error' && (
                <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    <strong>Error!</strong> Failed to save department details. Please try again.
                    <button type="button" className="btn-close" onClick={() => setSaveStatus(null)}></button>
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
                                            disabled={isSaving || isProcessing}
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
                                        {oldDepartment && displayData.department && oldDepartment !== displayData.department && (
                                            <small className="text-warning mt-1 d-block">
                                                <i className="bi bi-info-circle me-1"></i>
                                                Previously in <strong>{oldDepartment}</strong> department
                                            </small>
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
                                                onBlur={handleBlur}
                                                placeholder="Enter role"
                                                disabled={isSaving || isProcessing}
                                            />
                                        ) : (
                                            <select
                                                className={`form-select ${errors.role ? "is-invalid" : ""}`}
                                                name="role"
                                                value={displayData.role || ""}
                                                onChange={safeHandleChange}
                                                onBlur={handleBlur}
                                                disabled={!displayData.department || isSaving || isProcessing}
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
                                    <i className="bi bi-lock me-1"></i>
                                    ID remains consistent across department changes
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
                                            onBlur={handleBlur}
                                            max={new Date().toISOString().split("T")[0]}
                                            disabled={isSaving || isProcessing}
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

                {/* Department Change History Card */}
                {(departmentHistory.length > 0 || displayData.departmentChangeReason || loadingHistory) && (
                    <div className="col-md-12">
                        <div className="card shadow-sm border-secondary">
                            <div className="card-header bg-secondary text-white">
                                <div className="d-flex align-items-center justify-content-between">
                                    <div className="d-flex align-items-center">
                                        <i className="bi bi-clock-history me-2"></i>
                                        <h5 className="mb-0">Department Change History</h5>
                                        {loadingHistory && (
                                            <span className="badge bg-info ms-2">
                                                <i className="bi bi-arrow-repeat me-1"></i>
                                                Loading...
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-light"
                                        onClick={() => setShowHistory(!showHistory)}
                                        disabled={loadingHistory}
                                    >
                                        {showHistory ? "Hide" : "Show"} History
                                    </button>
                                </div>
                            </div>

                            <div className="card-body">
                                {loadingHistory ? (
                                    <div className="text-center py-4">
                                        <div className="spinner-border text-primary" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                        <p className="mt-2">Loading history...</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Current Change Reason */}
                                        {displayData.departmentChangeReason && (
                                            <div className="alert alert-warning mb-3">
                                                <div className="d-flex">
                                                    <i className="bi bi-info-circle-fill fs-4 me-3"></i>
                                                    <div>
                                                        <h6 className="alert-heading mb-1">
                                                            <i className="bi bi-arrow-right-circle me-1"></i>
                                                            Current Department Change
                                                        </h6>
                                                        <p className="mb-1">
                                                            <strong>Reason:</strong> {displayData.departmentChangeReason}
                                                        </p>
                                                        {displayData.departmentChangedAt && (
                                                            <p className="mb-1">
                                                                <strong>Changed On:</strong> {formatDateTime(displayData.departmentChangedAt)}
                                                            </p>
                                                        )}
                                                        {displayData.departmentChangedBy && (
                                                            <p className="mb-0">
                                                                <strong>Changed By:</strong> {displayData.departmentChangedBy}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* History Table */}
                                        {showHistory && departmentHistory.length > 0 && (
                                            <div className="table-responsive">
                                                <table className="table table-sm table-hover">
                                                    <thead className="table-dark">
                                                        <tr>
                                                            <th>#</th>
                                                            <th>Old Department</th>
                                                            <th>New Department</th>
                                                            <th>Reason</th>
                                                            <th>Changed By</th>
                                                            <th>User ID</th>
                                                            <th>Date & Time</th>
                                                            <th>Source Dept</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {departmentHistory.map((entry, index) => (
                                                            <tr key={entry.id || index}>
                                                                <td>{index + 1}</td>
                                                                <td>
                                                                    <span className="badge bg-secondary">{entry.oldDepartment}</span>
                                                                </td>
                                                                <td>
                                                                    <span className="badge bg-primary">{entry.newDepartment}</span>
                                                                </td>
                                                                <td>{entry.reason || "N/A"}</td>
                                                                <td>
                                                                    <span className="text-primary">
                                                                        <i className="bi bi-person-fill me-1"></i>
                                                                        {entry.changedBy || "System"}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <small className="text-muted">
                                                                        {entry.changedById || "system"}
                                                                    </small>
                                                                </td>
                                                                <td>
                                                                    <small>{formatDateTime(entry.timestamp)}</small>
                                                                </td>
                                                                <td>
                                                                    <small className="text-muted">{entry.sourceDepartment || "Unknown"}</small>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                <div className="text-info small mt-2">
                                                    <i className="bi bi-info-circle me-1"></i>
                                                    History is collected from all departments where this employee has been.
                                                </div>
                                            </div>
                                        )}

                                        {showHistory && departmentHistory.length === 0 && (
                                            <div className="text-center py-3">
                                                <i className="bi bi-clock-history fs-1 text-muted mb-2"></i>
                                                <p className="text-muted">No department change history found</p>
                                            </div>
                                        )}
                                    </>
                                )}
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
                                                    disabled={isSaving || isProcessing}
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
                                {supervisorData?.photo && (
                                    <div className="col-md-4">
                                        <div className="card border-success bg-light">
                                            <div className="card-body">
                                                <div className="d-flex align-items-center">
                                                    <div className="me-3">
                                                        <img
                                                            src={supervisorData.photo}
                                                            alt="Supervisor"
                                                            className="rounded-circle border border-success"
                                                            style={{ width: "80px", height: "80px", objectFit: "cover" }}
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                const sibling = e.target.nextElementSibling;
                                                                if (sibling) {
                                                                    sibling.style.display = 'flex';
                                                                }
                                                            }}
                                                        />

                                                    </div>
                                                    <div>
                                                        <h6 className="text-success mb-1">
                                                            <i className="bi bi-person-check me-1"></i>
                                                            Supervisor
                                                        </h6>
                                                        <p className="mb-0">
                                                            <strong>Name:</strong> {supervisorData.name || "N/A"}
                                                        </p>
                                                        <p className="mb-0">
                                                            <strong>ID:</strong> {displayData.supervisorId || "N/A"}
                                                        </p>
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
                                    onClick={cancelDepartmentChange}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="alert alert-warning">
                                    <i className="bi bi-info-circle me-2"></i>
                                    You are changing department from
                                    <strong className="mx-1">{displayData.department}</strong>
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

                                <div className="bg-secondary bg-opacity-25 p-3 rounded">
                                    <i className="bi bi-lightbulb me-2"></i>
                                    <strong>Note:</strong>
                                    <div>Employee ID will remain the same (<strong>{displayData.idNo}</strong>).</div>
                                    {oldDepartment && (
                                        <div className="mt-1">
                                            <i className="bi bi-trash me-1"></i>
                                            Employee will be <strong>removed</strong> from <strong>{oldDepartment}</strong> department.
                                        </div>
                                    )}
                                    <div className="mt-1">
                                        <i className="bi bi-person me-1"></i>
                                        Changed by: <strong>{currentUser.name}</strong>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={cancelDepartmentChange}
                                    disabled={isProcessing}
                                >
                                    <i className="bi bi-x-circle me-1"></i>
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-warning"
                                    onClick={confirmDepartmentChange}
                                    disabled={!deptChangeReason.trim() || isProcessing}
                                >
                                    {isProcessing ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-check-circle me-1"></i>
                                            Confirm Change
                                        </>
                                    )}
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