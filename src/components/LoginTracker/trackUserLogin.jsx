// LoginTracker/trackUserLogin.jsx
// Login tracking, IP access rules, device registry, failed-login lockout and security events.
//
// Database layout (Firebase Realtime DB):
//   LoginData/{pushId}              one record per successful login ONLY (dashboard reads this)
//   UserLogins/{userKey}/{pushId}   small per-user history, newest 50 (used for risk checks)
//   UserProfiles/{userKey}          name, photo, type, login count, last IPSettings/device, lastActive
//   Devices/{deviceId}              one row per device: model, every IP it used, users
//   IPStats/{ipKey}                 per-IP totals, cached location, threat counters
//   IPWhitelist / IPBlacklist / IPRestrictionSettings
//   SecurityEvents/{pushId}         blocked access, failed logins, whitelist changes, ...
//   LoginAttempts/{identifierKey}   failed-login counter + lock time
import firebaseDB from '../../firebase';
import { getClientIP } from './getUserIP';
import { collectDeviceInfo } from './deviceInfo';
import { normalizeUser } from './userInfo';
import {
    normalizeIP, sanitizeKey, parseRule, splitRules, ipMatchesRule, evaluateAccess, isEntryActive,
} from './ipUtils';

export { getClientIP, normalizeUser };

const now = () => Date.now();
const iso = () => new Date().toISOString();
/** Firebase rejects `undefined` — this strips it. */
const clean = (obj) => JSON.parse(JSON.stringify(obj === undefined ? null : obj));
const readNode = async (path, fallback = null) => {
    const snap = await firebaseDB.child(path).once('value');
    return snap.exists() ? snap.val() : fallback;
};

const SESSION_KEY = 'session_started_at';
const generateSessionId = () => {
    try { if (window.crypto && window.crypto.randomUUID) return `session_${window.crypto.randomUUID()}`; } catch { /* ignore */ }
    return `session_${Math.random().toString(36).slice(2, 11)}_${now()}`;
};

/* ======================= security events ======================= */
export const logSecurityEvent = async (type, severity = 'LOW', data = {}) => {
    try {
        await firebaseDB.child('SecurityEvents').push(clean({
            type, severity, timestamp: iso(), ts: now(),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
            ...data,
        }));
    } catch (e) {
        console.warn('Could not write security event', e);
    }
};

/* ======================= IP threat counters (reset every 24h) ======================= */
const DAY = 86400000;

const bumpThreat = async (ip, field) => {
    const ipN = normalizeIP(ip);
    if (ipN === 'unknown') return;
    try {
        await firebaseDB.child(`IPStats/${sanitizeKey(ipN)}/threat`).transaction((cur) => {
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
        const v = await readNode(`IPStats/${sanitizeKey(normalizeIP(ip))}/threat`);
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
        const v = await readNode('IPRestrictionSettings', null);
        return { ...(v || {}), enabled: !!(v && v.enabled) };
    } catch (e) {
        console.error('Error getting restriction setting:', e);
        return { enabled: false };
    }
};

const setRestrictionSetting = async (enabled, by = 'system') => {
    try {
        await firebaseDB.child('IPRestrictionSettings').set({ enabled: !!enabled, lastModified: iso(), modifiedBy: by });
        await logSecurityEvent('IP_RESTRICTION_CHANGED', 'MEDIUM', { enabled: !!enabled, by });
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
};

const withIds = (obj) => Object.fromEntries(Object.entries(obj || {}).map(([id, d]) => [id, { id, ...d }]));
const getWhitelistedIPs = async () => withIds(await readNode('IPSettings/IPWhitelist', {}));
const getBlacklistedIPs = async () => withIds(await readNode('IPSettings/IPBlacklist', {}));

const isIPWhitelisted = async (ip) => {
    const list = Object.values(await readNode('IPSettings/IPWhitelist', {}));
    return list.some((e) => isEntryActive(e) && ipMatchesRule(ip, e.ip));
};
const isIPBlacklisted = async (ip) => {
    const list = Object.values(await readNode('IPSettings/IPBlacklist', {}));
    return list.some((e) => e.active !== false && ipMatchesRule(ip, e.ip));
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
            await firebaseDB.child(`IPWhitelist/${dup.id}`).update(payload);
            await logSecurityEvent('IP_WHITELIST_UPDATED', 'LOW', { ipAddress: rule.value, by: addedBy });
            return { success: true, id: dup.id, updated: true };
        }
        const res = await firebaseDB.child('IPSettings/IPWhitelist').push({
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
        const data = await readNode(`IPSettings/IPWhitelist/${ipId}`);
        await firebaseDB.child(`IPSettings/IPWhitelist/${ipId}`).remove();
        await logSecurityEvent('IP_WHITELIST_REMOVED', 'LOW', { ipAddress: data && data.ip, by: removedBy });
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
};

/** Switching a single IP OFF blocks it, even when the global restriction is off. */
const toggleIPStatus = async (ipId, isActive, modifiedBy = 'system') => {
    try {
        const data = await readNode(`IPSettings/IPWhitelist/${ipId}`);
        await firebaseDB.child(`IPSettings/IPWhitelist/${ipId}`).update({ active: !!isActive, lastModified: iso() });
        await logSecurityEvent('IP_WHITELIST_TOGGLED', 'MEDIUM', { ipAddress: data && data.ip, newStatus: !!isActive, by: modifiedBy });
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
};

const addToBlacklist = async (ruleInput, reason = '', addedBy = 'system') => {
    try {
        const rule = parseRule(ruleInput);
        if (!rule.valid) return { success: false, error: rule.error };
        const existing = Object.values(await getBlacklistedIPs()).find((e) => e.ip === rule.value);
        if (existing) {
            await firebaseDB.child(`IPSettings/IPBlacklist/${existing.id}`).update({ active: true, reason, lastModified: iso() });
            return { success: true, id: existing.id, updated: true };
        }
        const res = await firebaseDB.child('IPSettings/IPBlacklist').push({
            ip: rule.value, type: rule.type, reason, active: true, createdAt: iso(), createdBy: addedBy,
        });
        await logSecurityEvent('IP_BLACKLISTED', 'HIGH', { ipAddress: rule.value, reason, by: addedBy });
        return { success: true, id: res.key };
    } catch (e) {
        return { success: false, error: e.message };
    }
};

const removeFromBlacklist = async (id, by = 'system') => {
    try {
        const data = await readNode(`IPSettings/IPBlacklist/${id}`);
        await firebaseDB.child(`IPSettings/IPBlacklist/${id}`).remove();
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

/** One-shot check (used by Login). The live site-wide check is <IPGate/>. */
export const checkIPRestriction = async (ipAddress) => {
    try {
        const [settings, whitelist, blacklist] = await Promise.all([
            getRestrictionSetting(), readNode('IPSettings/IPWhitelist', {}), readNode('IPBlacklist', {}),
        ]);
        return evaluateAccess({ ip: ipAddress, settings, whitelist, blacklist });
    } catch (e) {
        console.error('Error checking IP restriction:', e);
        return { restricted: false, error: true }; // database unreachable: do not lock everyone out
    }
};

export const logBlockedAccess = async (ip, reason) => {
    await bumpThreat(ip, 'blocked');
    await logSecurityEvent('BLOCKED_ACCESS', 'MEDIUM', {
        ipAddress: normalizeIP(ip), reason, path: typeof window !== 'undefined' ? window.location.pathname : '',
    });
};

/* ======================= failed-login lockout ======================= */
const LOCK_AFTER = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const attemptKey = (identifier) => sanitizeKey(String(identifier || '').trim().toLowerCase());

export const getLoginLockStatus = async (identifier) => {
    try {
        const v = await readNode(`LoginAttempts/${attemptKey(identifier)}`);
        if (v && v.lockedUntil && v.lockedUntil > now()) {
            return { locked: true, remainingMs: v.lockedUntil - now(), attempts: v.count || 0 };
        }
    } catch { /* ignore */ }
    return { locked: false, remainingMs: 0, attempts: 0 };
};

export const recordFailedLogin = async (identifier, ip, reason = 'INVALID_CREDENTIALS') => {
    let result = { count: 1, locked: false };
    try {
        const tx = await firebaseDB.child(`LoginAttempts/${attemptKey(identifier)}`).transaction((cur) => {
            const t = now();
            const base = cur && t - (cur.firstAt || 0) < WINDOW_MS ? cur : { count: 0, firstAt: t };
            const count = (base.count || 0) + 1;
            return {
                firstAt: base.firstAt, lastAt: t, count, lastIP: normalizeIP(ip),
                lockedUntil: count >= LOCK_AFTER ? t + LOCK_MS : base.lockedUntil || null,
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
    return result;
};

export const clearFailedLogins = async (identifier) => {
    try { await firebaseDB.child(`LoginAttempts/${attemptKey(identifier)}`).remove(); } catch { /* ignore */ }
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
        const g = await readNode(`IPStats/${key}/geo`);
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
        try { await firebaseDB.child(`IPStats/${key}/geo`).set(clean({ ...geo, cachedAt: now() })); } catch { /* ignore */ }
        return geo;
    }
    return defaultGeo();
};

/* ======================= risk analysis ======================= */
const MAX_HISTORY = 50;

const getRecentLogins = async (userId, limit = 20) => {
    try {
        const snap = await firebaseDB.child(`UserLogins/${sanitizeKey(userId)}`).orderByKey().limitToLast(limit).once('value');
        return snap.exists() ? Object.values(snap.val()) : [];
    } catch { return []; }
};

/**
 * Risk is judged by DEVICE + COUNTRY, never by IP alone, so the same phone moving
 * from Wi-Fi to mobile data is NOT suspicious.
 */
export const analyzeLoginRisk = async ({ user, ip, device, geo }) => {
    const history = await getRecentLogins(user.userId, 20);
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
        riskFactors: r.details.factors, isAdmin: normalizeUser(userData).userType === 'admin',
    };
};

/* ======================= writers (all use transactions: safe if two tabs log in at once) ======================= */
const bump = (obj, key) => ({ ...(obj || {}), [key]: ((obj || {})[key] || 0) + 1 });

const upsertUserProfile = (user, ip, device, geo, loginId) =>
    firebaseDB.child(`UserProfiles/${sanitizeKey(user.userId)}`).transaction((cur) => {
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

const upsertDevice = (user, ip, device) =>
    firebaseDB.child(`Devices/${sanitizeKey(device.deviceId)}`).transaction((cur) => {
        const d = cur || {};
        const t = now();
        const ips = { ...(d.ips || {}) };
        const ipKey = sanitizeKey(ip);
        ips[ipKey] = { ip, count: ((ips[ipKey] || {}).count || 0) + 1, lastSeen: t };
        const newest = Object.entries(ips).sort((a, b) => (b[1].lastSeen || 0) - (a[1].lastSeen || 0)).slice(0, 20);
        return clean({
            ...d,
            deviceId: device.deviceId, name: device.deviceName, brand: device.brand, model: device.model,
            modelCode: device.modelCode, type: device.type, os: device.os, osVersion: device.osVersion,
            browser: device.browser, browserVersion: device.browserVersion, screen: device.screen,
            firstSeen: d.firstSeen || t, lastSeen: t, loginCount: (d.loginCount || 0) + 1, lastIP: ip,
            ips: Object.fromEntries(newest),
            users: bump(d.users, sanitizeKey(user.userId)),
        });
    });

const upsertIPStats = (ip, user, device) =>
    firebaseDB.child(`IPStats/${sanitizeKey(ip)}`).transaction((cur) => {
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
    const ref = firebaseDB.child(`UserLogins/${sanitizeKey(user.userId)}`);
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

/* ======================= MAIN: track a successful login ======================= */
export const trackUserLogin = async (userData, ipAddress) => {
    try {
        if (!userData) return { success: false, error: 'No user data provided' };

        const user = normalizeUser(userData);
        const ip = normalizeIP(ipAddress && ipAddress !== 'Unknown' ? ipAddress : await getClientIP());
        const device = await collectDeviceInfo();

        const access = await checkIPRestriction(ip);
        if (access.restricted) {
            await logSecurityEvent('BLOCKED_LOGIN', 'HIGH', {
                userId: user.userId, email: user.email, name: user.name, ipAddress: ip,
                reason: access.reason, deviceName: device.deviceName,
            });
            await bumpThreat(ip, 'blocked');
            return { success: false, restricted: true, error: 'Access denied', reason: access.reason };
        }

        const geo = await getEnhancedLocationFromIP(ip);
        const risk = await analyzeLoginRisk({ user, ip, device, geo });
        const sessionId = generateSessionId();
        const timestamp = now();

        const record = clean({
            // who
            userId: user.userId, email: user.email || 'unknown@example.com',
            displayName: user.name, userName: user.name, userPhoto: user.photo, userType: user.userType,
            // network
            ipAddress: ip, previousIP: risk.previousIP, ipChanged: !!(risk.previousIP && risk.previousIP !== ip),
            userAgent: navigator.userAgent,
            // when
            loginTime: new Date(timestamp).toISOString(), timestamp,
            // where
            location: geo, country: geo.country, city: geo.city, region: geo.region,
            timezone: geo.timezone, isp: geo.isp, coordinates: geo.coordinates,
            // device
            deviceId: device.deviceId, deviceName: device.deviceName, deviceBrand: device.brand,
            deviceModel: device.model, deviceModelCode: device.modelCode, deviceModelApprox: device.modelApprox,
            deviceType: device.type, os: device.os, osVersion: device.osVersion,
            browser: device.browser, browserVersion: device.browserVersion,
            screen: device.screen, platform: navigator.platform, language: navigator.language,
            // security
            securityScore: risk.securityScore, riskLevel: risk.riskLevel, riskFactors: risk.factors,
            isSuspicious: risk.isSuspicious, suspiciousReason: risk.factors.length ? risk.factors.join(', ') : null,
            newDevice: risk.newDevice,
            // session
            sessionId, status: risk.isSuspicious ? 'SUSPICIOUS' : 'SUCCESS',
        });

        const ref = await firebaseDB.child('LoginData').push(record);
        const loginId = ref && ref.key;
        if (!loginId) return { success: false, error: 'Database error' };

        const jobs = await Promise.allSettled([
            upsertUserProfile(user, ip, device, geo, loginId),
            upsertDevice(user, ip, device),
            upsertIPStats(ip, user, device),
            pushUserHistory(user, { t: timestamp, ip, deviceId: device.deviceId, country: geo.country, city: geo.city, loginId }),
        ]);
        jobs.forEach((j, i) => { if (j.status === 'rejected') console.warn(`Login tracking step ${i} failed`, j.reason); });

        try {
            localStorage.setItem(SESSION_KEY, String(timestamp)); // used by force-logout
            sessionStorage.setItem('session_id', sessionId);
        } catch { /* ignore */ }

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
        await firebaseDB.child(`UserProfiles/${sanitizeKey(userId)}/forceLogoutAt`).set(now());
        await logSecurityEvent('FORCE_LOGOUT', 'MEDIUM', { userId, by });
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
};

export const touchUserActivity = async (userId) => {
    try { await firebaseDB.child(`UserProfiles/${sanitizeKey(userId)}/lastActive`).set(now()); } catch { /* ignore */ }
};

/**
 * One-time cleanup of the old layout, where events, per-user history and IP analytics
 * were all written INSIDE LoginData and were being counted as logins.
 * Events are moved to SecurityEvents; the leftover duplicate nodes are deleted.
 */
export const migrateLegacyLoginData = async () => {
    const val = await readNode('LoginData', {});
    const updates = {};
    let moved = 0;
    let removed = 0;
    Object.entries(val).forEach(([key, v]) => {
        const isLogin = v && typeof v === 'object' && !v.type && typeof v.ipAddress === 'string' && (v.loginTime || v.timestamp);
        if (isLogin) return;
        if (v && typeof v === 'object' && v.type) {
            updates[`SecurityEvents/${key}`] = clean({ ...v, ts: v.timestamp ? new Date(v.timestamp).getTime() || 0 : 0, migrated: true });
            moved += 1;
        }
        updates[`LoginData/${key}`] = null;
        removed += 1;
    });
    if (Object.keys(updates).length) await firebaseDB.update(updates);
    return { moved, removed };
};

export default {
    trackUserLogin, checkIPRestriction, checkSuspiciousActivity, ipWhitelistManager,
    getEnhancedLocationFromIP, getSecurityContext, getClientIP, analyzeLoginRisk,
    recordFailedLogin, getLoginLockStatus, clearFailedLogins, forceLogoutUser, logSecurityEvent,
};
