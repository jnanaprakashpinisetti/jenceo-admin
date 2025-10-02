// PermissionRoute.js
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { hasPerm } from "../../utils/perm";

export default function PermissionRoute({ componentName, action = "view", children }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!hasPerm(user, componentName, action)) {
    console.warn(`Permission denied for ${componentName}.${action}`, {
      user: user?.email,
      role: user?.role,
      permissions: user?.permissions
    });
    return <Navigate to="/" replace />;
  }
  
  return children;
}