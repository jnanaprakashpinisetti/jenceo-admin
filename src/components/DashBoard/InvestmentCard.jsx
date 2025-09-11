// src/components/DashBoard/InvestmentCard.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import PropTypes from "prop-types";

/* Helper: try to import your Realtime DB export (firebase default or firebaseDB) */
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
  return null;
}

/* normalize record shape */
function normalizeInvestmentRecord(key, it) {
  const investor = String(it.investor ?? it.name ?? it.Investor ?? "Unknown");
  const invest_date = String(it.invest_date ?? it.date ?? it.InvestDate ?? "");
  const invest_amount = Number(isNaN(Number(it.invest_amount ?? it.amount ?? it.Amount ?? 0)) ? 0 : Number(it.invest_amount ?? it.amount ?? it.Amount ?? 0));
  const invest_to = String(it.invest_to ?? it.to ?? it.InvestTo ?? "");
  const invest_reference = String(it.invest_reference ?? it.refNo ?? it.ref ?? it.Reference ?? "");
  const invest_purpose = String(it.invest_purpose ?? it.purpose ?? it.Purpose ?? "");
  const comments = String(it.invest_comments ?? it.comments ?? it.Comments ?? "");
  const rawAck = String(it.acknowledge ?? it.ack ?? it.Acknowledge ?? it.status ?? "Pending").trim();
  const ack = (rawAck || "Pending").toLowerCase();
  let acknowledge = "Pending";
  if (ack.includes("ack")) acknowledge = "Acknowledge";
  else if (ack.includes("clar") || ack.includes("clarification")) acknowledge = "Clarification";
  else if (ack.includes("rej")) acknowledge = "Reject";
  else if (ack.includes("pend")) acknowledge = "Pending";
  else acknowledge = rawAck[0] ? rawAck : "Pending";

  return {
    id: key,
    investor,
    invest_date,
    invest_amount,
    invest_to,
    invest_reference,
    invest_purpose,
    comments,
    acknowledge,
    _raw: it,
  };
}

/* Robust INR formatting */
function formatINR(value) {
  const n = Number(value || 0);
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
  } catch (e) {
    return "\u20B9" + n.toLocaleString("en-IN");
  }
}

/* CSV escape helper */
function csvEscape(s) {
  if (s === null || s === undefined) return '""';
  return `"${String(s).replace(/"/g, '""')}"`;
}

export default function InvestmentCard({ partners = ["Sudheer", "Suresh", "Prakash"] }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // modal + tabs
  const [modalOpen, setModalOpen] = useState(false);
  const [activeYear, setActiveYear] = useState(null);
  const [activeMonth, setActiveMonth] = useState(null);
  const modalRef = useRef(null);

  // load realtime DB
  useEffect(() => {
    let listener = null;
    let ref = null;
    let mounted = true;

    (async () => {
      const fdb = await importFirebaseDB();
      if (!mounted) return;
      if (!fdb) {
        setError("Realtime firebaseDB not found (export firebaseDB or default export from src/firebase.js).");
        setLoading(false);
        return;
      }
      try {
        ref = fdb.child ? fdb.child("Investments") : fdb.ref("Investments");
        listener = (snap) => {
          const val = snap.val() || {};
          const list = Object.keys(val).map((k) => normalizeInvestmentRecord(k, val[k]));
          list.sort((a, b) => {
            const da = a.invest_date ? new Date(a.invest_date) : new Date(0);
            const db = b.invest_date ? new Date(b.invest_date) : new Date(0);
            return db - da;
          });
          setRecords(list);
          setLoading(false);
        };
        ref.on("value", listener);
      } catch (e) {
        console.error("InvestmentCard listener error:", e);
        setError("Failed to subscribe to Investments (check console & Firebase rules).");
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      try {
        if (ref && listener) ref.off("value", listener);
      } catch { }
    };
  }, []);

  // group by year->month
  const yearMonthGroups = useMemo(() => {
    const ym = {};
    records.forEach((r) => {
      const d = r.invest_date ? new Date(r.invest_date) : null;
      if (!d || isNaN(d)) return;
      const y = d.getFullYear();
      const mIdx = d.getMonth();
      const mName = d.toLocaleString("default", { month: "long" });
      if (!ym[y]) ym[y] = {};
      if (!ym[y][mIdx]) ym[y][mIdx] = { name: mName, rows: [] };
      ym[y][mIdx].rows.push(r);
    });
    return ym;
  }, [records]);

  const years = useMemo(() => Object.keys(yearMonthGroups).map(Number).sort((a, b) => b - a), [yearMonthGroups]);

  // choose defaults when modal opens
  useEffect(() => {
    if (!modalOpen) return;
    if (years.length > 0 && !activeYear) setActiveYear(years[0]);
  }, [modalOpen, years, activeYear]);

  useEffect(() => {
    if (!activeYear) return;
    const monthsObj = yearMonthGroups[activeYear] || {};
    const monthIndices = Object.keys(monthsObj).map(Number).sort((a, b) => a - b);
    if (monthIndices.length > 0) setActiveMonth(monthIndices[0]);
    else setActiveMonth(null);
  }, [activeYear, yearMonthGroups]);

  // totals
  // compute grand totals of statuses across all years
  const overallStatusTotals = useMemo(() => {
    const out = {
      Acknowledge: { count: 0, amount: 0 },
      Clarification: { count: 0, amount: 0 },
      Pending: { count: 0, amount: 0 },
      Reject: { count: 0, amount: 0 },
    };
    records.forEach(r => {
      const s = ["Acknowledge", "Clarification", "Pending", "Reject"].includes(r.acknowledge) ? r.acknowledge : "Pending";
      out[s].count += 1;
      out[s].amount += Number(r.invest_amount || 0);
    });
    return out;
  }, [records]);

  const grandTotalAll = useMemo(() => records.reduce((s, r) => s + (r.invest_amount || 0), 0), [records]);

  // status summaries by year and by year->month (kept for modal level stats)
  const statusSummaryByYear = useMemo(() => {
    const out = {};
    records.forEach((r) => {
      const d = r.invest_date ? new Date(r.invest_date) : null;
      if (!d || isNaN(d)) return;
      const y = d.getFullYear();
      if (!out[y]) out[y] = { Acknowledge: { count: 0, amount: 0 }, Clarification: { count: 0, amount: 0 }, Pending: { count: 0, amount: 0 }, Reject: { count: 0, amount: 0 } };
      const st = ["Acknowledge", "Clarification", "Pending", "Reject"].includes(r.acknowledge) ? r.acknowledge : "Pending";
      out[y][st].count += 1;
      out[y][st].amount += r.invest_amount || 0;
    });
    return out;
  }, [records]);

  const statusSummaryYearMonth = useMemo(() => {
    const out = {};
    records.forEach((r) => {
      const d = r.invest_date ? new Date(r.invest_date) : null;
      if (!d || isNaN(d)) return;
      const y = d.getFullYear();
      const m = d.getMonth();
      if (!out[y]) out[y] = {};
      if (!out[y][m]) out[y][m] = { Acknowledge: { count: 0, amount: 0 }, Clarification: { count: 0, amount: 0 }, Pending: { count: 0, amount: 0 }, Reject: { count: 0, amount: 0 } };
      const status = ["Acknowledge", "Clarification", "Pending", "Reject"].includes(r.acknowledge) ? r.acknowledge : "Pending";
      out[y][m][status].count += 1;
      out[y][m][status].amount += r.invest_amount || 0;
    });
    return out;
  }, [records]);

  // overall investor totals (all-time) for top pills (with count)
  const overallInvestorTotals = useMemo(() => {
    const m = {};
    records.forEach((r) => {
      if (!m[r.investor]) m[r.investor] = { all: 0, ack: 0, count: 0 };
      m[r.investor].all += r.invest_amount || 0;
      if (r.acknowledge === "Acknowledge") m[r.investor].ack += r.invest_amount || 0;
      m[r.investor].count += 1;
    });
    return Object.keys(m).map((name) => ({ investor: name, ack: m[name].ack, all: m[name].all, count: m[name].count })).sort((a, b) => b.all - a.all);
  }, [records]);

  // per-year investor totals
  const investorTotalsByYear = useMemo(() => {
    const out = {};
    records.forEach((r) => {
      const d = r.invest_date ? new Date(r.invest_date) : null;
      if (!d || isNaN(d)) return;
      const y = d.getFullYear();
      if (!out[y]) out[y] = {};
      out[y][r.investor] = (out[y][r.investor] || 0) + (r.invest_amount || 0);
    });
    return out;
  }, [records]);

  // helpers: current rows
  const currentMonthRows = useMemo(() => {
    if (!activeYear || activeMonth === null || activeMonth === undefined) return [];
    const monthObj = (yearMonthGroups[activeYear] && yearMonthGroups[activeYear][activeMonth]) || null;
    return monthObj ? monthObj.rows : [];
  }, [yearMonthGroups, activeYear, activeMonth]);

  const currentYearRows = useMemo(() => {
    if (!activeYear) return [];
    const months = yearMonthGroups[activeYear] || {};
    return Object.keys(months).reduce((acc, mIdx) => acc.concat(months[mIdx].rows || []), []);
  }, [yearMonthGroups, activeYear]);

  // CSV & print
  const exportRowsToCSV = (rows, filename = "report.csv") => {
    const headers = ["Date", "Investor", "Amount", "To", "Ref", "Purpose", "Comments", "Acknowledge"];
    const csv = [headers.join(",")].concat(
      rows.map((r) =>
        [
          csvEscape(r.invest_date),
          csvEscape(r.investor),
          r.invest_amount,
          csvEscape(r.invest_to),
          csvEscape(r.invest_reference),
          csvEscape(r.invest_purpose),
          csvEscape(r.comments),
          csvEscape(r.acknowledge),
        ].join(",")
      )
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printCurrentView = (rows, title = "") => {
    const w = window.open("", "_blank");
    if (!w) return;
    const tableRows = rows.map((r, idx) => `<tr>
      <td style="padding:6px;border:1px solid #ddd">${idx + 1}</td>
      <td style="padding:6px;border:1px solid #ddd">${r.invest_date}</td>
      <td style="padding:6px;border:1px solid #ddd">${r.investor}</td>
      <td style="padding:6px;border:1px solid #ddd;text-align:right">${formatINR(r.invest_amount)}</td>
      <td style="padding:6px;border:1px solid #ddd">${r.invest_to}</td>
      <td style="padding:6px;border:1px solid #ddd">${r.invest_reference}</td>
      <td style="padding:6px;border:1px solid #ddd">${r.invest_purpose}</td>
      <td style="padding:6px;border:1px solid #ddd">${r.acknowledge}</td>
    </tr>`).join("\n");

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f4f4f4}</style>
      </head><body>
      <h2>${title}</h2>
      <table><thead><tr><th>#</th><th>Date</th><th>Investor</th><th>Amount</th><th>To</th><th>Ref</th><th>Purpose</th><th>Status</th></tr></thead>
      <tbody>${tableRows}</tbody></table>
      </body></html>`;
    w.document.write(html);
    w.document.close();
    w.print();
  };

  // prevent body scroll on modal and ESC close
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && modalOpen) setModalOpen(false);
    }
    if (modalOpen) document.body.classList.add("modal-open");
    else document.body.classList.remove("modal-open");
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [modalOpen]);

  /* ---------- UI styles (inline for quick testing) ---------- */
  // move to SCSS in your repo if desired
  const styles = {
    root: { width: "100%" },
    cardBox: {
      display: "flex",
      flexDirection: "column",
      gap: 12,
      background: "linear-gradient(180deg,#0f1724,#071126)",
      padding: 14,
      borderRadius: 10,
      color: "#fff",
      boxShadow: "0 8px 24px rgba(2,6,23,0.4)",
      cursor: "pointer",
    },
    head: { display: "flex", alignItems: "center", gap: 12 },
    icon: { fontSize: 28 },
    meta: { display: "flex", flexDirection: "column" },
    totalsRow: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 },
    statusBox: (bg) => ({ minWidth: 160, padding: 10, borderRadius: 8, background: bg, boxShadow: "0 6px 12px rgba(0,0,0,0.2)" }),
    investorsPills: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 },
    pill: { background: "rgba(255,255,255,0.06)", padding: "6px 10px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, minWidth: 140 },
  };

  // gradients for status boxes
  const statusGradients = {
    Acknowledge: "linear-gradient(120deg,#11998e,#38ef7d)", // green-ish
    Clarification: "linear-gradient(120deg,#f7971e,#ffd200)", // orange
    Pending: "linear-gradient(120deg,#00c6ff,#0072ff)", // blue
    Reject: "linear-gradient(120deg,#ff416c,#ff4b2b)", // red
  };

  return (
    <div style={styles.root}>
      {/* Card */}
      <div
        className="invest-card__box"
        role="button"
        onClick={() => !error && setModalOpen(true)}
        style={styles.cardBox}
      >
        <div style={styles.head}>
          <div style={styles.icon}>💼</div>
          <div style={styles.meta}>
            <div style={{ fontSize: 14, color: "#bcd6ff", fontWeight: 700 }}>Investment</div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{loading ? "Loading..." : formatINR(grandTotalAll)}</div>
            <div style={{ fontSize: 12, color: "#bcd6ff" }}>{loading ? "" : `${records.length} records overall`}</div>
          </div>
        </div>



        {/* investor mini pills (top investors) */}
        {/* <div style={styles.investorsPills}>
          {overallInvestorTotals.slice(0, 5).map(it => (
            <div key={it.investor} style={styles.pill} title={`${it.investor}`}>
              <div style={{ fontWeight: 700 }}>{it.investor}</div>
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div style={{ fontWeight: 800 }}>{formatINR(it.all)}</div>
                <div style={{ fontSize: 11, color: "#cfe8ff" }}>{it.count} investments</div>
              </div>
            </div>
          ))}
        </div> */}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="invest-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="invest-modal-dialog" ref={modalRef} onClick={(e) => e.stopPropagation()} style={{ display: "flex", justifyContent: "center", padding: 16 }}>
            <div className="invest-modal-content" style={{ width: "100%", maxWidth: 1200, borderRadius: 10, overflow: "hidden", boxShadow: "0 16px 40px rgba(2,6,23,0.6)" }}>
              {/* top bar (pills) */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: "#f6f8fb", borderBottom: "1px solid #eaeef6" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>Investments Report</div>
                  <div style={{ color: "#7b8794", fontSize: 13 }}>Overall: {formatINR(grandTotalAll)}</div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setModalOpen(false)}>Close</button>
                </div>
              </div>

              <div style={{ padding: 18, background: "#ffffffff" }}>
                {/* Investors list */}
                <div style={{ marginBottom: 12 }}>
                  <h6 style={{ margin: 0 }}>Investors</h6>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    {overallInvestorTotals.length === 0 ? <div className="text-muted">No investors</div> : overallInvestorTotals.map(it => (
                      <div key={it.investor} style={{ padding: 8, borderRadius: 8, background: "#adf3f8ff", border: "1px solid #f0f3f8", minWidth: 170 }}>
                        <div style={{ fontWeight: 700 }}>{it.investor}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                          <div style={{ color: "#576b82", fontSize: 12 }}>Total</div>
                          <div style={{ fontWeight: 800 }}>{formatINR(it.all)}</div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                          <div style={{ color: "#8a9bb3", fontSize: 12 }}>Acknowledged</div>
                          <div style={{ fontWeight: 700 }}>{formatINR(it.ack)}</div>
                        </div>
                        <div style={{ marginTop: 6, fontSize: 12, color: "#6c7a8a" }}>{it.count} investments</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status summary - moved here from header */}
                <div style={{ marginTop: 14 }}>
                  <h5 style={{ marginBottom: 10 }}>Status Summary (overall)</h5>
                  {/* Status summary (grand totals across all years) - displayed on collapsed card */}
                  <div style={styles.totalsRow}>
                    {["Acknowledge", "Clarification", "Pending", "Reject"].map((s) => {
                      const val = overallStatusTotals[s] || { count: 0, amount: 0 };
                      return (
                        <div key={s} style={styles.statusBox(statusGradients[s])} className={`invest-status-${s.toLowerCase()}`}>
                          <div style={{ fontSize: 13, opacity: 0.95 }}>{s}</div>
                          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 6 }}>{formatINR(val.amount)}</div>
                          <div style={{ fontSize: 12, opacity: 0.9 }}>{val.count} items</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Year tabs */}
                <div style={{ marginTop: 20 }}>
                  <ul className="nav nav-tabs">
                    {years.length === 0 ? <li className="nav-item"><span className="nav-link active">No Data</span></li> : years.map((y) => (
                      <li key={y} className="nav-item">
                        <button className={`nav-link ${activeYear === y ? "active" : ""}`} onClick={() => { setActiveYear(y); setActiveMonth(null); }}>{y}</button>
                      </li>
                    ))}
                  </ul>
                  {/* month pills */}
                  <div style={{ marginTop: 15 }}>
                    <ul className="nav nav-pills">
                      {(yearMonthGroups[activeYear] ? Object.keys(yearMonthGroups[activeYear]).map(Number).sort((a, b) => a - b) : []).map((mIdx) => (
                        <li key={mIdx} className="nav-item">
                          <button className={`nav-link ${activeMonth === mIdx ? "active" : ""}`} onClick={() => setActiveMonth(mIdx)}>
                            {yearMonthGroups[activeYear][mIdx].name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* content for selected year */}
                {activeYear && (
                  <div style={{ marginTop: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>


                      {/* right: statuses, month pills, table */}
                      <div style={{ flex: 1 }}>




                        {/* year-level status (month selection above table) */}
                        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
                          {(statusSummaryByYear[activeYear] ? Object.keys(statusSummaryByYear[activeYear]) : ["Acknowledge", "Clarification", "Pending", "Reject"]).map(s => {
                            const o = (statusSummaryByYear[activeYear] && statusSummaryByYear[activeYear][s]) || { count: 0, amount: 0 };
                            return (
                              <div key={s} style={{ padding: 10, borderRadius: 8, background: "#0b1220", color: "#fff", minWidth: 160 }}>
                                <div style={{ fontSize: 12, opacity: 0.9 }}>{s}</div>
                                <div style={{ fontWeight: 800, fontSize: 16, marginTop: 6 }}>{formatINR(o.amount)}</div>
                                <div style={{ fontSize: 12, opacity: 0.85 }}>{o.count} items</div>
                              </div>
                            );
                          })}
                          {/* left: investors this year */}
                          <div style={{ flex: "0 0 360px", background: "#fbfcfe", padding: 12, borderRadius: 8, border: "1px solid #eef3f8" }}>
                            <h6 style={{ marginTop: 0 }}>Investors — {activeYear}</h6>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {Object.entries(investorTotalsByYear[activeYear] || {}).sort((a, b) => b[1] - a[1]).map(([name, total]) => (
                                <div key={name} style={{ display: "flex", gap: 10 }}>
                                  <div style={{ fontWeight: 700 }}>{name}</div>
                                  <div style={{ textAlign: "right" }}>
                                    <div style={{ fontWeight: 800 }}>{formatINR(total)}</div>
                                    <div style={{ fontSize: 12, color: "#7b8794" }}>{records.filter(r => r.investor === name && new Date(r.invest_date).getFullYear() === activeYear).length} items</div>
                                  </div>
                                </div>
                              ))}
                              {Object.keys(investorTotalsByYear[activeYear] || {}).length === 0 && <div className="text-muted">No investors for this year</div>}
                            </div>
                          </div>
                        </div>



                        {/* toolbar */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                          <div style={{ color: "#6c7a8a" }}>
                            {activeMonth !== null && activeMonth !== undefined ? `${yearMonthGroups[activeYear][activeMonth].name} ${activeYear}` : "Select month"}
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button className="btn btn-sm btn-outline-primary" onClick={() => exportRowsToCSV(currentMonthRows, `${activeYear}-${activeMonth ?? "all"}-investments.csv`)} disabled={!activeMonth}>Export Month CSV</button>
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => printCurrentView(currentMonthRows, `Investments - ${activeYear} - ${activeMonth ?? ""}`)} disabled={!activeMonth}>Print Month</button>
                            <button className="btn btn-sm btn-outline-success" onClick={() => exportRowsToCSV(currentYearRows, `${activeYear}-investments.csv`)} disabled={!activeYear}>Export Year CSV</button>
                            <button className="btn btn-sm btn-outline-dark" onClick={() => printCurrentView(currentYearRows, `Investments - ${activeYear}`)} disabled={!activeYear}>Print Year</button>
                          </div>
                        </div>

                        {/* month table */}
                        {!activeMonth && (
                          <div className="alert alert-info">Select a month to view the monthly report</div>
                        )}
                        {activeMonth !== null && activeMonth !== undefined && (
                          <div>
                            <div style={{ marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
                              <div>
                                <strong>{yearMonthGroups[activeYear][activeMonth].name} {activeYear}</strong>
                                <div style={{ fontSize: 13, color: "#6c7a8a" }}>{currentMonthRows.length} items • Month total: {formatINR(currentMonthRows.reduce((s, r) => s + r.invest_amount, 0))}</div>
                              </div>
                            </div>

                            <div className="table-responsive">
                              <table className="table table-sm table-hover invest-table">
                                <thead>
                                  <tr>
                                    <th>#</th>
                                    <th>Date</th>
                                    <th>Investor</th>
                                    <th className="text-end">Amount</th>
                                    <th>To</th>
                                    <th>Ref</th>
                                    <th>Purpose</th>
                                    <th>Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {currentMonthRows.map((r, idx) => (
                                    <tr key={r.id}>
                                      <td>{idx + 1}</td>
                                      <td>{r.invest_date}</td>
                                      <td>{r.investor}</td>
                                      <td className="text-end">{formatINR(r.invest_amount)}</td>
                                      <td>{r.invest_to}</td>
                                      <td>{r.invest_reference}</td>
                                      <td className="text-wrap">{r.invest_purpose}</td>
                                      <td>{r.acknowledge}</td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr className="table-secondary">
                                    <td colSpan={2}><strong>Month Subtotal</strong></td>
                                    <td><strong>{formatINR(currentMonthRows.reduce((s, r) => s + r.invest_amount, 0))}</strong></td>
                                    <td colSpan={5}></td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>

                            <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
                              <div style={{ padding: 10, borderRadius: 8, background: "#fbfcfe", border: "1px solid #eef3f8" }}>
                                <div style={{ fontSize: 12, color: "#6c7a8a" }}>Year Grand Total (All)</div>
                                <div style={{ fontWeight: 800, fontSize: 18 }}>{formatINR(currentYearRows.reduce((s, r) => s + r.invest_amount, 0))}</div>
                              </div>
                              <div style={{ padding: 10, borderRadius: 8, background: "#fbfcfe", border: "1px solid #eef3f8" }}>
                                <div style={{ fontSize: 12, color: "#6c7a8a" }}>Year Grand Total (Acknowledged)</div>
                                <div style={{ fontWeight: 800, fontSize: 18 }}>{formatINR(currentYearRows.reduce((s, r) => s + (r.acknowledge === "Acknowledge" ? r.invest_amount : 0), 0))}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ padding: 12, background: "#fbfcfe", borderTop: "1px solid #eef3f8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ color: "#6c7a8a" }}>Grand Totals</div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ padding: 8, background: "#fff", borderRadius: 8, border: "1px solid #e6ecf3" }}>
                    <div style={{ fontSize: 12 }}>Total (All)</div>
                    <div style={{ fontWeight: 800 }}>{formatINR(grandTotalAll)}</div>
                  </div>
                  <button className="btn btn-sm btn-secondary" onClick={() => setModalOpen(false)}>Close</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

InvestmentCard.propTypes = {
  partners: PropTypes.arrayOf(PropTypes.string),
};
