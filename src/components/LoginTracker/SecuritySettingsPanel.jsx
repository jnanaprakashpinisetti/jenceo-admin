// LoginTracker/SecuritySettingsPanel.jsx
// One place to tune security: idle sign-out, failed-login lock, log merging, auto-block,
// log cleanup, plus a quick checklist of what is switched on.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { normalizeUser } from './userInfo';
import { SECURITY_LIMITS, DEFAULT_SECURITY } from './dbPaths';
import { setSecuritySettings, purgeOldLogins } from './trackUserLogin';
import { useConfirm } from './ConfirmDialog';
import { isExpired } from './ipUtils';

const Field = ({ label, hint, children }) => (
    <div className="col-md-6 mb-3">
        <label className="form-label text-warning mb-1">{label}</label>
        {children}
        <small className="text-muted d-block mt-1">{hint}</small>
    </div>
);

const Check = ({ ok, label, detail }) => (
    <div className="d-flex align-items-start gap-2 mb-2">
        <i className={`bi ${ok ? 'bi-check-circle-fill text-success' : 'bi-exclamation-circle text-warning'} mt-1`} />
        <div><div className="text-light">{label}</div>{detail && <small className="text-muted">{detail}</small>}</div>
    </div>
);

const SecuritySettingsPanel = ({ lists }) => {
    const auth = useAuth() || {};
    const adminName = normalizeUser(auth.currentUser || auth.user || {}).name;
    const [confirm, dialog] = useConfirm();

    const [form, setForm] = useState(lists.security);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState(null);
    const [retentionDays, setRetentionDays] = useState(90);
    const timer = useRef(null);
    const flash = (type, text) => {
        setNotice({ type, text });
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setNotice(null), 7000);
    };

    useEffect(() => { setForm(lists.security); }, [lists.security]);

    const dirty = useMemo(
        () => Object.keys(DEFAULT_SECURITY).some((k) => form[k] !== lists.security[k]),
        [form, lists.security],
    );
    const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
    const num = (k) => ({
        type: 'number', className: 'form-control bg-dark text-white border-secondary', value: form[k],
        min: SECURITY_LIMITS[k][0], max: SECURITY_LIMITS[k][1], onChange: (e) => set(k, e.target.value === '' ? '' : Number(e.target.value)),
    });

    const save = async () => {
        setBusy(true);
        const r = await setSecuritySettings(form, adminName);
        setBusy(false);
        flash(r.success ? 'success' : 'danger', r.success ? 'Security settings saved.' : r.error);
    };

    const purge = async () => {
        const days = Math.max(7, Number(retentionDays) || 0);
        const ok = await confirm({
            title: 'Delete old login logs?', tone: 'danger', confirmText: 'Delete logs',
            message: `All login records whose first login is older than ${days} days will be deleted. This cannot be undone.\n\nDevices, users, IP rules and security events are not touched.`,
        });
        if (!ok) return;
        setBusy(true);
        try {
            const r = await purgeOldLogins(days, adminName);
            flash('success', `${r.deleted} login record(s) older than ${r.days} days deleted.`);
        } catch (e) {
            flash('danger', `Cleanup failed: ${e.message}`);
        } finally {
            setBusy(false);
        }
    };

    const sec = lists.security;
    const pending = Object.values(lists.deviceRules).filter((r) => r.status === 'pending').length;
    const blockedDevices = Object.values(lists.deviceRules).filter((r) => r.status === 'blocked' && !isExpired(r)).length;
    const blockedIPs = Object.values(lists.blacklist).filter((e) => e.active !== false && !isExpired(e)).length;

    return (
        <div className="row g-3">
            <div className="col-lg-7">
                <div className="card bg-dark border-info h-100">
                    <div className="card-header bg-info bg-opacity-25 border-info"><h6 className="mb-0 text-white"><i className="bi bi-sliders me-2" />Security settings</h6></div>
                    <div className="card-body">
                        {notice && (
                            <div className={`alert alert-${notice.type} py-2 d-flex justify-content-between`} role="alert">
                                <span>{notice.text}</span><button type="button" className="btn-close" onClick={() => setNotice(null)} />
                            </div>
                        )}
                        <div className="row">
                            <Field label="Sign out after inactivity (minutes)" hint="0 turns it off. Applies to every tab.">
                                <input {...num('idleMinutes')} />
                            </Field>
                            <Field label="Wrong passwords before lock" hint="Counted per email / username.">
                                <input {...num('maxFailedAttempts')} />
                            </Field>
                            <Field label="Lock time (minutes)" hint="Also the window used to count failed attempts.">
                                <input {...num('lockMinutes')} />
                            </Field>
                            <Field label="Merge repeat logins within (minutes)" hint="Same user + device + IP is saved as ONE row with a counter. 0 saves every login.">
                                <input {...num('mergeWindowMinutes')} />
                            </Field>
                        </div>
                        <div className="form-check form-switch mb-2">
                            <input className="form-check-input" type="checkbox" id="autoBlock" checked={!!form.autoBlockIPs} onChange={(e) => set('autoBlockIPs', e.target.checked)} />
                            <label className="form-check-label text-light" htmlFor="autoBlock">Auto-block an IP for 1 hour after many failed logins</label>
                        </div>
                        <small className="text-muted d-block mb-3">Whitelisted IPs are never auto-blocked.</small>
                        <button className="btn btn-info" onClick={save} disabled={!dirty || busy}>
                            {busy ? 'Saving...' : 'Save settings'}
                        </button>
                        {dirty && <small className="text-warning ms-3">Unsaved changes</small>}

                        <hr className="border-secondary my-4" />
                        <h6 className="text-white">Clean up login logs</h6>
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                            <span className="text-light">Delete logs older than</span>
                            <input type="number" min="7" className="form-control form-control-sm bg-dark text-white border-secondary" style={{ width: 90 }} value={retentionDays} onChange={(e) => setRetentionDays(e.target.value)} />
                            <span className="text-light">days</span>
                            <button className="btn btn-sm btn-outline-danger" onClick={purge} disabled={busy}><i className="bi bi-trash me-1" />Delete</button>
                        </div>
                        <small className="text-muted d-block mt-2">Tip: add <code>&quot;.indexOn&quot;: [&quot;timestamp&quot;]</code> under LoginData in your database rules so this runs fast.</small>
                    </div>
                </div>
            </div>

            <div className="col-lg-5">
                <div className="card bg-dark border-secondary h-100">
                    <div className="card-header bg-secondary bg-opacity-25"><h6 className="mb-0 text-white"><i className="bi bi-clipboard-check me-2" />Security checklist</h6></div>
                    <div className="card-body">
                        <Check ok={!!lists.restriction.enabled} label="IP restriction" detail={lists.restriction.enabled ? 'Only whitelisted IPs can open the site' : 'Off: anyone can open the site'} />
                        <Check ok={!!sec.requireDeviceApproval} label="Device approval" detail={sec.requireDeviceApproval ? `On${pending ? `, ${pending} waiting` : ''}` : 'Off: new devices sign in freely'} />
                        <Check ok={sec.idleMinutes > 0} label="Idle sign-out" detail={sec.idleMinutes > 0 ? `After ${sec.idleMinutes} minutes` : 'Off'} />
                        <Check ok label="Failed-login lock" detail={`${sec.maxFailedAttempts} wrong passwords locks the account for ${sec.lockMinutes} min`} />
                        <Check ok={!!sec.autoBlockIPs} label="Auto-block attackers" detail={sec.autoBlockIPs ? 'On (1 hour)' : 'Off'} />
                        <Check ok label="Blocked right now" detail={`${blockedIPs} IP rule(s), ${blockedDevices} device(s)`} />
                        <hr className="border-secondary" />
                        <small className="text-muted">
                            These checks run in the browser. Also enforce the same rules on your server or CDN for strong protection.
                        </small>
                    </div>
                </div>
            </div>
            {dialog}
        </div>
    );
};

export default SecuritySettingsPanel;
