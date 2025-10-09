import React, { useState, useEffect, useRef } from "react";
import { storageRef, uploadFile, getDownloadURL } from "../../firebase";
import { useAuth } from "../../context/AuthContext";



const headerImage =
    "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FHeadder.svg?alt=media&token=fa65a3ab-ba03-4959-bc36-e293c6db48ae";

const headerImageSecond = "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FHeadder-2.svg?alt=media&token=83a00c4b-a170-418b-b38b-63c4155b4d6b"

/* ----------------------------- Lightweight Modals ----------------------------- */
const BaseModal = ({ open, title, children, onClose, footer }) => {
    if (!open) return null;
    return (
        <div
            className="fixed-top d-flex align-items-center justify-content-center"
            style={{ inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1060 }}
            role="dialog"
            aria-modal="true"
        >
            <div className="card shadow-lg" style={{ width: "min(980px, 96vw)" }}>
                <div className="card-header d-flex align-items-center justify-content-between">
                    <strong className="me-3">{title}</strong>
                    <button type="button" className="btn-close" onClick={onClose} />
                </div>
                <div className="card-body">{children}</div>
                {footer && <div className="card-footer d-flex gap-2 justify-content-end">{footer}</div>}
            </div>
        </div>
    );
};

const AlertModal = ({ open, title = "Notice", variant = "info", onClose, children }) => (
    <BaseModal
        open={open}
        title={title}
        onClose={onClose}
        footer={
            <button
                className={`btn btn-${variant === "danger" ? "danger" : variant === "success" ? "success" : "secondary"}`}
                onClick={onClose}
            >
                OK
            </button>
        }
    >
        <div className={`alert alert-${variant} mb-0`}>
            <div className="alert-list" style={{ paddingLeft: "1.25rem" }}>{children}</div>
        </div>
    </BaseModal>
);

const ConfirmModal = ({
    open,
    title = "Confirm",
    message,
    error,
    confirmText = "Yes",
    cancelText = "No",
    onConfirm,
    onCancel,
}) => (
    <BaseModal
        open={open}
        title={title}
        onClose={onCancel}
        footer={
            <>
                <button className="btn btn-secondary" onClick={onCancel}>
                    {cancelText}
                </button>
                <button className="btn btn-danger" onClick={onConfirm}>
                    {confirmText}
                </button>
            </>
        }
    >
        <div className="alert alert-warning mb-0">
            <div style={{ paddingLeft: "1.25rem" }}>{message}</div>
            {error && <div className="text-danger mt-2" style={{ paddingLeft: '1.25rem' }}>{error}</div>}
        </div>
    </BaseModal>
);

/* --------------------------------- Component --------------------------------- */
const StaffModal = ({ staff, isOpen, onClose, onSave, onDelete, isEditMode }) => {
    const [formData, setFormData] = useState({});
    const [status, setStatus] = useState("On Duty");
    const [activeTab, setActiveTab] = useState("basic");
    const [alertState, setAlertState] = useState({ open: false, title: "", variant: "info", body: null });
    const [confirmState, setConfirmState] = useState({ open: false, title: "", message: "", onConfirm: null });
    const [deleteReasonOpen, setDeleteReasonOpen] = useState(false);
    const [returnReasonOpen, setReturnReasonOpen] = useState(false);
    const [reasonForm, setReasonForm] = useState({ reasonType: "", comment: "", for: "" });


    // validation errors (array per row)
    const [paymentErrors, setPaymentErrors] = useState([{}]);
    const [workErrors, setWorkErrors] = useState([{}]);

    const iframeRef = useRef(null);

    const openAlert = (title, body, variant = "info") => setAlertState({ open: true, title, body, variant });
    const closeAlert = () => setAlertState((s) => ({ ...s, open: false }));

    const openConfirm = (title, message, onConfirm, error = null) => setConfirmState({ open: true, title, message, onConfirm, error });
    const closeConfirm = () => setConfirmState((s) => ({ ...s, open: false }));

    // date helpers
    const today = new Date();
    const toISO = (d) =>
        d instanceof Date ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : "";
    const minusYears = (y) => new Date(today.getFullYear() - y, today.getMonth(), today.getDate());

    const DOB_MIN = toISO(minusYears(60));
    const DOB_MAX = toISO(minusYears(18));

    const DOM_MIN = toISO(minusYears(40));
    const DOM_MAX = toISO(today);

    const PAY_MIN = toISO(minusYears(1));
    const PAY_MAX = toISO(today);

    const blankPayment = () => ({
        date: "",
        clientName: "",
        days: "",
        amount: "",
        balanceAmount: "",
        typeOfPayment: "",
        bookNo: "",
        status: "",
        receiptNo: "",
        remarks: "",
        __locked: false,
    });

    const blankWork = () => ({
        clientId: "",
        clientName: "",
        location: "",
        days: "",
        fromDate: "",
        toDate: "",
        serviceType: "",
        remarks: "",
        __locked: false,
    });

    const hasAnyValue = (row) =>
        Object.entries(row).some(([k, v]) => k !== "__locked" && v !== null && v !== undefined && String(v).trim() !== "");

    // helpers to detect if payments/work have real data
    const hasPayments = () => Array.isArray(formData.payments) && formData.payments.some(p => hasAnyValue(p));
    const hasWorkDetails = () => Array.isArray(formData.workDetails) && formData.workDetails.some(w => hasAnyValue(w));

    // Lock only rows that have data; keep empty rows editable
    const lockIfFilled = (arr = []) =>
        Array.isArray(arr) ? arr.map((r) => (hasAnyValue(r) ? { ...r, __locked: true } : { ...r, __locked: false })) : [];

    // dot-path setter for nested fields: "emergencyContact1.name"
    const setNested = (obj, path, value) => {
        const keys = path.split(".");
        const next = { ...obj };
        let cur = next;
        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            cur[k] = typeof cur[k] === "object" && cur[k] !== null ? { ...cur[k] } : {};
            cur = cur[k];
        }
        cur[keys[keys.length - 1]] = value;
        return next;
    };

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
                payments: paymentsInit.map((p) => ({ balanceAmount: "", receiptNo: "", ...p })), // add new keys if missing
                workDetails: workInit,
                // preview URL for UI
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

    // Current signed-in admin (from your AuthContext)
    const { user: authUser } = useAuth() || {};

    // Consider someone super admin if role === 'superadmin',
    // OR if you keep a root admin flag via permissions.
    const isSuperAdmin =
        String(authUser?.role || "").toLowerCase() === "superadmin" ||
        authUser?.isSuperAdmin === true ||
        authUser?.permissions?.canManageAll === true;

    // Toggle that a super admin can flip to enable editing sensitive fields
    const [superAdminUnlock, setSuperAdminUnlock] = React.useState(false);

    // These locks are true unless a super admin flips the switch
    const lockBasic = isEditMode && (!isSuperAdmin || !superAdminUnlock);
    const lockJob = isEditMode && (!isSuperAdmin || !superAdminUnlock);


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
                    employeePhotoUrl: ev.target.result, // preview
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    //   if (!isOpen) return null;

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
        setFormData((prev) => ({ ...prev, payments: [...(prev.payments || []), blankPayment()] }));
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

    /* ------------------------------ Shared renderer ---------------------------- */
    const formatLine = (...parts) => parts.filter(Boolean).join(" ");
    const safe = (v, fallback = "—") => (v !== undefined && v !== null && String(v).trim() !== "" ? v : fallback);

    // Build the same HTML for preview and PDF.
    // `opts.hideSensitive` will hide status + phones + aadhar in the downloaded PDF only.
    const buildBiodataHTML = (opts = { hideSensitive: false }) => {
        const fullName = formatLine(safe(formData.firstName, ""), safe(formData.lastName, "")).trim() || "—";
        const ageText = formData.years ? `${formData.years} Years` : "—";
        const dobText = formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString() : "—";
        const gender = safe(formData.gender);
        const marital = safe(formData.maritalStatus);
        const co = safe(formData.co || formData.careOfPersonal);

        const permAddr = [`
  <div class="row">
    <div class="col-md-4"><strong>Door No</strong></div>
    <div class="col-md-1">:</div>
    <div class="col-md-7">${safe(formData.permanentAddress)}</div>
</div>
<div class="row">
    <div class="col-md-4"><strong>Street</strong></div>
    <div class="col-md-1">:</div>
    <div class="col-md-7">${safe(formData.permanentStreet)}</div>
</div>
<div class="row">
    <div class="col-md-4"><strong>Landmark</strong></div>
    <div class="col-md-1">:</div>
    <div class="col-md-7">${safe(formData.permanentLandmark)}</div>
</div>
<div class="row">
    <div class="col-md-4"><strong>Village / Town</strong></div>
    <div class="col-md-1">:</div>
    <div class="col-md-7">${safe(formData.permanentVillage)}</div>
</div>
<div class="row">
    <div class="col-md-4"><strong>Mandal</strong></div>
    <div class="col-md-1">:</div>
    <div class="col-md-7">${safe(formData.permanentMandal)}</div>
</div>
<div class="row">
    <div class="col-md-4"><strong>District</strong></div>
    <div class="col-md-1">:</div>
    <div class="col-md-7">${safe(formData.permanentDistrict)}</div>
</div>
<div class="row">
    <div class="col-md-4"><strong>State</strong></div>
    <div class="col-md-1">:</div>
    <div class="col-md-7">${safe(formData.permanentState)}${formData.permanentPincode ? " - " + formData.permanentPincode : ""}</div>
  </div>
`];

        const presentAddr = [`
<div class="row">
    <div class="col-md-4"><strong>Door No</strong></div>
    <div class="col-md-1">:</div>
    <div class="col-md-7">${safe(formData.presentAddress)}</div>
</div>
<div class="row">
    <div class="col-md-4"><strong>Street</strong></div>
    <div class="col-md-1">:</div>
    <div class="col-md-7">${safe(formData.presentStreet)}</div>
</div>
<div class="row">
    <div class="col-md-4"><strong>Landmark</strong></div>
    <div class="col-md-1">:</div>
    <div class="col-md-7">${safe(formData.presentLandmark)}</div>
</div>
<div class="row">
    <div class="col-md-4"><strong>Village / Town</strong></div>
    <div class="col-md-1">:</div>
    <div class="col-md-7">${safe(formData.presentVillage)}</div>
</div>
<div class="row">
    <div class="col-md-4"><strong>Mandal</strong></div>
    <div class="col-md-1">:</div>
    <div class="col-md-7">${safe(formData.presentMandal)}</div>
</div>
<div class="row">
    <div class="col-md-4"><strong>District</strong></div>
    <div class="col-md-1">:</div>
    <div class="col-md-7">${safe(formData.presentDistrict)}</div>
</div>
<div class="row">
    <div class="col-md-4"><strong>State</strong></div>
    <div class="col-md-1">:</div>
    <div class="col-md-7">${safe(formData.presentState)}${formData.presentPincode ? " - " + formData.presentPincode : ""}</div>
  </div>
`];


        const qual = safe(formData.qualification);
        const college = safe(formData.schoolCollege);
        const pskill = safe(formData.primarySkill);
        const mtongue = safe(formData.motherTongue || formData.motherTung);
        const langs = safe(formData.languages);
        const secondary = Array.isArray(formData.secondarySkills) ? formData.secondarySkills.filter(Boolean) : [];
        const otherSkills = Array.isArray(formData.workingSkills) ? formData.workingSkills.filter(Boolean) : [];
        const health = Array.isArray(formData.healthIssues) ? formData.healthIssues.filter(Boolean) : [];
        const rightNow = new Date();
        const metaDate = rightNow.toLocaleDateString();

        const photoHtml = formData.employeePhotoUrl
            ? `<img src="${formData.employeePhotoUrl}" style="width:120px;height:120px;object-fit:cover;border-radius:6px;border:1px solid #ccc" />`
            : `<div style="width:120px;height:120px;border:1px solid #ccc;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#888;font-size:12px">No Photo</div>`;

        const section = (title, body) => `
      <div class="sec">
        <div class="sec-title">${title}</div>
        <div class="sec-body">
          ${body}
        </div>
      </div>
    `;

        const row2 = (value1) => `
      
        ${value1}
      
    `;

        const addressBlock = (heading, lines) => `
      <div class="addr">
        <div class="addr-title">${heading}</div>
        ${lines.map((l) => `<div class="addr-line">${l}</div>`).join("")}
      </div>
    `;

        const chips = (items) =>
            items.length
                ? `<div class="tags">${items.map((s) => `<span class="tag">${String(s).trim()}</span>`).join("")}</div>`
                : `<div class="muted">—</div>`;

        // SENSITIVE BLOCKS (hidden in PDF)
        const sensitiveBlock = opts.hideSensitive
            ? ""
            : `
        -
      `;

        const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Staff Biodata - ${fullName}</title>
<style>
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#111}
  .page{ max-width:900px; margin:auto;background:#fff;border:1px solid #e5e5e5;padding:20px}
  .header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-bottom:2px solid #b7b4b4; padding:20px; margin:0 -20px; background: #c7d1f5; border-radius: 5px;}
  .row { display: flex; flex-wrap: wrap; margin-left: -6px; margin-right: -6px; border-bottom:1px solid #f1f1f1; margin-bottom:6px }
  .row > div { padding-left: 6px; padding-right: 6px; }
  .col-md-1 { flex: 0 0 8.3333%;  max-width: 8.3333%; }
  .col-md-4 { flex: 0 0 33.3333%; max-width: 33.3333%; }
  .col-md-7 { flex: 0 0 58.3333%; max-width: 58.3333%; }

  .biodataHeader {display:flex; justify-content:space-between; align-items: stretch; color:#fff; margin: -20px -20px 20px -20px}
  .logoSection {flex: 0 0 40%; align-content: center; border-bottom:10px solid #02acf2 }
  .logoSection h1 {color:#FCC603; margin:0; font-size:40px; margin-left:50px; font-weight:900; line-height:1}
  .logoSection h1 spane {color:#02acf2; margin:0; font-size:100px; }
  .logoSection .subText {color:#817f7f; margin-left:65px; font-size:12px; font-weight:bold; letter-spacing:3px  }
  .dataSection {background:#02acf2; flex: 1;  padding:10px 20px; border-top-left-radius: 125px; padding-left: 70px; }
  .dataSection * {margin:0; }
  .dataSection span {font-size:10px; }

  .h-left{flex:1; margin-top:25px}
  .title{font-size:40px;font-weight:700;letter-spacing:.4px;margin:0}
  .subtitle{font-size:12px;color:#444;margin-top:2px}
  .meta{font-size:11px;color:#555;margin-top:4px;display:flex;gap:14px;flex-wrap:wrap}
  .sec{margin-top:14px;border:1px solid #ddd;border-radius:6px;overflow:hidden}
  .sec-title{background:#dfe2f5; padding:8px 10px;font-weight:700}
  .sec-title h3{margin:0;font-size:14px}
  .sec-body{padding:10px}
  /* UNIFIED rows: label | : | value have the same width everywhere */
  .kv-row{display:grid;grid-template-columns: 240px 12px 1fr;gap:10px;align-items:start; margin-bottom:0; padding: 8px 0 2px 5px;}
  .kv-row:nth-child(even) {background-color: #f2f3fd;}
  .kv-label{font-weight:600; font-size:12px}
  .kv-colon{text-align:center}
  .kv-value{font-weight:500;word-break:break-word; font-size:12px}
  .addr{border:1px dashed #c9c9c9;border-radius:6px; padding:10px;margin-top:10px; margin-bottom:5px}
  .addr-title{font-weight:700;margin-bottom:4px; font-size:14px}
  .addr-line{font-size:10px;line-height:1; margin-bottom:5px}
  .addr-line .row {padding-top:10px; padding-bottom:10px; border-bottom:0; margin-bottom:0}
  .addr-line .row:nth-child(odd) {background-color:#f2f3fd;}
  /* Two even columns area */
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .tags{display:flex;flex-wrap:wrap;gap:6px}
  .tag{border:1px solid #02acf2;color:#02acf2;font-size:12px;padding:3px 8px;border-radius:999px}
  .muted{color:#777}
  .footer{margin :20px -20px -20px -20px;font-size:10px; color:#fff;display:flex;justify-content:space-between; background-color:#02acf2; padding:10px 20px}
  .blue {color:#02acf2}
  @media print{.page{border:none;margin:0;width:100%}}
  .header-img{width:100%;max-height:120px;object-fit:contain;margin-bottom:6px}
  /* photo box on the right */
  .photo-box{display:flex;align-items:center;justify-content:center}
  .photo-box img{width:120px;height:120px;object-fit:cover;border-radius:6px;border:1px solid #ccc}
  .photo-box .no-photo{width:120px;height:120px;border:1px solid #ccc;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#888;font-size:12px}
  .heaerImg {margin: -21px -20px 10px -20px}
  .heaerImg img {width:100%}
  
  @media only screen and (max-width: 992px) {
        .biodataHeader {display:none}
        .header {display:block}
        .header .h-left {text-align:center; margin-top:10px}
        .header .meta {justify-content:center; margin-bottom:15px}
        .title {font-size: 20px}
        .kv-row {display:block}
        .kv-colon {display:none}
        .kv-label {margin-bottom:5px}
        .two-col {display:block}
        .col-md-1 { display:none}
        .col-md-4 { flex: 0 0 100%; max-width: 100%; }
        .col-md-7 { flex: 0 0 100%; max-width: 100%; }
        .addr-title {font-size:12px}
        .addr-line .col-md-4 {padding-bottom:5px}
  }
</style>
</head>
<body>
<div class="page">
<div class="heaerImg"><img src="${headerImage}" alt="Header" /></div>
 
 
  <div class="header">
    <div class="h-left">
      <h1 class="title">EMPLOYEE BIO-DATA</h1>
      <div class="subtitle">H.R Department (Reg No: SEA/HYD/ALO/26/1040178/2025)</div>
      <div class="meta">
        <div><strong>ID:</strong> ${safe(formData.idNo || formData.employeeId)}</div>
        <div><strong>Date:</strong> ${metaDate}</div>
      </div>
    </div>
    <div class="photo-box">
      ${photoHtml}
    </div>
  </div>

  ${section(
            "<h3>Basic Information</h3>",
            `
      <div class="kv-row">
        <div class="kv-label ">Full Name</div><div class="kv-colon">:</div>
        <div class="kv-value blue"><strong>${fullName}</strong></div>
      </div>
      <div class="kv-row">
        <div class="kv-label">Gender</div><div class="kv-colon">:</div>
        <div class="kv-value blue">${gender}</div>
      </div>
      <div class="kv-row">
        <div class="kv-label">Date of Birth</div><div class="kv-colon">:</div>
        <div class="kv-value">${dobText}</div>
      </div>
      <div class="kv-row">
        <div class="kv-label">Age</div><div class="kv-colon">:</div>
        <div class="kv-value blue">${ageText}</div>
      </div>
      <div class="kv-row">
        <div class="kv-label">Care of</div><div class="kv-colon">:</div>
        <div class="kv-value">${co}</div>
      </div>
      <div class="kv-row">
        <div class="kv-label">Marital Status</div><div class="kv-colon">:</div>
        <div class="kv-value blue">${marital}</div>
      </div>
   
    `
        )}

  ${section(
            "<h3>Addresses</h3>",
            `
      <div class="two-col">
        <div>${addressBlock("Permanent Address", permAddr)}</div>
        <div>${addressBlock("Present Address", presentAddr)}</div>
      </div>
    `
        )}

  ${section(
            "<h3>Qualification & Skills</h3>",
            `
      <div class="kv-row">
        <div class="kv-label">Qualification</div><div class="kv-colon">:</div>
        <div class="kv-value blue">${qual}</div>
      </div>
      <div class="kv-row">
        <div class="kv-label">College / School</div><div class="kv-colon">:</div>
        <div class="kv-value">${college}</div>
      </div>
      <div class="kv-row">
        <div class="kv-label">Primary Skill</div><div class="kv-colon">:</div>
        <div class="kv-value blue"><strong>${pskill}</strong></div>
      </div>

      <div class="kv-row">
        <div class="kv-label">Other Skills</div><div class="kv-colon">:</div>
        <div class="kv-value">${chips(otherSkills)}</div>
      </div>
      <div class="kv-row">
        <div class="kv-label">Experience</div><div class="kv-colon">:</div>
        <div class="kv-value blue"><strong>${safe(formData.workExperince)}</strong></div>
      </div>

      <div class="kv-row">
        <div class="kv-label">Mother Tongue</div><div class="kv-colon">:</div>
        <div class="kv-value">${mtongue}</div>
      </div>
      <div class="kv-row">
        <div class="kv-label">Languages</div><div class="kv-colon">:</div>
        <div class="kv-value">${langs}</div>
      </div>
    `
        )}



  <div class="footer">
    <div>Doc Ref: JC-HR-07</div>
    <div>Revision: 1</div>
    <div>Date: 1st May 2025</div>
    <div>Page 1 of 1</div>
  </div>
</div>
<script>window.focus && window.focus();</script>
</body>
</html>
`;
        return html;

    };


    // -----------------------------Full data HTML ----------------------------***


    // Build the same HTML for preview and PDF.
    // `opts.hideSensitive` will hide status + phones + aadhar in the downloaded PDF only.
    const buildFulldataHTML = (opts = { hideSensitive: false }) => {
        const fullName = formatLine(safe(formData.firstName, ""), safe(formData.lastName, "")).trim() || "—";
        const ageText = formData.years ? `${formData.years} Years` : "—";
        const dobText = formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString() : "—";
        const gender = safe(formData.gender);
        const marital = safe(formData.maritalStatus);
        const co = safe(formData.co || formData.careOfPersonal);

        const permAddrLines = [
            `<div class="kv-row"><div class="kv-label">Door No</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.permanentAddress)}</div></div>`,
            `<div class="kv-row"><div class="kv-label">Street</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.permanentStreet)}</div></div>`,
            `<div class="kv-row"><div class="kv-label">Landmark</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.permanentLandmark)}</div></div>`,
            `<div class="kv-row"><div class="kv-label">Village / Town</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.permanentVillage)}</div></div>`,
            `<div class="kv-row"><div class="kv-label">Mandal</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.permanentMandal)}</div></div>`,
            `<div class="kv-row"><div class="kv-label">District</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.permanentDistrict)}</div></div>`,
            `<div class="kv-row"><div class="kv-label">State</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.permanentState)}${formData.permanentPincode ? " - " + formData.permanentPincode : ""}</div></div>`
        ].join("");

        const presentAddrLines = [
            `<div class="kv-row"><div class="kv-label">Door No</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.presentAddress)}</div></div>`,
            `<div class="kv-row"><div class="kv-label">Street</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.presentStreet)}</div></div>`,
            `<div class="kv-row"><div class="kv-label">Landmark</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.presentLandmark)}</div></div>`,
            `<div class="kv-row"><div class="kv-label">Village / Town</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.presentVillage)}</div></div>`,
            `<div class="kv-row"><div class="kv-label">Mandal</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.presentMandal)}</div></div>`,
            `<div class="kv-row"><div class="kv-label">District</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.presentDistrict)}</div></div>`,
            `<div class="kv-row"><div class="kv-label">State</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.presentState)}${formData.presentPincode ? " - " + formData.presentPincode : ""}</div></div>`
        ].join("");

        const qual = safe(formData.qualification);
        const college = safe(formData.schoolCollege);
        const pskill = safe(formData.primarySkill);
        const mtongue = safe(formData.motherTongue || formData.motherTung);
        const langs = safe(formData.languages);
        const secondary = Array.isArray(formData.secondarySkills) ? formData.secondarySkills.filter(Boolean) : [];
        const otherSkills = Array.isArray(formData.workingSkills) ? formData.workingSkills.filter(Boolean) : [];
        const health = Array.isArray(formData.healthIssues) ? formData.healthIssues.filter(Boolean) : [];

        const emergency1 = formData.emergencyContact1 || {};
        const emergency2 = formData.emergencyContact2 || {};
        const emergency3 = formData.emergencyContact3 || {};

        const bank = {
            accountNo: safe(formData.accountNo),
            bankName: safe(formData.bankName),
            branchName: safe(formData.branchName),
            ifsc: safe(formData.ifscCode),
            phonePayNo: safe(formData.phonePayNo),
            phonePayName: safe(formData.phonePayName),
            googlePayNo: safe(formData.googlePayNo),
            googlePayName: safe(formData.googlePayName),
        };

        const photoHtml = formData.employeePhotoUrl
            ? `<img src="${formData.employeePhotoUrl}" style="width:120px;height:120px;object-fit:cover;border-radius:6px;border:1px solid #ccc" />`
            : `<div style="width:120px;height:120px;border:1px solid #ccc;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#888;font-size:12px">No Photo</div>`;

        const rightNow = new Date();
        const metaDate = rightNow.toLocaleDateString();

        // CSS mirrors biodata styles and sets print-friendly small margins + two pages
        const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Staff Full-Data - ${fullName}</title>
<style>
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#111;background:#f6f6f6}
  /* Print optimization: small margins and remove extra whitespace */
  @page { margin: 6mm; }
  .container{ max-width:900px; margin:auto; padding:10px; }
  .toolbar{ display:flex; gap:8px; justify-content:flex-end; margin-bottom:8px }
  .toolbar button{ padding:6px 10px; font-size:13px; border-radius:4px; border:1px solid #ccc; background:#fff; cursor:pointer }
  .page{ background:#fff; border:1px solid #e5e5e5; padding:16px; margin-bottom:10px; page-break-after:always; border-radius:6px }
  .page:last-child{ page-break-after:auto }
  .header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-bottom:2px solid #92a9fb;padding-bottom:10px;margin-bottom:8px; background: #c7d1f5; border-radius:6px;}
  .title{font-size:25px;font-weight:700;margin:0;padding:12px 10px; margin-top:20px}
  .subtitle{font-size:11px;color:#444;padding-left:10px}
  .meta{font-size:12px;color:#555;padding:12px 10px}
  .kv-row{display:grid;grid-template-columns: 150px 12px 1fr;gap:6px;align-items:start;padding:7px 0 4px 10px; border-radius:5px}
  .kv-row:nth-child(even){background-color:#f0ebf5}
  .kv-label{font-weight:600; font-size:13px}
  .kv-colon{text-align:center}
  .kv-value{font-weight:500; font-size:13px}
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .addr{border:1px dashed #c9c9c9;border-radius:6px;padding:8px;background:#fff}
  .sec{margin-top:20px}
  .sec-title{background:#cae1ef;padding:8px 10px;font-weight:700;border-radius:4px}
  .tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
  .tag{border:1px solid #02acf2;color:#02acf2;font-size:12px;padding:3px 8px;border-radius:999px}
  .photo-box{display:flex;align-items:center;justify-content:center;padding:12px}
  .footer{margin-top:10px;font-size:12px;color:#fff;display:flex;justify-content:space-between;align-items:center;background-color:#02acf2;padding:8px;border-radius:6px}
  .muted{color:#777}
  .heaerImg img {width:100%}
  .heaerImg {margin:-15px -15px 15px -15px}
  .decleration {margin-top:20px; font-size:13px; padding:15px}
  .blue {color:#02acf2; font-weight:700}
  .hedder-inner {display:flex;flex-direction:column;justify-content:center}
 
  @media print {
    body{background:#fff}
    .toolbar{display:none}
    .container{max-width:100%;margin:0}
    .page{border:none;margin:0;padding:6mm;border-radius:0}
  }

 @media (max-width: 776px) {

  .header {display:block; text-align:center; padding-top:10px}
  .header-inner {display:block}
  .two-col {display:block}
  .kv-row {grid-template-columns:80px 12px 1fr}
  
  }

</style>
</head>
<body>
<div class="container">

  <div class="toolbar">
    <button onclick="window.print()">Print</button>
    <button id="downloadBtn">Download</button>
  </div>

  <!-- PAGE 1 -->
  <div class="page" id="page1">
  <div class="heaerImg"><img src="${headerImage}" alt="Header" /></div>
    <div class="header">
      <div class="header-inner">
        <div class="title">EMPLOYEE INFORMATION</div>
        <div class="subtitle">H.R Department (Reg No: SEA/HYD/ALO/26/1040178/2025)</div>
        <div class="meta"><strong>ID:</strong> ${safe(formData.idNo || formData.employeeId)} &nbsp; | &nbsp; <strong>Date:</strong> ${metaDate}</div>
      </div>
      <div class="photo-box">${photoHtml}</div>
    </div>

    <div class="sec">
      <div class="sec-title">Basic Information</div>
      <div class="sec-body" style="padding-top:10px">
      <div class="two-col">
      <div>

        <div class="kv-row"><div class="kv-label">Full Name</div><div class="kv-colon">:</div><div class="kv-value blue">${fullName}</div></div>
        <div class="kv-row"><div class="kv-label">Gender</div><div class="kv-colon">:</div><div class="kv-value blue">${gender}</div></div>

         <div class="kv-row"><div class="kv-label">Date of Birth</div><div class="kv-colon">:</div><div class="kv-value">${dobText}</div></div>
        <div class="kv-row"><div class="kv-label">Age</div><div class="kv-colon">:</div><div class="kv-value blue">${ageText}</div></div>

        <div class="kv-row"><div class="kv-label">Care of</div><div class="kv-colon">:</div><div class="kv-value">${co}</div></div>
         <div class="kv-row"><div class="kv-label">Marital Status</div><div class="kv-colon">:</div><div class="kv-value blue">${marital}</div></div>
         </div>
         <div>
         <div class="kv-row"><div class="kv-label">Aadhar No</div><div class="kv-colon">:</div><div class="kv-value">${opts.hideSensitive ? "—" : safe(formData.aadharNo)}</div></div>
        <div class="kv-row"><div class="kv-label">Local ID</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.localId)}</div></div>

        <div class="kv-row"><div class="kv-label">Date of Joining</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.date || formData.dateOfJoining)}</div></div>
        <div class="kv-row"><div class="kv-label">Page No</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.pageNo)}</div></div>
        <div class="kv-row"><div class="kv-label">Mobile-1</div><div class="kv-colon">:</div><div class="kv-value blue">${opts.hideSensitive ? "—" : `${formData.mobileNo1 ? + safe(formData.mobileNo1) : ""}`}</div></div>
        <div class="kv-row"><div class="kv-label">Mobile-2</div><div class="kv-colon">:</div><div class="kv-value blue">${opts.hideSensitive ? "—" : `${formData.mobileNo2 ? + safe(formData.mobileNo2) : ""}`}</div></div>
      </div>
         </div>

      </div>
    </div>

    <div class="sec" style="margin-top:14px">
      <div class="sec-title">Present & Permanent Address</div>
      <div class="sec-body" style="padding-top:10px">
        <div class="two-col">
          <div>
            <div style="font-weight:700;margin-bottom:6px">Permanent Address</div>
            <div class="addr">${permAddrLines}</div>
          </div>
          <div>
            <div style="font-weight:700;margin-bottom:6px">Present Address</div>
            <div class="addr">${presentAddrLines}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="sec" style="margin-top:14px">
      <div class="sec-title">Personal Info & Skills</div>
      <div class="sec-body" style="padding-top:10px">
        <div class="two-col">
          <div>
            <div class="kv-row"><div class="kv-label">Husband / Wife</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.careOfPersonal)}</div></div>
            <div class="kv-row"><div class="kv-label">Children</div><div class="kv-colon">:</div><div class="kv-value">${[safe(formData.childName1), safe(formData.childName2)].filter(Boolean).join(", ") || "—"}</div></div>
            <div class="kv-row"><div class="kv-label">Religion</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.religion)}</div></div>
            <div class="kv-row"><div class="kv-label">Caste</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.cast)}</div></div>
            <div class="kv-row"><div class="kv-label">Sub Caste</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.subCast)}</div></div>
          </div>
          <div>
            <div class="kv-row"><div class="kv-label">Qualification</div><div class="kv-colon">:</div><div class="kv-value blue">${qual}</div></div>
            <div class="kv-row"><div class="kv-label">School / College</div><div class="kv-colon">:</div><div class="kv-value">${college}</div></div>
            <div class="kv-row"><div class="kv-label">Primary Skill</div><div class="kv-colon">:</div><div class="kv-value blue">${pskill}</div></div>
            <div class="kv-row"><div class="kv-label">Other Skills</div><div class="kv-colon">:</div><div class="kv-value blue">${otherSkills.length ? otherSkills.join(", ") : "—"}</div></div>
            <div class="kv-row"><div class="kv-label">Experience</div><div class="kv-colon">:</div><div class="kv-value blue">${safe(formData.workExperince)}</div></div>
          </div>
        </div>
      </div>
    </div>

      <div class="footer">
      <div><strong>Doc Ref:</strong> JC-HR-01&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Revision: 1&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Date: 1st May 2025 </div>
      <div>Page 1 of 2</div>
    </div>
  </div>

  <!-- PAGE 2 -->

  <div class="page" id="page2">
  <div class="heaerImg" style="margin-top:15px; margin-bottom:25px"><img src="${headerImageSecond}" alt="Header" /></div>
      <div class="sec" style="margin-top:14px">
      <div class="sec-title">Health Info</div>
      
      <div class="sec-body" style="padding-top:10px">
      <div class="two-col">
      <div>
        <div class="kv-row"><div class="kv-label">Health Issues</div><div class="kv-colon">:</div><div class="kv-value">${health.length ? health.join(", ") : "No Health Issues"}</div></div>
        <div class="kv-row"><div class="kv-label">Other Issues</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.otherIssues)}</div></div>
        <div class="kv-row"><div class="kv-label">Blood Group</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.bloodGroup)}</div></div>
        
        
        </div>
        <div>
        <div class="kv-row"><div class="kv-label">Height</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.height)}</div></div>
        <div class="kv-row"><div class="kv-label">Weight</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.weight)}</div></div>
        <div class="kv-row"><div class="kv-label">Health Card No</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.healthCardNo)}</div></div>
        
      </div>
      </div>

      </div>
      </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div style="font-weight:700; margin-top:20px">Emergency Contacts & Bank Details</div>
    </div>

    <div class="sec">
      <div class="sec-title">Emergency Contacts (1 & 2)</div>
      <div class="sec-body" style="padding-top:10px">
        <div class="two-col">
          <div>
            <div class="kv-row"><div class="kv-label">Name</div><div class="kv-colon">:</div><div class="kv-value">${safe(emergency1.name)}</div></div>
            <div class="kv-row"><div class="kv-label">Relation</div><div class="kv-colon">:</div><div class="kv-value">${safe(emergency1.relation)}</div></div>
            <div class="kv-row"><div class="kv-label">Mobile 1</div><div class="kv-colon">:</div><div class="kv-value">${opts.hideSensitive ? "" : safe(emergency1.mobile1)}</div></div>
            <div class="kv-row"><div class="kv-label">Mobile 2</div><div class="kv-colon">:</div><div class="kv-value">${opts.hideSensitive ? "" : safe(emergency1.mobile2)}</div></div>
            <div class="kv-row"><div class="kv-label">Address</div><div class="kv-colon">:</div><div class="kv-value">${safe(emergency1.address)}, ${safe(emergency1.village)}, ${safe(emergency1.mandal)}, ${safe(emergency1.state)}</div></div>
          </div>
          <div>
            <div class="kv-row"><div class="kv-label">Name</div><div class="kv-colon">:</div><div class="kv-value">${safe(emergency2.name)}</div></div>
            <div class="kv-row"><div class="kv-label">Relation</div><div class="kv-colon">:</div><div class="kv-value">${safe(emergency2.relation)}</div></div>
            <div class="kv-row"><div class="kv-label">Mobile 1</div><div class="kv-colon">:</div><div class="kv-value">${opts.hideSensitive ? "" : safe(emergency2.mobile1)}</div></div>
            <div class="kv-row"><div class="kv-label">Mobile 2</div><div class="kv-colon">:</div><div class="kv-value">${opts.hideSensitive ? "" : safe(emergency2.mobile2)}</div></div>
            <div class="kv-row"><div class="kv-label">Address</div><div class="kv-colon">:</div><div class="kv-value">${safe(emergency2.address)}, ${safe(emergency2.village)}, ${safe(emergency2.mandal)}, ${safe(emergency2.state)}</div></div>
          </div>
        </div>
      </div>
    </div>

    <div class="sec" style="margin-top:12px">
    <div class="sec" style="margin-top:12px">
  <div class="sec-title">Job &amp; Bank Details</div>
  <div class="sec-body" style="padding-top:10px">
    <div class="two-col">
      <div>
        <div class="kv-row"><div class="kv-label">Department</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.department)}</div></div>
        <div class="kv-row"><div class="kv-label">Designation</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.designation)}</div></div>
        <div class="kv-row"><div class="kv-label">PAN No</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.panNo)}</div></div>
        <div class="kv-row"><div class="kv-label">PF No</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.pfNo)}</div></div>
        <div class="kv-row"><div class="kv-label">Insurance No</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.insuranceNo)}</div></div>
        <div class="kv-row"><div class="kv-label">Health Card No</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.healthCardNo)}</div></div>
        <div class="kv-row"><div class="kv-label">Role</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.role)}</div></div>
        <div class="kv-row"><div class="kv-label">Page No</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.pageNo)}</div></div>
      </div>
      <div>
        <div class="kv-row"><div class="kv-label">Account No</div><div class="kv-colon">:</div><div class="kv-value">${opts.hideSensitive ? "—" : bank.accountNo}</div></div>
        <div class="kv-row"><div class="kv-label">Bank Name</div><div class="kv-colon">:</div><div class="kv-value">${bank.bankName}</div></div>
        <div class="kv-row"><div class="kv-label">Branch</div><div class="kv-colon">:</div><div class="kv-value">${bank.branchName}</div></div>
        <div class="kv-row"><div class="kv-label">IFSC</div><div class="kv-colon">:</div><div class="kv-value">${opts.hideSensitive ? "—" : bank.ifsc}</div></div>
        <div class="kv-row"><div class="kv-label">PhonePe</div><div class="kv-colon">:</div><div class="kv-value">${opts.hideSensitive ? "—" : bank.phonePayNo + (bank.phonePayName ? " / " + bank.phonePayName : "")}</div></div>
        <div class="kv-row"><div class="kv-label">GooglePay</div><div class="kv-colon">:</div><div class="kv-value">${opts.hideSensitive ? "—" : bank.googlePayNo + (bank.googlePayName ? " / " + bank.googlePayName : "")}</div></div>
      </div>
    </div>
  </div>
</div>

    <div class="decleration">
        <p><strong>Declaration:</strong> I hereby declare that the information provided in this document regarding my personal information, experience, skills,
    health reports and qualifications is true, complete, and accurate to the best of my knowledge. I understand that any misrepresentation
    or omission of facts may result in legal consequences or disqualification from consideration for employment</p>
    <p style="text-align:right; font-style:italic; font-weight:700; margin-top:20px">Signature of the Staff</p>
    </div>
    

    <div class="footer">
      <div><strong>Doc Ref:</strong> JC-HR-01&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Revision: 1&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Date: 1st May 2025 </div>
      <div>Page 2 of 2</div>
    </div>
  </div>
</div>
 </div>

<script>
  // Download current HTML as file
  document.getElementById('downloadBtn').addEventListener('click', function(){
    const docHtml = '<!doctype html>' + document.documentElement.outerHTML;
    const blob = new Blob([docHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Employee_FullData_${safe(formData.idNo || formData.employeeId || "unknown")}.html';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 150);
  });

  // Share with Web Share API if available (falls back to download)
  document.getElementById('shareBtn').addEventListener('click', async function(){
    try {
      const docHtml = '<!doctype html>' + document.documentElement.outerHTML;
      const blob = new Blob([docHtml], { type: 'text/html' });
      const file = new File([blob], 'Employee_FullData_${safe(formData.idNo || formData.employeeId || "unknown")}.html', { type: 'text/html' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Staff Full-Data' });
      } else if (navigator.share) {
        await navigator.share({ title: 'Staff Full-Data', text: 'Staff Full-Data attached.' });
      } else {
        document.getElementById('downloadBtn').click();
      }
    } catch (err) {
      console.error(err);
      document.getElementById('downloadBtn').click();
    }
  });
</script>
</body>
</html>`;

        return html;
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
                payments: (formData.payments || []).map(({ __locked, ...rest }) => rest),
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
        // first confirm
        openConfirm(
            "Delete Staff",
            "Do you want to delete the Staff ?",
            () => {
                closeConfirm();
                // open reason modal (mandatory comment + dropdown)
                setReasonForm({ reasonType: "", comment: "", for: "delete" });
                setDeleteReasonOpen(true);
            }
        );
    };

    const submitDeleteWithReason = async () => {
        // validate
        if (!reasonForm.reasonType) {
            openAlert("Validation", "Please select a reason for removing.", "danger");
            return;
        }
        if (!reasonForm.comment || !String(reasonForm.comment).trim()) {
            openAlert("Validation", "Please provide a comment (reason) - mandatory.", "danger");
            return;
        }
        // call onDelete with meta
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

    // Return / Revert flow: when user wants to return/reactivate staff
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
        // attach return info to payload and call onSave to revert status
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
        // close modal then call onSave
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


    /* ------------------------------ render helpers ----------------------------- */
    const Err = ({ msg }) => (msg ? <div className="text-danger mt-1" style={{ fontSize: ".85rem" }}>{msg}</div> : null);

    const renderInputField = (label, name, value, type = "text", placeholder = "", hardDisabled = false, extraProps = {}) => (
        <div className="">
            <label className="form-label">
                <strong>{label}</strong>
            </label>
            {isEditMode ? (
                <input
                    type={type}
                    className="form-control form-control-sm"
                    name={name}
                    value={value || ""}
                    onChange={handleInputChange}
                    disabled={hardDisabled || extraProps?.disabled === true}
                    placeholder={placeholder}
                    {...extraProps}
                />
            ) : (
                <div className="form-control form-control-sm bg-light">{String(value || "N/A")}</div>
            )}
        </div>
    );

    const renderPhoneField = (label, name, value, extraProps = {}) => {
        const digitsOnly = String(value || "").replace(/\D/g, "");
        const canCall = !!digitsOnly;
        return (
            <div className="">
                <label className="form-label">
                    <strong>{label}</strong>
                </label>
                {isEditMode ? (
                    <input
                        type="tel"
                        className="form-control form-control-sm"
                        name={name}
                        value={value || ""}
                        onChange={handleInputChange}
                        inputMode="numeric"
                        maxLength={10}
                        pattern="^[0-9]{10}$"
                        {...extraProps}
                    />
                ) : (
                    <div className="form-control form-control-sm bg-light d-flex  align-items-center ">
                        <span>{value || "N/A"}</span>
                        {canCall && (
                            <a href={`tel:${digitsOnly}`} className="btn btn-sm btn-outline-primary ms-2 mb-1">
                                Call
                            </a>
                        )}

                        <a
                            className="btn btn-sm btn-warning ms-1 mb-1"
                            href={`https://wa.me/${digitsOnly?.replace(/\D/g, '')}?text=${encodeURIComponent(
                                "Hello, This is Sudheer From JenCeo Home Care Services"
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            WAP
                        </a>
                    </div>
                )}
            </div>
        );
    };

    const renderSelectField = (label, name, value, options) => (
        <div className="">
            <label className="form-label">
                <strong>{label}</strong>
            </label>
            {isEditMode ? (
                <select className="form-select" name={name} value={value || ""} onChange={handleInputChange}>
                    <option value="">Select {label}</option>
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            ) : (
                <div className="form-control form-control-sm bg-light">{String(value || "N/A")}</div>
            )}
        </div>
    );

    const renderArrayField = (label, field, placeholder = "Add item") => (
        <div className="">
            <label className="form-label">
                <strong>{label}</strong>
            </label>
            {isEditMode ? (
                <>
                    <div className="d-flex">
                        <input
                            type="text"
                            className="form-control form-control-sm me-2"
                            placeholder={placeholder}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && e.currentTarget.value.trim()) {
                                    const v = e.currentTarget.value.trim();
                                    const currentArray = Array.isArray(formData[field]) ? formData[field] : [];
                                    if (!currentArray.includes(v)) {
                                        setFormData((prev) => ({ ...prev, [field]: [...currentArray, v] }));
                                    }
                                    e.currentTarget.value = "";
                                    e.preventDefault();
                                }
                            }}
                        />
                        {Array.isArray(formData[field]) && formData[field].length > 0 && (
                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => setFormData((prev) => ({ ...prev, [field]: [] }))}
                            >
                                Clear All
                            </button>
                        )}
                    </div>
                    <div className="d-flex flex-wrap gap-1 mt-2">
                        {(formData[field] || []).map((item, index) => (
                            <span key={index} className="badge bg-secondary d-flex align-items-center">
                                {item}
                                {isEditMode && (
                                    <button
                                        type="button"
                                        className="btn-close btn-close-white ms-1"
                                        style={{ fontSize: "0.6rem" }}
                                        onClick={() =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                [field]: prev[field].filter((_, i) => i !== index),
                                            }))
                                        }
                                    />
                                )}
                            </span>
                        ))}
                    </div>
                </>
            ) : (
                <div className="form-control form-control-sm bg-light">
                    {(formData[field] || []).length ? (formData[field] || []).join(", ") : "N/A"}
                </div>
            )}
        </div>
    );

    const renderEmergencyContact = (contactKey, title) => {
        const contact = formData[contactKey] || {};
        return (
            <div className="modal-card ">
                <div className="modal-card-header bg-light py-1">
                    <strong>{title}</strong>
                </div>
                <div className="modal-card-body py-2">
                    <div className="row">
                        <div className="col-md-4">{renderInputField("Name", `${contactKey}.name`, contact.name)}</div>
                        <div className="col-md-4">{renderInputField("Relation", `${contactKey}.relation`, contact.relation)}</div>
                        <div className="col-md-4">{renderInputField("Door No", `${contactKey}.address`, contact.address)}</div>
                    </div>
                    <div className="row">
                        <div className="col-md-4">{renderInputField("Village / Town", `${contactKey}.village`, contact.village)}</div>
                        <div className="col-md-4">{renderInputField("Mandal / Dist", `${contactKey}.mandal`, contact.mandal)}</div>
                        <div className="col-md-4">{renderInputField("State", `${contactKey}.state`, contact.state)}</div>
                    </div>
                    <div className="row">
                        <div className="col-md-4">{renderPhoneField("Mobile 1", `${contactKey}.mobile1`, contact.mobile1)}</div>
                        <div className="col-md-4">{renderPhoneField("Mobile 2", `${contactKey}.mobile2`, contact.mobile2)}</div>
                    </div>
                </div>
            </div>
        );
    };

    /* ------------------------------ Main UI --------------------------- */

    // Keep preview iframe in sync with data & tab
    useEffect(() => {
        if (activeTab === "biodata" && iframeRef.current) {
            const doc = iframeRef.current;
            // In view: show everything (hideSensitive=false)
            doc.srcdoc = buildBiodataHTML({ hideSensitive: false });
        }
    }, [activeTab, formData, status]);

    // Keep preview iframe in sync with data & tab
    useEffect(() => {
        if (activeTab === "full-data" && iframeRef.current) {
            const doc = iframeRef.current;
            // In view: show everything (hideSensitive=false)
            doc.srcdoc = buildFulldataHTML({ hideSensitive: false });
        }
    }, [activeTab, formData, status]);

    // Download uses the same renderer but hides sensitive fields
    const handleDownloadBiodata = () => {
        const html = buildBiodataHTML({ hideSensitive: true });

        // Create a blob from the HTML content
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);

        // Create a temporary anchor element for downloading
        const a = document.createElement('a');
        a.href = url;
        a.download = `Employee_Biodata_${formData.idNo || formData.employeeId || 'unknown'}.html`;
        document.body.appendChild(a);
        a.click();

        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    };

    // For better mobile compatibility, also provide a share option
    const handleShareBiodata = async () => {
        try {
            const html = buildBiodataHTML({ hideSensitive: true });
            const blob = new Blob([html], { type: 'text/html' });

            if (navigator.share) {
                // Mobile share API
                const file = new File([blob], `Employee_Biodata_${formData.idNo || formData.employeeId || 'unknown'}.html`,
                    { type: 'text/html' });

                await navigator.share({
                    title: 'Staff Biodata',
                    files: [file]
                });
            } else {
                // Fallback for desktop
                handleDownloadBiodata();
            }
        } catch (error) {
            console.error('Error sharing:', error);
            // Fallback to download if share fails
            handleDownloadBiodata();
        }
    };

    const modalClass = isEditMode ? "editEmployee" : "viewEmployee";

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

            {/* Removed / Returned Comments */}
            <div className="mb-3">
                <h5>Removed / Returned Comments</h5>
                {(formData.removalReason || formData.removalComment || formData.removedBy || formData.revertReason || formData.revertComment || formData.revertedBy || formData.__returnInfo) ? (
                    <div className="card p-2 mb-3">
                        {formData.removalReason && <div><strong>Removal Reason:</strong> {formData.removalReason}</div>}
                        {formData.removalComment && <div><strong>Removal Comment:</strong> {formData.removalComment}</div>}
                        {formData.removedBy && <div><strong>Removed By:</strong> {formData.removedBy} at {formData.removedAt ? new Date(formData.removedAt).toLocaleString() : ''}</div>}
                        {formData.revertReason && <div><strong>Revert Reason:</strong> {formData.revertReason}</div>}
                        {formData.revertComment && <div><strong>Revert Comment:</strong> {formData.revertComment}</div>}
                        {formData.revertedBy && <div><strong>Reverted By:</strong> {formData.revertedBy} at {formData.revertedAt ? new Date(formData.revertedAt).toLocaleString() : ''}</div>}
                        {formData.__returnInfo && <div><strong>Return Info:</strong> {formData.__returnInfo.reasonType} — {formData.__returnInfo.comment} <br /><small>By: {formData.__returnInfo.returnedBy || formData.__returnInfo.userStamp || ''} at {formData.__returnInfo.returnedAt || formData.__returnInfo.timestamp || ''}</small></div>}
                    </div>
                ) : (
                    <div className="text-muted">No removal or return comments.</div>
                )}
            </div>

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
                                {/* Basic */}
                                {activeTab === "basic" && (
                                    <div className="modal-card">
                                        {/* Status */}
                                        <div className="row  status">
                                            <div className="col-md-4">
                                                <label className="form-label">
                                                    <strong>Status</strong>
                                                </label>

                                                {isEditMode ? (
                                                    <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                                                        <option value="On Duty">On Duty</option>
                                                        <option value="Off Duty">Off Duty</option>
                                                        <option value="Resigned">Resigned</option>
                                                        <option value="Absconder">Absconder</option>
                                                        <option value="Terminated">Terminated</option>
                                                    </select>
                                                ) : (
                                                    <div>
                                                        <span
                                                            className={`badge px-3 py-2`}
                                                            style={{
                                                                fontSize: "1rem",
                                                                backgroundColor:
                                                                    status === "On Duty"
                                                                        ? "green"
                                                                        : status === "Off Duty"
                                                                            ? "gray"
                                                                            : status === "Terminated"
                                                                                ? "red"
                                                                                : status === "Resigned"
                                                                                    ? "brown"
                                                                                    : "red",
                                                                color: "white",
                                                            }}
                                                        >
                                                            {status}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="modal-card-header d-flex align-items-center justify-content-between">
                                            <h4 className="mb-0">Basic Information</h4>
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
                                            {/* Photo lives ONLY in Basic Info now */}
                                            <div className="row align-items-start">
                                                <div className="col-md-4">
                                                    <div className="">
                                                        <label className="form-label center">
                                                            <strong>Staff Photo</strong>
                                                        </label>
                                                        <div className="text-center">
                                                            {formData.employeePhotoUrl ? (
                                                                <img
                                                                    src={formData.employeePhotoUrl}
                                                                    alt="Staff"
                                                                    style={{ maxWidth: "300px", maxHeight: "300px", objectFit: "cover" }}
                                                                    className="rounded img-fluid "
                                                                />
                                                            ) : (
                                                                <div className="text-muted ">No photo selected</div>
                                                            )}

                                                            {isEditMode && (
                                                                <div className="d-flex flex-column align-items-center gap-2 mt-3">
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        onChange={handlePhotoChange}
                                                                        className="form-control"
                                                                        style={{ maxWidth: 320 }}
                                                                    />
                                                                    {formData.employeePhotoUrl && (
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-outline-secondary btn-sm"
                                                                            onClick={() =>
                                                                                setFormData((prev) => ({
                                                                                    ...prev,
                                                                                    employeePhotoFile: undefined,
                                                                                    employeePhotoUrl: null,
                                                                                }))
                                                                            }
                                                                        >
                                                                            Remove Photo
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-md-8">
                                                    <div className="row">
                                                        <div className="col-md-6">
                                                            {renderInputField("ID No", "idNo", formData.idNo || formData.employeeId, "text", "", true)}
                                                        </div>
                                                    </div>

                                                    <div className="row">
                                                        <div className="col-md-6">{renderInputField("First Name", "firstName", formData.firstName, "text", "", false, { disabled: lockBasic })}</div>
                                                        <div className="col-md-6">{renderInputField("Last Name", "lastName", formData.lastName, "text", "", false, { disabled: lockBasic })}</div>
                                                    </div>

                                                    <div className="row">
                                                        <div className="col-md-6">
                                                            {renderSelectField("Gender", "gender", formData.gender, [
                                                                { value: "Male", label: "Male" },
                                                                { value: "Female", label: "Female" },
                                                                { value: "Other", label: "Other" },
                                                            ], { disabled: lockBasic })}
                                                        </div>
                                                        <div className="col-md-6">{renderInputField("Care Of", "co", formData.co)}</div>
                                                    </div>

                                                    <div className="row">
                                                        <div className="col-md-6">
                                                            {renderInputField("Date of Birth", "dateOfBirth", formData.dateOfBirth, "date", "", false, {
                                                                min: DOB_MIN, max: DOB_MAX, disabled: lockBasic
                                                            })}
                                                        </div>
                                                        <div className="col-md-6">
                                                            {renderInputField("Age", "years", formData.years, "number")}
                                                        </div>
                                                    </div>
                                                    <div className="row">
                                                        <div className="col-md-4">
                                                            {renderInputField("Department", "department", formData.department, "text", "", false, { disabled: lockBasic })}
                                                        </div>
                                                        <div className="col-md-4">
                                                            {renderInputField("Designation", "designation", formData.designation, "text", "", false, { disabled: lockBasic })}
                                                        </div>
                                                        <div className="col-md-4">
                                                            {renderInputField("Role", "role", formData.role, "text", "", false, { disabled: lockBasic })}
                                                        </div>
                                                    </div>


                                                    <div className="row">
                                                        <div className="col-md-6">
                                                            {renderInputField("Aadhar No", "aadharNo", formData.aadharNo, "tel", "", false, {
                                                                inputMode: "numeric",
                                                                maxLength: 12,
                                                                pattern: "^[0-9]{12}$",
                                                            })}
                                                        </div>
                                                        <div className="col-md-6">{renderInputField("Local ID", "localId", formData.localId)}</div>
                                                    </div>

                                                    <div className="row">
                                                        <div className="col-md-6">{renderPhoneField("Mobile 1", "mobileNo1", formData.mobileNo1)}</div>
                                                        <div className="col-md-6">{renderPhoneField("Mobile 2", "mobileNo2", formData.mobileNo2)}</div>
                                                    </div>

                                                    <div className="row">
                                                        <div className="col-md-6">
                                                            {renderInputField("Date of Joining", "date", formData.date || formData.dateOfJoining, "date", "", false, { disabled: lockBasic })}
                                                        </div>
                                                        <div className="col-md-6">
                                                            {renderInputField("Page No", "pageNo", formData.pageNo)}
                                                        </div>
                                                    </div>

                                                    <div className="row">
                                                        <div className="col-md-6">
                                                            {renderInputField("Basic Salary", "basicSalary", formData.basicSalary, "number", "", false, { disabled: lockBasic })}
                                                        </div>
                                                        <div className="col-md-6">
                                                            {renderInputField("Allowance", "allowance", formData.allowance, "number")}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="row">
                                                    <div className="col-md-12">
                                                        <label className="form-label">
                                                            <strong>About Staff & Skills</strong>
                                                        </label>
                                                        {isEditMode ? (
                                                            <textarea
                                                                className="form-control"
                                                                name="aboutEmployeee"
                                                                value={formData.aboutEmployeee || ""}
                                                                onChange={handleInputChange}
                                                                rows="3"
                                                            />
                                                        ) : (
                                                            <div className="form-control bg-light">{String(formData.aboutEmployeee || "N/A")}</div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="row mt-3">
                                                    <h5>Return / Remove comments</h5>
                                                    <div className="history-section">
                                                        {(() => {
                                                            const entries = [];

                                                            // ✅ 1. Load history arrays if present
                                                            const removalHistory = staff?.removalHistory
                                                                ? Object.values(staff.removalHistory)
                                                                : [];
                                                            const returnHistory = staff?.returnHistory
                                                                ? Object.values(staff.returnHistory)
                                                                : [];

                                                            removalHistory.forEach((h) =>
                                                                entries.push({
                                                                    type: "Removal",
                                                                    reason: h.removalReason,
                                                                    comment: h.removalComment,
                                                                    user: h.removedBy,
                                                                    time: h.removedAt,
                                                                })
                                                            );

                                                            returnHistory.forEach((h) =>
                                                                entries.push({
                                                                    type: "Return",
                                                                    reason: h.reason,
                                                                    comment: h.comment,
                                                                    user: h.returnedBy || h.userStamp,
                                                                    time: h.returnedAt || h.timestamp,
                                                                })
                                                            );

                                                            // ✅ 2. Fallback to legacy formData (for older records)
                                                            if (formData?.removalReason || formData?.removalComment || formData?.removedBy) {
                                                                entries.push({
                                                                    type: "Removal",
                                                                    reason: formData.removalReason,
                                                                    comment: formData.removalComment,
                                                                    user: formData.removedBy,
                                                                    time: formData.removedAt,
                                                                });
                                                            }

                                                            if (formData?.revertReason || formData?.revertComment || formData?.revertedBy) {
                                                                entries.push({
                                                                    type: "Revert",
                                                                    reason: formData.revertReason,
                                                                    comment: formData.revertComment,
                                                                    user: formData.revertedBy,
                                                                    time: formData.revertedAt,
                                                                });
                                                            }

                                                            if (formData?.__returnInfo) {
                                                                entries.push({
                                                                    type: "Return",
                                                                    reason: formData.__returnInfo.reasonType,
                                                                    comment: formData.__returnInfo.comment,
                                                                    user: formData.__returnInfo.returnedBy || formData.__returnInfo.userStamp,
                                                                    time: formData.__returnInfo.returnedAt || formData.__returnInfo.timestamp,
                                                                });
                                                            }

                                                            // ✅ 3. Sort entries by time (latest first)
                                                            entries.sort((a, b) => new Date(b.time) - new Date(a.time));

                                                            if (entries.length === 0) {
                                                                return <div className="no-comments">No removed or returned comments.</div>;
                                                            }

                                                            return entries.map((e, idx) => (
                                                                <div className="action-comments" key={`${e.type}-${idx}`}>
                                                                    <div className="action-comments-header">
                                                                        <strong
                                                                            className={`action-type ${e.type === "Removal"
                                                                                ? "action-type-removal"
                                                                                : e.type === "Return"
                                                                                    ? "action-type-return"
                                                                                    : "action-type-revert"
                                                                                }`}
                                                                        >
                                                                            {e.type}
                                                                        </strong>

                                                                        {e.user && <span className="action-user">by {e.user}</span>}
                                                                        {e.time && (
                                                                            <span className="action-time">
                                                                                {new Date(e.time).toLocaleString()}
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    <div className="action-comments-body">
                                                                        {e.reason && (
                                                                            <div className="action-row">
                                                                                <span className="label">Reason:</span>
                                                                                <span className="value">{e.reason}</span>
                                                                            </div>
                                                                        )}

                                                                        {e.comment && (
                                                                            <div className="action-row">
                                                                                <span className="label">Comment:</span>
                                                                                <div className="value comment-text">{e.comment}</div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ));
                                                        })()}
                                                    </div>
                                                </div>

                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Address */}
                                {activeTab === "address" && (
                                    <>
                                        <div className="modal-card ">
                                            <div className="modal-card-header">
                                                <h4 className="mb-0">Permanent Address</h4>
                                            </div>
                                            <div className="modal-card-body">
                                                <div className="row">
                                                    <div className="col-md-4">{renderInputField("Door No", "permanentAddress", formData.permanentAddress)}</div>
                                                    <div className="col-md-4">{renderInputField("Street", "permanentStreet", formData.permanentStreet)}</div>
                                                    <div className="col-md-4">{renderInputField("Landmark", "permanentLandmark", formData.permanentLandmark)}</div>
                                                </div>
                                                <div className="row">
                                                    <div className="col-md-4">{renderInputField("Village / Town", "permanentVillage", formData.permanentVillage)}</div>
                                                    <div className="col-md-4">{renderInputField("Mandal", "permanentMandal", formData.permanentMandal)}</div>
                                                    <div className="col-md-4">{renderInputField("District", "permanentDistrict", formData.permanentDistrict)}</div>
                                                </div>
                                                <div className="row">
                                                    <div className="col-md-4">{renderInputField("State", "permanentState", formData.permanentState)}</div>
                                                    <div className="col-md-4">
                                                        {renderInputField("Pincode", "permanentPincode", formData.permanentPincode, "tel", "", false, {
                                                            inputMode: "numeric",
                                                            maxLength: 6,
                                                            pattern: "^[0-9]{6}$",
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <hr />
                                        <div className="modal-card ">
                                            <div className="modal-card-header">
                                                <h4 className="mb-0">Present Address</h4>
                                            </div>
                                            <div className="modal-card-body">
                                                <div className="row">
                                                    <div className="col-md-4">{renderInputField("Door No", "presentAddress", formData.presentAddress)}</div>
                                                    <div className="col-md-4">{renderInputField("Street", "presentStreet", formData.presentStreet)}</div>
                                                    <div className="col-md-4">{renderInputField("Landmark", "presentLandmark", formData.presentLandmark)}</div>
                                                </div>
                                                <div className="row">
                                                    <div className="col-md-4">{renderInputField("Village / Town", "presentVillage", formData.presentVillage)}</div>
                                                    <div className="col-md-4">{renderInputField("Mandal", "presentMandal", formData.presentMandal)}</div>
                                                    <div className="col-md-4">{renderInputField("District", "presentDistrict", formData.presentDistrict)}</div>
                                                </div>
                                                <div className="row">
                                                    <div className="col-md-4">{renderInputField("State", "presentState", formData.presentState)}</div>
                                                    <div className="col-md-4">
                                                        {renderInputField("Pincode", "presentPincode", formData.presentPincode, "tel", "", false, {
                                                            inputMode: "numeric",
                                                            maxLength: 6,
                                                            pattern: "^[0-9]{6}$",
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Personal */}
                                {activeTab === "personal" && (
                                    <div className="modal-card ">
                                        <div className="modal-card-header">
                                            <h4 className="mb-0">Personal Information</h4>
                                        </div>
                                        <div className="modal-card-body">
                                            <div className="row">
                                                <div className="col-md-4">
                                                    {renderSelectField("Marital Status", "maritalStatus", formData.maritalStatus, [
                                                        { value: "Single", label: "Single" },
                                                        { value: "Married", label: "Married" },
                                                        { value: "Divorced", label: "Divorced" },
                                                        { value: "Widowed", label: "Widowed" },
                                                    ])}
                                                </div>
                                                <div className="col-md-4">
                                                    {renderInputField("Date of Marriage", "dateOfMarriage", formData.dateOfMarriage, "date", "", false, {
                                                        min: DOM_MIN,
                                                        max: DOM_MAX,
                                                        disabled: formData.maritalStatus !== "Married",
                                                    })}
                                                </div>
                                                <div className="col-md-4">
                                                    {renderInputField("Marriage Years", "marriageYears", formData.marriageYears, "number", "", false, {
                                                        maxLength: 2,
                                                        inputMode: "numeric",
                                                    })}
                                                </div>
                                            </div>
                                            <div className="row">
                                                <div className="col-md-4">{renderInputField("Husband / Wife Name", "careOfPersonal", formData.careOfPersonal)}</div>
                                                <div className="col-md-4">{renderInputField("Child 1", "childName1", formData.childName1)}</div>
                                                <div className="col-md-4">{renderInputField("Child 2", "childName2", formData.childName2)}</div>
                                            </div>
                                            <div className="row">
                                                <div className="col-md-4">{renderInputField("Religion", "religion", formData.religion)}</div>
                                                <div className="col-md-4">{renderInputField("Caste", "cast", formData.cast)}</div>
                                                <div className="col-md-4">{renderInputField("Sub Caste", "subCast", formData.subCast)}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Qualification & Skills */}
                                {activeTab === "qualification" && (
                                    <div className="modal-card ">
                                        <div className="modal-card-header">
                                            <h4 className="mb-0">Qualification & Skills</h4>
                                        </div>
                                        <div className="modal-card-body">
                                            <div className="row">
                                                <div className="col-md-4">{renderInputField("Qualification", "qualification", formData.qualification)}</div>
                                                <div className="col-md-4">{renderInputField("School/College", "schoolCollege", formData.schoolCollege)}</div>
                                                <div className="col-md-4">{renderInputField("Primary Skill", "primarySkill", formData.primarySkill)}</div>
                                            </div>
                                            <div className="row">
                                                <div className="col-md-4">{renderArrayField("Secondary Skills", "secondarySkills", "Add secondary skill")}</div>
                                                <div className="col-md-4">{renderArrayField("Other Skills", "workingSkills", "Add skill")}</div>
                                                <div className="col-md-4">{renderInputField("Work Experience", "workExperince", formData.workExperince, "text")}</div>
                                            </div>
                                            <div className="row">
                                                <div className="col-md-4">{renderInputField("Mother Tongue", "motherTongue", formData.motherTongue)}</div>
                                                <div className="col-md-4">{renderInputField("Languages", "languages", formData.languages)}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Health */}
                                {activeTab === "health" && (
                                    <div className="modal-card ">
                                        <div className="modal-card-header">
                                            <h4 className="mb-0">Health Details</h4>
                                        </div>
                                        <div className="modal-card-body">
                                            <div className="row">
                                                <div className="col-md-6">{renderArrayField("Health Issues", "healthIssues", "Add health issue")}</div>
                                                <div className="col-md-6">{renderInputField("Other Issues", "otherIssues", formData.otherIssues)}</div>
                                                <div className="col-md-6">{renderInputField("Height", "otherIssues", formData.height)}</div>
                                                <div className="col-md-6">{renderInputField("Weight", "otherIssues", formData.weight)}</div>
                                                <div className="col-md-6">{renderInputField("Blood Group", "otherIssues", formData.bloodGroup)}</div>
                                                <div className="col-md-6">{renderInputField("Health Card No", "otherIssues", formData.healthCardNo)}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Emergency */}
                                {activeTab === "emergency" && (
                                    <div className="modal-card ">
                                        <div className="modal-card-header">
                                            <h4 className="mb-0">Emergency Contacts</h4>
                                        </div>
                                        <div className="modal-card-body">
                                            {renderEmergencyContact("emergencyContact1", "Emergency Contact 1")}
                                            {renderEmergencyContact("emergencyContact2", "Emergency Contact 2")}
                                            {renderEmergencyContact("emergencyContact3", "Emergency Contact 3")}
                                        </div>
                                    </div>
                                )}

                                {/* Job (Designation) */}
                                {activeTab === "job" && (
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
                                                    {/* Department — dropdown like Designation.jsx */}
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
                                                    {/* Designation — depends on department */}
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
                                )}


                                {/* Bank */}
                                {activeTab === "bank" && (
                                    <div className="modal-card ">
                                        <div className="modal-card-header">
                                            <h4 className="mb-0">Bank Details</h4>
                                        </div>
                                        <div className="modal-card-body">
                                            <div className="row">
                                                <div className="col-md-3">{renderInputField("Account No", "accountNo", formData.accountNo)}</div>
                                                <div className="col-md-3">{renderInputField("Bank Name", "bankName", formData.bankName)}</div>
                                                <div className="col-md-3">{renderInputField("Branch Name", "branchName", formData.branchName)}</div>
                                                <div className="col-md-3">{renderInputField("IFSC Code", "ifscCode", formData.ifscCode)}</div>
                                            </div>

                                            <div className="row">
                                                <div className="col-md-3">{renderPhoneField("Phone Pay Number", "phonePayNo", formData.phonePayNo)}</div>
                                                <div className="col-md-3">{renderInputField("Phone Pay Name", "phonePayName", formData.phonePayName)}</div>
                                                <div className="col-md-3">{renderPhoneField("Google Pay Number", "googlePayNo", formData.googlePayNo)}</div>
                                                <div className="col-md-3">{renderInputField("Google Pay Name", "googlePayName", formData.googlePayName)}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Payment */}
                                {activeTab === "payment" && (
                                    <div className="modal-card ">
                                        <div className="modal-card-header">
                                            <h4 className="mb-0">Payment</h4>
                                        </div>
                                        <div className="modal-card-body">
                                            {(formData.payments || []).map((p, i) => {
                                                const locked = !!p.__locked;
                                                const invalidClass = (field) => (paymentErrors[i]?.[field] ? " is-invalid" : "");
                                                return (
                                                    <div key={i} className="border rounded p-3 ">
                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                            <h6 className="mb-0">
                                                                Payment #{i + 1} {locked && <span className="badge bg-secondary ms-2">Locked</span>}
                                                            </h6>
                                                            {isEditMode && !locked && (
                                                                <button className="btn btn-outline-danger btn-sm" onClick={() => removePaymentSection(i)}>
                                                                    Remove
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="row">
                                                            <div className="col-md-4 mb-2">
                                                                <label className="form-label">
                                                                    <strong>Date</strong>
                                                                    <span className="star">*</span>
                                                                </label>
                                                                {isEditMode ? (
                                                                    <input
                                                                        type="date"
                                                                        className={`form-control form-control-sm${invalidClass("date")}`}
                                                                        value={p.date || ""}
                                                                        min={PAY_MIN}
                                                                        max={PAY_MAX}
                                                                        onChange={(e) => handleArrayChange("payments", i, "date", e.target.value)}
                                                                        disabled={locked}
                                                                    />
                                                                ) : (
                                                                    <div className="form-control form-control-sm bg-light">{p.date || "N/A"}</div>
                                                                )}
                                                                <Err msg={paymentErrors[i]?.date} />
                                                            </div>

                                                            <div className="col-md-4 mb-2">
                                                                <label className="form-label">
                                                                    <strong>Amount</strong>
                                                                    <span className="star">*</span>
                                                                </label>
                                                                {isEditMode ? (
                                                                    <input
                                                                        type="tel"
                                                                        inputMode="numeric"
                                                                        maxLength={5}
                                                                        pattern="^[0-9]{1,5}$"
                                                                        className={`form-control form-control-sm${invalidClass("amount")}`}
                                                                        value={p.amount || ""}
                                                                        onChange={(e) => handleArrayChange("payments", i, "amount", e.target.value)}
                                                                        disabled={locked}
                                                                    />
                                                                ) : (
                                                                    <div className="form-control form-control-sm bg-light">{p.amount || "N/A"}</div>
                                                                )}
                                                                <Err msg={paymentErrors[i]?.amount} />
                                                            </div>

                                                            <div className="col-md-4 mb-2">
                                                                <label className="form-label">
                                                                    <strong>Balance Amount</strong>
                                                                </label>
                                                                {isEditMode ? (
                                                                    <input
                                                                        type="tel"
                                                                        inputMode="numeric"
                                                                        pattern="^[0-9]+$"
                                                                        className={`form-control form-control-sm${invalidClass("balanceAmount")}`}
                                                                        value={p.balanceAmount || ""}
                                                                        onChange={(e) => handleArrayChange("payments", i, "balanceAmount", e.target.value)}
                                                                        disabled={locked}
                                                                        maxLength={5}
                                                                    />
                                                                ) : (
                                                                    <div className="form-control form-control-sm bg-light">{p.balanceAmount || "N/A"}</div>
                                                                )}
                                                                <Err msg={paymentErrors[i]?.balanceAmount} />
                                                            </div>
                                                        </div>

                                                        <div className="row">
                                                            <div className="col-md-4 mb-2">
                                                                <label className="form-label">
                                                                    <strong>Type of payment</strong>
                                                                    <span className="star">*</span>
                                                                </label>
                                                                {isEditMode ? (
                                                                    <select
                                                                        className={`form-select ${invalidClass("typeOfPayment")}`}
                                                                        value={p.typeOfPayment || ""}
                                                                        onChange={(e) => handleArrayChange("payments", i, "typeOfPayment", e.target.value)}
                                                                        disabled={locked}
                                                                    >
                                                                        <option value="">Select</option>
                                                                        <option value="cash">Cash</option>
                                                                        <option value="online">Online</option>
                                                                        <option value="cheque">Cheque</option>
                                                                    </select>
                                                                ) : (
                                                                    <div className="form-control form-control-sm bg-light">{p.typeOfPayment || "N/A"}</div>
                                                                )}
                                                                <Err msg={paymentErrors[i]?.typeOfPayment} />
                                                            </div>

                                                            <div className="col-md-4 mb-2">
                                                                <label className="form-label">
                                                                    <strong>Payment For</strong>
                                                                    <span className="star">*</span>
                                                                </label>
                                                                {isEditMode ? (
                                                                    <select
                                                                        className={`form-select ${invalidClass("status")}`}
                                                                        value={p.status || ""}
                                                                        onChange={(e) => handleArrayChange("payments", i, "status", e.target.value)}
                                                                        disabled={locked}
                                                                    >
                                                                        <option value="" disabled>
                                                                            Select
                                                                        </option>
                                                                        <option value="salary">Salary</option>
                                                                        <option value="advance">Advance</option>
                                                                        <option value="commition">Commition</option>
                                                                        <option value="bonus">Bonus</option>
                                                                    </select>
                                                                ) : (
                                                                    <div className="form-control form-control-sm bg-light">{p.status || "N/A"}</div>
                                                                )}
                                                                <Err msg={paymentErrors[i]?.status} />
                                                            </div>

                                                            <div className="col-md-4 mb-2">
                                                                <label className="form-label">
                                                                    <strong>Receipt No</strong>
                                                                </label>
                                                                {isEditMode ? (
                                                                    <input
                                                                        type="tel"
                                                                        className="form-control form-control-sm"
                                                                        value={p.receiptNo || ""}
                                                                        onChange={(e) => handleArrayChange("payments", i, "receiptNo", e.target.value)}
                                                                        disabled={locked}
                                                                        maxLength={3}
                                                                    />
                                                                ) : (
                                                                    <div className="form-control form-control-sm bg-light">{p.receiptNo || "N/A"}</div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="row">
                                                            <div className="col-md-4 mb-2">
                                                                <label className="form-label">
                                                                    <strong>Total Days</strong>
                                                                    <span className="star">*</span>
                                                                </label>
                                                                {isEditMode ? (
                                                                    <input
                                                                        type="tel"
                                                                        maxLength={2}
                                                                        className={`form-control form-control-sm${invalidClass("clientName")}`}
                                                                        value={p.clientName || ""}
                                                                        onChange={(e) => handleArrayChange("payments", i, "clientName", e.target.value)}
                                                                        disabled={locked}
                                                                    />
                                                                ) : (
                                                                    <div className="form-control form-control-sm bg-light">{p.clientName || "N/A"}</div>
                                                                )}
                                                                <Err msg={paymentErrors[i]?.clientName} />
                                                            </div>

                                                            <div className="col-md-4 mb-2">
                                                                <label className="form-label">
                                                                    <strong>Worked Days</strong>
                                                                    <span className="star">*</span>
                                                                </label>
                                                                {isEditMode ? (
                                                                    <input
                                                                        type="tel"
                                                                        className={`form-control form-control-sm${invalidClass("days")}`}
                                                                        value={p.days || ""}
                                                                        onChange={(e) => handleArrayChange("payments", i, "days", e.target.value)}
                                                                        disabled={locked}
                                                                        maxLength={2}
                                                                    />
                                                                ) : (
                                                                    <div className="form-control form-control-sm bg-light">{p.days || "N/A"}</div>
                                                                )}
                                                                <Err msg={paymentErrors[i]?.days} />
                                                            </div>

                                                            <div className="col-md-4 mb-2">
                                                                <label className="form-label">
                                                                    <strong>Book No</strong>
                                                                </label>
                                                                {isEditMode ? (
                                                                    <input
                                                                        type="tel"
                                                                        className="form-control form-control-sm"
                                                                        value={p.bookNo || ""}
                                                                        onChange={(e) => handleArrayChange("payments", i, "bookNo", e.target.value)}
                                                                        disabled={locked}
                                                                        maxLength={3}
                                                                    />
                                                                ) : (
                                                                    <div className="form-control form-control-sm bg-light">{p.bookNo || "N/A"}</div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="row">
                                                            <div className="col-12 mb-2">
                                                                <label className="form-label">
                                                                    <strong>Remarks</strong>
                                                                </label>
                                                                {isEditMode ? (
                                                                    <textarea
                                                                        className="form-control form-control-sm"
                                                                        rows={2}
                                                                        value={p.remarks || ""}
                                                                        onChange={(e) => handleArrayChange("payments", i, "remarks", e.target.value)}
                                                                        disabled={locked}
                                                                    />
                                                                ) : (
                                                                    <div className="form-control form-control-sm bg-light">{p.remarks || "N/A"}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {isEditMode && (
                                                <div className="d-flex justify-content-end">
                                                    <button className="btn btn-outline-primary btn-sm mt-2" onClick={addPaymentSection}>
                                                        + Add Payment
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Working */}
                                {activeTab === "working" && (
                                    <div className="modal-card ">
                                        <div className="modal-card-header">
                                            <h4 className="mb-0">Working Details</h4>
                                        </div>
                                        <div className="modal-card-body">
                                            {(formData.workDetails || []).map((w, i) => {
                                                const locked = !!w.__locked;
                                                const invalidClass = (field) => (workErrors[i]?.[field] ? " is-invalid" : "");
                                                return (
                                                    <div key={i} className="border rounded p-3 ">
                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                            <h6 className="mb-0">
                                                                Work #{i + 1} {locked && <span className="badge bg-secondary ms-2">Locked</span>}
                                                            </h6>
                                                            {isEditMode && !locked && (
                                                                <button className="btn btn-outline-danger btn-sm" onClick={() => removeWorkSection(i)}>
                                                                    Remove
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="row">
                                                            <div className="col-md-4 mb-2">
                                                                <label className="form-label">
                                                                    <strong>Client ID</strong>
                                                                    <span className="star">*</span>
                                                                </label>
                                                                {isEditMode ? (
                                                                    <input
                                                                        type="text"
                                                                        className={`form-control form-control-sm${invalidClass("clientId")}`}
                                                                        value={w.clientId || ""}
                                                                        onChange={(e) => handleArrayChange("workDetails", i, "clientId", e.target.value)}
                                                                        disabled={locked}
                                                                    />
                                                                ) : (
                                                                    <div className="form-control form-control-sm bg-light">{w.clientId || "N/A"}</div>
                                                                )}
                                                                <Err msg={workErrors[i]?.clientId} />
                                                            </div>

                                                            <div className="col-md-4 mb-2">
                                                                <label className="form-label">
                                                                    <strong>Client Name</strong>
                                                                    <span className="star">*</span>
                                                                </label>
                                                                {isEditMode ? (
                                                                    <input
                                                                        type="text"
                                                                        className={`form-control form-control-sm${invalidClass("clientName")}`}
                                                                        value={w.clientName || ""}
                                                                        onChange={(e) => handleArrayChange("workDetails", i, "clientName", e.target.value)}
                                                                        disabled={locked}
                                                                    />
                                                                ) : (
                                                                    <div className="form-control form-control-sm bg-light">{w.clientName || "N/A"}</div>
                                                                )}
                                                                <Err msg={workErrors[i]?.clientName} />
                                                            </div>

                                                            <div className="col-md-4 mb-2">
                                                                <label className="form-label">
                                                                    <strong>Location</strong>
                                                                </label>
                                                                {isEditMode ? (
                                                                    <input
                                                                        type="text"
                                                                        className="form-control form-control-sm"
                                                                        value={w.location || ""}
                                                                        onChange={(e) => handleArrayChange("workDetails", i, "location", e.target.value)}
                                                                        disabled={locked}
                                                                    />
                                                                ) : (
                                                                    <div className="form-control form-control-sm bg-light">{w.location || "N/A"}</div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="row">
                                                            <div className="col-md-4 mb-2">
                                                                <label className="form-label">
                                                                    <strong>Days</strong>
                                                                    <span className="star">*</span>
                                                                </label>
                                                                {isEditMode ? (
                                                                    <input
                                                                        type="number"
                                                                        className={`form-control form-control-sm${invalidClass("days")}`}
                                                                        value={w.days || ""}
                                                                        onChange={(e) => handleArrayChange("workDetails", i, "days", e.target.value)}
                                                                        disabled={locked}
                                                                    />
                                                                ) : (
                                                                    <div className="form-control form-control-sm bg-light">{w.days || "N/A"}</div>
                                                                )}
                                                                <Err msg={workErrors[i]?.days} />
                                                            </div>

                                                            <div className="col-md-4 mb-2">
                                                                <label className="form-label">
                                                                    <strong>From Date</strong>
                                                                    <span className="star">*</span>
                                                                </label>
                                                                {isEditMode ? (
                                                                    <input
                                                                        type="date"
                                                                        className={`form-control form-control-sm${invalidClass("fromDate")}`}
                                                                        value={w.fromDate || ""}
                                                                        onChange={(e) => handleArrayChange("workDetails", i, "fromDate", e.target.value)}
                                                                        disabled={locked}
                                                                    />
                                                                ) : (
                                                                    <div className="form-control form-control-sm bg-light">{w.fromDate || "N/A"}</div>
                                                                )}
                                                                <Err msg={workErrors[i]?.fromDate} />
                                                            </div>

                                                            <div className="col-md-4 mb-2">
                                                                <label className="form-label">
                                                                    <strong>To Date</strong>
                                                                    <span className="star">*</span>
                                                                </label>
                                                                {isEditMode ? (
                                                                    <input
                                                                        type="date"
                                                                        className={`form-control form-control-sm${invalidClass("toDate")}`}
                                                                        value={w.toDate || ""}
                                                                        onChange={(e) => handleArrayChange("workDetails", i, "toDate", e.target.value)}
                                                                        disabled={locked}
                                                                    />
                                                                ) : (
                                                                    <div className="form-control form-control-sm bg-light">{w.toDate || "N/A"}</div>
                                                                )}
                                                                <Err msg={workErrors[i]?.toDate} />
                                                            </div>
                                                        </div>

                                                        <div className="row">
                                                            <div className="col-md-6 mb-2">
                                                                <label className="form-label">
                                                                    <strong>Service Type</strong>
                                                                    <span className="star">*</span>
                                                                </label>
                                                                {isEditMode ? (
                                                                    <input
                                                                        type="text"
                                                                        className={`form-control form-control-sm${invalidClass("serviceType")}`}
                                                                        value={w.serviceType || ""}
                                                                        onChange={(e) => handleArrayChange("workDetails", i, "serviceType", e.target.value)}
                                                                        disabled={locked}
                                                                    />
                                                                ) : (
                                                                    <div className="form-control form-control-sm bg-light">{w.serviceType || "N/A"}</div>
                                                                )}
                                                                <Err msg={workErrors[i]?.serviceType} />
                                                            </div>

                                                            <div className="col-md-6 mb-2">
                                                                <label className="form-label">
                                                                    <strong>Remarks</strong>
                                                                </label>
                                                                {isEditMode ? (
                                                                    <input
                                                                        type="text"
                                                                        className="form-control form-control-sm"
                                                                        value={w.remarks || ""}
                                                                        onChange={(e) => handleArrayChange("workDetails", i, "remarks", e.target.value)}
                                                                        disabled={locked}
                                                                    />
                                                                ) : (
                                                                    <div className="form-control form-control-sm bg-light">{w.remarks || "N/A"}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {isEditMode && (
                                                <div className="d-flex justify-content-end">
                                                    <button className="btn btn-outline-primary btn-sm mt-2" onClick={addWorkSection}>
                                                        + Add Work
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Full Info */}
                                {activeTab === "pay-info" && (
                                    <div className="modal-card ">
                                        <div className="modal-card-header">
                                            <h4 className="mb-0">Full Info</h4>
                                        </div>
                                        <div className="modal-card-body">
                                            <h5>Payment Details</h5>
                                            {hasPayments() ? (
                                                <div className="table-responsive mb-3">
                                                    <table className="table table-sm table-bordered table-dark table-hover">
                                                        <thead><tr><th>Date</th><th>Client</th><th>Days</th><th>Amount</th><th>Balance</th><th>Type</th><th>Receipt</th><th>Remarks</th></tr></thead>
                                                        <tbody>
                                                            {(formData.payments || []).map((p, i) => (
                                                                <tr key={i}>
                                                                    <td>{p.date || "N/A"}</td>
                                                                    <td>{p.clientName || "N/A"}</td>
                                                                    <td>{p.days || "N/A"}</td>
                                                                    <td>{p.amount || 0}</td>
                                                                    <td>{p.balanceAmount || 0}</td>
                                                                    <td>{p.typeOfPayment || "N/A"}</td>
                                                                    <td>{p.receiptNo || "N/A"}</td>
                                                                    <td>{p.remarks || "N/A"}</td>
                                                                </tr>
                                                            ))}

                                                            {/* Totals Row */}
                                                            {(formData.payments || []).length > 0 && (() => {
                                                                const totalAmount = (formData.payments || []).reduce(
                                                                    (sum, p) => sum + (parseFloat(p.amount) || 0),
                                                                    0
                                                                );
                                                                const totalBalance = (formData.payments || []).reduce(
                                                                    (sum, p) => sum + (parseFloat(p.balanceAmount) || 0),
                                                                    0
                                                                );
                                                                const count = (formData.payments || []).length;

                                                                return (
                                                                    <tr className="fw-bold">
                                                                        <td colSpan="3" className="text-end">Totals:</td>
                                                                        <td>{totalAmount}</td>
                                                                        <td>{totalBalance}</td>
                                                                        <td colSpan="3">Payments Count: {count}</td>
                                                                    </tr>
                                                                );
                                                            })()}
                                                        </tbody>

                                                    </table>
                                                </div>
                                            ) : (<div className="text-muted">No payment records available.</div>)}

                                            <h5>Work Details</h5>
                                            {hasWorkDetails() ? (
                                                <div className="table-responsive mb-3">
                                                    <table className="table table-sm table-bordered table-dark table-hover">
                                                        <thead><tr><th>Client ID</th><th>Client Name</th><th>Location</th><th>From</th><th>To</th><th>Days</th><th>Service</th></tr></thead>
                                                        <tbody>
                                                            {(formData.workDetails || []).map((w, i) => (
                                                                <tr key={i}>
                                                                    <td>{w.clientId || 'N/A'}</td>
                                                                    <td>{w.clientName || 'N/A'}</td>
                                                                    <td>{w.location || 'N/A'}</td>
                                                                    <td>{w.fromDate || 'N/A'}</td>
                                                                    <td>{w.toDate || 'N/A'}</td>
                                                                    <td>{w.days || 'N/A'}</td>
                                                                    <td>{w.serviceType || 'N/A'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (<div className="text-muted">No work records available.</div>)}
                                        </div>
                                    </div>
                                )}

                                {/* Full Data Info */}
                                {activeTab === "full-data" && (
                                    <div className="modal-card ">
                                        <div className="modal-card-header d-flex align-items-center justify-content-between">
                                            <h4 className="mb-0">Biodata Full Details (Preview)</h4>

                                        </div>

                                        <div className="modal-card-body biodata-wrapper">
                                            <iframe
                                                ref={iframeRef}
                                                title="Full Data Preview"
                                                style={{ width: "100%", height: "900px", border: "1px solid #e5e5e5", borderRadius: 8 }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Biodata */}
                                {activeTab === "biodata" && (
                                    <div className="modal-card ">
                                        <div className="modal-card-header d-flex align-items-center justify-content-between">
                                            <h4 className="mb-0">Biodata (Preview)</h4>
                                            <div className="d-flex gap-2">
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-primary btn-sm"
                                                    onClick={handleDownloadBiodata}
                                                >
                                                    Download
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-info btn-sm"
                                                    onClick={handleShareBiodata}
                                                >
                                                    Share
                                                </button>
                                            </div>
                                        </div>

                                        <div className="modal-card-body biodata-wrapper">
                                            <iframe
                                                ref={iframeRef}
                                                title="Biodata Preview"
                                                style={{ width: "100%", height: "900px", border: "1px solid #e5e5e5", borderRadius: 8 }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer buttons */}
                            <div className="d-flex gap-2 justify-content-end hideInView">
                                {/* {onDelete && isEditMode && (
                                    <button type="button" className="btn btn-danger" onClick={handleDelete}>
                                        Delete
                                    </button>
                                )} */}
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

{/*

THIS CODDE FOR FULL DATA SALARY DETAILS
    
<div class="kv-row"><div class="kv-label">Superior ID</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.superiorId)}</div></div>
<div class="kv-row"><div class="kv-label">Superior Name</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.superiorName)}</div></div>
<div class="kv-row"><div class="kv-label">Basic Salary</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.basicSalary)}</div></div>
<div class="kv-row"><div class="kv-label">Allowance</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.allowance)}</div></div>
<div class="kv-row"><div class="kv-label">HRA</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.hra)}</div></div>
<div class="kv-row"><div class="kv-label">Travel Allowance</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.travelAllowance)}</div></div>
    
    */}
