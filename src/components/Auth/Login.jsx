import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const { loginEmail, loginUsername } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("username"); // "username" | "email"
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [passwordU, setPasswordU] = useState("");
  const [passwordE, setPasswordE] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "username") {
        await loginUsername(username.trim(), passwordU);
      } else {
        await loginEmail(email.trim(), passwordE);
      }
      navigate("/");
    } catch (err) {
      console.error("Login error", err);
      setError(err.message || "Login failed");
    }
    setBusy(false);
  }

  return (
    <div style={{ padding: 24, display: "flex", justifyContent: "center" }}>
      <div className="card bg-dark text-white" style={{ width: 460 }}>
        <div className="card-body">
          <h4 className="mb-3">Sign In</h4>

          {/* Toggle */}
          <div className="btn-group mb-3">
            <button
              type="button"
              className={`btn ${mode === "username" ? "btn-primary" : "btn-outline-light"}`}
              onClick={() => setMode("username")}
            >
              Username
            </button>
            <button
              type="button"
              className={`btn ${mode === "email" ? "btn-primary" : "btn-outline-light"}`}
              onClick={() => setMode("email")}
            >
              Email
            </button>
          </div>

          {/* Forms */}
          <form onSubmit={handleSubmit}>
            {mode === "username" ? (
              <>
                <div className="form-group mb-2">
                  <label className="small">Username</label>
                  <input
                    className="form-control"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. admin"
                  />
                </div>
                <div className="form-group mb-3">
                  <label className="small">Password</label>
                  <input
                    className="form-control"
                    type="password"
                    required
                    value={passwordU}
                    onChange={(e) => setPasswordU(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="form-group mb-2">
                  <label className="small">Email</label>
                  <input
                    className="form-control"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@site.com"
                  />
                </div>
                <div className="form-group mb-3">
                  <label className="small">Password</label>
                  <input
                    className="form-control"
                    type="password"
                    required
                    value={passwordE}
                    onChange={(e) => setPasswordE(e.target.value)}
                  />
                </div>
              </>
            )}

            {error && <div className="alert alert-danger small">{error}</div>}

            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary" disabled={busy}>
                {busy ? "Signing in..." : "Sign in"}
              </button>
            </div>
          </form>

          {/* Optional tiny help text */}
          <div className="mt-3 small text-muted">
            <div>• Username mode reads <code>JenCeo-DataBase/Users</code>.</div>
            <div>• Email mode reads <code>jenceo-admin/authentication/users</code>.</div>
          </div>
        </div>
      </div>
    </div>
  );
}