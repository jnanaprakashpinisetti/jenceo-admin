// src/pages/AdminMain.jsx
import React, { useEffect, useState } from "react";
import firebaseDB, { db } from "../../firebase";

// If you have AuthContext, we'll read the current user for audit logs (optional)
let useAuthSafe = () => ({ currentUser: null });
try {
  const mod = require("../../context/AuthContext");
  if (mod && typeof mod.useAuth === "function") useAuthSafe = mod.useAuth;
} catch {}

/** Components for permission matrix */
const COMPONENTS = [
  "Dashboard",
  "Investments",
  "Workers Data",
  "Worker Call Data",
  "Client Data",
  "Enquiries",
  "Hospital List",
  "Expenses",
  "Assets",
  "Reports",
  "Accounts",
  "Task",
];

const ROLE_TEMPLATES = {
  admin: COMPONENTS.reduce((acc, c) => ({ ...acc, [c]: { view: true, edit: true, delete: true } }), {}),
  manager: COMPONENTS.reduce((acc, c) => ({ ...acc, [c]: { view: true, edit: true, delete: false } }), {}),
  user: COMPONENTS.reduce((acc, c) => ({ ...acc, [c]: { view: true, edit: false, delete: false } }), {}),
};

// Password hashing helper
async function sha256Base64(text) {
  try {
    const enc = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest("SHA-256", enc);
    const bytes = new Uint8Array(hash);
    let bin = "";
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin);
  } catch {
    console.warn("crypto.subtle not available, falling back to base64 of password");
    return btoa(unescape(encodeURIComponent(text)));
  }
}

export default function AdminMain() {
  const { currentUser } = useAuthSafe();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [creating, setCreating] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  // Permissions editor state
  const [editingUser, setEditingUser] = useState(null);
  const [tempPerms, setTempPerms] = useState({});

  // Load Users list from JenCeo-DataBase/Users
  useEffect(() => {
    setLoading(true);
    try {
      const ref = firebaseDB.child("Users");
      ref.on("value", (snap) => {
        const obj = snap.val() || {};
        const arr = Object.keys(obj).map((k) => ({ uid: k, ...(obj[k] || {}) }));
        setUsers(arr.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
        setLoading(false);
      });
      return () => {
        try { ref.off("value"); } catch {}
      };
    } catch (e) {
      console.error("Users listener error", e);
      setLoading(false);
    }
  }, []);

  function openEditor(user) {
    setEditingUser(user);
    const base = { ...(user.permissions || {}) };
    COMPONENTS.forEach((c) => { if (!base[c]) base[c] = { view: false, edit: false, delete: false }; });
    setTempPerms(base);
  }

  function togglePerm(component, action) {
    setTempPerms((prev) => ({
      ...prev,
      [component]: { ...(prev[component] || {}), [action]: !(prev[component] && prev[component][action]) },
    }));
  }

  async function savePerms() {
    if (!editingUser) return;
    try {
      await firebaseDB.child(`Users/${editingUser.uid}/permissions`).set(tempPerms);
      await firebaseDB.child("AuditLogs").push({
        action: "updatePermissions",
        byUid: currentUser?.uid || null,
        byEmail: currentUser?.email || null,
        targetUid: editingUser.uid,
        details: { permissions: tempPerms },
        ts: Date.now(),
      });
      setEditingUser(null);
      setTempPerms({});
    } catch (err) {
      console.error("savePerms error", err);
    }
  }

  async function toggleActive(uid, current) {
    try {
      await firebaseDB.child(`Users/${uid}/active`).set(!current);
      await firebaseDB.child("AuditLogs").push({
        action: "toggleActive",
        byUid: currentUser?.uid || null,
        byEmail: currentUser?.email || null,
        targetUid: uid,
        details: { active: !current },
        ts: Date.now(),
      });
    } catch (err) {
      console.error("toggleActive error", err);
    }
  }

  async function removeUser(uid, name) {
    if (!window.confirm(`Remove user record for "${name || uid}"?`)) return;
    try {
      await firebaseDB.child(`Users/${uid}`).remove();
      await firebaseDB.child("AuditLogs").push({
        action: "removeUserRecord",
        byUid: currentUser?.uid || null,
        byEmail: currentUser?.email || null,
        targetUid: uid,
        details: { removed: true },
        ts: Date.now(),
      });
    } catch (err) {
      console.error("removeUser error", err);
    }
  }

  async function handleCreate(e) {
    e && e.preventDefault && e.preventDefault();
    setErrMsg("");
    if (!newName?.trim()) return setErrMsg("Please enter a name");
    if (!newPassword) return setErrMsg("Please enter a password");

    setCreating(true);
    try {
      // Generate a key under JenCeo-DataBase/Users
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

      await firebaseDB.child(`Users/${uid}`).set(record);
      await firebaseDB.child("AuditLogs").push({
        action: "createUserNoEmail",
        byUid: currentUser?.uid || null,
        byEmail: currentUser?.email || null,
        targetUid: uid,
        details: { name: record.name, role: record.role },
        ts: Date.now(),
      });

      setShowCreate(false);
      setNewName("");
      setNewPassword("");
      setNewRole("user");
      openEditor(record);
    } catch (err) {
      console.error("create user failed", err);
      setErrMsg(err.message || String(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <div className="bg-dark text-white">
        <div className="card-header d-flex justify-content-between align-items-center">
          <strong>Admin — Users & Permissions</strong>
          <div>
            <button className="btn btn-sm btn-success me-2" onClick={() => setShowCreate(true)}>
              Create User
            </button>
            <button
              className="btn btn-sm btn-outline-light"
              onClick={() => {
                const csv = ["uid,name,role,active,permissions_json"];
                users.forEach((u) => {
                  csv.push([
                    u.uid,
                    `"${(u.name || "").replace(/"/g, '""')}"`,
                    u.role || "user",
                    u.active ? "1" : "0",
                    `"${JSON.stringify(u.permissions || {})}"`,
                  ].join(","));
                });
                const blob = new Blob([csv.join("\n")], { type: "text/csv" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "users.csv";
                a.click();
              }}
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-dark table-hover">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan="5" className="text-center small text-muted">Loading...</td>
                  </tr>
                )}
                {!loading && users.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center small text-muted">No users</td>
                  </tr>
                )}
                {!loading && users.map((u, i) => (
                  <tr key={u.uid}>
                    <td>{i + 1}</td>
                    <td>{u.name || "-"}</td>
                    <td>{u.role || "user"}</td>
                    <td>
                      <button
                        className={`btn btn-sm ${u.active ? "btn-success" : "btn-secondary"}`}
                        onClick={() => toggleActive(u.uid, !!u.active)}
                      >
                        {u.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline-info me-1" onClick={() => openEditor(u)}>
                        Permissions
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => removeUser(u.uid, u.name)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div
          className="modal-backdrop"
          onClick={() => setShowCreate(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)" }}
        >
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640, margin: "6% auto" }}>
            <div className="modal-content bg-dark text-white p-3">
              <h5>Create User (No Email)</h5>
              <form onSubmit={handleCreate}>
                <div className="mb-2">
                  <label className="small">Full name</label>
                  <input className="form-control" value={newName} onChange={(e) => setNewName(e.target.value)} required />
                </div>
                <div className="mb-2">
                  <label className="small">Password</label>
                  <input className="form-control" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                  <div className="form-text text-muted">Password will be stored as a hash (not plain text).</div>
                </div>
                <div className="mb-3">
                  <label className="small">Role</label>
                  <select className="form-select" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                    <option value="user">User</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {errMsg && <div className="alert alert-danger small">{errMsg}</div>}
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary" type="submit" disabled={creating}>{creating ? "Creating..." : "Create"}</button>
                  <button type="button" className="btn btn-outline-light" onClick={() => setShowCreate(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {editingUser && (
        <div
          className="modal-backdrop"
          onClick={() => { setEditingUser(null); setTempPerms({}); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)" }}
        >
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 900, margin: "4% auto" }}>
            <div className="modal-content bg-dark text-white p-3">
              <h5>
                Permissions — {editingUser.name || editingUser.uid}{" "}
                <span className="badge bg-secondary ms-2">{editingUser.role}</span>
              </h5>

              <div className="mb-2">
                <label className="small">Apply template</label>
                <div className="mt-1">
                  <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => setTempPerms(JSON.parse(JSON.stringify(ROLE_TEMPLATES.admin)))}>Admin</button>
                  <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => setTempPerms(JSON.parse(JSON.stringify(ROLE_TEMPLATES.manager)))}>Manager</button>
                  <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => setTempPerms(JSON.parse(JSON.stringify(ROLE_TEMPLATES.user)))}>User</button>
                </div>
              </div>

              <div className="table-responsive" style={{ maxHeight: 480, overflow: "auto" }}>
                <table className="table table-dark table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Component</th>
                      <th className="text-center">View</th>
                      <th className="text-center">Edit</th>
                      <th className="text-center">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPONENTS.map((c) => {
                      const perm = tempPerms[c] || { view: false, edit: false, delete: false };
                      return (
                        <tr key={c}>
                          <td>{c}</td>
                          <td className="text-center"><input type="checkbox" checked={!!perm.view} onChange={() => togglePerm(c, "view")} /></td>
                          <td className="text-center"><input type="checkbox" checked={!!perm.edit} onChange={() => togglePerm(c, "edit")} /></td>
                          <td className="text-center"><input type="checkbox" checked={!!perm.delete} onChange={() => togglePerm(c, "delete")} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn btn-success" onClick={savePerms}>Save</button>
                <button className="btn btn-outline-light" onClick={() => { setEditingUser(null); setTempPerms({}); }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
