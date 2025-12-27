// src/components/DashBoard/ClientPaymentCard.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { CLIENT_PATHS } from "../../utils/dataPaths"; // Assuming dataPaths.js is in same folder

/* ---------------------- Helpers ---------------------- */
async function importFirebaseDB() {
  try {
    const a = await import("../../firebase");
    if (a && a.default) return a.default;
    if (a && a.firebaseDB) return a.firebaseDB;
  } catch (e) { }
  try {
    const b = await import("../../firebase");
    if (b && b.default) return b.default;
    if (b && b.firebaseDB) return b.firebaseDB;
  } catch (e) { }
  if (typeof window !== "undefined" && window.firebaseDB) return window.firebaseDB;
  return null;
}

function safeNumber(v) {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const cleaned = String(v).replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isNaN(n) ? 0 : n;
}

function formatINR(value) {
  const n = Number(value || 0);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch (e) {
    return "\u20B9" + n.toLocaleString("en-IN");
  }
}

function parseDateRobust(v) {
  if (!v && v !== 0) return null;
  if (v instanceof Date && !isNaN(v)) return v;
  const s = String(v).trim();
  if (/^\d{10,13}$/.test(s)) {
    const n = Number(s);
    // if in seconds (10 digits) convert to ms
    return new Date(n < 1e12 ? n * 1000 : n);
  }
  // ISO / standard date
  const d = new Date(s);
  if (!isNaN(d)) return d;
  // dd/mm/yyyy or dd-mm-yyyy
  const m = s.match(/^(\d{1,2})[\/\-\s](\d{1,2})[\/\-\s](\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  // Month YYYY
  const mm = s.match(/([A-Za-z]+)[,]?\s*(\d{4})/);
  if (mm) {
    const idx = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(mm[1].slice(0, 3).toLowerCase());
    if (idx >= 0) return new Date(Number(mm[2]), idx, 1);
  }
  return null;
}

/* ---------------------- SVG Charts ---------------------- */
function BarChart({ data = [], width = 520, height = 150, pad = 30, color = "url(#gradClient)" }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const barW = (width - pad * 2) / (data.length || 1);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="gradClient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="gradPayment" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={width} height={height} fill="transparent" />
      {data.map((d, i) => {
        const h = Math.max(2, (d.value / max) * (height - pad * 2));
        const x = pad + i * barW + 4;
        const y = height - pad - h;
        return (
          <g key={i}>
            <title>{d.label}: {formatINR(d.value)}</title>
            <rect x={x} y={y} width={Math.max(8, barW - 8)} height={h} fill={color} rx="6" />
            {h > 12 && (
              <text
                x={x + Math.max(8, barW - 8) / 2}
                y={y + h / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10"
                fill="#facc15"
                transform={`rotate(-90 ${x + Math.max(8, barW - 8) / 2} ${y + h / 2})`}
              >
                {formatINR(d.value)}
              </text>
            )}
            <text x={x + Math.max(8, barW - 8) / 2} y={height - 10} textAnchor="middle" fontSize="10" fill="#94a3b8">{d.short || d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function DonutChart({ segments = [], size = 150, stroke = 18, title = "Distribution" }) {
  const total = Math.max(1, segments.reduce((s, x) => s + (x.value || 0), 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id="gradClient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="gradPayment" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="gradRefund" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
        <linearGradient id="gradBalance" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#e2e8f0" strokeWidth={stroke} fill="none" />
      {segments.map((s, i) => {
        const frac = (s.value || 0) / total;
        const len = c * frac;
        const dash = `${len} ${c - len}`;
        const dashoffset = c - offset;
        offset += len;
        return (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={s.color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={dash}
            strokeDashoffset={dashoffset}
            strokeLinecap="round"
          />
        );
      })}
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="14" fill="#0f172a">{title}</text>
    </svg>
  );
}

/* Normalize client record into payment rows */
function extractPaymentsFromClient(clientRecord = {}, collectionName = "", department = "") {
  const clientId = clientRecord.idNo ?? clientRecord.id ?? clientRecord.clientId ?? clientRecord.key ?? "";
  const clientName = clientRecord.clientName ?? clientRecord.cName ?? clientRecord.name ?? clientRecord.client_name ?? "Unknown";

  const paymentsArr = Array.isArray(clientRecord.payments)
    ? clientRecord.payments
    : (clientRecord.payments && typeof clientRecord.payments === "object" ? Object.values(clientRecord.payments) : []);

  const results = [];

  if (paymentsArr && paymentsArr.length) {
    paymentsArr.forEach((p) => {
      if (!p) return;
      const paidAmount = safeNumber(p.paidAmount ?? p.amount ?? p.payment ?? p.paymentAmount ?? 0);
      const travel = safeNumber(p.travel ?? p.travelCharges ?? p.travelAmount ?? 0);
      const totalForTotals = paidAmount + travel;
      const balance = safeNumber(p.balance ?? p.balanceAmount ?? 0);
      const refundAmount = safeNumber(p.refundAmount ?? p.refund ?? (paidAmount < 0 ? -paidAmount : 0));
      const isRefund = Boolean(p.refund || refundAmount > 0 || paidAmount < 0);
      const receipt = p.receptNo ?? p.receiptNo ?? p.receipt ?? p.receipt_number ?? "";
      const method = p.paymentMethod ?? p.type ?? p.mode ?? p.method ?? "";
      const date = p.date ?? p.paymentDate ?? p.createdAt ?? p.paymentFor ?? "";
      const parsedDate = parseDateRobust(date);

      results.push({
        sourceCollection: collectionName,
        department: department || "",
        clientId: String(clientId || ""),
        clientName: String(clientName || ""),
        paidAmount,
        travel,
        totalForTotals,
        balance,
        refundAmount,
        isRefund,
        receipt,
        method,
        date,
        parsedDate,
        raw: p,
        _fullClientData: clientRecord // Store full client data for detailed view
      });
    });
  } else {
    // fallback single record fields
    const singleAmount = safeNumber(clientRecord.paidAmount ?? clientRecord.amount ?? clientRecord.payment ?? 0);
    if (singleAmount !== 0 || singleAmount === 0) {
      const travel = safeNumber(clientRecord.travel ?? clientRecord.travelCharges ?? 0);
      const date = clientRecord.date ?? clientRecord.paymentDate ?? "";
      results.push({
        sourceCollection: collectionName,
        department: department || "",
        clientId: String(clientId || ""),
        clientName: String(clientName || ""),
        paidAmount: singleAmount,
        travel,
        totalForTotals: singleAmount + travel,
        balance: safeNumber(clientRecord.balance ?? 0),
        refundAmount: safeNumber(clientRecord.refundAmount ?? 0),
        isRefund: Boolean(clientRecord.refund ?? clientRecord.refundAmount),
        receipt: clientRecord.receptNo ?? clientRecord.receiptNo ?? "",
        method: clientRecord.paymentMethod ?? "",
        date,
        parsedDate: parseDateRobust(date),
        raw: clientRecord,
        _fullClientData: clientRecord
      });
    }
  }

  // parse paymentLogs / refunds if present
  const logsNode = clientRecord.paymentLogs ?? clientRecord.paymentLog ?? clientRecord.payment_logs ?? clientRecord.paymentLogsList ?? null;
  const logsArr = Array.isArray(logsNode)
    ? logsNode
    : (logsNode && typeof logsNode === "object" ? Object.values(logsNode) : []);

  if (logsArr && logsArr.length) {
    logsArr.forEach((lg) => {
      if (!lg) return;
      const refundAmount = safeNumber(lg.refundAmount ?? lg.amount ?? lg.paidAmount ?? lg.refund ?? 0);
      if (!refundAmount) return;
      const dateLg = lg.date ?? lg.logDate ?? lg.createdAt ?? clientRecord.date ?? null;
      const parsedLg = parseDateRobust(dateLg);

      results.push({
        sourceCollection: collectionName,
        department: department || "",
        clientId: String(clientId || ""),
        clientName: String(clientName || ""),
        paidAmount: 0,
        travel: 0,
        totalForTotals: 0,
        balance: safeNumber(lg.balance ?? clientRecord.balance ?? 0),
        refundAmount,
        isRefund: true,
        receipt: lg.receptNo ?? lg.receiptNo ?? lg.receipt ?? "",
        method: lg.method ?? lg.type ?? lg.mode ?? "",
        date: dateLg,
        parsedDate: parsedLg,
        raw: lg,
        _fullClientData: clientRecord
      });
    });
  }

  return results;
}

function isBalancePayRow(p) {
  try {
    if (p && p.raw && (p.raw.__type === "balance" || p.raw.__adjustment)) {
      if (p.raw.__type === "balance") return true;
      const rem = String(p.raw.remarks || "").toLowerCase();
      if (rem.includes("balance paid")) return true;
    }
    const rem2 = String(p.raw?.remarks || "").toLowerCase();
    if (rem2.includes("balance paid")) return true;
    if (!p.isRefund && Number(p.paidAmount || 0) > 0 && Number(p.balance || 0) === 0) return true;
  } catch (e) { }
  return false;
}

//  { years: { [year]: { months: { [monthKey]: { rows, totals } }, totals } }, yearKeys: [] } 
function groupPaymentsByYearMonth(payments) {
  const years = {};
  (payments || []).forEach((p) => {
    let year = p.parsedDate ? p.parsedDate.getFullYear() : null;
    let monthIdx = p.parsedDate ? p.parsedDate.getMonth() : null;
    if (!year || monthIdx === null || monthIdx === undefined) {
      const alt = parseDateRobust(p.date || p.raw?.paymentFor || "");
      if (alt) {
        year = alt.getFullYear();
        monthIdx = alt.getMonth();
      }
    }
    if (!year) year = "Unknown";
    const yKey = year;
    const mKey = (monthIdx === null || monthIdx === undefined) ? "Unknown" : String(monthIdx);

    if (!years[yKey]) years[yKey] = { months: {}, totals: { paid: 0, balance: 0, refunds: 0, pending: 0, count: 0 } };
    if (!years[yKey].months[mKey]) years[yKey].months[mKey] = { rows: [], totals: { paid: 0, balance: 0, refunds: 0, pending: 0, count: 0 } };

    years[yKey].months[mKey].rows.push(p);
    years[yKey].months[mKey].totals.paid += Number(p.totalForTotals ?? p.paidAmount ?? 0);
    years[yKey].months[mKey].totals.balance += Number(p.balance ?? 0);
    years[yKey].months[mKey].totals.refunds += Number(p.refundAmount ?? 0);
    years[yKey].months[mKey].totals.count += 1;
    if (Number(p.paidAmount || 0) === 0) years[yKey].months[mKey].totals.pending += 1;

    years[yKey].totals.paid += Number(p.totalForTotals ?? p.paidAmount ?? 0);
    years[yKey].totals.balance += Number(p.balance ?? 0);
    years[yKey].totals.refunds += Number(p.refundAmount ?? 0);
    years[yKey].totals.count += 1;
    if (Number(p.paidAmount || 0) === 0) years[yKey].totals.pending += 1;
  });

  const yearKeys = Object.keys(years).sort((a, b) => {
    if (a === "Unknown") return 1;
    if (b === "Unknown") return -1;
    return Number(b) - Number(a);
  });

  // sort months for each year; keep keys as strings (e.g. "0".."11" or "Unknown")
  yearKeys.forEach((y) => {
    const months = years[y].months || {};
    const mKeys = Object.keys(months).sort((a, b) => {
      if (a === "Unknown") return 1;
      if (b === "Unknown") return -1;
      return Number(a) - Number(b);
    });
    const sorted = {};
    mKeys.forEach((k) => (sorted[k] = months[k]));
    years[y].months = sorted;
  });

  return { years, yearKeys };
}

/* Simple sparkline */
function Sparkline({ points = [], width = 120, height = 30 }) {
  if (!points || points.length === 0) return <div className="invest-sparkline" />;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const stepX = width / (points.length - 1 || 1);
  const coords = points
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg className="invest-sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline fill="none" stroke="currentColor" strokeWidth="1.5" points={coords} />
    </svg>
  );
}

/* ---------------------- Component ---------------------- */

function renderAmount(value, opts = {}) {
  const n = Number(value || 0);
  const txt = formatINR(n);
  if (n < 0) return <span className={opts.className ? opts.className + " text-danger" : "text-danger"}>{txt}</span>;
  return <span className={opts.className || ""}>{txt}</span>;
}

function getDisplayPayment(r) {
  const paid = Number(r?.paidAmount || 0);
  const refund = Number(r?.refundAmount || 0);
  // Payment = PaidAmount - Refund  (includes balance-clear rows as positive paid)
  return paid - refund;
}

function getDisplayBalance(r) {
  const isBalanceClear = r?.raw?.__type === "balance";
  const rowBal = Number(r?.balance || 0);
  const paid = Number(r?.paidAmount || 0);

  if (isBalanceClear) {
    // If the row's recorded balance is already 0, don't add an extra negative
    if (rowBal === 0) return 0;
    return -paid;
  }

  // Otherwise show the recorded balance value
  return rowBal;
}

export default function ClientPaymentCard({
  clientCollections = { active: "ClientData", exit: "ExitClients" },
  openClientModal = null,
  rootPathForClientProfile = "/client-profile",
}) {
  const navigate = useNavigate();
  const [allPayments, setAllPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeYear, setActiveYear] = useState(null);
  const [activeMonth, setActiveMonth] = useState(null); // string like "0".."11" or "Unknown"
  const [viewMode, setViewMode] = useState("month");
  const [filterClient, setFilterClient] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentDetailModal, setPaymentDetailModal] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeDepartment, setActiveDepartment] = useState("All Departments");
  const modalRef = useRef(null);

  const departments = [
    "All Departments",
    "Home Care",
    "Housekeeping", 
    "Office & Administrative",
    "Customer Service",
    "Management & Supervision",
    "Security",
    "Driving & Logistics",
    "Technical & Maintenance",
    "Retail & Sales",
    "Industrial & Labor",
    "Others"
  ];

  // listen Firebase nodes and build payments
  useEffect(() => {
    let listeners = [];
    let mounted = true;

    (async () => {
      const fdb = await importFirebaseDB();
      if (!mounted) return;
      if (!fdb) {
        console.error("Firebase DB not found - ClientPaymentCard");
        setLoading(false);
        return;
      }

      const snapshots = {};
      const paths = [clientCollections.active, clientCollections.exit];
      
      // Add department-based paths
      Object.values(CLIENT_PATHS).forEach(path => {
        if (!paths.includes(path)) {
          paths.push(path);
        }
      });

      const attach = (path) => {
        try {
          const ref = fdb.child ? fdb.child(path) : fdb.ref(path);
          const cb = (snap) => {
            snapshots[path] = snap.val() || {};
            rebuild();
          };
          ref.on("value", cb);
          listeners.push({ ref, cb });
        } catch (err) {
          console.error("Error attaching to", path, err);
        }
      };

      const getDepartmentFromPath = (path) => {
        // Find department from CLIENT_PATHS
        for (const [dept, deptPath] of Object.entries(CLIENT_PATHS)) {
          if (path === deptPath) return dept;
        }
        return "";
      };

      const rebuild = () => {
        const combined = [];
        paths.forEach((p) => {
          const node = snapshots[p] || {};
          const department = getDepartmentFromPath(p);
          Object.keys(node).forEach((k) => {
            const client = node[k] || {};
            const payments = extractPaymentsFromClient(client, p, department);
            payments.forEach((pm) => {
              pm._clientDbKey = `${p}/${k}`;
              pm.sourceCollection = p;
              combined.push(pm);
            });
          });
        });

        // ensure parsedDate computed for any row that lacks it (fallback)
        combined.forEach((r) => {
          if (!r.parsedDate) r.parsedDate = parseDateRobust(r.date || r.raw?.paymentFor || r.raw?.createdAt || "");
        });

        combined.sort((a, b) => {
          const da = a.parsedDate ? a.parsedDate.getTime() : 0;
          const db = b.parsedDate ? b.parsedDate.getTime() : 0;
          return db - da;
        });

        setAllPayments(combined);
        setLoading(false);
      };

      paths.forEach(attach);
    })();

    return () => {
      mounted = false;
      try {
        listeners.forEach(({ ref, cb }) => ref.off("value", cb));
      } catch (e) { }
    };
  }, [clientCollections.active, clientCollections.exit]);

  // Filter payments by active department
  const filteredPayments = useMemo(() => {
    if (activeDepartment === "All Departments") {
      return allPayments;
    }
    return allPayments.filter(payment => payment.department === activeDepartment);
  }, [allPayments, activeDepartment]);

  // grouped structure
  const grouped = useMemo(() => groupPaymentsByYearMonth(filteredPayments), [filteredPayments]);
  const yearKeys = useMemo(() => grouped.yearKeys || [], [grouped]);

  // client summaries & overall totals
  const clientSummaries = useMemo(() => {
    const map = {};
    filteredPayments.forEach((p) => {
      const id = p.clientId || "Unknown";
      const name = p.clientName || "Unknown";
      if (!map[id]) map[id] = { clientId: id, clientName: name, paid: 0, balance: 0, refunds: 0, count: 0 };
      map[id].paid += Number(p.paidAmount || 0);
      map[id].balance += Number(p.balance || 0);
      map[id].refunds += Number(p.refundAmount || 0);
      map[id].count += 1;
    });
    return Object.values(map).sort((a, b) => b.paid - a.paid);
  }, [filteredPayments]);

  // Calculate totals for ALL departments (not just filtered)
  const overallTotalsAllDepartments = useMemo(() => {
    const acc = allPayments.reduce(
      (acc2, p) => {
        acc2.paid += Number(p.paidAmount || 0);
        acc2.paidIncludingTravel += Number(p.totalForTotals || p.paidAmount || 0);
        acc2.balanceSumAllRows += Number(p.balance || 0);
        acc2.refunds += Number(p.refundAmount || 0);
        acc2.count += 1;
        const isBal = p?.raw?.__type === "balance";
        if (Number(p.paidAmount || 0) === 0 && Number(p.refundAmount || 0) === 0 && !isBal) acc2.pendingCount += 1;
        return acc2;
      },
      { paid: 0, paidIncludingTravel: 0, balanceSumAllRows: 0, refunds: 0, count: 0, pendingCount: 0 }
    );

    // Payment (net) across all rows
    acc.netPaid = (allPayments || []).reduce((s, r) => s + getDisplayPayment(r), 0);

    // Outstanding balance = sum of latest balance per client (using sorted allPayments desc)
    const latestByClient = {};
    (allPayments || []).forEach((row) => {
      const cid = (row.clientId || "Unknown").toString();
      if (latestByClient[cid] === undefined) {
        latestByClient[cid] = Number(row.balance || 0);
      }
    });
    acc.netBalance = Object.values(latestByClient).reduce((s, n) => s + Number(n || 0), 0);

    return acc;
  }, [allPayments]);

  // Calculate totals for current department
  const overallTotalsCurrentDepartment = useMemo(() => {
    const acc = filteredPayments.reduce(
      (acc2, p) => {
        acc2.paid += Number(p.paidAmount || 0);
        acc2.paidIncludingTravel += Number(p.totalForTotals || p.paidAmount || 0);
        acc2.balanceSumAllRows += Number(p.balance || 0);
        acc2.refunds += Number(p.refundAmount || 0);
        acc2.count += 1;
        const isBal = p?.raw?.__type === "balance";
        if (Number(p.paidAmount || 0) === 0 && Number(p.refundAmount || 0) === 0 && !isBal) acc2.pendingCount += 1;
        return acc2;
      },
      { paid: 0, paidIncludingTravel: 0, balanceSumAllRows: 0, refunds: 0, count: 0, pendingCount: 0 }
    );

    // Payment (net) across all rows
    acc.netPaid = (filteredPayments || []).reduce((s, r) => s + getDisplayPayment(r), 0);

    // Outstanding balance = sum of latest balance per client (using sorted filteredPayments desc)
    const latestByClient = {};
    (filteredPayments || []).forEach((row) => {
      const cid = (row.clientId || "Unknown").toString();
      if (latestByClient[cid] === undefined) {
        latestByClient[cid] = Number(row.balance || 0);
      }
    });
    acc.netBalance = Object.values(latestByClient).reduce((s, n) => s + Number(n || 0), 0);

    return acc;
  }, [filteredPayments]);

  // default active year/month when modal opens
  useEffect(() => {
    if (!modalOpen) return;
    if (!yearKeys.length) {
      setActiveYear(null);
      setActiveMonth(null);
      return;
    }
    const targetYear = yearKeys[0];
    setActiveYear((prev) => prev || targetYear);

    // choose latest month (not "Unknown") or first available
    const monthsObj = grouped.years?.[targetYear]?.months || {};
    const keys = Object.keys(monthsObj);
    let pick = null;
    if (keys.length) {
      const nonUnknown = keys.slice().reverse().find((k) => k !== "Unknown");
      pick = nonUnknown ?? keys[0];
    }
    setActiveMonth((prev) => (prev === null || prev === undefined ? pick : prev));
    setFilterClient(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen, yearKeys.join("," + "")]); // minor deps tweak to avoid excessive runs

  // when activeYear changes, pick a good activeMonth
  useEffect(() => {
    if (!activeYear) {
      setActiveMonth(null);
      return;
    }
    const monthsObj = grouped.years?.[activeYear]?.months || {};
    const keys = Object.keys(monthsObj);
    if (!keys.length) {
      setActiveMonth(null);
      return;
    }
    if (filterClient) {
      const candidate = keys.slice().reverse().find((k) => (monthsObj[k].rows || []).some((r) => (r.clientId || "").toString() === (filterClient || "").toString()));
      if (candidate) {
        setActiveMonth(candidate);
        return;
      }
    }
    const cand = keys.slice().reverse().find((k) => k !== "Unknown");
    setActiveMonth(cand || keys[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeYear, filterClient]);

  // current month/year rows (safely indexing keys as strings)
  const currentMonthRows = useMemo(() => {
    if (activeYear === null || activeYear === undefined) return [];
    if (activeMonth === null || activeMonth === undefined) return [];
    const mKey = String(activeMonth);
    const mObj = grouped.years?.[activeYear]?.months?.[mKey];
    if (!mObj) return [];
    let rows = mObj.rows || [];
    if (filterClient) rows = rows.filter((r) => (r.clientId || "").toString() === (filterClient || "").toString());
    // sort newest first
    return rows.slice().sort((a, b) => {
      const da = a.parsedDate ? a.parsedDate.getTime() : 0;
      const db = b.parsedDate ? b.parsedDate.getTime() : 0;
      return db - da;
    });
  }, [activeYear, activeMonth, filterClient, grouped]);

  const currentYearRows = useMemo(() => {
    if (activeYear === null || activeYear === undefined) return [];
    const months = grouped.years?.[activeYear]?.months || {};
    let rows = Object.keys(months).reduce((acc, k) => acc.concat(months[k].rows || []), []);
    if (filterClient) rows = rows.filter((r) => (r.clientId || "").toString() === (filterClient || "").toString());
    return rows;
  }, [activeYear, grouped, filterClient]);

  // Pagination
  const currentRows = useMemo(() => {
    return viewMode === "month" ? currentMonthRows : currentYearRows;
  }, [viewMode, currentMonthRows, currentYearRows]);

  const totalEntries = currentRows.length;
  const totalPages = Math.ceil(totalEntries / pageSize);
  const pageSafe = Math.max(1, Math.min(page, totalPages || 1));
  const pageStart = (pageSafe - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, totalEntries);
  const paginatedRows = currentRows.slice(pageStart, pageEnd);

  useEffect(() => {
    if (pageSafe !== page) {
      setPage(pageSafe);
    }
  }, [pageSafe, page]);

  // Chart data
  const monthlyChartData = useMemo(() => {
    if (!activeYear) return [];
    const months = grouped.years?.[activeYear]?.months || {};
    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return monthLabels.map((label, index) => {
      const monthData = months[index] || { totals: { paid: 0 } };
      return {
        label,
        short: label,
        value: monthData.totals.paid
      };
    });
  }, [activeYear, grouped]);

  // Payment method distribution for pie chart
  const paymentMethodDistribution = useMemo(() => {
    const methods = {};
    currentMonthRows.forEach(payment => {
      const method = payment.method || "Unknown";
      methods[method] = (methods[method] || 0) + getDisplayPayment(payment);
    });

    return Object.entries(methods).map(([method, amount]) => ({
      key: method,
      value: amount,
      color: method === "Cash" ? "url(#gradClient)" :
        method === "Bank" ? "url(#gradPayment)" :
          method === "Card" ? "url(#gradBalance)" :
            "url(#gradRefund)"
    }));
  }, [currentMonthRows]);

  // Client distribution for pie chart
  const clientDistribution = useMemo(() => {
    const clients = {};
    currentMonthRows.forEach(payment => {
      const client = payment.clientName;
      clients[client] = (clients[client] || 0) + getDisplayPayment(payment);
    });

    return Object.entries(clients)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) // Top 5 clients
      .map(([client, amount]) => ({
        key: client,
        value: amount,
        color: "url(#gradClient)"
      }));
  }, [currentMonthRows]);

  // totals
  const monthlyTotals = useMemo(() => {
    const paid = currentMonthRows.reduce((s, r) => s + Number(r.paidAmount || 0), 0);
    const refunds = currentMonthRows.reduce((s, r) => s + Number(r.refundAmount || 0), 0);
    const net = currentMonthRows.reduce((s, r) => s + getDisplayPayment(r), 0);
    // Balance (month): sum of latest balance per client within the month (avoid double subtraction)
    const latestByClientM = {};
    const rowsM = currentMonthRows.slice().sort((a, b) => (b.parsedDate ? b.parsedDate.getTime() : 0) - (a.parsedDate ? a.parsedDate.getTime() : 0));
    for (const row of rowsM) {
      const cid = (row.clientId || "Unknown").toString();
      if (latestByClientM[cid] === undefined) latestByClientM[cid] = Number(row.balance || 0);
    }
    const balance = Object.values(latestByClientM).reduce((s, n) => s + Number(n || 0), 0);
    const paidInclTravel = currentMonthRows.reduce((s, r) => s + Number(r.totalForTotals || r.paidAmount || 0), 0);
    const pending = currentMonthRows.reduce((s, r) => s + ((Number(r.paidAmount || 0) === 0 && Number(r.refundAmount || 0) === 0 && !isBalancePayRow(r)) ? 1 : 0), 0);
    return { paid, paidInclTravel, balance, refunds, pending, count: currentMonthRows.length, net };
  }, [currentMonthRows]);

  const yearlyTotals = useMemo(() => {
    const paid = currentYearRows.reduce((s, r) => s + Number(r.paidAmount || 0), 0);
    const refunds = currentYearRows.reduce((s, r) => s + Number(r.refundAmount || 0), 0);
    const net = currentYearRows.reduce((s, r) => s + getDisplayPayment(r), 0);
    // Balance (year): sum of latest balance per client within the year
    const latestByClientY = {};
    const rowsY = currentYearRows.slice().sort((a, b) => (b.parsedDate ? b.parsedDate.getTime() : 0) - (a.parsedDate ? a.parsedDate.getTime() : 0));
    for (const row of rowsY) {
      const cid = (row.clientId || "Unknown").toString();
      if (latestByClientY[cid] === undefined) latestByClientY[cid] = Number(row.balance || 0);
    }
    const balance = Object.values(latestByClientY).reduce((s, n) => s + Number(n || 0), 0);
    const paidInclTravel = currentYearRows.reduce((s, r) => s + Number(r.totalForTotals || r.paidAmount || 0), 0);
    const pending = currentYearRows.reduce((s, r) => s + ((Number(r.paidAmount || 0) === 0 && Number(r.refundAmount || 0) === 0 && !isBalancePayRow(r)) ? 1 : 0), 0);
    return { paid, paidInclTravel, balance, refunds, pending, count: currentYearRows.length, net };
  }, [currentYearRows]);

  const sparklinePoints = useMemo(() => {
    if (!activeYear) return new Array(12).fill(0);
    const months = grouped.years?.[activeYear]?.months || {};
    const pts = new Array(12).fill(0);
    Object.keys(months).forEach((k) => {
      if (k === "Unknown") return;
      const idx = Number(k);
      if (idx >= 0 && idx < 12) {
        pts[idx] = months[k].rows.reduce((s, r) => s + Number(r.paidAmount || 0), 0);
      }
    });
    return pts;
  }, [activeYear, grouped]);

  const topClients = useMemo(() => clientSummaries.slice(0, 3), [clientSummaries]);

  const arrayToCSV = (rows) =>
    rows
      .map((r) =>
        r
          .map((c) => {
            if (c === null || c === undefined) return "";
            const s = String(c);
            if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
            return s;
          })
          .join(",")
      )
      .join("\n");

  const exportCSV = (scope = "month") => {
    const rows = [["#", "Department", "Client ID", "Client Name", "Method", "Date", "Receipt No", "Payment", "Balance"]];
    if (scope === "month") {
      currentMonthRows.forEach((r, i) =>
        rows.push([i + 1, r.department || "-", r.clientId || "-", r.clientName || "-", r.method || "-", r.date || "-", r.receipt || "-", getDisplayPayment(r), getDisplayBalance(r)])
      );
    } else if (scope === "year") {
      let idx = 0;
      currentYearRows.forEach((r) =>
        rows.push([++idx, r.department || "-", r.clientId || "-", r.clientName || "-", r.method || "-", r.date || "-", r.receipt || "-", getDisplayPayment(r), getDisplayBalance(r)])
      );
    } else {
      let idx = 0;
      filteredPayments.forEach((r) =>
        rows.push([++idx, r.department || "-", r.clientId || "-", r.clientName || "-", r.method || "-", r.date || "-", r.receipt || "-", getDisplayPayment(r), getDisplayBalance(r)])
      );
    }
    const csv = arrayToCSV(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `client-payments-${scope}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const printScope = (scope = "month") => {
    let html = `<html><head><title>Client Payments ${scope}</title>
<style>
  /* Overall cards – deep blue family */
  .overall-cards .summary-card, .overall-cards .header-gradient { color: #fff; }
  .overall-cards .grad-paid { background: linear-gradient(135deg, #0f2027, #2c5364); }
  .overall-cards .grad-balance { background: linear-gradient(135deg, #1e3c72, #2a5298); }
  .overall-cards .grad-refund { background: linear-gradient(135deg, #8e0e00, #1f1c18); }

  /* Monthly cards – teal/purple family */
  .month-cards .summary-card { color:#fff; }
  .month-cards .grad-paid { background: linear-gradient(135deg, #11998e, #38ef7d); }
  .month-cards .grad-balance { background: linear-gradient(135deg, #8E2DE2, #4A00E0); }
  .month-cards .grad-refund { background: linear-gradient(135deg, #fc466b, #3f5efb); }
  .month-cards .grad-pending { background: linear-gradient(135deg, #485563, #29323c); }

  /* Yearly cards – amber/indigo family */
  .year-cards .summary-card { color:#fff; }
  .year-cards .grad-paid { background: linear-gradient(135deg, #f7971e, #ffd200); color:#1a1a1a; }
  .year-cards .grad-balance { background: linear-gradient(135deg, #141E30, #243B55); }
  .year-cards .grad-refund { background: linear-gradient(135deg, #373B44, #4286f4); }
  .year-cards .grad-pending { background: linear-gradient(135deg, #00b09b, #96c93d); color:#1a1a1a; }

  .invest-table .text-danger { font-weight: 600; }
</style>
</head><body>`;
    html += `<h3>Client Payments - ${scope} (${activeDepartment})</h3><table><thead><tr><th>#</th><th>Department</th><th>Client ID</th><th>Client Name</th><th>Method</th><th>Date</th><th>Receipt</th><th>Payment</th><th>Balance</th></tr></thead><tbody>`;
    if (scope === "month") {
      currentMonthRows.forEach((r, i) => (html += `<tr><td>${i + 1}</td><td>${r.department || ""}</td><td>${r.clientId || ""}</td><td>${r.clientName || ""}</td><td>${r.method || ""}</td><td>${r.date || ""}</td><td>${r.receipt || ""}</td><td>${getDisplayPayment(r)}</td><td>${getDisplayBalance(r)}</td></tr>`));
    } else if (scope === "year") {
      currentYearRows.forEach((r, i) => (html += `<tr><td>${i + 1}</td><td>${r.department || ""}</td><td>${r.clientId || ""}</td><td>${r.clientName || ""}</td><td>${r.method || ""}</td><td>${r.date || ""}</td><td>${r.receipt || ""}</td><td>${getDisplayPayment(r)}</td><td>${getDisplayBalance(r)}</td></tr>`));
    } else {
      filteredPayments.forEach((r, i) => (html += `<tr><td>${i + 1}</td><td>${r.department || ""}</td><td>${r.clientId || ""}</td><td>${r.clientName || ""}</td><td>${r.method || ""}</td><td>${r.date || ""}</td><td>${r.receipt || ""}</td><td>${getDisplayPayment(r)}</td><td>${getDisplayBalance(r)}</td></tr>`));
    }
    html += `</tbody></table></body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.print();
  };

  const handleRowClick = (r) => {
    setSelectedPayment(r);
    setPaymentDetailModal(true);
  };

  const handleClientProfileClick = (r) => {
    if (openClientModal && typeof openClientModal === "function" && r.clientId) {
      openClientModal(r.clientId);
      return;
    }
    if (navigate) {
      navigate(`${rootPathForClientProfile}/${encodeURIComponent(r.clientId || "")}`);
      return;
    }
    window.location.href = `${rootPathForClientProfile}/${encodeURIComponent(r.clientId || "")}`;
  };

  // Function to get payment details for modal
  const getPaymentDetails = (payment) => {
    const details = [];

    details.push({ label: "Department", value: payment.department || "-" });
    details.push({ label: "Client ID", value: payment.clientId || "-" });
    details.push({ label: "Client Name", value: payment.clientName || "-" });
    details.push({ label: "Payment Method", value: payment.method || "-" });
    details.push({ label: "Date", value: payment.parsedDate ? payment.parsedDate.toLocaleDateString() : payment.date || "-" });
    details.push({ label: "Receipt No", value: payment.receipt || "-" });
    details.push({ label: "Paid Amount", value: formatINR(payment.paidAmount) });
    details.push({ label: "Travel Charges", value: formatINR(payment.travel) });
    details.push({ label: "Total Amount", value: formatINR(payment.totalForTotals) });
    details.push({ label: "Refund Amount", value: formatINR(payment.refundAmount) });
    details.push({ label: "Balance", value: formatINR(payment.balance) });
    details.push({ label: "Net Payment", value: formatINR(getDisplayPayment(payment)) });
    details.push({ label: "Payment Type", value: payment.isRefund ? "Refund" : "Payment" });

    // Additional client details from full client data
    const clientData = payment._fullClientData || {};
    if (clientData.phone) details.push({ label: "Client Phone", value: clientData.phone });
    if (clientData.service) details.push({ label: "Service", value: clientData.service });
    if (clientData.package) details.push({ label: "Package", value: clientData.package });
    if (clientData.address) details.push({ label: "Address", value: clientData.address });

    return details;
  };

  useEffect(() => {
    if (modalOpen) document.body.classList.add("modal-open");
    else document.body.classList.remove("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [modalOpen]);

  const hasRefundsThisMonth = useMemo(() => (currentMonthRows || []).some((r) => Number(r.refundAmount || 0) > 0), [currentMonthRows]);
  const yearlyRefundTotal = useMemo(() => (yearlyTotals.refunds || 0), [yearlyTotals]);

  /* ---------------------- Render ---------------------- */
  return (
    <>
      <div className="clinet-payment-card" onClick={() => setModalOpen(true)} role="button">
        <div className="invest-card__box" role="button">
          <div className="invest-card__head">
            <div>💳</div>
            <div className="invest-card__meta">
              <div className="invest-card__label">Client Payments</div>
              <div className="invest-card__total">{loading ? "Loading..." : formatINR(overallTotalsAllDepartments.netPaid ?? overallTotalsAllDepartments.paidIncludingTravel ?? overallTotalsAllDepartments.paid)}</div>
            </div>
          </div>
          <div className="invest-card__divider" />
          <div className="invest-card__small" style={{ paddingLeft: "20px" }}>{loading ? "" : `Payments: ${overallTotalsAllDepartments.count}`}</div>
        </div>
      </div>

      {modalOpen && (
        <div className="invest-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="invest-modal-dialog" ref={modalRef} onClick={(e) => e.stopPropagation()}>
            <div className="invest-modal-content">
              <div className="invest-modal-investor-bar">
                <div className="invest-modal-investor-bar__title">Client Payments Report</div>
                <button className="btn-close invest-modal-top-close btn-close-white" onClick={() => setModalOpen(false)} />
              </div>

              <div className="invest-modal-body">
                {/* Department Tabs */}
                <ul className="nav nav-tabs mb-3">
                  {departments.map((dept) => (
                    <li key={dept} className="nav-item">
                      <button
                        className={`nav-link ${activeDepartment === dept ? "active" : ""}`}
                        onClick={() => {
                          setActiveDepartment(dept);
                          setPage(1);
                          // Reset year/month selection when changing department
                          if (dept !== activeDepartment) {
                            setActiveYear(null);
                            setActiveMonth(null);
                          }
                        }}
                      >
                        {dept}
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="overall-cards">
                  <div className="header-gradient grad-paid">
                    <div className="header-label">Overall Paid (All Departments)</div>
                    <div className="header-value">{formatINR(overallTotalsAllDepartments.netPaid ?? overallTotalsAllDepartments.paidIncludingTravel ?? overallTotalsAllDepartments.paid)}</div>
                    <div className="header-sub">{overallTotalsAllDepartments.count ?? 0} payments</div>
                  </div>

                  <div className="header-gradient grad-balance">
                    <div className="header-label">{activeDepartment} Total</div>
                    <div className="header-value">{formatINR(overallTotalsCurrentDepartment.netPaid ?? overallTotalsCurrentDepartment.paidIncludingTravel ?? overallTotalsCurrentDepartment.paid)}</div>
                    <div className="header-sub">{overallTotalsCurrentDepartment.count ?? 0} payments</div>
                  </div>

                  <div className="header-gradient grad-refund">
                    <div className="header-label">Refunds (All Departments)</div>
                    <div className="header-value">{formatINR(overallTotalsAllDepartments.refunds)}</div>
                    <div className="header-sub">across all years</div>
                  </div>

                  <div className="header-gradient grad-info">
                    <div className="header-label">Balance ({activeDepartment})</div>
                    <div className="header-value">{renderAmount(overallTotalsCurrentDepartment.netBalance)}</div>
                    <div className="header-sub">net outstanding</div>
                  </div>
                </div>

                {/* Charts Section */}
                {activeYear && activeMonth && currentMonthRows.length > 0 && (
                  <div className="row g-3 mb-4">
                    <div className="col-lg-8">
                      <div className="glass-card p-3">
                        <h6 className="mb-2">Monthly Payment Trend - {activeYear} ({activeDepartment})</h6>
                        <BarChart data={monthlyChartData} width={520} height={200} color="url(#gradClient)" />
                      </div>
                    </div>
                    <div className="col-lg-4">
                      <div className="glass-card p-3">
                        <h6 className="mb-2">Payment Method Distribution</h6>
                        <div className="d-flex align-items-center justify-content-center">
                          <DonutChart
                            segments={paymentMethodDistribution}
                            size={150}
                            stroke={16}
                            title="Methods"
                          />
                        </div>
                        <div className="mt-2 tiny">
                          {paymentMethodDistribution.map((s) => (
                            <div key={s.key} className="d-flex align-items-center gap-2 mb-1">
                              <span className="legend-dot" style={{ background: s.color }}></span>
                              <span className="text-muted">{s.key}</span>
                              <span className="ms-auto fw-semibold">{formatINR(s.value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <ul className="nav nav-tabs invest-year-tabs">
                  {yearKeys.length === 0 ? (
                    <li className="nav-item">
                      <span className="nav-link active">No Data</span>
                    </li>
                  ) : (
                    yearKeys.map((y) => (
                      <li key={y} className="nav-item">
                        <button
                          className={`nav-link ${activeYear === y ? "active" : ""}`}
                          onClick={() => {
                            setActiveYear(y);
                            setActiveMonth(null);
                          }}
                        >
                          {y}
                        </button>
                      </li>
                    ))
                  )}
                </ul>

                <div className="month-cards">
                  <div className="summary-card grad-paid">
                    <div className="card-label">Paid (month - net)</div>
                    <div className="card-value">{renderAmount(monthlyTotals.net ?? monthlyTotals.paidInclTravel ?? monthlyTotals.paid)}</div>
                    <div className="card-sub">{monthlyTotals.count ?? 0} payments</div>
                  </div>

                  <div className="summary-card grad-refund">
                    <div className="card-label">Refunds (month)</div>
                    <div className="card-value">{formatINR(monthlyTotals.refunds)}</div>
                    <div className="card-sub">Year total: {formatINR(yearlyRefundTotal)}</div>
                  </div>

                  <div className="summary-card grad-balance">
                    <div className="card-label">Balance (month)</div>
                    <div className="card-value">{renderAmount(monthlyTotals.balance)}</div>
                    <div className="card-sub">{monthlyTotals.count ?? 0} records</div>
                  </div>

                  <div className="summary-card grad-pending">
                    <div className="card-label">Pending (month)</div>
                    <div className="card-value">{monthlyTotals.pending ?? 0}</div>
                    <div className="card-sub">items</div>
                  </div>
                </div>

                {activeYear && (
                  <div className="year-cards">
                    <div className="summary-card grad-paid">
                      <div className="card-label">Paid (year - net)</div>
                      <div className="card-value">{renderAmount(yearlyTotals.net ?? yearlyTotals.paidInclTravel ?? yearlyTotals.paid)}</div>
                      <div className="card-sub">{yearlyTotals.count ?? 0} payments</div>
                    </div>

                    <div className="summary-card grad-refund">
                      <div className="card-label">Refunds (year)</div>
                      <div className="card-value">{formatINR(yearlyTotals.refunds ?? 0)}</div>
                      <div className="card-sub">across {activeYear}</div>
                    </div>

                    <div className="summary-card grad-balance">
                      <div className="card-label">Balance (year)</div>
                      <div className="card-value">{formatINR(yearlyTotals.balance ?? 0)}</div>
                      <div className="card-sub">cumulative</div>
                    </div>

                    <div className="summary-card grad-pending">
                      <div className="card-label">Pending (year)</div>
                      <div className="card-value">{yearlyTotals.pending ?? 0}</div>
                      <div className="card-sub">items</div>
                    </div>
                  </div>
                )}

                {activeYear && (
                  <div className="invest-year-block">
                    <ul className="nav nav-pills invest-month-pills mb-2">
                      {Object.keys(grouped.years?.[activeYear]?.months || {}).map((mk) => (
                        <li key={mk} className="nav-item">
                          <button
                            className={`nav-link ${String(activeMonth) === String(mk) ? "active" : ""}`}
                            onClick={() => setActiveMonth(mk)}
                          >
                            {mk === "Unknown" ? "Unknown" : new Date(Number(activeYear), Number(mk), 1).toLocaleString("default", { month: "short" })}
                          </button>
                        </li>
                      ))}
                    </ul>

                    <div className="invest-month-toolbar">
                      <div className="small text-center">
                        {activeMonth !== null && activeMonth !== undefined ? (
                          <>
                            {new Date(Number(activeYear), Number(activeMonth), 1).toLocaleString("default", { month: "long" })} {activeYear} ({activeDepartment})
                          </>
                        ) : (
                          "Select a month"
                        )}
                      </div>

                      <div className="btn-group me-2">
                        <button className={`btn btn-sm ${viewMode === "month" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setViewMode("month")}>Months</button>
                        <button className={`btn btn-sm ${viewMode === "year" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setViewMode("year")}>Year</button>
                      </div>
                      <div className="btn-group">
                        <button className="btn btn-sm btn-outline-primary" onClick={() => exportCSV("month")} disabled={activeMonth === null || activeMonth === undefined}>
                          Export Month CSV
                        </button>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => printScope("month")} disabled={activeMonth === null || activeMonth === undefined}>
                          Print Month
                        </button>
                        <button className="btn btn-sm btn-outline-success" onClick={() => exportCSV("year")} disabled={!activeYear}>
                          Export Year CSV
                        </button>
                        <button className="btn btn-sm btn-outline-dark" onClick={() => printScope("year")} disabled={!activeYear}>
                          Print Year
                        </button>
                        <button className="btn btn-sm btn-outline-info" onClick={() => exportCSV("all")}>
                          Export All CSV
                        </button>
                      </div>
                    </div>

                    {viewMode === "month" && (
                      <div className="table-responsive">
                        <table className="table table-sm table-hover invest-table">
                          <thead>
                            <tr>
                              <th className="th-narrow">#</th>
                              <th>Department</th>
                              <th>Client ID</th>
                              <th>Client Name</th>
                              <th>Method</th>
                              <th>Date</th>
                              <th>Receipt No</th>
                              <th className="text-end">Payment</th>
                              <th className="text-end">Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(!activeMonth || paginatedRows.length === 0) && (
                              <tr>
                                <td colSpan={9} className="text-center small text-muted">
                                  No payments for selected month/year
                                </td>
                              </tr>
                            )}
                            {paginatedRows.map((r, i) => (
                              <tr key={`${r._clientDbKey}_${i}`} className="invest-table-row clickable-row" onClick={() => handleRowClick(r)}>
                                <td>{pageStart + i + 1}</td>
                                <td>{r.department || "-"}</td>
                                <td>
                                  <div className="d-flex align-items-center gap-2">
                                    {r.clientId || "-"}
                                    <button
                                      className="btn btn-sm btn-outline-primary py-0 px-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleClientProfileClick(r);
                                      }}
                                      title="View Client Profile"
                                    >
                                      👤
                                    </button>
                                  </div>
                                </td>
                                <td>{r.clientName || "-"}</td>
                                <td>{r.method || "-"}</td>
                                <td>{r.parsedDate ? r.parsedDate.toLocaleDateString() : r.date || "-"}</td>
                                <td>{r.receipt || "-"}</td>
                                {/* show row payment as totalForTotals - refundAmount so each row reflects net effect */}
                                <td className="text-end">{renderAmount(getDisplayPayment(r))}</td>
                                <td className="text-end">{renderAmount(getDisplayBalance(r))}{(r?.raw?.__type === "balance" && Number(r?.balance || 0) <= 0) && (<div className="small-text">{r.parsedDate ? r.parsedDate.toLocaleDateString() : (r.date || "")} · cleared {formatINR(Number(r.paidAmount || 0))}</div>)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="table-secondary">
                              <td colSpan={7} className="text-end">
                                <strong>Monthly Subtotal (net)</strong>
                              </td>
                              <td className="text-end">
                                <strong>{renderAmount(monthlyTotals.net ?? monthlyTotals.paidInclTravel ?? monthlyTotals.paid)}</strong>
                              </td>
                              <td className="text-end">
                                <strong>{renderAmount(monthlyTotals.balance)}</strong>
                              </td>
                            </tr>
                            <tr className="table-secondary">
                              <td colSpan={7} className="text-end">
                                <strong>Yearly Grand Total (net)</strong>
                              </td>
                              <td className="text-end">
                                <strong>{renderAmount(yearlyTotals.net ?? yearlyTotals.paidInclTravel ?? yearlyTotals.paid)}</strong>
                              </td>
                              <td className="text-end">
                                <strong>{renderAmount(yearlyTotals.balance)}</strong>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}

                    {/* Pagination Navigation */}
                    {totalPages > 1 && (
                      <nav className="d-flex justify-content-between align-items-center mt-3 w-100" style={{ borderRadius: "10px", padding: "10px 20px", marginBottom: "15px", backgroundColor: "#63707c" }}>
                        <div className="small text-white ">
                          Page {pageSafe} of {totalPages}
                        </div>
                        <ul className="pagination pagination-sm mb-0">
                          <li className={`page-item ${pageSafe <= 1 ? "disabled" : ""}`}>
                            <button className="page-link" onClick={() => pageSafe > 1 && setPage(pageSafe - 1)}>Previous</button>
                          </li>
                          {[...Array(totalPages)].map((_, idx) => {
                            const num = idx + 1;
                            const show =
                              num === 1 ||
                              num === totalPages ||
                              (num >= pageSafe - 2 && num <= pageSafe + 2);
                            if (!show) return null;
                            return (
                              <li key={num} className={`page-item ${num === pageSafe ? "active" : ""}`}>
                                <button className="page-link" onClick={() => setPage(num)}>{num}</button>
                              </li>
                            );
                          })}
                          <li className={`page-item ${pageSafe >= totalPages ? "disabled" : ""}`}>
                            <button className="page-link" onClick={() => pageSafe < totalPages && setPage(pageSafe + 1)}>Next</button>
                          </li>
                        </ul>

                        {/* Pagination Controls */}
                        <div className="d-flex justify-content-between align-items-center">
                          <div className="d-flex align-items-center gap-2">
                            <span className="small text-muted">Show</span>
                            <select
                              className="form-select form-select-sm"
                              style={{ width: 'auto' }}
                              value={pageSize}
                              onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setPage(1);
                              }}
                            >
                              <option value={10}>10</option>
                              <option value={25}>25</option>
                              <option value={50}>50</option>
                              <option value={100}>100</option>
                            </select>
                          </div>
                        </div>
                      </nav>
                    )}

                    {hasRefundsThisMonth && (
                      <div className="mt-4">
                        <h6>Refunds (selected month)</h6>
                        <div className="table-responsive">
                          <table className="table table-sm table-hover invest-table">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Department</th>
                                <th>Client ID</th>
                                <th>Client Name</th>
                                <th>Date</th>
                                <th className="text-end">Refund</th>
                                <th>Method</th>
                                <th>Receipt</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentMonthRows
                                .filter((r) => Number(r.refundAmount || 0) > 0)
                                .map((r, i) => (
                                  <tr key={`refund-${i}`}>
                                    <td>{i + 1}</td>
                                    <td>{r.department || "-"}</td>
                                    <td>{r.clientId || "-"}</td>
                                    <td>{r.clientName || "-"}</td>
                                    <td>{r.parsedDate ? r.parsedDate.toLocaleDateString() : r.date || "-"}</td>
                                    <td className="text-end">{formatINR(r.refundAmount)}</td>
                                    <td>{r.method || "-"}</td>
                                    <td>{r.receipt || "-"}</td>
                                  </tr>
                                ))}
                            </tbody>
                            <tfoot>
                              <tr>
                                <th colSpan={5} className="text-end">
                                  Monthly Refund Total
                                </th>
                                <th className="text-end">
                                  {formatINR((currentMonthRows || []).reduce((s, r) => s + Number(r.refundAmount || 0), 0))}
                                </th>
                                <th colSpan={2}></th>
                              </tr>
                              <tr>
                                <th colSpan={5} className="text-end">
                                  Yearly Refund Total
                                </th>
                                <th className="text-end">{formatINR(yearlyRefundTotal)}</th>
                                <th colSpan={2}></th>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}

                    {viewMode === "year" && (
                      <div className="table-responsive">
                        <table className="table table-sm table-hover invest-table">
                          <thead>
                            <tr>
                              <th className="th-narrow">#</th>
                              <th>Department</th>
                              <th>Client ID</th>
                              <th>Client Name</th>
                              <th>Method</th>
                              <th>Date</th>
                              <th>Receipt No</th>
                              <th className="text-end">Payment</th>
                              <th className="text-end">Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(paginatedRows.length === 0) && (
                              <tr>
                                <td colSpan={9} className="text-center small text-muted">
                                  No payments for selected year
                                </td>
                              </tr>
                            )}
                            {paginatedRows
                              .map((r, i) => (
                                <tr key={`${r._clientDbKey}_yr_${i}`} className="invest-table-row clickable-row" onClick={() => handleRowClick(r)}>
                                  <td>{pageStart + i + 1}</td>
                                  <td>{r.department || "-"}</td>
                                  <td>
                                    <div className="d-flex align-items-center gap-2">
                                      {r.clientId || "-"}
                                      <button
                                        className="btn btn-sm btn-outline-info py-0 px-1"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleClientProfileClick(r);
                                        }}
                                        title="View Client Profile"
                                      >
                                        👤
                                      </button>
                                    </div>
                                  </td>
                                  <td>{r.clientName || "-"}</td>
                                  <td>{r.method || "-"}</td>
                                  <td>{r.parsedDate ? r.parsedDate.toLocaleDateString() : r.date || "-"}</td>
                                  <td>{r.receipt || "-"}</td>
                                  <td className="text-end">{renderAmount(getDisplayPayment(r))}</td>
                                  <td className="text-end">{renderAmount(getDisplayBalance(r))}{(r?.raw?.__type === "balance" && Number(r?.balance || 0) <= 0) && (<div className="small text-muted">{r.parsedDate ? r.parsedDate.toLocaleDateString() : (r.date || "")} · cleared {formatINR(Number(r.paidAmount || 0))}</div>)}</td>
                                </tr>
                              ))}
                          </tbody>
                          <tfoot>
                            <tr className="table-secondary">
                              <td colSpan={7} className="text-end">
                                <strong>Yearly Subtotal (net)</strong>
                              </td>
                              <td className="text-end">
                                <strong>{renderAmount(yearlyTotals.net ?? yearlyTotals.paidInclTravel ?? yearlyTotals.paid)}</strong>
                              </td>
                              <td className="text-end">
                                <strong>{renderAmount(yearlyTotals.balance)}</strong>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}

                    <div className="mt-3 d-flex justify-content-between align-items-center gap-3">
                      <div className="small ">Showing {paginatedRows.length} of {totalEntries} payments</div>
                      <div>
                        <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => exportCSV("month")} disabled={activeMonth === null || activeMonth === undefined}>
                          CSV (month)
                        </button>
                        <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => exportCSV("year")} disabled={!activeYear}>
                          CSV (year)
                        </button>
                        <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => exportCSV("all")}>
                          CSV (all)
                        </button>
                        <button className="btn btn-sm btn-primary" onClick={() => printScope("month")} disabled={activeMonth === null || activeMonth === undefined}>
                          Print
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="invest-modal-footer">
                <div className="me-auto small text-muted">
                  <strong>All Departments Total:</strong> {formatINR(overallTotalsAllDepartments.netPaid ?? overallTotalsAllDepartments.paidIncludingTravel ?? overallTotalsAllDepartments.paid)} | 
                  <strong> {activeDepartment} Total:</strong> {formatINR(overallTotalsCurrentDepartment.netPaid ?? overallTotalsCurrentDepartment.paidIncludingTravel ?? overallTotalsCurrentDepartment.paid)}
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setModalOpen(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Detail Modal */}
      {paymentDetailModal && selectedPayment && (
        <div className="modal fade show" style={{ display: "block", background: "rgba(2,6,23,0.6)", zIndex: 3000 }} onClick={() => setPaymentDetailModal(false)}>
          <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()} style={{ zIndex: 3001 }}>
            <div className="modal-content bg-white">
              <div className="modal-header bg-primary text-white">
                <h6 className="modal-title mb-0">Payment Details</h6>
                <button className="btn-close btn-close-white" onClick={() => setPaymentDetailModal(false)} />
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  {/* Payment Type Badge */}
                  <div className="col-12 mb-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className={`badge ${selectedPayment.isRefund ? "bg-danger" : "bg-success"} text-uppercase fs-6`}>
                        {selectedPayment.isRefund ? "Refund" : "Payment"}
                      </span>
                      <div className={`fw-bold fs-5 ${selectedPayment.isRefund ? "text-danger" : "text-success"}`}>
                        {formatINR(getDisplayPayment(selectedPayment))}
                      </div>
                    </div>
                  </div>

                  {/* Payment Details */}
                  {getPaymentDetails(selectedPayment).map((detail, idx) => (
                    <div key={idx} className="col-md-6">
                      <div className="p-3 rounded-3 border">
                        <div className="small mb-1">{detail.label}</div>
                        <div className="fw-semibold text-dark">{detail.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setPaymentDetailModal(false)}>Close</button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setPaymentDetailModal(false);
                    handleClientProfileClick(selectedPayment);
                  }}
                >
                  View Client Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

ClientPaymentCard.propTypes = {
  clientCollections: PropTypes.shape({ active: PropTypes.string, exit: PropTypes.string }),
  openClientModal: PropTypes.func,
  rootPathForClientProfile: PropTypes.string,
};