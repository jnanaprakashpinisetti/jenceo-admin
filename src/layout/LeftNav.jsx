import React, { useState } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';

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
import purchase from "../assets/purchase.svg";
import cell from "../assets/cell.svg";
import balance from "../assets/balance.svg";
import expences from "../assets/expence.svg";
import task from "../assets/task.svg";
import admin from "../assets/admin.svg";
import hr from "../assets/hr.svg";
import accounts from "../assets/accounts.svg";
import operations from "../assets/Operations.svg";

import Dashboard from '../pages/Dashboard';
// Employee Data
import Employees from '../pages/Employees';
import EmployeeAggrement from '../pages/WorkerAggrement';
import ExistingEmployees from '../pages/ExistingWorker';

import Investments from '../pages/Investments';
import ClientInfo from '../pages/ClientInfo';
import ClientExit from '../pages/ClientExit';
import Expenses from '../pages/Expenses';
import Task from '../pages/Task';
import Admin from '../pages/Admin';
import Hr from '../pages/Hr';
import Accounts from '../pages/Accounts';
import Operations from '../pages/Operations';
import HospitalList from '../pages/HospitalList';
import HospitalDeleteList from '../pages/HospitalDeleteList';
import WorkerCallsData from '../pages/WorkerCallsData';

export default function LeftNav() {
  const [isActive, setIsActive] = useState(false);   // side collapse (arrow)
  const [isShow, setIsShow] = useState(false);       // mobile collapse (hamburger)
  const location = useLocation();

  // Close the mobile menu automatically on route change
  React.useEffect(() => {
    setIsShow(false);
  }, [location.pathname]);

  const toggleSide = () => setIsActive((v) => !v);
  const toggleMobile = () => setIsShow((v) => !v);
  const closeMobile = () => setIsShow(false);

  const collapseClass = `collapse navbar-collapse${isShow ? ' show' : ''}`;

  return (
    <>
      <nav className={isActive ? 'navbar navbar-expand-sm toggle' : 'navbar navbar-expand-sm'}>
        {/* Brand / Logo */}
        <button type="button" className="navbar-brand" onClick={() => {}}>
          <img src={isActive ? logoicon : logo} alt="JenCeo Logo" />
        </button>

        {/* Side slide toggle (desktop) */}
        <button className='slide' type="button" onClick={toggleSide} aria-label="Toggle sidebar">
          <img src={arrow} alt="arrow" />
        </button>

        <hr />

        {/* Mobile toggler (React-controlled) */}
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

        {/* Collapsible menu */}
        <div className={collapseClass} id="collapsibleNavbar">
          <ul className="navbar-nav">
            <li className="nav-item">
              <NavLink to='/' className="nav-link" title='Dash Board' onClick={closeMobile}>
                <img src={home} alt="" /> Dash Board
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink to='Investments' className="nav-link" title='Investments' onClick={closeMobile}>
                <img src={invest} alt="" /> Investments
              </NavLink>
            </li>

            <hr />

            <li className="nav-item">
              <NavLink to='Employees' className="nav-link" title='Worker Data' onClick={closeMobile}>
                <img src={workerData} alt="" /> Worker Data
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink to='ExistingEmployees' className="nav-link" title='Existing Workers' onClick={closeMobile}>
                <img src={workerExit} alt="Worker Exit" /> Exit Worker
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to='WorkerCallsData' className="nav-link" title='Worker Call Data' onClick={closeMobile}>
                <img src={cell} alt="Worker Call Data"/> Worker Call Data
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink to='EmployeeAggrement' className="nav-link" title='Worker Aggrement' onClick={closeMobile}>
                <img src={WorkerAggrement} alt="" /> Worker Aggremnt
              </NavLink>
            </li>

            <hr />

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

            <hr />

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

            <li className="nav-item">
              <NavLink to='Expenses' className="nav-link" title='Expenses' onClick={closeMobile}>
                <img src={expences} alt="" /> Expenses
              </NavLink>
            </li>

            <hr />

            <li className="nav-item">
              <NavLink to='Task' className="nav-link" title='Task' onClick={closeMobile}>
                <img src={task} alt="" /> Task
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink to='Admin' className="nav-link" title='Admin' onClick={closeMobile}>
                <img src={admin} alt="" /> Admin
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink to='HR' className="nav-link" title='HR' onClick={closeMobile}>
                <img src={hr} alt="" /> HR
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink to='Accounts' className="nav-link" title='Accounts' onClick={closeMobile}>
                <img src={accounts} alt="" /> Accounts
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink to='Operations' className="nav-link" title='Operations' onClick={closeMobile}>
                <img src={operations} alt="" /> Operations
              </NavLink>
            </li>
          </ul>
        </div>
      </nav>

      {/* Routes */}
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="Employees" element={<Employees />} />
        <Route path="EmployeeAggrement" element={<EmployeeAggrement />} />
        <Route path="WorkerCallsData" element={<WorkerCallsData />} />
        <Route path="ExistingEmployees" element={<ExistingEmployees />} />
        <Route path="Investments" element={<Investments />} />
        <Route path="ClientInfo" element={<ClientInfo />} />
        <Route path="ClientExit" element={<ClientExit />} />
        <Route path="Expenses" element={<Expenses />} />
        <Route path="Task" element={<Task />} />
        <Route path="Admin" element={<Admin />} />
        <Route path="HR" element={<Hr />} />
        <Route path="Accounts" element={<Accounts />} />
        <Route path="Operations" element={<Operations />} />
        <Route path="HospitalList" element={<HospitalList />} />
        <Route path="HospitalDeleteList" element={<HospitalDeleteList />} />
      </Routes>
    </>
  );
}
