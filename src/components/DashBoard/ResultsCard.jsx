// src/components/DashBoard/ResultsCard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/* ---------------------- Helpers ---------------------- */
async function importFirebaseDB() {
  try {
    const a = await import("../../firebase");
    if (a && a.default) return a.default;
    if (a && a.firebaseDB) return a.firebaseDB;
  } catch { }
  try {
    const b = await import("../../firebase");
    if (b && b.default) return b.default;
    if (b && b.firebaseDB) return b.firebaseDB;
  } catch { }
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
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
  } catch {
    return "\u20B9" + n.toLocaleString("en-IN");
  }
}

function parseDateRobust(v) {
  if (!v && v !== 0) return null;
  try {
    if (v instanceof Date && !isNaN(v)) return v;
  } catch { }
  const s = String(v || "").trim();
  if (!s) return null;
  if (/^\d{10,13}$/.test(s)) {
    const n = Number(s);
    return new Date(n < 1e12 ? n * 1000 : n);
  }
  const d = new Date(s);
  if (!isNaN(d)) return d;
  const m = s.match(/^(\d{1,2})[\/\-\s](\d{1,2})[\/\-\s](\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  const mm = s.match(/([A-Za-z]+)[,]?\s*(\d{4})/);
  if (mm) {
    const idx = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(mm[1].slice(0, 3).toLowerCase());
    if (idx >= 0) return new Date(Number(mm[2]), idx, 1);
  }
  return null;
}

function monthKey(d) { const dt = d instanceof Date ? d : parseDateRobust(d); if (!dt) return 'Unknown'; return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`; }

// Helper function to convert payments to array (same as in AgentModal)
function convertPaymentsToArray(payments) {
  if (!payments) return [];
  if (Array.isArray(payments)) return payments;
  
  return Object.entries(payments).map(([key, value]) => ({
    id: key,
    ...value
  }));
}

/* ---------------------- Normalizers ---------------------- */
function extractClientPayments(clientRecord = {}) {
  const paymentsArr = Array.isArray(clientRecord.payments)
    ? clientRecord.payments
    : (clientRecord.payments && typeof clientRecord.payments === "object" ? Object.values(clientRecord.payments) : []);

  const out = [];

  (paymentsArr || []).forEach((p) => {
    if (!p) return;
    const paidAmount = safeNumber(p.paidAmount ?? p.amount ?? p.payment ?? 0);
    const refundAmount = safeNumber(p.refundAmount ?? 0);
    const balanceAdj = p.__type === "balance";
    const isRefund = !!p.refund || refundAmount > 0 || (paidAmount < 0);
    const date = p.date ?? p.paymentDate ?? p.createdAt ?? "";
    const parsedDate = parseDateRobust(date);

    // Treat balance adjustments as positive payments
    const income = balanceAdj ? safeNumber(p.paidAmount ?? 0) : paidAmount;
    const net = income - (isRefund ? refundAmount : 0);

    out.push({
      type: "client",
      date,
      parsedDate,
      payment: net, // net income
      raw: p,
      clientData: clientRecord, // Include full client data
    });
  });

  // paymentLogs may include refund entries
  const logsNode = clientRecord.paymentLogs ?? clientRecord.paymentLog ?? null;
  const logsArr = Array.isArray(logsNode) ? logsNode : (logsNode && typeof logsNode === "object" ? Object.values(logsNode) : []);
  (logsArr || []).forEach((lg) => {
    const refundAmount = safeNumber(lg.refundAmount ?? lg.amount ?? 0);
    if (!refundAmount) return;
    const date = lg.date ?? lg.dateLabel ?? lg.createdAt ?? "";
    out.push({
      type: "client",
      date,
      parsedDate: parseDateRobust(date),
      payment: -refundAmount, // as negative income
      raw: lg,
      clientData: clientRecord, // Include full client data
    });
  });

  return out;
}

function extractInvestments(raw = {}) {
  const arr = Array.isArray(raw) ? raw : (raw && typeof raw === "object" ? Object.values(raw) : []);
  return (arr || []).map((it) => {
    const date = it.invest_date ?? it.date ?? it.createdAt ?? "";
    const amount = safeNumber(it.invest_amount ?? it.amount ?? it.price ?? it.total ?? 0);
    return { type: "investment", date, parsedDate: parseDateRobust(date), amount, raw: it };
  });
}

function extractPettyCash(raw = {}) {
  const rows = [];
  const isPlain = (x) => x && typeof x === "object" && !Array.isArray(x);

  const hasAmount = (obj) => {
    if (!isPlain(obj)) return false;
    const keys = ["total", "amount", "pettyAmount", "value", "price"];
    return keys.some((k) => obj[k] !== undefined && obj[k] !== null && safeNumber(obj[k]) !== 0);
  };

  const hasChildAmount = (obj) => {
    if (!isPlain(obj)) return false;
    for (const v of Object.values(obj)) {
      if (isPlain(v)) {
        if (hasAmount(v) || hasChildAmount(v)) return true;
      } else if (Array.isArray(v)) {
        for (const it of v) {
          if (isPlain(it) && (hasAmount(it) || hasChildAmount(it))) return true;
        }
      }
    }
    return false;
  };

  const pushLeaf = (obj) => {
    const date = obj.date ?? obj.pettyDate ?? obj.paymentDate ?? obj.createdAt ?? "";
    const amount = safeNumber(obj.total ?? obj.amount ?? obj.pettyAmount ?? obj.value ?? obj.price ?? 0);
    const category = obj.mainCategory ?? obj.category ?? obj.head ?? obj.type ?? "Petty";
    // Only include approved petty cash
    const approvalText = String(obj.approval || obj.approvalStatus || obj.status || "").toLowerCase();
    const approved = (obj.approved === true)
      || (obj.isApproved === true)
      || (approvalText === "approved" || approvalText === "true" || approvalText === "yes")
      || (!!obj.approvedBy);
    if (amount && approved) rows.push({ type: "petty", date, parsedDate: parseDateRobust(date), amount, category, raw: obj });
  };

  const walk = (obj) => {
    if (!isPlain(obj)) return;
    // Only count leaf nodes with amounts to avoid parent+child double
    if (hasAmount(obj) && !hasChildAmount(obj)) pushLeaf(obj);
    // Recurse
    Object.values(obj).forEach((v) => {
      if (Array.isArray(v)) v.forEach((it) => walk(it));
      else if (isPlain(v)) walk(v);
    });
  };

  walk(raw);
  return rows;
}

function extractStaffSalaries(staffNode = {}) {
  const out = [];
  const isPlain = (x) => x && typeof x === "object" && !Array.isArray(x);
  const employees = isPlain(staffNode) && !Array.isArray(staffNode)
    ? Object.values(staffNode)
    : (Array.isArray(staffNode) ? staffNode : []);

  const visitEmp = (emp) => {
    if (!isPlain(emp)) return;
    const pays = Array.isArray(emp.payments) ? emp.payments : (isPlain(emp.payments) ? Object.values(emp.payments) : []);
    if (pays && pays.length) {
      pays.forEach((p) => {
        if (!p) return;
        const date = p.date ?? p.paymentDate ?? p.paidOn ?? emp.createdAt ?? "";
        const amount = safeNumber(p.amount ?? p.salary ?? p.paidAmount ?? 0);
        if (amount) out.push({ type: "staff", date, parsedDate: parseDateRobust(date), amount, raw: p, staffData: emp });
      });
    }
  };

  if (employees.length) employees.forEach(visitEmp);
  else visitEmp(staffNode);

  return out;
}

function extractWorkerSalaries(node = {}) {
  const out = [];
  const isPlain = (x) => x && typeof x === "object" && !Array.isArray(x);
  const employees = isPlain(node) && !Array.isArray(node)
    ? Object.values(node)
    : (Array.isArray(node) ? node : []);

  const visitEmp = (emp) => {
    if (!isPlain(emp)) return;
    const pays = Array.isArray(emp.payments) ? emp.payments : (isPlain(emp.payments) ? Object.values(emp.payments) : []);
    if (pays && pays.length) {
      pays.forEach((p, idx) => {
        if (!p) return;
        const date = p.date ?? p.paymentDate ?? p.paidOn ?? emp.createdAt ?? "";
        const amount = safeNumber(p.amount ?? p.salary ?? p.paidAmount ?? 0);
        // Map workDetails by the same index to get clientName and more
        const workList = Array.isArray(emp.workDetails) ? emp.workDetails : (emp.workDetails && typeof emp.workDetails === "object" ? Object.values(emp.workDetails) : []);
        const work = (workList && workList.length > idx) ? workList[idx] : null;
        const workClient = work?.clientName || work?.client || work?.name || p?.clientName || "";
        const workService = work?.service || work?.serviceName || work?.work || p?.service || "";
        if (amount) out.push({ type: "worker", date, parsedDate: parseDateRobust(date), amount, raw: p, workerData: emp, payIndex: idx, workDetail: work, clientName: workClient, serviceName: workService });
      });
    }
  };

  if (employees.length) employees.forEach(visitEmp);
  else visitEmp(node);

  return out;
}

// Extract Agent Commission from HospitalData
function extractAgentCommission(hospitalNode = {}) {
  const out = [];
  const isPlain = (x) => x && typeof x === "object" && !Array.isArray(x);

  if (!isPlain(hospitalNode)) return out;

  Object.values(hospitalNode).forEach((hospital) => {
    if (!isPlain(hospital)) return;

    const payments = Array.isArray(hospital.payments)
      ? hospital.payments
      : (isPlain(hospital.payments) ? Object.values(hospital.payments) : []);

    payments.forEach((p) => {
      if (!p) return;
      const commissionAmount = safeNumber(p.commition ?? p.commission ?? p.agentCommission ?? 0);
      if (commissionAmount > 0) {
        const date = p.date ?? p.paymentDate ?? p.createdAt ?? "";
        out.push({
          type: "commission",
          date,
          parsedDate: parseDateRobust(date),
          amount: commissionAmount,
          raw: p,
          hospitalData: hospital, // Include full hospital data
          agentData: hospital.agent || hospital.agents || {} // Include agent data
        });
      }
    });
  });

  return out;
}

// Extract Hospital Service Charges from HospitalData
function extractHospitalServiceCharges(hospitalNode = {}) {
  const out = [];
  const isPlain = (x) => x && typeof x === "object" && !Array.isArray(x);

  if (!isPlain(hospitalNode)) return out;

  Object.values(hospitalNode).forEach((hospital) => {
    if (!isPlain(hospital)) return;

    const payments = Array.isArray(hospital.payments)
      ? hospital.payments
      : (isPlain(hospital.payments) ? Object.values(hospital.payments) : []);

    payments.forEach((p) => {
      if (!p) return;
      const serviceCharges = safeNumber(p.serviceCharges ?? p.hospitalCharges ?? p.serviceFee ?? 0);
      if (serviceCharges > 0) {
        const date = p.date ?? p.paymentDate ?? p.createdAt ?? "";
        out.push({
          type: "hospital",
          date,
          parsedDate: parseDateRobust(date),
          amount: serviceCharges,
          raw: p,
          hospitalData: hospital // Include full hospital data
        });
      }
    });
  });

  return out;
}

// Extract Agent Payouts from AgentData
function extractAgentPayouts(agentNode = {}) {
  const out = [];
  const isPlain = (x) => x && typeof x === "object" && !Array.isArray(x);

  if (!isPlain(agentNode)) return out;

  Object.values(agentNode).forEach((agent) => {
    if (!isPlain(agent)) return;
    
    const payments = convertPaymentsToArray(agent.payments);
    
    if (payments && payments.length) {
      payments.forEach((p) => {
        if (!p) return;
        const amount = safeNumber(p.amount ?? p.paymentAmount ?? p.paidAmount ?? p.total ?? 0);
        const date = p.date ?? p.paymentDate ?? p.paidOn ?? agent.createdAt ?? "";
        const agentName = agent.agentName ?? agent.name ?? "Agent";
        
        // Only include payments with positive amounts (exclude charges)
        if (amount > 0) {
          out.push({
            type: "agent",
            date,
            parsedDate: parseDateRobust(date),
            amount: amount,
            raw: p,
            agentData: agent,
            agentName: agentName,
            source: "AgentData"
          });
        }
      });
    }
  });

  return out;
}


/* ---------------------- SVG Charts (No external deps) ---------------------- */
function BarChart({ data = [], width = 520, height = 150, pad = 30, color = "url(#gradProfit)" }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const barW = (width - pad * 2) / (data.length || 1);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="gradProfit" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="gradCommission" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id="gradHospital" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#0e7490" />
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
            {/* vertical value label inside bar */}
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

function DonutChart({ segments = [], size = 150, stroke = 18, title = "Expenses" }) {
  const total = Math.max(1, segments.reduce((s, x) => s + (x.value || 0), 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id="gradInv" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#be123c" />
        </linearGradient>
        <linearGradient id="gradStaff" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="gradWorker" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="gradPetty" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
        <linearGradient id="gradCommission" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id="gradHospital" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#0e7490" />
        </linearGradient>
        <linearGradient id="gradAgent" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#be185d" />
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

/* ---------------------- Component ---------------------- */
export default function ResultsCard({
  title = "Results",
  clientCollections = { active: "ClientData", exit: "ExitClients" },
  pettyCollection = "PettyCash",
  investmentsCollection = "Investments",
  staffCollections = { active: "StaffBioData", exit: "ExitStaffs" },
  workerCollections = { active: "EmployeeBioData", exit: "ExitEmployees" },
  hospitalCollection = "HospitalData",
}) {
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [allRows, setAllRows] = useState([]);
  const [activeYear, setActiveYear] = useState(null);
  const [activeMonth, setActiveMonth] = useState(null);
  const [chartType, setChartType] = useState("month"); // "month" or "year"
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const modalRef = useRef(null);

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
          const cb = (snap) => {
            snapshots[key] = snap.val() || {};
            rebuild();
          };
          ref.on("value", cb);
          listeners.push({ ref, cb });
        } catch (e) {
          console.error("ResultsCard attach error:", path, e);
        }
      };

      attach(clientCollections.active, "clientsActive");
      attach(clientCollections.exit, "clientsExit");
      attach(investmentsCollection, "investments");
      attach(pettyCollection, "petty")
      attach(`${pettyCollection}/Admin`, "pettyAdmin")
      attach(`${pettyCollection}/admin`, "pettyAdminLower");
      attach(staffCollections.active, "staffActive");
      attach(staffCollections.exit, "staffExit");
      attach(workerCollections.active, "workerActive");
      attach(workerCollections.exit, "workerExit");
      attach(hospitalCollection, "hospitalData");
      attach("AgentData/WorkerAgent", "agentWorker");
      attach("AgentData/ClientAgent", "agentClient");

      const rebuild = () => {
        const rows = [];
     
        const pushClients = (node) => {
          Object.keys(node || {}).forEach((k) => {
            const rec = node[k] || {};
            extractClientPayments(rec).forEach((r) => rows.push(r));
          });
        };
        pushClients(snapshots.clientsActive || {});
        pushClients(snapshots.clientsExit || {});
      
        extractInvestments(snapshots.investments || {}).forEach((r) => rows.push(r));
      
        // Collect petty from root/Admin/admin then de-duplicate by (id?) else amount+category+month
        {
          const pettyCollected = [];
          extractPettyCash(snapshots.petty || {}).forEach((r) => pettyCollected.push(r));
          extractPettyCash(snapshots.pettyAdmin || {}).forEach((r) => pettyCollected.push(r));
          extractPettyCash(snapshots.pettyAdminLower || {}).forEach((r) => pettyCollected.push(r));
          
          // Add agent payouts ONLY (no charges)
          extractAgentPayouts(snapshots.agentWorker || {}).forEach((r) => rows.push(r));
          extractAgentPayouts(snapshots.agentClient || {}).forEach((r) => rows.push(r));
          // REMOVED: extractAgentCharges calls
          
          const seen = new Set();
          pettyCollected.forEach((r) => {
            const raw = r.raw || {};
            const id = raw.id ?? raw.ID ?? raw.key ?? raw.uid ?? raw.billNo ?? raw.invoiceNo ?? raw.refNo ?? "";
            const cat = String((r.category || raw.mainCategory || raw.category || raw.head || "Petty")).toLowerCase();
            const mon = monthKey(r.parsedDate || r.date);
            const sig = id ? `id:${id}` : `amt:${Number(r.amount || 0)}|cat:${cat}|mon:${mon}`;
            if (seen.has(sig)) return;
            seen.add(sig);
            rows.push(r);
          });
        }
      
        const pushStaff = (node) => { extractStaffSalaries(node || {}).forEach((r) => rows.push(r)); };
        pushStaff(snapshots.staffActive || {});
        pushStaff(snapshots.staffExit || {});
      
        const pushWorkers = (node) => { extractWorkerSalaries(node || {}).forEach((r) => rows.push(r)); };
        pushWorkers(snapshots.workerActive || {});
        pushWorkers(snapshots.workerExit || {});
      
        // Extract Agent Commission and Hospital Service Charges
        extractAgentCommission(snapshots.hospitalData || {}).forEach((r) => rows.push(r));
        extractHospitalServiceCharges(snapshots.hospitalData || {}).forEach((r) => rows.push(r));
      
        rows.forEach((r) => { if (!r.parsedDate && r.date) r.parsedDate = parseDateRobust(r.date); });
        rows.sort((a, b) => (b.parsedDate?.getTime() || 0) - (a.parsedDate?.getTime() || 0));
      
        if (!mounted) return;
        setAllRows(rows);
        setLoading(false);
      };
    })();

    return () => {
      mounted = false;
      try { listeners.forEach(({ ref, cb }) => ref.off("value", cb)); } catch { }
    };
  }, [clientCollections.active, clientCollections.exit, investmentsCollection, pettyCollection, staffCollections.active, staffCollections.exit, workerCollections.active, workerCollections.exit, hospitalCollection]);

  /* ------------- Grouping ------------- */
  const yearMap = useMemo(() => {
    const out = {};
    (allRows || []).forEach((r) => {
      const d = r.parsedDate || parseDateRobust(r.date);
      const y = d ? d.getFullYear() : "Unknown";
      const m = d ? d.getMonth() : "Unknown";
      if (!out[y]) out[y] = { months: {}, rows: [] };
      if (!out[y].months[m]) out[y].months[m] = [];
      out[y].months[m].push(r);
      out[y].rows.push(r);
    });
    return out;
  }, [allRows]);

  const yearKeys = useMemo(() => Object.keys(yearMap).sort((a, b) => {
    if (a === "Unknown") return 1;
    if (b === "Unknown") return -1;
    return Number(b) - Number(a);
  }), [yearMap]);

  useEffect(() => {
    if (!modalOpen) return;
    if (!yearKeys.length) { setActiveYear(null); setActiveMonth(null); return; }
    const y = yearKeys[0];
    setActiveYear((prev) => prev ?? y);
    const months = Object.keys(yearMap[y].months || {});
    const pick = months.slice().reverse().find(k => k !== "Unknown") || months[0] || null;
    setActiveMonth((prev) => prev ?? (pick === undefined ? null : pick));
  }, [modalOpen, yearKeys.join("|")]);

  /* ------------- Calculations ------------- */
  function splitSums(rows) {
    const s = { 
      income: 0, 
      investment: 0, 
      petty: 0, 
      staff: 0, 
      worker: 0, 
      commission: 0, 
      hospital: 0,
      agent: 0,
      agentcharges: 0
    };
    (rows || []).forEach((r) => {
      if (r.type === "client") s.income += Number(r.payment || 0);
      else if (r.type === "investment") s.investment += Number(r.amount || 0);
      else if (r.type === "petty") s.petty += Number(r.amount || 0);
      else if (r.type === "staff") s.staff += Number(r.amount || 0);
      else if (r.type === "worker") s.worker += Number(r.amount || 0);
      else if (r.type === "commission") s.commission += Number(r.amount || 0);
      else if (r.type === "hospital") s.hospital += Number(r.amount || 0);
      else if (r.type === "agent") s.agent += Number(r.amount || 0);
      else if (r.type === "agentcharges") s.agentcharges += Number(r.amount || 0);
    });
    // Profit calculation: Client Amount - (Investment + Worker Salary + Staff Salary + Petty Cash + Agent Commission + Agent Payouts)
    s.expense = s.investment + s.petty + s.staff + s.worker + s.commission + s.agent;
    s.profit = s.income - s.expense;
    return s;
  }

  const overall = useMemo(() => splitSums(allRows), [allRows]);
  const currentYearTotals = useMemo(() => activeYear ? splitSums(yearMap[activeYear]?.rows || []) : splitSums([]), [activeYear, yearMap]);
  const currentMonthTotals = useMemo(() => {
    if (!activeYear || activeMonth === null || activeMonth === undefined) return splitSums([]);
    return splitSums((yearMap[activeYear]?.months?.[activeMonth] || []));
  }, [activeYear, activeMonth, yearMap]);

  /* ------------- UI Helpers ------------- */
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const activeMonthLabel = React.useMemo(() => {
    return String(activeMonth) === "ALL" ? "All" : (monthLabels[Number(activeMonth)] || "-");
  }, [activeMonth]);

  const chartDataYear = useMemo(() => {
    if (!activeYear) return [];
    const months = yearMap[activeYear]?.months || {};
    const arr = [];
    for (let i = 0; i < 12; i++) {
      const rows = months[i] || [];
      const s = splitSums(rows);
      arr.push({ label: monthLabels[i], short: monthLabels[i], value: Math.max(0, s.profit) });
    }
    return arr;
  }, [activeYear, yearMap]);

  // Yearly expense data for pie chart
  const yearlyExpenseSegments = useMemo(() => {
    const s = currentYearTotals;
    return [
      { key: "Investments", value: s.investment, color: "url(#gradInv)" },
      { key: "Staff", value: s.staff, color: "url(#gradStaff)" },
      { key: "Workers", value: s.worker, color: "url(#gradWorker)" },
      { key: "Petty", value: s.petty, color: "url(#gradPetty)" },
      { key: "Commission", value: s.commission, color: "url(#gradCommission)" },
      { key: "Agent Payouts", value: s.agent, color: "url(#gradAgent)" },
    ];
  }, [currentYearTotals]);

  // Monthly expense data for pie chart
  const monthlyExpenseSegments = useMemo(() => {
    const s = currentMonthTotals;
    return [
      { key: "Investments", value: s.investment, color: "url(#gradInv)" },
      { key: "Staff", value: s.staff, color: "url(#gradStaff)" },
      { key: "Workers", value: s.worker, color: "url(#gradWorker)" },
      { key: "Petty", value: s.petty, color: "url(#gradPetty)" },
      { key: "Commission", value: s.commission, color: "url(#gradCommission)" },
      { key: "Agent Payouts", value: s.agent, color: "url(#gradAgent)" },
    ];
  }, [currentMonthTotals]);

  // Rows for current view: specific month or ALL months
  const scopedRows = useMemo(() => {
    if (!activeYear) return [];
    if (String(activeMonth) === "ALL") return yearMap[activeYear]?.rows || [];
    return yearMap[activeYear]?.months?.[activeMonth] || [];
  }, [activeYear, activeMonth, yearMap]);

  // Get all available months for the selected year
  const availableMonths = useMemo(() => {
    if (!activeYear) return [];
    const months = Object.keys(yearMap[activeYear]?.months || {});
    const list = months
      .filter(m => m !== "Unknown")
      .sort((a, b) => Number(a) - Number(b))
      .map(m => ({ value: Number(m), label: monthLabels[m] || `Month ${Number(m) + 1}` }));
    list.push({ value: "ALL", label: "All" });
    return list;
  }, [activeYear, yearMap]);

  /* ------------- Pagination ------------- */
  const totalEntries = scopedRows.length;
  const totalPages = Math.ceil(totalEntries / pageSize);
  const pageSafe = Math.max(1, Math.min(page, totalPages || 1));
  const pageStart = (pageSafe - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, totalEntries);
  const scopedRowsPage = scopedRows.slice(pageStart, pageEnd);

  useEffect(() => {
    if (pageSafe !== page) {
      setPage(pageSafe);
    }
  }, [pageSafe, page]);

  function exportMonthCSV() {
    const rows = scopedRows;
    const header = ["Date", "Type", "Amount", "Note"];
    const body = rows.map((r) => {
      const d = r.parsedDate || parseDateRobust(r.date);
      const dateStr = d ? d.toISOString().slice(0, 10) : (r.date || "");
      const amt = r.type === "client" ? Number(r.payment || 0) : Number(r.amount || 0);
      const note = r.raw?.remarks || r.raw?.description || r.raw?.invest_purpose || r.raw?.paymentFor || "";
      return [dateStr, r.type, amt, `"${String(note).replace(/"/g, '""')}"`].join(",");
    });
    const csv = [header.join(","), ...body].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `results_${activeYear}_${String(activeMonth) === "ALL" ? "all" : (monthLabels[Number(activeMonth)] || "month")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  // Function to get agent details from hospital data
  const getAgentDetails = (tx) => {
    if (tx.type !== "commission") return null;

    const agentData = tx.agentData || {};
    const agents = Array.isArray(agentData) ? agentData :
      (agentData && typeof agentData === "object" ? Object.values(agentData) : []);

    if (agents.length === 0) return null;

    // Get the first agent (you can modify this logic if you need specific agent selection)
    const agent = agents[0];
    return {
      name: agent.name || agent.agentName || "-",
      designation: agent.designation || agent.role || "-",
      phone: agent.phone || agent.phoneNumber || "-",
      commissionRate: agent.commissionRate || agent.rate || "-"
    };
  };

  // Function to get transaction details based on type
  const getTransactionDetails = (tx) => {
    const details = [];

    switch (tx.type) {
      case "client":
        // Client related data
        details.push({ label: "ID", value: tx.clientData?.idNo || tx.clientData?.idNo || tx.raw?.idNo || "-" });
        details.push({ label: "Client Name", value: tx.clientData?.clientName || tx.clientData?.name || tx.raw?.clientName || "-" });
        details.push({ label: "Service", value: tx.clientData?.service || tx.raw?.service || "-" });
        details.push({ label: "Package", value: tx.clientData?.package || tx.raw?.package || "-" });
        details.push({ label: "Recept No", value: tx.raw?.receptNo || tx.raw?.receptNo || tx.raw?.receptNo || "-" });
        break;

      case "commission":
        // Commission related data with agent details
        details.push({ label: "Hospital Name", value: tx.hospitalData?.hospitalName || tx.hospitalData?.name || tx.raw?.hospitalName || "-" });

        // Agent details
        const agentDetails = getAgentDetails(tx);
        if (agentDetails) {
          details.push({ label: "Agent Name", value: agentDetails.name });
          details.push({ label: "Agent Designation", value: agentDetails.designation });
          if (agentDetails.phone && agentDetails.phone !== "-") {
            details.push({ label: "Agent Phone", value: agentDetails.phone });
          }
          if (agentDetails.commissionRate && agentDetails.commissionRate !== "-") {
            details.push({ label: "Agent Commission Rate", value: `${agentDetails.commissionRate}%` });
          }
        } else {
          details.push({ label: "Agent Name", value: tx.raw?.agentName || tx.hospitalData?.agentName || "-" });
        }

        details.push({ label: "Service Type", value: tx.hospitalData?.serviceType || tx.raw?.serviceType || "-" });
        details.push({ label: "Commission Rate", value: tx.raw?.commissionRate || tx.raw?.rate ? `${tx.raw.commissionRate || tx.raw.rate}%` : "-" });
        details.push({ label: "Reference", value: tx.raw?.refNo || tx.raw?.reference || "-" });
        break;

      case "agent":
      case "agentcharges":
        // Agent payment/charge related data
        details.push({ label: "Agent Name", value: tx.agentName || tx.agentData?.agentName || tx.agentData?.name || "-" });
        details.push({ label: "Agent ID", value: tx.agentData?.idNo || tx.agentData?.id || "-" });
        details.push({ label: "Agent Type", value: tx.agentData?.agentType || "Agent" });
        details.push({ label: "Payment Type", value: tx.type === "agent" ? "Payout" : "Service Charges" });
        details.push({ label: "Receipt No", value: tx.raw?.receiptNo || tx.raw?.refNo || "-" });
        details.push({ label: "Client Name", value: tx.raw?.clientName || "-" });
        details.push({ label: "Payment Mode", value: tx.raw?.type || tx.raw?.paymentMode || "-" });
        break;

      case "investment":
        // Investment related data
        details.push({ label: "Investor", value: tx.raw?.investor || tx.raw?.investorName || "-" });
        details.push({ label: "Purpose", value: tx.raw?.invest_purpose || tx.raw?.purpose || "-" });
        details.push({ label: "Investment Type", value: tx.raw?.invest_type || tx.raw?.type || "-" });
        details.push({ label: "Reference", value: tx.raw?.refNo || tx.raw?.receiptNo || "-" });
        break;

      case "staff":
        // Staff related data
        details.push({ label: "Staff Name", value: tx.staffData?.staffName || tx.staffData?.name || tx.raw?.staffName || "-" });
        details.push({ label: "Designation", value: tx.staffData?.designation || tx.staffData?.role || "-" });
        details.push({ label: "Department", value: tx.staffData?.department || "-" });
        details.push({ label: "Payment Period", value: tx.raw?.period || tx.raw?.month || "-" });
        break;

      case "worker":
        // Worker related data - only the requested fields
        details.push({ label: "Worker ID", value: tx.workerData?.idNo || "-" });

        // Prefer firstName + lastName (from EmployeeBioData)
        details.push({
          label: "Worker Name",
          value: `${tx.workerData?.lastName || ""} ${tx.workerData?.firstName || ""}`.trim() || "-"
        });

        // Employee photo as a JSX element (not an object)
        details.push({
          label: "Employee Photo",
          value: tx.workerData?.employeePhoto
            ? (
              <img
                src={tx.workerData.employeePhoto}
                alt="Employee"
                style={{
                  width: 64,
                  height: 64,
                  objectFit: "cover",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb"
                }}
              />
            )
            : "-"
        });

        // workDetails / location
        details.push({ label: "Location", value: tx.workDetail?.location || "-" });

        // payments / typeOfPayment
        details.push({ label: "Type of Payment", value: tx.raw?.typeOfPayment || "-" });

        // Client Name (with clientFirstName/clientLastName fallback)
        details.push({
          label: "Client Name",
          value:
            tx.workDetail?.clientName ||
            `${tx.workDetail?.clientFirstName || ""} ${tx.workDetail?.clientLastName || ""}`.trim() ||
            tx.raw?.clientName ||
            tx.workerData?.clientName ||
            "-"
        });

        details.push({
          label: "Recept No",
          value:
            tx.workDetail?.days ||
            `${tx.days?.days || ""} ${tx.workDetail?.days || ""}`.trim() ||
            tx.raw?.days ||
            tx.workerData?.days ||
            "-"
        });
        break;

      case "petty":
        // Petty cash related data
        details.push({ label: "Category", value: tx.category || tx.raw?.mainCategory || tx.raw?.category || "-" });
        details.push({ label: "Description", value: tx.raw?.description || tx.raw?.purpose || "-" });
        details.push({ label: "Bill No", value: tx.raw?.billNo || tx.raw?.invoiceNo || "-" });
        details.push({ label: "Approved By", value: tx.raw?.approvedBy || tx.raw?.authorizedBy || "-" });
        break;

      default:
        // Generic fields for other types
        details.push({ label: "Description", value: tx.raw?.description || tx.raw?.remarks || "-" });
        details.push({ label: "Reference", value: tx.raw?.refNo || tx.raw?.receiptNo || "-" });
    }

    // Common fields for all types
    if (tx.type !== "worker") {
      details.push({ label: "Amount", value: formatINR(tx.type === "client" ? (tx.payment || 0) : (tx.amount || 0)) });
      details.push({ label: "Date", value: (tx.parsedDate || new Date(tx.date || "")).toLocaleDateString() });
      details.push({ label: "Payment Method", value: tx.raw?.paymentMethod || tx.raw?.method || "-" });
      details.push({ label: "Remarks", value: tx.raw?.remarks || tx.raw?.note || tx.raw?.description || "-" });
    }

    return details.filter(detail => detail.value && detail.value !== "-" && detail.value !== "");
  };

  const topStat = (label, value, sub, gradClass, icon) => (
    <div className={`col-md-6 col-lg-3 mb-3`}>
      <div className={`neo-card h-100 ${gradClass}`}>
        <div className="d-flex justify-content-between align-items-start">
          <div className="text-white-80">
            <div className="small fw-semibold text-shadow">{label}</div>
            <div className="display-7 fw-bold lh-1">{formatINR(value)}</div>
            {typeof sub === "number" && <div className="tiny mt-1 opacity-85">This period: {formatINR(sub)}</div>}
          </div>
          <div className="icon-bubble">{icon}</div>
        </div>
      </div>
    </div>
  );

  /* ------------- Render ------------- */
  return (
    <>
      <div className="col-12 mb-3">
        <div className="neo-card results-card hover-rise" role="button" onClick={() => setModalOpen(true)}>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <div className="tiny text-white-80 text-uppercase">Overall Profit</div>
              <div className="h3 fw-bold mb-0">{formatINR(overall.profit)}</div>
            </div>
            <div className="text-end">
              <div className="tiny text-white-80">Income: {formatINR(overall.income)}</div>
              <div className="tiny text-white-80">Expense: {formatINR(overall.expense)}</div>
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="modal fade show" style={{ display: "block", background: "rgba(2,6,23,0.9)", zIndex: 2000 }} onClick={() => setModalOpen(false)}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" style={{ zIndex: 2001 }} onClick={(e) => e.stopPropagation()} ref={modalRef}>
            <div className="modal-content overflow-hidden">
              <div className="modal-header gradient-header text-white" style={{ position: "sticky", top: 0, zIndex: 2002 }}>
                <h5 className="modal-title">Profit Report</h5>
                <button className="btn-close btn-close-white" onClick={() => setModalOpen(false)} />
              </div>

              <div className="modal-body bg-surface">
                {/* Quick stats */}
                <div className="row g-3">
                  {topStat("Income (Overall)", overall.income, currentYearTotals.income, "grad-sky", "₹")}
                  {topStat("Expenses (Overall)", overall.expense, currentYearTotals.expense, "grad-rose", "∑")}
                  {topStat("Profit (Overall)", overall.profit, currentYearTotals.profit, "grad-emerald", "π")}
                  {topStat("Year Profit", currentYearTotals.profit, currentMonthTotals.profit, "grad-amber", "ɣ")}
                </div>

                {/* Controls */}
                <div className="d-flex flex-wrap align-items-center gap-2 my-3">
                  <div className="btn-group btn-group-sm" role="group" aria-label="Year selector">
                    {yearKeys.map((y) => (
                      <button key={y} className={`btn btn-outline-light ${String(y) === String(activeYear) ? "active" : ""}`} onClick={() => { setActiveYear(y); setActiveMonth(availableMonths[0]?.value || "0"); }}>
                        {y}
                      </button>
                    ))}
                  </div>

                  <div className="btn-group btn-group-sm ms-auto" role="group" aria-label="Month selector">
                    {availableMonths.map((m) => (
                      <button key={m.value} className={`btn btn-outline-info ${String(m.value) === String(activeMonth) ? "active" : ""}`} onClick={() => setActiveMonth(m.value)}>
                        {m.label}
                      </button>
                    ))}
                  </div>

                  <div className="ms-auto d-flex gap-2">
                    <button className="btn btn-sm btn-outline-secondary" onClick={exportMonthCSV}>Export CSV</button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => window.print()}>Print</button>
                  </div>
                </div>

                {/* Charts row */}
                <div className="row g-3 align-items-stretch">
                  <div className="col-lg-8">
                    <div className="glass-card h-100">
                      <div className="d-flex justify-content-between align-items-center">
                        <h6 className="mb-0">Monthly Profit — {activeYear || ""}</h6>
                        <div className="tiny text-muted">Bars show positive profit</div>
                      </div>
                      <div className="mt-2">
                        <BarChart data={chartDataYear} />
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-4">
                    <div className="glass-card h-100">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="mb-0">Expense Distribution</h6>
                        <div className="btn-group btn-group-sm">
                          <button
                            className={`btn ${chartType === "month" ? "btn-primary" : "btn-outline-primary"}`}
                            onClick={() => setChartType("month")}
                          >
                            Month
                          </button>
                          <button
                            className={`btn ${chartType === "year" ? "btn-primary" : "btn-outline-primary"}`}
                            onClick={() => setChartType("year")}
                          >
                            Year
                          </button>
                        </div>
                      </div>
                      <div className="d-flex align-items-center justify-content-center">
                        <DonutChart
                          segments={chartType === "month" ? monthlyExpenseSegments : yearlyExpenseSegments}
                          title={chartType === "month" ? "This Month" : "This Year"}
                        />
                      </div>
                      <div className="mt-2 tiny">
                        {(chartType === "month" ? monthlyExpenseSegments : yearlyExpenseSegments).map((s) => (
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

                {/* Additional Insights */}
                <div className="row mt-3">
                  <div className="col-md-4">
                    <div className="glass-card p-3 text-center">
                      <div className="small text-muted">Profit Margin</div>
                      <div className="h4 fw-bold text-success">
                        {overall.income > 0 ? `${((overall.profit / overall.income) * 100).toFixed(1)}%` : "0%"}
                      </div>
                      <div className="tiny text-muted">Overall Efficiency</div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="glass-card p-3 text-center">
                      <div className="small text-muted">Expense Ratio</div>
                      <div className="h4 fw-bold text-warning">
                        {overall.income > 0 ? `${((overall.expense / overall.income) * 100).toFixed(1)}%` : "0%"}
                      </div>
                      <div className="tiny text-muted">Cost to Income</div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="glass-card p-3 text-center">
                      <div className="small text-muted">Transactions</div>
                      <div className="h4 fw-bold text-info">{allRows.length}</div>
                      <div className="tiny text-muted">Total Records</div>
                    </div>
                  </div>
                </div>

                {/* Breakdown Table */}
                <div className="table-responsive mt-3">
                  <table className="table table-sm align-middle table-modern">
                    <thead style={{ background: "linear-gradient(90deg,#0ea5e9,#6366f1)", color: "white" }}>
                      <tr>
                        <th>Scope</th>
                        <th className="text-end">Client Payment</th>
                        <th className="text-end">Investments</th>
                        <th className="text-end">Worker Salaries</th>
                        <th className="text-end">Staff Salaries</th>
                        <th className="text-end">Petty Cash</th>
                        <th className="text-end">Agent Commission</th>
                        <th className="text-end">Agent Payouts</th>
                        <th className="text-end">Hospital Charges</th>
                        <th className="text-end">Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ background: "linear-gradient(90deg,#0b1220,#1e293b)", color: "#e2e8f0" }}>
                        <td>Overall</td>
                        <td className="text-end">{formatINR(overall.income)}</td>
                        <td className="text-end">{formatINR(overall.investment)}</td>
                        <td className="text-end">{formatINR(overall.worker)}</td>
                        <td className="text-end">{formatINR(overall.staff)}</td>
                        <td className="text-end">{formatINR(overall.petty)}</td>
                        <td className="text-end">{formatINR(overall.commission)}</td>
                        <td className="text-end">{formatINR(overall.agent)}</td>
                        <td className="text-end">{formatINR(overall.hospital)}</td>
                        <td className="text-end fw-bold">{formatINR(overall.profit)}</td>
                      </tr>
                      <tr style={{ background: "linear-gradient(90deg,#0b1328,#1e293b)", color: "#e2e8f0" }}>
                        <td>Year ({activeYear || "-"})</td>
                        <td className="text-end">{formatINR(currentYearTotals.income)}</td>
                        <td className="text-end">{formatINR(currentYearTotals.investment)}</td>
                        <td className="text-end">{formatINR(currentYearTotals.worker)}</td>
                        <td className="text-end">{formatINR(currentYearTotals.staff)}</td>
                        <td className="text-end">{formatINR(currentYearTotals.petty)}</td>
                        <td className="text-end">{formatINR(currentYearTotals.commission)}</td>
                        <td className="text-end">{formatINR(currentYearTotals.agent)}</td>
                        <td className="text-end">{formatINR(currentYearTotals.hospital)}</td>
                        <td className="text-end fw-bold">{formatINR(currentYearTotals.profit)}</td>
                      </tr>
                      <tr style={{ background: "linear-gradient(90deg,#111827,#1e293b)", color: "#e2e8f0" }}>
                        <td>Month ({activeMonthLabel})</td>
                        <td className="text-end">{formatINR(currentMonthTotals.income)}</td>
                        <td className="text-end">{formatINR(currentMonthTotals.investment)}</td>
                        <td className="text-end">{formatINR(currentMonthTotals.worker)}</td>
                        <td className="text-end">{formatINR(currentMonthTotals.staff)}</td>
                        <td className="text-end">{formatINR(currentMonthTotals.petty)}</td>
                        <td className="text-end">{formatINR(currentMonthTotals.commission)}</td>
                        <td className="text-end">{formatINR(currentMonthTotals.agent)}</td>
                        <td className="text-end">{formatINR(currentMonthTotals.hospital)}</td>
                        <td className="text-end fw-bold">{formatINR(currentMonthTotals.profit)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Raw rows for the current month */}
                <div className="glass-card mt-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <h6 className="mb-2">Transactions — {activeYear || "-"}, {activeMonthLabel} <span className="tiny text-muted">({totalEntries} entries)</span></h6>
                    <div className="tiny text-muted">Green=Income, Red=Expense</div>
                  </div>
                  <div className="table-responsive">
                    <table className="table transcation table-sm table-hover table-modern">
                      <thead style={{ background: "linear-gradient(90deg,#0ea5e9,#6366f1)", color: "white" }}>
                        <tr>
                          <th>#</th>
                          <th>Date</th>
                          <th>Type</th>
                          <th className="text-end">Amount</th>
                          <th>Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scopedRowsPage.filter(r => r.type !== "hospital").map((r, i) => {
                          const d = r.parsedDate || parseDateRobust(r.date);
                          const dateStr = d ? d.toLocaleDateString() : (r.date || "-");
                          const amt = r.type === "client" ? Number(r.payment || 0) : Number(r.amount || 0);
                          const isOut = r.type !== "client";
                          return (
                            <tr key={i} role="button" style={{ cursor: "pointer" }} onClick={() => { setSelectedTx(r); setTxModalOpen(true); }}>
                              <td>{pageStart + i + 1}</td>
                              <td>{dateStr}</td>
                              <td>
                                {r.type === "client" ? <span className="badge bg-success-subtle text-success fw-semibold">Client</span> : null}
                                {r.type === "investment" ? <span className="badge bg-danger-subtle text-danger fw-semibold">Investment</span> : null}
                                {r.type === "petty" ? <span className="badge bg-violet-subtle text-violet fw-semibold">Petty</span> : null}
                                {r.type === "staff" ? <span className="badge bg-sky-subtle text-sky fw-semibold">Staff</span> : null}
                                {r.type === "worker" ? <span className="badge bg-amber-subtle text-amber fw-semibold">Worker</span> : null}
                                {r.type === "commission" ? <span className="badge bg-warning-subtle text-warning fw-semibold">Commission</span> : null}
                                {r.type === "agent" ? <span className="badge bg-pink-subtle text-pink fw-semibold">Agent Payout</span> : null}
                                {r.type === "agentcharges" ? <span className="badge bg-indigo-subtle text-indigo fw-semibold">Agent Charges</span> : null}
                              </td>
                              <td className={`text-end ${isOut ? "text-danger" : "text-success"}`}>{formatINR(amt)}</td>
                              <td className="text-muted tiny">{r.raw?.remarks || r.raw?.description || r.raw?.invest_purpose || r.raw?.paymentFor || ""}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center p-2 border-top">
                      <div className="tiny text-muted">
                        Showing {totalEntries === 0 ? 0 : (pageStart + 1)} to {pageEnd} of {totalEntries} entries
                      </div>
                      <nav style={{ backgroundColor: "transparent" }}>
                        <ul className="pagination pagination-sm mb-0">
                          <li className={`page-item ${pageSafe <= 1 ? "disabled" : ""}`}>
                            <button className="page-link" onClick={() => pageSafe > 1 && setPage(pageSafe - 1)}>Prev</button>
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
                      </nav>
                    </div>
                  )}
                </div>

                {/* TX DETAIL MODAL */}
                {txModalOpen && selectedTx && (
                  <div className="modal fade show" style={{ display: "block", background: "rgba(2,6,23,0.6)", zIndex: 3000 }} onClick={() => setTxModalOpen(false)}>
                    <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()} style={{ zIndex: 3001 }}>
                      <div className="modal-content bg-white">
                        <div className="modal-header bg-primary text-white">
                          <h6 className="modal-title mb-0">Transaction Details</h6>
                          <button className="btn-close btn-close-white" onClick={() => setTxModalOpen(false)} />
                        </div>
                        <div className="modal-body">
                          <div className="row g-3">
                            {/* Transaction Type Badge */}
                            <div className="col-12 mb-3">
                              <div className="d-flex justify-content-between align-items-center">
                                <span className={`badge ${selectedTx.type === "client" ? "bg-success" :
                                  selectedTx.type === "investment" ? "bg-danger" :
                                    selectedTx.type === "petty" ? "bg-info" :
                                      selectedTx.type === "staff" ? "bg-sky" :
                                        selectedTx.type === "worker" ? "bg-warning" :
                                          selectedTx.type === "commission" ? "bg-warning" :
                                            selectedTx.type === "agent" ? "bg-pink" :
                                              selectedTx.type === "agentcharges" ? "bg-indigo" : "bg-secondary"
                                  } text-uppercase fs-6`}>
                                  {selectedTx.type} Transaction
                                </span>
                                <div className={`fw-bold fs-5 ${selectedTx.type === "client" ? "text-success" : "text-danger"
                                  }`}>
                                  {formatINR(selectedTx.type === "client" ? (selectedTx.payment || 0) : (selectedTx.amount || 0))}
                                </div>
                              </div>
                            </div>

                            {/* Dynamic Details based on transaction type */}
                            {getTransactionDetails(selectedTx).map((detail, idx) => (
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
                          <button className="btn btn-secondary" onClick={() => setTxModalOpen(false)}>Close</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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