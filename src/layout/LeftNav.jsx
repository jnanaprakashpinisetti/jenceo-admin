// LeftNav.jsx
import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

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
import enquiry from "../assets/enquiry.svg";

/**
 * LeftNav - Navigation only. Routes are defined at App level inside <BrowserRouter>.
 * - Removed Sign out / Restore section as requested.
 * - NavLink 'to' uses absolute paths (leading slash) so routes resolve from root.
 */

export default function LeftNav() {
  const [isActive, setIsActive] = useState(false);   // side collapse (arrow)
  const [isShow, setIsShow] = useState(false);       // mobile collapse (hamburger)
  const location = useLocation();

  // Close the mobile menu automatically on route change
  useEffect(() => {
    setIsShow(false);
  }, [location.pathname]);

  const toggleSide = () => setIsActive((v) => !v);
  const toggleMobile = () => setIsShow((v) => !v);
  const closeMobile = () => setIsShow(false);

  // fixed collapseClass to include space before 'show'
  const collapseClass = `collapse navbar-collapse${isShow ? ' show' : ''}`;

  // helper for active class if you also want to style active links differently
  const navLinkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

  return (
    <>
      <nav className={isActive ? 'navbar navbar-expand-sm toggle' : 'navbar navbar-expand-sm'}>
        {/* Brand / Logo */}
        <button type="button" className="navbar-brand" onClick={() => { }}>
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
              <NavLink to='/' className={navLinkClass} title='Dash Board' onClick={closeMobile}>
                <img src={home} alt="" /> Dash Board
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink to='/Investments' className={navLinkClass} title='Investments' onClick={closeMobile}>
                <img src={invest} alt="" /> Investments
              </NavLink>
            </li>

            <hr />

            <li className="nav-item">
              <NavLink to='/Employees' className={navLinkClass} title='Worker Data' onClick={closeMobile}>
                <img src={workerData} alt="" /> Worker Data
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink to='/ExistingEmployees' className={navLinkClass} title='Existing Workers' onClick={closeMobile}>
                <img src={workerExit} alt="Worker Exit" /> Exit Worker
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to='/WorkerCallsData' className={navLinkClass} title='Worker Call Data' onClick={closeMobile}>
                <img src={cell} alt="Worker Call Data" /> Worker Call Data
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink to='/EmployeeAggrement' className={navLinkClass} title='Worker Aggrement' onClick={closeMobile}>
                <img src={WorkerAggrement} alt="" /> Worker Aggremnt
              </NavLink>
            </li>

            <hr />

            <li className="nav-item">
              <NavLink to='/ClientInfo' className={navLinkClass} title='ClientInfo' onClick={closeMobile}>
                <img src={client} alt="" /> Client Data
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink to='/ClientExit' className={navLinkClass} title='ClientExit' onClick={closeMobile}>
                <img src={ClientExitIcon} alt="" /> ClientExit
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to='/Enquiry' className={navLinkClass} title='Enquiry' onClick={closeMobile}>
                <img src={enquiry} alt="" /> Enquiry
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to='/EnquiryExit' className={navLinkClass} title='Old Enquirys' onClick={closeMobile}>
                <img src={enquiry} alt="" /> Old Enquiry
              </NavLink>
            </li>

            <hr />

            <li className="nav-item">
              <NavLink to='/HospitalList' className={navLinkClass} title='Hospital List' onClick={closeMobile}>
                <img src={HospitalIcon} alt="" /> Hospital List
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink to='/HospitalDeleteList' className={navLinkClass} title='Deleted Hospital' onClick={closeMobile}>
                <img src={HospitalDeleteIcon} alt="" /> Deleted Hospitals
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink to='/Expenses' className={navLinkClass} title='Expenses' onClick={closeMobile}>
                <img src={expences} alt="" /> Expenses
              </NavLink>
            </li>

            <hr />

            <li className="nav-item">
              <NavLink to='/Task' className={navLinkClass} title='Task' onClick={closeMobile}>
                <img src={task} alt="" /> Task
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink to='/Admin' className={navLinkClass} title='Admin' onClick={closeMobile}>
                <img src={admin} alt="" /> Admin
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink to='/HR' className={navLinkClass} title='HR' onClick={closeMobile}>
                <img src={hr} alt="" /> HR
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink to='/Accounts' className={navLinkClass} title='Accounts' onClick={closeMobile}>
                <img src={accounts} alt="" /> Accounts
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink to='/Operations' className={navLinkClass} title='Operations' onClick={closeMobile}>
                <img src={operations} alt="" /> Operations
              </NavLink>
            </li>
          </ul>
        </div>
      </nav>

      {/* Mobile menu - small overlay */}
      <div className="d-md-none">
        <button
          className="btn btn-sm btn-outline-secondary m-2"
          onClick={toggleMobile}
          aria-expanded={isShow}
          aria-label="Toggle mobile menu"
        >
          Menu
        </button>

        {isShow && (
          <div
            className="position-fixed top-0 start-0 vw-100 vh-100"
            style={{ background: "rgba(0,0,0,0.5)", zIndex: 1040 }}
            onClick={closeMobile}
          >
            <div
              className="bg-white p-3"
              style={{ width: 280, height: "100%", boxShadow: "0 8px 20px rgba(0,0,0,0.12)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="d-flex align-items-center mb-3">
                <img src={logo} alt="logo" style={{ height: 36 }} />
                <button className="btn btn-link ms-auto p-0" onClick={closeMobile} aria-label="Close menu">Close</button>
              </div>

              <nav>
                <ul className="nav flex-column">
                  {/* render same menu in mobile overlay */}
                  <li className="nav-item"><NavLink to='/' className={navLinkClass} onClick={closeMobile}><img src={home} alt="" /> Dashboard</NavLink></li>
                  <li className="nav-item"><NavLink to='/Investments' className={navLinkClass} onClick={closeMobile}><img src={invest} alt="" /> Investments</NavLink></li>
                  <hr />
                  <li className="nav-item"><NavLink to='/Employees' className={navLinkClass} onClick={closeMobile}><img src={workerData} alt="" /> Worker Data</NavLink></li>
                  <li className="nav-item"><NavLink to='/ExistingEmployees' className={navLinkClass} onClick={closeMobile}><img src={workerExit} alt="" /> Exit Worker</NavLink></li>
                  <li className="nav-item"><NavLink to='/Worker CallsData' className={navLinkClass} onClick={closeMobile}><img src={cell} alt="" /> Worker Call Data</NavLink></li>
                  <li className="nav-item"><NavLink to='/Employee Aggrement' className={navLinkClass} onClick={closeMobile}><img src={WorkerAggrement} alt="" /> Worker Aggremnt</NavLink></li>
                  <hr />
                  <li className="nav-item"><NavLink to='/ClientInfo' className={navLinkClass} onClick={closeMobile}><img src={client} alt="" /> Client Data</NavLink></li>
                  <li className="nav-item"><NavLink to='/ClientExit' className={navLinkClass} onClick={closeMobile}><img src={ClientExitIcon} alt="" /> ClientExit</NavLink></li>
                  <li className="nav-item"><NavLink to='/Enquiry' className={navLinkClass} onClick={closeMobile}><img src={enquiry} alt="" /> Enquiry</NavLink></li>
                  <li className="nav-item"><NavLink to='/EnquiryExit' className={navLinkClass} onClick={closeMobile}><img src={enquiry} alt="" /> Old Enquiry</NavLink></li>
                  <hr />
                  <li className="nav-item"><NavLink to='/HospitalList' className={navLinkClass} onClick={closeMobile}><img src={HospitalIcon} alt="" /> Hospital List</NavLink></li>
                  <li className="nav-item"><NavLink to='/HospitalDeleteList' className={navLinkClass} onClick={closeMobile}><img src={HospitalDeleteIcon} alt="" /> Deleted Hospitals</NavLink></li>
                  <li className="nav-item"><NavLink to='/Expenses' className={navLinkClass} onClick={closeMobile}><img src={expences} alt="" /> Expenses</NavLink></li>
                  <hr />
                  <li className="nav-item"><NavLink to='/Task' className={navLinkClass} onClick={closeMobile}><img src={task} alt="" /> Task</NavLink></li>
                  <li className="nav-item"><NavLink to='/Admin' className={navLinkClass} onClick={closeMobile}><img src={admin} alt="" /> Admin</NavLink></li>
                  <li className="nav-item"><NavLink to='/HR' className={navLinkClass} onClick={closeMobile}><img src={hr} alt="" /> HR</NavLink></li>
                  <li className="nav-item"><NavLink to='/Accounts' className={navLinkClass} onClick={closeMobile}><img src={accounts} alt="" /> Accounts</NavLink></li>
                  <li className="nav-item"><NavLink to='/Operations' className={navLinkClass} onClick={closeMobile}><img src={operations} alt="" /> Operations</NavLink></li>
                </ul>
              </nav>
            </div>
          </div>
        )}
      </div>
    </>
  );
}