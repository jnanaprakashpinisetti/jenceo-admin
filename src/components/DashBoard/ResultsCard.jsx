// src/components/DashBoard/ResultsCard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/* ---------------------- Helpers ---------------------- */
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
  } catch {}
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
    const idx = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf(mm[1].slice(0,3).toLowerCase());
    if (idx >= 0) return new Date(Number(mm[2]), idx, 1);
  }
  return null;
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
  const arr = Array.isArray(raw) ? raw : (raw && typeof raw === "object" ? Object.values(raw) : []);
  const rows = [];
  (arr || []).forEach((r) => {
    if (!r) return;
    if (r.payments && typeof r.payments === "object") {
      const sub = Array.isArray(r.payments) ? r.payments : Object.values(r.payments);
      sub.forEach((p) => rows.push({ ...p }));
    } else {
      rows.push(r);
    }
  });
  return rows.map((it) => {
    const date = it.date ?? it.pettyDate ?? it.paymentDate ?? it.createdAt ?? "";
    const amount = safeNumber(it.total ?? it.amount ?? it.pettyAmount ?? it.value ?? it.price ?? 0);
    return { type: "petty", date, parsedDate: parseDateRobust(date), amount, raw: it };
  });
}

function extractStaffSalaries(staffNode = {}) {
  const arr = Array.isArray(staffNode) ? staffNode : (staffNode && typeof staffNode === "object" ? Object.values(staffNode) : []);
  const out = [];
  (arr || []).forEach((emp) => {
    const pays = Array.isArray(emp.payments) ? emp.payments : (emp.payments && typeof emp.payments === "object" ? Object.values(emp.payments) : []);
    if (pays.length) {
      pays.forEach((p) => {
        const date = p.date ?? p.paymentDate ?? p.paidOn ?? emp.createdAt ?? "";
        const amount = safeNumber(p.amount ?? p.salary ?? p.paidAmount ?? 0);
        out.push({ type: "staff", date, parsedDate: parseDateRobust(date), amount, raw: p });
      });
    } else {
      const date = emp.pay_date ?? emp.date ?? "";
      const amount = safeNumber(emp.amount ?? emp.salary ?? 0);
      if (amount) out.push({ type: "staff", date, parsedDate: parseDateRobust(date), amount, raw: emp });
    }
  });
  return out;
}

function extractWorkerSalaries(node = {}) {
  const arr = Array.isArray(node) ? node : (node && typeof node === "object" ? Object.values(node) : []);
  const out = [];
  (arr || []).forEach((emp) => {
    const pays = Array.isArray(emp.payments) ? emp.payments : (emp.payments && typeof emp.payments === "object" ? Object.values(emp.payments) : []);
    if (pays.length) {
      pays.forEach((p) => {
        const date = p.date ?? p.paymentDate ?? p.paidOn ?? emp.createdAt ?? "";
        const amount = safeNumber(p.amount ?? p.salary ?? p.paidAmount ?? 0);
        out.push({ type: "worker", date, parsedDate: parseDateRobust(date), amount, raw: p });
      });
    } else {
      const date = emp.pay_date ?? emp.date ?? "";
      const amount = safeNumber(emp.amount ?? emp.salary ?? 0);
      if (amount) out.push({ type: "worker", date, parsedDate: parseDateRobust(date), amount, raw: emp });
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
            <text x={x + Math.max(8, barW - 8) / 2} y={height - 10} textAnchor="middle" fontSize="10" fill="#94a3b8">{d.short || d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function DonutChart({ segments = [], size = 150, stroke = 18 }) {
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
      </defs>
      <circle cx={size/2} cy={size/2} r={r} stroke="#e2e8f0" strokeWidth={stroke} fill="none" />
      {segments.map((s, i) => {
        const frac = (s.value || 0) / total;
        const len = c * frac;
        const dash = `${len} ${c - len}`;
        const dashoffset = c - offset;
        offset += len;
        return (
          <circle
            key={i}
            cx={size/2}
            cy={size/2}
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
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="14" fill="#0f172a">Expenses</text>
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
}) {
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [allRows, setAllRows] = useState([]);
  const [activeYear, setActiveYear] = useState(null);
  const [activeMonth, setActiveMonth] = useState(null);
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
      attach(pettyCollection, "petty");
      attach(staffCollections.active, "staffActive");
      attach(staffCollections.exit, "staffExit");
      attach(workerCollections.active, "workerActive");
      attach(workerCollections.exit, "workerExit");

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
        extractPettyCash(snapshots.petty || {}).forEach((r) => rows.push(r));

        const pushStaff = (node) => {
          Object.keys(node || {}).forEach((k) => {
            extractStaffSalaries(node[k]).forEach((r) => rows.push(r));
          });
        };
        pushStaff(snapshots.staffActive || {});
        pushStaff(snapshots.staffExit || {});

        const pushWorkers = (node) => {
          Object.keys(node || {}).forEach((k) => {
            extractWorkerSalaries(node[k]).forEach((r) => rows.push(r));
          });
        };
        pushWorkers(snapshots.workerActive || {});
        pushWorkers(snapshots.workerExit || {});

        rows.forEach((r) => { if (!r.parsedDate && r.date) r.parsedDate = parseDateRobust(r.date); });
        rows.sort((a, b) => (b.parsedDate?.getTime() || 0) - (a.parsedDate?.getTime() || 0));

        if (!mounted) return;
        setAllRows(rows);
        setLoading(false);
      };
    })();

    return () => {
      mounted = false;
      try { listeners.forEach(({ ref, cb }) => ref.off("value", cb)); } catch {}
    };
  }, [clientCollections.active, clientCollections.exit, investmentsCollection, pettyCollection, staffCollections.active, staffCollections.exit, workerCollections.active, workerCollections.exit]);

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
    const s = { income: 0, investment: 0, petty: 0, staff: 0, worker: 0 };
    (rows || []).forEach((r) => {
      if (r.type === "client") s.income += Number(r.payment || 0);
      else if (r.type === "investment") s.investment += Number(r.amount || 0);
      else if (r.type === "petty") s.petty += Number(r.amount || 0);
      else if (r.type === "staff") s.staff += Number(r.amount || 0);
      else if (r.type === "worker") s.worker += Number(r.amount || 0);
    });
    s.expense = s.investment + s.petty + s.staff + s.worker;
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
  const monthLabels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

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

  const donutSegments = useMemo(() => {
    const s = currentMonthTotals;
    return [
      { key: "Investments", value: s.investment, color: "url(#gradInv)" },
      { key: "Staff", value: s.staff, color: "url(#gradStaff)" },
      { key: "Workers", value: s.worker, color: "url(#gradWorker)" },
      { key: "Petty", value: s.petty, color: "url(#gradPetty)" },
    ];
  }, [currentMonthTotals]);

  function exportMonthCSV() {
    const rows = (yearMap[activeYear]?.months?.[activeMonth] || []);
    const header = ["Date","Type","Amount","Note"];
    const body = rows.map((r) => {
      const d = r.parsedDate || parseDateRobust(r.date);
      const dateStr = d ? d.toISOString().slice(0,10) : (r.date || "");
      const amt = r.type === "client" ? Number(r.payment || 0) : Number(r.amount || 0);
      const note = r.raw?.remarks || r.raw?.description || r.raw?.invest_purpose || r.raw?.paymentFor || "";
      return [dateStr, r.type, amt, `"${String(note).replace(/"/g,'""')}"`].join(",");
    });
    const csv = [header.join(","), ...body].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `results_${activeYear}_${monthLabels[Number(activeMonth)] || "month"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

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
        <div className="modal fade show" style={{ display: "block", background: "rgba(2,6,23,0.55)" }} onClick={() => setModalOpen(false)}>
          <div className="modal-dialog modal-xl modal-dialog-centered" onClick={(e) => e.stopPropagation()} ref={modalRef}>
            <div className="modal-content overflow-hidden">
              <div className="modal-header gradient-header text-white">
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
                      <button key={y} className={`btn btn-outline-light ${String(y) === String(activeYear) ? "active" : ""}`} onClick={() => { setActiveYear(y); setActiveMonth("0"); }}>
                        {y}
                      </button>
                    ))}
                  </div>

                  <div className="btn-group btn-group-sm ms-auto" role="group" aria-label="Month selector">
                    {monthLabels.map((m, i) => (
                      <button key={m} className={`btn btn-outline-info ${String(i) === String(activeMonth) ? "active" : ""}`} onClick={() => setActiveMonth(String(i))}>
                        {m}
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
                      <h6 className="mb-2">This Month — Expense mix</h6>
                      <div className="d-flex align-items-center justify-content-center">
                        <DonutChart segments={donutSegments} />
                      </div>
                      <div className="mt-2 tiny">
                        {donutSegments.map((s) => (
                          <div key={s.key} className="d-flex align-items-center gap-2 mb-1">
                            <span className="legend-dot" style={{background: s.color}}></span>
                            <span className="text-muted">{s.key}</span>
                            <span className="ms-auto fw-semibold">{formatINR(s.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Breakdown Table */}
                <div className="table-responsive mt-3">
                  <table className="table table-sm align-middle table-modern">
                    <thead>
                      <tr>
                        <th>Scope</th>
                        <th className="text-end">Client Payment</th>
                        <th className="text-end">Investments</th>
                        <th className="text-end">Worker Salaries</th>
                        <th className="text-end">Staff Salaries</th>
                        <th className="text-end">Petty Cash</th>
                        <th className="text-end">Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Overall</td>
                        <td className="text-end">{formatINR(overall.income)}</td>
                        <td className="text-end">{formatINR(overall.investment)}</td>
                        <td className="text-end">{formatINR(overall.worker)}</td>
                        <td className="text-end">{formatINR(overall.staff)}</td>
                        <td className="text-end">{formatINR(overall.petty)}</td>
                        <td className="text-end fw-bold">{formatINR(overall.profit)}</td>
                      </tr>
                      <tr>
                        <td>Year ({activeYear || "-"})</td>
                        <td className="text-end">{formatINR(currentYearTotals.income)}</td>
                        <td className="text-end">{formatINR(currentYearTotals.investment)}</td>
                        <td className="text-end">{formatINR(currentYearTotals.worker)}</td>
                        <td className="text-end">{formatINR(currentYearTotals.staff)}</td>
                        <td className="text-end">{formatINR(currentYearTotals.petty)}</td>
                        <td className="text-end fw-bold">{formatINR(currentYearTotals.profit)}</td>
                      </tr>
                      <tr>
                        <td>Month ({activeYear || "-"}, {monthLabels[Number(activeMonth)] || "-"})</td>
                        <td className="text-end">{formatINR(currentMonthTotals.income)}</td>
                        <td className="text-end">{formatINR(currentMonthTotals.investment)}</td>
                        <td className="text-end">{formatINR(currentMonthTotals.worker)}</td>
                        <td className="text-end">{formatINR(currentMonthTotals.staff)}</td>
                        <td className="text-end">{formatINR(currentMonthTotals.petty)}</td>
                        <td className="text-end fw-bold">{formatINR(currentMonthTotals.profit)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Raw rows for the current month */}
                <div className="glass-card mt-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <h6 className="mb-2">Transactions — {activeYear || "-"}, {monthLabels[Number(activeMonth)] || "-"}</h6>
                    <div className="tiny text-muted">Green=Income, Red=Expense</div>
                  </div>
                  <div className="table-responsive">
                    <table className="table transcation table-sm table-hover table-modern">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Date</th>
                          <th>Type</th>
                          <th className="text-end">Amount</th>
                          <th>Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(yearMap[activeYear]?.months?.[activeMonth] || []).map((r, i) => {
                          const d = r.parsedDate || parseDateRobust(r.date);
                          const dateStr = d ? d.toLocaleDateString() : (r.date || "-");
                          const amt = r.type === "client" ? Number(r.payment || 0) : Number(r.amount || 0);
                          const isOut = r.type !== "client";
                          return (
                            <tr key={i}>
                              <td>{i + 1}</td>
                              <td>{dateStr}</td>
                              <td>
                                {r.type === "client" ? <span className="badge bg-success-subtle text-success fw-semibold">Client</span> : null}
                                {r.type === "investment" ? <span className="badge bg-danger-subtle text-danger fw-semibold">Investment</span> : null}
                                {r.type === "petty" ? <span className="badge bg-violet-subtle text-violet fw-semibold">Petty</span> : null}
                                {r.type === "staff" ? <span className="badge bg-sky-subtle text-sky fw-semibold">Staff</span> : null}
                                {r.type === "worker" ? <span className="badge bg-amber-subtle text-amber fw-semibold">Worker</span> : null}
                              </td>
                              <td className={`text-end ${isOut ? "text-danger" : "text-success"}`}>{formatINR(amt)}</td>
                              <td className="text-muted tiny">{r.raw?.remarks || r.raw?.description || r.raw?.invest_purpose || r.raw?.paymentFor || ""}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
