import React, { useState, useEffect, useMemo } from 'react';
import firebaseDB from '../../firebase';
import DailyEntryModal from './DailyEntryModal';
import AdvanceManagement from './AdvanceManagement';
import WorkerSearch from './WorkerSearch';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { useAuth } from "../../context/AuthContext";
import TimesheetShare from './TimesheetShare ';


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
// Single source of truth for timesheet paths
const empTsNode = (empId, tsId = '') =>
    `EmployeeBioData/${empId}/timesheets${tsId ? `/${tsId}` : ''}`;

const empTsEntriesNode = (empId, tsId, dateStr = '') =>
    `${empTsNode(empId, tsId)}/dailyEntries${dateStr ? `/${dateStr}` : ''}`;

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



// --- PATH HELPERS (Employee-scoped only) ---
// Single source of truth for timesheet paths
const empPath = (empId) => `EmployeeBioData/${empId}`;



const empTsById = (empId, tsId) =>
    `EmployeeBioData/${empId}/timesheets/${tsId}`;

const empEntryById = (empId, tsId, dateStr) =>
    `${empTsById(empId, tsId)}/dailyEntries/${dateStr}`;

const entryNodeByDate = (empId, tsId, dateStr) =>
    `${empTsById(empId, tsId)}/dailyEntries/${dateStr}`;

const pruneUndefined = (obj = {}) =>
    Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));

const norm = (s) => String(s || '').trim().toLowerCase();
const isSubmittedLike = (s) => ['submitted', 'submit', 'assigned'].includes(norm(s));



// === READ-ONLY / STATUS / NAMES / HYDRATION HELPERS (PURE) ===

const isSheetReadOnly = (ts, currentUserId, authContext) => {
    if (!ts) return false;
    const s = norm(ts.status);

    // Approved/Rejected ⇒ locked for everyone
    if (s === 'approved' || s === 'rejected') return true;

    // Submitted/Assigned ⇒ only assignee can edit (not the creator)
    if (isSubmittedLike(s)) {
        const isAssignedUser = ts.assignedTo && ts.assignedTo === currentUserId;
        const role = norm(authContext?.user?.role);
        const isAdmin = role === 'admin' || role === 'superadmin' || role === 'super_admin';

        // Only assignee or admin can edit submitted/assigned timesheets
        return !(isAssignedUser || isAdmin);
    }

    // Draft ⇒ editable by creator and admin
    const isCreator = ts.createdBy === currentUserId;
    const role = norm(authContext?.user?.role);
    const isAdmin = role === 'admin' || role === 'superadmin' || role === 'super_admin';

    return !(isCreator || isAdmin);
};



// Checks if assignedTo/* matches any of the current user's ids
const isAssigneeMatch = (ts, idSet, allUsers) => {
    if (!ts) return false;



    // 1) Direct match with any ID in the set
    const assignedTo = ts.assignedTo;
    if (assignedTo && idSet.has(String(assignedTo))) {
        return true;
    }

    // 2) Try to find the assigned user in allUsers and match by any identifier
    if (allUsers && assignedTo) {
        const assignedUser = allUsers.find(u =>
            u.uid === assignedTo ||
            u.id === assignedTo ||
            (u.email && idSet.has(u.email)) ||
            (u.displayName && idSet.has(u.displayName))
        );

        if (assignedUser) {
            // Check if current user matches the assigned user by any identifier
            const matches = Array.from(idSet).some(myId =>
                myId === assignedUser.uid ||
                myId === assignedUser.id ||
                myId === assignedUser.email ||
                myId === assignedUser.displayName
            );

            if (matches) {
                return true;
            }
        }
    }

    return false;
};


// Status → badge meta for UI badges (also used on rows)
const statusMeta = (s) => {
    const k = String(s || 'draft').toLowerCase();
    const map = {
        draft: { text: 'Draft', class: 'badge bg-secondary' },
        assigned: { text: 'Assigned', class: 'badge bg-info' },
        submitted: { text: 'Submitted', class: 'badge bg-primary' },
        clarification: { text: 'Clarification', class: 'badge bg-warning text-dark' },
        approved: { text: 'Approved', class: 'badge bg-success' },
        rejected: { text: 'Rejected', class: 'badge bg-danger' },
    };
    return map[k] || map.draft;
};

// Format period for header display:
// - Monthly: "Nov-25"
// - Range:   "Nov-10 to Dec-10 '25"
const monthShort = (yyyyMm) => {
    if (!/^\d{4}-\d{2}$/.test(yyyyMm)) return yyyyMm || '';
    const [y, m] = yyyyMm.split('-');
    const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(m, 10) - 1] || m;
    return `${month}-${String(y).slice(-2)}`;
};
const formatPeriodLabel = (periodKey) => {
    if (!periodKey) return '';
    if (periodKey.includes('_to_')) {
        const [s, e] = periodKey.split('_to_'); // YYYY-MM-DD
        const [sy, sm, sd] = s.split('-');
        const [ey, em, ed] = e.split('-');
        const smon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(sm, 10) - 1];
        const emon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(em, 10) - 1];
        const yy = String(ey).slice(-2);
        return `${smon}-${sd} to ${emon}-${ed} '${yy}`;
    }
    // monthly (YYYY-MM)
    return monthShort(periodKey);
};


const snapshotUserName = (u) =>
    u?.displayName || u?.name || u?.email || 'Admin';


// Pass the final tsId and tsStatus explicitly
const hydrateEntriesWithTsMeta = (rows, tsId, tsStatus) =>
    (rows || []).map(r => ({
        ...r,
        timesheetId: r.timesheetId || tsId || '',
        timesheetStatus: r.timesheetStatus || String(tsStatus || 'draft'),
    }));


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

    const [showClarifyReplyModal, setShowClarifyReplyModal] = useState(false);
    const [clarifyCommentId, setClarifyCommentId] = useState('');
    const [clarifyText, setClarifyText] = useState('');

    const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);
    const [pendingEditAction, setPendingEditAction] = useState(null);
    const [showReadOnlyModal, setShowReadOnlyModal] = useState(false);

    const [allUsers, setAllUsers] = useState([]);

    const whoSafe = () => {
        // Priority 1: Auth context user
        if (authContext?.user?.uid) {
            const user = authContext.user;
            return {
                uid: user.uid,
                name: user.displayName || user.name || user.email || 'Admin',
                email: user.email || '',
                role: user.role || 'user'
            };
        }

        // Priority 2: Firebase auth user
        if (authUser?.uid) {
            return {
                uid: authUser.uid,
                name: authUser.displayName || authUser.name || authUser.email || 'Admin',
                email: authUser.email || '',
                role: authUser.role || 'user'
            };
        }

        // Priority 3: Component state currentUser
        if (currentUser?.uid) {
            return {
                uid: currentUser.uid,
                name: currentUser.displayName || currentUser.name || currentUser.email || 'Admin',
                email: currentUser.email || '',
                role: currentUser.role || 'user'
            };
        }

        // Priority 4: Local storage fallback
        try {
            const stored = JSON.parse(localStorage.getItem("currentUser") || "null");
            if (stored?.uid) {
                return {
                    uid: stored.uid,
                    name: stored.displayName || stored.name || stored.email || 'Admin',
                    email: stored.email || '',
                    role: stored.role || 'user'
                };
            }
        } catch (e) {
            console.error('Error reading stored user:', e);
        }

        // Final fallback - ensure we always return a valid object
        return { uid: "unknown", name: "Unknown User", email: "", role: "user" };
    };

    // Build a Set of all IDs that can represent the current user (Y)
    const currentUserIdSet = (authContext, authUser, currentUser, allUsers) => {
        const ids = new Set();
        try {
            const who = whoSafe();
            [who?.uid, authContext?.user?.uid, authContext?.user?.id, authUser?.uid, currentUser?.uid, currentUser?.id]
                .filter(Boolean)
                .forEach(v => ids.add(String(v)));
        } catch (error) {
        }

        // Also add email and displayName if available
        const who = whoSafe();
        [who?.email, authContext?.user?.email, authUser?.email, currentUser?.email]
            .filter(Boolean)
            .forEach(v => ids.add(String(v)));

        [who?.name, who?.displayName, authContext?.user?.displayName, authUser?.displayName, currentUser?.displayName]
            .filter(Boolean)
            .forEach(v => ids.add(String(v)));

        // Legacy localStorage
        try {
            const stored = JSON.parse(localStorage.getItem('currentUser') || 'null');
            [stored?.uid, stored?.id, stored?.email, stored?.displayName].filter(Boolean).forEach(v => ids.add(String(v)));
        } catch { }

        return ids;
    };

    // Use Auth Context
    const authContext = useAuth();
    const { user: authUser } = useAuth();
    const canUserEditTimesheet = (ts, _currentUserId, authContext) => {
        if (!ts) return false;

        const status = norm(ts.status);


        // Lock for everyone - approved/rejected cannot be edited by anyone
        if (status === 'approved' || status === 'rejected') {
            return false;
        }

        // Collect all possible IDs for the current user
        const idSet = currentUserIdSet(authContext, authUser, currentUser, allUsers);

        // Draft → creator OR admin can edit
        if (!status || status === 'draft') {
            const role = norm(authContext?.user?.role);
            const isAdmin = role === 'admin' || role === 'superadmin' || role === 'super_admin';
            const isCreator = ts.createdBy && idSet.has(String(ts.createdBy));

            return Boolean(isCreator || isAdmin);
        }

        // Submitted / Assigned / Clarification → ONLY the assignee can edit
        if (status === 'submitted' || status === 'assigned' || status === 'clarification') {
            // If allUsers is not loaded yet, we can't determine if current user is assignee
            // So we'll do a direct comparison first, then try with allUsers if available
            const assignedTo = ts.assignedTo;

            // 1. Direct comparison with current user IDs
            if (assignedTo && idSet.has(String(assignedTo))) {
                return true;
            }

            // 2. If allUsers is loaded, try to resolve the assigned user
            if (allUsers && allUsers.length > 0) {
                const isAssignedUser = isAssigneeMatch(ts, idSet, allUsers);

                return isAssignedUser;
            } else {
                // 3. If allUsers is not loaded yet, we can't determine - assume no permission temporarily
                return false;
            }
        }


        return false;
    };



    const isSheetReadOnly = (ts, _currentUserId, authContext) => !canUserEditTimesheet(ts, _currentUserId, authContext);


    // Enhanced read-only check considering current user
    const isReadOnly = useMemo(() => {
        const { uid } = whoSafe();

        // If no timesheet exists, it's not read-only (we can create)
        if (!timesheet) return false;

        if (!uid || uid === "unknown") {
            const role = norm(authContext?.user?.role);
            const isAdmin = role === 'admin' || role === 'superadmin' || role === 'super_admin';
            return !isAdmin;
        }

        // If allUsers is not loaded yet, we can't accurately determine read-only status
        // So we'll check basic conditions first
        if (!allUsers || allUsers.length === 0) {
            // For draft timesheets, allow editing until we have user data
            if (timesheet?.status === 'draft' && timesheet?.createdBy === uid) {
                return false;
            }
            // Be conservative for other statuses
            return timesheet?.status !== 'draft';
        }

        const readOnly = isSheetReadOnly(timesheet, uid, authContext);
        return readOnly;
    }, [timesheet, authContext, allUsers, currentUser]);

    useEffect(() => {
        const loadUsers = async () => {
            await fetchUsers();
        };
        loadUsers();
    }, [authContext?.user, authUser]);

    // Also update the useEffect for when assign modal opens to ensure users are loaded
    useEffect(() => {
        if (showAssignModal) {
            const loadUsersForAssign = async () => {
                await fetchUsers();
            };
            loadUsersForAssign();
        }
    }, [showAssignModal]);

    // Add a loading state for users
    const [usersLoading, setUsersLoading] = useState(false);

    const { uid: currentUid } = whoSafe();
    const isAssignee = Boolean(timesheet?.assignedTo && timesheet.assignedTo === currentUid);
    const submittedLikeNow = isSubmittedLike(timesheet?.status);

    const onEditClick = (entry) => {
        const uid = whoSafe().uid;
        const canEdit = canUserEditTimesheet(timesheet, uid, authContext);
        if (!canEdit) {
            setShowReadOnlyModal(true);
            return;
        }
        setCurrentEntry(entry);
        setIsEditing(true);
        setEntryModalMode('single');
        setShowEntryModal(true);
    };

    const uid = whoSafe().uid;
    const isAssigneeLocal = timesheet?.assignedTo === uid;
    const submittedLikeNowLocal = isSubmittedLike(timesheet?.status);
    const uidRow = whoSafe().uid;
    const isAssigneeRow = timesheet?.assignedTo === uidRow;
    const submittedLikeRow = isSubmittedLike(timesheet?.status);
    const rowDeleteDisabled = submittedLikeRow || isReadOnly;
    const canOpenEdit = !isReadOnly || (submittedLikeRow && isAssigneeRow);




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
        const { uid, name } = whoSafe();
        const emp = employees.find(e => e.id === empId);
        const periodKey = getCurrentPeriodKey();
        const periodStr = formatPeriodLabel(periodKey)
        const _isAssignee = Boolean(timesheet?.assignedTo && timesheet.assignedTo === uid);
        const _submittedLikeNow = isSubmittedLike(timesheet?.status);
        const _rowDeleteDisabled = _submittedLikeNow || isReadOnly;
        const _canOpenEdit = !isReadOnly || (_submittedLikeNow && _isAssignee);


        const base = {
            employeeId: empId,
            timesheetId: tsId,
            employeeName: `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim(),
            period: periodStr || '',               // human label
            periodKey: periodKey || '',            // machine key
            startDate: useDateRange
                ? startDate
                : `${(selectedMonth || new Date().toISOString().slice(0, 7))}-01`,
            endDate: useDateRange
                ? endDate
                : endOfMonth(selectedMonth || new Date().toISOString().slice(0, 7)),
            status: header?.status ?? undefined,
            updatedAt: new Date().toISOString(),
            updatedBy: uid,
            updatedByName: name,
        };

        const patch = pruneUndefined({ ...base, ...header });
        await firebaseDB.child(empTsById(empId, tsId)).update(patch);
        return patch;
    };

    // --- ADVANCE DEDUCTION HELPERS ---

    // true if a yyyy-mm-dd date is inside the currently selected period
    // true if a yyyy-mm-dd date is inside the currently selected period
    const isDateInActivePeriod = (yyyyMmDd) => {
        if (!yyyyMmDd) return false;

        try {
            if (useDateRange && startDate && endDate) {
                return yyyyMmDd >= startDate && yyyyMmDd <= endDate;
            }

            // month mode - check if date falls within the month
            if (selectedMonth) {
                return yyyyMmDd.startsWith(selectedMonth);
            }

            return false;
        } catch (error) {
            console.error('Error checking date in period:', error);
            return false;
        }
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

    // True month-end for YYYY-MM  →  YYYY-MM-DD
    const endOfMonth = (yyyyMm) => {
        if (!/^\d{4}-\d{2}$/.test(yyyyMm)) return '';
        const [y, m] = yyyyMm.split('-').map(Number);
        const d = new Date(y, m, 0); // 0th of next month = last day of current
        return `${yyyyMm}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Always return 30 days for any month — payroll logic
    // const endOfMonth = (yyyyMm) => {
    //   if (!/^\d{4}-\d{2}$/.test(yyyyMm)) return '';
    //   // Always cap to 30 days even if Feb or 31-day months
    //   return `${yyyyMm}-30`;
    // };




    // Load entries by employee + timesheetId
    const loadDailyEntriesByTimesheetId = async (empId, tsId, tsStatus = 'draft') => {
        const snap = await firebaseDB.child(`${empTsById(empId, tsId)}/dailyEntries`).get();
        const obj = snap.val() || {};
        const list = Object.keys(obj)
            .sort()
            .map((date) => ({
                id: date,
                _rowKey: `${empId}_${date}`,
                ...obj[date],
                date,
            }));
        // set rows
        setDailyEntries(list);
        // hydrate with TS meta WITHOUT touching component vars here
        setDailyEntries(prev => hydrateEntriesWithTsMeta(prev, tsId, tsStatus));
    };


    const openClarifyReply = (commentId) => {
        if (!commentId) return;
        setClarifyCommentId(commentId);
        setClarifyText('');
        setShowClarifyReplyModal(true);
    };
    const submitClarifyReply = async () => {
        if (!clarifyText.trim()) {
            showModal('Write something', 'Please enter your reply.', 'warning');
            return;
        }
        await handleReplyToClarification(clarifyCommentId, clarifyText);
        setShowClarifyReplyModal(false);
        setClarifyCommentId('');
        setClarifyText('');
    };

    // Build the advances path under a specific employee + timesheet
    const advancesNode = (empId, tsId) =>
        `EmployeeBioData/${empId}/timesheets/${tsId}/advances`;






    // NEW: open confirm modal
    const openPrevTsDelete = (ts) => {
        setPrevTsToDelete(ts);
        setShowPrevTsDelete(true);
    };




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

            showModal('loadYearTimesheets error', e);
            setYearPrevTimesheets([]);
        }
    };




    // Period key used everywhere: "YYYY-MM" or "YYYY-MM-DD_to_YYYY-MM-DD"
    const getCurrentPeriodKey = () => {
        return useDateRange && startDate && endDate
            ? `${startDate}_to_${endDate}`
            : (selectedMonth || '');
    };

    const periodKey = getCurrentPeriodKey();


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
            // Delete the entire timesheet node which includes dailyEntries
            await firebaseDB.child(empTsNode(selectedEmployee, prevTsToDelete.id)).remove();

            // If it was currently open, clear it
            if (timesheet?.id === prevTsToDelete.id) {
                setTimesheet(null);
                setDailyEntries([]);
                setCurrentTimesheetId('');
            }

            await loadPreviousTimesheets();
            showModal('Success', 'Timesheet deleted successfully!', 'success');
        } catch (e) {

            showModal('Error', 'Delete failed. Try again.', 'error');
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

    const snapshotName = (uid, fallback) => (authUser?.name) || fallback || uid;





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
        setUsersLoading(true);
        const paths = ['Users', 'EmployeeBioData',];
        const tmp = [];

        for (const p of paths) {
            try {
                const snap = await firebaseDB.child(p).once('value');
                if (!snap.exists()) continue;

                const obj = snap.val() || {};
                Object.entries(obj).forEach(([uid, val]) => {
                    // Skip if it's employee data without user properties
                    if (val.firstName && val.lastName && !val.email && !val.displayName) {
                        // This is likely employee data, not user data
                        return;
                    }

                    const userRole = (val.role || '').toLowerCase();
                    const shouldInclude = ['admin', 'manager', 'superadmin', 'super_admin', 'user', 'employee'].includes(userRole);

                    if (shouldInclude || val.email || val.displayName) {
                        tmp.push({
                            uid: uid,
                            id: uid,
                            displayName: val.displayName || val.name || `${val.firstName || ''} ${val.lastName || ''}`.trim() || val.email || uid,
                            email: val.email || '',
                            role: val.role || 'user',
                            firstName: val.firstName,
                            lastName: val.lastName
                        });
                    }
                });
            } catch (error) {
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
        setUsersLoading(false);

        return uniq;
    };

    // Add a retry mechanism for user loading
    const retryUserLoading = async () => {

        await fetchUsers();
    };

    // You can also add a temporary loading indicator in your UI
    {
        usersLoading && (
            <div className="alert alert-info">
                <i className="bi bi-arrow-repeat spinner me-2"></i>
                Loading user data...
            </div>
        )
    }
    {
        {
            filteredUsers.map(u => (
                <div
                    key={u.uid}
                    className={`p-2 rounded ${assignTo === u.uid ? 'bg-primary' : 'hover-bg-gray-700'}`}
                    onClick={() => {
                        setAssignTo(u.uid);
                        setUserSearch(u.displayName); // Show the actual display name
                    }}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="fw-bold text-white">{u.displayName}</div>
                    <div className="text-info small">Role: {u.role || 'user'}</div>
                    <div className="text-muted small">{u.email}</div>
                </div>
            ))
        }
    }

    // Add this useEffect to refresh users when the component mounts or auth changes
    useEffect(() => {
        fetchUsers();
    }, [authContext?.user, authUser]);

    // Also refresh when assign modal opens
    useEffect(() => {
        if (showAssignModal) {
            fetchUsers();
        }
    }, [showAssignModal]);

    const fetchEmployees = async () => {
        try {
            const snapshot = await firebaseDB.child("EmployeeBioData").once('value');
            if (snapshot.exists()) {
                const employeesData = Object.entries(snapshot.val()).map(([id, data]) => ({
                    id,
                    ...data,
                    displayName: `${data.firstName} ${data.lastName} (${data.employeeId || data.idNo})`
                }));
                setEmployees(employeesData);
            }
        } catch (error) {
            showModal('EError fetching employees:', error);
        }
    };


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

                    showModal('No user logged in');
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


    useEffect(() => {
        if (!selectedEmployee || !timesheet?.timesheetId) {
            setAdvances([]);
            return;
        }
        const ref = firebaseDB.child(
            `EmployeeBioData/${selectedEmployee}/timesheets/${timesheet.timesheetId}/advances`
        );
        const handler = ref.on('value', (snap) => {
            const obj = snap.val() || {};
            const list = Object.entries(obj).map(([id, v]) => ({ id, ...v }));
            setAdvances(list);
            calculateSummary(dailyEntries, list);
        }, console.error);

        return () => ref.off('value', handler);
    }, [selectedEmployee, timesheet?.timesheetId]);





    const nameForUid = (uid) => {
        if (!uid) return 'N/A';

        // Check if it's current user first
        const { uid: currentUid, name: currentName } = whoSafe();
        if (uid === currentUid) {
            return currentName;
        }

        // Check allUsers array
        const user = allUsers.find(u => u.uid === uid || u.id === uid);
        if (user) {
            return user.displayName || user.name || user.email || uid;
        }

        // Try auth context
        if (authContext?.user?.uid === uid) {
            return authContext.user.displayName || authContext.user.name || authContext.user.email || 'Auth User';
        }

        // Try stored users in various paths
        const storedUser = Object.values(allUsers || {}).find(u =>
            u.uid === uid || u.id === uid
        );
        if (storedUser) {
            return storedUser.displayName || storedUser.name || storedUser.email || uid;
        }

        return uid; // fallback to UID if no name found
    };
    const handleAutoFill = async (tpl) => {
        const { uid, name } = whoSafe();
        if (isReadOnly) {
            showModal('Locked', `This timesheet is ${timesheet?.status}. Editing is disabled.`, 'warning');
            return;
        }

        const emp = employees.find(e => e.id === selectedEmployee);
        if (!emp) return showModal('Error', 'Select employee first.', 'error');

        const periodKey = makePeriodKey(tpl);

        // Derive range for the planned period
        const [s, e] = periodKey.includes('_to_')
            ? periodKey.split('_to_')
            : [`${periodKey}-01`, endOfMonth(periodKey)];
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
            createdBy: uid,
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
                createdBy: uid,
                createdAt: new Date().toISOString(),
                updatedBy: uid,
                updatedByName: name,
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
        setDailyEntries(prev => hydrateEntriesWithTsMeta(
            prev,
            tsId,
            'draft'
        ));

        await calculateSummary(newEntriesLocal, advances);

        showModal('Success', `Auto-fill completed for period ${periodKey}.`, 'success');
    };






    // Update the add new entry handler
    const handleAddEntry = () => {
        const uid = whoSafe().uid;
        if (!canUserEditTimesheet(timesheet, uid, authContext)) {
            showModal(
                'Locked',
                `This timesheet is ${timesheet?.status}. Only the assigned user (${timesheet?.assignedToName || timesheet?.assignedTo}) can add or edit.`,
                'warning'
            );
            return;
        }

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
        const paths = ['ClientData'];
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
        const { uid, name } = whoSafe();
        if (!selectedEmployee) {
            setTimesheet(null);
            setCurrentTimesheetId('');
            setDailyEntries([]);
            return;
        }

        setIsCreatingTimesheet(true);

        try {
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
                // Load existing timesheet
                setTimesheet(foundHeader);
                setCurrentTimesheetId(foundTsId);

                // Load daily entries for this timesheet
                const entriesRef = firebaseDB.child(`${empTsById(selectedEmployee, foundTsId)}/dailyEntries`);
                const entriesSnap = await entriesRef.get();

                if (entriesSnap.exists()) {
                    const obj = entriesSnap.val() || {};
                    const rows = Object.entries(obj)
                        .map(([k, v]) => ({
                            ...v,
                            id: k, // Ensure each entry has an id
                            date: v?.date || k,
                            _rowKey: v?.employeeId_date || `${selectedEmployee}_${k}`,
                        }))
                        .sort((a, b) => new Date(a.date) - new Date(b.date));


                    setDailyEntries(rows);
                } else {
                    showModal('No daily entries found');
                    setDailyEntries([]);
                }
            } else if (createIfMissing) {
                // Create new timesheet
                const newTimesheetId = await buildTimesheetId(employee, periodKey);
                // ... rest of creation logic
            } else {
                setTimesheet(null);
                setCurrentTimesheetId('');
                setDailyEntries([]);
            }

        } catch (error) {
            showModal('Error', 'Error loading timesheet', 'error');
        } finally {
            setIsCreatingTimesheet(false);
        }
    };

    // Create a reply under a clarification comment node for this timesheet
    const postClarificationReply = async ({ empId, tsId, commentId, text }) => {
        if (!text?.trim()) return;
        const now = new Date().toISOString();
        const { uid, name } = whoSafe();

        const reply = { text: text.trim(), by: uid, byName: name, at: now };
        const basePath = `${empTsById(empId, tsId)}/clarifications/${commentId}`;
        const key = firebaseDB.child(`${basePath}/replies`).push().key;

        await firebaseDB.update({
            [`${basePath}/replies/${key}`]: reply,
            [`${basePath}/lastUpdatedAt`]: now,
            [`${basePath}/lastUpdatedBy`]: uid,
            [`${basePath}/lastUpdatedByName`]: name,
        });
    };

    // Convenience wrapper for UI
    const handleReplyToClarification = async (commentId, text) => {
        if (!selectedEmployee || !timesheet?.timesheetId) {
            showModal('Error', 'Timesheet context missing.', 'error');
            return;
        }
        await postClarificationReply({
            empId: selectedEmployee,
            tsId: timesheet.timesheetId,
            commentId,
            text
        });
        showModal('Success', 'Reply posted.', 'success');
    };




    // Add this helper function
    const calculateTotalDaysInPeriod = () => {
        try {
            const start = new Date(useDateRange ? startDate : `${selectedMonth}-01`);
            const end = new Date(useDateRange ? endDate : endOfMonth(selectedMonth));

            let totalDays = 0;
            for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
                totalDays++;
            }
            return totalDays;
        } catch (error) {
            showModal('Error calculating total days:', error);
            return 0;
        }
    };

    // PATCH: jump to a selected previous timesheet and hydrate the live view
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
        await loadDailyEntriesByTimesheetId(selectedEmployee, tsId, enhancedTs?.status || 'draft');

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
            setDailyEntries(prev => hydrateEntriesWithTsMeta(
                prev,
                tsId,
                ts?.status || 'draft'
            ));


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

            showModal('Error loading previous timesheets:', error);
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

    const calculateSummary = async (
        entries = dailyEntries,
        advancesData = advances,
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

        // FIX: Proper advance calculation for current period
        const normalizeAdvances = (adv) => {
            if (!adv) return [];
            if (Array.isArray(adv)) return adv;
            if (typeof adv === 'object') return Object.values(adv);
            return [];
        };

        const advancesList = normalizeAdvances(advancesData);

        // Filter advances for current period and non-settled status
        const advancesInPeriod = advancesList.filter(a => {
            const isInPeriod = isDateInActivePeriod(a.date);
            const isNotSettled = (a.status || '').toLowerCase() !== 'settled';
            return isInPeriod && isNotSettled;
        });

        const totalAdv = advancesInPeriod.reduce((sum, a) => {
            const amount = parseFloat(a?.amount) || 0;
            return sum + amount;
        }, 0);

        const { uid, name } = whoSafe();

        // FIX: Allow negative values for netPayable
        const netPayable = Math.round(totalSalary - totalAdv); // Remove Math.max(0, ...)

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
            advancesTotal: totalAdv,
            netPayable: netPayable, // This can now be negative
            updatedByName: name,
            updatedAt: new Date().toISOString(),
        };

        setTimesheet(prev => ({ ...(prev || { timesheetId: currentTimesheetId }), ...patch, timesheetId: currentTimesheetId }));

        // Update Firebase
        await firebaseDB.child(empTsById(selectedEmployee, currentTimesheetId)).update(patch);
    };
    const createNewTimesheet = (timesheetId) => {
        const { uid, name } = whoSafe();
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
            endDate: useDateRange ? endDate : endOfMonth(selectedMonth),
            useDateRange,
            status: 'draft',
            totalDays: 0,
            workingDays: 0,
            leaves: 0,
            holidays: 0,
            emergencies: 0,
            absents: 0,
            totalSalary: 0,
            advancesTotal: 0,
            netPayable: 0,
            createdBy: uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        setTimesheet(newTimesheet);
        setDailyEntries([]);

    };
    const loadDailyEntries = async (periodKeyParam) => {
        const periodKey = periodKeyParam || getCurrentPeriodKey();

        // Use the proper employee-scoped path
        if (!selectedEmployee || !currentTimesheetId) {
            setDailyEntries([]);
            calculateSummary([]);
            return;
        }

        const snap = await firebaseDB.child(
            `${empTsById(selectedEmployee, currentTimesheetId)}/dailyEntries`
        ).get();

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

    // In DisplayTimeSheet.jsx - Update the loadAdvances function:

    const loadAdvances = async () => {
        if (!selectedEmployee || !timesheet?.timesheetId) {
            setAdvances([]);
            calculateSummary(dailyEntries, []);
            return;
        }

        try {
            const snap = await firebaseDB
                .child(`EmployeeBioData/${selectedEmployee}/timesheets/${timesheet.timesheetId}/advances`)
                .once('value');

            const data = snap.val();
            let advancesList = [];

            // Properly handle different data structures
            if (data) {
                if (Array.isArray(data)) {
                    advancesList = data;
                } else if (typeof data === 'object') {
                    advancesList = Object.entries(data).map(([id, v]) => ({
                        id,
                        ...v,
                        // Ensure amount is properly parsed
                        amount: parseFloat(v?.amount) || 0
                    }));
                }
            }

            setAdvances(advancesList);
            calculateSummary(dailyEntries, advancesList);
        } catch (error) {
            console.error('Error loading advances:', error);
            setAdvances([]);
            calculateSummary(dailyEntries, []);
        }
    };
    // Check for duplicate entries
    const checkDuplicateEntries = async (employeeId, date, excludeEntryId = null) => {
        try {
            // Check across all timesheets for this employee
            const allTsSnap = await firebaseDB.child(empTsNode(employeeId)).get();
            if (!allTsSnap.exists()) return false;

            const allTimesheets = allTsSnap.val() || {};
            const duplicates = [];

            for (const [tsId, timesheet] of Object.entries(allTimesheets)) {
                if (!timesheet.dailyEntries) continue;

                const entry = timesheet.dailyEntries[date];
                if (entry && (!excludeEntryId || entry.id !== excludeEntryId)) {
                    duplicates.push({
                        id: `${tsId}_${date}`,
                        ...entry,
                        timesheetId: tsId
                    });
                }
            }

            if (duplicates.length > 0) {
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

            showModal('Error checking duplicate timesheet:', error);
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

            showModal('Error checking existing entries:', error);
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
        const { uid, name } = whoSafe();
        if (!timesheet || !selectedEmployee) return;

        setIsAutoFilling(true);

        try {
            const start = new Date(useDateRange ? startDate : `${selectedMonth}-01`);
            const end = new Date(useDateRange ? endDate : endOfMonth(selectedMonth));

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
                    createdBy: uid,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                await saveEntry(entry);
            }

            await loadDailyEntries();
        } catch (error) {

            showModal('Error in auto-fill:', error);
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

    const validateSalaryLimit = (entries, employee) => {
        const basicSalary = Number(employee?.basicSalary) || 0;
        const totalCalculatedSalary = entries.reduce((sum, entry) => sum + (entry.dailySalary || 0), 0);

        return totalCalculatedSalary <= basicSalary;
    };

    // Update the edit entry handler
    const handleEditEntry = (entry) => {
        const { uid } = whoSafe();
        const canEdit = canUserEditTimesheet(timesheet, uid, authContext);

        if (!canEdit) {
            setShowReadOnlyModal(true);
            return;
        }

        // If we can edit, proceed with edit action
        if (isSubmittedLike(timesheet?.status)) {

            setPendingEditAction({ type: 'edit', entry });
            setShowEditConfirmModal(true);
        } else {

            // Direct edit - open the modal
            setCurrentEntry(entry);
            setIsEditing(true);
            setEntryModalMode('single');
            setShowEntryModal(true);
        }
    };


    // Fix the delete entry handler in DailyEntriesTable
    // Fix the delete handler
    const handleDeleteEntry = (entry) => {


        const { uid } = whoSafe();
        const canDelete = canUserEditTimesheet(timesheet, uid, authContext);



        if (!canDelete) {
            setShowReadOnlyModal(true);
            return;
        }

        // If we can delete, proceed with delete action
        if (isSubmittedLike(timesheet?.status)) {
            setPendingEditAction({ type: 'delete', entry });
            setShowEditConfirmModal(true);
        } else {
            confirmDeleteEntry(entry);
        }
    };

    // Handle confirmed edit action
    const handleConfirmedEdit = (entry) => {
        setCurrentEntry(entry);
        setIsEditing(true);
        setEntryModalMode('single');
        setShowEntryModal(true);
    };

    // Handle confirmed delete action  
    const handleConfirmedDelete = (entry) => {
        setEntryToDelete(entry);
        setShowDeleteModal(true);
    };

    const checkSalaryLimit = async () => {
        // Check salary limit
        const employee = employees.find(e => e.id === selectedEmployee);
        if (!validateSalaryLimit(dailyEntries, employee)) {
            const basicSalary = Number(employee?.basicSalary) || 0;
            const totalSalary = dailyEntries.reduce((sum, e) => sum + (parseFloat(e.dailySalary) || 0), 0);

            showModal(
                'Salary Limit Exceeded',
                `Total salary (₹${totalSalary.toFixed(2)}) exceeds basic salary (₹${basicSalary.toFixed(2)}). Do you want to proceed?`,
                'warning',
                async () => {
                    await proceedWithSave();
                }
            );
            return;
        }

        await proceedWithSave();
    }


    // Add save timesheet function
    const saveTimesheet = async () => {
        const { uid, name } = whoSafe();
        if (isReadOnly) {
            showModal('Locked', `This timesheet is ${timesheet?.status}. Editing is disabled.`, 'warning');
            return;
        }

        if (!selectedEmployee || !currentTimesheetId) {
            showModal('Error', 'Please select an employee and ensure timesheet is loaded.', 'error');
            return;
        }

        checkSalaryLimit()


    };

    // Separate the save logic
    const proceedWithSave = async () => {
        const { uid, name } = whoSafe();
        setIsSaving(true);
        try {
            const periodStr = useDateRange ? `${startDate} to ${endDate}` : selectedMonth;

            const headerPatch = await ensureTimesheetHeader(
                selectedEmployee,
                currentTimesheetId,
                pruneUndefined({
                    period: periodStr,
                    periodKey,
                    updatedAt: new Date().toISOString(),
                    updatedByName: name,
                })
            );

            const updates = {};
            for (const entry of dailyEntries) {
                const path = `${empTsById(selectedEmployee, currentTimesheetId)}/dailyEntries/${entry.date}`;
                updates[path] = {
                    ...entry,
                    timesheetId: currentTimesheetId,
                    employeeId: selectedEmployee,
                    updatedAt: new Date().toISOString(),
                    updatedByName: name,
                };
            }
            await firebaseDB.update(updates);

            await calculateSummary();
            await loadPreviousTimesheets();
            setHasUnsavedChanges(false);
            showModal('Success', 'Timesheet Saved Successfully', 'success');
        } catch (error) {

            showModal('Error', 'Error saving timesheet. Please try again.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Save/Upsert one daily entry under the employee’s timesheet
    const saveEntry = async (entry) => {
        const { uid, name } = whoSafe();
        if (!selectedEmployee || !currentTimesheetId) return;
        if (!entry?.date) return;

        const empId = selectedEmployee;
        const tsId = currentTimesheetId;
        const now = new Date().toISOString();

        // Derive period from the current search selection
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
            updatedBy: uid,
            updatedByName: name,
            updatedAt: now,

            // create audit if not present already (first set)
            createdBy: entry.createdBy || currentUser?.uid || 'admin',
            createdBy: uid,
            createdAt: entry.createdAt || now,
        });

        return toPay; // Return the calculated salary
    };
    // PATCH: ensure the target timesheet exists and has core metadata
    const ensureTimesheet = async (empId, tsId, periodLabel, startDate, endDate) => {
        const { uid, name } = whoSafe();
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
                createdBy: uid,
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


        const { uid } = whoSafe();
        const canDelete = canUserEditTimesheet(timesheet, uid, authContext);



        if (!canDelete) {
            setShowReadOnlyModal(true);
            return;
        }


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
        if (isReadOnly) { showModal('Locked', `This timesheet is ${timesheet?.status}. Editing is disabled.`, 'warning'); return; }

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
            showModal('Error', 'Delete failed. Please try again.', 'error');
        }
    };

    // Fix the bulk delete handler
    const handleBulkDelete = () => {


        const { uid } = whoSafe();
        const canDelete = canUserEditTimesheet(timesheet, uid, authContext);

        if (!canDelete) {
            setShowReadOnlyModal(true);
            return;
        }

        if (selectedEntries.length === 0) {
            showModal('Warning', 'Please select entries to delete.', 'warning');
            return;
        }

        setShowDeleteModal(true);
    };

    // bulk delete
    // ✅ Delete selected daily entries safely (no table flicker, no ESLint errors)
    const deleteSelectedEntries = async () => {
        if (isReadOnly) { showModal('Locked', `This timesheet is ${timesheet?.status}. Editing is disabled.`, 'warning'); return; }

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
            showModal('Error', 'Failed to delete selected entries. Please try again.', 'error');
        }

        setShowDeleteModal()
    };



    const handleSaveEntry = async (entryData) => {
        const { uid, name } = whoSafe();
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
                    updatedByName: name,
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
                    createdBy: uid,
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
        // First check salary limit
        const employee = employees.find(e => e.id === selectedEmployee);
        if (!validateSalaryLimit(dailyEntries, employee)) {
            const basicSalary = Number(employee?.basicSalary) || 0;
            const totalSalary = dailyEntries.reduce((sum, e) => sum + (parseFloat(e.dailySalary) || 0), 0);

            showModal(
                'Salary Limit Exceeded',
                `Total salary (₹${totalSalary.toFixed(2)}) exceeds basic salary (₹${basicSalary.toFixed(2)}). Do you want to proceed?`,
                'warning',
                async () => {
                    // Proceed with assignment check after user confirms
                    proceedToAssignmentCheck();
                },
                () => {
                    // User cancelled - close everything
                    setShowConfirmModal(false);
                    setShowAssignModal(false);
                    setPendingSubmitAfterAssign(false);
                }
            );
            return;
        }

        // If salary is within limit, proceed directly to assignment check
        proceedToAssignmentCheck();
    };

    const proceedToAssignmentCheck = () => {
        if (!dailyEntries?.length) {
            showModal('Error', 'Cannot submit an empty timesheet. Please add entries first.', 'error');
            return;
        }

        const alreadyAssigned = !!(timesheet?.assignedTo);
        const chosenAssignee = assignTo || timesheet?.assignedTo || '';

        if (!alreadyAssigned && !chosenAssignee) {
            setPendingSubmitAfterAssign(true);
            setShowAssignModal(true);
            return;
        }

        setShowConfirmModal(true);
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
            const { uid, name } = whoSafe();
            const assignedUserName = nameForUid(assignTo);

            const patch = pruneUndefined({
                assignedTo: assignTo,
                assignedToName: assignedUserName,
                assignedBy: uid,
                assignedByName: name,
                assignedAt: new Date().toISOString(),
                status: 'assigned',
                updatedAt: new Date().toISOString(),
                updatedBy: uid,
                updatedByName: name,
            });
            await firebaseDB.child(empTsById(selectedEmployee, timesheet.timesheetId)).update(patch);
            await firebaseDB.child(empTsById(selectedEmployee, timesheet.timesheetId)).update(patch);

            setTimesheet(prev => ({ ...(prev || {}), ...patch }));
            setShowAssignModal(false);

            // 👇 Open Submit modal automatically if this assign came from a submit attempt
            if (pendingSubmitAfterAssign) {
                setTimeout(() => setShowConfirmModal(true), 0); // ensure clean re-render
                setPendingSubmitAfterAssign(false);
            }
        } catch (e) {

            showModal('Error', 'Failed to assign. Please try again.', 'error');
        }
    };

    // Add this helper function to check if current user can modify
    const canModifyTimesheet = () => {
        if (isReadOnly) return false;

        const { uid } = whoSafe();
        const isAssignedUser = timesheet?.assignedTo === uid;
        const isCreator = timesheet?.createdBy === uid;
        const submittedLike = isSubmittedLike(timesheet?.status);

        if (submittedLike) {
            return isAssignedUser || authContext?.user?.role === 'admin';
        } else {
            return isCreator || authContext?.user?.role === 'admin';
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
            const { uid, name } = whoSafe();
            const finalHeader = pruneUndefined({
                ...timesheet,
                status: 'submitted',
                submittedBy: uid,
                submittedByName: name,
                submittedAt: new Date().toISOString(),
                submissionComment: submitComment || '',
                updatedAt: new Date().toISOString(),
                updatedBy: uid,
                updatedByName: name,
            });
            await firebaseDB.child(empTsById(selectedEmployee, timesheet.timesheetId)).update(finalHeader);

            await firebaseDB.child(empTsById(selectedEmployee, timesheet.timesheetId)).update(finalHeader);
            // await settleAdvancesForActivePeriod(selectedEmployee, timesheet.timesheetId);

            setShowConfirmModal(false);
            showModal('Success', 'Timesheet submitted successfully!', 'success');

            await loadPreviousTimesheets();
            setDailyEntries([]);
            setTimesheet(null);
            setCurrentTimesheetId('');
        } catch (e) {

            showModal('Error', 'Error submitting timesheet. Please try again.', 'error');
        }
    };

    // Refresh calculations when advances change
    useEffect(() => {
        if (timesheet && advances.length >= 0) {
            calculateSummary(dailyEntries, advances);
        }
    }, [advances]);



    const assignTimesheet = async () => {
        // read-only guard
        if (isReadOnly) {
            showModal('Locked', `This timesheet is ${timesheet?.status}. Editing is disabled.`, 'warning');
            return;
        }

        // validate context
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

            const { uid, name } = whoSafe();

            const patch = {
                assignedTo: assignTo,
                assignedToName: assignedUser.displayName, // Use the actual display name
                assignedToRole: assignedUser.role || 'user',
                assignedBy: uid,
                assignedByName: name,
                assignedAt: new Date().toISOString(),
                status: 'assigned',
                updatedAt: new Date().toISOString(),
                updatedBy: uid,
                updatedByName: name,
            };

            await firebaseDB.child(empTsNode(selectedEmployee, timesheet.timesheetId)).update(patch);

            setTimesheet(prev => ({ ...(prev || {}), ...patch }));
            setShowAssignModal(false);
            setAssignTo('');

            showModal('Success', `Timesheet assigned to ${assignedUser.displayName || assignedUser.email}`, 'success');
            await loadPreviousTimesheets();

            // If the assign came from a submit attempt, open submit modal now
            if (pendingSubmitAfterAssign) {
                setTimeout(() => setShowConfirmModal(true), 0);
                setPendingSubmitAfterAssign(false);
            }
        } catch (error) {

            showModal('Error', 'Failed to assign timesheet. Please try again.', 'error');
        }
    };

    // Add this state
    const [showEditProtectedModal, setShowEditProtectedModal] = useState(false);

    const checkEditPermission = (timesheetStatus, action = 'edit') => {
        const userRole = authContext?.user?.role || 'user';

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
        const { uid, name } = whoSafe();
        const auditTrail = {
            updatedBy: currentUser?.uid,
            updatedByName: name,
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
                                                <th>Assigned To</th>
                                                <th>Assigned By</th>
                                                <th>Working Days</th>
                                                <th>Total Salary</th>
                                                <th>Advance</th>
                                                <th>Net Salary</th>
                                                <th>Action By</th>
                                                <th style={{ width: 120 }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previousTimesheets.map((ts) => (
                                                <tr key={ts.timesheetId || ts.id}
                                                    className={`${isSheetReadOnly(ts) ? 'ts-readonly-row' : ''}`}
                                                >
                                                    <td className="text-info fw-bold">
                                                        {ts.timesheetId || ts.id}
                                                    </td>
                                                    <td>
                                                        <strong>
                                                            {formatPeriodLabel(ts.periodKey) || ts.period}
                                                        </strong>

                                                    </td>
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
                                                        <small>{ts.submittedByName || (ts.submittedBy ? nameForUid(ts.submittedBy) : 'Not Submitted')}</small>
                                                        <br></br>
                                                        <small className="text-muted opacity-75">
                                                            {ts.submittedAt ? new Date(ts.submittedAt).toLocaleString('en-IN') : '-'}
                                                        </small>
                                                    </td>

                                                    <td>
                                                        <small>{ts.assignedToName || 'Not Assigned'}</small>
                                                    </td>
                                                    <td>
                                                        <small>{ts.assignedByName || (ts.assignedBy ? nameForUid(ts.assignedBy) : 'Not Assigned')}</small>
                                                        <br></br>
                                                        <small className="text-muted opacity-75">
                                                            {ts.assignedAt ? new Date(ts.assignedAt).toLocaleString('en-IN') : '-'}
                                                        </small>
                                                    </td>

                                                    <td>{ts.workingDays ?? 0}</td>
                                                    <td>₹{Number(ts.totalSalary || 0).toFixed(0)}</td>
                                                    <td className='text-danger'>
                                                        ₹{(function () {
                                                            const advances = ts.advances || ts.advancesTotal || 0;

                                                            // If advances is an object, sum all amounts
                                                            if (advances && typeof advances === 'object') {
                                                                return Object.values(advances).reduce((sum, advance) => {
                                                                    return sum + (parseFloat(advance?.amount) || 0);
                                                                }, 0).toFixed(0);
                                                            }

                                                            // If it's already a number, use it directly
                                                            return Number(advances || 0).toFixed(0);
                                                        })()}
                                                    </td>
                                                    <td className={(() => {
                                                        const totalSalary = Number(ts.totalSalary || 0);
                                                        let totalAdvances = 0;

                                                        // Calculate advances properly
                                                        if (ts.advances && typeof ts.advances === 'object') {
                                                            totalAdvances = Object.values(ts.advances).reduce((sum, advance) => {
                                                                return sum + (parseFloat(advance?.amount) || 0);
                                                            }, 0);
                                                        } else if (ts.advancesTotal) {
                                                            totalAdvances = Number(ts.advancesTotal || 0);
                                                        } else if (ts.advances) {
                                                            totalAdvances = Number(ts.advances || 0);
                                                        }

                                                        const netPayable = totalSalary - totalAdvances;
                                                        return netPayable < 0 ? 'text-danger' : 'text-warning';
                                                    })()}>
                                                        ₹{(function () {
                                                            const totalSalary = Number(ts.totalSalary || 0);
                                                            let totalAdvances = 0;

                                                            // Calculate advances properly
                                                            if (ts.advances && typeof ts.advances === 'object') {
                                                                totalAdvances = Object.values(ts.advances).reduce((sum, advance) => {
                                                                    return sum + (parseFloat(advance?.amount) || 0);
                                                                }, 0);
                                                            } else if (ts.advancesTotal) {
                                                                totalAdvances = Number(ts.advancesTotal || 0);
                                                            } else if (ts.advances) {
                                                                totalAdvances = Number(ts.advances || 0);
                                                            }

                                                            const netPayable = totalSalary - totalAdvances;
                                                            return netPayable.toFixed(0);
                                                        })()}
                                                    </td>
                                                    <td>-</td>
                                                    <td>
                                                        <div className="btn-group btn-group-sm">
                                                            <button
                                                                className="btn btn-outline-info"
                                                                title="Open this timesheet"
                                                                onClick={async () => {
                                                                    if (ts.employeeId && ts.employeeId !== selectedEmployee) {
                                                                        setSelectedEmployee(ts.employeeId);
                                                                    }
                                                                    setTimesheet(ts);
                                                                    setCurrentTimesheetId(ts.timesheetId || ts.id);
                                                                    await loadDailyEntriesByTimesheetId(
                                                                        ts.employeeId || selectedEmployee,
                                                                        ts.timesheetId || ts.id
                                                                    );
                                                                }}
                                                            >
                                                                <i className="bi bi-folder2-open"></i>
                                                            </button>
                                                            <button
                                                                className="btn btn-outline-primary"
                                                                title="Jump to period"
                                                                onClick={() => {
                                                                    if ((ts.periodKey || "").includes("_to_")) {
                                                                        const [s, e] = (ts.periodKey || "").split("_to_");
                                                                        setUseDateRange(true);
                                                                        setStartDate(s);
                                                                        setEndDate(e);
                                                                    } else {
                                                                        setUseDateRange(false);
                                                                        setSelectedMonth(ts.periodKey || (ts.period ?? "").slice(0, 7));
                                                                    }
                                                                }}
                                                            >
                                                                <i className="bi bi-calendar-range"></i>
                                                            </button>

                                                            {/* Delete Button - Only show for non-approved timesheets */}
                                                            {(ts.status === 'draft' || ts.status === 'submitted' || ts.status === 'rejected') && (
                                                                <button
                                                                    className="btn btn-outline-danger"
                                                                    title="Delete Timesheet"
                                                                    onClick={() => { if (!isReadOnly) return; openPrevTsDelete(ts); }}
                                                                    disabled={!isReadOnly}
                                                                >
                                                                    <i className="bi bi-trash"></i>
                                                                </button>
                                                            )}

                                                            {ts.status === "clarification" && (
                                                                <button
                                                                    className="btn btn-outline-warning ms-1"
                                                                    title="Reply to Clarification"
                                                                    onClick={() => openClarifyReply(ts.id)}
                                                                >
                                                                    <i className="bi bi-reply"></i>
                                                                </button>
                                                            )}
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
                            isReadOnly={isReadOnly} // Add this line
                        />
                    )}
                    {/* Always show action buttons when employee is selected */}
                    <div className="row mb-3">
                        <div className="col-12">
                            <button
                                className="btn btn-outline-primary me-2"
                                onClick={saveTimesheet}
                                disabled={isReadOnly || !timesheet || dailyEntries.length === 0 || isSaving || !hasUnsavedChanges}
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
                                disabled={isReadOnly || !timesheet}
                            >
                                <i className="bi bi-magic me-2"></i> Auto-Fill
                            </button>

                            {/* Add Create Timesheet button that's always visible */}
                            <button
                                className="btn btn-outline-info me-2"
                                onClick={handleAddTimesheet}
                                disabled={!selectedEmployee} // Only disable if no employee selected
                            >
                                <i className="bi bi-plus-lg me-2"></i>
                                {timesheet ? 'Create New Timesheet' : 'Create Timesheet'}
                            </button>

                            {timesheet && (
                                <>
                                    {/* Fix the bulk delete button */}
                                    {selectedEntries.length > 0 && (
                                        <button
                                            className="btn btn-outline-danger me-2"
                                            onClick={handleBulkDelete}
                                            disabled={isReadOnly}
                                        >
                                            <i className="bi bi-trash me-2"></i>
                                            Delete Selected ({selectedEntries.length})
                                        </button>
                                    )}



                                    {/* Add missing modal handlers */}
                                    {showReadOnlyModal && (
                                        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }}>
                                            <div className="modal-dialog modal-dialog-centered">
                                                <div className="modal-content bg-dark border border-warning">
                                                    <div className="modal-header border-warning">
                                                        <h5 className="modal-title text-warning">
                                                            <i className="fas fa-lock me-2"></i>
                                                            Action Restricted
                                                        </h5>
                                                        <button
                                                            type="button"
                                                            className="btn-close btn-close-white"
                                                            onClick={() => setShowReadOnlyModal(false)}
                                                        ></button>
                                                    </div>
                                                    <div className="modal-body">
                                                        <div className="alert alert-warning bg-warning bg-opacity-10 border-warning text-white">
                                                            <strong>This action is not permitted for your role.</strong>
                                                        </div>
                                                        <p className="text-white">
                                                            {timesheet?.status === 'approved' || timesheet?.status === 'rejected' ? (
                                                                <>This timesheet has been <strong>{timesheet.status}</strong> and cannot be modified by anyone.</>
                                                            ) : timesheet?.status === 'submitted' || timesheet?.status === 'assigned' ? (
                                                                <>This timesheet is <strong>{timesheet.status}</strong>. Only <strong>{timesheet.assignedToName || 'the assigned user'}</strong> can make modifications.</>
                                                            ) : (
                                                                <>This timesheet is in <strong>draft</strong> status. Only <strong>{timesheet.createdByName || 'the creator'}</strong> can make modifications.</>
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div className="modal-footer">
                                                        <button
                                                            type="button"
                                                            className="btn btn-secondary"
                                                            onClick={() => setShowReadOnlyModal(false)}
                                                        >
                                                            <i className="fas fa-times me-1"></i>
                                                            Close
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Edit Confirmation Modal for Submitted Timesheets */}
                                    {showEditConfirmModal && pendingEditAction && (
                                        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }}>
                                            <div className="modal-dialog modal-dialog-centered">
                                                <div className="modal-content bg-dark border border-warning">
                                                    <div className="modal-header border-warning">
                                                        <h5 className="modal-title text-warning">
                                                            <i className="fas fa-exclamation-triangle me-2"></i>
                                                            Confirm Action
                                                        </h5>
                                                        <button
                                                            type="button"
                                                            className="btn-close btn-close-white"
                                                            onClick={() => {
                                                                setShowEditConfirmModal(false);
                                                                setPendingEditAction(null);
                                                            }}
                                                        ></button>
                                                    </div>
                                                    <div className="modal-body">
                                                        <div className="alert alert-warning bg-warning bg-opacity-10 border-warning text-white">
                                                            <strong>This timesheet is {timesheet?.status}.</strong>
                                                        </div>
                                                        <p className="text-white">
                                                            Are you sure you want to {pendingEditAction.type} this entry?
                                                            This action will be recorded in the audit trail.
                                                        </p>
                                                        {pendingEditAction.entry && (
                                                            <div className="bg-dark border border-secondary rounded p-2">
                                                                <small className="text-muted">Entry Date: {pendingEditAction.entry.date}</small>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="modal-footer">
                                                        <button
                                                            type="button"
                                                            className="btn btn-secondary"
                                                            onClick={() => {
                                                                setShowEditConfirmModal(false);
                                                                setPendingEditAction(null);
                                                            }}
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-warning"
                                                            onClick={() => {
                                                                if (pendingEditAction.type === 'edit') {
                                                                    handleConfirmedEdit(pendingEditAction.entry);
                                                                } else if (pendingEditAction.type === 'delete') {
                                                                    handleConfirmedDelete(pendingEditAction.entry);
                                                                }
                                                                setShowEditConfirmModal(false);
                                                                setPendingEditAction(null);
                                                            }}
                                                        >
                                                            Confirm {pendingEditAction.type === 'edit' ? 'Edit' : 'Delete'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        className="btn btn-outline-danger"
                                        onClick={() => {
                                            if (isReadOnly) {
                                                showModal('Locked', `This timesheet is ${timesheet?.status}. Editing is disabled.`, 'warning');
                                                return;
                                            }
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
                                        disabled={isReadOnly}
                                    >
                                        <i className="bi bi-x-circle me-2"></i> Clear Entries
                                    </button>

                                    <button
                                        className="btn btn-success ms-2"
                                        onClick={submitTimesheet}
                                        disabled={isReadOnly || timesheet?.status === 'submitted' || showSubmittedError || dailyEntries.length === 0}
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
                                timesheet={timesheet}
                                onEdit={handleEditEntry}  // Use the fixed handler
                                onDelete={handleDeleteEntry} // Use the fixed handler
                                totalSalary={totalSalary}
                                isDisabled={!timesheet || showSubmittedError}
                                isReadOnly={isReadOnly}
                                selectedEntries={selectedEntries}
                                onSelectEntry={handleSelectEntry}
                                onSelectAllEntries={handleSelectAllEntries}
                                employees={employees}
                                selectedEmployee={selectedEmployee}
                                advances={advances}
                                previousTimesheets={previousTimesheets}
                                whoSafe={whoSafe}
                                authContext={authContext}
                                canUserEditTimesheet={canUserEditTimesheet}
                                setPendingEditAction={setPendingEditAction}
                                setShowEditConfirmModal={setShowEditConfirmModal}
                                isSubmittedLike={isSubmittedLike}
                                setShowReadOnlyModal={setShowReadOnlyModal} // Add this
                                showReadOnlyModal={showReadOnlyModal}
                            />
                        </div>
                        <div className="col-lg-4">
                            <AdvanceManagement
                                employeeId={selectedEmployee}
                                timesheetId={timesheet?.timesheetId || ''}
                                advances={advances}
                                onAdvanceAdded={loadAdvances}
                                currentUser={currentUser}
                                isDisabled={!timesheet || showSubmittedError || isReadOnly}
                                isReadOnly={isReadOnly}
                                // NEW
                                isAssignee={isAssignee}
                                submittedLike={submittedLikeNow}
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
                                    <strong className='text-white'>
                                        Delete timesheet <span className="text-warning">&nbsp; {prevTsToDelete?.period} </span> &nbsp; for
                                        &nbsp; <span className="text-warning"> {prevTsToDelete?.employeeName}</span>?
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
                                <div className="alert alert-warning bg-warning bg-opacity-10 border-warning text-white">
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

                                            // 3) if the deleted one is the one on screen, clear view
                                            if (timesheet?.id === id) {
                                                setTimesheet(null);
                                                setDailyEntries([]);
                                            }

                                            setShowDeleteTsModal(false);
                                            setTsToDelete(null);
                                            await loadPreviousTimesheets();
                                        } catch (err) {
                                            showModal('Failed to delete. Please try again.');
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
                                <div className="alert alert-warning bg-warning bg-opacity-10 border-warning text-white">
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
                                                    placeholder="Search user by name or email..."
                                                    value={userSearch}
                                                    onChange={(e) => {
                                                        setUserSearch(e.target.value);
                                                        setAssignTo(''); // Clear selection when searching
                                                    }}
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
                                            const end = new Date(useDateRange ? endDate : endOfMonth(selectedMonth));
                                            const employee = employees.find(emp => emp.id === selectedEmployee);
                                            const client = clients.find(c => c.id === selectedClientId) || clients[0];
                                            const emp = employees.find(e => e.id === selectedEmployee);

                                            // Get current period information
                                            const currentPeriod = useDateRange ? `${startDate} to ${endDate}` : selectedMonth;

                                            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                                                const dateStr = d.toISOString().slice(0, 10);
                                                const { uid, name } = whoSafe();
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
                                                    updatedBy: uid,
                                                    updatedByName: name,
                                                    isEmergency: false,
                                                    notes: 'Auto-filled',
                                                    period: currentPeriod, // ✅ Use computed currentPeriod
                                                    periodKey: periodKey // ✅ Use computed periodKey
                                                });
                                            }


                                            setShowAutoFillModal(false);
                                        } catch (err) {
                                            showModal('Auto-fill failed. Please try again.');
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
                                <div className="alert alert-warning bg-warning bg-opacity-10 border-warning text-white">
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

            {showClarifyReplyModal && (
                <div className="modal d-block" tabIndex="-1" role="dialog">
                    <div className="modal-dialog" role="document">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Reply to clarification</h5>
                                <button type="button" className="btn-close" onClick={() => setShowClarifyReplyModal(false)} />
                            </div>
                            <div className="modal-body">
                                <textarea
                                    className="form-control"
                                    rows={4}
                                    value={clarifyText}
                                    onChange={(e) => setClarifyText(e.target.value)}
                                    placeholder="Type your reply..."
                                />
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowClarifyReplyModal(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={submitClarifyReply}>Post Reply</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

// Timesheet Summary Component with Employee Photo - FIXED
// Timesheet Summary Component with Employee Photo - FIXED
const TimesheetSummary = ({ timesheet, advances, employee, currentUser, isReadOnly }) => {
    // Calculate total advances properly
    const calculateTotalAdvances = () => {
        if (!timesheet && !advances) return 0;

        // Use advances prop if available (preferred)
        if (advances && advances.length > 0) {
            return advances.reduce((sum, advance) => {
                const amount = parseFloat(advance?.amount) || 0;
                return sum + amount;
            }, 0);
        }

        // Fallback to timesheet data
        const advancesData = timesheet?.advances || timesheet?.advancesTotal || 0;

        if (advancesData && typeof advancesData === 'object') {
            return Object.values(advancesData).reduce((sum, advance) => {
                return sum + (parseFloat(advance?.amount) || 0);
            }, 0);
        }

        return Number(advancesData || 0);
    };



    const totalAdvances = calculateTotalAdvances();
    const totalSalary = Number(timesheet.totalSalary || 0);
    const netPayable = totalSalary - totalAdvances;

    // Format period properly - use timesheet's actual period data
    const formatDisplayPeriod = () => {
        if (!timesheet) return '';

        // Priority 1: Use periodKey if available
        if (timesheet.periodKey) {
            if (timesheet.periodKey.includes('_to_')) {
                const [s, e] = timesheet.periodKey.split('_to_');
                const [sy, sm, sd] = s.split('-');
                const [ey, em, ed] = e.split('-');
                const smon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(sm, 10) - 1];
                const emon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(em, 10) - 1];
                const yy = String(ey).slice(-2);
                return `${smon}-${sd} to ${emon}-${ed} '${yy}`;
            } else {
                // Monthly format (YYYY-MM)
                return monthShort(timesheet.periodKey);
            }
        }

        // Priority 2: Use period field
        if (timesheet.period) {
            return timesheet.period;
        }

        // Fallback: Use startDate and endDate
        if (timesheet.startDate && timesheet.endDate) {
            const start = new Date(timesheet.startDate);
            const end = new Date(timesheet.endDate);
            const smon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][start.getMonth()];
            const emon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][end.getMonth()];
            const yy = String(end.getFullYear()).slice(-2);
            return `${smon}-${start.getDate()} to ${emon}-${end.getDate()} '${yy}`;
        }

        return 'Period not specified';
    };

    const monthShort = (yyyyMm) => {
        if (!/^\d{4}-\d{2}$/.test(yyyyMm)) return yyyyMm || '';
        const [y, m] = yyyyMm.split('-');
        const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(m, 10) - 1] || m;
        return `${month}-${String(y).slice(-2)}`;
    };

    const displayPeriod = formatDisplayPeriod();

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
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        const fallback = e.target.nextSibling;
                                        if (fallback) fallback.style.display = 'flex';
                                    }}
                                />
                            ) : null}

                            <div>
                                <h5 className="card-title mb-0 text-info">
                                    Timesheet Summary - {timesheet.employeeName}
                                </h5>
                                <small className="text-warning">
                                    <strong>Period:</strong> {displayPeriod}
                                </small>
                            </div>
                        </div>

                        <div className="mb-2 text-center">
                            <small className="text-muted me-3">Timesheet ID:</small>
                            <br />
                            <span className="badge bg-warning">{timesheet.timesheetId || timesheet.id}</span>
                        </div>
                        <span className={`badge ${timesheet.status === 'draft' ? 'bg-warning' :
                            timesheet.status === 'submitted' ? 'bg-info' :
                                timesheet.status === 'approved' ? 'bg-success' : 'bg-secondary'
                            }`}>
                            {timesheet.status?.toUpperCase()}
                        </span>
                    </div>

                    <div className="card-body">
                        {/* Detailed Breakdown - Salary & Attendance */}
                        <div className="row">
                            {/* Attendance Summary */}
                            <div className="col-lg-6 mb-4">
                                <div className="card bg-secondary bg-opacity-10 border-secondary h-100">
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
                                                    <div className="text-success h4 mb-0">{timesheet.workingDays || 0}</div>
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

                            {/* Salary Breakdown - FIXED with proper advance deduction */}
                            <div className="col-lg-6 mb-4">
                                <div className="card bg-secondary bg-opacity-10 border-secondary h-100">
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
                                                    <div className="text-success h5 mb-0">₹{totalSalary.toFixed(2)}</div>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="bg-danger bg-opacity-10 rounded p-3 border border-danger text-center">
                                                    <small className="text-muted d-block">Advances</small>
                                                    <div className="text-danger h5 mb-0">₹{totalAdvances.toFixed(0)}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Net Payable Highlight - FIXED with proper calculation */}
                                        <div className="mt-4 p-3 bg-warning bg-opacity-10 rounded border border-warning">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <div>
                                                    <span className="text-white h6 mb-0">Net Payable Amount</span>
                                                    <br />
                                                    <small className="text-muted">Total Salary - Advances</small>
                                                </div>
                                                <span className={netPayable < 0 ? 'text-danger h4 mb-0' : 'text-warning h4 mb-0'}>
                                                    ₹{netPayable.toFixed(0)}
                                                </span>
                                            </div>
                                            {netPayable < 0 && (
                                                <div className="mt-2 alert alert-danger bg-danger bg-opacity-10 border-danger py-1">
                                                    <small className="text-danger">
                                                        <i className="bi bi-exclamation-triangle me-1"></i>
                                                        Negative balance: Employee owes money
                                                    </small>
                                                </div>
                                            )}
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
    timesheetId,
    timesheet,
    onEdit, // Make sure this is included
    onDelete,
    totalSalary,
    isDisabled,
    isReadOnly,
    selectedEntries,
    onSelectEntry,
    onSelectAllEntries,
    employees = [],
    selectedEmployee = '',
    advances = [],
    previousTimesheets = [],
    whoSafe,
    authContext,
    canUserEditTimesheet,
    setPendingEditAction,
    setShowEditConfirmModal,
    isSubmittedLike,

}) => {
    const [showShareView, setShowShareView] = useState(false);
    const { user: authUser } = useAuth(); // Get current logged-in user from auth context
    const [showReadOnlyModal, setShowReadOnlyModal] = useState(false);

    // Add these state variables inside the DailyEntriesTable component
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [currentNote, setCurrentNote] = useState('');
    const [isShareDataReady, setIsShareDataReady] = useState(false);


    useEffect(() => {
        if (entries?.length > 0 && timesheet) { // Changed from dailyEntries and currentTimesheet
            setIsShareDataReady(true);
        } else {
            setIsShareDataReady(false);
        }
    }, [entries, timesheet]);

    // Helper to check if current user can edit a specific entry
    const canEditEntry = () => {
        if (!isReadOnly) return true;
        const { uid } = whoSafe();
        return timesheet?.assignedTo === uid; // assignee can edit
    };
    const canEditNow = canUserEditTimesheet(timesheet, whoSafe().uid, authContext);
    const rowDeleteDisabled = !canEditNow;

    return (
        <div className="card bg-dark border-secondary">
            <div className="card-header bg-info bg-opacity-25 border-info d-flex justify-content-between align-items-center">
                <div>
                    <h5 className="card-title mb-0 text-white">
                        <i className="fas fa-calendar-day me-2"></i>
                        Daily Entries ({entries.length})
                    </h5>
                    {timesheetId && (
                        <div className="mt-1">
                            <small className="text-warning me-3">
                                <strong>Timesheet ID:</strong> {timesheetId}
                            </small>
                            <small className="text-info">
                                <strong>Status:</strong> {timesheet?.status || "draft"}
                            </small>
                            {isReadOnly && timesheet?.assignedTo && (
                                <small className="text-warning ms-3">
                                    <strong>Assigned To:</strong> {timesheet.assignedToName || timesheet.assignedTo}
                                </small>
                            )}
                        </div>
                    )}
                </div>
                <div className="text-end">
                    {selectedEntries.length > 0 && (
                        <span className="badge bg-primary">
                            {selectedEntries.length} selected
                        </span>
                    )}
                </div>

                <button
                    className="btn btn-info ms-2"
                    onClick={() => {
                        setShowShareView(true);
                    }}
                >
                    <i className="bi bi-share me-2"></i>
                    Share Timesheet
                </button>
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
                                        checked={
                                            selectedEntries.length === entries.length &&
                                            entries.length > 0
                                        }
                                        onChange={onSelectAllEntries}
                                        disabled={isDisabled || isReadOnly}
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
                                            onChange={() => {
                                                const { uid } = whoSafe();
                                                const canEdit = canUserEditTimesheet(timesheet, uid, authContext);

                                                if (!canEdit) {
                                                    setShowReadOnlyModal(true);
                                                    return;
                                                }
                                                onSelectEntry(e);
                                            }}
                                            disabled={isDisabled || (isReadOnly && !canEditEntry(e))}
                                            value={e.date}
                                        />
                                    </td>
                                    <td>
                                        <small className="text-info">
                                            {new Date(e.date).toLocaleDateString("en-IN", {
                                                weekday: "short",
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
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
                                        <span
                                            className={`badge ${e.isEmergency
                                                ? "bg-danger"
                                                : e.status === "present"
                                                    ? "bg-success"
                                                    : e.status === "leave"
                                                        ? "bg-warning"
                                                        : e.status === "absent"
                                                            ? "bg-info"
                                                            : e.status === "holiday"
                                                                ? "bg-primary"
                                                                : "bg-secondary"
                                                }`}
                                        >
                                            {e.isEmergency ? "Emergency" : e.status}
                                        </span>
                                        {e.isHalfDay && !e.isEmergency && (
                                            <span className="badge bg-info ms-1">½</span>
                                        )}
                                        {e.isPublicHoliday && !e.isEmergency && (
                                            <span className="badge bg-primary ms-1">Holiday</span>
                                        )}
                                    </td>
                                    <td
                                        className={
                                            e.dailySalary === 0
                                                ? "text-danger"
                                                : e.isHalfDay
                                                    ? "text-warning"
                                                    : "text-success"
                                        }
                                    >
                                        ₹{e.dailySalary?.toFixed(2)}
                                    </td>
                                    <td>
                                        <small className="text-muted">
                                            By {e.updatedByName || e.createdByName || "System"}
                                        </small>
                                        <br />
                                        <small className="text-white opacity-50 small-text">
                                            {e.updatedAt
                                                ? new Date(e.updatedAt).toLocaleString("en-IN")
                                                : e.createdAt
                                                    ? new Date(e.createdAt).toLocaleString("en-IN")
                                                    : ""}
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
                                            {/* EDIT Button */}
                                            <button
                                                className="btn btn-outline-warning btn-sm"
                                                onClick={() => {
                                                    const { uid } = whoSafe();
                                                    const canEdit = canUserEditTimesheet(timesheet, uid, authContext);

                                                    if (!canEdit) {
                                                        setShowReadOnlyModal(true);
                                                        return;
                                                    }

                                                    // If we can edit, proceed with edit action
                                                    if (isSubmittedLike(timesheet?.status)) {
                                                        // Show confirmation modal for submitted timesheets
                                                        setPendingEditAction({ type: 'edit', entry: e });
                                                        setShowEditConfirmModal(true);
                                                    } else {
                                                        // Direct edit for draft timesheets
                                                        onEdit(e);
                                                    }
                                                }}
                                                title="Edit Entry"
                                            >
                                                <i className="bi bi-pencil"></i>
                                            </button>

                                            {/* DELETE Button */}
                                            <button
                                                className="btn btn-outline-danger btn-sm"
                                                onClick={() => {
                                                    const { uid } = whoSafe();
                                                    const canDelete = canUserEditTimesheet(timesheet, uid, authContext);

                                                    if (!canDelete) {
                                                        setShowReadOnlyModal(true);
                                                        return;
                                                    }

                                                    // If we can delete, proceed with delete action
                                                    if (isSubmittedLike(timesheet?.status)) {
                                                        // Show confirmation modal for submitted timesheets
                                                        setPendingEditAction({ type: 'delete', entry: e });
                                                        setShowEditConfirmModal(true);
                                                    } else {
                                                        // Direct delete for draft timesheets
                                                        onDelete(e);
                                                    }
                                                }}
                                                disabled={timesheet?.status === 'approved' || timesheet?.status === 'rejected'}
                                                title={timesheet?.status === 'approved' || timesheet?.status === 'rejected' ?
                                                    'Cannot delete approved/rejected timesheet' : 'Delete Entry'}
                                            >
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
                <div
                    className="modal fade show"
                    style={{ display: "block", backgroundColor: "rgba(0,0,0,0.8)" }}
                >
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
                                <div className="text-white" style={{ whiteSpace: "pre-wrap" }}>
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

            {showShareView && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.9)' }}>
                    <div className="modal-dialog modal-fullscreen">
                        <div className="modal-content bg-light">
                            <div className="modal-body p-0">
                                <TimesheetShare
                                    timesheet={timesheet}
                                    dailyEntries={entries}
                                    advances={advances}
                                    employee={employees.find(emp => emp.id === selectedEmployee)}
                                    previousTimesheets={previousTimesheets}
                                    onClose={() => setShowShareView(false)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {showReadOnlyModal && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content bg-dark border border-warning">
                            <div className="modal-header border-warning">
                                <h5 className="modal-title text-warning">
                                    <i className="fas fa-lock me-2"></i>
                                    Action Restricted
                                </h5>
                            </div>
                            <div className="modal-body">
                                <div className="alert alert-warning bg-warning bg-opacity-10 border-warning text-white">
                                    <strong>This action is not permitted for your role.</strong>
                                </div>
                                <p className="text-white">
                                    {timesheet?.status === 'approved' || timesheet?.status === 'rejected' ? (
                                        <>This timesheet has been <strong>{timesheet.status}</strong> and cannot be modified by anyone.</>
                                    ) : timesheet?.status === 'submitted' || timesheet?.status === 'assigned' ? (
                                        <>This timesheet is <strong>{timesheet.status}</strong>. Only <strong>{timesheet.assignedToName || 'the assigned user'}</strong> can make modifications.</>
                                    ) : (
                                        <>This timesheet is in <strong>draft</strong> status. Only <strong>{timesheet.createdByName || 'the creator'}</strong> can make modifications.</>
                                    )}
                                </p>
                                {timesheet?.assignedTo && (timesheet.status === 'submitted' || timesheet.status === 'assigned') && (
                                    <div className="mt-3 p-2 bg-dark border border-secondary rounded">
                                        <small className="text-muted">
                                            <strong>Assigned To:</strong> {timesheet.assignedToName || timesheet.assignedTo}
                                            {timesheet.assignedAt && (
                                                <> on {new Date(timesheet.assignedAt).toLocaleString('en-IN')}</>
                                            )}
                                        </small>
                                    </div>
                                )}
                                {timesheet?.createdBy && timesheet.status === 'draft' && (
                                    <div className="mt-3 p-2 bg-dark border border-secondary rounded">
                                        <small className="text-muted">
                                            <strong>Created By:</strong> {timesheet.createdByName || timesheet.createdBy}
                                            {timesheet.createdAt && (
                                                <> on {new Date(timesheet.createdAt).toLocaleString('en-IN')}</>
                                            )}
                                        </small>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowReadOnlyModal(false)}
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
export default DisplayTimeSheet;