// TopNav.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";

/**
 * TopNav (global search)
 *
 * Props:
 *  - currentUser: { name, email, avatarUrl, role } (optional)
 *  - onSignOut: function (optional)
 *  - notifications: array (optional)
 *  - onSearch: function(query) (optional, debounced local handler)
 *  - navigate: function (optional) - prefer useNavigate() from react-router
 *
 * Behavior:
 *  - typing updates internal query state
 *  - pressing Enter or clicking Search will:
 *     1) dispatch window CustomEvent 'performGlobalSearch' with { query }
 *     2) navigate to /search?q=<encoded query> (SPA via navigate prop if given)
 */
export default function TopNav({
  currentUser = {},
  onSignOut,
  notifications = [],
  onSearch,
  navigate,
}) {
  const [query, setQuery] = useState("");
  const [showNotif, setShowNotif] = useState(false);
  const [localNotifs, setLocalNotifs] = useState(notifications || []);
  const [unreadCount, setUnreadCount] = useState((notifications || []).filter(n => !n.read).length);
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    setLocalNotifs(Array.isArray(notifications) ? notifications : []);
    setUnreadCount((notifications || []).filter(n => !n.read).length);
  }, [notifications]);

  // click outside to close dropdowns
  useEffect(() => {
    function onDocClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // debounced optional local onSearch (non-navigation)
  useEffect(() => {
    const t = setTimeout(() => {
      if (typeof onSearch === "function") onSearch(query);
    }, 250);
    return () => clearTimeout(t);
  }, [query, onSearch]);

  const doNavigate = useCallback((path) => {
    try {
      if (typeof navigate === "function") navigate(path);
      else window.location.href = path;
    } catch (err) {
      console.error("TopNav navigate failed:", err);
      window.location.href = path;
    }
  }, [navigate]);

  const submitSearch = useCallback((e) => {
    if (e) e.preventDefault();
    const q = (query || "").trim();
    if (!q) return;

    // 1) dispatch global search event (other modules can listen)
    try {
      window.dispatchEvent(new CustomEvent("performGlobalSearch", { detail: { query: q } }));
    } catch (err) {
      // older browsers: fallback
      const ev = document.createEvent("CustomEvent");
      ev.initCustomEvent("performGlobalSearch", false, false, { query: q });
      window.dispatchEvent(ev);
    }

    // 2) navigate to search page SPA-style (or full reload fallback)
    const encoded = encodeURIComponent(q);
    doNavigate(`/search?q=${encoded}`);
  }, [query, doNavigate]);

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      submitSearch(e);
    }
  };

  const clearQuery = () => setQuery("");

  const markAllRead = () => {
    setLocalNotifs(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleSignOut = async () => {
    try {
      if (typeof onSignOut === "function") await onSignOut();
      else {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
      }
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const userName = currentUser?.name || currentUser?.email || "User";
  const userRole = currentUser?.role || "Member";

  return (
    <header className="TopHeader sticky-top navbar navbar-dark bg-dark px-3" style={{ zIndex: 1060 }}>
      <div className="container-fluid d-flex align-items-center gap-3">
        {/* Brand label (LeftNav controls mobile behavior) */}
        <div className="d-flex align-items-center">
          <span className="text-white fw-bold d-none d-md-inline">Admin Panel</span>
        </div>

        {/* Search */}
        <div className="flex-grow-1">
          <form className="input-group" onSubmit={submitSearch}>
            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="Search (name, purpose, id, phone...)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              aria-label="Global search"
              autoComplete="off"
            />
            <button type="button" className="btn btn-outline-light btn-sm" onClick={clearQuery}>Clear</button>
            <button type="submit" className="btn btn-primary btn-sm">Search</button>
          </form>
        </div>

        {/* Buttons: pending / reports / notifications */}
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-outline-light btn-sm d-none d-md-inline"
            title="Pending approvals"
            onClick={() => window.dispatchEvent(new CustomEvent("showPending"))}
          >
            <i className="bi bi-hourglass-split" />
          </button>

          <button
            className="btn btn-outline-light btn-sm d-none d-md-inline"
            title="Reports"
            onClick={() => doNavigate("/reports")}
          >
            <i className="bi bi-bar-chart-line" />
          </button>

          <div ref={notifRef} style={{ position: "relative" }}>
            <button
              className="btn btn-outline-light position-relative"
              onClick={() => setShowNotif(s => !s)}
              title="Notifications"
              aria-expanded={showNotif}
            >
              <i className="bi bi-bell" />
              {unreadCount > 0 && (
                <span className="badge bg-danger position-absolute top-0 start-100 translate-middle" style={{ fontSize: 10 }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotif && (
              <div className="card shadow-sm" style={{ position: "absolute", right: 0, top: "110%", width: 340, zIndex: 2000 }}>
                <div className="card-body p-2">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <strong>Notifications</strong>
                    <div>
                      <button className="btn btn-sm btn-link" onClick={markAllRead}>Mark all read</button>
                    </div>
                  </div>

                  <div style={{ maxHeight: 300, overflowY: "auto" }}>
                    {localNotifs.length === 0 && <div className="text-muted small">No notifications</div>}
                    {localNotifs.map(n => (
                      <div key={n.id || JSON.stringify(n)} className={`d-flex gap-2 align-items-start p-2 ${n.read ? "opacity-75" : ""}`} style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: "#00000010", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <i className="bi bi-info-circle" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700 }}>{n.title}</div>
                          <div className="small">{n.body}</div>
                          <div className="small text-muted mt-1">{n.when ? new Date(n.when).toLocaleString() : ""}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="d-flex justify-content-end mt-2">
                    <button className="btn btn-sm btn-light" onClick={() => doNavigate("/notifications")}>View all</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Profile dropdown */}
          <div ref={profileRef} style={{ position: "relative" }}>
            <button className="btn btn-outline-light d-flex align-items-center gap-2" onClick={() => setShowProfile(s => !s)} aria-expanded={showProfile}>
              <div style={{ width: 36, height: 36, borderRadius: 50, background: "#ffffff22", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700 }}>
                {currentUser?.avatarUrl ? <img src={currentUser.avatarUrl} alt="avatar" style={{ width: 36, height: 36, borderRadius: "50%" }} /> : (String(userName).slice(0, 1).toUpperCase())}
              </div>
              <div className="d-none d-sm-block text-start">
                <div style={{ fontSize: 13, fontWeight: 700 }}>{userName}</div>
                <div className="small text-muted">{userRole}</div>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="ms-1" aria-hidden>
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {showProfile && (
              <div className="card shadow-sm" style={{ position: "absolute", right: 0, top: "110%", width: 220, zIndex: 2000 }}>
                <ul className="list-group list-group-flush">
                  <li className="list-group-item">
                    <div style={{ fontWeight: 700 }}>{userName}</div>
                    <div className="small text-muted">{currentUser?.email || ""}</div>
                  </li>

                  <li className="list-group-item"><button className="btn btn-link p-0" onClick={() => window.dispatchEvent(new CustomEvent("openProfile"))}>Edit Profile</button></li>
                  <li className="list-group-item"><button className="btn btn-link p-0" onClick={() => window.dispatchEvent(new CustomEvent("uploadPhoto"))}>Upload Photo</button></li>
                  <li className="list-group-item"><button className="btn btn-link p-0" onClick={() => window.dispatchEvent(new CustomEvent("editBiodata"))}>Edit Biodata</button></li>
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    <button className="btn btn-link p-0" onClick={() => window.dispatchEvent(new CustomEvent("openSettings"))}>Settings</button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => window.dispatchEvent(new CustomEvent("themeToggle", { detail: { dark: false } }))}>Theme</button>
                  </li>

                  <li className="list-group-item"><button className="btn btn-link text-danger p-0" onClick={handleSignOut}>Sign out</button></li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

TopNav.propTypes = {
  currentUser: PropTypes.object,
  onSignOut: PropTypes.func,
  notifications: PropTypes.array,
  onSearch: PropTypes.func,
  navigate: PropTypes.func,
};
