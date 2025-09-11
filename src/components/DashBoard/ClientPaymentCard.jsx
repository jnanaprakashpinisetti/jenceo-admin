// src/components/DashBoard/ClientPaymentCard.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";

/**
 ClientPaymentCard - header now shows overall totals (Paid / Balance / Refunds) with gradients
 Reads ClientData & ExitClients, groups by year/month, same UX as WorkerSalaryCard.
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
  } catch {
    return "\u20B9" + n.toLocaleString("en-IN");
  }
}

function parseDateRobust(v) {
  if (!v && v !== 0) return null;
  if (v instanceof Date && !isNaN(v)) return v;
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

function formatDDMMYYYY(v) {
  const d = parseDateRobust(v);
  if (!d) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function extractPaymentsFromClient(clientRecord, collectionName = "") {
  const clientId = clientRecord.idNo ?? clientRecord.id ?? clientRecord.clientId ?? clientRecord.key ?? "";
  const clientName = clientRecord.clientName ?? clientRecord.cName ?? clientRecord.name ?? clientRecord.client_name ?? "Unknown";
  const paymentsArr = Array.isArray(clientRecord.payments) ? clientRecord.payments
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
      results.push({
        sourceCollection: collectionName,
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
        parsedDate: parseDateRobust(date),
        raw: p
      });
    });
  } else {
    const singleAmount = safeNumber(clientRecord.paidAmount ?? clientRecord.amount ?? clientRecord.payment ?? 0);
    if (singleAmount) {
      const date = clientRecord.date ?? clientRecord.paymentDate ?? "";
      const travel = safeNumber(clientRecord.travel ?? clientRecord.travelCharges ?? 0);
      results.push({
        sourceCollection: collectionName,
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
        raw: clientRecord
      });
    }
  }
  return results;
}

function groupPaymentsByYearMonth(payments) {
  const years = {};
  payments.forEach((p) => {
    let year = p.parsedDate ? p.parsedDate.getFullYear() : null;
    let monthIdx = p.parsedDate ? p.parsedDate.getMonth() : null;
    if (!year || monthIdx === null || monthIdx === undefined) {
      const alt = parseDateRobust(p.date || p.raw?.paymentFor || "");
      if (alt) { year = alt.getFullYear(); monthIdx = alt.getMonth(); }
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

  yearKeys.forEach(y => {
    const months = years[y].months;
    const mKeys = Object.keys(months).sort((a, b) => {
      if (a === "Unknown") return 1;
      if (b === "Unknown") return -1;
      return Number(a) - Number(b);
    });
    const sorted = {};
    mKeys.forEach(k => sorted[k] = months[k]);
    years[y].months = sorted;
  });

  return { years, yearKeys };
}

function Sparkline({ points = [], width = 120, height = 30 }) {
  if (!points || points.length === 0) return <div className="invest-sparkline" />;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
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
  const [activeMonth, setActiveMonth] = useState(null);
  const [filterClient, setFilterClient] = useState(null);
  const modalRef = useRef(null);

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
            const client = node[k] || {};
            const payments = extractPaymentsFromClient(client, p);
            payments.forEach(pm => {
              pm._clientDbKey = `${p}/${k}`;
              pm.sourceCollection = p;
              combined.push(pm);
            });
          });
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
      try { listeners.forEach(({ ref, cb }) => ref.off("value", cb)); } catch { }
    };
  }, [clientCollections.active, clientCollections.exit]);

  const grouped = useMemo(() => groupPaymentsByYearMonth(allPayments), [allPayments]);
  const yearKeys = useMemo(() => grouped.yearKeys || [], [grouped]);

  const clientSummaries = useMemo(() => {
    const map = {};
    allPayments.forEach(p => {
      const id = p.clientId || "Unknown";
      const name = p.clientName || "Unknown";
      if (!map[id]) map[id] = { clientId: id, clientName: name, paid: 0, balance: 0, refunds: 0, count: 0 };
      map[id].paid += Number(p.paidAmount || 0);
      map[id].balance += Number(p.balance || 0);
      map[id].refunds += Number(p.refundAmount || 0);
      map[id].count += 1;
    });
    return Object.values(map).sort((a, b) => b.paid - a.paid);
  }, [allPayments]);

  const overallTotals = useMemo(() => {
    return allPayments.reduce((acc, p) => {
      acc.paid += Number(p.paidAmount || 0);
      acc.paidIncludingTravel = (acc.paidIncludingTravel || 0) + Number(p.totalForTotals || p.paidAmount || 0);
      acc.balance += Number(p.balance || 0);
      acc.refunds += Number(p.refundAmount || 0);
      acc.count += 1;
      if (Number(p.paidAmount || 0) === 0) acc.pendingCount += 1;
      return acc;
    }, { paid: 0, paidIncludingTravel: 0, balance: 0, refunds: 0, count: 0, pendingCount: 0 });
  }, [allPayments]);

  useEffect(() => {
    if (!modalOpen) return;
    if (!yearKeys.length) { setActiveYear(null); setActiveMonth(null); return; }
    const targetYear = yearKeys[0];
    setActiveYear(prev => prev || targetYear);

    const pickMonth = (y, clientId) => {
      const monthsObj = grouped.years?.[y]?.months || {};
      const keys = Object.keys(monthsObj);
      if (!keys.length) return null;
      if (clientId) {
        const cand = keys.slice().reverse().find(k => (monthsObj[k].rows || []).some(r => (r.clientId || "").toString() === (clientId || "").toString()));
        if (cand) return cand;
      }
      const cand2 = keys.slice().reverse().find(k => k !== "Unknown");
      return cand2 || keys[0];
    };

    const initialMonth = pickMonth(targetYear, filterClient);
    setActiveMonth(prev => prev || initialMonth);
  }, [modalOpen, yearKeys, grouped, filterClient]);

  useEffect(() => {
    if (!activeYear) return;
    const monthsObj = grouped.years?.[activeYear]?.months || {};
    const keys = Object.keys(monthsObj);
    if (!keys.length) { setActiveMonth(null); return; }
    if (filterClient) {
      const candidate = keys.slice().reverse().find(k => (monthsObj[k].rows || []).some(p => (p.clientId || "").toString() === (filterClient || "").toString()));
      if (candidate) { setActiveMonth(candidate); return; }
    }
    const cand = keys.slice().reverse().find(k => k !== "Unknown");
    setActiveMonth(cand || keys[0]);
  }, [activeYear, grouped, filterClient]);

  const currentMonthRows = useMemo(() => {
    if (!activeYear || !activeMonth) return [];
    const mObj = grouped.years?.[activeYear]?.months?.[activeMonth];
    if (!mObj) return [];
    let rows = mObj.rows || [];
    if (filterClient) rows = rows.filter(r => (r.clientId || "").toString() === (filterClient || "").toString());
    return rows.slice().sort((a, b) => {
      const da = a.parsedDate ? a.parsedDate.getTime() : 0;
      const db = b.parsedDate ? b.parsedDate.getTime() : 0;
      return db - da;
    });
  }, [activeYear, activeMonth, filterClient, grouped]);

  const currentYearRows = useMemo(() => {
    if (!activeYear) return [];
    const months = grouped.years?.[activeYear]?.months || {};
    let rows = Object.keys(months).reduce((acc, k) => acc.concat(months[k].rows || []), []);
    if (filterClient) rows = rows.filter(r => (r.clientId || "").toString() === (filterClient || "").toString());
    return rows;
  }, [activeYear, grouped, filterClient]);

  const monthlyTotals = useMemo(() => {
    const paid = currentMonthRows.reduce((s, r) => s + Number(r.paidAmount || 0), 0);
    const paidInclTravel = currentMonthRows.reduce((s, r) => s + Number(r.totalForTotals || r.paidAmount || 0), 0);
    const balance = currentMonthRows.reduce((s, r) => s + Number(r.balance || 0), 0);
    const refunds = currentMonthRows.reduce((s, r) => s + Number(r.refundAmount || 0), 0);
    const pending = currentMonthRows.reduce((s, r) => s + (Number(r.paidAmount || 0) === 0 ? 1 : 0), 0);
    return { paid, paidInclTravel, balance, refunds, pending, count: currentMonthRows.length };
  }, [currentMonthRows]);

  const yearlyTotals = useMemo(() => {
    const paid = currentYearRows.reduce((s, r) => s + Number(r.paidAmount || 0), 0);
    const paidInclTravel = currentYearRows.reduce((s, r) => s + Number(r.totalForTotals || r.paidAmount || 0), 0);
    const balance = currentYearRows.reduce((s, r) => s + Number(r.balance || 0), 0);
    const refunds = currentYearRows.reduce((s, r) => s + Number(r.refundAmount || 0), 0);
    const pending = currentYearRows.reduce((s, r) => s + (Number(r.paidAmount || 0) === 0 ? 1 : 0), 0);
    return { paid, paidInclTravel, balance, refunds, pending, count: currentYearRows.length };
  }, [currentYearRows]);

  const sparklinePoints = useMemo(() => {
    if (!activeYear) return new Array(12).fill(0);
    const months = grouped.years?.[activeYear]?.months || {};
    const pts = new Array(12).fill(0);
    Object.keys(months).forEach(k => {
      if (k === "Unknown") return;
      const idx = Number(k);
      if (idx >= 0 && idx < 12) {
        pts[idx] = months[k].rows.reduce((s, r) => s + Number(r.paidAmount || 0), 0);
      }
    });
    return pts;
  }, [activeYear, grouped]);

  const topClients = useMemo(() => clientSummaries.slice(0, 3), [clientSummaries]);

  const arrayToCSV = (rows) => rows.map(r => r.map(c => {
    if (c === null || c === undefined) return "";
    const s = String(c);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }).join(",")).join("\n");

  const exportCSV = (scope = "month") => {
    const rows = [["#", "Client ID", "Client Name", "Method", "Date", "Receipt No", "Payment", "Balance"]];
    if (scope === "month") {
      currentMonthRows.forEach((r, i) => rows.push([i + 1, r.clientId || "-", r.clientName || "-", r.method || "-", formatDDMMYYYY(r.date), r.receipt || "-", Number(r.totalForTotals || r.paidAmount || 0), Number(r.balance || 0)]));
    } else if (scope === "year") {
      let idx = 0;
      currentYearRows.forEach(r => rows.push([++idx, r.clientId || "-", r.clientName || "-", r.method || "-", formatDDMMYYYY(r.date), r.receipt || "-", Number(r.totalForTotals || r.paidAmount || 0), Number(r.balance || 0)]));
    } else {
      let idx = 0;
      allPayments.forEach(r => rows.push([++idx, r.clientId || "-", r.clientName || "-", r.method || "-", formatDDMMYYYY(r.date), r.receipt || "-", Number(r.totalForTotals || r.paidAmount || 0), Number(r.balance || 0)]));
    }
    const csv = arrayToCSV(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `client-payments-${scope}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const printScope = (scope = "month") => {
    let html = `<html><head><title>Client Payments ${scope}</title><style>body{font-family:Arial;font-size:12px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f4f4f4}</style></head><body>`;
    html += `<h3>Client Payments - ${scope}</h3><table><thead><tr><th>#</th><th>Client ID</th><th>Client Name</th><th>Method</th><th>Date</th><th>Receipt</th><th>Payment</th><th>Balance</th></tr></thead><tbody>`;
    if (scope === "month") {
      currentMonthRows.forEach((r, i) => html += `<tr><td>${i + 1}</td><td>${r.clientId || ""}</td><td>${r.clientName || ""}</td><td>${r.method || ""}</td><td>${formatDDMMYYYY(r.date)}</td><td>${r.receipt || ""}</td><td>${Number(r.totalForTotals || r.paidAmount || 0)}</td><td>${Number(r.balance || 0)}</td></tr>`);
    } else if (scope === "year") {
      currentYearRows.forEach((r, i) => html += `<tr><td>${i + 1}</td><td>${r.clientId || ""}</td><td>${r.clientName || ""}</td><td>${r.method || ""}</td><td>${formatDDMMYYYY(r.date)}</td><td>${r.receipt || ""}</td><td>${Number(r.totalForTotals || r.paidAmount || 0)}</td><td>${Number(r.balance || 0)}</td></tr>`);
    } else {
      allPayments.forEach((r, i) => html += `<tr><td>${i + 1}</td><td>${r.clientId || ""}</td><td>${r.clientName || ""}</td><td>${r.method || ""}</td><td>${formatDDMMYYYY(r.date)}</td><td>${r.receipt || ""}</td><td>${Number(r.totalForTotals || r.paidAmount || 0)}</td><td>${Number(r.balance || 0)}</td></tr>`);
    }
    html += `</tbody></table></body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html); w.document.close(); w.print();
  };

  const handleRowClick = (r) => {
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

  useEffect(() => {
    if (modalOpen) document.body.classList.add("modal-open");
    else document.body.classList.remove("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [modalOpen]);

  const hasRefundsThisMonth = useMemo(() => (currentMonthRows || []).some(r => Number(r.refundAmount || 0) > 0), [currentMonthRows]);
  const yearlyRefundTotal = useMemo(() => (yearlyTotals.refunds || 0), [yearlyTotals]);

  return (
    <>
      {/* small inline styles for gradients — you can move these into SCSS */}
      <style>{`
        .header-gradient { color: #fff; border-radius: .5rem; padding: 10px; min-width: 160px; }
        .grad-paid { background: linear-gradient(120deg, #2cb67d, #00b894); }
        .grad-balance { background: linear-gradient(120deg, #ffb454, #ff6b6b); }
        .grad-refund { background: linear-gradient(120deg, #6a82fb, #fc5c7d); }
        .invest-header-pill { box-shadow: 0 6px 18px rgba(0,0,0,0.12); border-radius: .5rem; overflow: hidden; }
        .invest-card { cursor: pointer; border-radius: .5rem; padding: 12px; background: #0b1220; color: #fff; }
        .invest-card__label { font-size: 13px; color: #cde3ff; }
        .invest-card__total { font-size: 20px; font-weight: 700; }
        .invest-modal-header { padding: 18px; border-bottom: 1px solid #e9ecef; }
        .invest-modal-content { width: 100%; max-width: 1200px; border-radius: 8px; overflow: hidden; }
        .invest-modal-body { padding: 18px; max-height: 70vh; overflow:auto; }
      `}</style>

      <div className="clinet-payment-card" onClick={() => setModalOpen(true)} role="button">
        <div className="invest-card__box" role="button">
          <div className="invest-card__head">
            <div >💳</div>
            <div className="invest-card__meta">
              <div className="invest-card__label">Client Payments</div>
              <div className="invest-card__total">{loading ? "Loading..." : formatINR(overallTotals.paidIncludingTravel || overallTotals.paid)}</div>
              <div className="invest-card__small">{loading ? "" : `Payments: ${overallTotals.count}`}</div>
            </div>
          </div>
          <div class="invest-card__divider"></div>
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

              <div className="invest-modal-header">

                  {/* Overall header cards (now show overall sums across all years) */}
                    <div className="header-gradient grad-paid">
                      <div style={{ fontSize: 12, opacity: 0.9 }}>Overall Paid</div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{formatINR(overallTotals.paidIncludingTravel ?? overallTotals.paid)}</div>
                      <div style={{ fontSize: 11, opacity: 0.85 }}>{overallTotals.count ?? 0} payments</div>
                    </div>

                    <div className="header-gradient grad-balance">
                      <div style={{ fontSize: 12, opacity: 0.9 }}>Overall Balance</div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{formatINR(overallTotals.balance)}</div>
                      <div style={{ fontSize: 11, opacity: 0.85 }}>across all years</div>
                    </div>

                    <div className="header-gradient grad-refund">
                      <div style={{ fontSize: 12, opacity: 0.9 }}>Overall Refunds</div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{formatINR(overallTotals.refunds)}</div>
                      <div style={{ fontSize: 11, opacity: 0.85 }}>across all years</div>
                    </div>
              </div>

              <div className="invest-modal-body">

                <ul className="nav nav-tabs invest-year-tabs">
                  {yearKeys.length === 0 ? <li className="nav-item"><span className="nav-link active">No Data</span></li>
                    : yearKeys.map((y) => (
                      <li key={y} className="nav-item">
                        <button className={`nav-link ${activeYear === y ? "active" : ""}`} onClick={() => { setActiveYear(y); setActiveMonth(null); }}>{y}</button>
                      </li>
                    ))
                  }
                </ul>

                <div className="mb-3 d-flex gap-2 flex-wrap mt-3">
                  <div className="invest-card invest-summary-card">
                    <div className="card-body py-2 px-3">
                      <div className="small text-muted">Paid (month)</div>
                      <div className="h5 mb-0">{formatINR(monthlyTotals.paidInclTravel ?? monthlyTotals.paid)}</div>
                      <div className="small text-muted">{monthlyTotals.count ?? 0} payments</div>
                    </div>
                  </div>

                  <div className="invest-card invest-summary-card">
                    <div className="card-body py-2 px-3">
                      <div className="small text-muted">Refunds (month)</div>
                      <div className="h5 mb-0">{formatINR(monthlyTotals.refunds)}</div>
                      <div className="small text-muted">Year total: {formatINR(yearlyRefundTotal)}</div>
                    </div>
                  </div>

                  <div className="invest-card invest-summary-card">
                    <div className="card-body py-2 px-3">
                      <div className="small text-muted">Balance (month)</div>
                      <div className="h5 mb-0">{formatINR(monthlyTotals.balance)}</div>
                      <div className="small text-muted">{monthlyTotals.count ?? 0} records</div>
                    </div>
                  </div>

                  <div className="invest-card invest-summary-card">
                    <div className="card-body py-2 px-3">
                      <div className="small text-muted">Pending (month)</div>
                      <div className="h5 mb-0">{monthlyTotals.pending ?? 0}</div>
                      <div className="small text-muted">items</div>
                    </div>
                  </div>
                </div>

                {activeYear && (
                  <div className="invest-year-block">
                    <ul className="nav nav-pills invest-month-pills mb-2">
                      {(grouped.years?.[activeYear] ? Object.keys(grouped.years[activeYear].months).map(k => k) : []).map((mk) => (
                        <li key={mk} className="nav-item">
                          <button className={`nav-link ${String(activeMonth) === String(mk) ? "active" : ""}`} onClick={() => setActiveMonth(mk)}>
                            {mk === "Unknown" ? "Unknown" : new Date(Number(activeYear), Number(mk), 1).toLocaleString("default", { month: "short" })}
                          </button>
                        </li>
                      ))}
                    </ul>

                    <div className="invest-month-toolbar d-flex justify-content-between align-items-center mb-3">
                      <div className="small text-center">
                        {activeMonth ? <>{new Date(Number(activeYear), Number(activeMonth), 1).toLocaleString("default", { month: "long" })} {activeYear}</> : "Select a month"}
                      </div>

                      <div className="btn-group ms-2">
                        <button className="btn btn-sm btn-outline-primary" onClick={() => exportCSV("month")} disabled={!activeMonth}>Export Month CSV</button>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => printScope("month")} disabled={!activeMonth}>Print Month</button>
                        <button className="btn btn-sm btn-outline-success" onClick={() => exportCSV("year")} disabled={!activeYear}>Export Year CSV</button>
                        <button className="btn btn-sm btn-outline-dark" onClick={() => printScope("year")} disabled={!activeYear}>Print Year</button>
                        <button className="btn btn-sm btn-outline-info" onClick={() => exportCSV("all")}>Export All CSV</button>
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-sm table-hover invest-table">
                        <thead>
                          <tr>
                            <th style={{ width: 40 }}>#</th>
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
                          {(!activeMonth || currentMonthRows.length === 0) && <tr><td colSpan={8} className="text-center small text-muted">No payments for selected month/year</td></tr>}
                          {currentMonthRows.map((r, i) => (
                            <tr key={`${r._clientDbKey}_${i}`} className="invest-table-row" style={{ cursor: "pointer" }} onClick={() => handleRowClick(r)}>
                              <td>{i + 1}</td>
                              <td>{r.clientId || "-"}</td>
                              <td>{r.clientName || "-"}</td>
                              <td>{r.method || "-"}</td>
                              <td>{formatDDMMYYYY(r.date)}</td>
                              <td>{r.receipt || "-"}</td>
                              <td className="text-end">{formatINR(r.totalForTotals ?? r.paidAmount ?? 0)}</td>
                              <td className="text-end">{formatINR(r.balance ?? 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="table-secondary">
                            <td colSpan={6} className="text-end"><strong>Monthly Subtotal</strong></td>
                            <td className="text-end"><strong>{formatINR(monthlyTotals.paidInclTravel ?? monthlyTotals.paid)}</strong></td>
                            <td className="text-end"><strong>{formatINR(monthlyTotals.balance)}</strong></td>
                          </tr>
                          <tr className="table-secondary">
                            <td colSpan={6} className="text-end"><strong>Yearly Grand Total</strong></td>
                            <td className="text-end"><strong>{formatINR(yearlyTotals.paidInclTravel ?? yearlyTotals.paid)}</strong></td>
                            <td className="text-end"><strong>{formatINR(yearlyTotals.balance)}</strong></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {hasRefundsThisMonth && (
                      <div className="mt-4">
                        <h6>Refunds (selected month)</h6>
                        <div className="table-responsive">
                          <table className="table table-sm table-hover invest-table">
                            <thead>
                              <tr>
                                <th>#</th><th>Client ID</th><th>Client Name</th><th>Date</th><th className="text-end">Refund</th><th>Method</th><th>Receipt</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentMonthRows.filter(r => Number(r.refundAmount || 0) > 0).map((r, i) => (
                                <tr key={`refund-${i}`}>
                                  <td>{i + 1}</td>
                                  <td>{r.clientId || "-"}</td>
                                  <td>{r.clientName || "-"}</td>
                                  <td>{formatDDMMYYYY(r.date)}</td>
                                  <td className="text-end">{formatINR(r.refundAmount)}</td>
                                  <td>{r.method || "-"}</td>
                                  <td>{r.receipt || "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr>
                                <th colSpan={4} className="text-end">Monthly Refund Total</th>
                                <th className="text-end">{formatINR((currentMonthRows || []).reduce((s, r) => s + Number(r.refundAmount || 0), 0))}</th>
                                <th colSpan={2}></th>
                              </tr>
                              <tr>
                                <th colSpan={4} className="text-end">Yearly Refund Total</th>
                                <th className="text-end">{formatINR(yearlyRefundTotal)}</th>
                                <th colSpan={2}></th>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 d-flex justify-content-between align-items-center">
                      <div className="small text-muted">Showing {currentMonthRows.length} payments</div>
                      <div>
                        <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => exportCSV("month")} disabled={!activeMonth}>CSV (month)</button>
                        <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => exportCSV("year")} disabled={!activeYear}>CSV (year)</button>
                        <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => exportCSV("all")}>CSV (all)</button>
                        <button className="btn btn-sm btn-primary" onClick={() => printScope("month")} disabled={!activeMonth}>Print</button>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              <div className="invest-modal-footer">
                <div className="me-auto small text-muted">Overall Grand Total: {formatINR(overallTotals.paidIncludingTravel || overallTotals.paid)}</div>
                <button className="btn btn-secondary btn-sm" onClick={() => setModalOpen(false)}>Close</button>
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
