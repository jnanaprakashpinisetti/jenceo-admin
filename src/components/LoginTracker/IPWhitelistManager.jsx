// LoginTracker/IPWhitelistManager.jsx
// Access control: choose which IPs can open the site, and block IPs. Updates live.
// Needs the shared `lists` object from useAccessLists() (the dashboard passes it in).
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ipWhitelistManager } from './trackUserLogin';
import { normalizeUser } from './userInfo';
import { useConfirm, DURATIONS } from './ConfirmDialog';
import {
    parseRule, RULE_LABELS, isExpired, isEntryActive, ipMatchesRule, evaluateAccess, REASON_MESSAGES,
} from './ipUtils';

const EXPIRY = [
    { label: 'Never expires', ms: 0 },
    { label: '1 hour', ms: 3600e3 },
    { label: '8 hours', ms: 8 * 3600e3 },
    { label: '24 hours', ms: 24 * 3600e3 },
    { label: '7 days', ms: 7 * 86400e3 },
    { label: '30 days', ms: 30 * 86400e3 },
];

const statusOf = (e) => {
    if (isExpired(e)) return { text: 'Expired', cls: 'bg-secondary' };
    if (e.active === false) return parseRule(e.ip).type === 'single' ? { text: 'Blocked', cls: 'bg-danger' } : { text: 'Off', cls: 'bg-secondary' };
    return { text: 'Allowed', cls: 'bg-success' };
};

const IPWhitelistManager = ({ lists, knownIPs = [] }) => {
    const auth = useAuth() || {};
    const adminName = normalizeUser(auth.currentUser || auth.user || {}).name;
    const [confirm, dialog] = useConfirm();

    const { restriction, whitelist, blacklist, myIP } = lists;
    const enabled = !!restriction.enabled;

    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState(null);
    const [mode, setMode] = useState('single'); // single | bulk
    const [ruleInput, setRuleInput] = useState('');
    const [bulkText, setBulkText] = useState('');
    const [description, setDescription] = useState('');
    const [expiry, setExpiry] = useState(0);
    const [blockInput, setBlockInput] = useState('');
    const [blockReason, setBlockReason] = useState('');
    const [blockDuration, setBlockDuration] = useState(0);
    const [filter, setFilter] = useState('');
    const noticeTimer = useRef(null);

    const flash = (type, text) => {
        setNotice({ type, text });
        clearTimeout(noticeTimer.current);
        noticeTimer.current = setTimeout(() => setNotice(null), 7000);
    };
    useEffect(() => () => clearTimeout(noticeTimer.current), []);

    const wlList = useMemo(() => Object.values(whitelist).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)), [whitelist]);
    const blList = useMemo(() => Object.values(blacklist).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)), [blacklist]);
    const shownWl = useMemo(() => {
        const q = filter.trim().toLowerCase();
        return q ? wlList.filter((e) => `${e.ip} ${e.description || ''}`.toLowerCase().includes(q)) : wlList;
    }, [wlList, filter]);

    const myAccess = useMemo(
        () => evaluateAccess({ ip: myIP, settings: restriction, whitelist, blacklist }),
        [myIP, restriction, whitelist, blacklist],
    );
    const suggestions = useMemo(
        () => knownIPs.filter((k) => !wlList.some((e) => isEntryActive(e) && ipMatchesRule(k.ip, e.ip))).slice(0, 8),
        [knownIPs, wlList],
    );

    const parsed = ruleInput.trim() ? parseRule(ruleInput) : null;
    const expiresAt = () => (expiry ? new Date(Date.now() + expiry).toISOString() : null);
    const run = async (fn) => {
        setBusy(true);
        try { return await fn(); } finally { setBusy(false); }
    };

    /* ---------- actions ---------- */
    const handleAdd = () => run(async () => {
        if (mode === 'bulk') {
            const r = await ipWhitelistManager.addManyToWhitelist(bulkText, description, adminName, { expiresAt: expiresAt() });
            if (r.added + r.updated > 0) { setBulkText(''); setDescription(''); }
            const bad = r.invalid.slice(0, 3).map((x) => x.input).join(', ');
            flash(r.invalid.length ? 'warning' : 'success',
                `${r.added} added, ${r.updated} updated${r.invalid.length ? `, ${r.invalid.length} skipped (${bad}${r.invalid.length > 3 ? '...' : ''})` : ''}`);
            return;
        }
        const r = await ipWhitelistManager.addToWhitelist(ruleInput, description, adminName, { expiresAt: expiresAt() });
        if (r.success) { setRuleInput(''); setDescription(''); flash('success', r.updated ? 'Rule updated' : 'Added to whitelist'); }
        else flash('danger', r.error || 'Could not add rule');
    });

    const handleAddSuggestion = (ip) => run(async () => {
        const r = await ipWhitelistManager.addToWhitelist(ip, 'Added from login history', adminName, { expiresAt: expiresAt() });
        flash(r.success ? 'success' : 'danger', r.success ? `${ip} added` : r.error);
    });

    const handleAddMine = () => run(async () => {
        if (myIP === 'unknown') return flash('danger', 'Could not detect your IP address');
        const r = await ipWhitelistManager.addToWhitelist(myIP, 'My current IP', adminName, { expiresAt: expiresAt() });
        return flash(r.success ? 'success' : 'danger', r.success ? `${myIP} added` : r.error);
    });

    // would this change lock the admin out of the site?
    const locksMeOut = (entry) => {
        if (!ipMatchesRule(myIP, entry.ip)) return false;
        const others = wlList.filter((e) => e.id !== entry.id && isEntryActive(e) && ipMatchesRule(myIP, e.ip));
        return (enabled && others.length === 0) || parseRule(entry.ip).type === 'single';
    };

    const handleToggle = (entry) => run(async () => {
        const turningOff = entry.active !== false;
        if (turningOff && locksMeOut(entry)) {
            const ok = await confirm({
                title: 'This rule covers your IP', tone: 'danger', confirmText: 'Turn off anyway',
                message: 'Turning it off will block you from the site right now. Continue?',
            });
            if (!ok) return;
        }
        const r = await ipWhitelistManager.toggleIPStatus(entry.id, !turningOff, adminName);
        if (!r.success) flash('danger', r.error);
    });

    const handleRemove = (entry) => run(async () => {
        const warn = locksMeOut(entry) ? '\n\nThis rule covers YOUR current IP, so you may lose access.' : '';
        const ok = await confirm({ title: 'Remove this rule?', message: `${entry.ip} will be removed from the whitelist.${warn}`, tone: warn ? 'danger' : 'warning', confirmText: 'Remove' });
        if (!ok) return;
        const r = await ipWhitelistManager.removeFromWhitelist(entry.id, adminName);
        if (!r.success) flash('danger', r.error);
    });

    const handleToggleRestriction = () => run(async () => {
        const next = !enabled;
        if (next) {
            if (myIP === 'unknown') return flash('danger', 'Your IP could not be detected, so restriction was NOT enabled (you could lock yourself out).');
            const mine = await ipWhitelistManager.isIPWhitelisted(myIP);
            const ok = await confirm({
                title: 'Turn on IP restriction?', tone: 'warning', confirmText: 'Turn on',
                message: `Only whitelisted IPs will be able to open the website.${mine ? '' : `\n\nYour current IP (${myIP}) is not whitelisted. It will be added first so you are not locked out.`}`,
            });
            if (!ok) return;
            if (!mine) await ipWhitelistManager.addToWhitelist(myIP, 'Admin IP (added when restriction was enabled)', adminName);
        } else {
            const ok = await confirm({ title: 'Turn off IP restriction?', message: 'Anyone will be able to open the website again (blocked IPs stay blocked).', tone: 'warning', confirmText: 'Turn off' });
            if (!ok) return;
        }
        const r = await ipWhitelistManager.setRestrictionSetting(next, adminName);
        return flash(r.success ? (next ? 'warning' : 'info') : 'danger',
            r.success ? (next ? 'Restriction ON: only whitelisted IPs can open the site.' : 'Restriction OFF: all IPs can open the site.') : r.error);
    });

    const handleBlock = () => run(async () => {
        const rule = parseRule(blockInput);
        if (rule.valid && ipMatchesRule(myIP, rule)) {
            const ok = await confirm({ title: 'This covers your IP', tone: 'danger', confirmText: 'Block anyway', message: `${blockInput.trim()} includes your current IP (${myIP}). You will be blocked right away.` });
            if (!ok) return;
        }
        const expires = blockDuration ? new Date(Date.now() + blockDuration).toISOString() : null;
        const r = await ipWhitelistManager.addToBlacklist(blockInput, blockReason, adminName, { expiresAt: expires });
        if (r.success) { setBlockInput(''); setBlockReason(''); setBlockDuration(0); flash('success', 'Blocked'); }
        else flash('danger', r.error);
    });

    const handleUnblock = (e) => run(async () => {
        const ok = await confirm({ title: 'Unblock this IP?', message: `${e.ip} will be able to open the site again.`, tone: 'success', confirmText: 'Unblock' });
        if (!ok) return;
        const r = await ipWhitelistManager.removeFromBlacklist(e.id, adminName);
        if (!r.success) flash('danger', r.error);
    });

    return (
        <div className="card bg-dark border-warning">
            <div className="card-header bg-warning bg-opacity-25 border-warning">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <h6 className="mb-0 text-white"><i className="bi bi-shield-check me-2" />Access control (IP addresses)</h6>
                    <div className="form-check form-switch mb-0">
                        <input className="form-check-input" type="checkbox" id="restrictionSwitch" checked={enabled} onChange={handleToggleRestriction} disabled={busy} />
                        <label className="form-check-label text-white" htmlFor="restrictionSwitch">
                            {enabled ? 'Only whitelisted IPs can open the site' : 'Everyone can open the site'}
                        </label>
                    </div>
                </div>
            </div>

            <div className="card-body">
                {notice && (
                    <div className={`alert alert-${notice.type} py-2 d-flex justify-content-between`} role="alert">
                        <span>{notice.text}</span>
                        <button type="button" className="btn-close" onClick={() => setNotice(null)} />
                    </div>
                )}

                {/* my IP */}
                <div className="d-flex align-items-center flex-wrap gap-2 mb-3 p-2 rounded border border-secondary">
                    <span className="text-muted">Your IP:</span>
                    <code className="text-warning">{myIP}</code>
                    <span className={`badge ${myAccess.restricted ? 'bg-danger' : 'bg-success'}`}>{myAccess.restricted ? 'Blocked' : 'Allowed'}</span>
                    {myAccess.restricted && <small className="text-muted">{REASON_MESSAGES[myAccess.reason]}</small>}
                    <button className="btn btn-sm btn-outline-warning ms-auto" onClick={handleAddMine} disabled={busy || myIP === 'unknown'}>
                        <i className="bi bi-plus-lg me-1" />Add my IP
                    </button>
                </div>

                <small className="text-muted d-block mb-3">
                    A single IP that is switched <strong>off</strong> is blocked even when restriction is off. When restriction is on,
                    any IP that is not allowed by an active, unexpired rule is blocked.
                </small>

                {/* add */}
                <div className="btn-group btn-group-sm mb-3" role="group">
                    <button className={`btn ${mode === 'single' ? 'btn-warning' : 'btn-outline-warning'}`} onClick={() => setMode('single')}>One rule</button>
                    <button className={`btn ${mode === 'bulk' ? 'btn-warning' : 'btn-outline-warning'}`} onClick={() => setMode('bulk')}>Paste many</button>
                </div>

                <div className="row g-3 mb-3">
                    <div className="col-lg-4">
                        <label className="form-label text-warning">{mode === 'bulk' ? 'IPs (one per line or comma separated)' : 'IP, range or CIDR'}</label>
                        {mode === 'bulk' ? (
                            <textarea className="form-control bg-dark text-white border-secondary" rows={3} value={bulkText}
                                onChange={(e) => setBulkText(e.target.value)} placeholder={'203.0.113.5\n192.168.1.0/24\n10.0.0.1-10.0.0.20'} />
                        ) : (
                            <>
                                <input type="text" className={`form-control bg-dark text-white ${parsed && !parsed.valid ? 'is-invalid' : 'border-secondary'}`}
                                    placeholder="203.0.113.5  |  192.168.1.0/24  |  10.0.*.*" value={ruleInput} onChange={(e) => setRuleInput(e.target.value)} />
                                {parsed && (parsed.valid
                                    ? <small className="text-success">Detected: {RULE_LABELS[parsed.type]}</small>
                                    : <small className="text-danger">{parsed.error}</small>)}
                            </>
                        )}
                    </div>
                    <div className="col-lg-3">
                        <label className="form-label text-warning">Description</label>
                        <input type="text" className="form-control bg-dark text-white border-secondary" placeholder="e.g. Office Wi-Fi" value={description} onChange={(e) => setDescription(e.target.value)} />
                    </div>
                    <div className="col-lg-3">
                        <label className="form-label text-warning">Access lasts</label>
                        <select className="form-select bg-dark text-white border-secondary" value={expiry} onChange={(e) => setExpiry(Number(e.target.value))}>
                            {EXPIRY.map((o) => <option key={o.label} value={o.ms}>{o.label}</option>)}
                        </select>
                    </div>
                    <div className="col-lg-2 d-flex align-items-end">
                        <button className="btn btn-outline-warning w-100" onClick={handleAdd}
                            disabled={busy || (mode === 'bulk' ? !bulkText.trim() : !parsed || !parsed.valid)}>
                            <i className="bi bi-plus-lg me-1" />Add
                        </button>
                    </div>
                </div>

                {suggestions.length > 0 && (
                    <div className="mb-4">
                        <small className="text-muted d-block mb-1">Add an IP that already logged in:</small>
                        <div className="d-flex flex-wrap gap-2">
                            {suggestions.map((k) => (
                                <button key={k.ip} className="btn btn-sm btn-outline-info" onClick={() => handleAddSuggestion(k.ip)} disabled={busy}>
                                    <i className="bi bi-plus me-1" />{k.ip} <span className="badge bg-secondary ms-1">{k.count}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* whitelist */}
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="text-white mb-0">Whitelist ({wlList.length})</h6>
                    <input type="search" className="form-control form-control-sm bg-dark text-white border-secondary" style={{ maxWidth: 220 }}
                        placeholder="Search rules..." value={filter} onChange={(e) => setFilter(e.target.value)} />
                </div>
                <div className="table-responsive mb-4">
                    <table className="table table-dark table-hover align-middle">
                        <thead>
                            <tr><th>Allowed</th><th>IP / rule</th><th>Description</th><th>Expires</th><th>Added</th><th /></tr>
                        </thead>
                        <tbody>
                            {shownWl.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-4 text-muted"><i className="bi bi-inbox fs-3 d-block mb-1" />No rules</td></tr>
                            ) : shownWl.map((e) => {
                                const st = statusOf(e);
                                const type = e.type || parseRule(e.ip).type;
                                return (
                                    <tr key={e.id}>
                                        <td>
                                            <div className="d-flex align-items-center gap-2">
                                                <div className="form-check form-switch mb-0">
                                                    <input className="form-check-input" type="checkbox" checked={e.active !== false} onChange={() => handleToggle(e)} disabled={busy} />
                                                </div>
                                                <span className={`badge ${st.cls}`}>{st.text}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <code className="text-info">{e.ip}</code>
                                            {type && type !== 'single' && <span className="badge bg-secondary ms-2">{RULE_LABELS[type]}</span>}
                                        </td>
                                        <td><small className="text-muted">{e.description || '—'}</small></td>
                                        <td><small className={isExpired(e) ? 'text-danger' : 'text-white'}>{e.expiresAt ? new Date(e.expiresAt).toLocaleString() : 'Never'}</small></td>
                                        <td>
                                            <small className="text-white d-block">{e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '—'}</small>
                                            {e.createdBy && <small className="text-muted">{e.createdBy}</small>}
                                        </td>
                                        <td>
                                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleRemove(e)} disabled={busy} title="Remove">
                                                <i className="bi bi-trash" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* blocklist */}
                <h6 className="text-white mb-2">Blocked IPs ({blList.length}) <small className="text-muted">— blocked even when restriction is off</small></h6>
                <div className="row g-2 mb-3">
                    <div className="col-md-3"><input className="form-control bg-dark text-white border-secondary" placeholder="IP, range or CIDR" value={blockInput} onChange={(e) => setBlockInput(e.target.value)} /></div>
                    <div className="col-md-4"><input className="form-control bg-dark text-white border-secondary" placeholder="Reason (optional)" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} /></div>
                    <div className="col-md-3">
                        <select className="form-select bg-dark text-white border-secondary" value={blockDuration} onChange={(e) => setBlockDuration(Number(e.target.value))}>
                            {DURATIONS.map((d) => <option key={d.label} value={d.ms}>{d.label}</option>)}
                        </select>
                    </div>
                    <div className="col-md-2"><button className="btn btn-outline-danger w-100" onClick={handleBlock} disabled={busy || !blockInput.trim()}><i className="bi bi-slash-circle me-1" />Block</button></div>
                </div>
                {blList.length > 0 && (
                    <div className="table-responsive">
                        <table className="table table-dark table-sm align-middle mb-0">
                            <tbody>
                                {blList.map((e) => {
                                    const expired = isExpired(e);
                                    return (
                                        <tr key={e.id}>
                                            <td><code className={expired ? 'text-muted' : 'text-danger'}>{e.ip}</code>{expired && <span className="badge bg-secondary ms-2">Expired</span>}</td>
                                            <td><small className="text-muted">{e.reason || '—'}</small></td>
                                            <td><small className="text-muted">{e.expiresAt ? `until ${new Date(e.expiresAt).toLocaleString()}` : 'Permanent'}</small></td>
                                            <td><small className="text-muted">{e.createdAt ? new Date(e.createdAt).toLocaleDateString() : ''}</small></td>
                                            <td className="text-end"><button className="btn btn-sm btn-outline-secondary" onClick={() => handleUnblock(e)} disabled={busy}>Unblock</button></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {dialog}
        </div>
    );
};

export default IPWhitelistManager;
