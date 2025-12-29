import React, { useEffect, useState, useRef } from "react";
import firebaseDB from "../../../firebase";
import { useAuth } from "../../../context/AuthContext";
import { firebaseStorage } from "../../../firebase";
// Import tab components
import BasicInfoTab from "./tabs/BasicDetailsTab";
import RegistrationComplianceTab from "./tabs/RegistrationComplianceTab";
import AddressTab from "./tabs/AddressTab";
import ContactTab from "./tabs/ContactTab";
import FinanceTab from "./tabs/FinanceTab";
import BankDetailsTab from "./tabs/BankDetailsTab";
import DocumentsTab from "./tabs/DocumentsTab";
import RatingApprovalTab from "./tabs/RatingApprovalTab";
import AuditLogsTab from "./tabs/AuditLogsTab";
import WorkerTab from "./tabs/WorkerTab";
import CompanyInvoice from "./tabs/CompanyInvoice";
import PaymentTab from "./tabs/PaymentTab";

// Import utility functions
import {
  safeNumber,
  formatINR,
  formatDateForInput,
  parseDateSafe,
  daysBetween,
  lockRows,
  stripLocks,
  resolveUserName,
  formatDDMMYY,
  formatTime12h,
  diffDays,
  friendlyLabel,
  buildChangeSummaryAndFullAudit,
  emptyPayment,
  getInitialFormData,
  resolveAddedByFromUsers
} from "./utils";

const removalReasonOptions = [
  "Contract Expired",
  "Contract Terminated",
  "Company Closed",
  "Merged with Another",
  "Poor Performance",
  "Other",
];

// Get initial form data for company
const getInitialCompanyFormData = () => ({
  // Basic Details
  companyId: "",
  companyName: "",
  companyType: "",
  businessCategory: "",
  branchType: "",
  branchName: "",
  yearOfEstablishment: "",
  ownershipType: "",
  websiteUrl: "",
  officialEmail: "",
  officialPhone: "",
  
  // Registration & Compliance
  registrationNo: "",
  cinNo: "",
  tanNo: "",
  gstinNo: "",
  labourLicenseNo: "",
  googleLocation: "",
  
  // Registered Address
  registeredDNo: "",
  registeredBuilding: "",
  registeredStreet: "",
  registeredLandmark: "",
  registeredVillage: "",
  registeredMandal: "",
  registeredDistrict: "",
  registeredState: "",
  registeredCountry: "India",
  registeredPincode: "",
  
  // Branch Address
  sameAsRegistered: false,
  branchDNo: "",
  branchBuilding: "",
  branchStreet: "",
  branchLandmark: "",
  branchVillage: "",
  branchMandal: "",
  branchDistrict: "",
  branchState: "",
  branchCountry: "India",
  branchPincode: "",
  
  // Primary Contact
  primaryContactName: "",
  primaryDesignation: "",
  primaryDepartment: "",
  primaryMobile: "",
  primaryAlternateMobile: "",
  primaryEmail: "",
  primaryPreferredMethod: "",
  
  // Secondary Contact
  secondaryContactName: "",
  secondaryDesignation: "",
  secondaryDepartment: "",
  secondaryMobile: "",
  secondaryAlternateMobile: "",
  secondaryEmail: "",
  secondaryPreferredMethod: "",
  
  // Finance Contact
  financeContactName: "",
  financeDesignation: "",
  financeMobile: "",
  financeEmail: "",
  billingAddressSame: true,
  
  // Manpower & Operations
  manpowerTypes: [],
  shiftCoverage: "",
  deploymentAreas: [],
  contractStartDate: "",
  contractEndDate: "",
  billingCycle: "",
  paymentTerms: "",
  gstApplicable: "",
  tdsApplicable: "",
  
  // Bank Details
  bankName: "",
  branchName: "",
  accountHolderName: "",
  accountNumber: "",
  ifscCode: "",
  upiId: "",
  cancelledChequeUrl: "",
  
  // Legal Documents
  companyLogoUrl: "",
  incorporationCertUrl: "",
  panCardUrl: "",
  gstCertUrl: "",
  labourLicenseUrl: "",
  pfRegUrl: "",
  esiRegUrl: "",
  agreementUrl: "",
  bondUrl: "",
  insuranceUrl: "",
  
  // System & Control
  rating: 0,
  approvalStatus: "Pending",
  approvedBy: "",
  approvalDate: "",
  createdById: "",
  createdByName: "",
  createdAt: "",
  updatedById: "",
  updatedByName: "",
  updatedAt: "",
  
  // Payment data
  payments: [],
  
  // Audit logs
  fullAuditLogs: [],
});

const CompanyModal = ({
  isOpen = false,
  onClose = () => {},
  company = null,
  onSave = null,
  onDelete = null,
  isEditMode = false,
  isAdmin = false,
  currentUserName = "System",
  onRemoved = () => {},
  onSaveBankDetails = null,
}) => {
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorList, setErrorList] = useState([]);
  const [formData, setFormData] = useState(() => getInitialCompanyFormData());
  const [activeTab, setActiveTab] = useState("basic");
  const [errors, setErrors] = useState({});
  const [editMode, setEditMode] = useState(Boolean(isEditMode));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showFullAudit, setShowFullAudit] = useState(false);
  const initialSnapshotRef = useRef(null);
  const [usersMap, setUsersMap] = useState({});
  const [expandedLogIndex, setExpandedLogIndex] = useState(null);
  const [showRemovalConfirm, setShowRemovalConfirm] = useState(false);
  const [showRemovalModal, setShowRemovalModal] = useState(false);
  const [removalForm, setRemovalForm] = useState({ reason: "", comment: "" });
  const [removalErrors, setRemovalErrors] = useState({});
  const [bulkReminderDate, setBulkReminderDate] = useState("");

  // Save success state
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  const { user: authUser } = useAuth?.() || {};

  useEffect(() => {
    const ref = firebaseDB.child("Users");
    const handler = ref.on("value", (snap) => setUsersMap(snap.val() || {}));
    return () => ref.off("value", handler);
  }, []);

  useEffect(() => {
    if (!company) {
      setFormData(getInitialCompanyFormData());
      initialSnapshotRef.current = null;
      setIsDirty(false);
      return;
    }

    const fullLogs = company.fullAuditLogs ? 
      (Array.isArray(company.fullAuditLogs) ? company.fullAuditLogs : Object.values(company.fullAuditLogs)) : [];

    const snapshot = {
      ...company,
      fullAuditLogs: fullLogs || [],
      // Ensure payments array exists
      payments: company.payments || [],
    };

    setFormData(snapshot);
    setErrors({});
    initialSnapshotRef.current = JSON.stringify(snapshot);
    setIsDirty(false);
  }, [company, usersMap]);

  const effectiveUserName = 
    company?.createdByName ||
    formData?.createdByName ||
    usersMap?.[authUser?.uid]?.name ||
    (authUser?.displayName?.trim()) ||
    (authUser?.email ? authUser.email.split("@")[0] : "") ||
    (currentUserName?.trim()) ||
    "System";

  const markDirty = (next) => {
    try {
      const s = JSON.stringify(next);
      setIsDirty(initialSnapshotRef.current ? s !== initialSnapshotRef.current : true);
    } catch {
      setIsDirty(true);
    }
  };

  const toggleEditMode = () => {
    if (!isAdmin) return;
    setEditMode((v) => !v);
  };

  const setField = (name, value) => {
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      markDirty(next);
      return next;
    });
  };

  const handleChange = (e, section = null, index = null) => {
    const target = e && e.target ? e.target : e;
    const name = target.name;
    let value = target.type === "checkbox" ? target.checked : target.value;

    if (name === "sameAsRegistered" && value) {
      // Copy registered address to branch address
      setFormData((prev) => {
        const next = {
          ...prev,
          sameAsRegistered: true,
          branchDNo: prev.registeredDNo || "",
          branchBuilding: prev.registeredBuilding || "",
          branchStreet: prev.registeredStreet || "",
          branchLandmark: prev.registeredLandmark || "",
          branchVillage: prev.registeredVillage || "",
          branchMandal: prev.registeredMandal || "",
          branchDistrict: prev.registeredDistrict || "",
          branchState: prev.registeredState || "",
          branchCountry: prev.registeredCountry || "",
          branchPincode: prev.registeredPincode || "",
        };
        markDirty(next);
        return next;
      });
      return;
    }

    if (name === "billingAddressSame" && !value) {
      // Clear finance contact address fields
      setFormData((prev) => {
        const next = { ...prev, billingAddressSame: false };
        markDirty(next);
        return next;
      });
      return;
    }

    if ((name === "manpowerTypes" || name === "deploymentAreas") && target.type === "checkbox") {
      setFormData((prev) => {
        const arr = prev[name] || [];
        const next = { 
          ...prev, 
          [name]: target.checked ? [...arr, value] : arr.filter((x) => x !== value) 
        };
        markDirty(next);
        return next;
      });
      return;
    }

    setField(name, value);
  };

  const handleCloseAttempt = () => {
    if (isDirty) setShowUnsavedConfirm(true);
    else onClose && onClose();
  };

  const validateAll = () => {
    const v = {};
    
    if (editMode) {
      if (!formData.companyName || String(formData.companyName).trim() === "") 
        v.companyName = "Company name is required";
      if (!formData.companyType || String(formData.companyType).trim() === "") 
        v.companyType = "Company type is required";
      if (!formData.officialEmail || String(formData.officialEmail).trim() === "") 
        v.officialEmail = "Official email is required";
      if (formData.primaryMobile && !/^\d{10}$/.test(formData.primaryMobile))
        v.primaryMobile = "Mobile number must be 10 digits";
    }

    setErrors(v);
    return Object.keys(v).length === 0;
  };

  const focusFirstError = () => {
    const keys = Object.keys(errors);
    if (!keys.length) return;
    const k = keys[0];
    const parts = k.split(".");
    const last = parts[parts.length - 1];
    let el = null;
    if (parts.length > 1) {
      const idx = parts[1];
      el = document.querySelector(`[name="${last}"][data-idx="${idx}"]`);
    }
    if (!el) el = document.querySelector(`[name="${last}"]`);
    if (el) {
      try { el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch { }
      try { el.focus(); } catch { }
    }
  };

  // Add this function in CompanyModal component
  const handleFileUpload = async (fieldName, file) => {
    try {
      console.log(`Uploading ${file.name} for ${fieldName}`, file);
      
      // Validation based on file type
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "application/pdf"];
      const isImage = file.type.startsWith('image/');
      
      if (!allowedTypes.includes(file.type)) {
        throw new Error(`File type not allowed. Allowed: ${allowedTypes.join(', ')}`);
      }
      
      // Set file size limits
      let maxSize = 5 * 1024 * 1024; // 5MB default
      if (fieldName === "companyLogoUrl") {
        maxSize = 100 * 1024; // 100KB for logo
      } else if (fieldName === "cancelledChequeUrl") {
        maxSize = 2 * 1024 * 1024; // 2MB for cheque
      }
      
      if (file.size > maxSize) {
        const sizeMB = (maxSize / (1024 * 1024)).toFixed(1);
        throw new Error(`File must be less than ${sizeMB}MB`);
      }
      
      // Get company ID for folder structure
      const companyId = formData.companyId || 'unknown';
      
      // Create file name and path
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${fieldName.replace('Url', '')}-${timestamp}.${fileExt}`;
      const filePath = `companies/${companyId}/${fileName}`;
      
      // Option 1: If you have a direct storage reference
      const storageRef = firebaseStorage.ref(filePath);
      const snapshot = await storageRef.put(file);
      const downloadURL = await snapshot.ref.getDownloadURL();
      
      // Option 2: If you have an uploadFile utility function (check your firebase.js exports)
      // const downloadURL = await uploadFile(filePath, file);
      
      console.log(`File uploaded successfully: ${downloadURL}`);
      return downloadURL;
      
    } catch (error) {
      console.error("File upload error:", error);
      throw error;
    }
  };

  const handleSubmit = async (ev) => {
    ev && ev.preventDefault && ev.preventDefault();

    if (!validateAll()) {
      setTimeout(() => focusFirstError(), 150);
      return;
    }

    try {
      const prevSnapshot = initialSnapshotRef.current ? JSON.parse(initialSnapshotRef.current) : {};
      const currentSnapshot = formData;
      const { summaryChanges, fullChanges } = buildChangeSummaryAndFullAudit(prevSnapshot, currentSnapshot);
      const now = new Date();
      const dateLabel = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
      
      const fullEntry = fullChanges.length > 0 ? {
        date: now.toISOString(),
        dateLabel,
        user: currentUserName || "System",
        changes: fullChanges,
        type: "full",
      } : null;

      const payload = { ...currentSnapshot };

      // Update audit trail
      payload.updatedById = authUser?.uid || "system";
      payload.updatedByName = effectiveUserName;
      payload.updatedAt = now.toISOString();

      payload.fullAuditLogs = Array.isArray(payload.fullAuditLogs) ? payload.fullAuditLogs : [];
      if (fullEntry) {
        payload.fullAuditLogs = [...payload.fullAuditLogs, fullEntry];
      }

      // Call the onSave prop
      if (onSave) {
        await onSave(payload);
      }

      // Update local state
      initialSnapshotRef.current = JSON.stringify(payload);
      setIsDirty(false);

      // Show success modal
      setShowSaveSuccess(true);
      setTimeout(() => {
        setShowSaveSuccess(false);
      }, 2000);

    } catch (err) {
      console.error("Save failed", err);
      setErrorList([{ path: "save", message: "Save failed. Please try again." }]);
      setShowErrorModal(true);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal fade show companyModal" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.9)" }}>
        <div className="modal-dialog modal-xl modal-dialog-centered display-company-modal" onClick={() => handleCloseAttempt()}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header bg-dark text-white justify-content-between">
              <div>
                <h5 className="modal-title">
                  {editMode ? <strong>Edit Company</strong> : <strong>View Company</strong>} — {formData.companyId} — {formData.companyName}
                </h5>
                <div className="small text-warning">
                  {formData.companyType} • {formData.registeredDistrict}, {formData.registeredState}
                </div>
              </div>

              <div className="d-flex align-items-center gap-2">
                {isAdmin && (
                  <button type="button" className={`btn btn-${editMode ? "warning" : "primary"} btn-sm`} onClick={toggleEditMode}>
                    {editMode ? "Disable Edit" : "Edit"}
                  </button>
                )}
                {isAdmin && <button type="button" className="btn btn-danger btn-sm" onClick={() => setShowDeleteConfirm(true)}>Delete</button>}
                <button type="button" className="btn-close btn-close-white" onClick={() => handleCloseAttempt()} />
              </div>
            </div>

            <div className="modal-body">
              <ul className="nav nav-tabs" role="tablist">
                {[
                  ["basic", "Basic Info"],
                  ["registration", "Registration"],
                  ["address", "Address"],
                  ["contacts", "Contacts"],
                  ["finance", "Finance"],
                  ["bank", "Bank Details"],
                  ["documents", "Documents"],
                  ["rating", "Rating & Approval"],
                  ["audit", "Audit Logs"],
                  ["worker", "Worker Info"],
                  ["invoice", "Invoice"],
                  ["payment", "Payment Info"],
                ].map(([key, label]) => (
                  <li key={key} className="nav-item" role="presentation">
                    <button className={`nav-link ${activeTab === key ? "active" : ""}`} onClick={() => setActiveTab(key)}>
                      <strong>{label}</strong>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="tab-content p-3">
                {activeTab === "basic" && (
                  <BasicInfoTab
                    formData={formData}
                    editMode={editMode}
                    errors={errors}
                    handleChange={handleChange}
                    setField={setField}
                  />
                )}

                {activeTab === "registration" && (
                  <RegistrationComplianceTab
                    formData={formData}
                    editMode={editMode}
                    errors={errors}
                    handleChange={handleChange}
                  />
                )}

                {activeTab === "address" && (
                  <AddressTab
                    formData={formData}
                    editMode={editMode}
                    handleChange={handleChange}
                  />
                )}

                {activeTab === "contacts" && (
                  <ContactTab
                    formData={formData}
                    editMode={editMode}
                    errors={errors}
                    handleChange={handleChange}
                  />
                )}

                {activeTab === "finance" && (
                  <FinanceTab
                    formData={formData}
                    editMode={editMode}
                    handleChange={handleChange}
                  />
                )}

                {activeTab === "bank" && (
                  <BankDetailsTab
                    formData={formData}
                    editMode={editMode}
                    handleChange={handleChange}
                  />
                )}

                {activeTab === "documents" && (
                  <DocumentsTab
                    formData={formData}
                    editMode={editMode}
                    handleChange={handleChange}
                    handleFileUpload={handleFileUpload}
                  />
                )}

                {activeTab === "rating" && (
                  <RatingApprovalTab
                    formData={formData}
                    editMode={editMode}
                    handleChange={handleChange}
                    formatDateForInput={formatDateForInput}
                  />
                )}
                {activeTab === "worker" && (
                  <WorkerTab
                  companyData={formData}
                  />
                )}
                {activeTab === "payment" && (
                  <PaymentTab
                    formData={formData}
                    editMode={editMode}
                    setFormData={setFormData}
                    markDirty={markDirty}
                    usersMap={usersMap}
                    effectiveUserName={effectiveUserName}
                    formatDDMMYY={formatDDMMYY}
                    formatTime12h={formatTime12h}
                    formatINR={formatINR}
                    bulkReminderDate={bulkReminderDate}
                    setBulkReminderDate={setBulkReminderDate}
                  />
                )}

                {activeTab === "audit" && (
                  <AuditLogsTab
                    formData={formData}
                    expandedLogIndex={expandedLogIndex}
                    setExpandedLogIndex={setExpandedLogIndex}
                    formatDDMMYY={formatDDMMYY}
                    formatTime12h={formatTime12h}
                  />
                )}
                {activeTab === "invoice" && (
                  <CompanyInvoice
                  company={company}
                    
                  />
                )}
              </div>
            </div>

            <div className="modal-footer">
              {editMode && (
                <button className="btn btn-sm btn-success" onClick={handleSubmit}>
                  <strong>Save Changes</strong>
                </button>
              )}
              <button className="btn btn-secondary btn-sm" onClick={() => handleCloseAttempt()}>
                <strong>Close</strong>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Modal */}
      {showErrorModal && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-danger"><strong>Validation Error</strong></h5>
                <button type="button" className="btn-close" onClick={() => setShowErrorModal(false)} />
              </div>
              <div className="modal-body">
                <ul className="list-unstyled">
                  {errorList.map((err, idx) => (
                    <li key={idx} className="text-danger mb-1">• {err.message}</li>
                  ))}
                </ul>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowErrorModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><strong>Confirm Delete</strong></h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteConfirm(false)} />
              </div>
              <div className="modal-body">
                <p>Are you sure you want to move this company to archive?</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-danger" onClick={() => { 
                  setShowDeleteConfirm(false); 
                  onDelete && onDelete(company?.id || company?.key); 
                }}>
                  Yes, Archive
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Modal */}
      {showUnsavedConfirm && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><strong>Discard changes?</strong></h5>
              </div>
              <div className="modal-body">
                <p>You have unsaved changes. Do you want to discard them?</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-danger" onClick={() => { 
                  setShowUnsavedConfirm(false); 
                  onClose && onClose(); 
                }}>
                  Discard
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowUnsavedConfirm(false)}>Keep Editing</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Success Modal */}
      {showSaveSuccess && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.3)" }}>
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-body text-center p-4">
                <div className="text-success mb-2">
                  <i className="fas fa-check-circle fa-3x"></i>
                </div>
                <h5><strong>Saved Successfully!</strong></h5>
                <p>Your changes have been saved.</p>
                <button 
                  className="btn btn-success mt-2" 
                  onClick={() => setShowSaveSuccess(false)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Removal Confirmation Modal */}
      {showRemovalConfirm && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Remove</h5>
                <button type="button" className="btn-close" onClick={() => setShowRemovalConfirm(false)} />
              </div>
              <div className="modal-body">
                <p>Are you sure you want to remove this company?</p>
                <div className="d-flex gap-2 justify-content-end">
                  <button className="btn btn-secondary" onClick={() => setShowRemovalConfirm(false)}>No</button>
                  <button className="btn btn-danger" onClick={() => { 
                    setShowRemovalConfirm(false); 
                    setShowRemovalModal(true); 
                  }}>
                    Yes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Removal Details Modal */}
      {showRemovalModal && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Removal Details</h5>
                <button type="button" className="btn-close" onClick={() => setShowRemovalModal(false)} />
              </div>
              <div className="modal-body">
                <div className="mb-2">
                  <label className="form-label">Reason</label>
                  <select 
                    className="form-select" 
                    value={removalForm.reason} 
                    onChange={(e) => setRemovalForm(prev => ({ ...prev, reason: e.target.value }))}
                  >
                    <option value="">-- Select reason --</option>
                    {removalReasonOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  {removalErrors.reason && <div className="text-danger small mt-1">{removalErrors.reason}</div>}
                </div>
                <div className="mb-2">
                  <label className="form-label">Comment</label>
                  <textarea 
                    className="form-control" 
                    rows="4" 
                    value={removalForm.comment} 
                    onChange={(e) => setRemovalForm(prev => ({ ...prev, comment: e.target.value }))} 
                  />
                  {removalErrors.comment && <div className="text-danger small mt-1">{removalErrors.comment}</div>}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowRemovalModal(false)}>Close</button>
                <button className="btn btn-danger" onClick={async () => {
                  const errs = {};
                  if (!removalForm.reason) errs.reason = "Select reason";
                  if (!removalForm.comment || !removalForm.comment.trim()) errs.comment = "Enter comment";
                  setRemovalErrors(errs);
                  if (Object.keys(errs).length > 0) return;
                  
                  try {
                    const id = formData?.id || formData?.recordId || formData?.companyId;
                    const removalEntry = {
                      removedAt: new Date().toISOString(),
                      removedBy: currentUserName || "System",
                      removalReason: removalForm.reason,
                      removalComment: removalForm.comment.trim(),
                    };
                    
                    if (id) {
                      await firebaseDB.child(`CompanyArchive/${id}/removalHistory`).push(removalEntry);
                    } else {
                      const newRef = firebaseDB.child(`CompanyArchive`).push();
                      await newRef.set({ removalHistory: { [newRef.key]: removalEntry }, movedAt: new Date().toISOString() });
                    }
                    
                    setShowRemovalModal(false);
                    onRemoved && onRemoved(id);
                  } catch (err) {
                    console.error("remove company error", err);
                    setErrorList([{ path: "remove", message: "Remove failed. Please try again." }]);
                    setShowErrorModal(true);
                  }
                }}>
                  Remove Company
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CompanyModal;