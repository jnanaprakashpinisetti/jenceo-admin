// src/components/DashBoard/EnquiryCard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/* ---------------------- Firebase Loader (same as ResultsCard style) ---------------------- */
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

/* ---------------------- Utils ---------------------- */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseDateRobust(v) {
    if (!v && v !== 0) return null;
    try { if (v instanceof Date && !isNaN(v)) return v; } catch { }
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
    return null;
}
function classNames(...xs) { return xs.filter(Boolean).join(" "); }

/* ---------------------- Minimal SVG charts to match ResultsCard ---------------------- */
function BarChart({ data = [], width = 520, height = 160, pad = 28, colorId = "enqBar" }) {
    const max = Math.max(...data.map(d => d.value), 1);
    const barW = (width - pad * 2) / Math.max(1, data.length);
    return (
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            <defs>
                {/* gradients close to ResultsCard look, a touch brighter */}
                <linearGradient id="enqBar" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" /><stop offset="100%" stopColor="#0ea5e9" />
                </linearGradient>
                <linearGradient id="workerBar" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" /><stop offset="100%" stopColor="#6d28d9" />
                </linearGradient>
            </defs>
            <rect x="0" y="0" width={width} height={height} fill="transparent" />
            {data.map((d, i) => {
                const h = Math.max(2, (d.value / max) * (height - pad * 2));
                const x = pad + i * barW + 4;
                const y = height - pad - h;
                const w = Math.max(10, barW - 8);
                return (
                    <g key={i}>
                        <title>{d.label}: {d.value}</title>
                        <rect x={x} y={y} width={w} height={h} rx="6" fill={`url(#${colorId})`} />
                        {/* value inside vertically in yellow (like ResultsCard) */}
                        {h > 14 && (
                            <text
                                x={x + w / 2}
                                y={y + h / 2}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fontSize="10"
                                fontWeight="bold"
                                fill="#000"
                                transform={`rotate(-90 ${x + w / 2} ${y + h / 2})`}
                            >
                                {d.value}
                            </text>
                        )}
                        <text x={x + w / 2} y={height - 8} textAnchor="middle" fontSize="10" fill="#94a3b8">{d.short || d.label}</text>
                    </g>
                );
            })}
        </svg>
    );
}

function DonutChart({ segments = [], size = 160, stroke = 18, centerText = "Through" }) {
    const total = Math.max(1, segments.reduce((s, x) => s + (x.value || 0), 0));
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    let offset = 0;
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <defs>
                <linearGradient id="throughBlue" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#7dd3fc" /><stop offset="100%" stopColor="#0369a1" />
                </linearGradient>
                <linearGradient id="throughPurple" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#c4b5fd" /><stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
                <linearGradient id="throughAmber" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#fde68a" /><stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
                <linearGradient id="throughTeal" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#99f6e4" /><stop offset="100%" stopColor="#0d9488" />
                </linearGradient>
            </defs>
            <circle cx={size / 2} cy={size / 2} r={r} stroke="#0b1220" strokeWidth={stroke} fill="none" />
            {segments.map((s, i) => {
                const frac = (s.value || 0) / total;
                const len = c * frac;
                const dash = `${len} ${c - len}`;
                const dashoffset = c - offset;
                offset += len;
                return (
                    <circle key={i}
                        cx={size / 2} cy={size / 2} r={r}
                        stroke={s.color} strokeWidth={stroke} fill="none"
                        strokeDasharray={dash} strokeDashoffset={dashoffset}
                        strokeLinecap="round"
                    />
                );
            })}
            <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="13" fill="#e2e8f0">{centerText}</text>
        </svg>
    );
}

/* ---------------------- Component ---------------------- */
export default function EnquiryCard({
    title = "Enquiries & Worker Calls",
    enquiryCollection = "EnquiryData",
    workerCallCollection = "WorkerCallData",
}) {
    const [modalOpen, setModalOpen] = useState(false);
    const [tab, setTab] = useState("enquiries"); // "enquiries" | "workers"
    const [loading, setLoading] = useState(true);
    const [enquiries, setEnquiries] = useState([]);     // flat rows
    const [workers, setWorkers] = useState([]);         // flat rows
    const [activeYear, setActiveYear] = useState(new Date().getFullYear());
    const [activeMonth, setActiveMonth] = useState("ALL"); // 0..11 or "ALL"

    // table filters/pagination
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const modalRef = useRef(null);

    // row-details modal
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailRow, setDetailRow] = useState(null);

    // gradient card (request #2)
    const cardStyle = {
        background: "linear-gradient(135deg, rgba(14,165,233,0.15), rgba(99,102,241,0.15))",
        border: "1px solid #1f2937",
        color: "#e5e7eb",
        boxShadow: "0 8px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)"
    };

    /* -------- Firebase live attach (same style as ResultsCard) -------- */
    useEffect(() => {
        let mounted = true;
        const listeners = [];

        (async () => {
            const fdb = await importFirebaseDB();
            if (!fdb) { setLoading(false); return; }

            const snapshots = { enquiries: {}, workers: {} };

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
                    console.error("EnquiryCard attach error:", path, e);
                }
            };

            attach(enquiryCollection, "enquiries");
            attach(workerCallCollection, "workers");

            const rebuild = () => {
                const eList = [];
                Object.entries(snapshots.enquiries || {}).forEach(([id, v]) => eList.push({ id, ...(v || {}) }));

                // worker calls may be nested; flatten intelligently
                const wRows = [];
                const walk = (obj) => {
                    if (!obj || typeof obj !== "object") return;
                    Object.entries(obj).forEach(([k, v]) => {
                        if (v && typeof v === "object" && (v.name || v.mobileNo || v.callThrough || v.through || v.source || v.location)) {
                            wRows.push({ id: k, ...v });
                        } else if (v && typeof v === "object") {
                            walk(v);
                        }
                    });
                };
                walk(snapshots.workers || {});

                if (!mounted) return;
                setEnquiries(eList);
                setWorkers(wRows);
                setLoading(false);
            };
        })();

        return () => {
            mounted = false;
            try { listeners.forEach(({ ref, cb }) => ref.off("value", cb)); } catch { }
        };
    }, [enquiryCollection, workerCallCollection]);

    /* ---------------------- Year list ---------------------- */
    const years = useMemo(() => {
        const yset = new Set();
        const pickDate = (v) => parseDateRobust(v?.date || v?.createdAt || v?.reminderDate || v?.callReminderDate);
        (enquiries || []).forEach(e => { const d = pickDate(e); if (d) yset.add(d.getFullYear()); });
        (workers || []).forEach(w => { const d = pickDate(w); if (d) yset.add(d.getFullYear()); });
        const ys = Array.from(yset).sort((a, b) => a - b);
        return ys.length ? ys : [new Date().getFullYear()];
    }, [enquiries, workers]);

    useEffect(() => {
        if (!years.includes(activeYear)) setActiveYear(years[years.length - 1]);
    }, [years, activeYear]);

    /* ---------------------- Source normalization ---------------------- */
    const throughOptionsEnq = ["Poster", "Reference", "Hospital-Agent", "Medical Cover", "JustDial", "Facebook", "Instagram", "LinkedIn", "YouTube", "Website", "Google", "Other"];
    const throughOptionsWorker = ["Apana", "WorkerIndian", "Reference", "Poster", "Agent", "Facebook", "LinkedIn", "Instagram", "YouTube", "Website", "Just Dial", "News Paper", "Other"];

    const norm = (s) => {
        if (!s) return "Other";
        const x = String(s).trim().toLowerCase().replace(/\s+/g, "");
        const map = {
            poster: "Poster", reference: "Reference", hospitalagent: "Hospital-Agent", medicalcover: "Medical Cover",
            justdial: "JustDial", facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn", youtube: "YouTube",
            website: "Website", google: "Google", apna: "Apana", apana: "Apana", workerindian: "WorkerIndian",
            agent: "Agent", newspaper: "News Paper", "justdail": "Just Dial", "justdial": "Just Dial"
        };
        if (map[x]) return map[x];
        if (x.includes("just")) return "JustDial";
        if (x.includes("site") || x.includes("web")) return "Website";
        if (x.includes("link") && x.includes("in")) return "LinkedIn";
        if (x.includes("you") && x.includes("tube")) return "YouTube";
        return "Other";
    };

    /* ---------------------- Summaries ---------------------- */
    function buildMonthlyCount(list, year, isWorker = false) {
        const byMonth = Array.from({ length: 12 }, (_, i) => ({ label: MONTHS[i], short: MONTHS[i], value: 0 }));
        const byThrough = (isWorker ? throughOptionsWorker : throughOptionsEnq).reduce((acc, t) => { acc[t] = 0; return acc; }, {});
        list.forEach((it) => {
            const d = parseDateRobust(it?.date || it?.createdAt || it?.reminderDate || it?.callReminderDate);
            if (!d || d.getFullYear() !== year) return;
            byMonth[d.getMonth()].value += 1;
            const th = isWorker ? (it.callThrough || it.through || it.source) : it.through;
            const key = norm(th);
            if (byThrough[key] === undefined) byThrough["Other"] += 1;
            else byThrough[key] += 1;
        });
        const segments = Object.entries(byThrough).map(([k, v], i) => ({
            key: k, value: v,
            color: i % 4 === 0 ? "url(#throughBlue)" : i % 4 === 1 ? "url(#throughPurple)" : i % 4 === 2 ? "url(#throughAmber)" : "url(#throughTeal)"
        }));
        const total = byMonth.reduce((s, x) => s + x.value, 0);
        return { byMonth, segments, total };
    }

    const enqSummary = useMemo(() => buildMonthlyCount(enquiries, activeYear, false), [enquiries, activeYear]);
    const workerSummary = useMemo(() => buildMonthlyCount(workers, activeYear, true), [workers, activeYear]);
    const currentSummary = tab === "enquiries" ? enqSummary : workerSummary;

    /* ---------------------- Table data (search + month filter + pagination) ---------------------- */
    const tableRows = useMemo(() => {
        const list = tab === "enquiries" ? enquiries : workers;
        const filtered = list.filter((it) => {
            const hay = `${it.name || ""} ${it.mobile || it.mobileNo || ""} ${it.service || ""} ${it.location || ""}`.toLowerCase();
            return hay.includes(search.toLowerCase());
        });
        const monthFiltered = String(activeMonth) === "ALL" ? filtered : filtered.filter(it => {
            const d = parseDateRobust(it?.date || it?.createdAt || it?.reminderDate || it?.callReminderDate);
            return d && d.getFullYear() === activeYear && d.getMonth() === Number(activeMonth);
        });
        return monthFiltered.sort((a, b) => {
            const da = parseDateRobust(a?.date || a?.createdAt || a?.reminderDate || a?.callReminderDate);
            const db = parseDateRobust(b?.date || b?.createdAt || b?.reminderDate || b?.callReminderDate);
            return (db?.getTime() || 0) - (da?.getTime() || 0);
        });
    }, [tab, enquiries, workers, search, activeYear, activeMonth]);

    const totalEntries = tableRows.length;
    const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;
    const pageRows = tableRows.slice(start, start + pageSize);

    /* ---------------------- UI: Dashboard Card (click → modal) ---------------------- */
    return (
        <>
            <div className="col-12 mb-3">
                <div className="neo-card hover-rise p-3" role="button" onClick={() => setModalOpen(true)} style={cardStyle}>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <div className="tiny text-white-80 text-uppercase">{title}</div>
                            {/* request #1: show both counts on the card */}
                            <div className="d-flex gap-3 mt-1">
                                <div className="d-flex flex-column">
                                    <span className="tiny text-white-50">Enquiries ({activeYear})</span>
                                    <span className="h4 mb-0 fw-bold">{enqSummary.total}</span>
                                </div>
                                <div className="vr" />
                                <div className="d-flex flex-column">
                                    <span className="tiny text-white-50">Worker Calls ({activeYear})</span>
                                    <span className="h4 mb-0 fw-bold">{workerSummary.total}</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* MODAL */}
            {modalOpen && (
                <div className="modal fade show" style={{ display: "block", background: "rgba(2,6,23,0.9)", zIndex: 2000 }} onClick={() => setModalOpen(false)}>
                    <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" style={{ zIndex: 2001 }} onClick={(e) => e.stopPropagation()} ref={modalRef}>
                        <div className="modal-content overflow-hidden">
                            <div className="modal-header gradient-header text-white justify-content-between" style={{ position: "sticky", top: 0, zIndex: 2002, justfyContent: "sapceBetween" }}>
                                <h5 className="modal-title">Enquiries & Worker Calls</h5>
                                <button className="btn-close btn-close-white ms-2" onClick={() => setModalOpen(false)} />
                            </div>



                            <div className="modal-body bg-surface">
                                <div className="ms-auto text-center">{/* request #3: move tabs to right */}
                                    <div className="btn-group">
                                        <button className={classNames("btn btn-sm", tab === "enquiries" ? "btn-info text-dark" : "btn-outline-info")} onClick={() => setTab("enquiries")}>Enquiries</button>
                                        <button className={classNames("btn btn-sm", tab === "workers" ? "btn-info text-dark" : "btn-outline-info")} onClick={() => setTab("workers")}>Worker Calls</button>
                                    </div>
                                </div>
                                {/* Year & Month selectors & search */}
                                <div className="row g-3 align-items-end mb-3">
                                    <div className="col-md-2">
                                        <label className="form-label">Year</label>
                                        <select className="form-select" value={activeYear} onChange={e => setActiveYear(Number(e.target.value))}>
                                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-md-8">
                                        <label className="form-label">Month</label>
                                        <div className="d-flex flex-wrap gap-2 justify-content-between">
                                            <button className={classNames("btn btn-sm", String(activeMonth) === "ALL" ? "btn-warning" : "btn-outline-warning")} onClick={() => setActiveMonth("ALL")}>ALL</button>
                                            {MONTHS.map((m, i) => (
                                                <button key={m} className={classNames("btn btn-sm", Number(activeMonth) === i ? "btn-warning" : "btn-outline-warning")} onClick={() => setActiveMonth(i)}>{m}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="col-md-2 d-flex align-items-end">
                                        <input className="form-control ms-auto" placeholder="Search name/mobile/service..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                                    </div>
                                </div>

                                {/* Charts row */}
                                <div className="row g-3">
                                    <div className="col-lg-8">
                                        <div className="glass-card h-100">
                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                <div className="fw-semibold">{tab === "enquiries" ? "Monthly Enquiries" : "Monthly Worker Calls"} — {activeYear}</div>
                                                <span className="badge bg-primary">Total: {currentSummary.total}</span>
                                            </div>
                                            <BarChart data={currentSummary.byMonth} colorId={tab === "enquiries" ? "enqBar" : "workerBar"} />
                                        </div>
                                    </div>
                                    <div className="col-lg-4">
                                        <div className="glass-card h-100">
                                            <div className="fw-semibold mb-2">{tab === "enquiries" ? "Through (Enquiries)" : "Through (Worker Calls)"}</div>
                                            <div className="d-flex justify-content-center">
                                                <DonutChart segments={currentSummary.segments} centerText="Through" />
                                            </div>
                                            <div className="mt-3 tiny" style={{ maxHeight: 150, overflow: "auto" }}>
                                                {currentSummary.segments.filter(s => s.value > 0).map((s, i) => (
                                                    <div key={i} className="d-flex justify-content-between align-items-center mb-1">
                                                        <span><span className="legend-dot" style={{ background: s.color }}></span> <span className="ms-1">{s.key}</span></span>
                                                        <span className="text-warning fw-semibold">{s.value}</span>
                                                    </div>
                                                ))}
                                                {currentSummary.segments.every(s => !s.value) && <div className="text-muted">No data</div>}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ===== Table toolbar (request #4: move entries dropdown to top) ===== */}
                                <div className="d-flex flex-wrap justify-content-between align-items-center mt-4 mb-2">
                                    <div className="d-flex align-items-center gap-2">
                                        <span className="tiny text-muted">Show</span>
                                        <select className="form-select form-select-sm" value={pageSize} onChange={e => { setPageSize(parseInt(e.target.value, 10) || 10); setPage(1); }} style={{ width: 80 }}>
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
                                        <thead style={{ background: "linear-gradient(90deg,#0ea5e9,#6366f1)", color: "white" }}>
                                            <tr>
                                                <th style={{ width: 60 }}>#</th>
                                                <th>Name</th>
                                                <th>{tab === "enquiries" ? "Mobile" : "Mobile No"}</th>
                                                <th>{tab === "enquiries" ? "Service" : "Location"}</th>
                                                <th>{tab === "enquiries" ? "Through" : "Call Through"}</th>
                                                <th>Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pageRows.map((it, idx) => {
                                                const date = it.date || it.createdAt || it.reminderDate || it.callReminderDate;
                                                const d = parseDateRobust(date);
                                                const dt = d ? d.toLocaleDateString("en-GB") : "—";
                                                return (
                                                    <tr key={it.id || idx} onClick={() => { setDetailRow(it); setDetailOpen(true); }} style={{ cursor: "pointer" }}>
                                                        <td>{start + idx + 1}</td>
                                                        <td>{it.name || "-"}</td>
                                                        <td>{it.mobile || it.mobileNo || "-"}</td>
                                                        <td>{tab === "enquiries" ? (it.service || "-") : (it.location || "-")}</td>
                                                        <td>{tab === "enquiries" ? (it.through || "-") : (it.callThrough || it.through || it.source || "-")}</td>
                                                        <td>{dt}</td>
                                                    </tr>
                                                );
                                            })}
                                            {pageRows.length === 0 && (
                                                <tr><td colSpan={6} className="text-center text-muted py-4">No records</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination (request #5: keep bottom, themed) */}
                                <div className="d-flex flex-wrap align-items-center justify-content-center mt-2">
                                    <div>
                                        <nav style={{ backgroundColor: "transparent" }}>
                                            <ul className="pagination pagination-sm mb-0 ms-2">
                                                <li className={classNames("page-item", safePage === 1 && "disabled")}>
                                                    <button className="page-link" onClick={() => setPage(1)}>Previous</button>
                                                </li>
                                                <li className={classNames("page-item", safePage === 1 && "disabled")}>
                                                    <button className="page-link" onClick={() => setPage(safePage - 1)}>‹</button>
                                                </li>
                                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                    let startFrom = Math.max(1, safePage - 2);
                                                    let p = startFrom + i;
                                                    if (p > totalPages) p = totalPages - (Math.min(5, totalPages) - 1 - i);
                                                    return p;
                                                }).map(pn => (
                                                    <li key={pn} className={classNames("page-item", pn === safePage && "active")}>
                                                        <button className="page-link" onClick={() => setPage(pn)}>{pn}</button>
                                                    </li>
                                                ))}
                                                <li className={classNames("page-item", safePage === totalPages && "disabled")}>
                                                    <button className="page-link" onClick={() => setPage(safePage + 1)}>›</button>
                                                </li>
                                                <li className={classNames("page-item", safePage === totalPages && "disabled")}>
                                                    <button className="page-link" onClick={() => setPage(totalPages)}>Next</button>
                                                </li>
                                            </ul>
                                        </nav>
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

            {/* ===== Row Details Modal (request #6) ===== */}
            {detailOpen && (
                <div className="modal fade show" style={{ display: "block", background: "rgba(2,6,23,0.5)", zIndex: 2100 }} onClick={() => setDetailOpen(false)}>
                    <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-content">
                            <div className="modal-header" style={{ background: "linear-gradient(90deg,#0ea5e9,#6366f1)", color: "#fff" }}>
                                <h5 className="modal-title">{tab === "enquiries" ? "Enquiry Details" : "Worker Call Details"}</h5>
                                <button className="btn-close btn-close-white" onClick={() => setDetailOpen(false)} />
                            </div>
                            <div className="modal-body bg-white EnquiryDetails">
                                {detailRow ? (
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <div><strong>Name: </strong> {detailRow.name || "-"}</div>
                                            <div><strong>Mobile: </strong> {detailRow.mobile || detailRow.mobileNo || "-"}</div>
                                            <div><strong>{tab === "enquiries" ? "Service" : "Location"}:</strong> {tab === "enquiries" ? (detailRow.service || "-") : (detailRow.location || "-")}</div>

                                        </div>
                                        <div className="col-md-6">
                                            {(() => {
                                                const d = parseDateRobust(detailRow.date || detailRow.createdAt || detailRow.reminderDate || detailRow.callReminderDate);
                                                return <div><strong>Date: </strong> {d ? d.toLocaleString() : "—"}</div>;
                                            })()}
                                            <div><strong>{tab === "enquiries" ? "Through" : "Call Through"}: </strong> {tab === "enquiries" ? (detailRow.through || "-") : (detailRow.callThrough || detailRow.through || detailRow.source || "-")}</div>
                                            <div><strong>Notes: </strong> {detailRow.notes || detailRow.remark || detailRow.message || "-"}</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-muted">No data</div>
                                )}
                            </div>
                            <div className="modal-footer bg-light">
                                <button className="btn btn-secondary" onClick={() => setDetailOpen(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
