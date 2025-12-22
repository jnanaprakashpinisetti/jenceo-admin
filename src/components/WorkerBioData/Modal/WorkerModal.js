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

    // Modal handlers
    const openAlert = (title, body, variant = "info") => setAlertState({ open: true, title, body, variant });
    const closeAlert = () => setAlertState((s) => ({ ...s, open: false }));
    const openConfirm = (title, message, onConfirm) => setConfirmState({ open: true, title, message, onConfirm });
    const closeConfirm = () => setConfirmState((s) => ({ ...s, open: false }));

    useEffect(() => {
        if (employee) {
            // Extract the Firebase key - it might be passed as .key, .id, or might be the object's key itself
            const key = employee.key || employee.id || employee.recordId || (employee.idNo ? employee.idNo : null);

            setFormData({
                ...employee,
                key: key, // Ensure key is always set
                secondarySkills: Array.isArray(employee.secondarySkills) ? employee.secondarySkills : [],
                workingSkills: Array.isArray(employee.workingSkills) ? employee.workingSkills : [],
                healthIssues: Array.isArray(employee.healthIssues) ? employee.healthIssues : [],
                otherIssues: employee.otherIssues ?? "",
                allowance: employee.allowance ?? "",
                pageNo: employee.pageNo ?? "",
                basicSalary: employee.basicSalary ?? "",
                payments: Array.isArray(employee.payments) ? employee.payments : [],
                workDetails: Array.isArray(employee.workDetails) ? employee.workDetails : [],
                employeePhotoUrl: employee.employeePhoto || employee.employeePhotoUrl || null,
                idProofUrl: employee.idProof || employee.idProofUrl || null,
            });
            setStatus(employee.status || "On Duty");
        } else {
            setFormData({
                secondarySkills: [],
                workingSkills: [],
                healthIssues: [],
                otherIssues: "",
                payments: [],
                workDetails: [],
            });
            setStatus("On Duty");
        }
    }, [employee]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setHasUnsavedChanges(true);
    };

    // Fixed handleSaveClick with proper state management
    const handleSaveClick = async () => {
        try {
            setIsSaving(true);

            // Validate we have a key before proceeding
            if (!formData.key && !formData.idNo) {
                throw new Error("Employee key or ID number is missing. Cannot save.");
            }

            // Upload employee photo if exists
            let photoURL = formData.employeePhotoUrl; // Keep existing URL if no new file
            if (formData.employeePhotoFile instanceof File) {
                const photoExt = formData.employeePhotoFile.name.split('.').pop();
                const photoFileName = `employee-photos/${formData.idNo || 'unknown'}-${Date.now()}.${photoExt}`;
                const photoFileRef = storageRef.child(photoFileName);
                const photoSnapshot = await uploadFile(photoFileRef, formData.employeePhotoFile);
                photoURL = await getDownloadURL(photoSnapshot.ref);
            }

            // Upload ID proof if exists
            let idProofURL = formData.idProofUrl; // Keep existing URL if no new file
            if (formData.idProofFile instanceof File) {
                const idExt = formData.idProofFile.name.split('.').pop();
                const idFileName = `id-proofs/${formData.idNo || 'unknown'}-${Date.now()}.${idExt}`;
                const idFileRef = storageRef.child(idFileName);
                const idSnapshot = await uploadFile(idFileRef, formData.idProofFile);
                idProofURL = await getDownloadURL(idSnapshot.ref);
            }

            // Prepare data for saving (remove File objects, add URLs)
            const dataToSave = {
                ...formData,
                employeePhoto: photoURL,
                employeePhotoUrl: photoURL,
                idProof: idProofURL,
                status: status, // Ensure status is saved
                // Remove file objects as they can't be stored in Firestore
                employeePhotoFile: undefined,
                idProofFile: undefined,
                // Preserve the preview fields
                employeePhotoPreview: undefined,
                idProofPreview: undefined,
                // Add timestamp if needed
                lastUpdatedAt: new Date().toISOString(),
                lastUpdatedBy: effectiveUserName
            };

            // Remove undefined values and the key (which shouldn't be in the data itself)
            const cleanDataToSave = { ...dataToSave };
            delete cleanDataToSave.key; // Remove the key from the data payload
            Object.keys(cleanDataToSave).forEach(key => {
                if (cleanDataToSave[key] === undefined) {
                    delete cleanDataToSave[key];
                }
            });

            // Determine the path to save to - use idNo as fallback if key doesn't exist
            const savePath = formData.key || formData.idNo;

            if (!savePath) {
                throw new Error("Cannot save: No key or ID number available");
            }

            // Save to Firebase
            await firebaseDB.child("EmployeeBioData").child(savePath).update(cleanDataToSave);

            setIsSaving(false);
            setHasUnsavedChanges(false);

            if (onSave) {
                onSave({ ...cleanDataToSave, key: savePath }); // Notify parent component with the key
            }

            onClose();

        } catch (error) {
            console.error("Error saving employee:", error);
            setIsSaving(false);
            alert("Failed to save: " + error.message);
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
                                        setFormData={setFormData}
                                        canEdit={canEdit}
                                        handleInputChange={handleInputChange}
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