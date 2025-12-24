// Timesheet/DisplayTimeSheet/modals/EntryModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useTimesheet } from '../context/TimesheetContext';
import { useTimesheetOperations } from '../hooks/useTimesheetOperations';
import firebaseDB from '../../../../firebase';

const JOB_ROLE_OPTIONS = [
  "Nursing",
  "Patient Care",
  "Care Taker",
  "Baby Care",
  "Supporting",
  "Diaper",
  "Cook",
  "Housekeeping",
  "Old Age Care",
  "Any Duty",
  "Others",
];

const CLIENT_PATHS = {
  "Home Care": "ClientData/HomeCare/Running",
  "Housekeeping": "ClientData/Housekeeping/Running",
  "Office & Administrative": "ClientData/Office/Running",
  "Customer Service": "ClientData/Customer/Running",
  "Management & Supervision": "ClientData/Management/Running",
  "Security": "ClientData/Security/Running",
  "Driving & Logistics": "ClientData/Driving/Running",
  "Technical & Maintenance": "ClientData/Technical/Running",
  "Retail & Sales": "ClientData/Retail/Running",
  "Industrial & Labor": "ClientData/Industrial/Running",
  "Others": "ClientData/Others/Running"
};

// Common Indian holidays (can be loaded from DB)
const COMMON_HOLIDAYS = [
  "2024-01-01", // New Year
  "2024-01-14", // Pongal
  "2024-01-26", // Republic Day
  "2024-03-25", // Holi
  "2024-04-09", // Eid
  "2024-05-01", // Labor Day
  "2024-08-15", // Independence Day
  "2024-09-07", // Ganesh Chaturthi
  "2024-10-02", // Gandhi Jayanti
  "2024-10-23", // Dussehra
  "2024-10-31", // Diwali
  "2024-12-25", // Christmas
];

const EntryModal = () => {
  const {
    showEntryModal,
    currentEntry,
    isEditing,
    employees,
    selectedEmployee,
    timesheet,
    toggleModal,
    setCurrentEntry,
    setIsEditing,
  } = useTimesheet();

  const { handleSaveEntry } = useTimesheetOperations();

  // ========= STATE VARIABLES =========
  const [formData, setFormData] = useState({
    date: "",
    clientId: "",
    clientName: "",
    jobRole: "",
    status: "present",
    isHalfDay: false,
    isPublicHoliday: false,
    isEmergency: false,
    isWeekend: false,
    notes: "",
  });

  // Custom job role when "Others" is selected
  const [jobRoleCustom, setJobRoleCustom] = useState("");

  // Client management
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Salary calculations
  const [basicSalary, setBasicSalary] = useState(0);

  // Emergency duty details
  const [emergencyType, setEmergencyType] = useState("");
  const [emergencyClient, setEmergencyClient] = useState("");
  const [emergencyAmount, setEmergencyAmount] = useState("");

  // Manual daily amount override
  const [allowManualDaily, setAllowManualDaily] = useState(false);
  const [manualDailyAmount, setManualDailyAmount] = useState("");

  // Holidays management
  const [holidays, setHolidays] = useState(COMMON_HOLIDAYS);
  const [holidayName, setHolidayName] = useState("");

  // Modals
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [entryDataToSave, setEntryDataToSave] = useState(null);
  const [dupModalOpen, setDupModalOpen] = useState(false);
  const [dupList, setDupList] = useState([]);

  // Get current employee
  const employee = useMemo(() => 
    employees.find(e => e.id === selectedEmployee), 
    [employees, selectedEmployee]
  );

  // ========= UTILITY FUNCTIONS =========
  const toStr = (v) => (v == null ? "" : String(v));

  const canon = (v) =>
    toStr(v).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim();

  // Calculate daily salary from basic salary
  const calculateDailySalary = () => Math.round((Number(basicSalary) || 0) / 30);

  // Check if date is weekend (Saturday/Sunday)
  const isWeekend = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const day = date.getDay(); // 0 = Sunday, 6 = Saturday
    return day === 0 || day === 6;
  };

  // Check if date is holiday
  const isHoliday = (dateString) => {
    if (!dateString) return false;
    return holidays.includes(dateString);
  };

  // Get holiday name for date
  const getHolidayName = (dateString) => {
    if (!dateString) return "";
    // In real implementation, this would come from database
    const holidayMap = {
      "2024-01-01": "New Year's Day",
      "2024-01-14": "Pongal",
      "2024-01-26": "Republic Day",
      "2024-03-25": "Holi",
      "2024-04-09": "Eid al-Fitr",
      "2024-05-01": "Labour Day",
      "2024-08-15": "Independence Day",
      "2024-09-07": "Ganesh Chaturthi",
      "2024-10-02": "Gandhi Jayanti",
      "2024-10-23": "Dussehra",
      "2024-10-31": "Diwali",
      "2024-12-25": "Christmas",
    };
    return holidayMap[dateString] || "Public Holiday";
  };

  // ========= CLIENT MANAGEMENT =========
  // Normalize client data from different sources
  const normalizeClient = (firebaseKey, data) => {
    const idNo = toStr(data?.idNo) || toStr(data?.clientId) || toStr(data?.id) || "";
    const clientName = toStr(data?.clientName) || toStr(data?.name) || "";

    return {
      key: firebaseKey,
      clientId: idNo,
      clientName,
      location: toStr(data?.location || data?.area || ""),
      contact: toStr(data?.contact || data?.phone || ""),
      category: toStr(data?.category || ""),
      _idC: canon(idNo),
      _nmC: canon(clientName),
    };
  };

  // Load clients from Firebase path
  const loadFromPath = async (path) => {
    try {
      const snap = await firebaseDB.child(path).get();
      if (!snap.exists()) return [];
      const obj = snap.val() || {};
      return Object.entries(obj).map(([k, v]) => normalizeClient(k, v));
    } catch (error) {
      console.error(`Error loading clients from ${path}:`, error);
      return [];
    }
  };

  // Load all clients from all specified paths
  const loadClients = async () => {
    try {
      const allClients = [];
      
      // Load from all CLIENT_PATHS
      for (const [category, path] of Object.entries(CLIENT_PATHS)) {
        const clientsFromPath = await loadFromPath(path);
        // Add category to each client
        const categorizedClients = clientsFromPath.map(client => ({
          ...client,
          category
        }));
        allClients.push(...categorizedClients);
      }

      // Also load from legacy paths
      const legacyPaths = [
        "JenCeo-DataBase/ClientData",
        "ClientData",
        "JenCeo-DataBase/Clients",
        "Clients",
      ];

      for (const path of legacyPaths) {
        const clientsFromPath = await loadFromPath(path);
        allClients.push(...clientsFromPath);
      }

      // Deduplicate clients
      const dedupedClients = [];
      const seenClients = new Set();

      allClients.forEach((client) => {
        const clientKey = `${client._idC}|${client._nmC}`;
        if (!seenClients.has(clientKey) && (client.clientId || client.clientName)) {
          seenClients.add(clientKey);
          dedupedClients.push(client);
        }
      });

      setClients(dedupedClients);
    } catch (error) {
      console.error("Error loading clients:", error);
    }
  };

  // Load holidays from database
  const loadHolidays = async () => {
    try {
      const holidaysSnap = await firebaseDB.child("Holidays").get();
      if (holidaysSnap.exists()) {
        const holidaysData = holidaysSnap.val();
        const holidayDates = Object.keys(holidaysData || {});
        setHolidays(holidayDates);
      }
    } catch (error) {
      console.error("Error loading holidays:", error);
    }
  };

  // ========= EFFECTS =========
  useEffect(() => {
    loadClients();
    loadHolidays();
    
    // Set basic salary from employee
    if (employee?.basicSalary) {
      setBasicSalary(employee.basicSalary);
    }
  }, [employee]);

  useEffect(() => {
    if (currentEntry) {
      // Handle job role (known vs custom)
      const incomingRole = currentEntry.jobRole || employee?.primarySkill || "";
      const isKnownRole = JOB_ROLE_OPTIONS.some(
        (opt) => opt.toLowerCase() === incomingRole?.toLowerCase()
      );
      const selectValue = isKnownRole ? incomingRole : "Others";
      const customValue = isKnownRole ? "" : incomingRole;

      const entryDate = currentEntry.date || "";
      const isWeekendDay = isWeekend(entryDate);
      const isHolidayDay = isHoliday(entryDate);

      setFormData({
        date: entryDate,
        clientId: currentEntry.clientId || "",
        clientName: currentEntry.clientName || "",
        jobRole: selectValue || "",
        status: currentEntry.status || "present",
        isHalfDay: currentEntry.isHalfDay || false,
        isPublicHoliday: currentEntry.isPublicHoliday || isHolidayDay,
        isEmergency: currentEntry.isEmergency || false,
        isWeekend: isWeekendDay,
        notes: currentEntry.notes || "",
      });

      setJobRoleCustom(customValue);

      // Set holiday name if applicable
      if (isHolidayDay) {
        setHolidayName(getHolidayName(entryDate));
      }

      // Set search term for client display
      if (currentEntry.clientName) {
        const clientLabel = [currentEntry.clientId, currentEntry.clientName].filter(Boolean).join(" - ");
        setSearchTerm(clientLabel);
      }

      // Initialize emergency data if exists
      if (currentEntry.isEmergency) {
        setEmergencyType(currentEntry.emergencyType || "");
        setEmergencyClient(currentEntry.emergencyClient || "");
        setEmergencyAmount(currentEntry.emergencyAmount?.toString() || "");
      }

      // Initialize manual amount if exists
      if (currentEntry.manualDailyEnabled) {
        setAllowManualDaily(true);
        setManualDailyAmount(currentEntry.manualDailyAmount?.toString() || "");
      }

      // Initialize basic salary
      if (currentEntry.basicSalary) {
        setBasicSalary(currentEntry.basicSalary);
      }
    } else {
      // New entry - set defaults
      const today = new Date().toISOString().split("T")[0];
      const employeeRole = employee?.primarySkill || "";
      const isKnownRole = JOB_ROLE_OPTIONS.some(
        (opt) => opt.toLowerCase() === employeeRole?.toLowerCase()
      );
      
      const isWeekendDay = isWeekend(today);
      const isHolidayDay = isHoliday(today);

      setFormData(prev => ({
        ...prev,
        date: today,
        jobRole: isKnownRole ? employeeRole : "Others",
        isWeekend: isWeekendDay,
        isPublicHoliday: isHolidayDay,
      }));

      setJobRoleCustom(isKnownRole ? "" : employeeRole);
      
      // Set holiday name if applicable
      if (isHolidayDay) {
        setHolidayName(getHolidayName(today));
      }
      
      // Set basic salary from employee
      if (employee?.basicSalary) {
        setBasicSalary(employee.basicSalary);
      }
    }
  }, [currentEntry, employee]);

  // Update weekend/holiday status when date changes
  useEffect(() => {
    if (formData.date) {
      const isWeekendDay = isWeekend(formData.date);
      const isHolidayDay = isHoliday(formData.date);
      
      setFormData(prev => ({
        ...prev,
        isWeekend: isWeekendDay,
        isPublicHoliday: prev.isPublicHoliday || isHolidayDay,
      }));

      if (isHolidayDay) {
        setHolidayName(getHolidayName(formData.date));
      } else {
        setHolidayName("");
      }
    }
  }, [formData.date]);

  // Filter clients based on search term
  useEffect(() => {
    const query = canon(searchTerm);
    if (!query) {
      setFilteredClients([]);
      setShowClientDropdown(false);
      return;
    }

    const filtered = clients.filter(
      (client) => client._idC.includes(query) || client._nmC.includes(query)
    );
    setFilteredClients(filtered.slice(0, 12));
    setShowClientDropdown(true);
  }, [searchTerm, clients]);

  // ========= CLIENT SEARCH HANDLERS =========
  const searchClients = (term) => setSearchTerm(term);

  const selectClient = (client) => {
    setFormData(prev => ({
      ...prev,
      clientId: client.clientId || "",
      clientName: client.clientName || "",
    }));

    const clientLabel = [client.clientId || "", client.clientName || ""]
      .filter(Boolean)
      .join(" - ");
    setSearchTerm(clientLabel);
    setShowClientDropdown(false);
  };

  const clearSelectedClient = () => {
    setFormData(prev => ({ ...prev, clientId: "", clientName: "" }));
    setSearchTerm("");
    setShowClientDropdown(false);

    // Refocus search input
    setTimeout(() => {
      const searchInput = document.getElementById("client-search-input");
      if (searchInput) searchInput.focus();
    }, 0);
  };

  // ========= FORM HANDLERS =========
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // ========= DUPLICATE CHECK =========
  const checkDuplicate = async (employeeId, date, excludeTimesheetId = null) => {
    if (!employeeId || !date) return false;

    try {
      // Check across ALL timesheets for this employee
      const allTsSnap = await firebaseDB.child(`EmployeeBioData/${employeeId}/timesheets`).get();
      if (!allTsSnap.exists()) return false;

      const allTimesheets = allTsSnap.val() || {};
      const duplicates = [];

      // Check every timesheet for this employee
      for (const [tsId, timesheet] of Object.entries(allTimesheets)) {
        if (!timesheet.dailyEntries) continue;
        
        // Skip current timesheet if provided
        if (excludeTimesheetId && tsId === excludeTimesheetId) continue;
        
        const entry = timesheet.dailyEntries[date];
        if (entry) {
          duplicates.push({
            id: `${tsId}_${date}`,
            ...entry,
            timesheetId: tsId
          });
        }
      }

      if (duplicates.length > 0) {
        setDupList(duplicates);
        setDupModalOpen(true);
        return true;
      }
    } catch (error) {
      console.error("Duplicate check error:", error);
    }

    return false;
  };

  // ========= SALARY CALCULATION =========
  const calculateFinalDailySalary = () => {
    const baseDaily = calculateDailySalary();

    // If manual amount is enabled and not emergency, use manual amount
    if (allowManualDaily && !formData.isEmergency) {
      return Number(manualDailyAmount) || 0;
    }

    // If emergency duty, add emergency amount to base
    if (formData.isEmergency) {
      return baseDaily + (Number(emergencyAmount) || 0);
    }

    // Default: base daily salary
    return baseDaily;
  };

  // ========= DATE VALIDATION =========
  const validateDate = (dateString) => {
    if (!dateString) return "Please select a date";
    
    const selectedDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Allow past dates and today only (can be modified as needed)
    if (selectedDate > today) {
      return "Future dates are not allowed";
    }
    
    return null;
  };

  // ========= SUBMIT HANDLER =========
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!employee?.id) {
      alert("Please select an employee first.");
      return;
    }

    if (!formData.date) {
      alert("Please pick a date.");
      return;
    }

    // Validate date
    const dateError = validateDate(formData.date);
    if (dateError) {
      alert(dateError);
      return;
    }

    // Normalize half-day
    let normalizedStatus = formData.status || 'present';
    let normalizedIsHalf = false;
    if (String(normalizedStatus).toLowerCase() === 'half-day') {
      normalizedStatus = 'present';
      normalizedIsHalf = true;
    }

    // Check if it's actually half day from checkbox
    if (formData.isHalfDay) {
      normalizedStatus = 'present';
      normalizedIsHalf = true;
    }

    // Duplicate check (only for new entries or if date changed)
    // For editing, check if date changed and exclude current timesheet
    const currentTimesheetId = timesheet?.id || null;
    if (!currentEntry || (currentEntry && formData.date !== currentEntry.date)) {
      const hasDuplicate = await checkDuplicate(employee.id, formData.date, currentTimesheetId);
      if (hasDuplicate) return;
    }

    // Defaults if no client selected
    const finalClientId = formData.clientId || "DEFAULT";
    const finalClientName = formData.clientName || "Default Client";

    // Final Job Role
    const finalJobRole = formData.jobRole === "Others"
      ? jobRoleCustom.trim()
      : formData.jobRole || "";

    // Salary calculations
    const finalDailySalary = calculateFinalDailySalary();

    // Calculate actual amount for the day (considering half day)
    const actualAmount = normalizedIsHalf 
      ? Math.round(finalDailySalary / 2)
      : Math.round(finalDailySalary);

    // Prepare entry data
    const entryData = {
      // Core data
      date: formData.date,
      clientId: finalClientId,
      clientName: finalClientName,
      jobRole: finalJobRole,
      status: normalizedStatus,
      isHalfDay: normalizedIsHalf,
      
      // Salary data
      basicSalary: Number(basicSalary),
      dailySalary: actualAmount,
      baseDailySalary: calculateDailySalary(),
      
      // Special conditions
      isPublicHoliday: !!formData.isPublicHoliday,
      isEmergency: !!formData.isEmergency,
      isWeekend: formData.isWeekend,
      emergencyType: formData.isEmergency ? emergencyType : "",
      emergencyClient: formData.isEmergency ? emergencyClient : "",
      emergencyAmount: formData.isEmergency ? Number(emergencyAmount || 0) : 0,
      
      // Manual override
      manualDailyEnabled: !formData.isEmergency && allowManualDaily,
      manualDailyAmount: !formData.isEmergency && allowManualDaily ? Number(manualDailyAmount || 0) : null,
      
      // Employee info
      employeeId: employee.id,
      employeeName: `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim(),
      employeeCode: employee?.employeeId || employee?.idNo || "",
      employeeId_date: `${employee.id}_${formData.date}`,
      
      // Metadata
      notes: formData.notes || "",
      holidayName: formData.isPublicHoliday ? holidayName : "",
      timestamp: new Date().toISOString(),
      
      // For editing
      id: currentEntry?.id || Date.now().toString(),
      updatedAt: new Date().toISOString(),
    };

    // Show confirmation modal
    setEntryDataToSave(entryData);
    setShowConfirmModal(true);
  };

  // ========= MODAL HANDLERS =========
  const confirmSave = async () => {
    if (entryDataToSave) {
      await handleSaveEntry(entryDataToSave);
    }
    // setShowConfirmModal(false);
    // setEntryDataToSave(null);
    
    // Close modal
    toggleModal('showEntryModal', false);
    setIsEditing(false);
    setCurrentEntry(null);
  };

  const cancelSave = () => {
    setShowConfirmModal(false);
    setEntryDataToSave(null);
  };

  const closeModal = () => {
    toggleModal('showEntryModal', false);
    setIsEditing(false);
    setCurrentEntry(null);
  };

  // Helper function to format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!showEntryModal) return null;

  return (
    <>
      {/* Main Modal */}
      <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content bg-dark border border-secondary">
            <div className="modal-header bg-secondary">
              <div className="d-flex align-items-center">
                {employee?.employeePhotoUrl && (
                  <img
                    src={employee.employeePhotoUrl}
                    alt="Employee"
                    className="rounded-circle me-3"
                    style={{ width: "50px", height: "50px", objectFit: "cover" }}
                  />
                )}
                <div>
                  <h5 className="modal-title text-white mb-0">
                    {isEditing ? 'Edit Daily Entry' : 'Add Daily Entry'}
                  </h5>
                  <small className="text-light">
                    {employee?.firstName} {employee?.lastName} •{" "}
                    {employee?.idNo || employee?.employeeId} • ₹{employee?.basicSalary || 0}/month
                  </small>
                </div>
              </div>
              <button type="button" className="btn-close btn-close-white" onClick={closeModal} />
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="row g-3">
                  {/* Basic Salary Input */}
                  <div className="col-md-6">
                    <label className="form-label text-warning">
                      <strong>Basic Salary (₹)</strong>
                    </label>
                    <input
                      type="number"
                      className="form-control bg-dark text-white border-warning"
                      value={basicSalary}
                      onChange={(e) => setBasicSalary(Number(e.target.value) || 0)}
                      min="0"
                      step="100"
                    />
                    <small className="text-muted">Monthly basic salary</small>
                  </div>

                  {/* Daily Salary Display */}
                  <div className="col-md-6">
                    <label className="form-label text-success">
                      <strong>Calculated Daily Salary</strong>
                    </label>
                    <div className="form-control bg-dark text-success border-success">
                      <strong>₹{calculateDailySalary()}</strong>
                      <small className="text-muted ms-2">(₹{basicSalary} ÷ 30 days)</small>
                    </div>
                  </div>

                  {/* Manual Daily Amount Toggle */}
                  {!formData.isEmergency && (
                    <div className="col-md-12">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="allowManualDaily"
                          checked={allowManualDaily}
                          onChange={(e) => setAllowManualDaily(e.target.checked)}
                        />
                        <label className="form-check-label text-info" htmlFor="allowManualDaily">
                          Allow manual daily amount
                        </label>
                      </div>

                      {allowManualDaily && (
                        <div className="row mt-2">
                          <div className="col-md-12">
                            <label className="form-label text-info">
                              <strong>Manual Daily Amount (₹)</strong>
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="50"
                              className="form-control bg-dark text-white border-info"
                              placeholder="Enter custom daily amount"
                              value={manualDailyAmount}
                              onChange={(e) => setManualDailyAmount(e.target.value)}
                            />
                            <small className="text-muted">
                              When enabled, this replaces the calculated Daily Salary for this day.
                            </small>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Date with auto-detection */}
                  <div className="col-md-6">
                    <label className="form-label text-info"><strong>Date</strong></label>
                    <input
                      type="date"
                      className="form-control bg-dark text-white border-secondary"
                      value={formData.date}
                      onChange={(e) => handleChange("date", e.target.value)}
                      required
                      disabled={isEditing}
                    />
                    {formData.date && (
                      <div className="mt-1">
                        <small className={formData.isWeekend ? "text-warning" : "text-muted"}>
                          {formatDate(formData.date)}
                          {formData.isWeekend && " (Weekend)"}
                        </small>
                        {formData.isPublicHoliday && (
                          <small className="text-info d-block">
                            <i className="fas fa-star me-1"></i>
                            {holidayName || "Public Holiday"}
                          </small>
                        )}
                      </div>
                    )}
                    {isEditing && (
                      <small className="text-muted d-block">Date cannot be changed in edit mode</small>
                    )}
                  </div>

                  {/* Job Role */}
                  <div className="col-md-6">
                    <label className="form-label text-info">
                      <strong>Job Role</strong>
                    </label>
                    <select
                      className="form-select bg-dark text-white border-secondary"
                      value={formData.jobRole}
                      onChange={(e) => { 
                        const v = e.target.value; 
                        handleChange("jobRole", v); 
                        if (v !== "Others") setJobRoleCustom(""); 
                      }}
                      required
                    >
                      <option value="">Select Job Role</option>
                      {JOB_ROLE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>

                    {formData.jobRole === "Others" && (
                      <input
                        type="text"
                        className="form-control bg-dark text-white border-secondary mt-2"
                        placeholder="Type custom job role"
                        value={jobRoleCustom}
                        onChange={(e) => setJobRoleCustom(e.target.value)}
                        required
                      />
                    )}
                  </div>

                  {/* Client Search */}
                  <div className="col-12">
                    <label className="form-label text-info">
                      <strong>Search Client (ID or Name)</strong>
                    </label>
                    <div className="position-relative">
                      <input
                        id="client-search-input"
                        type="text"
                        className="form-control bg-dark text-white border-secondary"
                        placeholder="Search by client ID (e.g., JC00001) or name…"
                        value={searchTerm}
                        onChange={(e) => searchClients(e.target.value)}
                        onFocus={() => searchTerm && setShowClientDropdown(true)}
                        onBlur={() => setTimeout(() => setShowClientDropdown(false), 150)}
                      />

                      {showClientDropdown && filteredClients.length > 0 && (
                        <div className="position-absolute top-100 start-0 end-0 bg-dark border border-secondary mt-1 rounded shadow-lg z-3 max-h-200 overflow-auto">
                          {filteredClients.map((client) => (
                            <div
                              key={client.key}
                              className="p-2 border-bottom border-secondary hover-bg-gray-700 cursor-pointer"
                              onClick={() => selectClient(client)}
                            >
                              <div className="fw-bold text-white">
                                {client.clientId || "-"} - {client.clientName || "-"}
                              </div>
                              <div className="d-flex flex-wrap gap-2 mt-1">
                                {client.category && (
                                  <small className="text-info">[{client.category}]</small>
                                )}
                                {client.location && (
                                  <small className="text-muted">📍 {client.location}</small>
                                )}
                                {client.contact && (
                                  <small className="text-muted">📞 {client.contact}</small>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Selected Client Display */}
                    {(formData.clientId || formData.clientName) && (
                      <div className="mt-2 p-2 bg-success bg-opacity-10 border border-success rounded d-flex align-items-center justify-content-between">
                        <div>
                          <small className="text-success me-2">
                            <strong>Selected Client:</strong>{" "}
                            {[formData.clientId, formData.clientName].filter(Boolean).join(" - ")}
                          </small>
                          {formData.clientId !== "DEFAULT" && (
                            <small className="text-muted d-block mt-1">
                              Will be saved with this entry
                            </small>
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger m-0"
                          title="Clear selected client"
                          onClick={clearSelectedClient}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div className="col-md-6">
                    <label className="form-label text-warning">
                      <strong>Status</strong>
                    </label>
                    <select
                      className="form-select bg-dark text-white border-secondary"
                      value={formData.status}
                      onChange={(e) => handleChange("status", e.target.value)}
                      disabled={formData.isPublicHoliday}
                    >
                      <option value="present">Present</option>
                      <option value="leave">Leave</option>
                      <option value="half-day">Half Day</option>
                      <option value="holiday">Holiday</option>
                      <option value="absent">Absent</option>
                    </select>
                    {formData.isPublicHoliday && (
                      <small className="text-info d-block mt-1">
                        <i className="fas fa-info-circle me-1"></i>
                        Status is set to Holiday for public holidays
                      </small>
                    )}
                  </div>

                  {/* Special Conditions */}
                  <div className="col-md-6">
                    <label className="form-label text-warning">
                      <strong>Special Conditions</strong>
                    </label>
                    <div className="d-flex flex-wrap gap-3 mt-2">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="isHalfDay"
                          checked={formData.isHalfDay}
                          onChange={(e) => handleChange("isHalfDay", e.target.checked)}
                          disabled={formData.status !== "present" || formData.isPublicHoliday}
                        />
                        <label className="form-check-label text-info" htmlFor="isHalfDay">
                          Half Day
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="isPublicHoliday"
                          checked={formData.isPublicHoliday}
                          onChange={(e) => handleChange("isPublicHoliday", e.target.checked)}
                        />
                        <label className="form-check-label text-info" htmlFor="isPublicHoliday">
                          Public Holiday
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="isEmergency"
                          checked={formData.isEmergency}
                          onChange={(e) => handleChange("isEmergency", e.target.checked)}
                          disabled={formData.isPublicHoliday}
                        />
                        <label className="form-check-label text-danger" htmlFor="isEmergency">
                          Emergency Duty
                        </label>
                      </div>
                      {formData.isWeekend && (
                        <span className="badge bg-warning">
                          <i className="fas fa-umbrella-beach me-1"></i>
                          Weekend
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Emergency Details */}
                  {formData.isEmergency && (
                    <>
                      <div className="col-md-4">
                        <label className="form-label text-danger">
                          <strong>Emergency Duty Type</strong>
                        </label>
                        <input
                          type="text"
                          className="form-control bg-dark text-white border-danger"
                          placeholder="e.g., Night Duty, Urgent Call"
                          value={emergencyType}
                          onChange={(e) => setEmergencyType(e.target.value)}
                        />
                      </div>

                      <div className="col-md-4">
                        <label className="form-label text-danger">
                          <strong>Emergency Client</strong>
                        </label>
                        <input
                          type="text"
                          className="form-control bg-dark text-white border-danger"
                          placeholder="Client name for this emergency"
                          value={emergencyClient}
                          onChange={(e) => setEmergencyClient(e.target.value)}
                        />
                      </div>

                      <div className="col-md-4">
                        <label className="form-label text-danger">
                          <strong>Emergency Amount (₹)</strong>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="50"
                          className="form-control bg-dark text-white border-danger"
                          placeholder="0"
                          value={emergencyAmount}
                          onChange={(e) => setEmergencyAmount(e.target.value)}
                        />
                        <small className="text-muted">
                          Final day = Daily Salary + Emergency Amount
                        </small>
                      </div>
                    </>
                  )}

                  {/* Notes */}
                  <div className="col-12">
                    <label className="form-label text-info">
                      <strong>Notes</strong>
                    </label>
                    <textarea
                      className="form-control bg-dark text-white border-secondary"
                      rows="3"
                      value={formData.notes}
                      onChange={(e) => handleChange("notes", e.target.value)}
                      placeholder="Any additional notes about the work, special instructions, or comments..."
                    />
                    <small className="text-muted">
                      Optional: Add any relevant information about this work day
                    </small>
                  </div>

                  {/* Summary Card */}
                  <div className="col-12">
                    <div className="card bg-gray-800 border-secondary">
                      <div className="card-body">
                        <h6 className="card-title text-info">
                          <i className="fas fa-clipboard-check me-2"></i>
                          Entry Summary
                        </h6>
                        <div className="row text-center">
                          <div className="col-md-3">
                            <small className="text-muted">Date</small>
                            <div className="fw-bold text-white">
                              {formData.date ? formatDate(formData.date) : "Not set"}
                            </div>
                          </div>
                          <div className="col-md-3">
                            <small className="text-muted">Client ID</small>
                            <div className="fw-bold text-white">
                              {formData.clientId || "Default"}
                            </div>
                          </div>
                          <div className="col-md-3">
                            <small className="text-muted">Client Name</small>
                            <div className="fw-bold text-white">
                              {formData.clientName || "Default Client"}
                            </div>
                          </div>
                          <div className="col-md-3">
                            <small className="text-muted">Daily Salary</small>
                            <div className="fw-bold text-success">
                              ₹{(formData.isHalfDay || String(formData.status).toLowerCase() === 'half-day') 
                                ? Math.round(calculateFinalDailySalary() / 2) 
                                : calculateFinalDailySalary()}
                              {formData.isHalfDay && <small className="text-warning ms-1">(½ Day)</small>}
                            </div>
                          </div>
                        </div>
                        <div className="row mt-2 text-center">
                          <div className="col-md-4">
                            <small className="text-muted">Status</small>
                            <div>
                              <span className={`badge ${formData.status === "present" ? "bg-success" : 
                                formData.status === "leave" ? "bg-primary" : 
                                formData.status === "absent" ? "bg-danger" : 
                                formData.status === "holiday" ? "bg-info" : "bg-secondary"}`}>
                                {formData.status}
                                {formData.isHalfDay && " (½)"}
                              </span>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <small className="text-muted">Basic Salary</small>
                            <div className="fw-bold text-warning">
                              ₹{basicSalary}/month
                            </div>
                          </div>
                          <div className="col-md-4">
                            <small className="text-muted">Daily Rate</small>
                            <div className="fw-bold text-info">
                              ₹{calculateDailySalary()}/day
                            </div>
                          </div>
                        </div>
                        {(formData.isPublicHoliday || formData.isEmergency || formData.isWeekend) && (
                          <div className="row mt-2 text-center">
                            <div className="col-12">
                              <small className="text-muted">Special Tags</small>
                              <div className="d-flex justify-content-center gap-2 mt-1">
                                {formData.isPublicHoliday && (
                                  <span className="badge bg-info">
                                    <i className="fas fa-star me-1"></i>
                                    Public Holiday
                                  </span>
                                )}
                                {formData.isEmergency && (
                                  <span className="badge bg-danger">
                                    <i className="fas fa-bell me-1"></i>
                                    Emergency Duty
                                  </span>
                                )}
                                {formData.isWeekend && (
                                  <span className="badge bg-warning">
                                    <i className="fas fa-umbrella-beach me-1"></i>
                                    Weekend
                                  </span>
                                )}
                                {allowManualDaily && (
                                  <span className="badge bg-purple">
                                    <i className="fas fa-edit me-1"></i>
                                    Manual Amount
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  <i className="fas fa-times me-1"></i>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <i className={isEditing ? "fas fa-save me-1" : "fas fa-plus me-1"}></i>
                  {isEditing ? "Update Entry" : "Add Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Duplicate Entry Modal */}
      {dupModalOpen && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.8)" }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content bg-dark border border-danger">
              <div className="modal-header border-danger">
                <h5 className="modal-title text-danger">
                  <i className="bi bi-exclamation-triangle me-2" />
                  Duplicate Entry Found
                </h5>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning bg-warning bg-opacity-10 text-white">
                  <i className="fas fa-exclamation-circle me-2"></i>
                  An entry already exists for <strong>{formatDate(formData.date)}</strong>.
                  Please choose a different date or edit the existing entry.
                </div>
                <div className="table-responsive">
                  <table className="table table-sm table-dark mb-0">
                    <thead>
                      <tr>
                        <th>Timesheet ID</th>
                        <th>Client</th>
                        <th>Status</th>
                        <th>Salary</th>
                        <th>Saved</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dupList.map((duplicate) => (
                        <tr key={duplicate.id}>
                          <td>
                            <small className="text-muted">{duplicate.timesheetId}</small>
                          </td>
                          <td className="text-info">
                            {[duplicate.clientId, duplicate.clientName].filter(Boolean).join(" - ")}
                          </td>
                          <td>
                            <span className={`badge ${duplicate.status === "present" ? "bg-success" : 
                              duplicate.status === "absent" ? "bg-danger" : 
                              duplicate.status === "leave" ? "bg-primary" : 
                              duplicate.status === "holiday" ? "bg-info" : "bg-secondary"}`}>
                              {duplicate.status}
                              {duplicate.isHalfDay && " (½)"}
                            </span>
                          </td>
                          <td className="text-success">
                            ₹{duplicate.dailySalary || 0}
                          </td>
                          <td className="text-muted">
                            <small>
                              {duplicate.updatedAt
                                ? new Date(duplicate.updatedAt).toLocaleString("en-IN")
                                : duplicate.timestamp
                                  ? new Date(duplicate.timestamp).toLocaleString("en-IN")
                                  : "-"}
                            </small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="alert alert-info bg-info bg-opacity-10 border-info mt-3">
                  <small className="text-info">
                    <i className="fas fa-info-circle me-1"></i>
                    Each employee can have only one entry per day. If you need to override, 
                    please edit the existing entry instead of creating a new one.
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setDupModalOpen(false);
                    setDupList([]);
                  }}
                >
                  <i className="fas fa-times me-1"></i>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && entryDataToSave && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.8)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark border border-warning">
              <div className="modal-header border-warning">
                <h5 className="modal-title text-warning">
                  <i className="fas fa-check-circle me-2"></i>
                  Confirm Daily Entry
                </h5>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning bg-warning bg-opacity-10 border-warning">
                  <strong>Please review the entry details before saving:</strong>
                </div>

                {/* Salary Breakdown */}
                <div className="card bg-gray-800 border-success mt-2">
                  <div className="card-body py-2">
                    <div className="d-flex justify-content-between text-white">
                      <span>Base Daily Salary</span>
                      <strong>₹{calculateDailySalary()}</strong>
                    </div>

                    {entryDataToSave.isEmergency && (
                      <div className="d-flex justify-content-between text-danger">
                        <span>Emergency Amount</span>
                        <strong>₹{Number(emergencyAmount || 0)}</strong>
                      </div>
                    )}

                    {entryDataToSave.manualDailyEnabled && (
                      <div className="d-flex justify-content-between text-info">
                        <span>Manual Override</span>
                        <strong>₹{Number(manualDailyAmount || 0)}</strong>
                      </div>
                    )}

                    {entryDataToSave.isHalfDay && (
                      <div className="d-flex justify-content-between text-warning">
                        <span>Half Day Adjustment</span>
                        <strong>-50%</strong>
                      </div>
                    )}

                    <hr className="border-secondary my-2" />
                    <div className="d-flex justify-content-between text-success">
                      <span>Total for the day</span>
                      <strong>
                        ₹{entryDataToSave.dailySalary}
                        {entryDataToSave.isHalfDay && <small className="text-warning ms-1">(½ Day)</small>}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <small className="text-muted">Date</small>
                    <div className="fw-bold text-white">{formatDate(entryDataToSave.date)}</div>
                  </div>
                  <div className="col-6">
                    <small className="text-muted">Job Role</small>
                    <div className="fw-bold text-white">{entryDataToSave.jobRole}</div>
                  </div>
                  <div className="col-12">
                    <small className="text-muted">Client</small>
                    <div className="fw-bold text-white">
                      {[entryDataToSave.clientId, entryDataToSave.clientName]
                        .filter(Boolean)
                        .join(" - ")}
                    </div>
                  </div>
                  <div className="col-6">
                    <small className="text-muted">Status</small>
                    <div className="fw-bold text-capitalize text-info">
                      {entryDataToSave.status}
                      {entryDataToSave.isHalfDay && " (Half Day)"}
                    </div>
                  </div>
                  <div className="col-6">
                    <small className="text-muted">Daily Salary</small>
                    <div className="fw-bold text-success">
                      ₹{entryDataToSave.dailySalary}
                    </div>
                  </div>
                  {(entryDataToSave.isPublicHoliday || entryDataToSave.isEmergency || entryDataToSave.isWeekend) && (
                    <div className="col-12">
                      <small className="text-muted">Special Conditions</small>
                      <div className="d-flex flex-wrap gap-2 mt-1">
                        {entryDataToSave.isHalfDay && (
                          <span className="badge bg-warning">
                            <i className="fas fa-clock me-1"></i>
                            Half Day
                          </span>
                        )}
                        {entryDataToSave.isPublicHoliday && (
                          <span className="badge bg-info">
                            <i className="fas fa-star me-1"></i>
                            {entryDataToSave.holidayName || "Public Holiday"}
                          </span>
                        )}
                        {entryDataToSave.isEmergency && (
                          <span className="badge bg-danger">
                            <i className="fas fa-bell me-1"></i>
                            Emergency Duty
                          </span>
                        )}
                        {entryDataToSave.isWeekend && (
                          <span className="badge bg-warning">
                            <i className="fas fa-umbrella-beach me-1"></i>
                            Weekend
                          </span>
                        )}
                        {entryDataToSave.manualDailyEnabled && (
                          <span className="badge bg-purple">
                            <i className="fas fa-edit me-1"></i>
                            Manual Amount
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="alert alert-info bg-info bg-opacity-10 border-info">
                  <small className="text-info opacity-50">
                    <strong>Employee:</strong> {entryDataToSave.employeeName} ({entryDataToSave.employeeCode})<br />
                    <strong>Basic Salary:</strong> ₹{entryDataToSave.basicSalary}/month • 
                    <strong> Daily Rate:</strong> ₹{entryDataToSave.baseDailySalary}/day
                  </small>
                </div>

                {entryDataToSave.notes && (
                  <div className="alert alert-secondary bg-secondary bg-opacity-10 border-secondary">
                    <small className="text-white">
                      <strong>Notes:</strong> {entryDataToSave.notes}
                    </small>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={cancelSave}>
                  <i className="fas fa-times me-1"></i>
                  Cancel
                </button>
                <button type="button" className="btn btn-success" onClick={confirmSave}>
                  <i className="fas fa-check me-1"></i>
                  Confirm & Save Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EntryModal;