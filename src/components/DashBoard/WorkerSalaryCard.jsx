// src/components/DashBoard/WorkerSalaryCard.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";

/**
 WorkerSalaryCard
 - Reads EmployeeBioData and ExitEmployees from Realtime Firebase DB
 - Shows a single card (match InvestmentCard styles) with overall grand total
 - Modal:
    - dynamic years (only years with data)
    - clicking a year auto-selects an appropriate month (most recent; prefers filtered employee if set)
    - month pills
    - monthly table with columns: Photo, Employee ID, Employee Name, Employee Status, Type of Payment, Payment For, Receipt No, Salary Amount
    - monthly/yearly/overall totals, CSV export, print
 - Employee pills clickable to filter month/year
 - Defensive checks added to avoid undefined errors
*/

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

/* Extract payments from an employee record (robust to different field names) */
function extractPaymentsFromEmployeeRecord(employeeRecord, collectionPrefix = "") {
    const empId = employeeRecord.employeeId ?? employeeRecord.idNo ?? employeeRecord.id ?? employeeRecord.uid ?? "";
    const name =
        (employeeRecord.firstName && employeeRecord.lastName)
            ? `${employeeRecord.firstName} ${employeeRecord.lastName}`
            : employeeRecord.employeeName ?? employeeRecord.name ?? employeeRecord.displayName ?? "Unknown";
    const photo = employeeRecord.employeePhoto || employeeRecord.employeePhotoUrl || null;

    const paymentsArray = Array.isArray(employeeRecord.payments)
        ? employeeRecord.payments
        : (employeeRecord.payments && typeof employeeRecord.payments === "object" ? Object.values(employeeRecord.payments) : []);

    const results = [];

    if (paymentsArray && paymentsArray.length) {
        paymentsArray.forEach((p) => {
            if (!p) return;
            const amount = safeNumber(p.amount ?? p.salary ?? p.paidAmount ?? p.Amount ?? p.pay_amount ?? 0);
            const paymentFor = p.paymentFor ?? p.for ?? p.payment_of ?? "";
            const receiptNo = p.receiptNo ?? p.receipt_no ?? p.bookNo ?? p.bookno ?? "";
            const typeOfPayment = p.typeOfPayment ?? p.paymentMode ?? p.payment_type ?? p.mode ?? p.type ?? "";
            const dateRaw = p.date ?? p.pay_date ?? p.paymentDate ?? p.paidOn ?? p.createdAt ?? "";
            const date = dateRaw ? String(dateRaw) : "";

            results.push({
                sourceCollection: collectionPrefix || "",
                employeeId: String(empId || ""),
                employeeName: String(name || "Unknown"),
                employeePhoto: photo,
                amount,
                paymentFor: String(paymentFor || ""),
                receiptNo: String(receiptNo || ""),
                typeOfPayment: String(typeOfPayment || ""),
                date,
                raw: p,
            });
        });
    } else {
        const singleAmount = safeNumber(employeeRecord.amount ?? employeeRecord.salary ?? 0);
        if (singleAmount) {
            const dateRaw = employeeRecord.pay_date ?? employeeRecord.paymentDate ?? employeeRecord.date ?? "";
            results.push({
                sourceCollection: collectionPrefix || "",
                employeeId: String(empId || ""),
                employeeName: String(name || "Unknown"),
                employeePhoto: photo,
                amount: singleAmount,
                paymentFor: employeeRecord.paymentFor ?? "",
                receiptNo: employeeRecord.receiptNo ?? "",
                typeOfPayment: employeeRecord.typeOfPayment ?? "",
                date: dateRaw ? String(dateRaw) : "",
                raw: employeeRecord,
            });
        }
    }
    return results;
}

/* Group payments into { year: { name, months: { monthIndex: { name, rows: [] }}}} */
function groupPaymentsByYearMonth(payments) {
    const out = {};
    payments.forEach((p) => {
        let d = null;
        if (p.date) {
            const cand = new Date(p.date);
            if (!isNaN(cand)) d = cand;
            else {
                const tryIso = new Date(String(p.date));
                if (!isNaN(tryIso)) d = tryIso;
            }
        }
        if (!d && p.paymentFor) {
            const tryP = new Date(p.paymentFor);
            if (!isNaN(tryP)) d = tryP;
        }
        const year = d ? d.getFullYear() : null;
        const month = d ? d.getMonth() : null;

        if (year === null) {
            if (!out["unknown"]) out["unknown"] = { name: "Unknown", months: {} };
            out["unknown"].months["unknown"] = out["unknown"].months["unknown"] || { name: "Unknown", rows: [] };
            out["unknown"].months["unknown"].rows.push(p);
        } else {
            out[year] = out[year] || { name: String(year), months: {} };
            out[year].months[month] = out[year].months[month] || { name: d.toLocaleString("default", { month: "long" }), rows: [] };
            out[year].months[month].rows.push(p);
        }
    });
    return out;
}

/* Small SVG sparkline (uses currentColor) */
function Sparkline({ points = [], width = 120, height = 30 }) {
    if (!points || points.length === 0) return <div className="invest-sparkline" />;
    const max = Math.max(...points);
    const min = Math.min(...points);
    const range = max - min || 1;
    const stepX = width / (points.length - 1 || 1);
    const coords = points.map((v, i) => {
        const x = i * stepX;
        const y = height - ((v - min) / range) * height;
        return `${x},${y}`;
    }).join(" ");
    return (
        <svg className="invest-sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            <polyline fill="none" stroke="currentColor" strokeWidth="1.5" points={coords} />
        </svg>
    );
}

export default function WorkerSalaryCard() {
    const [allPayments, setAllPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [activeYear, setActiveYear] = useState(null);
    const [activeMonth, setActiveMonth] = useState(null);
    const [filterEmployee, setFilterEmployee] = useState(null);
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
                const combinedPayments = [];
                paths.forEach((p) => {
                    const node = snapshots[p] || {};
                    Object.keys(node).forEach((k) => {
                        const emp = node[k] || {};
                        const payments = extractPaymentsFromEmployeeRecord(emp, p);
                        payments.forEach((pm) => {
                            pm._employeeDbKey = `${p}/${k}`;
                            pm.sourceCollection = p;
                            combinedPayments.push(pm);
                        });
                    });
                });
                combinedPayments.sort((a, b) => {
                    const da = a.date ? new Date(a.date) : new Date(0);
                    const db = b.date ? new Date(b.date) : new Date(0);
                    return db - da;
                });
                setAllPayments(combinedPayments);
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
    }, []);

    const paymentsCount = useMemo(() => allPayments.length, [allPayments]);
    const grouped = useMemo(() => groupPaymentsByYearMonth(allPayments), [allPayments]);

    const yearsList = useMemo(() => {
        const yrs = Object.keys(grouped)
            .filter((k) => k !== "unknown")
            .map(Number)
            .filter((n) => !Number.isNaN(n))
            .sort((a, b) => b - a);
        return yrs;
    }, [grouped]);

    // most recent payment's year & month
    const mostRecentYearMonth = useMemo(() => {
        const withDate = allPayments
            .filter(p => p.date)
            .map(p => ({ d: new Date(p.date), p }))
            .filter(x => !isNaN(x.d));
        if (withDate.length === 0) return null;
        withDate.sort((a, b) => b.d - a.d);
        const d = withDate[0].d;
        return { year: d.getFullYear(), month: d.getMonth() };
    }, [allPayments]);

    // when modal opens, auto-select most recent year/month
    useEffect(() => {
        if (!modalOpen) return;
        if (mostRecentYearMonth) {
            setActiveYear(mostRecentYearMonth.year);
            setActiveMonth(mostRecentYearMonth.month);
        } else if (yearsList.length) {
            setActiveYear(yearsList[0]);
            const months = Object.keys(grouped[yearsList[0]]?.months || {}).map(Number).sort((a, b) => b - a);
            setActiveMonth(months.length ? months[0] : null);
        } else {
            setActiveYear(null);
            setActiveMonth(null);
        }
        setFilterEmployee(null);
    }, [modalOpen, mostRecentYearMonth, yearsList, grouped]);

    // handle year click: set year and auto-select most relevant month
    const handleYearClick = (y) => {
        setActiveYear(y);

        const monthsObj = grouped[y] && grouped[y].months ? grouped[y].months : null;
        if (!monthsObj) {
            setActiveMonth(null);
            return;
        }
        const monthKeys = Object.keys(monthsObj).map(Number).filter(n => !isNaN(n)).sort((a, b) => b - a);

        if (filterEmployee) {
            const empMonths = monthKeys.filter(m => (monthsObj[m].rows || []).some(r => (r.employeeId || r._employeeDbKey || "").toString() === filterEmployee.toString()));
            if (empMonths.length) {
                setActiveMonth(empMonths[0]);
                return;
            }
        }

        setActiveMonth(monthKeys.length ? monthKeys[0] : null);
    };

    const monthsForActiveYear = useMemo(() => {
        if (!activeYear || !grouped[activeYear]) return [];
        return Object.keys(grouped[activeYear].months).map(Number).sort((a, b) => a - b);
    }, [activeYear, grouped]);

    const currentMonthRows = useMemo(() => {
        if (!activeYear || activeMonth === null || activeMonth === undefined) return [];
        const monthObj = (grouped[activeYear] && grouped[activeYear].months && grouped[activeYear].months[activeMonth]) || null;
        if (!monthObj) return [];
        return filterEmployee ? monthObj.rows.filter(r => (r.employeeId || r._employeeDbKey || "").toString() === filterEmployee.toString()) : monthObj.rows;
    }, [grouped, activeYear, activeMonth, filterEmployee]);

    const currentYearRows = useMemo(() => {
        if (!activeYear || !grouped[activeYear]) return [];
        const months = grouped[activeYear].months || {};
        let rows = Object.keys(months).reduce((acc, k) => acc.concat(months[k].rows || []), []);
        if (filterEmployee) rows = rows.filter(r => (r.employeeId || r._employeeDbKey || "").toString() === filterEmployee.toString());
        return rows;
    }, [grouped, activeYear, filterEmployee]);

    const monthlyGrandTotal = useMemo(() => currentMonthRows.reduce((s, r) => s + Number(r.amount || 0), 0), [currentMonthRows]);
    const monthlyCount = useMemo(() => currentMonthRows.length, [currentMonthRows]);

    const yearlyGrandTotal = useMemo(() => currentYearRows.reduce((s, r) => s + Number(r.amount || 0), 0), [currentYearRows]);
    const yearlyCount = useMemo(() => currentYearRows.length, [currentYearRows]);

    const overallGrandTotal = useMemo(() => allPayments.reduce((s, p) => s + Number(p.amount || 0), 0), [allPayments]);

    const employeeTotals = useMemo(() => {
        const map = {};
        allPayments.forEach(p => {
            const key = p.employeeId || p._employeeDbKey || p.employeeName;
            if (!map[key]) map[key] = { name: p.employeeName, employeeId: p.employeeId, total: 0, photo: p.employeePhoto };
            map[key].total += Number(p.amount || 0);
        });
        return Object.keys(map).map(k => ({ key: k, ...map[k] })).sort((a, b) => b.total - a.total);
    }, [allPayments]);

    const sparkPoints = useMemo(() => {
        if (!activeYear || !grouped[activeYear]) return [];
        const months = grouped[activeYear].months || {};
        const pts = [];
        for (let m = 0; m < 12; m++) {
            const rows = months[m] ? months[m].rows : [];
            const sum = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
            pts.push(sum);
        }
        return pts;
    }, [grouped, activeYear]);

    const csvEscape = (s) => {
        if (s === null || s === undefined) return '""';
        return `"${String(s).replace(/"/g, '""')}"`;
    };
    const exportRowsToCSV = (rows, filename = "worker-salary.csv") => {
        const headers = ["#", "Date", "EmployeeID", "Employee", "TypeOfPayment", "PaymentFor", "ReceiptNo", "Amount"];
        const csv = [headers.join(",")].concat(rows.map((r, idx) =>
            [
                idx + 1,
                csvEscape(r.date),
                csvEscape(r.employeeId),
                csvEscape(r.employeeName),
                csvEscape(r.typeOfPayment),
                csvEscape(r.paymentFor),
                csvEscape(r.receiptNo),
                Number(r.amount || 0),
            ].join(",")
        )).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };
    const printView = (rows, title = "") => {
        const w = window.open("", "_blank");
        if (!w) return;
        const htmlRows = rows.map((r, idx) => `<tr>
      <td style="padding:6px;border:1px solid #ddd">${idx + 1}</td>
      <td style="padding:6px;border:1px solid #ddd">${r.date || "-"}</td>
      <td style="padding:6px;border:1px solid #ddd">${r.employeeId}</td>
      <td style="padding:6px;border:1px solid #ddd">${r.employeeName}</td>
      <td style="padding:6px;border:1px solid #ddd">${r.typeOfPayment}</td>
      <td style="padding:6px;border:1px solid #ddd">${r.paymentFor || (r.date ? new Date(r.date).toLocaleString("default", { month: "long", year: "numeric" }) : "-")}</td>
      <td style="padding:6px;border:1px solid #ddd">${r.receiptNo}</td>
      <td style="padding:6px;border:1px solid #ddd;text-align:right">${formatINR(r.amount)}</td>
    </tr>`).join("\n");

        const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f4f4f4}</style>
      </head><body><h2>${title}</h2><table><thead><tr><th>#</th><th>Date</th><th>EmployeeID</th><th>Employee</th><th>Type</th><th>Payment For</th><th>Receipt No</th><th>Amount</th></tr></thead><tbody>${htmlRows}</tbody></table></body></html>`;
        w.document.write(html);
        w.document.close();
        w.print();
    };

    // filter pill click: toggle filter and auto-select most recent month for that employee
    const onPillClick = (employeeKey) => {
        if (filterEmployee === employeeKey) setFilterEmployee(null);
        else setFilterEmployee(employeeKey);

        const rows = allPayments.filter(p => (p.employeeId || p._employeeDbKey || "").toString() === employeeKey.toString());
        const withDate = rows.map(r => ({ d: r.date ? new Date(r.date) : null, r })).filter(x => x.d && !isNaN(x.d));
        if (withDate.length) {
            withDate.sort((a, b) => b.d - a.d);
            setActiveYear(withDate[0].d.getFullYear());
            setActiveMonth(withDate[0].d.getMonth());
        }
    };

    const displayPaymentFor = (r) => {
        const parseToDate = (val) => {
            if (!val && val !== 0) return null;
            // If it's a number or numeric string (epoch milliseconds)
            if (typeof val === "number" || (/^\d+$/.test(String(val).trim()))) {
                const num = Number(val);
                const d = new Date(num);
                if (!isNaN(d)) return d;
            }
            // Try Date constructor (ISO, short, etc.)
            const d = new Date(String(val));
            if (!isNaN(d)) return d;
            return null;
        };

        // 1) Prefer explicit date field
        let d = parseToDate(r.date);
        // 2) Fallback to paymentFor if it contains a parseable date
        if (!d) d = parseToDate(r.paymentFor);

        if (d && !isNaN(d)) {
            const dd = String(d.getDate()).padStart(2, "0");
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const yyyy = d.getFullYear();
            return `${dd}/${mm}/${yyyy}`;
        }

        // 3) If paymentFor is present but not parseable, return it (keeps existing behaviour)
        if (r.paymentFor && String(r.paymentFor).trim()) return String(r.paymentFor);
        // 4) otherwise fallback
        return "-";
    };


    // default navigation to employee profile - change if you want modal instead
    const openEmployee = (employeeDbKey, employeeId) => {
        const encoded = encodeURIComponent(employeeId || employeeDbKey || "");
        window.location.href = `/employee-profile/${encoded}`;
    };

    // safe retrieval of month name
    const safeMonthName = (year, mIdx) => {
        if (!year || mIdx === null || mIdx === undefined) return "";
        const months = grouped[year]?.months || {};
        return months[mIdx]?.name ?? new Date(Number(year), Number(mIdx)).toLocaleString("default", { month: "long" });
    };

    return (
        <div className="invest-card worker-salary-card">
            <div className="invest-card__box" role="button" onClick={() => setModalOpen(true)}>
                <div className="invest-card__head">
                    <div className="invest-card__icon">👷</div>
                    <div className="invest-card__meta">
                        <div className="invest-card__label">Worker Salaries</div>
                        <div className="invest-card__total">{loading ? "Loading..." : formatINR(overallGrandTotal)}</div>
                        <div className="invest-card__small">{loading ? "" : `Payments: ${paymentsCount}`}</div>
                    </div>
                </div>

                <div className="invest-card__divider" /></div>

            {modalOpen && (
                <div className="invest-modal-backdrop" onClick={() => setModalOpen(false)}>
                    <div className="invest-modal-dialog" ref={modalRef} onClick={(e) => e.stopPropagation()}>
                        <div className="invest-modal-content">

                            <div className="invest-modal-investor-bar">
                                <div className="invest-modal-investor-bar__title">Worker Salary Report</div>

                                <button className="btn-close invest-modal-top-close btn-close-white" onClick={() => setModalOpen(false)} />
                            </div>

                            <div className="invest-modal-header">
                                <div className="invest-modal-sub">
                                    <div className="invest-modal-grand">
                                        <h5> Overall Grand Total: <strong>{formatINR(overallGrandTotal)}</strong></h5>
                                    </div>
                                    <div className="invest-modal-stats">
                                        <span>Payments: {paymentsCount}</span>
                                    </div>
                                    <div className="invest-modal-spark">
                                        <Sparkline points={sparkPoints} />
                                    </div>
                                </div>
                            </div>

                            <div className="invest-modal-body">

                                <ul className="nav nav-tabs invest-year-tabs">
                                    {yearsList.length === 0 ? <li className="nav-item"><span className="nav-link active">No Data</span></li> : yearsList.map((y) => (
                                        <li key={y} className="nav-item">
                                            <button className={`nav-link ${activeYear === y ? "active" : ""}`} onClick={() => handleYearClick(y)}>{y}</button>
                                        </li>
                                    ))}
                                </ul>

                                {activeYear && (
                                    <div className="invest-year-block">

                                        <ul className="nav nav-pills invest-month-pills">
                                            {(grouped[activeYear] ? Object.keys(grouped[activeYear].months).map(Number).sort((a, b) => a - b) : []).map((mIdx) => (
                                                <li key={mIdx} className="nav-item">
                                                    <button className={`nav-link ${activeMonth === mIdx ? "active" : ""}`} onClick={() => setActiveMonth(mIdx)}>
                                                        {safeMonthName(activeYear, mIdx)}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>

                                        <div className="invest-month-toolbar">
                                            <div />
                                            <div className="btn-group">
                                                <button className="btn btn-sm btn-outline-primary" onClick={() => exportRowsToCSV(currentMonthRows, `${activeYear}-${activeMonth ?? "all"}-worker-salary.csv`)} disabled={!activeMonth}>Export Month CSV</button>
                                                <button className="btn btn-sm btn-outline-secondary" onClick={() => printView(currentMonthRows, `Worker Salary - ${activeYear} - ${activeMonth ?? ""}`)} disabled={!activeMonth}>Print Month</button>
                                                <button className="btn btn-sm btn-outline-success" onClick={() => exportRowsToCSV(currentYearRows, `${activeYear}-worker-salary.csv`)} disabled={!activeYear}>Export Year CSV</button>
                                                <button className="btn btn-sm btn-outline-dark" onClick={() => printView(currentYearRows, `Worker Salary - ${activeYear}`)} disabled={!activeYear}>Print Year</button>
                                            </div>
                                        </div>

                                        {!activeMonth ? (
                                            <div className="alert alert-info">Select a month to view the monthly report</div>
                                        ) : (
                                            <div>
                                                <div className="month-heading">
                                                    <strong>{safeMonthName(activeYear, activeMonth)} {activeYear}</strong>
                                                    <div className="small text-muted">
                                                        {monthlyCount} payments • Month total: {formatINR(monthlyGrandTotal)}
                                                    </div>
                                                </div>

                                                <div className="table-responsive">
                                                    <table className="table table-sm table-hover invest-table">
                                                        <thead>
                                                            <tr>
                                                                <th>#</th>
                                                                <th>Photo</th>
                                                                <th>ID</th>
                                                                <th>Name</th>
                                                                <th>Status</th>
                                                                <th>Payment Type</th>
                                                                <th>Date</th>
                                                                <th>Receipt No</th>
                                                                <th className="text-end">Salary Amount</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {currentMonthRows.map((r, idx) => {
                                                                const statusLabel = (r.sourceCollection || "").toLowerCase().includes("exit") ? "Existing" : "Current";
                                                                return (
                                                                    <tr key={`${r._employeeDbKey || r.employeeId}_${idx}`} className="invest-table-row" onClick={() => openEmployee(r._employeeDbKey, r.employeeId)}>
                                                                        <td>{idx + 1}</td>
                                                                        <td>{r.employeePhoto ? <img src={r.employeePhoto} alt="photo" className="invest-photo" /> : <div className="invest-photo-placeholder" />}</td>
                                                                        <td>{r.employeeId || "-"}</td>
                                                                        <td>{r.employeeName}</td>
                                                                        <td>{statusLabel}</td>
                                                                        <td>{r.typeOfPayment || "-"}</td>
                                                                        <td>{displayPaymentFor(r)}</td>
                                                                        <td>{r.receiptNo || "-"}</td>
                                                                        <td className="text-end">{formatINR(r.amount)}</td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                        <tfoot>
                                                            <tr className="table-secondary">
                                                                <td colSpan={8}><strong>Month Subtotal ({monthlyCount} payments)</strong></td>
                                                                <td className="text-end"><strong>{formatINR(monthlyGrandTotal)}</strong></td>
                                                            </tr>
                                                        </tfoot>
                                                    </table>
                                                </div>

                                                <div className="year-totals mt-3">
                                                    <div className="year-total-item">
                                                        <div>Year Grand Total</div>
                                                        <div className="year-total-value">{formatINR(yearlyGrandTotal)}</div>
                                                    </div>
                                                    <div className="year-total-item">
                                                        <div>Year Count</div>
                                                        <div className="year-total-value">{yearlyCount}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="invest-modal-footer">
                                <div className="me-auto small text-muted">Overall Grand Total: {formatINR(overallGrandTotal)}</div>
                                <button className="btn btn-secondary btn-sm" onClick={() => setModalOpen(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
