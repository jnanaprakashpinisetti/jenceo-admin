// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TopNav from "./layout/TopNav";
import LeftNav from "./layout/LeftNav";
import { AuthProvider } from "./context/AuthContext";
import Login from "./components/Auth/Login";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import AdminSetup from './pages/AdminSetup'; // Make sure this import is correct

// Ensure your existing pages remain imported in LeftNav or separate route files

function AppLayout() {
  // layout that shows TopNav + LeftNav + main content handled by LeftNav's internal <Routes> for pages
  return (
    <div className="man-section">
      <TopNav />
      <div className="layout">
        <LeftNav />
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
           <Route path="/setup" element={<AdminSetup />} />
          {/* Protected: show main app layout only to authenticated users */}
          <Route element={<ProtectedRoute />}>
            <Route path="/*" element={<AppLayout />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
