import React, { useState, useEffect, useMemo } from 'react';
import firebaseDB from '../../firebase';
import DailyEntryModal from './DailyEntryModal';
import AdvanceManagement from './AdvanceManagement';
import WorkerSearch from './WorkerSearch';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';

const DisplayTimeSheet = () => {
  // State declarations
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [timesheet, setTimesheet] = useState(null);
  const [dailyEntries, setDailyEntries] = useState([]);
  const [clients, setClients] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [currentEntry, setCurrentEntry] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [useDateRange, setUseDateRange] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateEntries, setDuplicateEntries] = useState([]);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [previousTimesheets, setPreviousTimesheets] = useState([]);
  const [showSubmittedError, setShowSubmittedError] = useState(false);
  const [submittedTimesheetInfo, setSubmittedTimesheetInfo] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTo, setAssignTo] = useState('');

  // Initialize current month and get current user
  useEffect(() => {
    const current = new Date().toISOString().slice(0, 7);
    setSelectedMonth(current);
    
    // Set default date range (current month)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);

    // Initialize Firebase Auth
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          displayName: user.displayName || user.email,
          email: user.email
        });
        // Store in localStorage for backup
        localStorage.setItem('currentUser', JSON.stringify({
          uid: user.uid,
          displayName: user.displayName || user.email,
          email: user.email
        }));
      } else {
        // Redirect to login or handle unauthorized
        console.log('No user logged in');
        // You can redirect to login page here
        // window.location.href = '/login';
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch employees and clients
  useEffect(() => {
    fetchEmployees();
    fetchClients();
  }, []);

  // Load timesheet when employee or period changes
  useEffect(() => {
    if (selectedEmployee && (selectedMonth || (useDateRange && startDate && endDate))) {
      loadTimesheet();
      loadAdvances();
      loadPreviousTimesheets();
    }
  }, [selectedEmployee, selectedMonth, startDate, endDate, useDateRange]);

  const fetchEmployees = async () => {
    const snapshot = await firebaseDB.child("EmployeeBioData").once('value');
    if (snapshot.exists()) {
      const employeesData = Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...data,
        displayName: `${data.firstName} ${data.lastName} (${data.employeeId || data.idNo})`
      }));
      setEmployees(employeesData);
    }
  };

  const fetchClients = async () => {
    const snapshot = await firebaseDB.child("Clients").once('value');
    if (snapshot.exists()) {
      setClients(Object.values(snapshot.val()));
    }
  };

  const getTimesheetId = () => {
    if (useDateRange) {
      return `${selectedEmployee}_${startDate}_to_${endDate}`;
    }
    return `${selectedEmployee}_${selectedMonth}`;
  };

  const loadTimesheet = async () => {
    const timesheetId = getTimesheetId();
    const snapshot = await firebaseDB.child(`Timesheets/${timesheetId}`).once('value');
    
    if (snapshot.exists()) {
      const timesheetData = snapshot.val();
      setTimesheet(timesheetData);
      
      // Check if timesheet is already submitted
      if (timesheetData.status === 'submitted' || timesheetData.status === 'approved') {
        setShowSubmittedError(true);
        setSubmittedTimesheetInfo({
          status: timesheetData.status,
          submittedBy: timesheetData.submittedByName,
          submittedAt: timesheetData.submittedAt
        });
      } else {
        setShowSubmittedError(false);
      }
      
      loadDailyEntries(timesheetId);
    } else {
      createNewTimesheet(timesheetId);
      setShowSubmittedError(false);
    }
  };

  const loadPreviousTimesheets = async () => {
    if (!selectedEmployee) return;

    try {
      const snapshot = await firebaseDB.child('Timesheets')
        .orderByChild('employeeId')
        .equalTo(selectedEmployee)
        .once('value');
      
      if (snapshot.exists()) {
        const allTimesheets = Object.values(snapshot.val());
        // Filter out current timesheet and sort by created date (newest first)
        const previous = allTimesheets
          .filter(ts => ts.id !== getTimesheetId())
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 6); // Last 6 timesheets
        
        setPreviousTimesheets(previous);
      } else {
        setPreviousTimesheets([]);
      }
    } catch (error) {
      console.error('Error loading previous timesheets:', error);
    }
  };

  const createNewTimesheet = (timesheetId) => {
    const employee = employees.find(emp => emp.id === selectedEmployee);
    const period = useDateRange ? 
      `${startDate} to ${endDate}` : 
      `${selectedMonth}`;

    const newTimesheet = {
      id: timesheetId,
      employeeId: selectedEmployee,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeData: employee,
      period,
      startDate: useDateRange ? startDate : `${selectedMonth}-01`,
      endDate: useDateRange ? endDate : `${selectedMonth}-31`,
      useDateRange,
      status: 'draft',
      totalDays: 0,
      workingDays: 0,
      leaves: 0,
      holidays: 0,
      emergencies: 0,
      totalSalary: 0,
      advances: 0,
      netPayable: 0,
      createdBy: currentUser?.uid || 'admin',
      createdByName: currentUser?.displayName || 'Admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setTimesheet(newTimesheet);
    setDailyEntries([]);
  };

  const loadDailyEntries = async (timesheetId) => {
    const snapshot = await firebaseDB.child(`TimesheetEntries`)
      .orderByChild('timesheetId')
      .equalTo(timesheetId)
      .once('value');
    
    if (snapshot.exists()) {
      const entries = Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...data
      }));
      // Sort by date
      entries.sort((a, b) => new Date(a.date) - new Date(b.date));
      setDailyEntries(entries);
    } else {
      setDailyEntries([]);
    }
  };

  const loadAdvances = async () => {
    const snapshot = await firebaseDB.child(`Advances`)
      .orderByChild('employeeId')
      .equalTo(selectedEmployee)
      .once('value');
    
    if (snapshot.exists()) {
      setAdvances(Object.values(snapshot.val()));
    }
  };

  // Check for duplicate entries
  const checkDuplicateEntries = async (employeeId, date) => {
    try {
      const snapshot = await firebaseDB.child('TimesheetEntries')
        .orderByChild('employeeId_date')
        .equalTo(`${employeeId}_${date}`)
        .once('value');
      
      if (snapshot.exists()) {
        const duplicates = Object.values(snapshot.val());
        setDuplicateEntries(duplicates);
        setShowDuplicateWarning(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking duplicates:', error);
      return false;
    }
  };

  // Auto-fill for date range with proper date calculation - INCLUDES ALL DAYS (no weekend skipping)
  const autoFillPeriod = async () => {
    if (!timesheet || !selectedEmployee) return;

    setIsAutoFilling(true);
    
    try {
      const start = new Date(useDateRange ? startDate : `${selectedMonth}-01`);
      const end = new Date(useDateRange ? endDate : `${selectedMonth}-31`);
      
      const employee = employees.find(emp => emp.id === selectedEmployee);
      const defaultClient = clients[0] || { id: 'default', name: 'Default Client' };
      const dailyRate = calculateDailyRate(employee);

      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        // REMOVED WEEKEND SKIPPING - KEEP ALL DAYS
        const dateStr = date.toISOString().split('T')[0];
        
        // Check if entry already exists
        const existingEntry = dailyEntries.find(entry => entry.date === dateStr);
        if (existingEntry) continue;

        // Check for duplicate entries in other timesheets
        const hasDuplicate = await checkDuplicateEntries(selectedEmployee, dateStr);
        if (hasDuplicate) {
          continue;
        }

        const entry = {
          timesheetId: timesheet.id,
          employeeId: selectedEmployee,
          date: dateStr,
          clientId: defaultClient.id,
          clientName: defaultClient.name,
          jobRole: employee.primarySkill,
          status: 'present',
          isPublicHoliday: false,
          isEmergency: false,
          dailySalary: dailyRate,
          notes: 'Auto-filled',
          createdBy: currentUser?.uid || 'admin',
          createdByName: currentUser?.displayName || 'Admin',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await saveEntry(entry);
      }

      await loadDailyEntries(timesheet.id);
      calculateSummary();
    } catch (error) {
      console.error('Error in auto-fill:', error);
    } finally {
      setIsAutoFilling(false);
    }
  };

  // Fixed: Calculate daily rate based on basic salary / 30
  const calculateDailyRate = (employee) => {
    const basicSalary = parseFloat(employee.basicSalary) || 0;
    const dailyRate = Math.round(basicSalary / 30);
    return dailyRate;
  };

  const saveEntry = async (entry) => {
    try {
      const timestamp = new Date().toISOString();
      const userData = {
        updatedBy: currentUser?.uid || 'admin',
        updatedByName: currentUser?.displayName || 'Admin',
        updatedAt: timestamp
      };

      if (entry.id) {
        await firebaseDB.child(`TimesheetEntries/${entry.id}`).update({
          ...entry,
          ...userData
        });
      } else {
        const newRef = firebaseDB.child('TimesheetEntries').push();
        const newEntry = {
          ...entry,
          createdBy: currentUser?.uid || 'admin',
          createdByName: currentUser?.displayName || 'Admin',
          createdAt: timestamp,
          ...userData
        };
        await newRef.set(newEntry);
      }
    } catch (error) {
      console.error('Error saving entry:', error);
    }
  };

  const handleSaveEntry = async (entryData) => {
    const hasDuplicate = await checkDuplicateEntries(selectedEmployee, entryData.date);
    if (hasDuplicate && !isEditing) {
      return;
    }

    const employee = employees.find(emp => emp.id === selectedEmployee);
    const client = clients.find(c => c.id === entryData.clientId) || clients[0];
    
    let dailySalary = 0;
    if (entryData.status === 'present' && !entryData.isPublicHoliday) {
      dailySalary = calculateDailyRate(employee);
    }

    const entry = {
      ...entryData,
      timesheetId: timesheet.id,
      employeeId: selectedEmployee,
      clientName: client?.name || 'Unknown Client',
      dailySalary: dailySalary,
      createdBy: currentUser?.uid || 'admin',
      createdByName: currentUser?.displayName || 'Admin',
      createdAt: new Date().toISOString(),
      updatedBy: currentUser?.uid || 'admin',
      updatedByName: currentUser?.displayName || 'Admin',
      updatedAt: new Date().toISOString()
    };

    await saveEntry(entry);
    await loadDailyEntries(timesheet.id);
    calculateSummary();
    setShowEntryModal(false);
  };

  const confirmDeleteEntry = (entryId) => {
    setEntryToDelete(entryId);
    setShowDeleteModal(true);
  };

  const deleteEntry = async () => {
    if (entryToDelete) {
      try {
        await firebaseDB.child(`TimesheetEntries/${entryToDelete}`).remove();
        await loadDailyEntries(timesheet.id);
        calculateSummary();
        setShowDeleteModal(false);
        setEntryToDelete(null);
      } catch (error) {
        console.error('Error deleting entry:', error);
      }
    }
  };

  const calculateSummary = () => {
    if (!dailyEntries.length) return;

    const workingDays = dailyEntries.filter(entry => 
      entry.status === 'present' && !entry.isPublicHoliday
    ).length;

    const leaves = dailyEntries.filter(entry => 
      entry.status === 'leave'
    ).length;

    const holidays = dailyEntries.filter(entry => 
      entry.isPublicHoliday
    ).length;

    const emergencies = dailyEntries.filter(entry => 
      entry.isEmergency
    ).length;

    const totalSalary = dailyEntries.reduce((sum, entry) => 
      sum + (entry.dailySalary || 0), 0
    );

    const periodAdvances = advances.filter(advance => 
      !advance.timesheetId || advance.timesheetId === timesheet.id
    );

    const totalAdvances = periodAdvances.reduce((sum, advance) => 
      sum + (advance.amount || 0), 0
    );

    const netPayable = totalSalary - totalAdvances;

    const updatedTimesheet = {
      ...timesheet,
      totalDays: dailyEntries.length,
      workingDays,
      leaves,
      holidays,
      emergencies,
      totalSalary,
      advances: totalAdvances,
      netPayable,
      updatedBy: currentUser?.uid || 'admin',
      updatedByName: currentUser?.displayName || 'Admin',
      updatedAt: new Date().toISOString()
    };

    setTimesheet(updatedTimesheet);
    firebaseDB.child(`Timesheets/${timesheet.id}`).update(updatedTimesheet);
  };

  const submitTimesheet = async () => {
    setShowConfirmModal(true);
  };

  const confirmSubmit = async () => {
    const updatedTimesheet = {
      ...timesheet,
      status: 'submitted',
      submittedBy: currentUser?.uid || 'admin',
      submittedByName: currentUser?.displayName || 'Admin',
      submittedAt: new Date().toISOString(),
      updatedBy: currentUser?.uid || 'admin',
      updatedByName: currentUser?.displayName || 'Admin',
      updatedAt: new Date().toISOString()
    };
    
    await firebaseDB.child(`Timesheets/${timesheet.id}`).update(updatedTimesheet);
    setTimesheet(updatedTimesheet);
    setShowConfirmModal(false);
    setShowAssignModal(true); // Show assign modal after submission
  };

  const assignTimesheet = async () => {
    if (!assignTo) return;

    const updatedTimesheet = {
      ...timesheet,
      assignedTo: assignTo,
      assignedBy: currentUser?.uid,
      assignedByName: currentUser?.displayName,
      assignedAt: new Date().toISOString(),
      status: 'assigned'
    };

    await firebaseDB.child(`Timesheets/${timesheet.id}`).update(updatedTimesheet);
    setTimesheet(updatedTimesheet);
    setShowAssignModal(false);
    setAssignTo('');
  };

  const handleSignOut = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      localStorage.removeItem('currentUser');
      setCurrentUser(null);
      // Redirect to login page
      window.location.href = '/login';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Calculate total salary for the table footer
  const totalSalary = dailyEntries.reduce((sum, entry) => sum + (entry.dailySalary || 0), 0);

  return (
    <div className="container-fluid py-4">
      {/* Employee Search and Period Selection in Gray Card */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card bg-secondary bg-opacity-10 border border-secondary">
            <div className="card-body">
              <div className="row g-3 align-items-end">
                <div className="col-md-4">
                  <label className="form-label text-warning mb-1">
                    <strong><i className="fas fa-search me-2"></i>Search Employee</strong>
                  </label>
                  <WorkerSearch
                    employees={employees}
                    onSelectEmployee={setSelectedEmployee}
                    selectedEmployee={selectedEmployee}
                  />
                </div>

                {/* Period Type Toggle */}
                <div className="col-md-2">
                  <label className="form-label text-info mb-1">
                    <strong><i className="fas fa-calendar-alt me-2"></i>Period Type</strong>
                  </label>
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="useDateRange"
                      checked={useDateRange}
                      onChange={(e) => setUseDateRange(e.target.checked)}
                    />
                    <label className="form-check-label text-info" htmlFor="useDateRange">
                      Custom Range
                    </label>
                  </div>
                </div>

                {/* Period Selection */}
                {useDateRange ? (
                  <>
                    <div className="col-md-3">
                      <label className="form-label text-info mb-1">
                        <strong>Start Date</strong>
                      </label>
                      <input
                        type="date"
                        className="form-control bg-dark text-white border-secondary"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label text-info mb-1">
                        <strong>End Date</strong>
                      </label>
                      <input
                        type="date"
                        className="form-control bg-dark text-white border-secondary"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <div className="col-md-3">
                    <label className="form-label text-info mb-1">
                      <strong>Select Month</strong>
                    </label>
                    <input
                      type="month"
                      className="form-control bg-dark text-white border-secondary"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Previous Timesheets Table */}
      {previousTimesheets.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card bg-dark border-secondary">
              <div className="card-header bg-info bg-opacity-25 border-seconday">
                <h5 className="card-title mb-0 text-white">
                  <i className="fas fa-history me-2"></i>
                  Previous Timesheets
                </h5>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-dark table-sm mb-0">
                    <thead>
                      <tr>
                        <th>Period</th>
                        <th>Status</th>
                        <th>Working Days</th>
                        <th>Total Salary</th>
                        <th>Net Payable</th>
                        <th>Submitted By</th>
                        <th>Submitted At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previousTimesheets.map((ts, index) => (
                        <tr key={index}>
                          <td>
                            <small className="text-info">{ts.period}</small>
                          </td>
                          <td>
                            <span className={`badge ${
                              ts.status === 'draft' ? 'bg-warning' :
                              ts.status === 'submitted' ? 'bg-info' :
                              ts.status === 'approved' ? 'bg-success' :
                              ts.status === 'assigned' ? 'bg-primary' : 'bg-secondary'
                            }`}>
                              {ts.status?.toUpperCase()}
                            </span>
                          </td>
                          <td className="text-white">{ts.workingDays}</td>
                          <td className="text-success">₹{ts.totalSalary}</td>
                          <td className="text-warning">₹{ts.netPayable}</td>
                          <td>
                            <small className="text-muted">{ts.submittedByName || 'N/A'}</small>
                          </td>
                          <td>
                            <small className="text-muted">
                              {ts.submittedAt ? new Date(ts.submittedAt).toLocaleDateString('en-IN') : 'N/A'}
                            </small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty Layout Placeholder */}
      {!selectedEmployee && (
        <div className="row">
          <div className="col-12">
            <div className="card bg-dark border-secondary text-center">
              <div className="card-body py-5">
                <div className="text-muted mb-3">
                  <i className="bi bi-search display-4 opacity-50"></i>
                </div>
                <h4 className="text-white mb-3 opacity-50">Welcome to Timesheet Management</h4>
                <p className="text-muted mb-4">
                  Please select an employee to view or manage their timesheet entries.
                </p>
                <div className="row justify-content-center">
                  <div className="col-md-8">
                    <div className="row text-start">
                      <div className="col-md-4 mb-3">
                        <div className="d-flex align-items-center">
                          <i className="bi bi-person-plus text-info me-3 fs-4"></i>
                          <div>
                            <h6 className="text-white mb-1 opacity-50">Select Employee</h6>
                            <small className="text-muted opacity-50">Choose from the search above</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4 mb-3">
                        <div className="d-flex align-items-center">
                          <i className="bi bi-calendar-range text-warning me-3 fs-4"></i>
                          <div>
                            <h6 className="text-white mb-1 opacity-50">Set Period</h6>
                            <small className="text-muted opacity-50">Select month or custom range</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4 mb-3">
                        <div className="d-flex align-items-center">
                          <i className="bi bi-clock-history text-success me-3 fs-4"></i>
                          <div>
                            <h6 className="text-white mb-1 opacity-50">Manage Entries</h6>
                            <small className="text-muted opacity-50">Add, edit or auto-fill entries</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {timesheet && selectedEmployee && (
        <>
          {/* Timesheet Summary */}
          <TimesheetSummary 
            timesheet={timesheet} 
            advances={advances}
            employee={employees.find(emp => emp.id === selectedEmployee)}
          />

          {/* Action Buttons */}
          <div className="row mb-3">
            <div className="col-12">
              <button 
                className="btn btn-warning me-2"
                onClick={autoFillPeriod}
                disabled={!selectedEmployee || isAutoFilling || showSubmittedError}
              >
                {isAutoFilling ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Auto-Filling...
                  </>
                ) : (
                  <>
                    <i className="fas fa-magic me-2"></i>
                    Auto-Fill Period
                  </>
                )}
              </button>
              <button 
                className="btn btn-info me-2"
                onClick={() => {
                  setCurrentEntry(null);
                  setIsEditing(false);
                  setShowEntryModal(true);
                }}
                disabled={showSubmittedError}
              >
                <i className="fas fa-plus me-2"></i>
                Add Daily Entry
              </button>
              <button 
                className="btn btn-success me-2"
                onClick={submitTimesheet}
                disabled={timesheet.status === 'submitted' || showSubmittedError}
              >
                {timesheet.status === 'submitted' ? (
                  <>
                    <i className="fas fa-check me-2"></i>
                    Submitted
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane me-2"></i>
                    Submit Timesheet
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Daily Entries and Advances */}
          <div className="row">
            <div className="col-lg-8">
              <DailyEntriesTable
                entries={dailyEntries}
                onEdit={(entry) => {
                  setCurrentEntry(entry);
                  setIsEditing(true);
                  setShowEntryModal(true);
                }}
                onDelete={confirmDeleteEntry}
                totalSalary={totalSalary}
                isDisabled={showSubmittedError}
              />
            </div>
            <div className="col-lg-4">
              <AdvanceManagement
                employeeId={selectedEmployee}
                timesheetId={timesheet.id}
                advances={advances}
                onAdvanceAdded={loadAdvances}
                currentUser={currentUser}
                isDisabled={showSubmittedError}
              />
            </div>
          </div>
        </>
      )}

      {/* Entry Modal */}
      {showEntryModal && (
        <DailyEntryModal
          entry={currentEntry}
          isEditing={isEditing}
          clients={clients}
          employee={employees.find(emp => emp.id === selectedEmployee)}
          onSave={handleSaveEntry}
          onClose={() => setShowEntryModal(false)}
          isDisabled={showSubmittedError}
        />
      )}

      {/* Confirmation Modal for Timesheet Submission */}
      {showConfirmModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark border border-warning">
              <div className="modal-header border-warning">
                <h5 className="modal-title text-warning">
                  <i className="fas fa-check-circle me-2"></i>
                  Confirm Timesheet Submission
                </h5>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning bg-warning bg-opacity-10 border-warning">
                  <strong>Are you sure you want to submit this timesheet?</strong>
                </div>
                
                <div className="row g-2 mb-3">
                  <div className="col-12">
                    <small className="text-muted">Employee</small>
                    <div className="fw-bold text-white">{timesheet?.employeeName}</div>
                  </div>
                  <div className="col-6">
                    <small className="text-muted">Period</small>
                    <div className="fw-bold text-white">{timesheet?.period}</div>
                  </div>
                  <div className="col-6">
                    <small className="text-muted">Total Salary</small>
                    <div className="fw-bold text-success">₹{timesheet?.totalSalary}</div>
                  </div>
                  <div className="col-6">
                    <small className="text-muted">Working Days</small>
                    <div className="fw-bold text-white">{timesheet?.workingDays}</div>
                  </div>
                  <div className="col-6">
                    <small className="text-muted">Net Payable</small>
                    <div className="fw-bold text-success">₹{timesheet?.netPayable}</div>
                  </div>
                </div>

                <div className="alert alert-info bg-info bg-opacity-10 border-info">
                  <small>
                    <strong>Submitted by:</strong> {currentUser?.displayName} ({currentUser?.email})
                    <br />
                    <strong>Timestamp:</strong> {new Date().toLocaleString('en-IN')}
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowConfirmModal(false)}>
                  <i className="fas fa-times me-1"></i>
                  Cancel
                </button>
                <button type="button" className="btn btn-success" onClick={confirmSubmit}>
                  <i className="fas fa-check me-1"></i>
                  Confirm & Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign to Admin/Manager Modal */}
      {showAssignModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark border border-primary">
              <div className="modal-header border-primary">
                <h5 className="modal-title text-primary">
                  <i className="fas fa-user-check me-2"></i>
                  Assign Timesheet
                </h5>
              </div>
              <div className="modal-body">
                <div className="alert alert-info bg-info bg-opacity-10 border-info">
                  <strong>Timesheet submitted successfully!</strong>
                  <br />
                  <small>You can now assign it to an admin or manager for review.</small>
                </div>
                
                <div className="mb-3">
                  <label className="form-label text-white">Assign To</label>
                  <select 
                    className="form-control bg-dark text-white border-secondary"
                    value={assignTo}
                    onChange={(e) => setAssignTo(e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="accountant">Accountant</option>
                  </select>
                </div>

                <div className="alert alert-warning bg-warning bg-opacity-10 border-warning">
                  <small>
                    <strong>Note:</strong> Once assigned, the timesheet will be locked for further edits and 
                    will be available for review by the assigned person.
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowAssignModal(false)}
                >
                  Skip
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={assignTimesheet}
                  disabled={!assignTo}
                >
                  <i className="fas fa-paper-plane me-1"></i>
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Already Submitted Error Modal */}
      {showSubmittedError && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark border border-danger">
              <div className="modal-header border-danger">
                <h5 className="modal-title text-danger">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  Timesheet Already Submitted
                </h5>
              </div>
              <div className="modal-body">
                <div className="alert alert-danger bg-danger bg-opacity-10 border-danger text-warning">
                  <strong>This timesheet has already been {submittedTimesheetInfo?.status}!</strong>
                </div>
                
                <div className="row g-2">
                  <div className="col-12">
                    <small className="text-muted">Submitted By</small>
                    <div className="fw-bold text-white">{submittedTimesheetInfo?.submittedBy}</div>
                  </div>
                  <div className="col-12">
                    <small className="text-muted">Submitted At</small>
                    <div className="fw-bold text-white">
                      {submittedTimesheetInfo?.submittedAt ? 
                        new Date(submittedTimesheetInfo.submittedAt).toLocaleString('en-IN') : 'N/A'
                      }
                    </div>
                  </div>
                </div>

                <div className="alert alert-info bg-info bg-opacity-10 border-info mt-3 text-white">
                  <small>
                    <strong>Note:</strong> You cannot modify a submitted timesheet. 
                    Please contact an administrator if you need to make changes.
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowSubmittedError(false)}
                >
                  <i className="fas fa-times me-1"></i>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark border border-danger">
              <div className="modal-header border-danger">
                <h5 className="modal-title text-danger">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  Confirm Deletion
                </h5>
              </div>
              <div className="modal-body">
                <div className="alert alert-danger bg-danger bg-opacity-10 border-danger">
                  <strong>Are you sure you want to delete this entry?</strong>
                </div>
                <p className="text-white">This action cannot be undone. The entry will be permanently removed from the system.</p>
                <div className="alert alert-info bg-info bg-opacity-10 border-info">
                  <small>
                    <strong>Deleted by:</strong> {currentUser?.displayName}
                    <br />
                    <strong>Timestamp:</strong> {new Date().toLocaleString('en-IN')}
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                  <i className="fas fa-times me-1"></i>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger" onClick={deleteEntry}>
                  <i className="fas fa-trash me-1"></i>
                  Delete Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Entry Warning Modal */}
      {showDuplicateWarning && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content bg-dark border border-warning">
              <div className="modal-header border-warning">
                <h5 className="modal-title text-warning">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  Duplicate Entry Found
                </h5>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning bg-warning bg-opacity-10 border-warning">
                  <strong>This employee already has entries for the same date in other timesheets!</strong>
                </div>
                
                <div className="table-responsive">
                  <table className="table table-dark table-sm">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Client</th>
                        <th>Timesheet ID</th>
                        <th>Status</th>
                        <th>Salary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {duplicateEntries.map((entry, index) => (
                        <tr key={index}>
                          <td>{new Date(entry.date).toLocaleDateString('en-IN')}</td>
                          <td>{entry.clientName}</td>
                          <td>
                            <small className="text-info">{entry.timesheetId}</small>
                          </td>
                          <td>
                            <span className={`badge ${
                              entry.status === 'present' ? 'bg-success' :
                              entry.status === 'leave' ? 'bg-warning' : 'bg-secondary'
                            }`}>
                              {entry.status}
                            </span>
                          </td>
                          <td className="text-success">₹{entry.dailySalary}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="alert alert-info bg-info bg-opacity-10 border-info">
                  <small>
                    <strong>Note:</strong> You can still proceed to create this entry, but please ensure 
                    it's not a duplicate. Consider checking existing timesheets first.
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowDuplicateWarning(false)}
                >
                  <i className="fas fa-times me-1"></i>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-warning" 
                  onClick={() => {
                    setShowDuplicateWarning(false);
                    // Continue with save operation
                  }}
                >
                  <i className="fas fa-check me-1"></i>
                  Proceed Anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Timesheet Summary Component with Employee Photo
const TimesheetSummary = ({ timesheet, advances, employee }) => {
  return (
    <div className="row mb-4">
      <div className="col-12">
        <div className="card bg-dark border-primary">
          <div className="card-header bg-primary bg-opacity-25 border-primary d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              {/* Employee Photo */}
              {employee?.employeePhotoUrl ? (
                <img 
                  src={employee.employeePhotoUrl} 
                  alt="Employee" 
                  className="rounded-circle me-3"
                  style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                />
              ) : (
                <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center me-3" 
                     style={{ width: '60px', height: '60px' }}>
                  <i className="fas fa-user text-white fs-4"></i>
                </div>
              )}
              <div>
                <h5 className="card-title mb-0 text-white">
                  Timesheet Summary - {timesheet.employeeName}
                </h5>
                <small className="text-light">
                  {employee?.employeeId || employee?.idNo} • {employee?.primarySkill}
                </small>
              </div>
            </div>
            <span className={`badge ${
              timesheet.status === 'draft' ? 'bg-warning' :
              timesheet.status === 'submitted' ? 'bg-info' :
              timesheet.status === 'approved' ? 'bg-success' : 'bg-secondary'
            }`}>
              {timesheet.status?.toUpperCase()}
            </span>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-3">
                <div className="text-center p-3 bg-primary bg-opacity-10 rounded border border-primary">
                  <h6 className="text-info mb-1 d-block">Working Days</h6>
                  <h3 className="text-white mb-0">{timesheet.workingDays}</h3>
                </div>
              </div>
              <div className="col-md-3">
                <div className="text-center p-3 bg-warning bg-opacity-10 rounded border border-warning">
                  <h6 className="text-warning mb-1 d-block">Leaves</h6>
                  <h3 className="text-white mb-0">{timesheet.leaves}</h3>
                </div>
              </div>
              <div className="col-md-3">
                <div className="text-center p-3 bg-success bg-opacity-10 rounded border border-success">
                  <h6 className="text-success mb-1 d-block">Total Salary</h6>
                  <h3 className="text-white mb-0">₹{timesheet.totalSalary}</h3>
                </div>
              </div>
              <div className="col-md-3">
                <div className="text-center p-3 bg-danger bg-opacity-10 rounded border border-danger">
                  <h6 className="text-danger mb-1 d-block">Net Payable</h6>
                  <h3 className="text-white mb-0">₹{timesheet.netPayable}</h3>
                </div>
              </div>
            </div>
            
            <div className="row mt-3">
              <div className="col-md-6">
                <div className="d-flex justify-content-between text-white py-1">
                  <span>Employee:</span>
                  <span className="text-info">{timesheet.employeeName}</span>
                </div>
                <div className="d-flex justify-content-between text-white py-1">
                  <span>Period:</span>
                  <span className="text-info">{timesheet.period}</span>
                </div>
                <div className="d-flex justify-content-between text-white py-1">
                  <span>Status:</span>
                  <span className={`badge ${
                    timesheet.status === 'draft' ? 'bg-warning' :
                    timesheet.status === 'submitted' ? 'bg-info' :
                    timesheet.status === 'approved' ? 'bg-success' : 'bg-secondary'
                  }`}>
                    {timesheet.status?.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="col-md-6">
                <div className="d-flex justify-content-between text-white py-1">
                  <span>Basic Salary:</span>
                  <span className="text-success">₹{employee?.basicSalary || 0}</span>
                </div>
                <div className="d-flex justify-content-between text-white py-1">
                  <span>Advances:</span>
                  <span className="text-danger">₹{timesheet.advances}</span>
                </div>
                <div className="d-flex justify-content-between text-white py-1">
                  <span>Total Days:</span>
                  <span className="text-info">{timesheet.totalDays}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Daily Entries Table Component with Client ID, Client Name, Status, Holiday, Salary, and Actions
const DailyEntriesTable = ({ entries, onEdit, onDelete, totalSalary, isDisabled }) => {
  return (
    <div className="card bg-dark border-secondary">
      <div className="card-header bg-info bg-opacity-25 border-info">
        <h5 className="card-title mb-0 text-white">
          <i className="fas fa-calendar-day me-2"></i>
          Daily Entries ({entries.length})
        </h5>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-dark table-hover mb-0">
            <thead>
              <tr>
                <th>Date</th>
                <th>Client ID</th>
                <th>Client Name</th>
                <th>Job Role</th>
                <th>Status</th>
                {/* <th>Holiday</th>
                <th>Emergency</th> */}
                <th>Salary</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <small className="text-info">
                      {new Date(entry.date).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </small>
                  </td>
                  <td>
                    <small className="text-warning">{entry.clientId}</small>
                  </td>
                  <td>{entry.clientName}</td>
                  <td>
                    <small className="text-muted">{entry.jobRole}</small>
                  </td>
                  <td>
                    <span className={`badge ${
                      entry.status === 'present' ? 'bg-success' :
                      entry.status === 'leave' ? 'bg-warning' : 'bg-secondary'
                    }`}>
                      {entry.status}
                    </span>
                  </td>
                  {/* <td>
                    {entry.isPublicHoliday ? (
                      <i className="fas fa-star text-warning" title="Public Holiday"></i>
                    ) : (
                      <i className="fas fa-minus text-muted"></i>
                    )}
                  </td> */}
                  {/* <td>
                    {entry.isEmergency ? (
                      <i className="fas fa-exclamation-triangle text-danger" title="Emergency Duty"></i>
                    ) : (
                      <i className="fas fa-minus text-muted"></i>
                    )}
                  </td> */}
                  <td className="text-success">₹{entry.dailySalary}</td>
                  <td>
                    <div className="btn-group btn-group-sm">
                      <button
                        className="btn btn-outline-info"
                        onClick={() => onEdit(entry)}
                        disabled={isDisabled}
                        title="Edit Entry"
                      >
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button
                        className="btn btn-outline-danger"
                        onClick={() => onDelete(entry.id)}
                        disabled={isDisabled}
                        title="Delete Entry"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-dark border-top border-info">
                <td colSpan="5" className="text-end text-white">
                  <strong>Total Salary:</strong>
                </td>
                <td className="text-success">
                  <strong>₹{totalSalary}</strong>
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DisplayTimeSheet;