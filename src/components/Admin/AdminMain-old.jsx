// src/pages/AdminMain.jsx
import React, { useEffect, useMemo, useState } from "react";
import firebaseDB from "../../firebase"; // this should already be scoped to /JenCeo-DataBase
// Optional: Auth for audit + fallback request routing
let useAuthSafe = () => ({ currentUser: null, user: null });
try {
  const mod = require("../../context/AuthContext");
  if (mod && typeof mod.useAuth === "function") useAuthSafe = mod.useAuth;
} catch {}

const MODULES = [
  { key: "Dashboard",          extras: [] },
  { key: "Investments",        extras: ["export"] },
  { key: "Workers Data",       extras: ["export"] },
  { key: "Worker Call Data",   extras: [] },
  { key: "Client Data",        extras: ["approve", "reject", "clarify", "managePayments", "export"] },
  { key: "Enquiries",          extras: ["approve", "reject", "clarify", "export"] },
  { key: "Hospital List",      extras: ["export"] },
  { key: "Expenses",           extras: ["export", "approve"] },
  { key: "Assets",             extras: ["export"] },
  { key: "Reports",            extras: ["export"] },
  { key: "Accounts",           extras: ["export"] },
  { key: "Task",               extras: [] },
  { key: "Admin",              extras: [] },
];

const BASE_ACTIONS = ["view", "create", "edit", "delete"];
const EXTRA_ACTIONS = ["export", "approve", "reject", "clarify", "managePayments"];
const ALL_ACTIONS = [...BASE_ACTIONS, ...EXTRA_ACTIONS];

const makeBlankPerms = () =>
  MODULES.reduce((acc, m) => {
    const row = {};
    ALL_ACTIONS.forEach((a) => (row[a] = false));
    acc[m.key] = row;
    return acc;
  }, {});

// opinionated templates
const ROLE_TEMPLATES = {
  admin: withAll(true),
  manager: withBase(true, { delete: false, export: true, approve: true, reject: true, clarify: true }),
  user: withBase({ view: true }, { create: false, edit: false, delete: false }),
  auditor: withOnly({ view: true, export: true }),
  finance: withOnly({ view: true, export: true, managePayments: true, edit: true }),
};

// Helpers to build templates
function withAll(on) {
  const p = makeBlankPerms();
  MODULES.forEach((m) => ALL_ACTIONS.forEach((a) => (p[m.key][a] = !!on)));
  return p;
}
function withBase(baseOn, overrides = {}) {
  const p = makeBlankPerms();
  MODULES.forEach((m) => {
    BASE_ACTIONS.forEach((a) => (p[m.key][a] = typeof baseOn === "object" ? !!baseOn[a] : !!baseOn));
    EXTRA_ACTIONS.forEach((a) => (p[m.key][a] = !!overrides[a]));
    Object.keys(overrides).forEach((k) => {
      if (p[m.key][k] !== undefined) p[m.key][k] = !!overrides[k];
    });
  });
  return p;
}
function withOnly(map) {
  const p = makeBlankPerms();
  MODULES.forEach((m) => Object.keys(map).forEach((k) => (p[m.key][k] = !!map[k])));
  return p;
}

// Hash helper
async function sha256Base64(text) {
  try {
    const enc = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest("SHA-256", enc);
    const b = String.fromCharCode(...new Uint8Array(hash));
    return btoa(b);
  } catch {
    // fallback
    return btoa(unescape(encodeURIComponent(text)));
  }
}

// Toast helper
function Toast({ toast, onClose }) {
  if (!toast) return null;
  const { type, msg } = toast;
  const cls = type === "error" ? "alert-danger" : type === "warn" ? "alert-warning" : "alert-success";
  return (
    <div
      className={`alert ${cls} shadow-sm position-fixed`}
      style={{ right: 16, bottom: 16, maxWidth: 520, zIndex: 3000 }}
      role="alert"
    >
      <div className="d-flex justify-content-between align-items-start gap-3">
        <div style={{ whiteSpace: "pre-wrap" }}>{msg}</div>
        <button className="btn-close" onClick={onClose} />
      </div>
    </div>
  );
}

export default function AdminMain() {
  const { currentUser, user: userFromCtx } = useAuthSafe();
  const adminUid = currentUser?.uid || userFromCtx?.uid || null;

  // Users + filters
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("all");
  const [activeOnly, setActiveOnly] = useState(false);
  const [q, setQ] = useState("");

  // Modal: create user
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [creating, setCreating] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  // Edit modal
  const [editingUser, setEditingUser] = useState(null);
  const [tempPerms, setTempPerms] = useState(makeBlankPerms());

  // Permission tester
  const [tester, setTester] = useState({ uid: "", component: "Client Data", action: "edit", running: false, result: "" });

  // Audit log mini-viewer
  const [audit, setAudit] = useState({ list: [], open: false, loading: false });

  // Selection for bulk apply
  const [selected, setSelected] = useState({});
  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  // Load Users
  useEffect(() => {
    setLoading(true);
    const ref = firebaseDB.child("Users");
    const on = ref.on("value", (snap) => {
      const obj = snap.val() || {};
      const arr = Object.keys(obj).map((k) => ({ uid: k, ...(obj[k] || {}) }));
      arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setUsers(arr);
      setLoading(false);
    });
    return () => {
      try { ref.off("value", on); } catch {}
    };
  }, []);

  // Load top audit logs
  async function loadAudit() {
    setAudit((a) => ({ ...a, loading: true, open: true }));
    try {
      const snap = await firebaseDB.child("AuditLogs").orderByChild("ts").limitToLast(100).get();
      const obj = snap.val() || {};
      const rows = Object.keys(obj).map((k) => ({ id: k, ...obj[k] }));
      rows.sort((a, b) => (b.ts || 0) - (a.ts || 0));
      setAudit({ list: rows, loading: false, open: true });
    } catch (e) {
      setAudit((a) => ({ ...a, loading: false }));
      showToast("error", "Failed to load audit logs.\n" + (e?.message || e));
    }
  }

  function openEditor(u) {
    const base = makeBlankPerms();
    const got = u?.permissions || {};
    // stitch
    MODULES.forEach((m) => {
      base[m.key] = { ...base[m.key], ...(got[m.key] || {}) };
    });
    setEditingUser(u);
    setTempPerms(base);
  }
  function togglePerm(modKey, action) {
    setTempPerms((prev) => ({
      ...prev,
      [modKey]: { ...(prev[modKey] || {}), [action]: !(prev[modKey]?.[action]) },
    }));
  }

  // Safe DB write with graceful fallback (AdminRequests) on permission_denied
  async function safeSet(path, payload, auditEntry) {
    try {
      await firebaseDB.child(path).set(payload);
      if (auditEntry) await firebaseDB.child("AuditLogs").push(auditEntry);
      return { ok: true };
    } catch (e) {
      // Permission denied? queue a request
      const code = (e && (e.code || e.message || "")).toString().toLowerCase();
      if (code.includes("permission_denied")) {
        const req = {
          action: "SET",
          path,
          payload,
          requestedBy: adminUid || null,
          requestedAt: Date.now(),
          auditEntry,
          status: "pending",
        };
        await firebaseDB.child(`AdminRequests/${adminUid || "unknown"}`).push(req);
        return {
          ok: false,
          queued: true,
          error: "PERMISSION_DENIED",
          message:
            "Database rules blocked this change. A request has been queued in /AdminRequests for processing by a privileged backend.",
        };
      }
      throw e;
    }
  }

  async function safeUpdate(path, payload, auditEntry) {
    try {
      await firebaseDB.child(path).update(payload);
      if (auditEntry) await firebaseDB.child("AuditLogs").push(auditEntry);
      return { ok: true };
    } catch (e) {
      const code = (e && (e.code || e.message || "")).toString().toLowerCase();
      if (code.includes("permission_denied")) {
        const req = {
          action: "UPDATE",
          path,
          payload,
          requestedBy: adminUid || null,
          requestedAt: Date.now(),
          auditEntry,
          status: "pending",
        };
        await firebaseDB.child(`AdminRequests/${adminUid || "unknown"}`).push(req);
        return {
          ok: false,
          queued: true,
          error: "PERMISSION_DENIED",
          message:
            "Database rules blocked this change. A request has been queued in /AdminRequests for processing by a privileged backend.",
        };
      }
      throw e;
    }
  }

  // Save single user permissions
  async function savePerms() {
    if (!editingUser) return;
    const path = `Users/${editingUser.uid}/permissions`;
    const auditEntry = {
      action: "updatePermissions",
      byUid: adminUid || null,
      targetUid: editingUser.uid,
      details: { permissions: tempPerms },
      ts: Date.now(),
    };
    const res = await safeSet(path, tempPerms, auditEntry);
    if (res.ok) {
      showToast("ok", `Permissions saved for ${editingUser.name || editingUser.uid}.`);
      setEditingUser(null);
    } else if (res.queued) {
      showToast(
        "warn",
        `Write blocked by rules.\nA privileged request was queued in /AdminRequests.\nYou may need a Cloud Function to approve & apply it.`
      );
      setEditingUser(null);
    }
  }

  async function toggleActive(uid, current) {
    const path = `Users/${uid}`;
    const res = await safeUpdate(
      path,
      { active: !current },
      { action: "toggleActive", byUid: adminUid || null, targetUid: uid, details: { active: !current }, ts: Date.now() }
    );
    if (res.ok) showToast("ok", `User ${uid} is now ${!current ? "Active" : "Inactive"}.`);
    else if (res.queued) showToast("warn", `Rules blocked; request queued under /AdminRequests.`);
  }

  async function removeUser(uid, name) {
    if (!window.confirm(`Remove user record for "${name || uid}"?`)) return;
    try {
      // remove cannot be queued safely without backend, so try and report
      await firebaseDB.child(`Users/${uid}`).remove();
      await firebaseDB.child("AuditLogs").push({
        action: "removeUserRecord",
        byUid: adminUid || null,
        targetUid: uid,
        details: { removed: true },
        ts: Date.now(),
      });
      showToast("ok", `Removed ${name || uid}.`);
    } catch (e) {
      const code = (e && (e.code || e.message || "")).toString().toLowerCase();
      if (code.includes("permission_denied")) {
        await firebaseDB.child(`AdminRequests/${adminUid || "unknown"}`).push({
          action: "REMOVE",
          path: `Users/${uid}`,
          requestedBy: adminUid || null,
          requestedAt: Date.now(),
          status: "pending",
          details: { reason: "UI request to delete user record" },
        });
        showToast("warn", `Delete blocked by rules. A pending request was created in /AdminRequests.`);
      } else {
        showToast("error", `Failed to remove: ${e?.message || e}`);
      }
    }
  }

  async function handleCreate(e) {
    e?.preventDefault?.();
    setErrMsg("");
    if (!newName?.trim()) return setErrMsg("Please enter a name");
    if (!newPassword) return setErrMsg("Please enter a password");

    setCreating(true);
    try {
      const usersRef = firebaseDB.child("Users");
      const uid = usersRef.push().key;
      const passwordHash = await sha256Base64(newPassword);
      const template = ROLE_TEMPLATES[newRole] || ROLE_TEMPLATES.user;
      const record = {
        uid,
        name: newName.trim(),
        role: newRole,
        active: true,
        createdAt: Date.now(),
        email: null,
        passwordHash,
        permissions: template,
      };
      const res = await safeSet(`Users/${uid}`, record, {
        action: "createUserNoEmail",
        byUid: adminUid || null,
        targetUid: uid,
        details: { name: record.name, role: record.role },
        ts: Date.now(),
      });
      if (res.ok) {
        showToast("ok", `Created user "${record.name}"`);
        setShowCreate(false);
        setNewName("");
        setNewPassword("");
        setNewRole("user");
        openEditor(record);
      } else if (res.queued) {
        showToast("warn", `Rules blocked creating user. Request queued under /AdminRequests.`);
        setShowCreate(false);
      }
    } catch (err) {
      setErrMsg(err?.message || String(err));
    } finally {
      setCreating(false);
    }
  }

  async function resetPassword(uid) {
    const pw = prompt("Enter a new password for this user:");
    if (!pw) return;
    const passwordHash = await sha256Base64(pw);
    const res = await safeUpdate(
      `Users/${uid}`,
      { passwordHash },
      { action: "resetPasswordHash", byUid: adminUid || null, targetUid: uid, ts: Date.now() }
    );
    if (res.ok) showToast("ok", "Password reset (hash updated).");
    else if (res.queued) showToast("warn", "Rules blocked; request queued under /AdminRequests.");
  }

  function impersonate(uid) {
    localStorage.setItem("impersonateUid", uid);
    showToast("ok", `Impersonating ${uid}. Reload your app (or log out/in) to test UI under that user.`);
  }

  async function exportCsv() {
    const csv = ["uid,name,role,active,createdAt,permissions_json"];
    users.forEach((u) =>
      csv.push(
        [
          u.uid,
          `"${(u.name || "").replace(/"/g, '""')}"`,
          u.role || "user",
          u.active ? "1" : "0",
          u.createdAt || "",
          `"${JSON.stringify(u.permissions || {})}"`,
        ].join(",")
      )
    );
    const blob = new Blob([csv.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "users.csv";
    a.click();
  }

  // Bulk apply template
  async function bulkApply(templateKey) {
    const tmpl = ROLE_TEMPLATES[templateKey];
    if (!tmpl) return;
    const targets = users.filter((u) => selected[u.uid]);
    if (targets.length === 0) return showToast("warn", "Select at least one user.");
    let queued = 0, ok = 0;
    for (const u of targets) {
      const res = await safeSet(
        `Users/${u.uid}/permissions`,
        tmpl,
        { action: "bulkApplyTemplate", byUid: adminUid || null, targetUid: u.uid, details: { template: templateKey }, ts: Date.now() }
      );
      if (res.ok) ok++;
      else if (res.queued) queued++;
    }
    if (ok) showToast("ok", `Applied template to ${ok} user(s).`);
    if (queued) showToast("warn", `${queued} write(s) blocked; requests queued under /AdminRequests.`);
  }

  // Permission tester — attempts a benign write and reports the outcome
  async function runTest() {
    if (!tester.uid) return showToast("warn", "Pick a user id to test.");
    setTester((t) => ({ ...t, running: true, result: "" }));
    const probePath = `PermissionProbe/${tester.uid}/${Date.now()}`;
    try {
      await firebaseDB.child(probePath).set({
        by: adminUid || null,
        component: tester.component,
        action: tester.action,
        ts: Date.now(),
      });
      await firebaseDB.child(probePath).remove(); // cleanup
      setTester((t) => ({ ...t, running: false, result: "✅ Allowed by current rules (test write succeeded)." }));
    } catch (e) {
      const code = (e && (e.code || e.message || "")).toString();
      setTester((t) => ({
        ...t,
        running: false,
        result: `❌ Blocked by rules (${code}). Consider adjusting database rules or process via AdminRequests/Cloud Function.`,
      }));
    }
  }

  // Filters
  const filtered = useMemo(() => {
    let arr = users.slice();
    if (roleFilter !== "all") arr = arr.filter((u) => (u.role || "user") === roleFilter);
    if (activeOnly) arr = arr.filter((u) => !!u.active);
    if (q.trim()) {
      const qq = q.toLowerCase();
      arr = arr.filter((u) => (u.name || "").toLowerCase().includes(qq) || (u.uid || "").toLowerCase().includes(qq));
    }
    return arr;
  }, [users, roleFilter, activeOnly, q]);

  return (
    <>
      {/* Header */}
      <div className=" bg-dark text-white">
        <div className="card-header d-flex flex-wrap gap-2 justify-content-between align-items-center">
          <strong>Admin — Users & Permissions</strong>
          <div className="d-flex flex-wrap gap-2">
            <button className="btn btn-sm btn-success" onClick={() => setShowCreate(true)}>Create User</button>
            <button className="btn btn-sm btn-outline-light" onClick={exportCsv}>Export CSV</button>
            <button className="btn btn-sm btn-outline-info" onClick={loadAudit}>Audit Logs</button>
          </div>
        </div>

        {/* Tools / Filters */}
        <div className="card-body">
          <div className="row g-2 mb-3">
            <div className="col-md-3">
              <input className="form-control" placeholder="Search name or uid..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="col-md-3">
              <select className="form-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="all">All roles</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="finance">Finance</option>
                <option value="auditor">Auditor</option>
                <option value="user">User</option>
              </select>
            </div>
            <div className="col-md-2 d-flex align-items-center">
              <div className="form-check">
                <input className="form-check-input" type="checkbox" id="activeOnly" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
                <label className="form-check-label" htmlFor="activeOnly">Active only</label>
              </div>
            </div>
            <div className="col-md-4 d-flex gap-2 justify-content-md-end">
              <div className="dropdown">
                <button className="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown" type="button">
                  Bulk apply template {selectedCount ? `(${selectedCount})` : ""}
                </button>
                <ul className="dropdown-menu dropdown-menu-dark">
                  <li><button className="dropdown-item" onClick={() => bulkApply("admin")}>Admin</button></li>
                  <li><button className="dropdown-item" onClick={() => bulkApply("manager")}>Manager</button></li>
                  <li><button className="dropdown-item" onClick={() => bulkApply("finance")}>Finance</button></li>
                  <li><button className="dropdown-item" onClick={() => bulkApply("auditor")}>Auditor</button></li>
                  <li><button className="dropdown-item" onClick={() => bulkApply("user")}>User</button></li>
                </ul>
              </div>
              <div className="dropdown">
                <button className="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown" type="button">
                  Permission Tester
                </button>
                <div className="dropdown-menu dropdown-menu-dark p-3" style={{ minWidth: 320 }}>
                  <div className="mb-2">
                    <label className="form-label small">User ID</label>
                    <input className="form-control form-control-sm" value={tester.uid} onChange={(e) => setTester((t) => ({ ...t, uid: e.target.value }))} />
                  </div>
                  <div className="mb-2">
                    <label className="form-label small">Component</label>
                    <select className="form-select form-select-sm" value={tester.component} onChange={(e) => setTester((t) => ({ ...t, component: e.target.value }))}>
                      {MODULES.map((m) => <option key={m.key} value={m.key}>{m.key}</option>)}
                    </select>
                  </div>
                  <div className="mb-2">
                    <label className="form-label small">Action</label>
                    <select className="form-select form-select-sm" value={tester.action} onChange={(e) => setTester((t) => ({ ...t, action: e.target.value }))}>
                      {ALL_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <button className="btn btn-sm btn-primary w-100" disabled={tester.running} onClick={runTest}>
                    {tester.running ? "Testing..." : "Run test"}
                  </button>
                  {tester.result && <div className="small mt-2">{tester.result}</div>}
                </div>
              </div>
            </div>
          </div>

          {/* Users table */}
          <div className="table-responsive">
            <table className="table table-dark table-striped table-hover align-middle">
              <thead>
                <tr>
                  <th style={{ width: 36 }}></th>
                  <th>#</th>
                  <th>Name</th>
                  <th>UID</th>
                  <th>Role</th>
                  <th>Active</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan="8" className="text-center small text-muted">Loading...</td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan="8" className="text-center small text-muted">No users match your filters.</td>
                  </tr>
                )}
                {!loading && filtered.map((u, i) => (
                  <tr key={u.uid}>
                    <td>
                      <input
                        type="checkbox"
                        checked={!!selected[u.uid]}
                        onChange={(e) => setSelected((s) => ({ ...s, [u.uid]: e.target.checked }))}
                      />
                    </td>
                    <td>{i + 1}</td>
                    <td>{u.name || "-"}</td>
                    <td className="text-muted small">{u.uid}</td>
                    <td><span className="badge bg-secondary text-uppercase">{u.role || "user"}</span></td>
                    <td>
                      <button className={`btn btn-sm ${u.active ? "btn-success" : "btn-secondary"}`} onClick={() => toggleActive(u.uid, !!u.active)}>
                        {u.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="small">{u.createdAt ? new Date(u.createdAt).toLocaleString() : "-"}</td>
                    <td className="d-flex flex-wrap gap-1">
                      <button className="btn btn-sm btn-outline-info" onClick={() => openEditor(u)}>Permissions</button>
                      <button className="btn btn-sm btn-outline-warning" onClick={() => resetPassword(u.uid)}>Reset PW</button>
                      <button className="btn btn-sm btn-outline-light" onClick={() => impersonate(u.uid)}>Impersonate</button>
                      <button className="btn btn-sm btn-danger" onClick={() => removeUser(u.uid, u.name)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)" }}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640, margin: "6% auto" }}>
            <div className="modal-content bg-dark text-white p-3">
              <h5>Create User (no email)</h5>
              <form onSubmit={handleCreate}>
                <div className="mb-2">
                  <label className="small">Full name</label>
                  <input className="form-control" value={newName} onChange={(e) => setNewName(e.target.value)} required />
                </div>
                <div className="mb-2">
                  <label className="small">Password</label>
                  <input className="form-control" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                  <div className="form-text text-muted">Stored as a SHA-256 hash.</div>
                </div>
                <div className="mb-3">
                  <label className="small">Role</label>
                  <select className="form-select" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                    <option value="user">User</option>
                    <option value="manager">Manager</option>
                    <option value="finance">Finance</option>
                    <option value="auditor">Auditor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {errMsg && <div className="alert alert-danger small">{errMsg}</div>}
                <div className="d-flex gap-2">
                  <button className="btn btn-primary" type="submit" disabled={creating}>{creating ? "Creating..." : "Create"}</button>
                  <button type="button" className="btn btn-outline-light" onClick={() => setShowCreate(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Permissions Modal */}
      {editingUser && (
        <div className="modal-backdrop" onClick={() => { setEditingUser(null); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)" }}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 980, margin: "4% auto" }}>
            <div className="modal-content bg-dark text-white p-3">
              <div className="d-flex align-items-center justify-content-between">
                <h5 className="mb-0">
                  Permissions — {editingUser.name || editingUser.uid}{" "}
                  <span className="badge bg-secondary ms-2">{editingUser.role || "user"}</span>
                </h5>
                <div className="d-flex gap-2">
                  <div className="dropdown">
                    <button className="btn btn-sm btn-outline-light dropdown-toggle" data-bs-toggle="dropdown" type="button">
                      Apply template
                    </button>
                    <ul className="dropdown-menu dropdown-menu-dark">
                      <li><button className="dropdown-item" onClick={() => setTempPerms(JSON.parse(JSON.stringify(ROLE_TEMPLATES.admin)))}>Admin</button></li>
                      <li><button className="dropdown-item" onClick={() => setTempPerms(JSON.parse(JSON.stringify(ROLE_TEMPLATES.manager)))}>Manager</button></li>
                      <li><button className="dropdown-item" onClick={() => setTempPerms(JSON.parse(JSON.stringify(ROLE_TEMPLATES.finance)))}>Finance</button></li>
                      <li><button className="dropdown-item" onClick={() => setTempPerms(JSON.parse(JSON.stringify(ROLE_TEMPLATES.auditor)))}>Auditor</button></li>
                      <li><button className="dropdown-item" onClick={() => setTempPerms(JSON.parse(JSON.stringify(ROLE_TEMPLATES.user)))}>User</button></li>
                    </ul>
                  </div>
                  <button className="btn btn-sm btn-success" onClick={savePerms}>Save</button>
                  <button className="btn btn-sm btn-outline-light" onClick={() => setEditingUser(null)}>Close</button>
                </div>
              </div>

              <div className="table-responsive mt-3" style={{ maxHeight: 520, overflow: "auto" }}>
                <table className="table table-dark table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Module</th>
                      {ALL_ACTIONS.map((a) => <th key={a} className="text-center text-capitalize">{a}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {MODULES.map((m) => {
                      const row = tempPerms[m.key] || {};
                      return (
                        <tr key={m.key}>
                          <td>{m.key}</td>
                          {ALL_ACTIONS.map((a) => {
                            const enabled = row[a] || false;
                            const disabledExtra = EXTRA_ACTIONS.includes(a) && !m.extras.includes(a);
                            return (
                              <td key={a} className="text-center">
                                <input
                                  type="checkbox"
                                  disabled={disabledExtra}
                                  title={disabledExtra ? "Not applicable for this module" : ""}
                                  checked={!!enabled}
                                  onChange={() => togglePerm(m.key, a)}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Audit Drawer */}
      {audit.open && (
        <div className="modal-backdrop" onClick={() => setAudit((a) => ({ ...a, open: false }))} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 860, margin: "5% auto" }}>
            <div className="modal-content bg-dark text-white p-3">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Audit Logs (recent 100)</h5>
                <button className="btn btn-sm btn-outline-light" onClick={() => setAudit((a) => ({ ...a, open: false }))}>Close</button>
              </div>
              <div className="table-responsive mt-3" style={{ maxHeight: 520, overflow: "auto" }}>
                <table className="table table-dark table-sm">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Action</th>
                      <th>By</th>
                      <th>Target</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.loading && (
                      <tr><td colSpan={5} className="text-center small text-muted">Loading...</td></tr>
                    )}
                    {!audit.loading && audit.list.map((r) => (
                      <tr key={r.id}>
                        <td className="small">{r.ts ? new Date(r.ts).toLocaleString() : "-"}</td>
                        <td className="small">{r.action}</td>
                        <td className="small">{r.byEmail || r.byUid || "-"}</td>
                        <td className="small">{r.targetUid || "-"}</td>
                        <td className="small">
                          <code style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(r.details || {}, null, 2)}</code>
                        </td>
                      </tr>
                    ))}
                    {!audit.loading && audit.list.length === 0 && (
                      <tr><td colSpan={5} className="text-center small text-muted">No logs</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
