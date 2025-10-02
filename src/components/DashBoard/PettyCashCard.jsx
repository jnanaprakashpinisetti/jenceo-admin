// src/components/DashBoard/PettyCashCard.jsx
import React, { useEffect, useMemo, useState } from "react";

/* ---------------------------------- Firebase loader ---------------------------------- */
async function importFirebaseDB() {
  try {
    const a = await import("../../firebase");
    if (a && a.default) return a.default;
    if (a && a.firebaseDB) return a.firebaseDB;
  } catch { }
  try {
    const b = await import("../firebase");
    if (b && b.default) return b.default;
    if (b && b.firebaseDB) return b.firebaseDB;
  } catch { }
  if (typeof window !== "undefined" && window.firebaseDB) return window.firebaseDB;
  return null;
}

/* ---------------------------------- Utils ---------------------------------- */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const INR = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n || 0));
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function safeNumber(v) {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isNaN(n) ? 0 : n;
}
function parseDateRobust(v) {
  if (!v && v !== 0) return null;
  try { if (v instanceof Date && !isNaN(v)) return v; } catch { }
  const s = String(v || "").trim(); if (!s) return null;
  if (/^\d{10,13}$/.test(s)) { const n = Number(s); return new Date(n < 1e12 ? n * 1000 : n); }
  const d = new Date(s); if (!isNaN(d)) return d;
  const m1 = s.match(/^(\d{1,2})[\/\-\s](\d{1,2})[\/\-\s](\d{2,4})$/);
  if (m1) { const dd = +m1[1], mm = +m1[2], yy = +m1[3] < 100 ? 2000 + +m1[3] : +m1[3]; return new Date(yy, mm - 1, dd); }
  return null;
}
function isApproved(raw) {
  const t = String(raw?.approval || raw?.approvalStatus || raw?.status || "").toLowerCase().trim();
  return raw?.approved === true || raw?.isApproved === true || t === "approved" || t === "acknowledged" || t === "true" || !!raw?.approvedBy;
}
function isRejected(raw) {
  const t = String(raw?.approval || raw?.approvalStatus || raw?.status || "").toLowerCase().trim();
  return /reject/.test(t);
}
function detectCategory(raw) {
  const s = String(raw?.mainCategory || raw?.category || raw?.head || raw?.type || raw?.purpose || "").toLowerCase().trim();
  if (s.includes("food")) return "Food";
  if (s.includes("transport") || s.includes("travel") || s.includes("fuel") || s.includes("petrol")) return "Transport & Travel";
  if (s.includes("market") || s.includes("promo") || s.includes("print")) return "Marketing";
  if (s.includes("station")) return "Stationery";
  if (s.includes("medic") || s.includes("tablet") || s.includes("clinic")) return "Medical";
  if (s.includes("asset") || s.includes("device") || s.includes("laptop") || s.includes("software")) return "Assets";
  if (s.includes("repair") || s.includes("maint") || s.includes("rent") || s.includes("bill")) return "Office Maintenance";
  if (s.includes("welfare") || s.includes("gift") || s.includes("festival")) return "Welfare";
  return "Others";
}
function classNames(...xs) { return xs.filter(Boolean).join(" "); }

/* ---------------------------------- Tiny SVG charts (gradients for 3D-ish) ---------------------------------- */
function Bars({ data = [], width = 560, height = 180, pad = 30, gradId = "pcGrad" }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const bw = (width - pad * 2) / Math.max(1, data.length);
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="pcGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="pcGradBlue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#93c5fd" /><stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={width} height={height} fill="transparent" />
      {data.map((d, i) => {
        const h = Math.max(2, (d.value / max) * (height - pad * 2));
        const x = pad + i * bw + 4, y = height - pad - h, w = Math.max(10, bw - 8);
        return (
          <g key={i}>
            <title>{d.label}: {INR(d.value)}</title>
            <rect x={x} y={y} width={w} height={h} rx="6" fill={`url(#${gradId})`} />
            {h > 16 && <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#facc15" transform={`rotate(-90 ${x + w / 2} ${y + h / 2})`}>{INR(d.value)}</text>}
            <text x={x + w / 2} y={height - 8} textAnchor="middle" fontSize="10" fill="#94a3b8">{d.short || d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Donut({ segments = [], size = 170, stroke = 20, title = "Distribution" }) {
  const total = Math.max(1, segments.reduce((s, x) => s + (x.value || 0), 0));
  const r = (size - stroke) / 2, c = 2 * Math.PI * r; let off = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id="pcPieG1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#a78bfa" /><stop offset="100%" stopColor="#6d28d9" /></linearGradient>
        <linearGradient id="pcPieG2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#d97706" /></linearGradient>
        <linearGradient id="pcPieG3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#60a5fa" /><stop offset="100%" stopColor="#1d4ed8" /></linearGradient>
        <linearGradient id="pcPieG4" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#34d399" /><stop offset="100%" stopColor="#059669" /></linearGradient>
        <linearGradient id="pcPieG5" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fb7185" /><stop offset="100%" stopColor="#be123c" /></linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#e2e8f0" strokeWidth={stroke} fill="none" />
      {segments.map((s, i) => {
        const frac = (s.value || 0) / total;
        const len = c * frac, dash = `${len} ${c - len}`, dashoffset = c - off; off += len;
        const color = s.color || (i % 5 === 0 ? "url(#pcPieG1)" : i % 5 === 1 ? "url(#pcPieG2)" : i % 5 === 2 ? "url(#pcPieG3)" : i % 5 === 3 ? "url(#pcPieG4)" : "url(#pcPieG5)");
        return (<circle key={i} cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeDasharray={dash} strokeDashoffset={dashoffset} strokeLinecap="round" />);
      })}
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="13" fill="#111827">{title}</text>
    </svg>
  );
}

/* ---------------------------------- Component ---------------------------------- */
export default function PettyCashCard({ pettyRoot = "PettyCash" }) {
  const [modal, setModal] = useState(false);
  const [rows, setRows] = useState([]);

  // modal state
  const [view, setView] = useState("month"); // month | year | category
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState("ALL");
  const [onlyApproved, setOnlyApproved] = useState(true);

  // table state
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // details modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState(null);

  /* ------------------------------- Fetch (merge common paths) ------------------------------- */
  useEffect(() => {
    let mounted = true;
    const listeners = [];

    (async () => {
      const fdb = await importFirebaseDB();
      if (!fdb) return;

      const paths = [
        `${pettyRoot}`,
        `${pettyRoot}/admin`,
        `${pettyRoot}/Admin`,
        "Expenses/PettyCash",
      ];
      const pathData = {};
      const toArr = (v) => Array.isArray(v) ? v : (v && typeof v === "object" ? Object.values(v) : []);

      const rebuild = () => {
        const merged = Object.values(pathData).flat();
        const flat = [];
        merged.forEach((r0) => {
          const r = r0 || {};
          if (r.rows || r.items || r.payments || r.list) {
            toArr(r.rows).forEach(p => flat.push({ ...p }));
            toArr(r.items).forEach(p => flat.push({ ...p }));
            toArr(r.payments).forEach(p => flat.push({ ...p }));
            toArr(r.list).forEach(p => flat.push({ ...p }));
          } else {
            flat.push(r);
          }
        });

        const normalized = flat.map(o => {
          const date = parseDateRobust(o.date || o.pettyDate || o.paymentDate || o.createdAt || o.forDate);
          const amount = safeNumber(o.total ?? o.amount ?? o.pettyAmount ?? o.value ?? o.price) || (safeNumber(o.quantity) * safeNumber(o.unitPrice));
          const status = isRejected(o) ? "reject" : (isApproved(o) ? "acknowledge" : "pending");
          return {
            raw: o,
            date,
            amount,
            status,
            category: detectCategory(o),
            desc: o.description || o.remark || o.purpose || o.note || ""
          };
        }).filter(x => x.amount > 0);

        // de-dupe by (date|amount|category|desc)
        const seen = new Set();
        const uniq = [];
        normalized.forEach(r => {
          const sig = [r.date?.toISOString()?.slice(0, 10) || "x", r.amount, r.category, String(r.desc).toLowerCase()].join("|");
          if (seen.has(sig)) return; seen.add(sig); uniq.push(r);
        });

        if (!mounted) return;
        setRows(uniq);
      };

      const attach = (path) => {
        try {
          const ref = fdb.child ? fdb.child(path) : fdb.ref(path);
          const cb = s => { pathData[path] = toArr(s.val()); rebuild(); };
          ref.on("value", cb);
          listeners.push({ ref, cb });
        } catch { }
      };

      paths.forEach(attach);
    })();

    return () => {
      try { listeners.forEach(({ ref, cb }) => ref.off("value", cb)); } catch { }
      mounted = false;
    };
  }, [pettyRoot]);

  /* ------------------------------- Datasets & summaries ------------------------------- */
  const approvedRows = useMemo(() => rows.filter(r => r.status === "acknowledge"), [rows]);

  const yearOptions = useMemo(() => {
    const y = new Set();
    rows.forEach(r => { if (r.date) y.add(r.date.getFullYear()); });
    const sorted = Array.from(y).sort((a, b) => a - b);
    return sorted.length ? sorted : [new Date().getFullYear()];
  }, [rows]);

  // keep year dynamic (auto-select the latest if current not present)
  useEffect(() => {
    if (!yearOptions.includes(year)) setYear(yearOptions[yearOptions.length - 1]);
  }, [yearOptions, year]);

  // summaries for cards (only approved)
  const cards = useMemo(() => {
    const list = approvedRows;
    const total = list.reduce((s, r) => s + r.amount, 0);
    const count = list.length;
    const avg = count ? total / count : 0;
    const byMonth = Array.from({ length: 12 }, () => 0);
    list.forEach(r => { if (r.date && r.date.getFullYear() === year) { byMonth[r.date.getMonth()] += r.amount; } });
    const topIdx = byMonth.reduce((best, _, i) => byMonth[i] > byMonth[best] ? i : best, 0);
    return { total, count, avg, topMonth: MONTHS[topIdx] };
  }, [approvedRows, year]);

  // month series (approved only)
  const monthSeries = useMemo(() => {
    const src = approvedRows;
    const series = Array.from({ length: 12 }, (_, i) => ({ label: MONTHS[i], short: MONTHS[i], value: 0 }));
    src.forEach(r => { if (r.date && r.date.getFullYear() === year) series[r.date.getMonth()].value += r.amount; });
    return series;
  }, [approvedRows, year]);

  // year series (approved only)
  const yearSeries = useMemo(() => {
    const src = approvedRows;
    const map = new Map();
    src.forEach(r => { if (r.date) { const y = r.date.getFullYear(); map.set(y, (map.get(y) || 0) + r.amount); } });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]).map(([y, v]) => ({ label: String(y), short: String(y), value: v }));
  }, [approvedRows]);

  // category segments (approved only)
  const categorySegments = useMemo(() => {
    const src = approvedRows;
    const map = new Map();
    src.forEach(r => map.set(r.category, (map.get(r.category) || 0) + r.amount));
    const grads = ["url(#pcPieG1)", "url(#pcPieG2)", "url(#pcPieG3)", "url(#pcPieG4)", "url(#pcPieG5)"];
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).map(([k, v], i) => ({ key: k, value: v, color: grads[i % grads.length] }));
  }, [approvedRows]);

  /* ------------------------------- Table (filters + pagination) ------------------------------- */
  // reset page if filters change
  useEffect(() => { setPage(1); }, [view, year, month, pageSize, search, onlyApproved]);

  const tableRows = useMemo(() => {
    let list = onlyApproved ? approvedRows : rows;
    if (view === "month" && month !== "ALL") {
      list = list.filter(r => r.date && r.date.getFullYear() === year && r.date.getMonth() === Number(month));
    } else if (view === "year") {
      list = list.filter(r => r.date && r.date.getFullYear() === year);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => `${r.category} ${r.desc}`.toLowerCase().includes(q));
    }
    return list.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
  }, [rows, approvedRows, view, year, month, search, onlyApproved]);

  const totalEntries = tableRows.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const safePage = clamp(page, 1, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageRows = tableRows.slice(start, start + pageSize);

  // stable page window
  const windowSize = 5;
  const startPage = Math.max(1, Math.min(safePage - Math.floor(windowSize / 2), Math.max(1, totalPages - windowSize + 1)));
  const endPage = Math.min(totalPages, startPage + windowSize - 1);
  const pageWindow = []; for (let p = startPage; p <= endPage; p++) pageWindow.push(p);

  /* ---------------------------------- UI ---------------------------------- */
  const cardStyle = {
    background: "linear-gradient(135deg, #0ea5e98a, #8b5cf67a)",
    border: "1px solid #1f2937",
    color: "#e5e7eb",
    boxShadow: "0 8px 24px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.04)"
  };

  const gradientCard = (start, end) => ({
    background: `linear-gradient(135deg, ${start}, ${end})`,
    color: "#0b1220",
    border: "1px solid #0ea5e955",
  });

  return (
    <>
      {/* Dashboard small card (click to open) */}
      <div className="col-12 mb-3">
        <div className="neo-card hover-rise p-3" role="button" onClick={() => setModal(true)} style={cardStyle}>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <div className="tiny text-white-80 text-uppercase">Petty Cash (Approved)</div>
              <div className="h3 fw-bold mb-0">{INR(cards.total)}</div>
            </div>
            <div className="text-end tiny text-white-70">
              <div>Entries: <strong>{cards.count}</strong></div>
              <div>Avg / Entry: <strong>{INR(cards.avg)}</strong></div>
              <div>Top Month: <strong>{cards.topMonth}</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal fade show" style={{ display: "block", background: "rgba(2,6,23,0.9)", zIndex: 2000 }} onClick={() => setModal(false)}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" style={{ zIndex: 2001 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-content overflow-hidden">
              <div className="modal-header" style={{ background: "linear-gradient(90deg,#34d399,#2563eb)", color: "#fff", position: "sticky", top: 0, zIndex: 1 }}>
                <h5 className="modal-title">Petty Cash — Reports</h5>
                <button className="btn-close btn-close-white" onClick={() => setModal(false)} />
              </div>
              <div className="modal-body bg-pettyCash">
                {/* Summary Cards (colorful gradients) */}
                <div className="row g-3 mb-3">
                  <div className="col-md-3"><div className="neo-card p-3 h-100" style={gradientCard("#fef3c7", "#fde68a")}><div className="small">Approved Total</div><div className="h4 mb-0">{INR(cards.total)}</div></div></div>
                  <div className="col-md-3"><div className="neo-card p-3 h-100" style={gradientCard("#cffafe", "#7dd3fc")}><div className="small">Entries</div><div className="h4 mb-0">{cards.count}</div></div></div>
                  <div className="col-md-3"><div className="neo-card p-3 h-100" style={gradientCard("#e9d5ff", "#c4b5fd")}><div className="small">Avg / Entry</div><div className="h4 mb-0">{INR(cards.avg)}</div></div></div>
                  <div className="col-md-3"><div className="neo-card p-3 h-100" style={gradientCard("#bbf7d0", "#86efac")}><div className="small">Top Month</div><div className="h4 mb-0">{cards.topMonth}</div></div></div>
                </div>

                {/* Controls BAR (tabs + search + approved) */}
                <div
                  className="neo-card p-3 mb-3"
                  style={{
                    background: "#222f49",
                    border: "1px solid #1f2937",
                    borderRadius: 12,
                  }}
                >
                  {/* Top row: View tabs + Year + Search + Approved */}
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    {/* View segmented buttons */}
                    <div
                      className="btn-group"
                      role="group"
                      aria-label="View"
                      style={{ background: "#1c263e", borderRadius: 10, overflow: "hidden" }}
                    >
                      <button
                        className={classNames(
                          "btn btn-sm",
                          view === "month" ? "btn-info text-dark" : "btn-outline-info"
                        )}
                        onClick={() => setView("month")}
                        style={{ border: "none" }}
                      >
                        Month
                      </button>
                      <button
                        className={classNames(
                          "btn btn-sm",
                          view === "year" ? "btn-info text-dark" : "btn-outline-info"
                        )}
                        onClick={() => setView("year")}
                        style={{ border: "none" }}
                      >
                        Year
                      </button>
                      <button
                        className={classNames(
                          "btn btn-sm",
                          view === "category" ? "btn-info text-dark" : "btn-outline-info"
                        )}
                        onClick={() => setView("category")}
                        style={{ border: "none" }}
                      >
                        Category
                      </button>
                    </div>

                    {/* Year selector */}
                    <select
                      className="form-select form-select-sm ms-2"
                      style={{
                        width: 110,
                        background: "#1c263e",
                        color: "#e5e7eb",
                        borderColor: "#334155",
                      }}
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                    >
                      {yearOptions.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>

                    {/* Spacer */}
                    <div className="ms-auto d-flex align-items-center gap-2" style={{ minWidth: 280, flex: 1 }}>
                      {/* Search as input-group with icon */}
                      <div className="input-group input-group-sm" style={{ maxWidth: "520px", width: "100%" }}>
                        <span
                          className="input-group-text"
                          style={{
                            background: "#1c263e",
                            color: "#9ca3af",
                            borderColor: "#334155",
                            borderRightColor: "#2b364f",
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Search category / notes…"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          style={{
                            backgroundColor: "#1c263e",
                            color: "#e5e7eb",
                            borderColor: "#334155",
                          }}
                        />
                      </div>

                      {/* Approved toggle */}
                      <div className="form-check form-switch ms-1">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="pc-approved"
                          checked={onlyApproved}
                          onChange={(e) => setOnlyApproved(e.target.checked)}
                        />
                        <label className="form-check-label tiny ms-1" htmlFor="pc-approved" style={{ color: "#cbd5e1" }}>
                          Approved
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Month quick pills (only in Month view) */}
                  {view === "month" && (
                    <div className="d-flex flex-wrap gap-1 mt-3">
                      <button
                        className={classNames(
                          "btn btn-xs",
                          String(month) === "ALL" ? "btn-warning" : "btn-outline-warning"
                        )}
                        onClick={() => setMonth("ALL")}
                        style={{ borderRadius: 10, padding: "3px 15px" }}
                      >
                        ALL
                      </button>
                      {MONTHS.map((m, i) => (
                        <button
                          key={m}
                          className={classNames(
                            "btn btn-xs",
                            Number(month) === i ? "btn-warning" : "btn-outline-warning"
                          )}
                          onClick={() => setMonth(i)}
                          style={{ borderRadius: 10, padding: "3px 15px" }}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  )}
                </div>


                {/* === CHARTS AT TOP (as in ResultsCard layout) === */}
                <div className="row g-3 mb-3">
                  <div className="col-lg-8">
                    <div className="neo-card p-2 h-100">
                      <div className="d-flex justify-content-between align-items-center px-2 pt-2">
                        <div className="fw-semibold">{view === "year" ? "Yearly Total" : "Monthly Total"} — {year}</div>
                        <span className="badge bg-primary">Only Approved</span>
                      </div>
                      {view === "year"
                        ? <Bars data={yearSeries} gradId="pcGradBlue" />
                        : <Bars data={monthSeries} gradId="pcGrad" />
                      }
                    </div>
                  </div>
                  <div className="col-lg-4">
                    <div className="neo-card p-3 h-100">
                      <div className="fw-semibold mb-2">Category Split</div>
                      <div className="d-flex justify-content-center">
                        <Donut segments={categorySegments} title="Categories" />
                      </div>
                      <div className="mt-2 tiny" style={{ maxHeight: 150, overflow: "auto" }}>
                        {categorySegments.map((s, i) => (
                          <div key={i} className="d-flex justify-content-between align-items-center mb-1">
                            <span><span className="legend-dot" style={{ background: s.color }}></span> <span className="ms-1">{s.key}</span></span>
                            <span className="text-warning fw-semibold">{INR(s.value)}</span>
                          </div>
                        ))}
                        {categorySegments.length === 0 && <div className="text-muted">No data</div>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Toolbar above table */}
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <span className="tiny text-muted">Show</span>
                    <select className="form-select form-select-sm" value={pageSize} onChange={e => setPageSize(parseInt(e.target.value, 10) || 10)} style={{ width: 80 }}>
                      {[10, 20, 30, 40, 50].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <span className="tiny text-muted">entries</span>
                  </div>
                  <div className="tiny text-muted">
                    Showing <strong>{Math.min(start + 1, totalEntries) || 0}</strong> to <strong>{Math.min(start + pageSize, totalEntries)}</strong> of <strong>{totalEntries}</strong> entries
                  </div>
                </div>

                {/* Table */}
                <div className="table-responsive">
                  <table className="table table-sm align-middle table-modern">
                    <thead style={{ background: "linear-gradient(90deg,#34d399,#2563eb)", color: "#fff" }}>
                      <tr>
                        <th style={{ width: 60 }}>#</th>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th>Status</th>
                        <th className="text-end">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((r, idx) => {
                        const d = r.date ? r.date.toLocaleDateString("en-GB") : "—";
                        const statusClass = r.status === "acknowledge" ? "badge bg-success" : r.status === "reject" ? "badge bg-danger" : "badge bg-secondary";
                        return (
                          <tr key={`${start}-${idx}`} style={{ cursor: "pointer" }} onClick={() => { setDetailRow(r); setDetailOpen(true); }}>
                            <td>{start + idx + 1}</td>
                            <td>{d}</td>
                            <td>{r.category}</td>
                            <td>{r.desc || "-"}</td>
                            <td><span className={statusClass}>{r.status}</span></td>
                            <td className="text-end">{INR(r.amount)}</td>
                          </tr>
                        );
                      })}
                      {pageRows.length === 0 && <tr><td colSpan={6} className="text-center text-muted py-4">No records</td></tr>}
                    </tbody>
                  </table>
                </div>

                {/* Pagination (bottom) */}
                <div className="d-flex justify-content-center mt-2">
                  <nav style={{ backgroundColor: "transparent", width: "auto" }}>
                    <ul className="pagination pagination-sm mb-0">
                      <li className={classNames("page-item", safePage === 1 && "disabled")}>
                        <button className="page-link" onClick={() => setPage(1)}>«</button>
                      </li>
                      <li className={classNames("page-item", safePage === 1 && "disabled")}>
                        <button className="page-link" onClick={() => setPage(safePage - 1)}>‹</button>
                      </li>

                      {pageWindow.map((pn) => (
                        <li key={pn} className={classNames("page-item", pn === safePage && "active")}>
                          <button className="page-link" onClick={() => setPage(pn)}>{pn}</button>
                        </li>
                      ))}

                      <li className={classNames("page-item", safePage === totalPages && "disabled")}>
                        <button className="page-link" onClick={() => setPage(safePage + 1)}>›</button>
                      </li>
                      <li className={classNames("page-item", safePage === totalPages && "disabled")}>
                        <button className="page-link" onClick={() => setPage(totalPages)}>»</button>
                      </li>
                    </ul>
                  </nav>
                </div>
              </div>

              <div className="modal-footer bg-surface">
                <button className="btn btn-secondary" onClick={() => setModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Row Details Modal */}
      {detailOpen && (
        <div
          className="modal fade show"
          style={{ display: "block", background: "rgba(2,6,23,0.6)", zIndex: 2100 }}
          onClick={() => setDetailOpen(false)}
        >
          <div
            className="modal-dialog modal-lg modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content rounded-3 shadow-lg overflow-hidden">
              {/* Header */}
              <div
                className="modal-header"
                style={{
                  background: "linear-gradient(90deg,#06b6d4,#3b82f6)",
                  color: "#fff",
                }}
              >
                <h5 className="modal-title fw-bold">Petty Cash — Entry Details</h5>
                <button
                  className="btn-close btn-close-white"
                  onClick={() => setDetailOpen(false)}
                />
              </div>

              {/* Body */}
              <div className="modal-body bg-light">
                {detailRow ? (
                  <div className="row g-3">
                    {/* Left */}
                    <div className="col-md-6">
                      <div className="p-3 mb-2 bg-white rounded shadow-sm">
                        <div className="">Date</div>
                        <div className="fw-semibold">
                          {detailRow.date ? detailRow.date.toLocaleString() : "—"}
                        </div>
                      </div>
                      <div className="p-3 mb-2 bg-white rounded shadow-sm">
                        <div className="">Category</div>
                        <div className="fw-semibold">{detailRow.category}</div>
                      </div>
                      <div className="p-3 mb-2 bg-white rounded shadow-sm">
                        <div className="">Description</div>
                        <div className="fw-semibold">{detailRow.desc || "-"}</div>
                      </div>
                      <div className="p-3 mb-2 bg-white rounded shadow-sm">
                        <div className="">Amount</div>
                        <div className="fw-bold text-success">
                          {INR(detailRow.amount)}
                        </div>
                      </div>
                    </div>

                    {/* Right */}
                    <div className="col-md-6">
                      <div className="p-3 mb-2 bg-white rounded shadow-sm">
                        <div className="">Status</div>
                        <span
                          className={
                            detailRow.status === "acknowledge"
                              ? "badge bg-success"
                              : detailRow.status === "reject"
                                ? "badge bg-danger"
                                : "badge bg-secondary"
                          }
                        >
                          {detailRow.status}
                        </span>
                      </div>

                      {/* Source fields box */}
                      <div className="p-3 bg-white rounded shadow-sm border">
                        <div className="fw-semibold mb-1 text-primary">
                          Source Fields
                        </div>
                        <div className=" mb-2">
                          We display common fields if present:
                        </div>
                        <ul className="list-unstyled mb-0 small">
                          <li>
                            <strong>Purpose/Remark:</strong>{" "}
                            {detailRow.raw?.purpose || detailRow.raw?.remark || "-"}
                          </li>
                          <li>
                            <strong>Head/Type:</strong>{" "}
                            {detailRow.raw?.head || detailRow.raw?.type || "-"}
                          </li>
                          <li>
                            <strong>Created By:</strong>{" "}
                            {detailRow.raw?.createdBy || detailRow.raw?.user || "-"}
                          </li>
                          <li>
                            <strong>Approved By:</strong>{" "}
                            {detailRow.raw?.approvedBy || "-"}
                          </li>
                          <li>
                            <strong>Ref No:</strong>{" "}
                            {detailRow.raw?.refNo ||
                              detailRow.raw?.receiptNo ||
                              detailRow.raw?.docNo ||
                              "-"}
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-muted">No data</div>
                )}
              </div>

              {/* Footer */}
              <div className="modal-footer bg-light">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setDetailOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
