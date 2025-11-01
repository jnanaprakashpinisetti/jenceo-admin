import React, { useState, useEffect, useMemo } from 'react';
import firebaseDB from '../../firebase';
import DailyEntryModal from './DailyEntryModal';
import AdvanceManagement from './AdvanceManagement';
import WorkerSearch from './WorkerSearch';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { useAuth } from "../../context/AuthContext";



// Build human ID like JW1-01-25 or JW1-01-25-2
const buildTimesheetId = async (emp, periodKey) => {
    const base = shortEmpCode(
        emp?.basicInfo?.employeeId || emp?.employeeId || emp?.idNo || "EMP"
    );
    let mm = "01",
        yy = "00";
    if (/^\d{4}-\d{2}$/.test(periodKey)) {
        ({ mm, yy } = monthParts(periodKey));
    } else {
        const [start = "2000-01-01"] = String(periodKey).split("_to_");
        ({ mm, yy } = monthParts(start.slice(0, 7)));
    }
    const idBase = `${base}-${yy}-${mm}`;

    // If this period already has a header under EmployeeBioData -> reuse its id; else suffix
    const allTsSnap = await firebaseDB.child(`${empPath(emp.id)}/timesheets`).get();
    if (!allTsSnap.exists()) return idBase;

    const all = Object.values(allTsSnap.val() || {});
    const samePrefix = all.filter((t) => (t.timesheetId || "").startsWith(idBase));
    if (samePrefix.length === 0) return idBase;

    const thisPeriod = all.find((t) => t.periodKey === periodKey);
    if (thisPeriod?.timesheetId) return thisPeriod.timesheetId;

    return `${idBase}-${samePrefix.length + 1}`;
};

// --- PATH HELPERS (Employee-scoped only) ---
const empPath = (empId) => `EmployeeBioData/${empId}`;
const empTsById = (empId, tsId) => `${empPath(empId)}/timesheets/${tsId}`;
const empEntryById = (empId, tsId, dateStr) =>
    `${empTsById(empId, tsId)}/dailyEntries/${dateStr}`;

// Compat helpers for older calls (so no-undef goes away)
const tsNode = (empId, tsKeyOrId) =>
    `${empTsById(empId, tsKeyOrId)}`;
const entryNode = (empId, tsKeyOrId, dateStr = "") =>
    `${tsNode(empId, tsKeyOrId)}/dailyEntries${dateStr ? `/${dateStr}` : ""}`;
const entryNodeByDate = (empId, tsKeyOrId, dateStr) =>
    `${tsNode(empId, tsKeyOrId)}/dailyEntries/${dateStr}`;

// Build period key from modal fields
const makePeriodKey = ({ tsMode, tsMonth, tsStart, tsEnd }) =>
    tsMode === "month" ? tsMonth : `${tsStart}_to_${tsEnd}`;

// Short employee code from JW00001 -> JW1 (used in timesheetId)
const shortEmpCode = (code) => {
    const raw = String(code || "");
    const m = raw.match(/^([A-Za-z]+)0*([0-9]+)/);
    return m ? `${m[1]}${parseInt(m[2], 10)}` : raw.replace(/[^A-Za-z0-9]/g, "");
};
const monthParts = (yyyyMm) => {
    const [y, m] = (yyyyMm || "").split("-");
    return { mm: m || "01", yy: (y || "").slice(-2) };
};

const pruneUndefined = (obj = {}) =>
    Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));



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
    const [submitComment, setSubmitComment] = useState('');
    const [selectedEntries, setSelectedEntries] = useState([]);
    const [showDateChangeWarning, setShowDateChangeWarning] = useState(false);
    const [dateChangeEntry, setDateChangeEntry] = useState(null);
    const [newDate, setNewDate] = useState('');

    const [entryModalMode, setEntryModalMode] = useState('single');

    const [showPrevTsDelete, setShowPrevTsDelete] = useState(false);
    const [prevTsToDelete, setPrevTsToDelete] = useState(null);

    const [isSaving, setIsSaving] = useState(false);

    const [showYearPrev, setShowYearPrev] = useState(false);
    const [yearPrevTimesheets, setYearPrevTimesheets] = useState([]);

    const [showNoteModal, setShowNoteModal] = useState(false);
    const [currentNote, setCurrentNote] = useState('');

    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const [showSubmitModal, setShowSubmitModal] = useState(false);

    const [pendingSubmitAfterAssign, setPendingSubmitAfterAssign] = useState(false)

    const newEntriesLocal = [];
    const childUpdates = {};




    // Add these states
    const [showCustomModal, setShowCustomModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        title: '',
        message: '',
        type: 'info', // 'info', 'success', 'warning', 'error'
        onConfirm: null,
        showConfirm: false
    });

    // Modal helper function
    const showModal = (title, message, type = 'info', onConfirm = null) => {
        setModalConfig({
            title,
            message,
            type,
            onConfirm,
            showConfirm: !!onConfirm
        });
        setShowCustomModal(true);
    };

    const getRowKey = (e) => String(e?.id || e?.date);

    // Active Timesheet ID we are viewing/editing
    const [currentTimesheetId, setCurrentTimesheetId] = useState('');


    const ensureTimesheetHeader = async (empId, tsId, header = {}) => {
        const emp = employees.find(e => e.id === empId);
        const periodKey = getCurrentPeriodKey();
        const periodStr = useDateRange ? `${startDate} to ${endDate}` : selectedMonth;

        const base = {
            employeeId: empId,
            timesheetId: tsId,
            employeeName: `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim(),
            period: periodStr || '',
            periodKey: periodKey || '',
            startDate: useDateRange ? startDate : `${selectedMonth}-01`,
            endDate: useDateRange ? endDate : `${selectedMonth}-31`,
            status: 'draft',
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser?.uid || 'admin',
            updatedByName: currentUser?.displayName || 'Admin',
        };

        const patch = pruneUndefined({ ...base, ...header });
        await firebaseDB.child(empTsById(empId, tsId)).update(patch);
        return patch;
    };

    // --- ADVANCE DEDUCTION HELPERS ---

    // true if a yyyy-mm-dd date is inside the currently selected period
    const isDateInActivePeriod = (yyyyMmDd) => {
        if (!yyyyMmDd) return false;
        if (useDateRange && startDate && endDate) {
            return yyyyMmDd >= startDate && yyyyMmDd <= endDate;
        }
        // month mode
        return (selectedMonth && yyyyMmDd.slice(0, 7) === selectedMonth);
    };

    // get the first (earliest) timesheet id for the active period
    const getFirstTimesheetIdForActivePeriod = async (empId) => {
        const snap = await firebaseDB.child(empTsNode(empId)).get();
        if (!snap.exists()) return currentTimesheetId;

        const all = snap.val() || {};
        // identify period by periodKey: for month it'll be "YYYY-MM"; for range, "YYYY-MM-DD_to_YYYY-MM-DD"
        const activeKey = getCurrentPeriodKey();

        // Collect only sheets of this period
        const samePeriod = Object.entries(all)
            .filter(([id, ts]) => (ts?.periodKey || '') === activeKey)
            .map(([id, ts]) => ({
                id,
                createdAt: ts?.createdAt || ts?.updatedAt || ts?.startDate || '9999-12-31',
                startDate: ts?.startDate || '9999-12-31',
                timesheetId: id
            }));

        if (samePeriod.length === 0) return currentTimesheetId;

        // Earliest by createdAt, then startDate, then id
        samePeriod.sort((a, b) =>
            (a.createdAt || '').localeCompare(b.createdAt || '') ||
            (a.startDate || '').localeCompare(b.startDate || '') ||
            (a.id || '').localeCompare(b.id || '')
        );
        return samePeriod[0].id;
    };



    // Load entries by employee + timesheetId
    const loadDailyEntriesByTimesheetId = async (empId, tsId) => {
        const snap = await firebaseDB.child(`${empTsById(empId, tsId)}/dailyEntries`).get();
        const obj = snap.val() || {};
        const list = Object.keys(obj)
            .sort()
            .map((date) => ({
                id: date,
                _rowKey: `${empId}_${date}`,
                ...obj[date],
                date, // keep guaranteed
            }));
        setDailyEntries(list);
    };




    // NEW: open confirm modal
    const openPrevTsDelete = (ts) => {
        setPrevTsToDelete(ts);
        setShowPrevTsDelete(true);
    };

    // Use Auth Context
    const authContext = useAuth();
    const { user: authUser } = useAuth();


    // ---- NEW STATE (add near other useState) ----
    const [showDeleteTsModal, setShowDeleteTsModal] = useState(false);
    const [tsToDelete, setTsToDelete] = useState(null);

    const [showAutoFillModal, setShowAutoFillModal] = useState(false);
    const [clientSearch, setClientSearch] = useState("");
    const [selectedClientId, setSelectedClientId] = useState("");
    const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
    // FIXED: Remove the async function from filteredClients
    const filteredClients = useMemo(() => {
        const q = (clientSearch || "").toLowerCase();
        if (!q) return clients || [];

        return (clients || []).filter(c =>
            (c.name || "").toLowerCase().includes(q) ||
            (c.id || "").toLowerCase().includes(q) ||
            (c.clientId || "").toLowerCase().includes(q)
        );
    }, [clientSearch, clients]);

    // Move the loadYearTimesheets function outside
    const loadYearTimesheets = async () => {
        if (!selectedEmployee) {
            setYearPrevTimesheets([]);
            return;
        }
        try {
            const snap = await firebaseDB.child('Timesheets')
                .orderByChild('employeeId')
                .equalTo(selectedEmployee)
                .once('value');
            if (!snap.exists()) {
                setYearPrevTimesheets([]);
                return;
            }
            const list = Object.entries(snap.val()).map(([id, data]) => ({ id, ...data }));
            const now = new Date();
            const y = now.getFullYear();
            const filtered = list.filter(ts => {
                const dt = new Date(ts.createdAt || ts.updatedAt || ts.submittedAt || ts.startDate || ts.period);
                return !isNaN(dt) && dt.getFullYear() === y;
            }).sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0));

            const pad = (n) => (n < 10 ? '0' + n : '' + n);
            const withDisplay = filtered.map((ts, idx) => {
                let mm = '01', yy = '00';
                if (ts.period && /^\d{4}-\d{2}/.test(ts.period)) {
                    const parts = ts.period.split('-');
                    mm = parts[1];
                    yy = String(parts[0]).slice(-2);
                } else {
                    const dt = new Date(ts.createdAt || ts.updatedAt || Date.now());
                    mm = pad(dt.getMonth() + 1);
                    yy = String(dt.getFullYear()).slice(-2);
                }
                return { ...ts, displayId: `JC-${mm}-${yy}-(${idx + 1})` };
            });
            setYearPrevTimesheets(withDisplay);
        } catch (e) {
            console.error('loadYearTimesheets error', e);
            setYearPrevTimesheets([]);
        }
    };


    // Period key used everywhere: "YYYY-MM" or "YYYY-MM-DD_to_YYYY-MM-DD"
    const getCurrentPeriodKey = () => {
        return useDateRange && startDate && endDate
            ? `${startDate}_to_${endDate}`
            : (selectedMonth || '');
    };

    // ---- Duplicate guards across ALL timesheets for an employee ----
    const dateExistsInOtherTimesheets = async (empId, date, excludeTsId = null) => {
        const tsSnap = await firebaseDB.child(empTsNode(empId)).get();
        if (!tsSnap.exists()) return null;
        const all = tsSnap.val() || {};
        for (const [tsId] of Object.entries(all)) {
            if (excludeTsId && tsId === excludeTsId) continue;
            const eSnap = await firebaseDB.child(`${empTsById(empId, tsId)}/dailyEntries/${date}`).get();
            if (eSnap.exists()) return { tsId, entry: eSnap.val() };
        }
        return null;
    };

    const findOverlapsInRange = async (empId, startISO, endISO, excludeTsId = null) => {
        const overlaps = [];
        const start = new Date(startISO);
        const end = new Date(endISO);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().slice(0, 10);
            const hit = await dateExistsInOtherTimesheets(empId, dateStr, excludeTsId);
            if (hit) overlaps.push({ date: dateStr, ...hit });
        }
        return overlaps;
    };

    // Fast: load all dates that already exist in ANY timesheet for this employee (excluding one tsId if provided)
    const preloadExistingDates = async (empId, excludeTsId = null) => {
        const tsSnap = await firebaseDB.child(empTsNode(empId)).get();
        const taken = new Set();
        if (!tsSnap.exists()) return taken;

        const all = tsSnap.val() || {};
        for (const [tsId, header] of Object.entries(all)) {
            if (excludeTsId && tsId === excludeTsId) continue;
            if (!header?.dailyEntries) continue;
            for (const d of Object.keys(header.dailyEntries)) taken.add(d);
        }
        return taken;
    };








    // PATCH: delete an entire timesheet (no dual nodes)
    const deletePreviousTimesheet = async () => {
        if (!prevTsToDelete?.id || !selectedEmployee) return;

        try {
            await firebaseDB.child(empTsNode(selectedEmployee, prevTsToDelete.id)).remove();

            // If it was currently open, clear it
            if (timesheet?.id === prevTsToDelete.id) {
                setTimesheet(null);
                setDailyEntries([]);
            }

            await loadPreviousTimesheets();
        } catch (e) {
            console.error('Error deleting previous timesheet:', e);
            alert('Delete failed. Try again.');
        } finally {
            setShowPrevTsDelete(false);
            setPrevTsToDelete(null);
        }
    };

    useEffect(() => {
        setHasUnsavedChanges(true);
    }, [dailyEntries, advances]);



    useEffect(() => {
        if (selectedEmployee) {
            loadPreviousTimesheets();
            loadYearTimesheets();
        }
    }, [selectedEmployee]);

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

    const [allUsers, setAllUsers] = useState([]);
    const [userSearch, setUserSearch] = useState("");
    const filteredUsers = useMemo(() => {
        const q = (userSearch || "").toLowerCase();
        if (!q) return allUsers;
        return allUsers.filter(u =>
            (u.displayName || "").toLowerCase().includes(q) ||
            (u.email || "").toLowerCase().includes(q)
        );
    }, [userSearch, allUsers]);

    // Update fetchUsers function to filter by role
    const fetchUsers = async () => {
        const paths = ['Users', 'JenCeo-DataBase/Users', 'AppUsers'];
        const tmp = [];

        for (const p of paths) {
            try {
                const snap = await firebaseDB.child(p).once('value');
                if (!snap.exists()) continue;
                const obj = snap.val() || {};
                Object.entries(obj).forEach(([uid, val]) => {
                    // Only include admin, manager, superadmin roles
                    const userRole = val.role?.toLowerCase() || '';
                    if (['admin', 'manager', 'superadmin', 'super_admin'].includes(userRole)) {
                        tmp.push({
                            uid,
                            displayName: val.displayName || val.name || val.email || uid,
                            email: val.email || '',
                            role: val.role || 'user'
                        });
                    }
                });
            } catch (error) {
                console.warn(`Error loading users from ${p}:`, error);
            }
        }

        // dedupe by uid
        const uniq = [];
        const seen = new Set();
        tmp.forEach(u => {
            if (!seen.has(u.uid)) {
                seen.add(u.uid);
                uniq.push(u);
            }
        });
        setAllUsers(uniq);
    };

    {
        filteredUsers.map(u => (
            <div
                key={u.uid}
                className={`p-2 rounded ${assignTo === u.uid ? 'bg-primary' : 'hover-bg-gray-700'}`}
                onClick={() => setAssignTo(u.uid)}
                style={{ cursor: 'pointer' }}
            >
                <div className="fw-bold text-white">{u.displayName}</div>
                <div className="text-info small">Role: {u.role || 'user'}</div>
                <div className="text-muted small">{u.email}</div>
            </div>
        ))
    }

    useEffect(() => { fetchUsers(); }, []);


    // Fetch employees and clients
    useEffect(() => {
        fetchEmployees();
        fetchClients();
    }, []);

    // Add this state for tracking Firebase listeners
    const [listeners, setListeners] = useState([]);


    // Fix the useEffect that loads timesheet
    useEffect(() => {
        if (selectedEmployee && (selectedMonth || (useDateRange && startDate && endDate))) {
            // Only load existing timesheet, don't create new one
            loadTimesheet(false);
            loadAdvances();
            loadPreviousTimesheets();
        }

        // Cleanup function
        return () => {
            listeners.forEach(listener => {
                if (listener && typeof listener === 'function') {
                    listener();
                }
            });
            setListeners([]);
        };
    }, [selectedEmployee, selectedMonth, startDate, endDate, useDateRange]);

    // Auto-recalculate summary when entries or advances change
    useEffect(() => {
        if (timesheet && dailyEntries.length >= 0) {
            calculateSummary();
        }
    }, [dailyEntries, advances]);

    // Auto-open Submit modal as soon as the sheet gets assigned (even if Assign came from elsewhere)
    useEffect(() => {
        if (pendingSubmitAfterAssign && timesheet?.assignedTo) {
            setShowAssignModal(false);
            setShowConfirmModal(true);
            setPendingSubmitAfterAssign(false);
        }
    }, [pendingSubmitAfterAssign, timesheet?.assignedTo]);


    // Update the useEffect that sets current user
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
                    displayName: user.displayName || user.email, // Ensure displayName is set
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
                    // Fallback to localStorage
                    const storedUser = localStorage.getItem('currentUser');
                    if (storedUser) {
                        setCurrentUser(JSON.parse(storedUser));
                    }
                }
            }
        });

        return () => unsubscribe();
    }, [authContext]);

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

    // PATCH: timesheet path helpers — single source of truth
    const empTsNode = (empId, tsId = '') =>
        `EmployeeBioData/${empId}/timesheets${tsId ? `/${tsId}` : ''}`;

    const empTsEntriesNode = (empId, tsId) =>
        `${empTsNode(empId, tsId)}/dailyEntries`;


    const nameForUid = (uid) => {
        if (!uid) return 'N/A';

        // Check if it's current user first
        if (uid === currentUser?.uid) {
            return currentUser?.displayName || currentUser?.email || 'Current User';
        }

        // Check allUsers array
        const user = allUsers.find(u => u.uid === uid);
        if (user) {
            return user.displayName || user.email || uid;
        }

        // Try to get from auth context if available
        if (authContext && authContext.user && authContext.user.uid === uid) {
            return authContext.user.displayName || authContext.user.email || 'Auth User';
        }

        return uid; // fallback to UID if no name found
    };
    const handleAutoFill = async (tpl) => {
        const emp = employees.find(e => e.id === selectedEmployee);
        if (!emp) return showModal('Error', 'Select employee first.', 'error');

        const periodKey = makePeriodKey(tpl);

        // Derive range for the planned period
        const [s, e] = periodKey.includes('_to_')
            ? periodKey.split('_to_')
            : [`${periodKey}-01`, `${periodKey}-31`];
        const start = new Date(s);
        const end = new Date(e);

        // Load ALL existing dates once (across all timesheets for this employee)
        const takenDates = await preloadExistingDates(selectedEmployee /* excludeTsId = null */);

        // Collect any overlaps with the dates you’re about to create
        const conflicts = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const ds = d.toISOString().slice(0, 10);
            if (takenDates.has(ds)) conflicts.push(ds);
        }

        // 🚫 If any day already exists in ANY state, block creation and show message
        if (conflicts.length) {
            const preview = conflicts.slice(0, 5).join(', ');
            showModal(
                'Duplicate dates found',
                `Cannot create a new timesheet. ${conflicts.length} day(s) in this period already exist: ${preview}${conflicts.length > 5 ? ' …' : ''}.`,
                'warning'
            );
            return;
        }

        const tsId = await buildTimesheetId(emp, periodKey);

        // --- Create base header ---
        const header = {
            timesheetId: tsId,
            periodKey,
            employeeId: selectedEmployee,
            employeeName: `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim(),
            status: 'draft',
            period: /^\d{4}-\d{2}$/.test(periodKey) ? periodKey : periodKey.replace('_to_', ' to '),
            startDate: periodKey.includes('_to_') ? periodKey.split('_to_')[0] : `${periodKey}-01`,
            endDate: periodKey.includes('_to_') ? periodKey.split('_to_')[1] : `${periodKey}-31`,
            createdBy: currentUser?.uid || 'admin',
            createdByName: currentUser?.displayName || 'Admin',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        setTimesheet(header);
        setCurrentTimesheetId(tsId);

        // ✅ PRELOAD existing dates just once

        // --- Build entries in memory ---
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().slice(0, 10);
            if (takenDates.has(dateStr)) continue;

            const status = (tpl.status || 'present').toLowerCase();
            const entryLike = {
                status: tpl.status || 'present',
                isHalfDay: false,
                isPublicHoliday: status === 'holiday',
                isEmergency: false,
                manualDailyEnabled: tpl.manualDailyEnabled,
                manualDailyAmount: tpl.manualDailyAmount,
                editedBasicSalary: tpl.editedBasicSalary
            };

            const pay = salaryForEntry(emp, entryLike);

            const entry = {
                date: dateStr,
                status,
                isHalfDay: false,
                isPublicHoliday: status === 'holiday',
                isEmergency: false,
                jobRole:
                    tpl.jobRole === 'Others'
                        ? tpl.jobRoleCustom || ''
                        : tpl.jobRole || emp?.primarySkill || '',
                clientId: tpl.clientId || 'DEFAULT',
                clientName: tpl.clientName || 'Default Client',
                periodKey,
                timesheetId: tsId,
                employeeId: selectedEmployee,
                employeeName: `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim(),
                basicSalary: Number(emp?.basicSalary) || 0,
                dailySalary: Math.round(pay),
                employeeId_date: `${selectedEmployee}_${dateStr}`,
                createdBy: currentUser?.uid || 'admin',
                createdByName: currentUser?.displayName || 'Admin',
                createdAt: new Date().toISOString(),
                updatedBy: currentUser?.uid || 'admin',
                updatedByName: currentUser?.displayName || 'Admin',
                updatedAt: new Date().toISOString()
            };

            // stage update paths
            childUpdates[`${empTsById(selectedEmployee, tsId)}/dailyEntries/${dateStr}`] = entry;
            newEntriesLocal.push(entry);
        }

        // ✅ 1st: write header only
        await firebaseDB.child(empTsById(selectedEmployee, tsId)).update({
            ...(header || {}),
            updatedAt: new Date().toISOString(),
        });

        // ✅ 2nd: write all entries in one go
        await firebaseDB.update(childUpdates);

        // update UI instantly
        newEntriesLocal.sort((a, b) => a.date.localeCompare(b.date));
        setDailyEntries(newEntriesLocal);
        await calculateSummary(newEntriesLocal, advances);

        showModal('Success', `Auto-fill completed for period ${periodKey}.`, 'success');
    };



    // Update the edit entry handler
    const handleEditEntry = (entry) => {
        if (!checkEditPermission(timesheet?.status)) {
            return;
        }
        setCurrentEntry(entry);
        setIsEditing(true);
        setEntryModalMode('single'); // Ensure it's in single mode for editing
        setShowEntryModal(true);
    };

    // Update the add new entry handler
    const handleAddEntry = () => {
        if (!selectedEmployee) {
            alert('Please select an employee first.');
            return;
        }

        // Ensure we have a timesheet before adding entries
        if (!timesheet || !currentTimesheetId) {
            alert('Please wait while we set up the timesheet...');
            return;
        }

        setCurrentEntry(null);
        setIsEditing(false);
        setEntryModalMode('single');
        setShowEntryModal(true);
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
        if (useDateRange) return `${selectedEmployee}_${startDate}_to_${endDate}`;
        return `${selectedEmployee}_${selectedMonth}`;
    };

    const [isCreatingTimesheet, setIsCreatingTimesheet] = useState(false);


    // Update the loadTimesheet function to properly set timesheet state
    const loadTimesheet = async (createIfMissing = false) => {
        if (!selectedEmployee) {
            setTimesheet(null);
            setCurrentTimesheetId('');
            setDailyEntries([]);
            return;
        }

        setIsCreatingTimesheet(true);

        try {
            const periodKey = getCurrentPeriodKey();
            const employee = employees.find(emp => emp.id === selectedEmployee);

            if (!employee) {
                setTimesheet(null);
                setCurrentTimesheetId('');
                setDailyEntries([]);
                return;
            }

            // 1) Check if timesheet exists for CURRENT period only
            const allTsSnap = await firebaseDB.child(`EmployeeBioData/${selectedEmployee}/timesheets`).get();
            let foundHeader = null;
            let foundTsId = null;

            if (allTsSnap.exists()) {
                const all = allTsSnap.val() || {};
                for (const [tsId, header] of Object.entries(all)) {
                    if (header?.periodKey === periodKey) {
                        foundHeader = { ...header, id: tsId, timesheetId: tsId };
                        foundTsId = tsId;
                        break;
                    }
                }
            }



            if (foundHeader) {
                // Load existing timesheet ONLY if it matches current period
                setTimesheet(foundHeader);
                setCurrentTimesheetId(foundTsId);

                const entriesRef = firebaseDB.child(`${empTsById(selectedEmployee, foundTsId)}/dailyEntries`);
                const entriesSnap = await entriesRef.get();

                if (entriesSnap.exists()) {
                    const obj = entriesSnap.val() || {};
                    const rows = Object.entries(obj)
                        .map(([k, v]) => ({
                            ...v,
                            date: v?.date || k,
                            _rowKey: v?.employeeId_date || `${selectedEmployee}_${k}`,
                        }))
                        .sort((a, b) => new Date(a.date) - new Date(b.date));
                    setDailyEntries(rows);
                } else {
                    setDailyEntries([]);
                }
            } else if (createIfMissing) {
                // Create new timesheet - ensure empty entries
                const newTimesheetId = await buildTimesheetId(employee, periodKey);

                const newTimesheet = {
                    timesheetId: newTimesheetId,
                    periodKey: periodKey,
                    employeeId: selectedEmployee,
                    employeeName: `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim(),
                    status: 'draft',
                    period: useDateRange ? `${startDate} to ${endDate}` : selectedMonth,
                    startDate: useDateRange ? startDate : `${selectedMonth}-01`,
                    endDate: useDateRange ? endDate : `${selectedMonth}-31`,
                    useDateRange: useDateRange,
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
                    createdByName: currentUser?.displayName || currentUser?.email || 'Admin',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                setTimesheet(newTimesheet);
                setCurrentTimesheetId(newTimesheetId);
                setDailyEntries([]);
            } else {
                // No timesheet found and not creating new one
                setTimesheet(null);
                setCurrentTimesheetId('');
                setDailyEntries([]);
            }

        } catch (error) {
            console.error('Error loading timesheet:', error);
            showModal('Error', 'Error loading timesheet', 'error');
        } finally {
            setIsCreatingTimesheet(false);
        }
    };
    // Alternative method to load timesheets from different paths
    const loadAlternativeTimesheets = async () => {
        if (!selectedEmployee) return;

        setLoadingPrevious(true);
        try {
            // Try multiple paths to find timesheets
            const paths = [
                `EmployeeBioData/${selectedEmployee}/timesheets`,
                'Timesheets' // Fallback to root Timesheets collection
            ];

            let allTimesheets = [];

            for (const path of paths) {
                try {
                    const snap = await firebaseDB.child(path).get();
                    if (snap.exists()) {
                        const data = snap.val() || {};

                        // Handle different data structures
                        const timesheetsFromPath = Object.entries(data)
                            .map(([id, tsData]) => {
                                // If this is the root Timesheets collection, filter by employeeId
                                if (path === 'Timesheets' && tsData.employeeId !== selectedEmployee) {
                                    return null;
                                }

                                return {
                                    id,
                                    timesheetId: id,
                                    ...tsData,
                                    employeeId: selectedEmployee,
                                    employeeName: tsData.employeeName || 'Unknown Employee'
                                };
                            })
                            .filter(ts => ts !== null);

                        allTimesheets = [...allTimesheets, ...timesheetsFromPath];
                    }
                } catch (error) {
                    console.warn(`Error loading from ${path}:`, error);
                }
            }

            // Remove duplicates and sort
            const uniqueTimesheets = allTimesheets.filter((ts, index, self) =>
                index === self.findIndex(t => t.id === ts.id)
            ).sort((a, b) => {
                const dateA = new Date(a.updatedAt || a.createdAt || 0);
                const dateB = new Date(b.updatedAt || b.createdAt || 0);
                return dateB - dateA;
            }).slice(0, 12);

            setPreviousTimesheets(uniqueTimesheets);

            if (uniqueTimesheets.length === 0) {
                console.log('No timesheets found in any location for employee:', selectedEmployee);
            }
        } catch (err) {
            console.error('Error in alternative timesheet loading:', err);
        } finally {
            setLoadingPrevious(false);
        }
    };



    // Add this helper function
    const calculateTotalDaysInPeriod = () => {
        try {
            const start = new Date(useDateRange ? startDate : `${selectedMonth}-01`);
            const end = new Date(useDateRange ? endDate : `${selectedMonth}-31`);

            let totalDays = 0;
            for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
                totalDays++;
            }
            return totalDays;
        } catch (error) {
            console.error('Error calculating total days:', error);
            return 0;
        }
    };

    // PATCH: jump to a selected previous timesheet and hydrate the live view
    // Update the openPreviousTimesheet function
    const openPreviousTimesheet = async (tsId) => {
        if (!selectedEmployee || !tsId) return;

        const tsSnap = await firebaseDB.child(empTsNode(selectedEmployee, tsId)).once('value');
        if (!tsSnap.exists()) return;

        const ts = tsSnap.val();
        // Ensure all required fields are set
        const enhancedTs = {
            id: tsId,
            timesheetId: tsId,
            ...ts,
            employeeId: selectedEmployee,
            employeeName: ts.employeeName || employees.find(e => e.id === selectedEmployee)?.displayName || 'Employee',
            submittedByName: ts.submittedByName || ts.submittedBy || 'Not Submitted',
            assignedToName: ts.assignedToName || ts.assignedTo || 'Not Assigned',
            assignedByName: ts.assignedByName || ts.assignedBy || 'Not Assigned'
        };

        setTimesheet(enhancedTs);
        setCurrentTimesheetId(tsId);

        // Load daily entries
        const entriesSnap = await firebaseDB.child(`${empTsById(selectedEmployee, tsId)}/dailyEntries`).get();
        if (entriesSnap.exists()) {
            const obj = entriesSnap.val() || {};
            const entries = Object.entries(obj)
                .map(([k, v]) => ({
                    id: k,
                    ...v,
                    date: v?.date || k,
                    _rowKey: v?.employeeId_date || `${selectedEmployee}_${k}`
                }))
                .sort((a, b) => new Date(a.date) - new Date(b.date));
            setDailyEntries(entries);
        } else {
            setDailyEntries([]);
        }
    };



    const [loadingPrevious, setLoadingPrevious] = useState(false);

    const [previousTimesheetsLoading, setPreviousTimesheetsLoading] = useState(false);

    // Replace the loadPreviousTimesheets function:
    const loadPreviousTimesheets = async () => {
        if (!selectedEmployee || previousTimesheetsLoading) {
            return;
        }

        setPreviousTimesheetsLoading(true);
        try {
            const snap = await firebaseDB.child(empTsNode(selectedEmployee)).once('value');

            if (!snap.exists()) {
                setPreviousTimesheets([]);
                return;
            }

            const obj = snap.val();
            const list = Object.keys(obj)
                .map(id => {
                    const tsData = obj[id] || {};

                    // Only include timesheets for the selected employee
                    if (tsData.employeeId !== selectedEmployee) {
                        return null;
                    }

                    const submittedByName = tsData.submittedByName
                        || tsData.submittedBy
                        || (tsData.submittedBy ? nameForUid(tsData.submittedBy) : 'Not Submitted');

                    const assignedToName = tsData.assignedToName
                        || tsData.assignedTo
                        || (tsData.assignedTo ? nameForUid(tsData.assignedTo) : 'Not Assigned');

                    const assignedByName = tsData.assignedByName
                        || tsData.assignedBy
                        || (tsData.assignedBy ? nameForUid(tsData.assignedBy) : 'Not Assigned');

                    return {
                        id,
                        timesheetId: id,
                        ...tsData,
                        submittedByName: submittedByName,
                        submittedAt: tsData.submittedAt || tsData.updatedAt || tsData.createdAt,
                        submittedBy: tsData.submittedBy,
                        assignedToName: assignedToName,
                        assignedTo: tsData.assignedTo,
                        assignedByName: assignedByName,
                        assignedBy: tsData.assignedBy,
                        assignedAt: tsData.assignedAt,
                        employeeId: selectedEmployee,
                        employeeName: tsData.employeeName || employees.find(e => e.id === selectedEmployee)?.displayName || 'Employee'
                    };
                })
                .filter(ts => ts !== null && ts.employeeId === selectedEmployee) // Double filter for safety
                .sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));

            setPreviousTimesheets(list);
        } catch (error) {
            console.error('Error loading previous timesheets:', error);
            setPreviousTimesheets([]);
        } finally {
            setPreviousTimesheetsLoading(false);
        }
    };

    // Helper function to get user name from UID
    const getUserName = (uid) => {
        if (!uid) return 'N/A';
        const user = allUsers.find(u => u.uid === uid);
        return user?.displayName || user?.email || 'Unknown User';
    };
    // ---- Salary helpers (final) ----
    const dailyRateFor = (emp) => {
        const basic = Number(emp?.basicSalary) || 0;
        return basic / 30;
    };

    // Normalizes emergency amount coming from various field names / string inputs
    const getEmergencyAmount = (src) => {
        const v =
            src?.emergencyAmount ??
            src?.emergencySalary ??
            src?.emergencyPay ??
            0;
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    };


    // Enhanced salary calculation with manual amounts and emergency duty — FINAL
    const salaryForEntry = (emp, entryLike) => {
        // 1) manual/override wins
        if (entryLike?.manualDailyEnabled && entryLike?.manualDailyAmount) {
            const manualAmount = Number(entryLike.manualDailyAmount) || 0;
            return manualAmount;
        }

        // 2) compute the daily rate from edited basic or employee basic
        const basicSalary = Number(entryLike?.editedBasicSalary) || Number(emp?.basicSalary) || 0;
        const rate = basicSalary / 30;

        const status = String(entryLike?.status || 'present').toLowerCase();
        const isHalf = !!entryLike?.isHalfDay;
        const isEmergency = !!entryLike?.isEmergency;

        // normalize emergency add-on from any key name
        const emergencyAdd = getEmergencyAmount(entryLike);

        // Emergency Duty always uses full/half base + emergency add-on
        if (isEmergency) {
            const base = isHalf ? rate / 2 : rate;
            return base + emergencyAdd;
        }

        // Only 'present' gets base salary (with half-day logic); leave/absent/holiday = 0
        if (status !== 'present') return 0;

        return isHalf ? rate / 2 : rate;
    };

    // Update calculateSummary to properly count half days
    const calculateSummary = async (
        entries = dailyEntries,
        advancesData = advances
    ) => {
        if (!selectedEmployee || !currentTimesheetId) return;

        const fullDays = entries.filter(e => e.status === 'present' && !e.isPublicHoliday && !e.isHalfDay).length;
        const halfDays = entries.filter(e => e.status === 'present' && !e.isPublicHoliday && e.isHalfDay).length;
        const workingDays = fullDays + (halfDays * 0.5);
        const holidays = entries.filter(e => e.isPublicHoliday || e.status === 'holiday').length;
        const emergencies = entries.filter(e => e.isEmergency).length;
        const leaves = entries.filter(e => e.status === 'leave').length;
        const absents = entries.filter(e => e.status === 'absent').length;
        const totalSalary = entries.reduce((s, e) => s + (parseFloat(e.dailySalary) || 0), 0);
        // 1) Only advances that fall in the ACTIVE period
        const advancesInPeriod = (advancesData || [])
            .filter(a => isDateInActivePeriod(a.date) && (a.status || '').toLowerCase() !== 'settled');

        // 2) Only the FIRST timesheet of the period actually deducts
        const firstTsId = await getFirstTimesheetIdForActivePeriod(selectedEmployee);
        const totalAdv = (currentTimesheetId === firstTsId)
            ? advancesInPeriod.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0)
            : 0;

        const patch = {
            workingDays,
            fullDays,
            halfDays,
            totalDays: entries.length,
            leaves,
            holidays,
            emergencies,
            absents,
            totalSalary,
            advances: totalAdv,                                  // ← use period + first-sheet only
            netPayable: Math.round(totalSalary - totalAdv),      // ← recomputed
            updatedBy: currentUser?.uid || 'admin',
            updatedByName: currentUser?.displayName || 'Admin',
            updatedAt: new Date().toISOString(),
        };

        setTimesheet(prev => ({ ...(prev || { timesheetId: currentTimesheetId }), ...patch, timesheetId: currentTimesheetId }));
        await firebaseDB.child(empTsById(selectedEmployee, currentTimesheetId)).update(patch);
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

    };

    // Settle all advances for the active period so they won't deduct again
    const settleAdvancesForActivePeriod = async (empId, tsId) => {
        // load employee's advances
        const snap = await firebaseDB.child('Advances')
            .orderByChild('employeeId')
            .equalTo(empId)
            .once('value');

        if (!snap.exists()) return;

        const updates = {};
        const now = new Date().toISOString();

        Object.entries(snap.val() || {}).forEach(([advId, adv]) => {
            // Only settle those inside current period and not already settled
            if (isDateInActivePeriod(adv?.date) && String(adv?.status || '').toLowerCase() !== 'settled') {
                updates[`Advances/${advId}/status`] = 'settled';
                updates[`Advances/${advId}/settledAt`] = now;
                updates[`Advances/${advId}/settledBy`] = currentUser?.uid || 'admin';
                updates[`Advances/${advId}/settledByName`] = currentUser?.displayName || currentUser?.email || 'Admin';
                updates[`Advances/${advId}/settledTimesheetId`] = tsId;
            }
        });

        if (Object.keys(updates).length) {
            await firebaseDB.update(updates);
        }
    };

    const loadDailyEntries = async (periodKeyParam) => {
        const periodKey = periodKeyParam || getCurrentPeriodKey();
        const ref = firebaseDB.child(entryNode(selectedEmployee, periodKey, '')); // will not exist
        const snap = await firebaseDB.child(tsNode(selectedEmployee, periodKey) + '/dailyEntries').get();

        if (snap.exists()) {
            const obj = snap.val() || {};
            const entries = Object.values(obj).sort((a, b) => new Date(a.date) - new Date(b.date));
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

    const checkDuplicateTimesheet = async (empId, periodKey) => {
        try {
            const allTsSnap = await firebaseDB.child(`EmployeeBioData/${empId}/timesheets`).get();
            if (allTsSnap.exists()) {
                const all = allTsSnap.val() || {};
                for (const [tsId, header] of Object.entries(all)) {
                    if (header?.periodKey === periodKey && header?.status !== 'draft') {
                        return { exists: true, timesheet: { ...header, id: tsId } };
                    }
                }
            }
            return { exists: false };
        } catch (error) {
            console.error('Error checking duplicate timesheet:', error);
            return { exists: false };
        }
    };

    // Update handleAddTimesheet function
    const handleAddTimesheet = async () => {
        if (!selectedEmployee) {
            showModal('Error', 'Please select an employee first.', 'error');
            return;
        }

        setEntryModalMode('autofill');
        setShowEntryModal(true);
    };

    // Add helper function to check existing entries
    const checkExistingEntries = async (empId, periodKey) => {
        try {
            const allEntriesSnap = await firebaseDB.child(`EmployeeBioData/${empId}/timesheets`).get();
            if (allEntriesSnap.exists()) {
                const all = allEntriesSnap.val() || {};
                for (const [tsId, header] of Object.entries(all)) {
                    if (header?.periodKey === periodKey) {
                        const entriesSnap = await firebaseDB.child(`${empTsById(empId, tsId)}/dailyEntries`).get();
                        if (entriesSnap.exists() && Object.keys(entriesSnap.val()).length > 0) {
                            return { exists: true, timesheet: header };
                        }
                    }
                }
            }
            return { exists: false };
        } catch (error) {
            console.error('Error checking existing entries:', error);
            return { exists: false };
        }
    };

    // Update auto-fill to check timesheet status
    const openAutoFillModal = () => {
        if (timesheet?.status === 'submitted' || timesheet?.status === 'approved') {
            showModal('Auto-fill Restricted',
                `Cannot auto-fill a ${timesheet.status} timesheet. Only draft timesheets can be modified.`,
                'warning'
            );
            return;
        }

        setEntryModalMode('autofill');
        setIsEditing(false);
        setCurrentEntry(null);
        setShowEntryModal(true);
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
        const status = entryData?.status || 'present';

        // Only "present" status gets salary
        if (status === 'present') {
            if (entryData?.isHalfDay) {
                return rate / 2; // Half day = daily salary / 2
            }
            return rate;
        }

        // Leave, absent, holiday = 0 salary
        return 0;
    };

    // Add save timesheet function
    const saveTimesheet = async () => {
        if (!selectedEmployee || !currentTimesheetId) {
            showModal('Error', 'Please select an employee and ensure timesheet is loaded.', 'error');
            return;
        }

        setIsSaving(true);
        try {
            const periodKey = getCurrentPeriodKey();
            const periodStr = useDateRange ? `${startDate} to ${endDate}` : selectedMonth;

            // header first
            const headerPatch = await ensureTimesheetHeader(
                selectedEmployee,
                currentTimesheetId,
                pruneUndefined({
                    period: periodStr,
                    periodKey,
                    status: 'draft',
                    updatedAt: new Date().toISOString(),
                    updatedBy: currentUser?.uid || 'admin',
                    updatedByName: currentUser?.displayName || 'Admin'
                })
            );


            // batch all entries
            const updates = {};
            for (const entry of dailyEntries) {
                const path = `${empTsById(selectedEmployee, currentTimesheetId)}/dailyEntries/${entry.date}`;
                updates[path] = {
                    ...entry,
                    timesheetId: currentTimesheetId,
                    employeeId: selectedEmployee,
                    updatedAt: new Date().toISOString(),
                    updatedBy: currentUser?.uid || 'admin',
                    updatedByName: currentUser?.displayName || 'Admin'
                };
                // optional: global index
                // updates[`TimesheetEntries/${selectedEmployee}_${entry.date}`] = {
                //   timesheetId: currentTimesheetId, employeeId: selectedEmployee, employeeId_date: `${selectedEmployee}_${entry.date}`, date: entry.date
                // };
            }
            await firebaseDB.update(updates);

            await calculateSummary(); // once
            await loadPreviousTimesheets();
            setHasUnsavedChanges(false);
            showModal('Success', 'Timesheet Saved Successfully', 'success');
        } catch (error) {
            console.error('Error saving timesheet:', error);
            showModal('Error', 'Error saving timesheet. Please try again.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Save/Upsert one daily entry under the employee’s timesheet
    const saveEntry = async (entry) => {
        if (!selectedEmployee || !currentTimesheetId) return;
        if (!entry?.date) return;

        const empId = selectedEmployee;
        const tsId = currentTimesheetId;
        const now = new Date().toISOString();

        // Derive period from the current search selection
        const periodKey = getCurrentPeriodKey();
        const periodStr = useDateRange ? `${startDate} to ${endDate}` : selectedMonth;

        await ensureTimesheetHeader(empId, tsId, {
            period: entry.period || periodStr || '',
            periodKey: entry.periodKey || periodKey || tsId,
            status: timesheet?.status || 'draft',
        });

        // Normalize entry data
        // Normalize entry data before computing/saving
        const employee = employees.find(e => e.id === empId);

        const normalized = {
            status: (entry.status || 'present').toLowerCase(),
            isHalfDay: !!entry.isHalfDay,
            isPublicHoliday: !!entry.isPublicHoliday,
            isEmergency: !!entry.isEmergency,
            // accept any incoming key and persist as emergencyAmount
            emergencyAmount: getEmergencyAmount(entry),
            manualDailyEnabled: !!entry.manualDailyEnabled,
            manualDailyAmount: entry.manualDailyAmount ?? null,
            editedBasicSalary: entry.editedBasicSalary ?? null,
        };

        // Use the enhanced salary calculation (with normalized emergencyAmount)
        const toPay = salaryForEntry(employee, normalized);


        // Write a single node per date under the timesheet
        await firebaseDB.child(entryNodeByDate(empId, tsId, entry.date)).set({
            timesheetId: tsId,
            employeeId: empId,
            date: entry.date,
            clientId: entry.clientId || 'DEFAULT',
            clientName: entry.clientName || 'Client',
            jobRole: entry.jobRole || employee?.primarySkill || 'Worker',
            notes: entry.notes || '',
            ...normalized,
            dailySalary: toPay,

            // audit
            updatedBy: currentUser?.uid || 'admin',
            updatedByName: currentUser?.displayName || 'Admin',
            updatedAt: now,

            // create audit if not present already (first set)
            createdBy: entry.createdBy || currentUser?.uid || 'admin',
            createdByName: entry.createdByName || currentUser?.displayName || 'Admin',
            createdAt: entry.createdAt || now,
        });

        return toPay; // Return the calculated salary
    };
    // PATCH: ensure the target timesheet exists and has core metadata
    const ensureTimesheet = async (empId, tsId, periodLabel, startDate, endDate) => {
        const ref = firebaseDB.child(empTsNode(empId, tsId));
        const snap = await ref.once('value');
        if (!snap.exists()) {
            const emp = employees.find(e => e.id === empId);
            const fullName = `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim() || emp?.displayName || 'Employee';

            const base = {
                timesheetId: tsId,
                employeeId: empId,
                employeeName: fullName,              // fixes “Unknown Employee”
                period: periodLabel,                 // e.g., "2025-09-01 to 2025-09-30" or "2025-10"
                startDate,                           // optional, for range mode
                endDate,                             // optional
                status: 'draft',
                workingDays: 0,
                fullDays: 0,
                halfDays: 0,
                absents: 0,
                holidays: 0,
                leaves: 0,
                emergencies: 0,
                advances: 0,
                totalDays: 0,
                totalSalary: 0,
                netPayable: 0,
                createdAt: new Date().toISOString(),
                createdBy: currentUser?.uid,
                createdByName: currentUser?.displayName || authContext?.user?.name || 'System',
                updatedAt: new Date().toISOString(),
            };

            await ref.set(base);
            setTimesheet({ id: tsId, ...base });
        } else {
            const data = snap.val();
            setTimesheet({ id: tsId, ...data });
        }
    };


    const confirmDeleteEntry = (entry) => {
        // pass the whole entry or at least { date }
        setEntryToDelete(entry);
        setShowDeleteModal(true);
    };

    // One confirm handler for both cases
    const confirmDelete = async () => {
        if (entryToDelete?.date) {
            await deleteEntry();              // single-row delete
        } else {
            await deleteSelectedEntries();    // bulk delete
        }
    };


    // single delete
    const deleteEntry = async () => {
        try {
            if (!entryToDelete?.date || !currentTimesheetId || !selectedEmployee) return;

            // ✅ Optimistic UI update – keep table skeleton visible
            setDailyEntries(prev => prev.filter(e => e.date !== entryToDelete.date));
            setShowDeleteModal(false);
            setEntryToDelete(null);

            await firebaseDB
                .child(empEntryById(selectedEmployee, currentTimesheetId, entryToDelete.date))
                .remove();

            // Refresh counts, previous list
            await calculateSummary();
            await loadPreviousTimesheets();
        } catch (e) {
            console.error(e);
            showModal('Error', 'Delete failed. Please try again.', 'error');
        }
    };

    // bulk delete
    // ✅ Delete selected daily entries safely (no table flicker, no ESLint errors)
    const deleteSelectedEntries = async () => {
        if (!selectedEntries?.length || !currentTimesheetId || !selectedEmployee) {
            showModal('Error', 'No entries selected or missing required data.', 'error');
            return;
        }

        try {
            // 1️⃣ Resolve selected entries into a Set of unique dates
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            const selectedDates = new Set(); // ✅ Declare here!

            for (const key of selectedEntries) {
                const k = String(key);
                if (dateRegex.test(k)) {
                    selectedDates.add(k);
                } else {
                    // Try to extract YYYY-MM-DD from end of string like emp_2025-10-31
                    const tail10 = k.slice(-10);
                    if (dateRegex.test(tail10)) selectedDates.add(tail10);
                }
            }

            if (!selectedDates.size) {
                showModal('Warning', 'Could not determine valid dates to delete.', 'warning');
                return;
            }

            // 2️⃣ Optimistic UI update — keeps table visible
            setDailyEntries((prev) => prev.filter((e) => !selectedDates.has(e.date)));

            // 3️⃣ Prepare multi-path delete in Firebase
            const updates = {};
            for (const d of selectedDates) {
                updates[
                    `EmployeeBioData/${selectedEmployee}/timesheets/${currentTimesheetId}/dailyEntries/${d}`
                ] = null;
            }

            await firebaseDB.update(updates);

            // 4️⃣ Reset selections and refresh totals
            setSelectedEntries([]);
            await calculateSummary();
            await loadPreviousTimesheets();

            showModal(
                'Success',
                `${selectedDates.size} entr${selectedDates.size === 1 ? 'y' : 'ies'} deleted successfully.`,
                'success'
            );
        } catch (err) {
            console.error('Error deleting selected entries:', err);
            showModal('Error', 'Failed to delete selected entries. Please try again.', 'error');
        }

        setShowDeleteModal()
    };



    const handleSaveEntry = async (entryData) => {
        try {
            const emp = employees.find(e => e.id === selectedEmployee);
            if (!emp) return showModal('Error', 'Select employee first.', 'error');

            if (!entryData.date && entryModalMode === 'single') {
                return showModal('Error', 'Date is required for single entry.', 'error');
            }

            // 🚫 Block duplicates across other timesheets (not just current one)
            if (!isEditing) {
                const crossHit = await dateExistsInOtherTimesheets(selectedEmployee, dateStr, tsId);
                if (crossHit) {
                    setDuplicateEntries([{
                        ...crossHit.entry,
                        date: dateStr,
                        timesheetId: crossHit.tsId
                    }]);
                    setShowDuplicateWarning(true);
                    return;
                }
            }


            const periodKey = getCurrentPeriodKey();
            const tsId = currentTimesheetId || await buildTimesheetId(emp, periodKey);
            const dateStr = entryData.date;

            // 🚫 Block duplicates in the CURRENT timesheet (run AFTER tsId/dateStr exist)
            if (!isEditing) {
                const existsSnap = await firebaseDB
                    .child(empEntryById(selectedEmployee, tsId, dateStr))
                    .get();
                if (existsSnap.exists()) {
                    showModal('Duplicate Entry', `An entry for ${dateStr} already exists in this timesheet.`, 'warning');
                    return;
                }
            }

            // start from current list
            let updatedEntries = [...dailyEntries];

            // normalize once
            const normalizedForCalc = {
                status: entryData.status || 'present',
                isHalfDay: !!entryData.isHalfDay,
                isPublicHoliday: !!entryData.isPublicHoliday,
                isEmergency: !!entryData.isEmergency,
                manualDailyEnabled: !!entryData.manualDailyEnabled,
                manualDailyAmount: entryData.manualDailyAmount ?? null,
                editedBasicSalary: entryData.editedBasicSalary ?? null,
                emergencyAmount: getEmergencyAmount(entryData),
            };

            const computedSalary = salaryForEntry(emp, normalizedForCalc);

            const idx = updatedEntries.findIndex(e => e.date === dateStr);
            if (idx >= 0) {
                updatedEntries[idx] = {
                    ...updatedEntries[idx],
                    ...entryData,
                    ...normalizedForCalc,
                    dailySalary: computedSalary,
                    updatedAt: new Date().toISOString(),
                    updatedBy: currentUser?.uid,
                    updatedByName: currentUser?.displayName,
                };
            } else {
                updatedEntries.push({
                    ...entryData,
                    ...normalizedForCalc,
                    date: dateStr,
                    periodKey,
                    timesheetId: tsId,
                    employeeId: selectedEmployee,
                    employeeName: `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim(),
                    employeeId_date: `${selectedEmployee}_${dateStr}`,
                    dailySalary: computedSalary,
                    createdBy: currentUser?.uid || 'admin',
                    createdByName: currentUser?.displayName || 'Admin',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            }

            updatedEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
            setDailyEntries(updatedEntries);
            calculateSummary(updatedEntries, advances);

            // persist exactly this date row
            const toPersist = updatedEntries.find(e => e.date === dateStr);
            await saveEntry(toPersist);

            showModal('Success', 'Entry saved successfully!', 'success');
        } catch (err) {
            console.error('handleSaveEntry error:', err);
            showModal('Error', 'Save failed. Please try again.', 'error');
        } finally {
            setShowEntryModal(false);
            setIsEditing(false);
            setCurrentEntry(null);
            setEntryModalMode('single');
        }
    };

    // Toggle one row
    // Toggle one row
    const handleSelectEntry = (entryOrKey) => {
        const key = typeof entryOrKey === 'string'
            ? entryOrKey
            : String(entryOrKey?.id || entryOrKey?.date);  // fallback to the same logic as getRowKey

        setSelectedEntries(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };


    // Select / Deselect all visible rows
    const handleSelectAllEntries = () => {
        const allKeys = (dailyEntries || []).map(getRowKey);
        const allSelected = selectedEntries.length === allKeys.length && allKeys.length > 0;
        setSelectedEntries(allSelected ? [] : allKeys);
    };


    // PATCH: add or update one entry under dailyEntries
    const saveDailyEntry = async (empId, tsId, entry) => {
        const id = entry.id || entry.date || firebaseDB.push().key; // stable key
        await firebaseDB.child(`${empTsEntriesNode(empId, tsId)}/${id}`).set({ id, ...entry });

        // refresh table
        const es = await firebaseDB.child(empTsEntriesNode(empId, tsId)).once('value');
        const list = es.exists() ? Object.values(es.val()) : [];
        list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        setDailyEntries(list);
    };

    // PATCH: delete entry
    const deleteDailyEntry = async (empId, tsId, entryId) => {
        await firebaseDB.child(`${empTsEntriesNode(empId, tsId)}/${entryId}`).remove();
        // refresh table + previous list counts if you display them
        const es = await firebaseDB.child(empTsEntriesNode(empId, tsId)).once('value');
        const list = es.exists() ? Object.values(es.val()) : [];
        list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        setDailyEntries(list);
        await loadPreviousTimesheets(); // so the summary row reflects totals
    };






    const submitTimesheet = async () => {
        if (!dailyEntries?.length) {
            showModal('Error', 'Cannot submit an empty timesheet. Please add entries first.', 'error');
            return;
        }

        const alreadyAssigned = !!(timesheet?.assignedTo);
        const chosenAssignee = assignTo || timesheet?.assignedTo || '';

        if (!alreadyAssigned && !chosenAssignee) {
            setPendingSubmitAfterAssign(true);   // 👈 remember we want to submit after assign
            setShowAssignModal(true);            // show the old assign modal first
            return;
        }

        setShowConfirmModal(true);             // already assigned → go straight to submit modal
    };

    const confirmAssignAndProceed = async () => {
        const assignee = assignTo || '';
        if (!assignee) {
            showModal('Select Assignee', 'Please choose a user to assign.', 'warning');
            return;
        }
        if (!selectedEmployee || !timesheet?.timesheetId) {
            showModal('Error', 'Timesheet context missing.', 'error');
            return;
        }
        try {
            const patch = pruneUndefined({
                assignedTo: assignee,
                assignedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser?.uid || 'admin',
                updatedByName: currentUser?.displayName || 'Admin',
            });

            await firebaseDB.child(empTsById(selectedEmployee, timesheet.timesheetId)).update(patch);

            setTimesheet(prev => ({ ...(prev || {}), ...patch }));
            setShowAssignModal(false);

            // 👇 Open Submit modal automatically if this assign came from a submit attempt
            if (pendingSubmitAfterAssign) {
                setTimeout(() => setShowConfirmModal(true), 0); // ensure clean re-render
                setPendingSubmitAfterAssign(false);
            }
        } catch (e) {
            console.error('Error assigning timesheet:', e);
            showModal('Error', 'Failed to assign. Please try again.', 'error');
        }
    };



    const confirmSubmit = async () => {
        await calculateSummary();
        await loadAdvances();
        if (!selectedEmployee || !timesheet?.timesheetId) {
            showModal('Error', 'Timesheet context missing.', 'error');
            return;
        }
        if (!timesheet?.assignedTo) {
            // Safety guard; should be set by the Assign step
            showModal('Select Assignee', 'Please assign this timesheet before submitting.', 'warning');
            setShowConfirmModal(false);
            setShowAssignModal(true);
            return;
        }
        try {
            const finalHeader = pruneUndefined({
                ...timesheet,
                status: 'submitted',
                submittedBy: currentUser?.uid || 'admin',
                submittedByName: currentUser?.displayName || currentUser?.email || 'System User',
                submittedAt: new Date().toISOString(),
                submissionComment: submitComment || '',
                updatedAt: new Date().toISOString(),
            });

            await firebaseDB.child(empTsById(selectedEmployee, timesheet.timesheetId)).update(finalHeader);
            await settleAdvancesForActivePeriod(selectedEmployee, timesheet.timesheetId);

            setShowConfirmModal(false);
            showModal('Success', 'Timesheet submitted successfully!', 'success');

            await loadPreviousTimesheets();
            setDailyEntries([]);
            setTimesheet(null);
            setCurrentTimesheetId('');
        } catch (e) {
            console.error('Error submitting timesheet:', e);
            showModal('Error', 'Error submitting timesheet. Please try again.', 'error');
        }
    };


    const assignTimesheet = async () => {
        // FIXED: Use timesheetId instead of timesheet?.id
        if (!timesheet?.timesheetId || !selectedEmployee || !assignTo) {
            showModal('Error', 'Please select a user to assign.', 'error');
            return;
        }

        try {
            const assignedUser = allUsers.find(u => u.uid === assignTo);
            if (!assignedUser) {
                showModal('Error', 'Selected user not found. Please try again.', 'error');
                return;
            }

            const patch = {
                assignedTo: assignTo,
                assignedToName: assignedUser.displayName || assignedUser.email || 'Unknown User',
                assignedToRole: assignedUser.role || 'user',
                assignedBy: currentUser?.uid,
                assignedByName: currentUser?.displayName || currentUser?.email || 'System',
                assignedAt: new Date().toISOString(),
                status: 'assigned',
                updatedAt: new Date().toISOString(),
            };

            // FIXED: Use timesheetId in the path
            await firebaseDB.child(empTsNode(selectedEmployee, timesheet.timesheetId)).update(patch);
            setTimesheet(prev => ({ ...(prev || {}), ...patch }));
            setShowAssignModal(false);
            setAssignTo('');

            showModal('Success', `Timesheet assigned to ${assignedUser.displayName || assignedUser.email}`, 'success');
            await loadPreviousTimesheets();
        } catch (error) {
            console.error('Error assigning timesheet:', error);
            showModal('Error', 'Failed to assign timesheet. Please try again.', 'error');
        }
    };
    // Add this state
    const [showEditProtectedModal, setShowEditProtectedModal] = useState(false);

    const checkEditPermission = (timesheetStatus, action = 'edit') => {
        const userRole = authContext.user?.role || 'user';

        if (timesheetStatus === 'submitted' || timesheetStatus === 'approved') {
            if (userRole !== 'admin') {
                showModal('Edit Restricted',
                    `This timesheet has been ${timesheetStatus} and cannot be ${action}ed. Only administrators can modify ${timesheetStatus} timesheets.`,
                    'warning'
                );
                return false;
            }
        }
        return true;
    };

    // Enhanced save with audit trail
    const saveEntryWithAudit = async (entryData, isNew = false) => {
        const auditTrail = {
            updatedBy: currentUser?.uid,
            updatedByName: currentUser?.displayName || 'System',
            updatedAt: new Date().toISOString(),
            updateReason: isNew ? 'created' : 'modified'
        };

        if (isNew) {
            auditTrail.createdBy = currentUser?.uid;
            auditTrail.createdByName = currentUser?.displayName || 'System';
            auditTrail.createdAt = new Date().toISOString();
        }

        return {
            ...entryData,
            ...auditTrail,
            auditHistory: [
                ...(entryData.auditHistory || []),
                {
                    action: isNew ? 'created' : 'updated',
                    by: currentUser?.uid,
                    byName: currentUser?.displayName || 'System',
                    at: new Date().toISOString(),
                    changes: Object.keys(entryData).filter(key =>
                        !['auditHistory', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'].includes(key)
                    )
                }
            ]
        };
    };

    // Calculate total salary for the table footer
    const totalSalary = dailyEntries.reduce((sum, entry) => sum + (entry.dailySalary || 0), 0);

    return (
        <div className="container-fluid py-4">
            {/* Employee Search and Period Selection in Gray Card */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="row g-3 align-items-end">
                        <div className="col-md-4 m-auto">
                            <label className="form-label text-warning mb-1">
                                <strong><i className="fas fa-search me-2"></i>Search Employee</strong>
                            </label>
                            <WorkerSearch
                                employees={employees}
                                onSelectEmployee={setSelectedEmployee}
                                selectedEmployee={selectedEmployee}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Previous Timesheets Table */}
            {loadingPrevious ? (
                <div className="row mb-4">
                    <div className="col-12">
                        <div className="card bg-dark border-secondary text-center">
                            <div className="card-body py-4">
                                <div className="spinner-border text-info mb-3" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                                <h5 className="text-white">Loading Timesheets...</h5>
                            </div>
                        </div>
                    </div>
                </div>
            ) : previousTimesheets.length > 0 ? (
                <div className="row mb-4">
                    <div className="col-12">
                        <div className="card bg-dark border-secondary">
                            <div className="card-header bg-info bg-opacity-25 border-secondary">
                                <h5 className="card-title mb-0 text-white">
                                    <i className="bi bi-clock-history me-2"></i>
                                    Previous Timesheets for {employees.find(e => e.id === selectedEmployee)?.firstName} ({previousTimesheets.length})
                                </h5>
                            </div>
                            <div className="card-body p-0">
                                <div className="table-responsive">
                                    <table className="table table-dark table-striped mb-0">
                                        <thead>
                                            <tr>
                                                <th>Timesheet ID</th>
                                                <th>Period</th>
                                                <th>Status</th>
                                                <th>Submitted By</th>
                                                <th>Submitted At</th>
                                                <th>Assigned To</th>
                                                <th>Assigned By</th>
                                                <th>Assigned At</th>
                                                <th>Working Days</th>
                                                <th>Total Salary</th>
                                                <th>Net Salary</th>
                                                <th style={{ width: 120 }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previousTimesheets.map((ts) => (
                                                <tr key={ts.timesheetId || ts.id}>
                                                    <td className="text-info fw-bold">
                                                        {ts.timesheetId || ts.id}
                                                    </td>
                                                    <td>{ts.period || ts.periodKey}</td>
                                                    <td>
                                                        <span className={
                                                            `badge ${ts.status === 'approved' ? 'bg-success' :
                                                                ts.status === 'assigned' ? 'bg-primary' :
                                                                    ts.status === 'submitted' ? 'bg-warning' : 'bg-secondary'
                                                            }`}
                                                        >
                                                            {ts.status || 'draft'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <small>{authUser.name || 'Not Submitted'}</small>
                                                    </td>
                                                    <td>
                                                        <small className="text-muted opacity-75">
                                                            {ts.submittedAt ? new Date(ts.submittedAt).toLocaleString('en-IN') : '-'}
                                                        </small>
                                                    </td>
                                                    <td>
                                                        <small>{ts.assignedToName || 'Not Assigned'}</small>
                                                    </td>
                                                    <td>
                                                        <small>{authUser.name || 'Not Assigned'}</small>
                                                    </td>
                                                    <td>
                                                        <small className="text-muted opacity-75">
                                                            {ts.assignedAt ? new Date(ts.assignedAt).toLocaleString('en-IN') : '-'}
                                                        </small>
                                                    </td>
                                                    <td>{ts.workingDays ?? 0}</td>
                                                    <td>₹{Number(ts.totalSalary || 0).toFixed(0)}</td>
                                                    <td className='text-warning'>₹{Number(ts.netPayable || 0).toFixed(0)}</td>
                                                    <td>
                                                        <div className="btn-group btn-group-sm">
                                                            <button
                                                                className="btn btn-outline-info"
                                                                title="Open this timesheet"
                                                                onClick={async () => {
                                                                    setSelectedEmployee(ts.employeeId);
                                                                    setTimesheet(ts);
                                                                    setCurrentTimesheetId(ts.timesheetId || ts.id);

                                                                    // also mirror the UI period selection so filters match this sheet
                                                                    if ((ts.periodKey || '').includes('_to_')) {
                                                                        const [s, e] = (ts.periodKey || '').split('_to_');
                                                                        setUseDateRange(true); setStartDate(s); setEndDate(e);
                                                                    } else {
                                                                        setUseDateRange(false);
                                                                        setSelectedMonth(ts.periodKey || (ts.period ?? '').slice(0, 7));
                                                                    }

                                                                    await loadDailyEntriesByTimesheetId(ts.employeeId, ts.timesheetId || ts.id);
                                                                }}

                                                            >
                                                                <i className="bi bi-folder2-open"></i>
                                                            </button>
                                                            <button
                                                                className="btn btn-outline-primary"
                                                                title="Jump to period"
                                                                onClick={() => {
                                                                    if ((ts.periodKey || '').includes('_to_')) {
                                                                        const [s, e] = (ts.periodKey || '').split('_to_');
                                                                        setUseDateRange(true);
                                                                        setStartDate(s);
                                                                        setEndDate(e);
                                                                    } else {
                                                                        setUseDateRange(false);
                                                                        setSelectedMonth(ts.periodKey || (ts.period ?? '').slice(0, 7));
                                                                    }
                                                                }}
                                                            >
                                                                <i className="bi bi-calendar-range"></i>
                                                            </button>
                                                        </div>
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
            ) : selectedEmployee ? (
                <div className="row mb-4">
                    <div className="col-12">
                        <div className="card bg-dark border-secondary text-center">
                            <div className="card-body py-4">
                                <i className="bi bi-inbox display-4 text-muted mb-3"></i>
                                <h5 className="text-white opacity-50">No Previous Timesheets Found</h5>
                                <p className="text-muted mb-3">
                                    No timesheets found for this employee. Create a new timesheet to get started.
                                </p>
                                <button
                                    className="btn btn-outline-info"
                                    onClick={handleAddTimesheet}
                                >
                                    <i className="bi bi-plus-lg me-2"></i>
                                    Create First Timesheet
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

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
                                <p className="text-muted mb-4 opacity-75">
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

            {selectedEmployee && (
                <>
                    {/* Show summary only when timesheet exists */}
                    {timesheet && (
                        <TimesheetSummary
                            timesheet={timesheet}
                            advances={advances}
                            employee={employees.find(emp => emp.id === selectedEmployee)}
                            currentUser={currentUser}
                        />
                    )}
                    {/* Always show action buttons when employee is selected */}
                    <div className="row mb-3">
                        <div className="col-12">
                            <button
                                className="btn btn-outline-primary me-2"
                                onClick={saveTimesheet}
                                disabled={!timesheet || dailyEntries.length === 0 || isSaving || !hasUnsavedChanges}
                            >
                                {isSaving ? (
                                    <>
                                        <div className="spinner-border spinner-border-sm me-2" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-save me-2"></i> Save
                                    </>
                                )}
                            </button>

                            <button
                                className="btn btn-outline-warning me-2"
                                onClick={openAutoFillModal}
                                disabled={!timesheet}
                            >
                                <i className="bi bi-magic me-2"></i> Auto-Fill
                            </button>

                            {/* Add Create Timesheet button that's always visible */}
                            <button
                                className="btn btn-outline-info me-2"
                                onClick={handleAddTimesheet}
                                disabled={!selectedEmployee}
                            >
                                <i className="bi bi-plus-lg me-2"></i>
                                {timesheet ? 'Create New' : 'Create Timesheet'}
                            </button>

                            {timesheet && (
                                <>
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
                                                className="btn btn-outline-secondary me-2"
                                                onClick={() => setSelectedEntries([])}
                                            >
                                                <i className="fas fa-times me-2"></i>
                                                Clear Selection
                                            </button>
                                        </>
                                    )}


                                    <button
                                        className="btn btn-outline-danger"
                                        onClick={() => {
                                            setDailyEntries([]);
                                            if (timesheet) {
                                                const resetTimesheet = {
                                                    ...timesheet,
                                                    status: 'draft',
                                                    workingDays: 0,
                                                    fullDays: 0,
                                                    halfDays: 0,
                                                    leaves: 0,
                                                    holidays: 0,
                                                    emergencies: 0,
                                                    absents: 0,
                                                    totalDays: 0,
                                                    totalSalary: 0,
                                                    advances: 0,
                                                    netPayable: 0,
                                                    updatedAt: new Date().toISOString()
                                                };
                                                setTimesheet(resetTimesheet);
                                            }
                                            setHasUnsavedChanges(false);
                                            showModal('Cleared', 'Daily entries cleared. Timesheet reset to draft status.', 'info');
                                        }}
                                    >
                                        <i className="bi bi-x-circle me-2"></i> Clear Entries
                                    </button>

                                    <button
                                        className="btn btn-success ms-2"
                                        onClick={submitTimesheet}
                                        disabled={timesheet?.status === 'submitted' || showSubmittedError || dailyEntries.length === 0}
                                    >
                                        {timesheet?.status === 'submitted' ? (
                                            <>
                                                <i className="fas fa-check me-2"></i>
                                                Submitted
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-paper-plane me-2"></i>
                                                Submit
                                            </>
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>



                    {/* Daily Entries and Advances - show even when no timesheet but allow creation */}
                    <div className="row">
                        <div className="col-lg-8">
                            <DailyEntriesTable
                                entries={dailyEntries}
                                timesheetId={timesheet?.timesheetId}
                                onEdit={(entry) => {
                                    if (!timesheet) {
                                        showModal('Info', 'Please create a timesheet first.', 'info');
                                        return;
                                    }
                                    setCurrentEntry(entry);
                                    setIsEditing(true);
                                    setShowEntryModal(true);
                                }}
                                onDelete={confirmDeleteEntry}
                                totalSalary={totalSalary}
                                isDisabled={!timesheet || showSubmittedError}
                                selectedEntries={selectedEntries}
                                onSelectEntry={handleSelectEntry}
                                onSelectAllEntries={handleSelectAllEntries}
                            />
                        </div>
                        <div className="col-lg-4">
                            <AdvanceManagement
                                employeeId={selectedEmployee}
                                timesheetId={timesheet?.id || ''}
                                advances={advances}
                                onAdvanceAdded={loadAdvances}
                                currentUser={currentUser}
                                isDisabled={!timesheet || showSubmittedError}
                            />
                        </div>
                    </div>
                </>
            )}
            {/* Entry Modal */}
            {showEntryModal && (
                <DailyEntryModal
                    mode={entryModalMode}
                    entry={currentEntry}
                    isEditing={isEditing && entryModalMode === 'single'} // Only true when editing single entry
                    employee={employees.find(e => e.id === selectedEmployee)}
                    onSave={handleSaveEntry}
                    onAutoFill={handleAutoFill}
                    onClose={() => {
                        setShowEntryModal(false);
                        setIsEditing(false);
                        setCurrentEntry(null);
                        setEntryModalMode('single'); // Reset to default
                    }}
                    timesheetId={timesheet?.timesheetId}
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
            {/* Submit Confirmation Modal */}
            {showConfirmModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content bg-dark border border-secondary">
                            <div className="modal-header border-secondary">
                                <h5 className="modal-title text-white">
                                    <i className="bi bi-send-check me-2"></i>
                                    Submit Timesheet
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    onClick={() => setShowConfirmModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <p className="text-white">
                                    Are you sure you want to submit this timesheet? Once submitted, it cannot be edited.
                                </p>
                                <div className="bg-dark border border-secondary rounded p-3">
                                    <h6 className="text-info mb-3">
                                        <i className="fas fa-check-circle me-2"></i>
                                        Ready to Submit
                                    </h6>

                                    <div className="list-group list-group-flush bg-transparent">
                                        <div className="list-group-item bg-transparent border-secondary d-flex justify-content-between align-items-center px-0">
                                            <span className="text-muted">Submitted By</span>
                                            <span className="text-white">{authUser?.name || authUser?.email || 'Current User'}</span>
                                        </div>
                                        <div className="list-group-item bg-transparent border-secondary d-flex justify-content-between align-items-center px-0">
                                            <span className="text-muted">Working Days</span>
                                            <span className="text-success">{timesheet?.workingDays || 0}</span>
                                        </div>
                                        <div className="list-group-item bg-transparent border-secondary d-flex justify-content-between align-items-center px-0">
                                            <span className="text-muted">Total Salary</span>
                                            <span className="text-success">₹{Number(timesheet?.totalSalary || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="list-group-item bg-transparent border-secondary d-flex justify-content-between align-items-center px-0">
                                            <span className="text-muted">Advances</span>
                                            <span className="text-danger">₹{Number(timesheet?.advances || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="list-group-item bg-transparent border-0 d-flex justify-content-between align-items-center px-0 pt-3">
                                            <strong className="text-warning">Net Payable</strong>
                                            <strong className="text-warning fs-5">₹{Math.round(timesheet?.netPayable || 0)}</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer border-secondary">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowConfirmModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-success"
                                    onClick={confirmSubmit}
                                >
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
                                <button type="button" className="btn btn-danger" onClick={confirmDelete}>
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
                                <div className="alert alert-warning bg-danger bg-opacity-10 border-danger">
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
                                <div className="alert alert-primary bg-primary bg-opacity-10 border-primary tex-info">
                                    <p className='text-info mb-0'> <strong>Timesheet submitted successfully!</strong></p>
                                </div>

                                <label className="form-label text-white">Assign To (search name or email)</label>
                                <div className="position-relative mb-2">
                                    <input
                                        type="text"
                                        className="form-control bg-dark text-white border-secondary"
                                        placeholder="Search user..."
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                        onFocus={() => setUserSearch(userSearch)}
                                    />
                                    <div className="mt-2 p-2 bg-dark border border-secondary rounded" style={{ maxHeight: 220, overflowY: 'auto' }}>
                                        {filteredUsers.map(u => (
                                            <div
                                                key={u.uid}
                                                className={`p-2 rounded ${assignTo === u.uid ? 'bg-primary' : 'hover-bg-gray-700'}`}
                                                onClick={() => {
                                                    setAssignTo(u.uid);
                                                    setUserSearch(u.displayName || u.email); // Show selected user in search box
                                                }}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <div className="fw-bold text-white">{u.displayName}</div>
                                                <div className="text-info small">Role: {u.role || 'user'}</div>
                                                <div className="text-muted small">{u.email}</div>
                                            </div>
                                        ))}
                                        {filteredUsers.length === 0 && <div className="text-muted">No users found</div>}
                                    </div>
                                </div>

                                {/* Show selected user info */}
                                {assignTo && (
                                    <div className="alert alert-success bg-success bg-opacity-10 border-success mt-2">
                                        <small className='text-white opacity-75'>
                                            <strong>Selected:</strong> {filteredUsers.find(u => u.uid === assignTo)?.displayName || filteredUsers.find(u => u.uid === assignTo)?.email}
                                        </small>
                                    </div>
                                )}

                                <div className="alert alert-info bg-info bg-opacity-10 border-info">
                                    <small className='text-white opacity-50'>
                                        <strong>Submitted by:</strong> {authUser?.name || authUser?.email || 'Current User'}
                                        <br />
                                        <strong>Timestamp:</strong> {new Date().toLocaleString('en-IN')}
                                    </small>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowAssignModal(false);
                                        setAssignTo('');
                                        setUserSearch('');
                                    }}
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
                                    {assignTo ? `Assign to ${filteredUsers.find(u => u.uid === assignTo)?.displayName || filteredUsers.find(u => u.uid === assignTo)?.email}` : 'Assign'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {false && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.85)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content bg-dark border border-info">
                            <div className="modal-header border-info">
                                <h5 className="modal-title text-info">
                                    <i className="bi bi-magic me-2"></i> Auto-Fill Period
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
                                            const emp = employees.find(e => e.id === selectedEmployee);

                                            // Get current period information
                                            const currentPeriod = useDateRange ? `${startDate} to ${endDate}` : selectedMonth;
                                            const periodKey = getCurrentPeriodKey();

                                            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                                                const dateStr = d.toISOString().slice(0, 10);
                                                if (dailyEntries.some(e => e.date === dateStr)) continue;
                                                await loadDailyEntriesByTimesheetId(selectedEmployee, currentTimesheetId);

                                                await saveEntry({
                                                    date: dateStr,
                                                    clientId: client?.clientId || client?.id || 'DEFAULT', // ✅ Use defined 'client' variable
                                                    clientName: client?.name || 'Client', // ✅ Use defined 'client' variable
                                                    jobRole: emp?.primarySkill || 'Worker',
                                                    status: 'present',
                                                    isHalfDay: false,
                                                    isPublicHoliday: false,
                                                    isEmergency: false,
                                                    notes: 'Auto-filled',
                                                    period: currentPeriod, // ✅ Use computed currentPeriod
                                                    periodKey: periodKey // ✅ Use computed periodKey
                                                });
                                            }


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

            {showCustomModal && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className={`modal-content bg-dark border ${modalConfig.type === 'error' ? 'border-danger' :
                            modalConfig.type === 'warning' ? 'border-warning' :
                                modalConfig.type === 'success' ? 'border-success' : 'border-info'
                            }`}>
                            <div className={`modal-header border-${modalConfig.type === 'error' ? 'danger' :
                                modalConfig.type === 'warning' ? 'warning' :
                                    modalConfig.type === 'success' ? 'success' : 'info'
                                }`}>
                                <h5 className={`modal-title text-${modalConfig.type === 'error' ? 'danger' :
                                    modalConfig.type === 'warning' ? 'warning' :
                                        modalConfig.type === 'success' ? 'success' : 'info'
                                    }`}>
                                    <i className={`bi ${modalConfig.type === 'error' ? 'bi-exclamation-triangle' :
                                        modalConfig.type === 'warning' ? 'bi-exclamation-circle' :
                                            modalConfig.type === 'success' ? 'bi-check-circle' : 'bi-info-circle'
                                        } me-2`}></i>
                                    {modalConfig.title}
                                </h5>
                            </div>
                            <div className="modal-body">
                                <div className={`alert text-white alert-${modalConfig.type} bg-${modalConfig.type} bg-opacity-10 border-${modalConfig.type}`}>
                                    {modalConfig.message}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setShowCustomModal(false)}
                                >
                                    {modalConfig.showConfirm ? 'Cancel' : 'Close'}
                                </button>
                                {modalConfig.showConfirm && modalConfig.onConfirm && (
                                    <button
                                        className={`btn btn-${modalConfig.type === 'error' ? 'danger' : modalConfig.type}`}
                                        onClick={() => {
                                            modalConfig.onConfirm();
                                            setShowCustomModal(false);
                                        }}
                                    >
                                        Confirm
                                    </button>
                                )}
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
                        <div className="d-flex align-items-center justify-content-between">
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
                                <h5 className="card-title mb-0 text-info">
                                    Timesheet Summary - {timesheet.employeeName}
                                </h5>
                                <small className="text-light">
                                    {employee?.employeeId || employee?.idNo} • {employee?.primarySkill}
                                </small>
                                <small className="ms-2 text-warning">
                                    Basic Salary:   {employee?.basicSalary}
                                </small>
                            </div>


                        </div>

                        <div className="mb-2 text-center">
                            <small className="text-muted me-3">Timesheet ID:</small>
                            <br></br>
                            <span className="badge bg-warning">{timesheet.timesheetId || timesheet.id}</span>
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



                        {/* Detailed Breakdown - Salary & Attendance */}
                        <div className="row">

                            {/* Attendance Summary */}
                            <div className="col-lg-6 mb-4">
                                <div className="card bg-dark border-info h-100">
                                    <div className="card-header bg-info bg-opacity-10 border-info">
                                        <h6 className="mb-0 text-white">
                                            <i className="fas fa-calendar-check me-2"></i>
                                            Attendance Summary
                                        </h6>
                                    </div>
                                    <div className="card-body">
                                        <div className="row g-3">
                                            <div className="col-md-4 col-6">
                                                <div className="bg-success bg-opacity-10 rounded p-3 border border-success text-center">
                                                    <small className="text-muted d-block">Working Days</small>
                                                    <div className="text-success h4 mb-0">{timesheet.workingDays}</div>
                                                </div>
                                            </div>
                                            <div className="col-md-4 col-6">
                                                <div className="bg-warning bg-opacity-10 rounded p-3 border border-warning text-center">
                                                    <small className="text-muted d-block">Leaves</small>
                                                    <div className="text-warning h4 mb-0">{timesheet.leaves || 0}</div>
                                                </div>
                                            </div>
                                            <div className="col-md-4 col-6">
                                                <div className="bg-primary bg-opacity-10 rounded p-3 border border-primary text-center">
                                                    <small className="text-muted d-block">Holidays</small>
                                                    <div className="text-primary h4 mb-0">{timesheet.holidays || 0}</div>
                                                </div>
                                            </div>
                                            <div className="col-md-4 col-6">
                                                <div className="bg-info bg-opacity-10 rounded p-3 border border-info text-center">
                                                    <small className="text-muted d-block">Emergencies</small>
                                                    <div className="text-info h4 mb-0">{timesheet.emergencies || 0}</div>
                                                </div>
                                            </div>
                                            <div className="col-md-4 col-6">
                                                <div className="bg-danger bg-opacity-10 rounded p-3 border border-danger text-center">
                                                    <small className="text-muted d-block">Absents</small>
                                                    <div className="text-danger h4 mb-0">{timesheet.absents || 0}</div>
                                                </div>
                                            </div>
                                            <div className="col-md-4 col-6">
                                                <div className="bg-secondary bg-opacity-10 rounded p-3 border border-secondary text-center">
                                                    <small className="text-muted d-block">Total Days</small>
                                                    <div className="text-white h4 mb-0">{timesheet.totalDays || 0}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Salary Breakdown */}
                            <div className="col-lg-6 mb-4">
                                <div className="card bg-dark border-success h-100">
                                    <div className="card-header bg-success bg-opacity-10 border-success">
                                        <h6 className="mb-0 text-white">
                                            <i className="fas fa-money-bill-wave me-2"></i>
                                            Salary Breakdown
                                        </h6>
                                    </div>
                                    <div className="card-body">
                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <div className="bg-dark bg-opacity-50 rounded p-3 border border-secondary text-center">
                                                    <small className="text-muted d-block">Basic Salary</small>
                                                    <div className="text-white h5 mb-0">₹{employee?.basicSalary || 0}</div>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="bg-dark bg-opacity-50 rounded p-3 border border-secondary text-center">
                                                    <small className="text-muted d-block">Daily Rate</small>
                                                    <div className="text-white h5 mb-0">₹{Math.round((employee?.basicSalary || 0) / 30)}</div>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="bg-success bg-opacity-10 rounded p-3 border border-success text-center">
                                                    <small className="text-muted d-block">Total Salary</small>
                                                    <div className="text-success h5 mb-0">₹{timesheet.totalSalary?.toFixed(2)}</div>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="bg-danger bg-opacity-10 rounded p-3 border border-danger text-center">
                                                    <small className="text-muted d-block">Advances</small>
                                                    <div className="text-danger h5 mb-0">₹{timesheet.advances}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Net Payable Highlight */}
                                        <div className="mt-4 p-3 bg-dark bg-opacity-25 rounded border border-warning">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <div>
                                                    <span className="text-white h6 mb-0">Net Payable Amount</span>
                                                    <br />
                                                    <small className="text-muted">Total Salary - Advances</small>
                                                </div>
                                                <span className="text-warning h4 mb-0">₹{Math.round(timesheet.netPayable || 0)}</span>
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

    // Add these state variables inside the DailyEntriesTable component
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [currentNote, setCurrentNote] = useState('');

    return (
        <div className="card bg-dark border-secondary">
            <div className="card-header bg-info bg-opacity-25 border-info d-flex justify-content-between align-items-center">
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
                                <th width="50">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={selectedEntries.length === entries.length && entries.length > 0}
                                        onChange={onSelectAllEntries}
                                        disabled={isDisabled}
                                    />


                                </th>
                                <th>Date</th>
                                <th>Client ID</th>
                                <th>Client Name</th>
                                <th>Job Role</th>
                                <th>Status</th>
                                <th>Salary</th>
                                <th>Modified By</th>
                                <th>Comments</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((e) => (
                                <tr key={e._rowKey || `${e.employeeId}_${e.date}`}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            checked={selectedEntries.includes(String(e.id || e.date))}
                                            onChange={() => onSelectEntry(e)}              // ← pass the full entry
                                            disabled={isDisabled}
                                            value={e.date}
                                        />

                                    </td>
                                    <td>
                                        <small className="text-info">
                                            {new Date(e.date).toLocaleDateString('en-IN', {
                                                weekday: 'short',
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </small>
                                    </td>
                                    <td>
                                        <small className="text-warning">{e.clientId}</small>
                                    </td>
                                    <td>{e.clientName}</td>
                                    <td>
                                        <small className="text-muted">{e.jobRole}</small>
                                    </td>
                                    <td>
                                        <span className={`badge ${e.isEmergency ? 'bg-danger' :
                                            e.status === 'present' ? 'bg-success' :
                                                e.status === 'leave' ? 'bg-warning' :
                                                    e.status === 'absent' ? 'bg-info' :
                                                        e.status === 'holiday' ? 'bg-primary' :
                                                            'bg-secondary'
                                            }`}>
                                            {e.isEmergency ? 'Emergency' : e.status}
                                        </span>
                                        {e.isHalfDay && !e.isEmergency && (
                                            <span className="badge bg-info ms-1">½</span>
                                        )}
                                        {e.isPublicHoliday && !e.isEmergency && (
                                            <span className="badge bg-primary ms-1">Holiday</span>
                                        )}
                                    </td>
                                    <td className={
                                        e.dailySalary === 0 ? 'text-danger' :
                                            e.isHalfDay ? 'text-warning' :
                                                'text-success'
                                    }>
                                        ₹{e.dailySalary?.toFixed(2)}
                                    </td>
                                    <td>
                                        <small className="text-muted">
                                            {/* FIXED: Show current logged-in user's name for modifications */}
                                            By {authUser?.name || authUser?.displayName || 'Current User'}
                                        </small>
                                        <br></br>
                                        <small className="text-white opacity-50 small-text">
                                            {e.updatedAt ? new Date(e.updatedAt).toLocaleString('en-IN') :
                                                e.createdAt ? new Date(e.createdAt).toLocaleString('en-IN') : ''}
                                        </small>
                                    </td>
                                    <td>
                                        {e.notes ? (
                                            <div className="">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-warning"
                                                    onClick={() => {
                                                        setCurrentNote(e.notes);
                                                        setShowNoteModal(true);
                                                    }}
                                                >
                                                    <i className="bi bi-chat-left-text"></i>
                                                </button>

                                            </div>
                                        ) : (
                                            <span className="text-muted">—</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="btn-group btn-group-sm">
                                            <button
                                                className="btn btn-outline-info"
                                                onClick={() => onEdit(e)}
                                                disabled={isDisabled}
                                                title="Edit Entry"
                                            >
                                                <i className="bi bi-pencil"></i>
                                            </button>
                                            <button className="btn btn-outline-danger btn-sm" onClick={() => onDelete(e.id)} disabled={isDisabled}>
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-dark border-top border-secondary">
                                <td colSpan="6" className="text-end text-white">
                                    <strong>Total Salary:</strong>
                                </td>
                                <td className="text-warning">
                                    <strong>₹{totalSalary?.toFixed(2)}</strong>
                                </td>
                                <td colSpan="3"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Note Modal */}
            {showNoteModal && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content bg-dark border border-info">
                            <div className="modal-header border-info">
                                <h5 className="modal-title text-info">
                                    <i className="bi bi-chat-left-text me-2"></i>
                                    Entry Comment
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    onClick={() => setShowNoteModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="text-white" style={{ whiteSpace: 'pre-wrap' }}>
                                    {currentNote}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowNoteModal(false)}
                                >
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
export default DisplayTimeSheet;