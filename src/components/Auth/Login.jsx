import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const { login, loading, debugDatabase } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState(""); // email OR username
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    identifier: "",
    password: ""
  });

  const clearErrors = () => {
    setError("");
    setFieldErrors({
      identifier: "",
      password: ""
    });
  };

  const validateForm = () => {
    const errors = {
      identifier: "",
      password: ""
    };

    if (!identifier.trim()) {
      errors.identifier = "Email or username is required";
    }

    if (!password) {
      errors.password = "Password is required";
    }

    setFieldErrors(errors);
    return !errors.identifier && !errors.password;
  };

  // Debug function to check database
  const handleDebug = async () => {
    try {
      console.clear();
      await debugDatabase();
    } catch (err) {
      console.error("Debug failed:", err);
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    clearErrors();

    if (!validateForm()) {
      return;
    }

    setBusy(true);

    try {
      await login(identifier.trim(), password);
      navigate("/");
    } catch (err) {
      console.error("Login error", err);

      const errorMessage = err.message || "Login failed";
      setError(errorMessage);

      // Set specific field errors based on error type
      if (errorMessage.toLowerCase().includes("user not found") ||
        errorMessage.toLowerCase().includes("no account found") ||
        errorMessage.toLowerCase().includes("username")) {
        setFieldErrors(prev => ({
          ...prev,
          identifier: "Username not found"
        }));
      } else if (errorMessage.toLowerCase().includes("password") ||
        errorMessage.toLowerCase().includes("incorrect")) {
        setFieldErrors(prev => ({
          ...prev,
          password: "Invalid password"
        }));
      } else if (errorMessage.toLowerCase().includes("inactive") ||
        errorMessage.toLowerCase().includes("disabled")) {
        setFieldErrors(prev => ({
          ...prev,
          identifier: "Account is inactive"
        }));
      }
    }

    setBusy(false);
  }

  const handleIdentifierChange = (e) => {
    setIdentifier(e.target.value);
    if (fieldErrors.identifier) {
      setFieldErrors(prev => ({ ...prev, identifier: "" }));
    }
    if (error) setError("");
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (fieldErrors.password) {
      setFieldErrors(prev => ({ ...prev, password: "" }));
    }
    if (error) setError("");
  };

  const getInputClass = (fieldName) => {
    const baseClass = "form-control";
    return fieldErrors[fieldName] ? `${baseClass} is-invalid` : baseClass;
  };

  return (
    <div style={{
      padding: 24,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
    }}>
      <div className="card text-white shadow-lg" style={{ width: 400, backgroundColor: "#333638", borderRadius: "10px" }}>
        <div className="card-body p-4">
          <h4 className="mb-4 text-center">Sign In</h4>

          <form onSubmit={handleSubmit}>
            <div className="form-group mb-3">
              <label className="small mb-2">Email or Username</label>
              <input
                className={getInputClass("identifier")}
                type="text"
                required
                value={identifier}
                onChange={handleIdentifierChange}
                placeholder="example@site.com or admin"
                autoFocus
                disabled={busy || loading}
              />
              {fieldErrors.identifier && (
                <div className="invalid-feedback d-block">
                  {fieldErrors.identifier}
                </div>
              )}
            </div>

            <div className="form-group mb-4">
              <label className="small mb-2">Password</label>
              <input
                className={getInputClass("password")}
                type="password"
                required
                value={password}
                onChange={handlePasswordChange}
                placeholder="Enter your password"
                disabled={busy || loading}
              />
              {fieldErrors.password && (
                <div className="invalid-feedback d-block">
                  {fieldErrors.password}
                </div>
              )}
            </div>

            {error && !fieldErrors.identifier && !fieldErrors.password && (
              <div className="alert alert-danger small mb-3">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {error}
              </div>
            )}

            <div className="d-flex justify-content-center">
              <button
                className="btn btn-primary btn-lg"
                type="submit"
                disabled={busy || loading}
                style={{
                  minWidth: "120px",
                  padding: "10px 30px"
                }}
              >
                {busy || loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </div>
          </form>

          {/* Debug button */}
          <div className="d-flex justify-content-center mt-3">
            <button
              type="button"
              className="btn btn-sm btn-outline-warning"
              onClick={handleDebug}
            >
              Debug Database
            </button>
          </div>

          <div className="mt-4 small text-muted text-center">
            <div className="mb-2">
              <strong>Login Options:</strong>
            </div>
            <div className="mb-1">
              <i className="bi bi-envelope me-2"></i>
              Use email for Firebase Authentication
            </div>
            <div>
              <i className="bi bi-person me-2"></i>
              Use username for database authentication
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}