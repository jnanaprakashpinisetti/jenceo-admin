// Timesheet/DisplayTimeSheet/utils/statusHelpers.js
export const statusMeta = (s) => {
  const k = String(s || 'draft').toLowerCase();
  const map = {
    draft: { text: 'Draft', class: 'badge bg-secondary' },
    assigned: { text: 'Assigned', class: 'badge bg-info' },
    submitted: { text: 'Submitted', class: 'badge bg-primary' },
    clarification: { text: 'Clarification', class: 'badge bg-warning text-dark' },
    approved: { text: 'Approved', class: 'badge bg-success' },
    rejected: { text: 'Rejected', class: 'badge bg-danger' },
  };
  return map[k] || map.draft;
};

export const isSheetReadOnly = (ts, currentUserId, authContext) => {
  if (!ts) return false;
  const s = norm(ts.status);

  if (s === 'approved' || s === 'rejected') return true;

  if (isSubmittedLike(s)) {
    const isAssignedUser = ts.assignedTo && ts.assignedTo === currentUserId;
    const role = norm(authContext?.user?.role);
    const isAdmin = role === 'admin' || role === 'superadmin' || role === 'super_admin';
    return !(isAssignedUser || isAdmin);
  }

  const isCreator = ts.createdBy === currentUserId;
  const role = norm(authContext?.user?.role);
  const isAdmin = role === 'admin' || role === 'superadmin' || role === 'super_admin';
  return !(isCreator || isAdmin);
};