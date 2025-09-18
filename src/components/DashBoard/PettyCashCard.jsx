// src/components/DashBoard/PettyCashCard.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import PropTypes from "prop-types";
import firebaseDB from "../../firebase";

/**
 * PettyCashCard.jsx - Updated classification logic for status detection
 * Added "Active" card which is grand total of Acknowledge + Pending + Clarification.
 */

const MAIN_CATEGORIES = [
    "Food",
    "Transport & Travel",
    "Office Maintenance",
    "Marketing",
    "Stationery",
    "Medical",
    "Welfare",
    "Assets",
];

const CATEGORY_COLORS = {
    Food: "#2ecc71",
    "Transport & Travel": "#1fb4e7",
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

/* category detection using keywords to reduce false Others classification */
function detectCategoryKey(rawCategory) {
    if (!rawCategory && rawCategory !== 0) return "Others";
    const s = String(rawCategory).toLowerCase();
    // mapping keywords for transport
    const mapping = {
        "Transport & Travel": ["transport", "travel", "petrol", "vehicle", "bus", "train", "taxi", "uber", "ola", "diesel", "trip"],
        Food: ["food", "tiffin", "meal", "lunch", "dinner", "snack", "grocer", "rice", "curd", "milk"],
        Marketing: ["marketing", "apana", "adds", "ads", "laminat", "print", "digital", "offline"],
        Stationery: ["book", "file", "paper", "stationery", "it accessory", "pen", "office equipment"],
        Medical: ["medical", "first aid", "tablet", "insurance"],
        Welfare: ["outing", "gift", "festival", "team", "welfare"],
        Assets: ["furniture", "electronics", "asset", "vehicle", "property", "investment", "software"],
        "Office Maintenance": ["rent", "electricity", "water", "internet", "mobile", "repair", "maintenance", "waste"],
    };

    // Exact match check
    for (const mc of MAIN_CATEGORIES) {
        if (s === mc.toLowerCase()) return mc;
    }

    // keyword match
    for (const [key, keywords] of Object.entries(mapping)) {
        if (keywords.some(k => s.includes(k))) return key;
    }

    // fallback: if rawCategory contains a known main category token, use it
    for (const mc of MAIN_CATEGORIES) {
        if (s.includes(mc.toLowerCase().split(" ")[0])) return mc;
    }

    return "Others";
}

/* Robust classifyStatus:
   - Explicitly checks common exact fields such as `approval` (string),
     nested `approval.status`, boolean `acknowledged` flags, numeric codes.
   - Returns one of: 'acknowledge', 'pending', 'clarification', 'reject', 'unknown'
*/
function classifyStatus(raw) {
    if (!raw) return "unknown";

    // helper to normalize a candidate into lowercase string
    const norm = (v) => {
        if (v === undefined || v === null) return "";
        if (typeof v === "boolean") return v ? "true" : "false";
        return String(v).trim();
    };

    // 1) Check most explicit/likely fields first (strings)
    const primaryCandidates = [
        norm(raw.approval), // common in PettyCashReport: "Pending"/"Approved"/"Rejected"
        norm(raw.approvalStatus),
        norm(raw.approval_state || raw.approvalState || (raw.approval && raw.approval.status) || ""),
        norm(raw.status),
        norm(raw.state),
        norm(raw.paymentStatus),
        norm(raw.action),
        norm(raw.statusText || raw.status_name || raw.statusValue),
    ].filter(Boolean);

    // direct string matches (handle capitalization)
    for (const s of primaryCandidates) {
        const low = s.toLowerCase();
        if (/(^approved$|^approve$|^accepted$|^approved by|^approved_by|^approved$|^acknowledge|^acknowledged|^confirmed$|^yes$)/i.test(low)) return "acknowledge";
        if (/(^pending$|^awaiting$|^inprogress$|^in-progress$|^in progress$|^todo$|^submitted$|^to be$|^waiting)/i.test(low)) return "pending";
        if (/(clarif|clarification|query|queries|need info|info required|more info|question|ask|asked)/i.test(low)) return "clarification";
        if (/(^rejected$|^reject$|^declined$|^decline$|^denied$)/i.test(low)) return "reject";
        // some apps use 'closed' or 'paid' to mean approved
        if (/(^closed$|^paid$|^completed$)/i.test(low)) return "acknowledge";
    }

    // 2) Check boolean flags (explicit ack booleans)
    const boolFields = ["acknowledged", "acknowledge", "isAcknowledged", "approved", "isApproved"];
    for (const f of boolFields) {
        if (f in raw) {
            const v = raw[f];
            if (v === true || String(v).toLowerCase() === "true") return "acknowledge";
            if (v === false || String(v).toLowerCase() === "false") return "pending";
        }
    }

    // 3) Check numeric codes (some systems use 1=approved, 0=pending, 2=rejected, 3=clarification)
    const numericCandidates = [raw.status, raw.state, raw.statusCode, raw.status_id, raw.code, raw.paymentStatus];
    for (const nc of numericCandidates) {
        if (nc === undefined || nc === null) continue;
        const n = Number(nc);
        if (!Number.isNaN(n)) {
            if (n === 1) return "acknowledge";
            if (n === 0) return "pending";
            if (n === 2) return "reject";
            if (n === 3) return "clarification";
            // ignore other numeric codes
        }
    }

    // 4) Deep nested checks: sometimes approval is nested object { status: 'Approved' } or { approval: { state: 'Pending' } }
    try {
        if (raw.approval && typeof raw.approval === "object") {
            const nested = raw.approval.status || raw.approval.state || raw.approval.name || raw.approval.value;
            if (nested) {
                const low = String(nested).toLowerCase();
                if (/(approved|approve|acknowledge|confirmed|paid)/i.test(low)) return "acknowledge";
                if (/(pending|awaiting|submitted|waiting)/i.test(low)) return "pending";
                if (/(clarif|clarification|query|question)/i.test(low)) return "clarification";
                if (/(reject|rejected|declined|denied)/i.test(low)) return "reject";
            }
        }
    } catch (err) {
        // ignore
    }

    // 5) Fallback token search across many fields for loose matches
    const allValues = Object.keys(raw).map(k => {
        try {
            const v = raw[k];
            if (v === undefined || v === null) return "";
            if (typeof v === "object") return JSON.stringify(v).toLowerCase();
            return String(v).toLowerCase();
        } catch (e) {
            return "";
        }
    }).join(" ");

    if (/(acknowledge|acknowledged|approved|accept|confirmed)/i.test(allValues)) return "acknowledge";
    if (/(pending|awaiting|inprogress|in progress|submitted|waiting)/i.test(allValues)) return "pending";
    if (/(clarif|clarification|query|queries|need info|more info)/i.test(allValues)) return "clarification";
    if (/(reject|rejected|decline|declined|denied)/i.test(allValues)) return "reject";

    return "unknown";
}

export default function PettyCashCard({ pettyCollection = "PettyCash" }) {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [activeYear, setActiveYear] = useState(null);
    const [expandedCategory, setExpandedCategory] = useState(null); // { key, category, monthIndex }
    const modalRef = useRef(null);

    // totals by status
    const [statusTotals, setStatusTotals] = useState({
        acknowledge: { total: 0, count: 0 },
        pending: { total: 0, count: 0 },
        clarification: { total: 0, count: 0 },
        reject: { total: 0, count: 0 },
        unknown: { total: 0, count: 0 },
    });

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

        const pathDataMap = {};

        const normalizeNode = (val) => {
            if (!val) return [];
            if (Array.isArray(val)) return val.map((v, i) => ({ id: v?.id ?? i, ...v }));
            if (typeof val === "object") {
                const keys = Object.keys(val);
                const hasAmt = keys.some(k => ["amount", "total", "price", "value", "pettyAmount", "cost"].includes(k));
                const hasDate = keys.some(k => ["date", "pettyDate", "createdAt", "paymentDate"].includes(k));
                if (hasAmt && hasDate && keys.length > 2) {
                    return [{ id: val.id ?? "single", ...val }];
                }
                return Object.keys(val).map(k => ({ id: k, ...(val[k] || {}) }));
            }
            return [];
        };

        const rebuildCombined = () => {
            const combined = Object.values(pathDataMap).flat();
            // expand nested payments if present
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

            const normalized = expanded.map(r => {
                const dateRaw = r.date ?? r.pettyDate ?? r.paymentDate ?? r.createdAt ?? r.forDate ?? r.for;
                // try to get total/amount intelligently
                const amt = r.total ?? r.amount ?? r.pettyAmount ?? r.price ?? r.value ?? r.cost ?? r.amountPaid ?? r.payment ?? 0;
                const cat =
                    r.mainCategory ??
                    r.category ??
                    r.type ??
                    r.subCategory ??
                    r.description ??
                    r.for ??
                    r.pettyFor ??
                    "Others";
                return {
                    id: r.id ?? r.__id ?? `${r.__origin || "o"}-${Math.random().toString(36).slice(2, 9)}`,
                    dateRaw,
                    dateParsed: parseDateRobust(dateRaw),
                    amountNum: safeNumber(amt),
                    categoryNormalized: typeof cat === "string" ? cat.trim() : String(cat || "Others"),
                    description: r.description ?? r.desc ?? r.comments ?? r.commentsText ?? r.note ?? "",
                    mainCategory: r.mainCategory ?? r.category ?? r.type ?? "",
                    subCategory: r.subCategory ?? r.subCat ?? r.subCategoryText ?? "",
                    quantity: r.quantity ?? r.qty ?? r.count ?? null,
                    price: r.price ?? r.unitPrice ?? null,
                    total: r.total ?? r.amount ?? r.price ?? null,
                    receipt: r.receiptNo ?? r.receptNo ?? r.receipt ?? r.ref ?? "",
                    raw: r,
                    __origin: r.__origin || r.__originPath || "",
                };
            });

            normalized.sort((a, b) => {
                const ta = a.dateParsed ? a.dateParsed.getTime() : 0;
                const tb = b.dateParsed ? b.dateParsed.getTime() : 0;
                return tb - ta;
            });

            setEntries(normalized);
            setLoading(false);

            // --- compute status totals (acknowledge / pending / clarification / reject)
            const statusAcc = {
                acknowledge: { total: 0, count: 0 },
                pending: { total: 0, count: 0 },
                clarification: { total: 0, count: 0 },
                reject: { total: 0, count: 0 },
                unknown: { total: 0, count: 0 },
            };

            normalized.forEach((rec) => {
                const st = classifyStatus(rec.raw);
                const amt = Number(rec.amountNum || 0);
                if (!statusAcc[st]) statusAcc[st] = { total: 0, count: 0 };
                statusAcc[st].total += amt;
                statusAcc[st].count += 1;
            });

            // Ensure numbers are rounded/converted
            Object.keys(statusAcc).forEach(k => {
                statusAcc[k].total = Number(statusAcc[k].total || 0);
                statusAcc[k].count = Number(statusAcc[k].count || 0);
            });

            setStatusTotals(statusAcc);

            // --- overall totals: prefer admin path data if provided (but only count acknowledged amounts)
            const adminPathCandidates = [
                `${pettyCollection}/admin`,
                `PettyCash/admin`,
                `JenCeo-DataBase/PettyCash/admin`,
            ];
            let foundAdminPath = null;
            for (const p of adminPathCandidates) {
                if (pathDataMap[p] && Array.isArray(pathDataMap[p])) {
                    foundAdminPath = p;
                    break;
                }
            }

            if (foundAdminPath) {
                try {
                    const adminRecords = pathDataMap[foundAdminPath] || [];
                    // compute sum but only for records that classify as acknowledge
                    const adminStatusAcc = { acknowledge: 0, count: 0 };
                    adminRecords.forEach(rec => {
                        const amt = safeNumber(rec.total ?? rec.price ?? rec.amount ?? rec.value ?? 0);
                        const st = classifyStatus(rec);
                        if (st === "acknowledge") {
                            adminStatusAcc.acknowledge += amt;
                            adminStatusAcc.count += 1;
                        }
                    });
                    setStatusTotals(prev => ({ ...prev, acknowledge: { total: adminStatusAcc.acknowledge, count: adminStatusAcc.count }, }));
                } catch (e) {
                    // fallback handled below
                }
            }

            // Note: The UI will show the separate status totals; the "card overall total" uses the acknowledged total:
            // setOverallTotals is represented by statusTotals.acknowledge when rendering.
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

                // initial attempt
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

    // grouped by year -> month -> categories totals & entries
    const grouped = useMemo(() => {
        const years = {};
        entries.forEach(e => {
            const d = e.dateParsed;
            const year = d ? d.getFullYear() : "Unknown";
            const month = d ? d.getMonth() : "Unknown";
            // detect category using heuristics
            const catKey = detectCategoryKey(e.categoryNormalized);
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

    // when modal opens set default year
    useEffect(() => {
        if (!modalOpen) return;
        const keys = grouped.yearKeys || [];
        if (keys.length) setActiveYear(prev => prev || keys[0]);
        else setActiveYear(null);
    }, [modalOpen, grouped.yearKeys]);

    // build year matrix (main categories + Others)
    const yearMatrix = useMemo(() => {
        const yearObj = (activeYear && grouped.years && grouped.years[activeYear]) ? grouped.years[activeYear] : null;
        const rows = [...MAIN_CATEGORIES, "Others"].map(cat => {
            // default months array
            const monthsArr = new Array(12).fill(0);
            if (yearObj) {
                for (let m = 0; m < 12; m++) {
                    const key = String(m);
                    monthsArr[m] = yearObj.months[key] && yearObj.months[key].categories && yearObj.months[key].categories[cat] ? Number(yearObj.months[key].categories[cat]) : 0;
                }
            }
            const grand = monthsArr.reduce((s, v) => s + Number(v || 0), 0);
            return { category: cat, months: monthsArr, grand };
        });
        const yearTotal = rows.reduce((s, r) => s + r.grand, 0);
        const yearCount = yearObj ? Object.values(yearObj.months).reduce((c, m) => c + (m.count || 0), 0) : 0;
        return { rows, yearTotal, yearCount };
    }, [activeYear, grouped]);

    const toggleExpand = (category, monthIndex = null) => {
        if (!category) { setExpandedCategory(null); return; }
        const key = `${category}::${monthIndex ?? "all"}`;
        if (expandedCategory && expandedCategory.key === key) {
            setExpandedCategory(null);
        } else {
            setExpandedCategory({ key, category, monthIndex });
        }
    };

    const expandedRows = useMemo(() => {
        if (!expandedCategory || !activeYear) return [];
        const monthsObj = grouped.years[activeYear]?.months || {};
        if (!monthsObj) return [];
        const mk = expandedCategory.monthIndex === null || expandedCategory.monthIndex === undefined ? null : String(expandedCategory.monthIndex);
        const cat = expandedCategory.category;

        const checkCatMatch = (e) => {
            const found = detectCategoryKey(e.categoryNormalized);
            return found === cat;
        };

        if (mk === null) {
            // all entries in year for category
            return Object.keys(monthsObj).flatMap(k => {
                const m = monthsObj[k];
                return (m.entries || []).filter(checkCatMatch);
            }).sort((a, b) => (b.dateParsed?.getTime() || 0) - (a.dateParsed?.getTime() || 0));
        } else {
            const m = monthsObj[mk];
            if (!m) return [];
            return (m.entries || []).filter(checkCatMatch).sort((a, b) => (b.dateParsed?.getTime() || 0) - (a.dateParsed?.getTime() || 0));
        }
    }, [expandedCategory, grouped, activeYear]);

    // CSV export for matrix
    const exportMatrixCSV = (scope = "year") => {
        const rows = [];
        const header = ["S No", "Category", ...["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], "Grand Total"];
        rows.push(header);
        const rowsData = yearMatrix.rows.map((r, idx) => [idx + 1, r.category, ...r.months.map(mv => Number(mv || 0)), Number(r.grand || 0)]);
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
        const rows = [["#", "Date", "Category", "SubCategory", "Description", "Qty", "Price", "Total", "Receipt", "Origin", "Status"]];
        expandedRows.forEach((r, i) => {
            const dt = r.dateParsed ? `${String(r.dateParsed.getDate()).padStart(2, "0")}/${String(r.dateParsed.getMonth() + 1).padStart(2, "0")}/${r.dateParsed.getFullYear()}` : (r.dateRaw || "-");
            const st = classifyStatus(r.raw);
            rows.push([
                i + 1,
                dt,
                r.mainCategory || detectCategoryKey(r.categoryNormalized) || "-",
                r.subCategory || "-",
                r.description || r.raw?.description || "-",
                r.quantity ?? "",
                r.price ?? "",
                r.total ?? r.amountNum ?? "",
                r.receipt || "-",
                stringifyKey(r.__origin),
                st,
            ]);
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

    const printMatrix = () => {
        const y = activeYear || "All";
        let html = `<html><head><title>Petty Cash ${y}</title><style>body{font-family:Arial;font-size:12px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:center}th{background:#f7f7f7}</style></head><body>`;
        html += `<h3>Petty Cash - ${y}</h3><table><thead><tr><th>S No</th><th>Category</th>`;
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

    // compute Active (Ack + Pending + Clarification) totals for display
    const activeTotal = (statusTotals.acknowledge?.total || 0) + (statusTotals.pending?.total || 0) + (statusTotals.clarification?.total || 0);
    const activeCount = (statusTotals.acknowledge?.count || 0) + (statusTotals.pending?.count || 0) + (statusTotals.clarification?.count || 0);

    /* ---------------- Render ---------------- */
    return (
        <>
            {/* Collapsed card */}
            <div className="petty-cash-card" onClick={() => setModalOpen(true)}>
                <div className="invest-card__box" role="button">
                    <div className="invest-card__head">
                        <div className="invest-card__icon">💸</div>
                        <div className="invest-card__meta">
                            <div className="invest-card__label">Petty Cash</div>
                            {/* overall total = acknowledged total */}
                            <div className="invest-card__total">{loading ? "Loading..." : formatINR(statusTotals.acknowledge?.total || 0)}</div>

                            {/* show small status totals inline */}
                            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>

                                {/* New Active card inline: Ack + Pending + Clarification */}
                                <div style={{ fontSize: 12, textAlign: "center", borderLeft: "1px solid rgba(255,255,255,0.06)", paddingLeft: 8 }}>
                                    <div style={{ fontSize: 11 }}>{activeCount} Entries</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="invest-card__divider" />
                </div>
            </div>

            {/* Modal */}
            {modalOpen && (
                <div className="invest-modal-backdrop" onClick={() => { setModalOpen(false); setExpandedCategory(null); }}>
                    <div className="invest-modal-dialog" ref={modalRef} onClick={(e) => e.stopPropagation()}>
                        <div className="invest-modal-content" style={{ backgroundColor: "#202c38" }}>
                            <div className="invest-modal-investor-bar bg-secondary text-white justify-content-between">
                                <div style={{ fontWeight: 700 }}>Petty Cash Report</div>
                                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                    {/* Active (Ack + Pending + Clarification) */}
                                    <div className="petty-header-card" style={{ background: "#0b84a8", padding: 10 }}>
                                        <div style={{ fontSize: 12 }}>Active (Ack+Pend+Clarify)</div>
                                        <div style={{ fontWeight: 700 }}>{formatINR(activeTotal)}</div>
                                        <div style={{ fontSize: 11 }}>{activeCount} entries</div>
                                    </div>

                                    {/* Four status cards */}
                                    <div className="petty-header-card" style={{ background: "#0b6b3a", padding: 10 }}>
                                        <div style={{ fontSize: 12 }}>Acknowledged</div>
                                        <div style={{ fontWeight: 700 }}>{formatINR(statusTotals.acknowledge?.total || 0)}</div>
                                        <div style={{ fontSize: 11 }}>{statusTotals.acknowledge?.count || 0} entries</div>
                                    </div>
                                    <div className="petty-header-card" style={{ background: "#6b5e00", padding: 10 }}>
                                        <div style={{ fontSize: 12 }}>Pending</div>
                                        <div style={{ fontWeight: 700 }}>{formatINR(statusTotals.pending?.total || 0)}</div>
                                        <div style={{ fontSize: 11 }}>{statusTotals.pending?.count || 0} entries</div>
                                    </div>
                                    <div className="petty-header-card" style={{ background: "#6b3a9b", padding: 10 }}>
                                        <div style={{ fontSize: 12 }}>Clarification</div>
                                        <div style={{ fontWeight: 700 }}>{formatINR(statusTotals.clarification?.total || 0)}</div>
                                        <div style={{ fontSize: 11 }}>{statusTotals.clarification?.count || 0} entries</div>
                                    </div>
                                    <div className="petty-header-card" style={{ background: "#8b2b2b", padding: 10 }}>
                                        <div style={{ fontSize: 12 }}>Rejected</div>
                                        <div style={{ fontWeight: 700 }}>{formatINR(statusTotals.reject?.total || 0)}</div>
                                        <div style={{ fontSize: 11 }}>{statusTotals.reject?.count || 0} entries</div>
                                    </div>
                                </div>

                                <div className="action-btn-wrapper">
                                    <button className="btn btn-sm btn-warning" onClick={() => exportMatrixCSV("year")} disabled={!activeYear}>Export Year CSV</button>
                                    <button className="btn btn-sm btn-warning" onClick={printMatrix}>Print</button>
                                    <button className="btn btn-sm btn-danger" onClick={() => { setModalOpen(false); setExpandedCategory(null); }}>Close</button>
                                </div>
                            </div>

                            <div className="invest-modal-body summary-tabs-container">
                                {/* Year tabs */}
                                <div className="mb-3">
                                    <ul className="nav nav-tabs summary-tabs">
                                        {grouped.yearKeys && grouped.yearKeys.length ? grouped.yearKeys.map(y => (
                                            <li className="nav-item" key={y}>
                                                <button
                                                    className={`nav-link summary-tab ${String(activeYear) === String(y) ? "active" : ""}`}
                                                    onClick={() => { setActiveYear(y); setExpandedCategory(null); }}
                                                >
                                                    {y}
                                                </button>
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
                                                <th style={{ minWidth: 220 }}>Category</th>
                                                {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                                                    <th key={m} style={{ width: 80 }}>{m}</th>
                                                ))}
                                                <th style={{ width: 120 }}>Grand Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {yearMatrix.rows.map((r, idx) => {
                                                const isActive = expandedCategory && expandedCategory.category === r.category;
                                                const rowClass = `summary-table-row ${isActive ? "summary-row-active" : ""}`;
                                                return (
                                                    <React.Fragment key={r.category}>
                                                        <tr className={rowClass} style={{ cursor: "pointer" }} onClick={() => toggleExpand(r.category, null)}>
                                                            <td style={{ textAlign: "left" }}>{idx + 1}</td>
                                                            <td style={{ textAlign: "left" }}>
                                                                <span className="petty-cat-badge">{r.category}</span>
                                                            </td>
                                                            {r.months.map((val, mi) => (
                                                                <td
                                                                    key={mi}
                                                                    onClick={(e) => { e.stopPropagation(); toggleExpand(r.category, mi); }}
                                                                    style={{ cursor: "pointer" }}
                                                                >
                                                                    {val ? formatINR(val) : ""}
                                                                </td>
                                                            ))}
                                                            <td style={{ fontWeight: 700 }}>{formatINR(r.grand)}</td>
                                                        </tr>

                                                        {/* Expanded all-year details */}
                                                        {expandedCategory && expandedCategory.category === r.category && (expandedCategory.monthIndex === null || expandedCategory.monthIndex === undefined) && (
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
                                                                        <table className="table table-sm details-table table-hover">
                                                                            <thead>
                                                                                <tr>
                                                                                    <th>#</th>
                                                                                    <th>Date</th>
                                                                                    <th>Category</th>
                                                                                    <th>SubCategory</th>
                                                                                    <th>Description</th>
                                                                                    <th>Qty</th>
                                                                                    <th>Price</th>
                                                                                    <th>Total</th>
                                                                                    <th>Receipt</th>
                                                                                    <th>Origin</th>
                                                                                    <th>Status</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {expandedRows.map((er, ei) => (
                                                                                    <tr key={er.id || ei}>
                                                                                        <td>{ei + 1}</td>
                                                                                        <td>{er.dateParsed ? `${String(er.dateParsed.getDate()).padStart(2, "0")}/${String(er.dateParsed.getMonth() + 1).padStart(2, "0")}/${er.dateParsed.getFullYear()}` : (er.dateRaw || "-")}</td>
                                                                                        <td>{er.mainCategory || detectCategoryKey(er.categoryNormalized)}</td>
                                                                                        <td>{er.subCategory || "-"}</td>
                                                                                        <td style={{ maxWidth: 400, whiteSpace: "pre-wrap" }}>{er.description || er.raw?.description || "-"}</td>
                                                                                        <td>{er.quantity ?? "-"}</td>
                                                                                        <td>{er.price ?? "-"}</td>
                                                                                        <td>{er.total ?? (er.amountNum ? formatINR(er.amountNum) : "-")}</td>
                                                                                        <td>{er.receipt || "-"}</td>
                                                                                        <td style={{ fontSize: 12 }}>{stringifyKey(er.__origin)}</td>
                                                                                        <td style={{ fontSize: 12 }}>{classifyStatus(er.raw)}</td>
                                                                                    </tr>
                                                                                ))}
                                                                                {expandedRows.length === 0 && (
                                                                                    <tr><td colSpan={11} className="text-center small text-muted">No details for this selection</td></tr>
                                                                                )}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}

                                                        {/* Expanded for specific month */}
                                                        {expandedCategory && expandedCategory.category === r.category && expandedCategory.monthIndex !== null && (() => {
                                                            const monthIdx = expandedCategory.monthIndex;
                                                            const monthKey = String(monthIdx);
                                                            const monthsObj = grouped.years[activeYear]?.months || {};
                                                            const monthEntries = monthsObj[monthKey] ? (monthsObj[monthKey].entries || []) : [];
                                                            const filtered = monthEntries.filter(e => detectCategoryKey(e.categoryNormalized) === r.category).sort((a, b) => (b.dateParsed?.getTime() || 0) - (a.dateParsed?.getTime() || 0));
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
                                                                                        <th>Category</th>
                                                                                        <th>SubCategory</th>
                                                                                        <th>Description</th>
                                                                                        <th>Qty</th>
                                                                                        <th>Price</th>
                                                                                        <th>Total</th>
                                                                                        <th>Receipt</th>
                                                                                        <th>Origin</th>
                                                                                        <th>Status</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {filtered.map((er, ei) => (
                                                                                        <tr key={er.id || ei}>
                                                                                            <td>{ei + 1}</td>
                                                                                            <td>{er.dateParsed ? `${String(er.dateParsed.getDate()).padStart(2, "0")}/${String(er.dateParsed.getMonth() + 1).padStart(2, "0")}/${er.dateParsed.getFullYear()}` : (er.dateRaw || "-")}</td>
                                                                                            <td>{er.mainCategory || detectCategoryKey(er.categoryNormalized)}</td>
                                                                                            <td>{er.subCategory || "-"}</td>
                                                                                            <td style={{ maxWidth: 400, whiteSpace: "pre-wrap" }}>{er.description || er.raw?.description || "-"}</td>
                                                                                            <td>{er.quantity ?? "-"}</td>
                                                                                            <td>{er.price ?? "-"}</td>
                                                                                            <td>{er.total ?? (er.amountNum ? formatINR(er.amountNum) : "-")}</td>
                                                                                            <td>{er.receipt || "-"}</td>
                                                                                            <td style={{ fontSize: 12 }}>{stringifyKey(er.__origin)}</td>
                                                                                            <td style={{ fontSize: 12 }}>{classifyStatus(er.raw)}</td>
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
                                                );
                                            })}

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

                                <div className="mt-3 small text-muted">Matrix shows main category totals (monthly); click a category or month cell to view detailed petty cash entries. Status totals (Ack/Pending/Clarify/Reject) are shown at the top — only <strong>Acknowledged</strong> amounts are added to the main card total.</div>
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
