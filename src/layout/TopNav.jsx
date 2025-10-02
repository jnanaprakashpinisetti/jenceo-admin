// src/layout/TopNav.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * TopNav
 * - Visible on ≥992px (d-lg-flex).
 * - Adds: login time, time-on-page, dark mode toggle, fullscreen toggle.
 * - Safe against update-depth loops.
 */
export default function TopNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // —— session & timing ——
  const [nowTick, setNowTick] = useState(0);
  const [pageSeconds, setPageSeconds] = useState(0);
  const pageStartRef = useRef(Date.now());

  // Persist a session loginAt across reloads (best-effort)
  const [loginAt] = useState(() => {
    const stored = sessionStorage.getItem("loginAt");
    if (stored) return Number(stored);
    const t = Date.now();
    sessionStorage.setItem("loginAt", String(t));
    return t;
  });

  // Reset page timer whenever route changes
  useEffect(() => {
    pageStartRef.current = Date.now();
    setPageSeconds(0);
  }, [location.pathname, location.search, location.hash]);

  // Tick each second for timers
  useEffect(() => {
    const t = setInterval(() => {
      setNowTick((n) => n + 1);
      setPageSeconds(Math.max(0, Math.floor((Date.now() - pageStartRef.current) / 1000)));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const fmtClock = (ms) => {
    const d = new Date(ms);
    return d.toLocaleTimeString();
  };
  const fmtHHMMSS = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return (h > 0 ? `${pad(h)}:` : "") + `${pad(m)}:${pad(s)}`;
  };

  // —— search ——
  const [query, setQuery] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("q") || "";
    setQuery((prev) => (prev !== q ? q : prev));
  }, [location.search]);

  const submitSearch = useCallback(
    (e) => {
      e?.preventDefault();
      const q = (query || "").trim();
      const params = new URLSearchParams(location.search);
      if (q) params.set("q", q);
      else params.delete("q");
      const nextSearch = params.toString();
      const nextUrl = nextSearch ? `?${nextSearch}` : "";
      const goto = { pathname: "/search", search: nextUrl };
      if (location.pathname !== "/search" || location.search !== nextUrl) {
        navigate(goto);
      }
    },
    [query, location.pathname, location.search, navigate]
  );
  const clearQuery = () => setQuery("");

  // —— profile / notifications ——
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const profileBtnRef = useRef(null);
  const notifBtnRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showProfile) {
        const out =
          profileRef.current &&
          !profileRef.current.contains(e.target) &&
          profileBtnRef.current &&
          !profileBtnRef.current.contains(e.target);
        if (out) setShowProfile(false);
      }
      if (showNotif) {
        const out =
          notifRef.current &&
          !notifRef.current.contains(e.target) &&
          notifBtnRef.current &&
          !notifBtnRef.current.contains(e.target);
        if (out) setShowNotif(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProfile, showNotif]);

  const toggleNotifications = (e) => {
    e?.stopPropagation();
    setShowNotif((x) => !x);
    setShowProfile(false);
  };
  const toggleProfile = (e) => {
    e?.stopPropagation();
    setShowProfile((x) => !x);
    setShowNotif(false);
  };

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } finally {
      navigate("/login");
    }
  }, [logout, navigate]);

  const currentUser = user || {};
  const userName = currentUser.name || currentUser.email || "User";
  const userRole = currentUser.role || "Member";

  // —— dark mode ——
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("prefersDark");
    return saved ? saved === "1" : false;
  });
  useEffect(() => {
    document.body.classList.toggle("theme-dark", dark);
    localStorage.setItem("prefersDark", dark ? "1" : "0");
  }, [dark]);

  // —— fullscreen ——
  const [fs, setFs] = useState(() => !!document.fullscreenElement);
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().then(() => setFs(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setFs(false)).catch(() => {});
    }
  };
  useEffect(() => {
    const handler = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  return (
    <header
      className="TopHeader sticky-top d-none d-lg-flex navbar navbar-dark bg-dark px-3"
      style={{ zIndex: 10 }}
    >
      <div className="container-fluid d-flex align-items-center gap-3">
        {/* Brand */}
        <div className="d-flex align-items-center">
          <span className="text-white fw-bold d-none d-md-inline">Admin Panel</span>
        </div>

        {/* Search */}
        <div className="flex-grow-1">
          <form className="input-group bg-secondary" onSubmit={submitSearch}>
            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="Search (name, purpose, id, phone...)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Global search"
            />
            <button className="btn btn-sm mb-0" type="button" onClick={clearQuery} title="Clear">
              ✕
            </button>
            <button className="btn btn-sm mb-0" type="submit" title="Search">
              Search
            </button>
          </form>
        </div>

        {/* Quick stats */}
        <div className="d-flex align-items-center gap-3 text-white small">
          <div className="text-nowrap">
            <span className="text-muted">Login:</span>{" "}
            <strong>{fmtClock(loginAt)}</strong>
          </div>
          <div className="text-nowrap">
            <span className="text-muted">On this page:</span>{" "}
            <strong title={`${pageSeconds} seconds`}>{fmtHHMMSS(pageSeconds)}</strong>
          </div>
        </div>

        {/* Right side */}
        <div className="d-flex align-items-center gap-2">
          {/* Dark / Fullscreen */}
          <button
            className="btn btn-outline-light btn-sm"
            type="button"
            onClick={() => setDark((v) => !v)}
            title={dark ? "Switch to light" : "Switch to dark"}
          >
            {dark ? "🌙" : "☀️"}
          </button>
          <button
            className="btn btn-outline-light btn-sm"
            type="button"
            onClick={toggleFullscreen}
            title={fs ? "Exit full screen" : "Full screen"}
          >
            ⛶
          </button>

          {/* Notifications */}
          <div style={{ position: "relative" }}>
            <button
              ref={notifBtnRef}
              className="btn btn-outline-light btn-sm position-relative"
              onClick={toggleNotifications}
              title="Notifications"
              aria-expanded={showNotif}
              type="button"
            >
              <i className="bi bi-bell" />
              {unreadCount > 0 && (
                <span
                  className="badge bg-danger position-absolute top-0 start-100 translate-middle"
                  style={{ fontSize: 10 }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotif && (
              <div
                ref={notifRef}
                className="card shadow-sm"
                style={{
                  position: "absolute",
                  right: 0,
                  top: "110%",
                  width: 340,
                  zIndex: 2000,
                }}
              >
                <div className="card-body p-2">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <strong>Notifications</strong>
                    <button
                      className="btn btn-sm btn-link"
                      onClick={() => {
                        setUnreadCount(0);
                      }}
                      type="button"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="text-muted small">No notifications</div>
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div style={{ position: "relative" }}>
            <button
              ref={profileBtnRef}
              className="btn btn-outline-light d-flex align-items-center gap-2"
              onClick={toggleProfile}
              aria-expanded={showProfile}
              type="button"
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 50,
                  background: "#ffffff22",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
                {String(userName).slice(0, 1).toUpperCase()}
              </div>
              <div className="d-none d-lg-flex flex-column text-start">
                <small className="text-white mb-0" style={{ lineHeight: 1 }}>
                  {userName}
                </small>
                <small className="text-muted" style={{ fontSize: 11 }}>
                  {userRole}
                </small>
              </div>
            </button>

            {showProfile && (
              <div
                ref={profileRef}
                className="card shadow-sm"
                style={{ position: "absolute", right: 0, top: "110%", width: 220, zIndex: 2000 }}
              >
                <div className="card-body p-2">
                  <div className="mb-2">
                    <strong>{userName}</strong>
                    <div className="text-muted small">{userRole}</div>
                    <div className="text-muted small" style={{ fontSize: 10 }}>
                      Logged in via: {currentUser?.mode === "email" ? "Email" : "Username"}
                    </div>
                  </div>
                  <div className="d-grid gap-2">
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => {
                        setShowProfile(false);
                        navigate("/profile");
                      }}
                      type="button"
                    >
                      Profile
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => {
                        setShowProfile(false);
                        navigate("/settings");
                      }}
                      type="button"
                    >
                      Settings
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={handleLogout} type="button">
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
