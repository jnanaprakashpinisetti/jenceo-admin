// LoginTracker/IPUsageAnalytics.jsx
// Two views of the same login data:
//   "By device"  one row per device (iPhone 17, Samsung Galaxy S24 Ultra, ...). Network changes
//                do NOT create new rows: the device shows ONE current IP plus "+N other IPs".
//   "By IP"      one row per IP, with the users and devices that used it.
import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ipWhitelistManager } from './trackUserLogin';
import { normalizeUser } from './userInfo';
import { UserCell, deviceIcon } from './UserAvatar';
import { isKnownIP, formatDate } from './logUtils';

const Stat = ({ icon, label, value, tone }) => (
    <div className="col-6 col-md-3 mb-3">
        <div className={`card text-center border-${tone} border-opacity-25 bg-${tone} bg-opacity-10 h-100`}>
            <div className="card-body py-3">
                <i className={`bi ${icon} fs-3 text-${tone}`} />
                <div className="text-light opacity-75 small">{label}</div>
                <h4 className={`text-${tone} mb-0`}>{value}</h4>
            </div>
        </div>
    </div>
);

const Section = ({ title, icon, count, children }) => (
    <div className="card bg-transparent border border-secondary border-opacity-50 mb-3">
        <div className="card-header bg-secondary bg-opacity-10 d-flex justify-content-between">
            <h6 className="mb-0 text-light"><i className={`bi ${icon} me-2 text-info`} />{title}</h6>
            <span className="badge bg-info">{count}</span>
        </div>
        <div className="card-body" style={{ maxHeight: 260, overflowY: 'auto' }}>{children}</div>
    </div>
);

const IPUsageAnalytics = ({ loginLogs = [] }) => {
    const auth = useAuth() || {};
    const adminName = normalizeUser(auth.currentUser || auth.user || {}).name;

    const [view, setView] = useState('devices');
    const [selected, setSelected] = useState(null); // { kind: 'device' | 'ip', key }
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);

    const data = useMemo(() => {
        const users = new Map();
        const devices = new Map();
        const ips = new Map();
        const bump = (m, k) => m.set(k, (m.get(k) || 0) + 1);
        const span = (o, t) => {
            if (!t) return;
            o.first = o.first ? Math.min(o.first, t) : t;
            o.last = Math.max(o.last || 0, t);
        };

        // loginLogs are newest first, so the first record we meet carries the latest name / photo / IP
        loginLogs.forEach((log) => {
            if (!users.has(log.userId)) {
                users.set(log.userId, { userId: log.userId, name: log.name, email: log.email, photo: log.photo, type: log.userType, count: 0 });
            }
            users.get(log.userId).count += 1;

            let d = devices.get(log.deviceKey);
            if (!d) {
                d = {
                    key: log.deviceKey, name: log.deviceName, kind: log.deviceKind, os: log.os, osVersion: log.osVersion,
                    browser: log.browser, brand: log.deviceBrand, model: log.deviceModel, modelCode: log.deviceModelCode,
                    approx: log.deviceModelApprox, screen: log.screen, lastIP: log.ipAddress,
                    country: log.country || 'Unknown', city: log.city || 'Unknown',
                    users: new Map(), ips: new Map(), count: 0, first: 0, last: 0,
                };
                devices.set(log.deviceKey, d);
            }
            d.count += 1;
            span(d, log.t);
            bump(d.users, log.userId);
            if (isKnownIP(log.ipAddress)) {
                const e = d.ips.get(log.ipAddress) || { count: 0, last: 0 };
                e.count += 1;
                e.last = Math.max(e.last, log.t);
                d.ips.set(log.ipAddress, e);
            }

            if (isKnownIP(log.ipAddress)) {
                let r = ips.get(log.ipAddress);
                if (!r) {
                    r = {
                        ip: log.ipAddress, country: log.country || 'Unknown', city: log.city || 'Unknown', isp: log.isp || 'Unknown',
                        users: new Map(), devices: new Map(), browsers: new Map(), count: 0, first: 0, last: 0,
                    };
                    ips.set(log.ipAddress, r);
                }
                r.count += 1;
                span(r, log.t);
                bump(r.users, log.userId);
                bump(r.devices, log.deviceKey);
                bump(r.browsers, log.browser || 'Unknown');
            }
        });

        return {
            users,
            deviceMap: devices,
            ipMap: ips,
            deviceList: [...devices.values()].sort((a, b) => b.last - a.last),
            ipList: [...ips.values()].sort((a, b) => b.count - a.count),
        };
    }, [loginLogs]);

    const { users, deviceMap, ipMap, deviceList, ipList } = data;
    const selDevice = selected && selected.kind === 'device' ? deviceMap.get(selected.key) : null;
    const selIP = selected && selected.kind === 'ip' ? ipMap.get(selected.key) : null;

    const userCell = (id, size = 30) => {
        const u = users.get(id) || { name: id };
        return <UserCell name={u.name} email={u.email} photo={u.photo} type={u.type} size={size} />;
    };

    const allow = async (ip) => {
        setBusy(true);
        const r = await ipWhitelistManager.addToWhitelist(ip, 'Added from IP analytics', adminName);
        setNotice(r.success ? `${ip} is now on the whitelist` : r.error);
        setBusy(false);
    };
    const block = async (ip) => {
        if (!window.confirm(`Block ${ip}? Nobody will be able to open the site from this IP.`)) return;
        setBusy(true);
        const r = await ipWhitelistManager.addToBlacklist(ip, 'Blocked from IP analytics', adminName);
        setNotice(r.success ? `${ip} is now blocked` : r.error);
        setBusy(false);
    };
    const close = () => { setSelected(null); setNotice(''); };

    const ipActions = (ip) => (
        <div className="btn-group btn-group-sm">
            <button className="btn btn-outline-success" disabled={busy} onClick={(e) => { e.stopPropagation(); allow(ip); }}>Allow</button>
            <button className="btn btn-outline-danger" disabled={busy} onClick={(e) => { e.stopPropagation(); block(ip); }}>Block</button>
        </div>
    );

    return (
        <>
            <div className="card bg-dark border-info">
                <div className="card-header bg-info bg-opacity-25 border-info d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <h6 className="mb-0 text-white"><i className="bi bi-bar-chart me-2" />Devices &amp; IP usage</h6>
                    <div className="btn-group btn-group-sm">
                        <button className={`btn ${view === 'devices' ? 'btn-info' : 'btn-outline-info'}`} onClick={() => setView('devices')}>By device ({deviceList.length})</button>
                        <button className={`btn ${view === 'ips' ? 'btn-info' : 'btn-outline-info'}`} onClick={() => setView('ips')}>By IP ({ipList.length})</button>
                    </div>
                </div>
                <div className="card-body">
                    <div className="table-responsive">
                        {view === 'devices' ? (
                            <table className="table table-dark table-hover align-middle">
                                <thead>
                                    <tr><th>Device</th><th>Used by</th><th>Current IP</th><th>Logins</th><th>Location</th><th>Last seen</th></tr>
                                </thead>
                                <tbody>
                                    {deviceList.length === 0 ? (
                                        <tr><td colSpan="6" className="text-center py-4 text-muted">No device data yet</td></tr>
                                    ) : deviceList.map((d) => {
                                        const others = d.ips.size - 1;
                                        const ids = [...d.users.keys()];
                                        return (
                                            <tr key={d.key} style={{ cursor: 'pointer' }} onClick={() => setSelected({ kind: 'device', key: d.key })}>
                                                <td>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <i className={`bi ${deviceIcon(d.kind)} fs-4 text-info`} />
                                                        <div>
                                                            <strong>{d.name}</strong>{d.approx && <small className="text-muted ms-1" title="Exact model cannot be read from this browser">(best guess)</small>}
                                                            <small className="d-block text-muted">{[d.os, d.osVersion].filter(Boolean).join(' ')} · {d.browser}</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    {userCell(ids[0], 28)}
                                                    {ids.length > 1 && <small className="text-muted">+{ids.length - 1} more</small>}
                                                </td>
                                                <td>
                                                    <code className="text-warning">{isKnownIP(d.lastIP) ? d.lastIP : 'N/A'}</code>
                                                    {others > 0 && (
                                                        <span className="badge bg-secondary ms-2" title={[...d.ips.keys()].join('\n')}>+{others} other network{others > 1 ? 's' : ''}</span>
                                                    )}
                                                </td>
                                                <td><span className="badge bg-primary">{d.count}</span></td>
                                                <td><small className="text-muted">{d.city}, {d.country}</small></td>
                                                <td><small className="text-white">{formatDate(d.last)}</small></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <table className="table table-dark table-hover align-middle">
                                <thead>
                                    <tr><th>IP address</th><th>Logins</th><th>Users</th><th>Devices</th><th>Location</th><th>ISP</th><th>Last seen</th><th /></tr>
                                </thead>
                                <tbody>
                                    {ipList.length === 0 ? (
                                        <tr><td colSpan="8" className="text-center py-4 text-muted">No IP data yet</td></tr>
                                    ) : ipList.map((r) => (
                                        <tr key={r.ip} style={{ cursor: 'pointer' }} onClick={() => setSelected({ kind: 'ip', key: r.ip })}>
                                            <td><code className="text-warning">{r.ip}</code></td>
                                            <td><span className="badge bg-primary">{r.count}</span></td>
                                            <td><span className="badge bg-info">{r.users.size}</span></td>
                                            <td><span className="badge bg-secondary">{r.devices.size}</span></td>
                                            <td><small className="text-muted">{r.city}, {r.country}</small></td>
                                            <td><small className="text-muted">{r.isp}</small></td>
                                            <td><small className="text-white">{formatDate(r.last)}</small></td>
                                            <td>{ipActions(r.ip)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {(selDevice || selIP) && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.85)', overflowY: 'auto' }} onClick={close}>
                    <div className="modal-dialog modal-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-content bg-dark border border-light border-opacity-10 rounded-4">
                            <div className="modal-header border-bottom border-light border-opacity-10">
                                <h5 className="modal-title text-light">
                                    {selDevice
                                        ? <><i className={`bi ${deviceIcon(selDevice.kind)} me-2 text-info`} />{selDevice.name}</>
                                        : <><i className="bi bi-globe me-2 text-primary" />IP address <span className="text-warning">{selIP.ip}</span></>}
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={close} />
                            </div>
                            <div className="modal-body">
                                {notice && <div className="alert alert-info py-2">{notice}</div>}

                                {selDevice && (
                                    <>
                                        <div className="row">
                                            <Stat icon="bi-box-arrow-in-right" label="Logins" value={selDevice.count} tone="primary" />
                                            <Stat icon="bi-people" label="Users" value={selDevice.users.size} tone="info" />
                                            <Stat icon="bi-wifi" label="Networks (IPs)" value={selDevice.ips.size} tone="warning" />
                                            <Stat icon="bi-clock-history" label="First seen" value={<small>{formatDate(selDevice.first)}</small>} tone="success" />
                                        </div>
                                        <div className="card bg-transparent border border-secondary border-opacity-50 mb-3">
                                            <div className="card-body">
                                                <div className="row small">
                                                    <div className="col-md-4"><span className="text-muted">Brand</span><div className="text-light">{selDevice.brand || '—'}</div></div>
                                                    <div className="col-md-4"><span className="text-muted">Model</span><div className="text-light">{selDevice.model || '—'}{selDevice.modelCode ? ` (${selDevice.modelCode})` : ''}</div></div>
                                                    <div className="col-md-4"><span className="text-muted">Type</span><div className="text-light">{selDevice.kind || '—'}</div></div>
                                                    <div className="col-md-4 mt-2"><span className="text-muted">System</span><div className="text-light">{[selDevice.os, selDevice.osVersion].filter(Boolean).join(' ') || '—'}</div></div>
                                                    <div className="col-md-4 mt-2"><span className="text-muted">Browser</span><div className="text-light">{selDevice.browser || '—'}</div></div>
                                                    <div className="col-md-4 mt-2"><span className="text-muted">Screen</span><div className="text-light">{selDevice.screen || '—'}</div></div>
                                                </div>
                                                {selDevice.approx && <small className="text-warning d-block mt-2">iPhones do not reveal their exact model to websites, so this is matched by screen size and may list several models.</small>}
                                            </div>
                                        </div>
                                        <div className="row">
                                            <div className="col-md-6">
                                                <Section title="Users on this device" icon="bi-person-badge" count={selDevice.users.size}>
                                                    {[...selDevice.users.entries()].map(([id, n]) => (
                                                        <div key={id} className="d-flex justify-content-between align-items-center mb-2">{userCell(id)}<span className="badge bg-info">{n}</span></div>
                                                    ))}
                                                </Section>
                                            </div>
                                            <div className="col-md-6">
                                                <Section title="Networks this device used" icon="bi-wifi" count={selDevice.ips.size}>
                                                    {[...selDevice.ips.entries()].sort((a, b) => b[1].last - a[1].last).map(([ip, e]) => (
                                                        <div key={ip} className="d-flex justify-content-between align-items-center mb-2">
                                                            <div>
                                                                <code className="text-warning">{ip}</code>
                                                                {ip === selDevice.lastIP && <span className="badge bg-success ms-2">current</span>}
                                                                <small className="d-block text-muted">{e.count} logins · {formatDate(e.last)}</small>
                                                            </div>
                                                            {ipActions(ip)}
                                                        </div>
                                                    ))}
                                                </Section>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {selIP && (
                                    <>
                                        <div className="row">
                                            <Stat icon="bi-box-arrow-in-right" label="Total logins" value={selIP.count} tone="primary" />
                                            <Stat icon="bi-people" label="Unique users" value={selIP.users.size} tone="info" />
                                            <Stat icon="bi-phone" label="Unique devices" value={selIP.devices.size} tone="success" />
                                            <Stat icon="bi-browser-chrome" label="Browsers" value={selIP.browsers.size} tone="warning" />
                                        </div>
                                        <div className="card bg-transparent border border-secondary border-opacity-50 mb-3">
                                            <div className="card-body">
                                                <div className="row text-center small">
                                                    <div className="col-md-4"><span className="text-info">COUNTRY</span><div className="text-light">{selIP.country}</div></div>
                                                    <div className="col-md-4"><span className="text-info">CITY</span><div className="text-light">{selIP.city}</div></div>
                                                    <div className="col-md-4"><span className="text-info">INTERNET PROVIDER</span><div className="text-light">{selIP.isp}</div></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="row">
                                            <div className="col-md-6">
                                                <Section title="User accounts" icon="bi-person-badge" count={selIP.users.size}>
                                                    {[...selIP.users.entries()].sort((a, b) => b[1] - a[1]).map(([id, n]) => (
                                                        <div key={id} className="d-flex justify-content-between align-items-center mb-2">{userCell(id)}<span className="badge bg-info">{n}</span></div>
                                                    ))}
                                                </Section>
                                            </div>
                                            <div className="col-md-6">
                                                <Section title="Devices" icon="bi-devices" count={selIP.devices.size}>
                                                    {[...selIP.devices.entries()].sort((a, b) => b[1] - a[1]).map(([key, n]) => {
                                                        const d = deviceMap.get(key) || {};
                                                        return (
                                                            <div key={key} className="d-flex justify-content-between align-items-center mb-2">
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <i className={`bi ${deviceIcon(d.kind)} text-success fs-5`} />
                                                                    <div><div className="text-light">{d.name}</div><small className="text-muted">{[d.os, d.osVersion].filter(Boolean).join(' ')} · {d.browser}</small></div>
                                                                </div>
                                                                <span className="badge bg-success">{n}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </Section>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="modal-footer border-top border-light border-opacity-10">
                                {selIP && <>{ipActions(selIP.ip)}</>}
                                <button type="button" className="btn btn-outline-light" onClick={close}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default IPUsageAnalytics;
