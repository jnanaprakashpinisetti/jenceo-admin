// LoginTracker/IPGate.jsx
// Wrap your WHOLE app with this. If the visitor's IP is blocked, the app is never rendered
// (not even the login page). Updates live: change a rule in the dashboard and it applies at once.
//
//   <IPGate>
//     <AuthProvider>
//       <BrowserRouter> ... <IPRestrictionMonitor /> ... </BrowserRouter>
//     </AuthProvider>
//   </IPGate>
//
// NOTE: this runs in the browser, so it stops normal visitors but not someone who edits the
// JavaScript. For hard protection also enforce the same rule on the server / CDN (see notes).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import firebaseDB from '../../firebase';
import { getClientIP } from './getUserIP';
import { evaluateAccess, parseRule, REASON_MESSAGES } from './ipUtils';
import { logBlockedAccess } from './trackUserLogin';

const EMPTY = { settings: undefined, whitelist: undefined, blacklist: undefined };

export function useIPAccess({ pollMs = 60000 } = {}) {
    const [ip, setIp] = useState(null); // null = not detected yet
    const [data, setData] = useState(EMPTY);
    const lastKnown = useRef(null);

    const resolveIP = useCallback(async (force = true) => {
        const next = await getClientIP({ force });
        if (next === 'unknown' && lastKnown.current) return; // short outage: keep the last known IP
        if (next !== 'unknown') lastKnown.current = next;
        setIp(next);
    }, []);

    // Re-detect the IP when the network may have changed (Wi-Fi <-> mobile data, wake, back online)
    useEffect(() => {
        resolveIP(false);
        const timer = setInterval(() => resolveIP(true), pollMs);
        const onChange = () => resolveIP(true);
        const onVisible = () => { if (document.visibilityState === 'visible') resolveIP(true); };
        window.addEventListener('online', onChange);
        document.addEventListener('visibilitychange', onVisible);
        const conn = navigator.connection;
        if (conn && conn.addEventListener) conn.addEventListener('change', onChange);
        return () => {
            clearInterval(timer);
            window.removeEventListener('online', onChange);
            document.removeEventListener('visibilitychange', onVisible);
            if (conn && conn.removeEventListener) conn.removeEventListener('change', onChange);
        };
    }, [resolveIP, pollMs]);

    // Live rules
    useEffect(() => {
        const refs = {
            settings: firebaseDB.child('IPSettings/IPRestrictionSettings'),
            whitelist: firebaseDB.child('IPSettings/IPWhitelist'),
            blacklist: firebaseDB.child('IPSettings/IPBlacklist'),
        };
        const fallback = (k) => (k === 'settings' ? { enabled: false } : {});
        const handlers = {};
        Object.entries(refs).forEach(([k, ref]) => {
            handlers[k] = ref.on(
                'value',
                (snap) => setData((p) => ({ ...p, [k]: snap.val() || fallback(k) })),
                (err) => {
                    console.error(`IPGate could not read ${k}:`, err);
                    setData((p) => ({ ...p, [k]: p[k] !== undefined ? p[k] : fallback(k) })); // fail open on DB errors
                },
            );
        });
        return () => Object.entries(refs).forEach(([k, ref]) => ref.off('value', handlers[k]));
    }, []);

    const dataReady = data.settings !== undefined && data.whitelist !== undefined && data.blacklist !== undefined;

    // If nothing can possibly block this visitor, do not make them wait for the IP lookup.
    const needsIP = useMemo(() => {
        if (!dataReady) return true;
        if (data.settings.enabled) return true;
        if (Object.values(data.blacklist).some((e) => e && e.active !== false)) return true;
        return Object.values(data.whitelist).some((e) => e && e.active === false && parseRule(e.ip).type === 'single');
    }, [data, dataReady]);

    const ready = dataReady && (ip !== null || !needsIP);
    const access = useMemo(
        () => (ready ? evaluateAccess({ ip: ip || 'unknown', ...data }) : null),
        [ready, ip, data],
    );

    return { ready, ip: ip || 'unknown', access, recheck: () => resolveIP(true) };
}

const box = {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#16181a', color: '#e9ecef', padding: 24, textAlign: 'center',
};

export default function IPGate({ children }) {
    const { ready, ip, access, recheck } = useIPAccess();
    const [checking, setChecking] = useState(false);
    const logged = useRef(new Set());

    useEffect(() => {
        if (access && access.restricted) {
            const k = `${ip}|${access.reason}`;
            if (!logged.current.has(k)) {
                logged.current.add(k);
                logBlockedAccess(ip, access.reason);
            }
        }
    }, [access, ip]);

    if (!ready) {
        return (
            <div style={box}>
                <div className="spinner-border text-info" role="status"><span className="visually-hidden">Checking access...</span></div>
            </div>
        );
    }

    if (access && access.restricted) {
        return (
            <div style={box}>
                <div style={{ maxWidth: 460 }}>
                    <i className="bi bi-shield-lock" style={{ fontSize: 56, color: '#dc3545' }} />
                    <h3 className="mt-3">Access restricted</h3>
                    <p className="text-secondary">{REASON_MESSAGES[access.reason] || 'Access from your network is not allowed.'}</p>
                    <p className="mb-1">Your IP address</p>
                    <code className="fs-5 text-warning">{ip}</code>
                    <p className="small text-secondary mt-3">If you should have access, send this IP address to the administrator.</p>
                    <button
                        className="btn btn-outline-light mt-2"
                        disabled={checking}
                        onClick={async () => { setChecking(true); await recheck(); setChecking(false); }}
                    >
                        {checking ? 'Checking...' : 'Check again'}
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
