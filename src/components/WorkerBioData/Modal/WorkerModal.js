import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../../context/AuthContext";
import BaseModal, { AlertModal, ConfirmModal } from "./Common/BaseModal";
import MultiSelectDropdown from "./Common/MultiSelectDropdown";
import SkillAccordion from "./Common/SkillAccordion";
import Chip from "./Common/Chip";
import { storageRef, uploadFile, getDownloadURL } from "../../../firebase";


// Import tab components
import BasicInfo from "./BasicInfo";
import Department from "./Department";
import Address from "./Address";
import PersonalInfo from "./PersonalInfo";
import QualificationSkills from "./QualificationSkills";
import HealthInfo from "./HealthInfo";
import EmergencyContacts from "./EmergencyContacts";
import BankDetails from "./BankDetails";
import Payment from "./Payment";
import Working from "./Working";
import PayInfo from "./PayInfo";
import Timesheet from "../TimesheetTable";
import Biodata from "./Biodata";
import SlotBook from "./SlotBook";

import { getEffectiveUserId, getEffectiveUserName, toISO, formatDDMMYY, formatTime12h, blankPayment, blankWork, stampAuthorOnRow } from "./utils/helpers";
import { validateBasic, validateAddress, validatePersonal, validatePayments, validateWork } from "./utils/validation";

// Add firebaseDB import at the top
import firebaseDB from "../../../firebase";

// Shared constants
export const LANGUAGE_OPTIONS = [
    "Telugu", "English", "Hindi", "Urdu", "Tamil", "Kannada", "Malayalam",
    "Marathi", "Gujarati", "Bengali", "Punjabi", "Odia", "Assamese"
];

export const SKILL_OPTIONS = [
    "Nursing", "Diaper", "Patent Care", "Baby Care", "Cook", "Supporting",
    "Old Age Care", "Any Duty", "Others"
];

export const headerImage = "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FHeadder.svg?alt=media&token=fa65a3ab-ba03-4959-bc36-e293c6db48ae";

const WorkerModal = ({ employee, isOpen, onClose, onSave, onDelete, isEditMode }) => {
    const [localEdit, setLocalEdit] = useState(false);
    const canEdit = isEditMode || localEdit;
    const [formData, setFormData] = useState({});
    const [status, setStatus] = useState("On Duty");
    const [activeTab, setActiveTab] = useState("basic");
    const [alertState, setAlertState] = useState({ open: false, title: "", variant: "info", body: null });
    const [confirmState, setConfirmState] = useState({ open: false, title: "", message: "", onConfirm: null });
    const [deleteReasonOpen, setDeleteReasonOpen] = useState(false);
    const [returnReasonOpen, setReturnReasonOpen] = useState(false);
    const [reasonForm, setReasonForm] = useState({ reasonType: "", comment: "", for: "" });
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    // Add error state
    const [errors, setErrors] = useState({});
    // Add setIsSaving state here
    const [isSaving, setIsSaving] = useState(false);
    const iframeRef = useRef(null);

    const { user: authUser } = useAuth?.() || {};
    const effectiveUserId = getEffectiveUserId(authUser);
    const effectiveUserName = getEffectiveUserName(authUser);

    // Date helpers
    const today = new Date();
    const minusYears = (y) => new Date(today.getFullYear() - y, today.getMonth(), today.getDate());
    const DOB_MIN = toISO(minusYears(60));
    const DOB_MAX = toISO(minusYears(18));
    const DOM_MIN = toISO(minusYears(40));
    const DOM_MAX = toISO(today);
    const PAY_MIN = toISO(minusYears(1));
    const PAY_MAX = toISO(today);

    // Function to get department save path - ADD THIS FUNCTION
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

        return pathMap[department];
    };

    // PREVENT FORM SUBMISSION - CRITICAL FIX
    const preventFormSubmit = (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
    };

    // Modal handlers
    const openAlert = (title, body, variant = "info") => setAlertState({ open: true, title, body, variant });
    const closeAlert = () => setAlertState((s) => ({ ...s, open: false }));
    const openConfirm = (title, message, onConfirm) => setConfirmState({ open: true, title, message, onConfirm });
    const closeConfirm = () => setConfirmState((s) => ({ ...s, open: false }));
    const employeeKey = formData.idNo; // 🔥 SINGLE SOURCE OF TRUTH

    // Add this ref to track initial department
    const initialDepartmentRef = useRef("");

    // Initialize initialDepartmentRef when formData loads
    useEffect(() => {
        if (formData.department && !initialDepartmentRef.current) {
            initialDepartmentRef.current = formData.department;
        }
    }, [formData.department]);

    useEffect(() => {
        if (employee) {
            setFormData({
                ...employee,
            });
        }
    }, [employee]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setHasUnsavedChanges(true);
    };

    const handleInputBlur = (e) => {
        // Add validation logic here if needed
        const { name, value } = e.target;

        // Example validation for required fields
        if (!value && ['department', 'role', 'idNo', 'joiningDate'].includes(name)) {
            setErrors(prev => ({ ...prev, [name]: `${name} is required` }));
        } else {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    // WorkerModal.js - COMPLETE FIXED handleSaveClick function
    const handleSaveClick = async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        try {
            if (isSaving) return; // Prevent multiple saves

            setIsSaving(true);

            // Validate we have a key before proceeding
            if (!formData.key && !formData.idNo) {
                throw new Error("Employee key or ID number is missing. Cannot save.");
            }

            // Validate required fields
            const requiredFields = ['department', 'role', 'idNo', 'joiningDate'];
            const missingFields = requiredFields.filter(field => !formData[field]);

            if (missingFields.length > 0) {
                const fieldNames = {
                    department: 'Department',
                    role: 'Role',
                    idNo: 'Employee ID',
                    joiningDate: 'Joining Date'
                };

                openAlert("Validation Error",
                    `Please fill in the following required fields:\n${missingFields.map(f => `• ${fieldNames[f]}`).join('\n')}`,
                    "warning");
                setIsSaving(false);
                return;
            }

            // Get the department-specific save path
            const department = formData.department;
            const savePath = getDepartmentSavePath(department);

            if (!savePath) {
                openAlert("Error", "Please select a valid department before saving.", "danger");
                setIsSaving(false);
                return;
            }

            // Upload employee photo if exists
            let photoURL = formData.employeePhotoUrl;
            if (formData.employeePhotoFile instanceof File) {
                const photoExt = formData.employeePhotoFile.name.split('.').pop();
                const photoFileName = `employee-photos/${formData.idNo || 'unknown'}-${Date.now()}.${photoExt}`;
                const photoFileRef = storageRef.child(photoFileName);
                const photoSnapshot = await uploadFile(photoFileRef, formData.employeePhotoFile);
                photoURL = await getDownloadURL(photoSnapshot.ref);
            }

            // Upload ID proof if exists
            let idProofURL = formData.idProofUrl;
            if (formData.idProofFile instanceof File) {
                const idExt = formData.idProofFile.name.split('.').pop();
                const idFileName = `id-proofs/${formData.idNo || 'unknown'}-${Date.now()}.${idExt}`;
                const idFileRef = storageRef.child(idFileName);
                const idSnapshot = await uploadFile(idFileRef, formData.idProofFile);
                idProofURL = await getDownloadURL(idSnapshot.ref);
            }

            // Prepare data for saving
            const dataToSave = {
                ...formData,
                employeePhoto: photoURL,
                employeePhotoUrl: photoURL,
                idProof: idProofURL,
                status: status,
                // Remove file objects
                employeePhotoFile: undefined,
                idProofFile: undefined,
                employeePhotoPreview: undefined,
                idProofPreview: undefined,
                // Add timestamp
                lastUpdatedAt: new Date().toISOString(),
                lastUpdatedBy: effectiveUserName,
                updatedBy: effectiveUserId
            };

            // Clean data
            const cleanDataToSave = { ...dataToSave };
            delete cleanDataToSave.key;
            delete cleanDataToSave.dbPath;
            delete cleanDataToSave.departmentSavePath;
            delete cleanDataToSave.oldDepartment;
            Object.keys(cleanDataToSave).forEach(key => {
                if (cleanDataToSave[key] === undefined) {
                    delete cleanDataToSave[key];
                }
            });

            // Determine the key to use - SINGLE SOURCE OF TRUTH
            const employeeKey = formData.idNo || formData.employeeId || formData.key;

            if (!employeeKey) {
                throw new Error("Cannot save: No key or ID number available");
            }

            // 🔥 CRITICAL FIX: Remove from ALL old departments if department changed
            const oldDepartment = formData.oldDepartment || initialDepartmentRef?.current;
            const isDepartmentChanged = oldDepartment && department && oldDepartment !== department;

            if (isDepartmentChanged) {
                // Get all department paths
                const allDepartments = [
                    "Home Care", "Housekeeping", "Office & Administrative", "Customer Service",
                    "Management & Supervision", "Security", "Driving & Logistics", "Technical & Maintenance",
                    "Retail & Sales", "Industrial & Labor", "Others"
                ];

                // Remove from ALL possible old department locations (except the new one)
                for (const dept of allDepartments) {
                    // Skip the new department (we'll add there)
                    if (dept === department) continue;

                    const path = getDepartmentSavePath(dept);
                    if (!path) continue;

                    try {
                        // Check if worker exists in this department
                        const snapshot = await firebaseDB.child(`${path}/${employeeKey}`).once("value");
                        if (snapshot.exists()) {
                            // Remove from old department
                            await firebaseDB.child(`${path}/${employeeKey}`).remove();
                            console.log(`✓ Removed from ${dept} department: ${employeeKey}`);

                            // Also remove from history tracking in old department if exists
                            const historyPath = `${path}/${employeeKey}/DepartmentHistory`;
                            try {
                                await firebaseDB.child(historyPath).remove();
                                console.log(`✓ Cleared history from ${dept}`);
                            } catch (historyError) {
                                // Ignore history errors
                                console.warn(`Could not clear history from ${dept}:`, historyError);
                            }
                        }
                    } catch (error) {
                        console.warn(`Error checking/removing from ${dept}:`, error);
                        // Continue anyway, don't fail the save
                    }
                }
            }

            // Save to department-specific path ONLY
            await firebaseDB.child(savePath).child(employeeKey).set(cleanDataToSave);
            console.log(`✓ Saved to ${department} department: ${employeeKey}`);

            setIsSaving(false);
            setHasUnsavedChanges(false);

            if (onSave) {
                onSave({
                    ...cleanDataToSave,
                    key: employeeKey,
                    id: employeeKey,
                    department: department,
                    dbPath: savePath
                });
            }

            openAlert("Success", `Employee data saved successfully to ${department} department!`, "success");

            // 🔥 TRIGGER GLOBAL UPDATE EVENT FOR UI REFRESH
            if (window.dispatchEvent) {
                // Trigger custom event for parent components
                window.dispatchEvent(new CustomEvent('worker-data-updated', {
                    detail: {
                        action: 'save',
                        employeeId: employeeKey,
                        department: department,
                        oldDepartment: oldDepartment
                    }
                }));

                // Also dispatch a general refresh event
                window.dispatchEvent(new Event('refresh-worker-list'));
            }

            // Update localStorage as a backup signal
            localStorage.setItem('lastWorkerUpdate', Date.now().toString());

        } catch (error) {
            console.error("Error saving employee:", error);
            setIsSaving(false);
            openAlert("Save Error", "Failed to save: " + error.message, "danger");
        }
    };

    // WorkerModal.js - FIXED handleDepartmentSave function
    const handleDepartmentSave = async (departmentData) => {
        try {
            setIsSaving(true);

            const savePath = departmentData.departmentSavePath;
            const newDepartment = departmentData.department;
            const oldDepartment = departmentData.oldDepartment;

            const { departmentSavePath, oldDepartment: oldDept, ...dataToSave } = departmentData;

            // Use employee ID as key (consistent ID, no regeneration)
            const employeeKey = formData.idNo || dataToSave.idNo;

            if (!employeeKey) {
                openAlert("Error", "Employee ID is missing. Cannot save.", "danger");
                setIsSaving(false);
                return false;
            }

            // Check if department actually changed
            const isDepartmentChanged = oldDepartment && newDepartment && oldDepartment !== newDepartment;

            // 🔥 CRITICAL FIX: Remove from ALL departments before saving to new one
            if (isDepartmentChanged) {
                const allDepartments = [
                    "Home Care", "Housekeeping", "Office & Administrative", "Customer Service",
                    "Management & Supervision", "Security", "Driving & Logistics", "Technical & Maintenance",
                    "Retail & Sales", "Industrial & Labor", "Others"
                ];

                // Remove from ALL possible old locations
                for (const dept of allDepartments) {
                    // Skip the new department (we'll add there)
                    if (dept === newDepartment) continue;

                    const path = getDepartmentSavePath(dept);
                    if (!path) continue;

                    try {
                        const snapshot = await firebaseDB.child(`${path}/${employeeKey}`).once("value");
                        if (snapshot.exists()) {
                            await firebaseDB.child(`${path}/${employeeKey}`).remove();
                            console.log(`✓ Removed from ${dept} department: ${employeeKey}`);
                        }
                    } catch (error) {
                        console.warn(`Error checking/removing from ${dept}:`, error);
                    }
                }
            }

            // Save to new department location
            const saveData = {
                ...dataToSave,
                key: employeeKey,
                idNo: employeeKey, // Keep ID consistent
                department: newDepartment,
                lastUpdated: new Date().toISOString(),
                updatedBy: effectiveUserId || "system"
            };

            // Save to new department
            await firebaseDB.child(`${savePath}/${employeeKey}`).set(saveData);

            console.log(`✓ Saved to new department (${newDepartment}): ${employeeKey}`);

            // Update the parent formData immediately
            setFormData(prev => ({
                ...prev,
                ...saveData,
                department: newDepartment,
                departmentChangeReason: dataToSave.departmentChangeReason || ""
            }));

            // Force update hasUnsavedChanges to false
            setHasUnsavedChanges(false);

            openAlert("Success", `Employee data saved to ${newDepartment} department!`, "success");
            setIsSaving(false);

            // 🔥 IMPORTANT: Trigger a global refresh to update UI
            if (window.dispatchEvent) {
                window.dispatchEvent(new Event('worker-data-updated'));
            }

            return true;

        } catch (error) {
            console.error("Error saving department data:", error);
            setIsSaving(false);
            openAlert("Error", "Failed to save department data. Please try again.", "danger");
            return false;
        }
    };

    const handleCloseWithConfirmation = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (hasUnsavedChanges) {
            openConfirm(
                "Unsaved Changes",
                "You have unsaved changes. Are you sure you want to close?",
                () => {
                    closeConfirm();
                    setHasUnsavedChanges(false);
                    onClose && onClose();
                }
            );
        } else {
            onClose && onClose();
        }
    };

    const modalClass = isEditMode ? "editEmployee" : "viewEmployee";

    if (!isOpen) return null;

    return (
        <>
            <AlertModal
                open={alertState.open}
                title={alertState.title}
                variant={alertState.variant}
                onClose={closeAlert}
            >
                {alertState.body}
            </AlertModal>

            <ConfirmModal
                open={confirmState.open}
                title={confirmState.title}
                message={confirmState.message}
                onCancel={closeConfirm}
                onConfirm={confirmState.onConfirm}
            />

            <div
                className={`modal fade show workerBiodata ${modalClass}`}
                style={{
                    display: "block",
                    backgroundColor: "rgba(0, 0, 0, 0.9)",
                    overflow: "auto", // Add this for modal container scrolling
                    position: "fixed", // Ensure it stays fixed
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 1050
                }}
            >
                <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable"
                    style={{
                        maxHeight: "90vh", // Limit modal height
                        marginTop: "5vh", // Add top margin
                        marginBottom: "5vh" // Add bottom margin
                    }}
                >
                    {/* 🔥 CRITICAL FIX: Wrap with form that prevents submission */}
                    <form onSubmit={preventFormSubmit}>
                        <div className="modal-content" style={{ maxHeight: "90vh" }}>
                            <div className="modal-header bg-secondary text-white sticky-top"
                                style={{ zIndex: 1 }}> {/* Make header sticky */}
                                <h3 className="modal-title">
                                    {isEditMode ? "Edit Employee - " : ""}
                                    {formData.idNo || formData.employeeId || "N/A"} - {formData.firstName || ""} {formData.lastName || ""}
                                </h3>
                                <button type="button" className="btn-close btn-close-white" onClick={handleCloseWithConfirmation}></button>
                            </div>

                            <div className="modal-body" style={{
                                overflowY: "auto",
                                maxHeight: "calc(90vh - 120px)" // Adjust based on header/footer height
                            }}>
                                {/* Tabs - Make tabs sticky too */}
                                <div className="sticky-top bg-white" style={{ top: "-16px", zIndex: 1 }}>
                                    <ul className="nav nav-tabs" id="employeeTabs" role="tablist">
                                        {[
                                            ["department", "Department"],
                                            ["basic", "Basic Info"],
                                            ["address", "Address"],
                                            ["personal", "Personal Info"],
                                            ["qualification", "Skills"],
                                            ["health", "Health Info"],
                                            ["emergency", "Emg Contacts"],
                                            ["bank", "Bank Details"],
                                            ["payment", "Payment"],
                                            ["working", "Working"],
                                            ["pay-info", "Pay Info"],
                                            ["timesheet", "Timesheet"],
                                            ["biodata", "Biodata"],
                                            ["SlotBook", "SlotBook"],
                                        ].map(([key, label]) => (
                                            <li className="nav-item" role="presentation" key={key}>
                                                <button
                                                    type="button"
                                                    className={`nav-link ${activeTab === key ? "active" : ""}`}
                                                    onClick={() => setActiveTab(key)}
                                                >
                                                    {label}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="tab-content p-3">
                                    {/* Tab content components remain the same */}
                                    {activeTab === "department" && (
                                        <Department
                                            formData={formData}
                                            errors={errors}
                                            handleChange={handleInputChange}
                                            handleBlur={handleInputBlur}
                                            nextStep={() => setActiveTab("basic")}
                                            setErrors={setErrors}
                                            canEdit={canEdit}
                                            onSaveComplete={handleDepartmentSave}
                                            isSaving={isSaving}
                                        />
                                    )}
                                    {activeTab === "basic" && (
                                        <BasicInfo
                                            formData={formData}
                                            setFormData={setFormData}
                                            status={status}
                                            setStatus={setStatus}
                                            canEdit={canEdit}
                                            isEditMode={isEditMode}
                                            DOB_MIN={DOB_MIN}
                                            DOB_MAX={DOB_MAX}
                                            effectiveUserName={effectiveUserName}
                                            handleInputChange={handleInputChange}
                                            setHasUnsavedChanges={setHasUnsavedChanges}
                                        />
                                    )}

                                    {activeTab === "address" && (
                                        <Address
                                            formData={formData}
                                            canEdit={canEdit}
                                            handleInputChange={handleInputChange}
                                        />
                                    )}

                                    {activeTab === "personal" && (
                                        <PersonalInfo
                                            formData={formData}
                                            canEdit={canEdit}
                                            handleInputChange={handleInputChange}
                                            DOM_MIN={DOM_MIN}
                                            DOM_MAX={DOM_MAX}
                                        />
                                    )}

                                    {activeTab === "qualification" && (
                                        <QualificationSkills
                                            formData={formData}
                                            setFormData={setFormData}
                                            canEdit={canEdit}
                                            isEditMode={isEditMode}
                                            LANGUAGE_OPTIONS={LANGUAGE_OPTIONS}
                                            handleInputChange={handleInputChange}
                                            setHasUnsavedChanges={setHasUnsavedChanges}
                                        />
                                    )}

                                    {activeTab === "health" && (
                                        <HealthInfo
                                            formData={formData}
                                            setFormData={setFormData}
                                            canEdit={canEdit}
                                            handleInputChange={handleInputChange}
                                        />
                                    )}

                                    {activeTab === "emergency" && (
                                        <EmergencyContacts
                                            formData={formData}
                                            setFormData={setFormData}
                                            canEdit={canEdit}
                                            handleInputChange={handleInputChange}
                                        />
                                    )}

                                    {activeTab === "bank" && (
                                        <BankDetails
                                            formData={formData}
                                            canEdit={canEdit}
                                            handleInputChange={handleInputChange}
                                        />
                                    )}

                                    {activeTab === "SlotBook" && (
                                        <div className="SlotBook">
                                            <SlotBook
                                                // Pass the current employee as a single worker
                                                workers={formData.idNo ? [{
                                                    id: formData.idNo || "unknown",
                                                    key: formData.idNo,
                                                    name: `${formData.firstName || ""} ${formData.lastName || ""}`,
                                                    idNo: formData.idNo,
                                                    employeeId: formData.idNo,
                                                    department: formData.department || "Others",
                                                    schedule: formData.schedule || {}
                                                }] : []}
                                                onAllocationUpdate={async (allocation) => {
                                                    try {
                                                        // Update formData with the new allocation
                                                        const dateKey = allocation.date;
                                                        const slotHour = allocation.slotHour;

                                                        const updatedFormData = {
                                                            ...formData,
                                                            schedule: {
                                                                ...formData.schedule,
                                                                [dateKey]: {
                                                                    ...formData.schedule?.[dateKey],
                                                                    [slotHour]: allocation
                                                                }
                                                            },
                                                            lastUpdated: new Date().toISOString()
                                                        };

                                                        setFormData(updatedFormData);
                                                        setHasUnsavedChanges(true);

                                                        // Optional: Auto-save to Firebase
                                                        // await handleSaveClick();

                                                    } catch (error) {
                                                        console.error("Error updating allocation:", error);
                                                    }
                                                }}
                                            />
                                        </div>
                                    )}

                                    {activeTab === "payment" && (
                                        <Payment
                                            formData={formData}
                                            setFormData={setFormData}
                                            canEdit={canEdit}
                                            PAY_MIN={PAY_MIN}
                                            PAY_MAX={PAY_MAX}
                                            effectiveUserName={effectiveUserName}
                                            formatDDMMYY={formatDDMMYY}
                                            formatTime12h={formatTime12h}
                                            setHasUnsavedChanges={setHasUnsavedChanges}
                                        />
                                    )}

                                    {activeTab === "working" && (
                                        <Working
                                            formData={formData}
                                            setFormData={setFormData}
                                            canEdit={canEdit}
                                            effectiveUserName={effectiveUserName}
                                            formatDDMMYY={formatDDMMYY}
                                            formatTime12h={formatTime12h}
                                            setHasUnsavedChanges={setHasUnsavedChanges}
                                        />
                                    )}

                                    {activeTab === "pay-info" && (
                                        <PayInfo
                                            formData={formData}
                                        />
                                    )}

                                    {activeTab === "timesheet" && (
                                        <Timesheet
                                            employee={formData}
                                        />
                                    )}

                                    {activeTab === "biodata" && (
                                        <Biodata
                                            formData={formData}
                                            iframeRef={iframeRef}
                                            headerImage={headerImage}
                                            canEdit={canEdit}
                                        />
                                    )}
                                </div>

                                {/* Footer buttons */}
                                <div className="modal-footer sticky-bottom bg-white border-top p-3"
                                    style={{ zIndex: 1, bottom: "-15px" }}>
                                    <div className="d-flex gap-2 justify-content-end hideInView">
                                        <button type="button" className="btn btn-secondary" onClick={handleCloseWithConfirmation}>
                                            Close
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={handleSaveClick}
                                            disabled={isSaving}
                                        >
                                            {isSaving ? "Saving..." : (isEditMode ? "Save Changes" : "Save")}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

export default WorkerModal;