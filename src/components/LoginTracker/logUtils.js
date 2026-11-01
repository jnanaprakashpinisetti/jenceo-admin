// LoginTracker/logUtils.js
// Shared helpers for the dashboard: pick real login records out of LoginData and normalise them.
import { parseUA } from './deviceInfo';
import { resolveUserType } from './userInfo';

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

export const normalizeLog = (id, d) => {
    const parsed = parseUA(d.userAgent || '');
    const t = toTime(d.loginTime) || Number(d.timestamp) || 0;
    const userId = String(d.userId || d.email || 'unknown');
    const userType = ['admin', 'user', 'guest'].includes(d.userType) ? d.userType : resolveUserType({ role: d.userType });
    return {
        ...d,
        id,
        t,
        loginTime: t ? new Date(t).toISOString() : '',
        userId,
        name: d.userName || d.displayName || d.email || userId,
        photo: d.userPhoto || '',
        userType,
        ipAddress: d.ipAddress || 'unknown',
        // Same browser = same deviceKey, even when the IP changes. Old records get a stable guess.
        deviceKey: d.deviceId || `legacy-${hash(`${userId}|${d.userAgent || ''}`)}`,
        deviceName: d.deviceName || parsed.deviceName,
        deviceKind: d.deviceType || parsed.type,
        os: d.os || parsed.os,
        osVersion: d.osVersion || parsed.osVersion,
        browser: d.deviceId ? d.browser || parsed.browser : parsed.browser, // old records mislabelled Edge as Chrome
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
