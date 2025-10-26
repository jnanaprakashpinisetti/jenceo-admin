import React, { useState, useEffect, useMemo } from 'react';
import firebaseDB from '../../firebase';
import DailyEntryModal from './DailyEntryModal';
import AdvanceManagement from './AdvanceManagement';
import WorkerSearch from './WorkerSearch';

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

    // Get current user from localStorage or Firebase Auth
    const user = JSON.parse(localStorage.getItem('currentUser')) || { 
      uid: 'admin', 
      displayName: 'Admin User',
      email: 'admin@system.com'
    };
    setCurrentUser(user);
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
      setTimesheet(snapshot.val());
      loadDailyEntries(timesheetId);
    } else {
      createNewTimesheet(timesheetId);
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
      // Check for entries with same employee and same date across all timesheets
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

  // Auto-fill for date range with proper date calculation
  const autoFillPeriod = async () => {
    if (!timesheet || !selectedEmployee) return;

    const start = new Date(useDateRange ? startDate : `${selectedMonth}-01`);
    const end = new Date(useDateRange ? endDate : `${selectedMonth}-31`);
    
    const employee = employees.find(emp => emp.id === selectedEmployee);
    const defaultClient = clients[0] || { id: 'default', name: 'Default Client' };
    const dailyRate = calculateDailyRate(employee);

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      // Skip weekends (optional - you can remove this if needed)
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      const dateStr = date.toISOString().split('T')[0];
      
      // Check if entry already exists
      const existingEntry = dailyEntries.find(entry => entry.date === dateStr);
      if (existingEntry) continue;

      // Check for duplicate entries in other timesheets
      const hasDuplicate = await checkDuplicateEntries(selectedEmployee, dateStr);
      if (hasDuplicate) {
        // Skip this date if duplicate exists
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
  };

  // Fixed: Calculate daily rate based on basic salary / 30
  const calculateDailyRate = (employee) => {
    const basicSalary = parseFloat(employee.basicSalary) || 0;
    const dailyRate = Math.round(basicSalary / 30);
    console.log('Daily Rate Calculation:', { basicSalary, dailyRate });
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
    // Check for duplicate entries before saving
    const hasDuplicate = await checkDuplicateEntries(selectedEmployee, entryData.date);
    if (hasDuplicate && !isEditing) {
      // Don't proceed if duplicate exists and we're not editing
      return;
    }

    const employee = employees.find(emp => emp.id === selectedEmployee);
    const client = clients.find(c => c.id === entryData.clientId) || clients[0];
    
    // Calculate daily salary based on status - FIXED: Only basic salary / 30
    let dailySalary = 0;
    if (entryData.status === 'present' && !entryData.isPublicHoliday) {
      dailySalary = calculateDailyRate(employee);
    }
    
    // Emergency duty gets same salary (removed double salary logic)
    // If you want custom emergency rate, you can add a field in employee data

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
  };

  // Calculate total salary for the table footer
  const totalSalary = dailyEntries.reduce((sum, entry) => sum + (entry.dailySalary || 0), 0);

  return (
    <div className="container-fluid py-4">
      {/* Employee Search and Period Selection in one row */}
      <div className="row mb-4">
        <div className="col-md-4">
          <label className="form-label text-warning">
            <strong>Search Employee</strong>
          </label>
          <WorkerSearch
            employees={employees}
            onSelectEmployee={setSelectedEmployee}
            selectedEmployee={selectedEmployee}
          />
        </div>

        {/* Period Type Toggle */}
        <div className="col-md-2">
          <label className="form-label text-info">
            <strong>Period Type</strong>
          </label>
          <div className="form-check form-switch mt-2">
            <input
              className="form-check-input"
              type="checkbox"
              id="useDateRange"
              checked={useDateRange}
              onChange={(e) => setUseDateRange(e.target.checked)}
            />
            <label className="form-check-label text-info" htmlFor="useDateRange">
              Use Custom Range
            </label>
          </div>
        </div>

        {/* Period Selection */}
        {useDateRange ? (
          <>
            <div className="col-md-3">
              <label className="form-label text-info">
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
              <label className="form-label text-info">
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
          <div className="col-md-6">
            <label className="form-label text-info">
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

      {/* Empty Layout Placeholder */}
      {!selectedEmployee && (
        <div className="row">
          <div className="col-12">
            <div className="card bg-dark border-secondary text-center">
              <div className="card-body py-5">
                <div className="text-muted mb-3">
                  <i className="bi bi-search display-4"></i>
                </div>
                <h4 className="text-white mb-3">Welcome to Timesheet Management</h4>
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
                            <h6 className="text-white mb-1">Select Employee</h6>
                            <small className="text-muted">Choose from the search above</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4 mb-3">
                        <div className="d-flex align-items-center">
                          <i className="bi bi-calendar-range text-warning me-3 fs-4"></i>
                          <div>
                            <h6 className="text-white mb-1">Set Period</h6>
                            <small className="text-muted">Select month or custom range</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4 mb-3">
                        <div className="d-flex align-items-center">
                          <i className="bi bi-clock-history text-success me-3 fs-4"></i>
                          <div>
                            <h6 className="text-white mb-1">Manage Entries</h6>
                            <small className="text-muted">Add, edit or auto-fill entries</small>
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
                disabled={!selectedEmployee}
              >
                Auto-Fill Period
              </button>
              <button 
                className="btn btn-info me-2"
                onClick={() => {
                  setCurrentEntry(null);
                  setIsEditing(false);
                  setShowEntryModal(true);
                }}
              >
                Add Daily Entry
              </button>
              <button 
                className="btn btn-success me-2"
                onClick={submitTimesheet}
                disabled={timesheet.status === 'submitted'}
              >
                {timesheet.status === 'submitted' ? 'Submitted' : 'Submit Timesheet'}
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
              />
            </div>
            <div className="col-lg-4">
              <AdvanceManagement
                employeeId={selectedEmployee}
                timesheetId={timesheet.id}
                advances={advances}
                onAdvanceAdded={loadAdvances}
                currentUser={currentUser}
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
                              entry.status === 'present' ? 'bg-success' : 'bg-warning'
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

                <div className="alert alert-info bg-info bg-opacity-10 border-info mt-3">
                  <small>
                    <strong>Note:</strong> Each employee should have only one entry per day across all timesheets.
                    Please check the existing entries before creating new ones.
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-warning" 
                  onClick={() => setShowDuplicateWarning(false)}
                >
                  <i className="fas fa-check me-1"></i>
                  Understood
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-components for better organization
const TimesheetSummary = ({ timesheet, advances, employee }) => (
  <div className="row mb-4">
    <div className="col-12">
      <div className="card bg-dark border-secondary">
        <div className="card-header bg-secondary d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            {employee?.employeePhotoUrl && (
              <img 
                src={employee.employeePhotoUrl} 
                alt="Employee" 
                className="rounded-circle me-3"
                style={{ width: '50px', height: '50px', objectFit: 'cover' }}
              />
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
          <div className="row text-center">
            <div className="col-md-2 col-6 mb-3">
              <div className="border border-info rounded p-3 h-100">
                <h6 className="text-info">Total Days</h6>
                <p className="h4 text-white">{timesheet.totalDays}</p>
              </div>
            </div>
            <div className="col-md-2 col-6 mb-3">
              <div className="border border-success rounded p-3 h-100">
                <h6 className="text-success">Working Days</h6>
                <p className="h4 text-white">{timesheet.workingDays}</p>
              </div>
            </div>
            <div className="col-md-2 col-6 mb-3">
              <div className="border border-warning rounded p-3 h-100">
                <h6 className="text-warning">Leaves</h6>
                <p className="h4 text-white">{timesheet.leaves}</p>
              </div>
            </div>
            <div className="col-md-2 col-6 mb-3">
              <div className="border border-primary rounded p-3 h-100">
                <h6 className="text-primary">Holidays</h6>
                <p className="h4 text-white">{timesheet.holidays}</p>
              </div>
            </div>
            <div className="col-md-2 col-6 mb-3">
              <div className="border border-danger rounded p-3 h-100">
                <h6 className="text-danger">Advances</h6>
                <p className="h4 text-white">₹{timesheet.advances}</p>
              </div>
            </div>
            <div className="col-md-2 col-6 mb-3">
              <div className="border border-success rounded p-3 h-100">
                <h6 className="text-success">Net Payable</h6>
                <p className="h4 text-white">₹{timesheet.netPayable}</p>
              </div>
            </div>
          </div>
          {timesheet.period && (
            <div className="row mt-2">
              <div className="col-12 text-center">
                <small className="text-muted">Period: {timesheet.period}</small>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);

const DailyEntriesTable = ({ entries, onEdit, onDelete, totalSalary }) => (
  <div className="card bg-dark border-secondary h-100">
    <div className="card-header bg-secondary d-flex justify-content-between align-items-center">
      <h5 className="card-title mb-0 text-white">Daily Entries</h5>
      <span className="badge bg-primary">{entries.length} entries</span>
    </div>
    <div className="card-body p-0">
      <div className="table-responsive" style={{ maxHeight: '500px' }}>
        <table className="table table-dark table-hover mb-0">
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              <th className="border-secondary">Date</th>
              <th className="border-secondary">Client ID</th>
              <th className="border-secondary">Client Name</th>
              <th className="border-secondary">Position</th>
              <th className="border-secondary">Status</th>
              <th className="border-secondary">Salary</th>
              <th className="border-secondary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(entry => {
              const isZeroSalary = entry.dailySalary === 0 || 
                                 entry.status === 'leave' || 
                                 entry.status === 'absent' ||
                                 entry.isPublicHoliday;
              
              return (
                <tr key={entry.id}>
                  <td className="border-secondary">
                    {new Date(entry.date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="border-secondary">
                    <small className="text-info">{entry.clientId}</small>
                  </td>
                  <td className="border-secondary">
                    {entry.clientName}
                  </td>
                  <td className="border-secondary">
                    <small className="text-info">{entry.jobRole}</small>
                  </td>
                  <td className="border-secondary">
                    <span className={`badge ${
                      entry.status === 'present' ? 'bg-success' :
                      entry.status === 'leave' ? 'bg-warning' :
                      entry.isPublicHoliday ? 'bg-primary' : 
                      entry.isEmergency ? 'bg-danger' : 'bg-secondary'
                    }`}>
                      {entry.status}
                      {entry.isPublicHoliday && ' (Holiday)'}
                      {entry.isEmergency && ' (Emergency)'}
                    </span>
                  </td>
                  <td className="border-secondary">
                    <strong className={isZeroSalary ? "text-danger" : "text-success"}>
                      ₹{entry.dailySalary}
                    </strong>
                  </td>
                  <td className="border-secondary">
                    <button 
                      className="btn btn-sm btn-outline-warning me-1"
                      onClick={() => onEdit(entry)}
                      title="Edit Entry"
                    >
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button 
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => onDelete(entry.id)}
                      title="Delete Entry"
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              );
            })}
            {entries.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center py-4 text-muted border-secondary">
                  No entries found. Use "Auto-Fill Period" or "Add Daily Entry" to get started.
                </td>
              </tr>
            )}
          </tbody>
          {/* Table Footer with Total */}
          {entries.length > 0 && (
            <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 1 }}>
              <tr className="bg-secondary">
                <td colSpan="5" className="text-end fw-bold border-secondary">
                  Total Salary:
                </td>
                <td className="fw-bold text-success border-secondary">
                  ₹{totalSalary}
                </td>
                <td className="border-secondary"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  </div>
);

export default DisplayTimeSheet;