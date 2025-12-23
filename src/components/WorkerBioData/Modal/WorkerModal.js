import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../../context/AuthContext";
import BaseModal, { AlertModal, ConfirmModal } from "./Common/BaseModal";
import MultiSelectDropdown from "./Common/MultiSelectDropdown";
import SkillAccordion from "./Common/SkillAccordion";
import Chip from "./Common/Chip";
// Add these imports at the top of WorkerModal.js
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

    

    // Modal handlers
    const openAlert = (title, body, variant = "info") => setAlertState({ open: true, title, body, variant });
    const closeAlert = () => setAlertState((s) => ({ ...s, open: false }));
    const openConfirm = (title, message, onConfirm) => setConfirmState({ open: true, title, message, onConfirm });
    const closeConfirm = () => setConfirmState((s) => ({ ...s, open: false }));
    const employeeKey = formData.idNo; // 🔥 SINGLE SOURCE OF TRUTH


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


// Fixed handleSaveClick with proper state management and department-based paths
const handleSaveClick = async () => {
    try {
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

        if (!savePath || savePath === "EmployeeBioData") {
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
            lastUpdatedBy: effectiveUserName
        };

        // Clean data
        const cleanDataToSave = { ...dataToSave };
        delete cleanDataToSave.key;
        Object.keys(cleanDataToSave).forEach(key => {
            if (cleanDataToSave[key] === undefined) {
                delete cleanDataToSave[key];
            }
        });

        // Determine the key to use
        const employeeKey = formData.key || formData.idNo;

        if (!employeeKey) {
            throw new Error("Cannot save: No key or ID number available");
        }

        // Save to department-specific path ONLY - REMOVED EmployeeBioData save
        await firebaseDB.child(savePath).child(employeeKey).set(cleanDataToSave);

        setIsSaving(false);
        setHasUnsavedChanges(false);

        if (onSave) {
            onSave({ ...cleanDataToSave, key: employeeKey });
        }

        openAlert("Success", "Employee data saved successfully to " + department, "success");

    } catch (error) {
        console.error("Error saving employee:", error);
        setIsSaving(false);
        openAlert("Save Error", "Failed to save: " + error.message, "danger");
    }
};

// Also update the handleDepartmentSave function to NOT save to EmployeeBioData
// In WorkerModal.js, update the handleDepartmentSave function:

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
        
        // If department changed, remove from old department
        if (isDepartmentChanged) {
            const oldPath = getDepartmentSavePath(oldDepartment);
            
            if (oldPath && oldPath !== savePath) {
                try {
                    // Find the record in old department by employee ID
                    const oldSnapshot = await firebaseDB.child(oldPath).once("value");
                    const oldData = oldSnapshot.val();
                    
                    if (oldData) {
                        let oldRecordKey = null;
                        
                        // Find the key by employee ID
                        Object.keys(oldData).forEach(key => {
                            const record = oldData[key];
                            if (record.idNo === employeeKey || record.key === employeeKey) {
                                oldRecordKey = key;
                            }
                        });
                        
                        // Remove the record from old department
                        if (oldRecordKey) {
                            await firebaseDB.child(`${oldPath}/${oldRecordKey}`).remove();
                            console.log(`Removed from old department (${oldDepartment}): ${employeeKey}`);
                        }
                    }
                } catch (error) {
                    console.warn("Error removing from old department:", error);
                    // Continue anyway, don't fail the save
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
        
        await firebaseDB.child(`${savePath}/${employeeKey}`).set(saveData);
        
        console.log(`Saved to new department (${newDepartment}): ${employeeKey}`);
        
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
        
        // DO NOT close the modal, just return success
        return true;
        
    } catch (error) {
        console.error("Error saving department data:", error);
        setIsSaving(false);
        openAlert("Error", "Failed to save department data. Please try again.", "danger");
        return false;
    }
};

    const handleCloseWithConfirmation = () => {
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

            <div className={`modal fade show workerBiodata ${modalClass}`} style={{ display: "block", backgroundColor: "rgba(0, 0, 0, 0.9)" }}>
                <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                    <div className="modal-content">
                        <div className="modal-header bg-secondary text-white">
                            <h3 className="modal-title">
                                {isEditMode ? "Edit Employee - " : ""}
                                {formData.idNo || formData.employeeId || "N/A"} - {formData.firstName || ""} {formData.lastName || ""}
                            </h3>
                            <button type="button" className="btn-close btn-close-white" onClick={handleCloseWithConfirmation}></button>
                        </div>

                        <div className="modal-body">
                            {/* Tabs */}
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
                                ].map(([key, label]) => (
                                    <li className="nav-item" role="presentation" key={key}>
                                        <button className={`nav-link ${activeTab === key ? "active" : ""}`} onClick={() => setActiveTab(key)}>
                                            {label}
                                        </button>
                                    </li>
                                ))}
                            </ul>

                            <div className="tab-content p-3">
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
            </div>
        </>
    );
};

export default WorkerModal;