// LoginTracker/IPRestrictionMonitor.jsx
// Mount once INSIDE <AuthProvider>. It shows a message window only when someone is signed out. It:
//  1. signs the user out if their IP becomes blocked while logged in
//  2. signs the user out after N idle minutes (set in Security settings; all tabs share the timer)
//  3. signs the user out when an admin presses "Force logout"
//  4. sends a "still active" heartbeat so the dashboard can show who is online
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import firebaseDB from '../../firebase';
import { PATHS } from './dbPaths';
import { useIPAccess } from './IPGate';
import { useSecuritySettings } from './useAccessLists';
import { ConfirmModal } from './ConfirmDialog';
import { normalizeUser, touchUserActivity, logSecurityEvent } from './trackUserLogin';
import { sanitizeKey } from './ipUtils';

const SESSION_KEY = 'session_started_at';
const ACTIVITY_KEY = 'last_activity_at';
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
const REDIRECT_SECONDS = 10;

const ENDED = {
    ip_restricted: { title: 'Signed out', tone: 'danger', icon: 'bi-shield-lock-fill', message: 'Your IP address is no longer authorized to use this website.' },
    session_expired: { title: 'Session expired', tone: 'warning', icon: 'bi-clock-history', message: 'You were signed out because you were inactive for a while.' },
    forced_logout: { title: 'Signed out by administrator', tone: 'warning', icon: 'bi-person-x-fill', message: 'An administrator ended your session. Please sign in again.' },
};

const IPRestrictionMonitor = ({ idleMinutes, heartbeatSeconds = 120 }) => {
    const auth = useAuth() || {};
    const currentUser = auth.currentUser || auth.user; // your app uses both names in different files
    const logoutRef = useRef(auth.logout);
    logoutRef.current = auth.logout;

    const settings = useSecuritySettings();
    const idleLimit = idleMinutes !== undefined ? idleMinutes : settings.idleMinutes;

    const user = currentUser ? normalizeUser(currentUser) : null;
    const userId = user ? user.userId : null;
    const userKey = userId ? sanitizeKey(userId) : null;

    const { ready, access } = useIPAccess();
    const ending = useRef(false);
    const [ended, setEnded] = useState(null); // { key } while the "signed out" window is open
    const [seconds, setSeconds] = useState(REDIRECT_SECONDS);

    const goToLogin = useCallback((key) => {
        try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
        window.location.href = `/login?message=${key}`;
    }, []);

    const endSession = useCallback(async (reason, key) => {
        if (ending.current) return;
        ending.current = true;
        setSeconds(REDIRECT_SECONDS);
        setEnded({ key }); // show the window first, then sign out behind it
        try {
            await logSecurityEvent('SESSION_ENDED', 'LOW', { reason, userId });
            if (logoutRef.current) await logoutRef.current();
        } catch (e) {
            console.error('Logout failed:', e);
        }
    }, [userId]);

    // countdown, then go to the login page
    useEffect(() => {
        if (!ended) return undefined;
        const timer = setInterval(() => setSeconds((s) => s - 1), 1000);
        return () => clearInterval(timer);
    }, [ended]);
    useEffect(() => { if (ended && seconds <= 0) goToLogin(ended.key); }, [ended, seconds, goToLogin]);

    // 1. IP became blocked
    useEffect(() => {
        if (userKey && ready && access && access.restricted) endSession('IP_RESTRICTED', 'ip_restricted');
    }, [userKey, ready, access, endSession]);

    // 2. Idle timeout (shared across tabs through localStorage)
    useEffect(() => {
        if (!userKey || !idleLimit) return undefined;
        let lastWrite = 0;
        const mark = () => {
            const t = Date.now();
            if (t - lastWrite < 5000) return;
            lastWrite = t;
            try { localStorage.setItem(ACTIVITY_KEY, String(t)); } catch { /* ignore */ }
        };
        mark();
        ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, mark, { passive: true }));
        const timer = setInterval(() => {
            let last = Date.now();
            try { last = Number(localStorage.getItem(ACTIVITY_KEY)) || last; } catch { /* ignore */ }
            if (Date.now() - last > idleLimit * 60000) endSession('IDLE_TIMEOUT', 'session_expired');
        }, 15000);
        return () => {
            clearInterval(timer);
            ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, mark));
        };
    }, [userKey, idleLimit, endSession]);

    // 3. Admin "Force logout"
    useEffect(() => {
        if (!userKey) return undefined;
        let started = 0;
        try { started = Number(localStorage.getItem(SESSION_KEY)) || 0; } catch { /* ignore */ }
        if (!started) {
            started = Date.now(); // session from before this feature existed: ignore older force-logouts
            try { localStorage.setItem(SESSION_KEY, String(started)); } catch { /* ignore */ }
        }
        const ref = firebaseDB.child(`${PATHS.userProfiles}/${userKey}/forceLogoutAt`);
        const cb = ref.on('value', (snap) => {
            const at = Number(snap.val() || 0);
            let s = started;
            try { s = Number(localStorage.getItem(SESSION_KEY)) || started; } catch { /* ignore */ }
            if (at && at > s) endSession('FORCE_LOGOUT', 'forced_logout');
        });
        return () => ref.off('value', cb);
    }, [userKey, endSession]);

    // 4. Heartbeat
    useEffect(() => {
        if (!userId) return undefined;
        const beat = () => { if (document.visibilityState === 'visible') touchUserActivity(userId); };
        beat();
        const timer = setInterval(beat, heartbeatSeconds * 1000);
        return () => clearInterval(timer);
    }, [userId, heartbeatSeconds]);

    if (!ended) return null;
    const info = ENDED[ended.key] || ENDED.session_expired;
    return (
        <ConfirmModal
            title={info.title}
            tone={info.tone}
            icon={info.icon}
            message={`${info.message}\n\nGoing to the sign-in page in ${Math.max(0, seconds)}s.`}
            confirmText="Go to sign in"
            hideCancel
            onConfirm={() => goToLogin(ended.key)}
            onCancel={() => goToLogin(ended.key)}
        />
    );
};

export default IPRestrictionMonitor;
