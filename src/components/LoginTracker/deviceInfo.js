// LoginTracker/deviceInfo.js
// Stable device id + real device model (Samsung Galaxy S24 Ultra, Pixel 8, iPhone 17 ...).
//
// How models are found:
//  - Android (Chrome/Edge, HTTPS): navigator.userAgentData gives the real model code (e.g. SM-S928B)
//  - iPhone / iPad: browsers hide the exact model, so we match the screen size. Several models share
//    one size, so the result is a best guess (e.g. "iPhone 17 / 17 Pro / 16 Pro").
import { sanitizeKey } from './ipUtils';

/* ---------------- device id (same browser = same id, whatever network) ---------------- */
const DEVICE_KEY = 'app_device_id';
const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

const readCookie = (name) => {
    try {
        const hit = document.cookie.split('; ').find((r) => r.startsWith(`${name}=`));
        return hit ? decodeURIComponent(hit.split('=')[1]) : null;
    } catch { return null; }
};
const makeId = () => {
    try { if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID(); } catch { /* ignore */ }
    return `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
};

export const getDeviceId = () => {
    let id = null;
    try { id = localStorage.getItem(DEVICE_KEY); } catch { /* ignore */ }
    if (!id || !ID_RE.test(id)) id = readCookie(DEVICE_KEY);
    if (!id || !ID_RE.test(id)) id = makeId(); // validated: it is used as a database key
    try { localStorage.setItem(DEVICE_KEY, id); } catch { /* ignore */ }
    try { document.cookie = `${DEVICE_KEY}=${encodeURIComponent(id)}; max-age=63072000; path=/; SameSite=Lax`; } catch { /* ignore */ }
    return sanitizeKey(id);
};

/* ---------------- model tables (extend as needed) ---------------- */
// Samsung model-code prefix -> marketing name. Region letter (B, U, N, E...) after the prefix is ignored.
const SAMSUNG = {
    'SM-S938': 'Galaxy S25 Ultra', 'SM-S936': 'Galaxy S25+', 'SM-S931': 'Galaxy S25', 'SM-S937': 'Galaxy S25 Edge', 'SM-S731': 'Galaxy S25 FE',
    'SM-S928': 'Galaxy S24 Ultra', 'SM-S926': 'Galaxy S24+', 'SM-S921': 'Galaxy S24', 'SM-S721': 'Galaxy S24 FE',
    'SM-S918': 'Galaxy S23 Ultra', 'SM-S916': 'Galaxy S23+', 'SM-S911': 'Galaxy S23', 'SM-S711': 'Galaxy S23 FE',
    'SM-S908': 'Galaxy S22 Ultra', 'SM-S906': 'Galaxy S22+', 'SM-S901': 'Galaxy S22',
    'SM-G998': 'Galaxy S21 Ultra', 'SM-G996': 'Galaxy S21+', 'SM-G991': 'Galaxy S21',
    'SM-F966': 'Galaxy Z Fold7', 'SM-F766': 'Galaxy Z Flip7', 'SM-F956': 'Galaxy Z Fold6', 'SM-F741': 'Galaxy Z Flip6',
    'SM-F946': 'Galaxy Z Fold5', 'SM-F731': 'Galaxy Z Flip5',
    'SM-A566': 'Galaxy A56', 'SM-A556': 'Galaxy A55', 'SM-A546': 'Galaxy A54', 'SM-A536': 'Galaxy A53',
    'SM-A366': 'Galaxy A36', 'SM-A356': 'Galaxy A35', 'SM-A346': 'Galaxy A34',
    'SM-A266': 'Galaxy A26', 'SM-A256': 'Galaxy A25', 'SM-A166': 'Galaxy A16', 'SM-A156': 'Galaxy A15', 'SM-A146': 'Galaxy A14',
    'SM-M556': 'Galaxy M55', 'SM-M356': 'Galaxy M35', 'SM-M346': 'Galaxy M34', 'SM-M146': 'Galaxy M14',
};

// CSS-pixel screen size @ pixel ratio -> iPhone models that share it
const APPLE_PHONES = {
    '440x956@3': 'iPhone 17 Pro Max / 16 Pro Max',
    '420x912@3': 'iPhone Air',
    '402x874@3': 'iPhone 17 / 17 Pro / 16 Pro',
    '430x932@3': 'iPhone 16 Plus / 15 Plus / 15 Pro Max / 14 Pro Max',
    '393x852@3': 'iPhone 16 / 15 / 15 Pro / 14 Pro',
    '390x844@3': 'iPhone 16e / 14 / 13 / 12',
    '428x926@3': 'iPhone 14 Plus / 13 Pro Max / 12 Pro Max',
    '414x896@3': 'iPhone 11 Pro Max / XS Max',
    '414x896@2': 'iPhone 11 / XR',
    '375x812@3': 'iPhone 13 mini / 12 mini / 11 Pro / XS / X',
    '375x667@2': 'iPhone SE (2nd/3rd gen) / 8 / 7',
    '414x736@3': 'iPhone 8 Plus / 7 Plus',
    '320x568@2': 'iPhone SE (1st gen) / 5s',
};
const APPLE_PADS = {
    '1032x1376@2': 'iPad Pro 13" / iPad Air 13"',
    '1024x1366@2': 'iPad Pro 12.9"',
    '834x1210@2': 'iPad Pro 11" (M4)',
    '834x1194@2': 'iPad Pro 11" / iPad Air 11"',
    '820x1180@2': 'iPad Air / iPad (10th gen)',
    '810x1080@2': 'iPad (9th gen)',
    '744x1133@2': 'iPad mini',
};

const friendlySamsung = (code) => {
    const c = String(code || '').toUpperCase();
    const hit = Object.keys(SAMSUNG).find((p) => c.startsWith(p));
    return hit ? SAMSUNG[hit] : null;
};

const brandFromModel = (m) => {
    const s = String(m || '');
    if (/^(SM-|GT-|SCG)/i.test(s)) return 'Samsung';
    if (/^Pixel/i.test(s)) return 'Google';
    if (/^RMX/i.test(s)) return 'realme';
    if (/^(LE|IN|KB|NE|HD|GM|BE|AC|EB|DN)\d{4}$/.test(s)) return 'OnePlus';
    if (/^(CPH|PJ[A-Z]|PH[A-Z])\d/i.test(s)) return 'OPPO / OnePlus';
    if (/^(moto|XT\d)/i.test(s)) return 'Motorola';
    if (/^(Redmi|POCO|Mi |M\d{4}[A-Z]\d)/i.test(s) || /^\d{5,8}[A-Z0-9]{2,6}$/.test(s)) return 'Xiaomi';
    if (/^(vivo|V\d{4}|I\d{4})/i.test(s)) return 'vivo';
    if (/^Infinix/i.test(s)) return 'Infinix';
    if (/^TECNO/i.test(s)) return 'TECNO';
    if (/^(ASUS|ZS|AI\d{4})/i.test(s)) return 'ASUS';
    return '';
};

const trimVer = (v) => String(v || '').replace(/(\.0)+$/, '');

/* ---------------- user-agent parsing ---------------- */
const describe = ({ os, type, model, high = {}, screenInfo = null }) => {
    const raw = String(high.model || model || '').trim();

    if (os === 'iOS') {
        const name = screenInfo ? APPLE_PHONES[`${screenInfo.w}x${screenInfo.h}@${screenInfo.dpr}`] : '';
        return { brand: 'Apple', model: name || 'iPhone', deviceName: name || 'iPhone', approx: !!name };
    }
    if (os === 'iPadOS') {
        const name = screenInfo ? APPLE_PADS[`${screenInfo.w}x${screenInfo.h}@${screenInfo.dpr}`] : '';
        return { brand: 'Apple', model: name || 'iPad', deviceName: name || 'iPad', approx: !!name };
    }
    if (os === 'Android') {
        if (raw) {
            const friendly = friendlySamsung(raw);
            if (friendly) return { brand: 'Samsung', model: friendly, modelCode: raw, deviceName: `Samsung ${friendly}` };
            const brand = brandFromModel(raw);
            return { brand, model: raw, modelCode: raw, deviceName: brand && !raw.toLowerCase().startsWith(brand.toLowerCase()) ? `${brand} ${raw}` : raw };
        }
        return { brand: '', model: '', deviceName: type === 'Tablet' ? 'Android tablet' : 'Android phone' };
    }
    if (os === 'macOS') {
        const arm = high.architecture === 'arm';
        return { brand: 'Apple', model: arm ? 'Mac (Apple Silicon)' : 'Mac', deviceName: arm ? 'Mac (Apple Silicon)' : 'Mac' };
    }
    if (os === 'Windows') {
        const major = parseInt(String(high.platformVersion || '').split('.')[0], 10);
        const label = Number.isFinite(major) ? (major >= 13 ? 'Windows 11' : 'Windows 10') : 'Windows';
        return { brand: '', model: `${label} PC`, deviceName: `${label} PC` };
    }
    if (os === 'ChromeOS') return { brand: '', model: 'Chromebook', deviceName: 'Chromebook' };
    if (os === 'Linux') return { brand: '', model: 'Linux PC', deviceName: 'Linux PC' };
    return { brand: '', model: '', deviceName: type || 'Unknown device' };
};

/** Works on any stored user-agent string (used for old log records too). */
export const parseUA = (ua = '') => {
    const s = String(ua || '');
    let m;
    let os = 'Unknown';
    let osVersion = '';
    if ((m = s.match(/Windows NT ([\d.]+)/))) { os = 'Windows'; osVersion = m[1] === '10.0' ? '10/11' : m[1]; }
    else if ((m = s.match(/Android ([\d.]+)/))) { os = 'Android'; osVersion = m[1]; }
    else if (/iPhone|iPad|iPod/.test(s) && (m = s.match(/OS ([\d_]+) like Mac/))) { os = /iPad/.test(s) ? 'iPadOS' : 'iOS'; osVersion = m[1].replace(/_/g, '.'); }
    else if ((m = s.match(/Mac OS X ([\d_.]+)/))) { os = 'macOS'; osVersion = m[1].replace(/_/g, '.'); }
    else if (/CrOS/.test(s)) os = 'ChromeOS';
    else if (/Linux/.test(s)) os = 'Linux';

    let browser = 'Unknown';
    let browserVersion = '';
    const tests = [
        ['Edge', /(?:Edg|EdgA|EdgiOS)\/([\d.]+)/],
        ['Opera', /(?:OPR|OPiOS)\/([\d.]+)/],
        ['Samsung Internet', /SamsungBrowser\/([\d.]+)/],
        ['Firefox', /(?:Firefox|FxiOS)\/([\d.]+)/],
        ['Chrome', /(?:Chrome|CriOS)\/([\d.]+)/],
        ['Safari', /Version\/([\d.]+).*Safari/],
    ];
    for (const [name, re] of tests) {
        const hit = s.match(re);
        if (hit) { browser = name; browserVersion = hit[1].split('.')[0]; break; }
    }

    let type = 'Desktop';
    if (/iPad|Tablet/i.test(s) || (/Android/.test(s) && !/Mobile/.test(s))) type = 'Tablet';
    else if (/Mobile|iPhone|iPod|Android/.test(s)) type = 'Mobile';

    let model = '';
    const mm = s.match(/Android [\d.]+; ([^;)]+?)(?: Build|;|\))/);
    if (mm) {
        const cand = mm[1].trim();
        if (cand && cand !== 'K' && !/^(Linux|U|wv)$/i.test(cand)) model = cand; // "K" = Chrome's reduced UA
    }
    const d = describe({ os, type, model });
    return { os, osVersion, browser, browserVersion, type, ...d };
};

/* ---------------- full collection (call at login) ---------------- */
let cached = null;

export const collectDeviceInfo = async () => {
    if (cached) return cached;

    const ua = navigator.userAgent || '';
    const parsed = parseUA(ua);

    let high = {};
    try {
        if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
            high = await navigator.userAgentData.getHighEntropyValues(['model', 'platformVersion', 'architecture', 'platform']);
        }
    } catch { /* not supported / blocked */ }

    let os = parsed.os;
    let type = parsed.type;
    if (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1) { os = 'iPadOS'; type = 'Tablet'; } // iPad in desktop mode

    const sc = window.screen || {};
    const w = Math.min(sc.width || 0, sc.height || 0);
    const h = Math.max(sc.width || 0, sc.height || 0);
    const dpr = Math.round(window.devicePixelRatio || 1);

    const d = describe({ os, type, model: parsed.model, high, screenInfo: { w, h, dpr } });

    let osVersion = parsed.osVersion;
    if (high.platformVersion && (os === 'Android' || os === 'macOS')) osVersion = trimVer(high.platformVersion);
    if (os === 'Windows' && high.platformVersion) {
        osVersion = parseInt(String(high.platformVersion).split('.')[0], 10) >= 13 ? '11' : '10';
    }

    let tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { /* ignore */ }

    cached = {
        deviceId: getDeviceId(),
        deviceName: d.deviceName || 'Unknown device',
        brand: d.brand || '',
        model: d.model || '',
        modelCode: d.modelCode || '',
        modelApprox: !!d.approx,
        type,
        os,
        osVersion: osVersion || '',
        browser: parsed.browser,
        browserVersion: parsed.browserVersion,
        screen: w && h ? `${w}x${h}@${dpr}x` : '',
        touchPoints: navigator.maxTouchPoints || 0,
        cpuCores: navigator.hardwareConcurrency || 0,
        memoryGB: navigator.deviceMemory || 0,
        language: navigator.language || '',
        timezone: tz,
    };
    return cached;
};
