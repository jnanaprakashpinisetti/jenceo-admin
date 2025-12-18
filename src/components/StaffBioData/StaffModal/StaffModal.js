import React, { useState, useEffect, useRef } from "react";
import { storageRef, uploadFile, getDownloadURL } from "../../../firebase";
import { useAuth } from "../../../context/AuthContext";
import firebaseDB from "../../../firebase";

// Import components
import BaseModal from "./BaseModal";
import AlertModal from "./AlertModal";
import ConfirmModal from "./ConfirmModal";

// Import tabs
import BasicTab from "./tabs/BasicTab";
import AddressTab from "./tabs/AddressTab";
import PersonalTab from "./tabs/PersonalTab";
import QualificationTab from "./tabs/QualificationTab";
import HealthTab from "./tabs/HealthTab";
import EmergencyTab from "./tabs/EmergencyTab";
import JobTab from "./tabs/JobTab";
import BankTab from "./tabs/BankTab";
import PaymentTab from "./tabs/PaymentTab";
import WorkingTab from "./tabs/WorkingTab";
import PayInfoTab from "./tabs/PayInfoTab";
import FullDataTab from "./tabs/FullDataTab";
import BiodataTab from "./tabs/BiodataTab";

// Import utilities
import { 
    blankPayment, blankWork, hasAnyValue, lockIfFilled, 
    setNested, DOB_MIN, DOB_MAX, DOM_MIN, DOM_MAX, 
    PAY_MIN, PAY_MAX, today, toISO, minusYears 
} from "./utils";

const StaffModal = ({ staff, isOpen, onClose, onSave, onDelete, isEditMode }) => {
    const [formData, setFormData] = useState({});
    const [status, setStatus] = useState("On Duty");
    const [activeTab, setActiveTab] = useState("basic");
    const [alertState, setAlertState] = useState({ open: false, title: "", variant: "info", body: null });
    const [confirmState, setConfirmState] = useState({ open: false, title: "", message: "", onConfirm: null });
    const [deleteReasonOpen, setDeleteReasonOpen] = useState(false);
    const [returnReasonOpen, setReturnReasonOpen] = useState(false);
    const [reasonForm, setReasonForm] = useState({ reasonType: "", comment: "", for: "" });

    const { user } = useAuth() || {};
    const currentUserName = user?.name || "System";
    const currentUserId = user?.uid || user?.dbId || user?.id || "";
    const currentUserRole = user?.role || "Employee";

    // validation errors (array per row)
    const [paymentErrors, setPaymentErrors] = useState([{}]);
    const [workErrors, setWorkErrors] = useState([{}]);

    const iframeRef = useRef(null);

    const openAlert = (title, body, variant = "info") => setAlertState({ open: true, title, body, variant });
    const closeAlert = () => setAlertState((s) => ({ ...s, open: false }));

    const openConfirm = (title, message, onConfirm, error = null) => setConfirmState({ open: true, title, message, onConfirm, error });
    const closeConfirm = () => setConfirmState((s) => ({ ...s, open: false }));

    // helpers to detect if payments/work have real data
    const hasPayments = () => Array.isArray(formData.payments) && formData.payments.some(p => hasAnyValue(p));
    const hasWorkDetails = () => Array.isArray(formData.workDetails) && formData.workDetails.some(w => hasAnyValue(w));

    useEffect(() => {
        if (staff) {
            const paymentsInit =
                Array.isArray(staff.payments) && staff.payments.length ? lockIfFilled(staff.payments) : [blankPayment()];
            const workInit =
                Array.isArray(staff.workDetails) && staff.workDetails.length ? lockIfFilled(staff.workDetails) : [blankWork()];

            // SAFER DEFAULTS so edited values persist and load correctly
            setFormData({
                ...staff,
                secondarySkills: Array.isArray(staff.secondarySkills) ? staff.secondarySkills : [],
                workingSkills: Array.isArray(staff.workingSkills) ? staff.workingSkills : [],
                healthIssues: Array.isArray(staff.healthIssues) ? staff.healthIssues : [],
                otherIssues: staff.otherIssues ?? "",
                allowance: staff.allowance ?? "",
                pageNo: staff.pageNo ?? "",
                basicSalary: staff.basicSalary ?? "",
                payments: paymentsInit.map((p) => ({ balanceAmount: "", receiptNo: "", ...p })),
                workDetails: workInit,
                employeePhotoUrl: staff.employeePhoto || null,
            });

            setStatus(staff.status || "On Duty");
            setPaymentErrors(paymentsInit.map(() => ({})));
            setWorkErrors(workInit.map(() => ({})));
        } else {
            // new record defaults
            setFormData({
                secondarySkills: [],
                workingSkills: [],
                healthIssues: [],
                otherIssues: "",
                payments: [blankPayment()],
                workDetails: [blankWork()],
            });
            setStatus("On Duty");
            setPaymentErrors([{}]);
            setWorkErrors([{}]);
        }
    }, [staff]);

    // Handle photo upload to Firebase Storage
    const handlePhotoUpload = async (file) => {
        const timestamp = Date.now();
        const fileExtension = file.name.split(".").pop();
        const fileName = `staff-photos/${formData.idNo || formData.employeeId || "staff"}-${timestamp}.${fileExtension}`;
        const fileRef = storageRef.child(fileName);
        const snapshot = await uploadFile(fileRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    };

    // Handle photo change in the modal
    const handlePhotoChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
            if (!validTypes.includes(file.type)) {
                openAlert("Invalid File", "Please select a valid image file (JPEG, PNG, GIF)", "danger");
                return;
            }
            if (file.size > 100 * 1024) {
                openAlert("File Too Large", "Image size should be less than 100 KB", "danger");
                return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
                setFormData((prev) => ({
                    ...prev,
                    employeePhotoFile: file,
                    employeePhotoUrl: ev.target.result,
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    // Handle ID Proof file uploads
    const handleIdProofChange = (e) => {
        const files = Array.from(e.target.files || []);

        const currentCount = formData.idProofFiles?.length || 0;
        const existingCount = formData.idProof?.length || 0;

        if (currentCount + existingCount + files.length > 5) {
            alert("Maximum 5 ID proof files allowed");
            return;
        }

        const validFiles = [];
        const invalidFiles = [];

        files.forEach(file => {
            const validImage = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
            const validPdf = "application/pdf";

            if ((validImage.includes(file.type) || file.type === validPdf) && file.size <= 200 * 1024) {
                validFiles.push(file);
            } else {
                invalidFiles.push(file.name);
            }
        });

        if (invalidFiles.length > 0) {
            alert(`Invalid files: ${invalidFiles.join(", ")}. Only PDF/JPG/PNG/GIF up to 200KB each`);
        }

        if (validFiles.length > 0) {
            setFormData(prev => ({
                ...prev,
                idProofFiles: [...(prev.idProofFiles || []), ...validFiles]
            }));
        }
    };

    // Remove ID Proof file
    const removeIdProofFile = (index) => {
        setFormData(prev => ({
            ...prev,
            idProofFiles: prev.idProofFiles.filter((_, i) => i !== index)
        }));
    };

    // Remove existing ID proof from database
    const removeExistingIdProof = (index) => {
        setFormData(prev => {
            const updatedProofs = [...prev.idProof];
            updatedProofs.splice(index, 1);
            return {
                ...prev,
                idProof: updatedProofs
            };
        });
    };

    /* -------------------------------- Handlers --------------------------------- */
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => (name.includes(".") ? setNested(prev || {}, name, value) : { ...prev, [name]: value }));
    };

    const handleArrayChange = (section, index, field, value) => {
        // sanitize for payments only
        let val = value;
        if (section === "payments") {
            if (field === "amount") {
                val = String(value || "").replace(/\D/g, "").slice(0, 5);
            } else if (field === "balanceAmount") {
                val = String(value || "").replace(/\D/g, "");
            }
        }

        setFormData((prev) => {
            const arr = [...(prev[section] || [])];
            const row = { ...(arr[index] || {}) };
            if (row.__locked) return prev; // prevent editing locked rows
            row[field] = val;
            arr[index] = row;
            return { ...prev, [section]: arr };
        });

        if (section === "payments") {
            setPaymentErrors((prev) => {
                const next = [...(prev || [])];
                next[index] = { ...(next[index] || {}), [field]: "" };
                return next;
            });
        } else if (section === "workDetails") {
            setWorkErrors((prev) => {
                const next = [...(prev || [])];
                next[index] = { ...(next[index] || {}), [field]: "" };
                return next;
            });
        }
    };

    const addPaymentSection = () => {
        const newPayment = {
            date: new Date().toISOString().slice(0, 10),
            clientName: "",
            days: "",
            amount: "",
            balanceAmount: "",
            typeOfPayment: "",
            bookNo: "",
            status: "",
            receiptNo: "",
            remarks: "",
            createdAt: new Date().toISOString(),
            createdByName: currentUserName,
            createdById: currentUserId,
            createdByRole: currentUserRole,
            __locked: false,
        };

        setFormData((prev) => ({
            ...prev,
            payments: [...(prev.payments || []), newPayment],
        }));
        setPaymentErrors((prev) => [...(prev || []), {}]);
    };

    const addWorkSection = () => {
        setFormData((prev) => ({ ...prev, workDetails: [...(prev.workDetails || []), blankWork()] }));
        setWorkErrors((prev) => [...(prev || []), {}]);
    };

    const removePaymentSection = (index) => {
        setFormData((prev) => {
            const list = [...(prev.payments || [])];
            if (list[index]?.__locked) return prev;
            list.splice(index, 1);
            return { ...prev, payments: list.length ? list : [blankPayment()] };
        });
        setPaymentErrors((prev) => {
            const next = [...(prev || [])];
            next.splice(index, 1);
            return next.length ? next : [{}];
        });
    };

    const removeWorkSection = (index) => {
        setFormData((prev) => {
            const list = [...(prev.workDetails || [])];
            if (list[index]?.__locked) return prev;
            list.splice(index, 1);
            return { ...prev, workDetails: list.length ? list : [blankWork()] };
        });
        setWorkErrors((prev) => {
            const next = [...(prev || [])];
            next.splice(index, 1);
            return next.length ? next : [{}];
        });
    };

    /* ------------------------------- Validation -------------------------------- */
    const validateBasic = () => {
        const errs = [];
        if (formData.dateOfBirth) {
            const dob = new Date(formData.dateOfBirth);
            if (toISO(dob) < DOB_MIN || toISO(dob) > DOB_MAX) {
                errs.push("Age must be between 18 and 60 years.");
            }
        }
        const mobilePattern = /^[0-9]{10}$/;
        if (formData.mobileNo1 && !mobilePattern.test(String(formData.mobileNo1))) errs.push("Mobile 1 must be a 10-digit number.");
        if (formData.mobileNo2 && !mobilePattern.test(String(formData.mobileNo2))) errs.push("Mobile 2 must be a 10-digit number.");

        const aadhaarPattern = /^[0-9]{12}$/;
        if (formData.aadharNo && !aadhaarPattern.test(String(formData.aadharNo))) errs.push("Aadhaar must be a 12-digit number.");
        return { ok: errs.length === 0, errs };
    };

    const validateAddress = () => {
        const errs = [];
        const pinPattern = /^[0-9]{6}$/;
        if (formData.permanentPincode && !pinPattern.test(String(formData.permanentPincode)))
            errs.push("Permanent pincode must be a 6-digit number.");
        if (formData.presentPincode && !pinPattern.test(String(formData.presentPincode)))
            errs.push("Present pincode must be a 6-digit number.");
        return { ok: errs.length === 0, errs };
    };

    const validatePersonal = () => {
        const errs = [];
        if (formData.maritalStatus === "Married" && formData.dateOfMarriage) {
            const dom = new Date(formData.dateOfMarriage);
            if (toISO(dom) < DOM_MIN || toISO(dom) > DOM_MAX) {
                errs.push("Date of marriage must be within the last 40 years.");
            }
        }
        return { ok: errs.length === 0, errs };
    };

    const validatePayments = () => {
        let ok = true;
        const pErrs = (formData.payments || []).map((p) => {
            if (!hasAnyValue(p)) return {};
            const e = {};
            if (!p.date) {
                e.date = "Date is required";
            } else {
                const d = new Date(p.date);
                const iso = toISO(d);
                if (iso < PAY_MIN || iso > PAY_MAX) e.date = "Payment date must be within the last 1 year";
            }
            if (!p.clientName) e.clientName = "Client name is required";
            if (!p.days) e.days = "Days is required";
            else if (Number(p.days) <= 0 || isNaN(Number(p.days))) e.days = "Days must be a positive number";

            const amountDigits = String(p.amount || "").replace(/\D/g, "");
            if (!amountDigits) e.amount = "Amount is required";
            else if (!/^[0-9]{1,5}$/.test(amountDigits) || Number(amountDigits) <= 0)
                e.amount = "Amount must be a positive number up to 5 digits";

            if (p.balanceAmount && !/^[0-9]+$/.test(String(p.balanceAmount))) e.balanceAmount = "Enter a valid balance amount";
            if (!p.typeOfPayment) e.typeOfPayment = "Type of payment is required";
            if (!p.status) e.status = "Status is required";
            if (Object.keys(e).length) ok = false;
            return e;
        });
        setPaymentErrors(pErrs.length ? pErrs : [{}]);
        return ok;
    };

    const validateWork = () => {
        let ok = true;
        const wErrs = (formData.workDetails || []).map((w) => {
            if (!hasAnyValue(w)) return {};
            const e = {};
            if (!w.clientId) e.clientId = "Client ID is required";
            if (!w.clientName) e.clientName = "Client name is required";
            if (!w.days) e.days = "Days is required";
            else if (Number(w.days) <= 0 || isNaN(Number(w.days))) e.days = "Days must be a positive number";
            if (!w.fromDate) e.fromDate = "From date is required";
            if (!w.toDate) e.toDate = "To date is required";
            if (w.fromDate && w.toDate && new Date(w.fromDate) > new Date(w.toDate)) {
                e.toDate = "To date must be after From date";
            }
            if (!w.serviceType) e.serviceType = "Service type is required";
            if (Object.keys(e).length) ok = false;
            return e;
        });
        setWorkErrors(wErrs.length ? wErrs : [{}]);
        return ok;
    };

    const validateSection = (tabKey) => {
        if (tabKey === "basic") return validateBasic();
        if (tabKey === "address") return validateAddress();
        if (tabKey === "personal") return validatePersonal();
        if (tabKey === "payment") return { ok: validatePayments(), errs: [] };
        if (tabKey === "working") return { ok: validateWork(), errs: [] };
        return { ok: true, errs: [] };
    };

    const summarizeErrors = () => {
        const items = [];
        if (activeTab === "payment") {
            (paymentErrors || []).forEach((row, idx) => {
                const fields = Object.keys(row || {});
                if (fields.length)
                    items.push(
                        <li key={`p-${idx}`}>
                            Payment #{idx + 1}: {Object.values(row).join(", ")}
                        </li>
                    );
            });
        } else if (activeTab === "working") {
            (workErrors || []).forEach((row, idx) => {
                const fields = Object.keys(row || {});
                if (fields.length)
                    items.push(
                        <li key={`w-${idx}`}>
                            Work #{idx + 1}: {Object.values(row).join(", ")}
                        </li>
                    );
            });
        }
        return items.length ? <ul className="mb-0">{items}</ul> : <span>No errors</span>;
    };

    /* ------------------------------ Actions --------------------------------- */
    const handleSaveClick = async () => {
        const { ok, errs } = validateSection(activeTab);

        if (!ok) {
            if (activeTab !== "payment" && (paymentErrors || []).some((e) => Object.keys(e || {}).length)) {
                setActiveTab("payment");
            } else if (activeTab !== "working" && (workErrors || []).some((e) => Object.keys(e || {}).length)) {
                setActiveTab("working");
            }

            openAlert(
                "Please fix the following",
                <>
                    {!!errs?.length && (
                        <ul className="mb-2">
                            {errs.map((m, i) => (
                                <li key={i}>{m}</li>
                            ))}
                        </ul>
                    )}
                    {activeTab === "payment" || activeTab === "working" ? summarizeErrors() : null}
                    <p>Please enter All Payment Details </p>
                </>,
                "danger"
            );
            return;
        }

        try {
            let photoURL = formData.employeePhotoUrl;
            if (formData.employeePhotoFile) {
                photoURL = await handlePhotoUpload(formData.employeePhotoFile);
            }

            const payload = {
                ...formData,
                employeePhoto: photoURL,
                payments: (formData.payments || []).map((p) => ({
                    ...p,
                    createdByName: p.createdByName || currentUserName,
                    createdById: p.createdById || currentUserId,
                    createdByRole: p.createdByRole || currentUserRole,
                    createdAt: p.createdAt || new Date().toISOString(),
                })),
                workDetails: (formData.workDetails || []).map(({ __locked, ...rest }) => rest),
                status,
            };
            delete payload.employeePhotoFile;

            await Promise.resolve(onSave && onSave(payload));

            setFormData((prev) => {
                const updated = { ...prev };
                if (activeTab === "payment") updated.payments = lockIfFilled(prev.payments);
                else if (activeTab === "working") updated.workDetails = lockIfFilled(prev.workDetails);
                return updated;
            });

            openAlert("Saved", <span>Changes have been saved successfully.</span>, "success");

            setTimeout(() => {
                closeAlert();
                onClose && onClose();
            }, 900);
        } catch (error) {
            openAlert("Error", <span>Failed to save changes: {error.message}</span>, "danger");
        }
    };

    const handleDelete = () => {
        openConfirm(
            "Delete Staff",
            "Do you want to delete the Staff ?",
            () => {
                closeConfirm();
                setReasonForm({ reasonType: "", comment: "", for: "delete" });
                setDeleteReasonOpen(true);
            }
        );
    };

    const submitDeleteWithReason = async () => {
        if (!reasonForm.reasonType) {
            openAlert("Validation", "Please select a reason for removing.", "danger");
            return;
        }
        if (!reasonForm.comment || !String(reasonForm.comment).trim()) {
            openAlert("Validation", "Please provide a comment (reason) - mandatory.", "danger");
            return;
        }
        closeConfirm();
        setDeleteReasonOpen(false);
        onDelete && onDelete(formData.id || formData.employeeId, {
            reasonType: reasonForm.reasonType,
            comment: reasonForm.comment,
            userStamp: (formData.updatedBy || 'System'),
            timestamp: new Date().toISOString()
        });
        openAlert("Deleted", <span>Staff has been removed.</span>, "success");
        setTimeout(() => {
            closeAlert();
            onClose && onClose();
        }, 800);
    };

    const handleReturn = () => {
        openConfirm(
            "Confirm Return",
            "Do you want to return/reactivate this staff?",
            () => {
                closeConfirm();
                setReasonForm({ reasonType: "", comment: "", for: "return" });
                setReturnReasonOpen(true);
            }
        );
    };

    const submitReturnWithReason = async () => {
        if (!reasonForm.reasonType) {
            openAlert("Validation", "Please select a reason for return.", "danger");
            return;
        }
        if (!reasonForm.comment || !String(reasonForm.comment).trim()) {
            openAlert("Validation", "Please provide a comment (reason) - mandatory.", "danger");
            return;
        }
        const payload = {
            ...formData,
            status: "On Duty",
            __returnInfo: {
                reasonType: reasonForm.reasonType,
                comment: reasonForm.comment,
                userStamp: (formData.updatedBy || 'System'),
                timestamp: new Date().toISOString()
            },
        };
        setReturnReasonOpen(false);
        try {
            await Promise.resolve(onSave && onSave(payload));
            openAlert("Returned", <span>Staff has been returned/reactivated.</span>, "success");
            setTimeout(() => {
                closeAlert();
                onClose && onClose();
            }, 800);
        } catch (err) {
            openAlert("Error", <span>Failed to return staff: {err.message}</span>, "danger");
        }
    };

    // Render error component
    const Err = ({ msg }) => (msg ? <div className="text-danger mt-1" style={{ fontSize: ".85rem" }}>{msg}</div> : null);

    const modalClass = isEditMode ? "editEmployee" : "viewEmployee";

    if (!isOpen) return null;

    return (
        <>
            {/* Global Alert & Confirm Modals */}
            <AlertModal open={alertState.open} title={alertState.title} variant={alertState.variant} onClose={closeAlert}>
                {alertState.body}
            </AlertModal>

            <ConfirmModal
                open={confirmState.open}
                title={confirmState.title || "Confirm"}
                message={confirmState.message}
                onCancel={closeConfirm}
                onConfirm={() => {
                    const cb = confirmState.onConfirm;
                    cb && cb();
                }}
            />

            <BaseModal open={deleteReasonOpen} title={"Reason for Removing Staff"} onClose={() => setDeleteReasonOpen(false)} footer={<><button className="btn btn-secondary" onClick={() => setDeleteReasonOpen(false)}>Cancel</button><button className="btn btn-danger" onClick={submitDeleteWithReason}>Remove</button></>}>
                <div>
                    <div className="mb-2">
                        <label className="form-label"><strong>Reason</strong></label>
                        <select className="form-select" value={reasonForm.reasonType} onChange={(e) => setReasonForm((prev) => ({ ...prev, reasonType: e.target.value }))}>
                            <option value="">Select Reason</option>
                            <option value="Resign">Resign</option>
                            <option value="Termination">Termination</option>
                            <option value="Absconder">Absconder</option>
                        </select>
                    </div>
                    <div className="mb-2">
                        <label className="form-label"><strong>Comment (mandatory)</strong></label>
                        <textarea className="form-control" rows="4" value={reasonForm.comment} onChange={(e) => setReasonForm((prev) => ({ ...prev, comment: e.target.value }))} />
                    </div>
                    <div className="text-muted">Please provide reason for removing the staff.</div>
                </div>
            </BaseModal>

            <BaseModal open={returnReasonOpen} title={"Reason for Returning Staff"} onClose={() => setReturnReasonOpen(false)} footer={<><button className="btn btn-secondary" onClick={() => setReturnReasonOpen(false)}>Cancel</button><button className="btn btn-success" onClick={submitReturnWithReason}>Submit</button></>}>
                <div>
                    <div className="mb-2">
                        <label className="form-label"><strong>Reason</strong></label>
                        <select className="form-select" value={reasonForm.reasonType} onChange={(e) => setReasonForm((prev) => ({ ...prev, reasonType: e.target.value }))}>
                            <option value="">Select Reason</option>
                            <option value="Re-Join">Re-Join</option>
                            <option value="Return">Return</option>
                            <option value="Good attutude">Good attutude</option>
                            <option value="One more chance">One more chance</option>
                            <option value="Recomandation">Recomandation</option>
                        </select>
                    </div>
                    <div className="mb-2">
                        <label className="form-label"><strong>Comment (mandatory)</strong></label>
                        <textarea className="form-control" rows="4" value={reasonForm.comment} onChange={(e) => setReasonForm((prev) => ({ ...prev, comment: e.target.value }))} />
                    </div>
                    <div className="text-muted">Please provide reason for returning the staff.</div>
                </div>
            </BaseModal>

            {/* Main Modal */}
            <div className={`modal fade show ${modalClass}`} style={{ display: "block", backgroundColor: "rgba(0, 0, 0, 0.81)" }}>
                <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                    <div className="modal-content">
                        <div className="modal-header bg-secondary text-white">
                            <h3 className="modal-title">
                                {isEditMode ? "Edit Staff - " : ""}
                                {formData.idNo || formData.employeeId || "N/A"} - {formData.firstName || ""} {formData.lastName || ""}
                            </h3>
                            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                        </div>

                        <div className="modal-body">
                            {/* Tabs */}
                            <ul className="nav nav-tabs" id="employeeTabs" role="tablist">
                                {[
                                    ["basic", "Basic Info"],
                                    ["address", "Address"],
                                    ["personal", "Personal Info"],
                                    ["qualification", "Skills"],
                                    ["health", "Health Info"],
                                    ["emergency", "Emg Contacts"],
                                    ["job", "Job"],
                                    ["bank", "Bank Details"],
                                    ["payment", "Payment"],
                                    ["working", "Working"],
                                    ["pay-info", "Pay Info"],
                                    ["full-data", "Full Data"],
                                    ["biodata", "Biodata"],
                                ].map(([key, label]) => (
                                    <li className="nav-item" role="presentation" key={key}>
                                        <button className={`nav-link ${activeTab === key ? "active" : ""}`} onClick={() => setActiveTab(key)}>
                                            {label}
                                        </button>
                                    </li>
                                ))}
                            </ul>

                            <div className="tab-content p-3 staffDataEdit">
                                {activeTab === "basic" && (
                                    <BasicTab
                                        formData={formData}
                                        setFormData={setFormData}
                                        isEditMode={isEditMode}
                                        status={status}
                                        setStatus={setStatus}
                                        handleInputChange={handleInputChange}
                                        handlePhotoChange={handlePhotoChange}
                                        handleIdProofChange={handleIdProofChange}
                                        removeIdProofFile={removeIdProofFile}
                                        removeExistingIdProof={removeExistingIdProof}
                                        staff={staff}
                                    />
                                )}

                                {activeTab === "address" && (
                                    <AddressTab
                                        formData={formData}
                                        isEditMode={isEditMode}
                                        handleInputChange={handleInputChange}
                                    />
                                )}

                                {activeTab === "personal" && (
                                    <PersonalTab
                                        formData={formData}
                                        isEditMode={isEditMode}
                                        handleInputChange={handleInputChange}
                                    />
                                )}

                                {activeTab === "qualification" && (
                                    <QualificationTab
                                        formData={formData}
                                        setFormData={setFormData}
                                        isEditMode={isEditMode}
                                    />
                                )}

                                {activeTab === "health" && (
                                    <HealthTab
                                        formData={formData}
                                        setFormData={setFormData}
                                        isEditMode={isEditMode}
                                    />
                                )}

                                {activeTab === "emergency" && (
                                    <EmergencyTab
                                        formData={formData}
                                        isEditMode={isEditMode}
                                        handleInputChange={handleInputChange}
                                    />
                                )}

                                {activeTab === "job" && (
                                    <JobTab
                                        formData={formData}
                                        isEditMode={isEditMode}
                                        handleInputChange={handleInputChange}
                                        // isSuperAdmin={isSuperAdmin}
                                    />
                                )}

                                {activeTab === "bank" && (
                                    <BankTab
                                        formData={formData}
                                        isEditMode={isEditMode}
                                        handleInputChange={handleInputChange}
                                    />
                                )}

                                {activeTab === "payment" && (
                                    <PaymentTab
                                        formData={formData}
                                        isEditMode={isEditMode}
                                        paymentErrors={paymentErrors}
                                        Err={Err}
                                        handleArrayChange={handleArrayChange}
                                        removePaymentSection={removePaymentSection}
                                        addPaymentSection={addPaymentSection}
                                        PAY_MIN={PAY_MIN}
                                        PAY_MAX={PAY_MAX}
                                    />
                                )}

                                {activeTab === "working" && (
                                    <WorkingTab
                                        formData={formData}
                                        isEditMode={isEditMode}
                                        workErrors={workErrors}
                                        Err={Err}
                                        handleArrayChange={handleArrayChange}
                                        removeWorkSection={removeWorkSection}
                                        addWorkSection={addWorkSection}
                                    />
                                )}

                                {activeTab === "pay-info" && (
                                    <PayInfoTab
                                        formData={formData}
                                        hasPayments={hasPayments}
                                        hasWorkDetails={hasWorkDetails}
                                    />
                                )}

                                {activeTab === "full-data" && (
                                    <FullDataTab
                                        formData={formData}
                                        iframeRef={iframeRef}
                                    />
                                )}

                                {activeTab === "biodata" && (
                                    <BiodataTab
                                        formData={formData}
                                        iframeRef={iframeRef}
                                    />
                                )}
                            </div>

                            {/* Footer buttons */}
                            <div className="d-flex gap-2 justify-content-end hideInView">
                                <button type="button" className="btn btn-secondary" onClick={onClose}>
                                    Close
                                </button>
                                <button type="button" className="btn btn-primary" onClick={handleSaveClick}>
                                    {isEditMode ? "Save Changes" : "Save"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default StaffModal;