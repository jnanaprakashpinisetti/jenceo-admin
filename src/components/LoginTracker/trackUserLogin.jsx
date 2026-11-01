// LoginTracker/trackUserLogin.jsx
// Login tracking, IP + DEVICE access rules, device registry, failed-login lockout and security events.
//
// Database layout (Firebase Realtime DB) — all paths are defined in dbPaths.js:
//   LoginData/{pushId}              one SMALL record per login session (repeat logins are merged into it)
//   UserLogins/{userKey}/{pushId}   tiny per-user history, newest 50 (used for risk checks + merging)
//   UserProfiles/{userKey}          name, photo, type, login count, last IP/device, lastActive
//   Devices/{deviceId}              one row per device: model, OS, browser, every IP it used, users
//   IPSettings/IPRestrictionSettings, IPWhitelist, IPBlacklist, IPStats
//   IPSettings/DeviceRules/{id}     { status: blocked | approved | pending, reason, expiresAt }
//   IPSettings/SecuritySettings     idle timeout, lockout, merge window, auto-block, device approval
//   SecurityEvents/{pushId}         blocked access, failed logins, rule changes, ...
//   LoginAttempts/{identifierKey}   failed-login counter + lock time
import firebaseDB from '../../firebase';
import { getClientIP } from './getUserIP';
import { collectDeviceInfo } from './deviceInfo';
import { normalizeUser } from './userInfo';
import { PATHS as P, DEFAULT_SECURITY, sanitizeSecurity } from './dbPaths';
import {
    normalizeIP, sanitizeKey, parseRule, splitRules, ipMatchesRule, evaluateAccess, evaluateDeviceAccess,
    isEntryActive, isExpired,
} from './ipUtils';

export { getClientIP, normalizeUser };

const now = () => Date.now();
const iso = () => new Date().toISOString();
const DAY = 86400000;
/** Firebase rejects `undefined` — this strips it. */
const clean = (obj) => JSON.parse(JSON.stringify(obj === undefined ? null : obj));
const readNode = async (path, fallback = null) => {
    const snap = await firebaseDB.child(path).once('value');
    return snap.exists() ? snap.val() : fallback;
};

const SESSION_KEY = 'session_started_at';
const MAX_HISTORY = 50;
const MAX_MERGE_SPAN = DAY; // one merged record never covers more than 24 hours
const generateSessionId = () => {
    try { if (window.crypto && window.crypto.randomUUID) return `session_${window.crypto.randomUUID()}`; } catch { /* ignore */ }
    return `session_${Math.random().toString(36).slice(2, 11)}_${now()}`;
};

/* ======================= security events ======================= */
export const logSecurityEvent = async (type, severity = 'LOW', data = {}) => {
    try {
        await firebaseDB.child(P.events).push(clean({
            type, severity, timestamp: iso(), ts: now(),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : '',
            ...data,
        }));
    } catch (e) {
        console.warn('Could not write security event', e);
    }
};

/* ======================= security settings ======================= */
export const getSecuritySettings = async () => {
    try { return sanitizeSecurity(await readNode(P.security, null)); } catch { return { ...DEFAULT_SECURITY }; }
};

export const setSecuritySettings = async (partial, by = 'system') => {
    try {
        const next = sanitizeSecurity({ ...(await getSecuritySettings()), ...partial });
        await firebaseDB.child(P.security).set({ ...next, lastModified: iso(), modifiedBy: by });
        await logSecurityEvent('SECURITY_SETTINGS_CHANGED', 'MEDIUM', { by, changed: Object.keys(partial).join(', ') });
        return { success: true, settings: next };
    } catch (e) {
        return { success: false, error: e.message };
    }
};

/* ======================= IP threat counters (reset every 24h) ======================= */
const bumpThreat = async (ip, field) => {
    const ipN = normalizeIP(ip);
    if (ipN === 'unknown') return;
    try {
        await firebaseDB.child(`${P.ipStats}/${sanitizeKey(ipN)}/threat`).transaction((cur) => {
            const t = now();
            const base = cur && t - (cur.since || 0) < DAY ? cur : { failed: 0, blocked: 0, since: t };
            return { ...base, [field]: (base[field] || 0) + 1, last: t };
        });
    } catch (e) {
        console.warn('Threat counter failed', e);
    }
};

const getThreatLevel = async (ip) => {
    try {
        const v = await readNode(`${P.ipStats}/${sanitizeKey(normalizeIP(ip))}/threat`);
        if (!v || now() - (v.since || 0) > DAY) return 'LOW';
        const score = (v.failed || 0) + (v.blocked || 0) * 2;
        if (score >= 10) return 'HIGH';
        if (score >= 4) return 'MEDIUM';
    } catch { /* ignore */ }
    return 'LOW';
};

/* ======================= whitelist / blacklist manager ======================= */
const getRestrictionSetting = async () => {
    try {
        const v = await readNode(P.restriction, null);
        return { ...(v || {}), enabled: !!(v && v.enabled) };
    } catch (e) {
        console.error('Error getting restriction setting:', e);
        return { enabled: false };
    }
};

const setRestrictionSetting = async (enabled, by = 'system') => {
    try {
        await firebaseDB.child(P.restriction).set({ enabled: !!enabled, lastModified: iso(), modifiedBy: by });
        await logSecurityEvent('IP_RESTRICTION_CHANGED', 'MEDIUM', { enabled: !!enabled, by });
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
};

const withIds = (obj) => Object.fromEntries(Object.entries(obj || {}).map(([id, d]) => [id, { id, ...d }]));
const getWhitelistedIPs = async () => withIds(await readNode(P.whitelist, {}));
const getBlacklistedIPs = async () => withIds(await readNode(P.blacklist, {}));

const isIPWhitelisted = async (ip) => {
    const list = Object.values(await readNode(P.whitelist, {}));
    return list.some((e) => isEntryActive(e) && ipMatchesRule(ip, e.ip));
};
const isIPBlacklisted = async (ip) => {
    const list = Object.values(await readNode(P.blacklist, {}));
    return list.some((e) => e.active !== false && !isExpired(e) && ipMatchesRule(ip, e.ip));
};

/**
 * Add a rule: single IP, CIDR (192.168.1.0/24), range (a-b) or wildcard (192.168.*.*).
 * options.expiresAt = ISO string for temporary access.
 */
const addToWhitelist = async (ruleInput, description = '', addedBy = 'system', options = {}) => {
    try {
        const rule = parseRule(ruleInput);
        if (!rule.valid) return { success: false, error: rule.error };

        const existing = await getWhitelistedIPs();
        const dup = Object.values(existing).find((e) => e.ip === rule.value);
        const payload = {
            description: description || (dup && dup.description) || '',
            active: true,
            expiresAt: options.expiresAt || null,
            lastModified: iso(),
        };
        if (dup) {
            await firebaseDB.child(`${P.whitelist}/${dup.id}`).update(payload);
            await logSecurityEvent('IP_WHITELIST_UPDATED', 'LOW', { ipAddress: rule.value, by: addedBy });
            return { success: true, id: dup.id, updated: true };
        }
        const res = await firebaseDB.child(P.whitelist).push({
            ip: rule.value, type: rule.type, ...payload, createdAt: iso(), createdBy: addedBy,
        });
        await logSecurityEvent('IP_WHITELIST_ADDED', 'LOW', { ipAddress: rule.value, ruleType: rule.type, by: addedBy });
        return { success: true, id: res.key };
    } catch (e) {
        console.error('Error adding IP to whitelist:', e);
        return { success: false, error: e.message };
    }
};

/** Paste many rules (new line / comma / space separated). */
const addManyToWhitelist = async (text, description = '', addedBy = 'system', options = {}) => {
    const inputs = splitRules(text);
    const out = { success: true, added: 0, updated: 0, invalid: [] };
    for (const input of inputs) {
        const r = await addToWhitelist(input, description, addedBy, options);
        if (!r.success) out.invalid.push({ input, error: r.error });
        else if (r.updated) out.updated += 1;
        else out.added += 1;
    }
    return out;
};

const removeFromWhitelist = async (ipId, removedBy = 'system') => {
    try {
        const data = await readNode(`${P.whitelist}/${ipId}`);
        await firebaseDB.child(`${P.whitelist}/${ipId}`).remove();
        await logSecurityEvent('IP_WHITELIST_REMOVED', 'LOW', { ipAddress: data && data.ip, by: removedBy });
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
};

/** Switching a single IP OFF blocks it, even when the global restriction is off. */
const toggleIPStatus = async (ipId, isActive, modifiedBy = 'system') => {
    try {
        const data = await readNode(`${P.whitelist}/${ipId}`);
        await firebaseDB.child(`${P.whitelist}/${ipId}`).update({ active: !!isActive, lastModified: iso() });
        await logSecurityEvent('IP_WHITELIST_TOGGLED', 'MEDIUM', { ipAddress: data && data.ip, newStatus: !!isActive, by: modifiedBy });
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
};

/** options.expiresAt = ISO string for a temporary block. */
const addToBlacklist = async (ruleInput, reason = '', addedBy = 'system', options = {}) => {
    try {
        const rule = parseRule(ruleInput);
        if (!rule.valid) return { success: false, error: rule.error };
        const existing = Object.values(await getBlacklistedIPs()).find((e) => e.ip === rule.value);
        const payload = { active: true, reason, expiresAt: options.expiresAt || null, lastModified: iso() };
        if (existing) {
            await firebaseDB.child(`${P.blacklist}/${existing.id}`).update(payload);
            return { success: true, id: existing.id, updated: true };
        }
        const res = await firebaseDB.child(P.blacklist).push({
            ip: rule.value, type: rule.type, ...payload, createdAt: iso(), createdBy: addedBy,
        });
        await logSecurityEvent('IP_BLACKLISTED', 'HIGH', { ipAddress: rule.value, reason, by: addedBy });
        return { success: true, id: res.key };
    } catch (e) {
        return { success: false, error: e.message };
    }
};

const removeFromBlacklist = async (id, by = 'system') => {
    try {
        const data = await readNode(`${P.blacklist}/${id}`);
        await firebaseDB.child(`${P.blacklist}/${id}`).remove();
        await logSecurityEvent('IP_BLACKLIST_REMOVED', 'LOW', { ipAddress: data && data.ip, by });
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
};

export const ipWhitelistManager = {
    getRestrictionSetting, setRestrictionSetting,
    getWhitelistedIPs, getBlacklistedIPs,
    isIPWhitelisted, isIPBlacklisted,
    addToWhitelist, addManyToWhitelist, removeFromWhitelist, toggleIPStatus,
    addToBlacklist, removeFromBlacklist,
};

/** One-shot IP check (used by Login). The live site-wide check is <IPGate/>. */
export const checkIPRestriction = async (ipAddress) => {
    try {
        const [settings, whitelist, blacklist] = await Promise.all([
            getRestrictionSetting(), readNode(P.whitelist, {}), readNode(P.blacklist, {}),
        ]);
        return evaluateAccess({ ip: ipAddress, settings, whitelist, blacklist });
    } catch (e) {
        console.error('Error checking IP restriction:', e);
        return { restricted: false, error: true }; // database unreachable: do not lock everyone out
    }
};

export const logBlockedAccess = async (ip, reason, extra = {}) => {
    await bumpThreat(ip, 'blocked');
    await logSecurityEvent('BLOCKED_ACCESS', 'MEDIUM', {
        ipAddress: normalizeIP(ip), reason, path: typeof window !== 'undefined' ? window.location.pathname : '', ...extra,
    });
};

/* ======================= DEVICE control (same idea as IP control) ======================= */
const deviceKey = (id) => sanitizeKey(id);
const getDeviceRule = async (deviceId) => readNode(`${P.deviceRules}/${deviceKey(deviceId)}`, null);
const getDeviceRules = async () => withIds(await readNode(P.deviceRules, {}));

/**
 * status: 'blocked' | 'approved' | 'pending'
 * meta: { name, reason, by, expiresAt, userName }   (blocked devices cannot sign in from ANY network)
 */
const setDeviceStatus = async (deviceId, status, meta = {}) => {
    try {
        const prev = await getDeviceRule(deviceId);
        await firebaseDB.child(`${P.deviceRules}/${deviceKey(deviceId)}`).set(clean({
            deviceId, status,
            name: meta.name || (prev && prev.name) || '',
            userName: meta.userName || (prev && prev.userName) || '',
            reason: meta.reason || '',
            by: meta.by || 'system',
            at: iso(),
            requestedAt: (prev && prev.requestedAt) || null,
            expiresAt: meta.expiresAt || null,
        }));
        const type = status === 'blocked' ? 'DEVICE_BLOCKED' : status === 'approved' ? (prev && prev.status === 'blocked' ? 'DEVICE_UNBLOCKED' : 'DEVICE_APPROVED') : 'DEVICE_PENDING';
        await logSecurityEvent(type, status === 'blocked' ? 'HIGH' : 'MEDIUM', {
            deviceId, deviceName: meta.name || (prev && prev.name) || '', reason: meta.reason || '', by: meta.by || 'system',
        });
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
};

const removeDeviceRule = async (deviceId, by = 'system') => {
    try {
        const prev = await getDeviceRule(deviceId);
        await firebaseDB.child(`${P.deviceRules}/${deviceKey(deviceId)}`).remove();
        await logSecurityEvent('DEVICE_RULE_REMOVED', 'LOW', { deviceId, deviceName: prev && prev.name, by });
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
};

/** Approve every device that has already logged in (used when approval mode is switched on). */
const approveAllKnownDevices = async (by = 'system') => {
    const devices = await readNode(P.devices, {});
    const rules = await readNode(P.deviceRules, {});
    const updates = {};
    let count = 0;
    Object.entries(devices).forEach(([key, d]) => {
        const r = rules[key];
        if (r && ((r.status === 'blocked' && !isExpired(r)) || r.status === 'approved')) return;
        updates[`${P.deviceRules}/${key}`] = clean({
            deviceId: (d && d.deviceId) || key, status: 'approved', name: (d && d.name) || '',
            reason: 'Existing device approved automatically', by, at: iso(), expiresAt: null,
        });
        count += 1;
    });
    if (count) await firebaseDB.update(updates);
    await logSecurityEvent('DEVICES_BULK_APPROVED', 'MEDIUM', { count, by });
    return count;
};

export const deviceAccessManager = { getDeviceRule, getDeviceRules, setDeviceStatus, removeDeviceRule, approveAllKnownDevices };

/** Is this device blocked (or waiting for approval)? */
export const checkDeviceAccess = async (deviceId) => {
    try {
        const [rule, settings] = await Promise.all([getDeviceRule(deviceId), getSecuritySettings()]);
        return evaluateDeviceAccess({ rule, requireApproval: settings.requireDeviceApproval });
    } catch (e) {
        console.error('Error checking device access:', e);
        return { restricted: false, error: true };
    }
};

const requestDeviceApproval = async (device, user, ip) => {
    try {
        const prev = await getDeviceRule(device.deviceId);
        if (prev && prev.status === 'blocked' && !isExpired(prev)) return;
        await firebaseDB.child(`${P.deviceRules}/${deviceKey(device.deviceId)}`).set(clean({
            deviceId: device.deviceId, status: 'pending', name: device.deviceName,
            userId: user.userId, userName: user.name, ipAddress: ip,
            requestedAt: (prev && prev.requestedAt) || iso(), at: iso(), by: 'system', reason: '', expiresAt: null,
        }));
        if (!prev || prev.status !== 'pending') {
            await logSecurityEvent('DEVICE_APPROVAL_REQUESTED', 'MEDIUM', {
                deviceId: device.deviceId, deviceName: device.deviceName, userId: user.userId, name: user.name, ipAddress: ip,
            });
        }
    } catch (e) {
        console.warn('Could not request device approval', e);
    }
};

/* ======================= failed-login lockout (limits come from SecuritySettings) ======================= */
const attemptKey = (identifier) => sanitizeKey(String(identifier || '').trim().toLowerCase());

export const getLoginLockStatus = async (identifier) => {
    try {
        const v = await readNode(`${P.attempts}/${attemptKey(identifier)}`);
        if (v && v.lockedUntil && v.lockedUntil > now()) {
            return { locked: true, remainingMs: v.lockedUntil - now(), attempts: v.count || 0 };
        }
    } catch { /* ignore */ }
    return { locked: false, remainingMs: 0, attempts: 0 };
};

export const recordFailedLogin = async (identifier, ip, reason = 'INVALID_CREDENTIALS') => {
    const settings = await getSecuritySettings();
    const windowMs = settings.lockMinutes * 60000;
    let result = { count: 1, locked: false };
    try {
        const tx = await firebaseDB.child(`${P.attempts}/${attemptKey(identifier)}`).transaction((cur) => {
            const t = now();
            const base = cur && t - (cur.firstAt || 0) < windowMs ? cur : { count: 0, firstAt: t };
            const count = (base.count || 0) + 1;
            return {
                firstAt: base.firstAt, lastAt: t, count, lastIP: normalizeIP(ip),
                lockedUntil: count >= settings.maxFailedAttempts ? t + windowMs : base.lockedUntil || null,
            };
        });
        const v = tx.snapshot.val() || {};
        result = { count: v.count || 1, locked: !!(v.lockedUntil && v.lockedUntil > now()) };
    } catch (e) {
        console.warn('Could not record failed login', e);
    }
    await bumpThreat(ip, 'failed');
    await logSecurityEvent(result.locked ? 'ACCOUNT_LOCKED' : 'FAILED_LOGIN', result.locked ? 'HIGH' : 'LOW', {
        identifier: String(identifier || '').slice(0, 120), ipAddress: normalizeIP(ip), reason, attempts: result.count,
    });

    // Optional: temporary 1-hour block for an IP with many failures (never for whitelisted IPs)
    if (settings.autoBlockIPs && normalizeIP(ip) !== 'unknown') {
        try {
            if ((await getThreatLevel(ip)) === 'HIGH' && !(await isIPWhitelisted(ip))) {
                await addToBlacklist(ip, 'Auto-blocked: repeated failed logins', 'system', { expiresAt: new Date(now() + 3600e3).toISOString() });
                await logSecurityEvent('IP_AUTO_BLOCKED', 'HIGH', { ipAddress: normalizeIP(ip) });
            }
        } catch (e) { console.warn('Auto-block failed', e); }
    }
    return result;
};

export const clearFailedLogins = async (identifier) => {
    try { await firebaseDB.child(`${P.attempts}/${attemptKey(identifier)}`).remove(); } catch { /* ignore */ }
};

/* ======================= location (cached per IP) ======================= */
const GEO_TTL = 7 * DAY;
const defaultGeo = () => ({
    country: 'Unknown', city: 'Unknown', region: 'Unknown', timezone: 'Unknown', isp: 'Unknown', coordinates: null, asn: 'Unknown',
});
const fetchJSON = async (url, ms = 4000) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    try {
        const res = await fetch(url, { signal: ctrl.signal });
        return res.ok ? await res.json() : null;
    } finally { clearTimeout(timer); }
};

export const getEnhancedLocationFromIP = async (ipAddress) => {
    const ip = normalizeIP(ipAddress);
    if (ip === 'unknown') return defaultGeo();
    const key = sanitizeKey(ip);

    try {
        const g = await readNode(`${P.ipStats}/${key}/geo`);
        if (g && g.country && g.country !== 'Unknown' && now() - (g.cachedAt || 0) < GEO_TTL) {
            const { cachedAt, ...rest } = g; // eslint-disable-line no-unused-vars
            return { ...defaultGeo(), ...rest };
        }
    } catch { /* ignore */ }

    let geo = null;
    try {
        const d = await fetchJSON(`https://ipapi.co/${ip}/json/`);
        if (d && !d.error && (d.country_name || d.city)) {
            geo = {
                country: d.country_name || 'Unknown', city: d.city || 'Unknown', region: d.region || 'Unknown',
                timezone: d.timezone || 'Unknown', isp: d.org || 'Unknown', asn: d.asn || 'Unknown',
                coordinates: d.latitude && d.longitude ? { lat: Number(d.latitude), lng: Number(d.longitude) } : null,
            };
        }
    } catch { /* next */ }
    if (!geo) {
        try {
            const d = await fetchJSON(`https://ipwho.is/${ip}`);
            if (d && d.success) {
                geo = {
                    country: d.country || 'Unknown', city: d.city || 'Unknown', region: d.region || 'Unknown',
                    timezone: (d.timezone && d.timezone.id) || 'Unknown',
                    isp: (d.connection && (d.connection.isp || d.connection.org)) || 'Unknown',
                    asn: (d.connection && d.connection.asn) || 'Unknown',
                    coordinates: d.latitude && d.longitude ? { lat: Number(d.latitude), lng: Number(d.longitude) } : null,
                };
            }
        } catch { /* next */ }
    }
    if (!geo) {
        try {
            const d = await fetchJSON(`https://api.country.is/${ip}`);
            if (d && d.country) geo = { ...defaultGeo(), country: d.country };
        } catch { /* give up */ }
    }
    if (geo) {
        try { await firebaseDB.child(`${P.ipStats}/${key}/geo`).set(clean({ ...geo, cachedAt: now() })); } catch { /* ignore */ }
        return geo;
    }
    return defaultGeo();
};

/* ======================= risk analysis ======================= */
const getRecentLogins = async (userId, limit = 20) => {
    try {
        const snap = await firebaseDB.child(`${P.userLogins}/${sanitizeKey(userId)}`).orderByKey().limitToLast(limit).once('value');
        return snap.exists() ? Object.entries(snap.val()).map(([key, v]) => ({ key, ...v })) : [];
    } catch { return []; }
};

/**
 * Risk is judged by DEVICE + COUNTRY, never by IP alone, so the same phone moving
 * from Wi-Fi to mobile data is NOT suspicious.
 */
export const analyzeLoginRisk = async ({ user, ip, device, geo, history: given }) => {
    const history = given || (await getRecentLogins(user.userId, 20));
    const isFirstLogin = history.length === 0;
    const factors = [];
    let risk = 0;

    if (!isFirstLogin) {
        if (!history.some((h) => h.deviceId === device.deviceId)) { risk += 25; factors.push('NEW_DEVICE'); }
        if (geo.country !== 'Unknown' && !history.some((h) => h.country === geo.country)) { risk += 30; factors.push('NEW_COUNTRY'); }
    }
    if (history.filter((h) => now() - (h.t || 0) < 60000).length >= 3) { risk += 20; factors.push('RAPID_LOGINS'); }

    const threat = await getThreatLevel(ip);
    if (threat === 'HIGH') { risk += 30; factors.push('HIGH_RISK_IP'); }
    else if (threat === 'MEDIUM') { risk += 10; factors.push('MEDIUM_RISK_IP'); }

    if (new Date().getHours() < 5) { risk += 5; factors.push('UNUSUAL_HOUR'); }

    const sameDevice = [...history].reverse().find((h) => h.deviceId === device.deviceId);
    return {
        risk,
        securityScore: Math.max(0, 100 - risk),
        riskLevel: risk >= 60 ? 'HIGH' : risk >= 30 ? 'MEDIUM' : 'LOW',
        factors,
        isSuspicious: risk >= 30,
        isFirstLogin,
        newDevice: factors.includes('NEW_DEVICE'),
        previousIP: sameDevice ? sameDevice.ip : null,
    };
};

// Kept so older imports keep working
export const checkSuspiciousActivity = async (userData, ipAddress) => {
    const user = normalizeUser(userData);
    const ip = normalizeIP(ipAddress);
    const [device, geo] = await Promise.all([collectDeviceInfo(), getEnhancedLocationFromIP(ip)]);
    const r = await analyzeLoginRisk({ user, ip, device, geo });
    return { isSuspicious: r.isSuspicious, reason: r.factors.join(', '), details: r };
};
export const getSecurityContext = async (userData, ipAddress) => {
    const r = await checkSuspiciousActivity(userData, ipAddress);
    return {
        securityScore: r.details.securityScore, riskLevel: r.details.riskLevel,
        riskFactors: r.details.factors, isAdmin: ['admin', 'superadmin'].includes(normalizeUser(userData).userType),
    };
};

/* ======================= writers (all use transactions: safe if two tabs log in at once) ======================= */
const bump = (obj, key) => ({ ...(obj || {}), [key]: ((obj || {})[key] || 0) + 1 });

const upsertUserProfile = (user, ip, device, geo, loginId) =>
    firebaseDB.child(`${P.userProfiles}/${sanitizeKey(user.userId)}`).transaction((cur) => {
        const d = cur || {};
        return clean({
            ...d,
            userId: user.userId, name: user.name, email: user.email, photo: user.photo,
            userType: user.userType, role: user.roleRaw,
            firstSeen: d.firstSeen || iso(), lastLogin: iso(), lastLoginTs: now(),
            loginCount: (d.loginCount || 0) + 1,
            lastIP: ip, lastDeviceId: device.deviceId, lastDeviceName: device.deviceName,
            lastCountry: geo.country, lastCity: geo.city, lastLoginId: loginId,
        });
    });

/** Device details are stored ONCE here instead of on every login record. */
const upsertDevice = (user, ip, device) =>
    firebaseDB.child(`${P.devices}/${sanitizeKey(device.deviceId)}`).transaction((cur) => {
        const d = cur || {};
        const t = now();
        const ips = { ...(d.ips || {}) };
        const ipKey = sanitizeKey(ip);
        ips[ipKey] = { ip, count: ((ips[ipKey] || {}).count || 0) + 1, lastSeen: t };
        const newest = Object.entries(ips).sort((a, b) => (b[1].lastSeen || 0) - (a[1].lastSeen || 0)).slice(0, 20);
        return clean({
            ...d,
            deviceId: device.deviceId, name: device.deviceName, brand: device.brand, model: device.model,
            modelCode: device.modelCode, modelApprox: device.modelApprox, type: device.type, os: device.os, osVersion: device.osVersion,
            browser: device.browser, browserVersion: device.browserVersion, screen: device.screen,
            language: device.language, timezone: device.timezone,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 300) : '',
            firstSeen: d.firstSeen || t, lastSeen: t, loginCount: (d.loginCount || 0) + 1, lastIP: ip,
            ips: Object.fromEntries(newest),
            users: bump(d.users, sanitizeKey(user.userId)),
        });
    });

const upsertIPStats = (ip, user, device) =>
    firebaseDB.child(`${P.ipStats}/${sanitizeKey(ip)}`).transaction((cur) => {
        const d = cur || {};
        const t = now();
        return clean({
            ...d, ip,
            totalLogins: (d.totalLogins || 0) + 1,
            users: bump(d.users, sanitizeKey(user.userId)),
            devices: bump(d.devices, sanitizeKey(device.deviceId)),
            browsers: bump(d.browsers, sanitizeKey(device.browser)),
            firstSeen: d.firstSeen || t, lastSeen: t, lastUserId: user.userId,
        });
    });

const pushUserHistory = async (user, entry) => {
    const ref = firebaseDB.child(`${P.userLogins}/${sanitizeKey(user.userId)}`);
    await ref.push(clean(entry));
    // keep newest 50 only
    const snap = await ref.orderByKey().limitToLast(MAX_HISTORY + 5).once('value');
    const keys = snap.exists() ? Object.keys(snap.val()) : [];
    if (keys.length > MAX_HISTORY) {
        const updates = {};
        keys.slice(0, keys.length - MAX_HISTORY).forEach((k) => { updates[k] = null; });
        await ref.update(updates);
    }
};

const markSession = (timestamp, sessionId) => {
    try {
        localStorage.setItem(SESSION_KEY, String(timestamp)); // used by force-logout
        if (sessionId) sessionStorage.setItem('session_id', sessionId);
    } catch { /* ignore */ }
};

/**
 * Same user + same device + same IP, within the merge window  ->  update the existing record
 * (repeatCount + last time) instead of writing a new one. Returns null when it cannot merge.
 */
const tryMerge = async ({ user, ip, device, history, settings, ts }) => {
    const windowMs = settings.mergeWindowMinutes * 60000;
    const last = history[history.length - 1];
    if (!windowMs || !last || !last.loginId) return null;
    if (last.deviceId !== device.deviceId || last.ip !== ip) return null;
    if (ts - (last.t || 0) > windowMs || ts - (last.t0 || last.t || 0) > MAX_MERGE_SPAN) return null;

    const tx = await firebaseDB.child(`${P.loginData}/${last.loginId}`).transaction((cur) => {
        if (cur === null) return cur;
        return { ...cur, repeatCount: (cur.repeatCount || 0) + 1, lastTimestamp: ts, lastLoginTime: new Date(ts).toISOString() };
    });
    if (!tx.committed || !tx.snapshot.exists()) return null; // record was deleted: write a fresh one

    await Promise.allSettled([
        firebaseDB.child(`${P.userLogins}/${sanitizeKey(user.userId)}/${last.key}`).update({ t: ts, t0: last.t0 || last.t }),
        upsertUserProfile(user, ip, device, { country: last.country || 'Unknown', city: last.city || 'Unknown' }, last.loginId),
        upsertDevice(user, ip, device),
    ]);
    return last.loginId;
};

/* ======================= MAIN: track a successful login ======================= */
export const trackUserLogin = async (userData, ipAddress) => {
    try {
        if (!userData) return { success: false, error: 'No user data provided' };

        const user = normalizeUser(userData);
        const ip = normalizeIP(ipAddress && ipAddress !== 'Unknown' ? ipAddress : await getClientIP());
        const device = await collectDeviceInfo();
        const settings = await getSecuritySettings();

        // 1. IP rules
        const access = await checkIPRestriction(ip);
        if (access.restricted) {
            await logSecurityEvent('BLOCKED_LOGIN', 'HIGH', {
                userId: user.userId, email: user.email, name: user.name, ipAddress: ip,
                reason: access.reason, deviceName: device.deviceName,
            });
            await bumpThreat(ip, 'blocked');
            return { success: false, restricted: true, error: 'Access denied', reason: access.reason };
        }

        // 2. Device rules (blocked device = blocked on every IP; approval mode = wait for an admin)
        const deviceRule = await getDeviceRule(device.deviceId);
        const deviceAccess = evaluateDeviceAccess({ rule: deviceRule, requireApproval: settings.requireDeviceApproval });
        if (deviceAccess.restricted) {
            if (deviceAccess.reason === 'DEVICE_PENDING') {
                await requestDeviceApproval(device, user, ip);
            } else {
                await logSecurityEvent('BLOCKED_LOGIN', 'HIGH', {
                    userId: user.userId, email: user.email, name: user.name, ipAddress: ip,
                    reason: deviceAccess.reason, deviceName: device.deviceName, deviceId: device.deviceId,
                });
            }
            return { success: false, restricted: true, error: 'Access denied', reason: deviceAccess.reason, deviceName: device.deviceName };
        }

        // 3. Same user + device + IP a moment ago? Merge instead of writing a duplicate row.
        const timestamp = now();
        const history = await getRecentLogins(user.userId, 20);
        const mergedId = await tryMerge({ user, ip, device, history, settings, ts: timestamp });
        if (mergedId) {
            markSession(timestamp, null);
            return { success: true, merged: true, loginId: mergedId, user, securityScore: 100, riskLevel: 'LOW', isSuspicious: false, newDevice: false };
        }

        // 4. New session record
        const geo = await getEnhancedLocationFromIP(ip);
        const risk = await analyzeLoginRisk({ user, ip, device, geo, history });
        const sessionId = generateSessionId();
        const ipChanged = !!(risk.previousIP && risk.previousIP !== ip);

        // Small record: device + user details live in Devices/ and UserProfiles/ and are joined by the dashboard
        const record = clean({
            userId: user.userId, userName: user.name, email: user.email, userType: user.userType,
            ipAddress: ip, ipChanged: ipChanged || null, previousIP: ipChanged ? risk.previousIP : null,
            loginTime: new Date(timestamp).toISOString(), timestamp,
            country: geo.country, city: geo.city, isp: geo.isp,
            deviceId: device.deviceId, deviceName: device.deviceName,
            securityScore: risk.securityScore, riskLevel: risk.riskLevel,
            riskFactors: risk.factors.length ? risk.factors : null, newDevice: risk.newDevice || null,
            sessionId, status: risk.isSuspicious ? 'SUSPICIOUS' : 'SUCCESS',
        });

        const ref = await firebaseDB.child(P.loginData).push(record);
        const loginId = ref && ref.key;
        if (!loginId) return { success: false, error: 'Database error' };

        const jobs = await Promise.allSettled([
            upsertUserProfile(user, ip, device, geo, loginId),
            upsertDevice(user, ip, device),
            upsertIPStats(ip, user, device),
            pushUserHistory(user, { t: timestamp, t0: timestamp, ip, deviceId: device.deviceId, country: geo.country, city: geo.city, loginId }),
        ]);
        jobs.forEach((j, i) => { if (j.status === 'rejected') console.warn(`Login tracking step ${i} failed`, j.reason); });

        markSession(timestamp, sessionId);

        if (risk.isSuspicious) {
            await logSecurityEvent('SUSPICIOUS_LOGIN', risk.riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM', {
                userId: user.userId, email: user.email, name: user.name, ipAddress: ip,
                reason: risk.factors.join(', '), deviceName: device.deviceName,
            });
        }

        return {
            success: true, loginId, sessionId, user,
            securityScore: risk.securityScore, riskLevel: risk.riskLevel,
            isSuspicious: risk.isSuspicious, newDevice: risk.newDevice,
        };
    } catch (error) {
        console.error('Error tracking login:', error);
        await logSecurityEvent('TRACKING_ERROR', 'LOW', { error: error.message });
        return { success: false, error: error.message };
    }
};

/* ======================= admin / session helpers ======================= */
export const forceLogoutUser = async (userId, by = 'system') => {
    try {
        await firebaseDB.child(`${P.userProfiles}/${sanitizeKey(userId)}/forceLogoutAt`).set(now());
        await logSecurityEvent('FORCE_LOGOUT', 'MEDIUM', { userId, by });
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
};

export const touchUserActivity = async (userId) => {
    try { await firebaseDB.child(`${P.userProfiles}/${sanitizeKey(userId)}/lastActive`).set(now()); } catch { /* ignore */ }
};

const isLoginLike = (v) => v && typeof v === 'object' && !v.type && typeof v.ipAddress === 'string' && (v.loginTime || v.timestamp);

/**
 * One-time cleanup of the very first layout, where events, per-user history and IP analytics
 * were all written INSIDE LoginData and were being counted as logins.
 * Events are moved to SecurityEvents; the leftover duplicate nodes are deleted.
 */
export const migrateLegacyLoginData = async () => {
    const val = await readNode(P.loginData, {});
    const updates = {};
    let moved = 0;
    let removed = 0;
    Object.entries(val).forEach(([key, v]) => {
        if (isLoginLike(v)) return;
        if (v && typeof v === 'object' && v.type) {
            updates[`${P.events}/${key}`] = clean({ ...v, ts: v.timestamp ? new Date(v.timestamp).getTime() || 0 : 0, migrated: true });
            moved += 1;
        }
        updates[`${P.loginData}/${key}`] = null;
        removed += 1;
    });
    if (Object.keys(updates).length) await firebaseDB.update(updates);
    return { moved, removed };
};

/**
 * Delete login records whose FIRST login is older than `days`. Works in batches of 500.
 * Add  ".indexOn": ["timestamp"]  under "LoginData" in your database rules to make this fast.
 */
export const purgeOldLogins = async (days, by = 'system') => {
    const d = Math.max(7, Math.round(Number(days) || 0));
    const cutoff = now() - d * DAY;
    let deleted = 0;
    for (let i = 0; i < 20; i += 1) {
        const snap = await firebaseDB.child(P.loginData).orderByChild('timestamp').endAt(cutoff).limitToFirst(500).once('value');
        if (!snap.exists()) break;
        const updates = {};
        Object.entries(snap.val()).forEach(([k, v]) => {
            if (isLoginLike(v) && Number(v.timestamp) && Number(v.timestamp) <= cutoff) updates[k] = null;
        });
        const n = Object.keys(updates).length;
        if (!n) break;
        await firebaseDB.child(P.loginData).update(updates);
        deleted += n;
        if (n < 500) break;
    }
    await logSecurityEvent('LOGS_PURGED', 'MEDIUM', { days: d, deleted, by });
    return { deleted, days: d };
};

export default {
    trackUserLogin, checkIPRestriction, checkDeviceAccess, checkSuspiciousActivity, ipWhitelistManager, deviceAccessManager,
    getEnhancedLocationFromIP, getSecurityContext, getClientIP, analyzeLoginRisk, getSecuritySettings, setSecuritySettings,
    recordFailedLogin, getLoginLockStatus, clearFailedLogins, forceLogoutUser, logSecurityEvent, purgeOldLogins,
};
