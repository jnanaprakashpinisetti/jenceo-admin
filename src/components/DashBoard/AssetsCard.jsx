// src/components/DashBoard/AssetsCard.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import firebaseDB from "../../firebase";

/**
 * AssetsCard.jsx (fixed2)
 *
 * - Aggressively expands child lists in PettyCash/admin and Assets nodes (payments, assets, items, purchases).
 * - Builds TWO independent normalized lists:
 *      1) assetsList: from Assets / Assets/admin paths
 *      2) pettyAssets: from PettyCash/admin (only APPROVED + asset-like entries; expands children)
 * - Final list = concat(assetsList, pettyAssets) with light deduping (only exact same id or exact same receipt+amount+date)
 *   so we avoid accidentally merging two distinct child items into one entry.
 * - Filters final list to asset-like entries using robust heuristics.
 *
 * Drop into src/components/DashBoard/AssetsCard.jsx and rebuild.
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
  // if node contains obvious list keys, return those children
  const listKeys = ["assets","items","payments","purchases","purchaseItems","paymentItems","children"];
  for (const lk of listKeys) {
    if (lk in val) {
      const arr = val[lk];
      if (Array.isArray(arr)) return arr.map((a, i) => ({ id: a?.id ?? i, ...a }));
      if (typeof arr === "object") return Object.keys(arr).map(k => ({ id: k, ...(arr[k] || {}) }));
    }
  }
  if (Array.isArray(val)) return val.map((v,i) => ({ id: v?.id ?? i, ...v }));
  if (typeof val === "object") {
    const keys = Object.keys(val);
    const hasAmt = keys.some(k => ["price","amount","total","value","cost"].includes(k));
    const hasDate = keys.some(k => ["date","purchaseDate","acquiredAt","createdAt","pettyDate","paymentDate"].includes(k));
    if (hasAmt && hasDate && keys.length > 2) return [{ id: val.id ?? "single", ...val }];
    // else it's a keyed object -> map
    return Object.keys(val).map(k => ({ id: k, ...(val[k] || {}) }));
  }
  return [];
}

function extractFields(rec) {
  const dateRaw = rec.purchaseDate ?? rec.date ?? rec.acquiredAt ?? rec.createdAt ?? rec.pettyDate ?? rec.paymentDate ?? null;
  const amt = rec.price ?? rec.total ?? rec.amount ?? rec.value ?? rec.cost ?? 0;
  const category = rec.category ?? rec.mainCategory ?? rec.type ?? rec.assetCategory ?? rec.maincategory ?? "Others";
  return {
    id: rec.id ?? rec._id ?? rec.uid ?? `${Math.random().toString(36).slice(2,9)}`,
    dateRaw,
    dateParsed: parseDateRobust(dateRaw),
    priceNum: safeNumber(amt),
    categoryNormalized: typeof category === "string" ? String(category).trim() : "Others",
    description: rec.description ?? rec.name ?? rec.title ?? rec.pettyFor ?? rec.for ?? rec.desc ?? "",
    model: rec.model ?? "",
    vendor: rec.vendor ?? rec.supplier ?? rec.vendorName ?? rec.employeeName ?? "",
    receipt: rec.receiptNo ?? rec.receptNo ?? rec.receipt ?? rec.ref ?? "",
    raw: rec,
    __origin: rec.__origin || ""
  };
}

export default function AssetsCard({ assetsCollection = "Assets" }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const modalRef = useRef(null);
  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => {
    let mounted = true;
    const listeners = [];
    const pathData = {}; // path -> raw value

    const pathsToWatch = [
      "PettyCash/admin",
      `${assetsCollection}/admin`,
      `${assetsCollection}`,
      "Assets/admin",
      "Assets",
      "JenCeo-DataBase/Assets/admin"
    ];

    async function rebuild() {
      try {
        // build assetsList from Assets paths
        const assetsPaths = [`${assetsCollection}/admin`, `${assetsCollection}`, `Assets/admin`, `Assets`];
        let assetsList = [];
        for (const p of assetsPaths) {
          const raw = pathData[p];
          if (!raw) continue;
          const arr = normalizeNodeToArray(raw);
          const norm = arr.map(r => ({ ...extractFields(r), __origin: p }));
          assetsList = assetsList.concat(norm);
        }

        // build pettyAssets from PettyCash/admin by expanding children and selecting approved + asset-like
        const pettyRaw = pathData["PettyCash/admin"];
        let pettyAssets = [];
        if (pettyRaw) {
          const arr = normalizeNodeToArray(pettyRaw); // this returns child list if node has payments etc, else keyed children or parent entries
          // For each parent entry in arr, expand its children too (some parents may still have nested payments)
          arr.forEach(parent => {
            // if parent itself has child lists, expand them
            const childCandidates = normalizeNodeToArray(parent);
            if (childCandidates.length > 1 || (childCandidates.length === 1 && (childCandidates[0].id !== parent.id))) {
              // treat each child separately; inherit parent fields where missing
              childCandidates.forEach(ch => {
                const merged = { ...parent, ...ch }; // child overrides parent
                // only include if approved and asset-like
                if (isApproved(merged) && looksLikeAsset(merged)) pettyAssets.push(extractFields({ ...merged, __origin: "PettyCash/admin" }));
              });
            } else {
              // no deeper children; treat parent itself
              if (isApproved(parent) && looksLikeAsset(parent)) pettyAssets.push(extractFields({ ...parent, __origin: "PettyCash/admin" }));
            }
          });
        }

        // Also consider direct children inside the top-level pettyRaw if it was an array of payments
        // (normalizeNodeToArray already handles arrays)

        // Combine lists (assetsCollection entries + pettyAssets)
        let combined = assetsList.concat(pettyAssets);

        // Filter to asset-like (extra safety)
        combined = combined.filter(c => looksLikeAsset(c.raw || c) || (c.categoryNormalized && String(c.categoryNormalized).toLowerCase().includes("asset")));

        // Deduplicate conservatively: prefer keeping distinct child rows. Only remove exact duplicates:
        const seen = new Set();
        const final = [];
        for (const item of combined) {
          const keyId = (item.id && String(item.id)) || "";
          const keySig = `${(item.receipt||"")}|${Math.round(item.priceNum||0)}|${(item.dateParsed ? item.dateParsed.toISOString().slice(0,10) : (item.dateRaw||""))}|${(item.description||"")}`;
          const dedupeKey = keyId ? `id:${keyId}` : `sig:${keySig}`;
          if (seen.has(dedupeKey)) continue;
          seen.add(dedupeKey);
          final.push(item);
        }

        // compute total
        const total = final.reduce((s, r) => s + Number(r.priceNum || 0), 0);

        if (mounted) {
          setEntries(final.sort((a,b) => (b.dateParsed?.getTime()||0) - (a.dateParsed?.getTime()||0)));
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

        // attach listeners for each path
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
              try { ref.on("child_changed", handler); } catch(e) {}
              try { ref.on("child_added", handler); } catch(e) {}
              try { ref.on("child_removed", handler); } catch(e) {}
            } else if (typeof ref.onSnapshot === "function") {
              ref.onSnapshot(snap => {
                const v = snap && typeof snap.data === "function" ? snap.data() : snap;
                pathData[path] = v;
                rebuild();
              }, err => console.error("[AssetsCard] onSnapshot err", err));
            } else if (typeof ref.once === "function") {
              ref.once("value").then(handler).catch(err => console.error("[AssetsCard] once err", err));
            }
            listeners.push({ ref, path });
          } catch (inner) {
            console.error("[AssetsCard] attach inner", inner);
          }
        });

        // initial rebuild (in case listeners didn't fire yet)
        await rebuild();
      } catch (err) {
        console.error("AssetsCard init error", err);
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      try {
        listeners.forEach(({ ref }) => {
          try {
            if (ref && typeof ref.off === "function") {
              try { ref.off("value"); } catch {}
              try { ref.off("child_changed"); } catch {}
              try { ref.off("child_added"); } catch {}
              try { ref.off("child_removed"); } catch {}
            }
          } catch (e) {}
        });
      } catch (e) {}
    };
  }, [assetsCollection]);

  const activeTotal = totalValue;
  const activeCount = entries.length;

  return (
    <>
      <div className="assets-card" onClick={() => setModalOpen(true)} style={{ cursor: "pointer" }}>
        <div className="invest-card__box" role="button">
          <div className="invest-card__head">
            <div className="invest-card__icon">🏷️</div>
            <div className="invest-card__meta">
              <div className="invest-card__label">Assets</div>
              <div className="invest-card__total">{loading ? "Loading..." : formatINR(activeTotal)}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <div style={{ fontSize: 12 }}>{activeCount} Items</div>
              </div>
            </div>
          </div>
          <div className="invest-card__divider" />
        </div>
      </div>

      {modalOpen && (
        <div className="invest-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="invest-modal-dialog" ref={modalRef} onClick={e => e.stopPropagation()}>
            <div className="invest-modal-content" style={{ backgroundColor: "#202c38" }}>
              <div className="invest-modal-investor-bar bg-secondary text-white justify-content-between">
                <div style={{ fontWeight: 700 }}>Assets</div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div className="petty-header-card" style={{ background: "#0b84a8", padding: 10 }}>
                    <div style={{ fontSize: 12 }}>Total Value</div>
                    <div style={{ fontWeight: 700 }}>{formatINR(activeTotal)}</div>
                    <div style={{ fontSize: 11 }}>{activeCount} items</div>
                  </div>
                  <button className="btn btn-sm btn-danger" onClick={() => setModalOpen(false)}>Close</button>
                </div>
              </div>

              <div className="invest-modal-body summary-tabs-container" style={{ padding: 12 }}>
                <div className="table-responsive summary-table-container">
                  <table className="table table-dark summary-table table-hover">
                    <thead>
                      <tr>
                        <th>#</th><th>Date</th><th>Category</th><th>Description</th><th>Model</th><th>Vendor</th><th>Price</th><th>Receipt</th><th>Origin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((er, ei) => (
                        <tr key={er.id || ei}>
                          <td>{ei+1}</td>
                          <td>{er.dateParsed ? `${String(er.dateParsed.getDate()).padStart(2,"0")}/${String(er.dateParsed.getMonth()+1).padStart(2,"0")}/${er.dateParsed.getFullYear()}` : (er.dateRaw||"-")}</td>
                          <td>{er.categoryNormalized}</td>
                          <td style={{ maxWidth: 400, whiteSpace: "pre-wrap" }}>{er.description || "-"}</td>
                          <td>{er.model || "-"}</td>
                          <td>{er.vendor || "-"}</td>
                          <td>{formatINR(er.priceNum)}</td>
                          <td>{er.receipt || "-"}</td>
                          <td style={{ fontSize: 12 }}>{er.__origin || "-"}</td>
                        </tr>
                      ))}
                      {entries.length === 0 && <tr><td colSpan={9} className="text-center small text-muted">No assets found</td></tr>}
                    </tbody>
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
