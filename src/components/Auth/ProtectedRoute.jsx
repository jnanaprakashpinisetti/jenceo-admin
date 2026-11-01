// src/routes/ProtectedRoute.jsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * Protects routes based on the global auth user.
 * allowedRoles: role names (case-insensitive). If empty, any logged-in user is allowed.
 * Not logged in  -> /login?redirect=<where they wanted to go> (Login sends them back after sign-in)
 * Wrong role     -> /unauthorized
 */
const ADMIN_WORDS = ["admin", "administrator", "superadmin", "super admin", "super_admin", "owner", "root"];

// admin | guest | user, whatever the role field is called in your user object
const deriveType = (u) => {
  const raw = String(u?.role ?? u?.userType ?? u?.type ?? "").toLowerCase();
  if (u?.isAdmin === true || ADMIN_WORDS.includes(raw) || raw.includes("admin")) return "admin";
  if (u?.isGuest === true || raw.includes("guest")) return "guest";
  return "user";
};

const isBlocked = (u) =>
  u?.active === false || u?.isActive === false ||
  ["inactive", "disabled", "blocked", "suspended"].includes(String(u?.status ?? "").toLowerCase());

export default function ProtectedRoute({ allowedRoles = [] }) {
  const auth = useAuth() || {};
  const user = auth.user || auth.currentUser; // some files of this app use "user", others "currentUser"
  const { ready, loading } = auth;
  const location = useLocation();

  // Don't show anything while loading (ready === undefined means "this app has no ready flag")
  if (loading || ready === false) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Not logged in -> login, remembering the page they wanted
  if (!user) {
    const target = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(target)}`} replace state={{ from: location }} />;
  }

  // Inactive / disabled accounts
  if (isBlocked(user)) {
    return <Navigate to="/login?message=account_disabled" replace />;
  }

  // Check roles if specified
  if (allowedRoles.length > 0) {
    const role = String(user?.role || user?.userType || "").toLowerCase() || deriveType(user);
    const allowed = allowedRoles.map((r) => String(r).toLowerCase());
    if (!allowed.includes(role)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <Outlet />;
}
