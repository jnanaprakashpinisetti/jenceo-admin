// src/components/DashBoard/AssetsCard.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import firebaseDB from "../../firebase";

/**
 * AssetsCard.jsx
 * - Uses totalNum (not price) for card and grouping sums.
 * - Table columns: S.No, Date, Sub Category, Description, Qty, Price, Total, Purchased by
 * - Adds table footer showing sum of totals for visible rows.
 * - Adds Export CSV for currently visible rows (price & total numeric values).
 */

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
  return null;
}

function formatINR(value) {
  const n = Number(value || 0);
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
  } catch {
    return "₹" + n.toLocaleString("en-IN");
  }
}

function isApproved(rec) {
  if (!rec) return false;
  const v = (x) => {
    if (x === undefined || x === null) return "";
    if (typeof x === "object") return JSON.stringify(x).toLowerCase();
    return String(x).toLowerCase();
  };
  const joint = [
    v(rec.approval), v(rec.approvalStatus), v(rec.approval_state), v(rec.approvalState),
    v(rec.status), v(rec.state), v(rec.paymentStatus), v(rec.action),
    v(rec.statusText), v(rec.status_name), v(rec.statusValue)
  ].filter(Boolean).join(" ");
  if (/(approved|approve|acknowledge|acknowledged|confirmed|paid)/.test(joint)) return true;
  const nums = [rec.approval, rec.approvalStatus, rec.status, rec.state, rec.statusCode, rec.code];
  for (const n of nums) {
    if (n === 1 || String(n) === "1") return true;
  }
  return false;
}

function looksLikeAsset(rec) {
  if (!rec) return false;
  const s = (x) => (x === undefined || x === null ? "" : String(x).toLowerCase());
  const main = s(rec.category || rec.mainCategory || rec.maincategory || rec.type || rec.assetCategory);
  const desc = s(rec.description || rec.desc || rec.for || rec.pettyFor || rec.item || rec.name || rec.title);
  const sub = s(rec.subCategory || rec.subcategory || rec.sub || "");
  if (main.includes("asset") || main === "assets") return true;
  if (sub.includes("asset")) return true;
  if (desc.match(/\b(asset|furniture|electronics|it equipment|computer|laptop|printer|vehicle|motorbike|car|utensil|kitchen|appliance|chair|table|bed|sofa|tv|ac)\b/)) return true;
  if (rec.assetTag || rec.asset_id || rec.assetId) return true;
  if (main.includes("capex") || main.includes("capital")) return true;
  return false;
}

function normalizeNodeToArray(val) {
  if (!val) return [];
  const listKeys = ["assets", "items", "payments", "purchases", "purchaseItems", "paymentItems", "children"];
  for (const lk of listKeys) {
    if (lk in val) {
      const arr = val[lk];
      if (Array.isArray(arr)) return arr.map((a, i) => ({ id: a?.id ?? i, ...a }));
      if (typeof arr === "object") return Object.keys(arr).map(k => ({ id: k, ...(arr[k] || {}) }));
    }
  }
  if (Array.isArray(val)) return val.map((v, i) => ({ id: v?.id ?? i, ...v }));
  if (typeof val === "object") {
    const keys = Object.keys(val);
    const hasAmt = keys.some(k => ["price", "amount", "total", "value", "cost"].includes(k));
    const hasDate = keys.some(k => ["date", "purchaseDate", "acquiredAt", "createdAt", "pettyDate", "paymentDate"].includes(k));
    if (hasAmt && hasDate && keys.length > 2) return [{ id: val.id ?? "single", ...val }];
    return Object.keys(val).map(k => ({ id: k, ...(val[k] || {}) }));
  }
  return [];
}

function extractFields(rec) {
  const dateRaw = rec.purchaseDate ?? rec.date ?? rec.acquiredAt ?? rec.createdAt ?? rec.pettyDate ?? rec.paymentDate ?? null;
  const priceCandidate = rec.price ?? rec.unitPrice ?? rec.unit_price ?? rec.rate ?? null;
  const totalCandidate = rec.total ?? rec.amount ?? rec.value ?? rec.cost ?? rec.totalAmount ?? rec.amountPaid ?? null;
  const qtyCandidate = rec.quantity ?? rec.qty ?? rec.count ?? rec.quantityPurchased ?? null;

  const priceNum = safeNumber(priceCandidate);
  let totalNum = safeNumber(totalCandidate);
  const qtyNum = (qtyCandidate !== undefined && qtyCandidate !== null && qtyCandidate !== "") ? safeNumber(qtyCandidate) : null;

  if ((!totalNum || totalNum === 0) && priceNum && qtyNum) {
    totalNum = priceNum * qtyNum;
  }

  if ((!totalNum || totalNum === 0) && priceNum) {
    totalNum = priceNum;
  }

  const category = rec.category ?? rec.mainCategory ?? rec.type ?? rec.assetCategory ?? rec.maincategory ?? "Others";
  return {
    id: rec.id ?? rec._id ?? rec.uid ?? `${Math.random().toString(36).slice(2, 9)}`,
    dateRaw,
    dateParsed: parseDateRobust(dateRaw),
    priceNum: Number(priceNum || 0),
    totalNum: Number(totalNum || 0),
    quantity: qtyNum,
    categoryNormalized: typeof category === "string" ? String(category).trim() : "Others",
    description: rec.description ?? rec.name ?? rec.title ?? rec.pettyFor ?? rec.for ?? rec.desc ?? "",
    model: rec.model ?? "",
    vendor: rec.vendor ?? rec.supplier ?? rec.vendorName ?? rec.employeeName ?? "",
    receipt: rec.receiptNo ?? rec.receptNo ?? rec.receipt ?? rec.ref ?? "",
    raw: rec,
    __origin: rec.__origin || ""
  };
}

function cleanPurchasedByName(rec) {
  const firstNonEmpty = (...xs) => xs.find(x => x !== undefined && x !== null && String(x).trim() !== "");
  const cand = firstNonEmpty(
    rec.purchasedByName,
    rec.purchasedBy,
    rec.employeeName,
    rec.requestedBy,
    rec.vendorName,
    rec.vendor,
    rec.payeeName,
    rec.createdByName,
    rec.createdBy
  );
  if (!cand) return "-";
  let name = String(cand);
  name = name.replace(/petty\s*cash/gi, "").replace(/pettycash/gi, "");
  name = name.replace(/[\/\\]/g, " ").replace(/<[^>]*>/g, " ").replace(/\s{2,}/g, " ").trim();
  const pretty = name.replace(/[^a-zA-Z .,'-]/g, "").replace(/\s{2,}/g, " ").trim();
  return pretty || "-";
}

function getSubCategory(rec) {
  const r = rec.raw || rec;
  const sub = r.subCategory ?? r.subcategory ?? r.sub;
  if (sub && String(sub).trim() !== "") return String(sub);
  const cat = r.category ?? r.assetCategory ?? r.type;
  const main = r.mainCategory ?? r.maincategory;
  if (cat && main && String(cat) !== String(main)) return String(cat);
  return rec.categoryNormalized || "Assets";
}

export default function AssetsCard({ assetsCollection = "Assets" }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const modalRef = useRef(null);
  const [totalValue, setTotalValue] = useState(0);

  const [activeYear, setActiveYear] = useState("ALL");
  const [activeMonth, setActiveMonth] = useState("ALL");

  useEffect(() => {
    let mounted = true;
    const pathData = {};

    const pathsToWatch = [
      "PettyCash/admin",
      `${assetsCollection}/admin`,
      `${assetsCollection}`,
      "Assets/admin",
      "Assets",
    ];

    async function rebuild() {
      try {
        const assetsPaths = [`${assetsCollection}/admin`, `${assetsCollection}`, `Assets/admin`, `Assets`];
        let assetsList = [];
        for (const p of assetsPaths) {
          const raw = pathData[p];
          if (!raw) continue;
          const arr = normalizeNodeToArray(raw);
          const norm = arr.map(r => ({ ...extractFields(r), __origin: p }));
          assetsList = assetsList.concat(norm);
        }

        const pettyRaw = pathData["PettyCash/admin"];
        let pettyAssets = [];
        if (pettyRaw) {
          const arr = normalizeNodeToArray(pettyRaw);
          arr.forEach(parent => {
            const childCandidates = normalizeNodeToArray(parent);
            if (childCandidates.length > 1 || (childCandidates.length === 1 && (childCandidates[0].id !== parent.id))) {
              childCandidates.forEach(ch => {
                const merged = { ...parent, ...ch };
                if (isApproved(merged) && looksLikeAsset(merged)) pettyAssets.push(extractFields({ ...merged, __origin: "PettyCash/admin" }));
              });
            } else {
              if (isApproved(parent) && looksLikeAsset(parent)) pettyAssets.push(extractFields({ ...parent, __origin: "PettyCash/admin" }));
            }
          });
        }

        let combined = assetsList.concat(pettyAssets);

        combined = combined.filter(c => looksLikeAsset(c.raw || c) || (c.categoryNormalized && String(c.categoryNormalized).toLowerCase().includes("asset")));

        const seen = new Set();
        const final = [];
        for (const item of combined) {
          const keyId = (item.id && String(item.id)) || "";
          const keySig = `${(item.receipt || "")}|${Math.round(item.totalNum || 0)}|${(item.dateParsed ? item.dateParsed.toISOString().slice(0, 10) : (item.dateRaw || ""))}|${(item.description || "")}`;
          const dedupeKey = keyId ? `id:${keyId}` : `sig:${keySig}`;
          if (seen.has(dedupeKey)) continue;
          seen.add(dedupeKey);
          final.push(item);
        }

        const total = final.reduce((s, r) => s + Number(r.totalNum || 0), 0);

        if (mounted) {
          const sorted = final.sort((a, b) => (b.dateParsed?.getTime() || 0) - (a.dateParsed?.getTime() || 0));
          setEntries(sorted);
          setTotalValue(total);
          setLoading(false);
        }
      } catch (e) {
        console.error("AssetsCard rebuild error", e);
        if (mounted) setLoading(false);
      }
    }

    (async () => {
      try {
        const fdb = firebaseDB;
        if (!fdb) { console.warn("[AssetsCard] firebaseDB missing"); setLoading(false); return; }

        pathsToWatch.forEach(path => {
          try {
            const ref = typeof fdb.child === "function" ? fdb.child(path) : (fdb.ref ? fdb.ref(path) : null);
            if (!ref) return;
            const handler = (snap) => {
              try {
                const val = snap && typeof snap.val === "function" ? snap.val() : snap;
                pathData[path] = val;
                rebuild();
              } catch (e) { console.error("[AssetsCard] handler error", e); }
            };
            if (typeof ref.on === "function") {
              ref.on("value", handler);
              try { ref.on("child_changed", handler); } catch (e) { }
              try { ref.on("child_added", handler); } catch (e) { }
              try { ref.on("child_removed", handler); } catch (e) { }
            } else if (typeof ref.onSnapshot === "function") {
              ref.onSnapshot(snap => {
                const v = snap && typeof snap.data === "function" ? snap.data() : snap;
                pathData[path] = v;
                rebuild();
              }, err => console.error("[AssetsCard] onSnapshot err", err));
            } else if (typeof ref.once === "function") {
              ref.once("value").then(handler).catch(err => console.error("[AssetsCard] once err", err));
            }
          } catch (inner) {
            console.error("[AssetsCard] attach inner", inner);
          }
        });
      } catch (err) {
        console.error("AssetsCard init error", err);
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [assetsCollection]);

  const grouping = useMemo(() => {
    const byYear = {};
    for (const e of entries) {
      const d = e.dateParsed;
      const y = d ? d.getFullYear() : "Unknown";
      const m = d ? d.getMonth() : "Unknown";
      if (!byYear[y]) byYear[y] = { months: {}, totals: { count: 0, sum: 0 } };
      if (!byYear[y].months[m]) byYear[y].months[m] = { entries: [], count: 0, sum: 0 };
      byYear[y].months[m].entries.push(e);
      byYear[y].months[m].count += 1;
      byYear[y].months[m].sum += Number(e.totalNum || 0);
      byYear[y].totals.count += 1;
      byYear[y].totals.sum += Number(e.totalNum || 0);
    }
    const years = Object.keys(byYear).sort((a, b) => {
      if (a === "Unknown") return 1;
      if (b === "Unknown") return -1;
      return Number(b) - Number(a);
    });
    const monthsSorted = {};
    years.forEach(y => {
      const months = Object.keys(byYear[y].months).sort((a, b) => {
        if (a === "Unknown") return 1;
        if (b === "Unknown") return -1;
        return Number(a) - Number(b);
      });
      monthsSorted[y] = months;
    });
    return { byYear, years, monthsSorted };
  }, [entries]);

  const filteredRows = useMemo(() => {
    if (activeYear === "ALL") return entries;
    const yBlock = grouping.byYear[activeYear];
    if (!yBlock) return [];
    if (activeMonth === "ALL") {
      const all = [];
      Object.values(yBlock.months).forEach(mb => all.push(...mb.entries));
      return all;
    }
    const mBlock = yBlock.months[activeMonth];
    return mBlock ? mBlock.entries : [];
  }, [activeYear, activeMonth, grouping, entries]);

  const activeTotal = filteredRows.reduce((s, r) => s + Number(r.totalNum || 0), 0);
  const activeCount = filteredRows.length;

  const mm = (i) => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i] || "Unknown";
  const fmtDate = (d, raw) => d ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}` : (raw || "-");

  function downloadCSV(e) {
    // stop propagation to avoid closing modal if clicked in header
    if (e && e.stopPropagation) e.stopPropagation();

    const rows = filteredRows.map((r, idx) => ({
      sno: idx + 1,
      date: r.dateParsed ? r.dateParsed.toISOString().slice(0, 10) : (r.dateRaw || ""),
      subCategory: getSubCategory(r),
      description: (r.description || "").replace(/\n/g, " "),
      qty: (r.quantity !== null && r.quantity !== undefined) ? r.quantity : "",
      price: Number(r.priceNum || 0),
      total: Number(r.totalNum || 0),
      purchasedBy: cleanPurchasedByName(r.raw || r)
    }));

    const header = ["N.No", "Date", "Sub Category", "Description", "Qty", "Price (numeric)", "Total (numeric)", "Purchased by"];
    const csvContent = [header.join(",")]
      .concat(rows.map(row => [
        row.sno,
        `"${row.date}"`,
        `"${(row.subCategory || "").replace(/"/g, '""')}"`,
        `"${(row.description || "").replace(/"/g, '""')}"`,
        row.qty,
        row.price,
        row.total,
        `"${(row.purchasedBy || "").replace(/"/g, '""')}"`
      ].join(",")))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `assets_export_${activeYear === "ALL" ? "ALL" : activeYear}_${activeMonth === "ALL" ? "ALL" : activeMonth}_${ts}.csv`;
    if (navigator.msSaveBlob) { // IE10+
      navigator.msSaveBlob(blob, filename);
    } else {
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

  return (
    <>
      <div className="assets-card" onClick={() => setModalOpen(true)} style={{ cursor: "pointer" }}>
        <div className="invest-card__box" role="button">
          <div className="invest-card__head">
            <div className="invest-card__icon">🏷️</div>
            <div className="invest-card__meta">
              <div className="invest-card__label">Assets</div>
              <div className="invest-card__total">{loading ? "Loading..." : formatINR(totalValue)}</div>

            </div>
          </div>
          <div className="invest-card__divider" />
          <div style={{ display: "flex", gap: 8, marginTop: 8, paddingLeft: "20px" }}>
            <div style={{ fontSize: 12 }}>{entries.length} Items</div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="invest-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="invest-modal-dialog" ref={modalRef} onClick={e => e.stopPropagation()}>
            <div className="invest-modal-content" style={{ backgroundColor: "#202c38" }}>
              <div className="invest-modal-investor-bar bg-secondary text-white justify-content-between" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px" }}>
                <div style={{ fontWeight: 700 }}>Assets</div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div className="petty-header-card" style={{ background: "#0b84a8", padding: 10 }}>
                    <div style={{ fontSize: 12 }}>Showing</div>
                    <div style={{ fontWeight: 700 }}>{formatINR(activeTotal)}</div>
                    <div style={{ fontSize: 11 }}>{activeCount} items</div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn btn-sm btn-outline-light"
                      onClick={(ev) => { ev.stopPropagation(); downloadCSV(ev); }}
                      title="Export visible rows as CSV"
                    >
                      Export CSV
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => setModalOpen(false)}>Close</button>
                  </div>
                </div>
              </div>

              <div className="invest-modal-body summary-tabs-container" style={{ padding: 12 }}>
                <div className="nav nav-pills mb-2" style={{ gap: 8, flexWrap: "wrap" }}>
                  {grouping.years.map(y => (
                    <button
                      key={y}
                      className={`btn btn-sm ${String(activeYear) === String(y) ? "btn-primary" : "btn-outline-primary"}`}
                      onClick={() => { setActiveYear(y); setActiveMonth("ALL"); }}
                    >
                      {y} ({grouping.byYear[y].totals.count})
                    </button>
                  ))}
                  <button
                    className={`btn btn-sm ${activeYear === "ALL" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => { setActiveYear("ALL"); setActiveMonth("ALL"); }}
                  >
                    ALL ({entries.length})
                  </button>
                </div>

                {activeYear !== "ALL" && (
                  <div className="nav nav-pills mb-3" style={{ gap: 8, flexWrap: "wrap" }}>
                    {(grouping.monthsSorted[activeYear] || []).map(m => (
                      <button
                        key={`${activeYear}-${m}`}
                        className={`btn btn-xs ${String(activeMonth) === String(m) ? "btn-info" : "btn-outline-info"}`}
                        onClick={() => setActiveMonth(m)}
                      >
                        {m === "Unknown" ? "Unknown" : mm(Number(m))}
                      </button>
                    ))}
                    <button
                      className={`btn btn-xs ${activeMonth === "ALL" ? "btn-info" : "btn-outline-info"}`}
                      onClick={() => setActiveMonth("ALL")}
                    >
                      ALL
                    </button>
                  </div>
                )}

                <div className="table-responsive summary-table-container" style={{ maxHeight: "60vh", overflow: "auto" }}>
                  <table className="table table-dark summary-table table-hover">
                    <thead>
                      <tr>
                        <th style={{ width: 64 }}>S.No</th>
                        <th style={{ width: 120 }}>Date</th>
                        <th>Sub Category</th>
                        <th style={{ minWidth: 240 }}>Description</th>
                        <th style={{ width: 80 }}>Qty</th>
                        <th style={{ width: 140 }}>Price</th>
                        <th style={{ width: 140 }}>Total</th>
                        <th style={{ width: 220 }}>Purchased by</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((er, idx) => (
                        <tr key={er.id || `${er.receipt}-${idx}`}>
                          <td>{idx + 1}</td>
                          <td>{fmtDate(er.dateParsed, er.dateRaw)}</td>
                          <td>{getSubCategory(er)}</td>
                          <td style={{ whiteSpace: "pre-wrap" }}>{er.description || "-"}</td>
                          <td>{(er.quantity !== null && er.quantity !== undefined) ? er.quantity : "-"}</td>
                          <td>{formatINR(er.priceNum)}</td>
                          <td>{formatINR(er.totalNum)}</td>
                          <td>{cleanPurchasedByName(er.raw || er)}</td>
                        </tr>
                      ))}
                      {filteredRows.length === 0 && (
                        <tr>
                          <td colSpan={8} className="text-center small text-muted">No assets found</td>
                        </tr>
                      )}
                    </tbody>

                    {/* Footer with totals */}
                    <tfoot>
                      <tr style={{ fontWeight: 700, borderTop: "2px solid rgba(255,255,255,0.08)" }}>
                        <td colSpan={6} style={{ textAlign: "right", paddingRight: 12 }}>Total of Totals</td>
                        <td>{formatINR(activeTotal)}</td>
                        <td />
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
