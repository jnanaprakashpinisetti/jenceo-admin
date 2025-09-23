import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate("/");
    } catch (err) {
      setError(err.message || "Login failed");
      console.error("Login error", err);
    }
    setBusy(false);
  }

  return (
    <div style={{ padding: 24, display: "flex", justifyContent: "center" }}>
      <div className="card bg-dark text-white" style={{ width: 420 }}>
        <div className="card-body">
          <h4>Sign In</h4>
          <form onSubmit={handleSubmit}>
            <div className="form-group mb-2">
              <label className="small">Email</label>
              <input
                className="form-control"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group mb-3">
              <label className="small">Password</label>
              <input
                className="form-control"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <div className="alert alert-danger small">{error}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary" disabled={busy}>
                {busy ? "Signing in..." : "Sign in"}
              </button>
              {/* <button
                type="button"
                className="btn btn-outline-light"
                onClick={() => {
                  setEmail("office.jenceo@gmail.com");
                }}
              >
                Fill Admin Email
              </button> */}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
