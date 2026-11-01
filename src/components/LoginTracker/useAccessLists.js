// LoginTracker/useAccessLists.js
// ONE set of live listeners for the admin dashboard (settings, IP rules, device rules, security settings),
// plus helpers that say whether a given IP / device is currently allowed or blocked.
import { useCallback, useEffect, useMemo, useState } from 'react';
import firebaseDB from '../../firebase';
import { PATHS, DEFAULT_SECURITY, sanitizeSecurity } from './dbPaths';
import { getClientIP } from './getUserIP';
import { getDeviceId } from './deviceInfo';
import { ipMatchesRule, isExpired, isEntryActive, normalizeIP, sanitizeKey } from './ipUtils';

const withIds = (v) => Object.fromEntries(Object.entries(v || {}).map(([id, d]) => [id, { id, ...d }]));

/** Just the security settings (used by the idle-timeout monitor). */
export function useSecuritySettings() {
    const [settings, setSettings] = useState(DEFAULT_SECURITY);
    useEffect(() => {
        const ref = firebaseDB.child(PATHS.security);
        const cb = ref.on('value', (snap) => setSettings(sanitizeSecurity(snap.val())), () => {});
        return () => ref.off('value', cb);
    }, []);
    return settings;
}

export function useAccessLists() {
    const [restriction, setRestriction] = useState({ enabled: false });
    const [whitelist, setWhitelist] = useState({});
    const [blacklist, setBlacklist] = useState({});
    const [deviceRules, setDeviceRules] = useState({});
    const [security, setSecurity] = useState(DEFAULT_SECURITY);
    const [myIP, setMyIP] = useState('unknown');
    const myDeviceId = useMemo(() => getDeviceId(), []);

    useEffect(() => {
        const defs = [
            [PATHS.restriction, (v) => setRestriction({ enabled: !!(v && v.enabled) })],
            [PATHS.whitelist, (v) => setWhitelist(withIds(v))],
            [PATHS.blacklist, (v) => setBlacklist(withIds(v))],
            [PATHS.deviceRules, (v) => setDeviceRules(withIds(v))],
            [PATHS.security, (v) => setSecurity(sanitizeSecurity(v))],
        ];
        const subs = defs.map(([path, set]) => {
            const ref = firebaseDB.child(path);
            return { ref, cb: ref.on('value', (snap) => set(snap.val()), (err) => console.error(`Read failed: ${path}`, err)) };
        });
        return () => subs.forEach(({ ref, cb }) => ref.off('value', cb));
    }, []);

    useEffect(() => {
        let alive = true;
        const load = () => getClientIP({ force: true }).then((ip) => alive && setMyIP(ip));
        load();
        window.addEventListener('online', load);
        return () => { alive = false; window.removeEventListener('online', load); };
    }, []);

    /** Is this IP allowed / blocked right now, and by which rule? */
    const ipState = useCallback((ip) => {
        const ipN = normalizeIP(ip);
        const bl = Object.values(blacklist).filter((e) => e.active !== false && !isExpired(e) && ipMatchesRule(ipN, e.ip));
        const blockEntry = bl.find((e) => e.ip === ipN) || null;
        const disabledEntry = Object.values(whitelist).find((e) => e.active === false && e.ip === ipN) || null;
        const blocked = bl.length > 0 || !!disabledEntry;
        const wl = Object.values(whitelist).filter((e) => isEntryActive(e) && ipMatchesRule(ipN, e.ip));
        const allowEntry = wl.find((e) => e.ip === ipN) || null;
        return {
            blocked,
            blockEntry,
            disabledEntry,
            blockedBy: bl[0] || disabledEntry || null,
            viaRule: blocked && !blockEntry && !disabledEntry, // blocked by a range / CIDR rule
            allowed: !blocked && wl.length > 0,
            allowEntry,
            allowViaRule: wl.length > 0 && !allowEntry,
        };
    }, [whitelist, blacklist]);

    /** status: blocked | pending | approved | expired | unapproved | allowed */
    const deviceState = useCallback((deviceId) => {
        const rule = deviceRules[sanitizeKey(deviceId)] || null;
        const blocked = !!rule && rule.status === 'blocked' && !isExpired(rule);
        let status = 'allowed';
        if (blocked) status = 'blocked';
        else if (rule && rule.status === 'blocked') status = 'expired';
        else if (rule && rule.status === 'approved') status = 'approved';
        else if (rule && rule.status === 'pending') status = 'pending';
        else if (security.requireDeviceApproval) status = 'unapproved';
        return { rule, status, blocked, approved: !!rule && rule.status === 'approved', pending: !!rule && rule.status === 'pending' };
    }, [deviceRules, security.requireDeviceApproval]);

    return { restriction, whitelist, blacklist, deviceRules, security, myIP, myDeviceId, ipState, deviceState };
}
