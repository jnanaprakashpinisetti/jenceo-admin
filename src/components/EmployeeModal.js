import React, { useState, useEffect, useRef } from "react";
import { storageRef, uploadFile, getDownloadURL } from "../firebase";
import BioDataHeader from '../assets/biodata-header.svg'

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
            <div className="card shadow-lg" style={{ width: "min(720px, 92vw)" }}>
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
        </div>
    </BaseModal>
);

/* --------------------------------- Component --------------------------------- */
const EmployeeModal = ({ employee, isOpen, onClose, onSave, onDelete, isEditMode }) => {
    const [formData, setFormData] = useState({});
    const [status, setStatus] = useState("On Duty");
    const [activeTab, setActiveTab] = useState("basic");
    const biodataRef = useRef(null)

    // validation errors (array per row)
    const [paymentErrors, setPaymentErrors] = useState([{}]);
    const [workErrors, setWorkErrors] = useState([{}]);

    // modal states
    const [alertState, setAlertState] = useState({ open: false, title: "", variant: "info", body: null });
    const [confirmState, setConfirmState] = useState({ open: false, title: "", message: "", onConfirm: null });

    const openAlert = (title, body, variant = "info") => setAlertState({ open: true, title, body, variant });
    const closeAlert = () => setAlertState((s) => ({ ...s, open: false }));

    const openConfirm = (title, message, onConfirm) => setConfirmState({ open: true, title, message, onConfirm });
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
        if (employee) {
            const paymentsInit =
                Array.isArray(employee.payments) && employee.payments.length ? lockIfFilled(employee.payments) : [blankPayment()];
            const workInit =
                Array.isArray(employee.workDetails) && employee.workDetails.length ? lockIfFilled(employee.workDetails) : [blankWork()];

            setFormData({
                ...employee,
                secondarySkills: employee.secondarySkills || [],
                allowance: employee.allowance ?? "",
                pageNo: employee.pageNo ?? "",
                basicSalary: employee.basicSalary ?? "",
                payments: paymentsInit.map((p) => ({ balanceAmount: "", receiptNo: "", ...p })), // add new keys if missing
                workDetails: workInit,
                // Store the photo URL for display
                employeePhotoUrl: employee.employeePhoto || null,
            });

            setStatus(employee.status || "On Duty");
            setPaymentErrors(paymentsInit.map(() => ({})));
            setWorkErrors(workInit.map(() => ({})));
        }
    }, [employee]);

    // Handle photo upload to Firebase Storage
    const handlePhotoUpload = async (file) => {
        try {
            const timestamp = Date.now();
            const fileExtension = file.name.split(".").pop();
            const fileName = `employee-photos/${formData.idNo || formData.employeeId || "employee"}-${timestamp}.${fileExtension}`;
            const fileRef = storageRef.child(fileName);
            const snapshot = await uploadFile(fileRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            return downloadURL;
        } catch (error) {
            console.error("Error uploading image:", error);
            throw new Error("Failed to upload image. Please try again.");
        }
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
            if (file.size > 2 * 1024 * 1024) {
                openAlert("File Too Large", "Image size should be less than 2MB", "danger");
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

    if (!isOpen) return null;

    /* -------------------------------- Handlers --------------------------------- */
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => (name.includes(".") ? setNested(prev || {}, name, value) : { ...prev, [name]: value }));
    };

    const handleArrayChange = (section, index, field, value) => {
        // Hard sanitization for some fields
        let val = value;
        if (section === "payments") {
            if (field === "amount") {
                val = String(value || "").replace(/\D/g, "").slice(0, 5); // max 5 digits, numeric only
            } else if (field === "balanceAmount") {
                val = String(value || "").replace(/\D/g, ""); // numeric only
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

        // clear field error on user input
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
            if (list[index]?.__locked) return prev; // cannot remove locked
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
            if (list[index]?.__locked) return prev; // cannot remove locked
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
        if (formData.mobileNo1 && !mobilePattern.test(String(formData.mobileNo1)))
            errs.push("Mobile 1 must be a 10-digit number.");
        if (formData.mobileNo2 && !mobilePattern.test(String(formData.mobileNo2)))
            errs.push("Mobile 2 must be a 10-digit number.");

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

    /* --------------------------------- Actions --------------------------------- */
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

            onSave(payload);

            setFormData((prev) => {
                const updated = { ...prev };
                if (activeTab === "payment") updated.payments = lockIfFilled(prev.payments);
                else if (activeTab === "working") updated.workDetails = lockIfFilled(prev.workDetails);
                return updated;
            });

            openAlert("Saved", <span>Changes have been saved successfully.</span>, "success");
        } catch (error) {
            openAlert("Error", <span>Failed to save changes: {error.message}</span>, "danger");
        }
    };

    const handleDelete = () => {
        openConfirm(
            "Delete Employee",
            "Are you sure you want to delete this employee? This action cannot be undone.",
            () => {
                closeConfirm();
                onDelete && onDelete(formData.id || formData.employeeId);
                openAlert("Deleted", <span>Employee has been deleted successfully.</span>, "success");
            }
        );
    };

    /* ------------------------------ render helpers ----------------------------- */
    const Err = ({ msg }) => (msg ? <div className="text-danger mt-1" style={{ fontSize: ".85rem" }}>{msg}</div> : null);

    // Generic text/select input (edit mode shows input; view mode shows plain text)
    const renderInputField = (
        label,
        name,
        value,
        type = "text",
        placeholder = "",
        hardDisabled = false,
        extraProps = {}
    ) => (
        <div className="mb-3">
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

    // Phone input that becomes a tel: link in view mode
    const renderPhoneField = (label, name, value, extraProps = {}) => {
        const digitsOnly = String(value || "").replace(/\D/g, "");
        const canCall = !!digitsOnly;
        return (
            <div className="mb-3">
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
                    <div className="form-control form-control-sm bg-light d-flex justify-content-between align-items-center">
                        <span>{value || "N/A"}</span>
                        {canCall && (
                            <a href={`tel:${digitsOnly}`} className="btn btn-sm btn-outline-primary">
                                Call
                            </a>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderSelectField = (label, name, value, options) => (
        <div className="mb-3">
            <label className="form-label">
                <strong>{label}</strong>
            </label>
            {isEditMode ? (
                <select className="form-select " name={name} value={value || ""} onChange={handleInputChange}>
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
        <div className="mb-3">
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
                                if (e.key === "Enter" && e.currentTarget.value) {
                                    const currentArray = formData[field] || [];
                                    if (!currentArray.includes(e.currentTarget.value)) {
                                        setFormData((prev) => ({ ...prev, [field]: [...currentArray, e.currentTarget.value] }));
                                    }
                                    e.currentTarget.value = "";
                                    e.preventDefault();
                                }
                            }}
                            disabled={!isEditMode}
                        />
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
            <div className="modal-card mb-3">
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
                        <div className="col-md-4">
                            {renderPhoneField("Mobile 1", `${contactKey}.mobile1`, contact.mobile1)}
                        </div>
                        <div className="col-md-4">
                            {renderPhoneField("Mobile 2", `${contactKey}.mobile2`, contact.mobile2)}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    /* ------------------------------ BIODATA (Bodata) --------------------------- */


    const formatLine = (...parts) => parts.filter(Boolean).join(" ");
    const safe = (v, fallback = "—") => (v !== undefined && v !== null && String(v).trim() !== "" ? v : fallback);

    const buildBiodataHTML = () => {
        const fullName = formatLine(safe(formData.firstName, ""), safe(formData.lastName, "")).trim() || "—";
        const ageText = formData.years ? `${formData.years} Years` : "—";
        const dobText = formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString() : "—";
        const gender = safe(formData.gender);
        const marital = safe(formData.maritalStatus);
        const co = safe(formData.co || formData.careOfPersonal);

        const permAddr = [
            `D.No: ${safe(formData.permanentAddress)}`,
            `Street: ${safe(formData.permanentStreet)}`,
            `Landmark: ${safe(formData.permanentLandmark)}`,
            `Village / Town ${safe(formData.permanentVillage)}`,
            `Mandal: ${safe(formData.permanentMandal)}`,
            `District: ${safe(formData.permanentDistrict)}`,
            `State: ${safe(formData.permanentState)}${formData.permanentPincode ? " - " + formData.permanentPincode : ""}`,
        ];

        const presentAddr = [
            `D.No: ${safe(formData.presentAddress)}`,
            `Street: ${safe(formData.presentStreet)}`,
            `Landmark: ${safe(formData.presentLandmark)}`,
            `Village / Town ${safe(formData.presentVillage)}`,
            `Mandal: ${safe(formData.presentMandal)}`,
            `District: ${safe(formData.presentDistrict)}`,
            `State: ${safe(formData.presentState)}${formData.presentPincode ? " - " + formData.presentPincode : ""}`,
        ];

        const qual = safe(formData.qualification);
        const college = safe(formData.schoolCollege);
        const pskill = safe(formData.primarySkill);
        const mtongue = safe(formData.motherTongue || formData.motherTung); // allow common spelling
        const langs = safe(formData.languages);
        const skills = (formData.secondarySkills || []).concat(formData.workingSkills || []);

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

        const row2 = (label1, value1, label2, value2) => `
            <div class="row">
                <div class="col"><span class="lbl">${label1}:</span> <span class="val">${value1}</span></div>
                <div class="col"><span class="lbl">${label2}:</span> <span class="val">${value2}</span></div>
            </div>
        `;

        const addressBlock = (heading, lines) => `
            <div class="addr">
                <div class="addr-title">${heading}</div>
                ${lines.map((l) => `<div class="addr-line">${l}</div>`).join("")}
            </div>
        `;

        const skillsBlock = skills.length
            ? `<div class="tags">${skills
                .filter(Boolean)
                .map((s) => `<span class="tag">${String(s).trim()}</span>`)
                .join("")}</div>`
            : `<div class="muted">—</div>`;

        const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Employee Biodata - ${fullName}</title>
<style>
*{box-sizing:border-box} html,body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#111}
.page{width: 794px; /* A4 width at 96 DPI */
      margin:16px auto; background:#fff; border:1px solid #e5e5e5; padding:20px}
.header{display:flex; align-items:flex-start; justify-content:space-between; gap:12px; border-bottom:2px solid #222; padding-bottom:10px}
.h-left{flex:1}
.title{font-size:20px; font-weight:700; letter-spacing:.5px}
.subtitle{font-size:12px; color:#444; margin-top:2px}
.meta{font-size:11px; color:#555; margin-top:4px; display:flex; gap:14px; flex-wrap:wrap}
.sec{margin-top:14px; border:1px solid #ddd; border-radius:6px; overflow:hidden}
.sec-title{background:#f3f4f6; padding:8px 10px; font-weight:700}
.sec-body{padding:10px}
.row{display:flex; gap:12px; margin-bottom:6px}
.col{flex:1}
.lbl{font-weight:600}
.val{font-weight:500}
.addr{border:1px dashed #c9c9c9; border-radius:6px; padding:8px; margin-top:6px}
.addr-title{font-weight:700; margin-bottom:4px}
.addr-line{font-size:12px; line-height:1.4}
.grid2{display:grid; grid-template-columns:1fr 1fr; gap:10px}
.tags{display:flex; flex-wrap:wrap; gap:6px}
.tag{background:#eef2ff; border:1px solid #c7d2fe; color:#1e3a8a; font-size:12px; padding:3px 8px; border-radius:999px}
.muted{color:#777}
.footer{margin-top:14px; font-size:11px; color:#666; display:flex; justify-content:space-between}
.badge{display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; color:#fff}
.badge.green{background:#16a34a}
.badge.gray{background:#6b7280}
.badge.red{background:#dc2626}
.badge.brown{background:#7c3a1d}
.badge.orange{background:#ea580c}
@media print{
  .page{border:none; margin:0; width:100%}
}
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="h-left">
      <div class="title">EMPLOYEE BIO-DATA</div>
      <div class="subtitle">H.R Department (Reg No: SEA/HYD/ALO/26/1040178/2025)</div>
      <div class="meta">
         <div><strong>ID:</strong> ${safe(formData.idNo || formData.employeeId)}</div>
         <div><strong>Date:</strong> ${metaDate}</div>
      </div>
    </div>
    <div class="h-right">${photoHtml}</div>
  </div>

  ${section(
            "Basic Information",
            `
      <div class="grid2">
        <div>
          ${row2("Full Name", fullName, "Age", ageText)}
          ${row2("Gender", gender, "Date of Birth", dobText)}
          ${row2("C/O", co, "Marital Status", marital)}
        </div>
        <div>
          <div style="margin-bottom:6px"><span class="lbl">Status:</span>
            <span class="badge ${status === "On Duty" ? "green" : status === "Off Duty" ? "gray" : status === "Resigned" ? "brown" : status === "Terminated" ? "red" : "orange"}">
              ${safe(status, "—")}
            </span>
          </div>
          <div><span class="lbl">Mobile 1:</span> <span class="val">${safe(formData.mobileNo1)}</span></div>
          <div><span class="lbl">Mobile 2:</span> <span class="val">${safe(formData.mobileNo2)}</span></div>
          <div><span class="lbl">Aadhar:</span> <span class="val">${safe(formData.aadharNo)}</span></div>
        </div>
      </div>
      `
        )}

  ${section(
            "Addresses",
            `
        ${addressBlock("Permanent Address", permAddr)}
        ${addressBlock("Present Address", presentAddr)}
      `
        )}

  ${section(
            "Qualification & Skills",
            `
        <div class="row">
          <div class="col"><span class="lbl">Qualification:</span> <span class="val">${qual}</span></div>
          <div class="col"><span class="lbl">College / School:</span> <span class="val">${college}</span></div>
        </div>
        <div class="row">
          <div class="col"><span class="lbl">Primary Skill:</span> <span class="val">${pskill}</span></div>
          <div class="col"><span class="lbl">Mother Tongue:</span> <span class="val">${mtongue}</span></div>
        </div>
        <div class="row">
          <div class="col"><span class="lbl">Languages:</span> <span class="val">${langs}</span></div>
        </div>
        <div style="margin-top:8px">
          <div class="lbl" style="margin-bottom:6px">Other Skills</div>
          ${skillsBlock}
        </div>
      `
        )}

  <div class="footer">
    <div>Doc Ref: JC-HR-07</div>
    <div>Revision: 1</div>
    <div>Date: ${metaDate}</div>
    <div>Page 1 of 1</div>
  </div>
</div>
<script>
  // Auto print if opened in a new window
  window.focus && window.focus();
</script>
</body>
</html>
        `;
        return html;
    };

    const handleDownloadBiodata = () => {
        const html = buildBiodataHTML();
        const win = window.open("", "_blank", "noopener,noreferrer");
        if (!win) return;
        win.document.open();
        win.document.write(html);
        win.document.close();
        // Give browser a tick to render, then open print dialog
        setTimeout(() => {
            try {
                win.focus();
                win.print();
            } catch (e) { }
        }, 400);
    };

    /* -------------------------------------------------------------------------- */

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

            {/* Main Modal */}
            <div className={`modal fade show ${modalClass}`} style={{ display: "block", backgroundColor: "rgba(0, 0, 0, 0.81)" }}>
                <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                    <div className="modal-content">
                        <div className="modal-header bg-secondary text-white">
                            <h3 className="modal-title">
                                {isEditMode ? "Edit Employee - " : ""}
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
                                    ["bank", "Bank Details"],
                                    ["payment", "Payment"],
                                    ["working", "Working"],
                                    ["biodata", "Biodata"], // NEW TAB
                                ].map(([key, label]) => (
                                    <li className="nav-item" role="presentation" key={key}>
                                        <button className={`nav-link ${activeTab === key ? "active" : ""}`} onClick={() => setActiveTab(key)}>
                                            {label}
                                        </button>
                                    </li>
                                ))}
                            </ul>

                            <div className="tab-content p-3">
                                {/* Basic */}
                                {activeTab === "basic" && (
                                    <div className="modal-card mb-3">
                                        {/* Status */}
                                        <div className="row mb-3 status">
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

                                        <div className="modal-card-header">
                                            <h4 className="mb-0">Basic Information</h4>
                                        </div>
                                        <div className="modal-card-body">
                                            {/* Photo lives ONLY in Basic Info now */}
                                            <div className="row align-items-start">
                                                <div className="col-md-4">
                                                    <div className="mb-3">
                                                        <label className="form-label center">
                                                            <strong>Employee Photo</strong>
                                                        </label>
                                                        <div className="text-center">
                                                            {formData.employeePhotoUrl ? (
                                                                <img
                                                                    src={formData.employeePhotoUrl}
                                                                    alt="Employee"
                                                                    style={{ maxWidth: "300px", maxHeight: "300px", objectFit: "cover" }}
                                                                    className="rounded img-fluid mb-3"
                                                                />
                                                            ) : (
                                                                <div className="text-muted mb-3">No photo selected</div>
                                                            )}

                                                            {isEditMode && (
                                                                <div className="d-flex flex-column align-items-center gap-2">
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
                                                        <div className="col-md-6">{renderInputField("First Name", "firstName", formData.firstName)}</div>
                                                        <div className="col-md-6">{renderInputField("Last Name", "lastName", formData.lastName)}</div>

                                                    </div>

                                                    <div className="row">
                                                        <div className="col-md-6">
                                                            {renderSelectField("Gender", "gender", formData.gender, [
                                                                { value: "Male", label: "Male" },
                                                                { value: "Female", label: "Female" },
                                                                { value: "Other", label: "Other" },
                                                            ])}
                                                        </div>
                                                        <div className="col-md-6">{renderInputField("Care Of", "co", formData.co)}</div>
                                                    </div>

                                                    <div className="row">
                                                        <div className="col-md-6">
                                                            {renderInputField(
                                                                "Date of Birth",
                                                                "dateOfBirth",
                                                                formData.dateOfBirth,
                                                                "date",
                                                                "",
                                                                false,
                                                                { min: DOB_MIN, max: DOB_MAX }
                                                            )}
                                                        </div>
                                                        <div className="col-md-6">{renderInputField("Age", "years", formData.years, "number")}</div>
                                                    </div>

                                                    <div className="row">
                                                        <div className="col-md-6">
                                                            {renderInputField(
                                                                "Aadhar No",
                                                                "aadharNo",
                                                                formData.aadharNo,
                                                                "tel",
                                                                "",
                                                                false,
                                                                { inputMode: "numeric", maxLength: 12, pattern: "^[0-9]{12}$" }
                                                            )}
                                                        </div>
                                                        <div className="col-md-6">{renderInputField("Local ID", "localId", formData.localId)}</div>


                                                    </div>

                                                    <div className="row">

                                                        <div className="col-md-6">
                                                            {renderPhoneField("Mobile 1", "mobileNo1", formData.mobileNo1)}
                                                        </div>

                                                        <div className="col-md-6">
                                                            {renderPhoneField("Mobile 2", "mobileNo2", formData.mobileNo2)}
                                                        </div>

                                                    </div>

                                                    <div className="row">


                                                        <div className="col-md-6">
                                                            {renderInputField("Date of Joining", "date", formData.date || formData.dateOfJoining, "date")}
                                                        </div>
                                                        <div className="col-md-6">{renderInputField("Page No", "pageNo", formData.pageNo)}</div>

                                                    </div>

                                                    <div className="row">
                                                        <div className="col-md-6">
                                                            {renderInputField("Basic Salary", "basicSalary", formData.basicSalary, "number")}
                                                        </div>
                                                        <div className="col-md-6">{renderInputField("Allowance", "allowance", formData.allowance, "number")}</div>

                                                    </div>
                                                </div>
                                                <div className="row">
                                                    <div className="col-md-12">
                                                        <label className="form-label">
                                                            <strong>About Employee & Skills</strong>
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
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Address */}
                                {activeTab === "address" && (
                                    <>
                                        <div className="modal-card mb-3">
                                            <div className="modal-card-header">
                                                <h4 className="mb-0">Permanent Address</h4>
                                            </div>
                                            <div className="modal-card-body">
                                                <div className="row">
                                                    <div className="col-md-4">
                                                        {renderInputField("Door No", "permanentAddress", formData.permanentAddress)}
                                                    </div>
                                                    <div className="col-md-4">
                                                        {renderInputField("Street", "permanentStreet", formData.permanentStreet)}
                                                    </div>
                                                    <div className="col-md-4">
                                                        {renderInputField("Landmark", "permanentLandmark", formData.permanentLandmark)}
                                                    </div>
                                                </div>
                                                <div className="row">
                                                    <div className="col-md-4">
                                                        {renderInputField("Village / Town", "permanentVillage", formData.permanentVillage)}
                                                    </div>
                                                    <div className="col-md-4">
                                                        {renderInputField("Mandal", "permanentMandal", formData.permanentMandal)}
                                                    </div>
                                                    <div className="col-md-4">
                                                        {renderInputField("District", "permanentDistrict", formData.permanentDistrict)}
                                                    </div>
                                                </div>
                                                <div className="row">
                                                    <div className="col-md-4">{renderInputField("State", "permanentState", formData.permanentState)}</div>
                                                    <div className="col-md-4">
                                                        {renderInputField(
                                                            "Pincode",
                                                            "permanentPincode",
                                                            formData.permanentPincode,
                                                            "tel",
                                                            "",
                                                            false,
                                                            { inputMode: "numeric", maxLength: 6, pattern: "^[0-9]{6}$" }
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <hr></hr>
                                        <div className="modal-card mb-3">
                                            <div className="modal-card-header">
                                                <h4 className="mb-0">Present Address</h4>
                                            </div>
                                            <div className="modal-card-body">
                                                <div className="row">
                                                    <div className="col-md-4">
                                                        {renderInputField("Door No", "presentAddress", formData.presentAddress)}
                                                    </div>
                                                    <div className="col-md-4">{renderInputField("Street", "presentStreet", formData.presentStreet)}</div>
                                                    <div className="col-md-4">
                                                        {renderInputField("Landmark", "presentLandmark", formData.presentLandmark)}
                                                    </div>
                                                </div>
                                                <div className="row">
                                                    <div className="col-md-4">{renderInputField("Village / Town", "presentVillage", formData.presentVillage)}</div>
                                                    <div className="col-md-4">{renderInputField("Mandal", "presentMandal", formData.presentMandal)}</div>
                                                    <div className="col-md-4">
                                                        {renderInputField("District", "presentDistrict", formData.presentDistrict)}
                                                    </div>
                                                </div>
                                                <div className="row">
                                                    <div className="col-md-4">{renderInputField("State", "presentState", formData.presentState)}</div>
                                                    <div className="col-md-4">
                                                        {renderInputField(
                                                            "Pincode",
                                                            "presentPincode",
                                                            formData.presentPincode,
                                                            "tel",
                                                            "",
                                                            false,
                                                            { inputMode: "numeric", maxLength: 6, pattern: "^[0-9]{6}$" }
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Personal */}
                                {activeTab === "personal" && (
                                    <div className="modal-card mb-3">
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
                                                    {renderInputField(
                                                        "Date of Marriage",
                                                        "dateOfMarriage",
                                                        formData.dateOfMarriage,
                                                        "date",
                                                        "",
                                                        false,
                                                        {
                                                            min: DOM_MIN,
                                                            max: DOM_MAX,
                                                            disabled: formData.maritalStatus !== "Married",
                                                        }
                                                    )}
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
                                    <div className="modal-card mb-3">
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
                                                <div className="col-md-4">
                                                    {renderInputField("Work Experience", "workExperince", formData.workExperince, "text")}
                                                </div>
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
                                    <div className="modal-card mb-3">
                                        <div className="modal-card-header">
                                            <h4 className="mb-0">Health Details</h4>
                                        </div>
                                        <div className="modal-card-body">
                                            <div className="row">
                                                <div className="col-md-6">{renderArrayField("Health Issues", "healthIssues", "Add health issue")}</div>
                                                <div className="col-md-6">{renderInputField("Other Issues", "otherIssues", formData.otherIssues)}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Emergency */}
                                {activeTab === "emergency" && (
                                    <div className="modal-card mb-3">
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

                                {/* Bank (NO photo here anymore) */}
                                {activeTab === "bank" && (
                                    <div className="modal-card mb-3">
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
                                                <div className="col-md-3">
                                                    {renderPhoneField("Phone Pay Number", "phonePayNo", formData.phonePayNo)}
                                                </div>
                                                <div className="col-md-3">
                                                    {renderInputField("Phone Pay Name", "phonePayName", formData.phonePayName)}
                                                </div>
                                                <div className="col-md-3">
                                                    {renderPhoneField("Google Pay Number", "googlePayNo", formData.googlePayNo)}
                                                </div>
                                                <div className="col-md-3">
                                                    {renderInputField("Google Pay Name", "googlePayName", formData.googlePayName)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Payment */}
                                {activeTab === "payment" && (
                                    <div className="modal-card mb-3">
                                        <div className="modal-card-header">
                                            <h4 className="mb-0">Payment</h4>
                                        </div>
                                        <div className="modal-card-body">
                                            {(formData.payments || []).map((p, i) => {
                                                const locked = !!p.__locked;
                                                const invalidClass = (field) => (paymentErrors[i]?.[field] ? " is-invalid" : "");
                                                return (
                                                    <div key={i} className="border rounded p-3 mb-3">
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
                                                                        type="text"
                                                                        className="form-control form-control-sm"
                                                                        value={p.receiptNo || ""}
                                                                        onChange={(e) => handleArrayChange("payments", i, "receiptNo", e.target.value)}
                                                                        disabled={locked}
                                                                    />
                                                                ) : (
                                                                    <div className="form-control form-control-sm bg-light">{p.receiptNo || "N/A"}</div>

                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="row">
                                                            <div className="col-md-4 mb-2">
                                                                <label className="form-label">
                                                                    <strong>Client Name</strong>
                                                                    <span className="star">*</span>
                                                                </label>
                                                                {isEditMode ? (
                                                                    <input
                                                                        type="text"
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
                                                                    <strong>Days</strong>
                                                                    <span className="star">*</span>
                                                                </label>
                                                                {isEditMode ? (
                                                                    <input
                                                                        type="number"
                                                                        className={`form-control form-control-sm${invalidClass("days")}`}
                                                                        value={p.days || ""}
                                                                        onChange={(e) => handleArrayChange("payments", i, "days", e.target.value)}
                                                                        disabled={locked}
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
                                                                        type="text"
                                                                        className="form-control form-control-sm"
                                                                        value={p.bookNo || ""}
                                                                        onChange={(e) => handleArrayChange("payments", i, "bookNo", e.target.value)}
                                                                        disabled={locked}
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
                                                    <button className="btn btn-outline-primary btn-sm" onClick={addPaymentSection}>
                                                        + Add Payment
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Working */}
                                {activeTab === "working" && (
                                    <div className="modal-card mb-3">
                                        <div className="modal-card-header">
                                            <h4 className="mb-0">Working Details</h4>
                                        </div>
                                        <div className="modal-card-body">
                                            {(formData.workDetails || []).map((w, i) => {
                                                const locked = !!w.__locked;
                                                const invalidClass = (field) => (workErrors[i]?.[field] ? " is-invalid" : "");
                                                return (
                                                    <div key={i} className="border rounded p-3 mb-3">
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
                                                    <button className="btn btn-outline-primary btn-sm" onClick={addWorkSection}>
                                                        + Add Work
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Bodata (Biodata) */}
                                {activeTab === "biodata" && (
                                    <div className="modal-card mb-3">
                                        <div className="modal-card-header d-flex align-items-center justify-content-between">
                                            <h4 className="mb-0">Biodata</h4>
                                            <div className="d-flex gap-2">
                                                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleDownloadBiodata}>
                                                    Download Biodata
                                                </button>
                                            </div>
                                        </div>

                                        <div className="modal-card-body biodata-wrapper">
                                            <div>
                                                <img src={BioDataHeader} />
                                            </div>

                                            {/* Lightweight live preview */}
                                            <div className="border rounded p-3" ref={biodataRef} style={{ background: "#fafafa" }}>
                                                <div className="d-flex justify-content-center align-items-center mb-3">
                                                    <div className="text-center">
                                                        <h1 className="mb-1"><strong>EMPLOYEE BIO-DATA</strong></h1>
                                                        <div className="text-muted" style={{ fontSize: ".9rem" }}>
                                                            H.R Department (Reg No: SEA/HYD/ALO/26/1040178/2025)
                                                        </div>

                                                    </div>

                                                </div>
                                                <div className="title">
                                                    <h3>Baisc Information</h3>
                                                </div>
                                                <div className="basic-info">
                                                    <div>
                                                        {formData.employeePhotoUrl ? (
                                                            <img
                                                                src={formData.employeePhotoUrl}
                                                                alt="Employee"
                                                                style={{ width: 150, height: 150, objectFit: "cover", borderRadius: 6, border: "1px solid #ddd" }}
                                                            />
                                                        ) : (
                                                            <div
                                                                style={{
                                                                    width: 150,
                                                                    height: 150,
                                                                    border: "1px solid #ddd",
                                                                    borderRadius: 6,
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    color: "#888",
                                                                    fontSize: 12,
                                                                }}
                                                            >
                                                                No Photo
                                                            </div>
                                                        )}

                                                        {/* Employee ID and Date */}

                                                        <div className="small text-secondary mt-1 text-center">
                                                            <strong>ID:</strong> {formData.idNo || formData.employeeId || "—"}
                                                            {/* <strong>Date:</strong> {new Date().toLocaleDateString()} */}
                                                        </div>
                                                    </div>

                                                    <div className="container info">

                                                        <div className="row">
                                                            <div className="col-sm-2"><strong>Full Name</strong></div>
                                                            <div className="col-sm-1">:</div>
                                                            <div className="col-sm-6 blue f20"><strong>{(formData.firstName || "") + " " + (formData.lastName || "") || "—"}</strong></div>
                                                        </div>
                                                        <div className="row">
                                                            <div className="col-sm-2"><strong>Gender</strong></div>
                                                            <div className="col-sm-1">:</div>
                                                            <div className="col-sm-6 blue">{formData.gender || "—"}</div>
                                                        </div>
                                                        <div className="row">
                                                            <div className="col-sm-2"><strong>Date of Birth{" "}</strong></div>
                                                            <div className="col-sm-1">:</div>
                                                            <div className="col-sm-6">{formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString() : "—"}</div>
                                                        </div>
                                                        <div className="row">
                                                            <div className="col-sm-2"><strong>Age</strong></div>
                                                            <div className="col-sm-1">:</div>
                                                            <div className="col-sm-6 blue">{formData.years || "—"}</div>
                                                        </div>
                                                        <div className="row">
                                                            <div className="col-sm-2"><strong>Care Of</strong></div>
                                                            <div className="col-sm-1">:</div>
                                                            <div className="col-sm-6">{formData.co || formData.careOfPersonal || "—"}</div>
                                                        </div>
                                                        <div className="row">
                                                            <div className="col-sm-2"><strong>Marital Status</strong></div>
                                                            <div className="col-sm-1">:</div>
                                                            <div className="col-sm-6 blue">{formData.maritalStatus || "—"}</div>
                                                        </div>

                                                    </div>
                                                </div>
                                                <div className="title">
                                                    <h3>Addresses</h3>
                                                </div>

                                                <div className="row">
                                                    <div className="col-md-6">
                                                        <h5><strong>Permanent address</strong></h5>
                                                        <div className="row">
                                                            <div className="col-sm-4"><strong>Door No</strong></div>
                                                            <div className="col-sm-1">:</div>
                                                            <div className="col-sm-7">{formData.permanentAddress || "—"}</div>
                                                        </div>
                                                        <div className="row">
                                                            <div className="col-sm-4"><strong>Street</strong></div>
                                                            <div className="col-sm-1">:</div>
                                                            <div className="col-sm-7">{formData.permanentStreet || "—"}</div>
                                                        </div>
                                                        <div className="row">
                                                            <div className="col-sm-4"><strong>Landmark</strong></div>
                                                            <div className="col-sm-1">:</div>
                                                            <div className="col-sm-7">{formData.permanentLandmark || "—"}</div>
                                                        </div>
                                                        <div className="row">
                                                            <div className="col-sm-4"><strong>Village/Town</strong></div>
                                                            <div className="col-sm-1">:</div>
                                                            <div className="col-sm-7">{formData.permanentVillage || "—"}</div>
                                                        </div>
                                                        <div className="row">
                                                            <div className="col-sm-4"><strong>Mandal</strong></div>
                                                            <div className="col-sm-1">:</div>
                                                            <div className="col-sm-7">{formData.permanentMandal || "—"}</div>
                                                        </div>
                                                        <div className="row">
                                                            <div className="col-sm-4"><strong>District</strong></div>
                                                            <div className="col-sm-1">:</div>
                                                            <div className="col-sm-7">{formData.permanentDistrict || "—"}</div>
                                                        </div>
                                                        <div className="row">
                                                            <div className="col-sm-4"><strong>State & Pincode</strong></div>
                                                            <div className="col-sm-1">:</div>
                                                            <div className="col-sm-7">{formData.permanentState || "—"}{formData.permanentPincode ? " - " + formData.permanentPincode : ""}</div>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <h5><strong>Present Address</strong></h5>
                                                        <div className="row">
                                                            <div className="col-sm-4"><strong>Door No</strong></div>
                                                            <div className="col-sm-1">:</div>
                                                            <div className="col-sm-7">{formData.presentAddress || "—"}</div>
                                                        </div>
                                                        <div className="row">
                                                            <div className="col-sm-4"><strong>Street</strong></div>
                                                            <div className="col-sm-1">:</div>
                                                            <div className="col-sm-7">{formData.presentStreet || "—"}</div>
                                                        </div>
                                                        <div className="row">
                                                            <div className="col-sm-4"><strong>Landmark</strong></div>
                                                            <div className="col-sm-1">:</div>
                                                            <div className="col-sm-7">{formData.presentLandmark || "—"}</div>
                                                        </div>
                                                        <div className="row">
                                                            <div className="col-sm-4"><strong>Village/Town</strong></div>
                                                            <div className="col-sm-1">:</div>
                                                            <div className="col-sm-7">{formData.presentVillage || "—"}</div>
                                                        </div>
                                                        <div className="row">
                                                            <div className="col-sm-4"><strong>Mandal</strong></div>
                                                            <div className="col-sm-1">:</div>
                                                            <div className="col-sm-7">{formData.presentMandal || "—"}</div>
                                                        </div>
                                                        <div className="row">
                                                            <div className="col-sm-4"><strong>District</strong></div>
                                                            <div className="col-sm-1">:</div>
                                                            <div className="col-sm-7">{formData.presentDistrict || "—"}</div>
                                                        </div>
                                                        <div className="row">
                                                            <div className="col-sm-4"><strong>State & Pincode</strong></div>
                                                            <div className="col-sm-1">:</div>
                                                            <div className="col-sm-7">{formData.presentState || "—"}{formData.presentPincode ? " - " + formData.presentPincode : ""}</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="title">
                                                    <h3>Qualification & Skills</h3>
                                                </div>


                                                <div className="row">
                                                    <div className="col-md-6">
                                                        <h5><strong>Qulifications</strong></h5>
                                                        <div className="row">
                                                            <div className="col-md-4"><strong>Qualification</strong></div>
                                                            <div className="col-md-1">:</div>
                                                            <div className="col-md-7 blue">{formData.qualification || "—"}</div>
                                                        </div>
                                                        <div className="row">
                                                            <div className="col-md-4"><strong>School/College</strong></div>
                                                            <div className="col-md-1">:</div>
                                                            <div className="col-md-7">{formData.schoolCollege || "—"}</div>
                                                        </div>
                                                        <div className="row">
                                                            <div className="col-md-4"><strong>Mother Tongue</strong></div>
                                                            <div className="col-md-1">:</div>
                                                            <div className="col-md-7">{formData.motherTongue || formData.motherTung || "—"}</div>
                                                        </div>
                                                        <div className="row">
                                                            <div className="col-md-4"><strong>Languages</strong></div>
                                                            <div className="col-md-1">:</div>
                                                            <div className="col-md-7">{formData.languages || "—"}</div>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <h5><strong>Skills</strong></h5>
                                                        <div className="row">
                                                            <div className="col-md-4"><strong>Primary Skill</strong></div>
                                                            <div className="col-md-1">:</div>
                                                            <div className="col-md-7 blue">{formData.primarySkill || "—"}</div>
                                                        </div>
                                                        <div className="row">
                                                            <div className="col-md-4"><strong>Secondary Skills</strong></div>
                                                            <div className="col-md-1">:</div>
                                                            <div className="col-md-7">{formData.secondarySkills || "—"}</div>
                                                        </div>
                                                        <div className="row">
                                                            <div className="col-md-4"><strong>Other Skills</strong></div>
                                                            <div className="col-md-1">:</div>
                                                            <div className="col-md-7">   {((formData.secondarySkills || []).concat(formData.workingSkills || [])).length ? (
                                                                ((formData.secondarySkills || []).concat(formData.workingSkills || [])).map((s, idx) => (
                                                                    <span key={idx} className="badge bg-light text-dark border">{s}</span>
                                                                ))
                                                            ) : (
                                                                <span className="text-muted">—</span>
                                                            )}</div>
                                                        </div>
                                                        <div className="row">
                                                            <div className="col-md-4"><strong>Experince</strong></div>
                                                            <div className="col-md-1">:</div>
                                                            <div className="col-md-7 blue">{formData.workExperince || "—"}</div>
                                                        </div>

                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bottom"> Doc Ref: JC-HR-07 | Revision: 1 | Date: 1st May 2025</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="modal-footer">
                            <div className="d-flex w-100 justify-content-end">
                                {/* <div>
                                    {onDelete && (
                                        <button type="button" className="btn btn-outline-danger" onClick={handleDelete}>
                                            Delete
                                        </button>
                                    )}
                                </div> */}
                                <div className="d-flex gap-2">
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
            </div>
        </>
    );
};

export default EmployeeModal;
