import React, { useEffect, useMemo, useState } from "react";
import firebaseDB from "../../firebase";
import { CLIENT_PATHS } from "../../utils/dataPaths";

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

const DailyEntryModal = ({ entry, isEditing, employee, onSave, onAutoFill, onClose, mode = 'single', timesheetId }) => {

  // ========= STATE VARIABLES =========

  // Timesheet period (generate from here)
  const [tsMode, setTsMode] = useState(null);      // no default
  const [tsMonth, setTsMonth] = useState('');      // no default
  const [tsStart, setTsStart] = useState('');      // no default
  const [tsEnd, setTsEnd] = useState('');          // no default

  const shortEmpCode = (emp) => {
    const raw = emp?.employeeId || emp?.idNo || emp?.id || '';
    const m = String(raw).match(/^([A-Za-z]+)0*([0-9]+)$/);
    if (m) return `${m[1]}${parseInt(m[2], 10)}`;
    return (raw || '').replace(/[^A-Za-z0-9]/g, '');
  };

  const monthParts = (yyyyMm) => {
    const [y, m] = (yyyyMm || '').split('-');
    return { yy: (y || '').slice(-2), mm: m || '' };
  };

  const tsPreviewId = useMemo(() => {
    const base = shortEmpCode(employee);
    if (!base) return '';

    if (tsMode === 'month' && tsMonth) {
      const { yy, mm } = monthParts(tsMonth);
      if (!yy || !mm) return '';
      return `${base}-${mm}-${yy}`;
    }

    if (tsMode === 'range' && tsStart) {
      const { yy, mm } = monthParts(tsStart.slice(0, 7));
      if (!yy || !mm) return '';
      return `${base}-${mm}-${yy}`;
    }
  
  return '';
}, [employee, tsMode, tsMonth, tsStart, tsEnd]);


  // Main form data
  const [formData, setFormData] = useState({
    date: "",
    clientId: "",
    clientName: "",
    jobRole: "",
    status: "present",
    isPublicHoliday: false,
    isEmergency: false,
    notes: "",
  });

  // Custom job role when "Others" is selected
  const [jobRoleCustom, setJobRoleCustom] = useState("");

  // Client management
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Salary calculations - FIXED: Use employee's basic salary directly
  const [basicSalary, setBasicSalary] = useState(employee?.basicSalary || 0);

  // Emergency duty details
  const [emergencyType, setEmergencyType] = useState("");
  const [emergencyClient, setEmergencyClient] = useState("");
  const [emergencyAmount, setEmergencyAmount] = useState("");

  // Manual daily amount override
  const [allowManualDaily, setAllowManualDaily] = useState(false);
  const [manualDailyAmount, setManualDailyAmount] = useState("");

  // Modals
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [entryDataToSave, setEntryDataToSave] = useState(null);
  const [dupModalOpen, setDupModalOpen] = useState(false);
  const [dupList, setDupList] = useState([]);

  // ========= UTILITY FUNCTIONS =========

  const toStr = (v) => (v == null ? "" : String(v));

  const canon = (v) =>
    toStr(v).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim();

  // Calculate daily salary from basic salary - FIXED: Use current basicSalary state
  const calculateDailySalary = () => Math.round((Number(basicSalary) || 0) / 30);

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
    } catch {
      return [];
    }
  };

  // Load all clients from multiple paths and deduplicate


// ===== LOAD CLIENTS (NEW PATHS) =====
const loadClients = async () => {
  const allClients = [];

  for (const path of Object.values(CLIENT_PATHS)) {
    try {
      const snap = await firebaseDB.child(path).get();
      if (snap.exists()) {
        Object.entries(snap.val()).forEach(([key, data]) => {
          allClients.push({
            key,
            clientId: data.idNo || data.clientId || "",
            clientName: data.clientName || data.name || "",
            location: data.location || "",
            _idC: String(data.idNo || "").toLowerCase(),
            _nmC: String(data.clientName || "").toLowerCase(),
          });
        });
      }
    } catch (e) {
      console.error("Client load error:", path, e);
    }
  }

  // 🔥 DEDUP
  const unique = [];
  const seen = new Set();

  allClients.forEach(c => {
    const k = `${c.clientId}|${c.clientName}`;
    if (!seen.has(k)) {
      seen.add(k);
      unique.push(c);
    }
  });

  setClients(unique);
};


  // ========= EFFECTS =========

  useEffect(() => {
    loadClients();

    // Initialize form with employee data or existing entry
    if (entry) {
      // Handle job role (known vs custom)
      const incomingRole = entry.jobRole || employee?.primarySkill || "";
      const isKnownRole = JOB_ROLE_OPTIONS.some(
        (opt) => opt.toLowerCase() === incomingRole?.toLowerCase()
      );
      const selectValue = isKnownRole ? incomingRole : "Others";
      const customValue = isKnownRole ? "" : incomingRole;

      setFormData({
        date: entry.date || "",
        clientId: entry.clientId || "",
        clientName: entry.clientName || "",
        jobRole: selectValue || "",
        status: entry.status || "present",
        isPublicHoliday: entry.isPublicHoliday || false,
        isEmergency: entry.isEmergency || false,
        notes: entry.notes || "",
      });

      setJobRoleCustom(customValue);

      // Set search term for client display
      if (entry.clientName) {
        const clientLabel = [entry.clientId, entry.clientName].filter(Boolean).join(" - ");
        setSearchTerm(clientLabel);
      }

      // Initialize emergency data if exists
      if (entry.isEmergency) {
        setEmergencyType(entry.emergencyType || "");
        setEmergencyClient(entry.emergencyClient || "");
        setEmergencyAmount(entry.emergencyAmount?.toString() || "");
      }

      // Initialize manual amount if exists
      if (entry.manualDailyEnabled) {
        setAllowManualDaily(true);
        setManualDailyAmount(entry.manualDailyAmount?.toString() || "");
      }
    } else {
      // New entry - set defaults
      const today = new Date().toISOString().split("T")[0];
      const employeeRole = employee?.primarySkill || "";
      const isKnownRole = JOB_ROLE_OPTIONS.some(
        (opt) => opt.toLowerCase() === employeeRole?.toLowerCase()
      );

      setFormData((prev) => ({
        ...prev,
        date: today,
        jobRole: isKnownRole ? employeeRole : "Others",
      }));

      setJobRoleCustom(isKnownRole ? "" : employeeRole);
    }
  }, [entry, employee]);

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
    setFormData((prev) => ({
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
    setFormData((prev) => ({ ...prev, clientId: "", clientName: "" }));
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
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ========= DUPLICATE CHECK =========

  const checkDuplicate = async (employeeId, date, excludeTsId = null) => {
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

      // Skip the current timesheet so editing doesn't flag itself
     if (excludeTsId && tsId === excludeTsId) continue;
      
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
  // ========= SALARY CALCULATION - FIXED =========

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


  // ========= SUBMIT HANDLER (replace entire function) =========
  const handleSubmit = async (e) => {
    e.preventDefault();

    const employeeId = employee?.id || employee?.employeeId;
    if (!employeeId) {
      alert("Please select an employee first.");
      return;
    }

    // In AUTOFILL mode, we do NOT require a date; in SINGLE edit we do.
    if (mode === 'single' && isEditing && !formData.date) {
      alert("Please pick a date.");
      return;
    }

    // Normalize half-day first (so we can safely reuse below)
    let normalizedStatus = formData.status || 'present';
    let normalizedIsHalf = false;
    if (String(normalizedStatus).toLowerCase() === 'half-day') {
      normalizedStatus = 'present';
      normalizedIsHalf = true;
    }

    // Duplicate check only for SINGLE mode (we check exact day)
    // Duplicate check ONLY if the date was changed during edit.
if (mode === 'single' && isEditing && formData.date && formData.date !== entry?.date) {
    const hasDuplicate = await checkDuplicate(
      employeeId,
      formData.date,
      timesheetId || null   // exclude the current timesheet
    );
    if (hasDuplicate) return;
    }

    // Defaults if no client selected
    const finalClientId = formData.clientId || "DEFAULT";
    const finalClientName = formData.clientName || "Default Client";

    // Final Job Role
    const finalJobRole = formData.jobRole === "Others"
      ? jobRoleCustom.trim()
      : formData.jobRole || "";

    // Salary preview (uses your helpers)
    const finalDailySalary = calculateFinalDailySalary();

    // Period (the parent needs this to open/create the right header)
    const payload = {
      // period fields sent to parent
      tsMode,
      tsMonth,
      tsStart,
      tsEnd,
      tsPreviewId,
      // minimal template for autofill or single entry save
      status: normalizedStatus,
      isHalfDay: normalizedIsHalf || formData.isHalfDay || false,
      jobRole: finalJobRole,
      clientId: finalClientId,
      clientName: finalClientName,
      // emergency + manual overrides
      isPublicHoliday: !!formData.isPublicHoliday,
      isEmergency: !!formData.isEmergency,
      emergencyType: formData.isEmergency ? emergencyType : "",
      emergencyClient: formData.isEmergency ? emergencyClient : "",
      emergencyAmount: formData.isEmergency ? Number(emergencyAmount || 0) : 0,
      manualDailyEnabled: !formData.isEmergency && allowManualDaily,
      manualDailyAmount: !formData.isEmergency && allowManualDaily ? Number(manualDailyAmount || 0) : null,
    };

    if (mode === 'autofill') {
      const periodChosen =
        (tsMode === 'month' && !!tsMonth) ||
        (tsMode === 'range' && !!tsStart && !!tsEnd);
      if (!periodChosen) {
        alert('Please select a timesheet period (month or custom range).');
        return;
      }
      onAutoFill?.(payload);
      onClose?.();
      return;
    }


    // SINGLE mode (add/edit one day)
    const entryData = {
      ...payload,
      date: formData.date, // present for edit (hidden in UI when not editing)
      id: entry?.id || Date.now().toString(),
      basicSalary: Number(basicSalary),
      dailySalary: Math.max(0, Math.round(finalDailySalary)),
      employeeId,
      employeeName: `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim(),
      employeeId_date: `${employeeId}_${formData.date}`,
      notes: formData.notes || "",
      timestamp: new Date().toISOString(),
    };

    // OPEN confirm; DO NOT call onSave yet (prevents empty headers in DB)
    setEntryDataToSave(entryData);
    setShowConfirmModal(true);
  };

  // ========= MODAL HANDLERS =========

  const confirmSave = () => {
    if (entryDataToSave) onSave(entryDataToSave);
    setShowConfirmModal(false);
    setEntryDataToSave(null);
  };

  const cancelSave = () => {
    setShowConfirmModal(false);
    setEntryDataToSave(null);
  };

  const modalTitle =
    isEditing ? 'Edit Daily Entry'
      : (mode === 'autofill' ? 'Auto-Fill Period' : 'Add Daily Entry');


  // ========= RENDER =========

  return (
    <>
      {/* Main Modal */}
      <div
        className="modal fade show"
        style={{ display: "block", backgroundColor: "rgba(0,0,0,0.8)" }}
        tabIndex="-1"
      >
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
                  <h5 className="modal-title text-white mb-0">{modalTitle}</h5>

                  <small className="text-light">
                    {employee?.firstName} {employee?.lastName} •{" "}
                    {employee?.idNo || employee?.employeeId}
                  </small>
                </div>
              </div>
              <button type="button" className="btn-close btn-close-white" onClick={onClose} />
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">

                {mode === 'autofill' && (
                  <div className="col-12">
                    <div className="card bg-dark border-warning">
                      <div className="card-body">
                        <h6 className="text-warning mb-3">Auto-Fill Options</h6>
                        <div className="row g-3">
                          <div className="col-md-4">
                            <label className="form-label text-info"><strong>Default Status</strong></label>
                            <select
                              className="form-select bg-dark text-white border-secondary"
                              value={formData.status}
                              onChange={(e) => handleChange("status", e.target.value)}
                            >
                              <option value="present">Present</option>
                              <option value="leave">Leave</option>
                              <option value="holiday">Holiday</option>
                              <option value="absent">Absent</option>
                            </select>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label text-info"><strong>Overwrite Existing</strong></label>
                            <div className="form-check form-switch mt-2">
                              <input className="form-check-input" type="checkbox" id="overwriteExisting"
                                checked={formData.overwriteExisting || false}
                                onChange={(e) => handleChange("overwriteExisting", e.target.checked)} />
                              <label className="form-check-label text-muted" htmlFor="overwriteExisting">
                                Replace entries on same dates
                              </label>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label text-info"><strong>Job Role</strong></label>
                            {formData.jobRole === "Others" && (
                              <input
                                type="text"
                                className="form-control bg-dark text-white border-secondary mb-2"
                                placeholder="Type custom job role"
                                value={jobRoleCustom}
                                onChange={(e) => setJobRoleCustom(e.target.value)}
                              />
                            )}
                            <select
                              className="form-select bg-dark text-white border-secondary"
                              value={formData.jobRole}
                              onChange={(e) => {
                                const v = e.target.value;
                                handleChange("jobRole", v);
                                if (v !== "Others") setJobRoleCustom("");
                              }}
                            >
                              <option value="">Select Job Role</option>
                              {JOB_ROLE_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>


                          </div>

                        </div>
                        <small className="text-muted d-block mt-2">
                          Auto-Fill will create entries for all days in the selected period. Duplicates are skipped unless “Overwrite” is enabled.
                        </small>
                      </div>
                    </div>
                  </div>
                )}


                <div className="row g-3">
                  {/* Timesheet ID + Period (generated here) */}
                  <div className="col-12">
                    <div className="card bg-dark border-info">
                      <div className="card-body">
                        <div className="row g-3 align-items-end">
                          <div className="col-md-4">
                            <label className="form-label text-info"><strong>Timesheet ID (auto)</strong></label>
                            <div className="form-control bg-dark text-info border-info">
                              {tsPreviewId || 'Select period to generate'}
                            </div>
                            <small className="text-muted">Final ID may add -2, -3 when saved.</small>
                          </div>
                          {/* Timesheet Period */}
                          {/* Timesheet Period */}
                          <div className="col-md-8">
                            <label className="form-label text-info"><strong>Timesheet Period</strong></label>

                            {isEditing ? (
                              // Read-only when editing a row
                              <div className="form-control-plaintext text-white">
                                <small className="text-muted me-2">Locked</small>
                                {tsMode === 'month' ? tsMonth : `${tsStart} to ${tsEnd}`}
                              </div>
                            ) : (
                              // Editable when not editing (for autofill)
                              <div className="d-flex align-items-center gap-3 flex-wrap">
                                <div className="form-check">
                                  <input className="form-check-input" type="radio" name="tsMode" id="tsModeMonth"
                                    checked={tsMode === 'month'}
                                    onChange={() => setTsMode('month')}
                                  />
                                  <label className="form-check-label" htmlFor="tsModeMonth">Month</label>
                                </div>
                                <div className="form-check">
                                  <input className="form-check-input" type="radio" name="tsMode" id="tsModeRange"
                                    checked={tsMode === 'range'}
                                    onChange={() => setTsMode('range')}
                                  />
                                  <label className="form-check-label" htmlFor="tsModeRange">Custom Range</label>
                                </div>
                                {tsMode === 'month' ? (
                                  <input type="month" className="form-control bg-dark text-white border-secondary"
                                    style={{ maxWidth: 220 }}
                                    value={tsMonth}
                                    onChange={(e) => setTsMonth(e.target.value)}
                                  />
                                ) : (
                                  <div className="d-flex gap-2">
                                    <input type="date" className="form-control bg-dark text-white border-secondary"
                                      value={tsStart}
                                      onChange={(e) => setTsStart(e.target.value)}
                                    />
                                    <span>to</span>
                                    <input type="date" className="form-control bg-dark text-white border-secondary"
                                      value={tsEnd}
                                      onChange={(e) => setTsEnd(e.target.value)}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="row g-3">
                    {/* Basic Salary Input - FIXED */}
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

                    {/* Daily Salary Display - FIXED */}
                    <div className="col-md-6">
                      <label className="form-label text-success">
                        <strong>Calculated Daily Salary</strong>
                      </label>
                      <div className="form-control bg-dark text-success border-success">
                        <strong>₹{calculateDailySalary()}</strong>
                        <small className="text-muted ms-2">(₹{basicSalary} ÷ 30 days)</small>
                      </div>
                    </div>

                    {/* Manual Daily Amount Toggle - FIXED */}
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

                    {/* Date (only show for SINGLE + Editing) */}
                    {mode === 'single' && isEditing && (
                      <div className="col-md-6">
                        <label className="form-label text-info"><strong>Date</strong></label>
                        <input
                          type="date"
                          className="form-control bg-dark text-white border-secondary"
                          value={formData.date}
                          onChange={(e) => handleChange("date", e.target.value)}
                          required
                        />
                      </div>
                    )}

                    {/* Date (only show for SINGLE mode, always required for editing) */}
                    {(mode === 'single') && (
                      <div className="col-md-6">
                        <label className="form-label text-info"><strong>Date</strong></label>
                        <input
                          type="date"
                          className="form-control bg-dark text-white border-secondary"
                          value={formData.date}
                          onChange={(e) => handleChange("date", e.target.value)}
                          required
                          disabled={isEditing} // Disable date change in edit mode to maintain data integrity
                        />
                        {isEditing && (
                          <small className="text-muted">Date cannot be changed in edit mode</small>
                        )}
                      </div>
                    )}


                    {/* Job Role */}
                    <div className="col-md-6">
                      <label className="form-label text-info">
                        <strong>Job Role</strong>
                      </label>
                      <select
                        className="form-select bg-dark text-white border-secondary"
                        value={formData.jobRole}
                        onChange={(e) => { const v = e.target.value; handleChange("jobRole", v); if (v !== "Others") setJobRoleCustom(""); }}
                        required
                      >
                        <option value="">Select Job Role</option>
                        {JOB_ROLE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>

                      {formData.jobRole === "Others" && mode !== 'autofill' && (
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
                                {client.location && (
                                  <small className="text-muted">Location: {client.location}</small>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Selected Client Display */}
                      {(formData.clientId || formData.clientName) && (
                        <div className="mt-2 p-2 bg-success bg-opacity-10 border border-success rounded d-flex align-items-center justify-content-between">
                          <small className="text-success me-2">
                            <strong>Selected Client:</strong>{" "}
                            {[formData.clientId, formData.clientName].filter(Boolean).join(" - ")}
                          </small>
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
                      >
                        <option value="present">Present</option>
                        <option value="leave">Leave</option>
                        <option value="half-day">Half Day</option>
                        <option value="holiday">Holiday</option>
                        <option value="absent">Absent</option>
                      </select>
                    </div>

                    {/* Special Conditions */}
                    <div className="col-md-6">
                      <label className="form-label text-warning">
                        <strong>Special Conditions</strong>
                      </label>
                      <div className="d-flex gap-3 mt-2">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="isPublicHoliday"
                            checked={formData.isPublicHoliday}
                            onChange={(e) => handleChange("isPublicHoliday", e.target.checked)}
                            disabled={formData.status === "present"}
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
                          />
                          <label className="form-check-label text-danger" htmlFor="isEmergency">
                            Emergency Duty
                          </label>
                        </div>
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
                            placeholder="e.g., Night Duty"
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
                        placeholder="Any additional notes about the work..."
                      />
                    </div>

                    {/* Summary */}
                    <div className="col-12">
                      <div className="card bg-gray-800 border-secondary">
                        <div className="card-body">
                          <h6 className="card-title text-info">Entry Summary</h6>
                          <div className="row text-center">
                            <div className="col-md-3">
                              <small className="text-muted">Date</small>
                              <div className="fw-bold text-white">
                                {formData.date || "Not set"}
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
                                ₹{(String(formData.status || '').toLowerCase() === 'half-day') ? Math.round(calculateFinalDailySalary() / 2) : calculateFinalDailySalary()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={onClose}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {isEditing ? "Update Entry" : "Add Entry"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Duplicate Entry Modal */}
      {dupModalOpen && (
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.8)" }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark border border-danger">
              <div className="modal-header border-danger">
                <h5 className="modal-title text-danger">
                  <i className="bi bi-exclamation-triangle me-2" />
                  Date Already Exists
                </h5>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning bg-warning bg-opacity-10 text-white">
                  An entry already exists for <strong>{formData.date}</strong>.
                </div>
                <div className="table-responsive">
                  <table className="table table-sm table-dark mb-0">
                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Status</th>
                        <th>Saved</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dupList.map((duplicate) => (
                        <tr key={duplicate.id}>
                          <td className="text-info">
                            {[duplicate.clientId, duplicate.clientName].filter(Boolean).join(" - ")}
                          </td>
                          <td>
                            <span
                              className={`badge ${duplicate.status === "present"
                                ? "bg-success"
                                : duplicate.status === "absent"
                                  ? "bg-danger"
                                  : "bg-secondary"
                                }`}
                            >
                              {duplicate.status}
                            </span>
                          </td>
                          <td className="text-muted">
                            {duplicate.updatedAt
                              ? new Date(duplicate.updatedAt).toLocaleString("en-IN")
                              : duplicate.timestamp
                                ? new Date(duplicate.timestamp).toLocaleString("en-IN")
                                : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-white mt-3 mb-0">
                  Please choose a different date or edit the existing entry.
                </p>
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
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && entryDataToSave && (
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.8)" }}
          tabIndex="-1"
        >
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
                  <strong>Please review the entry details:</strong>
                </div>

                {/* Salary Breakdown - FIXED */}
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

                    <hr className="border-secondary my-2" />
                    <div className="d-flex justify-content-between text-success">
                      <span>Total for the day</span>
                      <strong>₹{(String(formData.status || '').toLowerCase() === 'half-day') ? Math.round(calculateFinalDailySalary() / 2) : calculateFinalDailySalary()}</strong>
                    </div>
                  </div>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <small className="text-muted">Date</small>
                    <div className="fw-bold text-white">{entryDataToSave.date}</div>
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
                    </div>
                  </div>
                  <div className="col-6">
                    <small className="text-muted">Daily Salary</small>
                    <div className="fw-bold text-success">
                      ₹{(String(formData.status || '').toLowerCase() === 'half-day') ? Math.round(calculateFinalDailySalary() / 2) : calculateFinalDailySalary()}
                    </div>
                  </div>
                  {(entryDataToSave.isPublicHoliday || entryDataToSave.isEmergency) && (
                    <div className="col-12">
                      <small className="text-muted">Special Conditions</small>
                      <div>
                        {entryDataToSave.isPublicHoliday && (
                          <span className="badge bg-info me-2">Public Holiday</span>
                        )}
                        {entryDataToSave.isEmergency && (
                          <span className="badge bg-danger">Emergency Duty</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="alert alert-info bg-info bg-opacity-10 border-info">
                  <small className="text-info opacity-50">
                    <strong>Employee:</strong> {entryDataToSave.employeeName}
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={cancelSave}>
                  <i className="fas fa-times me-1"></i>
                  Cancel
                </button>
                <button type="button" className="btn btn-success" onClick={confirmSave}>
                  <i className="fas fa-check me-1"></i>
                  Confirm & Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


    </>
  );
};

export default DailyEntryModal;