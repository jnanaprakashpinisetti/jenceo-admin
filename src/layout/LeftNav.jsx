// src/layout/LeftNav.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Routes,
  Route,
  NavLink,
  useLocation,
  useNavigate,
  Navigate,
} from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// —— Brand & UI assets
import logo from "../assets/jencio-logo.svg";
import logoicon from "../assets/jenceo-icon.svg";
import toggle from "../assets/toggle.svg";
import close from "../assets/close.svg";
// import arrow from "../assets/arrow.svg"; // (optional) was used for a collapsed sidebar button

// —— Menu icons
import home from "../assets/home.svg";
import invest from "../assets/invest.svg";
import accounts from "../assets/accounts.svg";
import admin from "../assets/admin.svg";
import task from "../assets/task.svg";

import workerData from "../assets/workers-data.svg";
import workerExit from "../assets/worker-exit.svg";
import WorkerAggrement from "../assets/workers-aggrement.svg";
import call from "../assets/Call.svg";
import callDelete from "../assets/CallDelete.svg";

import Staff from "../assets/Staff.svg";
import StaffExit from "../assets/StaffExit.svg";

import client from "../assets/client.svg";
import ClientExitIcon from "../assets/client-exit.svg";

import inquiry from "../assets/inquiry.svg";
import inquiryDelete from "../assets/inquiryDelete.svg";

import HospitalIcon from "../assets/hospital-icon.svg";
import HospitalDeleteIcon from "../assets/hospital-delet-icon.svg";

import expences from "../assets/expence.svg";

// —— Pages
import Dashboard from "../pages/Dashboard";
import Investments from "../pages/Investments";

import StaffData from "../pages/StaffData";
import ExistingStaff from "../pages/ExistingStaff";

import WorkersData from "../pages/WorkersData";
import ExistingEmployees from "../pages/ExistingWorker";
import EmployeeAggrement from "../pages/WorkerAggrement";
import WorkerCallsData from "../pages/WorkerCallsData";
import WorkerCallDelete from "../pages/WorkerCallDelete";

import ClientInfo from "../pages/ClientInfo";
import ClientExit from "../pages/ClientExit";

import Enquiry from "../pages/Enquiry";
import EnquiryExit from "../pages/EnquiryExit";

import HospitalList from "../pages/HospitalList";
import HospitalDeleteList from "../pages/HospitalDeleteList";

import Expenses from "../pages/Expenses";
import ExpenceDelete from "../pages/ExpenceDelete";

import Task from "../pages/Task";
import AdminUsers from "../pages/AdminUsers";
import Accounts from "../pages/Accounts";
import SearchResults from "../pages/SearchResults";
import Profile from "../pages/Profile";

// FIXED: Move PermRoute outside the component to prevent re-renders
const PermRoute = ({ allowed, children }) => {
  return allowed ? children : <Navigate to="/" replace />;
};

export default function LeftNav() {
  // 🔗 Global auth only
  const { user, logout } = useAuth();

  // ---- role & permissions from global user ----
  const perms = user?.permissions || {};
  const roleStr = String(user?.role || "").trim().toLowerCase();
  const isAdmin = /^(admin|administrator|superadmin)$/.test(roleStr);
  const isManager = /^(manager|managers|mgr)$/.test(roleStr);

  // FIXED: Use useCallback to memoize the hasPerm function
  const hasPerm = useCallback((keys = []) => {
    if (isAdmin || isManager) return true;
    return keys.some((k) => {
      const p = perms?.[k];
      return p === true || p?.view === true || p?.read === true;
    });
  }, [isAdmin, isManager, perms]);

  // Dashboard & core
  const canDashboard = hasPerm(["Dashboard"]);
  const canInvestments = hasPerm(["Investments"]);
  const canTask = hasPerm(["Task"]);
  const canAccounts = hasPerm(["Accounts"]);
  const canAdmin = hasPerm(["Admin"]);

  // Staff
  const canStaffData = isAdmin || isManager || hasPerm(["Staff", "Staff Data", "StaffData"]);
  const canExistingStaff = isAdmin || isManager || hasPerm(["Existing Staff", "ExistingStaff", "Staff Exit", "Exist Staff"]);

  // Workers
  const canWorkersData = hasPerm(["Workers Data", "Worker Data", "Workers"]);
  const canExistingWorkers = hasPerm(["Existing Workers", "ExistingEmployees", "Exit Worker", "Existing Worker"]);
  const canWorkerAgreement = hasPerm(["Worker Agreement", "Worker Aggrement", "Employee Aggrement"]);
  const canWorkerCallData = hasPerm(["Worker Call Data", "Worker Calls"]);
  const canWorkerCallDelete = hasPerm(["Worker Call Delete", "Worker Call Remove"]);

  // Client
  const canClientData = hasPerm(["Client Data", "ClientInfo", "Clients"]);
  const canClientExit = hasPerm(["Client Exit", "ClientExit"]);

  // Enquiry
  const canEnquiry = hasPerm(["Enquiries", "Enquiry"]);
  const canEnquiryExit = hasPerm(["Enquiry Exit", "EnquiryExit", "Old Enquiries"]);

  // Hospital
  const canHospitalList = hasPerm(["Hospital List", "Hospitals"]);
  const canHospitalDeleteList = hasPerm(["Hospital Delete List", "HospitalDeleteList", "Deleted Hospitals"]);

  // Expenses
  const canExpenses = hasPerm(["Expenses", "Petty Cash"]);
  const canExpenceDelete = hasPerm(["Expence Delete", "Delete Expenses", "Delete Petty Cash"]);

  // ---- UI state ----
  const [isActive, setIsActive] = useState(false); // (kept if you later want a desktop collapse)
  const [isShow, setIsShow] = useState(false); // mobile menu
  const [query, setQuery] = useState("");

  // collapsible groups
  const [open, setOpen] = useState({
    management: true,
    staff: true,
    workers: true,
    client: true,
    enquiry: false,
    hospital: false,
    expenses: false,
    admin: false,
  });

  const toggleGroup = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  // user dropdown (mobile)
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  const userMenuBtnRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();

  // login time
  const [loginAt] = useState(() => {
    const stored = sessionStorage.getItem("loginAt");
    if (stored) return Number(stored);
    const t = Date.now();
    sessionStorage.setItem("loginAt", String(t));
    return t;
  });

  useEffect(() => {
    setIsShow(false);
    setShowUserMenu(false);
  }, [location.pathname]);

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
    navigate({ pathname: "/search", search: params.toString() ? `?${params.toString()}` : "" });
    scrollTopSmooth();
  };

  const toggleSide = () => setIsActive((v) => !v);
  const toggleMobile = () => setIsShow((v) => !v);
  const closeMobile = () => setIsShow(false);

  const collapseClass = `collapse navbar-collapse${isShow ? " show" : ""}`;

  // Pull display fields from global auth
  const userName = user?.name || user?.email || "User";
  const userRole = user?.role || "Member";
  const avatarUrl = user?.photoURL || "";

  const onNavClick = () => {
    closeMobile();
    scrollTopSmooth();
  };
  const goProfile = () => {
    navigate("/profile");
    onNavClick();
  };

  const Group = ({ k, label, children, when }) => {
    if (!when) return null;
    return (
      <>
        <li className="nav-item">
          <button
            className="groupBtn btn btn-sm"
            onClick={() => setOpen((o) => ({ ...o, [k]: !o[k] }))}
            type="button"
          >
            <span>{label}</span>
            <span style={{ opacity: 0.7 }}>{open[k] ? "▾" : "▸"}</span>
          </button>
        </li>
        {open[k] && <div className="mt-2" />}
        {open[k] && children}
        <hr className="mt-3" />
      </>
    );
  };

  return (
    <>
      {/* Add 'mobilActive' class based on your existing isShow toggle */}
      <nav className={`navbar navbar-expand-lg leftNav ${isShow ? "mobilActive" : ""}`}>
        <button type="button" className="navbar-brand" onClick={() => {}}>
          <img src={isActive ? logoicon : logo} alt="JenCeo Logo" />
        </button>

        {/* Optional desktop collapse button you had commented earlier */}
        {/* <button className="slide" type="button" onClick={toggleSide} aria-label="Toggle sidebar" title="Collapse sidebar">
          <img src={arrow} alt="arrow" />
        </button> */}

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
          {/* ===== Mobile header bar ===== */}
          <div
            className="d-block d-lg-none mb-2"
            style={{
              background: "#0b1220",
              color: "#e2e8f0",
              padding: "10px 12px",
              borderRadius: 10,
              position: "sticky",
              top: 0,
              zIndex: 2,
            }}
          >
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="User"
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "2px solid #fff",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      background: "#1e293b",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#e2e8f0",
                      fontWeight: "bold",
                      fontSize: 14,
                    }}
                  >
                    {String(userName || "U").slice(0, 1).toUpperCase()}
                  </div>
                )}

                <div className="d-flex flex-column">
                  <strong style={{ lineHeight: 1 }}>{userName}</strong>
                  <small className="text-secondary" style={{ lineHeight: 1 }}>
                    {userRole}
                  </small>
                  <small className="text-muted" style={{ lineHeight: 1 }}>
                    Login: {new Date(loginAt).toLocaleTimeString()}
                  </small>
                </div>
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
                      background: "#0f172a",
                      color: "#e2e8f0",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10,
                      boxShadow: "0 10px 20px rgba(2,8,23,0.35), 0 2px 6px rgba(2,8,23,0.25)",
                      overflow: "hidden",
                      zIndex: 5,
                    }}
                  >
                    <button className="dropdown-item" style={{ color: "#e2e8f0" }} onClick={goProfile}>
                      User Profile
                    </button>
                    <div className="dropdown-divider" style={{ borderTopColor: "rgba(255,255,255,0.08)" }} />
                    <button
                      className="dropdown-item text-danger"
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

          {/* ===== Mobile quick links ===== */}
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

          {/* ===== Main nav (grouped) ===== */}
          <ul className="navbar-nav" style={{ width: "100%" }}>
            {/* Management */}
            {(canAdmin || canDashboard || canInvestments) && (
              <>
                <li className="nav-item">
                  <button className="groupBtn btn btn-sm" onClick={() => toggleGroup("management")} type="button">
                    <span>Management</span>
                    <span style={{ opacity: 0.7 }}>{open.management ? "▾" : "▸"}</span>
                  </button>
                </li>
                {open.management && <div className="mt-2" />}
                {open.management && (
                  <>
                    {(canAdmin || isAdmin) && (
                      <li className="nav-item">
                        <NavLink to="Admin" className="nav-link" title="Admin" onClick={onNavClick}>
                          <img src={admin} alt="" /> <span className="ms-1">Admin</span>
                        </NavLink>
                      </li>
                    )}
                    {canDashboard && (
                      <li className="nav-item">
                        <NavLink to="/" className="nav-link" title="Dashboard" onClick={onNavClick}>
                          <img src={home} alt="" /> <span className="ms-1">Dashboard</span>
                        </NavLink>
                      </li>
                    )}
                    {canInvestments && (
                      <li className="nav-item">
                        <NavLink to="Investments" className="nav-link" title="Investments" onClick={onNavClick}>
                          <img src={invest} alt="" /> <span className="ms-1">Investments</span>
                        </NavLink>
                      </li>
                    )}
                  </>
                )}
                <hr className="mt-3" />
              </>
            )}

            {/* Staff */}
            {(canStaffData || canExistingStaff) && (
              <>
                <li className="nav-item">
                  <button className="groupBtn btn btn-sm" onClick={() => toggleGroup("staff")} type="button">
                    <span>Staff</span>
                    <span style={{ opacity: 0.7 }}>{open.staff ? "▾" : "▸"}</span>
                  </button>
                </li>
                {open.staff && <div className="mt-2" />}
                {open.staff && (
                  <>
                    {canStaffData && (
                      <li className="nav-item">
                        <NavLink to="StaffData" className="nav-link" title="Staff" onClick={onNavClick}>
                          <img src={Staff} alt="" /> <span className="ms-1">Staff</span>
                        </NavLink>
                      </li>
                    )}
                    {canExistingStaff && (
                      <li className="nav-item">
                        <NavLink to="ExistingStaff" className="nav-link" title="Existing Staff" onClick={onNavClick}>
                          <img src={StaffExit} alt="" /> <span className="ms-1">Existing Staff</span>
                        </NavLink>
                      </li>
                    )}
                  </>
                )}
                <hr className="mt-3" />
              </>
            )}

            {/* Workers */}
            {(canWorkersData || canExistingWorkers || canWorkerAgreement || canWorkerCallData || canWorkerCallDelete) && (
              <>
                <li className="nav-item">
                  <button className="groupBtn btn btn-sm" onClick={() => toggleGroup("workers")} type="button">
                    <span>Workers</span>
                    <span style={{ opacity: 0.7 }}>{open.workers ? "▾" : "▸"}</span>
                  </button>
                </li>
                {open.workers && <div className="mt-2" />}
                {open.workers && (
                  <>
                    {canWorkersData && (
                      <li className="nav-item">
                        <NavLink to="WorkersData" className="nav-link" title="Worker Data" onClick={onNavClick}>
                          <img src={workerData} alt="" /> <span className="ms-1">Worker Data</span>
                        </NavLink>
                      </li>
                    )}
                    {canExistingWorkers && (
                      <li className="nav-item">
                        <NavLink to="ExistingEmployees" className="nav-link" title="Existing Workers" onClick={onNavClick}>
                          <img src={workerExit} alt="" /> <span className="ms-1">Exit Worker</span>
                        </NavLink>
                      </li>
                    )}
                    {canWorkerCallData && (
                      <li className="nav-item">
                        <NavLink to="WorkerCallsData" className="nav-link" title="Worker Call Data" onClick={onNavClick}>
                          <img src={call} alt="" /> <span className="ms-1">Worker Call Data</span>
                        </NavLink>
                      </li>
                    )}
                    {canWorkerCallDelete && (
                      <li className="nav-item">
                        <NavLink to="WorkerCallDelete" className="nav-link" title="Worker Call Delete" onClick={onNavClick}>
                          <img src={callDelete} alt="" /> <span className="ms-1">Worker Call Delete</span>
                        </NavLink>
                      </li>
                    )}
                    {canWorkerAgreement && (
                      <li className="nav-item">
                        <NavLink to="EmployeeAggrement" className="nav-link" title="Worker Agreement" onClick={onNavClick}>
                          <img src={WorkerAggrement} alt="" /> <span className="ms-1">Worker Agreement</span>
                        </NavLink>
                      </li>
                    )}
                  </>
                )}
                <hr className="mt-3" />
              </>
            )}

            {/* Client */}
            {(canClientData || canClientExit) && (
              <>
                <li className="nav-item">
                  <button className="groupBtn btn btn-sm" onClick={() => toggleGroup("client")} type="button">
                    <span>Client</span>
                    <span style={{ opacity: 0.7 }}>{open.client ? "▾" : "▸"}</span>
                  </button>
                </li>
                {open.client && <div className="mt-2" />}
                {open.client && (
                  <>
                    {canClientData && (
                      <li className="nav-item">
                        <NavLink to="ClientInfo" className="nav-link" title="Client Data" onClick={onNavClick}>
                          <img src={client} alt="" /> <span className="ms-1">Client Data</span>
                        </NavLink>
                      </li>
                    )}
                    {canClientExit && (
                      <li className="nav-item">
                        <NavLink to="ClientExit" className="nav-link" title="Client Exit" onClick={onNavClick}>
                          <img src={ClientExitIcon} alt="" /> <span className="ms-1">Client Exit</span>
                        </NavLink>
                      </li>
                    )}
                  </>
                )}
                <hr className="mt-3" />
              </>
            )}

            {/* Enquiry */}
            {(canEnquiry || canEnquiryExit) && (
              <>
                <li className="nav-item">
                  <button className="groupBtn btn btn-sm" onClick={() => toggleGroup("enquiry")} type="button">
                    <span>Enquiry</span>
                    <span style={{ opacity: 0.7 }}>{open.enquiry ? "▾" : "▸"}</span>
                  </button>
                </li>
                {open.enquiry && <div className="mt-2" />}
                {open.enquiry && (
                  <>
                    {canEnquiry && (
                      <li className="nav-item">
                        <NavLink to="Enquiry" className="nav-link" title="Enquiry" onClick={onNavClick}>
                          <img src={inquiry} alt="" /> <span className="ms-1">Enquiry</span>
                        </NavLink>
                      </li>
                    )}
                    {canEnquiryExit && (
                      <li className="nav-item">
                        <NavLink to="EnquiryExit" className="nav-link" title="Old Enquiry" onClick={onNavClick}>
                          <img src={inquiryDelete} alt="" /> <span className="ms-1">Old Enquiry</span>
                        </NavLink>
                      </li>
                    )}
                  </>
                )}
                <hr className="mt-3" />
              </>
            )}

            {/* Hospital */}
            {(canHospitalList || canHospitalDeleteList) && (
              <>
                <li className="nav-item">
                  <button className="groupBtn btn btn-sm" onClick={() => toggleGroup("hospital")} type="button">
                    <span>Hospital</span>
                    <span style={{ opacity: 0.7 }}>{open.hospital ? "▾" : "▸"}</span>
                  </button>
                </li>
                {open.hospital && <div className="mt-2" />}
                {open.hospital && (
                  <>
                    {canHospitalList && (
                      <li className="nav-item">
                        <NavLink to="HospitalList" className="nav-link" title="Hospital List" onClick={onNavClick}>
                          <img src={HospitalIcon} alt="" /> <span className="ms-1">Hospital List</span>
                        </NavLink>
                      </li>
                    )}
                    {canHospitalDeleteList && (
                      <li className="nav-item">
                        <NavLink to="HospitalDeleteList" className="nav-link" title="Deleted Hospitals" onClick={onNavClick}>
                          <img src={HospitalDeleteIcon} alt="" /> <span className="ms-1">Deleted Hospitals</span>
                        </NavLink>
                      </li>
                    )}
                  </>
                )}
                <hr className="mt-3" />
              </>
            )}

            {/* Expenses */}
            {(canExpenses || canExpenceDelete) && (
              <>
                <li className="nav-item">
                  <button className="groupBtn btn btn-sm" onClick={() => toggleGroup("expenses")} type="button">
                    <span>Expenses</span>
                    <span style={{ opacity: 0.7 }}>{open.expenses ? "▾" : "▸"}</span>
                  </button>
                </li>
                {open.expenses && <div className="mt-2" />}
                {open.expenses && (
                  <>
                    {canExpenses && (
                      <li className="nav-item">
                        <NavLink to="Expenses" className="nav-link" title="Expenses" onClick={onNavClick}>
                          <img src={accounts} alt="" /> <span className="ms-1">Petty Cash</span>
                        </NavLink>
                      </li>
                    )}
                    {canExpenceDelete && (
                      <li className="nav-item">
                        <NavLink to="ExpenceDelete" className="nav-link" title="Delete Petty Cash" onClick={onNavClick}>
                          <img src={expences} alt="" /> <span className="ms-1">Delete Petty Cash</span>
                        </NavLink>
                      </li>
                    )}
                  </>
                )}
                <hr className="mt-3" />
              </>
            )}

            {/* Productivity */}
            {canTask && (
              <>
                <li className="nav-item mt-2 mb-1 text-uppercase small text-muted px-2">Productivity</li>
                <li className="nav-item">
                  <NavLink to="Task" className="nav-link" title="Task" onClick={onNavClick}>
                    <img src={task} alt="" /> <span className="ms-1">Task</span>
                  </NavLink>
                </li>
              </>
            )}

            {/* Finance */}
            {canAccounts && (
              <>
                <li className="nav-item mt-2 mb-1 text-uppercase small text-muted px-2">Finance</li>
                <li className="nav-item">
                  <NavLink to="Accounts" className="nav-link" title="Accounts" onClick={onNavClick}>
                    <img src={accounts} alt="" /> <span className="ms-1">Accounts</span>
                  </NavLink>
                </li>
              </>
            )}
          </ul>
        </div>
      </nav>

      {/* ===== Routes with guards ===== */}
      <Routes>
        <Route path="/" element={<PermRoute allowed={canDashboard}><Dashboard /></PermRoute>} />

        {/* Staff */}
        <Route path="StaffData" element={<PermRoute allowed={canStaffData}><StaffData /></PermRoute>} />
        <Route path="ExistingStaff" element={<PermRoute allowed={canExistingStaff}><ExistingStaff /></PermRoute>} />

        {/* Workers */}
        <Route path="WorkersData" element={<PermRoute allowed={canWorkersData}><WorkersData /></PermRoute>} />
        <Route path="ExistingEmployees" element={<PermRoute allowed={canExistingWorkers}><ExistingEmployees /></PermRoute>} />
        <Route path="EmployeeAggrement" element={<PermRoute allowed={canWorkerAgreement}><EmployeeAggrement /></PermRoute>} />
        <Route path="WorkerCallsData" element={<PermRoute allowed={canWorkerCallData}><WorkerCallsData /></PermRoute>} />
        <Route path="WorkerCallDelete" element={<PermRoute allowed={canWorkerCallDelete}><WorkerCallDelete /></PermRoute>} />

        {/* Investments */}
        <Route path="Investments" element={<PermRoute allowed={canInvestments}><Investments /></PermRoute>} />

        {/* Client */}
        <Route path="ClientInfo" element={<PermRoute allowed={canClientData}><ClientInfo /></PermRoute>} />
        <Route path="ClientExit" element={<PermRoute allowed={canClientExit}><ClientExit /></PermRoute>} />

        {/* Enquiry */}
        <Route path="Enquiry" element={<PermRoute allowed={canEnquiry}><Enquiry /></PermRoute>} />
        <Route path="EnquiryExit" element={<PermRoute allowed={canEnquiryExit}><EnquiryExit /></PermRoute>} />

        {/* Expenses */}
        <Route path="Expenses" element={<PermRoute allowed={canExpenses}><Expenses /></PermRoute>} />
        <Route path="ExpenceDelete" element={<PermRoute allowed={canExpenceDelete}><ExpenceDelete /></PermRoute>} />

        {/* Task / Accounts / Hospital / Admin */}
        <Route path="Task" element={<PermRoute allowed={canTask}><Task /></PermRoute>} />
        <Route path="Accounts" element={<PermRoute allowed={canAccounts}><Accounts /></PermRoute>} />
        <Route path="HospitalList" element={<PermRoute allowed={canHospitalList}><HospitalList /></PermRoute>} />
        <Route path="HospitalDeleteList" element={<PermRoute allowed={canHospitalDeleteList}><HospitalDeleteList /></PermRoute>} />
        <Route path="search" element={<SearchResults />} />
        <Route path="Admin" element={<PermRoute allowed={canAdmin || isAdmin}><AdminUsers /></PermRoute>} />
        <Route path="profile" element={<Profile />} />
      </Routes>
    </>
  );
}