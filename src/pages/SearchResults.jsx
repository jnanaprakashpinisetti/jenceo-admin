// src/pages/SearchResults.jsx
import React, { useEffect, useMemo, useState } from "react";
import firebaseDB from "../firebase"; // default export from your src/firebase.js

/*
  Global Search Results page (dark theme)
  - Searches multiple DB nodes (includes names observed in your project)
  - Traverses snapshots recursively to find leaf records (handles nested structures)
  - Matches by common fields first, then falls back to JSON-string match
  - Merges results from external 'globalSearchResults' dispatch if any module provides them
*/

function getQueryParam(name = "q") {
  const params = new URLSearchParams(window.location.search);
  return params.get(name) || "";
}

const SAFE_MAX_DEPTH = 4; // traverse nested snapshots up to this depth

// Recursively collect candidate records from a snapshot.
// We consider a "record" a child node whose value is an object and contains at least one
// primitive property (string/number/boolean). For deeply nested structures we keep traversing.
function collectRecordsFromSnapshot(snap, depth = 1, parentPath = "") {
  const rows = [];

  if (!snap) return rows;
  const val = snap.val();

  // If this node itself is a record-like object (has primitive props), add it.
  const looksLikeRecord = (obj) => {
    if (!obj || typeof obj !== "object") return false;
    // count primitive fields
    let primCount = 0;
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (v === null) continue;
      const t = typeof v;
      if (t === "string" || t === "number" || t === "boolean") primCount++;
      if (primCount >= 1) return true;
    }
    return false;
  };

  if (looksLikeRecord(val)) {
    // top-level snapshot already a record collection keyed by id? If the snapshot key is a record itself,
    // create one entry with id equal to the snapshot key (if exists) or parentPath.
    const id = snap.key || parentPath || Date.now().toString();
    rows.push({ id: id, ...val });
    return rows;
  }

  // Otherwise iterate children and attempt to extract records (limit depth)
  if (typeof snap.forEach === "function") {
    snap.forEach((child) => {
      const childVal = child.val();
      if (looksLikeRecord(childVal)) {
        rows.push({ id: child.key, ...childVal });
      } else if (depth < SAFE_MAX_DEPTH) {
        // recurse deeper
        const sub = collectRecordsFromSnapshot(child, depth + 1, `${parentPath}/${child.key}`);
        // if sub entries have no id, annotate with composed path to be unique
        sub.forEach((s) => {
          if (!s.id) s.id = `${child.key}-${JSON.stringify(s).slice(0, 8)}`;
        });
        rows.push(...sub);
      } else {
        // as a last attempt, if childVal is primitive or array, represent as a simple object
        if (childVal !== null && typeof childVal !== "object") {
          rows.push({ id: child.key, value: childVal });
        } else if (Array.isArray(childVal)) {
          rows.push({ id: child.key, value: childVal });
        }
      }
    });
  }

  return rows;
}

export default function SearchResults() {
  const queryRaw = getQueryParam("q");
  const query = (queryRaw || "").trim();
  const [results, setResults] = useState({}); // { nodeName: [records] }
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Accept results from external listener via 'globalSearchResults' event (optional)
  useEffect(() => {
    function onExternalResults(e) {
      const payload = e?.detail;
      if (payload && payload.results) {
        setResults((prev) => ({ ...prev, ...payload.results }));
      }
    }
    window.addEventListener("globalSearchResults", onExternalResults);
    return () => window.removeEventListener("globalSearchResults", onExternalResults);
  }, []);

  useEffect(() => {
    if (!query) {
      setResults({});
      setMessage("Enter a search query.");
      return;
    }

    // Notify other modules (they may call back with 'globalSearchResults')
    window.dispatchEvent(new CustomEvent("performGlobalSearch", { detail: { query } }));

    // Node names to search — includes the variants found across your codebase.
    // If your DB uses other top-level names, add them here.
    const DB_NODES = [
      "Investments",
      "PettyCash",
      "PettyCash/admin",
      "ClientData",
      "ClientInfo",
      "WorkerCallData",
      "WorkerCallsData",
      "DeletedWorkersData",
      "Expenses",
      "Enquiry",
      "HospitalData",
      "HospitalList",
      "Employees",
      "PettyCash/admin", // duplicate okay — handled below
    ];

    // Remove duplicates while preserving order
    const uniqueNodes = Array.from(new Set(DB_NODES));

    let cancelled = false;
    (async () => {
      setLoading(true);
      setMessage("Searching across database...");

      if (!firebaseDB || typeof firebaseDB.child !== "function") {
        setMessage("No firebase DB helper found (check ../firebase export).");
        setLoading(false);
        return;
      }

      const qLower = query.toLowerCase();

      // Which fields to check first (faster), per-record
      const searchableFields = [
        "name",
        "investor",
        "clientName",
        "employeeName",
        "patientName",
        "purpose",
        "invest_purpose",
        "description",
        "details",
        "subCategory",
        "phone",
        "mobileNo",
        "mobileNo1",
        "email",
        "address",
        "reference",
        "notes",
        "invest_to",
        "invest_amount",
        "amount",
        "date",
        "invest_date",
      ];

      // Helper: fetch single node and return matched records array
      const fetchNodeMatches = async (node) => {
        try {
          const ref = firebaseDB.child(node);
          const snap = await ref.once("value");
          if (!snap.exists()) return [];

          const collected = collectRecordsFromSnapshot(snap);
          if (!collected.length) return [];

          const matched = [];
          for (const rec of collected) {
            // check specific fields first
            let isMatch = false;
            for (const f of searchableFields) {
              if (rec && Object.prototype.hasOwnProperty.call(rec, f)) {
                try {
                  const v = rec[f];
                  if (v !== null && v !== undefined && String(v).toLowerCase().includes(qLower)) {
                    isMatch = true;
                    break;
                  }
                } catch (e) {
                  // ignore conversion errors
                }
              }
            }
            // fallback: stringify record
            if (!isMatch) {
              try {
                if (JSON.stringify(rec).toLowerCase().includes(qLower)) isMatch = true;
              } catch (err) {
                // ignore stringify errors
              }
            }
            if (isMatch) {
              // ensure id exists
              const out = { ...rec };
              if (!out.id) out.id = rec.id || (rec.key ? rec.key : `${node}-${Math.random().toString(36).slice(2, 9)}`);
              matched.push(out);
            }
          }

          return matched;
        } catch (err) {
          // bubble up a console message but return empty array so one bad node doesn't stop everything
          console.warn(`Search: failed to read node "${node}":`, err && err.message ? err.message : err);
          return [];
        }
      };

      try {
        // run all node fetches in parallel
        const promises = uniqueNodes.map((n) => fetchNodeMatches(n));
        const resultsPerNode = await Promise.all(promises);

        if (cancelled) return;

        const aggregated = {};
        uniqueNodes.forEach((nodeName, idx) => {
          const arr = resultsPerNode[idx] || [];
          if (arr.length) {
            // dedupe by id within this node
            const seen = new Map();
            const deduped = [];
            arr.forEach((r) => {
              const key = r.id != null ? String(r.id) : JSON.stringify(r);
              if (!seen.has(key)) {
                seen.set(key, true);
                deduped.push(r);
              }
            });
            aggregated[nodeName] = deduped;
          }
        });

        // merge into state (preserve any external results that may already exist)
        setResults((prev) => {
          const merged = { ...prev };
          Object.entries(aggregated).forEach(([node, items]) => {
            const existing = Array.isArray(merged[node]) ? merged[node] : [];
            // dedupe across existing+new by id
            const map = new Map();
            [...existing, ...items].forEach((it) => {
              const k = it && it.id != null ? `${node}-${String(it.id)}` : JSON.stringify(it);
              if (!map.has(k)) map.set(k, it);
            });
            merged[node] = Array.from(map.values());
          });
          return merged;
        });

        setMessage("");
      } catch (err) {
        console.error("Search failed:", err);
        if (!cancelled) setMessage("Search failed — check console.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [query]);

  const totalMatches = useMemo(() => Object.values(results).reduce((s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0), [results]);

  // small helpers for display
  const fmtDate = (d) => {
    if (!d) return "";
    try {
      if (typeof d === "object" && d.seconds) return new Date(d.seconds * 1000).toLocaleString();
      const dt = new Date(d);
      if (!isNaN(dt.getTime())) return dt.toLocaleString();
      return String(d);
    } catch {
      return String(d);
    }
  };

  const getDisplayName = (r) => {
    return (r && (r.investor || r.name || r.clientName || r.employeeName || r.patientName || r.description)) || "Record";
  };

  const getSummary = (r) => {
    return (
      r.invest_purpose ||
      r.purpose ||
      r.subCategory ||
      r.details ||
      r.phone ||
      r.mobileNo ||
      r.email ||
      r.invest_to ||
      ""
    );
  };

  return (
    <div className="container py-4">
      <div className="card bg-dark text-light mb-3">
        <div className="card-body">
          <h5 className="card-title mb-0">Search results</h5>
          <small className="text-muted">Showing matches for <strong className="text-white">{query || "—"}</strong></small>
        </div>
      </div>

      {loading && <div className="my-3 text-light">Searching through all nodes...</div>}
      {message && <div className="my-3 text-muted">{message}</div>}

      {!loading && !message && (
        <>
          <div className="mb-3 text-light"><strong>Total matches:</strong> {totalMatches}</div>
          {Object.entries(results).map(([node, items]) => (
            <section key={node} className="mb-4">
              <h6 className="text-light">{node} <span className="text-muted">({items.length})</span></h6>
              <div className="list-group">
                {items.map((r) => (
                  <div key={`${node}-${r.id || Math.random()}`} className="list-group-item list-group-item-dark bg-secondary border-0 mb-2 rounded">
                    <div className="d-flex justify-content-between">
                      <div className="flex-grow-1">
                        <div className="fw-bold text-white text-truncate">{getDisplayName(r)}</div>
                        <div className="small text-muted text-truncate">{getSummary(r)}</div>
                        {(r.date || r.invest_date) && (
                          <div className="small text-info mt-1">Date: {fmtDate(r.date || r.invest_date)}</div>
                        )}
                      </div>
                      <div className="text-end ms-3">
                        {r.invest_amount && <div className="fw-bold">₹{Number(r.invest_amount).toLocaleString()}</div>}
                        {r.amount && <div className="fw-bold">₹{Number(r.amount).toLocaleString()}</div>}
                        <div className="small text-muted mt-1">ID: {r.id}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {!totalMatches && query && <div className="text-muted">No matches found. Try different keywords or check node names.</div>}
        </>
      )}
    </div>
  );
}
