// App.js
import React from "react";
import { BrowserRouter, Routes, Route, Outlet, useNavigate } from "react-router-dom";
import LeftNav from "./layout/LeftNav"; // update path if needed
import TopNav from "./layout/TopNav";   // TopNav accepts optional `navigate` prop

import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import EmployeeAggrement from './pages/WorkerAggrement';
import ExistingEmployees from './pages/ExistingWorker';
import Investments from './pages/Investments';
import ClientInfo from './pages/ClientInfo';
import ClientExit from './pages/ClientExit';
import Expenses from './pages/Expenses';
import Task from './pages/Task';
import Admin from './pages/Admin';
import Hr from './pages/Hr';
import Accounts from './pages/Accounts';
import Operations from './pages/Operations';
import HospitalList from './pages/HospitalList';
import HospitalDeleteList from './pages/HospitalDeleteList';
import WorkerCallsData from './pages/WorkerCallsData';
import Enquiry from './pages/Enquiry';
import EnquiryExit from './pages/EnquiryExit';
import SearchResults from './pages/SearchResults';

function MainLayout() {
  // useNavigate must be called inside a component rendered by Router
  const navigate = useNavigate();

  return (
    <div className="d-flex" style={{ minHeight: "100vh" }}>
      <LeftNav />
      <div style={{ flex: 1 }}>
        <TopNav navigate={navigate} />
        <main className="p-3">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main layout: left nav + top + content */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="Investments" element={<Investments />} />
          <Route path="Employees" element={<Employees />} />
          <Route path="EmployeeAggrement" element={<EmployeeAggrement />} />
          <Route path="ExistingEmployees" element={<ExistingEmployees />} />
          <Route path="WorkerCallsData" element={<WorkerCallsData />} />
          <Route path="ClientInfo" element={<ClientInfo />} />
          <Route path="ClientExit" element={<ClientExit />} />
          <Route path="Enquiry" element={<Enquiry />} />
          <Route path="EnquiryExit" element={<EnquiryExit />} />
          <Route path="HospitalList" element={<HospitalList />} />
          <Route path="HospitalDeleteList" element={<HospitalDeleteList />} />
          <Route path="Expenses" element={<Expenses />} />
          <Route path="Task" element={<Task />} />
          <Route path="Admin" element={<Admin />} />
          <Route path="HR" element={<Hr />} />
          <Route path="Accounts" element={<Accounts />} />
          <Route path="Operations" element={<Operations />} />
          <Route path="search" element={<SearchResults />} />
          {/* add other routes here */}
        </Route>

        {/* fallback route */}
        <Route path="*" element={<div style={{ padding: 40 }}>Page not found</div>} />
      </Routes>
    </BrowserRouter>
  );
}
