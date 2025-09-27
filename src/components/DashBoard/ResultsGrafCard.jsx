// src/components/DashBoard/ResultsGrafCard.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  ResponsiveContainer,
  BarChart as RBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

/* ---------------------- Firebase helper ---------------------- */
async function importFirebaseDB() {
  try {
    const a = await import("../../firebase");
    if (a && a.default) return a.default;
    if (a && a.firebaseDB) return a.firebaseDB;
  } catch {}
  try {
    const b = await import("../firebase");
    if (b && b.default) return b.default;
    if (b && b.firebaseDB) return b.firebaseDB;
  } catch {}
  if (typeof window !== "undefined" && window.firebaseDB) return window.firebaseDB;
  return null;
}

/* ---------------------- Colors ---------------------- */
const COLORS = {
  client: "#10b981", // emerald
  petty: "#f43f5e", // rose
  assets: "#22c55e", // green
  investments: "#fb7185", // rose-400
  staff: "#60a5fa", // blue-400
  worker: "#f59e0b", // amber-500
};
const PIE_COLORS = ["#10b981", "#f43f5e", "#22c55e", "#fb7185", "#60a5fa", "#f59e0b", "#8b5cf6", "#0ea5e9", "#14b8a6"];

/* ---------------------- Utils ---------------------- */
function safeNumber(v) {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const cleaned = String(v).replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isNaN(n) ? 0 : n;
}
function parseDateRobust(v) {
  if (!v && v !== 0) return null;
  try { if (v instanceof Date && !isNaN(v)) return v; } catch {}
  const s = String(v || "").trim();
  if (!s) return null;
  if (/^\d{10,13}$/.test(s)) { const n = Number(s); return new Date(n < 1e12 ? n * 1000 : n); }
  const d = new Date(s);
  if (!isNaN(d)) return d;
  const m = s.match(/^(\d{1,2})[\/\-\s](\d{1,2})[\/\-\s](\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  const mm = s.match(/([A-Za-z]+)[,]?\s*(\d{4})/);
  if (mm) {
    const idx = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf(mm[1].slice(0,3).toLowerCase());
    if (idx >= 0) return new Date(Number(mm[2]), idx, 1);
  }
  return null;
}
function monthKey(d) { const dt = d instanceof Date ? d : parseDateRobust(d); if (!dt) return "Unknown"; return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`; }
function yearKey(d) { const dt = d instanceof Date ? d : parseDateRobust(d); if (!dt) return "Unknown"; return String(dt.getFullYear()); }
function asArray(node) { if (!node) return []; if (Array.isArray(node)) return node; if (typeof node === "object") return Object.values(node); return []; }

/* ---------------------- Extractors ---------------------- */
function extractClientPayments(client = {}) {
  const out = [];
  const pays = asArray(client.payments);
  pays.forEach((p) => {
    if (!p) return;
    const paidAmount = safeNumber(p.paidAmount ?? p.amount ?? p.payment ?? p.paymentAmount ?? 0);
    const refundAmount = safeNumber(p.refundAmount ?? (p.refund ? paidAmount : 0) ?? 0);
    const isRefund = !!p.refund || refundAmount > 0 || paidAmount < 0;
    const isBalanceAdj = p.__type === "balance" || p.__adjustment === true || /balance\s*paid/i.test(String(p.remarks || ""));
    const income = isBalanceAdj ? safeNumber(p.paidAmount ?? paidAmount) : paidAmount;
    const net = income - (isRefund ? refundAmount : 0);
    const date = p.date ?? p.paymentDate ?? p.createdAt ?? p.paymentFor ?? "";
    out.push({ type: "client", date, parsedDate: parseDateRobust(date), amount: net, method: p.paymentMethod ?? p.method ?? "", raw: p });
  });
  const logsArr = asArray(client.paymentLogs || client.paymentLog || client.logs);
  logsArr.forEach((lg) => {
    const r = safeNumber(lg.refundAmount ?? lg.amount ?? 0);
    if (!r) return;
    const date = lg.date ?? lg.dateLabel ?? lg.createdAt ?? "";
    out.push({ type: "client", date, parsedDate: parseDateRobust(date), amount: -r, method: "Refund", raw: lg });
  });
  return out;
}

/** PettyCash shapes: PettyCash/user/<id>/total */
function extractPetty(node = {}) {
  const out = [];
  if (node.user && typeof node.user === "object") {
    Object.values(node.user || {}).forEach((rec) => {
      if (!rec) return;
      const total = safeNumber(rec.total ?? rec.amount ?? rec.pettyAmount ?? rec.value ?? 0);
      const date = rec.date ?? rec.pettyDate ?? rec.createdAt ?? rec.forDate ?? "";
      const category = rec.category ?? rec.head ?? rec.type ?? rec.mainCategory ?? rec.subCategory ?? "Petty";
      if (total) out.push({ type: "petty", amount: total, date, parsedDate: parseDateRobust(date), category, raw: rec });
      Object.values(rec || {}).forEach((child) => {
        if (child && typeof child === "object" && ("total" in child || "amount" in child || "pettyAmount" in child)) {
          const amt = safeNumber(child.total ?? child.amount ?? child.pettyAmount ?? 0);
          const d2 = child.date ?? child.pettyDate ?? child.createdAt ?? "";
          const cat2 = child.category ?? child.head ?? child.type ?? "Petty";
          if (amt) out.push({ type: "petty", amount: amt, date: d2, parsedDate: parseDateRobust(d2), category: cat2, raw: child });
        }
      });
    });
  }
  const arr = asArray(node);
  arr.forEach((r) => {
    if (!r) return;
    if (r.payments && typeof r.payments === "object") asArray(r.payments).forEach((p) => out.push(...extractPetty({ user: { tmp: p } })));
    else if (typeof r === "object" && !("total" in r) && r.user) out.push(...extractPetty(r));
    else {
      const date = r.date ?? r.pettyDate ?? r.paymentDate ?? r.createdAt ?? r.forDate ?? "";
      const amount = safeNumber(r.total ?? r.amount ?? r.pettyAmount ?? r.value ?? r.price ?? r.amountPaid ?? r.payment ?? 0);
      const cat = r.category ?? r.head ?? r.type ?? r.mainCategory ?? r.subCategory ?? "Petty";
      if (amount) out.push({ type: "petty", date, parsedDate: parseDateRobust(date), amount, category: cat, raw: r });
    }
  });
  return out;
}

/** Assets (leaf-only + robust) */
function extractAssets(node = {}) {
  const out = [];
  const monetaryKeys = ["total","amount","value","totalNum","cost","totalAmount","amountPaid","price","unitPrice","unit_price","rate"];
  const isPlainObj = (x) => x && typeof x === "object" && !Array.isArray(x);
  const hasMonetary = (o) => isPlainObj(o) && monetaryKeys.some((k) => o[k] !== undefined && o[k] !== null && safeNumber(o[k]) !== 0);

  const getNum = (o, ...keys) => {
    for (const k of keys) {
      if (o && Object.prototype.hasOwnProperty.call(o, k)) {
        const v = safeNumber(o[k]);
        if (!Number.isNaN(v) && v !== 0) return v;
      }
    }
    return 0;
  };

  const firstVal = (o, ...keys) => {
    for (const k of keys) {
      if (o && o[k] != null && o[k] !== "") return o[k];
    }
    return null;
  };

  const hasChildMonetary = (obj) => {
    if (!isPlainObj(obj)) return false;
    for (const v of Object.values(obj)) {
      if (isPlainObj(v)) {
        if (hasMonetary(v) || hasChildMonetary(v)) return true;
      } else if (Array.isArray(v)) {
        for (const it of v) {
          if (isPlainObj(it) && (hasMonetary(it) || hasChildMonetary(it))) return true;
        }
      }
    }
    return false;
  };

  const walk = (obj) => {
    if (!isPlainObj(obj)) return;

    if (obj.user && isPlainObj(obj.user)) {
      Object.values(obj.user).forEach((v) => walk(v));
    }

    const leafMonetary = hasMonetary(obj) && !hasChildMonetary(obj);
    if (leafMonetary) {
      const price = getNum(obj, "price", "unitPrice", "unit_price", "rate");
      const qty = getNum(obj, "quantity", "qty", "count") || 1;
      let amt = getNum(obj, "total", "amount", "value", "totalNum", "cost", "totalAmount", "amountPaid");
      if ((!amt || amt === 0) && price) amt = price * qty;

      if (amt && amt !== 0) {
        const dateRaw = firstVal(
          obj,
          "purchaseDate",
          "date",
          "acquiredAt",
          "billDate",
          "invoiceDate",
          "createdAt",
          "updatedAt",
          "pettyDate",
          "paymentDate"
        );
        const category =
          firstVal(obj, "category", "assetCategory", "type", "head", "mainCategory", "subCategory", "name", "title") ||
          "Assets";
        const date = dateRaw || new Date();
        out.push({
          type: "assets",
          date,
          parsedDate: parseDateRobust(date),
          amount: amt,
          category,
          raw: obj,
        });
      }
    }

    // Recurse
    Object.values(obj).forEach((v) => {
      if (isPlainObj(v)) walk(v);
      else if (Array.isArray(v)) v.forEach((it) => isPlainObj(it) && walk(it));
    });
  };

  if (Array.isArray(node)) node.forEach((it) => walk(it));
  else walk(node);

  return out;
}

// Investments (pie by investor name)
function extractInvestments(raw = {}) {
  const arr = asArray(raw);
  return (arr || []).map((it) => {
    const date = it.invest_date ?? it.date ?? it.createdAt ?? "";
    const amount = safeNumber(it.invest_amount ?? it.amount ?? it.price ?? it.total ?? 0);
    const by =
      it.investorName ?? it.name ?? it.investedBy ?? it.by ?? it.investor ?? it.userName ?? it.createdBy ?? "Investor";
    const cat = by || "Investor"; // use investor name as category
    return { type: "investments", date, parsedDate: parseDateRobust(date), amount, category: cat, raw: it };
  });
}

// Staff salaries: StaffBioData/<ID>/payments/<index>/amount
function extractStaffFromCollections(node = {}) {
  const out = [];
  Object.values(node || {}).forEach((emp) => {
    const pays = Array.isArray(emp?.payments) ? emp.payments : (emp?.payments && typeof emp.payments === "object" ? Object.values(emp.payments) : []);
    if (pays && pays.length) {
      pays.forEach((p) => {
        if (!p) return;
        const amount = safeNumber(p.amount ?? p.salary ?? p.paidAmount ?? 0);
        const date = p.date ?? p.paymentDate ?? p.paidOn ?? emp.createdAt ?? "";
        if (amount) out.push({ type: "staff", amount, date, parsedDate: parseDateRobust(date), category: "Staff", raw: p });
      });
    }
  });
  return out;
}

// Worker salaries: EmployeeBioData/<ID>/payments/<index>/amount
function extractWorkersFromCollections(node = {}) {
  const out = [];
  Object.values(node || {}).forEach((emp) => {
    const pays = Array.isArray(emp?.payments) ? emp.payments : (emp?.payments && typeof emp.payments === "object" ? Object.values(emp.payments) : []);
    if (pays && pays.length) {
      pays.forEach((p) => {
        if (!p) return;
        const amount = safeNumber(p.amount ?? p.salary ?? p.paidAmount ?? 0);
        const date = p.date ?? p.paymentDate ?? p.paidOn ?? emp.createdAt ?? "";
        if (amount) out.push({ type: "worker", amount, date, parsedDate: parseDateRobust(date), category: "Worker", raw: p });
      });
    }
  });
  return out;
}

// Asset classification inside petty
function isAssetish(rec) {
  if (!rec) return false;
  const get = (x) => (x === undefined || x === null ? "" : String(x).toLowerCase());
  const main = get(rec.category || rec.mainCategory || rec.maincategory || rec.type || rec.assetCategory);
  const sub = get(rec.subCategory || rec.subcategory || rec.sub || "");
  const nm = get(rec.name || rec.title || rec.head || "");
  return main.includes("asset") || sub.includes("asset") || nm.includes("asset");
}

/** Derive Assets-like rows out of PettyCash nodes where mainCategory/category/name indicates assets (leaf-only) */
function extractAssetsFromPetty(node = {}) {
  const out = [];
  const isPlainObj = (x) => x && typeof x === "object" && !Array.isArray(x);

  const hasChildAssetish = (obj) => {
    if (!isPlainObj(obj)) return false;
    for (const v of Object.values(obj)) {
      if (isPlainObj(v)) {
        if (isAssetish(v) || hasChildAssetish(v)) return true;
      } else if (Array.isArray(v)) {
        for (const it of v) {
          if (isPlainObj(it) && (isAssetish(it) || hasChildAssetish(it))) return true;
        }
      }
    }
    return false;
  };

  const walk = (obj) => {
    if (!isPlainObj(obj)) return;
    for (const v of Object.values(obj)) {
      if (!isPlainObj(v)) continue;

      const leafAsset = isAssetish(v) && !hasChildAssetish(v);
      if (leafAsset) {
        const dateRaw = v.purchaseDate ?? v.date ?? v.acquiredAt ?? v.billDate ?? v.invoiceDate ?? v.createdAt ?? v.pettyDate ?? v.paymentDate ?? null;
        const price = safeNumber(v.price ?? v.unitPrice ?? v.unit_price ?? v.rate ?? 0);
        const qty = safeNumber(v.quantity ?? v.qty ?? v.count ?? v.quantityPurchased ?? 1) || 1;
        let total = safeNumber(v.total ?? v.amount ?? v.value ?? v.totalNum ?? v.cost ?? v.totalAmount ?? v.amountPaid ?? 0);
        if ((!total || total === 0) && price) total = price * qty;
        const cat = v.category ?? v.mainCategory ?? v.assetCategory ?? v.type ?? v.head ?? v.subCategory ?? "Assets";
        const date = dateRaw || new Date();
        if (total) out.push({ type: "assets", date, parsedDate: parseDateRobust(date), amount: total, category: cat, raw: v });
      }

      // continue walking
      walk(v);
    }
  };

  walk(node);
  return out;
}

/* ---------------------- Aggregators ---------------------- */
function toMonthlySeries(mapOfRows) {
  const keys = Object.keys(mapOfRows);
  const monthSet = new Set();
  keys.forEach((k) => (mapOfRows[k] || []).forEach((r) => monthSet.add(monthKey(r.parsedDate || r.date))));
  const months = Array.from(monthSet).filter(k => k !== "Unknown").sort();
  return months.map((k) => {
    const [y, m] = k.split("-");
    const label = new Date(Number(y), Number(m) - 1, 1).toLocaleString("default", { month: "short" }) + " " + y.slice(-2);
    const row = { key: k, label };
    keys.forEach((t) => {
      row[t] = (mapOfRows[t] || [])
        .filter((r) => monthKey(r.parsedDate || r.date) === k)
        .reduce((s, r) => s + Number(r.amount || 0), 0);
    });
    return row;
  });
}
function toYearlySeries(mapOfRows) {
  const keys = Object.keys(mapOfRows);
  const yearSet = new Set();
  keys.forEach((k) => (mapOfRows[k] || []).forEach((r) => yearSet.add(yearKey(r.parsedDate || r.date))));
  const years = Array.from(yearSet).filter(k => k !== "Unknown").sort();
  return years.map((k) => {
    const row = { key: k, label: k };
    keys.forEach((t) => {
      row[t] = (mapOfRows[t] || [])
        .filter((r) => yearKey(r.parsedDate || r.date) === k)
        .reduce((s, r) => s + Number(r.amount || 0), 0);
    });
    return row;
  });
}
function toPie(rows, labelKey = "category") {
  const map = {};
  (rows || []).forEach((r) => {
    const k = r[labelKey] || "General";
    map[k] = (map[k] || 0) + Number(r.amount || 0);
  });
  return Object.keys(map)
    .sort((a, b) => map[b] - map[a])
    .map((k, i) => ({ name: k, value: map[k], color: PIE_COLORS[i % PIE_COLORS.length] }));
}

/* ---------------------- UI helpers ---------------------- */
const Toggle = ({ value, onChange, options }) => (
  <div className="btn-group btn-group-sm">
    {options.map((opt) => (
      <button
        key={opt.value}
        type="button"
        className={`btn ${value === opt.value ? "btn-primary" : "btn-outline-primary"}`}
        onClick={() => onChange(opt.value)}
      >
        {opt.label}
      </button>
    ))}
  </div>
);
const Card = ({ title, action, children }) => (
  <div className="glass-card h-100">
    <div className="d-flex align-items-center justify-content-between">
      <h6 className="mb-0">{title}</h6>
      {action}
    </div>
    <div className="mt-2">{children}</div>
  </div>
);

/* ---------------------- Component ---------------------- */
export default function ResultsGrafCard({
  title = "Results Graphs",
  clientCollections = { active: "ClientData", exit: "ExitClients" },
  pettyCollection = "PettyCash",
  assetsCollection = "Assets",
  investmentsCollection = "Investments",
  staffCollections = { active: "StaffBioData", exit: "ExitStaffs" },
  workerCollections = { active: "EmployeeBioData", exit: "ExitEmployees" },
}) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState({ client: [], petty: [], assets: [], investments: [], staff: [], worker: [] });
  const [mode, setMode] = useState("monthly"); // monthly | yearly
  const [activeRange, setActiveRange] = useState("ALL"); // ALL | YTD | 12M | 6M | 4M | 3M
  const [modalOpen, setModalOpen] = useState(false);
  const [pieView, setPieView] = useState("client"); // selected category
  const modalRef = useRef(null);

  // Attach to Firebase paths & normalize records
  useEffect(() => {
    let mounted = true;
    const listeners = [];

    (async () => {
      const fdb = await importFirebaseDB();
      if (!mounted) return;
      if (!fdb) { setLoading(false); return; }

      const snapshots = {};
      const attach = (path, key) => {
        try {
          const ref = fdb.child ? fdb.child(path) : fdb.ref(path);
          const cb = (snap) => { snapshots[key] = snap.val() || {}; rebuild(); };
          ref.on("value", cb);
          listeners.push({ ref, cb });
        } catch (e) { console.error("ResultsGrafCard attach error:", path, e); }
      };

      // Clients
      attach(clientCollections.active, "clientsActive");
      attach(clientCollections.exit, "clientsExit");

      // Petty
      attach(`${pettyCollection}`, "pettyRoot");
      attach(`${pettyCollection}/admin`, "pettyAdmin");
      attach(`PettyCash/Admin`, "pettyAdminCaps");

      // Assets
      attach(`${assetsCollection}`, "assetsRoot");
      attach(`${assetsCollection}/admin`, "assetsAdmin");
      attach(`Assets`, "assetsAltRoot");
      attach(`Assets/admin`, "assetsAltAdmin");
      attach(`JenCeo-DataBase/Assets/admin`, "assetsJenAdmin");

      // Investments
      attach(investmentsCollection, "investments");

      // Staff
      attach(staffCollections.active, "staffActive");
      attach(staffCollections.exit, "staffExit");

      // Workers
      attach(workerCollections.active, "workerActive");
      attach(workerCollections.exit, "workerExit");

      function rebuild() {
        // Clients
        const clientRows = [];
        ["clientsActive", "clientsExit"].forEach((k) => {
          const node = snapshots[k] || {};
          Object.values(node || {}).forEach((client) => clientRows.push(...extractClientPayments(client || {})));
        });

        // Petty
        const pettyRows = [];
        ["pettyRoot", "pettyAdmin", "pettyAdminCaps"].forEach((k) => pettyRows.push(...extractPetty(snapshots[k] || {})));

        // Assets (flat + nested, plus derived from petty)
        let assetRows = [];
        ["assetsRoot", "assetsAdmin", "assetsAltRoot", "assetsAltAdmin", "assetsJenAdmin"].forEach((k) => assetRows.push(...extractAssets(snapshots[k] || {})));
        ["pettyRoot", "pettyAdmin", "pettyAdminCaps"].forEach((k) => assetRows.push(...extractAssetsFromPetty(snapshots[k] || {})));
        // De-dup assets by strong or fuzzy signature
        const aSeen = new Set();
        assetRows = assetRows.filter((r) => {
          const raw = r.raw || {};
          const id = raw.id ?? raw.ID ?? raw.key ?? raw.uid ?? raw.assetId ?? raw.refNo ?? raw.invoiceNo ?? raw.invoice ?? raw.docId ?? "";
          const name = String((raw.name ?? raw.title ?? raw.head ?? raw.description ?? raw.item ?? raw.product ?? "") || "").toLowerCase();
          const mainCat = String((raw.category ?? raw.mainCategory ?? raw.assetCategory ?? raw.type ?? "") || "").toLowerCase();
          const month = monthKey(r.parsedDate || r.date);
          const strong = id ? `id:${id}` : null;
          const fuzzy = `amt:${Number(r.amount||0)}|cat:${mainCat}|name:${name}|mon:${month}`;
          const sig = strong ?? fuzzy;
          if (aSeen.has(sig)) return false;
          aSeen.add(sig);
          return true;
        });

        // Investments
        const investRows = extractInvestments(snapshots.investments || {});

        // Staff
        const staffRows = [];
        staffRows.push(...extractStaffFromCollections(snapshots.staffActive || {}));
        staffRows.push(...extractStaffFromCollections(snapshots.staffExit || {}));

        // Workers
        const workerRows = [];
        workerRows.push(...extractWorkersFromCollections(snapshots.workerActive || {}));
        workerRows.push(...extractWorkersFromCollections(snapshots.workerExit || {}));

        // Sort by date desc
        const byDateDesc = (a, b) => (b.parsedDate?.getTime?.() || 0) - (a.parsedDate?.getTime?.() || 0);
        clientRows.sort(byDateDesc);
        pettyRows.sort(byDateDesc);
        assetRows.sort(byDateDesc);
        investRows.sort(byDateDesc);
        staffRows.sort(byDateDesc);
        workerRows.sort(byDateDesc);

        if (mounted) {
          setRows({ client: clientRows, petty: pettyRows, assets: assetRows, investments: investRows, staff: staffRows, worker: workerRows });
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
      try { listeners.forEach(({ ref, cb }) => ref.off("value", cb)); } catch {}
    };
  }, [clientCollections.active, clientCollections.exit, pettyCollection, assetsCollection, investmentsCollection, staffCollections.active, staffCollections.exit, workerCollections.active, workerCollections.exit]);

  // Date range filter (added 12M, 6M, 4M, 3M)
  const filteredRows = useMemo(() => {
    if (activeRange === "ALL") return rows;
    const now = new Date();
    let from = null;
    if (activeRange === "YTD") from = new Date(now.getFullYear(), 0, 1);
    if (activeRange === "12M") from = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    if (activeRange === "6M") from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    if (activeRange === "4M") from = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    if (activeRange === "3M") from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    if (!from) return rows;
    const filt = {};
    Object.keys(rows).forEach((k) => {
      filt[k] = (rows[k] || []).filter((r) => {
        const dt = r.parsedDate || parseDateRobust(r.date);
        return dt && dt >= from;
      });
    });
    return filt;
  }, [rows, activeRange]);

  const monthlySeriesAll = useMemo(() => toMonthlySeries(filteredRows), [filteredRows]);
  const yearlySeriesAll = useMemo(() => toYearlySeries(filteredRows), [filteredRows]);
  const seriesAll = mode === "monthly" ? monthlySeriesAll : yearlySeriesAll;

  // **Single-category** bar chart based on selection
  const singleKey = pieView;
  const seriesSingle = useMemo(() => {
    return (seriesAll || []).map((row) => ({ label: row.label, [singleKey]: row[singleKey] || 0 }));
  }, [seriesAll, singleKey]);

  // Pie datasets (use selected category)
  const pieDatasets = useMemo(() => ({
    client: { title: "Client Payments by Method", data: toPie(filteredRows.client, "method") },
    petty: { title: "Petty Cash by Category", data: toPie(filteredRows.petty, "category") },
    assets: { title: "Assets by Category", data: toPie(filteredRows.assets, "category") },
    investments: { title: "Investments by Investor", data: toPie(filteredRows.investments, "category") },
    staff: { title: "Staff Salaries", data: toPie(filteredRows.staff, "category") },
    worker: { title: "Worker Salaries", data: toPie(filteredRows.worker, "category") },
  }), [filteredRows]);

  // totals
  const totals = useMemo(() => {
    const sum = (arr) => (arr || []).reduce((s, r) => s + Number(r.amount || 0), 0);
    return {
      client: sum(filteredRows.client),
      petty: sum(filteredRows.petty),
      assets: sum(filteredRows.assets),
      investments: sum(filteredRows.investments),
      staff: sum(filteredRows.staff),
      worker: sum(filteredRows.worker),
    };
  }, [filteredRows]);

  const fmtINR = (n) => {
    try { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0); }
    catch { return "₹" + Number(n || 0).toLocaleString("en-IN"); }
  };

  /* ---------------------- Render ---------------------- */
  const pie = pieDatasets[pieView] || { title: "", data: [] };

  return (
    <>
      {/* Trigger card */}
      <div className="col-12 mb-3">
        <div className="neo-card results-card hover-rise" role="button" onClick={() => setModalOpen(true)}>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <div className="tiny text-white-80 text-uppercase">Open Results Graphs</div>
              <div className="h5 fw-bold mb-0">{title}</div>
            </div>
            <div className="text-end tiny text-white-80">
              <div>Client: {fmtINR(totals.client)}</div>
              <div>Petty: {fmtINR(totals.petty)} · Assets: {fmtINR(totals.assets)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal fade show" style={{ display: "block", background: "rgba(2,6,23,0.55)" }} onClick={() => setModalOpen(false)}>
          <div className="modal-dialog modal-xl modal-dialog-centered" onClick={(e) => e.stopPropagation()} ref={modalRef}>
            <div className="modal-content overflow-hidden">
              <div className="modal-header gradient-header text-white">
                <h5 className="modal-title">{title}</h5>
                <button className="btn-close btn-close-white" onClick={() => setModalOpen(false)} />
              </div>

              <div className="modal-body bg-surface">
                {/* Controls */}
                <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                  <Toggle
                    value={activeRange}
                    onChange={setActiveRange}
                    options={[
                      { value: "ALL", label: "All" },
                      { value: "YTD", label: "YTD" },
                      { value: "12M", label: "12M" },
                      { value: "6M", label: "6M" },
                      { value: "4M", label: "4M" },
                      { value: "3M", label: "3M" },
                    ]}
                  />
                  <div className="ms-2">
                    <Toggle
                      value={mode}
                      onChange={setMode}
                      options={[
                        { value: "monthly", label: "Monthly" },
                        { value: "yearly", label: "Yearly" },
                      ]}
                    />
                  </div>

                  <div className="ms-auto btn-group btn-group-sm" role="group" aria-label="Select category">
                    {[
                      ["client","Client"],
                      ["investments","Invest"],
                      ["worker","Workers"],
                      ["staff","Staff"],
                      ["petty","Petty"],
                      ["assets","Assets"],
                    ].map(([val, lab]) => (
                      <button key={val} className={`btn btn-outline-info ${pieView===val?"active":""}`} onClick={() => setPieView(val)}>{lab}</button>
                    ))}
                  </div>
                </div>

                {/* Single-series bar chart for the selected category */}
                <Card
                  title={`${pieView.charAt(0).toUpperCase() + pieView.slice(1)} — ${mode === "monthly" ? "Monthly" : "Yearly"}`}
                  action={<span className="text-muted small">Total: {fmtINR(totals[pieView] || 0)}</span>}
                >
                  <div style={{ width: "100%", height: 300 }}>
                    <ResponsiveContainer>
                      <RBarChart data={seriesSingle} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip formatter={(v) => fmtINR(v)} />
                        <Legend />
                        <Bar dataKey={pieView} name={pieView.toUpperCase()} fill={COLORS[pieView]} />
                      </RBarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Pie (for same selected category) + Totals */}
                <div className="row g-3 mt-1">
                  <div className="col-md-6">
                    <Card title={pie.title || "Breakdown"}>
                      <div style={{ width: "100%", height: 260 }}>
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie data={pie.data} dataKey="value" nameKey="name" outerRadius={90} innerRadius={50} paddingAngle={2}>
                              {pie.data.map((entry, index) => (
                                <Cell key={`pv-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v) => fmtINR(v)} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  </div>

                  <div className="col-md-6">
                    <div className="d-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: "12px" }}>
                      {[
                        { k: "client", label: "Client", color: COLORS.client, val: totals.client },
                        { k: "investments", label: "Invest", color: COLORS.investments, val: totals.investments },
                        { k: "worker", label: "Workers", color: COLORS.worker, val: totals.worker },
                        { k: "staff", label: "Staff", color: COLORS.staff, val: totals.staff },
                        { k: "petty", label: "Petty", color: COLORS.petty, val: totals.petty },
                        { k: "assets", label: "Assets", color: COLORS.assets, val: totals.assets },
                      ].map((t) => (
                        <div key={t.k} className="p-3 rounded-3" style={{ background: "#0b1220", color: "#e2e8f0", border: `1px solid ${t.color}30` }}>
                          <div className="d-flex align-items-center justify-content-between">
                            {/* <div className="fw-semibold">{t.label}</div> */}
                            <span className="badge" style={{ background: t.color }}>{t.k.toUpperCase()}</span>
                          </div>
                          <div className="fs-5 mt-1">{fmtINR(t.val)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer bg-surface">
                <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
