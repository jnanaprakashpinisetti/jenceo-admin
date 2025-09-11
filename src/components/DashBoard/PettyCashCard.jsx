// src/components/DashBoard/PettyCashCard.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import PropTypes from "prop-types";
import firebaseDB from "../../firebase";
import { Transparency } from "react-bootstrap-icons";

/**
 * PettyCashCard.jsx
 *
 * - Reads from firebase path PettyCash/admin (and a few alternate paths)
 * - Shows a card with overall total
 * - Modal opens with:
 *    - dynamic year tabs (only years present)
 *    - matrix table: categories rows x Jan..Dec columns + Grand Total
 *    - click a row to expand a details table (entries) for selected year/month
 * - Export/Print
 * - Category badges, expansion, and per-category color mapping
 *
 * Notes:
 * - Inline styles are intentionally included for immediate visuals.
 *   If you'd like I can extract them to _pettycash.scss or _dashboard.scss.
 */

const MAIN_CATEGORIES = [
    "Food",
    "Office Maintenance",
    "Marketing",
    "Stationery",
    "Medical",
    "Welfare",
    "Assets",
];

const CATEGORY_COLORS = {
    Food: "#2ecc71",
    "Office Maintenance": "#3498db",
    Marketing: "#9b59b6",
    Stationery: "#f39c12",
    Medical: "#e74c3c",
    Welfare: "#16a085",
    Assets: "#7f8c8d",
    Others: "#95a5a6",
};

function safeNumber(v) {
    if (v === null || v === undefined || v === "") return 0;
    if (typeof v === "number") return v;
    const s = String(v).replace(/[^0-9.-]/g, "");
    const n = Number(s);
    return Number.isNaN(n) ? 0 : n;
}

function parseDateRobust(v) {
    if (!v && v !== 0) return null;
    if (v instanceof Date && !isNaN(v)) return v;
    const s = String(v).trim();
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

function formatINR(value) {
    const n = Number(value || 0);
    try {
        return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
    } catch {
        return "\u20B9" + n.toLocaleString("en-IN");
    }
}

function stringifyKey(k) {
    return k === undefined || k === null ? "Unknown" : String(k);
}

export default function PettyCashCard({ pettyCollection = "PettyCash" }) {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [activeYear, setActiveYear] = useState(null);
    const [expandedCategory, setExpandedCategory] = useState(null); // e.g. { category: 'Food', monthIndex: 8 } or null
    const modalRef = useRef(null);

    // Listen to PettyCash/admin and a couple of likely alternative paths
    useEffect(() => {
        let mounted = true;
        const listeners = [];

        const pathsToTry = [
            `${pettyCollection}/admin`,
            `${pettyCollection}`,
            `PettyCash/admin`,
            `PettyCash`,
            `Expenses/PettyCash`,
            `JenCeo-DataBase/PettyCash/admin`,
        ];

        const pathDataMap = {}; // path -> array

        const normalizeNode = (val) => {
            if (!val) return [];
            if (Array.isArray(val)) return val.map((v, i) => ({ id: v?.id ?? i, ...v }));
            if (typeof val === "object") {
                // if appears to be a single entry, return single
                const keys = Object.keys(val);
                const hasAmt = keys.some(k => ["amount", "total", "price", "value", "pettyAmount"].includes(k));
                const hasDate = keys.some(k => ["date", "pettyDate", "createdAt", "paymentDate"].includes(k));
                if (hasAmt && hasDate && keys.length > 2) {
                    return [{ id: val.id ?? "single", ...val }];
                }
                return Object.keys(val).map(k => ({ id: k, ...(val[k] || {}) }));
            }
            return [];
        };

        const rebuildCombined = () => {
            // flatten all entries from all paths
            const combined = Object.values(pathDataMap).flat();
            // Expand nested 'payments' inside each record (if present)
            const expanded = [];
            combined.forEach(row => {
                if (!row) return;
                if (row.payments && typeof row.payments === "object") {
                    const arr = Array.isArray(row.payments) ? row.payments : Object.values(row.payments);
                    arr.forEach(p => expanded.push({ ...p, __parentId: row.id, __origin: row.__origin }));
                } else {
                    expanded.push(row);
                }
            });

            // normalize each entry
            const normalized = expanded.map(r => {
                const dateRaw = r.date ?? r.pettyDate ?? r.paymentDate ?? r.createdAt ?? r.forDate ?? r.for;
                const amt = r.total ?? r.amount ?? r.pettyAmount ?? r.price ?? r.value ?? r.cost;
                const cat = r.mainCategory ?? r.category ?? r.type ?? r.subCategory ?? r.description ?? r.for ?? r.pettyFor ?? "Others";
                return {
                    id: r.id ?? r.__id ?? `${r.__origin || "o"}-${Math.random().toString(36).slice(2, 9)}`,
                    dateRaw,
                    dateParsed: parseDateRobust(dateRaw),
                    amountNum: safeNumber(amt),
                    categoryNormalized: typeof cat === "string" ? cat.trim() : String(cat || "Others"),
                    description: r.description ?? r.desc ?? r.comments ?? r.commentsText ?? "",
                    receipt: r.receiptNo ?? r.receptNo ?? r.receipt ?? r.ref ?? "",
                    raw: r,
                    __origin: r.__origin || r.__originPath || "",
                };
            });

            // sort newest first
            normalized.sort((a, b) => {
                const ta = a.dateParsed ? a.dateParsed.getTime() : 0;
                const tb = b.dateParsed ? b.dateParsed.getTime() : 0;
                return tb - ta;
            });

            setEntries(normalized);
            setLoading(false);
        };

        (async () => {
            try {
                const fdb = firebaseDB;
                if (!fdb) {
                    console.warn("PettyCashCard: firebaseDB not found.");
                    setLoading(false);
                    return;
                }

                pathsToTry.forEach(path => {
                    try {
                        const ref = typeof fdb.child === "function" ? fdb.child(path) : (fdb.ref ? fdb.ref(path) : null);
                        if (!ref) return;
                        const cb = snap => {
                            const val = snap.val();
                            const arr = normalizeNode(val).map(a => ({ ...a, __origin: path }));
                            pathDataMap[path] = arr;
                            rebuildCombined();
                        };
                        ref.on("value", cb);
                        listeners.push({ ref, cb, path });
                    } catch (err) {
                        console.error("PettyCashCard: attach error for", path, err);
                    }
                });

                // initial rebuild in case pathDataMap filled by other means (rare)
                rebuildCombined();
            } catch (err) {
                console.error("PettyCashCard: read error", err);
                setLoading(false);
            }
        })();

        return () => {
            mounted = false;
            try {
                listeners.forEach(({ ref, cb }) => { try { ref.off("value", cb); } catch (e) { } });
            } catch (e) { }
        };
    }, [pettyCollection]);

    // grouped by year -> monthIndex -> categories totals & entries
    const grouped = useMemo(() => {
        const years = {};
        entries.forEach(e => {
            const d = e.dateParsed;
            const year = d ? d.getFullYear() : "Unknown";
            const month = d ? d.getMonth() : "Unknown";
            // map category to MAIN_CATEGORIES or Others
            let catKey = "Others";
            if (e.categoryNormalized) {
                const found = MAIN_CATEGORIES.find(mc => String(e.categoryNormalized).toLowerCase().includes(String(mc).toLowerCase()));
                catKey = found || (MAIN_CATEGORIES.includes(e.categoryNormalized) ? e.categoryNormalized : "Others");
            }
            if (!years[year]) years[year] = { months: {}, total: 0, count: 0 };
            const y = years[year];
            const mk = month === "Unknown" ? "Unknown" : String(month);
            if (!y.months[mk]) y.months[mk] = { categories: {}, entries: [], total: 0, count: 0 };
            const m = y.months[mk];

            m.categories[catKey] = (m.categories[catKey] || 0) + Number(e.amountNum || 0);
            m.entries.push(e);
            m.total += Number(e.amountNum || 0);
            m.count += 1;

            y.total += Number(e.amountNum || 0);
            y.count += 1;
        });

        // sort years desc
        const yearKeys = Object.keys(years).sort((a, b) => {
            if (a === "Unknown") return 1;
            if (b === "Unknown") return -1;
            return Number(b) - Number(a);
        });

        // sort months inside each year ascending 0..11 + Unknown last
        yearKeys.forEach(y => {
            const monthsObj = years[y].months;
            const keys = Object.keys(monthsObj).sort((a, b) => {
                if (a === "Unknown") return 1;
                if (b === "Unknown") return -1;
                return Number(a) - Number(b);
            });
            const sorted = {};
            keys.forEach(k => sorted[k] = monthsObj[k]);
            years[y].months = sorted;
        });

        return { years, yearKeys };
    }, [entries]);

    // overall totals
    const overallTotals = useMemo(() => {
        return entries.reduce((acc, e) => {
            acc.total += Number(e.amountNum || 0);
            acc.count += 1;
            return acc;
        }, { total: 0, count: 0 });
    }, [entries]);

    // active year default when open
    useEffect(() => {
        if (!modalOpen) return;
        const keys = grouped.yearKeys || [];
        if (keys.length) setActiveYear(prev => prev || keys[0]);
        else setActiveYear(null);
    }, [modalOpen, grouped.yearKeys]);

    // year matrix rows (categories x months)
    const yearMatrix = useMemo(() => {
        if (!activeYear || !grouped.years[activeYear]) {
            const rows = [...MAIN_CATEGORIES, "Others"].map(cat => ({ category: cat, months: new Array(12).fill(0), grand: 0 }));
            return { rows, yearTotal: 0, yearCount: 0 };
        }
        const monthsObj = grouped.years[activeYear].months || {};
        const rows = [...MAIN_CATEGORIES, "Others"].map(cat => {
            const monthsArr = new Array(12).fill(0);
            for (let m = 0; m < 12; m++) {
                const key = String(m);
                monthsArr[m] = monthsObj[key] && monthsObj[key].categories && monthsObj[key].categories[cat] ? Number(monthsObj[key].categories[cat]) : 0;
            }
            const grand = monthsArr.reduce((s, v) => s + Number(v || 0), 0);
            return { category: cat, months: monthsArr, grand };
        });
        const yearTotal = rows.reduce((s, r) => s + r.grand, 0);
        const yearCount = Object.values(monthsObj).reduce((c, m) => c + (m.count || 0), 0);
        return { rows, yearTotal, yearCount };
    }, [activeYear, grouped]);

    // Expand category toggle
    const toggleExpand = (category, monthIndex = null) => {
        if (!category) { setExpandedCategory(null); return; }
        const key = `${category}::${monthIndex ?? "all"}`;
        if (expandedCategory && expandedCategory.key === key) {
            setExpandedCategory(null);
        } else {
            setExpandedCategory({ key, category, monthIndex });
        }
    };

    // fetch detailed rows for expanded category+month
    const expandedRows = useMemo(() => {
        if (!expandedCategory || !activeYear) return [];
        const monthsObj = grouped.years[activeYear]?.months || {};
        if (!monthsObj) return [];
        const mk = expandedCategory.monthIndex === null || expandedCategory.monthIndex === undefined ? null : String(expandedCategory.monthIndex);
        if (mk === null) {
            // collect all entries in year for category
            return Object.keys(monthsObj).flatMap(k => {
                const m = monthsObj[k];
                const cat = expandedCategory.category;
                return (m.entries || []).filter(e => {
                    const found = MAIN_CATEGORIES.find(mc => (e.categoryNormalized || "").toLowerCase().includes(mc.toLowerCase()));
                    const catKey = found || (MAIN_CATEGORIES.includes(e.categoryNormalized) ? e.categoryNormalized : "Others");
                    return catKey === cat;
                });
            }).sort((a, b) => (b.dateParsed?.getTime() || 0) - (a.dateParsed?.getTime() || 0));
        } else {
            const m = monthsObj[mk];
            if (!m) return [];
            const cat = expandedCategory.category;
            return (m.entries || []).filter(e => {
                const found = MAIN_CATEGORIES.find(mc => (e.categoryNormalized || "").toLowerCase().includes(mc.toLowerCase()));
                const catKey = found || (MAIN_CATEGORIES.includes(e.categoryNormalized) ? e.categoryNormalized : "Others");
                return catKey === cat;
            }).sort((a, b) => (b.dateParsed?.getTime() || 0) - (a.dateParsed?.getTime() || 0));
        }
    }, [expandedCategory, grouped, activeYear]);

    // CSV export for matrix or expanded details
    const exportMatrixCSV = (scope = "year") => {
        const rows = [];
        const header = ["S No", "Description", ...["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], "Grand Total"];
        rows.push(header);
        const rowsData = yearMatrix.rows.map((r, idx) => {
            return [idx + 1, r.category, ...r.months.map(mv => Number(mv || 0)), Number(r.grand || 0)];
        });
        rows.push(...rowsData);
        if (activeYear) rows.push([]);
        const csv = rows.map(r => r.map(c => {
            if (c === undefined || c === null) return "";
            const s = String(c);
            if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
            return s;
        }).join(",")).join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `pettycash-${activeYear || "all"}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const exportExpandedCSV = () => {
        if (!expandedRows || expandedRows.length === 0) return;
        const rows = [["#", "Date", "Category", "Description", "Amount", "Receipt", "Comments"]];
        expandedRows.forEach((r, i) => {
            const dt = r.dateParsed ? `${String(r.dateParsed.getDate()).padStart(2, "0")}/${String(r.dateParsed.getMonth() + 1).padStart(2, "0")}/${r.dateParsed.getFullYear()}` : (r.dateRaw || "-");
            rows.push([i + 1, dt, r.categoryNormalized || "-", r.description || "-", r.amountNum || 0, r.receipt || "-", (r.raw?.comments || r.raw?.remarks || "")]);
        });
        const csv = rows.map(r => r.map(c => {
            if (c === null || c === undefined) return "";
            const s = String(c);
            if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
            return s;
        }).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `pettycash-details-${expandedCategory?.category || "details"}-${activeYear || "all"}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    // print
    const printMatrix = () => {
        const y = activeYear || "All";
        let html = `<html><head><title>Petty Cash ${y}</title><style>body{font-family:Arial;font-size:12px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:center}th{background:#f7f7f7}</style></head><body>`;
        html += `<h3>Petty Cash - ${y}</h3><table><thead><tr><th>S No</th><th>Description</th>`;
        ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].forEach(m => html += `<th>${m}</th>`);
        html += `<th>Grand Total</th></tr></thead><tbody>`;
        yearMatrix.rows.forEach((r, idx) => {
            html += `<tr><td>${idx + 1}</td><td>${r.category}</td>`;
            r.months.forEach(v => html += `<td>${v || ""}</td>`);
            html += `<td>${r.grand}</td></tr>`;
        });
        html += `</tbody></table></body></html>`;
        const w = window.open("", "_blank");
        if (!w) return;
        w.document.write(html); w.document.close(); w.print();
    };

    useEffect(() => {
        if (modalOpen) document.body.classList.add("modal-open");
        else document.body.classList.remove("modal-open");
        return () => document.body.classList.remove("modal-open");
    }, [modalOpen]);

    /* ---------------- Render ---------------- */
    return (
        <>

            {/* Collapsed card */}
            <div className="petty-cash-card" onClick={() => setModalOpen(true)}>
                <div className="invest-card__box" role="button">
                    <div className="invest-card__head">
                        <div className="invest-card__icon">I</div>
                        <div className="invest-card__meta">
                            <div className="invest-card__label">Petty Cash</div>
                            <div className="invest-card__total">{loading ? "Loading..." : formatINR(overallTotals.total)}</div>
                            <div className="invest-card__small">Entries: {overallTotals.count}</div>
                        </div>
                    </div>
                    <div class="invest-card__divider"></div>
                </div>


            </div>

            {/* Modal */}
            {modalOpen && (
                <div className="invest-modal-backdrop" onClick={() => { setModalOpen(false); setExpandedCategory(null); }}>
                    <div className="invest-modal-dialog" ref={modalRef} onClick={(e) => e.stopPropagation()}>
                        <div className="invest-modal-content" style={{ backgroundColor: "#202c38" }}>
                            <div className="invest-modal-investor-bar bg-secondary text-white justify-content-between">
                                <div style={{ fontWeight: 700 }}>Petty Cash Report</div>
                                <div className="d-flex justify-content-between gap-3">
                                    <div className="petty-header-card grad-spent">
                                        <div style={{ fontSize: 12 }}>Overall Spent</div>
                                        <div style={{ fontWeight: 700 }}>{formatINR(overallTotals.total)}</div>
                                    </div>
                                    <div className="petty-header-card grad-count">
                                        <div style={{ fontSize: 12 }}>Entries</div>
                                        <div style={{ fontWeight: 700 }}>{overallTotals.count}</div>
                                    </div>
                                </div>
                                <div className="action-btn-wrapper">
                                    <button className="btn btn-sm btn-outline-warning" onClick={() => exportMatrixCSV("year")} disabled={!activeYear}>Export Year CSV</button>
                                    <button className="btn btn-sm btn-outline-warning" onClick={printMatrix}>Print</button>
                                    <button className="btn btn-sm btn-danger" onClick={() => { setModalOpen(false); setExpandedCategory(null); }}>Close</button>
                                </div>
                            </div>

                            <div className="invest-modal-body summary-tabs-container">
                                {/* Year tabs */}
                                <div className="mb-3">
                                    <ul className="nav nav-tabs summary-tabs">
                                        {grouped.yearKeys && grouped.yearKeys.length ? grouped.yearKeys.map(y => (
                                            <li className="nav-item" key={y}>
                                                <button className={`nav-link summary-tab ${String(activeYear) === String(y) ? "active" : ""}`} onClick={() => { setActiveYear(y); setExpandedCategory(null); }}>{y}</button>
                                            </li>
                                        )) : <li className="nav-item"><span className="nav-link active">No Data</span></li>}
                                    </ul>
                                </div>

                                {/* Matrix table */}
                                <div className="table-responsive summary-table-container">
                                    <table className="table table-dark summary-table table-hover">
                                        <thead>
                                            <tr>
                                                <th style={{ width: 60 }}>S No</th>
                                                <th style={{ minWidth: 220 }}>Description</th>
                                                {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                                                    <th key={m} style={{ width: 80 }}>{m}</th>
                                                ))}
                                                <th style={{ width: 120 }}>Grand Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {yearMatrix.rows.map((r, idx) => (
                                                <React.Fragment key={r.category}>
                                                    <tr className="summary-table-row" style={{ cursor: "pointer" }} onClick={() => toggleExpand(r.category, null)}>
                                                        <td style={{ textAlign: "left" }}>{idx + 1}</td>
                                                        <td style={{ textAlign: "left" }}>
                                                            <span
                                                                className="petty-cat-badge"
                                                            >
                                                                {r.category}
                                                            </span>
                                                        </td>
                                                        {r.months.map((val, mi) => (
                                                            <td key={mi} onClick={(e) => { e.stopPropagation(); toggleExpand(r.category, mi); }} style={{ cursor: "pointer" }}>
                                                                {val ? formatINR(val) : ""}
                                                            </td>
                                                        ))}
                                                        <td style={{ fontWeight: 700 }}>{formatINR(r.grand)}</td>
                                                    </tr>

                                                    {/* If expanded for this category (all months or specific month), render details below */}
                                                    {expandedCategory && expandedCategory.category === r.category && expandedCategory.monthIndex === null && (
                                                        <tr className="expand-row">
                                                            <td colSpan={15}>
                                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                                    <div><strong>Details for {r.category} — {activeYear}</strong></div>
                                                                    <div>
                                                                        <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => exportExpandedCSV()}>Export Details CSV</button>
                                                                        <button className="btn btn-sm btn-outline-secondary" onClick={() => setExpandedCategory(null)}>Close Details</button>
                                                                    </div>
                                                                </div>
                                                                <div className="table-responsive">
                                                                    <table className="table table-sm details-table">
                                                                        <thead>
                                                                            <tr>
                                                                                <th>#</th>
                                                                                <th>Date</th>
                                                                                <th>Description</th>
                                                                                <th>Amount</th>
                                                                                <th>Receipt</th>
                                                                                <th>Origin</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {expandedRows.map((er, ei) => (
                                                                                <tr key={er.id || ei}>
                                                                                    <td>{ei + 1}</td>
                                                                                    <td>{er.dateParsed ? `${String(er.dateParsed.getDate()).padStart(2, "0")}/${String(er.dateParsed.getMonth() + 1).padStart(2, "0")}/${er.dateParsed.getFullYear()}` : (er.dateRaw || "-")}</td>
                                                                                    <td style={{ maxWidth: 400, whiteSpace: "pre-wrap" }}>{er.description || er.raw?.description || "-"}</td>
                                                                                    <td>{formatINR(er.amountNum)}</td>
                                                                                    <td>{er.receipt || "-"}</td>
                                                                                    <td style={{ fontSize: 12 }}>{stringifyKey(er.__origin)}</td>
                                                                                </tr>
                                                                            ))}
                                                                            {expandedRows.length === 0 && (
                                                                                <tr><td colSpan={6} className="text-center small text-muted">No details for this selection</td></tr>
                                                                            )}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}

                                                    {/* if expanded for a specific month, show details for that month as separate block */}
                                                    {expandedCategory && expandedCategory.category === r.category && expandedCategory.monthIndex !== null && (() => {
                                                        const monthIdx = expandedCategory.monthIndex;
                                                        const monthKey = String(monthIdx);
                                                        const monthsObj = grouped.years[activeYear]?.months || {};
                                                        const monthEntries = monthsObj[monthKey] ? (monthsObj[monthKey].entries || []) : [];
                                                        const filtered = monthEntries.filter(e => {
                                                            const found = MAIN_CATEGORIES.find(mc => (e.categoryNormalized || "").toLowerCase().includes(mc.toLowerCase()));
                                                            const catKey = found || (MAIN_CATEGORIES.includes(e.categoryNormalized) ? e.categoryNormalized : "Others");
                                                            return catKey === r.category;
                                                        }).sort((a, b) => (b.dateParsed?.getTime() || 0) - (a.dateParsed?.getTime() || 0));
                                                        if (!filtered || filtered.length === 0) return null;
                                                        return (
                                                            <tr className="expand-row" key={`${r.category}-m-${monthIdx}`}>
                                                                <td colSpan={15}>
                                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                                        <div><strong>Details for {r.category} — {activeYear} • {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][monthIdx]}</strong></div>
                                                                        <div>
                                                                            <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => exportExpandedCSV()}>Export Details CSV</button>
                                                                            <button className="btn btn-sm btn-outline-secondary" onClick={() => setExpandedCategory(null)}>Close Details</button>
                                                                        </div>
                                                                    </div>
                                                                    <div className="table-responsive">
                                                                        <table className="table table-sm details-table">
                                                                            <thead>
                                                                                <tr>
                                                                                    <th>#</th>
                                                                                    <th>Date</th>
                                                                                    <th>Description</th>
                                                                                    <th>Amount</th>
                                                                                    <th>Receipt</th>
                                                                                    <th>Origin</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {filtered.map((er, ei) => (
                                                                                    <tr key={er.id || ei}>
                                                                                        <td>{ei + 1}</td>
                                                                                        <td>{er.dateParsed ? `${String(er.dateParsed.getDate()).padStart(2, "0")}/${String(er.dateParsed.getMonth() + 1).padStart(2, "0")}/${er.dateParsed.getFullYear()}` : (er.dateRaw || "-")}</td>
                                                                                        <td style={{ maxWidth: 400, whiteSpace: "pre-wrap" }}>{er.description || er.raw?.description || "-"}</td>
                                                                                        <td>{formatINR(er.amountNum)}</td>
                                                                                        <td>{er.receipt || "-"}</td>
                                                                                        <td style={{ fontSize: 12 }}>{stringifyKey(er.__origin)}</td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })()}

                                                </React.Fragment>
                                            ))}

                                        </tbody>
                                        <tfoot>
                                            <tr className="matrix-footer">
                                                <td colSpan={2} style={{ textAlign: "right" }}>Total</td>
                                                {(() => {
                                                    const totals = new Array(12).fill(0);
                                                    yearMatrix.rows.forEach(r => r.months.forEach((mv, i) => totals[i] += Number(mv || 0)));
                                                    return totals.map((t, idx) => <td key={idx}>{formatINR(t)}</td>);
                                                })()}
                                                <td>{formatINR(yearMatrix.yearTotal || 0)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                {/* Footer small note */}
                                <div className="mt-3 small text-muted">Matrix shows main category totals (monthly); click a category or month cell to view detailed petty cash entries.</div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

PettyCashCard.propTypes = {
    pettyCollection: PropTypes.string,
};
