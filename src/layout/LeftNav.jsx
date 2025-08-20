import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, Link, } from 'react-router-dom';

import logo from "../assets/jencio-logo.svg";
import logoicon from "../assets/jenceo-icon.svg";
import toggle from "../assets/toggle.svg";
import close from "../assets/close.svg";


import arrow from "../assets/arrow.svg";
import home from "../assets/home.svg";
import employee from "../assets/employee.svg";
import invest from "../assets/invest.svg";
import purchase from "../assets/purchase.svg";
import sales from "../assets/sales.svg";
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
import EmployeeAggrementEng from '../pages/WorkerAggrementEng';
import EmployeeAggrementTel from '../pages/WorkerAggrementTel';
import EmployeeOfferEng from '../pages/WorkerOfferEng';
import EmployeeOfferTel from '../pages/WorkerOfferTel';
import EmployeeBioData from '../pages/WorkerBioData';
import ExistingEmployees from '../pages/ExistingWorker';


import Investments from '../pages/Investments';
import Orders from '../pages/Orders';
import Reports from '../pages/Reports';
import Expenses from '../pages/Expenses';
import Task from '../pages/Task';
import Admin from '../pages/Admin';
import Hr from '../pages/Hr';
import Accounts from '../pages/Accounts';
import Operations from '../pages/Operations';
import Dues from '../pages/Dues';
// import expences from "../assets/expence.svg;


export default function LeftNav() {

    const [isActive, setIsActive] = useState(false);
    const [isShow, setIsShow] = useState(false);

    const toggleClass = () => {
        setIsActive(!isActive); // Toggle the state
    };
    const toggleShow = (e) => {
        setIsShow(!isShow); // Toggle the state
    };

    useEffect(() => {
        const link = document.querySelectorAll(".nav-item");
        link.forEach((e) => {
            e.addEventListener("click", toggleShow)
        });
    }, [])

    return (
        <>
            {/* <div className='left-nav'> */}
            <nav className={isActive ? 'navbar navbar-expand-sm toggle' : 'navbar navbar-expand-sm'}>
                <button className="navbar-brand">   <img src={isActive ? logoicon : logo} alt="JenCeo Logo" /> </button>

                <button className='slide'> <img src={arrow} alt="arrow" onClick={toggleClass} /> </button>
                <hr />

                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#collapsibleNavbar" onClick={toggleShow}>
                    <img src={isShow ? close : toggle} alt="toggle button" />
                </button>
                <div className={isShow ? 'collapse navbar-collapse  show' : 'collapse navbar-collapse hide'} id="collapsibleNavbar">
                    <ul className="navbar-nav">
                        <li className="nav-item">
                            <NavLink to='/' className="nav-link" title='Dash Board'> <img src={home} alt="" /> Dash Board</NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to='Employees' className="nav-link" title='Employees'> <img src={employee} alt="" />Worker Data </NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to='EmployeeAggrementEng' className="nav-link" title='Employee Aggrement English'> <img src={employee} alt="" />Worker Agg Eng</NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to='EmployeeAggrementTel' className="nav-link" title='Employee Aggrement Telugu'> <img src={employee} alt="" />Worker Agg Tel</NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to='EmployeeOfferEng' className="nav-link" title='Employee Offter English'> <img src={employee} alt="" />Worker Offer Eng</NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to='EmployeeOfferTel' className="nav-link" title='Employee Offter Telugu'> <img src={employee} alt="" />Worker Offer Tel</NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to='EmployeeBioData' className="nav-link" title='Employee Bio Data'> <img src={employee} alt="" />Worker Bio Data</NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to='ExistingEmployees' className="nav-link" title='Existing Employees'> <img src={employee} alt="" />Exist Worker</NavLink>
                        </li>
                        <hr />

                        <li className="nav-item">
                            <NavLink to='Investments' className="nav-link" title='Investments'> <img src={invest} alt="" /> Investments</NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to='Orders' className="nav-link" title='Orders'> <img src={purchase} alt="" /> Orders</NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to='Reports' className="nav-link" title='Reports'> <img src={sales} alt="" /> Reports</NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to='Dues' className="nav-link" title='Dues'> <img src={balance} alt="" /> Dues</NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to='Expenses' className="nav-link" title='Expenses'> <img src={expences} alt="" /> Expenses</NavLink>
                        </li>
                        <hr />
                        <li className="nav-item">
                            <NavLink to='Task' className="nav-link" title='Task'> <img src={task} alt="" /> Task</NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to='Admin' className="nav-link" title='Admin'> <img src={admin} alt="" /> Admin</NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to='HR' className="nav-link" title='HR'> <img src={hr} alt="" /> HR</NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to='Accounts' className="nav-link" title='Accounts'> <img src={accounts} alt="" /> Accounts</NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to='Operations' className="nav-link" title='Operations'> <img src={operations} alt="" /> Operations</NavLink>
                        </li>
                    </ul>
                </div>


            </nav>
            {/* </div> */}
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="Employees" element={<Employees />} />
                <Route path="EmployeeAggrementEng" element={<EmployeeAggrementEng />} />
                <Route path="EmployeeAggrementTel" element={<EmployeeAggrementTel />} />
                <Route path="EmployeeOfferEng" element={<EmployeeOfferEng />} />
                <Route path="EmployeeOfferTel" element={<EmployeeOfferTel />} />
                <Route path="EmployeeBioData" element={<EmployeeBioData />} />
                <Route path="ExistingEmployees" element={<ExistingEmployees />} />


                <Route path="Investments" element={<Investments />} />
                <Route path="Orders" element={<Orders />} />
                <Route path="Reports" element={<Reports />} />
                <Route path="Expenses" element={<Expenses />} />
                <Route path="Task" element={<Task />} />
                <Route path="Admin" element={<Admin />} />
                <Route path="HR" element={<Hr />} />
                <Route path="Accounts" element={<Accounts />} />
                <Route path="Operations" element={<Operations />} />
                <Route path="Dues" element={<Dues />} />

            </Routes>
        </>
    )
}
