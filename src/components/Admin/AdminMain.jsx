// src/components/Admin/AdminMain.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import firebaseDB from "../../firebase";

let useAuthSafe = () => ({ currentUser: null, user: null });
try {
  const mod = require("../../context/AuthContext");
  if (mod && typeof mod.useAuth === "function") useAuthSafe = mod.useAuth;
} catch { }

// Enhanced MODULES array with new menu items
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
  { key: "Timesheet", icon: "⏰", extras: ["export", "approve"] },
  { key: "Agents", icon: "🤝", extras: ["export"] },
  { key: "Profile", icon: "👤", extras: [] },
  { key: "Search", icon: "🔍", extras: [] },
  { key: "Admin", icon: "⚙️", extras: ["impersonate", "audit", "bulk_operations"] },
];

const BASE_ACTIONS = ["view", "create", "edit", "delete"];
const EXTRA_ACTIONS = ["export", "approve", "reject", "clarify", "managePayments", "impersonate", "audit", "bulk_operations"];
const ALL_ACTIONS = [...BASE_ACTIONS, ...EXTRA_ACTIONS];

const ROLES = ["Super Admin", "Admin", "Manager", "Employee", "Guest", "Viewer", "Approver"];

const makeBlankPerms = () =>
  MODULES.reduce((acc, m) => {
    const row = {};
    ALL_ACTIONS.forEach((a) => (row[a] = false));
    acc[m.key] = row;
    return acc;
  }, {});

const ROLE_TEMPLATES = {
  "Super Admin": withAll(true),
  "Admin": withAll(true),
  "Manager": withBase(true, {
    delete: false,
    export: true,
    approve: true,
    reject: true,
    clarify: true,
    bulk_operations: false,
    impersonate: false
  }),
  "Employee": withBase({ view: true }, {
    create: false,
    edit: false,
    delete: false,
    export: false,
    approve: false
  }),
  "Guest": withOnly({ view: true }),
  "Viewer": withOnly({ view: true, export: false }),
  "Approver": withBase({ view: true }, {
    create: false,
    edit: false,
    delete: false,
    approve: true,
    reject: true,
    clarify: true
  }),
};

function withAll(on) {
  const p = makeBlankPerms();
  MODULES.forEach((m) => ALL_ACTIONS.forEach((a) => (p[m.key][a] = !!on)));
  return p;
}

function withBase(baseOn, overrides = {}) {
  const p = makeBlankPerms();
  MODULES.forEach((m) => {
    BASE_ACTIONS.forEach((a) => (p[m.key][a] = typeof baseOn === 'object' ? !!baseOn[a] : !!baseOn));
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

// FIXED: Generate username from StaffBioData format: lastName-indexFromIdNo
const generateUsernameFromStaffData = (staffData) => {
  if (!staffData) return '';

  const lastName = (staffData.lastName || '').trim();
  const idNo = (staffData.idNo || staffData.staffId || staffData.employeeId || '').trim();

  if (!lastName) {
    // If no lastName, fallback to firstName
    const firstName = (staffData.firstName || '').trim();
    if (!firstName && !idNo) return 'user';
  }

  // Extract numeric part from idNo (e.g., "JC01" -> "01", "ST123" -> "123")
  let indexPart = '';
  if (idNo) {
    // Extract numbers from the end of the string
    const matches = idNo.match(/\d+$/);
    if (matches) {
      indexPart = matches[0];
    } else {
      // If no numbers found, use the whole idNo
      indexPart = idNo;
    }
  } else {
    // If no idNo, use a default
    indexPart = '001';
  }

  // Format: lastName-indexPart (lowercase, remove spaces)
  const username = `${lastName || staffData.firstName || 'user'}-${indexPart}`
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '');

  return username;
};

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

// User Profile Display Component (Shows photo below username)
function UserProfileDisplay({ staffData }) {
  if (!staffData) return null;

  const username = generateUsernameFromStaffData(staffData);
  const fullName = `${staffData.firstName || ''} ${staffData.lastName || ''}`.trim();

  // FIXED: Get photo from various possible fields
  const photoUrl = staffData.photoURL || staffData.employeePhoto || staffData.photo || staffData.image || staffData.profilePicture;

  return (
    <div className="user-profile-display text-center mb-3">
      {/* Username Display (Read-only) */}
      <div className="username-display mb-2">
        <label className="form-label mb-1">Username (Auto-generated)</label>
        <input
          type="text"
          value={username}
          readOnly
          className="form-control text-center fw-bold"
          style={{ backgroundColor: '#f8f9fa' }}
        />
        <small className="text-muted">
          Format: lastName-indexFromIdNo (e.g., Prakash-01)
        </small>
      </div>

      {/* Photo Display Below Username */}
      <div className="user-photo-container mt-3">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={fullName}
            className="user-profile-photo"
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid #dee2e6',
              margin: '0 auto'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
              // Show fallback if image fails to load
              const fallback = document.createElement('div');
              fallback.className = 'user-photo-fallback';
              fallback.style.cssText = `
                width: 120px;
                height: 120px;
                border-radius: 50%;
                background: #e5e7eb;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 32px;
                font-weight: bold;
                color: #6c757d;
                margin: 0 auto;
              `;
              fallback.textContent = (staffData.firstName?.[0] || '') + (staffData.lastName?.[0] || '');
              e.target.parentNode.appendChild(fallback);
            }}
          />
        ) : (
          <div
            className="user-photo-fallback"
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: '#e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#6c757d',
              margin: '0 auto'
            }}
          >
            {(staffData.firstName?.[0] || '') + (staffData.lastName?.[0] || '')}
          </div>
        )}
      </div>

      {/* Full Name Display */}
      <div className="user-fullname mt-2">
        <h5 className="mb-0">{fullName || 'No name available'}</h5>
        {staffData.idNo && (
          <small className="text-muted">ID: {staffData.idNo}</small>
        )}
      </div>
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
  // FIXED: Get photo from various fields
  const userPhoto = user.photoURL || user.employeePhoto || user.photo || user.image || user.profilePicture;
  const userName = user.name || user.displayName || user.username || 'Unnamed User';
  const userInitial = userName.charAt(0).toUpperCase();

  const handleRemoveClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onRemove) {
      onRemove(user);
    }
  };

  return (
    <div className={`user-card ${!user.active ? 'inactive' : ''}`}>
      <div className="user-card-header">
        <div className="user-avatar-container">
          {userPhoto ? (
            <img
              src={userPhoto}
              alt="User"
              className="user-photo"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div
            className="user-avatar"
            style={{ display: userPhoto ? 'none' : 'flex' }}
          >
            {userInitial}
          </div>
          <div className="user-info">
            <h6 className="user-name">{userName}</h6>
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
        {/* ADDED: Display staff ID */}
        {user.staffId && (
          <div className="user-staff-id">
            <span className="staff-id-badge">ID: {user.staffId}</span>
          </div>
        )}
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
        <button
          className="btn btn-sm btn-outline-danger"
          onClick={handleRemoveClick}
        >
          🗑️ Remove
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

// Enhanced Confirmation Modal Component
function EnhancedConfirmationModal({
  show,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Yes",
  cancelText = "No",
  type = "warning",
  inputFields = [],
  destructive = false
}) {
  const [inputValues, setInputValues] = useState({});

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

  const handleInputChange = (fieldName, value) => {
    setInputValues(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleConfirm = () => {
    const validatedInputs = { ...inputValues };
    inputFields.forEach(field => {
      if (field.required && !validatedInputs[field.name]) {
        validatedInputs[field.name] = "Not provided";
      }
    });

    onConfirm(validatedInputs);
    setInputValues({});
  };

  const handleClose = () => {
    setInputValues({});
    onCancel();
  };

  return (
    <div className="modal-overlay">
      <div className={`modal-content confirmation-modal ${destructive ? 'destructive' : ''}`}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="confirmation-content">
            <div className="confirmation-icon">
              {icons[type]}
            </div>
            <div className="confirmation-message">
              {message}
            </div>

            {inputFields.length > 0 && (
              <div className="confirmation-inputs">
                {inputFields.map(field => (
                  <div key={field.name} className="form-group">
                    <label htmlFor={field.name}>{field.label}</label>
                    {field.type === 'textarea' ? (
                      <textarea
                        id={field.name}
                        className="form-control"
                        value={inputValues[field.name] || ''}
                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        required={field.required}
                      />
                    ) : (
                      <input
                        id={field.name}
                        type={field.type || 'text'}
                        className="form-control"
                        value={inputValues[field.name] || ''}
                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        required={field.required}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <div className="footer-actions">
            <button
              className={`btn ${buttonStyles[type]} ${destructive ? 'btn-danger' : ''}`}
              onClick={handleConfirm}
            >
              {confirmText}
            </button>
            <button className="btn btn-secondary" onClick={handleClose}>
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Password Reset Modal Component
function PasswordResetModal({ show, user, onConfirm, onCancel }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    setError("");

    if (!password) {
      setError("Please enter a password");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    onConfirm(password);
  };

  const handleClose = () => {
    setPassword("");
    setConfirmPassword("");
    setError("");
    onCancel();
  };

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content password-reset-modal">
        <div className="modal-header">
          <h3>Reset Password</h3>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="password-reset-content">
            <div className="user-info-section">
              <div className="user-avatar-modal">
                {/* FIXED: Get photo from various fields */}
                {user.photoURL || user.employeePhoto || user.photo || user.image ? (
                  <img src={user.photoURL || user.employeePhoto || user.photo || user.image} alt="User" className="user-photo-modal" />
                ) : (
                  <div className="user-avatar-fallback">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </div>
              <div className="user-details">
                <h4>{user.name || 'Unnamed User'}</h4>
                <span className="user-role">{user.role || 'user'}</span>
              </div>
            </div>

            <div className="password-form">
              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  id="newPassword"
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="form-control"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <div className="alert alert-danger">
                  {error}
                </div>
              )}

              <div className="password-requirements">
                <h6>Password Requirements:</h6>
                <ul>
                  <li className={password.length >= 6 ? 'met' : ''}>
                    At least 6 characters long
                  </li>
                  <li className={password && confirmPassword && password === confirmPassword ? 'met' : ''}>
                    Passwords must match
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <div className="footer-actions">
            <button className="btn btn-primary" onClick={handleSubmit}>
              Reset Password
            </button>
            <button className="btn btn-secondary" onClick={handleClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Advanced Permissions Modal Component
function AdvancedPermissionsModal({ user, permissions, onSave, onClose, onTogglePerm }) {
  const [tempPerms, setTempPerms] = useState(permissions);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModules, setSelectedModules] = useState(new Set());

  // Group modules by category
  const moduleCategories = {
    management: ['Dashboard', 'Investments', 'Reports', 'Accounts'],
    staff: ['Staff Data', 'Existing Staff'],
    workers: ['Workers Data', 'Worker Agreement', 'Worker Call Data'],
    clients: ['Client Data', 'Client Exit'],
    enquiries: ['Enquiries', 'Old Enquiry'],
    hospital: ['Hospital List', 'Delete Hospitals', 'Agents'],
    expenses: ['Expenses', 'Expense Delete'],
    productivity: ['Task', 'Timesheet'],
    system: ['Admin', 'Profile', 'Search', 'Assets']
  };

  // Filter modules based on search and category
  const filteredModules = useMemo(() => {
    let modules = MODULES;

    if (searchTerm) {
      modules = modules.filter(m =>
        m.key.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (activeTab !== 'all') {
      modules = modules.filter(m =>
        moduleCategories[activeTab]?.includes(m.key)
      );
    }

    return modules;
  }, [searchTerm, activeTab]);

  // Bulk operations
  const bulkUpdatePermissions = (action, value) => {
    const updatedPerms = { ...tempPerms };
    const modulesToUpdate = selectedModules.size > 0
      ? Array.from(selectedModules)
      : filteredModules.map(m => m.key);

    modulesToUpdate.forEach(moduleKey => {
      if (action === 'all') {
        ALL_ACTIONS.forEach(act => {
          if (updatedPerms[moduleKey]) {
            updatedPerms[moduleKey][act] = value;
          }
        });
      } else {
        if (updatedPerms[moduleKey]) {
          updatedPerms[moduleKey][action] = value;
        }
      }
    });

    setTempPerms(updatedPerms);
  };

  const toggleModuleSelection = (moduleKey) => {
    const newSelected = new Set(selectedModules);
    if (newSelected.has(moduleKey)) {
      newSelected.delete(moduleKey);
    } else {
      newSelected.add(moduleKey);
    }
    setSelectedModules(newSelected);
  };

  const selectAllVisible = () => {
    const allVisible = new Set(filteredModules.map(m => m.key));
    setSelectedModules(allVisible);
  };

  const clearSelection = () => {
    setSelectedModules(new Set());
  };

  const togglePerm = (modKey, action) => {
    setTempPerms(prev => ({
      ...prev,
      [modKey]: { ...(prev[modKey] || {}), [action]: !prev[modKey]?.[action] },
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content advanced-permissions-modal">
        {/* Header with User Info */}
        <div className="modal-header">
          <div className="user-header-info">
            <div className="user-avatar-modal">
              {/* FIXED: Get photo from various fields */}
              {user.photoURL || user.employeePhoto || user.photo || user.image ? (
                <img src={user.photoURL || user.employeePhoto || user.photo || user.image} alt="User" className="user-photo-modal" />
              ) : (
                <div className="user-avatar-fallback">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </div>
            <div className="user-details">
              <h3 className="user-name">{user.name || 'Unnamed User'}</h3>
              <div className="user-meta">
                <span className={`role-badge role-${user.role || 'user'}`}>
                  {user.role || 'user'}
                </span>
                {user.staffId && (
                  <span className="staff-id">ID: {user.staffId}</span>
                )}
                <span className="user-status-indicator">
                  {user.active ? '🟢 Active' : '🔴 Inactive'}
                </span>
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Quick Setup Section */}
          <div className="quick-setup-section">
            <div className="section-header">
              <h4>Quick Setup</h4>
              <span className="section-badge">Recommended</span>
            </div>

            <div className="role-presets-grid">
              {Object.entries(ROLE_TEMPLATES).map(([roleName, template]) => (
                <div key={roleName} className="role-preset-card">
                  <div className="preset-header">
                    <span className="preset-icon">
                      {roleName === 'Super Admin' && '👑'}
                      {roleName === 'Admin' && '⚡'}
                      {roleName === 'Manager' && '👔'}
                      {roleName === 'Employee' && '👤'}
                      {roleName === 'Viewer' && '👀'}
                      {roleName === 'Approver' && '✅'}
                      {roleName === 'Guest' && '🎯'}
                    </span>
                    <h5>{roleName}</h5>
                  </div>
                  <div className="preset-stats">
                    <span className="stat">
                      {Object.values(template).filter(module =>
                        Object.values(module).some(Boolean)
                      ).length} modules
                    </span>
                    <span className="stat">
                      {Object.values(template).flatMap(module =>
                        Object.values(module).filter(Boolean)
                      ).length} permissions
                    </span>
                  </div>
                  <button
                    className="btn btn-sm btn-outline-primary preset-apply-btn"
                    onClick={() => setTempPerms(JSON.parse(JSON.stringify(template)))}
                  >
                    Apply
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Advanced Controls */}
          <div className="advanced-controls-section">
            <div className="section-header">
              <h4>Advanced Controls</h4>
              <div className="control-tabs">
                <button
                  className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveTab('all')}
                >
                  🌟 All Modules
                </button>
                {Object.entries(moduleCategories).map(([category, modules]) => (
                  <button
                    key={category}
                    className={`tab-btn ${activeTab === category ? 'active' : ''}`}
                    onClick={() => setActiveTab(category)}
                  >
                    {category === 'management' && '📊'}
                    {category === 'staff' && '👨‍💼'}
                    {category === 'workers' && '👷'}
                    {category === 'clients' && '🤝'}
                    {category === 'enquiries' && '📝'}
                    {category === 'hospital' && '🏥'}
                    {category === 'expenses' && '💰'}
                    {category === 'productivity' && '⚡'}
                    {category === 'system' && '⚙️'}
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                    <span className="tab-count">{modules.length}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Search and Bulk Controls */}
            <div className="controls-toolbar">
              <div className="search-container">
                <div className="search-box">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Search modules..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  {searchTerm && (
                    <button
                      className="clear-search"
                      onClick={() => setSearchTerm('')}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="bulk-controls">
                <div className="selection-info">
                  <span className="selection-count">
                    {selectedModules.size} selected
                  </span>
                  <div className="selection-actions">
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={selectAllVisible}
                      disabled={filteredModules.length === 0}
                    >
                      Select All
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={clearSelection}
                      disabled={selectedModules.size === 0}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {selectedModules.size > 0 && (
                  <div className="bulk-actions-panel">
                    <div className="bulk-actions-header">
                      <strong>Bulk Actions for {selectedModules.size} modules:</strong>
                    </div>
                    <div className="bulk-action-groups">
                      <div className="action-group">
                        <label>Core Actions:</label>
                        <div className="action-buttons">
                          {BASE_ACTIONS.map(action => (
                            <div key={action} className="action-pair">
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() => bulkUpdatePermissions(action, true)}
                              >
                                Allow {action}
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => bulkUpdatePermissions(action, false)}
                              >
                                Deny {action}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="action-group">
                        <label>Extra Actions:</label>
                        <div className="action-buttons">
                          {EXTRA_ACTIONS.map(action => (
                            <div key={action} className="action-pair">
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() => bulkUpdatePermissions(action, true)}
                              >
                                Allow {action}
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => bulkUpdatePermissions(action, false)}
                              >
                                Deny {action}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="action-group full-width">
                        <div className="action-pair">
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => bulkUpdatePermissions('all', true)}
                          >
                            ✅ Allow All Actions
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => bulkUpdatePermissions('all', false)}
                          >
                            ❌ Deny All Actions
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Permissions Grid */}
            <div className="permissions-container">
              <div className="permissions-header">
                <div className="module-column">Module</div>
                <div className="permissions-column">
                  <span>Permissions</span>
                  <div className="permissions-legend">
                    <span className="legend-item">
                      <span className="legend-core"></span> Core Actions
                    </span>
                    <span className="legend-item">
                      <span className="legend-extra"></span> Extra Actions
                    </span>
                  </div>
                </div>
                <div className="quick-actions-column">Quick Actions</div>
              </div>

              <div className="permissions-grid">
                {filteredModules.map((module) => (
                  <div key={module.key} className={`permission-module-card ${selectedModules.has(module.key) ? 'selected' : ''}`}>
                    <div className="module-header">
                      <input
                        type="checkbox"
                        checked={selectedModules.has(module.key)}
                        onChange={() => toggleModuleSelection(module.key)}
                        className="module-select"
                      />
                      <div className="module-info">
                        <span className="module-icon">{module.icon}</span>
                        <div className="module-details">
                          <h5 className="module-name">{module.key}</h5>
                          <div className="module-meta">
                            <span className="module-stats">
                              {Object.values(tempPerms[module.key] || {}).filter(Boolean).length} / {ALL_ACTIONS.length} allowed
                            </span>
                            {module.extras.length > 0 && (
                              <span className="module-extras">
                                +{module.extras.length} extra actions
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="permissions-actions">
                      <div className="actions-grid">
                        {ALL_ACTIONS.map((action) => {
                          const isExtra = EXTRA_ACTIONS.includes(action);
                          const isAvailable = !isExtra || module.extras.includes(action);
                          const isAllowed = !!tempPerms[module.key]?.[action];

                          return (
                            <label
                              key={action}
                              className={`permission-toggle ${isExtra ? 'extra' : 'core'} ${!isAvailable ? 'disabled' : ''} ${isAllowed ? 'allowed' : 'denied'}`}
                              title={!isAvailable ? `Action not available for ${module.key}` : `${action} - ${isAllowed ? 'Allowed' : 'Denied'}`}
                            >
                              <input
                                type="checkbox"
                                checked={isAllowed}
                                disabled={!isAvailable}
                                onChange={() => isAvailable && togglePerm(module.key, action)}
                              />
                              <span className="toggle-slider">
                                <span className="toggle-label">{action}</span>
                                {isExtra && <span className="badge-extra">★</span>}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="module-quick-actions">
                      <div className="quick-action-buttons">
                        <button
                          className="btn btn-xs btn-success"
                          onClick={() => {
                            BASE_ACTIONS.forEach(action => {
                              if (tempPerms[module.key]?.[action] !== true) {
                                togglePerm(module.key, action);
                              }
                            });
                          }}
                          title="Allow all core actions"
                        >
                          Core
                        </button>
                        <button
                          className="btn btn-xs btn-warning"
                          onClick={() => {
                            module.extras.forEach(action => {
                              if (tempPerms[module.key]?.[action] !== true) {
                                togglePerm(module.key, action);
                              }
                            });
                          }}
                          disabled={module.extras.length === 0}
                          title="Allow all extra actions"
                        >
                          Extras
                        </button>
                        <button
                          className="btn btn-xs btn-danger"
                          onClick={() => {
                            ALL_ACTIONS.forEach(action => {
                              if (tempPerms[module.key]?.[action] !== false) {
                                togglePerm(module.key, action);
                              }
                            });
                          }}
                          title="Deny all actions"
                        >
                          None
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredModules.length === 0 && (
                <div className="no-results">
                  <div className="no-results-icon">🔍</div>
                  <h4>No modules found</h4>
                  <p>Try adjusting your search or select a different category</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer with Summary and Actions */}
        <div className="modal-footer">
          <div className="permissions-summary">
            <div className="summary-stats">
              <div className="stat-item">
                <span className="stat-value">{filteredModules.length}</span>
                <span className="stat-label">Modules</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{selectedModules.size}</span>
                <span className="stat-label">Selected</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {Object.values(tempPerms).flatMap(module =>
                    Object.values(module).filter(Boolean)
                  ).length}
                </span>
                <span className="stat-label">Total Permissions</span>
              </div>
            </div>
          </div>

          <div className="footer-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setTempPerms(makeBlankPerms())}
            >
              🗑️ Reset All
            </button>

            <button className="btn btn-outline-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-success save-btn"
              onClick={() => onSave(tempPerms)}
            >
              💾 Save Permissions
              <span className="save-badge">
                {Object.values(tempPerms).flatMap(module =>
                  Object.values(module).filter(Boolean)
                ).length}
              </span>
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
  const [passwordResetModal, setPasswordResetModal] = useState({ show: false, user: null });

  // Confirmation Modals
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: "",
    message: "",
    onConfirm: null,
    type: "warning",
    inputFields: [],
    destructive: false
  });

  // FIXED: Staff data state with proper debouncing
  const [staffData, setStaffData] = useState(null);
  const [staffDataLoading, setStaffDataLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);

  // Form states
  const [newUser, setNewUser] = useState({
    staffId: '',
    username: '',
    name: '',
    password: '',
    role: 'Employee',
    // Added staff data key
    staffDataKey: ''
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Advanced Features
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

  // Security states
  const [security] = useState({
    sessionTimeout: 30 * 60 * 1000,
    lastActivity: Date.now(),
    failedAttempts: 0,
    maxAttempts: 5
  });

  const [activityLog, setActivityLog] = useState([]);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const showConfirmation = (title, message, onConfirm, type = "warning", inputFields = [], destructive = false) => {
    setConfirmModal({
      show: true,
      title,
      message,
      onConfirm: (inputValues) => {
        setConfirmModal(prev => ({ ...prev, show: false }));
        onConfirm(inputValues);
      },
      type,
      inputFields,
      destructive
    });
  };

  // Session timeout handler
  useEffect(() => {
    const checkSession = setInterval(() => {
      if (Date.now() - security.lastActivity > security.sessionTimeout) {
        showToast("warn", "Session timeout due to inactivity");
        logout();
      }
    }, 60000);

    return () => clearInterval(checkSession);
  }, [security.lastActivity, security.sessionTimeout, logout]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // Track user activity
  const trackActivity = useCallback((action, details = {}) => {
    setActivityLog(prev => [...prev, {
      action,
      timestamp: Date.now(),
      user: adminUid,
      details,
      ip: window.location.hostname
    }]);

    security.lastActivity = Date.now();
  }, [adminUid, security]);

  // Enhanced permission check with multiple fallbacks
  const checkPermission = useCallback((action, resource, userToCheck = null) => {
    let targetUser = userToCheck;

    if (!targetUser) {
      targetUser = users.find(u => u.uid === adminUid);

      if (!targetUser && userFromCtx) {
        targetUser = userFromCtx;
      }

      if (!targetUser && currentUser) {
        targetUser = currentUser;
      }
    }

    if (!targetUser) {
      return true;
    }

    // Special case for admin operations
    if (resource === 'Admin') {
      const hasPerm = targetUser.permissions?.[resource]?.[action];

      if (!hasPerm && (targetUser.role === 'Admin' || targetUser.role === 'Super Admin' || targetUser.role === 'admin')) {
        return true;
      }

      if (!hasPerm && window.location.pathname.includes('admin')) {
        return true;
      }

      return hasPerm;
    }

    const hasPerm = targetUser.permissions?.[resource]?.[action];
    return hasPerm;
  }, [users, adminUid, userFromCtx, currentUser]);

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
      const adminUsers = arr.filter(u => u.role === 'admin' || u.role === 'Super Admin').length;
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

  // In the filteredUsers useMemo, update the search filter:
  const filteredUsers = useMemo(() => {
    let arr = users.slice();
    if (roleFilter !== "all") arr = arr.filter((u) => (u.role || "user") === roleFilter);
    if (activeOnly) arr = arr.filter((u) => u.active !== false);
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      arr = arr.filter((u) =>
        (u.name || "").toLowerCase().includes(query) ||
        (u.username || "").toLowerCase().includes(query) ||
        (u.staffId || "").toLowerCase().includes(query) || // Added staffId search
        (u.employeeId || "").toLowerCase().includes(query) || // Added employeeId search
        (u.uid || "").toLowerCase().includes(query) ||
        (u.role || "").toLowerCase().includes(query)
      );
    }
    return arr;
  }, [users, roleFilter, activeOnly, searchQuery]);

  // Update the searchStaffData function to remove loading state from the caller
  const searchStaffData = useCallback(async (staffId) => {
    if (!staffId.trim()) {
      setStaffData(null);
      setStaffDataLoading(false);
      return null;
    }

    try {
      // Search in StaffBioData
      const staffRef = firebaseDB.child("StaffBioData");

      // 1. First try searching by idNo (primary field from StaffBioDataForm)
      const snapshot = await staffRef.orderByChild("idNo").equalTo(staffId).once("value");
      const data = snapshot.val();

      if (data) {
        const recordId = Object.keys(data)[0];
        const staffRecord = data[recordId];

        setStaffData(staffRecord);

        // Generate username from staff data using new format
        const generatedUsername = generateUsernameFromStaffData(staffRecord);
        const fullName = `${staffRecord.firstName || ''} ${staffRecord.lastName || ''}`.trim();

        // Update the new user form
        setNewUser(prev => ({
          ...prev,
          name: fullName,
          username: generatedUsername,
          staffDataKey: recordId
        }));

        showToast("success", `Found staff record for ${staffRecord.firstName || staffId}`);
        return staffRecord;
      } else {
        // 2. If not found by idNo, try searching by other fields
        const allSnapshot = await staffRef.once("value");
        const allData = allSnapshot.val();

        if (allData) {
          let foundRecord = null;
          let foundKey = null;

          Object.keys(allData).forEach(key => {
            const record = allData[key];
            if (
              record.staffId === staffId ||
              record.employeeId === staffId ||
              record.id === staffId ||
              record.ID === staffId
            ) {
              foundRecord = record;
              foundKey = key;
            }
          });

          if (foundRecord) {
            setStaffData(foundRecord);
            const generatedUsername = generateUsernameFromStaffData(foundRecord);
            const fullName = `${foundRecord.firstName || ''} ${foundRecord.lastName || ''}`.trim();

            setNewUser(prev => ({
              ...prev,
              name: fullName,
              username: generatedUsername,
              staffDataKey: foundKey
            }));

            showToast("success", `Found staff record for ${foundRecord.firstName || staffId}`);
            return foundRecord;
          }
        }

        // 3. If still not found, search in all text fields (case-insensitive)
        if (allData) {
          const searchLower = staffId.toLowerCase();
          let foundRecord = null;
          let foundKey = null;

          Object.keys(allData).forEach(key => {
            const record = allData[key];

            // Check various fields
            const fieldsToCheck = [
              record.idNo,
              record.staffId,
              record.employeeId,
              record.id,
              record.ID,
              record.firstName,
              record.lastName
            ];

            const found = fieldsToCheck.some(field =>
              field && field.toString().toLowerCase().includes(searchLower)
            );

            if (found) {
              foundRecord = record;
              foundKey = key;
            }
          });

          if (foundRecord) {
            setStaffData(foundRecord);
            const generatedUsername = generateUsernameFromStaffData(foundRecord);
            const fullName = `${foundRecord.firstName || ''} ${foundRecord.lastName || ''}`.trim();

            setNewUser(prev => ({
              ...prev,
              name: fullName,
              username: generatedUsername,
              staffDataKey: foundKey
            }));

            showToast("success", `Found staff record for ${foundRecord.firstName || staffId}`);
            return foundRecord;
          }
        }

        // 4. No record found
        setStaffData(null);
        setNewUser(prev => ({
          ...prev,
          username: '',
          name: '',
          staffDataKey: ''
        }));

        showToast("info", "No staff record found. Please check staff ID.");
        return null;
      }
    } catch (error) {
      console.error("Error searching staff data:", error);
      setStaffData(null);
      setNewUser(prev => ({
        ...prev,
        username: '',
        name: '',
        staffDataKey: ''
      }));

      showToast("error", "Error searching staff data. Please check staff ID.");
      return null;
    } finally {
      setStaffDataLoading(false);
    }
  }, [showToast]);

  // Remove the debouncing logic completely and replace with onBlur handler
  const handleStaffIdBlur = useCallback(async () => {
    const staffId = newUser.staffId.trim();

    if (!staffId) {
      setStaffData(null);
      setNewUser(prev => ({
        ...prev,
        username: '',
        name: '',
        staffDataKey: ''
      }));
      return;
    }

    // Only search if we have a valid staff ID
    if (staffId.length >= 2) {
      setStaffDataLoading(true);
      await searchStaffData(staffId);
    }
  }, [newUser.staffId, searchStaffData]);

  // Remove the handleStaffIdChange function completely and replace with simple setter
  const handleStaffIdChange = useCallback((staffId) => {
    setNewUser(prev => ({ ...prev, staffId }));
    // Clear data if staff ID is cleared
    if (!staffId.trim()) {
      setStaffData(null);
      setNewUser(prev => ({
        ...prev,
        username: '',
        name: '',
        staffDataKey: ''
      }));
    }
  }, []);



  // Remove the debounce timeout cleanup from useEffect since we don't need it anymore
  useEffect(() => {
    return () => {
      // No timeout cleanup needed since we're using onBlur
    };
  }, []);

  // Enhanced safe DB operations
  async function safeSet(path, payload, auditEntry) {
    try {
      await firebaseDB.child(path).set(payload);

      if (auditEntry) {
        try {
          await firebaseDB.child("AuditLogs").push(auditEntry);
        } catch (auditError) {
          console.warn('safeSet: Audit log failed, but operation succeeded:', auditError);
        }
      }
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
        try {
          await firebaseDB.child(`AdminRequests/${adminUid || "unknown"}`).push(req);
          return { ok: false, queued: true };
        } catch (queueError) {
          console.error('safeSet: Queue failed:', queueError);
          return { ok: false, queued: false, error: queueError };
        }
      }
      throw e;
    }
  }

  async function safeRemove(path, auditEntry) {
    try {
      await firebaseDB.child(path).remove();

      if (auditEntry) {
        try {
          await firebaseDB.child("AuditLogs").push(auditEntry);
        } catch (auditError) {
          console.warn('safeRemove: Audit log failed, but operation succeeded:', auditError);
        }
      }
      return { ok: true };
    } catch (e) {
      const code = (e && (e.code || e.message || "")).toString().toLowerCase();
      if (code.includes("permission_denied")) {
        const req = {
          action: "REMOVE",
          path,
          requestedBy: adminUid || null,
          requestedAt: Date.now(),
          auditEntry,
          status: "pending",
        };
        try {
          await firebaseDB.child(`AdminRequests/${adminUid || "unknown"}`).push(req);
          return { ok: false, queued: true };
        } catch (queueError) {
          console.error('safeRemove: Queue failed:', queueError);
          return { ok: false, queued: false, error: queueError };
        }
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
      const sessionKeys = ["auth:user", "firebase:authUser", "userSession", "currentUser"];
      sessionKeys.forEach(key => {
        const sessionData = sessionStorage.getItem(key);
        if (sessionData) {
          try {
            const userData = JSON.parse(sessionData);
            if (userData.dbId === userId || userData.uid === userId || userData.id === userId) {
              sessionStorage.removeItem(key);
            }
          } catch (e) {
            sessionStorage.removeItem(key);
          }
        }
      });

      const localKeys = ["impersonateUid", "firebaseToken", "userToken"];
      localKeys.forEach(key => localStorage.removeItem(key));

      await firebaseDB.child(`Users/${userId}`).update({
        lastSync: null,
        lastLogout: Date.now(),
        forceLogout: Date.now()
      });

    } catch (error) {
      console.error("Error forcing logout:", error);
    }
  };

  // Save permissions with confirmation
  const savePerms = async (permissions) => {
    if (!editingUser) return;

    showConfirmation(
      "Update Permissions",
      `Are you sure you want to update permissions for ${editingUser.name || editingUser.uid}? This will log out the user.`,
      async () => {
        const cleanPerms = permissions || tempPerms;

        // Create a clean copy without modifying the original
        const finalPerms = {};
        Object.keys(cleanPerms).forEach(moduleKey => {
          finalPerms[moduleKey] = {};
          ALL_ACTIONS.forEach(action => {
            finalPerms[moduleKey][action] = Boolean(cleanPerms[moduleKey]?.[action]);
          });
        });

        const path = `Users/${editingUser.uid}/permissions`;
        const auditEntry = {
          action: "updatePermissions",
          byUid: adminUid || null,
          targetUid: editingUser.uid,
          details: { permissions: finalPerms },
          ts: Date.now(),
        };

        try {
          const res = await safeSet(path, finalPerms, auditEntry);
          if (res.ok) {
            showToast("success", `Permissions saved for ${editingUser.name || editingUser.uid}. User has been logged out.`);

            // Increment session version to force logout
            await firebaseDB.child(`Users/${editingUser.uid}/requiredSessionVersion`).transaction(v => (Number(v) || 0) + 1);

            await forceLogoutUser(editingUser.uid);

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
          console.error("Permission save error:", error);
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
            isActive: newActiveState,
            lastSync: null
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

          await firebaseDB.child(`Users/${user.uid}/requiredSessionVersion`).transaction(v => (Number(v) || 0) + 1);

          await forceLogoutUser(user.uid);

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

  // Working Remove Function
  const removeUser = async (user) => {
    // Permission check
    const hasPermission = checkPermission('delete', 'Admin');

    if (!hasPermission) {
      showToast("error", "Insufficient permissions to remove users");
      return;
    }

    // Self-removal check
    if (user.uid === adminUid) {
      showToast("error", "Cannot remove your own account");
      return;
    }

    // Show confirmation
    showConfirmation(
      "Remove User",
      `Are you sure you want to permanently remove ${user.name || user.uid}? This action cannot be undone.`,
      (inputValues) => {
        const reason = inputValues?.reason || "No reason provided";
        confirmRemoveUser(user, reason);
      },
      "danger",
      [
        {
          name: "reason",
          label: "Reason for removal",
          type: "textarea",
          placeholder: "Please provide a reason for removing this user...",
          required: true
        }
      ],
      true
    );
  };

  const confirmRemoveUser = async (user, reason) => {
    try {
      trackActivity('user_removal_attempt', {
        targetUser: user.uid,
        reason: reason
      });

      // Validate and clean user data for archiving
      const archiveData = {
        uid: user.uid || '',
        name: user.name || '',
        username: user.username || '',
        staffId: user.staffId || '',
        role: user.role || 'user',
        active: user.active !== undefined ? user.active : true,
        createdAt: user.createdAt || Date.now(),
        archivedAt: Date.now(),
        archivedBy: adminUid || 'system',
        removalReason: reason || "No reason provided",
        originalUid: user.uid || '',
        archivedFrom: 'AdminPanel'
      };

      // Remove any undefined values that might cause Firebase errors
      Object.keys(archiveData).forEach(key => {
        if (archiveData[key] === undefined) {
          archiveData[key] = null;
        }
      });

      // Archive the user first
      const archiveResult = await safeSet(`ArchivedUsers/${user.uid}`, archiveData, {
        action: "archiveUser",
        byUid: adminUid,
        targetUid: user.uid,
        details: { reason: reason || "No reason provided" },
        ts: Date.now(),
      });

      if (!archiveResult.ok) {
        if (archiveResult.queued) {
          showToast("warn", "Archive operation queued due to permissions. User removal paused.");
          return;
        } else {
          throw new Error(`Archive failed: ${archiveResult.error?.message || 'Unknown error'}`);
        }
      }

      // Remove from active users using safeRemove
      const removeResult = await safeRemove(`Users/${user.uid}`, {
        action: "removeUser",
        byUid: adminUid,
        targetUid: user.uid,
        details: {
          reason: reason || "No reason provided",
          archived: true
        },
        ts: Date.now(),
      });

      if (!removeResult.ok) {
        if (removeResult.queued) {
          showToast("warn", "Remove operation queued due to permissions. Check admin requests.");
          return;
        } else {
          throw new Error(`Remove failed: ${removeResult.error?.message || 'Unknown error'}`);
        }
      }

      // Force logout the user
      await forceLogoutUser(user.uid);

      // Log the removal in SecurityLogs
      try {
        await firebaseDB.child("SecurityLogs").push({
          action: "user_removed",
          byUid: adminUid,
          targetUid: user.uid,
          reason: reason || "No reason provided",
          timestamp: Date.now(),
          ip: window.location.hostname,
          archived: true
        });
      } catch (logError) {
        console.warn('Security log failed:', logError);
      }

      trackActivity('user_removed', {
        targetUser: user.uid,
        reason: reason || "No reason provided"
      });

      showToast("success", `User ${user.name || user.uid} has been removed and archived.`);

    } catch (error) {
      console.error("Remove user error:", error);

      trackActivity('user_removal_failed', {
        targetUser: user.uid,
        error: error.message
      });

      showToast("error", `Failed to remove user: ${error.message}`);
    }
  };

  // Reset password with beautiful modal
  const resetPassword = (user) => {
    setPasswordResetModal({ show: true, user });
  };

  const handlePasswordReset = async (newPassword) => {
    const { user } = passwordResetModal;

    showConfirmation(
      "Reset Password",
      `Are you sure you want to reset password for ${user.name || user.uid}? This will log out the user.`,
      async () => {
        const passwordHash = await sha256Base64(newPassword);
        const res = await safeUpdate(
          `Users/${user.uid}`,
          {
            passwordHash,
            lastSync: null
          },
          {
            action: "resetPasswordHash",
            byUid: adminUid || null,
            targetUid: user.uid,
            ts: Date.now()
          }
        );

        if (res.ok) {
          showToast("success", "Password reset successfully. User has been logged out.");

          await firebaseDB.child(`Users/${user.uid}/requiredSessionVersion`).transaction(v => (Number(v) || 0) + 1);

          await forceLogoutUser(user.uid);

          setPasswordResetModal({ show: false, user: null });

        } else if (res.queued) {
          showToast("warn", "Rules blocked; request queued.");
          setPasswordResetModal({ show: false, user: null });
        }
      }
    );
  };

  // Two-Factor Authentication simulation
  const require2FA = async (action, user) => {
    return new Promise((resolve) => {
      showConfirmation(
        "Security Verification Required",
        `Please confirm the ${action} for user ${user.name || user.uid}. This action requires additional security verification.`,
        (inputValues) => {
          if (inputValues?.verificationCode === 'CONFIRM') {
            resolve(true);
          } else {
            showToast("error", "Invalid security code. Please type 'CONFIRM' to proceed.");
            resolve(false);
          }
        },
        "warning",
        [
          {
            name: "verificationCode",
            label: "Security Code",
            type: "text",
            placeholder: "Enter 'CONFIRM' to proceed",
            required: true
          }
        ]
      );
    });
  };

  // Enhanced impersonation with security checks
  const impersonate = async (user) => {
    if (!checkPermission('impersonate', 'Admin')) {
      showToast("error", "Insufficient permissions to impersonate users");
      return;
    }

    const verified = await require2FA('impersonation', user);
    if (!verified) {
      showToast("info", "Impersonation cancelled");
      return;
    }

    localStorage.setItem("impersonateUid", user.uid);
    localStorage.setItem("impersonatorUid", adminUid);
    localStorage.setItem("impersonationTime", Date.now());

    trackActivity('impersonation_started', {
      targetUser: user.uid
    });

    showToast("success", `Impersonating ${user.name || user.uid}. Reload the page to continue.`);
  };

  // FIXED: Create user with auto-generated username using new format
  const handleCreate = async (e) => {
    e?.preventDefault?.();
    setError("");

    if (!newUser.staffId?.trim()) return setError("Please enter Staff ID");
    if (!newUser.name?.trim()) return setError("Please enter Full Name");
    if (!newUser.password) return setError("Please enter password");

    // Auto-generate username if not already generated
    if (!newUser.username?.trim()) {
      if (staffData) {
        const generatedUsername = generateUsernameFromStaffData(staffData);
        setNewUser(prev => ({ ...prev, username: generatedUsername }));
      } else {
        // Generate from manual input - extract numeric part from staff ID
        const staffId = newUser.staffId.trim();
        let indexPart = '';

        // Extract numbers from the end of staff ID
        const matches = staffId.match(/\d+$/);
        if (matches) {
          indexPart = matches[0];
        } else {
          // If no numbers found, use the whole staff ID
          indexPart = staffId;
        }

        // Use lastName if available in name, otherwise use first part of name
        const nameParts = newUser.name.trim().split(' ');
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];

        const generatedUsername = `${lastName}-${indexPart}`
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_-]/g, '');

        setNewUser(prev => ({ ...prev, username: generatedUsername }));
      }
    }

    // Check for duplicate username (case-sensitive)
    const existingUser = users.find(u =>
      u.username && u.username.toLowerCase() === newUser.username.toLowerCase()
    );
    if (existingUser) {
      return setError(`Username "${newUser.username}" already exists`);
    }

    // Check if staff ID already exists
    const existingStaffId = users.find(u =>
      u.staffId && u.staffId.toLowerCase() === newUser.staffId.toLowerCase()
    );
    if (existingStaffId) {
      return setError(`Staff ID "${newUser.staffId}" is already in use`);
    }

    setCreating(true);
    try {
      const usersRef = firebaseDB.child("Users");
      const uid = usersRef.push().key;
      const passwordHash = await sha256Base64(newUser.password);
      const template = ROLE_TEMPLATES[newUser.role] || ROLE_TEMPLATES.Employee;

      // FIXED: Store photo from staff data if available
      const staffPhoto = staffData ?
        (staffData.photoURL || staffData.employeePhoto || staffData.photo || staffData.image || staffData.profilePicture) :
        null;

      const record = {
        uid,
        staffId: newUser.staffId.trim(),
        username: newUser.username.trim(),
        name: newUser.name.trim(),
        role: newUser.role,
        active: true,
        createdAt: Date.now(),
        email: null,
        passwordHash,
        permissions: template,
        lastSync: null,
        searchUsername: newUser.username.trim().toLowerCase(),
        staffRecordLinked: !!staffData,
        staffDataKey: newUser.staffDataKey || null,
        employeeId: newUser.staffId.trim(),
        searchStaffId: newUser.staffId.trim().toLowerCase(),
        userType: "staff",
        // Store staff data for profile display
        staffData: staffData ? {
          firstName: staffData.firstName,
          lastName: staffData.lastName,
          idNo: staffData.idNo,
          photoURL: staffPhoto
        } : null,
        // FIXED: Also store photo at root level for easy access
        photoURL: staffPhoto,
        employeePhoto: staffPhoto
      };

      const res = await safeSet(`Users/${uid}`, record, {
        action: "createUser",
        byUid: adminUid || null,
        targetUid: uid,
        details: {
          staffId: record.staffId,
          username: record.username,
          name: record.name,
          role: record.role,
          autoGenerated: true
        },
        ts: Date.now(),
      });

      if (res.ok) {
        showToast("success", `Created user "${record.name}" with Username: ${record.username}`);
        setShowCreate(false);
        setNewUser({
          staffId: '',
          username: '',
          name: '',
          password: '',
          role: 'Employee',
          staffDataKey: ''
        });
        setStaffData(null);
        openEditor(record);
      } else if (res.queued) {
        showToast("warn", "Rules blocked creating user. Request queued.");
        setShowCreate(false);
      }
    } catch (err) {
      console.error("Create user error:", err);
      setError(err?.message || String(err));
    } finally {
      setCreating(false);
    }
  };

  // Export CSV
  const exportCsv = () => {
    const csv = ["uid,staffId,username,name,role,active,createdAt,permissions_json"];
    users.forEach((u) =>
      csv.push(
        [
          u.uid,
          `"${(u.staffId || "").replace(/"/g, '""')}"`,
          `"${(u.username || "").replace(/"/g, '""')}"`,
          `"${(u.name || "").replace(/"/g, '""')}"`,
          u.role || "Employee",
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
        showConfirmation(
          "Bulk Delete Users",
          `Are you sure you want to delete ${selected.length} users? This action cannot be undone.`,
          () => bulkDelete(selected),
          "danger",
          [],
          true
        );
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
        lastSync: null
      }, {
        action: "bulkToggleActive",
        byUid: adminUid,
        targetUid: uid,
        details: { active },
        ts: Date.now(),
      });
      if (res.ok) {
        success++;
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

  // Clear form when modal closes
  const handleCloseCreateModal = () => {
    setShowCreate(false);
    setNewUser({
      staffId: '',
      username: '',
      name: '',
      password: '',
      role: 'Employee',
      staffDataKey: ''
    });
    setStaffData(null);
    setError('');
    setStaffDataLoading(false);
    // No timeout cleanup needed anymore
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
              {ROLES.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
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
                <option value="Super Admin">Apply Super Admin Template</option>
                <option value="Admin">Apply Admin Template</option>
                <option value="Manager">Apply Manager Template</option>
                <option value="Employee">Apply Employee Template</option>
                <option value="Guest">Apply Guest Template</option>
                <option value="Viewer">Apply Viewer Template</option>
                <option value="Approver">Apply Approver Template</option>
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
                <div className="list-cell staffId-cell">Staff ID</div>
                <div className="list-cell username-cell">Username</div>
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
                        {/* FIXED: Get photo from various fields */}
                        {user.photoURL || user.employeePhoto || user.photo || user.image ? (
                          <img src={user.photoURL || user.employeePhoto || user.photo || user.image} alt="User" className="user-photo-sm" />
                        ) : (
                          user.name ? user.name.charAt(0).toUpperCase() : 'U'
                        )}
                      </div>
                      <div className="user-info-sm">
                        <div className="user-name">{user.name || 'Unnamed User'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="list-cell staffId-cell">
                    {user.staffId || '-'}
                  </div>
                  <div className="list-cell username-cell">
                    {user.username || '-'}
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
                      <button className="btn btn-sm btn-outline-info" onClick={() => impersonate(user)}>
                        Impersonate
                      </button>
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
              <h3 className="text-white">Create New User</h3>
              <button className="modal-close" onClick={handleCloseCreateModal}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreate} className="bg-white">
                {/* Staff ID Input with Status */}
                <div className="form-group">
                  <label>Staff ID *</label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      value={newUser.staffId}
                      onChange={(e) => handleStaffIdChange(e.target.value)}
                      onBlur={handleStaffIdBlur}
                      placeholder="Enter staff ID (e.g., JC01, ST01)"
                      required
                      disabled={staffDataLoading}
                    />
                    {staffDataLoading && (
                      <span className="input-group-text">
                        <span className="spinner-border spinner-border-sm"></span>
                      </span>
                    )}
                  </div>
                  <small className="text-muted">
                    Enter staff ID and click/tab out to auto-fill from StaffBioData
                  </small>

                  {/* Status display */}
                  {staffData ? (
                    <div className="alert alert-success mt-2 p-2">
                      <small>✓ Found staff record: {staffData.firstName} {staffData.lastName} (ID: {staffData.idNo})</small>
                    </div>
                  ) : newUser.staffId && !staffDataLoading ? (
                    <div className="alert alert-warning mt-2 p-2">
                      <small>ℹ No staff record found. Will create user with manual details.</small>
                    </div>
                  ) : null}
                </div>

                {/* User Profile Display Section */}
                {staffData && (
                  <div className="staff-data-preview mb-4">
                    <div className="preview-header">
                      <h5 className="mb-3">Staff Data Found:</h5>
                    </div>
                    <UserProfileDisplay staffData={staffData} />
                  </div>
                )}

                {/* Username Display (Read-only) */}
                <div className="form-group">
                  <label>Username (Auto-generated) *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newUser.username}
                    readOnly
                    placeholder="Will auto-generate from staff data"
                    required
                    style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold' }}
                  />
                  <small className="text-muted">
                    {staffData ? 'Auto-generated from StaffBioData' : 'Will generate from name and staff ID'}
                  </small>
                </div>

                {/* Full Name (Read-only if from staff data) */}
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newUser.name}
                    onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Will auto-fill from staff data"
                    required
                    readOnly={!!staffData}
                    style={staffData ? { backgroundColor: '#f8f9fa' } : {}}
                  />
                  <small className="text-muted">
                    {staffData ? 'Auto-filled from staff record' : 'Enter full name manually'}
                  </small>
                </div>

                {/* Password */}
                <div className="form-group">
                  <label>Password *</label>
                  <input
                    type="password"
                    className="form-control"
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter password"
                    required
                  />
                  <small className="text-muted">
                    Minimum 6 characters
                  </small>
                </div>

                {/* Role */}
                <div className="form-group">
                  <label>Role *</label>
                  <select
                    className="form-select"
                    value={newUser.role}
                    onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                  >
                    {ROLES.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                  <small className="text-muted">
                    Select appropriate role for the user
                  </small>
                </div>

                {error && (
                  <div className="alert alert-danger">
                    <strong>Error:</strong> {error}
                  </div>
                )}

                <div className="username-example">
                  <small className="text-muted">
                    <strong>Example:</strong> Staff ID "JC01" with name "John Doe" generates username "doe-01"
                    <br />
                    <strong>Format:</strong> lastName-indexFromIdNo
                  </small>
                </div>

                <div className="modal-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={creating || staffDataLoading}
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
                    onClick={handleCloseCreateModal}
                    disabled={creating}
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
        <AdvancedPermissionsModal
          user={editingUser}
          permissions={tempPerms}
          onSave={savePerms}
          onClose={() => setEditingUser(null)}
          onTogglePerm={togglePerm}
        />
      )}

      {/* Password Reset Modal */}
      <PasswordResetModal
        show={passwordResetModal.show}
        user={passwordResetModal.user}
        onConfirm={handlePasswordReset}
        onCancel={() => setPasswordResetModal({ show: false, user: null })}
      />

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
      <EnhancedConfirmationModal
        show={confirmModal.show}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, show: false }))}
        type={confirmModal.type}
        inputFields={confirmModal.inputFields}
        destructive={confirmModal.destructive}
      />

      {/* Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}