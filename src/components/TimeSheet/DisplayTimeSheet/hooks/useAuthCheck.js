// Timesheet/DisplayTimeSheet/hooks/useAuthCheck.js
import { useAuth } from "../../../../context/AuthContext";
import { useTimesheet } from '../context/TimesheetContext';
import { norm } from '../utils/timesheetHelpers';

export const useAuthCheck = () => {
  const authContext = useAuth();
  const { currentUser, allUsers } = useTimesheet();

  const whoSafe = () => {
    if (authContext?.user?.uid) {
      const user = authContext.user;
      return {
        uid: user.uid,
        name: user.displayName || user.name || user.email || 'Admin',
        email: user.email || '',
        role: user.role || 'user'
      };
    }

    if (currentUser?.uid) {
      return {
        uid: currentUser.uid,
        name: currentUser.displayName || currentUser.name || currentUser.email || 'Admin',
        email: currentUser.email || '',
        role: currentUser.role || 'user'
      };
    }

    try {
      const stored = JSON.parse(localStorage.getItem("currentUser") || "null");
      if (stored?.uid) {
        return {
          uid: stored.uid,
          name: stored.displayName || stored.name || stored.email || 'Admin',
          email: stored.email || '',
          role: stored.role || 'user'
        };
      }
    } catch (e) {
      console.error('Error reading stored user:', e);
    }

    return { uid: "unknown", name: "Unknown User", email: "", role: "user" };
  };

  const currentUserIdSet = () => {
    const ids = new Set();
    const who = whoSafe();
    
    [who?.uid, authContext?.user?.uid, authContext?.user?.id, currentUser?.uid, currentUser?.id]
      .filter(Boolean)
      .forEach(v => ids.add(String(v)));

    [who?.email, authContext?.user?.email, currentUser?.email]
      .filter(Boolean)
      .forEach(v => ids.add(String(v)));

    [who?.name, who?.displayName, authContext?.user?.displayName, currentUser?.displayName]
      .filter(Boolean)
      .forEach(v => ids.add(String(v)));

    return ids;
  };

  const canUserEditTimesheet = (ts) => {
    if (!ts) return false;

    const status = (String(ts.status || '')).toLowerCase();
    const idSet = currentUserIdSet();
    const role = (authContext?.user?.role || '').toLowerCase();
    const isAdmin = role === 'admin' || role === 'superadmin' || role === 'super_admin';
    const isCreator = ts.createdBy && idSet.has(String(ts.createdBy));
    const isAssignee = ts.assignedTo && idSet.has(String(ts.assignedTo));

    if (status === 'rejected') {
      return Boolean(isCreator || isAdmin);
    }

    if (status === 'approved') {
      return false;
    }

    if (status === 'submitted' || status === 'assigned' || status === 'clarification') {
      return Boolean(isAssignee || isAdmin);
    }

    return Boolean(isCreator || isAdmin);
  };

  return {
    whoSafe,
    currentUserIdSet,
    canUserEditTimesheet,
  };
};