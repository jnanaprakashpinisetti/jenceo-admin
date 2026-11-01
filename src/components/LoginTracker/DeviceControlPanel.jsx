// LoginTracker/DeviceControlPanel.jsx
// Device control, same idea as IP control:
//   - Block a device: it cannot open the site or sign in from ANY network.
//   - "Require approval for new devices": a device that has never been approved must wait for an admin.
import React, { useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { normalizeUser } from './userInfo';
import { deviceAccessManager, setSecuritySettings } from './trackUserLogin';
import { deviceIcon } from './UserAvatar';
import { formatDate } from './logUtils';
import { useAccessActions, DeviceStatusBadge } from './AccessButtons';

const FILTERS = [
    ['all', 'All'], ['blocked', 'Blocked'], ['pending', 'Waiting for approval'], ['approved', 'Approved'], ['other', 'Not approved / allowed'],
];

const DeviceControlPanel = ({ lists, devices = {}, profiles = {} }) => {
    const auth = useAuth() || {};
    const adminName = normalizeUser(auth.currentUser || auth.user || {}).name;

    const [notice, setNotice] = useState(null);
    const [busy, setBusy] = useState(false);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const timer = useRef(null);
    const notify = (type, text) => {
        setNotice({ type, text });
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setNotice(null), 7000);
    };
    const actions = useAccessActions({ lists, adminName, notify });
    const approvalOn = !!lists.security.requireDeviceApproval;

    const rows = useMemo(() => Object.entries(devices).map(([key, d]) => {
        const deviceId = d.deviceId || key;
        const userNames = Object.keys(d.users || {}).map((k) => (profiles[k] && profiles[k].name) || k);
        return {
            key, deviceId, name: d.name || 'Unknown device', kind: d.type, os: d.os, osVersion: d.osVersion, browser: d.browser,
            lastIP: d.lastIP, networks: Object.keys(d.ips || {}).length, logins: d.loginCount || 0,
            lastSeen: d.lastSeen || 0, firstUser: userNames[0] || '', userNames, status: lists.deviceState(deviceId).status,
        };
    }).sort((a, b) => b.lastSeen - a.lastSeen), [devices, profiles, lists]);

    const pending = useMemo(() => Object.values(lists.deviceRules).filter((r) => r.status === 'pending')
        .sort((a, b) => new Date(b.requestedAt || 0) - new Date(a.requestedAt || 0)), [lists.deviceRules]);

    const shown = rows.filter((r) => {
        if (filter === 'other' ? !['unapproved', 'allowed', 'expired'].includes(r.status) : filter !== 'all' && r.status !== filter) return false;
        const q = search.trim().toLowerCase();
        return !q || `${r.name} ${r.os} ${r.browser} ${r.lastIP} ${r.userNames.join(' ')}`.toLowerCase().includes(q);
    });

    const toggleApproval = async () => {
        setBusy(true);
        try {
            if (!approvalOn) {
                const n = rows.filter((r) => !['blocked', 'approved'].includes(r.status)).length;
                const ok = await actions.confirm({
                    title: 'Require approval for new devices?', tone: 'warning', confirmText: 'Turn on',
                    message: `${n} device(s) that already signed in will be approved automatically.\n\nAfter this, a user on any other device can sign in only after you approve that device here.\n\nKeep another approved admin device available. If you ever get locked out, set IPSettings/SecuritySettings/requireDeviceApproval to false in the Firebase console.`,
                });
                if (!ok) return;
                await deviceAccessManager.approveAllKnownDevices(adminName);
                if (!lists.deviceState(lists.myDeviceId).blocked) {
                    await deviceAccessManager.setDeviceStatus(lists.myDeviceId, 'approved', { name: 'Admin device', by: adminName, reason: 'Approved when approval mode was turned on' });
                }
                const r = await setSecuritySettings({ requireDeviceApproval: true }, adminName);
                notify(r.success ? 'warning' : 'danger', r.success ? 'Approval mode is ON. New devices must be approved here.' : r.error);
            } else {
                const ok = await actions.confirm({ title: 'Turn off device approval?', message: 'New devices will be able to sign in without approval (blocked devices stay blocked).', tone: 'warning', confirmText: 'Turn off' });
                if (!ok) return;
                const r = await setSecuritySettings({ requireDeviceApproval: false }, adminName);
                notify(r.success ? 'info' : 'danger', r.success ? 'Approval mode is OFF.' : r.error);
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="card bg-dark border-primary">
            <div className="card-header bg-primary bg-opacity-25 border-primary d-flex justify-content-between align-items-center flex-wrap gap-2">
                <h6 className="mb-0 text-white"><i className="bi bi-phone-flip me-2" />Device control</h6>
                <div className="form-check form-switch mb-0">
                    <input className="form-check-input" type="checkbox" id="approvalSwitch" checked={approvalOn} onChange={toggleApproval} disabled={busy} />
                    <label className="form-check-label text-white" htmlFor="approvalSwitch">
                        {approvalOn ? 'New devices need approval' : 'New devices can sign in freely'}
                    </label>
                </div>
            </div>

            <div className="card-body">
                {notice && (
                    <div className={`alert alert-${notice.type} py-2 d-flex justify-content-between`} role="alert">
                        <span>{notice.text}</span><button type="button" className="btn-close" onClick={() => setNotice(null)} />
                    </div>
                )}

                <small className="text-muted d-block mb-3">
                    A blocked device is stopped on every network. The block follows the browser&apos;s device id, so someone who clears site data
                    or uses a private window looks like a new device. Turn on <strong>approval mode</strong> to close that gap.
                </small>

                {pending.length > 0 && (
                    <div className="card border-warning bg-warning bg-opacity-10 mb-4">
                        <div className="card-header border-warning"><strong className="text-warning"><i className="bi bi-hourglass-split me-2" />Waiting for approval ({pending.length})</strong></div>
                        <div className="table-responsive">
                            <table className="table table-dark table-sm align-middle mb-0">
                                <tbody>
                                    {pending.map((r) => (
                                        <tr key={r.deviceId}>
                                            <td><strong>{r.name || 'Unknown device'}</strong><small className="d-block text-muted">{r.userName ? `${r.userName} · ` : ''}{r.ipAddress}</small></td>
                                            <td><small className="text-muted">Requested {formatDate(r.requestedAt)}</small></td>
                                            <td className="text-end">{actions.renderDeviceButtons(r.deviceId, r.name, r.userName)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="row g-2 mb-3">
                    <div className="col-md-8">
                        <input type="search" className="form-control bg-dark text-white border-secondary" placeholder="Search device, user, OS, browser or IP..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div className="col-md-4">
                        <select className="form-select bg-dark text-white border-secondary" value={filter} onChange={(e) => setFilter(e.target.value)}>
                            {FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="table table-dark table-hover align-middle">
                        <thead><tr><th>Device</th><th>Used by</th><th>Current IP</th><th>Logins</th><th>Last seen</th><th>Status</th><th>Control</th></tr></thead>
                        <tbody>
                            {shown.length === 0 ? (
                                <tr><td colSpan="7" className="text-center py-4 text-muted">No devices found</td></tr>
                            ) : shown.map((r) => (
                                <tr key={r.key}>
                                    <td>
                                        <div className="d-flex align-items-center gap-2">
                                            <i className={`bi ${deviceIcon(r.kind)} fs-4 text-info`} />
                                            <div>
                                                <strong>{r.name}</strong>{r.deviceId === lists.myDeviceId && <span className="badge bg-info text-dark ms-2">This device</span>}
                                                <small className="d-block text-muted">{[r.os, r.osVersion].filter(Boolean).join(' ')} · {r.browser}</small>
                                            </div>
                                        </div>
                                    </td>
                                    <td><small>{r.firstUser || '—'}</small>{r.userNames.length > 1 && <small className="text-muted"> +{r.userNames.length - 1}</small>}</td>
                                    <td>
                                        <code className="text-warning">{r.lastIP || 'N/A'}</code>
                                        {r.networks > 1 && <span className="badge bg-secondary ms-2">+{r.networks - 1} other</span>}
                                    </td>
                                    <td><span className="badge bg-primary">{r.logins}</span></td>
                                    <td><small className="text-white">{formatDate(r.lastSeen)}</small></td>
                                    <td><DeviceStatusBadge status={r.status} /></td>
                                    <td>{actions.renderDeviceButtons(r.deviceId, r.name, r.firstUser)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {actions.dialog}
        </div>
    );
};

export default DeviceControlPanel;
