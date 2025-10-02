// src/components/DashBoard/WorkerSalaryCard.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";

/* ---------------- Helpers ---------------- */
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
    } catch (e) {
        return "\u20B9" + n.toLocaleString("en-IN");
    }
}

function parseDateRobust(v) {
    if (!v && v !== 0) return null;
    try {
        if (v instanceof Date && !isNaN(v)) return v;
    } catch { }
    const s = String(v).trim();
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

/* ---------------- SVG Charts ---------------- */
function BarChart({ data = [], width = 520, height = 150, pad = 30, color = "url(#gradWorker)" }) {
    const max = Math.max(...data.map(d => d.value), 1);
    const barW = (width - pad * 2) / (data.length || 1);
    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            <defs>
                <linearGradient id="gradWorker" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#b45309" />
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
                <linearGradient id="gradWorker" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#b45309" />
                </linearGradient>
                <linearGradient id="gradPayment" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
                <linearGradient id="gradClient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#047857" />
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

/* normalize employee record -> payment rows */
function extractPaymentsFromEmployeeRecord(employeeRecord = {}, collectionPrefix = "") {
    const empId = employeeRecord.employeeId ?? employeeRecord.idNo ?? employeeRecord.id ?? employeeRecord.uid ?? "";
    const name =
        (employeeRecord.firstName && employeeRecord.lastName)
            ? `${employeeRecord.firstName} ${employeeRecord.lastName}`
            : employeeRecord.employeeName ?? employeeRecord.name ?? employeeRecord.displayName ?? "Unknown";
    const photo = employeeRecord.employeePhoto || employeeRecord.employeePhotoUrl || employeeRecord.photo || null;

    // Extract work details
    const workDetails = Array.isArray(employeeRecord.workDetails)
        ? employeeRecord.workDetails
        : (employeeRecord.workDetails && typeof employeeRecord.workDetails === "object" ? Object.values(employeeRecord.workDetails) : []);

    const paymentsArray = Array.isArray(employeeRecord.payments)
        ? employeeRecord.payments
        : (employeeRecord.payments && typeof employeeRecord.payments === "object" ? Object.values(employeeRecord.payments) : []);

    const results = [];

    if (paymentsArray && paymentsArray.length) {
        paymentsArray.forEach((p, index) => {
            if (!p) return;
            // treat positive amounts as paid; ignore negatives (refunds removed)
            const paidAmount = safeNumber(p.amount ?? p.salary ?? p.paidAmount ?? p.Amount ?? p.pay_amount ?? 0);
            const paymentFor = p.paymentFor ?? p.for ?? p.payment_of ?? "";
            const receiptNo = p.receptNo ?? p.receiptNo ?? p.receipt_no ?? p.bookNo ?? p.bookno ?? p.recNo ?? p.refNo ?? p.invoiceNo ?? "";
            const typeOfPayment = p.typeOfPayment ?? p.paymentMode ?? p.payment_type ?? p.mode ?? p.type ?? "";
            const dateRaw = p.date ?? p.pay_date ?? p.paymentDate ?? p.paidOn ?? p.createdAt ?? "";
            const parsedDate = parseDateRobust(dateRaw);

            // Get corresponding work detail
            const workDetail = workDetails && workDetails.length > index ? workDetails[index] : {};
            const clientName = workDetail?.clientName || `${workDetail?.clientFirstName || ''} ${workDetail?.clientLastName || ''}`.trim() || "";
            const clientId = workDetail?.clientId || workDetail?.clientID || "";
            const location = workDetail?.location || "";
            const service = workDetail?.service || workDetail?.serviceName || "";

            results.push({
                sourceCollection: collectionPrefix || "",
                employeeId: String(empId || ""),
                employeeName: String(name || "Unknown"),
                employeePhoto: photo,
                paidAmount: paidAmount > 0 ? paidAmount : 0,
                paymentFor: String(paymentFor || ""),
                receiptNo: String(receiptNo || ""),
                typeOfPayment: String(typeOfPayment || ""),
                date: dateRaw ? String(dateRaw) : "",
                parsedDate,
                raw: p,
                workDetail: workDetail,
                clientName: clientName,
                clientId: clientId,
                location: location,
                service: service,
                _employeeDbKey: `${collectionPrefix}/${empId}`,
                _fullEmployeeData: employeeRecord // Store full employee data for detailed view
            });
        });
    } else {
        // fallback single fields
        const singlePaid = safeNumber(employeeRecord.amount ?? employeeRecord.salary ?? 0);
        const dateRaw = employeeRecord.pay_date ?? employeeRecord.paymentDate ?? employeeRecord.date ?? "";
        results.push({
            sourceCollection: collectionPrefix || "",
            employeeId: String(empId || ""),
            employeeName: String(name || "Unknown"),
            employeePhoto: photo,
            paidAmount: singlePaid > 0 ? singlePaid : 0,
            paymentFor: employeeRecord.paymentFor ?? "",
            receiptNo: employeeRecord.receptNo ?? employeeRecord.receiptNo ?? "",
            typeOfPayment: employeeRecord.typeOfPayment ?? "",
            date: dateRaw ? String(dateRaw) : "",
            parsedDate: parseDateRobust(dateRaw),
            raw: employeeRecord,
            workDetail: {},
            clientName: "",
            clientId: "",
            location: "",
            service: "",
            _employeeDbKey: `${collectionPrefix}/${empId}`,
            _fullEmployeeData: employeeRecord
        });
    }

    return results;
}

/* Group payments into years -> months (months as numbers 0..11 or 'Unknown') */
function groupPaymentsByYearMonth(payments = []) {
    const out = {};
    (payments || []).forEach((p) => {
        let d = p.parsedDate ?? null;
        if (!d && p.date) {
            const cand = parseDateRobust(p.date);
            if (cand) d = cand;
        }
        const year = d ? d.getFullYear() : "Unknown";
        const month = d ? d.getMonth() : "Unknown";
        const yKey = year;
        const mKey = month === "Unknown" ? "Unknown" : String(month);
        if (!out[yKey]) out[yKey] = { months: {}, totals: { paid: 0, count: 0 } };
        if (!out[yKey].months[mKey]) out[yKey].months[mKey] = { rows: [], totals: { paid: 0, count: 0 } };

        out[yKey].months[mKey].rows.push(p);
        out[yKey].months[mKey].totals.paid += Number(p.paidAmount || 0);
        out[yKey].months[mKey].totals.count += 1;

        out[yKey].totals.paid += Number(p.paidAmount || 0);
        out[yKey].totals.count += 1;
    });

    // sort keys (years descending, months ascending)
    const yearKeys = Object.keys(out).sort((a, b) => {
        if (a === "Unknown") return 1;
        if (b === "Unknown") return -1;
        return Number(b) - Number(a);
    });

    yearKeys.forEach(y => {
        const months = out[y].months;
        const mKeys = Object.keys(months).sort((a, b) => {
            if (a === "Unknown") return 1;
            if (b === "Unknown") return -1;
            return Number(a) - Number(b);
        });
        const sorted = {};
        mKeys.forEach(k => sorted[k] = months[k]);
        out[y].months = sorted;
    });

    return { years: out, yearKeys };
}

/* ---------------- Component ---------------- */
export default function WorkerSalaryCard() {
    const [allPayments, setAllPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [activeYear, setActiveYear] = useState(null);
    const [activeMonth, setActiveMonth] = useState(null); // "0".."11" or "Unknown"
    const [selectedWorker, setSelectedWorker] = useState(null);
    const [workerDetailModal, setWorkerDetailModal] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [showZeroRows, setShowZeroRows] = useState(false);
    const modalRef = useRef(null);

    useEffect(() => {
        let listeners = [];
        let mounted = true;

        (async () => {
            const fdb = await importFirebaseDB();
            if (!mounted) return;
            if (!fdb) {
                console.error("Realtime firebase DB not found - WorkerSalaryCard");
                setLoading(false);
                return;
            }

            const snapshots = {};
            const paths = ["EmployeeBioData", "ExitEmployees"];

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

            const rebuild = () => {
                const combined = [];
                paths.forEach(p => {
                    const node = snapshots[p] || {};
                    Object.keys(node).forEach(k => {
                        const emp = node[k] || {};
                        const payments = extractPaymentsFromEmployeeRecord(emp, p);
                        payments.forEach(pm => {
                            pm._employeeDbKey = `${p}/${k}`;
                            combined.push(pm);
                        });
                    });
                });

                combined.forEach(r => {
                    if (!r.parsedDate && r.date) r.parsedDate = parseDateRobust(r.date);
                });

                combined.sort((a, b) => (b.parsedDate?.getTime() || 0) - (a.parsedDate?.getTime() || 0));
                setAllPayments(combined);
                setLoading(false);
            };

            paths.forEach(attach);
        })();

        return () => {
            mounted = false;
            try { listeners.forEach(({ ref, cb }) => ref.off("value", cb)); } catch { }
        };
    }, []);

    const grouped = useMemo(() => groupPaymentsByYearMonth(allPayments), [allPayments]);
    const yearKeys = useMemo(() => grouped.yearKeys || [], [grouped]);

    // when modal opens pick defaults (most recent year/month)
    useEffect(() => {
        if (!modalOpen) return;
        if (!yearKeys.length) { setActiveYear(null); setActiveMonth(null); return; }
        const y = yearKeys[0];
        setActiveYear(prev => prev ?? y);

        // pick latest month for that year (prefer numeric months, latest)
        const months = Object.keys(grouped.years[y].months || {});
        const pick = months.slice().reverse().find(k => k !== "Unknown") || months[0];
        setActiveMonth(prev => prev ?? (pick === undefined ? null : pick));
    }, [modalOpen, yearKeys, grouped]);

    // helper: when user clicks a year we now auto-select that year's most recent month
    const handleYearSelect = (y) => {
        setActiveYear(y);
        const monthsObj = grouped.years?.[y]?.months || {};
        const months = Object.keys(monthsObj || []);
        if (!months.length) {
            setActiveMonth(null);
            return;
        }
        const pick = months.slice().reverse().find(k => k !== "Unknown") || months[0];
        setActiveMonth(pick === undefined ? null : pick);
    };

    // rows for current month/year
    const currentMonthRows = useMemo(() => {
        if (!activeYear || activeMonth === null || activeMonth === undefined) return [];
        const mObj = grouped.years?.[activeYear]?.months?.[String(activeMonth)];
        if (!mObj) return [];
        return mObj.rows.slice().sort((a, b) => (b.parsedDate?.getTime() || 0) - (a.parsedDate?.getTime() || 0));


    }, [activeYear, activeMonth, grouped]);
    // rows actually displayed in table (amount > 0 unless toggled)
    const displayRows = React.useMemo(() => {
        if (!currentMonthRows) return [];
        if (showZeroRows) return currentMonthRows;
        return currentMonthRows.filter(r => Number(r.paidAmount || 0) > 0);
    }, [currentMonthRows, showZeroRows]);
    // Pagination derived values for the month table
    const totalEntries = displayRows.length;
    const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
    const pageSafe = Math.min(Math.max(1, page), totalPages);
    const pageStart = (pageSafe - 1) * pageSize;
    const pageEnd = Math.min(pageStart + pageSize, totalEntries);
    const currentMonthRowsPage = useMemo(() => displayRows.slice(pageStart, pageEnd), [displayRows, pageStart, pageEnd]);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [totalPages]);


    const currentYearRows = useMemo(() => {
        if (!activeYear) return [];
        const months = grouped.years?.[activeYear]?.months || {};
        return Object.keys(months).reduce((acc, k) => acc.concat(months[k].rows || []), []).sort((a, b) => (b.parsedDate?.getTime() || 0) - (a.parsedDate?.getTime() || 0));
    }, [activeYear, grouped]);

    // totals: only paid
    const monthlyTotals = useMemo(() => {
        const paid = currentMonthRows.reduce((s, r) => s + Number(r.paidAmount || 0), 0);
        const count = currentMonthRows.length;
        return { paid, count };
    }, [currentMonthRows]);

    const yearlyTotals = useMemo(() => {
        const paid = currentYearRows.reduce((s, r) => s + Number(r.paidAmount || 0), 0);
        const count = currentYearRows.length;
        return { paid, count };
    }, [currentYearRows]);

    const overallTotals = useMemo(() => {
        const paid = allPayments.reduce((s, r) => s + Number(r.paidAmount || 0), 0);
        const count = allPayments.length;
        return { paid, count };
    }, [allPayments]);

    // Chart data for monthly payments
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

    // Payment type distribution for pie chart
    const paymentTypeDistribution = useMemo(() => {
        const types = {};
        currentMonthRows.forEach(payment => {
            const type = payment.typeOfPayment || "Unknown";
            types[type] = (types[type] || 0) + payment.paidAmount;
        });

        return Object.entries(types).map(([type, amount]) => ({
            key: type,
            value: amount,
            color: type === "Cash" ? "url(#gradWorker)" :
                type === "Bank" ? "url(#gradPayment)" :
                    "url(#gradClient)"
        }));
    }, [currentMonthRows]);

    // Worker distribution for pie chart
    const workerDistribution = useMemo(() => {
        const workers = {};
        currentMonthRows.forEach(payment => {
            const worker = payment.employeeName;
            workers[worker] = (workers[worker] || 0) + payment.paidAmount;
        });

        return Object.entries(workers)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5) // Top 5 workers
            .map(([worker, amount]) => ({
                key: worker,
                value: amount,
                color: "url(#gradWorker)"
            }));
    }, [currentMonthRows]);

    const safeMonthLabel = (y, mKey) => {
        if (mKey === "Unknown") return "Unknown";
        return new Date(Number(y), Number(mKey), 1).toLocaleString("default", { month: "long" });
    };

    const formatDateCell = (r) => {
        if (r.parsedDate) return r.parsedDate.toLocaleDateString();
        return r.date || "-";
    };

    // Function to get worker details for modal
    const getWorkerDetails = (worker) => {
        const details = [];

        details.push({ label: "Employee ID", value: worker.employeeId || "-" });
        details.push({ label: "Employee Name", value: worker.employeeName || "-" });
        details.push({ label: "Client Name", value: worker.clientName || "-" });
        details.push({ label: "Client ID", value: worker.clientId || "-" });
        details.push({ label: "Payment Type", value: worker.typeOfPayment || "-" });
        details.push({ label: "Date", value: formatDateCell(worker) });
        details.push({ label: "Receipt No", value: worker.receiptNo || "-" });
        details.push({ label: "Paid Amount", value: formatINR(worker.paidAmount) });
        details.push({ label: "Service", value: worker.service || "-" });
        details.push({ label: "Location", value: worker.days || "-" });
        details.push({ label: "Payment For", value: worker.paymentFor || "-" });
        details.push({ label: "Source", value: worker.sourceCollection || "-" });

        return details;
    };

    const handleRowClick = (worker) => {
        setSelectedWorker(worker);
        setWorkerDetailModal(true);
    };

    useEffect(() => {
        if (modalOpen) document.body.classList.add("modal-open");
        else document.body.classList.remove("modal-open");
        return () => document.body.classList.remove("modal-open");
    }, [modalOpen]);

    return (
        <div className="worker-salary-card">
            <div className="invest-card__box" role="button" onClick={() => setModalOpen(true)}>
                <div className="invest-card__head">
                    <div className="invest-card__icon">👷</div>
                    <div className="invest-card__meta">
                        <div className="invest-card__label">Worker Salaries</div>
                        <div className="invest-card__total">{loading ? "Loading..." : formatINR(overallTotals.paid)}</div>

                    </div>
                </div>

                <div className="invest-card__divider" />
                <div className="invest-card__small" style={{ paddingLeft: "20px" }}>{loading ? "" : `Payments: ${overallTotals.count}`}</div>
            </div>

            {modalOpen && (
                <div className="invest-modal-backdrop" onClick={() => setModalOpen(false)}>
                    <div className="invest-modal-dialog" ref={modalRef} onClick={(e) => e.stopPropagation()}>
                        <div className="invest-modal-content">
                            <div className="invest-modal-investor-bar">
                                <div className="invest-modal-investor-bar__title">Worker Salary Report</div>
                                <button className="btn-close invest-modal-top-close btn-close-white" onClick={() => setModalOpen(false)} />
                            </div>

                            <div className="invest-modal-body">
                                <div className="category-cards">
                                    <div className="header-gradient grad-paid">
                                        <div className="header-label">Overall (All Years)</div>
                                        <div className="header-value">{formatINR(overallTotals.paid)}</div>
                                        <div className="header-sub">{overallTotals.count} payments</div>
                                    </div>

                                    <div className="header-gradient grad-balance">
                                        <div className="header-label">Year-wise {activeYear ? `(${activeYear})` : ""}</div>
                                        <div className="header-value">{formatINR((yearlyTotals && activeYear) ? yearlyTotals.paid : 0)}</div>
                                        <div className="header-sub">{activeYear ? `${yearlyTotals.count} payments` : "select year"}</div>
                                    </div>

                                    <div className="header-gradient grad-pending">
                                        <div className="header-label">Month-wise {activeMonth !== null && activeMonth !== undefined ? `(${safeMonthLabel(activeYear, activeMonth)})` : ""}</div>
                                        <div className="header-value">{formatINR((monthlyTotals && activeMonth !== null && activeMonth !== undefined) ? monthlyTotals.paid : 0)}</div>
                                        <div className="header-sub">{(activeMonth !== null && activeMonth !== undefined) ? `${monthlyTotals.count} payments` : "select month"}</div>
                                    </div>
                                </div>

                                {/* Charts Section */}
                                {activeYear && activeMonth && currentMonthRows.length > 0 && (
                                    <div className="row g-3 mb-4">
                                        <div className="col-lg-8">
                                            <div className="glass-card p-3">
                                                <h6 className="mb-2">Monthly Salary Trend - {activeYear}</h6>
                                                <BarChart data={monthlyChartData} width={520} height={200} color="url(#gradWorker)" />
                                            </div>
                                        </div>
                                        <div className="col-lg-4">
                                            <div className="glass-card p-3">
                                                <h6 className="mb-2">Payment Type Distribution</h6>
                                                <div className="d-flex align-items-center justify-content-center">
                                                    <DonutChart
                                                        segments={paymentTypeDistribution}
                                                        size={150}
                                                        stroke={16}
                                                        title="Types"
                                                    />
                                                </div>
                                                <div className="mt-2 tiny">
                                                    {paymentTypeDistribution.map((s) => (
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
                                        <li className="nav-item"><span className="nav-link active">No Data</span></li>
                                    ) : yearKeys.map((y) => (
                                        <li key={y} className="nav-item">
                                            <button className={`nav-link ${activeYear === y ? "active" : ""}`} onClick={() => handleYearSelect(y)}>{y}</button>
                                        </li>
                                    ))}
                                </ul>

                                {activeYear && (
                                    <div className="invest-year-block">
                                        <ul className="nav nav-pills invest-month-pills mb-2">
                                            {(grouped.years?.[activeYear] ? Object.keys(grouped.years[activeYear].months).map(k => k) : []).map((mKey) => (
                                                <li key={mKey} className="nav-item">
                                                    <button className={`nav-link ${String(activeMonth) === String(mKey) ? "active" : ""}`} onClick={() => setActiveMonth(mKey)}>
                                                        {mKey === "Unknown" ? "Unknown" : new Date(Number(activeYear), Number(mKey), 1).toLocaleString("default", { month: "short" })}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>



                                        <div className="table-responsive">
                                            <table className="table table-sm table-hover invest-table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: 40 }}>#</th>
                                                        <th style={{ width: 56 }}>Photo</th>
                                                        <th>Employee ID</th>
                                                        <th>Employee Name</th>
                                                        <th>Client Name</th>
                                                        <th>Payment Type</th>
                                                        <th>Date</th>
                                                        <th>Receipt No</th>
                                                        <th className="text-end">Paid</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(!activeMonth || currentMonthRows.length === 0) && (
                                                        <tr><td colSpan={9} className="text-center small text-muted">No payments for selected month/year</td></tr>
                                                    )}
                                                    {currentMonthRowsPage.map((r, i) => (
                                                        <tr
                                                            key={`${r._employeeDbKey}_${i}`}
                                                            style={{ cursor: 'pointer' }}
                                                            onClick={() => handleRowClick(r)}
                                                        >
                                                            <td>{i + 1}</td>
                                                            <td>
                                                                {r.employeePhoto ? (
                                                                    <img src={r.employeePhoto} alt="photo" className="invest-photo" />
                                                                ) : (
                                                                    <div className="invest-photo-placeholder" />
                                                                )}
                                                            </td>
                                                            <td>{r.employeeId || "-"}</td>
                                                            <td>{r.employeeName || "-"}</td>
                                                            <td>{r.clientName || "-"}</td>
                                                            <td>{r.typeOfPayment || "-"}</td>
                                                            <td>{formatDateCell(r)}</td>
                                                            <td>{r.receiptNo || "-"}</td>
                                                            <td className="text-end">{formatINR(r.paidAmount)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="table-secondary">
                                                        <td colSpan={8} className="text-end"><strong>Monthly Subtotal</strong></td>
                                                        <td className="text-end"><strong>{formatINR(monthlyTotals.paid)}</strong></td>
                                                    </tr>
                                                    <tr className="table-secondary">
                                                        <td colSpan={8} className="text-end"><strong>Yearly Grand Total</strong></td>
                                                        <td className="text-end"><strong>{formatINR(yearlyTotals.paid)}</strong></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>

                                        <div className="d-flex justify-content-between align-items-center p-2 border-top">
                                            <div className="invest-month-toolbar d-flex justify-content-between align-items-center mb-3">

                                                <div className="d-flex align-items-center gap-3">
                                                    <div className="form-check form-switch ms-3">
                                                        <input className="form-check-input" type="checkbox" id="toggleZeroRows" checked={showZeroRows} onChange={(e) => { setShowZeroRows(e.target.checked); setPage(1); }} />
                                                        <label className="form-check-label tiny" htmlFor="toggleZeroRows">Show zero-amount rows</label>
                                                    </div>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <span className="tiny ">Show</span>
                                                        <select
                                                            className="form-select form-select-sm"
                                                            style={{ width: 90 }}
                                                            value={pageSize}
                                                            onChange={(e) => { setPageSize(Number(e.target.value) || 10); setPage(1); }}
                                                        >
                                                            {[10, 20, 30, 40, 50].map(sz => <option key={sz} value={sz}>{sz}</option>)}
                                                        </select>
                                                        <span className="tiny ">entries</span>
                                                    </div>
                                                    <div className="tiny ">
                                                        {totalEntries ? `Showing ${pageStart + 1} to ${pageEnd} of ${totalEntries} entries` : "No entries"}
                                                    </div>
                                                </div>
                                            </div>
                                            <nav style={{ backgroundColor: "transparent" }}>
                                                <ul className="pagination pagination-sm mb-0">
                                                    <li className={`page-item ${pageSafe <= 1 ? "disabled" : ""}`}>
                                                        <button className="page-link" onClick={() => pageSafe > 1 && setPage(pageSafe - 1)}>Prev</button>
                                                    </li>
                                                    {[...Array(totalPages)].map((_, idx) => {
                                                        const num = idx + 1;
                                                        const show = num === 1 || num === totalPages || (num >= pageSafe - 2 && num <= pageSafe + 2);
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

                                    </div>
                                )}

                            </div>

                            <div className="invest-modal-footer">
                                <div className="me-auto small text-muted">Overall Grand Total: {formatINR(overallTotals.paid)}</div>
                                <button className="btn btn-secondary btn-sm" onClick={() => setModalOpen(false)}>Close</button>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* Worker Detail Modal */}
            {workerDetailModal && selectedWorker && (
                <div className="modal fade show" style={{ display: "block", background: "rgba(2,6,23,0.6)", zIndex: 3000 }} onClick={() => setWorkerDetailModal(false)}>
                    <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()} style={{ zIndex: 3001 }}>
                        <div className="modal-content bg-white">
                            <div className="modal-header bg-warning text-white">
                                <h6 className="modal-title mb-0">Worker Payment Details</h6>
                                <button className="btn-close btn-close-white" onClick={() => setWorkerDetailModal(false)} />
                            </div>
                            <div className="modal-body">
                                <div className="row g-3">
                                    {/* Worker Photo and Basic Info */}
                                    <div className="col-12 mb-3">
                                        <div className="d-flex align-items-center gap-3">
                                            <div className="form-check form-switch ms-3">
                                                <input className="form-check-input" type="checkbox" id="toggleZeroRows" checked={showZeroRows} onChange={(e) => { setShowZeroRows(e.target.checked); setPage(1); }} />
                                                <label className="form-check-label tiny" htmlFor="toggleZeroRows">Show zero-amount rows</label>
                                            </div>
                                            {selectedWorker.employeePhoto ? (
                                                <img src={selectedWorker.employeePhoto} alt="Worker" className="rounded-circle" style={{ width: 80, height: 80, objectFit: 'cover' }} />
                                            ) : (
                                                <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center" style={{ width: 80, height: 80 }}>
                                                    <span className="text-white fs-4">👷</span>
                                                </div>
                                            )}
                                            <div>
                                                <h5 className="mb-1">{selectedWorker.employeeName}</h5>
                                                <p className="text-muted mb-0">ID: {selectedWorker.employeeId}</p>
                                            </div>
                                            <div className="ms-auto">
                                                <div className="fw-bold fs-4 text-success">
                                                    {formatINR(selectedWorker.paidAmount)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Worker Details */}
                                    {getWorkerDetails(selectedWorker).map((detail, idx) => (
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
                                <button className="btn btn-secondary" onClick={() => setWorkerDetailModal(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}