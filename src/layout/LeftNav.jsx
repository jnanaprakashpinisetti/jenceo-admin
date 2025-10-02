// src/layout/LeftNav.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
import enquiry from "../assets/enquiry.svg";
import call from "../assets/Call.svg";
import callDelete from "../assets/CallDelete.svg";
import inquiry from "../assets/inquiry.svg";
import inquiryDelete from "../assets/inquiryDelete.svg";
import Staff from "../assets/Staff.svg";
import StaffExit from "../assets/StaffExit.svg";

import Dashboard from '../pages/Dashboard';
// Employee Data
import WorkersData from '../pages/WorkersData';
import EmployeeAggrement from '../pages/WorkerAggrement';
import ExistingEmployees from '../pages/ExistingWorker';

import Investments from '../pages/Investments';
import ClientInfo from '../pages/ClientInfo';
import ClientExit from '../pages/ClientExit';
import Expenses from '../pages/Expenses';
import ExpenceDelete from '../pages/ExpenceDelete';
import Task from '../pages/Task';
import AdminUsers from '../pages/AdminUsers';
import Accounts from '../pages/Accounts';
import HospitalList from '../pages/HospitalList';
import HospitalDeleteList from '../pages/HospitalDeleteList';
import WorkerCallsData from '../pages/WorkerCallsData';
import WorkerCallDelete from '../pages/WorkerCallDelete';
import Enquiry from '../pages/Enquiry';
import EnquiryExit from '../pages/EnquiryExit';
import SearchResults from '../pages/SearchResults';

export default function LeftNav() {
  const { user } = useAuth();
  const perms = user?.permissions || {};

  // Only allow via explicit permissions (no role-based override).
  const canView = (key) => {
    const p = perms[key];
    return !!(p && (p.view === true || p.read === true));
  };

  // Route guard wrapper (blocks rendering without permission)
  const PermRoute = ({ permKey, children }) => {
    return canView(permKey) ? children : <Navigate to="/" replace />;
  };

  const [isActive, setIsActive] = useState(false);
  const [isShow, setIsShow] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsShow(false);
  }, [location.pathname]);

  const toggleSide = () => setIsActive((v) => !v);
  const toggleMobile = () => setIsShow((v) => !v);
  const closeMobile = () => setIsShow(false);

  const collapseClass = `collapse navbar-collapse${isShow ? ' show' : ''}`;

  return (
    <>
      <nav className={isActive ? 'navbar navbar-expand-lg toggle' : 'navbar navbar-expand-lg'}>
        <button type="button" className="navbar-brand" onClick={() => { }}>
          <img src={isActive ? logoicon : logo} alt="JenCeo Logo" />
        </button>

        <button className='slide' type="button" onClick={toggleSide} aria-label="Toggle sidebar">
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
          <div className="mobile-top d-block d-lg-none mb-3">
            <div className="d-flex justify-content-between align-items-center px-2">
              <NavLink to='Profile' className="nav-link p-0" onClick={closeMobile} title="Profile">
                <span style={{ fontSize: 14 }}>👤 Profile</span>
              </NavLink>
              <NavLink to='Notifications' className="nav-link p-0" onClick={closeMobile} title="Notifications">
                <span style={{ fontSize: 14 }}>🔔 Notifications</span>
              </NavLink>
            </div>
          </div>

          <ul className="navbar-nav">
            {canView('Dashboard') && (
              <li className="nav-item">
                <NavLink to='/' className="nav-link" title='Dash Board' onClick={closeMobile}>
                  <img src={home} alt="" /> Dash Board
                </NavLink>
              </li>
            )}

            {canView('Investments') && (
              <li className="nav-item">
                <NavLink to='Investments' className="nav-link" title='Investments' onClick={closeMobile}>
                  <img src={invest} alt="" /> Investments
                </NavLink>
              </li>
            )}

            <hr />

            {canView('Staff') && (
              <>
                <li className="nav-item">
                  <NavLink to='StaffData' className="nav-link" title='Staff' onClick={closeMobile}>
                    <img src={Staff} alt="" /> Staff
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to='ExistingStaff' className="nav-link" title='Exist Staff' onClick={closeMobile}>
                    <img src={StaffExit} alt="" /> Exist Staff
                  </NavLink>
                </li>
                <hr />
              </>
            )}

            {canView('Workers Data') && (
              <>
                <li className="nav-item">
                  <NavLink to='WorkersData' className="nav-link" title='Worker Data' onClick={closeMobile}>
                    <img src={workerData} alt="" /> Worker Data
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to='ExistingEmployees' className="nav-link" title='Existing Workers' onClick={closeMobile}>
                    <img src={workerExit} alt="Worker Exit" /> Exit Worker
                  </NavLink>
                </li>
                {canView('Worker Call Data') && (
                  <>
                    <li className="nav-item">
                      <NavLink to='WorkerCallsData' className="nav-link" title='Worker Call Data' onClick={closeMobile}>
                        <img src={call} alt="Worker Call Data" /> Worker Call Data
                      </NavLink>
                    </li>
                    <li className="nav-item">
                      <NavLink to='WorkerCallDelete' className="nav-link" title='Worker Call Delete' onClick={closeMobile}>
                        <img src={callDelete} alt="" /> Worker Call Delete
                      </NavLink>
                    </li>
                  </>
                )}
                <li className="nav-item">
                  <NavLink to='EmployeeAggrement' className="nav-link" title='Worker Aggrement' onClick={closeMobile}>
                    <img src={WorkerAggrement} alt="" /> Worker Aggremnt
                  </NavLink>
                </li>
                <hr />
              </>
            )}

            {canView('Client Data') && (
              <>
                <li className="nav-item">
                  <NavLink to='ClientInfo' className="nav-link" title='ClientInfo' onClick={closeMobile}>
                    <img src={client} alt="" /> Client Data
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to='ClientExit' className="nav-link" title='ClientExit' onClick={closeMobile}>
                    <img src={ClientExitIcon} alt="" /> ClientExit
                  </NavLink>
                </li>
              </>
            )}

            {canView('Enquiries') && (
              <>
                <li className="nav-item">
                  <NavLink to='Enquiry' className="nav-link" title='Enquiry' onClick={closeMobile}>
                    <img src={inquiry} alt="" /> Enquiry
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to='EnquiryExit' className="nav-link" title='Old Enquirys' onClick={closeMobile}>
                    <img src={inquiryDelete} alt="" /> Old Enquiry
                  </NavLink>
                </li>
                <hr />
              </>
            )}

            {canView('Hospital List') && (
              <>
                <li className="nav-item">
                  <NavLink to='HospitalList' className="nav-link" title='Hospital List' onClick={closeMobile}>
                    <img src={HospitalIcon} alt="" /> Hospital List
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to='HospitalDeleteList' className="nav-link" title='Deleted Hospital' onClick={closeMobile}>
                    <img src={HospitalDeleteIcon} alt="" /> Deleted Hospitals
                  </NavLink>
                </li>
              </>
            )}

            {canView('Expenses') && (
              <>
                <li className="nav-item">
                  <NavLink to='Expenses' className="nav-link" title='Expenses' onClick={closeMobile}>
                    <img src={accounts} alt="" /> Petty Cash
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to='ExpenceDelete' className="nav-link" title='Delete Expenses' onClick={closeMobile}>
                    <img src={expences} alt="" /> Delete Petty Cash
                  </NavLink>
                </li>
                <hr />
              </>
            )}

            {canView('Task') && (
              <li className="nav-item">
                <NavLink to='Task' className="nav-link" title='Task' onClick={closeMobile}>
                  <img src={task} alt="" /> Task
                </NavLink>
              </li>
            )}

            {canView('Admin') && (
              <li className="nav-item">
                <NavLink to='Admin' className="nav-link" title='Admin' onClick={closeMobile}>
                  <img src={admin} alt="" /> Admin
                </NavLink>
              </li>
            )}

            {canView('Accounts') && (
              <li className="nav-item">
                <NavLink to='Accounts' className="nav-link" title='Accounts' onClick={closeMobile}>
                  <img src={accounts} alt="" /> Accounts
                </NavLink>
              </li>
            )}
          </ul>
        </div>
      </nav>

      {/* Routes with permission guards */}
      <Routes>
        <Route path="/" element={
          <PermRoute permKey="Dashboard"><Dashboard /></PermRoute>
        } />
        <Route path="WorkersData" element={
          <PermRoute permKey="Workers Data"><WorkersData /></PermRoute>
        } />
        <Route path="ExistingEmployees" element={
          <PermRoute permKey="Workers Data"><ExistingEmployees /></PermRoute>
        } />
        <Route path="EmployeeAggrement" element={
          <PermRoute permKey="Workers Data"><EmployeeAggrement /></PermRoute>
        } />
        <Route path="WorkerCallsData" element={
          <PermRoute permKey="Worker Call Data"><WorkerCallsData /></PermRoute>
        } />
        <Route path="WorkerCallDelete" element{
          ...undefined
        } />
        <Route path="Investments" element={
          <PermRoute permKey="Investments"><Investments /></PermRoute>
        } />
        <Route path="ClientInfo" element={
          <PermRoute permKey="Client Data"><ClientInfo /></PermRoute>
        } />
        <Route path="ClientExit" element={
          <PermRoute permKey="Client Data"><ClientExit /></PermRoute>
        } />
        <Route path="Enquiry" element={
          <PermRoute permKey="Enquiries"><Enquiry /></PermRoute>
        } />
        <Route path="EnquiryExit" element={
          <PermRoute permKey="Enquiries"><EnquiryExit /></PermRoute>
        } />
        <Route path="Expenses" element={
          <PermRoute permKey="Expenses"><Expenses /></PermRoute>
        } />
        <Route path="ExpenceDelete" element={
          <PermRoute permKey="Expenses"><ExpenceDelete /></PermRoute>
        } />
        <Route path="Task" element={
          <PermRoute permKey="Task"><Task /></PermRoute>
        } />
        <Route path="Accounts" element={
          <PermRoute permKey="Accounts"><Accounts /></PermRoute>
        } />
        <Route path="HospitalList" element{
          ...undefined
        } />
        <Route path="HospitalDeleteList" element{
          ...undefined
        } />
        <Route path="search" element={<SearchResults />} />
        <Route path="Admin" element={
          <PermRoute permKey="Admin"><AdminUsers /></PermRoute>
        } />
      </Routes>
    </>
  );
}
