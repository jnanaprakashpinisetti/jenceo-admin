// src/components/DashBoard/InvestmentCard.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import PropTypes from "prop-types";

/* Helper: try to import your Realtime DB export (firebase default or firebaseDB) */
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
      } catch {}
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
  const grandTotalAck = useMemo(() => records.reduce((s, r) => s + (r.acknowledge === "Acknowledge" ? r.invest_amount : 0), 0), [records]);
  const grandTotalAll = useMemo(() => records.reduce((s, r) => s + (r.invest_amount || 0), 0), [records]);

  // status summaries by year and by year->month
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

  // overall investor totals (all-time) for top pills
  const overallInvestorTotals = useMemo(() => {
    const m = {};
    records.forEach((r) => {
      if (!m[r.investor]) m[r.investor] = { all: 0, ack: 0 };
      m[r.investor].all += r.invest_amount || 0;
      if (r.acknowledge === "Acknowledge") m[r.investor].ack += r.invest_amount || 0;
    });
    return Object.keys(m).map((name) => ({ investor: name, ack: m[name].ack, all: m[name].all })).sort((a, b) => b.ack - a.ack);
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

  return (
    <div className="invest-card">
      {/* Card */}
      <div className="invest-card__box" role="button" onClick={() => !error && setModalOpen(true)}>
        <div className="invest-card__head">
          <div className="invest-card__icon">💰</div>
          <div className="invest-card__meta">
            <div className="invest-card__label">Investment</div>
            <div className="invest-card__total">{loading ? "Loading..." : formatINR(grandTotalAck)}</div>
            <div className="invest-card__small">{loading ? "" : `${records.length} records`}</div>
          </div>
        </div>

        <div className="invest-card__divider" />

        {/* <div className="invest-card__partners">
          {partners.map((p) => (
            <div key={p} className="invest-card__partner">
              <div className="invest-card__partner-name">{p}</div>
              <div className="invest-card__partner-val">{loading ? "..." : formatINR((overallInvestorTotals.find(i => i.investor === p) || { ack: 0 }).ack)}</div>
            </div>
          ))}
        </div> */}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="invest-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="invest-modal-dialog" ref={modalRef} onClick={(e) => e.stopPropagation()}>
            <div className="invest-modal-content">
              {/* investor pills bar */}
              <div className="invest-modal-investor-bar">
                <div className="invest-modal-investor-bar__title">Investments Report</div>
                <div className="invest-modal-investor-list">
                  {overallInvestorTotals.length === 0 ? (
                    <div className="invest-modal-investor-empty">No investors</div>
                  ) : (
                    overallInvestorTotals.map((it) => (
                      <div key={it.investor} className="invest-modal-investor-pill" title={`${it.investor}`}>
                        <div className="pill-name">{it.investor}</div>
                        <div className="pill-values">
                          <span className="pill-ack">{formatINR(it.ack)}</span>
                          <span className="pill-sep">•</span>
                          <span className="pill-all">{formatINR(it.all)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <button className="btn-close invest-modal-top-close btn-close-white" onClick={() => setModalOpen(false)} />
              </div>

              <div className="invest-modal-header">
                <div className="invest-modal-sub">
                 <h3> Grand (Ack): <strong>{formatINR(grandTotalAck)}</strong> • Grand (All): <strong>{formatINR(grandTotalAll)}</strong></h3>
                </div>
              </div>

              <div className="invest-modal-body">
                {/* Year tabs */}
                <ul className="nav nav-tabs invest-year-tabs">
                  {years.length === 0 ? <li className="nav-item"><span className="nav-link active">No Data</span></li> : years.map((y) => (
                    <li key={y} className="nav-item">
                      <button className={`nav-link ${activeYear === y ? "active" : ""}`} onClick={() => { setActiveYear(y); setActiveMonth(null); }}>{y}</button>
                    </li>
                  ))}
                </ul>

                {activeYear && (
                  <div className="invest-year-block">
                    <div className="invest-year-top">
                      <div className="invest-year-investors">
                        <h6>Investors — {activeYear}</h6>
                        <div className="invest-year-investors-list">
                          {Object.entries(investorTotalsByYear[activeYear] || {}).sort((a, b) => b[1] - a[1]).map(([name, total]) => (
                            <div key={name} className="invest-year-investor">
                              <div className="invest-year-investor-name">{name}</div>
                              <div className="invest-year-investor-total">{formatINR(total)}</div>
                            </div>
                          ))}
                          {Object.keys(investorTotalsByYear[activeYear] || {}).length === 0 && <div className="text-muted">No investors for this year</div>}
                        </div>
                      </div>

                      <div className="invest-year-status">
                        {["Acknowledge", "Clarification", "Pending", "Reject"].map((s) => {
                          const o = (statusSummaryByYear[activeYear] && statusSummaryByYear[activeYear][s]) || { count: 0, amount: 0 };
                          return (
                            <div key={s} className="invest-status-pill">
                              <div className="invest-status-pill__label">{s}</div>
                              <div className="invest-status-pill__amount">{formatINR(o.amount)}</div>
                              <div className="invest-status-pill__count">{o.count} items</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <hr />

                    {/* Month pills */}
                    <ul className="nav nav-pills invest-month-pills">
                      {(yearMonthGroups[activeYear] ? Object.keys(yearMonthGroups[activeYear]).map(Number).sort((a, b) => a - b) : []).map((mIdx) => (
                        <li key={mIdx} className="nav-item">
                          <button className={`nav-link ${activeMonth === mIdx ? "active" : ""}`} onClick={() => setActiveMonth(mIdx)}>
                            {yearMonthGroups[activeYear][mIdx].name}
                          </button>
                        </li>
                      ))}
                    </ul>

                    {/* toolbar */}
                    <div className="invest-month-toolbar">
                      <div />
                      <div className="btn-group">
                        <button className="btn btn-sm btn-outline-primary" onClick={() => exportRowsToCSV(currentMonthRows, `${activeYear}-${activeMonth ?? "all"}-investments.csv`)} disabled={!activeMonth}>Export Month CSV</button>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => printCurrentView(currentMonthRows, `Investments - ${activeYear} - ${activeMonth ?? ""}`)} disabled={!activeMonth}>Print Month</button>
                        <button className="btn btn-sm btn-outline-success" onClick={() => exportRowsToCSV(currentYearRows, `${activeYear}-investments.csv`)} disabled={!activeYear}>Export Year CSV</button>
                        <button className="btn btn-sm btn-outline-dark" onClick={() => printCurrentView(currentYearRows, `Investments - ${activeYear}`)} disabled={!activeYear}>Print Year</button>
                      </div>
                    </div>

                    {/* month table */}
                    {!activeMonth ? (
                      <div className="alert alert-info">Select a month to view the monthly report</div>
                    ) : (
                      <div>
                        <div className="month-heading">
                          <strong>{yearMonthGroups[activeYear][activeMonth].name} {activeYear}</strong>
                          <div className="small text-muted">
                            {currentMonthRows.length} items • Month total: {formatINR(currentMonthRows.reduce((s, r) => s + r.invest_amount, 0))}
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

                        <div className="year-totals mt-3">
                          <div className="year-total-item">
                            <div>Year Grand Total (All)</div>
                            <div className="year-total-value">{formatINR(currentYearRows.reduce((s, r) => s + r.invest_amount, 0))}</div>
                          </div>
                          <div className="year-total-item">
                            <div>Year Grand Total (Acknowledged)</div>
                            <div className="year-total-value">{formatINR(currentYearRows.reduce((s, r) => s + (r.acknowledge === "Acknowledge" ? r.invest_amount : 0), 0))}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="invest-modal-footer">
                <div className="me-auto small text-muted">Grand Total (Acknowledged): {formatINR(grandTotalAck)}</div>
                <button className="btn btn-secondary btn-sm" onClick={() => setModalOpen(false)}>Close</button>
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
