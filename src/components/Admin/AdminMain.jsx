// src/pages/AdminUsers.jsx
import React, { useEffect, useState } from "react";
import firebaseDB, { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";

/**
 * AdminUsers — Bootstrap-only UI
 * - Uses AuthContext.createUser() which calls the Cloud Function to securely create users
 * - Writes audit logs for create/update actions under /AuditLogs
 */

const COMPONENTS = [
  "Dashboard","Investment","Workers Data","Worker Call Data","Client Data",
  "Enquiries","Hospital List","Expenses","Assets","Reports"
];

const ROLE_TEMPLATES = {
  admin: COMPONENTS.reduce((acc,c)=>({...acc,[c]:{view:true,edit:true,delete:true}}),{}),
  manager: COMPONENTS.reduce((acc,c)=>({...acc,[c]:{view:true,edit:true,delete:false}}),{}),
  user: COMPONENTS.reduce((acc,c)=>({...acc,[c]:{view:true,edit:false,delete:false}}),{})
};

export default function AdminMain() {
  const { currentUser, currentUserRecord, createUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [creating, setCreating] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  // permission editor
  const [editingUser, setEditingUser] = useState(null);
  const [tempPerms, setTempPerms] = useState({});

  useEffect(() => {
    setLoading(true);
    try {
      const ref = firebaseDB.ref("Users");
      ref.on("value", (snap) => {
        const val = snap && typeof snap.val === "function" ? snap.val() : (snap || {});
        const arr = val ? Object.keys(val).map(k=>({ uid:k, ...(val[k]||{}) })) : [];
        setUsers(arr.sort((a,b)=> (a.name||"").localeCompare(b.name||"")));
        setLoading(false);
      });
      return () => {
        try { ref.off("value"); } catch (e) {}
      };
    } catch (e) {
      console.error("Users listener error", e);
      setLoading(false);
    }
  }, []);

  // create user using cloud function via AuthContext
  async function handleCreate(e) {
    e && e.preventDefault && e.preventDefault();
    setErrMsg("");
    if (!newName || !newEmail || !newPassword) { setErrMsg("Fill name, email, password"); return; }
    setCreating(true);
    try {
      // permission template for role
      const template = ROLE_TEMPLATES[newRole] || ROLE_TEMPLATES.user;
      const payload = { email: newEmail.trim(), password: newPassword, name: newName.trim(), role: newRole, permissions: template };
      const result = await createUser(payload); // will call Cloud Function
      // write audit log locally too
      await db.ref("AuditLogs").push({
        action: "createUser",
        byUid: currentUser?.uid || null,
        byEmail: currentUser?.email || null,
        targetUid: result.uid,
        targetEmail: newEmail.trim(),
        details: { name: newName, role: newRole },
        ts: Date.now()
      });
      // reset
      setShowCreate(false);
      setNewName(""); setNewEmail(""); setNewPassword(""); setNewRole("user");
    } catch (err) {
      console.error("create user failed", err);
      setErrMsg(err.message || String(err));
    } finally {
      setCreating(false);
    }
  }

  // open permission editor
  function openEditor(user) {
    setEditingUser(user);
    const base = { ...(user.permissions || {}) };
    COMPONENTS.forEach(c=>{ if (!base[c]) base[c] = {view:false,edit:false,delete:false}; });
    setTempPerms(base);
  }

  // toggle permission
  function togglePerm(component, action) {
    setTempPerms(prev => {
      const next = { ...prev, [component]: { ...(prev[component]||{}), [action]: !(prev[component] && prev[component][action]) } };
      return next;
    });
  }

  async function savePerms() {
    if (!editingUser) return;
    try {
      await db.ref(`Users/${editingUser.uid}/permissions`).set(tempPerms);
      await db.ref("AuditLogs").push({
        action: "updatePermissions",
        byUid: currentUser?.uid || null,
        byEmail: currentUser?.email || null,
        targetUid: editingUser.uid,
        details: { permissions: tempPerms },
        ts: Date.now()
      });
      setEditingUser(null);
      setTempPerms({});
    } catch (err) {
      console.error("savePerms error", err);
    }
  }

  async function toggleActive(uid, current) {
    try {
      await db.ref(`Users/${uid}/active`).set(!current);
      await db.ref("AuditLogs").push({
        action: "toggleActive",
        byUid: currentUser?.uid || null,
        byEmail: currentUser?.email || null,
        targetUid: uid,
        details: { active: !current },
        ts: Date.now()
      });
    } catch (err) {
      console.error("toggleActive error", err);
    }
  }

  async function removeUser(uid, email) {
    if (!window.confirm(`Remove user record for ${email}? (Auth account not deleted)`)) return;
    try {
      await db.ref(`Users/${uid}`).remove();
      await db.ref("AuditLogs").push({
        action: "removeUserRecord",
        byUid: currentUser?.uid || null,
        byEmail: currentUser?.email || null,
        targetUid: uid,
        details: { removed: true },
        ts: Date.now()
      });
    } catch (err) {
      console.error("removeUser error", err);
    }
  }

  return (
    <>
      <div className=" bg-dark text-white">
        <div className="card-header d-flex justify-content-between align-items-center">
          <strong>Admin — Users & Permissions</strong>
          <div>
            <button className="btn btn-sm btn-success me-2" onClick={() => setShowCreate(true)}>Create User</button>
            <button className="btn btn-sm btn-outline-light" onClick={() => {
              // export CSV
              const csv = ["uid,name,email,role,active,permissions_json"];
              users.forEach(u => {
                csv.push([u.uid, `"${(u.name||"").replace(/"/g,'""')}"`, u.email, u.role || "user", u.active ? "1" : "0", `"${JSON.stringify(u.permissions||{})}"`].join(","));
              });
              const blob = new Blob([csv.join("\n")], { type: "text/csv" });
              const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "users.csv"; a.click();
            }}>Export CSV</button>
          </div>
        </div>

        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-dark table-hover">
              <thead>
                <tr><th>#</th><th>Name</th><th>Email</th><th>Role</th><th>Active</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan="6" className="text-center small text-muted">Loading...</td></tr>}
                {!loading && users.length === 0 && <tr><td colSpan="6" className="text-center small text-muted">No users</td></tr>}
                {!loading && users.map((u, i) => (
                  <tr key={u.uid}>
                    <td>{i+1}</td>
                    <td>{u.name || "-"}</td>
                    <td>{u.email || "-"}</td>
                    <td>{u.role || "user"}</td>
                    <td>
                      <button className={`btn btn-sm ${u.active ? "btn-success" : "btn-secondary"}`} onClick={() => toggleActive(u.uid, !!u.active)}>
                        {u.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline-info me-1" onClick={() => openEditor(u)}>Permissions</button>
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => alert("Edit user not implemented in UI; use DB or extend")}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => removeUser(u.uid, u.email)}>Remove</button>
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
        <div className="modal-backdrop" onClick={() => setShowCreate(false)} style={{ position: "fixed", inset: 0 }}>
          <div className="modal-dialog" onClick={(e)=>e.stopPropagation()} style={{ maxWidth: 640, margin: "6% auto" }}>
            <div className="modal-content bg-dark text-white p-3">
              <h5>Create User</h5>
              <form onSubmit={handleCreate}>
                <div className="mb-2">
                  <label className="small">Full name</label>
                  <input className="form-control" value={newName} onChange={e=>setNewName(e.target.value)} required />
                </div>
                <div className="mb-2">
                  <label className="small">Email</label>
                  <input className="form-control" type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} required />
                </div>
                <div className="mb-2">
                  <label className="small">Password</label>
                  <input className="form-control" type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} required />
                </div>
                <div className="mb-3">
                  <label className="small">Role</label>
                  <select className="form-select" value={newRole} onChange={e=>setNewRole(e.target.value)}>
                    <option value="user">User</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {errMsg && <div className="alert alert-danger small">{errMsg}</div>}
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary" type="submit" disabled={creating}>{creating ? "Creating..." : "Create"}</button>
                  <button type="button" className="btn btn-outline-light" onClick={()=>setShowCreate(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {editingUser && (
        <div className="modal-backdrop" onClick={() => { setEditingUser(null); setTempPerms({}); }} style={{ position: "fixed", inset: 0 }}>
          <div className="modal-dialog" onClick={(e)=>e.stopPropagation()} style={{ maxWidth: 900, margin: "4% auto" }}>
            <div className="modal-content bg-dark text-white p-3">
              <h5>Permissions — {editingUser.name || editingUser.email}</h5>
              <div className="mb-2">
                <label className="small">Apply template</label>
                <div>
                  <button className="btn btn-sm btn-outline-secondary me-1" onClick={()=>setTempPerms(JSON.parse(JSON.stringify(ROLE_TEMPLATES.admin)))}>Admin</button>
                  <button className="btn btn-sm btn-outline-secondary me-1" onClick={()=>setTempPerms(JSON.parse(JSON.stringify(ROLE_TEMPLATES.manager)))}>Manager</button>
                  <button className="btn btn-sm btn-outline-secondary me-1" onClick={()=>setTempPerms(JSON.parse(JSON.stringify(ROLE_TEMPLATES.user)))}>User</button>
                </div>
              </div>

              <div className="table-responsive" style={{ maxHeight: 480, overflow: "auto" }}>
                <table className="table table-dark table-sm">
                  <thead><tr><th>Component</th><th style={{textAlign:"center"}}>View</th><th style={{textAlign:"center"}}>Edit</th><th style={{textAlign:"center"}}>Delete</th></tr></thead>
                  <tbody>
                    {COMPONENTS.map(c => {
                      const perm = tempPerms[c] || {view:false,edit:false,delete:false};
                      return (
                        <tr key={c}>
                          <td>{c}</td>
                          <td className="text-center"><input type="checkbox" checked={!!perm.view} onChange={()=>togglePerm(c,"view")} /></td>
                          <td className="text-center"><input type="checkbox" checked={!!perm.edit} onChange={()=>togglePerm(c,"edit")} /></td>
                          <td className="text-center"><input type="checkbox" checked={!!perm.delete} onChange={()=>togglePerm(c,"delete")} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn btn-success" onClick={savePerms}>Save</button>
                <button className="btn btn-outline-light" onClick={()=>{ setEditingUser(null); setTempPerms({}); }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
