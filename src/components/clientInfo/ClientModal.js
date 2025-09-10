// ClientModal.js
import React, { useEffect, useRef, useState } from "react";

/**
 Full ClientModal.js (updated)
 - Preserves payments / workers / locking / editMode behavior
 - Adds Service Details and Care Recipient (patient) tabs rendering
 - buildClientBiodataHTML renders 4-column Basic/Address layout (printable)
 - Adds a Care Recipient section into the biodata iframe
 - ReminderDays auto-updates ReminderDate (relative to today)
 - Refund badge pulse animation, refund disable logic retained
 - Inline validation, unsaved confirmation, change logs, thank-you modal
 - Print-optimized biodata: reduced margins (15px) and print styles to fit one page
 - Props:
    client, isOpen, onClose, onSave, onDelete, isEditMode, isAdmin, currentUserName
*/

const safeNumber = (v) => {
    if (v === null || v === undefined || v === "") return 0;
    if (typeof v === "number") return v;
    const cleaned = String(v).replace(/[^0-9.-]/g, "");
    const n = Number(cleaned);
    return Number.isNaN(n) ? 0 : n;
};

const formatINR = (value) => {
    const n = Number(value || 0);
    if (!isFinite(n)) return "\u20B90";
    try {
        return "\u20B9" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
    } catch {
        return "\u20B9" + String(n);
    }
};

const formatDateForInput = (v) => {
    if (!v && v !== 0) return "";
    const d = new Date(v);
    if (isNaN(d)) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

const parseDateSafe = (v) => {
    if (!v && v !== 0) return null;
    if (v instanceof Date && !isNaN(v)) return v;
    const d = new Date(v);
    if (!isNaN(d)) return d;
    const s = String(v);
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    if (/^\d+$/.test(s)) {
        const n = Number(s);
        const d2 = new Date(n);
        if (!isNaN(d2)) return d2;
    }
    return null;
};

const daysBetween = (start, end) => {
    const s = parseDateSafe(start);
    const e = parseDateSafe(end);
    if (!s || !e) return "";
    const ms = e - s;
    if (ms < 0) return 0;
    return Math.ceil(ms / (1000 * 60 * 60 * 24)) + 1;
};

const lockRows = (arr) => (Array.isArray(arr) ? arr : []).map((r) => ({ ...r, __locked: true }));

const stripLocks = (obj) => {
    const clone = JSON.parse(JSON.stringify(obj || {}));
    if (Array.isArray(clone.workers)) clone.workers = clone.workers.map(({ __locked, ...rest }) => rest);
    if (Array.isArray(clone.payments)) clone.payments = clone.payments.map(({ __locked, ...rest }) => rest);
    if (Array.isArray(clone.paymentLogs)) clone.paymentLogs = clone.paymentLogs.map((l) => ({ ...l }));
    return clone;
};

export default function ClientModal({
    client,
    isOpen,
    onClose,
    onSave,
    onDelete,
    isEditMode = false,
    isAdmin = false,
    currentUserName = "System",
}) {
    // states
    const [formData, setFormData] = useState({});
    const [activeTab, setActiveTab] = useState("basic");
    const [errors, setErrors] = useState({});
    const [editMode, setEditMode] = useState(Boolean(isEditMode));
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
    const [showThankYou, setShowThankYou] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const bioIframeRef = useRef(null);
    const initialSnapshotRef = useRef(null);

    // public header image (https)
    const headerImage =
        "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FHeadder.svg?alt=media&token=fa65a3ab-ba03-4959-bc36-e293c6db48ae";

    useEffect(() => setEditMode(Boolean(isEditMode)), [isEditMode]);

    useEffect(() => {
        if (!client) {
            setFormData({});
            initialSnapshotRef.current = null;
            setIsDirty(false);
            return;
        }

        const paymentsArr = client.payments ? (Array.isArray(client.payments) ? client.payments : Object.values(client.payments)) : [];
        const workersArr = client.workers ? (Array.isArray(client.workers) ? client.workers : Object.values(client.workers)) : [];
        const existingLogs = client.paymentLogs ? (Array.isArray(client.paymentLogs) ? client.paymentLogs : Object.values(client.paymentLogs)) : [];

        const payments = paymentsArr.map((p) => {
            const paidAmount = safeNumber(p.paidAmount ?? p.amount ?? p.payment ?? p.PaidAmount ?? 0);
            return {
                paymentMethod: p.paymentMethod ?? p.method ?? p.type ?? "cash",
                paidAmount,
                balance: safeNumber(p.balance ?? p.balanceAmount ?? p.Balance ?? 0),
                receptNo: p.receptNo ?? p.receiptNo ?? p.bookNo ?? "",
                reminderDate: p.reminderDate ?? p.reminderDateString ?? "",
                reminderDays: p.reminderDays ?? "",
                remarks: p.remarks ?? p.note ?? "",
                date: p.date ?? p.paymentDate ?? p.createdAt ?? "",
                refund: !!p.refund || !!p.refundAmount || false,
                refundDate: p.refundDate ?? "",
                refundAmount: safeNumber(p.refundAmount ?? 0),
                refundPaymentMethod: p.refundPaymentMethod ?? p.refundMethod ?? "",
                refundRemarks: p.refundRemarks ?? p.refund_note ?? "",
                __locked: true,
                ...p,
            };
        });

        const workers = workersArr.map((w) => {
            const start = w.startingDate ?? w.start ?? "";
            const end = w.endingDate ?? w.end ?? "";
            const totalDaysValue = (w.totalDays ?? daysBetween(start, end)) || "";
            return {
                workerIdNo: w.workerIdNo ?? w.idNo ?? w.id ?? "",
                cName: w.cName ?? w.name ?? w.workerName ?? "",
                basicSalary: safeNumber(w.basicSalary ?? w.salary ?? 0),
                startingDate: start,
                endingDate: end,
                totalDays: totalDaysValue,
                mobile1: w.mobile1 ?? w.mobile ?? "",
                mobile2: w.mobile2 ?? "",
                remarks: w.remarks ?? "",
                __locked: true,
                ...w,
            };
        });

        const logs = existingLogs.map((l) => ({ ...l }));

        const snapshot = {
            ...client,
            payments: lockRows(payments),
            workers: lockRows(workers),
            paymentLogs: logs || [],
        };

        setFormData(snapshot);
        setErrors({});
        initialSnapshotRef.current = JSON.stringify(snapshot);
        setIsDirty(false);
    }, [client]);

    useEffect(() => {
        if (activeTab !== "biodata") return;
        if (bioIframeRef.current) bioIframeRef.current.srcdoc = buildClientBiodataHTML();
    }, [activeTab, formData]);

    if (!isOpen) return null;

    // ---- helpers ----
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

    // Add payment log entry helper
    const pushPaymentLog = (entry) => {
        setFormData((prev) => {
            const logs = Array.isArray(prev.paymentLogs) ? [...prev.paymentLogs] : [];
            const next = { ...prev, paymentLogs: [...logs, entry] };
            markDirty(next);
            return next;
        });
    };

    // main change handler; for payments we also push a log entry describing the change
    const handleChange = (e, section = null, index = null) => {
        const target = e && e.target ? e.target : e;
        const name = target.name;
        let value;
        if (target.type === "checkbox") value = target.checked;
        else value = target.value;

        if ((section === "payments" || section === "workers") && index !== null) {
            setFormData((prev) => {
                const list = Array.isArray(prev[section]) ? [...prev[section]] : [];
                const row = { ...(list[index] || {}) };
                const locked = !!row.__locked;
                if (locked && !editMode) return prev;
                const prevVal = row[name];
                row[name] = value;

                // payments special handling
                if (section === "payments") {
                    if (name === "reminderDays") {
                        const days = Number(value) || 0;
                        if (days > 0) {
                            const d = new Date();
                            d.setDate(d.getDate() + days);
                            row.reminderDate = formatDateForInput(d);
                        } else row.reminderDate = "";
                    }
                    if (name === "date") row.date = value;
                    if (name === "refund") {
                        if (value) {
                            row.refundDate = row.refundDate || row.date || formatDateForInput(new Date());
                            row.refundAmount = row.refundAmount || 0;
                        } else {
                            if (!row.refundAmount || Number(row.refundAmount) === 0) {
                                row.refundDate = "";
                                row.refundAmount = 0;
                                row.refundPaymentMethod = "";
                                row.refundRemarks = "";
                                row.refund = false;
                            } else {
                                row.refund = true;
                            }
                        }
                    }
                    if (name === "refundDate") row.refundDate = value;
                    if (name === "refundAmount") {
                        row.refundAmount = safeNumber(value);
                        if (Number(row.refundAmount) > 0) row.refund = true;
                    }
                    if (name === "refundPaymentMethod") row.refundPaymentMethod = value;
                    if (name === "refundRemarks") row.refundRemarks = value;
                }

                // workers special
                if (section === "workers") {
                    if (name === "startingDate" || name === "endingDate") {
                        const start = name === "startingDate" ? value : row.startingDate || "";
                        const end = name === "endingDate" ? value : row.endingDate || "";
                        row.totalDays = daysBetween(start, end);
                    }
                }

                list[index] = row;
                const next = { ...prev, [section]: list };

                // create log if payments and value changed
                if (section === "payments" && String(prevVal) !== String(value)) {
                    const stamp = new Date();
                    const ts = `${String(stamp.getDate()).padStart(2, "0")}/${String(stamp.getMonth() + 1).padStart(2, "0")}/${stamp.getFullYear()} ${String(stamp.getHours()).padStart(2, "0")}:${String(
                        stamp.getMinutes()
                    ).padStart(2, "0")}:${String(stamp.getSeconds()).padStart(2, "0")}`;

                    const prettyName = name;
                    const msg = `Payment #${index + 1} ${prettyName} → ${value === "" ? "(empty)" : value}`;
                    const entry = {
                        date: stamp.toISOString(),
                        dateLabel: ts,
                        user: currentUserName || "System",
                        message: msg,
                        paymentIndex: index,
                    };

                    next.paymentLogs = Array.isArray(prev.paymentLogs) ? [...prev.paymentLogs, entry] : [entry];
                }

                markDirty(next);
                return next;
            });
            return;
        }

        // top-level
        setField(name, value);
    };

    // blur/inline validation
    const handleBlurField = (fieldKey) => {
        const parts = String(fieldKey).split(".");
        if (parts.length === 1) {
            const field = parts[0];
            const v = formData[field];
            const e = {};
            if ((field === "clientName" || field === "location" || field === "mobileNo1") && editMode) {
                if (!v || String(v).trim() === "") e[field] = `${field} is required`;
            }
            setErrors((prev) => ({ ...prev, ...e }));
            return;
        }
        if (parts[0] === "payments") {
            const idx = Number(parts[1]);
            const key = parts[2];
            const row = (formData.payments || [])[idx] || {};
            const e = {};
            const locked = !!row.__locked;
            if (!locked || editMode) {
                if (key === "paidAmount") {
                    if (row.paidAmount === "" || row.paidAmount === null || Number(row.paidAmount) === 0) e[`payments.${idx}.paidAmount`] = "Paid amount is required";
                    else e[`payments.${idx}.paidAmount`] = undefined;
                }
                if (key === "date") {
                    if (!row.date || String(row.date).trim() === "") e[`payments.${idx}.date`] = "Payment date is required";
                    else e[`payments.${idx}.date`] = undefined;
                }
                if (key === "paymentMethod") {
                    if (!row.paymentMethod || String(row.paymentMethod).trim() === "") e[`payments.${idx}.paymentMethod`] = "Payment method is required";
                    else e[`payments.${idx}.paymentMethod`] = undefined;
                }
            }
            setErrors((prev) => {
                const next = { ...prev, ...e };
                Object.keys(next).forEach((k) => next[k] === undefined && delete next[k]);
                return next;
            });
            return;
        }
        if (parts[0] === "workers") {
            const idx = Number(parts[1]);
            const key = parts[2];
            const row = (formData.workers || [])[idx] || {};
            const e = {};
            if (key === "workerIdNo") {
                if (!row.workerIdNo || String(row.workerIdNo).trim() === "") e[`workers.${idx}.workerIdNo`] = "Worker ID is required";
                else e[`workers.${idx}.workerIdNo`] = undefined;
            }
            if (key === "cName") {
                if (!row.cName || String(row.cName).trim() === "") e[`workers.${idx}.cName`] = "Worker name is required";
                else e[`workers.${idx}.cName`] = undefined;
            }
            setErrors((prev) => {
                const next = { ...prev, ...e };
                Object.keys(next).forEach((k) => next[k] === undefined && delete next[k]);
                return next;
            });
            return;
        }
    };

    const addWorker = () => {
        const newWorker = {
            workerIdNo: "",
            cName: "",
            basicSalary: "",
            startingDate: "",
            endingDate: "",
            totalDays: "",
            mobile1: "",
            mobile2: "",
            remarks: "",
            __locked: false,
        };
        setFormData((prev) => {
            const next = { ...prev, workers: [...(prev.workers || []), newWorker] };
            markDirty(next);
            return next;
        });
    };

    const removeWorker = (i) => {
        setFormData((prev) => {
            const list = Array.isArray(prev.workers) ? [...prev.workers] : [];
            const row = list[i];
            if (row?.__locked && !editMode) return prev;
            list.splice(i, 1);
            const next = { ...prev, workers: list };
            markDirty(next);
            return next;
        });
    };

    const addPayment = () => {
        const np = {
            paymentMethod: "cash",
            paidAmount: "",
            balance: "",
            receptNo: "",
            remarks: "",
            reminderDate: "",
            reminderDays: "",
            date: formatDateForInput(new Date()),
            refund: false,
            refundDate: "",
            refundAmount: 0,
            refundPaymentMethod: "",
            refundRemarks: "",
            __locked: false,
        };
        setFormData((prev) => {
            const next = { ...prev, payments: [...(prev.payments || []), np] };
            markDirty(next);
            return next;
        });
    };

    const removePayment = (i) => {
        setFormData((prev) => {
            const list = Array.isArray(prev.payments) ? [...prev.payments] : [];
            const row = list[i];
            if (row?.__locked && !editMode) return prev;
            list.splice(i, 1);
            const next = { ...prev, payments: list };
            markDirty(next);
            return next;
        });
    };

    // validation aggregator
    const validateAll = () => {
        const v = {};
        if (editMode) {
            if (!formData.clientName || String(formData.clientName).trim() === "") v.clientName = "Client name is required";
            if (!formData.location || String(formData.location).trim() === "") v.location = "Location is required";
            if (!formData.mobileNo1 || String(formData.mobileNo1).trim() === "") v.mobileNo1 = "Mobile No 1 is required";
        }
        const payments = Array.isArray(formData.payments) ? formData.payments : [];
        for (let i = 0; i < payments.length; i++) {
            const p = payments[i];
            const locked = !!p.__locked;
            if (!locked || editMode) {
                if (!p.paymentMethod || String(p.paymentMethod).trim() === "") v[`payments.${i}.paymentMethod`] = "Payment method is required";
                if (p.paidAmount === "" || p.paidAmount === null || Number(p.paidAmount) === 0) v[`payments.${i}.paidAmount`] = "Paid amount is required";
                if (!p.date || String(p.date).trim() === "") v[`payments.${i}.date`] = "Payment date is required";
            }
            if (p.refund) {
                if (!p.refundDate || String(p.refundDate).trim() === "") v[`payments.${i}.refundDate`] = "Refund date required";
                if (!p.refundAmount || Number(p.refundAmount) <= 0) v[`payments.${i}.refundAmount`] = "Refund amount required";
                if (!p.refundPaymentMethod || String(p.refundPaymentMethod).trim() === "") v[`payments.${i}.refundPaymentMethod`] = "Refund payment method required";
                if (!p.refundRemarks || String(p.refundRemarks).trim() === "") v[`payments.${i}.refundRemarks`] = "Refund remarks required";
            }
        }
        const workers = Array.isArray(formData.workers) ? formData.workers : [];
        for (let i = 0; i < workers.length; i++) {
            const w = workers[i];
            if (!w.workerIdNo || String(w.workerIdNo).trim() === "") v[`workers.${i}.workerIdNo`] = "Worker ID is required";
            if (!w.cName || String(w.cName).trim() === "") v[`workers.${i}.cName`] = "Worker name is required";
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
            try {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
            } catch { }
            try {
                el.focus();
            } catch { }
        } else {
            const modalContent = document.querySelector(".display-client-modal .modal-content");
            if (modalContent) modalContent.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    const handleSubmit = async (ev) => {
        ev && ev.preventDefault && ev.preventDefault();
        if (!validateAll()) {
            setTimeout(() => focusFirstError(), 150);
            return;
        }
        const payload = stripLocks(formData);
        try {
            const res = onSave && onSave(payload);
            if (res && typeof res.then === "function") await res;
            setShowThankYou(true);
            setTimeout(() => setShowThankYou(false), 1800);
            initialSnapshotRef.current = JSON.stringify({ ...formData });
            setIsDirty(false);
        } catch {
            setErrors((prev) => ({ ...prev, __save: "Save failed. Try again." }));
        }
    };

    const handleCloseAttempt = () => {
        if (isDirty) setShowUnsavedConfirm(true);
        else onClose && onClose();
    };

    // build biodata HTML (4-column Basic/Address + Care Recipient section)
    function buildClientBiodataHTML() {
        const safe = (v, d = "—") => (v == null || v === "" ? d : String(v));
        const fullName = safe(formData.clientName);
        const metaDate = new Date().toLocaleDateString();

        const basicFields = [
            ["ID No", safe(formData.idNo)],
            ["Client Name", safe(formData.clientName)],
            ["Location", safe(formData.location)],
            ["Mobile 1", safe(formData.mobileNo1)],
            ["Mobile 2", safe(formData.mobileNo2)],
            ["Gender", safe(formData.gender)],
            ["Service Type", safe(formData.typeOfService)],
            ["Service Charges", safe(formData.serviceCharges)],
        ];

        const addressFields = [
            ["Door No", safe(formData.dNo)],
            ["Landmark", safe(formData.landMark)],
            ["Street", safe(formData.street)],
            ["Village/Town", safe(formData.villageTown)],
            ["Mandal", safe(formData.mandal)],
            ["District", safe(formData.district)],
            ["State", safe(formData.state)],
            ["Pincode", safe(formData.pincode)],
        ];

        const careFields = [
            ["Care Recipient Name", safe(formData.patientName || formData.careRecipientName)],
            ["Age", safe(formData.patientAge || formData.careRecipientAge)],
            ["Service Status", safe(formData.patientServiceStatus || formData.serviceStatus)],
            ["Dropper Name", safe(formData.dropperName)],
            ["About Patient", safe(formData.aboutPatient)],
            ["Care Notes", safe(formData.aboutWork)],
        ];

        const renderPairs = (fields) => {
            let html = "";
            for (let i = 0; i < fields.length; i += 2) {
                const first = fields[i];
                const second = fields[i + 1];
                if (second) {
                    html += `<tr><th style="width:15%">${first[0]}</th><td style="width:35%">${first[1]}</td><th style="width:15%">${second[0]}</th><td style="width:35%">${second[1]}</td></tr>`;
                } else {
                    html += `<tr><th style="width:15%">${first[0]}</th><td style="width:35%">${first[1]}</td><th style="width:15%"></th><td style="width:35%"></td></tr>`;
                }
            }
            return html;
        };

        const workersRows =
            (Array.isArray(formData.workers) ? formData.workers : [])
                .map(
                    (w, i) =>
                        `<tr><td>${i + 1}</td><td>${safe(w.workerIdNo)}</td><td>${safe(w.cName)}</td><td>${formatINR(
                            w.basicSalary
                        )}</td><td>${safe(w.startingDate)}</td><td>${safe(w.endingDate)}</td><td>${safe(w.totalDays)}</td><td>${safe(w.remarks)}</td></tr>`
                )
                .join("") || "<tr><td colspan='8'>No workers</td></tr>";

        const paymentsRows =
            (Array.isArray(formData.payments) ? formData.payments : [])
                .map((p, i) => {
                    const d = p.date ? parseDateSafe(p.date) : null;
                    const dateStr = d ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}` : safe(p.date);
                    return `<tr><td>${i + 1}</td><td>${dateStr}</td><td>${safe(p.paymentMethod)}</td><td>${formatINR(p.paidAmount)}</td><td>${formatINR(p.balance)}</td><td>${safe(
                        p.receptNo
                    )}</td><td>${p.refund ? formatINR(p.refundAmount) : "-"}</td></tr>`;
                })
                .join("") || "<tr><td colspan='7'>No payments</td></tr>";

        const totalPaid = (Array.isArray(formData.payments) ? formData.payments.reduce((s, p) => s + (Number(p.paidAmount) || 0), 0) : 0);
        const totalBalance = (Array.isArray(formData.payments) ? formData.payments.reduce((s, p) => s + (Number(p.balance) || 0), 0) : 0);
        const totalRefund = (Array.isArray(formData.payments) ? formData.payments.reduce((s, p) => s + (p.refundAmount ? Number(p.refundAmount) : 0), 0) : 0);

        // IMPORTANT: reduced page margins and print styles to fit one page where possible
        return `<!doctype html><html><head><meta charset="utf-8"><title>Client Biodata - ${fullName}</title>
      <style>
        /* ensure small margins in print */
        @page { size: A4 portrait; margin: 15px; }
        html,body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
        body{font-family:Arial,Helvetica,sans-serif;color:#111;background:#f5f7fb;margin:0;padding:0}
        /* page uses full printable width minus page margins (15px left+right) */
        .page{width:calc(100% - 30px); margin:0 auto; background:#fff; padding:12px; border-radius:6px; box-shadow:none;}
        .header{display:flex;gap:12px;align-items:center; justify-content:center}
        .header img{max-width:100%; height:auto; display:block}
        h1{margin:6px 0 4px 0; color:#0b66a3;text-align:center; font-size:20px}
        h3{margin:0 0 6px 0; font-size:14px}
        .section{margin-top:12px;padding:10px;border-radius:4px;background:transparent;border:1px solid #eef3fb}
        table{width:100%;border-collapse:collapse; font-size:12px}
        th,td{padding:6px;border:1px solid #e6eef8;font-size:12px;text-align:left;vertical-align:top}
        th{background:#f7fbff; font-weight:600}
        .muted{color:#666;font-size:12px}
        .small{font-size:11px;color:#444}
        /* reduce table density for print */
        .workers-table th, .workers-table td, .payments-table th, .payments-table td { font-size:11px; padding:6px }
        /* make sure long text wraps */
        td { word-break: break-word; white-space: normal; }
        /* media print tweaks */
        @media print {
          body{background:#fff}
          .page{box-shadow:none; border-radius:0; padding:8px}
          h1{font-size:18px}
          table, th, td { font-size:11px; }
        }
      </style>
    </head><body>
    <div class="page">
      <div class="header"><img src="${headerImage}" alt="Header" /></div>
      <div><h1>Client Biodata</h1><div class="muted" style="text-align:center">${metaDate}</div></div>

      <div class="section">
        <h3>Basic Info</h3>
        <table>
          <tbody>
            ${renderPairs(basicFields)}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h3>Address</h3>
        <table>
          <tbody>
            ${renderPairs(addressFields)}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h3>Care Recipient Details</h3>
        <table>
          <tbody>
            ${renderPairs(careFields)}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h3>Workers</h3>
        <table class="workers-table"><thead><tr><th>#</th><th>ID</th><th>Name</th><th>Basic Salary</th><th>From</th><th>To</th><th>Total Days</th><th>Remarks</th></tr></thead><tbody>${workersRows}</tbody></table>
      </div>

      <div class="section">
        <h3>Payments</h3>
        <table class="payments-table"><thead><tr><th>#</th><th>Date</th><th>Method</th><th>Paid</th><th>Balance</th><th>Receipt</th><th>Refund</th></tr></thead><tbody>${paymentsRows}</tbody></table>
        <div style="margin-top:8px" class="small"><strong>Totals:</strong> Paid: ${formatINR(totalPaid)} — Balance: ${formatINR(totalBalance)}</div>
      </div>
      <div class="section">
        <h3>Management</h3>
        <div style="margin-top:8px" class="small"><strong>Drooper Signature:</strong>________________________________  </div>
        <br>
        <div style="margin-top:8px" class="small"><strong>Executer Sign  Signature:</strong>___________________________  </div>
      </div>
    </div>
    </body></html>`;
    }

    // paymentsCount
    const paymentsCount = (Array.isArray(formData.payments) ? formData.payments.length : 0);

    // inline CSS for refund badge pulse
    const extraStyles = `
    .refund-badge {
      display:inline-block;
      padding:6px 10px;
      border-radius:10px;
      background:#f1f1f1;
      color:#444;
      border:1px solid #ddd;
      transition: background .22s ease, color .22s ease, transform .18s ease;
    }
    .refund-badge.pulse {
      animation: pulse 900ms ease-in-out infinite;
      background: #fff1f1;
      color: #b80000;
      transform: translateY(-1px);
      box-shadow: 0 3px 8px rgba(184,0,0,0.06);
    }
    @keyframes pulse {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.03); opacity: 0.85; }
      100% { transform: scale(1); opacity: 1; }
    }
    .payment-logs { max-height: 160px; overflow:auto; border:1px solid #eee; padding:8px; border-radius:6px; background:#fafafa; font-size:13px }
    .payment-logs .entry { padding:6px 8px; border-bottom:1px dashed #eee }
    .payment-logs .entry:last-child { border-bottom: none }
  `;

    const safe = (v, d = "") => (v === undefined || v === null || String(v).trim() === "" ? d : v);

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: extraStyles }} />
            <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
                <div className="modal-dialog modal-xl modal-dialog-centered display-client-modal" onClick={() => handleCloseAttempt()}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header bg-secondary text-white justify-content-between">
                            <div>
                                <h5 className="modal-title">
                                    {editMode ? <strong>Edit Client</strong> : <strong>View Client</strong>} — {formData.idNo} — {formData.clientName}
                                </h5>
                                <div className="small text-muted">{paymentsCount} payments • {Array.isArray(formData.workers) ? formData.workers.length : 0} workers</div>
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
                                    ["address", "Address"],
                                    ["service", "Service Details"],
                                    ["patient", "Care Recipients"],
                                    ["workers", `Workers (${formData.workers?.length || 0})`],
                                    ["payments", `Payments (${formData.payments?.length || 0})`],
                                    ["detailinfo", "Detail-Info"],
                                    ["biodata", "Biodata"],
                                ].map(([key, label]) => (
                                    <li key={key} className="nav-item" role="presentation">
                                        <button className={`nav-link ${activeTab === key ? "active" : ""}`} onClick={() => setActiveTab(key)}>
                                            <strong>{label}</strong>
                                        </button>
                                    </li>
                                ))}
                            </ul>

                            <div className="tab-content p-3">
                                {/* Basic */}
                                {activeTab === "basic" && (
                                    <div>
                                        <div className="row">
                                            <div className="col-md-4">
                                                <label className="form-label"><strong>ID No</strong></label>
                                                <input type="text" className="form-control" name="idNo" value={formData.idNo || ""} onChange={handleChange} disabled />
                                            </div>

                                            <div className="col-md-4">
                                                <label className="form-label"><strong>Client Name</strong> <span className="text-danger">*</span></label>
                                                <input
                                                    className={`form-control ${errors.clientName ? "is-invalid" : ""}`}
                                                    name="clientName"
                                                    value={formData.clientName || ""}
                                                    onChange={handleChange}
                                                    onBlur={() => handleBlurField("clientName")}
                                                    disabled={!editMode}
                                                />
                                                {errors.clientName && <div className="invalid-feedback">{errors.clientName}</div>}
                                            </div>

                                            <div className="col-md-4">
                                                <label className="form-label"><strong>Gender</strong></label>
                                                <select className="form-control" name="gender" value={formData.gender || ""} onChange={handleChange} disabled={!editMode}>
                                                    <option value="">Select</option>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="row mt-3">
                                            <div className="col-md-4">
                                                <label className="form-label"><strong>Location</strong> <span className="text-danger">*</span></label>
                                                <input
                                                    className={`form-control ${errors.location ? "is-invalid" : ""}`}
                                                    name="location"
                                                    value={formData.location || ""}
                                                    onChange={handleChange}
                                                    onBlur={() => handleBlurField("location")}
                                                    disabled={!editMode}
                                                />
                                                {errors.location && <div className="invalid-feedback">{errors.location}</div>}
                                            </div>

                                            <div className="col-md-4">
                                                <label className="form-label"><strong>Mobile No 1</strong> <span className="text-danger">*</span></label>
                                                <input
                                                    className={`form-control ${errors.mobileNo1 ? "is-invalid" : ""}`}
                                                    name="mobileNo1"
                                                    value={formData.mobileNo1 || ""}
                                                    onChange={handleChange}
                                                    onBlur={() => handleBlurField("mobileNo1")}
                                                    disabled={!editMode}
                                                    maxLength="10"
                                                />
                                                {errors.mobileNo1 && <div className="invalid-feedback">{errors.mobileNo1}</div>}
                                            </div>

                                            <div className="col-md-4">
                                                <label className="form-label"><strong>Mobile No 2</strong></label>
                                                <input className="form-control" name="mobileNo2" value={formData.mobileNo2 || ""} onChange={handleChange} disabled={!editMode} maxLength="10" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Address */}
                                {activeTab === "address" && (
                                    <div>
                                        <div className="row">
                                            <div className="col-md-4">
                                                <label className="form-label"><strong>Door No</strong> <span className="text-danger">*</span></label>
                                                <input
                                                    className={`form-control ${errors.dNo ? "is-invalid" : ""}`}
                                                    name="dNo"
                                                    value={formData.dNo || ""}
                                                    onChange={handleChange}
                                                    onBlur={() => handleBlurField("dNo")}
                                                    disabled={!editMode}
                                                />
                                                {errors.dNo && <div className="invalid-feedback">{errors.dNo}</div>}
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label"><strong>Landmark</strong></label>
                                                <input className="form-control" name="landMark" value={formData.landMark || ""} onChange={handleChange} disabled={!editMode} />
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label"><strong>Street</strong></label>
                                                <input className="form-control" name="street" value={formData.street || ""} onChange={handleChange} disabled={!editMode} />
                                            </div>
                                        </div>

                                        <div className="row mt-3">
                                            <div className="col-md-4">
                                                <label className="form-label"><strong>Village/Town</strong> <span className="text-danger">*</span></label>
                                                <input className="form-control" name="villageTown" value={formData.villageTown || ""} onChange={handleChange} disabled={!editMode} />
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label"><strong>Mandal</strong> <span className="text-danger">*</span></label>
                                                <input className="form-control" name="mandal" value={formData.mandal || ""} onChange={handleChange} disabled={!editMode} />
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label"><strong>District</strong> <span className="text-danger">*</span></label>
                                                <input className="form-control" name="district" value={formData.district || ""} onChange={handleChange} disabled={!editMode} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Service Details */}
                                {activeTab === "service" && (
                                    <div>
                                        <div className=" mb-3">
                                            <div className="">
                                                <div className="row mb-2">
                                                    <div className="col-md-4">
                                                        <label className="form-label"><strong>Type of Service</strong></label>
                                                        <input className="form-control" name="typeOfService" value={formData.typeOfService || ""} onChange={handleChange} disabled={!editMode} />
                                                    </div>
                                                    <div className="col-md-4">
                                                        <label className="form-label"><strong>Service Charges</strong></label>
                                                        <input className="form-control" name="serviceCharges" value={formData.serviceCharges || ""} onChange={handleChange} disabled={!editMode} />
                                                    </div>
                                                    <div className="col-md-4">
                                                        <label className="form-label"><strong>Service Period</strong></label>
                                                        <input className="form-control" name="servicePeriod" value={formData.servicePeriod || ""} onChange={handleChange} disabled={!editMode} />
                                                    </div>
                                                </div>

                                                <div className="row mb-2">
                                                    <div className="col-md-4">
                                                        <label className="form-label"><strong>Travelling Charges</strong></label>
                                                        <input className="form-control" name="travellingCharges" value={formData.travellingCharges || ""} onChange={handleChange} disabled={!editMode} />
                                                    </div>
                                                    <div className="col-md-4">
                                                        <label className="form-label"><strong>Service Status</strong></label>
                                                        <input className="form-control" name="serviceStatus" value={formData.serviceStatus || ""} onChange={handleChange} disabled={!editMode} />
                                                    </div>
                                                    <div className="col-md-4">
                                                        <label className="form-label"><strong>Gap If Any</strong></label>
                                                        <input className="form-control" name="gapIfAny" value={formData.gapIfAny || ""} onChange={handleChange} disabled={!editMode} />
                                                    </div>
                                                </div>

                                                <div className="row mb-2">
                                                    <div className="col-md-4">
                                                        <label className="form-label"><strong>Starting Date</strong></label>
                                                        <input className="form-control" type="date" name="startingDate" value={formData.startingDate ? formatDateForInput(formData.startingDate) : ""} onChange={handleChange} disabled={!editMode} />
                                                    </div>
                                                    <div className="col-md-4">
                                                        <label className="form-label"><strong>Ending Date</strong></label>
                                                        <input className="form-control" type="date" name="endingDate" value={formData.endingDate ? formatDateForInput(formData.endingDate) : ""} onChange={handleChange} disabled={!editMode} />
                                                    </div>
                                                    <div className="col-md-4">
                                                        <label className="form-label"><strong>Page No</strong></label>
                                                        <input className="form-control" name="pageNo" value={formData.pageNo || ""} onChange={handleChange} disabled={!editMode} />
                                                    </div>
                                                </div>

                                                <div className="row">
                                                    <div className="col-12">
                                                        <label className="form-label"><strong>Service Remarks</strong></label>
                                                        <textarea className="form-control" name="serviceRemarks" rows="3" value={formData.serviceRemarks || ""} onChange={handleChange} disabled={!editMode} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Care Recipient / Patient */}
                                {activeTab === "patient" && (
                                    <div>
                                        <div className=" mb-3">
                                            <div className="">
                                                <div className="row mb-2">
                                                    <div className="col-md-3">
                                                        <label className="form-label"><strong>Care Recipient Name</strong></label>
                                                        <input className="form-control" name="patientName" value={formData.patientName || formData.patientName || ""} onChange={handleChange} disabled={!editMode} />
                                                    </div>
                                                    <div className="col-md-3">
                                                        <label className="form-label"><strong>Age</strong></label>
                                                        <input className="form-control" name="patientAge" value={formData.patientAge || ""} onChange={handleChange} disabled={!editMode} />
                                                    </div>
                                                    <div className="col-md-3">
                                                        <label className="form-label"><strong>Service Status</strong></label>
                                                        <input className="form-control" name="patientServiceStatus" value={formData.patientServiceStatus || formData.serviceStatus || ""} onChange={handleChange} disabled={!editMode} />
                                                    </div>
                                                    <div className="col-md-3">
                                                        <label className="form-label"><strong>Dropper Name</strong></label>
                                                        <input className="form-control" name="dropperName" value={formData.dropperName || ""} onChange={handleChange} disabled={!editMode} />
                                                    </div>
                                                </div>

                                                <div className="row mb-2">
                                                    <div className="col-md-6">
                                                        <label className="form-label"><strong>About Care Recipient</strong></label>
                                                        <textarea className="form-control" name="aboutPatient" rows="3" value={formData.aboutPatient || ""} onChange={handleChange} disabled={!editMode} />
                                                    </div>
                                                    <div className="col-md-6">
                                                        <label className="form-label"><strong>About Work / Care Notes</strong></label>
                                                        <textarea className="form-control" name="aboutWork" rows="3" value={formData.aboutWork || ""} onChange={handleChange} disabled={!editMode} />
                                                    </div>
                                                </div>

                                                <div className="row"></div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Workers */}
                                {activeTab === "workers" && (
                                    <div>
                                        {(formData.workers || []).map((worker, idx) => {
                                            const locked = !!worker.__locked && !editMode;
                                            return (
                                                <div key={idx} className="modal-card mb-3 p-3 border rounded">
                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                        <strong>Worker #{idx + 1}</strong>
                                                        {locked && <span className="badge bg-secondary">Existing</span>}
                                                    </div>

                                                    <div className="row">
                                                        <div className="col-md-4">
                                                            <label className="form-label"><strong>ID No</strong> <span className="text-danger">*</span></label>
                                                            <input
                                                                data-idx={idx}
                                                                className={`form-control ${errors[`workers.${idx}.workerIdNo`] ? "is-invalid" : ""}`}
                                                                name="workerIdNo"
                                                                value={worker.workerIdNo || ""}
                                                                onChange={(e) => handleChange(e, "workers", idx)}
                                                                onBlur={() => handleBlurField(`workers.${idx}.workerIdNo`)}
                                                                disabled={locked}
                                                            />
                                                            {errors[`workers.${idx}.workerIdNo`] && <div className="invalid-feedback">{errors[`workers.${idx}.workerIdNo`]}</div>}
                                                        </div>

                                                        <div className="col-md-4">
                                                            <label className="form-label"><strong>Name</strong> <span className="text-danger">*</span></label>
                                                            <input
                                                                data-idx={idx}
                                                                className={`form-control ${errors[`workers.${idx}.cName`] ? "is-invalid" : ""}`}
                                                                name="cName"
                                                                value={worker.cName || ""}
                                                                onChange={(e) => handleChange(e, "workers", idx)}
                                                                onBlur={() => handleBlurField(`workers.${idx}.cName`)}
                                                                disabled={locked}
                                                            />
                                                            {errors[`workers.${idx}.cName`] && <div className="invalid-feedback">{errors[`workers.${idx}.cName`]}</div>}
                                                        </div>

                                                        <div className="col-md-4">
                                                            <label className="form-label"><strong>Basic Salary</strong></label>
                                                            <input
                                                                data-idx={idx}
                                                                className="form-control"
                                                                name="basicSalary"
                                                                type="number"
                                                                value={worker.basicSalary ?? ""}
                                                                onChange={(e) => handleChange(e, "workers", idx)}
                                                                disabled={!editMode && !!worker.__locked}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="row mt-2">
                                                        <div className="col-md-4">
                                                            <label className="form-label"><strong>Starting Date</strong></label>
                                                            <input data-idx={idx} className="form-control" name="startingDate" type="date" value={worker.startingDate || ""} onChange={(e) => handleChange(e, "workers", idx)} disabled={locked} />
                                                        </div>
                                                        <div className="col-md-4">
                                                            <label className="form-label"><strong>Ending Date</strong></label>
                                                            <input data-idx={idx} className="form-control" name="endingDate" type="date" value={worker.endingDate || ""} onChange={(e) => handleChange(e, "workers", idx)} disabled={locked} />
                                                        </div>
                                                        <div className="col-md-4">
                                                            <label className="form-label"><strong>Total Days</strong></label>
                                                            <input data-idx={idx} className="form-control" name="totalDays" type="number" value={worker.totalDays || ""} onChange={(e) => handleChange({ target: { name: "totalDays", value: e.target.value } }, "workers", idx)} disabled={!editMode} />
                                                        </div>
                                                    </div>

                                                    <div className="row mt-2">
                                                        <div className="col-12">
                                                            <label className="form-label"><strong>Remarks</strong></label>
                                                            <textarea className="form-control" name="remarks" rows="2" value={worker.remarks || ""} onChange={(e) => handleChange(e, "workers", idx)} disabled={locked} />
                                                        </div>
                                                    </div>

                                                    <div className="row mt-2">
                                                        <div className="col-12 d-flex justify-content-end">
                                                            {!worker.__locked && editMode && <button className="btn btn-danger btn-sm" onClick={() => removeWorker(idx)}>Remove</button>}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {editMode && <button className="btn btn-primary" onClick={addWorker}>Add New Worker</button>}
                                    </div>
                                )}

                                {/* Payments */}
                                {activeTab === "payments" && (
                                    <div>
                                        {(formData.payments || []).map((p, idx) => {
                                            const locked = !!p.__locked && !editMode;
                                            const refundDisabled = Number(p.refundAmount || 0) > 0;
                                            return (
                                                <div key={idx} className="modal-card mb-3 p-3 border rounded">
                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                        <strong>Payment #{idx + 1}</strong>
                                                        {locked && <span className="badge bg-secondary">Existing</span>}
                                                    </div>

                                                    <div className="row">
                                                        <div className="col-md-4">
                                                            <label className="form-label"><strong>Payment Method</strong> <span className="text-danger">*</span></label>
                                                            <select
                                                                data-idx={idx}
                                                                className={`form-control ${errors[`payments.${idx}.paymentMethod`] ? "is-invalid" : ""}`}
                                                                name="paymentMethod"
                                                                value={p.paymentMethod || "cash"}
                                                                onChange={(e) => handleChange(e, "payments", idx)}
                                                                onBlur={() => handleBlurField(`payments.${idx}.paymentMethod`)}
                                                                disabled={locked}
                                                            >
                                                                <option value="cash">Cash</option>
                                                                <option value="online">Online</option>
                                                                <option value="check">Check</option>
                                                                <option value="other">Other</option>
                                                            </select>
                                                            {errors[`payments.${idx}.paymentMethod`] && <div className="invalid-feedback">{errors[`payments.${idx}.paymentMethod`]}</div>}
                                                        </div>

                                                        <div className="col-md-4">
                                                            <label className="form-label"><strong>Date</strong> <span className="text-danger">*</span></label>
                                                            <input
                                                                data-idx={idx}
                                                                className={`form-control ${errors[`payments.${idx}.date`] ? "is-invalid" : ""}`}
                                                                name="date"
                                                                type="date"
                                                                value={p.date ? formatDateForInput(p.date) : ""}
                                                                onChange={(e) => handleChange(e, "payments", idx)}
                                                                onBlur={() => handleBlurField(`payments.${idx}.date`)}
                                                                disabled={locked}
                                                            />
                                                            {errors[`payments.${idx}.date`] && <div className="invalid-feedback">{errors[`payments.${idx}.date`]}</div>}
                                                        </div>

                                                        <div className="col-md-4">
                                                            <label className="form-label"><strong>Paid Amount</strong> <span className="text-danger">*</span></label>
                                                            <input
                                                                data-idx={idx}
                                                                className={`form-control ${errors[`payments.${idx}.paidAmount`] ? "is-invalid" : ""}`}
                                                                name="paidAmount"
                                                                type="number"
                                                                value={p.paidAmount ?? ""}
                                                                onChange={(e) => handleChange(e, "payments", idx)}
                                                                onBlur={() => handleBlurField(`payments.${idx}.paidAmount`)}
                                                                disabled={locked}
                                                            />
                                                            {errors[`payments.${idx}.paidAmount`] && <div className="invalid-feedback">{errors[`payments.${idx}.paidAmount`]}</div>}
                                                        </div>
                                                    </div>

                                                    <div className="row mt-2">
                                                        <div className="col-md-4">
                                                            <label className="form-label"><strong>Balance</strong></label>
                                                            <input data-idx={idx} className="form-control" name="balance" type="number" value={p.balance ?? ""} onChange={(e) => handleChange(e, "payments", idx)} disabled={locked} />
                                                        </div>

                                                        <div className="col-md-4">
                                                            <label className="form-label"><strong>Receipt No</strong></label>
                                                            <input data-idx={idx} className="form-control" name="receptNo" value={p.receptNo || ""} onChange={(e) => handleChange(e, "payments", idx)} disabled={locked} />
                                                        </div>

                                                        <div className="col-md-4">
                                                            <label className="form-label"><strong>Reminder Days</strong></label>
                                                            <input data-idx={idx} className="form-control" name="reminderDays" type="number" value={p.reminderDays ?? ""} onChange={(e) => handleChange(e, "payments", idx)} disabled={!editMode && !!p.__locked} />
                                                        </div>
                                                    </div>

                                                    <div className="row mt-2">
                                                        <div className="col-md-4">
                                                            <label className="form-label"><strong>Reminder Date</strong></label>
                                                            <input data-idx={idx} className="form-control" name="reminderDate" type="date" value={p.reminderDate ? formatDateForInput(p.reminderDate) : ""} onChange={(e) => handleChange(e, "payments", idx)} disabled={!editMode && !!p.__locked} />
                                                        </div>
                                                    </div>

                                                    {/* Remarks new row */}
                                                    <div className="row mt-2">
                                                        <div className="col-12">
                                                            <label className="form-label"><strong>Remarks</strong></label>
                                                            <textarea data-idx={idx} className="form-control" name="remarks" rows="2" value={p.remarks || ""} onChange={(e) => handleChange(e, "payments", idx)} disabled={locked} />
                                                        </div>
                                                    </div>

                                                    {/* Refund toggle */}
                                                    <div className="row mt-2">
                                                        <div className="col-12 d-flex align-items-center" style={{ gap: 10 }}>
                                                            <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                                                                <input
                                                                    id={`refundSwitch-${idx}`}
                                                                    data-idx={idx}
                                                                    className="form-check-input"
                                                                    type="checkbox"
                                                                    name="refund"
                                                                    checked={!!p.refund}
                                                                    onChange={(e) => handleChange(e, "payments", idx)}
                                                                    disabled={refundDisabled || (!editMode && !!p.__locked)}
                                                                    style={{ transform: p.refund ? "scale(1.05)" : "scale(1)", transition: "transform 180ms ease" }}
                                                                />
                                                                <label htmlFor={`refundSwitch-${idx}`} style={{ fontWeight: 600, margin: 0 }}>
                                                                    <span className={`refund-badge ${p.refund ? "pulse" : ""}`}>Refund</span>
                                                                </label>
                                                            </div>

                                                            {/* show small hint if refund disabled */}
                                                            {refundDisabled && <div className="text-muted small">Refund amount entered — refund toggle disabled</div>}
                                                        </div>
                                                    </div>

                                                    {p.refund && (
                                                        <div className="row mt-2">
                                                            <div className="col-md-4">
                                                                <label className="form-label"><strong>Refund Date</strong> <span className="text-danger">*</span></label>
                                                                <input data-idx={idx} className={`form-control ${errors[`payments.${idx}.refundDate`] ? "is-invalid" : ""}`} name="refundDate" type="date" value={p.refundDate ? formatDateForInput(p.refundDate) : ""} onChange={(e) => handleChange(e, "payments", idx)} disabled={!editMode && !!p.__locked} />
                                                                {errors[`payments.${idx}.refundDate`] && <div className="invalid-feedback">{errors[`payments.${idx}.refundDate`]}</div>}
                                                            </div>
                                                            <div className="col-md-4">
                                                                <label className="form-label"><strong>Refund Amount</strong> <span className="text-danger">*</span></label>
                                                                <input data-idx={idx} className={`form-control ${errors[`payments.${idx}.refundAmount`] ? "is-invalid" : ""}`} name="refundAmount" type="number" value={p.refundAmount ?? ""} onChange={(e) => handleChange(e, "payments", idx)} disabled={!editMode && !!p.__locked} />
                                                                {errors[`payments.${idx}.refundAmount`] && <div className="invalid-feedback">{errors[`payments.${idx}.refundAmount`]}</div>}
                                                            </div>
                                                            <div className="col-md-4">
                                                                <label className="form-label"><strong>Refund Method</strong> <span className="text-danger">*</span></label>
                                                                <select data-idx={idx} className={`form-control ${errors[`payments.${idx}.refundPaymentMethod`] ? "is-invalid" : ""}`} name="refundPaymentMethod" value={p.refundPaymentMethod || ""} onChange={(e) => handleChange(e, "payments", idx)} disabled={!editMode && !!p.__locked}>
                                                                    <option value="">Select</option>
                                                                    <option value="cash">Cash</option>
                                                                    <option value="online">Online</option>
                                                                    <option value="check">Check</option>
                                                                    <option value="other">Other</option>
                                                                </select>
                                                                {errors[`payments.${idx}.refundPaymentMethod`] && <div className="invalid-feedback">{errors[`payments.${idx}.refundPaymentMethod`]}</div>}
                                                            </div>
                                                            <div className="col-md-12">
                                                                <label className="form-label"><strong>Refund Remarks</strong> <span className="text-danger">*</span></label>
                                                                <textarea data-idx={idx} className={`form-control ${errors[`payments.${idx}.refundRemarks`] ? "is-invalid" : ""}`} name="refundRemarks" rows="2" value={p.refundRemarks || ""} onChange={(e) => handleChange(e, "payments", idx)} disabled={!editMode && !!p.__locked}></textarea>
                                                                {errors[`payments.${idx}.refundRemarks`] && <div className="invalid-feedback">{errors[`payments.${idx}.refundRemarks`]}</div>}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="mt-2 d-flex justify-content-end gap-2">
                                                        {!p.__locked && editMode && <button className="btn btn-danger btn-sm" onClick={() => removePayment(idx)}>Remove</button>}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {editMode && <button className="btn btn-primary" onClick={addPayment}>Add New Payment</button>}

                                        {/* payment logs - bottom */}
                                        <div className="mt-3">
                                            <h6><strong>Change Log</strong></h6>
                                            <div className="payment-logs">
                                                {(formData.paymentLogs || []).length === 0 && <div className="text-muted small">No changes yet</div>}
                                                {(formData.paymentLogs || []).map((L, i) => (
                                                    <div className="entry" key={i}>
                                                        <div style={{ fontSize: 12 }}><strong>{L.user}</strong> — <span className="text-muted small">{L.dateLabel || new Date(L.date).toLocaleString()}</span></div>
                                                        <div style={{ fontSize: 13 }}>{L.message}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Detail-Info */}
                                {activeTab === "detailinfo" && (
                                    <div>
                                        <h6><strong>Payment Details</strong></h6>
                                        <div className="table-responsive mb-3">
                                            <table className="table table-sm table-bordered">
                                                <thead>
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Date</th>
                                                        <th>Payment</th>
                                                        <th>Balance</th>
                                                        <th>Method</th>
                                                        <th>Receipt</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(formData.payments || []).map((p, i) => {
                                                        const d = p.date ? parseDateSafe(p.date) : null;
                                                        const dateStr = d ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}` : (p.date || "-");
                                                        return (
                                                            <tr key={i}>
                                                                <td>{i + 1}</td>
                                                                <td>{dateStr}</td>
                                                                <td>{formatINR(p.paidAmount)}</td>
                                                                <td>{formatINR(p.balance)}</td>
                                                                <td>{p.paymentMethod || "-"}</td>
                                                                <td>{p.receptNo || "-"}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        <h6 className="mt-3"><strong>Refund Details</strong></h6>
                                        <div className="table-responsive mb-3">
                                            <table className="table table-sm table-bordered">
                                                <thead>
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Payment #</th>
                                                        <th>Refund Date</th>
                                                        <th>Refund Amount</th>
                                                        <th>Refund Method</th>
                                                        <th>Refund Remarks</th>
                                                        <th>Receipt</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(formData.payments || []).filter(p => p.refund || Number(p.refundAmount || 0) > 0).map((p, i) => {
                                                        const d = p.refundDate ? parseDateSafe(p.refundDate) : (p.date ? parseDateSafe(p.date) : null);
                                                        const dateStr = d ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}` : (p.refundDate || "-");
                                                        return (
                                                            <tr key={i}>
                                                                <td>{i + 1}</td>
                                                                <td>{(formData.payments || []).indexOf(p) + 1}</td>
                                                                <td>{dateStr}</td>
                                                                <td>{formatINR(p.refundAmount)}</td>
                                                                <td>{p.refundPaymentMethod || "-"}</td>
                                                                <td>{p.refundRemarks || "-"}</td>
                                                                <td>{p.receptNo || "-"}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        <h6 className="mt-3"><strong>Workers Details</strong></h6>
                                        <div className="table-responsive">
                                            <table className="table table-sm table-bordered">
                                                <thead>
                                                    <tr>
                                                        <th>#</th>
                                                        <th>ID No</th>
                                                        <th>Name</th>
                                                        <th>Basic Salary</th>
                                                        <th>From</th>
                                                        <th>To</th>
                                                        <th>Total Days</th>
                                                        <th>Remarks</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(formData.workers || []).map((w, i) => (
                                                        <tr key={i}>
                                                            <td>{i + 1}</td>
                                                            <td>{w.workerIdNo || "-"}</td>
                                                            <td>{w.cName || "-"}</td>
                                                            <td>{formatINR(w.basicSalary)}</td>
                                                            <td>{w.startingDate || "-"}</td>
                                                            <td>{w.endingDate || "-"}</td>
                                                            <td>{w.totalDays || "-"}</td>
                                                            <td>{w.remarks || "-"}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Biodata */}
                                {activeTab === "biodata" && (
                                    <div>
                                        <div className="d-flex justify-content-end gap-2 mb-2">
                                            <button className="btn btn-outline-secondary btn-sm" onClick={() => {
                                                const html = buildClientBiodataHTML();
                                                const blob = new Blob([html], { type: "text/html;charset=utf-8" });
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement("a");
                                                a.href = url;
                                                a.download = `${(formData.clientName || "client").replace(/\s+/g, "_")}_biodata.html`;
                                                document.body.appendChild(a); a.click(); a.remove();
                                                setTimeout(() => URL.revokeObjectURL(url), 2000);
                                            }}>Download</button>
                                            <button className="btn btn-primary btn-sm" onClick={() => {
                                                const html = buildClientBiodataHTML();
                                                const w = window.open("", "_blank");
                                                w.document.write(html);
                                                w.document.close();
                                                w.print();
                                            }}>Print</button>
                                        </div>

                                        <iframe ref={bioIframeRef} title="biodata" style={{ width: "100%", height: 520, border: "1px solid #e5e5e5", borderRadius: 6 }} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="modal-footer">
                            {editMode && <button className="btn btn-success" onClick={handleSubmit}><strong>Save Changes</strong></button>}
                            <button className="btn btn-secondary" onClick={() => handleCloseAttempt()}><strong>Close</strong></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete confirm */}
            {showDeleteConfirm && (
                <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title"><strong>Confirm Delete</strong></h5>
                                <button className="btn-close" onClick={() => setShowDeleteConfirm(false)} />
                            </div>
                            <div className="modal-body">
                                <p>Are you sure you want to delete this client? This will move the data to the exited clients database.</p>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-danger" onClick={() => { setShowDeleteConfirm(false); onDelete && onDelete(client?.id || client?.key); }}>Yes, Delete</button>
                                <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Unsaved confirm */}
            {showUnsavedConfirm && (
                <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog modal-sm modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header"><h5 className="modal-title"><strong>Discard changes?</strong></h5></div>
                            <div className="modal-body"><p>You have unsaved changes. Do you want to discard them?</p></div>
                            <div className="modal-footer">
                                <button className="btn btn-danger" onClick={() => { setShowUnsavedConfirm(false); onClose && onClose(); }}>Discard</button>
                                <button className="btn btn-secondary" onClick={() => setShowUnsavedConfirm(false)}>Keep Editing</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Thank you */}
            {showThankYou && (
                <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.2)" }}>
                    <div className="modal-dialog modal-sm modal-dialog-centered"><div className="modal-content"><div className="modal-body text-center p-4"><h5><strong>Thank you</strong></h5><p>Your data has been saved.</p></div></div></div>
                </div>
            )}
        </>
    );
}
