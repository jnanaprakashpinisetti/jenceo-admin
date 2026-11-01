// LoginTracker/ipUtils.js
// Pure helpers (no Firebase): IP parsing, rule matching (single / CIDR / range / wildcard)
// and the ONE function that decides whether an IP may open the site.

/** Firebase keys cannot contain . # $ [ ] / — make any value safe to use as a key. */
export const sanitizeKey = (value) =>
    String(value ?? 'unknown').trim().replace(/[.#$\[\]\/:@\s]/g, '_') || 'unknown';

export const normalizeIP = (ip) => {
    if (!ip) return 'unknown';
    let v = String(ip).trim().toLowerCase();
    if (!v || v === 'unknown') return 'unknown';
    if (v.startsWith('::ffff:') && v.includes('.')) v = v.slice(7); // IPv4-mapped IPv6
    return v;
};

const IPV4_RE = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
export const isValidIPv4 = (v) => IPV4_RE.test(String(v));

const expandIPv6 = (ip) => {
    if (!ip || !ip.includes(':') || ip.split('::').length > 2) return null;
    const hasGap = ip.includes('::');
    const [head, tail] = ip.split('::');
    const h = head ? head.split(':') : [];
    const t = tail ? tail.split(':') : [];
    const missing = 8 - h.length - t.length;
    if (hasGap ? missing < 1 : missing !== 0) return null;
    const parts = hasGap ? [...h, ...Array(missing).fill('0'), ...t] : h;
    if (parts.length !== 8 || !parts.every((p) => /^[0-9a-f]{1,4}$/.test(p))) return null;
    return parts.map((p) => p.padStart(4, '0')).join(':');
};
export const isValidIPv6 = (v) => expandIPv6(String(v)) !== null;
export const isValidIP = (v) => isValidIPv4(v) || isValidIPv6(v);

const v4ToInt = (ip) => ip.split('.').reduce((acc, o) => acc * 256 + Number(o), 0);

export const RULE_LABELS = {
    single: 'Single IP',
    cidr: 'CIDR range',
    range: 'IP range',
    wildcard: 'Wildcard',
};

/**
 * Accepts:  203.0.113.5 | 2001:db8::1 | 192.168.1.0/24 | 192.168.1.10-192.168.1.50 | 192.168.*.*
 */
export const parseRule = (input) => {
    const raw = String(input ?? '').trim().toLowerCase();
    if (!raw) return { valid: false, error: 'Enter an IP address' };

    if (raw.includes('/')) {
        const [base, bits] = raw.split('/');
        const n = Number(bits);
        if (isValidIPv4(base) && /^\d{1,2}$/.test(bits) && n >= 0 && n <= 32) {
            if (n === 0) return { valid: false, error: '/0 would allow every IP' };
            return { valid: true, type: 'cidr', value: raw, base, bits: n };
        }
        return { valid: false, error: 'CIDR must look like 192.168.1.0/24 (IPv4 only)' };
    }

    if (raw.includes('-') && !raw.includes(':')) {
        const [a, b] = raw.split('-').map((s) => s.trim());
        if (isValidIPv4(a) && isValidIPv4(b)) {
            if (v4ToInt(a) > v4ToInt(b)) return { valid: false, error: 'Range start must be lower than range end' };
            return { valid: true, type: 'range', value: `${a}-${b}`, start: a, end: b };
        }
        return { valid: false, error: 'Range must look like 192.168.1.10-192.168.1.50' };
    }

    if (raw.includes('*')) {
        const parts = raw.split('.');
        const first = parts.indexOf('*');
        const ok =
            parts.length === 4 &&
            first > 0 && // "*.*.*.*" would allow everyone
            parts.slice(0, first).every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255) &&
            parts.slice(first).every((p) => p === '*');
        if (ok) return { valid: true, type: 'wildcard', value: raw, parts };
        return { valid: false, error: 'Wildcard must look like 192.168.*.* or 10.0.5.*' };
    }

    const v = normalizeIP(raw);
    if (isValidIPv4(v)) return { valid: true, type: 'single', value: v };
    const expanded = expandIPv6(v);
    if (expanded) return { valid: true, type: 'single', value: v, expanded };
    return { valid: false, error: 'Not a valid IP address' };
};

export const splitRules = (text) =>
    Array.from(new Set(String(text || '').split(/[\n,;\s]+/).map((s) => s.trim()).filter(Boolean)));

export const ipMatchesRule = (ip, rule) => {
    const r = typeof rule === 'string' ? parseRule(rule) : rule;
    const ipN = normalizeIP(ip);
    if (!r || !r.valid || ipN === 'unknown') return false;

    if (r.type === 'single') {
        if (isValidIPv4(ipN) && isValidIPv4(r.value)) return ipN === r.value;
        const a = expandIPv6(ipN);
        return !!a && a === r.expanded;
    }
    if (!isValidIPv4(ipN)) return false; // ranges are IPv4 only
    const n = v4ToInt(ipN);
    if (r.type === 'cidr') {
        const size = 2 ** (32 - r.bits);
        const net = Math.floor(v4ToInt(r.base) / size) * size;
        return n >= net && n < net + size;
    }
    if (r.type === 'range') return n >= v4ToInt(r.start) && n <= v4ToInt(r.end);
    if (r.type === 'wildcard') {
        const octets = ipN.split('.');
        return r.parts.every((p, i) => p === '*' || Number(p) === Number(octets[i]));
    }
    return false;
};

/* ---------- entry state helpers ---------- */
export const isExpired = (entry) => {
    if (!entry || !entry.expiresAt) return false;
    const t = new Date(entry.expiresAt).getTime();
    return Number.isFinite(t) && Date.now() > t;
};
export const isEntryActive = (entry) => !!entry && entry.active !== false && !isExpired(entry);

export const REASON_MESSAGES = {
    IP_BLACKLISTED: 'This IP address has been blocked by the administrator.',
    IP_DISABLED: 'Access for this IP address has been turned off by the administrator.',
    IP_NOT_WHITELISTED: 'This website can only be opened from approved IP addresses.',
    IP_EXPIRED: 'Temporary access for this IP address has expired.',
    IP_UNKNOWN: 'We could not detect your IP address, so access cannot be verified.',
};

/**
 * THE access decision. Order matters:
 *  1. Blacklisted IP                         -> blocked (always)
 *  2. Single IP switched OFF in the whitelist -> blocked (always, even if restriction is off)
 *  3. Restriction ON and no active/unexpired whitelist rule matches -> blocked
 *  4. Otherwise allowed
 */
export const evaluateAccess = ({ ip, settings, whitelist, blacklist }) => {
    const ipN = normalizeIP(ip);
    const enabled = !!(settings && settings.enabled);
    const wl = Object.values(whitelist || {}).filter(Boolean);
    const bl = Object.values(blacklist || {}).filter(Boolean);

    if (ipN === 'unknown') {
        return enabled ? { restricted: true, reason: 'IP_UNKNOWN' } : { restricted: false };
    }
    if (bl.some((e) => e.active !== false && ipMatchesRule(ipN, e.ip))) {
        return { restricted: true, reason: 'IP_BLACKLISTED' };
    }

    const matches = wl.filter((e) => ipMatchesRule(ipN, e.ip));
    const isSingle = (e) => parseRule(e.ip).type === 'single';
    const activeMatches = matches.filter(isEntryActive);

    const disabledSingle = matches.some((e) => e.active === false && isSingle(e));
    if (disabledSingle && !activeMatches.some(isSingle)) {
        return { restricted: true, reason: 'IP_DISABLED' };
    }

    if (enabled && activeMatches.length === 0) {
        const expired = matches.some((e) => e.active !== false && isExpired(e));
        return { restricted: true, reason: expired ? 'IP_EXPIRED' : 'IP_NOT_WHITELISTED' };
    }
    return { restricted: false };
};
