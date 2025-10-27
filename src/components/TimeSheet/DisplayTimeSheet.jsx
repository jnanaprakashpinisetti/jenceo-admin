import React, { useState, useEffect, useMemo } from 'react';
import firebaseDB from '../../firebase';
import DailyEntryModal from './DailyEntryModal';
import AdvanceManagement from './AdvanceManagement';
import WorkerSearch from './WorkerSearch';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { useAuth } from "../../context/AuthContext";

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
    const [selectedEntries, setSelectedEntries] = useState([]);
    const [showDateChangeWarning, setShowDateChangeWarning] = useState(false);
    const [dateChangeEntry, setDateChangeEntry] = useState(null);
    const [newDate, setNewDate] = useState('');

    const [showPrevTsDelete, setShowPrevTsDelete] = useState(false);
    const [prevTsToDelete, setPrevTsToDelete] = useState(null);

    // NEW: open confirm modal
    const openPrevTsDelete = (ts) => {
        setPrevTsToDelete(ts);
        setShowPrevTsDelete(true);
    };

    // Use Auth Context
    const authContext = useAuth();

    // ---- NEW STATE (add near other useState) ----
    const [showDeleteTsModal, setShowDeleteTsModal] = useState(false);
    const [tsToDelete, setTsToDelete] = useState(null);

    const [showAutoFillModal, setShowAutoFillModal] = useState(false);
    const [clientSearch, setClientSearch] = useState("");
    const [selectedClientId, setSelectedClientId] = useState("");
    const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
    const filteredClients = useMemo(() => {
        const q = (clientSearch || "").toLowerCase();
        if (!q) return clients || [];
        return (clients || []).filter(c =>
            (c.name || "").toLowerCase().includes(q) ||
            (c.id || "").toLowerCase().includes(q) ||
            (c.clientId || "").toLowerCase().includes(q)
        );
    }, [clientSearch, clients]);

    // ---- NEW: robust daily rate + entry salary helper ----





    // NEW: delete Timesheet + its entries
    const deletePreviousTimesheet = async () => {
        if (!prevTsToDelete?.id) return;
        // Inside the Delete Timesheet confirm button handler, after removing entries:
        if (timesheet?.id === tsToDelete.id) {
            setTimesheet(null);
            setDailyEntries([]);
        }
        await loadPreviousTimesheets();

        try {
            // remove the timesheet doc
            await firebaseDB.child(`Timesheets/${prevTsToDelete.id}`).remove();
            // remove all its entries
            const snap = await firebaseDB.child(`TimesheetEntries`)
                .orderByChild('timesheetId')
                .equalTo(prevTsToDelete.id)
                .once('value');
            if (snap.exists()) {
                const obj = snap.val();
                await Promise.all(Object.keys(obj).map(k => firebaseDB.child(`TimesheetEntries/${k}`).remove()));
            }
            // refresh list
            await loadPreviousTimesheets();
        } catch (e) {
            console.error('Error deleting previous timesheet:', e);
            alert('Delete failed. Try again.');
        } finally {
            setShowPrevTsDelete(false);
            setPrevTsToDelete(null);
        }
    };



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
                const userData = {
                    uid: user.uid,
                    displayName: user.displayName || user.email,
                    email: user.email,
                    photoURL: user.photoURL
                };
                setCurrentUser(userData);
                // Store in localStorage for backup
                localStorage.setItem('currentUser', JSON.stringify(userData));
            } else {
                // Use auth context if available
                if (authContext && authContext.currentUser) {
                    setCurrentUser(authContext.currentUser);
                } else {
                    console.log('No user logged in');
                    // You can redirect to login page here
                    // window.location.href = '/login';
                }
            }
        });

        return () => unsubscribe();
    }, [authContext]);

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

    // Auto-recalculate summary when entries or advances change
    useEffect(() => {
        if (timesheet && dailyEntries.length >= 0) {
            calculateSummary();
        }
    }, [dailyEntries, advances]);

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

    // Keep your fetchClients, but guarantee name/clientId fields exist:
    const fetchClients = async () => {
        const paths = ['Clients', 'ClientData', 'JenCeo-DataBase/ClientData', 'JenCeo-DataBase/Clients'];
        const combined = [];
        for (const p of paths) {
            try {
                const snap = await firebaseDB.child(p).once('value');
                if (snap.exists()) {
                    const obj = snap.val() || {};
                    Object.entries(obj).forEach(([id, v]) => {
                        combined.push({
                            id,
                            clientId: v.clientId || v.idNo || id,
                            name: v.name || v.clientName || 'Client',
                            raw: v
                        });
                    });
                }
            } catch { }
        }
        const unique = combined.filter((c, i, arr) =>
            i === arr.findIndex(x => x.clientId === c.clientId && x.name === c.name)
        );
        setClients(unique);
    };



    const getTimesheetId = () => {
        if (useDateRange) {
            return `${selectedEmployee}_${startDate}_to_${endDate}`;
        }
        return `${selectedEmployee}_${selectedMonth}`;
    };

    const loadTimesheet = async () => {
        const id = getTimesheetId();
        const snap = await firebaseDB.child(`Timesheets/${id}`).once('value');

        if (snap.exists()) {
            const data = snap.val();

            // backfill name if missing
            if (!data.employeeName) {
                const emp = employees.find(e => e.id === data.employeeId);
                data.employeeName = `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim() || 'Employee';
                await firebaseDB.child(`Timesheets/${id}`).update({ employeeName: data.employeeName });
            }

            setTimesheet(data);
            // submitted status handling (kept)
            // …
            loadDailyEntries(id);
        } else {
            createNewTimesheet(id);
            setShowSubmittedError(false);
        }
    };


    const loadPreviousTimesheets = async () => {
        if (!selectedEmployee) return;

        try {
            const snap = await firebaseDB.child('Timesheets')
                .orderByChild('employeeId')
                .equalTo(selectedEmployee)
                .once('value');

            if (!snap.exists()) { setPreviousTimesheets([]); return; }

            const list = Object.entries(snap.val()).map(([id, data]) => ({ id, ...data }));
            const previous = list
                .filter(ts => ts.id !== getTimesheetId())
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 6);

            setPreviousTimesheets(previous);
        } catch (err) {
            console.error('Error loading previous timesheets:', err);
            setPreviousTimesheets([]);
        }
    };

    const createNewTimesheet = (timesheetId) => {
        const employee = employees.find(emp => emp.id === selectedEmployee);
        const fullName = `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() || 'Employee';
        const period = useDateRange ? `${startDate} to ${endDate}` : `${selectedMonth}`;

        const newTimesheet = {
            id: timesheetId,
            employeeId: selectedEmployee,
            employeeName: fullName,
            employeeData: employee || null,
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
            absents: 0,
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

        // NEW: also persist immediately so it has an id & name in DB
        firebaseDB.child(`Timesheets/${timesheetId}`).set(newTimesheet);
    };


    const loadDailyEntries = async (tsId) => {
        const timesheetId = tsId || (timesheet?.id ?? getTimesheetId());
        if (!timesheetId) {
            // nothing to load yet
            setDailyEntries([]);
            return;
        }



        const snapshot = await firebaseDB.child(`TimesheetEntries`)
            .orderByChild('timesheetId')
            .equalTo(timesheetId)
            .once('value');

        if (snapshot.exists()) {
            const entries = Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }));
            entries.sort((a, b) => new Date(a.date) - new Date(b.date));
            setDailyEntries(entries);
            setTimeout(() => calculateSummary(entries), 0);
        } else {
            setDailyEntries([]);
            calculateSummary([]);
        }
    };


    const loadAdvances = async () => {
        const snapshot = await firebaseDB.child(`Advances`)
            .orderByChild('employeeId')
            .equalTo(selectedEmployee)
            .once('value');

        if (snapshot.exists()) {
            const advancesData = Object.values(snapshot.val());
            setAdvances(advancesData);
            // Trigger immediate summary recalculation
            calculateSummary(dailyEntries, advancesData);
        } else {
            setAdvances([]);
            calculateSummary(dailyEntries, []);
        }
    };
    // Check for duplicate entries
    const checkDuplicateEntries = async (employeeId, date, excludeEntryId = null) => {
        try {
            const snapshot = await firebaseDB.child('TimesheetEntries')
                .orderByChild('employeeId_date')
                .equalTo(`${employeeId}_${date}`)
                .once('value');

            if (snapshot.exists()) {
                const duplicates = Object.entries(snapshot.val())
                    .map(([id, data]) => ({ id, ...data }))
                    .filter(entry => entry.id !== excludeEntryId); // Exclude current entry when editing

                if (duplicates.length > 0) {
                    setDuplicateEntries(duplicates);
                    setShowDuplicateWarning(true);
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Error checking duplicates:', error);
            return false;
        }
    };

    const handlePreviousTimesheetClick = (previousTimesheet) => {
        // Extract period information and set the current view
        if (previousTimesheet.useDateRange) {
            setUseDateRange(true);
            setStartDate(previousTimesheet.startDate);
            setEndDate(previousTimesheet.endDate);
        } else {
            setUseDateRange(false);
            setSelectedMonth(previousTimesheet.period); // Assuming period is in YYYY-MM format
        }

        // The employee should already be selected, but ensure it's set
        setSelectedEmployee(previousTimesheet.employeeId);
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
                    isHalfDay: false,
                    dailySalary: dailyRate,
                    notes: 'Auto-filled',
                    createdBy: currentUser?.uid || 'admin',
                    createdByName: currentUser?.displayName || 'Admin',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                await saveEntry(entry);
            }

            await loadDailyEntries();
        } catch (error) {
            console.error('Error in auto-fill:', error);
        } finally {
            setIsAutoFilling(false);
        }
    };

    const calculateDailyRate = (employee) => {
        const basic = parseFloat(employee?.basicSalary) || 0;
        return basic / 30;
    };

    const calculateEntrySalary = (employee, entryData) => {
        const rate = calculateDailyRate(employee);
        const half = rate * 0.5;
        const status = entryData?.status || 'present';
        const isHalf = !!entryData?.isHalfDay;
        const isHoliday = !!entryData?.isPublicHoliday || status === 'holiday';

        if (status === 'present' || status === 'leave' || isHoliday) {
            return isHalf ? half : rate;  // <-- half day fix
        }
        return 0;
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


    const confirmDeleteEntry = (entryId) => {
        setEntryToDelete(entryId);
        setShowDeleteModal(true);
    };

    const deleteEntry = async () => {
        if (entryToDelete) {
            try {
                await firebaseDB.child(`TimesheetEntries/${entryToDelete}`).remove();
                await loadDailyEntries();
                setShowDeleteModal(false);
                setEntryToDelete(null);
            } catch (error) {
                console.error('Error deleting entry:', error);
            }
        }
    };






    const handleSaveEntry = async (entryData) => {
        // duplicates (unchanged) …

        const employee = employees.find(emp => emp.id === selectedEmployee);

        // GUARANTEED TS ID
        const tsId = timesheet?.id || getTimesheetId();
        if (!tsId) { alert('Timesheet is not ready yet.'); return; }

        // salary (unchanged) …
        const rate = calculateDailyRate(employee);
        const half = rate * 0.5;
        const status = entryData?.status || 'present';
        const isHalf = !!entryData?.isHalfDay;
        const isHoliday = !!entryData?.isPublicHoliday || status === 'holiday';

        let dailySalary = 0;
        if (status === 'present' || status === 'leave' || isHoliday) {
            dailySalary = isHalf ? half : rate;
        }

        const normalized = {
            status: (entryData.status || 'present').toLowerCase(),
            isHalfDay: !!entryData.isHalfDay,
            isPublicHoliday: !!entryData.isPublicHoliday,
            isEmergency: !!entryData.isEmergency,
        };

        const picked = clients.find(c => c.id === (entryData.clientId || selectedClientId));
        const clientName = picked?.name || entryData.clientName || 'Client';
        const clientId = picked?.clientId || entryData.clientId || picked?.id;

        const payload = {
            ...entryData,
            ...normalized,
            timesheetId: tsId,                     // <— never undefined now
            employeeId: selectedEmployee,
            clientId,
            clientName,
            dailySalary,
            employeeId_date: `${selectedEmployee}_${entryData.date}`,
            updatedBy: currentUser?.uid || 'admin',
            updatedByName: currentUser?.displayName || 'Admin',
            updatedAt: new Date().toISOString(),
        };

        if (!payload.id) {
            payload.createdBy = currentUser?.uid || 'admin';
            payload.createdByName = currentUser?.displayName || 'Admin';
            payload.createdAt = new Date().toISOString();
        }

        await saveEntry(payload);
        await loadDailyEntries();   // safe call (no undefined equalTo)
        setShowEntryModal(false);
        setIsEditing(false);
        setCurrentEntry(null);
    };


    // Enhanced calculateSummary function with proper working days and leaves calculation - FIXED
    const calculateSummary = (entries = dailyEntries, advancesData = advances) => {
        if (!entries.length) {
            const resetTimesheet = {
                ...timesheet,
                totalDays: 0,
                workingDays: 0,
                leaves: 0,
                holidays: 0,
                emergencies: 0,
                absents: 0,
                totalSalary: 0,
                advances: 0,
                netPayable: 0,
                updatedBy: currentUser?.uid || 'admin',
                updatedByName: currentUser?.displayName || 'Admin',
                updatedAt: new Date().toISOString()
            };
            setTimesheet(resetTimesheet);
            if (timesheet) firebaseDB.child(`Timesheets/${timesheet.id}`).update(resetTimesheet);
            return;
        }

        const fullWorkingDays = entries.filter(e =>
            e.status === 'present' && !e.isPublicHoliday && !e.isHalfDay
        ).length;

        const halfWorkingDays = entries.filter(e =>
            e.status === 'present' && !e.isPublicHoliday && e.isHalfDay
        ).length;

        const workingDays = fullWorkingDays + (halfWorkingDays * 0.5); // <- the X + n(.5)

        const holidaysCount = entries.filter(e => e.isPublicHoliday || e.status === 'holiday').length;
        const emergencies = entries.filter(e => e.isEmergency).length;
        const leaveDays = entries.filter(e => e.status === 'leave').length;
        const absentDays = entries.filter(e => e.status === 'absent').length;


        const totalSalary = entries.reduce((sum, e) => sum + (parseFloat(e.dailySalary) || 0), 0);

        const periodAdvances = (advancesData || []).filter(a => !a.timesheetId || a.timesheetId === timesheet?.id);
        const totalAdvances = periodAdvances.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);

        const updatedTimesheet = {
            ...timesheet,
            totalDays: entries.length,
            workingDays,
            leaves: leaveDays,
            holidays: holidaysCount,
            emergencies,
            absents: absentDays,
            totalSalary,
            advances: totalAdvances,
            netPayable: Math.round(totalSalary - totalAdvances),
            updatedBy: currentUser?.uid || 'admin',
            updatedByName: currentUser?.displayName || 'Admin',
            updatedAt: new Date().toISOString()
        };

        setTimesheet(updatedTimesheet);
        if (timesheet) firebaseDB.child(`Timesheets/${timesheet.id}`).update(updatedTimesheet);
    };

    // Group actions for selected entries
    const handleSelectEntry = (entryId) => {
        setSelectedEntries(prev =>
            prev.includes(entryId)
                ? prev.filter(id => id !== entryId)
                : [...prev, entryId]
        );
    };

    const handleSelectAllEntries = () => {
        if (selectedEntries.length === dailyEntries.length) {
            setSelectedEntries([]);
        } else {
            setSelectedEntries(dailyEntries.map(entry => entry.id));
        }
    };

    const deleteSelectedEntries = async () => {
        if (selectedEntries.length === 0) return;

        try {
            for (const entryId of selectedEntries) {
                await firebaseDB.child(`TimesheetEntries/${entryId}`).remove();
            }
            await loadDailyEntries();
            setSelectedEntries([]);
        } catch (error) {
            console.error('Error deleting selected entries:', error);
        }
    };

    const submitTimesheet = async () => {
        // Prevent submission if no entries
        if (dailyEntries.length === 0) {
            alert('Cannot submit timesheet with no entries. Please add daily entries first.');
            return;
        }
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

    // Add this state
    const [showEditProtectedModal, setShowEditProtectedModal] = useState(false);

    // Add this function to check edit permissions - FIXED
    const checkEditPermission = (timesheetStatus) => {
        if (timesheetStatus === 'approved') {
            // Only admin can edit approved timesheets
            if (authContext.user?.role !== 'admin') {
                setShowEditProtectedModal(true);
                return false;
            }
        }
        return true;
    };

    // Update the edit handler - FIXED
    const handleEditEntry = (entry) => {
        if (!checkEditPermission(timesheet.status)) {
            return;
        }

        setCurrentEntry(entry);
        setIsEditing(true);
        setShowEntryModal(true);
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
                                                <th>Modified By</th>
                                                <th>Last Modified</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previousTimesheets.map((ts, index) => (
                                                <tr key={index}>
                                                    <td>
                                                        <button
                                                            className="btn btn-link p-0 text-info"
                                                            onClick={() => handlePreviousTimesheetClick(ts)}
                                                            title="Open timesheet"
                                                        >
                                                            <small>{ts.period}</small>
                                                        </button>
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${ts.status === 'draft' ? 'bg-warning' :
                                                            ts.status === 'submitted' ? 'bg-info' :
                                                                ts.status === 'approved' ? 'bg-success' :
                                                                    ts.status === 'assigned' ? 'bg-primary' : 'bg-secondary'
                                                            }`}>
                                                            {ts.status?.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="text-white">{ts.workingDays}</td>
                                                    <td className="text-success">₹{Number(ts.totalSalary || 0).toFixed(2)}</td>
                                                    <td className="text-warning">₹{Math.round(ts.netPayable || 0)}</td>
                                                    <td><small className="text-muted">{ts.submittedByName || 'N/A'}</small></td>
                                                    <td>
                                                        <small className="text-muted">
                                                            {ts.submittedAt ? new Date(ts.submittedAt).toLocaleDateString('en-IN') : 'N/A'}
                                                        </small>
                                                    </td>
                                                    <td>
                                                        <small className="text-muted">
                                                            {ts.updatedByName || ts.createdByName || 'N/A'}
                                                        </small>
                                                    </td>
                                                    <td>
                                                        <small className="text-muted">
                                                            {ts.updatedAt ? new Date(ts.updatedAt).toLocaleDateString('en-IN') :
                                                                ts.createdAt ? new Date(ts.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                                                        </small>
                                                    </td>
                                                    <td>
                                                        <button
                                                            className="btn btn-outline-danger btn-sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setTsToDelete(ts);
                                                                setShowDeleteTsModal(true);
                                                            }}
                                                            title="Delete this timesheet"
                                                        >
                                                            <i className="bi bi-trash"></i>
                                                        </button>
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
                        currentUser={currentUser}
                    />

                    {/* Action Buttons */}
                    <div className="row mb-3">
                        <div className="col-12">
                            <button
                                className="btn btn-warning me-2"
                                onClick={() => setShowAutoFillModal(true)}
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
                            {selectedEntries.length > 0 && (
                                <>
                                    <button
                                        className="btn btn-outline-danger me-2"
                                        onClick={deleteSelectedEntries}
                                        disabled={showSubmittedError}
                                    >
                                        <i className="bi bi-trash me-2"></i>
                                        Delete Selected ({selectedEntries.length})
                                    </button>
                                    <button
                                        className="btn btn-outline-secondary"
                                        onClick={() => setSelectedEntries([])}
                                    >
                                        <i className="fas fa-times me-2"></i>
                                        Clear Selection
                                    </button>
                                </>
                            )}
                            <button
                                className="btn btn-success me-2"
                                onClick={submitTimesheet}
                                disabled={timesheet.status === 'submitted' || showSubmittedError || dailyEntries.length === 0}
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
                                selectedEntries={selectedEntries}
                                onSelectEntry={handleSelectEntry}
                                onSelectAllEntries={handleSelectAllEntries}
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

            {showPrevTsDelete && (
                <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.8)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content bg-dark border border-danger">
                            <div className="modal-header border-danger">
                                <h5 className="modal-title text-danger">
                                    <i className="bi bi-trash me-2"></i>Delete Timesheet
                                </h5>
                            </div>
                            <div className="modal-body">
                                <div className="alert alert-danger bg-danger bg-opacity-10 border-danger">
                                    <strong>
                                        Delete timesheet <span className="text-info">{prevTsToDelete?.period}</span> for
                                        &nbsp;<span className="text-info">{prevTsToDelete?.employeeName}</span>?
                                    </strong>
                                </div>
                                <p className="text-white mb-0">This will also delete all its daily entries.</p>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowPrevTsDelete(false)}>
                                    Cancel
                                </button>
                                <button className="btn btn-danger" onClick={deletePreviousTimesheet}>
                                    <i className="bi bi-trash me-1"></i>Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Date Change Warning Modal */}
            {showDateChangeWarning && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }} tabIndex="-1">
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content bg-dark border border-warning">
                            <div className="modal-header border-warning">
                                <h5 className="modal-title text-warning">
                                    <i className="fas fa-exclamation-triangle me-2"></i>
                                    Date Already Exists
                                </h5>
                            </div>
                            <div className="modal-body">
                                <div className="alert alert-warning bg-warning bg-opacity-10 border-warning">
                                    <strong>An entry already exists for {newDate}!</strong>
                                </div>
                                <p className="text-white">
                                    Changing the date to {newDate} would create a duplicate entry.
                                    Please choose a different date or cancel the edit.
                                </p>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowDateChangeWarning(false)}
                                >
                                    <i className="fas fa-times me-1"></i>
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-warning"
                                    onClick={() => {
                                        setShowDateChangeWarning(false);
                                        // Allow the save to proceed despite duplicate
                                        handleSaveEntry(dateChangeEntry);
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
                                        <div className="fw-bold text-success">₹{timesheet?.totalSalary?.toFixed(2)}</div>
                                    </div>
                                    <div className="col-6">
                                        <small className="text-muted">Working Days</small>
                                        <div className="fw-bold text-white">{timesheet?.workingDays}</div>
                                    </div>
                                    <div className="col-6">
                                        <small className="text-muted">Net Payable</small>
                                        <div className="fw-bold text-success">₹{Math.round(timesheet?.netPayable || 0)}</div>
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
                                    Confirm Submit
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
                                    <i className="bi bi-trash me-2"></i>
                                    Confirm Delete
                                </h5>
                            </div>
                            <div className="modal-body">
                                <div className="alert alert-danger bg-danger bg-opacity-10 border-danger">
                                    <strong>Are you sure you want to delete this entry?</strong>
                                </div>
                                <p className="text-white">This action cannot be undone.</p>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                                    <i className="fas fa-times me-1"></i>
                                    Cancel
                                </button>
                                <button type="button" className="btn btn-danger" onClick={deleteEntry}>
                                    <i className="bi bi-trash me-1"></i>
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteTsModal && tsToDelete && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content bg-dark border border-danger">
                            <div className="modal-header border-danger">
                                <h5 className="modal-title text-danger">
                                    <i className="bi bi-trash me-2"></i> Delete Timesheet
                                </h5>
                                <button className="btn-close btn-close-white" onClick={() => setShowDeleteTsModal(false)} />
                            </div>
                            <div className="modal-body">
                                <p className="text-white">
                                    Are you sure you want to permanently delete the timesheet for <strong>{tsToDelete.period}</strong>?
                                </p>
                                <div className="alert alert-danger bg-danger bg-opacity-10 border-danger">
                                    This will also delete all daily entries linked to this timesheet. This action cannot be undone.
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowDeleteTsModal(false)}>
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-danger"
                                    onClick={async () => {
                                        try {
                                            const id = tsToDelete?.id;
                                            if (!id) { alert('Timesheet id missing.'); return; }

                                            // 1) remove the timesheet
                                            await firebaseDB.child(`Timesheets/${id}`).remove();

                                            // 2) remove its entries (with a defined id)
                                            const snap = await firebaseDB.child('TimesheetEntries')
                                                .orderByChild('timesheetId')
                                                .equalTo(id).once('value');
                                            if (snap.exists()) {
                                                const obj = snap.val() || {};
                                                await Promise.all(Object.keys(obj).map(k =>
                                                    firebaseDB.child(`TimesheetEntries/${k}`).remove()
                                                ));
                                            }

                                            // 3) if the deleted one is the one on screen, clear view
                                            if (timesheet?.id === id) {
                                                setTimesheet(null);
                                                setDailyEntries([]);
                                            }

                                            setShowDeleteTsModal(false);
                                            setTsToDelete(null);
                                            await loadPreviousTimesheets();
                                        } catch (err) {
                                            console.error('Delete timesheet failed:', err);
                                            alert('Failed to delete. Please try again.');
                                        }
                                    }}
                                >
                                    Delete
                                </button>

                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Duplicate Entry Warning Modal */}
            {showDuplicateWarning && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }} tabIndex="-1">
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content bg-dark border border-warning">
                            <div className="modal-header border-warning">
                                <h5 className="modal-title text-warning">
                                    <i className="fas fa-exclamation-triangle me-2"></i>
                                    Duplicate Entry Found
                                </h5>
                            </div>
                            <div className="modal-body">
                                <div className="alert alert-warning bg-warning bg-opacity-10 border-warning">
                                    <strong>An entry already exists for this date!</strong>
                                </div>

                                <div className="table-responsive">
                                    <table className="table table-sm table-dark">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Client</th>
                                                <th>Status</th>
                                                <th>Timesheet</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {duplicateEntries.map((entry, index) => (
                                                <tr key={index}>
                                                    <td className="text-white">{entry.date}</td>
                                                    <td className="text-info">{entry.clientName}</td>
                                                    <td>
                                                        <span className={`badge ${entry.status === 'present' ? 'bg-success' :
                                                            entry.status === 'absent' ? 'bg-danger' : 'bg-warning'
                                                            }`}>
                                                            {entry.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <small className="text-muted">{entry.timesheetId}</small>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <p className="text-white mt-3">
                                    Please choose a different date or edit the existing entry.
                                </p>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowDuplicateWarning(false);
                                        setDuplicateEntries([]);
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

            {/* Submitted Timesheet Error Modal */}
            {showSubmittedError && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }} tabIndex="-1">
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content bg-dark border border-info">
                            <div className="modal-header border-info">
                                <h5 className="modal-title text-info">
                                    <i className="fas fa-info-circle me-2"></i>
                                    Timesheet Already Submitted
                                </h5>
                            </div>
                            <div className="modal-body">
                                <div className="alert alert-info bg-info bg-opacity-10 border-info">
                                    <strong>This timesheet has already been {submittedTimesheetInfo?.status}!</strong>
                                </div>

                                <div className="row g-2">
                                    <div className="col-6">
                                        <small className="text-muted">Status</small>
                                        <div className="fw-bold text-info text-uppercase">{submittedTimesheetInfo?.status}</div>
                                    </div>
                                    <div className="col-6">
                                        <small className="text-muted">Submitted By</small>
                                        <div className="fw-bold text-white">{submittedTimesheetInfo?.submittedBy}</div>
                                    </div>
                                    <div className="col-6">
                                        <small className="text-muted">Submitted At</small>
                                        <div className="fw-bold text-white">
                                            {submittedTimesheetInfo?.submittedAt ?
                                                new Date(submittedTimesheetInfo.submittedAt).toLocaleString('en-IN') : 'N/A'}
                                        </div>
                                    </div>
                                </div>

                                <p className="text-white mt-3">
                                    You cannot modify entries in a submitted timesheet.
                                    Please contact an administrator if you need to make changes.
                                </p>
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

            {/* Assign Timesheet Modal */}
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
                                <div className="alert alert-primary bg-primary bg-opacity-10 border-primary">
                                    <strong>Timesheet submitted successfully!</strong>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label text-white">Assign To</label>
                                    <select
                                        className="form-select bg-dark text-white border-secondary"
                                        value={assignTo}
                                        onChange={(e) => setAssignTo(e.target.value)}
                                    >
                                        <option value="">Select approver...</option>
                                        <option value="manager">Manager</option>
                                        <option value="hr">HR Department</option>
                                        <option value="accountant">Accountant</option>
                                    </select>
                                </div>

                                <div className="alert alert-info bg-info bg-opacity-10 border-info">
                                    <small>
                                        <strong>Submitted by:</strong> {currentUser?.displayName}
                                        <br />
                                        <strong>Timestamp:</strong> {new Date().toLocaleString('en-IN')}
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
                                    <i className="fas fa-user-check me-1"></i>
                                    Assign
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showAutoFillModal && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.85)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content bg-dark border border-info">
                            <div className="modal-header border-info">
                                <h5 className="modal-title text-info">
                                    <i className="fas fa-magic me-2"></i> Auto-Fill Period
                                </h5>
                                <button className="btn-close btn-close-white" onClick={() => setShowAutoFillModal(false)} />
                            </div>
                            <div className="modal-body">
                                <div className="row g-3">
                                    <div className="col-12">
                                        <label className="form-label text-white">Client</label>
                                        <div className="position-relative">
                                            <div className="input-group">
                                                <span className="input-group-text bg-dark border-secondary">
                                                    <i className="bi bi-search text-warning"></i>
                                                </span>
                                                <input
                                                    type="text"
                                                    className="form-control bg-dark text-white border-secondary"
                                                    placeholder="Search client by name or ID..."
                                                    value={clientSearch}
                                                    onChange={(e) => {
                                                        setClientSearch(e.target.value);
                                                        setClientDropdownOpen(true);
                                                    }}
                                                    onFocus={() => setClientDropdownOpen(true)}
                                                />
                                                {selectedClientId && (
                                                    <span className="input-group-text bg-success text-dark border-success">
                                                        <i className="bi bi-check-lg"></i>
                                                    </span>
                                                )}
                                            </div>

                                            {clientDropdownOpen && clientSearch && (
                                                <div
                                                    className="position-absolute top-100 start-0 end-0 bg-dark border border-secondary rounded mt-1 z-3"
                                                    style={{ maxHeight: '300px', overflowY: 'auto' }}
                                                >
                                                    {filteredClients.map(c => (
                                                        <div
                                                            key={c.id}
                                                            className={`p-3 border-bottom border-secondary cursor-pointer ${selectedClientId === c.id ? 'bg-primary' : 'hover-bg-secondary'
                                                                }`}
                                                            onClick={() => {
                                                                setSelectedClientId(c.id);
                                                                setClientSearch(`${c.clientId} — ${c.name}`);
                                                                setClientDropdownOpen(false);
                                                            }}
                                                        >
                                                            <div className="d-flex justify-content-between align-items-center">
                                                                <div>
                                                                    <strong className="text-white">{c.name}</strong>
                                                                    <div className="text-info small">ID: {c.clientId} • Key: {c.id}</div>
                                                                </div>
                                                                <div className="text-end">
                                                                    <div className="text-success small">Select</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {filteredClients.length === 0 && (
                                                        <div className="p-3 text-muted text-center">No clients found</div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Click outside to close */}
                                            {clientDropdownOpen && (
                                                <div
                                                    className="position-fixed top-0 left-0 w-100 h-100"
                                                    style={{ zIndex: 2 }}
                                                    onClick={() => setClientDropdownOpen(false)}
                                                />
                                            )}
                                        </div>
                                    </div>

                                </div>

                                <div className="alert alert-info bg-info bg-opacity-10 border-info mt-3">
                                    Auto-fill will create “Present” entries for each day in the selected period with the chosen client.
                                    Existing dates are skipped automatically.
                                </div>
                            </div>
                            <div className="modal-footer border-info">
                                <button className="btn btn-secondary" onClick={() => setShowAutoFillModal(false)}>Close</button>
                                <button
                                    className="btn btn-warning"
                                    disabled={!selectedClientId || isAutoFilling}
                                    onClick={async () => {
                                        setIsAutoFilling(true);
                                        try {
                                            const start = new Date(useDateRange ? startDate : `${selectedMonth}-01`);
                                            const end = new Date(useDateRange ? endDate : `${selectedMonth}-31`);
                                            const employee = employees.find(emp => emp.id === selectedEmployee);
                                            const client = clients.find(c => c.id === selectedClientId) || clients[0];
                                            const entry = {
                                                // ...
                                                clientId: client.clientId || client.id,
                                                clientName: client.name || client.clientName || 'Client',
                                                // ...
                                            };

                                            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                                                const dateStr = d.toISOString().split('T')[0];
                                                // Skip existing
                                                if (dailyEntries.some(e => e.date === dateStr)) continue;
                                                // Strict duplicate block
                                                const dup = await checkDuplicateEntries(selectedEmployee, dateStr);
                                                if (dup) continue;

                                                const entry = {
                                                    timesheetId: getTimesheetId(),
                                                    employeeId: selectedEmployee,
                                                    date: dateStr,
                                                    clientId: client.clientId || client.id,
                                                    clientName: client.name || client.clientName || 'Client',
                                                    jobRole: employees.find(e => e.id === selectedEmployee)?.primarySkill || 'Worker',
                                                    status: 'present',
                                                    isPublicHoliday: false,
                                                    isEmergency: false,
                                                    isHalfDay: false,
                                                    dailySalary: calculateEntrySalary(employee, { status: 'present', isHalfDay: false }),
                                                    notes: 'Auto-filled'
                                                };
                                                // write
                                                await saveEntry(entry);
                                            }
                                            await loadDailyEntries(getTimesheetId());
                                            setShowAutoFillModal(false);
                                        } catch (err) {
                                            console.error('Auto-fill failed:', err);
                                            alert('Auto-fill failed. Please try again.');
                                        } finally {
                                            setIsAutoFilling(false);
                                        }
                                    }}
                                >
                                    {isAutoFilling ? 'Auto-Filling...' : 'Auto-Fill'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Edit Protected Modal */}
            {showEditProtectedModal && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }} tabIndex="-1">
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content bg-dark border border-warning">
                            <div className="modal-header border-warning">
                                <h5 className="modal-title text-warning">
                                    <i className="fas fa-lock me-2"></i>
                                    Edit Restricted
                                </h5>
                            </div>
                            <div className="modal-body">
                                <div className="alert alert-warning bg-warning bg-opacity-10 border-warning">
                                    <strong>This timesheet has been approved and cannot be edited.</strong>
                                </div>
                                <p className="text-white">
                                    Only administrators can modify approved timesheets.
                                    Please contact your administrator if you need to make changes.
                                </p>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowEditProtectedModal(false)}
                                >
                                    <i className="fas fa-times me-1"></i>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Timesheet Summary Component with Employee Photo - FIXED
const TimesheetSummary = ({ timesheet, advances, employee, currentUser }) => {
    if (!timesheet) return null;

    return (
        <div className="row mb-4">
            <div className="col-12">
                <div className="card bg-dark border-primary">
                    <div className="card-header bg-primary bg-opacity-25 border-primary d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center">
                            {/* Employee Photo - FIXED: Using employee photo instead of current user */}
                            {employee?.employeePhotoUrl ? (
                                <img
                                    src={employee.employeePhotoUrl}
                                    alt="Employee"
                                    className="rounded-circle me-3"
                                    style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        // Show fallback if image fails to load
                                        const fallback = e.target.nextSibling;
                                        if (fallback) fallback.style.display = 'flex';
                                    }}
                                />
                            ) : null}

                            <div>
                                <h5 className="card-title mb-0 text-white">
                                    Timesheet Summary - {timesheet.employeeName}
                                </h5>
                                <small className="text-light">
                                    {employee?.employeeId || employee?.idNo} • {employee?.primarySkill}
                                </small>
                            </div>
                        </div>
                        <span className={`badge ${timesheet.status === 'draft' ? 'bg-warning' :
                            timesheet.status === 'submitted' ? 'bg-info' :
                                timesheet.status === 'approved' ? 'bg-success' : 'bg-secondary'
                            }`}>
                            {timesheet.status?.toUpperCase()}
                        </span>
                    </div>
                    {/* Rest of the component remains same */}
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
                                    <h3 className="text-white mb-0">₹{timesheet.totalSalary?.toFixed(2)}</h3>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="text-center p-3 bg-danger bg-opacity-10 rounded border border-danger">
                                    <h6 className="text-danger mb-1 d-block">Net Payable</h6>
                                    <h3 className="text-white mb-0">₹{Math.round(timesheet.netPayable || 0)}</h3>
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
                                    <span className={`badge ${timesheet.status === 'draft' ? 'bg-warning' :
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

                        {/* Attendance Summary and Salary Breakdown */}
                        <div className="row mt-4">
                            <div className="col-md-6">
                                <div className="card bg-dark border-secondary">
                                    <div className="card-header bg-secondary bg-opacity-25 border-secondary">
                                        <h6 className="mb-0 text-white">Salary Breakdown</h6>
                                    </div>
                                    <div className="card-body">
                                        <div className="row g-2">
                                            <div className="col-6">
                                                <small className="text-muted">Basic Salary</small>
                                                <div className="text-white">₹{employee?.basicSalary || 0}</div>
                                            </div>
                                            <div className="col-6">
                                                <small className="text-muted">Daily Rate</small>
                                                <div className="text-white">₹{Math.round((employee?.basicSalary || 0) / 30)}</div>
                                            </div>
                                            <div className="col-6">
                                                <small className="text-muted">Total Salary</small>
                                                <div className="text-success">₹{timesheet.totalSalary?.toFixed(2)}</div>
                                            </div>
                                            <div className="col-6">
                                                <small className="text-muted">Advances</small>
                                                <div className="text-danger">₹{timesheet.advances}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="card bg-dark border-secondary">
                                    <div className="card-header bg-secondary bg-opacity-25 border-secondary">
                                        <h6 className="mb-0 text-white">Attendance Summary</h6>
                                    </div>
                                    <div className="card-body">
                                        <div className="row g-2">
                                            <div className="col-6">
                                                <small className="text-muted">Working Days</small>
                                                <div className="text-success">{timesheet.workingDays}</div>
                                            </div>
                                            <div className="col-6">
                                                <small className="text-muted">Leaves</small>
                                                <div className="text-warning">{timesheet.leaves || 0}</div>
                                            </div>
                                            <div className="col-6">
                                                <small className="text-muted">Holidays</small>
                                                <div className="text-primary">{timesheet.holidays || 0}</div>
                                            </div>
                                            <div className="col-6">
                                                <small className="text-muted">Emergencies</small>
                                                <div className="text-info">{timesheet.emergencies || 0}</div>
                                            </div>
                                            <div className="col-6">
                                                <small className="text-muted">Absents</small>
                                                <div className="text-danger">{timesheet.absents || 0}</div>
                                            </div>
                                            <div className="col-6">
                                                <small className="text-muted">Total Days</small>
                                                <div className="text-white">{timesheet.totalDays || 0}</div>
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
    );
};
// Daily Entries Table Component with Checkboxes and Modified By

const DailyEntriesTable = ({
    entries,
    onEdit,
    onDelete,
    totalSalary,
    isDisabled,
    selectedEntries,
    onSelectEntry,
    onSelectAllEntries
}) => {
    const { user: authUser } = useAuth(); // Get current logged-in user from auth context

    return (
        <div className="card bg-dark border-secondary">
            <div className="card-header bg-info bg-opacity-25 border-info d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0 text-white">
                    <i className="fas fa-calendar-day me-2"></i>
                    Daily Entries ({entries.length})
                </h5>
                <div className="form-check">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        checked={selectedEntries.length === entries.length && entries.length > 0}
                        onChange={onSelectAllEntries}
                        disabled={isDisabled}
                    />
                    <label className="form-check-label text-white">
                        Select All
                    </label>
                </div>
            </div>
            <div className="card-body p-0">
                <div className="table-responsive">
                    <table className="table table-dark table-hover mb-0">
                        <thead>
                            <tr>
                                <th width="50"></th>
                                <th>Date</th>
                                <th>Client ID</th>
                                <th>Client Name</th>
                                <th>Job Role</th>
                                <th>Status</th>
                                <th>Salary</th>
                                <th>Modified By</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry) => (
                                <tr key={entry.id} className={selectedEntries.includes(entry.id) ? 'table-active' : ''}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            checked={selectedEntries.includes(entry.id)}
                                            onChange={() => onSelectEntry(entry.id)}
                                            disabled={isDisabled}
                                        />
                                    </td>
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
                                        <span className={`badge ${entry.status === 'present' ? 'bg-success' :
                                            entry.status === 'leave' ? 'bg-warning' : 'bg-secondary'
                                            }`}>
                                            {entry.status}
                                        </span>
                                        {entry.isHalfDay && (
                                            <span className="badge bg-secondary ms-1">½</span>
                                        )}
                                    </td>
                                    <td className="text-success">₹{entry.dailySalary?.toFixed(2)}</td>
                                    <td>
                                        <small className="text-muted">
                                            {/* FIXED: Show current logged-in user's name for modifications */}
                                            By {authUser?.name || authUser?.displayName || 'Current User'}
                                        </small>
                                        <br></br>
                                        <small className='small-text text-white opacity-50'>
                                            {entry.updatedAt ? new Date(entry.updatedAt).toLocaleDateString('en-IN') :
                                                entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('en-IN') : ''}
                                        </small>
                                    </td>
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
                                            <button className="btn btn-outline-danger btn-sm" onClick={() => onDelete(entry.id)} disabled={isDisabled}>
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-dark border-top border-info">
                                <td colSpan="6" className="text-end text-white">
                                    <strong>Total Salary:</strong>
                                </td>
                                <td className="text-success">
                                    <strong>₹{totalSalary?.toFixed(2)}</strong>
                                </td>
                                <td colSpan="2"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};
export default DisplayTimeSheet;