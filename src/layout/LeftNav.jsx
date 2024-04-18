import React from 'react';
import { Router, Routes, Route, Link, NavLink, browserHistory, IndexRoute } from 'react-router-dom';

import logo from "../assets/jencio-logo.svg";


import home from "../assets/home.svg";
import employee from "../assets/employee.svg";
import sellers from "../assets/sellers.svg";
import shop from "../assets/shops.svg";
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


import Employees from '../pages/Employees';
import Dashboard from '../pages/Dashboard';
import Sellers from '../pages/Sellers';
import Shops from '../pages/Shops';
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

    return (
        <>
            {/* <div className='left-nav'> */}
            <nav class="navbar navbar-expand-sm">
                <a className="navbar-brand" href="#"> <img src={logo} alt="" /></a>

                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#collapsibleNavbar">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse" id="collapsibleNavbar">
                    <ul class="navbar-nav">
                        <li className="nav-item">
                            <NavLink to='/' className="nav-link"> <img src={home} alt="" /> Dash Board</NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to='Employees' className="nav-link"> <img src={employee} alt="" /> Employees</NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to='Sellers' className="nav-link"> <img src={sellers} alt="" /> Sellers</NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to='Shops' className="nav-link"> <img src={shop} alt="" /> Shops</NavLink>
                        </li>
                        <hr />
                        <li className="nav-item">
                            <NavLink to='Investments' className="nav-link"> <img src={invest} alt="" /> Investments</NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to='Orders' className="nav-link"> <img src={purchase} alt="" /> Orders</NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to='Reports' className="nav-link"> <img src={sales} alt="" /> Reports</NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to='Dues' className="nav-link"> <img src={balance} alt="" /> Dues</NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to='Expenses' className="nav-link"> <img src={expences} alt="" /> Expenses</NavLink>
                        </li>
                        <hr />
                        <li className="nav-item">
                            <NavLink to='Task' className="nav-link"> <img src={task} alt="" /> Task</NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to='Admin' className="nav-link"> <img src={admin} alt="" /> Admin</NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to='HR' className="nav-link"> <img src={hr} alt="" /> HR</NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to='Accounts' className="nav-link"> <img src={accounts} alt="" /> Accounts</NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to='Operations' className="nav-link"> <img src={operations} alt="" /> Operations</NavLink>
                        </li>
                    </ul>
                </div>


            </nav>
            {/* </div> */}
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="Employees" element={<Employees />} />
                <Route path="Sellers" element={<Sellers />} />
                <Route path="Shops" element={<Shops />} />
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
