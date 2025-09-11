// src/components/DashBoard/InvestmentCard.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import PropTypes from "prop-types";

/* Try importing project's firebase helper */
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

function normalizeInvestmentRecord(key, it) {
  const investor = String(it.investor ?? it.name ?? it.Investor ?? "Unknown");
  const invest_date = String(it.invest_date ?? it.date ?? it.InvestDate ?? "");
  const invest_amount = Number(
    isNaN(Number(it.invest_amount ?? it.amount ?? it.Amount ?? 0))
      ? 0
      : Number(it.invest_amount ?? it.amount ?? it.Amount ?? 0)
  );
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

function formatINR(value) {
  const n = Number(value || 0);
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
  } catch {
    return "\u20B9" + n.toLocaleString("en-IN");
  }
}

/* deterministic color by name */
const NAME_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#ef6f6c"];
function colorForName(name) {
  if (!name) return NAME_COLORS[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h << 5) - h + name.charCodeAt(i);
  return NAME_COLORS[Math.abs(h) % NAME_COLORS.length];
}

export default function InvestmentCard({ partners = ["Sudheer", "Suresh", "Prakash"] }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [activeYear, setActiveYear] = useState(null);
  const [activeMonth, setActiveMonth] = useState(null);
  const modalRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    let ref = null;
    let listener = null;
    (async () => {
      const fdb = await importFirebaseDB();
      if (!mounted) return;
      if (!fdb) {
        setError("Realtime firebaseDB not found.");
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
        console.error(e);
        setError("Failed to subscribe to Investments.");
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

  // grouping
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

  // defaults when modal opens
  useEffect(() => {
    if (!modalOpen) return;
    if (years.length > 0 && !activeYear) setActiveYear(years[0]);
  }, [modalOpen, years, activeYear]);

  useEffect(() => {
    if (!activeYear) return;
    const months = yearMonthGroups[activeYear] || {};
    const idxs = Object.keys(months).map(Number).sort((a, b) => a - b);
    if (idxs.length) setActiveMonth(idxs[0]);
    else setActiveMonth(null);
  }, [activeYear, yearMonthGroups]);

  // overall totals and per-status
  const overallStatusTotals = useMemo(() => {
    const out = { Acknowledge: { count: 0, amount: 0 }, Clarification: { count: 0, amount: 0 }, Pending: { count: 0, amount: 0 }, Reject: { count: 0, amount: 0 } };
    records.forEach((r) => {
      const s = ["Acknowledge", "Clarification", "Pending", "Reject"].includes(r.acknowledge) ? r.acknowledge : "Pending";
      out[s].count += 1;
      out[s].amount += Number(r.invest_amount || 0);
    });
    return out;
  }, [records]);

  const grandTotalAll = useMemo(() => records.reduce((s, r) => s + (r.invest_amount || 0), 0), [records]);

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

  // investors totals with per-status
  const overallInvestorTotals = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      const name = r.investor || "Unknown";
      if (!map[name]) map[name] = { investor: name, total: 0, acknowledged: 0, pending: 0, clarification: 0, reject: 0, count: 0 };
      map[name].total += Number(r.invest_amount || 0);
      map[name].count += 1;
      if (r.acknowledge === "Acknowledge") map[name].acknowledged += Number(r.invest_amount || 0);
      else if (r.acknowledge === "Clarification") map[name].clarification += Number(r.invest_amount || 0);
      else if (r.acknowledge === "Reject") map[name].reject += Number(r.invest_amount || 0);
      else map[name].pending += Number(r.invest_amount || 0);
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [records]);

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

  const currentMonthRows = useMemo(() => {
    if (!activeYear || activeMonth === null || activeMonth === undefined) return [];
    const monthObj = (yearMonthGroups[activeYear] && yearMonthGroups[activeYear][activeMonth]) || null;
    return monthObj ? monthObj.rows : [];
  }, [yearMonthGroups, activeYear, activeMonth]);

  const currentYearRows = useMemo(() => {
    if (!activeYear) return [];
    const months = yearMonthGroups[activeYear] || {};
    return Object.keys(months).reduce((acc, m) => acc.concat(months[m].rows || []), []);
  }, [yearMonthGroups, activeYear]);

  // export & print helpers (same as before)
  const csvEscape = (s) => {
    if (s === null || s === undefined) return '""';
    return `"${String(s).replace(/"/g, '""')}"`;
  };
  const exportRowsToCSV = (rows, filename = "report.csv") => {
    const headers = ["Date", "Investor", "Amount", "To", "Ref", "Purpose", "Comments", "Acknowledge"];
    const csv = [headers.join(",")].concat(
      rows.map((r) =>
        [csvEscape(r.invest_date), csvEscape(r.investor), r.invest_amount, csvEscape(r.invest_to), csvEscape(r.invest_reference), csvEscape(r.invest_purpose), csvEscape(r.comments), csvEscape(r.acknowledge)].join(
          ","
        )
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
    const tableRows = rows
      .map(
        (r, idx) =>
          `<tr><td>${idx + 1}</td><td>${r.invest_date}</td><td>${r.investor}</td><td style="text-align:right">${formatINR(
            r.invest_amount
          )}</td><td>${r.invest_to}</td><td>${r.invest_reference}</td><td>${r.invest_purpose}</td><td>${r.acknowledge}</td></tr>`
      )
      .join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px}</style></head><body><h2>${title}</h2><table><thead><tr><th>#</th><th>Date</th><th>Investor</th><th>Amount</th><th>To</th><th>Ref</th><th>Purpose</th><th>Status</th></tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    w.document.write(html);
    w.document.close();
    w.print();
  };

  useEffect(() => {
    if (modalOpen) document.body.classList.add("modal-open");
    else document.body.classList.remove("modal-open");
    const onKey = (e) => {
      if (e.key === "Escape" && modalOpen) setModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [modalOpen]);

  // year quick status for UI
  const yearQuickStatus = useMemo(() => {
    if (!activeYear) return null;
    return statusSummaryByYear[activeYear] || { Acknowledge: { count: 0, amount: 0 }, Clarification: { count: 0, amount: 0 }, Pending: { count: 0, amount: 0 }, Reject: { count: 0, amount: 0 } };
  }, [activeYear, statusSummaryByYear]);

  // compute year total (sum of four statuses) for the selected year
  const yearTotalForSelected = useMemo(() => {
    if (!yearQuickStatus) return { amount: 0, count: 0 };
    const amt = (yearQuickStatus.Acknowledge?.amount || 0) + (yearQuickStatus.Clarification?.amount || 0) + (yearQuickStatus.Pending?.amount || 0) + (yearQuickStatus.Reject?.amount || 0);
    const cnt = (yearQuickStatus.Acknowledge?.count || 0) + (yearQuickStatus.Clarification?.count || 0) + (yearQuickStatus.Pending?.count || 0) + (yearQuickStatus.Reject?.count || 0);
    return { amount: amt, count: cnt };
  }, [yearQuickStatus]);

  return (
    <div className="investments-card">
      {/* collapsed card using requested structure & classes */}
      <div className="invest-card__box card-role" role="button" onClick={() => setModalOpen(true)}>
        <div className="invest-card__head">
          <div className="invest-card__icon">💼</div>
          <div className="invest-card__meta">
            <div className="invest-card__label">Investment</div>
            <div className="invest-card__total">{loading ? "Loading..." : formatINR(grandTotalAll)}</div>
            <div className="invest-card__small">Payments: {records.length}</div>
          </div>
        </div>
        <div className="invest-card__divider" />
      </div>

      {/* modal */}
      {modalOpen && (
        <div className="invest-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="invest-modal-dialog" ref={modalRef} onClick={(e) => e.stopPropagation()}>
            <div className="invest-modal-content">
              <div className="invest-modal-investor-bar">
                <div className="invest-modal-investor-bar__title">Investments Report</div>
                <button className="btn-close btn-close-white invest-modal-top-close" onClick={() => setModalOpen(false)} />
              </div>

              <div className="invest-modal-body">
                  <div className="invest-modal-summary">
                    <div className="summary-item small-cards">
                      <div className="invest-card-status-row">
                        {["Acknowledge", "Clarification", "Pending", "Reject"].map((s, idx) => {
                          const st = overallStatusTotals[s] || { count: 0, amount: 0 };
                          return (
                            <div key={s} className={`invest-status-card invest-status-${s.toLowerCase()} grad-${idx}`}>
                              <div className="status-label">{s}</div>
                              <div className="status-amount">{formatINR(st.amount)}</div>
                              <div className="status-count">{st.count} items</div>
                            </div>
                          );
                        })}

                        {/* Grand total card (overall) - retained */}
                        <div className="invest-status-all">
                          <div className="status-label">Grand Total</div>
                          <div className="status-amount">{formatINR(grandTotalAll)}</div>
                          <div className="status-count">Records: {records.length}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                <div className="investors-year-section">
                  <div className="investors-list small">
                    <h6>Investors</h6>
                    <div className="investors-grid compact-grid">
                      {overallInvestorTotals.length === 0 ? (
                        <div className="muted">No investors</div>
                      ) : (
                        overallInvestorTotals.map((inv) => (
                          <div key={inv.investor} className="investor-card compact">
                            <div className="inv-header">
                              <div className="inv-name" style={{ color: colorForName(inv.investor) }}>
                                {inv.investor}
                              </div>
                              <div className="inv-count-tag">{inv.count}</div>
                            </div>
                            <div className="inv-body compact-body">
                              <div className="inv-stat">
                                <div className="label">Ack</div>
                                <div className="val">{formatINR(inv.acknowledged)}</div>
                              </div>
                              <div className="inv-stat">
                                <div className="label">Pend</div>
                                <div className="val">{formatINR(inv.pending)}</div>
                              </div>
                              <div className="inv-stat">
                                <div className="label">Clar</div>
                                <div className="val">{formatINR(inv.clarification)}</div>
                              </div>
                              <div className="inv-stat">
                                <div className="label">Rej</div>
                                <div className="val">{formatINR(inv.reject)}</div>
                              </div>
                              <div className="inv-stat inv-total">
                                <div className="label">Total</div>
                                <div className="val">{formatINR(inv.total)}</div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="year-panel expanded">
                    <ul className="nav nav-tabs invest-year-tabs">
                      {years.length === 0 ? (
                        <li className="nav-item">
                          <span className="nav-link active">No Data</span>
                        </li>
                      ) : (
                        years.map((y) => (
                          <li key={y} className="nav-item">
                            <button
                              className={`nav-link ${activeYear === y ? "active" : ""}`}
                              onClick={() => {
                                setActiveYear(y);
                                setActiveMonth(null);
                              }}
                            >
                              {y}
                            </button>
                          </li>
                        ))
                      )}
                    </ul>

                    {/* Year quick status cards (for selected year) */}
                    {activeYear && yearQuickStatus && (
                      <div className="year-quick-status">
                        {["Acknowledge", "Clarification", "Pending", "Reject"].map((s, i) => {
                          const o = yearQuickStatus[s] || { count: 0, amount: 0 };
                          return (
                            <div key={s} className={`year-status-card ystatus-${s.toLowerCase()}`}>
                              <div className="ystat-label">{s}</div>
                              <div className="ystat-amount">{formatINR(o.amount)}</div>
                              <div className="ystat-count">{o.count} items</div>
                            </div>
                          );
                        })}

                        {/* New: Year total card (sum of the above four statuses) */}
                        <div className="year-status-card ystatus-total">
                          <div className="ystat-label">Year Total</div>
                          <div className="ystat-amount">{formatINR(yearTotalForSelected.amount)}</div>
                          <div className="ystat-count">{yearTotalForSelected.count} items</div>
                        </div>
                      </div>
                    )}

                    <div className="months-row">
                      {activeYear && yearMonthGroups[activeYear]
                        ? Object.keys(yearMonthGroups[activeYear]).map((k) => (
                          <button key={k} className={`btn btn-sm month-pill ${String(activeMonth) === String(k) ? "active" : ""}`} onClick={() => setActiveMonth(Number(k))}>
                            {k === "Unknown" ? "Unknown" : new Date(Number(activeYear), Number(k), 1).toLocaleString("default", { month: "short" })}
                          </button>
                        ))
                        : <div className="muted">Select a year to see months</div>}
                    </div>

                    <div className="invest-toolbar">
                      <div className="current-selection">{activeMonth || activeMonth === 0 ? `${yearMonthGroups[activeYear][activeMonth].name} ${activeYear}` : "Select month"}</div>
                      <div className="toolbar-actions">
                        <button className="btn btn-sm btn-outline-primary" onClick={() => exportRowsToCSV((currentMonthRows || []), `${activeYear}-${activeMonth ?? "all"}-investments.csv`)} disabled={!activeMonth && activeMonth !== 0}>
                          Export Month CSV
                        </button>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => printCurrentView((currentMonthRows || []), `Investments - ${activeYear} - ${activeMonth ?? ""}`)} disabled={!activeMonth && activeMonth !== 0}>
                          Print Month
                        </button>
                        <button className="btn btn-sm btn-outline-success" onClick={() => exportRowsToCSV(currentYearRows, `${activeYear}-investments.csv`)} disabled={!activeYear}>
                          Export Year CSV
                        </button>
                        <button className="btn btn-sm btn-outline-dark" onClick={() => printCurrentView(currentYearRows, `Investments - ${activeYear}`)} disabled={!activeYear}>
                          Print Year
                        </button>
                      </div>
                    </div>

                    <div className="table-wrap">
                      {(!activeMonth && activeMonth !== 0) && <div className="muted small">No payments for selected month/year</div>}
                      {(activeMonth === 0 || activeMonth) && (
                        <table className="table table-sm invest-table table-hover">
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
                                <td>
                                  <span className={`status-pill status-${r.acknowledge?.toLowerCase()}`}>{r.acknowledge}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="table-subtotal">
                              <td colSpan={3}>
                                <strong>Month Subtotal</strong>
                              </td>
                              <td className="text-end">
                                <strong>{formatINR(currentMonthRows.reduce((s, r) => s + (r.invest_amount || 0), 0))}</strong>
                              </td>
                              <td colSpan={4} />
                            </tr>
                            <tr className="table-subtotal table-year">
                              <td colSpan={3}>
                                <strong>Year Grand Total</strong>
                              </td>
                              <td className="text-end">
                                <strong>{formatINR(currentYearRows.reduce((s, r) => s + (r.invest_amount || 0), 0))}</strong>
                              </td>
                              <td colSpan={4} />
                            </tr>
                          </tfoot>
                        </table>
                      )}
                    </div>
                  </div>
                </div>

                <div className="invest-modal-actions">
                  <div className="left-note">Showing {currentMonthRows.length} items</div>
                  <div className="right-actions">
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => exportRowsToCSV(currentMonthRows, `investments-${activeYear}-${activeMonth}.csv`)} disabled={!activeMonth && activeMonth !== 0}>
                      Export Month
                    </button>
                    <button className="btn btn-sm btn-secondary ms-2" onClick={() => setModalOpen(false)}>
                      Close
                    </button>
                  </div>
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
