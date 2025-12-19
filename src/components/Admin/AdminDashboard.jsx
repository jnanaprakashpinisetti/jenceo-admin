// src/pages/AdminMani.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import firebaseDB from "../../firebase";
import { useAuth } from "../../context/AuthContext";

/**
 * AdminMani.jsx
 * Modern dark-themed admin dashboard (Bootstrap-based)
 * - Global Auth integration (useAuth) — greets signed-in user
 * - Live Firebase data: Users, WorkerCalls, PettyCash, PettyCashInbox
 * - Dynamic KPI Cards
 * - Approvals Queue (Petty Cash) with Approve / Clarify / Reject
 * - Recent Activity timeline merging modules
 * - Performance Mix Chart (CSS-only conic gradient)
 * - Fully responsive (mobile-first)
 * - No external chart libraries
 *
 * Adjust Firebase paths to your tree if needed.
 */

export default function AdminMani() {
  const auth = useAuth() || {};
  const { currentUser, user, dbUser, profile, permissions: ctxPerms, usersMap: ctxUsers } = auth;

  // ---------- Robust identity helpers ----------
  const signedInName =
    dbUser?.name ||
    dbUser?.username ||
    profile?.name ||
    profile?.username ||
    user?.name ||
    user?.username ||
    currentUser?.displayName ||
    currentUser?.name ||
    currentUser?.username ||
    (currentUser?.email ? currentUser.email.split("@")[0] : "") ||
    "User";

  const signedInUid =
    currentUser?.uid || currentUser?.dbId || user?.uid || user?.dbId || null;

  const roles =
    (dbUser?.roles || user?.roles || currentUser?.roles || []);

  const perms = useMemo(() => ({
    ...ctxPerms,
    "pettyCash.approve": roles?.includes?.("Admin") || roles?.includes?.("Manager") || ctxPerms?.["pettyCash.approve"],
  }), [ctxPerms, roles]);

  // ---------- Live data state ----------
  const [usersMap, setUsersMap] = useState(ctxUsers || {});
  const [workerCalls, setWorkerCalls] = useState([]);
  const [pettyByUser, setPettyByUser] = useState({});   // PettyCash/<uid>/...
  const [inboxByUser, setInboxByUser] = useState({});   // PettyCashInbox/<uid>/...
  const [loading, setLoading] = useState(true);

  // Users
  useEffect(() => {
    const ref = firebaseDB.child("Users");
    const cb = ref.on("value", snap => setUsersMap(snap.val() || {}));
    return () => ref.off("value", cb);
  }, []);

  // WorkerCallData
  useEffect(() => {
    const ref = firebaseDB.child("WorkerCallData");
    const cb = ref.on("value", snap => {
      const v = snap.val() || {};
      const rows = Object.keys(v).map(id => ({ id, ...v[id] }));
      setWorkerCalls(rows);
    });
    return () => ref.off("value", cb);
  }, []);

  // PettyCash + Inbox
  useEffect(() => {
    setLoading(true);
    const pettyRef = firebaseDB.child("PettyCash");
    const inboxRef = firebaseDB.child("PettyCashInbox");
    const cb1 = pettyRef.on("value", snap => setPettyByUser(snap.val() || {}));
    const cb2 = inboxRef.on("value", snap => setInboxByUser(snap.val() || {}));
    setLoading(false);
    return () => { pettyRef.off("value", cb1); inboxRef.off("value", cb2); };
  }, []);

  // ---------- Aggregations ----------
  const allPetty = useMemo(() => {
    const arr = [];
    Object.keys(pettyByUser || {}).forEach(uid => {
      const items = pettyByUser[uid] || {};
      Object.keys(items).forEach(id => arr.push(items[id]));
    });
    return arr;
  }, [pettyByUser]);

  const myInbox = useMemo(() => {
    if (!signedInUid) return [];
    const items = inboxByUser[signedInUid] || {};
    return Object.keys(items).map(id => items[id]);
  }, [inboxByUser, signedInUid]);

  const kpis = useMemo(() => {
    const totalUsers = Object.keys(usersMap || {}).length;
    const totalCalls = workerCalls.length;
    const pendingCalls = workerCalls.filter(w => (String(w.status || "")).toLowerCase() === "pending").length;

    const totalPetty = allPetty.length;
    const pendingPetty = allPetty.filter(p => (String(p.status || p.approval || "")).toLowerCase() === "pending").length;

    const myApprovals = myInbox.filter(p => (String(p.status || p.approval || "")).toLowerCase() === "pending").length;

    return [
      { key: "users", label: "Users", value: totalUsers, icon: "bi-people" },
      { key: "calls", label: "Worker Calls", value: totalCalls, icon: "bi-telephone" },
      { key: "pendingCalls", label: "Pending Calls", value: pendingCalls, icon: "bi-hourglass-split" },
      { key: "petty", label: "Petty Cash", value: totalPetty, icon: "bi-wallet2" },
      { key: "myInbox", label: "My Approvals", value: myApprovals, icon: "bi-inbox" },
    ];
  }, [usersMap, workerCalls, allPetty, myInbox]);

  // Performance Mix across petty + calls (CSS pie)
  const perfBuckets = useMemo(() => {
    const counts = { pending: 0, approved: 0, rejected: 0, other: 0 };
    allPetty.forEach(p => {
      const s = (String(p.status || p.approval || "")).toLowerCase();
      if (s === "pending") counts.pending++;
      else if (s === "approved") counts.approved++;
      else if (s === "rejected") counts.rejected++;
      else counts.other++;
    });
    workerCalls.forEach(w => {
      const s = (String(w.status || "")).toLowerCase();
      if (s === "pending") counts.pending++;
      else if (s === "approved") counts.approved++;
      else if (s === "rejected") counts.rejected++;
      else counts.other++;
    });
    const total = Object.values(counts).reduce((a,b)=>a+b,0) || 1;
    const toDeg = (x) => (x/total) * 360;
    const d0 = toDeg(counts.pending);
    const d1 = d0 + toDeg(counts.approved);
    const d2 = d1 + toDeg(counts.rejected);
    const pie = `conic-gradient(
      var(--bs-warning) 0deg ${d0}deg,
      var(--bs-success) ${d0}deg ${d1}deg,
      var(--bs-danger)  ${d1}deg ${d2}deg,
      var(--bs-secondary) ${d2}deg 360deg
    )`;
    return { counts, total, pie };
  }, [allPetty, workerCalls]);

  // Recent activity (merge)
  const recentActivity = useMemo(() => {
    const normalizeTs = (t) => {
      if (!t) return 0;
      if (typeof t === "number") return t;
      const n = Date.parse(t);
      return Number.isFinite(n) ? n : 0;
    };
    const list = [];
    workerCalls.forEach(w => {
      list.push({
        type: "WorkerCall",
        id: w.id,
        title: w.name || "Call",
        who: w.createdByName || w.createdById || "Unknown",
        when: normalizeTs(w.updatedAt || w.createdAt),
        status: (w.status || "").toLowerCase() || "—",
      });
    });
    allPetty.forEach(p => {
      list.push({
        type: "PettyCash",
        id: p.id,
        title: p.subCategory || p.mainCategory || "Expense",
        who: p.employeeName || p.createdById || "Unknown",
        when: normalizeTs(p.approvedAt || p.createdAt),
        status: (p.status || p.approval || "").toLowerCase() || "—",
      });
    });
    return list.sort((a, b) => b.when - a.when).slice(0, 12);
  }, [workerCalls, allPetty]);

  // ---------- Approvals (Petty Cash) ----------
  const canApprove = !!perms?.["pettyCash.approve"];
  const approvePetty = useCallback(async (rec, status) => {
    if (!rec?.id || !signedInUid) return;
    const updates = {
      status,
      approvedById: signedInUid,
      approvedAt: new Date().toISOString(),
    };
    const paths = {};
    paths[`/PettyCash/${rec.createdById}/${rec.id}`] = { ...rec, ...updates };
    if (rec.superiorId) paths[`/PettyCashInbox/${rec.superiorId}/${rec.id}`] = { ...rec, ...updates };
    await firebaseDB.update(paths);
  }, [signedInUid]);

  // ---------- UI ----------
  return (
    <div className="container-fluid py-3">
      {/* Inline CSS for the dashboard */}
      <style>{`
        .card.bg-dark { background: #0f172a !important; border-color: rgba(255,255,255,0.08) !important; }
        .kpi-value { font-size: 2.2rem; font-weight: 800; letter-spacing: -0.02em; }
        .shadow-subtle { box-shadow: 0 10px 20px rgba(2,8,23,0.3), 0 2px 6px rgba(2,8,23,0.2); }
        .pie-180 { width: 180px; height: 180px; border-radius: 50%; }
        .timeline-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--bs-info); display: inline-block; margin-right: 8px; }
        .table-dark td, .table-dark th { vertical-align: middle; }
        .badge-up { text-transform: uppercase; letter-spacing: .02em; }
        .btn-ghost { background: transparent; border-color: rgba(255,255,255,0.16); }
        .w-fit { width: fit-content; }
      `}</style>

      {/* Header */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <h4 className="mb-0 text-info">Welcome, {signedInName}</h4>
          <div className="small text-white-50">{roles?.length ? roles.join(", ") : "User"}</div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-light btn-sm">New</button>
          <button className="btn btn-outline-info btn-sm">Invite</button>
          <button className="btn btn-warning btn-sm text-dark">Export</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="row g-3 mb-3">
        {kpis.map((k) => (
          <div key={k.key} className="col-6 col-md-4 col-lg-2">
            <div className="card bg-dark border h-100 shadow-subtle">
              <div className="card-body d-flex flex-column justify-content-between">
                <div className="d-flex align-items-center justify-content-between">
                  <div className="text-white-50">{k.label}</div>
                  <i className={`bi ${k.icon} text-secondary`}></i>
                </div>
                <div className="kpi-value mt-2">{k.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3">
        {/* Approvals Queue */}
        <div className="col-lg-7">
          <div className="card bg-dark border h-100 shadow-subtle">
            <div className="card-header d-flex align-items-center justify-content-between">
              <div className="text-info fw-bold">Approvals Queue</div>
              <div className="small text-white-50">Petty Cash pending for you</div>
            </div>
            <div className="card-body">
              {myInbox.length === 0 ? (
                <div className="text-center text-white-50 py-4">No pending approvals 🎉</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-dark table-hover align-middle">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Category</th>
                        <th>Amount</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myInbox.slice(0, 8).map((p) => (
                        <tr key={p.id}>
                          <td>{p.employeeName || p.createdById}</td>
                          <td>{p.mainCategory}{p.subCategory ? ` → ${p.subCategory}` : ""}</td>
                          <td>₹{Number(p.total || p.amount || 0).toLocaleString()}</td>
                          <td>{(p.date || "").toString()}</td>
                          <td><span className="badge bg-warning text-dark badge-up">{(p.status || p.approval || "pending")}</span></td>
                          <td className="text-end">
                            <div className="btn-group btn-group-sm">
                              <button className="btn btn-success" disabled={!canApprove} onClick={() => approvePetty(p, "approved")}>Approve</button>
                              <button className="btn btn-secondary" disabled={!canApprove} onClick={() => approvePetty(p, "clarification")}>Clarify</button>
                              <button className="btn btn-danger" disabled={!canApprove} onClick={() => approvePetty(p, "rejected")}>Reject</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Performance Mix Pie */}
        <div className="col-lg-5">
          <div className="card bg-dark border h-100 shadow-subtle">
            <div className="card-header d-flex align-items-center justify-content-between">
              <div className="text-info fw-bold">Performance Mix</div>
              <div className="small text-white-50">Calls + Expenses</div>
            </div>
            <div className="card-body">
              <div className="d-flex flex-column align-items-center">
                <div className="pie-180" style={{ background: perfBuckets.pie }} />
                <div className="d-flex flex-wrap gap-3 small mt-3 justify-content-center">
                  <span><span className="badge rounded-pill" style={{ background: "var(--bs-warning)" }}>&nbsp;</span> Pending: {perfBuckets.counts.pending}</span>
                  <span><span className="badge rounded-pill" style={{ background: "var(--bs-success)" }}>&nbsp;</span> Approved: {perfBuckets.counts.approved}</span>
                  <span><span className="badge rounded-pill" style={{ background: "var(--bs-danger)" }}>&nbsp;</span> Rejected: {perfBuckets.counts.rejected}</span>
                  <span><span className="badge rounded-pill" style={{ background: "var(--bs-secondary)" }}>&nbsp;</span> Other: {perfBuckets.counts.other}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="col-12">
          <div className="card bg-dark border shadow-subtle">
            <div className="card-header d-flex align-items-center justify-content-between">
              <div className="text-info fw-bold">Recent Activity</div>
              <div className="small text-white-50">latest 12 items</div>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-dark table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Title</th>
                      <th>Who</th>
                      <th>Status</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.length === 0 ? (
                      <tr><td colSpan={5} className="text-center text-white-50">No activity yet</td></tr>
                    ) : recentActivity.map((a, idx) => (
                      <tr key={idx}>
                        <td><span className="timeline-dot" />{a.type}</td>
                        <td>{a.title}</td>
                        <td>{a.who}</td>
                        <td><span className="badge bg-secondary text-uppercase">{a.status || "—"}</span></td>
                        <td>{a.when ? new Date(a.when).toLocaleString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading && <div className="text-center text-white-50 mt-3">Loading…</div>}
    </div>
  );
}