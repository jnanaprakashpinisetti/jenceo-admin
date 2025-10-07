// src/components/Admin/AdminMain.jsx
import React, { useEffect, useMemo, useState } from "react";
import firebaseDB from "../../firebase";

let useAuthSafe = () => ({ currentUser: null, user: null });
try {
  const mod = require("../../context/AuthContext");
  if (mod && typeof mod.useAuth === "function") useAuthSafe = mod.useAuth;
} catch { }

const MODULES = [
  { key: "Dashboard", icon: "📊", extras: [] },
  { key: "Investments", icon: "💰", extras: ["export"] },
  { key: "Staff Data", icon: "👨‍💼", extras: ["export"] },
  { key: "Existing Staff", icon: "👥", extras: ["export"] },
  { key: "Workers Data", icon: "👷", extras: ["export"] },
  { key: "Worker Agreement", icon: "📝", extras: ["export"] },
  { key: "Worker Call Data", icon: "📞", extras: [] },
  { key: "Client Data", icon: "👥", extras: ["approve", "reject", "clarify", "managePayments", "export"] },
  { key: "Client Exit", icon: "🚪", extras: ["export"] },
  { key: "Enquiries", icon: "📝", extras: ["approve", "reject", "clarify", "export"] },
  { key: "Old Enquiry", icon: "📋", extras: ["export"] },
  { key: "Hospital List", icon: "🏥", extras: ["export"] },
  { key: "Delete Hospitals", icon: "🗑️", extras: [] },
  { key: "Expenses", icon: "💳", extras: ["export", "approve"] },
  { key: "Expense Delete", icon: "❌", extras: [] },
  { key: "Assets", icon: "🏢", extras: ["export"] },
  { key: "Reports", icon: "📈", extras: ["export"] },
  { key: "Accounts", icon: "💼", extras: ["export"] },
  { key: "Task", icon: "✅", extras: [] },
  { key: "Admin", icon: "⚙️", extras: [] },
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

const ROLE_TEMPLATES = {
  admin: withAll(true),
  manager: withBase(true, { delete: false, export: true, approve: true, reject: true, clarify: true }),
  user: withBase({ view: true }, { create: false, edit: false, delete: false }),
  auditor: withOnly({ view: true, export: true }),
  finance: withOnly({ view: true, export: true, managePayments: true, edit: true }),
};

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

async function sha256Base64(text) {
  try {
    const enc = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest("SHA-256", enc);
    const b = String.fromCharCode(...new Uint8Array(hash));
    return btoa(b);
  } catch {
    return btoa(unescape(encodeURIComponent(text)));
  }
}

// Enhanced Toast Component
function Toast({ toast, onClose }) {
  if (!toast) return null;

  const icons = {
    success: "✅",
    error: "❌",
    warn: "⚠️",
    info: "ℹ️"
  };

  const bgColors = {
    success: "bg-success",
    error: "bg-danger",
    warn: "bg-warning",
    info: "bg-info"
  };

  return (
    <div className={`toast-notification ${bgColors[toast.type]}`}>
      <div className="toast-content">
        <span className="toast-icon">{icons[toast.type]}</span>
        <div className="toast-message">{toast.msg}</div>
      </div>
      <button className="toast-close" onClick={onClose}>×</button>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, icon, color, trend }) {
  return (
    <div className={`stat-card stat-card-${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <h3>{value}</h3>
        <p>{title}</p>
        {trend && (
          <div className={`stat-trend ${trend > 0 ? 'up' : 'down'}`}>
            {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
          </div>
        )}
      </div>
    </div>
  );
}

// User Card Component
function UserCard({ user, selected, onSelect, onEdit, onToggleActive, onResetPassword, onImpersonate, onRemove }) {
  return (
    <div className={`user-card ${!user.active ? 'inactive' : ''}`}>
      <div className="user-card-header">
        <div className="user-avatar-container">
          {user.photoURL ? (
            <img src={user.photoURL} alt="User" className="user-photo" />
          ) : (
            <div className="user-avatar">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <div className="user-info">
            <h6 className="user-name">{user.name || 'Unnamed User'}</h6>
            <span className="user-uid">{user.uid}</span>
          </div>
        </div>
        <input
          type="checkbox"
          className="user-select"
          checked={selected}
          onChange={(e) => onSelect(user.uid, e.target.checked)}
        />
      </div>

      <div className="user-details">
        <div className="user-role-badge">
          <span className={`role-badge role-${user.role || 'user'}`}>
            {user.role || 'user'}
          </span>
        </div>
        <div className="user-status">
          <span className={`status-indicator ${user.active ? 'active' : 'inactive'}`}>
            {user.active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="user-created">
          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
        </div>
      </div>

      <div className="user-actions">
        <button className="btn btn-sm btn-outline-primary" onClick={() => onEdit(user)}>
          Permissions
        </button>
        <button className="btn btn-sm btn-outline-warning" onClick={() => onResetPassword(user)}>
          Reset PW
        </button>
        <button className="btn btn-sm btn-outline-info" onClick={() => onImpersonate(user)}>
          Impersonate
        </button>
        <button className="btn btn-sm btn-outline-danger" onClick={() => onRemove(user)}>
          Remove
        </button>
        <button
          className={`btn btn-sm ${user.active ? 'btn-outline-secondary' : 'btn-success'}`}
          onClick={() => onToggleActive(user)}
        >
          {user.active ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </div>
  );
}

// Confirmation Modal Component
// Confirmation Modal Component
function ConfirmationModal({ show, title, message, onConfirm, onCancel, confirmText = "Yes", cancelText = "No", type = "warning" }) {
  if (!show) return null;

  const icons = {
    warning: "⚠️",
    danger: "❌",
    info: "ℹ️",
    success: "✅"
  };

  const buttonStyles = {
    warning: "btn-warning",
    danger: "btn-danger",
    info: "btn-info",
    success: "btn-success"
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content confirmation-modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        <div className="modal-body">
          <div className="confirmation-content">
            <div className="confirmation-icon">
              {icons[type]}
            </div>
            <div className="confirmation-message">
              {message}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <div className="footer-actions">
            <button className={`btn ${buttonStyles[type]}`} onClick={onConfirm}>
              {confirmText}
            </button>
            <button className="btn btn-secondary" onClick={onCancel}>
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default function AdminMain() {
  const { currentUser, user: userFromCtx, logout } = useAuthSafe();
  const adminUid = currentUser?.uid || userFromCtx?.uid || null;

  // States
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("all");
  const [activeOnly, setActiveOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [permissionViewMode, setPermissionViewMode] = useState("grid");

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [tempPerms, setTempPerms] = useState(makeBlankPerms());

  // Confirmation Modals
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: "",
    message: "",
    onConfirm: null,
    type: "warning"
  });

  // Remove User Modal
  const [removeUserModal, setRemoveUserModal] = useState({
    show: false,
    user: null
  });

  // Form states
  const [newUser, setNewUser] = useState({
    name: '',
    password: '',
    role: 'user'
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Advanced Features
  const [tester, setTester] = useState({ uid: "", component: "Client Data", action: "edit", running: false, result: "" });
  const [audit, setAudit] = useState({ list: [], open: false, loading: false });

  // Bulk Operations
  const [selectedUsers, setSelectedUsers] = useState({});
  const [bulkOperation, setBulkOperation] = useState("");

  // Toast
  const [toast, setToast] = useState(null);

  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    adminUsers: 0,
    recentActivity: 0
  });

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const showConfirmation = (title, message, onConfirm, type = "warning") => {
    setConfirmModal({
      show: true,
      title,
      message,
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, show: false }));
        onConfirm();
      },
      type
    });
  };

  // Load Users
  useEffect(() => {
    setLoading(true);
    const ref = firebaseDB.child("Users");
    const onValue = ref.on("value", (snap) => {
      const obj = snap.val() || {};
      const arr = Object.keys(obj).map((k) => ({ uid: k, ...(obj[k] || {}) }));
      arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setUsers(arr);

      // Calculate stats
      const activeUsers = arr.filter(u => u.active !== false).length;
      const adminUsers = arr.filter(u => u.role === 'admin').length;
      setStats({
        totalUsers: arr.length,
        activeUsers,
        adminUsers,
        recentActivity: arr.filter(u => u.createdAt > Date.now() - 7 * 24 * 60 * 60 * 1000).length
      });

      setLoading(false);
    });
    return () => ref.off("value", onValue);
  }, []);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    let arr = users.slice();
    if (roleFilter !== "all") arr = arr.filter((u) => (u.role || "user") === roleFilter);
    if (activeOnly) arr = arr.filter((u) => u.active !== false);
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      arr = arr.filter((u) =>
        (u.name || "").toLowerCase().includes(query) ||
        (u.uid || "").toLowerCase().includes(query) ||
        (u.role || "").toLowerCase().includes(query)
      );
    }
    return arr;
  }, [users, roleFilter, activeOnly, searchQuery]);

  // Safe DB operations
  async function safeSet(path, payload, auditEntry) {
    try {
      await firebaseDB.child(path).set(payload);
      if (auditEntry) await firebaseDB.child("AuditLogs").push(auditEntry);
      return { ok: true };
    } catch (e) {
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
        return { ok: false, queued: true };
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
        return { ok: false, queued: true };
      }
      throw e;
    }
  }

  // Enhanced User Management Functions
  const openEditor = (user) => {
    const base = makeBlankPerms();
    const got = user?.permissions || {};
    MODULES.forEach((m) => {
      base[m.key] = { ...base[m.key], ...(got[m.key] || {}) };
    });
    setEditingUser(user);
    setTempPerms(base);
  };

  const togglePerm = (modKey, action) => {
    setTempPerms(prev => ({
      ...prev,
      [modKey]: { ...(prev[modKey] || {}), [action]: !prev[modKey]?.[action] },
    }));
  };

  // Force logout user by clearing their session data
  const forceLogoutUser = async (userId) => {
    try {
      // Clear session storage for the user
      const sessionData = sessionStorage.getItem("auth:user");
      if (sessionData) {
        const userData = JSON.parse(sessionData);
        if (userData.dbId === userId || userData.uid === userId) {
          sessionStorage.removeItem("auth:user");
        }
      }

      // Clear any localStorage data
      localStorage.removeItem("impersonateUid");

      // Update user's lastSync to force re-login
      await safeUpdate(`Users/${userId}`, {
        lastSync: null,
        lastLogout: Date.now()
      });

    } catch (error) {
      console.error("Error forcing logout:", error);
    }
  };

  // Save permissions with confirmation
  const savePerms = async () => {
    if (!editingUser) return;

    showConfirmation(
      "Update Permissions",
      `Are you sure you want to update permissions for ${editingUser.name || editingUser.uid}? This will log out the user.`,
      async () => {
        // Create a clean permissions object without undefined values
        const cleanPerms = {};
        Object.keys(tempPerms).forEach(moduleKey => {
          cleanPerms[moduleKey] = {};
          ALL_ACTIONS.forEach(action => {
            cleanPerms[moduleKey][action] = Boolean(tempPerms[moduleKey]?.[action]);
          });
        });

        const path = `Users/${editingUser.uid}/permissions`;
        const auditEntry = {
          action: "updatePermissions",
          byUid: adminUid || null,
          targetUid: editingUser.uid,
          details: { permissions: cleanPerms },
          ts: Date.now(),
        };

        try {
          const res = await safeSet(path, cleanPerms, auditEntry);
          if (res.ok) {
            showToast("success", `Permissions saved for ${editingUser.name || editingUser.uid}. User has been logged out.`);

            // Force logout the user
            await forceLogoutUser(editingUser.uid);

            // If admin is editing their own permissions, log them out immediately
            if (editingUser.uid === adminUid) {
              setTimeout(() => {
                logout();
              }, 1500);
            }

            setEditingUser(null);
          } else if (res.queued) {
            showToast("warn", "Write blocked by rules. Request queued.");
            setEditingUser(null);
          }
        } catch (error) {
          showToast("error", `Failed to save permissions: ${error.message}`);
        }
      }
    );
  };

  // Toggle user active status with confirmation
  const toggleActive = async (user) => {
    const newActiveState = !user.active;

    showConfirmation(
      newActiveState ? "Activate User" : "Deactivate User",
      `Are you sure you want to ${newActiveState ? 'activate' : 'deactivate'} ${user.name || user.uid}? This will log out the user.`,
      async () => {
        const path = `Users/${user.uid}`;
        const res = await safeUpdate(
          path,
          {
            active: newActiveState,
            lastSync: null // Force logout
          },
          {
            action: "toggleActive",
            byUid: adminUid || null,
            targetUid: user.uid,
            details: { active: newActiveState },
            ts: Date.now()
          }
        );

        if (res.ok) {
          showToast("success", `User is now ${newActiveState ? "Active" : "Inactive"}. User has been logged out.`);

          // Force logout the user
          await forceLogoutUser(user.uid);

          // If admin is deactivating themselves, log them out immediately
          if (!newActiveState && user.uid === adminUid) {
            setTimeout(() => {
              logout();
            }, 1500);
          }
        } else if (res.queued) {
          showToast("warn", "Rules blocked; request queued.");
        }
      }
    );
  };

  // Remove user with modal
  const removeUser = async (user) => {
    setRemoveUserModal({
      show: true,
      user: user
    });
  };

  const confirmRemoveUser = async () => {
    const { user } = removeUserModal;
    if (!user) return;

    // Archive user data before removal
    const archiveData = {
      ...user,
      archivedAt: Date.now(),
      archivedBy: adminUid,
      originalUid: user.uid
    };

    try {
      // Archive the user
      await firebaseDB.child(`ArchivedUsers/${user.uid}`).set(archiveData);

      // Remove from active users
      await firebaseDB.child(`Users/${user.uid}`).remove();

      await firebaseDB.child("AuditLogs").push({
        action: "removeUserRecord",
        byUid: adminUid || null,
        targetUid: user.uid,
        details: { removed: true, archived: true },
        ts: Date.now(),
      });

      showToast("success", `Removed ${user.name || user.uid}. User data has been archived.`);

      // Force logout the removed user
      await forceLogoutUser(user.uid);

    } catch (e) {
      const code = (e && (e.code || e.message || "")).toString().toLowerCase();
      if (code.includes("permission_denied")) {
        await firebaseDB.child(`AdminRequests/${adminUid || "unknown"}`).push({
          action: "REMOVE",
          path: `Users/${user.uid}`,
          requestedBy: adminUid || null,
          requestedAt: Date.now(),
          status: "pending",
          details: { reason: "UI request to delete user record" },
        });
        showToast("warn", "Delete blocked by rules. Request queued.");
      } else {
        showToast("error", `Failed to remove: ${e?.message || e}`);
      }
    } finally {
      setRemoveUserModal({ show: false, user: null });
    }
  };

  // Reset password with confirmation
  const resetPassword = async (user) => {
    const pw = prompt("Enter a new password for this user:");
    if (!pw) return;

    showConfirmation(
      "Reset Password",
      `Are you sure you want to reset password for ${user.name || user.uid}? This will log out the user.`,
      async () => {
        const passwordHash = await sha256Base64(pw);
        const res = await safeUpdate(
          `Users/${user.uid}`,
          {
            passwordHash,
            lastSync: null // Force logout
          },
          {
            action: "resetPasswordHash",
            byUid: adminUid || null,
            targetUid: user.uid,
            ts: Date.now()
          }
        );

        if (res.ok) {
          showToast("success", "Password reset. User has been logged out.");

          // Force logout the user
          await forceLogoutUser(user.uid);

        } else if (res.queued) {
          showToast("warn", "Rules blocked; request queued.");
        }
      }
    );
  };

  // Impersonate user - This allows admin to test the app as that user
  const impersonate = (user) => {
    localStorage.setItem("impersonateUid", user.uid);
    showToast("success", `Impersonating ${user.name || user.uid}. Reload the page to see the app as this user. This is for testing purposes.`);
  };

  // Create user
  const handleCreate = async (e) => {
    e?.preventDefault?.();
    setError("");
    if (!newUser.name?.trim()) return setError("Please enter a name");
    if (!newUser.password) return setError("Please enter a password");

    setCreating(true);
    try {
      const usersRef = firebaseDB.child("Users");
      const uid = usersRef.push().key;
      const passwordHash = await sha256Base64(newUser.password);
      const template = ROLE_TEMPLATES[newUser.role] || ROLE_TEMPLATES.user;
      const record = {
        uid,
        name: newUser.name.trim(),
        role: newUser.role,
        active: true, // Default to active when creating
        createdAt: Date.now(),
        email: null,
        passwordHash,
        permissions: template,
        lastSync: null
      };
      const res = await safeSet(`Users/${uid}`, record, {
        action: "createUserNoEmail",
        byUid: adminUid || null,
        targetUid: uid,
        details: { name: record.name, role: record.role },
        ts: Date.now(),
      });
      if (res.ok) {
        showToast("success", `Created user "${record.name}"`);
        setShowCreate(false);
        setNewUser({ name: '', password: '', role: 'user' });
        openEditor(record);
      } else if (res.queued) {
        showToast("warn", "Rules blocked creating user. Request queued.");
        setShowCreate(false);
      }
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setCreating(false);
    }
  };

  // Export CSV
  const exportCsv = () => {
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
  };

  // Load audit logs
  const loadAudit = async () => {
    setAudit((a) => ({ ...a, loading: true, open: true }));
    try {
      const snap = await firebaseDB.child("AuditLogs").orderByChild("ts").limitToLast(100).get();
      const obj = snap.val() || {};
      const rows = Object.keys(obj).map((k) => ({ id: k, ...obj[k] }));
      rows.sort((a, b) => (b.ts || 0) - (a.ts || 0));
      setAudit({ list: rows, loading: false, open: true });
    } catch (e) {
      setAudit((a) => ({ ...a, loading: false }));
      showToast("error", "Failed to load audit logs: " + (e?.message || e));
    }
  };

  // Bulk operations
  const handleBulkOperation = async (operation) => {
    const selected = Object.keys(selectedUsers).filter(uid => selectedUsers[uid]);
    if (selected.length === 0) {
      showToast("warn", "Please select users first");
      return;
    }

    switch (operation) {
      case 'activate':
        await bulkToggleActive(selected, true);
        break;
      case 'deactivate':
        await bulkToggleActive(selected, false);
        break;
      case 'delete':
        if (window.confirm(`Delete ${selected.length} users?`)) {
          await bulkDelete(selected);
        }
        break;
      default:
        if (ROLE_TEMPLATES[operation]) {
          await bulkApplyTemplate(selected, operation);
        }
    }
    setBulkOperation("");
  };

  const bulkApplyTemplate = async (userIds, templateKey) => {
    const tmpl = ROLE_TEMPLATES[templateKey];
    if (!tmpl) return;
    let success = 0;
    for (const uid of userIds) {
      const res = await safeSet(
        `Users/${uid}/permissions`,
        tmpl,
        {
          action: "bulkApplyTemplate",
          byUid: adminUid || null,
          targetUid: uid,
          details: { template: templateKey },
          ts: Date.now()
        }
      );
      if (res.ok) {
        success++;
        // Force logout users whose permissions were changed
        await forceLogoutUser(uid);
      }
    }
    showToast("success", `Applied template to ${success} user(s). All affected users have been logged out.`);
    setSelectedUsers({});
  };

  const bulkToggleActive = async (userIds, active) => {
    let success = 0;
    for (const uid of userIds) {
      const res = await safeUpdate(`Users/${uid}`, {
        active,
        lastSync: null // Force logout
      }, {
        action: "bulkToggleActive",
        byUid: adminUid,
        targetUid: uid,
        details: { active },
        ts: Date.now(),
      });
      if (res.ok) {
        success++;
        // Force logout users who were deactivated
        if (!active) {
          await forceLogoutUser(uid);
        }
      }
    }
    showToast("success", `Updated ${success} users. ${!active ? 'Deactivated users have been logged out.' : ''}`);
    setSelectedUsers({});
  };

  const bulkDelete = async (userIds) => {
    let success = 0;
    for (const uid of userIds) {
      try {
        // Archive user first
        const user = users.find(u => u.uid === uid);
        if (user) {
          const archiveData = {
            ...user,
            archivedAt: Date.now(),
            archivedBy: adminUid,
            originalUid: user.uid
          };
          await firebaseDB.child(`ArchivedUsers/${uid}`).set(archiveData);
        }

        await firebaseDB.child(`Users/${uid}`).remove();
        success++;

        // Force logout the removed user
        await forceLogoutUser(uid);

      } catch (e) {
        console.error(`Failed to delete user ${uid}:`, e);
      }
    }
    showToast("success", `Deleted ${success} user(s). All removed users have been logged out.`);
    setSelectedUsers({});
  };

  // Reset all filters
  const resetFilters = () => {
    setRoleFilter("all");
    setActiveOnly(false);
    setSearchQuery("");
    setSelectedUsers({});
  };

  return (
    <div className="admin-main">
      {/* Header Section */}
      <div className="admin-header">
        <div className="header-content">
          <div className="header-title">
            <h1>User Management</h1>
            <p>Manage users, permissions, and access controls</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <span className="btn-icon">+</span>
              Create User
            </button>
            <button className="btn btn-outline-secondary" onClick={exportCsv}>
              <span className="btn-icon">📥</span>
              Export CSV
            </button>
            <button className="btn btn-outline-info" onClick={loadAudit}>
              <span className="btn-icon">📋</span>
              Audit Logs
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="stats-overview">
        <div className="row g-3">
          <div className="col-xl-3 col-md-6">
            <StatCard
              title="Total Users"
              value={stats.totalUsers}
              icon="👥"
              color="primary"
              trend={12.5}
            />
          </div>
          <div className="col-xl-3 col-md-6">
            <StatCard
              title="Active Users"
              value={stats.activeUsers}
              icon="✅"
              color="success"
              trend={8.2}
            />
          </div>
          <div className="col-xl-3 col-md-6">
            <StatCard
              title="Admin Users"
              value={stats.adminUsers}
              icon="👑"
              color="warning"
              trend={3.1}
            />
          </div>
          <div className="col-xl-3 col-md-6">
            <StatCard
              title="New This Week"
              value={stats.recentActivity}
              icon="🆕"
              color="info"
              trend={15.7}
            />
          </div>
        </div>
      </div>

      {/* Controls Section */}
      <div className="controls-section">
        <div className="row g-3 align-items-center">
          <div className="col-md-2">
            <div className="search-box">
              <input
                type="text"
                className="form-control"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="search-icon">🔍</span>
            </div>
          </div>
          <div className="col-md-2">
            <select className="form-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="finance">Finance</option>
              <option value="auditor">Auditor</option>
              <option value="user">User</option>
            </select>
          </div>
          <div className="col-md-2">
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                id="activeOnly"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="activeOnly">
                Active Only
              </label>
            </div>
          </div>
          <div className="col-md-2">
            <div className="view-toggle">
              <button
                className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setViewMode('grid')}
              >
                🏠 Grid
              </button>
              <button
                className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setViewMode('list')}
              >
                📋 List
              </button>
            </div>
          </div>
          <div className="col-md-2">
            <div className="bulk-actions">
              <select
                className="form-select"
                value={bulkOperation}
                onChange={(e) => handleBulkOperation(e.target.value)}
              >
                <option value="">Bulk Actions</option>
                <option value="activate">Activate Selected</option>
                <option value="deactivate">Deactivate Selected</option>
                <option value="admin">Apply Admin Template</option>
                <option value="user">Apply User Template</option>
                <option value="delete">Delete Selected</option>
              </select>
            </div>
          </div>
          <div className="col-md-2">
            <button className="btn btn-outline-warning w-100" onClick={resetFilters}>
              <span className="btn-icon">🔄</span>
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Users Display */}
      <div className="users-section">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading users...</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="users-grid">
            {filteredUsers.map(user => (
              <UserCard
                key={user.uid}
                user={user}
                selected={!!selectedUsers[user.uid]}
                onSelect={(uid, checked) => setSelectedUsers(prev => ({ ...prev, [uid]: checked }))}
                onEdit={openEditor}
                onToggleActive={toggleActive}
                onResetPassword={resetPassword}
                onImpersonate={impersonate}
                onRemove={removeUser}
              />
            ))}
          </div>
        ) : (
          <div className="users-list">
            <div className="list-header">
              <div className="list-row header-row">
                <div className="list-cell select-cell">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      const newSelected = {};
                      if (e.target.checked) {
                        filteredUsers.forEach(user => {
                          newSelected[user.uid] = true;
                        });
                      }
                      setSelectedUsers(newSelected);
                    }}
                  />
                </div>
                <div className="list-cell user-cell">User</div>
                <div className="list-cell role-cell">Role</div>
                <div className="list-cell status-cell">Status</div>
                <div className="list-cell created-cell">Created</div>
                <div className="list-cell actions-cell">Actions</div>
              </div>
            </div>
            <div className="list-body">
              {filteredUsers.map(user => (
                <div key={user.uid} className={`list-row ${!user.active ? 'inactive-row' : ''}`}>
                  <div className="list-cell select-cell">
                    <input
                      type="checkbox"
                      checked={!!selectedUsers[user.uid]}
                      onChange={(e) => setSelectedUsers(prev => ({
                        ...prev,
                        [user.uid]: e.target.checked
                      }))}
                    />
                  </div>
                  <div className="list-cell user-cell">
                    <div className="user-display">
                      <div className="user-avatar-sm">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt="User" className="user-photo-sm" />
                        ) : (
                          user.name ? user.name.charAt(0).toUpperCase() : 'U'
                        )}
                      </div>
                      <div className="user-info-sm">
                        <div className="user-name">{user.name || 'Unnamed User'}</div>
                        {/* <div className="user-uid">{user.uid}</div> */}
                      </div>
                    </div>
                  </div>
                  <div className="list-cell role-cell">
                    <span className={`role-badge role-${user.role || 'user'}`}>
                      {user.role || 'user'}
                    </span>
                  </div>
                  <div className="list-cell status-cell">
                    <span className={`status-indicator ${user.active ? 'active' : 'inactive'}`}>
                      {user.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="list-cell created-cell">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                  </div>
                  <div className="list-cell actions-cell">
                    <div className="action-buttons">
                      <button className="btn btn-sm btn-outline-primary" onClick={() => openEditor(user)}>
                        Permissions
                      </button>
                      <button className="btn btn-sm btn-outline-warning" onClick={() => resetPassword(user)}>
                        Reset PW
                      </button>
                      {/* <button className="btn btn-sm btn-outline-info" onClick={() => impersonate(user)}>
                        Impersonate
                      </button> */}
                      <button className="btn btn-sm btn-outline-danger" onClick={() => removeUser(user)}>
                        Remove
                      </button>
                      <button
                        className={`btn btn-sm ${user.active ? 'btn-outline-secondary' : 'btn-success'}`}
                        onClick={() => toggleActive(user)}
                      >
                        {user.active ? 'Inactive' : 'Activate'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && filteredUsers.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>No users found</h3>
            <p>Try adjusting your search or filters</p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              Create First User
            </button>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div className="modal-overlay">
          <div className="modal-content white-bg">
            <div className="modal-header">
              <h3>Create New User</h3>
              <button className="modal-close" onClick={() => setShowCreate(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newUser.name}
                    onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter user's full name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter password"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select
                    className="form-select"
                    value={newUser.role}
                    onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                  >
                    <option value="user">User</option>
                    <option value="manager">Manager</option>
                    <option value="finance">Finance</option>
                    <option value="auditor">Auditor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {error && (
                  <div className="alert alert-danger">
                    {error}
                  </div>
                )}
                <div className="modal-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={creating}
                  >
                    {creating ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Creating...
                      </>
                    ) : (
                      'Create User'
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowCreate(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Permissions Modal */}
      {editingUser && (
        <div className="modal-overlay">
          <div className="modal-content permissions-modal">
            <div className="modal-header">
              <div className="user-header-info">
                <div className="user-details-modal">
                  <div className="user-avatar-modal">
                    {editingUser.photoURL ? (
                      <img src={editingUser.photoURL} alt="User" className="user-photo-modal" />
                    ) : (
                      editingUser.name ? editingUser.name.charAt(0).toUpperCase() : 'U'
                    )}
                  </div>
                  <h3>{editingUser.name || 'Unnamed User'}</h3>
                  <div className="user-meta">
                    <span className={`role-badge role-${editingUser.role || 'user'}`}>
                      {editingUser.role || 'user'}
                    </span>
                  </div>
                </div>
              </div>

              <button className="modal-close" onClick={() => setEditingUser(null)}>×</button>
            </div>
            <div className="modal-body permissions-editor">
              {/* Quick Templates */}
              <div className="template-quick-actions">
                <div className="template-buttons">
                  {Object.keys(ROLE_TEMPLATES).map(template => (
                    <button
                      key={template}
                      className="btn btn-sm btn-outline-primary template-btn"
                      onClick={() => setTempPerms(JSON.parse(JSON.stringify(ROLE_TEMPLATES[template])))}
                    >
                      {template.charAt(0).toUpperCase() + template.slice(1)}
                    </button>
                  ))}
                  <button
                    className="btn btn-sm btn-outline-danger template-btn"
                    onClick={() => setTempPerms(makeBlankPerms())}
                  >
                    Reset All
                  </button>
                </div>
              </div>


              <div className="permissions-grid-view">
                {MODULES.map((module) => (
                  <div key={module.key} className="permission-module-card">
                    <div className="module-card-header">
                      <span className="module-icon">{module.icon}</span>
                      <span className="module-name">{module.key}</span>
                    </div>
                    <div className="module-actions-grid">
                      {ALL_ACTIONS.map((action) => {
                        const isExtra = EXTRA_ACTIONS.includes(action);
                        const isAvailable = !isExtra || module.extras.includes(action);

                        return (
                          <label
                            key={action}
                            className={`permission-checkbox ${!isAvailable ? 'disabled' : ''}`}
                            title={!isAvailable ? `Action not available for ${module.key}` : ''}
                          >
                            <input
                              type="checkbox"
                              checked={!!tempPerms[module.key]?.[action]}
                              disabled={!isAvailable}
                              onChange={() => isAvailable && togglePerm(module.key, action)}
                            />
                            <span className="checkmark"></span>
                            <span className="action-label">{action}</span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="module-quick-actions">
                      <button
                        className="btn btn-xs btn-outline-secondary"
                        onClick={() => {
                          BASE_ACTIONS.forEach(action => {
                            if (tempPerms[module.key]?.[action] !== true) {
                              togglePerm(module.key, action);
                            }
                          });
                        }}
                      >
                        All Core
                      </button>
                      <button
                        className="btn btn-xs btn-outline-secondary"
                        onClick={() => {
                          BASE_ACTIONS.forEach(action => {
                            if (tempPerms[module.key]?.[action] !== false) {
                              togglePerm(module.key, action);
                            }
                          });
                        }}
                      >
                        None
                      </button>
                    </div>
                  </div>
                ))}
              </div>




              <div className="modal-actions">
                <button className="btn btn-success" onClick={savePerms}>
                  <span className="btn-icon">💾</span>
                  Save Permissions
                </button>
                <button className="btn btn-secondary" onClick={() => setEditingUser(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Modal */}
      {audit.open && (
        <div className="modal-overlay">
          <div className="modal-content audit-modal">
            <div className="modal-header">
              <h3>Audit Logs</h3>
              <button className="modal-close" onClick={() => setAudit(prev => ({ ...prev, open: false }))}>×</button>
            </div>
            <div className="modal-body">
              {audit.loading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Loading audit logs...</p>
                </div>
              ) : (
                <div className="audit-logs">
                  {audit.list.map((log) => (
                    <div key={log.id} className="audit-log-item">
                      <div className="log-header">
                        <span className="log-action">{log.action}</span>
                        <span className="log-time">
                          {log.ts ? new Date(log.ts).toLocaleString() : 'Unknown time'}
                        </span>
                      </div>
                      <div className="log-details">
                        <div className="log-user">
                          <strong>By:</strong> {log.byUid || 'System'}
                        </div>
                        {log.targetUid && (
                          <div className="log-target">
                            <strong>Target:</strong> {log.targetUid}
                          </div>
                        )}
                        {log.details && Object.keys(log.details).length > 0 && (
                          <div className="log-extra">
                            <strong>Details:</strong> {JSON.stringify(log.details)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        show={confirmModal.show}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, show: false }))}
        type={confirmModal.type}
      />

      {/* Remove User Modal */}
      {removeUserModal.show && (
        <ConfirmationModal
          show={true}
          title="Remove User"
          message={`Are you sure you want to remove ${removeUserModal.user?.name || removeUserModal.user?.uid}? This action will archive the user data and log them out.`}
          onConfirm={confirmRemoveUser}
          onCancel={() => setRemoveUserModal({ show: false, user: null })}
          confirmText="Remove"
          type="danger"
        />
      )}

      {/* Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}