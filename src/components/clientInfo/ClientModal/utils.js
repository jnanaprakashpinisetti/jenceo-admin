// ClientModal/utils.js
export const safeNumber = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const cleaned = String(v).replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isNaN(n) ? 0 : n;
};

export const formatINR = (value) => {
  const n = Number(value || 0);
  if (!isFinite(n)) return "\u20B90";
  try {
    return "\u20B9" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  } catch {
    return "\u20B9" + String(n);
  }
};

export const formatDateForInput = (v) => {
  if (!v && v !== 0) return "";
  const d = new Date(v);
  if (isNaN(d)) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const parseDateSafe = (v) => {
  if (!v && v !== 0) return null;
  if (v instanceof Date && !isNaN(v)) return v;
  if (v && typeof v === "object" && ("seconds" in v || "nanoseconds" in v)) {
    const ms = (Number(v.seconds || 0) * 1000) + Math.round(Number(v.nanoseconds || 0) / 1e6);
    const d = new Date(ms);
    return isNaN(d) ? null : d;
  }
  if (typeof v === "number" || (/^\d+$/.test(String(v)))) {
    const d = new Date(Number(v));
    return isNaN(d) ? null : d;
  }
  const s = String(v).trim();
  const mDMY = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (mDMY) return new Date(Number(mDMY[3]), Number(mDMY[2]) - 1, Number(mDMY[1]));
  const mYMD = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (mYMD) return new Date(Number(mYMD[1]), Number(mYMD[2]) - 1, Number(mYMD[3]));
  const d = new Date(s);
  return isNaN(d) ? null : d;
};

export const daysBetween = (start, end) => {
  const s = parseDateSafe(start);
  const e = parseDateSafe(end);
  if (!s || !e) return "";
  const ms = e - s;
  if (ms < 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24)) + 1;
};

export const lockRows = (arr) => (Array.isArray(arr) ? arr : []).map((r) => ({ ...r, __locked: true }));

export const stripLocks = (obj) => {
  const clone = JSON.parse(JSON.stringify(obj || {}));
  if (Array.isArray(clone.workers)) clone.workers = clone.workers.map(({ __locked, ...rest }) => rest);
  if (Array.isArray(clone.fullAuditLogs)) clone.fullAuditLogs = clone.fullAuditLogs.map((l) => ({ ...l }));
  return clone;
};

export const resolveUserName = (obj, fallback) => {
  const tryKeys = [
    "addedByName", "addedBy", "userName", "username", "createdByName", "createdBy",
    "enteredBy", "enteredByName", "created_user", "updatedBy", "ownerName",
  ];
  for (const k of tryKeys) {
    const v = obj && obj[k];
    if (v && String(v).trim()) return String(v).trim().replace(/@.*/, "");
  }
  const u = obj && obj.user;
  if (u) {
    const tryUser = [u.name, u.displayName, u.username, u.email];
    for (const t of tryUser) {
      if (t && String(t).trim()) return String(t).trim().replace(/@.*/, "");
    }
  }
  return (fallback && String(fallback).trim()) || "System";
};

export const formatDDMMYY = (v) => {
  const d = parseDateSafe(v);
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
};

export const formatTime12h = (isoLike) => {
  const d = parseDateSafe(isoLike);
  if (!d) return "";
  let h = d.getHours();
  let m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
};

export const diffDays = (from, to) => {
  const a = parseDateSafe(from);
  const b = parseDateSafe(to);
  if (!a || !b) return "";
  const au = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const bu = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((bu - au) / (1000 * 60 * 60 * 24)) + 1;
};

export const friendlyLabel = (path) => {
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

export function buildChangeSummaryAndFullAudit(oldObj = {}, newObj = {}) {
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

export const emptyPayment = () => ({
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
  __locked: false,
  addedByName: "",
  addedAt: new Date().toISOString(),
});

export const getInitialFormData = () => ({
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

export const resolveAddedByFromUsers = (obj, users) => {
  if (!obj || !users) return "";
  const candidateIds = [
    obj.user_key, obj.userKey, obj.userId, obj.uid,
    obj.addedById, obj.createdById, obj.addedByUid, obj.createdByUid,
    obj.key, obj.ownerId
  ].filter(Boolean);
  for (const id of candidateIds) {
    const u = users[id];
    if (u) {
      const nm = u.name || u.displayName || u.username || u.email;
      if (nm) return String(nm).trim().replace(/@.*/, "");
    }
  }
  return "";
};

// Additional helper for building biodata HTML
export const buildClientBiodataHTML = (formData, headerImage) => {
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
        return `<tr><td>${i + 1}</td><td>${dateStr}</td><td>${safe(p.paymentMethod)}</td><td>${formatINR(p.paidAmount).replace('\u20B9', '&#8377;')}</td><td>${formatINR(p.balance).replace('\u20B9', '&#8377;')}</td><td>${safe(
          p.receptNo
        )}</td><td><span style="color:#b00020;font-weight:600;">${p.refund ? formatINR(p.refundAmount).replace('\u20B9', '&#8377;') : "-"}</span></span></span></td></tr>`;
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
       <div className="table-responsive">
      <table><tbody>${renderPairs(basicFields)}</tbody></table>
    </div>
    </div>

    <div class="section">
      <h3>Address</h3>
       <div className="table-responsive">
      <table><tbody>${renderPairs(addressFields)}</tbody></table>
    </div>
    </div>

    <div class="section">
      <h3>Care Recipient Details</h3>
       <div className="table-responsive">
      <table><tbody>${renderPairs(careFields)}</tbody></table>
    </div>
    </div>

    <div class="section">
      <h3>Payments</h3>
       <div className="table-responsive">
      <table class="payments-table"><thead><tr><th>#</th><th>Date</th><th>Method</th><th>Paid</th><th>Balance</th><th>Receipt</th><th>Refund</th></tr></thead><tbody>${paymentsRows}</tbody>
      <tfoot><tr><th colspan="3">Totals</th><th>${formatINR(totalPaid).replace('\u20B9', '&#8377;')}</th><th>${formatINR(totalBalance).replace('\u20B9', '&#8377;')}</th><th></th><th>${formatINR(totalRefund).replace('\u20B9', '&#8377;')}</th></tr></tfoot></table>
    </div>
    </div>

  </div>
  
    <div class="biodata-footer" style="position:fixed;left:0;right:0;bottom:0;width:100%;background:#05b6ff;color:#fff;font-size:10px;padding:6px 8px;text-align:center;">
      Doc Ref: JC-HR-06 &nbsp;&nbsp;|&nbsp;&nbsp; Revision: 1 &nbsp;&nbsp;|&nbsp;&nbsp; Date: 1<sup>st</sup> May 2025 &nbsp;&nbsp;|&nbsp;&nbsp; Page 1 of 1
    </div>
  
  </body></html>`;
};