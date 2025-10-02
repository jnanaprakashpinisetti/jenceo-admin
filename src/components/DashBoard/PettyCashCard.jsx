// src/components/DashBoard/PettyCashCard.jsx
import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import firebaseDB from "../../firebase";

/**
 * PettyCashCard.jsx
 * - Card "Total": GRAND TOTAL of all non-deleted, non-rejected entries
 * - Status totals: Acknowledge / Pending / Clarification / Reject (robust detection)
 * - Amount fallback: qty*price (and other fields) if total missing
 * - Date robustness: flexible parsing; “Unknown” month bucket so rows are never lost
 * - Deleted items: excluded from sums
 * - Dedupe: prevent double counting the same logical entry coming from overlapping roots
 * - UX: Removed "+" button. Only clicking on a numeric month value opens the details table.
 * - Totals exclude Rejected. Rejected rows appear in red in the details view.
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

function safeNumber(v) {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isNaN(n) ? 0 : n;
}

function parseDateRobust(v) {
  if (!v && v !== 0) return null;
  if (v instanceof Date && !isNaN(v)) return v;
  const s = String(v || "").trim();
  if (!s) return null;

  // Unix seconds/ms
  if (/^\d{10,13}$/.test(s)) {
    const n = Number(s);
    return new Date(n < 1e12 ? n * 1000 : n);
  }

  // Native
  const nat = new Date(s);
  if (!isNaN(nat)) return nat;

  // DD[-/ ]MM[-/ ]YYYY
  let m = s.match(/^(\d{1,2})[\/\-\s](\d{1,2})[\/\-\s](\d{2,4})$/);
  if (m) {
    const dd = +m[1], mm = +m[2], yy = +m[3] < 100 ? 2000 + +m[3] : +m[3];
    return new Date(yy, mm - 1, dd);
  }

  // YYYY[-/]MM[-/]DD
  m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);

  // “DD Mon YYYY” or “Mon DD, YYYY”
  m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/) || s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m) {
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    let dd, monStr, yyyy;
    if (isNaN(m[1])) { monStr = m[1]; dd = m[2]; yyyy = m[3]; }
    else { dd = m[1]; monStr = m[2]; yyyy = m[3]; }
    const mi = months.indexOf(String(monStr).slice(0, 3).toLowerCase());
    if (mi >= 0) return new Date(Number(yyyy), mi, Number(dd));
  }
  return null;
}

function detectDeleted(raw) {
  const flags = [
    raw?.isDeleted, raw?.deleted, raw?.is_removed, raw?.removed,
    raw?.delete, String(raw?.approval || "").toLowerCase() === "delete",
  ];
  return flags.some(v => v === true || String(v).toLowerCase() === "true");
}

function classifyStatus(raw) {
  const norm = (v) =>
    v === undefined || v === null
      ? ""
      : typeof v === "boolean"
        ? v ? "true" : "false"
        : String(v).trim().toLowerCase();

  const candidates = [
    norm(raw?.approval),
    norm(raw?.approvalStatus),
    norm(raw?.status),
    norm(raw?.state),
    norm(raw?.paymentStatus),
    norm(raw?.action),
    norm(raw?.statusText),
    norm(raw?.statusValue),
    norm(raw?.approval?.status),
    norm(raw?.approval?.state),
  ].filter(Boolean);

  for (const s of candidates) {
    if (/(approved|approve|acknowledge|acknowledged|paid|closed|completed)/i.test(s)) return "acknowledge";
    if (/(pending|awaiting|submitted|waiting|in[ -]?progress|todo)/i.test(s)) return "pending";
    if (/(clarif|clarification|need info|more info|query|question)/i.test(s)) return "clarification";
    if (/(reject|rejected|decline|denied)/i.test(s)) return "reject";
  }

  // boolean hints
  if (raw?.approved === true || String(raw?.approved).toLowerCase() === "true") return "acknowledge";
  if (raw?.acknowledged === true || String(raw?.acknowledged).toLowerCase() === "true") return "acknowledge";
  return "unknown";
}

function pickAmount(raw) {
  // try common total/amount fields
  const order = ["total", "amount", "pettyAmount", "value", "cost", "price", "amountPaid", "payment", "paid"];
  for (const k of order) {
    const n = safeNumber(raw?.[k]);
    if (n) return n;
  }
  // fallback: qty * price
  const qty = safeNumber(raw?.quantity ?? raw?.qty ?? raw?.count);
  const price = safeNumber(raw?.price ?? raw?.unitPrice ?? raw?.rate);
  const prod = qty * price;
  return prod || 0;
}

function detectCategoryKey(rawCategory, fallbackDesc = "") {
  if (!rawCategory && !fallbackDesc) return "Others";
  const s = String(rawCategory || fallbackDesc).toLowerCase();
  if (s.includes("food")) return "Food";
  if (s.includes("transport") || s.includes("travel") || s.includes("petrol") || s.includes("vehicle")) return "Transport & Travel";
  if (s.includes("rent") || s.includes("bill") || s.includes("repair") || s.includes("maint")) return "Office Maintenance";
  if (s.includes("market") || s.includes("print") || s.includes("digital")) return "Marketing";
  if (s.includes("station")) return "Stationery";
  if (s.includes("medic") || s.includes("tablet") || s.includes("insurance")) return "Medical";
  if (s.includes("welfare") || s.includes("outing") || s.includes("gift") || s.includes("festival")) return "Welfare";
  if (s.includes("asset") || s.includes("furnit") || s.includes("electronic") || s.includes("software")) return "Assets";
  return "Others";
}

export default function PettyCashCard({ pettyCollection = "PettyCash" }) {
  const [entries, setEntries] = useState([]);
  const [overallTotal, setOverallTotal] = useState(0);
  const [overallCount, setOverallCount] = useState(0);
  const [statusTotals, setStatusTotals] = useState({
    acknowledge: { total: 0, count: 0 },
    pending: { total: 0, count: 0 },
    clarification: { total: 0, count: 0 },
    reject: { total: 0, count: 0 },
    unknown: { total: 0, count: 0 },
  });
  const [unknownDateCount, setUnknownDateCount] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  // For "table inside table" expansion
  const [modalYear, setModalYear] = useState(null);
  const [expanded, setExpanded] = useState(null); // { category: string, monthIndex: number }

  // try multiple roots; flatten if needed
  useEffect(() => {
    const listeners = [];
    const paths = [
      `${pettyCollection}/admin`,
      `${pettyCollection}`,
      `PettyCash/admin`,
      `PettyCash`,
      `FB/PettyCash`,
      `FB/PettyCash/admin`,
      `Expenses/PettyCash`,
    ];
    const pathData = {};

    const normalizeNode = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val.map((v, i) => ({ id: v?.id ?? i, ...v }));
      if (typeof val === "object") return Object.keys(val).map(k => ({ id: k, ...(val[k] || {}) }));
      return [];
    };

    const rebuild = () => {
      const combined = Object.values(pathData).flat();

      // expand common child collections (e.g., payments/items)
      const expanded = [];
      combined.forEach(r => {
        let pushed = false;
        ["payments", "items", "rows", "list"].forEach(k => {
          if (r?.[k] && typeof r[k] === "object") {
            const arr = Array.isArray(r[k]) ? r[k] : Object.values(r[k]);
            arr.forEach(p => expanded.push({ ...p, __parentId: r.id, __origin: r.__origin }));
            pushed = true;
          }
        });
        if (!pushed) expanded.push(r);
      });

      // ---- DE-DUPE by logical signature ----
      const seen = new Map();
      const normalized = [];
      expanded.forEach(r => {
        const dateRaw = r.date ?? r.pettyDate ?? r.paymentDate ?? r.createdAt ?? r.forDate ?? r.for ?? r.dateTime;
        const dateParsed = parseDateRobust(dateRaw);
        const amountNum = pickAmount(r);
        const description = r.description ?? r.desc ?? r.comments ?? r.note ?? "";
        const main = r.mainCategory ?? r.category ?? r.type ?? "";
        const sub = r.subCategory ?? r.subCat ?? r.subCategoryText ?? "";
        const sig = [
          dateParsed ? dateParsed.getTime() : String(dateRaw || ""),
          String(description || "").trim().toLowerCase(),
          Number(amountNum || 0),
          String(main || "").trim().toLowerCase(),
          String(sub || "").trim().toLowerCase()
        ].join("|");

        if (!seen.has(sig)) {
          seen.set(sig, true);
          const deleted = detectDeleted(r);
          const status = classifyStatus(r);
          normalized.push({
            sig,
            id: r.id ?? `${r.__origin || "pc"}-${Math.random().toString(36).slice(2, 9)}`,
            raw: r,
            __origin: r.__origin || "",
            dateRaw, dateParsed,
            deleted,
            amountNum,
            status,
            description,
            mainCategory: main,
            subCategory: sub,
            categoryNormalized: detectCategoryKey(main || sub || "", description),
            quantity: r.quantity ?? r.qty ?? r.count ?? null,
            price: r.price ?? r.unitPrice ?? r.rate ?? null,
            total: r.total ?? r.amount ?? r.value ?? null,
          });
        }
      });

      // totals (EXCLUDE deleted & reject)

      let grand = 0;
      let gcount = 0;
      const stat = {
        acknowledge: { total: 0, count: 0 },
        pending: { total: 0, count: 0 },
        clarification: { total: 0, count: 0 },
        reject: { total: 0, count: 0 },
        unknown: { total: 0, count: 0 },
      };

      // Count only unique, valid (non-deleted, non-rejected, amount>0) entries
      const countSeen = new Set();

      normalized.forEach(e => {
        if (e.deleted) return;
        const st = e.status || "unknown";
        if (!stat[st]) stat[st] = { total: 0, count: 0 };
        stat[st].total += Number(e.amountNum || 0);
        stat[st].count += 1;

        // ONLY APPROVED (acknowledge) contribute to grand total & count
        if (st == "acknowledge" && Number(e.amountNum || 0) > 0) {
          grand += Number(e.amountNum || 0);
          if (!countSeen.has(e.sig)) {
            countSeen.add(e.sig);
            gcount += 1;
          }
        }
      });
      setEntries(
        normalized.sort((a, b) => (b.dateParsed?.getTime() || 0) - (a.dateParsed?.getTime() || 0))
      );
      setUnknownDateCount(normalized.filter(e => !e.dateParsed).length);
      setOverallTotal(grand);
      setOverallCount(gcount);
      setStatusTotals(stat);
    };

    const fdb = firebaseDB;
    paths.forEach(p => {
      try {
        const ref = typeof fdb?.child === "function" ? fdb.child(p) : (fdb?.ref ? fdb.ref(p) : null);
        if (!ref) return;
        const cb = snap => {
          const val = snap.val();
          const arr = normalizeNode(val).map(a => ({ ...a, __origin: p }));
          pathData[p] = arr;
          rebuild();
        };
        ref.on("value", cb);
        listeners.push({ ref, cb });
      } catch { }
    });

    return () => {
      try { listeners.forEach(({ ref, cb }) => ref.off("value", cb)); } catch { }
    };
  }, [pettyCollection]);

  // Year → Month → Category matrix (with “Unknown” bucket = index 12). Totals exclude rejects.
  const grouped = useMemo(() => {
    const years = {};
    entries.forEach(e => {
      if (e.deleted) return;
      const y = e.dateParsed ? e.dateParsed.getFullYear() : "Unknown";
      const m = e.dateParsed ? e.dateParsed.getMonth() : 12; // 0..11, or 12 for Unknown
      if (!years[y]) years[y] = { months: Array.from({ length: 13 }, () => ({ categories: {}, entries: [] })) };
      const mo = years[y].months[m];
      // push all entries for details view
      mo.entries.push(e);
      // Only add to totals if APPROVED (acknowledge)
      if (e.status === "acknowledge") {
        const cat = e.categoryNormalized;
        mo.categories[cat] = (mo.categories[cat] || 0) + Number(e.amountNum || 0);
      }
    });
    const yearKeys = Object.keys(years).sort((a, b) => (a === "Unknown") ? 1 : (b === "Unknown") ? -1 : Number(b) - Number(a));
    return { years, yearKeys };
  }, [entries]);

  // sync modalYear when opening
  useEffect(() => {
    if (!modalOpen) return;
    const keys = grouped.yearKeys || [];
    setModalYear(keys.length ? keys[0] : null);
  }, [modalOpen, grouped.yearKeys]);

  const yearMatrix = useMemo(() => {
    const yearObj = modalYear ? grouped.years[modalYear] : null;
    const rows = [...MAIN_CATEGORIES, "Others"].map(cat => {
      const months = new Array(13).fill(0).map((_, i) =>
        yearObj ? Number(yearObj.months[i]?.categories?.[cat] || 0) : 0
      );
      const grand = months.reduce((s, v) => s + v, 0);
      return { category: cat, months, grand };
    });
    const yearTotal = rows.reduce((s, r) => s + r.grand, 0);
    return { rows, yearTotal };
  }, [modalYear, grouped]);

  // compute expanded detail rows
  const expandedRows = useMemo(() => {
    if (!expanded || !modalYear) return [];
    const monthsObj = grouped.years[modalYear]?.months || [];
    const cat = expanded.category;
    const mk = expanded.monthIndex; // 0..12 (12 = Unknown) and *must* be a number here
    const pool = (monthsObj[mk]?.entries || []);
    const filtered = pool.filter(e => e.categoryNormalized === cat);
    // Show all (including rejects), but style rejects in red
    return filtered.sort((a, b) => (b.dateParsed?.getTime() || 0) - (a.dateParsed?.getTime() || 0));
  }, [expanded, modalYear, grouped]);

  const formatINR = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n || 0));
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Unknown"];

  const openDetails = (category, monthIndex) => {
    setExpanded({ category, monthIndex });
  };

  // ------- UI -------
  return (
    <>
      {/* Collapsed card */}
      <div className="petty-cash-card" onClick={() => setModalOpen(true)}>
        <div className="invest-card__box" role="button">
          <div className="invest-card__head">
            <div className="invest-card__icon">💸</div>
            <div className="invest-card__meta">
              <div className="invest-card__label">Petty Cash</div>
              {/* GRAND TOTAL (non-deleted, non-rejected) */}
              <div className="invest-card__total">{formatINR(overallTotal)} ({overallCount})</div>

            </div>
          </div>
          <div className="invest-card__divider" />
          <div style={{ fontSize: 12, opacity: .85, paddingLeft: "20px" }}>
            Ack: {formatINR(statusTotals.acknowledge?.total || 0)} | Pend: {formatINR(statusTotals.pending?.total || 0)} | Clar: {formatINR(statusTotals.clarification?.total || 0)} | <span style={{ color: "#f3c807ff" }}>Rej: {formatINR(statusTotals.reject?.total || 0)}</span>
          </div>
        </div>
      </div>

      {/* Modal with matrix & Unknown month bucket + inner detail table */}
      {modalOpen && (
        <div className="invest-modal-backdrop" onClick={() => { setModalOpen(false); setExpanded(null); }}>
          <div className="invest-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="invest-modal-content" style={{ backgroundColor: "#202c38" }}>
              <div className="invest-modal-investor-bar bg-secondary text-white justify-content-between">
                <div style={{ fontWeight: 700 }}>Petty Cash Report</div>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <div className="petty-header-card" style={{ background: "#0b84a8", padding: 10 }}>
                    <div style={{ fontSize: 12 }}>Total (Non-rejected)</div>
                    <div style={{ fontWeight: 700 }}>{formatINR(overallTotal)}</div>
                    <div style={{ fontSize: 11 }}>{overallCount} entries</div>
                  </div>
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
                  <div className="petty-header-card" style={{ background: "#3a1a1a", padding: 10, border: "1px solid #ff6b6b" }}>
                    <div style={{ fontSize: 12 }}>Rejected</div>
                    <div style={{ fontWeight: 700, color: "#ff6b6b" }}>{formatINR(statusTotals.reject?.total || 0)}</div>
                    <div style={{ fontSize: 11 }}>{statusTotals.reject?.count || 0} entries</div>
                  </div>
                </div>
                <div className="action-btn-wrapper">
                  <button className="btn btn-sm btn-danger" onClick={() => { setModalOpen(false); setExpanded(null); }}>Close</button>
                </div>
              </div>

              <div className="invest-modal-body summary-tabs-container">
                {/* Year tabs */}
                <div className="mb-3">
                  <ul className="nav nav-tabs summary-tabs">
                    {(grouped.yearKeys?.length ? grouped.yearKeys : ["No Data"]).map((y) => (
                      <li className="nav-item" key={y}>
                        <button
                          className={`nav-link summary-tab ${String(modalYear) === String(y) ? "active" : ""}`}
                          onClick={() => { setModalYear(y === "No Data" ? null : y); setExpanded(null); }}
                          disabled={y === "No Data"}
                        >
                          {y}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Unknown date hint */}
                {unknownDateCount > 0 && (
                  <div className="alert alert-warning py-2">
                    {unknownDateCount} entries had unrecognized dates — they appear in the <strong>Unknown</strong> month column.
                  </div>
                )}

                {/* Matrix table */}
                <div className="table-responsive summary-table-container">
                  <table className="table table-dark summary-table table-hover align-middle">
                    <thead>
                      <tr>
                        <th style={{ width: 60 }}>S No</th>
                        <th style={{ minWidth: 220 }}>Category</th>
                        {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Unknown"].map((m) => (
                          <th key={m} style={{ width: 80 }}>{m}</th>
                        ))}
                        <th style={{ width: 140 }}>Grand Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {yearMatrix.rows.map((r, idx) => (
                        <React.Fragment key={r.category}>
                          <tr>
                            <td style={{ textAlign: "left" }}>{idx + 1}</td>
                            <td style={{ textAlign: "left" }}>{r.category}</td>
                            {r.months.map((val, mi) => (
                              <td key={mi}>
                                {/* Only clicking on VALUE opens details; empty cells are not interactive */}
                                {val ? (
                                  <button
                                    className="btn btn-link text-white p-0 m-0 text-decoration-none"
                                    onClick={(e) => { e.stopPropagation(); openDetails(r.category, mi); }}
                                    title={`Show details for ${r.category} in ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Unknown"][mi]}`}
                                  >
                                    {val.toLocaleString("en-IN")}
                                  </button>
                                ) : (
                                  ""
                                )}
                              </td>
                            ))}
                            <td><strong>{r.grand.toLocaleString("en-IN")}</strong></td>
                          </tr>

                          {/* INNER DETAILS ROW */}
                          {expanded && expanded.category === r.category && (
                            <tr className="table-info">
                              <td colSpan={16}>
                                <div className="d-flex justify-content-between align-items-center">
                                  <div style={{ color: "#444" }}>
                                    <strong>Details — {r.category}</strong>
                                    <span className="ms-2">
                                      (Month: {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Unknown"][expanded.monthIndex]})
                                    </span>
                                  </div>
                                  <div>
                                    <button className="btn btn-sm btn-info" onClick={() => setExpanded(null)}>Close</button>
                                  </div>
                                </div>

                                <div className="table-responsive mt-2">
                                  <table className="table table-sm table-striped">
                                    <thead>
                                      <tr>
                                        <th>#</th>
                                        <th>Date</th>
                                        <th>Main</th>
                                        <th>Sub</th>
                                        <th>Description</th>
                                        <th>Qty</th>
                                        <th>Price</th>
                                        <th>Total</th>
                                        <th>Status</th>
                                        <th>Origin</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {expandedRows.map((e, i) => {
                                        const isRejected = e.status === "reject";
                                        return (
                                          <tr key={e.id} style={isRejected ? { backgroundColor: "#2a1a1a" } : undefined}>
                                            <td>{i + 1}</td>
                                            <td>{e.dateParsed ? e.dateParsed.toLocaleDateString() : (e.dateRaw || "-")}</td>
                                            <td>{e.mainCategory || "-"}</td>
                                            <td>{e.subCategory || "-"}</td>
                                            <td style={{ maxWidth: 260, whiteSpace: "pre-wrap" }}>{e.description || "-"}</td>
                                            <td>{e.quantity ?? ""}</td>
                                            <td>{e.price ?? ""}</td>
                                            <td style={isRejected ? { color: "#ff6b6b", fontWeight: 700 } : undefined}>
                                              {(e.total ?? e.amountNum ?? "").toLocaleString("en-IN")}
                                            </td>
                                            <td style={isRejected ? { color: "#ff6b6b", fontWeight: 600 } : undefined}>
                                              {e.status}
                                            </td>
                                            <td>{e.__origin || "-"}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="table-success">
                        <td colSpan={15}><strong>Year Total</strong></td>
                        <td><strong>{yearMatrix.yearTotal.toLocaleString("en-IN")}</strong></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}

PettyCashCard.propTypes = { pettyCollection: PropTypes.string };
