// LoginTracker/getUserIP.js
// ONE place that detects the visitor's public IP (cached, with timeouts and fallbacks).
// Prefers the IPv4 address when the device has one, so the same device shows the same IP
// on dual-stack networks instead of flipping between IPv4 and IPv6.
import { isValidIP, normalizeIP } from './ipUtils';

const SOURCES = [
    { url: 'https://api.ipify.org?format=json', read: async (r) => (await r.json()).ip },       // IPv4 first
    { url: 'https://api64.ipify.org?format=json', read: async (r) => (await r.json()).ip },     // IPv6-only networks
    { url: 'https://icanhazip.com/', read: async (r) => (await r.text()) },
    { url: 'https://www.cloudflare.com/cdn-cgi/trace', read: async (r) => ((await r.text()).match(/^ip=(.+)$/m) || [])[1] },
];

let cache = { ip: null, at: 0 };
let inflight = null;

const fetchWithTimeout = async (url, ms = 4000) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    try {
        return await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    } finally {
        clearTimeout(timer);
    }
};

export const getUserIP = async ({ force = false, maxAgeMs = 30000 } = {}) => {
    if (!force && cache.ip && Date.now() - cache.at < maxAgeMs) return cache.ip;
    if (inflight) return inflight;

    inflight = (async () => {
        for (const src of SOURCES) {
            try {
                const res = await fetchWithTimeout(src.url);
                if (!res.ok) continue;
                const ip = normalizeIP(await src.read(res));
                if (isValidIP(ip)) {
                    cache = { ip, at: Date.now() };
                    return ip;
                }
            } catch { /* try next source */ }
        }
        return 'unknown';
    })().finally(() => { inflight = null; });

    return inflight;
};

export const getClientIP = getUserIP; // old name used by Login.jsx / trackUserLogin
export default getUserIP;
