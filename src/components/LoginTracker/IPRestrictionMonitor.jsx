// LoginTracker/IPRestrictionMonitor.jsx
// Mount once INSIDE <AuthProvider>. It does not render anything. It:
//  1. signs the user out if their IP becomes blocked while logged in
//  2. signs the user out after N minutes of inactivity (all tabs share the timer)
//  3. signs the user out when an admin presses "Force logout"
//  4. sends a "still active" heartbeat so the dashboard can show who is online
import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import firebaseDB from '../../firebase';
import { useIPAccess } from './IPGate';
import { normalizeUser, touchUserActivity, logSecurityEvent } from './trackUserLogin';
import { sanitizeKey } from './ipUtils';

const SESSION_KEY = 'session_started_at';
const ACTIVITY_KEY = 'last_activity_at';
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

const IPRestrictionMonitor = ({ idleMinutes = 30, heartbeatSeconds = 120 }) => {
    const auth = useAuth() || {};
    const currentUser = auth.currentUser || auth.user; // your app uses both names in different files
    const logoutRef = useRef(auth.logout);
    logoutRef.current = auth.logout;

    const user = currentUser ? normalizeUser(currentUser) : null;
    const userId = user ? user.userId : null;
    const userKey = userId ? sanitizeKey(userId) : null;

    const { ready, access } = useIPAccess();
    const ending = useRef(false);

    const endSession = useCallback(async (reason, message) => {
        if (ending.current) return;
        ending.current = true;
        try {
            await logSecurityEvent('SESSION_ENDED', 'LOW', { reason, userId });
            if (logoutRef.current) await logoutRef.current();
        } catch (e) {
            console.error('Logout failed:', e);
        } finally {
            try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
            window.location.href = `/login?message=${message}`;
        }
    }, [userId]);

    // 1. IP became blocked
    useEffect(() => {
        if (userKey && ready && access && access.restricted) endSession('IP_RESTRICTED', 'ip_restricted');
    }, [userKey, ready, access, endSession]);

    // 2. Idle timeout (shared across tabs through localStorage)
    useEffect(() => {
        if (!userKey || !idleMinutes) return undefined;
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
            if (Date.now() - last > idleMinutes * 60000) endSession('IDLE_TIMEOUT', 'session_expired');
        }, 15000);
        return () => {
            clearInterval(timer);
            ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, mark));
        };
    }, [userKey, idleMinutes, endSession]);

    // 3. Admin "Force logout"
    useEffect(() => {
        if (!userKey) return undefined;
        let started = 0;
        try { started = Number(localStorage.getItem(SESSION_KEY)) || 0; } catch { /* ignore */ }
        if (!started) {
            started = Date.now(); // session from before this feature existed: ignore older force-logouts
            try { localStorage.setItem(SESSION_KEY, String(started)); } catch { /* ignore */ }
        }
        const ref = firebaseDB.child(`UserProfiles/${userKey}/forceLogoutAt`);
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

    return null;
};

export default IPRestrictionMonitor;
