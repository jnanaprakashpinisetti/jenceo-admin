
// ClientModal.js
// Updated per user request:
// 1) Existing payments are locked (not editable). In edit mode payments remain disabled for locked rows;
//    only newly added payment rows (without __locked) can be edited.
// 2) Improved UI for Change Log (badges, timestamps, expandable messages)
// 3) In view mode inputs are replaced with readable tables/labels (no inputs shown)
// 4) Full file ready for download

import React, { useEffect, useRef, useState } from "react";
import firebaseDB from "../../firebase"; // adjust path if needed

const removalReasonOptions = [
  "Contract Closed",
  "Contract Terminated",
  "Contract Stopped",
];

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
  if (Array.isArray(clone.fullAuditLogs)) clone.fullAuditLogs = clone.fullAuditLogs.map((l) => ({ ...l }));
  return clone;
};

// friendly label generator (used in audit summarization)
const friendlyLabel = (path) => {
  const mPay = path.match(/^payments\[(\d+)\]\.(.+)$/);
  if (mPay) {
    const idx = Number(mPay[1]) + 1;
    const key = mPay[2];
    const labelMap = {
      paidAmount: "Paid Amount",
      balance: "Balance",
      receptNo: "Receipt No",
      date: "Date",
      paymentMethod: "Payment Method",
      remarks: "Remarks",
      reminderDate: "Reminder Date",
      reminderDays: "Reminder Days",
      refundAmount: "Refund Amount",
      refundDate: "Refund Date",
      refundPaymentMethod: "Refund Method",
      refundRemarks: "Refund Remarks",
    };
    return `Payment #${idx} — ${labelMap[key] || key}`;
  }
  const mWork = path.match(/^workers\[(\d+)\]\.(.+)$/);
  if (mWork) {
    const idx = Number(mWork[1]) + 1;
    const key = mWork[2];
    const labelMap = {
      workerIdNo: "ID No",
      cName: "Name",
      basicSalary: "Basic Salary",
      startingDate: "Starting Date",
      endingDate: "Ending Date",
      totalDays: "Total Days",
    };
    return `Worker #${idx} — ${labelMap[key] || key}`;
  }
  const topMap = {
    clientName: "Client Name",
    idNo: "ID No",
    location: "Location",
    mobileNo1: "Mobile No 1",
  };
  return topMap[path] || path;
};

function buildChangeSummaryAndFullAudit(oldObj = {}, newObj = {}) {
  const summary = [];
  const full = [];

  const pushDiff = (path, a, b) => {
    const aVal = a === undefined || a === null ? "" : a;
    const bVal = b === undefined || b === null ? "" : b;
    if (String(aVal) !== String(bVal)) {
      const friendly = friendlyLabel(path);
      summary.push({ path, before: aVal, after: bVal, friendly });
      full.push({ path, before: aVal, after: bVal, friendly, type: "field" });
    }
  };

  const keys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);
  keys.forEach((k) => {
    if (k === "payments" || k === "workers" || k === "paymentLogs" || k === "fullAuditLogs") return;
    const a = oldObj[k];
    const b = newObj[k];
    if (typeof a === "object" && a !== null) return;
    if (typeof b === "object" && b !== null) return;
    pushDiff(k, a, b);
  });

  const oldWorkers = Array.isArray(oldObj.workers) ? oldObj.workers : [];
  const newWorkers = Array.isArray(newObj.workers) ? newObj.workers : [];
  const maxW = Math.max(oldWorkers.length, newWorkers.length);
  for (let i = 0; i < maxW; i++) {
    const ow = oldWorkers[i] || {};
    const nw = newWorkers[i] || {};
    const ks = new Set([...Object.keys(ow), ...Object.keys(nw)]);
    ks.forEach((k) => {
      if (k === "__locked") return;
      pushDiff(`workers[${i}].${k}`, ow[k], nw[k]);
    });
  }

  const oldPayments = Array.isArray(oldObj.payments) ? oldObj.payments : [];
  const newPayments = Array.isArray(newObj.payments) ? newObj.payments : [];
  const maxP = Math.max(oldPayments.length, newPayments.length);
  for (let i = 0; i < maxP; i++) {
    const op = oldPayments[i] || {};
    const np = newPayments[i] || {};
    const ks = new Set([...Object.keys(op), ...Object.keys(np)]);
    ks.forEach((k) => {
      if (k === "__locked") return;
      pushDiff(`payments[${i}].${k}`, op[k], np[k]);
    });
  }

  return { summaryChanges: summary, fullChanges: full };
}

const emptyPayment = () => ({
  id: Date.now(),
  paymentMethod: "cash",
  paidAmount: "",
  balance: "",
  receptNo: "",
  remarks: "",
  reminderDays: "",
  reminderDate: "",
  date: formatDateForInput(new Date()),
  refund: false,
  refundAmount: 0,
  refundDate: "",
  refundPaymentMethod: "",
  refundRemarks: "",
});

const getInitialFormData = () => ({
  idNo: "",
  clientName: "",
  gender: "",
  careOf: "",
  relation: "",
  location: "",
  mobileNo1: "",
  mobileNo2: "",
  dNo: "",
  landMark: "",
  street: "",
  villageTown: "",
  mandal: "",
  district: "",
  state: "",
  pincode: "",
  typeOfService: "",
  servicePeriod: "",
  serviceCharges: "",
  startingDate: "",
  endingDate: "",
  pageNo: "",
  patientName: "",
  patientAge: "",
  serviceStatus: "",
  dropperName: "",
  aboutPatient: "",
  aboutWork: "",
  workers: [],
  payments: [emptyPayment()],
  paymentLogs: [],
  fullAuditLogs: [],
});

const ClientModal = ({
  isOpen = false,
  onClose = () => {},
  client = null,
  onSave = null,
  onDelete = null,
  isEditMode = false,
  isAdmin = false,
  currentUserName = "System",
  onRemoved = () => {},
}) => {
  const [formData, setFormData] = useState(getInitialFormData());
  const [activeTab, setActiveTab] = useState("basic");
  const [errors, setErrors] = useState({});
  const [editMode, setEditMode] = useState(Boolean(isEditMode));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showFullAudit, setShowFullAudit] = useState(false);
  const bioIframeRef = useRef(null);
  const initialSnapshotRef = useRef(null);

  const [expandedLogIndex, setExpandedLogIndex] = useState(null);

  const [showRemovalConfirm, setShowRemovalConfirm] = useState(false);
  const [showRemovalModal, setShowRemovalModal] = useState(false);
  const [removalForm, setRemovalForm] = useState({ reason: "", comment: "" });
  const [removalErrors, setRemovalErrors] = useState({});

  const headerImage =
    "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FHeadder.svg?alt=media&token=fa65a3ab-ba03-4959-bc36-e293c6db48ae";

  useEffect(() => setEditMode(Boolean(isEditMode)), [isEditMode]);

  useEffect(() => {
    if (!client) {
      setFormData(getInitialFormData());
      initialSnapshotRef.current = null;
      setIsDirty(false);
      return;
    }

    const paymentsArr = client.payments ? (Array.isArray(client.payments) ? client.payments : Object.values(client.payments)) : [];
    const workersArr = client.workers ? (Array.isArray(client.workers) ? client.workers : Object.values(client.workers)) : [];
    const logs = client.paymentLogs ? (Array.isArray(client.paymentLogs) ? client.paymentLogs : Object.values(client.paymentLogs)) : [];
    const fullLogs = client.fullAuditLogs ? (Array.isArray(client.fullAuditLogs) ? client.fullAuditLogs : Object.values(client.fullAuditLogs)) : [];

    const payments = paymentsArr.map((p) => ({
      paymentMethod: p.paymentMethod ?? p.method ?? "cash",
      paidAmount: safeNumber(p.paidAmount ?? p.amount ?? 0),
      balance: safeNumber(p.balance ?? 0),
      receptNo: p.receptNo ?? p.receiptNo ?? "",
      remarks: p.remarks ?? "",
      reminderDays: p.reminderDays ?? "",
      reminderDate: p.reminderDate ?? "",
      date: p.date ?? p.paymentDate ?? "",
      refund: !!p.refund || !!p.refundAmount,
      refundAmount: safeNumber(p.refundAmount ?? 0),
      refundDate: p.refundDate ?? "",
      refundPaymentMethod: p.refundPaymentMethod ?? "",
      refundRemarks: p.refundRemarks ?? "",
      __locked: true, // lock existing payments to prevent editing
      ...p,
    }));

    const workers = workersArr.map((w) => {
      const start = w.startingDate ?? w.start ?? "";
      const end = w.endingDate ?? w.end ?? "";
      return {
        workerIdNo: w.workerIdNo ?? w.idNo ?? w.id ?? "",
        cName: w.cName ?? w.name ?? "",
        basicSalary: safeNumber(w.basicSalary ?? w.salary ?? 0),
        startingDate: start,
        endingDate: end,
        totalDays: w.totalDays ?? daysBetween(start, end),
        mobile1: w.mobile1 ?? w.mobile ?? "",
        mobile2: w.mobile2 ?? "",
        remarks: w.remarks ?? "",
        __locked: true,
        ...w,
      };
    });

    const snapshot = {
      ...client,
      workers: lockRows(workers),
      payments: lockRows(payments),
      paymentLogs: logs || [],
      fullAuditLogs: fullLogs || [],
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
    // when toggling edit mode we do NOT unlock existing payments — they remain read-only
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

    if ((section === "payments" || section === "workers") && index !== null) {
      setFormData((prev) => {
        const list = Array.isArray(prev[section]) ? [...prev[section]] : [];
        const row = { ...(list[index] || {}) };
        const locked = !!row.__locked;
        // IMPORTANT: existing locked rows should NOT be editable even in edit mode
        if (locked) return prev;

        // update value
        row[name] = value;

        // payments special logic
        if (section === "payments") {
          if (name === "reminderDays") {
            const days = Number(value) || 0;
            const base = parseDateSafe(row.date) || new Date();
            if (days > 0) row.reminderDate = formatDateForInput(addDaysToDate(base, days));
            else row.reminderDate = "";
          }
          if (name === "date" && row.reminderDays) {
            const days = Number(row.reminderDays) || 0;
            const base = parseDateSafe(value) || new Date();
            if (days > 0) row.reminderDate = formatDateForInput(addDaysToDate(base, days));
            else row.reminderDate = "";
          }
          if (name === "refundAmount") {
            row.refundAmount = safeNumber(value);
            if (Number(row.refundAmount) > 0) row.refund = true;
          }
          if (name === "refund") {
            if (!value) {
              if (!row.refundAmount || Number(row.refundAmount) === 0) {
                row.refundDate = "";
                row.refundPaymentMethod = "";
                row.refundRemarks = "";
              } else {
                row.refund = true;
              }
            } else {
              row.refund = true;
              row.refundDate = row.refundDate || row.date || formatDateForInput(new Date());
            }
          }
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
        markDirty(next);
        return next;
      });
      return;
    }

    setField(name, value);
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
      if (row?.__locked) return prev;
      list.splice(i, 1);
      const next = { ...prev, workers: list };
      markDirty(next);
      return next;
    });
  };

  const addPayment = () => {
    const np = emptyPayment();
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
      if (row?.__locked) return prev;
      list.splice(i, 1);
      const next = { ...prev, payments: list };
      markDirty(next);
      return next;
    });
  };

  const validateAll = () => {
    const v = {};
    if (editMode) {
      if (!formData.clientName || String(formData.clientName).trim() === "") v.clientName = "Client name is required";
      if (!formData.location || String(formData.location).trim() === "") v.location = "Location is required";
      if (!formData.mobileNo1 || String(formData.mobileNo1).trim() === "") v.mobileNo1 = "Mobile No 1 is required";
    }

    const payments = Array.isArray(formData.payments) ? formData.payments : [];
    payments.forEach((p, i) => {
      const hasValue = (p.paidAmount && String(p.paidAmount).trim() !== "") || (p.receptNo && String(p.receptNo).trim() !== "");
      if (!hasValue) return;
      if (!p.paymentMethod) v[`payments.${i}.paymentMethod`] = "Payment method is required";
      if (p.paidAmount === "" || Number(p.paidAmount) === 0) v[`payments.${i}.paidAmount`] = "Paid amount is required";
      if (!p.date) v[`payments.${i}.date`] = "Date is required";
      if (p.refund) {
        if (!p.refundDate) v[`payments.${i}.refundDate`] = "Refund date required";
        if (!p.refundAmount || Number(p.refundAmount) <= 0) v[`payments.${i}.refundAmount`] = "Refund amount required";
      }
    });

    const workers = Array.isArray(formData.workers) ? formData.workers : [];
    workers.forEach((w, i) => {
      if (!w.workerIdNo || String(w.workerIdNo).trim() === "") v[`workers.${i}.workerIdNo`] = "Worker ID required";
      if (!w.cName || String(w.cName).trim() === "") v[`workers.${i}.cName`] = "Worker name required";
    });

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

  const handleSubmit = async (ev) => {
    ev && ev.preventDefault && ev.preventDefault();
    if (!validateAll()) {
      setTimeout(() => focusFirstError(), 150);
      return;
    }

    const prevSnapshot = initialSnapshotRef.current ? JSON.parse(initialSnapshotRef.current) : {};
    const currentSnapshot = stripLocks(formData);

    const { summaryChanges, fullChanges } = buildChangeSummaryAndFullAudit(prevSnapshot, currentSnapshot);

    const now = new Date();
    const dateLabel = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

    const summaryEntry = summaryChanges.length > 0 ? {
      date: now.toISOString(),
      dateLabel,
      user: currentUserName || "System",
      message: summaryChanges.map(s => `${s.friendly}: '${String(s.before)}' → '${String(s.after)}'`).join("; "),
      changes: summaryChanges,
      type: "summary",
    } : null;

    const fullEntry = fullChanges.length > 0 ? {
      date: now.toISOString(),
      dateLabel,
      user: currentUserName || "System",
      changes: fullChanges,
      type: "full",
    } : null;

    const payload = stripLocks(formData);

    payload.paymentLogs = Array.isArray(payload.paymentLogs) ? payload.paymentLogs : [];
    payload.fullAuditLogs = Array.isArray(payload.fullAuditLogs) ? payload.fullAuditLogs : [];

    if (summaryEntry) {
      payload.paymentLogs = [...payload.paymentLogs.filter(l => l.type === "initial" || l.type === "summary"), summaryEntry];
      const summariesOnly = payload.paymentLogs.filter(l => l.type === "summary" || l.type === "initial");
      const nonSummaries = payload.paymentLogs.filter(l => l.type !== "summary" && l.type !== "initial");
      const keepSummaries = summariesOnly.slice(-10);
      payload.paymentLogs = [...nonSummaries, ...keepSummaries];
    }
    if (fullEntry) {
      payload.fullAuditLogs = [...payload.fullAuditLogs, fullEntry];
    }

    try {
      const res = onSave && onSave(payload);
      if (res && typeof res.then === "function") await res;

      setFormData((prev) => {
        const next = { ...prev, paymentLogs: payload.paymentLogs, fullAuditLogs: payload.fullAuditLogs };
        initialSnapshotRef.current = JSON.stringify(next);
        markDirty(next);
        setShowThankYou(true);
        setTimeout(() => setShowThankYou(false), 1600);
        setIsDirty(false);
        return next;
      });
    } catch (err) {
      console.error("Save failed", err);
      setErrors((prev) => ({ ...prev, __save: "Save failed. Try again." }));
    }
  };

  const handleCloseAttempt = () => {
    if (isDirty) setShowUnsavedConfirm(true);
    else onClose && onClose();
  };

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
      ["Care Recipient Name", safe(formData.patientName)],
      ["Age", safe(formData.patientAge)],
      ["Service Status", safe(formData.serviceStatus)],
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

    return `<!doctype html><html><head><meta charset="utf-8"><title>Client Biodata - ${fullName}</title>
      <style>
        @page { size: A4 portrait; margin: 15px; }
        html,body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
        body{font-family:Arial,Helvetica,sans-serif;color:#111;background:#f5f7fb;margin:0;padding:0}
        .page{width:calc(100% - 30px); margin:0 auto; background:#fff; padding:12px; border-radius:6px;}
        .header{display:flex;gap:12px;align-items:center; justify-content:center}
        .header img{max-width:100%; height:auto; display:block}
        h1{margin:6px 0 4px 0; color:#0b66a3;text-align:center; font-size:20px}
        .section{margin-top:12px;padding:10px;border-radius:4px;background:transparent;border:1px solid #eef3fb}
        table{width:100%;border-collapse:collapse; font-size:12px}
        th,td{padding:6px;border:1px solid #e6eef8;font-size:12px;text-align:left;vertical-align:top}
        th{background:#eef6ffd9; font-weight:600}
        td { word-break: break-word; white-space: normal; }
        .workers-table th, .workers-table td, .payments-table th, .payments-table td { font-size:11px; padding:6px }
        @media print {
          .page{box-shadow:none; border-radius:0; padding:8px}
        }
      </style>
    </head><body>
    <div class="page">
      <div class="header"><img src="${headerImage}" alt="Header" /></div>
      <div><h1>Client Biodata</h1><div class="muted" style="text-align:center">${metaDate}</div></div>

      <div class="section">
        <h3>Basic Info</h3>
        <table><tbody>${renderPairs(basicFields)}</tbody></table>
      </div>

      <div class="section">
        <h3>Address</h3>
        <table><tbody>${renderPairs(addressFields)}</tbody></table>
      </div>

      <div class="section">
        <h3>Care Recipient Details</h3>
        <table><tbody>${renderPairs(careFields)}</tbody></table>
      </div>


      <div class="section">
        <h3>Payments</h3>
        <table class="payments-table"><thead><tr><th>#</th><th>Date</th><th>Method</th><th>Paid</th><th>Balance</th><th>Receipt</th><th>Refund</th></tr></thead><tbody>${paymentsRows}</tbody>
        <tfoot><tr><th colspan="3">Totals</th><th>${formatINR(totalPaid)}</th><th>${formatINR(totalBalance)}</th><th></th><th>${formatINR(totalRefund)}</th></tr></tfoot></table>
      </div>

    </div>
    </body></html>`;
  }

  const addDaysToDate = (d, days) => {
    const copy = new Date(d);
    copy.setDate(copy.getDate() + Number(days || 0));
    return copy;
  };

  // improved styles for change-log & view-mode tables
  const extraStyles = `
    .refund-badge { display:inline-block; padding:6px 10px; border-radius:10px; background:#f1f1f1; color:#444; border:1px solid #ddd; transition: background .22s ease, color .22s ease, transform .18s ease;}
    .refund-badge.pulse { animation: pulse 900ms ease-in-out infinite; background: #fff1f1; color: #b80000; transform: translateY(-1px); box-shadow: 0 3px 8px rgba(184,0,0,0.06); }
    @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.03); opacity: 0.85; } 100% { transform: scale(1); opacity: 1; } }

    /* Change log */
    .payment-logs { max-height: 320px; overflow:auto; border:1px solid #eee; padding:8px; border-radius:8px; background:#fff; font-size:13px; }
    .payment-logs .entry { padding:10px; border-radius:6px; margin-bottom:8px; background: linear-gradient(180deg, #fafbfd, #ffffff); box-shadow: 0 1px 0 rgba(0,0,0,0.02); }
    .payment-logs .entry .header { display:flex; justify-content:space-between; gap:12px; align-items:center; margin-bottom:6px; }
    .payment-logs .entry .user { font-weight:700; }
    .payment-logs .entry .meta { font-size:12px; color:#666; }
    .payment-logs .entry .msg { white-space:pre-wrap; font-size:13px; color:#222; margin-top:6px; }
    .payment-logs .badge-type { display:inline-block; padding:4px 8px; border-radius:999px; font-size:11px; background:#eef6ff; color:#0b66a3; border:1px solid #d8eafc; margin-left:8px; }

    /* View-mode tables (make inputs disappear and look like table rows) */
    .readonly-table { width:100%; border-collapse:collapse; background:transparent; }
    .readonly-table th, .readonly-table td { padding:8px; border:1px solid #eee; text-align:left; vertical-align:top; }
    .readonly-row-label { width:25%; font-weight:600; background:#fafafa; }
  `;

  const hasPayments = (Array.isArray(formData.payments) ? formData.payments.length > 0 : false);

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
                <div className="small text-muted">{(formData.payments || []).length} payments • {(formData.workers || []).length} workers</div>
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
                  ["workers", `Workers (${(formData.workers || []).length})`],
                  ["payments", `Payments (${(formData.payments || []).length})`],
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
                    {editMode ? (
                      <div className="row">
                        <div className="col-md-4">
                          <label className="form-label"><strong>ID No</strong></label>
                          <input type="text" className="form-control" name="idNo" value={formData.idNo || ""} onChange={handleChange} disabled />
                        </div>

                        <div className="col-md-4">
                          <label className="form-label"><strong>Client Name</strong> <span className="text-danger">*</span></label>
                          <input className={`form-control ${errors.clientName ? "is-invalid" : ""}`} name="clientName" value={formData.clientName || ""} onChange={handleChange} disabled={!editMode} />
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
                    ) : (
                      // view mode: show table-like read-only rows
                      <table className="readonly-table">
                        <tbody>
                          <tr>
                            <th className="readonly-row-label">ID No</th>
                            <td>{formData.idNo || "—"}</td>
                            <th className="readonly-row-label">Client Name</th>
                            <td>{formData.clientName || "—"}</td>
                          </tr>
                          <tr>
                            <th className="readonly-row-label">Gender</th>
                            <td>{formData.gender || "—"}</td>
                            <th className="readonly-row-label">Location</th>
                            <td>{formData.location || "—"}</td>
                          </tr>
                          <tr>
                            <th className="readonly-row-label">Mobile 1</th>
                            <td>{formData.mobileNo1 || "—"}</td>
                            <th className="readonly-row-label">Mobile 2</th>
                            <td>{formData.mobileNo2 || "—"}</td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Address */}
                {activeTab === "address" && (
                  <div>
                    {editMode ? (
                      <div className="row">
                        <div className="col-md-4">
                          <label className="form-label"><strong>Door No</strong></label>
                          <input className="form-control" name="dNo" value={formData.dNo || ""} onChange={handleChange} disabled={!editMode} />
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
                    ) : (
                      <table className="readonly-table">
                        <tbody>
                          <tr>
                            <th className="readonly-row-label">Door No</th>
                            <td>{formData.dNo || "—"}</td>
                            <th className="readonly-row-label">Landmark</th>
                            <td>{formData.landMark || "—"}</td>
                          </tr>
                          <tr>
                            <th className="readonly-row-label">Street</th>
                            <td>{formData.street || "—"}</td>
                            <th className="readonly-row-label">Village/Town</th>
                            <td>{formData.villageTown || "—"}</td>
                          </tr>
                          <tr>
                            <th className="readonly-row-label">Mandal</th>
                            <td>{formData.mandal || "—"}</td>
                            <th className="readonly-row-label">District</th>
                            <td>{formData.district || "—"}</td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Service */}
                {activeTab === "service" && (
                  <div>
                    {editMode ? (
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
                    ) : (
                      <table className="readonly-table">
                        <tbody>
                          <tr>
                            <th className="readonly-row-label">Type of Service</th>
                            <td>{formData.typeOfService || "—"}</td>
                            <th className="readonly-row-label">Service Charges</th>
                            <td>{formData.serviceCharges || "—"}</td>
                          </tr>
                          <tr>
                            <th className="readonly-row-label">Service Period</th>
                            <td>{formData.servicePeriod || "—"}</td>
                            <th className="readonly-row-label">Service Remarks</th>
                            <td>{formData.serviceRemarks || "—"}</td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Patient */}
                {activeTab === "patient" && (
                  <div>
                    {editMode ? (
                      <div className="row mb-2">
                        <div className="col-md-3">
                          <label className="form-label"><strong>Care Recipient Name</strong></label>
                          <input className="form-control" name="patientName" value={formData.patientName || ""} onChange={handleChange} disabled={!editMode} />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label"><strong>Age</strong></label>
                          <input className="form-control" name="patientAge" value={formData.patientAge || ""} onChange={handleChange} disabled={!editMode} />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label"><strong>Service Status</strong></label>
                          <input className="form-control" name="serviceStatus" value={formData.serviceStatus || ""} onChange={handleChange} disabled={!editMode} />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label"><strong>Dropper Name</strong></label>
                          <input className="form-control" name="dropperName" value={formData.dropperName || ""} onChange={handleChange} disabled={!editMode} />
                        </div>
                      </div>
                    ) : (
                      <table className="readonly-table">
                        <tbody>
                          <tr>
                            <th className="readonly-row-label">Care Recipient</th>
                            <td>{formData.patientName || "—"}</td>
                            <th className="readonly-row-label">Age</th>
                            <td>{formData.patientAge || "—"}</td>
                          </tr>
                          <tr>
                            <th className="readonly-row-label">Service Status</th>
                            <td>{formData.serviceStatus || "—"}</td>
                            <th className="readonly-row-label">Dropper Name</th>
                            <td>{formData.dropperName || "—"}</td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Workers */}
                {activeTab === "workers" && (
                  <div>
                    {(formData.workers || []).map((w, i) => {
                      const locked = !!w.__locked;
                      return (
                        <div key={i} className="modal-card mb-3 p-3 border rounded">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <strong>Worker #{i + 1}</strong>
                            {locked && <span className="badge bg-secondary">Existing</span>}
                          </div>

                          {editMode ? (
                            <div>
                              <div className="row">
                                <div className="col-md-3">
                                  <label className="form-label"><strong>ID No</strong></label>
                                  <input data-idx={i} className="form-control" name="workerIdNo" value={w.workerIdNo || ""} onChange={(e) => handleChange(e, "workers", i)} disabled={locked} />
                                </div>
                                <div className="col-md-3">
                                  <label className="form-label"><strong>Name</strong></label>
                                  <input data-idx={i} className="form-control" name="cName" value={w.cName || ""} onChange={(e) => handleChange(e, "workers", i)} disabled={locked} />
                                </div>
                                <div className="col-md-3">
                                  <label className="form-label"><strong>Basic Salary</strong></label>
                                  <input data-idx={i} className="form-control" name="basicSalary" type="number" value={w.basicSalary ?? ""} onChange={(e) => handleChange(e, "workers", i)} disabled={locked} />
                                </div>
                                <div className="col-md-3">
                                  <label className="form-label"><strong>Total Days</strong></label>
                                  <input data-idx={i} className="form-control" name="totalDays" value={w.totalDays || ""} onChange={(e) => handleChange(e, "workers", i)} disabled={!editMode} />
                                </div>
                              </div>

                              <div className="row mt-2">
                                <div className="col-12">
                                  <label className="form-label"><strong>Remarks</strong></label>
                                  <textarea className="form-control" name="remarks" rows="2" value={w.remarks || ""} onChange={(e) => handleChange(e, "workers", i)} disabled={locked} />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <table className="readonly-table mb-0">
                              <tbody>
                                <tr>
                                  <th className="readonly-row-label">ID No</th>
                                  <td>{w.workerIdNo || "—"}</td>
                                  <th className="readonly-row-label">Name</th>
                                  <td>{w.cName || "—"}</td>
                                </tr>
                                <tr>
                                  <th className="readonly-row-label">Basic Salary</th>
                                  <td>{formatINR(w.basicSalary)}</td>
                                  <th className="readonly-row-label">Total Days</th>
                                  <td>{w.totalDays || "—"}</td>
                                </tr>
                                <tr>
                                  <th className="readonly-row-label">Remarks</th>
                                  <td colSpan={3}>{w.remarks || "—"}</td>
                                </tr>
                              </tbody>
                            </table>
                          )}

                          <div className="mt-2 d-flex justify-content-end">
                            {!w.__locked && editMode && <button className="btn btn-danger btn-sm" onClick={() => removeWorker(i)}>Remove</button>}
                          </div>
                        </div>
                      );
                    })}

                    {editMode && <button className="btn btn-primary" onClick={addWorker}>Add Worker</button>}
                  </div>
                )}

                {/* Payments */}
                {activeTab === "payments" && (
                  <div>
                    {(formData.payments || []).map((p, idx) => {
                      const locked = !!p.__locked;
                      const refundDisabled = Number(p.refundAmount || 0) > 0;
                      return (
                        <div key={idx} className="modal-card mb-3 p-3 border rounded">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <strong>Payment #{idx + 1}</strong>
                            {locked ? <span className="badge bg-secondary">Existing</span> : <span className="badge bg-info">New</span>}
                          </div>

                          {editMode ? (
                            // In edit mode: payment rows are disabled if locked. New rows are editable.
                            <div>
                              <div className="row">
                                <div className="col-md-4">
                                  <label className="form-label"><strong>Payment Method</strong></label>
                                  <select data-idx={idx} className="form-control" name="paymentMethod" value={p.paymentMethod || "cash"} onChange={(e) => handleChange(e, "payments", idx)} disabled={locked}>
                                    <option value="cash">Cash</option>
                                    <option value="online">Online</option>
                                    <option value="check">Check</option>
                                    <option value="other">Other</option>
                                  </select>
                                </div>

                                <div className="col-md-4">
                                  <label className="form-label"><strong>Date</strong></label>
                                  <input data-idx={idx} className="form-control" name="date" type="date" value={p.date ? formatDateForInput(p.date) : ""} onChange={(e) => handleChange(e, "payments", idx)} disabled={locked} />
                                </div>

                                <div className="col-md-4">
                                  <label className="form-label"><strong>Paid Amount</strong></label>
                                  <input data-idx={idx} className="form-control" name="paidAmount" type="number" value={p.paidAmount ?? ""} onChange={(e) => handleChange(e, "payments", idx)} disabled={locked} />
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
                                  <input data-idx={idx} className="form-control" name="reminderDays" type="number" value={p.reminderDays ?? ""} onChange={(e) => handleChange(e, "payments", idx)} disabled={locked} />
                                </div>
                              </div>

                              <div className="row mt-2">
                                <div className="col-12">
                                  <label className="form-label"><strong>Remarks</strong></label>
                                  <textarea data-idx={idx} className="form-control" name="remarks" rows="2" value={p.remarks || ""} onChange={(e) => handleChange(e, "payments", idx)} disabled={locked} />
                                </div>
                              </div>

                              <div className="row mt-2">
                                <div className="col-12 d-flex align-items-center" style={{ gap: 10 }}>
                                  <input id={`refundSwitch-${idx}`} data-idx={idx} className="form-check-input" type="checkbox" name="refund" checked={!!p.refund} onChange={(e) => handleChange(e, "payments", idx)} disabled={refundDisabled || locked} />
                                  <label htmlFor={`refundSwitch-${idx}`} style={{ fontWeight: 600, margin: 0 }}>
                                    <span className={`refund-badge ${p.refund ? "pulse" : ""}`}>Refund</span>
                                  </label>
                                  {refundDisabled && <div className="text-muted small">Refund amount present — refund toggle disabled</div>}
                                </div>
                              </div>

                              {p.refund && (
                                <div className="row mt-2">
                                  <div className="col-md-4">
                                    <label className="form-label"><strong>Refund Date</strong></label>
                                    <input data-idx={idx} className="form-control" name="refundDate" type="date" value={p.refundDate ? formatDateForInput(p.refundDate) : ""} onChange={(e) => handleChange(e, "payments", idx)} disabled={locked} />
                                  </div>
                                  <div className="col-md-4">
                                    <label className="form-label"><strong>Refund Amount</strong></label>
                                    <input data-idx={idx} className="form-control" name="refundAmount" type="tel" value={p.refundAmount ?? ""} onChange={(e) => handleChange(e, "payments", idx)} disabled={locked} maxLength={12} />
                                  </div>
                                  <div className="col-md-4">
                                    <label className="form-label"><strong>Refund Method</strong></label>
                                    <select data-idx={idx} className="form-control" name="refundPaymentMethod" value={p.refundPaymentMethod || ""} onChange={(e) => handleChange(e, "payments", idx)} disabled={locked}>
                                      <option value="">Select</option>
                                      <option value="cash">Cash</option>
                                      <option value="online">Online</option>
                                      <option value="check">Check</option>
                                    </select>
                                  </div>
                                  <div className="col-12 mt-2">
                                    <label className="form-label"><strong>Refund Remarks</strong></label>
                                    <textarea data-idx={idx} className="form-control" name="refundRemarks" rows="2" value={p.refundRemarks || ""} onChange={(e) => handleChange(e, "payments", idx)} disabled={locked} />
                                  </div>
                                </div>
                              )}

                              <div className="mt-2 d-flex justify-content-end">
                                {!p.__locked && editMode && <button className="btn btn-danger btn-sm" onClick={() => removePayment(idx)}>Remove</button>}
                              </div>
                            </div>
                          ) : (
                            // view mode: show payment as read-only table
                            <table className="readonly-table mb-0">
                              <tbody>
                                <tr>
                                  <th className="readonly-row-label">Method</th>
                                  <td>{p.paymentMethod || "—"}</td>
                                  <th className="readonly-row-label">Date</th>
                                  <td>{p.date ? new Date(p.date).toLocaleDateString() : "—"}</td>
                                </tr>
                                <tr>
                                  <th className="readonly-row-label">Paid Amount</th>
                                  <td>{formatINR(p.paidAmount)}</td>
                                  <th className="readonly-row-label">Balance</th>
                                  <td>{formatINR(p.balance)}</td>
                                </tr>
                                <tr>
                                  <th className="readonly-row-label">Receipt</th>
                                  <td>{p.receptNo || "—"}</td>
                                  <th className="readonly-row-label">Refund</th>
                                  <td>{p.refund ? formatINR(p.refundAmount) : "—"}</td>
                                </tr>
                                <tr>
                                  <th className="readonly-row-label">Remarks</th>
                                  <td colSpan={3}>{p.remarks || "—"}</td>
                                </tr>
                              </tbody>
                            </table>
                          )}
                        </div>
                      );
                    })}

                    {editMode && <button className="btn btn-primary" onClick={addPayment}>Add Payment</button>}

                    {/* Change Log */}
                    <div className="mt-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6><strong>Change Log</strong></h6>
                        <div>
                          <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => setShowFullAudit((s) => !s)}>{showFullAudit ? "Show Summary" : "Show Details"}</button>
                        </div>
                      </div>

                      <div className="payment-logs">
                        {(!showFullAudit && (formData.paymentLogs || []).length === 0) && <div className="text-muted small">No changes yet</div>}
                        {!showFullAudit && (formData.paymentLogs || []).map((L, i) => (
                          <div className="entry" key={i}>
                            <div className="header">
                              <div>
                                <div className="user">{L.user || "System"} <span className="badge-type">{L.type || "summary"}</span></div>
                                <div className="meta">{L.dateLabel || (L.date ? new Date(L.date).toLocaleString() : "")}</div>
                              </div>
                              <div className="meta small">{(L.changes || []).length} changes</div>
                            </div>
                            <div className="msg">{L.message || (Array.isArray(L.changes) ? L.changes.map(c => `${c.friendly}: '${String(c.before)}' → '${String(c.after)}'`).join("\n") : "-")}</div>
                          </div>
                        ))}

                        {showFullAudit && (formData.fullAuditLogs || []).length === 0 && <div className="text-muted small">No detailed audit entries</div>}
                        {showFullAudit && (formData.fullAuditLogs || []).map((L, i) => (
                          <div className="entry" key={i}>
                            <div className="header">
                              <div>
                                <div className="user">{L.user || "System"} <span className="badge-type">full</span></div>
                                <div className="meta">{L.dateLabel || (L.date ? new Date(L.date).toLocaleString() : "")}</div>
                              </div>
                              <div className="meta small">{(L.changes || []).length} items</div>
                            </div>
                            <div className="msg">{Array.isArray(L.changes) ? L.changes.map(c => `${c.friendly} (${c.path}): '${String(c.before)}' → '${String(c.after)}'`).join("\n") : (L.message || "-")}</div>
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
                      <table className="table table-sm table-hover invest-table">
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
                        <tfoot>
                          <tr>
                            <th colSpan={2}>Totals</th>
                            <th>{formatINR((formData.payments || []).reduce((s, p) => s + (Number(p.paidAmount) || 0), 0))}</th>
                            <th>{formatINR((formData.payments || []).reduce((s, p) => s + (Number(p.balance) || 0), 0))}</th>
                            <th colSpan={2}></th>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <h6 className="mt-3"><strong>Refund Details</strong></h6>
                    <div className="table-responsive mb-3">
                      <table className="table table-sm table-hover invest-table">
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
                        <tfoot>
                          <tr>
                            <th colSpan={3}>Total Refund</th>
                            <th>{formatINR((formData.payments || []).reduce((s, p) => s + (Number(p.refundAmount) || 0), 0))}</th>
                            <th colSpan={3}></th>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <h6 className="mt-3"><strong>Workers Details</strong></h6>
                    <div className="table-responsive">
                      <table className="table table-sm table-hover invest-table">
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
                        <tfoot>
                          <tr>
                            <th colSpan={3}>Totals</th>
                            <th>{formatINR((formData.workers || []).reduce((s, w) => s + (Number(w.basicSalary) || 0), 0))}</th>
                            <th colSpan={1}></th>
                            <th colSpan={1}></th>
                            <th>{(formData.workers || []).reduce((s, w) => s + (Number(w.totalDays) || 0), 0)}</th>
                            <th></th>
                          </tr>
                        </tfoot>
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

      {/* Removal confirmation dialog (first modal) */}
      {showRemovalConfirm && (
        <div className="modal-backdrop-custom" id="removal-confirm-modal" role="dialog" aria-modal="true">
          <div className="modal-card-custom" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h5>Confirm Remove</h5>
              <button className="btn-close-custom" onClick={() => setShowRemovalConfirm(false)}>✕</button>
            </div>
            <div className="modal-body-custom">
              <p>Are you sure you want to remove this client?</p>
              <div className="d-flex gap-2 justify-content-end">
                <button className="btn btn-secondary" onClick={() => setShowRemovalConfirm(false)}>No</button>
                <button className="btn btn-danger" onClick={() => { setShowRemovalConfirm(false); setShowRemovalModal(true); }}>Yes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Removal details modal (reason + comment mandatory) */}
      {showRemovalModal && (
        <div className="modal-backdrop-custom" role="dialog" aria-modal="true">
          <div className="modal-card-custom">
            <div className="modal-header-custom">
              <h5>Removal Details</h5>
              <button className="btn-close-custom" onClick={() => setShowRemovalModal(false)}>✕</button>
            </div>
            <div className="modal-body-custom">
              <div className="mb-2">
                <label className="form-label">Reason</label>
                <select className="form-select" value={removalForm.reason} onChange={(e) => setRemovalForm(prev => ({ ...prev, reason: e.target.value }))}>
                  <option value="">-- Select reason --</option>
                  {removalReasonOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                {removalErrors.reason && <div className="text-danger small mt-1">{removalErrors.reason}</div>}
              </div>
              <div className="mb-2">
                <label className="form-label">Comment</label>
                <textarea className="form-control" rows="4" value={removalForm.comment} onChange={(e) => setRemovalForm(prev => ({ ...prev, comment: e.target.value }))} />
                {removalErrors.comment && <div className="text-danger small mt-1">{removalErrors.comment}</div>}
              </div>
            </div>
            <div className="modal-footer-custom">
              <button className="btn btn-secondary" onClick={() => setShowRemovalModal(false)}>Close</button>
              <button className="btn btn-danger" onClick={async () => {
                const errs = {};
                if (!removalForm.reason) errs.reason = "Select reason";
                if (!removalForm.comment || !removalForm.comment.trim()) errs.comment = "Enter comment";
                setRemovalErrors(errs);
                if (Object.keys(errs).length > 0) return;
                try {
                  const id = formData?.id || formData?.recordId || formData?.clientId;
                  const removalEntry = {
                    removedAt: new Date().toISOString(),
                    removedBy: currentUserName || "System",
                    removalReason: removalForm.reason,
                    removalComment: removalForm.comment.trim(),
                  };
                  if (id) {
                    await firebaseDB.child(`ExitClients/${id}/removalHistory`).push(removalEntry);
                    await firebaseDB.child(`ClientData/${id}`).remove();
                  } else {
                    const newRef = firebaseDB.child(`ExitClients`).push();
                    await newRef.set({ removalHistory: { [newRef.key]: removalEntry }, movedAt: new Date().toISOString() });
                  }
                  setShowRemovalModal(false);
                  onRemoved && onRemoved(id);
                } catch (err) {
                  console.error("remove client error", err);
                  alert("Remove failed");
                }
              }}>Remove Client</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header"><h5 className="modal-title"><strong>Confirm Delete</strong></h5><button className="btn-close" onClick={() => setShowDeleteConfirm(false)} /></div>
              <div className="modal-body"><p>Are you sure you want to delete this client? This will move the data to the exited clients database.</p></div>
              <div className="modal-footer"><button className="btn btn-danger" onClick={() => { setShowDeleteConfirm(false); onDelete && onDelete(client?.id || client?.key); }}>Yes, Delete</button><button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button></div>
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
              <div className="modal-footer"><button className="btn btn-danger" onClick={() => { setShowUnsavedConfirm(false); onClose && onClose(); }}>Discard</button><button className="btn btn-secondary" onClick={() => setShowUnsavedConfirm(false)}>Keep Editing</button></div>
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
};

export default ClientModal;
