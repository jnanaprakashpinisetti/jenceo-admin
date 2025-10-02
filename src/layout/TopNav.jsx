// src/layout/TopNav.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * TopNav
 * - Safe against update-depth loops.
 * - Search submits to /search?q=...
 * - Optional notifications/profile dropdowns (local-only UI).
 */
export default function TopNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // local UI state
  const [query, setQuery] = useState("");
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0); // local demo; wire to real data if needed

  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const profileBtnRef = useRef(null);
  const notifBtnRef = useRef(null);

  const currentUser = user || {};
  const userName = currentUser.name || currentUser.email || "User";
  const userRole = currentUser.role || "Member";

  // Keep input synced to ?q= only when URL actually changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("q") || "";
    setQuery(prev => (prev !== q ? q : prev)); // guard to avoid infinite re-set
  }, [location.search]);

  // Click outside for dropdowns (depends only on visibility flags)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showProfile) {
        const outsideProfile =
          profileRef.current &&
          !profileRef.current.contains(e.target) &&
          profileBtnRef.current &&
          !profileBtnRef.current.contains(e.target);
        if (outsideProfile) setShowProfile(false);
      }
      if (showNotif) {
        const outsideNotif =
          notifRef.current &&
          !notifRef.current.contains(e.target) &&
          notifBtnRef.current &&
          !notifBtnRef.current.contains(e.target);
        if (outsideNotif) setShowNotif(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProfile, showNotif]);

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

      // only navigate if something actually changed
      if (location.pathname !== "/search" || location.search !== nextUrl) {
        navigate(goto);
      }
    },
    [query, location.pathname, location.search, navigate]
  );

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } finally {
      navigate("/login");
    }
  }, [logout, navigate]);

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

  const clearQuery = () => setQuery("");

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

        {/* Right side */}
        <div className="d-flex align-items-center gap-2">
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
