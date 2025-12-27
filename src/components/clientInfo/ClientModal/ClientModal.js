// ClientModal.js
import React, { useEffect, useState, useRef } from "react";
import firebaseDB from "../../../firebase";
import { useAuth } from "../../../context/AuthContext";
import ShareInvoice from "./../ShareInvoice";

// Import tab components
import BasicInfoTab from "./tabs/BasicInfoTab";
import AddressTab from "./tabs/AddressTab";
import ServiceTab from "./tabs/ServiceTab";
import PatientTab from "./tabs/PatientTab";
import WorkersTab from "./tabs/WorkersTab";
import PaymentsTab from "./tabs/PaymentsTab";
import DetailInfoTab from "./tabs/DetailInfoTab";
import BiodataTab from "./tabs/BiodataTab";
import InvoiceTab from "./tabs/InvoiceTab";
import ClientSlotTab from "./tabs/ClientSlotTab";


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
import ClientSlotInfo from "./tabs/ClientSlotTab";

const removalReasonOptions = [
  "Contract Closed",
  "Contract Terminated",
  "Contract Stopped",
];

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
  onSavePayments = null,
}) => {
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorList, setErrorList] = useState([]);
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
  const [clearReminderBeforeAdd, setClearReminderBeforeAdd] = useState(false);
  const [showClearedModal, setShowClearedModal] = useState(false);
  const [usersMap, setUsersMap] = useState({});
  const [expandedLogIndex, setExpandedLogIndex] = useState(null);
  const [bulkReminderDate, setBulkReminderDate] = useState("");
  const [showRemovalConfirm, setShowRemovalConfirm] = useState(false);
  const [showRemovalModal, setShowRemovalModal] = useState(false);
  const [removalForm, setRemovalForm] = useState({ reason: "", comment: "" });
  const [removalErrors, setRemovalErrors] = useState({});

  // Save success state
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  // Quick Actions state
  const [quickRefund, setQuickRefund] = useState({
    enabled: false,
    date: formatDateForInput(new Date()),
    amount: "",
    method: "cash",
    remarks: ""
  });
  const [balancePay, setBalancePay] = useState({
    enabled: false,
    date: formatDateForInput(new Date()),
    amount: "",
    method: "cash",
    remarks: ""
  });
  const [selectedAction, setSelectedAction] = useState("");

  const { user: authUser } = useAuth?.() || {};

  useEffect(() => {
    const ref = firebaseDB.child("Users");
    const handler = ref.on("value", (snap) => setUsersMap(snap.val() || {}));
    return () => ref.off("value", handler);
  }, []);

  useEffect(() => {
    if (!client) {
      setFormData(getInitialFormData());
      initialSnapshotRef.current = null;
      setIsDirty(false);
      return;
    }

    const paymentsArr = client.payments ? (Array.isArray(client.payments) ? client.payments : Object.values(client.payments)) : [];
    const workersArr = client.workers ? (Array.isArray(client.workers) ? client.workers : Object.values(client.workers)) : [];
    const fullLogs = client.fullAuditLogs ? (Array.isArray(client.fullAuditLogs) ? client.fullAuditLogs : Object.values(client.fullAuditLogs)) : [];

    const payments = paymentsArr.map((p) => ({
      paymentMethod: p.paymentMethod ?? p.method ?? "cash",
      paidAmount: (p.paidAmount ?? p.amount ?? ""),
      balance: (p.balance == null || String(p.balance).trim() === "") ? "" : safeNumber(p.balance),
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
      addedByName:
        p.addedByName ||
        p.addByName ||
        p.createdByName ||
        resolveAddedByFromUsers(p, usersMap) ||
        resolveAddedByFromUsers(client, usersMap) ||
        (p.userName || p.addedBy || p.createdBy || client?.createdByName) ||
        resolveUserName(p, effectiveUserName) ||
        effectiveUserName,
      addedAt: p.addedAt ?? p.addAt ?? p.createdAt ?? p.timestamp ?? p.date ?? "",
      createdByName: p.createdByName || p.addedByName || effectiveUserName,
      createdAt: p.createdAt || p.addedAt || "",
      __locked: true,
      __edited: false,
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
        addedByName:
          w.addedByName ||
          w.addByName ||
          w.createdByName ||
          resolveAddedByFromUsers(w, usersMap) ||
          resolveAddedByFromUsers(client, usersMap) ||
          (w.userName || w.addedBy || w.createdBy || client?.createdByName) ||
          resolveUserName(w, effectiveUserName) ||
          effectiveUserName,
        addedAt: w.addedAt ?? w.addAt ?? w.createdAt ?? "",
        createdByName: w.createdByName || w.addedByName || effectiveUserName,
        createdAt: w.createdAt || w.addedAt || "",
        __locked: true,
        __edited: false,
        ...w,
      };
    });

    const snapshot = {
      ...client,
      workers: workers,
      payments: lockRows(payments),
      fullAuditLogs: fullLogs || [],
    };

    setFormData(snapshot);
    setErrors({});
    initialSnapshotRef.current = JSON.stringify(snapshot);
    setIsDirty(false);
  }, [client, usersMap]);

  const effectiveUserName = 
    client?.createdByName ||
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

    if (name === "paidAmount" || name === "balance" || name === "refundAmount" || name === "basicSalary") {
      if (value === "") {
        value = "";
      } else {
        value = value.replace(/[^0-9.]/g, '');
      }
    }

    if ((section === "payments" || section === "workers") && index !== null) {
      setFormData((prev) => {
        const list = Array.isArray(prev[section]) ? [...prev[section]] : [];
        const row = { ...(list[index] || {}) };
        
        // Mark as edited if it was a locked row
        if (row.__locked) {
          row.__edited = true;
        }
        
        row[name] = value;
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
      __edited: false,
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

  const updateWorker = (index, updatedWorker) => {
    setFormData((prev) => {
      const list = Array.isArray(prev.workers) ? [...prev.workers] : [];
      if (index >= 0 && index < list.length) {
        // Preserve locked status and other metadata
        const row = list[index];
        const updated = {
          ...row,
          ...updatedWorker,
          __locked: row.__locked, // Preserve lock status
          __edited: true, // Mark as edited
        };
        list[index] = updated;
        const next = { ...prev, workers: list };
        markDirty(next);
        return next;
      }
      return prev;
    });
  };

  const addPayment = () => {
    const now = new Date();
    const np = {
      id: Date.now(),
      paymentMethod: "cash",
      paidAmount: "",
      balance: "",
      receptNo: "",
      remarks: "",
      reminderDays: "",
      reminderDate: "",
      date: formatDateForInput(now),
      refund: false,
      refundAmount: 0,
      refundDate: "",
      refundPaymentMethod: "",
      refundRemarks: "",
      __locked: false,
      __edited: false,
      addedByName: effectiveUserName,
      addedAt: now.toISOString(),
    };

    setEditMode(true);
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

  const getLastVisiblePaymentIndex = () => {
    const arr = Array.isArray(formData.payments) ? formData.payments : [];
    for (let i = arr.length - 1; i >= 0; i--) {
      if (!arr[i]?.__adjustment) return i;
    }
    return -1;
  };

  const getLastBalance = () => {
    const arr = Array.isArray(formData.payments) ? formData.payments : [];
    for (let i = arr.length - 1; i >= 0; i--) {
      if (!arr[i]?.__adjustment) {
        const b = Number(arr[i]?.balance ?? 0);
        if (!Number.isNaN(b)) return b;
      }
    }
    return 0;
  };

  const handleCloseAttempt = () => {
    if (isDirty) setShowUnsavedConfirm(true);
    else onClose && onClose();
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
      // Skip locked payments in validation if they're empty
      const hasValue = (p.paidAmount && String(p.paidAmount).trim() !== "") ||
        (p.receptNo && String(p.receptNo).trim() !== "") ||
        (p.balance && String(p.balance).trim() !== "");

      // Skip validation for empty locked payments
      if (p.__locked && !hasValue) return;

      if (hasValue) {
        if (!p.paymentMethod) v[`payments.${i}.paymentMethod`] = "Payment method is required";
        if (p.paidAmount === "" || Number(p.paidAmount) === 0) v[`payments.${i}.paidAmount`] = "Paid amount is required";

        // Better date validation
        if (!p.date || String(p.date).trim() === "") {
          v[`payments.${i}.date`] = "Date is required";
        } else {
          const parsedDate = parseDateSafe(p.date);
          if (!parsedDate || isNaN(parsedDate.getTime())) {
            v[`payments.${i}.date`] = "Invalid date format";
          }
        }

        if (p.refund) {
          if (!p.refundDate) v[`payments.${i}.refundDate`] = "Refund date required";
          if (!p.refundAmount || Number(p.refundAmount) <= 0) v[`payments.${i}.refundAmount`] = "Refund amount required";
        }
      }
    });

    const workers = Array.isArray(formData.workers) ? formData.workers : [];
    workers.forEach((w, i) => {
      if (w.__locked) return; // skip legacy rows
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

    try {
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

      // Ensure payment amounts are properly converted to numbers
      if (Array.isArray(payload.payments)) {
        payload.payments = payload.payments.map((p) => {
          const normalized = {
            ...p,
            paidAmount: safeNumber(p.paidAmount),
            balance: p.balance === "" ? "" : safeNumber(p.balance),
            refundAmount: safeNumber(p.refundAmount || 0),
          };
          
          // If it's a new payment or edited payment, add author info
          if (!p.__locked || p.__edited) {
            normalized.addedByName = effectiveUserName;
            normalized.addedAt = now.toISOString();
            normalized.createdByName = effectiveUserName;
            normalized.createdAt = now.toISOString();
          }
          return normalized;
        });
      }

      // Handle workers similarly
      if (Array.isArray(payload.workers)) {
        payload.workers = payload.workers.map((w) => {
          // If it's a new worker or edited worker, add author info
          if (!w.__locked || w.__edited) {
            return {
              ...w,
              addedByName: effectiveUserName,
              addedAt: now.toISOString(),
              createdByName: effectiveUserName,
              createdAt: now.toISOString(),
            };
          }
          return w;
        });
      }

      payload.fullAuditLogs = Array.isArray(payload.fullAuditLogs) ? payload.fullAuditLogs : [];

      if (fullEntry) {
        payload.fullAuditLogs = [...payload.fullAuditLogs, fullEntry];
      }

      // Call the onSave prop
      if (onSave) {
        await onSave(payload);
      }

      // Update local state - mark all rows as locked after save
      setFormData((prev) => {
        const next = {
          ...prev,
          payments: (payload.payments || []).map((p) => ({ 
            ...p, 
            __locked: true,
            __edited: false // Clear edit flag
          })),
          workers: (payload.workers || []).map((w) => ({ 
            ...w, 
            __locked: true,
            __edited: false // Clear edit flag
          })),
        };
        initialSnapshotRef.current = JSON.stringify(next);
        setIsDirty(false);
        return next;
      });

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

  const handleSubmitPaymentsOnly = async (ev) => {
    ev && ev.preventDefault && ev.preventDefault();

    try {
      const payload = stripLocks(formData);
      
      // Only update payments
      if (Array.isArray(payload.payments)) {
        payload.payments = payload.payments.map((p) => {
          const normalized = {
            ...p,
            paidAmount: safeNumber(p.paidAmount),
            balance: p.balance === "" ? "" : safeNumber(p.balance),
            refundAmount: safeNumber(p.refundAmount || 0),
          };
          
          // If it's a new payment or edited payment, add author info
          if (!p.__locked || p.__edited) {
            normalized.addedByName = effectiveUserName;
            normalized.addedAt = new Date().toISOString();
            normalized.createdByName = effectiveUserName;
            normalized.createdAt = new Date().toISOString();
          }
          return normalized;
        });
      }

      // Call the onSavePayments prop if provided, otherwise use onSave
      if (onSavePayments) {
        await onSavePayments(payload);
      } else if (onSave) {
        await onSave(payload);
      }

      // Update local state
      setFormData((prev) => {
        const next = {
          ...prev,
          payments: (payload.payments || []).map((p) => ({ 
            ...p, 
            __locked: true,
            __edited: false 
          })),
        };
        initialSnapshotRef.current = JSON.stringify(next);
        setIsDirty(false);
        return next;
      });

      // Show success modal
      setShowSaveSuccess(true);
      setTimeout(() => {
        setShowSaveSuccess(false);
      }, 2000);
    } catch (err) {
      console.error("Payments save failed", err);
      setErrorList([{ path: "save", message: "Payments save failed. Please try again." }]);
      setShowErrorModal(true);
    }
  };

  const removeAllPaymentReminders = async () => {
    try {
      const key = formData?.id || formData?.recordId || formData?.clientId || client?.id || client?.key;
      if (!key) return;

      const count = Array.isArray(formData?.payments) ? formData.payments.length : 0;

      // Remove from DB for every index
      const tasks = [];
      for (let i = 0; i < count; i += 1) {
        tasks.push(
          firebaseDB
            .child(`ClientData/HomeCare/${key}/payments/${i}/reminderDate`)
            .remove()
            .catch(() => { }),
        );
        tasks.push(
          firebaseDB
            .child(`ClientData/HomeCare/${key}/payments/${i}/remindeDate`)
            .remove()
            .catch(() => { }),
        );
      }
      await Promise.all(tasks);

      // Clear locally so UI updates immediately
      setFormData((prev) => {
        const arr = Array.isArray(prev.payments) ? prev.payments.map((row) => ({ ...row, reminderDate: "" })) : [];
        return { ...prev, payments: arr };
      });

      setShowClearedModal(true);
    } catch (e) {
      console.warn("removeAllPaymentReminders failed", e);
    }
  };

  const updateLastReminderDate = async () => {
    const idx = getLastVisiblePaymentIndex();
    if (idx < 0 || !bulkReminderDate) return;

    // reflect locally
    setFormData((prev) => {
      const arr = Array.isArray(prev.payments) ? [...prev.payments] : [];
      if (!arr[idx]) return prev;
      arr[idx] = { ...arr[idx], reminderDate: bulkReminderDate };
      const next = { ...prev, payments: arr };
      markDirty(next);
      return next;
    });

    // persist to DB
    const key = formData?.id || formData?.recordId || formData?.clientId || client?.id || client?.key;
    if (key) {
      await firebaseDB
        .child(`ClientData/HomeCare/${key}/payments/${idx}`)
        .update({ reminderDate: bulkReminderDate });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal fade show clientModal" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
        <div className="modal-dialog modal-xl modal-dialog-centered display-client-modal" onClick={() => handleCloseAttempt()}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header bg-secondary text-white justify-content-between">
              <div>
                <h5 className="modal-title">
                  {editMode ? <strong>Edit Client</strong> : <strong>View Client</strong>} — {formData.idNo} — {formData.clientName}
                </h5>
                <div className="small text-warning">{(formData.payments || []).length} payments • {(formData.workers || []).length} workers</div>
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
                  ["clientSlotTab", "Client Slots"],
                  ["invoice", "Invoice"],
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

                {activeTab === "address" && (
                  <AddressTab
                    formData={formData}
                    editMode={editMode}
                    handleChange={handleChange}
                  />
                )}

                {activeTab === "service" && (
                  <ServiceTab
                    formData={formData}
                    editMode={editMode}
                    handleChange={handleChange}
                  />
                )}

                {activeTab === "patient" && (
                  <PatientTab
                    formData={formData}
                    editMode={editMode}
                    handleChange={handleChange}
                  />
                )}

                {activeTab === "workers" && (
                  <WorkersTab
                    formData={formData}
                    editMode={editMode}
                    handleChange={handleChange}
                    removeWorker={removeWorker}
                    addWorker={addWorker}
                    updateWorker={updateWorker}
                    usersMap={usersMap}
                    client={client}
                    effectiveUserName={effectiveUserName}
                    formatDDMMYY={formatDDMMYY}
                    formatTime12h={formatTime12h}
                    formatINR={formatINR}
                  />
                )}

                {activeTab === "payments" && (
                  <PaymentsTab
                    formData={formData}
                    editMode={editMode}
                    handleChange={handleChange}
                    removePayment={removePayment}
                    addPayment={addPayment}
                    usersMap={usersMap}
                    client={client}
                    effectiveUserName={effectiveUserName}
                    formatDDMMYY={formatDDMMYY}
                    formatTime12h={formatTime12h}
                    formatINR={formatINR}
                    formatDateForInput={formatDateForInput}
                    bulkReminderDate={bulkReminderDate}
                    setBulkReminderDate={setBulkReminderDate}
                    removeAllPaymentReminders={removeAllPaymentReminders}
                    updateLastReminderDate={updateLastReminderDate}
                    getLastBalance={getLastBalance}
                    quickRefund={quickRefund}
                    setQuickRefund={setQuickRefund}
                    balancePay={balancePay}
                    setBalancePay={setBalancePay}
                    selectedAction={selectedAction}
                    setSelectedAction={setSelectedAction}
                    getLastVisiblePaymentIndex={getLastVisiblePaymentIndex}
                    setFormData={setFormData}
                    markDirty={markDirty}
                  />
                )}

                {activeTab === "detailinfo" && (
                  <DetailInfoTab
                    formData={formData}
                    formatINR={formatINR}
                    parseDateSafe={parseDateSafe}
                  />
                )}

                {activeTab === "biodata" && (
                  <BiodataTab
                    formData={formData}
                    bioIframeRef={bioIframeRef}
                    buildClientBiodataHTML={() => {}}
                  />
                )}
                {activeTab === "clientSlotTab" && (
                  <div className="clientSlot">
                  <ClientSlotTab
                     client={client || formData}
                  />
                  </div>
                )}

                {activeTab === "invoice" && (
                  <InvoiceTab
                    formData={formData}
                  />
                )}
              </div>
            </div>

            <div className="modal-footer">
              {editMode && (
                <>
                  <button className="btn btn-sm btn-success" onClick={handleSubmit}>
                    <strong>Save Changes</strong>
                  </button>
                  <button className="btn btn-sm btn-warning" onClick={handleSubmitPaymentsOnly} disabled={!editMode}>
                    <strong>Save Payments Only</strong>
                  </button>
                </>
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
                <p>Are you sure you want to delete this client? This will move the data to the exited clients database.</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-danger" onClick={() => { 
                  setShowDeleteConfirm(false); 
                  onDelete && onDelete(client?.id || client?.key); 
                }}>
                  Yes, Delete
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

      {/* Thank You Modal - Keep for backward compatibility */}
      {showThankYou && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.2)" }}>
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-body text-center p-4">
                <h5><strong>Thank you</strong></h5>
                <p>Your data has been saved.</p>
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

      {/* Cleared Reminders Modal */}
      {showClearedModal && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.2)" }}>
          <div className="modal-dialog modal-md modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-body text-center p-4">
                <h5 className="text-danger"><strong>Reminders cleared</strong></h5>
                <p>All payment reminder dates were removed.</p>
                <button className="btn btn-primary mt-2" onClick={() => setShowClearedModal(false)}>OK</button>
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
                <p>Are you sure you want to remove this client?</p>
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
                    const id = formData?.id || formData?.recordId || formData?.clientId;
                    const removalEntry = {
                      removedAt: new Date().toISOString(),
                      removedBy: currentUserName || "System",
                      removalReason: removalForm.reason,
                      removalComment: removalForm.comment.trim(),
                    };
                    
                    if (id) {
                      await firebaseDB.child(`ClientData/HomeCare/ExitClients/${id}/removalHistory`).push(removalEntry);
                    } else {
                      const newRef = firebaseDB.child(`ClientData/HomeCare/ExitClients`).push();
                      await newRef.set({ removalHistory: { [newRef.key]: removalEntry }, movedAt: new Date().toISOString() });
                    }
                    
                    setShowRemovalModal(false);
                    onRemoved && onRemoved(id);
                  } catch (err) {
                    console.error("remove client error", err);
                    setErrorList([{ path: "remove", message: "Remove failed. Please try again." }]);
                    setShowErrorModal(true);
                  }
                }}>
                  Remove Client
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ClientModal;