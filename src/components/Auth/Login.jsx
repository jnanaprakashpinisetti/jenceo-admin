// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  trackUserLogin, getClientIP, checkIPRestriction,
  recordFailedLogin, getLoginLockStatus, clearFailedLogins,
} from '../LoginTracker/trackUserLogin';

// Messages shown after the app signs someone out (see IPRestrictionMonitor)
const NOTICES = {
  ip_restricted: "You were signed out because your IP address is no longer authorized.",
  session_expired: "You were signed out because you were inactive for a while.",
  forced_logout: "An administrator signed you out.",
  account_disabled: "This account is inactive. Please contact the administrator.",
};

// Only allow redirects inside this site (blocks //evil.com and https://evil.com)
const safeRedirect = (value) =>
  value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/";

const CREDENTIAL_ERROR = /password|user not found|not found|invalid|credential|incorrect|wrong/i;

export default function Login() {
  const auth = useAuth();
  const { login, loading, logout } = auth;
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ identifier: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const params = new URLSearchParams(location.search);
  const notice = NOTICES[params.get("message")] || "";

  const clearErrors = () => {
    setError("");
    setFieldErrors({ identifier: "", password: "" });
  };

  const validateForm = () => {
    const id = identifier.trim();
    const errors = {
      identifier: id ? "" : "Email or username is required",
      password: password ? "" : "Password is required",
    };
    setFieldErrors(errors);
    return !errors.identifier && !errors.password;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearErrors();
    if (!validateForm()) return;

    const id = identifier.trim();
    let clientIP = "unknown";
    setBusy(true);
    try {
      // 1. IP check BEFORE the password is even tried
      clientIP = await getClientIP({ force: true });
      const restrictionCheck = await checkIPRestriction(clientIP);
      if (restrictionCheck.restricted) {
        throw new Error(`Access denied: Your IP address (${clientIP}) is not authorized to access this website. Please contact administrator.`);
      }

      // 2. Temporary lock after too many wrong passwords
      const lock = await getLoginLockStatus(id);
      if (lock.locked) {
        throw new Error(`Too many failed attempts. Try again in ${Math.max(1, Math.ceil(lock.remainingMs / 60000))} minute(s).`);
      }

      // 3. Sign in
      const userData = await login(id, password);

      // 4. Track the login. If login() returns nothing, fall back to what we know so the record is never empty.
      const who = userData || auth.currentUser || auth.user || { email: id.includes("@") ? id : "", username: id };
      if (!userData) console.warn("login() returned no user data; tracking used a fallback. Return the user object from login() for full name/photo/type.");
      const trackingResult = await trackUserLogin(who, clientIP);

      if (trackingResult.restricted) {
        if (logout) await logout();
        throw new Error(`Access denied: Your IP address (${clientIP}) is not authorized to access this website. Please contact administrator.`);
      }
      if (!trackingResult.success) console.warn("Login tracking failed:", trackingResult.error);

      await clearFailedLogins(id);

      const from = location.state && location.state.from;
      const target = params.get("redirect") || (from ? `${from.pathname}${from.search || ""}` : "");
      navigate(safeRedirect(target), { replace: true });
    } catch (err) {
      const msg = err?.message || "Login failed";
      const lower = msg.toLowerCase();

      if (lower.startsWith("access denied")) {
        setError(msg);
        setFieldErrors((p) => ({ ...p, identifier: "IP access restricted" }));
      } else if (lower.startsWith("too many failed")) {
        setError(msg);
      } else if (lower.includes("inactive") || lower.includes("disabled")) {
        setError(msg);
        setFieldErrors((p) => ({ ...p, identifier: "Account is inactive" }));
      } else if (CREDENTIAL_ERROR.test(msg)) {
        // One generic message, so nobody can learn which usernames exist
        const result = await recordFailedLogin(id, clientIP, "INVALID_CREDENTIALS");
        if (result.locked) {
          setError("Too many failed attempts. This account is locked for 15 minutes.");
        } else {
          setError("Invalid email/username or password.");
          setFieldErrors((p) => ({ ...p, password: "Invalid email/username or password" }));
        }
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const getInputClass = (name) => `form-control ${fieldErrors[name] ? "is-invalid" : ""}`;
  const isSubmitting = busy || loading;

  return (
    <div className="login-container">
      <div className="card login-card">
        <div className="card-body">
          <h4 className="login-title">Login</h4>

          {notice && <div className="alert alert-warning error-alert">{notice}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label">Email or Username</label>
              <input
                className={getInputClass("identifier")}
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="example@site.com or admin"
                autoComplete="username"
                autoFocus
                disabled={isSubmitting}
              />
              {fieldErrors.identifier && <div className="error-message">{fieldErrors.identifier}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>

              {/* Password with eye icon */}
              <div className="password-wrapper">
                <input
                  className={getInputClass("password")}
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    // Eye-off icon
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.11 1 12c.46-1.1 1.12-2.12 1.96-3.03M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.59M6.1 6.1A10.94 10.94 0 0 1 12 4c5 0 9.27 3.89 11 8-.58 1.37-1.44 2.62-2.5 3.64M1 1l22 22" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    // Eye icon
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="12" r="3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </div>

              {fieldErrors.password && <div className="error-message">{fieldErrors.password}</div>}
            </div>

            {error && !fieldErrors.identifier && !fieldErrors.password && (
              <div className="alert alert-danger error-alert">{error}</div>
            )}

            <div className="submit-container">
              <button className="btn btn-primary submit-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? (<><span className="spinner spinner-sm me-2" />Signing in...</>) : "Sign In"}
              </button>
            </div>
          </form>

          <div className="login-info">
            <div className="info-title"><strong>Login Options:</strong></div>
            <div className="info-item">Use email for Authentication</div>
            <div className="info-item">Use Username for authentication</div>
          </div>
        </div>
      </div>

      <style jsx="true">{`
        .login-container { padding: 24px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
        .login-card { width: 400px; background-color: #333638; border-radius: 10px; color: white; }
        .login-title { margin-bottom: 1.5rem; text-align: center; }
        .form-group { margin-bottom: 1.5rem; }
        .form-label { font-size: 0.875rem; margin-bottom: 0.5rem; display: block; }
        .error-message { width: 100%; margin-top: 0.25rem; font-size: 0.875rem; color: #dc3545; }
        .error-alert { font-size: 0.875rem; margin-bottom: 1rem; }
        .submit-container { display: flex; justify-content: center; }
        .submit-button { min-width: 120px; padding: 10px 30px; }
        .spinner { display: inline-block; width: 1rem; height: 1rem; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: spinner-border 0.75s linear infinite; }
        .login-info { margin-top: 1.5rem; font-size: 0.875rem; color: #adb5bd; text-align: center; }
        .info-title { margin-bottom: 0.5rem; }
        .info-item { margin-bottom: 0.25rem; }

        /* password field with icon */
        .password-wrapper { position: relative; }
        .password-wrapper input { padding-right: 44px; }
        .password-toggle {
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          display: inline-flex; align-items: center; justify-content: center;
          width: 28px; height: 28px; border-radius: 6px; border: 0; background: transparent; color: #e9ecef;
        }
        .password-toggle:hover { color: #fff; }
        .password-toggle:disabled { opacity: .6; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
