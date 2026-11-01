// LoginTracker/LoginTrackingDashboard.jsx
// Tabs: Activity | Users | Devices & IPs | Access control | Security events
import React, { useState, useEffect, useMemo } from 'react';
import firebaseDB from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import IPWhitelistManager from './IPWhitelistManager';
import IPUsageAnalytics from './IPUsageAnalytics';
import { UserCell, deviceIcon } from './UserAvatar';
import { normalizeUser } from './userInfo';
import { sanitizeKey } from './ipUtils';
import { isLoginRecord, normalizeLog, isKnownIP, formatDate, csvCell } from './logUtils';
import { forceLogoutUser, migrateLegacyLoginData } from './trackUserLogin';

const ONLINE_MS = 5 * 60 * 1000;
const SEVERITY = { HIGH: 'bg-danger', MEDIUM: 'bg-warning text-dark', LOW: 'bg-secondary' };

/* ---------------- pagination (module level so it does not remount on every render) ---------------- */
const Pagination = ({ page, totalPages, onPage, from, to, total }) => {
    if (totalPages <= 1) return null;
    const max = 5;
    let start = Math.max(1, page - Math.floor(max / 2));
    const end = Math.min(totalPages, start + max - 1);
    start = Math.max(1, end - max + 1);
    const nums = [];
    for (let i = start; i <= end; i += 1) nums.push(i);
    const btn = 'page-link bg-dark text-white border-secondary';
    return (
        <>
            <small className="text-warning text-center d-block m-2">Showing {from} to {to} of {total} entries</small>
            <div className="card-footer bg-secondary bg-opacity-10">
                <ul className="pagination pagination-sm mb-0 justify-content-center">
                    <li className={`page-item ${page === 1 ? 'disabled' : ''}`}><button className={btn} onClick={() => onPage(1)}><i className="bi bi-chevron-double-left" /></button></li>
                    <li className={`page-item ${page === 1 ? 'disabled' : ''}`}><button className={btn} onClick={() => onPage(page - 1)}><i className="bi bi-chevron-left" /></button></li>
                    {nums.map((n) => (
                        <li key={n} className={`page-item ${n === page ? 'active' : ''}`}><button className={btn} onClick={() => onPage(n)}>{n}</button></li>
                    ))}
                    <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}><button className={btn} onClick={() => onPage(page + 1)}><i className="bi bi-chevron-right" /></button></li>
                    <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}><button className={btn} onClick={() => onPage(totalPages)}><i className="bi bi-chevron-double-right" /></button></li>
                </ul>
            </div>
        </>
    );
};

/* ---------------- security events ---------------- */
const SecurityEventsPanel = () => {
    const [events, setEvents] = useState([]);
    const [severity, setSeverity] = useState('ALL');

    useEffect(() => {
        const ref = firebaseDB.child('SecurityEvents').orderByKey().limitToLast(150);
        const cb = ref.on('value', (snap) => {
            const v = snap.val() || {};
            setEvents(Object.entries(v).map(([id, e]) => ({ id, ...e }))
                .sort((a, b) => (b.ts || new Date(b.timestamp || 0).getTime()) - (a.ts || new Date(a.timestamp || 0).getTime())));
        }, (e) => console.error('SecurityEvents read failed', e));
        return () => ref.off('value', cb);
    }, []);

    const shown = severity === 'ALL' ? events : events.filter((e) => e.severity === severity);
    const detail = (e) => [e.name || e.email || e.identifier || e.userId, e.reason, e.deviceName, e.by && `by ${e.by}`].filter(Boolean).join(' · ');

    return (
        <div className="card bg-dark border-secondary">
            <div className="card-header bg-info bg-opacity-25 border-info d-flex justify-content-between align-items-center">
                <h6 className="mb-0 text-white"><i className="bi bi-exclamation-triangle me-2" />Security events ({shown.length})</h6>
                <select className="form-select form-select-sm bg-dark text-white border-secondary" style={{ width: 'auto' }} value={severity} onChange={(e) => setSeverity(e.target.value)}>
                    <option value="ALL">All</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option>
                </select>
            </div>
            <div className="table-responsive">
                <table className="table table-dark table-hover align-middle mb-0">
                    <thead><tr><th>Time</th><th>Event</th><th>Level</th><th>IP</th><th>Details</th></tr></thead>
                    <tbody>
                        {shown.length === 0 ? (
                            <tr><td colSpan="5" className="text-center py-4 text-muted">No events</td></tr>
                        ) : shown.map((e) => (
                            <tr key={e.id}>
                                <td><small>{formatDate(e.ts || e.timestamp)}</small></td>
                                <td><small className="font-monospace">{e.type}</small></td>
                                <td><span className={`badge ${SEVERITY[e.severity] || 'bg-secondary'}`}>{e.severity || 'LOW'}</span></td>
                                <td><code className="text-warning">{e.ipAddress || '—'}</code></td>
                                <td><small className="text-muted">{detail(e) || '—'}</small></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

/* ---------------- main ---------------- */
const LoginTrackingDashboard = () => {
    const auth = useAuth() || {};
    const adminName = normalizeUser(auth.currentUser || auth.user || {}).name;

    const [tab, setTab] = useState('activity');
    const [loginLogs, setLoginLogs] = useState([]);
    const [profiles, setProfiles] = useState({});
    const [legacyCount, setLegacyCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);
    const [limit, setLimit] = useState(1000);

    const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [currentView, setCurrentView] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [cardFilter, setCardFilter] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [tick, setTick] = useState(0); // re-render every minute so "online" dots stay correct

    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 60000);
        return () => clearInterval(id);
    }, []);

    // ONE live listener (the old code fetched everything twice on every change)
    useEffect(() => {
        setLoading(true);
        const ref = firebaseDB.child('LoginData').orderByKey().limitToLast(limit);
        const cb = ref.on('value', (snap) => {
            const v = snap.val() || {};
            const entries = Object.entries(v);
            const logs = entries.filter(([, d]) => isLoginRecord(d)).map(([id, d]) => normalizeLog(id, d)).sort((a, b) => b.t - a.t);
            setLegacyCount(entries.length - logs.length);
            setLoginLogs(logs);
            setLastUpdated(new Date());
            setError('');
            setLoading(false);
        }, (err) => {
            console.error('LoginData read failed', err);
            setError('Could not read login data. Check your Firebase rules.');
            setLoading(false);
        });
        return () => ref.off('value', cb);
    }, [limit]);

    useEffect(() => {
        const ref = firebaseDB.child('UserProfiles');
        const cb = ref.on('value', (snap) => setProfiles(snap.val() || {}), (e) => console.warn('UserProfiles read failed', e));
        return () => ref.off('value', cb);
    }, []);

    /* ---------- derived data ---------- */
    const stats = useMemo(() => {
        const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
        return {
            totalLogins: loginLogs.length,
            uniqueUsers: new Set(loginLogs.map((l) => l.userId)).size,
            uniqueDevices: new Set(loginLogs.map((l) => l.deviceKey)).size,
            uniqueIPs: new Set(loginLogs.filter((l) => isKnownIP(l.ipAddress)).map((l) => l.ipAddress)).size,
            todayLogins: loginLogs.filter((l) => l.t >= startToday.getTime()).length,
            suspicious: loginLogs.filter((l) => l.status === 'SUSPICIOUS').length,
        };
    }, [loginLogs]);

    const knownIPs = useMemo(() => {
        const m = new Map();
        loginLogs.forEach((l) => {
            if (!isKnownIP(l.ipAddress)) return;
            const e = m.get(l.ipAddress) || { ip: l.ipAddress, count: 0, last: 0 };
            e.count += 1; e.last = Math.max(e.last, l.t);
            m.set(l.ipAddress, e);
        });
        return [...m.values()].sort((a, b) => b.last - a.last);
    }, [loginLogs]);

    const userRows = useMemo(() => {
        const m = new Map();
        loginLogs.forEach((l) => {
            let u = m.get(l.userId);
            if (!u) {
                u = { userId: l.userId, name: l.name, email: l.email, photo: l.photo, type: l.userType, logins: 0, devices: new Set(), ips: new Set(), lastLogin: l.t, lastIP: l.ipAddress, lastDevice: l.deviceName, suspicious: 0 };
                m.set(l.userId, u);
            }
            u.logins += 1;
            u.devices.add(l.deviceKey);
            if (isKnownIP(l.ipAddress)) u.ips.add(l.ipAddress);
            if (l.status === 'SUSPICIOUS') u.suspicious += 1;
        });
        return [...m.values()].map((u) => {
            const p = profiles[sanitizeKey(u.userId)] || {};
            return { ...u, name: p.name || u.name, photo: p.photo || u.photo, type: p.userType || u.type, lastActive: p.lastActive || 0 };
        }).sort((a, b) => b.lastLogin - a.lastLogin);
    }, [loginLogs, profiles]);

    const filteredLogs = useMemo(() => {
        let list = loginLogs;

        if (cardFilter === 'uniqueUsers') { const s = new Set(); list = list.filter((l) => (s.has(l.userId) ? false : s.add(l.userId))); }
        else if (cardFilter === 'uniqueDevices') { const s = new Set(); list = list.filter((l) => (s.has(l.deviceKey) ? false : s.add(l.deviceKey))); }
        else if (cardFilter === 'uniqueIPs') { const s = new Set(); list = list.filter((l) => (s.has(l.ipAddress) ? false : s.add(l.ipAddress))); }
        else if (cardFilter === 'todayLogins') { const d = new Date(); d.setHours(0, 0, 0, 0); list = list.filter((l) => l.t >= d.getTime()); }
        else if (cardFilter === 'suspicious') list = list.filter((l) => l.status === 'SUSPICIOUS');

        if (dateRange.startDate && dateRange.endDate) {
            const start = new Date(dateRange.startDate).getTime();
            const end = new Date(dateRange.endDate).setHours(23, 59, 59, 999);
            list = list.filter((l) => l.t >= start && l.t <= end);
        }

        const nowT = Date.now();
        if (currentView === 'today') { const d = new Date(); d.setHours(0, 0, 0, 0); list = list.filter((l) => l.t >= d.getTime()); }
        else if (currentView === 'week') list = list.filter((l) => l.t >= nowT - 7 * 86400000);
        else if (currentView === 'month') list = list.filter((l) => l.t >= nowT - 30 * 86400000);

        if (typeFilter !== 'all') list = list.filter((l) => l.userType === typeFilter);

        const term = searchTerm.trim().toLowerCase();
        if (term) {
            list = list.filter((l) => [l.userId, l.email, l.name, l.ipAddress, l.deviceName, l.os, l.browser, l.city, l.country, l.userAgent]
                .some((f) => f && String(f).toLowerCase().includes(term)));
        }
        return list;
    }, [loginLogs, cardFilter, dateRange, currentView, typeFilter, searchTerm]);

    useEffect(() => { setCurrentPage(1); }, [cardFilter, dateRange, currentView, typeFilter, searchTerm, itemsPerPage]);

    const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const displayedLogs = useMemo(() => filteredLogs.slice(startIndex, endIndex), [filteredLogs, startIndex, endIndex]);

    /* ---------- actions ---------- */
    const clearFilters = () => {
        setDateRange({ startDate: '', endDate: '' }); setSearchTerm(''); setCurrentView('all'); setTypeFilter('all'); setCardFilter(null);
    };

    const exportToCSV = () => {
        const headers = ['User ID', 'Name', 'Email', 'Type', 'IP Address', 'Previous IP', 'Login Time', 'Device', 'OS', 'Browser', 'Country', 'City', 'ISP', 'Status', 'Risk', 'Reason'];
        const rows = filteredLogs.map((l) => [l.userId, l.name, l.email, l.userType, l.ipAddress, l.previousIP || '', formatDate(l.t), l.deviceName,
            `${l.os || ''} ${l.osVersion || ''}`.trim(), l.browser, l.country, l.city, l.isp, l.status || 'SUCCESS', l.riskLevel || '', l.suspiciousReason || '']);
        const csv = [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `login-logs-${new Date().toISOString().split('T')[0]}.csv`; a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleForceLogout = async (u) => {
        if (!window.confirm(`Sign ${u.name} out everywhere? They will have to log in again.`)) return;
        const r = await forceLogoutUser(u.userId, adminName);
        setNotice(r.success ? `${u.name} will be signed out within a few seconds.` : r.error);
    };

    const handleCleanup = async () => {
        if (!window.confirm(`Found ${legacyCount} old records inside LoginData that are not logins (events, per-user copies, IP stats).\n\nEvents are moved to SecurityEvents and the rest are deleted. Continue?`)) return;
        try {
            const r = await migrateLegacyLoginData();
            setNotice(`Cleanup done: ${r.moved} events moved, ${r.removed} old nodes removed.`);
        } catch (e) { setNotice(`Cleanup failed: ${e.message}`); }
    };

    const cards = [
        { key: 'totalLogins', label: 'Total logins', value: stats.totalLogins, tone: 'success', icon: 'bi-box-arrow-in-right' },
        { key: 'uniqueUsers', label: 'Users', value: stats.uniqueUsers, tone: 'info', icon: 'bi-people' },
        { key: 'uniqueDevices', label: 'Devices', value: stats.uniqueDevices, tone: 'primary', icon: 'bi-phone' },
        { key: 'uniqueIPs', label: 'IP addresses', value: stats.uniqueIPs, tone: 'warning', icon: 'bi-diagram-3' },
        { key: 'todayLogins', label: "Today's logins", value: stats.todayLogins, tone: 'primary', icon: 'bi-calendar-date' },
        { key: 'suspicious', label: 'Suspicious', value: stats.suspicious, tone: 'danger', icon: 'bi-exclamation-triangle' },
    ];
    const tabs = [
        ['activity', 'Activity', 'bi-list'], ['users', `Users (${userRows.length})`, 'bi-people'], ['devices', 'Devices & IPs', 'bi-devices'],
        ['access', 'Access control', 'bi-shield-check'], ['security', 'Security events', 'bi-exclamation-triangle'],
    ];

    if (loading) {
        return (
            <div className="container-fluid py-4">
                <div className="card bg-dark border-secondary text-center">
                    <div className="card-body py-5">
                        <div className="spinner-border text-info mb-3" role="status"><span className="visually-hidden">Loading...</span></div>
                        <h5 className="text-white">Loading Login Tracking Dashboard...</h5>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container py-4 bg-secondary bg-opacity-10 rounded-4">
            {/* header */}
            <div className="card bg-dark border-primary mb-4">
                <div className="card-header bg-primary bg-opacity-25 border-primary d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div>
                        <h4 className="card-title mb-0 text-info"><i className="bi bi-shield-check me-2" />Login Tracking Dashboard</h4>
                        <small className="text-warning">Users, devices, IP addresses and access rules</small>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        {legacyCount > 0 && <button className="btn btn-sm btn-outline-warning" onClick={handleCleanup}><i className="bi bi-broom me-1" />Clean old data ({legacyCount})</button>}
                        <select className="form-select form-select-sm bg-dark text-white border-secondary" style={{ width: 'auto' }} value={limit} onChange={(e) => setLimit(Number(e.target.value))} title="How many recent logins to load">
                            <option value="500">Last 500</option><option value="1000">Last 1000</option><option value="3000">Last 3000</option><option value="10000">Last 10000</option>
                        </select>
                    </div>
                </div>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            {notice && (
                <div className="alert alert-info d-flex justify-content-between py-2">
                    <span>{notice}</span><button className="btn-close" onClick={() => setNotice('')} />
                </div>
            )}

            {/* stat cards */}
            <div className="row mb-2">
                {cards.map((c) => (
                    <div key={c.key} className="col-xl-2 col-md-4 col-6 mb-3">
                        <div
                            className={`card h-100 border-${c.tone} ${cardFilter === c.key ? 'border-3' : ''}`}
                            style={{ cursor: 'pointer', backgroundColor: cardFilter === c.key ? 'rgba(255,255,255,0.08)' : '' }}
                            onClick={() => { setCardFilter(cardFilter === c.key ? null : c.key); setTab('activity'); }}
                        >
                            <div className="card-body py-3">
                                <div className="d-flex justify-content-between">
                                    <div><h6 className="card-title text-muted small">{c.label}</h6><h3 className={`text-${c.tone} mb-0`}>{c.value}</h3></div>
                                    <i className={`bi ${c.icon} fs-3 text-${c.tone} opacity-50 align-self-center`} />
                                </div>
                                {cardFilter === c.key && <small className={`text-${c.tone}`}><i className="bi bi-funnel me-1" />Filtering</small>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* tabs */}
            <ul className="nav nav-pills mb-3 gap-1">
                {tabs.map(([key, label, icon]) => (
                    <li key={key} className="nav-item">
                        <button className={`nav-link ${tab === key ? 'active' : 'text-info'}`} onClick={() => setTab(key)}><i className={`bi ${icon} me-1`} />{label}</button>
                    </li>
                ))}
            </ul>

            {/* ===== activity ===== */}
            {tab === 'activity' && (
                <>
                    <div className="card bg-dark border-secondary mb-4">
                        <div className="card-body">
                            <div className="row g-3">
                                <div className="col-md-2">
                                    <label className="form-label text-warning">Quick view</label>
                                    <select className="form-select bg-dark text-white border-secondary" value={currentView} onChange={(e) => setCurrentView(e.target.value)}>
                                        <option value="all">All time</option><option value="today">Today</option><option value="week">Last 7 days</option><option value="month">Last 30 days</option>
                                    </select>
                                </div>
                                <div className="col-md-2">
                                    <label className="form-label text-warning">User type</label>
                                    <select className="form-select bg-dark text-white border-secondary" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                                        <option value="all">All</option><option value="admin">Admin</option><option value="user">User</option><option value="guest">Guest</option>
                                    </select>
                                </div>
                                <div className="col-md-2">
                                    <label className="form-label text-warning">Start date</label>
                                    <input type="date" className="form-control bg-dark text-white border-secondary" value={dateRange.startDate} onChange={(e) => setDateRange((p) => ({ ...p, startDate: e.target.value }))} />
                                </div>
                                <div className="col-md-2">
                                    <label className="form-label text-warning">End date</label>
                                    <input type="date" className="form-control bg-dark text-white border-secondary" value={dateRange.endDate} onChange={(e) => setDateRange((p) => ({ ...p, endDate: e.target.value }))} />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label text-warning">Search</label>
                                    <div className="d-flex gap-2">
                                        <input type="text" className="form-control bg-dark text-white border-secondary" placeholder="Name, email, IP, device, city..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                        <button className="btn btn-outline-info" onClick={clearFilters} title="Clear filters"><i className="bi bi-x-lg" /></button>
                                        <button className="btn btn-outline-success text-nowrap" onClick={exportToCSV} disabled={filteredLogs.length === 0}>Export <span className="text-warning">({filteredLogs.length})</span></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card bg-dark border-secondary">
                        <div className="card-header bg-info bg-opacity-25 border-info d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <h6 className="mb-0 text-white">
                                <i className="bi bi-list me-2" />Login activity ({filteredLogs.length})
                                {cardFilter && <span className="badge bg-warning text-dark ms-2">Filtered</span>}
                            </h6>
                            <div className="d-flex align-items-center gap-3">
                                {lastUpdated && <span className="badge bg-warning text-dark">Updated {lastUpdated.toLocaleTimeString('en-IN')}</span>}
                                <select className="form-select form-select-sm bg-dark text-white border-secondary" style={{ width: 'auto' }} value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}>
                                    <option value="10">10 per page</option><option value="20">20 per page</option><option value="50">50 per page</option><option value="100">100 per page</option>
                                </select>
                            </div>
                        </div>
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-dark table-hover align-middle mb-0">
                                    <thead><tr><th>User</th><th>Device</th><th>IP address</th><th>Login time</th><th>Location</th><th>ISP</th><th>Status</th></tr></thead>
                                    <tbody>
                                        {displayedLogs.length === 0 ? (
                                            <tr><td colSpan="7" className="text-center py-4"><i className="bi bi-inbox fs-3 text-muted d-block mb-2" /><span className="text-muted">No login records found</span></td></tr>
                                        ) : displayedLogs.map((l) => (
                                            <tr key={l.id}>
                                                <td><UserCell name={l.name} email={l.email} photo={l.photo} type={l.userType} /></td>
                                                <td>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <i className={`bi ${deviceIcon(l.deviceKind)} fs-5 text-info`} />
                                                        <div>
                                                            <div>{l.deviceName}{l.deviceModelApprox && <small className="text-muted ms-1">(best guess)</small>}</div>
                                                            <small className="text-muted">{[l.os, l.osVersion].filter(Boolean).join(' ')} · {l.browser}</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <code className="text-warning">{l.ipAddress}</code>
                                                    {l.ipChanged && <span className="badge bg-secondary ms-1" title={`Same device, previous IP: ${l.previousIP}`}>network changed</span>}
                                                </td>
                                                <td><small className="text-white">{formatDate(l.t)}</small></td>
                                                <td><small className="text-muted">{[l.city, l.country].filter((x) => x && x !== 'Unknown').join(', ') || 'Unknown'}</small></td>
                                                <td><small className="text-muted">{l.isp || 'Unknown'}</small></td>
                                                <td>
                                                    {l.status === 'SUSPICIOUS'
                                                        ? <span className="badge bg-warning text-dark" title={l.suspiciousReason || ''}><i className="bi bi-exclamation-triangle me-1" />Suspicious</span>
                                                        : <span className="badge bg-success"><i className="bi bi-check me-1" />Success</span>}
                                                    {l.riskLevel && l.riskLevel !== 'LOW' && <small className="d-block text-muted">{l.riskLevel} risk</small>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination page={currentPage} totalPages={totalPages} onPage={(p) => setCurrentPage(Math.min(totalPages, Math.max(1, p)))}
                                from={filteredLogs.length ? startIndex + 1 : 0} to={Math.min(endIndex, filteredLogs.length)} total={filteredLogs.length} />
                        </div>
                    </div>
                </>
            )}

            {/* ===== users ===== */}
            {tab === 'users' && (
                <div className="card bg-dark border-secondary">
                    <div className="card-header bg-info bg-opacity-25 border-info"><h6 className="mb-0 text-white"><i className="bi bi-people me-2" />User accounts ({userRows.length})</h6></div>
                    <div className="table-responsive">
                        <table className="table table-dark table-hover align-middle mb-0" data-tick={tick}>
                            <thead><tr><th>User</th><th>Logins</th><th>Devices</th><th>IPs</th><th>Last device</th><th>Last login</th><th>Status</th><th /></tr></thead>
                            <tbody>
                                {userRows.length === 0 ? (
                                    <tr><td colSpan="8" className="text-center py-4 text-muted">No users yet</td></tr>
                                ) : userRows.map((u) => {
                                    const online = u.lastActive && Date.now() - u.lastActive < ONLINE_MS;
                                    return (
                                        <tr key={u.userId}>
                                            <td><UserCell name={u.name} email={u.email} photo={u.photo} type={u.type} size={40} /></td>
                                            <td><span className="badge bg-primary">{u.logins}</span>{u.suspicious > 0 && <span className="badge bg-warning text-dark ms-1" title="Suspicious logins">{u.suspicious}</span>}</td>
                                            <td><span className="badge bg-secondary">{u.devices.size}</span></td>
                                            <td><span className="badge bg-secondary">{u.ips.size}</span></td>
                                            <td><small>{u.lastDevice}</small><small className="d-block text-muted"><code>{isKnownIP(u.lastIP) ? u.lastIP : ''}</code></small></td>
                                            <td><small className="text-white">{formatDate(u.lastLogin)}</small></td>
                                            <td>{online ? <span className="badge bg-success"><i className="bi bi-circle-fill me-1" style={{ fontSize: 8 }} />Online</span> : <span className="badge bg-secondary">Offline</span>}</td>
                                            <td className="text-end"><button className="btn btn-sm btn-outline-danger" onClick={() => handleForceLogout(u)} title="Sign this user out everywhere"><i className="bi bi-box-arrow-right me-1" />Force logout</button></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {tab === 'devices' && <IPUsageAnalytics loginLogs={loginLogs} />}
            {tab === 'access' && <IPWhitelistManager knownIPs={knownIPs} />}
            {tab === 'security' && <SecurityEventsPanel />}

            <div className="text-center mt-3">
                <small className="text-muted"><i className="bi bi-circle-fill text-success me-1" style={{ fontSize: 8 }} />Live updates on</small>
            </div>
        </div>
    );
};

export default LoginTrackingDashboard;
