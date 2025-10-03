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
// Employee/Worker
import WorkersData from "../pages/WorkersData";
import EmployeeAggrement from "../pages/WorkerAggrement";
import ExistingEmployees from "../pages/ExistingWorker";

// Staff (reusing worker pages as before)
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

  // ---- permission helpers ----
  // Accepts multiple keys; supports boolean or {view/read}
  const hasPerm = (keys = []) => {
    if (isAdmin || isManager) return true;
    return keys.some((k) => {
      const p = perms?.[k];
      return p === true || p?.view === true || p?.read === true;
    });
  };

  // Granular access for EVERY item (aliases kept for backward-compat)
  const canDashboard           = hasPerm(["Dashboard"]);
  const canInvestments         = hasPerm(["Investments"]);

  // Staff (explicit OR via workers block + role fallback)
  const canStaffData           = isAdmin || isManager || hasPerm(["Staff", "Staff Data", "StaffData"]);
  const canExistingStaff       = isAdmin || isManager || hasPerm(["Existing Staff", "ExistingStaff", "Staff Exit", "Exist Staff"]);

  // Workers group (each separated)
  const canWorkersData         = hasPerm(["Workers Data", "Worker Data", "Workers"]);
  const canExistingWorkers     = hasPerm(["Existing Workers", "ExistingEmployees", "Exit Worker", "Existing Worker"]);
  const canWorkerAgreement     = hasPerm(["Worker Agreement", "Worker Aggrement", "Employee Aggrement"]);
  const canWorkerCallData      = hasPerm(["Worker Call Data", "Worker Calls"]);
  const canWorkerCallDelete    = hasPerm(["Worker Call Delete", "Worker Call Remove"]);

  // Client
  const canClientData          = hasPerm(["Client Data", "ClientInfo", "Clients"]);
  const canClientExit          = hasPerm(["Client Exit", "ClientExit"]);

  // Enquiry
  const canEnquiry             = hasPerm(["Enquiries", "Enquiry"]);
  const canEnquiryExit         = hasPerm(["Enquiry Exit", "EnquiryExit", "Old Enquiries"]);

  // Hospital
  const canHospitalList        = hasPerm(["Hospital List", "Hospitals"]);
  const canHospitalDeleteList  = hasPerm(["Hospital Delete List", "HospitalDeleteList", "Deleted Hospitals"]);

  // Expenses
  const canExpenses            = hasPerm(["Expenses", "Petty Cash"]);
  const canExpenceDelete       = hasPerm(["Expence Delete", "Delete Expenses", "Delete Petty Cash"]);

  // Task / Accounts / Admin
  const canTask                = hasPerm(["Task"]);
  const canAccounts            = hasPerm(["Accounts"]);
  const canAdmin               = hasPerm(["Admin"]);

  // ---- route guard ----
  const PermRoute = ({ allowed, children }) => {
    return allowed ? children : <Navigate to="/" replace />;
  };

  // ---- UI state ----
  const [isActive, setIsActive] = useState(false);  // sidebar collapse
  const [isShow, setIsShow] = useState(false);      // mobile menu show
  const [query, setQuery] = useState("");

  // mobile user dropdown
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
    // close mobile & dropdown on route change
    setIsShow(false);
    setShowUserMenu(false);
  }, [location.pathname]);

  useEffect(() => {
    // outside click for mobile dropdown
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

  // Do NOT make left nav scroll; keep container simple
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
      <nav className={isActive ? "navbar navbar-expand-lg toggle" : "navbar navbar-expand-lg"}>
        <button type="button" className="navbar-brand" onClick={() => {}}>
          <img src={isActive ? logoicon : logo} alt="JenCeo Logo" />
        </button>

        <button className="slide" type="button" onClick={toggleSide} aria-label="Toggle sidebar">
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
          {/* ===== Mobile header bar (sticky, no left-nav scroll) ===== */}
          <div
            className="d-block d-lg-none mb-2"
            style={{
              background: "#0b1220",
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
                      background: "#0f172a",
                      color: "#e2e8f0",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 8,
                      boxShadow:
                        "0 10px 20px rgba(2, 8, 23, 0.35), 0 2px 6px rgba(2, 8, 23, 0.25)",
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

          {/* ===== Main nav (granular permissions) ===== */}
          <ul className="navbar-nav">
            {canDashboard && (
              <li className="nav-item">
                <NavLink to="/" className="nav-link" title="Dash Board" onClick={onNavClick}>
                  <img src={home} alt="" /> Dash Board
                </NavLink>
              </li>
            )}

            {canInvestments && (
              <li className="nav-item">
                <NavLink to="Investments" className="nav-link" title="Investments" onClick={onNavClick}>
                  <img src={invest} alt="" /> Investments
                </NavLink>
              </li>
            )}

            {(canDashboard || canInvestments) && <hr />}

            {/* ---- Staff (independent of worker permissions) ---- */}
            {(canStaffData || canExistingStaff) && (
              <>
                {canStaffData && (
                  <li className="nav-item">
                    <NavLink to="StaffData" className="nav-link" title="Staff" onClick={onNavClick}>
                      <img src={Staff} alt="" /> Staff
                    </NavLink>
                  </li>
                )}
                {canExistingStaff && (
                  <li className="nav-item">
                    <NavLink to="ExistingStaff" className="nav-link" title="Exist Staff" onClick={onNavClick}>
                      <img src={StaffExit} alt="" /> Exist Staff
                    </NavLink>
                  </li>
                )}
                <hr />
              </>
            )}

            {/* ---- Workers (each item controlled separately) ---- */}
            {(canWorkersData ||
              canExistingWorkers ||
              canWorkerCallData ||
              canWorkerCallDelete ||
              canWorkerAgreement) && (
              <>
                {canWorkersData && (
                  <li className="nav-item">
                    <NavLink to="WorkersData" className="nav-link" title="Worker Data" onClick={onNavClick}>
                      <img src={workerData} alt="" /> Worker Data
                    </NavLink>
                  </li>
                )}

                {canExistingWorkers && (
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
                )}

                {canWorkerCallData && (
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
                )}

                {canWorkerCallDelete && (
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
                )}

                {canWorkerAgreement && (
                  <li className="nav-item">
                    <NavLink
                      to="EmployeeAggrement"
                      className="nav-link"
                      title="Worker Agreement"
                      onClick={onNavClick}
                    >
                      <img src={WorkerAggrement} alt="" /> Worker Aggremnt
                    </NavLink>
                  </li>
                )}
                <hr />
              </>
            )}

            {/* ---- Client ---- */}
            {(canClientData || canClientExit) && (
              <>
                {canClientData && (
                  <li className="nav-item">
                    <NavLink to="ClientInfo" className="nav-link" title="ClientInfo" onClick={onNavClick}>
                      <img src={client} alt="" /> Client Data
                    </NavLink>
                  </li>
                )}
                {canClientExit && (
                  <li className="nav-item">
                    <NavLink to="ClientExit" className="nav-link" title="ClientExit" onClick={onNavClick}>
                      <img src={ClientExitIcon} alt="" /> ClientExit
                    </NavLink>
                  </li>
                )}
                <hr />
              </>
            )}

            {/* ---- Enquiry ---- */}
            {(canEnquiry || canEnquiryExit) && (
              <>
                {canEnquiry && (
                  <li className="nav-item">
                    <NavLink to="Enquiry" className="nav-link" title="Enquiry" onClick={onNavClick}>
                      <img src={inquiry} alt="" /> Enquiry
                    </NavLink>
                  </li>
                )}
                {canEnquiryExit && (
                  <li className="nav-item">
                    <NavLink to="EnquiryExit" className="nav-link" title="Old Enquirys" onClick={onNavClick}>
                      <img src={inquiryDelete} alt="" /> Old Enquiry
                    </NavLink>
                  </li>
                )}
                <hr />
              </>
            )}

            {/* ---- Hospital ---- */}
            {(canHospitalList || canHospitalDeleteList) && (
              <>
                {canHospitalList && (
                  <li className="nav-item">
                    <NavLink to="HospitalList" className="nav-link" title="Hospital List" onClick={onNavClick}>
                      <img src={HospitalIcon} alt="" /> Hospital List
                    </NavLink>
                  </li>
                )}
                {canHospitalDeleteList && (
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
                )}
                <hr />
              </>
            )}

            {/* ---- Expenses ---- */}
            {(canExpenses || canExpenceDelete) && (
              <>
                {canExpenses && (
                  <li className="nav-item">
                    <NavLink to="Expenses" className="nav-link" title="Expenses" onClick={onNavClick}>
                      <img src={accounts} alt="" /> Petty Cash
                    </NavLink>
                  </li>
                )}
                {canExpenceDelete && (
                  <li className="nav-item">
                    <NavLink to="ExpenceDelete" className="nav-link" title="Delete Expenses" onClick={onNavClick}>
                      <img src={expences} alt="" /> Delete Petty Cash
                    </NavLink>
                  </li>
                )}
                <hr />
              </>
            )}

            {/* ---- Task / Admin / Accounts ---- */}
            {canTask && (
              <li className="nav-item">
                <NavLink to="Task" className="nav-link" title="Task" onClick={onNavClick}>
                  <img src={task} alt="" /> Task
                </NavLink>
              </li>
            )}

            {(canAdmin || isAdmin) && (
              <li className="nav-item">
                <NavLink to="Admin" className="nav-link" title="Admin" onClick={onNavClick}>
                  <img src={admin} alt="" /> Admin
                </NavLink>
              </li>
            )}

            {canAccounts && (
              <li className="nav-item">
                <NavLink to="Accounts" className="nav-link" title="Accounts" onClick={onNavClick}>
                  <img src={accounts} alt="" /> Accounts
                </NavLink>
              </li>
            )}
          </ul>
        </div>
      </nav>

      {/* ===== Routes with granular guards ===== */}
      <Routes>
        <Route path="/" element={<PermRoute allowed={canDashboard}><Dashboard /></PermRoute>} />

        {/* Staff */}
        <Route
          path="StaffData"
          element={
            <PermRoute allowed={canStaffData}>
              <WorkersData />
            </PermRoute>
          }
        />
        <Route
          path="ExistingStaff"
          element={
            <PermRoute allowed={canExistingStaff}>
              <ExistingEmployees />
            </PermRoute>
          }
        />

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
      </Routes>
    </>
  );
}
