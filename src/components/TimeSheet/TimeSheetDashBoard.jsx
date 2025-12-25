import React, { useState, useEffect } from 'react';
import firebaseDB from '../../firebase';
import { getAuth } from 'firebase/auth';
import { useAuth } from "../../context/AuthContext";

export default function TimeSheetDashBoard() {
    // State declarations
    const [timesheets, setTimesheets] = useState([]);
    const [filteredTimesheets, setFilteredTimesheets] = useState([]);
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('all');
    const [selectedTimesheet, setSelectedTimesheet] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [clarificationText, setClarificationText] = useState('');
    const [rejectionText, setRejectionText] = useState('');
    const [showClarificationInput, setShowClarificationInput] = useState(false);
    const [showRejectionInput, setShowRejectionInput] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const PENDING_STATUSES = ['submitted', 'clarification', 'assigned'];

    const TS_ROOT = "EmployeeTimesheets";

    const empTsRoot = (empId) =>
        `${TS_ROOT}/${empId}/timesheets`;

    const empTsById = (empId, tsId) =>
        `${TS_ROOT}/${empId}/timesheets/${tsId}`;

    const empEntriesNode = (empId, tsId) =>
        `${TS_ROOT}/${empId}/timesheets/${tsId}/dailyEntries`;

    const empAdvancesNode = (empId, tsId) =>
        `${TS_ROOT}/${empId}/timesheets/${tsId}/advances`;


    // Merge two advance arrays and de-dupe by id or (date+amount+desc) fallback
    const mergeAdvances = (a = [], b = []) => {
        const key = (x) => x.id || `${x.date}|${x.amount}|${x.description || ''}`;
        const map = new Map();
        [...a, ...b].forEach((x) => map.set(key(x), x));
        return Array.from(map.values());
    };

    // Sum only approved (default) or all
    const sumAdvances = (list = [], { approvedOnly = true } = {}) => {
        return list.reduce((acc, it) => {
            const valid =
                !approvedOnly ? true : (it.status ? it.status === 'approved' : true);
            const amt = Number(it.amount) || 0;
            return acc + (valid ? amt : 0);
        }, 0);
    };

    // Auth context (PRIMARY source of truth)
    const authCtx = useAuth();
    const authUserCtx = authCtx?.user || null;



    const prettyName = (u) =>
        u?.displayName || u?.name || u?.dbName || u?.fullName || u?.username || u?.email || null;

    // Pull a user profile by UID from known locations
    const getUserProfileByUid = async (uid) => {
        if (!uid) return null;
        // /Users/{uid}
        try {
            const direct = await firebaseDB.child(`Users/${uid}`).get();
            if (direct.exists()) return { ...direct.val(), _source: 'Users/{uid}' };
        } catch { }
        // scan /Users
        try {
            const all = await firebaseDB.child('Users').get();
            if (all.exists()) {
                const obj = all.val() || {};
                for (const [id, u] of Object.entries(obj)) {
                    if (id === uid || u?.uid === uid || u?.authUid === uid) {
                        return { id, ...u, _source: 'Users scan' };
                    }
                }
            }
        } catch { }
        return null;
    };

    // Resolve acting user: AuthContext → Firebase Auth → localStorage → Users index → DB
    const resolveActor = async (usersIdx) => {
        try {
            const auth = getAuth();
            const authUser = auth?.currentUser || null;

            // 1) AuthContext (PRIMARY like DisplayTimeSheet)
            const fromCtx = authUserCtx ? {
                uid: authUserCtx.uid,
                displayName: prettyName(authUserCtx),
                email: authUserCtx.email,
                role: authUserCtx.role
            } : null;

            // 2) Firebase Auth
            const fromAuth = authUser ? {
                uid: authUser.uid,
                displayName: prettyName(authUser),
                email: authUser.email
            } : null;

            // 3) LocalStorage
            const lsCurrentUser = (() => { try { return JSON.parse(localStorage.getItem('currentUser')); } catch { return null; } })();
            const fromLS = lsCurrentUser ? {
                uid: lsCurrentUser.uid,
                displayName: prettyName(lsCurrentUser),
                email: lsCurrentUser.email
            } : null;

            let base = fromCtx || fromAuth || fromLS || { uid: 'admin', displayName: null, email: null };

            // 4) If name missing, try the Users index / DB
            if (!base.displayName || base.displayName === 'Admin User') {
                let profile =
                    usersIdx.byUid[base.uid] ||
                    usersIdx.byAuthUid[base.uid] ||
                    usersIdx.byId[base.uid] || null;

                if (!profile) profile = await getUserProfileByUid(base.uid);

                if (profile) {
                    base = {
                        ...base,
                        displayName: prettyName(profile) || 'Admin User',
                        role: profile.role || base.role,
                        photoURL: profile.photoURL || base.photoURL,
                        _nameSource: profile._source || 'usersIndex',
                    };
                } else {
                    base.displayName = 'Admin User';
                    base._nameSource = 'no-profile-fallback';
                }
            } else {
                base._nameSource = fromCtx ? 'authContext' : (fromAuth ? 'firebaseAuth' : 'localStorage');
            }

            return base;
        } catch (e) {
            return { uid: 'admin', displayName: 'Admin User', email: null, _nameSource: 'error-fallback' };
        }
    };

    const [usersIndex, setUsersIndex] = useState({
        byId: {},      // key = db node id
        byUid: {},     // key = user.uid
        byAuthUid: {}, // key = user.authUid
    });



    // Initialize current user and years
    useEffect(() => {
        const initializeUser = async () => {
            const picked = await resolveActor(usersIndex);
            setCurrentUser(picked);
            const current = new Date();
            setSelectedYear(current.getFullYear().toString());
        };
        initializeUser();
    }, [usersIndex, authUserCtx]);


    useEffect(() => {
        fetchTimesheets();
    }, []);

    // Filter timesheets when year/month/search/status changes
    useEffect(() => {
        filterTimesheets();
        setCurrentPage(1); // Reset to first page when filters change
    }, [timesheets, selectedYear, selectedMonth, searchTerm, statusFilter]);

    const pushClarifyLog = async (employeeId, tsId, entry) => {
        const base = `${empTsById(employeeId, tsId)}/clarificationRequest`;
        const logRef = firebaseDB.child(`${base}/log`).push();

        // Robust id—always use the push() key; fall back if any issue.
        const id = logRef.key || `k_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const payload = { id, ...entry };

        // 1) Actually create a new child under /log/<id>
        await logRef.set(payload);

        // 2) Update "latest" convenience fields without touching the object
        const latest = {};
        if (entry.type === 'request') {
            latest[`${base}/text`] = entry.text;
            latest[`${base}/requestedById`] = entry.byId;
            latest[`${base}/requestedByName`] = entry.byName;
            latest[`${base}/requestedAt`] = entry.at;
            latest[`${base}/resolved`] = false;
        } else if (entry.type === 'reply') {
            latest[`${base}/replyText`] = entry.text;
            latest[`${base}/repliedBy`] = entry.byId;
            latest[`${base}/repliedByName`] = entry.byName;
            latest[`${base}/repliedAt`] = entry.at;
        }
        await firebaseDB.update(latest);

    };



    const fetchTimesheets = async () => {
        setLoading(true);
        try {
            const allTimesheets = [];

            // loop all employees who have timesheets
            const empSnap = await firebaseDB.child(TS_ROOT).once('value');
            if (empSnap.exists()) {
                const empObj = empSnap.val();

                Object.entries(empObj).forEach(([employeeId, empData]) => {
                    const sheets = empData?.timesheets || {};
                    Object.entries(sheets).forEach(([timesheetId, ts]) => {
                        if (ts.status && ts.status !== 'draft') {
                            allTimesheets.push({
                                id: timesheetId,
                                employeeId,
                                employeeName: ts.employeeName || ts.employeeDisplayName || employeeId,
                                ...ts
                            });
                        }
                    });
                });
            }

            setTimesheets(allTimesheets);
        } catch (err) {
            console.error("Error fetching timesheets:", err);
        } finally {
            setLoading(false);
        }
    };


    const filterTimesheets = () => {
        let filtered = timesheets;

        // Filter by year
        if (selectedYear) {
            filtered = filtered.filter(timesheet => {
                let sheetYear;
                if (timesheet.period && timesheet.period.includes('-')) {
                    sheetYear = timesheet.period.split('-')[0];
                } else if (timesheet.startDate) {
                    sheetYear = timesheet.startDate.split('-')[0];
                } else {
                    return false;
                }
                return sheetYear === selectedYear;
            });
        }

        // Filter by month (if not 'all')
        if (selectedMonth !== 'all') {
            filtered = filtered.filter(timesheet => {
                let sheetMonth;
                if (timesheet.period && timesheet.period.includes('-')) {
                    sheetMonth = timesheet.period.split('-')[1];
                } else if (timesheet.startDate) {
                    sheetMonth = timesheet.startDate.split('-')[1];
                } else {
                    return false;
                }
                return sheetMonth === selectedMonth;
            });
        }

        // Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(timesheet =>
                timesheet.employeeName?.toLowerCase().includes(term) ||
                timesheet.employeeData?.employeeId?.toLowerCase().includes(term) ||
                timesheet.employeeData?.idNo?.toLowerCase().includes(term) ||
                timesheet.period?.toLowerCase().includes(term) ||
                timesheet.id?.toLowerCase().includes(term)
            );
        }

        // Filter by status
        // Filter by status
        if (statusFilter !== 'all') {
            if (statusFilter === 'pending') {
                filtered = filtered.filter(ts => PENDING_STATUSES.includes(ts.status));
            } else {
                filtered = filtered.filter(ts => ts.status === statusFilter);
            }
        }


        setFilteredTimesheets(filtered);
    };

    const getTimesheetCountForMonth = (monthNumber) => {
        if (monthNumber === 'all') {
            return timesheets.filter(ts => {
                const sheetYear = ts.period?.split('-')[0] || ts.startDate?.split('-')[0];
                return sheetYear === selectedYear;
            }).length;
        }

        return timesheets.filter(ts => {
            const sheetYear = ts.period?.split('-')[0] || ts.startDate?.split('-')[0];
            const sheetMonth = ts.period?.split('-')[1] || ts.startDate?.split('-')[1];
            return sheetYear === selectedYear && sheetMonth === monthNumber;
        }).length;
    };

    const getAvailableYears = () => {
        const years = new Set();
        timesheets.forEach(timesheet => {
            if (timesheet.period && timesheet.period.includes('-')) {
                years.add(timesheet.period.split('-')[0]);
            } else if (timesheet.startDate) {
                years.add(timesheet.startDate.split('-')[0]);
            }
        });
        return Array.from(years).sort((a, b) => b - a);
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            draft: { class: 'bg-warning text-dark', text: 'Draft' },
            submitted: { class: 'bg-info text-white', text: 'Submitted' },
            approved: { class: 'bg-success text-white', text: 'Approved' },
            rejected: { class: 'bg-danger text-white', text: 'Rejected' },
            clarification: { class: 'bg-warning text-dark', text: 'Needs Clarification' },
            assigned: { class: 'bg-primary text-white', text: 'Assigned' }
        };

        const config = statusConfig[status] || { class: 'bg-secondary text-white', text: status };
        return <span className={`badge ${config.class}`}>{config.text}</span>;
    };

    // Format period display
    const formatPeriod = (timesheet) => {
        if (timesheet.period && timesheet.period.includes('-')) {
            const [year, month] = timesheet.period.split('-');
            const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('en', { month: 'short' });
            return `${monthName}-${year.slice(-2)}`;
        } else if (timesheet.startDate && timesheet.endDate) {
            const startDate = new Date(timesheet.startDate);
            const endDate = new Date(timesheet.endDate);

            const startMonth = startDate.toLocaleString('en', { month: 'short' });
            const endMonth = endDate.toLocaleString('en', { month: 'short' });
            const startDay = startDate.getDate();
            const endDay = endDate.getDate();
            const year = startDate.getFullYear().toString().slice(-2);

            if (startMonth === endMonth) {
                return `${startMonth}-${startDay} to ${endDay} '${year}`;
            } else {
                return `${startMonth}-${startDay} to ${endMonth}-${endDay} '${year}`;
            }
        }
        return timesheet.period || 'N/A';
    };

    // Format timestamp with time if available
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'N/A';

        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return 'N/A';

        // Check if time component exists (not midnight)
        const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0;

        if (hasTime) {
            return date.toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } else {
            return date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        }
    };

    const handleViewDetails = async (timesheetId, employeeId) => {
        setLoading(true);
        try {
           const snapshot = await firebaseDB
  .child(empTsById(employeeId, timesheetId))
  .once('value');
            if (snapshot.exists()) {
                const timesheetData = snapshot.val();

                // Fetch daily entries from the same path
                const entriesSnapshot = await firebaseDB
  .child(empEntriesNode(employeeId, timesheetId))
  .once('value');

                let dailyEntries = [];
                if (entriesSnapshot.exists()) {
                    dailyEntries = Object.entries(entriesSnapshot.val()).map(([date, entry]) => ({
                        id: date,
                        date: date,
                        ...entry
                    })).sort((a, b) => new Date(a.date) - new Date(b.date));
                }

                // Fetch advances
                // --- Fetch advances from two places and merge ---
                let advancesGlobal = [];
                let advancesUnderTs = [];

                // 1) Global /Advances by timesheetId (legacy)
                try {
                    const advSnapGlobal = await firebaseDB
                        .child('Advances')
                        .orderByChild('timesheetId')
                        .equalTo(timesheetId)
                        .once('value');

                    if (advSnapGlobal.exists()) {
                        advancesGlobal = Object.values(advSnapGlobal.val());
                    }
                } catch (e) {
                    console.warn('Global advances fetch failed', e);
                }

                try {
                 const advSnapTs = await firebaseDB
  .child(empAdvancesNode(employeeId, timesheetId))
  .once('value');

                    if (advSnapTs.exists()) {
                        const raw = advSnapTs.val();
                        // entries may be an object keyed by an id
                        advancesUnderTs = Object.entries(raw).map(([id, v]) => ({ id, ...v }));
                    }
                } catch (e) {
                    console.warn('Timesheet-path advances fetch failed', e);
                }

                // Merge and normalize
                const advances = mergeAdvances(advancesGlobal, advancesUnderTs).map((a) => ({
                    ...a,
                    amount: Number(a.amount) || 0,
                    status: a.status || 'approved', // default to approved if not set
                }));

                // Compute totals
                const advancesApprovedTotal = sumAdvances(advances, { approvedOnly: true });
                const advancesAllTotal = sumAdvances(advances, { approvedOnly: false });

                // Recompute net payable if missing or stale
                const totalSalary = Number(timesheetData.totalSalary) || 0;
                const recomputedNet = totalSalary - advancesApprovedTotal;


                // Fetch employee data
               
                const employeeData = timesheetData?.employeeData || {};

                const logObj = timesheetData?.clarificationRequest?.log || {};
                const clarificationLog = Object.values(logObj)
                    .map(x => ({ ...x, at: x.at || x.requestedAt || x.repliedAt || x.date || null }))
                    .sort((a, b) => (new Date(a.at || 0)) - (new Date(b.at || 0)));

                setSelectedTimesheet({
                    id: timesheetId,
                    employeeId: employeeId,
                    employeeData: employeeData,
                    ...timesheetData,
                    dailyEntries,
                    advances,
                    advancesApprovedTotal,
                    advancesAllTotal,
                    // prefer existing netPayable, else computed
                    netPayable: recomputedNet,
                    clarificationLog,

                });
                setShowDetailModal(true);
                setShowClarificationInput(false);
                setShowRejectionInput(false);
                setClarificationText('');
                setRejectionText('');
            }
        } catch (error) {
            console.error('Error fetching timesheet details:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateTimesheetStatus = async (status, comment = '') => {
        if (!selectedTimesheet) return;

        setLoading(true);
        try {
            // Resolve the actor (you already have resolveActor + usersIndex)
            const actor = await resolveActor(usersIndex);
            const userId = actor.uid || 'admin';
            const userName = actor.displayName || 'Admin User';
            const now = new Date().toISOString();

            // --- header: always safe audit fields (no clarificationRequest here) ---
            const header = {
                status,
                updatedBy: userId,
                updatedByName: userName,
                updatedAt: now,
                lastModified: now,
            };

            // Build a single multi-path update to avoid races AND avoid object overwrite
            const baseHeaderPath =
                empTsById(selectedTimesheet.employeeId, selectedTimesheet.id);
            const clarBase = `${baseHeaderPath}/clarificationRequest`;

            const updates = {
                // header fields
                [`${baseHeaderPath}/status`]: header.status,
                [`${baseHeaderPath}/updatedBy`]: header.updatedBy,
                [`${baseHeaderPath}/updatedByName`]: header.updatedByName,
                [`${baseHeaderPath}/updatedAt`]: header.updatedAt,
                [`${baseHeaderPath}/lastModified`]: header.lastModified,
            };

            if (status === 'clarification') {
                const at = now;

                // 1) append to /clarificationRequest/log/<pushId>
                const logRef = firebaseDB.child(`${clarBase}/log`).push();
                const id = logRef.key || `k_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                const entry = { id, type: 'request', text: comment, byId: userId, byName: userName, at };
                await logRef.set(entry);

                // 2) update ONLY leaf fields for the “latest” view (do NOT assign the object)
                updates[`${clarBase}/text`] = comment;
                updates[`${clarBase}/requestedById`] = userId;
                updates[`${clarBase}/requestedByName`] = userName;
                updates[`${clarBase}/requestedAt`] = at;
                updates[`${clarBase}/resolved`] = false;

            } else if (status === 'approved') {
                updates[`${baseHeaderPath}/reviewedBy`] = userId;
                updates[`${baseHeaderPath}/reviewedByName`] = userName;
                updates[`${baseHeaderPath}/reviewedAt`] = now;
                updates[`${baseHeaderPath}/approvedById`] = userId;
                updates[`${baseHeaderPath}/approvedByName`] = userName;
                updates[`${baseHeaderPath}/approvedAt`] = now;

                // mark clarification resolved without touching log
                updates[`${clarBase}/resolved`] = true;
                updates[`${clarBase}/resolvedById`] = userId;
                updates[`${clarBase}/resolvedByName`] = userName;
                updates[`${clarBase}/resolvedAt`] = now;

            } else if (status === 'rejected') {
                updates[`${baseHeaderPath}/reviewedBy`] = userId;
                updates[`${baseHeaderPath}/reviewedByName`] = userName;
                updates[`${baseHeaderPath}/reviewedAt`] = now;
                updates[`${baseHeaderPath}/rejectedById`] = userId;
                updates[`${baseHeaderPath}/rejectedByName`] = userName;
                updates[`${baseHeaderPath}/rejectedAt`] = now;
                updates[`${baseHeaderPath}/rejectionComment`] = comment;

                // mark clarification resolved without touching log
                updates[`${clarBase}/resolved`] = true;
                updates[`${clarBase}/resolvedById`] = userId;
                updates[`${clarBase}/resolvedByName`] = userName;
                updates[`${clarBase}/resolvedAt`] = now;
            }

            // 🔒 Single atomic update – no overwriting of clarificationRequest object
            await firebaseDB.update(updates);

            // refresh UI
            await fetchTimesheets();
            setShowDetailModal(false);
            setSelectedTimesheet(null);
            setClarificationText('');
            setRejectionText('');
            setShowClarificationInput(false);
            setShowRejectionInput(false);
        } catch (error) {
            console.error('Error updating timesheet status:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusAction = (status) => {
        if (status === 'clarification') {
            setShowClarificationInput(true);
            setShowRejectionInput(false);
        } else if (status === 'rejected') {
            setShowRejectionInput(true);
            setShowClarificationInput(false);
        } else {
            updateTimesheetStatus(status);
        }
    };

    const submitClarification = () => {
        if (clarificationText.trim()) {
            updateTimesheetStatus('clarification', clarificationText.trim());
        }
    };

    const submitRejection = () => {
        if (rejectionText.trim()) {
            updateTimesheetStatus('rejected', rejectionText.trim());
        }
    };

    // Calculate statistics
    const getStatistics = () => {
        const totalAmount = filteredTimesheets.reduce((sum, ts) => sum + (ts.totalSalary || 0), 0);
        const approvedAmount = filteredTimesheets
            .filter(ts => ts.status === 'approved')
            .reduce((sum, ts) => sum + (ts.totalSalary || 0), 0);

        const pendingCount = filteredTimesheets.filter(ts =>
            ts.status === 'submitted' || ts.status === 'clarification' || ts.status === 'assigned'
        ).length;

        return { totalAmount, approvedAmount, pendingCount };
    };

    // Handle card clicks for filtering
    const handleCardClick = (status) => {
        setStatusFilter(status);
        setCurrentPage(1);
    };

    // Get card active state
    const getCardActiveState = (status) => {
        if (status === 'all' && statusFilter === 'all') return 'border-primary bg-primary bg-opacity-10';
        if (status === 'approved' && statusFilter === 'approved') return 'border-primary bg-primary bg-opacity-10';
        if (status === 'pending' && (statusFilter === 'pending')) return 'border-primary bg-primary bg-opacity-10';
        if (status === 'rejected' && statusFilter === 'rejected') return 'border-primary bg-primary bg-opacity-10';
        return '';
    };

    // Pagination logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredTimesheets.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredTimesheets.length / itemsPerPage);

    // Generate pagination items with ellipsis
    const getPaginationItems = () => {
        const items = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            // Show all pages if total pages is less than max visible
            for (let i = 1; i <= totalPages; i++) {
                items.push(i);
            }
        } else {
            // Always show first page
            items.push(1);

            // Calculate start and end of visible pages
            let start = Math.max(2, currentPage - 1);
            let end = Math.min(totalPages - 1, currentPage + 1);

            // Adjust if at the beginning
            if (currentPage <= 2) {
                end = 4;
            }
            // Adjust if at the end
            if (currentPage >= totalPages - 1) {
                start = totalPages - 3;
            }

            // Add ellipsis after first page if needed
            if (start > 2) {
                items.push('...');
            }

            // Add middle pages
            for (let i = start; i <= end; i++) {
                items.push(i);
            }

            // Add ellipsis before last page if needed
            if (end < totalPages - 1) {
                items.push('...');
            }

            // Always show last page
            items.push(totalPages);
        }

        return items;
    };

    const statistics = getStatistics();

    return (
        <>
            <div className="container-fluid py-4">
                {/* Header */}
                <div className="row mb-4">
                    <div className="col-md-12 text-center mb-3">
                        <h4 className="text-warning mb-0">
                            <i className="bi bi-speedometer2 me-2 text-warning"></i>
                            JenCeo Timesheet Dashboard
                        </h4>
                        <small className="text-muted">Manage and review employee timesheets</small>
                    </div>
                    <div className="col-12">
                        <div className="card bg-dark border-secondary">
                            <div className="card-body">
                                <div className="row align-items-center">

                                    <div className="col-md-12 text-end">
                                        <div className="row">
                                            <div className="col-md-10 text-center">
                                                <label className="form-label text-info">
                                                    <strong>Select Month</strong>
                                                </label>
                                                <div className="d-flex flex-wrap gap-2 justify-content-center">
                                                    {/* All Button */}
                                                    <button
                                                        className={`btn ${selectedMonth === 'all' ? 'btn-primary' : 'btn-outline-primary'} btn-sm position-relative`}
                                                        onClick={() => setSelectedMonth('all')}
                                                        style={{ minWidth: '60px' }}
                                                    >
                                                        All
                                                        {getTimesheetCountForMonth('all') > 0 && (
                                                            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                                                                {getTimesheetCountForMonth('all')}
                                                                <span className="visually-hidden">timesheets</span>
                                                            </span>
                                                        )}
                                                    </button>

                                                    {/* Month Buttons */}
                                                    {Array.from({ length: 12 }, (_, i) => {
                                                        const monthNum = (i + 1).toString().padStart(2, '0');
                                                        const monthName = new Date(2023, i).toLocaleString('en', { month: 'short' });
                                                        const isActive = monthNum === selectedMonth;
                                                        const timesheetCount = getTimesheetCountForMonth(monthNum);

                                                        return (
                                                            <button
                                                                key={monthNum}
                                                                className={`btn ${isActive ? 'btn-info' : 'btn-outline-info'} btn-sm position-relative`}
                                                                onClick={() => setSelectedMonth(monthNum)}
                                                                style={{ minWidth: '60px' }}
                                                            >
                                                                {monthName}
                                                                {timesheetCount > 0 && (
                                                                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-success">
                                                                        {timesheetCount}
                                                                        <span className="visually-hidden">timesheets</span>
                                                                    </span>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className="col-md-2 text-center">
                                                <label className="form-label text-info">
                                                    <strong>Select Year</strong>
                                                </label>
                                                <select
                                                    className="form-select bg-dark text-white border-secondary"
                                                    value={selectedYear}
                                                    onChange={(e) => setSelectedYear(e.target.value)}
                                                >
                                                    <option value="">Select Year</option>
                                                    {getAvailableYears().map(year => (
                                                        <option key={year} value={year}>{year}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search and Filter Section */}
                <div className="row mb-4">
                    <div className="col-md-8">
                        <div className="card bg-dark border-secondary">
                            <div className="card-body">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label text-info">Search Timesheets</label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-dark border-secondary">
                                                <i className="bi bi-search text-warning"></i>
                                            </span>
                                            <input
                                                type="text"
                                                className="form-control bg-dark text-white border-secondary"
                                                placeholder="Search by employee name, ID, period, or timesheet ID..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label text-info">Filter by Status</label>
                                        <select
                                            className="form-select bg-dark text-white border-secondary"
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                        >
                                            <option value="all">All Status</option>
                                            <option value="submitted">Submitted</option>
                                            <option value="assigned">Assigned</option>
                                            <option value="approved">Approved</option>
                                            <option value="rejected">Rejected</option>
                                            <option value="clarification">Needs Clarification</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="card bg-dark border-warning">
                            <div className="card-body text-center">
                                <h6 className="text-warning d-block">Quick Actions</h6>
                                <div className="btn-group w-100">
                                    <button
                                        className="btn btn-outline-info btn-sm"
                                        onClick={fetchTimesheets}
                                        disabled={loading}
                                    >
                                        <i className="bi bi-arrow-clockwise me-1"></i>
                                        Refresh
                                    </button>
                                    <button
                                        className="btn btn-outline-success btn-sm"
                                        onClick={() => {
                                            setSearchTerm('');
                                            setStatusFilter('all');
                                            setCurrentPage(1);
                                        }}
                                    >
                                        <i className="bi bi-filter-circle me-1"></i>
                                        Clear Filters
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Statistics Cards - Now Clickable with Active State */}
                <div className="row mb-4">
                    <div className="col-xl-2 col-md-4 col-6 mb-3">
                        <div
                            className={`card border-info cursor-pointer ${getCardActiveState('all')}`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleCardClick('all')}
                        >
                            <div className="card-body text-center">
                                <h6 className="text-info d-block">Total Timesheets</h6>
                                <h3 className="text-white">{filteredTimesheets.length}</h3>
                                <small className="text-muted">Selected period</small>
                            </div>
                        </div>
                    </div>
                    <div className="col-xl-2 col-md-4 col-6 mb-3">
                        <div
                            className={`card border-success cursor-pointer ${getCardActiveState('approved')}`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleCardClick('approved')}
                        >
                            <div className="card-body text-center">
                                <h6 className="text-success d-block">Approved</h6>
                                <h3 className="text-white">
                                    {filteredTimesheets.filter(ts => ts.status === 'approved').length}
                                </h3>
                                <small className="text-muted">Ready for payment</small>
                            </div>
                        </div>
                    </div>
                    <div className="col-xl-2 col-md-4 col-6 mb-3">
                        <div
                            className={`card border-warning cursor-pointer ${getCardActiveState('submitted')}`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleCardClick('pending')}
                        >
                            <div className="card-body text-center">
                                <h6 className="text-warning d-block">Pending</h6>
                                <h3 className="text-white">
                                    {statistics.pendingCount}
                                </h3>
                                <small className="text-muted">Awaiting review</small>
                            </div>
                        </div>
                    </div>
                    <div className="col-xl-2 col-md-4 col-6 mb-3">
                        <div
                            className={`card border-danger cursor-pointer ${getCardActiveState('rejected')}`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleCardClick('rejected')}
                        >
                            <div className="card-body text-center">
                                <h6 className="text-danger d-block">Rejected</h6>
                                <h3 className="text-white">
                                    {filteredTimesheets.filter(ts => ts.status === 'rejected').length}
                                </h3>
                                <small className="text-muted">Needs revision</small>
                            </div>
                        </div>
                    </div>
                    <div className="col-xl-2 col-md-4 col-6 mb-3">
                        <div className="card bg-dark border-primary">
                            <div className="card-body text-center">
                                <h6 className="text-primary d-block">Total Amount</h6>
                                <h3 className="text-warning">₹{statistics.totalAmount.toLocaleString()}</h3>
                                <small className="text-muted">All timesheets</small>
                            </div>
                        </div>
                    </div>
                    <div className="col-xl-2 col-md-4 col-6 mb-3">
                        <div className="card bg-dark border-success">
                            <div className="card-body text-center">
                                <h6 className="text-success d-block">Approved Amount</h6>
                                <h3 className="text-warning">₹{statistics.approvedAmount.toLocaleString()}</h3>
                                <small className="text-muted">Ready to pay</small>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timesheets Table */}
                <div className="row">
                    <div className="col-12">
                        <div className="card bg-dark border-secondary">
                            <div className="card-header bg-secondary d-flex justify-content-between align-items-center">
                                <h5 className="card-title mb-0 text-white">
                                    {selectedMonth === 'all'
                                        ? `All Timesheets - ${selectedYear}`
                                        : `Timesheets - ${selectedMonth && new Date(2023, parseInt(selectedMonth) - 1).toLocaleString('en', { month: 'long' })} ${selectedYear}`
                                    }
                                </h5>
                                <div className="d-flex align-items-center">
                                    <div className="me-3">
                                        <label className="form-label text-white mb-0 me-2">Show:</label>
                                        <select
                                            className="form-select form-select-sm bg-dark text-white border-secondary d-inline-block w-auto"
                                            value={itemsPerPage}
                                            onChange={(e) => {
                                                setItemsPerPage(Number(e.target.value));
                                                setCurrentPage(1);
                                            }}
                                        >
                                            <option value="5">5</option>
                                            <option value="10">10</option>
                                            <option value="25">25</option>
                                            <option value="50">50</option>
                                            <option value="100">100</option>
                                        </select>
                                        <span className="text-white ms-2">entries</span>
                                    </div>
                                    <span className="badge bg-primary me-2">{filteredTimesheets.length} records</span>
                                    {loading && (
                                        <div className="spinner-border spinner-border-sm text-light" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="card-body p-0">
                                {loading ? (
                                    <div className="text-center py-5">
                                        <div className="spinner-border text-info mb-3" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                        <p className="text-muted">Loading timesheets...</p>
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-dark table-hover mb-0">
                                            <thead>
                                                <tr>
                                                    <th className="border-secondary">S.No</th>
                                                    <th className="border-secondary">Timesheet ID</th>
                                                    <th className="border-secondary">Photo</th>
                                                    <th className="border-secondary">Name</th>
                                                    <th className="border-secondary">Period</th>
                                                    <th className="border-secondary text-end">Amount</th>
                                                    <th className="border-secondary">Status</th>
                                                    <th className="border-secondary">Submitted</th>
                                                    <th className="border-secondary">Last Updated</th>
                                                    <th className="border-secondary text-center">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {currentItems.map((timesheet, index) => (
                                                    <tr key={timesheet.id}>
                                                        <td className="border-secondary text-center">
                                                            {indexOfFirstItem + index + 1}
                                                        </td>
                                                        <td className="border-secondary">
                                                            <small className="text-info font-monospace">
                                                                {timesheet.id}
                                                            </small>
                                                        </td>
                                                        <td className="border-secondary">
                                                            <div className="text-center">
                                                                {timesheet.employeeData?.employeePhotoUrl ? (
                                                                    <img
                                                                        src={timesheet.employeeData.employeePhotoUrl}
                                                                        alt="Employee"
                                                                        className=" me-2"
                                                                        style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: "5px", border: "1px solid" }}
                                                                    />
                                                                ) : (
                                                                    <div
                                                                        className="rounded-circle bg-secondary d-flex align-items-center justify-content-center me-2"
                                                                        style={{ width: '40px', height: '40px' }}
                                                                    >
                                                                        <i className="bi bi-person text-white"></i>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="border-secondary opacity-75">
                                                            <div className="fw-bold text-white">{timesheet.employeeName}</div>
                                                            <small className="text-muted">
                                                                {timesheet.employeeData?.employeeId || timesheet.employeeData?.idNo}
                                                            </small>
                                                        </td>
                                                        <td className="border-secondary">
                                                            <small className="text-info">{formatPeriod(timesheet)}</small>
                                                            <br />
                                                            <small className="text-muted">
                                                                {timesheet.useDateRange ? 'Custom Range' : 'Monthly'}
                                                            </small>
                                                        </td>

                                                        <td className="border-secondary text-end">
                                                            <div>
                                                                <strong className="text-success">₹{(timesheet.totalSalary || 0).toLocaleString()}</strong>
                                                                <br />
                                                                <small className="text-muted">
                                                                    Net: ₹{(timesheet.netPayable || 0).toLocaleString()}
                                                                </small>
                                                            </div>
                                                        </td>
                                                        <td className="border-secondary">
                                                            {getStatusBadge(timesheet.status)}
                                                            {timesheet.clarificationRequest && !timesheet.clarificationRequest.resolved && (
                                                                <i className="bi bi-exclamation-triangle text-warning ms-1" title="Clarification Requested"></i>
                                                            )}
                                                        </td>
                                                        <td className="border-secondary">
                                                            {timesheet.submittedAt ? (
                                                                <div>
                                                                    <small className="">
                                                                        {timesheet.submittedByName || 'Unknown'}
                                                                    </small>
                                                                    <br />
                                                                    <small className="text-muted opacity-50">
                                                                        {formatTimestamp(timesheet.submittedAt)}
                                                                    </small>


                                                                </div>
                                                            ) : (
                                                                <span className="text-muted">Not submitted</span>
                                                            )}
                                                        </td>
                                                        <td className="border-secondary">
                                                            <div>

                                                                <small className="">
                                                                    {timesheet.updatedByName || 'N/A'}
                                                                </small>
                                                                <br />
                                                                <small className="text-muted">
                                                                    {formatTimestamp(timesheet.lastModified || timesheet.updatedAt)}
                                                                </small>

                                                            </div>
                                                        </td>
                                                        <td className="border-secondary text-center">
                                                            <button
                                                                className="btn btn-sm btn-outline-info"
                                                                onClick={() => handleViewDetails(timesheet.id, timesheet.employeeId)}
                                                                title="View Details"
                                                                disabled={loading}
                                                            >
                                                                <i className="bi bi-eye"></i> View
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {filteredTimesheets.length === 0 && (
                                                    <tr>
                                                        <td colSpan="11" className="text-center py-4 text-muted border-secondary">
                                                            <i className="bi bi-inbox display-4 d-block mb-2"></i>
                                                            No timesheets found for the selected criteria.
                                                            <br />
                                                            <small>Try changing your filters or search terms.</small>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Enhanced Pagination with Icons */}
                            {filteredTimesheets.length > 0 && (
                                <>
                                    <p className="text-muted mb-0 mt-2 text-warning text-center">
                                        Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredTimesheets.length)} of {filteredTimesheets.length} entries
                                    </p>
                                    <div className="card-footer justify-content-center">

                                        <nav style={{ backgroundColor: "transparent", padding: 0 }}>
                                            <ul className="pagination pagination-sm mb-0 justify-content-center">
                                                {/* First Page */}
                                                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                                    <button
                                                        className="page-link bg-dark border-secondary text-white"
                                                        onClick={() => setCurrentPage(1)}
                                                        disabled={currentPage === 1}
                                                        title="First Page"
                                                    >
                                                        <i className="bi bi-chevron-double-left"></i>
                                                    </button>
                                                </li>

                                                {/* Previous Page */}
                                                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                                    <button
                                                        className="page-link bg-dark border-secondary text-white"
                                                        onClick={() => setCurrentPage(currentPage - 1)}
                                                        disabled={currentPage === 1}
                                                        title="Previous Page"
                                                    >
                                                        <i className="bi bi-chevron-left"></i>
                                                    </button>
                                                </li>

                                                {/* Page Numbers */}
                                                {getPaginationItems().map((page, index) => (
                                                    <li key={index} className={`page-item ${currentPage === page ? 'active' : ''} ${page === '...' ? 'disabled' : ''}`}>
                                                        {page === '...' ? (
                                                            <span className="page-link bg-dark border-secondary text-muted">...</span>
                                                        ) : (
                                                            <button
                                                                className="page-link bg-dark border-secondary text-white"
                                                                onClick={() => setCurrentPage(page)}
                                                            >
                                                                {page}
                                                            </button>
                                                        )}
                                                    </li>
                                                ))}

                                                {/* Next Page */}
                                                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                                    <button
                                                        className="page-link bg-dark border-secondary text-white"
                                                        onClick={() => setCurrentPage(currentPage + 1)}
                                                        disabled={currentPage === totalPages}
                                                        title="Next Page"
                                                    >
                                                        <i className="bi bi-chevron-right"></i>
                                                    </button>
                                                </li>

                                                {/* Last Page */}
                                                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                                    <button
                                                        className="page-link bg-dark border-secondary text-white"
                                                        onClick={() => setCurrentPage(totalPages)}
                                                        disabled={currentPage === totalPages}
                                                        title="Last Page"
                                                    >
                                                        <i className="bi bi-chevron-double-right"></i>
                                                    </button>
                                                </li>
                                            </ul>
                                        </nav>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Timesheet Detail Modal */}
                {showDetailModal && selectedTimesheet && (
                    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }} tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered modal-xl">
                            <div className="modal-content bg-dark border border-secondary">
                                <div className="modal-header border-secondary">
                                    <h5 className="modal-title text-info">
                                        <i className="bi bi-file-text me-2"></i>
                                        Timesheet Details - {selectedTimesheet.employeeName}
                                        <small className="text-muted ms-2">ID: {selectedTimesheet.id}</small>
                                    </h5>
                                    <button
                                        type="button"
                                        className="btn-close btn-close-white"
                                        onClick={() => setShowDetailModal(false)}
                                        disabled={loading}
                                    ></button>
                                </div>
                                <div className="modal-body">
                                    {/* Header Summary */}
                                    <div className="row mb-4">
                                        <div className="col-md-4">
                                            <div className="card border-secondary bg-secondary bg-opacity-10 h-100">
                                                <div className="card-body text-center">
                                                    {selectedTimesheet.employeeData?.employeePhotoUrl ? (
                                                        <img
                                                            src={selectedTimesheet.employeeData.employeePhotoUrl}
                                                            alt="Employee"
                                                            className="rounded-circle mb-3"
                                                            style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                                                        />
                                                    ) : (
                                                        <div
                                                            className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mx-auto mb-3"
                                                            style={{ width: '100px', height: '100px' }}
                                                        >
                                                            <i className="bi bi-person text-white fs-1"></i>
                                                        </div>
                                                    )}
                                                    <h6 className="text-white d-block">{selectedTimesheet.employeeName}</h6>
                                                    <small className="text-muted d-block">
                                                        ID: {selectedTimesheet.employeeData?.employeeId || selectedTimesheet.employeeData?.idNo}
                                                    </small>
                                                    <small className="text-info">{selectedTimesheet.employeeData?.primarySkill}</small>
                                                    <div className="mt-2">
                                                        <small className="text-warning">
                                                            Basic: ₹{selectedTimesheet.employeeData?.basicSalary || 'N/A'}
                                                        </small>
                                                    </div>
                                                    <div className="mt-1">
                                                        <small className="text-info">
                                                            Timesheet ID: {selectedTimesheet.id}
                                                        </small>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-8">
                                            <div className="card bg-dark border-secondary h-100">
                                                <div className="card-body">
                                                    <div className="row text-center">
                                                        <div className="col-3 mb-3">
                                                            <div className="border rounded border-info p-2 h-100">
                                                                <h6 className="text-info d-block">Total Days</h6>
                                                                <p className="h4 text-white">{selectedTimesheet.totalDays || 0}</p>
                                                            </div>
                                                        </div>
                                                        <div className="col-3 mb-3">
                                                            <div className="border border-success rounded p-2 h-100">
                                                                <h6 className="text-success d-block">Working Days</h6>
                                                                <p className="h4 text-white">{selectedTimesheet.workingDays || 0}</p>
                                                            </div>
                                                        </div>
                                                        <div className="col-3 mb-3">
                                                            <div className="border border-warning rounded p-2 h-100">
                                                                <h6 className="text-warning d-block">Leaves</h6>
                                                                <p className="h4 text-white">{selectedTimesheet.leaves || 0}</p>
                                                            </div>
                                                        </div>
                                                        <div className="col-3 mb-3">
                                                            <div className="border border-primary rounded p-2 h-100">
                                                                <h6 className="text-primary d-block">Holidays</h6>
                                                                <p className="h4 text-white">{selectedTimesheet.holidays || 0}</p>
                                                            </div>
                                                        </div>
                                                        <div className="col-4 mb-3">
                                                            <div className="bg-warning bg-opacity-50 rounded p-2 h-100">
                                                                <h6 className="text-white d-block">Total Salary</h6>
                                                                <p className="h4 text-white">₹{(selectedTimesheet.totalSalary || 0).toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                        <div className="col-4 mb-3">
                                                            <div className="bg-danger bg-opacity-50 rounded p-2 h-100">
                                                                <h6 className="text-white d-block">Advances (Approved)</h6>
                                                                <p className="h4 text-white">₹{(selectedTimesheet.advancesApprovedTotal || 0).toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                        <div className="col-4 mb-3">
                                                            <div className="bg-success bg-opacity-50 rounded p-2 h-100">
                                                                <h6 className="text-white d-block">Net Payable</h6>
                                                                <p className="h4 text-warning">₹{(selectedTimesheet.netPayable || 0).toLocaleString()}</p>
                                                            </div>
                                                        </div>

                                                    </div>
                                                    <div className="row mt-3">
                                                        <div className="col-12 text-center">
                                                            <small className="text-muted">
                                                                Period: <span className="text-warning">{formatPeriod(selectedTimesheet)}</span> |
                                                                Last Modified: {formatTimestamp(selectedTimesheet.lastModified || selectedTimesheet.updatedAt)}
                                                            </small>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Approval Information */}
                                    {(selectedTimesheet.status === 'approved' || selectedTimesheet.status === 'rejected') && (
                                        <div className="row mb-4">
                                            <div className="col-12">
                                                <div className={`card ${selectedTimesheet.status === 'approved' ? 'border-success' : 'border-danger'}`}>
                                                    <div className="card-body">
                                                        <h6 className={`text-${selectedTimesheet.status === 'approved' ? 'success' : 'danger'}`}>
                                                            <i className={`bi bi-${selectedTimesheet.status === 'approved' ? 'check-circle' : 'x-circle'} me-2`}></i>
                                                            {selectedTimesheet.status === 'approved' ? 'Approval' : 'Rejection'} Information
                                                        </h6>
                                                        <div className="row">
                                                            <div className="col-md-4">
                                                                <label className="form-label text-info mb-1">
                                                                    {selectedTimesheet.status === 'approved' ? 'Approved By' : 'Rejected By'}
                                                                </label>
                                                                <div className="text-white">
                                                                    {selectedTimesheet.status === 'approved'
                                                                        ? selectedTimesheet.approvedBy || selectedTimesheet.reviewedByName || 'N/A'
                                                                        : selectedTimesheet.rejectedBy || selectedTimesheet.reviewedByName || 'N/A'
                                                                    }
                                                                </div>
                                                            </div>
                                                            <div className="col-md-4">
                                                                <label className="form-label text-info mb-1">
                                                                    {selectedTimesheet.status === 'approved' ? 'Approved At' : 'Rejected At'}
                                                                </label>
                                                                <div className="text-white">
                                                                    {selectedTimesheet.status === 'approved'
                                                                        ? formatTimestamp(selectedTimesheet.approvedAt || selectedTimesheet.reviewedAt)
                                                                        : formatTimestamp(selectedTimesheet.rejectedAt || selectedTimesheet.reviewedAt)
                                                                    }
                                                                </div>
                                                            </div>
                                                            {selectedTimesheet.status === 'rejected' && selectedTimesheet.rejectionComment && (
                                                                <div className="col-md-4">
                                                                    <label className="form-label text-info mb-1">Rejection Reason</label>
                                                                    <div className="text-white">{selectedTimesheet.rejectionComment}</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Clarification Section */}
                                    {selectedTimesheet.clarificationRequest && (
                                        <div className="row mb-4">
                                            <div className="col-12">
                                                <div className="card border-warning">
                                                    <div className="card-body">
                                                        <h6 className="text-warning">
                                                            <i className="bi bi-question-circle me-2"></i>
                                                            Clarification
                                                        </h6>

                                                        {/* Status pill */}
                                                        <div className="mb-3">
                                                            {selectedTimesheet.clarificationRequest.resolved ? (
                                                                <span className="badge bg-success">Resolved</span>
                                                            ) : (
                                                                <span className="badge bg-warning text-dark">Pending</span>
                                                            )}
                                                        </div>

                                                        {/* Thread */}
                                                        <div className="list-group">
                                                            {/* First “latest” request for backward compatibility */}
                                                            {selectedTimesheet.clarificationRequest.text && !selectedTimesheet.clarificationLog?.length && (
                                                                <div className="list-group-item bg-dark text-white border-secondary">
                                                                    <div className="d-flex justify-content-between">
                                                                        <span><span className="badge bg-warning me-2">Request</span>{selectedTimesheet.clarificationRequest.text}</span>
                                                                        <small className="text-muted">{formatTimestamp(selectedTimesheet.clarificationRequest.requestedAt)}</small>
                                                                    </div>
                                                                    <div className="small text-info mt-1">
                                                                        by {selectedTimesheet.clarificationRequest.requestedByName || 'Unknown'}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Render full log when present */}
                                                            {selectedTimesheet.clarificationLog?.map(item => (
                                                                <div key={item.id} className="list-group-item bg-dark text-white border-secondary">
                                                                    <div className="d-flex justify-content-between">
                                                                        <span>
                                                                            <span className={`badge me-2 ${item.type === 'request' ? 'bg-warning text-dark' : 'bg-info'}`}>
                                                                                {item.type === 'request' ? 'Request' : 'Reply'}
                                                                            </span>
                                                                            {item.text}
                                                                        </span>
                                                                        <small className="text-muted">{formatTimestamp(item.at)}</small>
                                                                    </div>
                                                                    <div className="small text-info mt-1">by {item.byName || 'Unknown'}</div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Resolved info (unchanged) */}
                                                        {selectedTimesheet.clarificationRequest.resolved && (
                                                            <div className="row mt-3">
                                                                <div className="col-md-6">
                                                                    <label className="form-label text-info mb-1">Resolved By</label>
                                                                    <div className="text-white">
                                                                        {selectedTimesheet.clarificationRequest.resolvedByName || 'N/A'}
                                                                    </div>
                                                                </div>
                                                                <div className="col-md-6">
                                                                    <label className="form-label text-info mb-1">Resolved At</label>
                                                                    <div className="text-white">
                                                                        {formatTimestamp(selectedTimesheet.clarificationRequest.resolvedAt)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}


                                    {/* Daily Entries */}
                                    <div className="row mb-4">
                                        <div className="col-12">
                                            <div className="p-3 bg-secondary bg-opacity-10 rounded-4">
                                                <div className="d-flex justify-content-between align-items-center mb-3">
                                                    <h6 className="text-white mb-0">Daily Entries ({selectedTimesheet.dailyEntries?.length || 0})</h6>
                                                    <small className="text-muted">Total Salary: ₹{selectedTimesheet.totalSalary || 0}</small>
                                                </div>
                                                <div className="table-responsive" style={{ maxHeight: '400px' }}>
                                                    <table className="table table-dark table-sm table-striped">
                                                        <thead className="sticky-top">
                                                            <tr>
                                                                <th>Date</th>
                                                                <th>Client</th>
                                                                <th>Position</th>
                                                                <th>Status</th>
                                                                <th className="text-end">Salary</th>
                                                                <th>Notes</th>
                                                                <th>Modified By</th>
                                                                <th>Last Updated</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {selectedTimesheet.dailyEntries?.map(entry => (
                                                                <tr key={entry.id}>
                                                                    <td>
                                                                        <small>
                                                                            {new Date(entry.date).toLocaleDateString('en-IN', {
                                                                                weekday: 'short',
                                                                                day: 'numeric',
                                                                                month: 'short'
                                                                            })}
                                                                        </small>
                                                                    </td>
                                                                    <td>
                                                                        <div>
                                                                            <div>{entry.clientName}</div>
                                                                            <small className="text-muted opacity-50">{entry.clientId}</small>
                                                                        </div>
                                                                    </td>
                                                                    <td>{entry.jobRole}</td>
                                                                    <td>
                                                                        <span className={`badge ${entry.status === 'present' ? 'bg-success' :
                                                                            entry.status === 'leave' ? 'bg-warning' :
                                                                                entry.status === 'absent' ? 'bg-danger' :
                                                                                    entry.isPublicHoliday ? 'bg-primary' : 'bg-secondary'
                                                                            }`}>
                                                                            {entry.status}
                                                                            {entry.isHalfDay && ' (½)'}
                                                                            {entry.isEmergency && ' ⚡'}
                                                                            {entry.isPublicHoliday && ' 🎉'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="text-end">
                                                                        <span className={entry.dailySalary > 0 ? 'text-success' : 'text-muted'}>
                                                                            ₹{entry.dailySalary || 0}
                                                                        </span>
                                                                    </td>
                                                                    <td>
                                                                        {entry.notes ? (
                                                                            <small className="text-info" title={entry.notes}>
                                                                                <i className="bi bi-chat-left-text"></i>
                                                                            </small>
                                                                        ) : (
                                                                            <span className="text-muted">-</span>
                                                                        )}
                                                                    </td>
                                                                    <td>
                                                                        <small className="text-info opacity-50">
                                                                            {entry.updatedByName || entry.createdByName || 'N/A'}
                                                                        </small>
                                                                    </td>
                                                                    <td>
                                                                        <small className="text-muted opacity-50">
                                                                            {entry.updatedAt ?
                                                                                new Date(entry.updatedAt).toLocaleDateString('en-IN') :
                                                                                entry.createdAt ?
                                                                                    new Date(entry.createdAt).toLocaleDateString('en-IN') :
                                                                                    'N/A'
                                                                            }
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

                                    {/* Advances */}
                                    {selectedTimesheet.advances && selectedTimesheet.advances.length > 0 && (
                                        <div className="row mb-4">
                                            <div className="col-12">
                                                <div className="card border-warning">
                                                    <div className="card-header bg-warning bg-opacity-10 border-warning">
                                                        <h6 className="mb-0 text-warning">
                                                            <i className="bi bi-cash-coin me-2"></i>
                                                            Advances ({selectedTimesheet.advances.length})
                                                        </h6>
                                                    </div>
                                                    <div className="card-body p-0">
                                                        <div className="table-responsive">
                                                            <table className="table table-dark table-sm mb-0">
                                                                <thead>
                                                                    <tr>
                                                                        <th className="border-warning">Date</th>
                                                                        <th className="border-warning">Description</th>
                                                                        <th className="border-warning text-end">Amount</th>
                                                                        <th className="border-warning">Status</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {selectedTimesheet.advances.map((advance, index) => (
                                                                        <tr key={index}>
                                                                            <td className="border-warning">
                                                                                {new Date(advance.date).toLocaleDateString('en-IN', {
                                                                                    day: '2-digit',
                                                                                    month: 'short',
                                                                                    year: 'numeric'
                                                                                })}
                                                                            </td>
                                                                            <td className="border-warning">{advance.description || 'N/A'}</td>
                                                                            <td className="border-warning text-end">₹{(advance.amount || 0).toLocaleString()}</td>
                                                                            <td className="border-warning">
                                                                                <span className={`badge ${advance.status === 'approved' ? 'bg-success' : advance.status === 'rejected' ? 'bg-danger' : 'bg-warning'}`}>
                                                                                    {advance.status || 'pending'}
                                                                                </span>
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

                                    {/* Action Buttons */}
                                    {selectedTimesheet.status !== 'approved' && selectedTimesheet.status !== 'rejected' && (
                                        <div className="row">
                                            <div className="col-12">
                                                <div className="card border-primary">
                                                    <div className="card-body">
                                                        <h6 className="text-primary mb-3">Actions</h6>
                                                        <div className="d-flex gap-2 flex-wrap">
                                                            <button
                                                                className="btn btn-success"
                                                                onClick={() => handleStatusAction('approved')}
                                                                disabled={loading}
                                                            >
                                                                <i className="bi bi-check-circle me-1"></i>
                                                                Approve
                                                            </button>
                                                            <button
                                                                className="btn btn-warning"
                                                                onClick={() => handleStatusAction('clarification')}
                                                                disabled={loading}
                                                            >
                                                                <i className="bi bi-question-circle me-1"></i>
                                                                Request Clarification
                                                            </button>
                                                            <button
                                                                className="btn btn-danger"
                                                                onClick={() => handleStatusAction('rejected')}
                                                                disabled={loading}
                                                            >
                                                                <i className="bi bi-x-circle me-1"></i>
                                                                Reject
                                                            </button>
                                                        </div>

                                                        {/* Clarification Input */}
                                                        {showClarificationInput && (
                                                            <div className="mt-3 p-3 border border-warning rounded">
                                                                <label className="form-label text-warning">
                                                                    <i className="bi bi-question-circle me-1"></i>
                                                                    Clarification Request
                                                                </label>
                                                                <textarea
                                                                    className="form-control bg-dark text-white border-warning"
                                                                    rows="3"
                                                                    placeholder="Please specify what clarification you need from the employee..."
                                                                    value={clarificationText}
                                                                    onChange={(e) => setClarificationText(e.target.value)}
                                                                />
                                                                <div className="mt-2 d-flex gap-2">
                                                                    <button
                                                                        className="btn btn-sm btn-warning"
                                                                        onClick={submitClarification}
                                                                        disabled={loading || !clarificationText.trim()}
                                                                    >
                                                                        <i className="bi bi-send me-1"></i>
                                                                        Submit Request
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-sm btn-outline-secondary"
                                                                        onClick={() => setShowClarificationInput(false)}
                                                                        disabled={loading}
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Rejection Input */}
                                                        {showRejectionInput && (
                                                            <div className="mt-3 p-3 border border-danger rounded">
                                                                <label className="form-label text-danger">
                                                                    <i className="bi bi-x-circle me-1"></i>
                                                                    Rejection Reason
                                                                </label>
                                                                <textarea
                                                                    className="form-control bg-dark text-white border-danger"
                                                                    rows="3"
                                                                    placeholder="Please provide the reason for rejection..."
                                                                    value={rejectionText}
                                                                    onChange={(e) => setRejectionText(e.target.value)}
                                                                />
                                                                <div className="mt-2 d-flex gap-2">
                                                                    <button
                                                                        className="btn btn-sm btn-danger"
                                                                        onClick={submitRejection}
                                                                        disabled={loading || !rejectionText.trim()}
                                                                    >
                                                                        <i className="bi bi-x-circle me-1"></i>
                                                                        Reject Timesheet
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-sm btn-outline-secondary"
                                                                        onClick={() => setShowRejectionInput(false)}
                                                                        disabled={loading}
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer border-secondary">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setShowDetailModal(false)}
                                        disabled={loading}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}