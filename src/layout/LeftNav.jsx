// src/layout/LeftNav.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  Routes,
  Route,
  NavLink,
  useLocation,
  useNavigate,
  Navigate,
} from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import logo from "../assets/jencio-logo.svg";
import logoicon from "../assets/jenceo-icon.svg";
import toggle from "../assets/toggle.svg";
import close from "../assets/close.svg";

import arrow from "../assets/arrow.svg";
import home from "../assets/home.svg";

import workerData from "../assets/workers-data.svg";
import workerExit from "../assets/worker-exit.svg";
import WorkerAggrement from "../assets/workers-aggrement.svg";
import client from "../assets/client.svg";
import ClientExitIcon from "../assets/client-exit.svg";
import HospitalIcon from "../assets/hospital-icon.svg";
import HospitalDeleteIcon from "../assets/hospital-delet-icon.svg";

import invest from "../assets/invest.svg";
import expences from "../assets/expence.svg";
import task from "../assets/task.svg";
import admin from "../assets/admin.svg";
import accounts from "../assets/accounts.svg";
import inquiry from "../assets/inquiry.svg";
import inquiryDelete from "../assets/inquiryDelete.svg";
import Staff from "../assets/Staff.svg";
import StaffExit from "../assets/StaffExit.svg";
import call from "../assets/Call.svg";
import callDelete from "../assets/CallDelete.svg";

import Dashboard from "../pages/Dashboard";
// Employee Data
import WorkersData from "../pages/WorkersData";
import EmployeeAggrement from "../pages/WorkerAggrement";
import ExistingEmployees from "../pages/ExistingWorker";

import Investments from "../pages/Investments";
import ClientInfo from "../pages/ClientInfo";
import ClientExit from "../pages/ClientExit";
import Expenses from "../pages/Expenses";
import ExpenceDelete from "../pages/ExpenceDelete";
import Task from "../pages/Task";
import AdminUsers from "../pages/AdminUsers";
import Accounts from "../pages/Accounts";
import HospitalList from "../pages/HospitalList";
import HospitalDeleteList from "../pages/HospitalDeleteList";
import WorkerCallsData from "../pages/WorkerCallsData";
import WorkerCallDelete from "../pages/WorkerCallDelete";
import Enquiry from "../pages/Enquiry";
import EnquiryExit from "../pages/EnquiryExit";
import SearchResults from "../pages/SearchResults";

export default function LeftNav() {
  const { user, logout } = useAuth();
  const perms = user?.permissions || {};

  // ---- roles (case-insensitive) ----
  const roleStr = String(user?.role || "").trim().toLowerCase();
  const isAdmin = /^(admin|administrator|superadmin)$/.test(roleStr);
  const isManager = /^(manager|managers|mgr)$/.test(roleStr);

  // Admin & Manager can see everything by default
  const canView = (key) => {
    if (isAdmin || isManager) return true;
    const p = perms[key];
    return !!(p && (p.view === true || p.read === true));
  };

  // Staff section visibility (explicitly OR by role)
  const canSeeStaffSection =
    isAdmin ||
    isManager ||
    !!(perms?.["Staff"]?.view || perms?.["Staff"]?.read) ||
    !!(perms?.["Workers Data"]?.view || perms?.["Workers Data"]?.read);

  // Route guard
  const PermRoute = ({ permKey, children }) => {
    return canView(permKey) ? children : <Navigate to="/" replace />;
  };

  const [isActive, setIsActive] = useState(false);
  const [isShow, setIsShow] = useState(false);
  const [query, setQuery] = useState("");

  // simple dropdown for mobile user menu
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  const userMenuBtnRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();

  // login time (same as TopNav pattern)
  const [loginAt] = useState(() => {
    const stored = sessionStorage.getItem("loginAt");
    if (stored) return Number(stored);
    const t = Date.now();
    sessionStorage.setItem("loginAt", String(t));
    return t;
  });

  useEffect(() => {
    // close mobile menu & dropdown when route changes
    setIsShow(false);
    setShowUserMenu(false);
  }, [location.pathname]);

  // outside click to close the mobile user dropdown
  useEffect(() => {
    const onDoc = (e) => {
      if (!showUserMenu) return;
      const outside =
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target) &&
        userMenuBtnRef.current &&
        !userMenuBtnRef.current.contains(e.target);
      if (outside) setShowUserMenu(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [showUserMenu]);

  const scrollTopSmooth = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const submitSearch = (e) => {
    e?.preventDefault();
    const q = (query || "").trim();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    navigate({
      pathname: "/search",
      search: params.toString() ? `?${params.toString()}` : "",
    });
    scrollTopSmooth();
  };

  const toggleSide = () => setIsActive((v) => !v);
  const toggleMobile = () => setIsShow((v) => !v);
  const closeMobile = () => setIsShow(false);

  // NOTE: per your request, the left nav should NOT scroll.
  // So we DO NOT set maxHeight/overflow on the collapse container.
  const collapseClass = `collapse navbar-collapse${isShow ? " show" : ""}`;

  const userName = user?.name || user?.email || "User";
  const userRole = user?.role || "Member";

  const onNavClick = () => {
    closeMobile();
    scrollTopSmooth();
  };

  const goProfile = () => {
    navigate("/profile");
    onNavClick();
  };

  return (
    <>
      <nav
        className={
          isActive
            ? "navbar navbar-expand-lg toggle"
            : "navbar navbar-expand-lg"
        }
      >
        <button type="button" className="navbar-brand" onClick={() => {}}>
          <img src={isActive ? logoicon : logo} alt="JenCeo Logo" />
        </button>

        <button
          className="slide"
          type="button"
          onClick={toggleSide}
          aria-label="Toggle sidebar"
        >
          <img src={arrow} alt="arrow" />
        </button>

        <hr />

        <button
          className="navbar-toggler"
          type="button"
          aria-controls="collapsibleNavbar"
          aria-expanded={isShow}
          aria-label="Toggle navigation"
          onClick={toggleMobile}
        >
          <img src={isShow ? close : toggle} alt="toggle button" />
        </button>

        <div className={collapseClass} id="collapsibleNavbar">
          {/* ===== Mobile header bar (sticky) ===== */}
          <div
            className="d-block d-lg-none mb-2"
            style={{
              background: "#0b1220", // darker header color to match layout
              color: "#e2e8f0",
              padding: "10px 12px",
              borderRadius: 8,
              position: "sticky",
              top: 0,
              zIndex: 2,
            }}
          >
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex flex-column">
                <strong style={{ lineHeight: 1 }}>{userName}</strong>
                <small className="text-secondary" style={{ lineHeight: 1 }}>
                  {userRole}
                </small>
                <small className="text-muted" style={{ lineHeight: 1 }}>
                  Login: {new Date(loginAt).toLocaleTimeString()}
                </small>
              </div>

              {/* User dropdown (Profile + Logout) */}
              <div className="position-relative">
                <button
                  ref={userMenuBtnRef}
                  type="button"
                  className="btn btn-sm btn-outline-light"
                  onClick={() => setShowUserMenu((v) => !v)}
                >
                  User Menu ▾
                </button>

                {showUserMenu && (
                  <div
                    ref={userMenuRef}
                    className="dropdown-menu show"
                    style={{
                      display: "block",
                      position: "absolute",
                      right: 0,
                      top: "calc(100% + 6px)",
                      minWidth: 180,
                      background: "#1e2129",
                      color: "#e2e8f0",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 8,
                      boxShadow:
                        "0 10px 20px rgba(2, 8, 23, 0.35), 0 2px 6px rgba(2, 8, 23, 0.25)",
                      overflow: "hidden",
                      zIndex: 5,
                    }}
                  >
                    <button
                      className="dropdown-item"
                      style={{ color: "#e2e8f0" }}
                      onClick={goProfile}
                    >
                      User Profile
                    </button>
                    <div
                      className="dropdown-divider"
                      style={{ borderTopColor: "rgba(255,255,255,0.08)" }}
                    />
                    <button
                      className="dropdown-item text-warning"
                      onClick={() => {
                        logout().finally(() => {
                          closeMobile();
                          navigate("/login");
                          scrollTopSmooth();
                        });
                      }}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ===== Mobile quick links (≤991px) ===== */}
          <div className="mobile-top d-block d-lg-none mb-3">
            <div className="d-flex flex-column gap-2 px-2">
              <form className="input-group input-group-sm" onSubmit={submitSearch}>
                <input
                  type="search"
                  className="form-control"
                  placeholder="Search..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button className="btn btn-outline-secondary" type="submit">
                  Go
                </button>
              </form>

              <div className="d-flex justify-content-end">
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => alert("No notifications")}
                  type="button"
                >
                  🔔 Notifications
                </button>
              </div>

              <hr className="d-lg-none" />
            </div>
          </div>

          {/* ===== Main nav ===== */}
          <ul className="navbar-nav">
            {canView("Dashboard") && (
              <li className="nav-item">
                <NavLink to="/" className="nav-link" title="Dash Board" onClick={onNavClick}>
                  <img src={home} alt="" /> Dash Board
                </NavLink>
              </li>
            )}

            {canView("Investments") && (
              <li className="nav-item">
                <NavLink to="Investments" className="nav-link" title="Investments" onClick={onNavClick}>
                  <img src={invest} alt="" /> Investments
                </NavLink>
              </li>
            )}

            <hr />

            {/* ---- Staff section (force-visible for admin/manager) ---- */}
            {canSeeStaffSection && (
              <>
                <li className="nav-item">
                  <NavLink to="StaffData" className="nav-link" title="Staff" onClick={onNavClick}>
                    <img src={Staff} alt="" /> Staff
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="ExistingStaff" className="nav-link" title="Exist Staff" onClick={onNavClick}>
                    <img src={StaffExit} alt="" /> Exist Staff
                  </NavLink>
                </li>
                <hr />
              </>
            )}

            {canView("Workers Data") && (
              <>
                <li className="nav-item">
                  <NavLink to="WorkersData" className="nav-link" title="Worker Data" onClick={onNavClick}>
                    <img src={workerData} alt="" /> Worker Data
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink
                    to="ExistingEmployees"
                    className="nav-link"
                    title="Existing Workers"
                    onClick={onNavClick}
                  >
                    <img src={workerExit} alt="Worker Exit" /> Exit Worker
                  </NavLink>
                </li>
                {canView("Worker Call Data") && (
                  <>
                    <li className="nav-item">
                      <NavLink
                        to="WorkerCallsData"
                        className="nav-link"
                        title="Worker Call Data"
                        onClick={onNavClick}
                      >
                        <img src={call} alt="Worker Call Data" /> Worker Call Data
                      </NavLink>
                    </li>
                    <li className="nav-item">
                      <NavLink
                        to="WorkerCallDelete"
                        className="nav-link"
                        title="Worker Call Delete"
                        onClick={onNavClick}
                      >
                        <img src={callDelete} alt="" /> Worker Call Delete
                      </NavLink>
                    </li>
                  </>
                )}
                <li className="nav-item">
                  <NavLink to="EmployeeAggrement" className="nav-link" title="Worker Aggrement" onClick={onNavClick}>
                    <img src={WorkerAggrement} alt="" /> Worker Aggremnt
                  </NavLink>
                </li>
                <hr />
              </>
            )}

            {canView("Client Data") && (
              <>
                <li className="nav-item">
                  <NavLink to="ClientInfo" className="nav-link" title="ClientInfo" onClick={onNavClick}>
                    <img src={client} alt="" /> Client Data
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="ClientExit" className="nav-link" title="ClientExit" onClick={onNavClick}>
                    <img src={ClientExitIcon} alt="" /> ClientExit
                  </NavLink>
                </li>
              </>
            )}

            {canView("Enquiries") && (
              <>
                <li className="nav-item">
                  <NavLink to="Enquiry" className="nav-link" title="Enquiry" onClick={onNavClick}>
                    <img src={inquiry} alt="" /> Enquiry
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="EnquiryExit" className="nav-link" title="Old Enquirys" onClick={onNavClick}>
                    <img src={inquiryDelete} alt="" /> Old Enquiry
                  </NavLink>
                </li>
                <hr />
              </>
            )}

            {canView("Hospital List") && (
              <>
                <li className="nav-item">
                  <NavLink to="HospitalList" className="nav-link" title="Hospital List" onClick={onNavClick}>
                    <img src={HospitalIcon} alt="" /> Hospital List
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink
                    to="HospitalDeleteList"
                    className="nav-link"
                    title="Deleted Hospital"
                    onClick={onNavClick}
                  >
                    <img src={HospitalDeleteIcon} alt="" /> Deleted Hospitals
                  </NavLink>
                </li>
              </>
            )}

            {canView("Expenses") && (
              <>
                <li className="nav-item">
                  <NavLink to="Expenses" className="nav-link" title="Expenses" onClick={onNavClick}>
                    <img src={accounts} alt="" /> Petty Cash
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="ExpenceDelete" className="nav-link" title="Delete Expenses" onClick={onNavClick}>
                    <img src={expences} alt="" /> Delete Petty Cash
                  </NavLink>
                </li>
                <hr />
              </>
            )}

            {canView("Task") && (
              <li className="nav-item">
                <NavLink to="Task" className="nav-link" title="Task" onClick={onNavClick}>
                  <img src={task} alt="" /> Task
                </NavLink>
              </li>
            )}

            {(canView("Admin") || isAdmin) && (
              <li className="nav-item">
                <NavLink to="Admin" className="nav-link" title="Admin" onClick={onNavClick}>
                  <img src={admin} alt="" /> Admin
                </NavLink>
              </li>
            )}

            {canView("Accounts") && (
              <li className="nav-item">
                <NavLink to="Accounts" className="nav-link" title="Accounts" onClick={onNavClick}>
                  <img src={accounts} alt="" /> Accounts
                </NavLink>
              </li>
            )}
          </ul>
        </div>
      </nav>

      {/* ===== Routes with permission guards ===== */}
      <Routes>
        <Route
          path="/"
          element={
            <PermRoute permKey="Dashboard">
              <Dashboard />
            </PermRoute>
          }
        />

        {/* Workers */}
        <Route
          path="WorkersData"
          element={
            <PermRoute permKey="Workers Data">
              <WorkersData />
            </PermRoute>
          }
        />
        <Route
          path="ExistingEmployees"
          element={
            <PermRoute permKey="Workers Data">
              <ExistingEmployees />
            </PermRoute>
          }
        />
        <Route
          path="EmployeeAggrement"
          element={
            <PermRoute permKey="Workers Data">
              <EmployeeAggrement />
            </PermRoute>
          }
        />

        {/* Staff pages (guard them by 'Staff' key OR role) */}
        <Route
          path="StaffData"
          element={
            (isAdmin || isManager || canView("Staff")) ? <WorkersData /> : <Navigate to="/" replace />
          }
        />
        <Route
          path="ExistingStaff"
          element={
            (isAdmin || isManager || canView("Staff")) ? <ExistingEmployees /> : <Navigate to="/" replace />
          }
        />

        <Route
          path="WorkerCallsData"
          element={
            <PermRoute permKey="Worker Call Data">
              <WorkerCallsData />
            </PermRoute>
          }
        />
        <Route
          path="WorkerCallDelete"
          element={
            <PermRoute permKey="Worker Call Data">
              <WorkerCallDelete />
            </PermRoute>
          }
        />

        <Route
          path="Investments"
          element={
            <PermRoute permKey="Investments">
              <Investments />
            </PermRoute>
          }
        />

        <Route
          path="ClientInfo"
          element={
            <PermRoute permKey="Client Data">
              <ClientInfo />
            </PermRoute>
          }
        />
        <Route
          path="ClientExit"
          element={
            <PermRoute permKey="Client Data">
              <ClientExit />
            </PermRoute>
          }
        />

        <Route
          path="Enquiry"
          element={
            <PermRoute permKey="Enquiries">
              <Enquiry />
            </PermRoute>
          }
        />
        <Route
          path="EnquiryExit"
          element={
            <PermRoute permKey="Enquiries">
              <EnquiryExit />
            </PermRoute>
          }
        />

        <Route
          path="Expenses"
          element={
            <PermRoute permKey="Expenses">
              <Expenses />
            </PermRoute>
          }
        />
        <Route
          path="ExpenceDelete"
          element={
            <PermRoute permKey="Expenses">
              <ExpenceDelete />
            </PermRoute>
          }
        />

        <Route
          path="Task"
          element={
            <PermRoute permKey="Task">
              <Task />
            </PermRoute>
          }
        />
        <Route
          path="Accounts"
          element={
            <PermRoute permKey="Accounts">
              <Accounts />
            </PermRoute>
          }
        />

        <Route
          path="HospitalList"
          element={
            <PermRoute permKey="Hospital List">
              <HospitalList />
            </PermRoute>
          }
        />
        <Route
          path="HospitalDeleteList"
          element={
            <PermRoute permKey="Hospital List">
              <HospitalDeleteList />
            </PermRoute>
          }
        />

        <Route path="search" element={<SearchResults />} />
        <Route
          path="Admin"
          element={
            <PermRoute permKey="Admin">
              <AdminUsers />
            </PermRoute>
          }
        />
      </Routes>
    </>
  );
}
