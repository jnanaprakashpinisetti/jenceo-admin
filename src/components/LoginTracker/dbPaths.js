// LoginTracker/dbPaths.js
// EVERY database path in one place. Before this file, some functions used 'IPRestrictionSettings'
// and others 'IPSettings/IPRestrictionSettings', so the toggle wrote where the gate never read.
export const ROOT = 'IPSettings';

export const PATHS = {
    // access rules (live under IPSettings/)
    restriction: `${ROOT}/IPRestrictionSettings`,
    whitelist: `${ROOT}/IPWhitelist`,
    blacklist: `${ROOT}/IPBlacklist`,
    ipStats: `${ROOT}/IPStats`,
    deviceRules: `${ROOT}/DeviceRules`,
    security: `${ROOT}/SecuritySettings`,
    // activity data (root level, as before)
    loginData: 'LoginData',
    userLogins: 'UserLogins',
    userProfiles: 'UserProfiles',
    devices: 'Devices',
    events: 'SecurityEvents',
    attempts: 'LoginAttempts',
};

export const DEFAULT_SECURITY = {
    idleMinutes: 30,            // auto sign-out after this many idle minutes (0 = off)
    maxFailedAttempts: 5,       // wrong passwords before the account is locked
    lockMinutes: 15,            // how long the lock lasts (also the counting window)
    mergeWindowMinutes: 30,     // repeat logins from the same user + device + IP inside this window are merged (0 = off)
    autoBlockIPs: false,        // block an IP for 1 hour after many failed logins
    requireDeviceApproval: false, // unknown devices must be approved by an admin before sign-in
};

const LIMITS = {
    idleMinutes: [0, 720],
    maxFailedAttempts: [3, 10],
    lockMinutes: [1, 240],
    mergeWindowMinutes: [0, 240],
};

export const SECURITY_LIMITS = LIMITS;

/** Always returns a complete, in-range settings object (missing or bad values fall back to defaults). */
export const sanitizeSecurity = (raw) => {
    const r = raw && typeof raw === 'object' ? raw : {};
    const out = { ...DEFAULT_SECURITY };
    Object.keys(LIMITS).forEach((k) => {
        const n = Number(r[k]);
        if (r[k] !== undefined && r[k] !== null && Number.isFinite(n)) {
            out[k] = Math.min(LIMITS[k][1], Math.max(LIMITS[k][0], Math.round(n)));
        }
    });
    out.autoBlockIPs = !!r.autoBlockIPs;
    out.requireDeviceApproval = !!r.requireDeviceApproval;
    return out;
};
