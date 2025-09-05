// TopNav.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";

/**
 * TopNav — global search:
 *  - on submit -> dispatch 'performGlobalSearch' event with { query }
 *  - then navigate to /search?q=...
 *
 * Props:
 *  - navigate?: function (pass useNavigate from parent for SPA navigate)
 *  - onSearch?: optional debounced callback (kept for backward compatibility)
 */

export default function TopNav({
  currentUser = {},
  onSignOut,
  pendingCount = 0,
  notifications = null,
  onSearch,
  navigate, // optional SPA navigation function
}) {
  const [query, setQuery] = useState("");
  const [showNotif, setShowNotif] = useState(false);
  const [localNotifs, setLocalNotifs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(pendingCount || 0);
  const [showProfile, setShowProfile] = useState(false);
  const [themeDark, setThemeDark] = useState(true);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    if (Array.isArray(notifications)) {
      setLocalNotifs(notifications);
      setUnreadCount(notifications.filter((n) => !n.read).length);
    } else {
      // fallback mock
      const mock = [
        { id: "n1", title: "Pending approval", body: "Petty cash needs approval", when: new Date().toISOString(), read: false },
      ];
      setLocalNotifs(mock);
      setUnreadCount(mock.filter((n) => !n.read).length);
    }
  }, [notifications]);

  useEffect(() => {
    function onDocClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // debounced onSearch callback (optional)
  useEffect(() => {
    const t = setTimeout(() => {
      if (typeof onSearch === "function") onSearch(query);
    }, 300);
    return () => clearTimeout(t);
  }, [query, onSearch]);

  const doNavigate = (path) => {
    try {
      if (typeof navigate === "function") navigate(path);
      else window.location.href = path;
    } catch (err) {
      console.error("Navigation failed", err);
      window.location.href = path;
    }
  };

  const handleSignOut = useCallback(async () => {
    try {
      if (typeof onSignOut === "function") await onSignOut();
      else {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
      }
    } catch (err) {
      console.error("Sign out failed", err);
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  }, [onSignOut]);

  // --- GLOBAL SEARCH: submit handler ---
  const submitSearch = (e) => {
    e && e.preventDefault();
    const q = (query || "").trim();
    if (!q) return;

    // 1) broadcast a global search event (other modules can listen)
    window.dispatchEvent(new CustomEvent("performGlobalSearch", { detail: { query: q } }));

    // 2) navigate to search results page with query param
    const encoded = encodeURIComponent(q);
    doNavigate(`/search?q=${encoded}`);
  };

  const markAllRead = () => {
    setLocalNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const toggleTheme = () => {
    setThemeDark((s) => !s);
    window.dispatchEvent(new CustomEvent("themeToggle", { detail: { dark: !themeDark } }));
  };

  const userName = currentUser?.name || currentUser?.email || "User";
  const userRole = currentUser?.role || "Member";

  return (
    <header className={`sticky-top navbar navbar-dark ${themeDark ? "bg-dark" : "bg-secondary"} px-3`} style={{ zIndex: 1060 }}>
      <div className="container-fluid d-flex align-items-center gap-3">
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-outline-light btn-sm"
            aria-label="Toggle sidebar"
            onClick={() => window.dispatchEvent(new CustomEvent("toggleSidebar"))}
            title="Toggle sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <span className="d-none d-md-inline" style={{ fontWeight: 700, color: "#fff" }}>Admin Panel</span>
        </div>

        <div className="flex-grow-1">
          <form className="input-group" onSubmit={submitSearch}>
            <input
              type="search"
              className="form-control form-control-sm"
              placeholder="Search everything (name, purpose, reference...)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Global search"
            />
            <button type="button" className="btn btn-primary btn-sm mb-0" onClick={() => setQuery("")}>Clear</button>
            <button type="submit" className="btn btn-primary btn-sm mb-0">Search</button>
          </form>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-outline-light btn-sm d-none d-md-inline" title="Pending approvals" onClick={() => window.dispatchEvent(new CustomEvent("showPending"))}>
            <i className="bi bi-hourglass-split" />
          </button>

          <button className="btn btn-outline-light btn-sm d-none d-md-inline" title="Reports" onClick={() => doNavigate("/reports")}>
            <i className="bi bi-bar-chart-line" />
          </button>

          {/* Notifications */}
          <div ref={notifRef} style={{ position: "relative" }}>
            <button className="btn btn-outline-light position-relative" onClick={() => setShowNotif((s) => !s)} title="Notifications" aria-expanded={showNotif}>
              <i className="bi bi-bell" />
              {unreadCount > 0 && <span className="badge bg-danger position-absolute top-0 start-100 translate-middle" style={{ fontSize: 10 }}>{unreadCount}</span>}
              Notifications
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
                    {localNotifs.map((n) => (
                      <div key={n.id} className={`d-flex gap-2 align-items-start p-2 ${n.read ? "opacity-75" : ""}`} style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: "#00000010", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <i className="bi bi-info-circle" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700 }}>{n.title}</div>
                          <div className="small">{n.body}</div>
                          <div className="small text-muted mt-1">{new Date(n.when).toLocaleString()}</div>
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

          {/* Profile */}
          <div ref={profileRef} style={{ position: "relative" }}>
            <button className="btn btn-outline-light d-flex align-items-center gap-2" onClick={() => setShowProfile((s) => !s)} aria-expanded={showProfile}>
              <div style={{ width: 36, height: 36, borderRadius: 50, background: "#ffffff22", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700 }}>
                {currentUser?.avatarUrl ? <img src={currentUser.avatarUrl} alt="avatar" style={{ width: 36, height: 36, borderRadius: "50%" }} /> : (String(userName).slice(0, 1).toUpperCase())}
              </div>
              <div className="d-none d-sm-block text-start">
                <div style={{ fontSize: 13, fontWeight: 700 }}>{userName}</div>
                <div className="small" style={{ opacity: 0.8 }}>{userRole}</div>
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
                  <li className="list-group-item"><button className="btn btn-link p-0" onClick={() => window.dispatchEvent(new CustomEvent("activityLog"))}>Activity Log</button></li>

                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    <button className="btn btn-link p-0" onClick={() => window.dispatchEvent(new CustomEvent("openSettings"))}>Settings</button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={toggleTheme}>{themeDark ? "Dark" : "Light"}</button>
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
  pendingCount: PropTypes.number,
  notifications: PropTypes.array,
  onSearch: PropTypes.func,
  navigate: PropTypes.func,
};
