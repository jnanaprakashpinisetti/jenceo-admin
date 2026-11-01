// LoginTracker/logUtils.js
// Shared helpers for the dashboard: pick real login records out of LoginData and normalise them.
//
// Login records are now SMALL: device details (model, OS, browser) and user details (photo, type)
// are stored once in Devices/ and UserProfiles/ and joined here. Old, bigger records still work.
import { parseUA } from './deviceInfo';
import { resolveUserType, USER_TYPE_VALUES } from './userInfo';
import { sanitizeKey } from './ipUtils';

export const toTime = (v) => {
    const t = new Date(v).getTime();
    return Number.isFinite(t) ? t : 0;
};

/** Real login rows only. Events and old junk nodes that lived inside LoginData are skipped. */
export const isLoginRecord = (r) =>
    !!r && typeof r === 'object' && !r.type && typeof r.ipAddress === 'string' && !!(r.loginTime || r.timestamp);

export const isKnownIP = (ip) => !!ip && String(ip).toLowerCase() !== 'unknown';

const hash = (s) => {
    let h = 0;
    for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h).toString(36);
};

/**
 * ctx.devices  = the Devices/ node   (joined by deviceId)
 * ctx.profiles = the UserProfiles/ node (joined by sanitised userId)
 */
export const normalizeLog = (id, d, ctx = {}) => {
    const parsed = parseUA(d.userAgent || '');
    const firstT = toTime(d.loginTime) || Number(d.timestamp) || 0;
    const t = Number(d.lastTimestamp) || firstT;
    const userId = String(d.userId || d.email || 'unknown');
    const prof = (ctx.profiles && ctx.profiles[sanitizeKey(userId)]) || null;
    const dev = (d.deviceId && ctx.devices && ctx.devices[sanitizeKey(d.deviceId)]) || null;

    const typeSource = (prof && prof.userType) || d.userType;
    const userType = USER_TYPE_VALUES.includes(typeSource) ? typeSource : resolveUserType({ role: typeSource });
    const factors = Array.isArray(d.riskFactors) ? d.riskFactors : [];

    return {
        ...d,
        id,
        t,
        firstT,
        count: 1 + (Number(d.repeatCount) || 0), // repeat logins are merged into one record
        loginTime: firstT ? new Date(firstT).toISOString() : '',
        userId,
        name: (prof && prof.name) || d.userName || d.displayName || d.email || userId,
        email: d.email || (prof && prof.email) || '',
        photo: (prof && prof.photo) || d.userPhoto || '',
        userType,
        ipAddress: d.ipAddress || 'unknown',
        // Same browser = same deviceKey, even when the IP changes. Old records get a stable guess.
        deviceKey: d.deviceId || `legacy-${hash(`${userId}|${d.userAgent || ''}`)}`,
        deviceName: (dev && dev.name) || d.deviceName || parsed.deviceName,
        deviceKind: (dev && dev.type) || d.deviceType || parsed.type,
        deviceBrand: (dev && dev.brand) || d.deviceBrand || '',
        deviceModel: (dev && dev.model) || d.deviceModel || '',
        deviceModelCode: (dev && dev.modelCode) || d.deviceModelCode || '',
        deviceModelApprox: dev ? !!dev.modelApprox : !!d.deviceModelApprox,
        os: (dev && dev.os) || d.os || parsed.os,
        osVersion: (dev && dev.osVersion) || d.osVersion || parsed.osVersion,
        browser: (dev && dev.browser) || (d.deviceId ? d.browser : '') || parsed.browser, // old records mislabelled Edge as Chrome
        screen: (dev && dev.screen) || d.screen || '',
        suspiciousReason: d.suspiciousReason || (factors.length ? factors.join(', ') : ''),
    };
};

export const formatDate = (v) => {
    const t = typeof v === 'number' ? v : toTime(v);
    if (!t) return '—';
    return new Date(t).toLocaleString('en-IN', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
};

/** CSV cell that is quoted, escaped, and cannot run as a spreadsheet formula. */
export const csvCell = (v) => {
    let s = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
};
