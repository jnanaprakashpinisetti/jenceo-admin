// LoginTracker/userInfo.js
// Turns whatever your login() returns into one clean shape: id, name, photo, type.

/** Dropdown order. `value` is what is stored, `label` is what people see. */
export const USER_TYPES = [
    { value: 'superadmin', label: 'Super Admin' },
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'employee', label: 'Employee' },
    { value: 'guest', label: 'Guest' },
    { value: 'viewer', label: 'Viewer' },
    { value: 'approver', label: 'Approver' },
];
export const USER_TYPE_VALUES = USER_TYPES.map((t) => t.value);
export const USER_TYPE_LABELS = Object.fromEntries(USER_TYPES.map((t) => [t.value, t.label]));
export const isAdminType = (type) => type === 'admin' || type === 'superadmin';

const first = (...vals) => {
    for (const v of vals) {
        if (v === null || v === undefined || typeof v === 'object') continue;
        const s = String(v).trim();
        if (s) return s;
    }
    return '';
};

/**
 * superadmin | admin | manager | employee | guest | viewer | approver
 * Reads role / userType / type, ignores spaces, dashes and case ("Super Admin" = "super_admin").
 * Anything unknown (including the old plain "user") becomes "employee".
 */
export const resolveUserType = (u = {}) => {
    const raw = String(u.role ?? u.userType ?? u.type ?? u.accountType ?? u.userRole ?? '')
        .toLowerCase().replace(/[\s_-]+/g, '');
    if (u.isSuperAdmin === true || raw === 'owner' || raw === 'root' || (raw.includes('super') && raw.includes('admin'))) return 'superadmin';
    if (u.isAdmin === true || u.admin === true || raw.includes('admin')) return 'admin';
    if (raw.includes('manager')) return 'manager';
    if (raw.includes('approver') || raw.includes('approval')) return 'approver';
    if (u.isGuest === true || raw.includes('guest') || raw.includes('visitor') || raw.includes('demo')) return 'guest';
    if (raw.includes('viewer') || raw.includes('readonly')) return 'viewer';
    return 'employee';
};

export const normalizeUser = (raw) => {
    let u = {};
    if (raw && typeof raw === 'object') {
        // Supports { user: {...} } (Firebase Auth style), { userData: {...} } or a flat object
        const inner = raw.user && typeof raw.user === 'object' ? raw.user : raw.userData && typeof raw.userData === 'object' ? raw.userData : null;
        u = inner ? { ...inner, ...(raw.profile && typeof raw.profile === 'object' ? raw.profile : {}) } : raw;
    }

    const email = first(u.email, u.mail, u.emailAddress).toLowerCase();
    const username = first(u.username, u.userName, u.loginId);
    const userId = first(u.uid, u.userId, u.id, u._id, u.key, email, username) || 'unknown';
    const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ');
    const name = first(u.displayName, u.name, u.fullName, fullName, username, email ? email.split('@')[0] : '') || 'Unknown User';

    let photo = first(u.photoURL, u.photoUrl, u.photo, u.avatar, u.avatarUrl, u.profilePic, u.profileImage, u.profilePicture, u.imageUrl, u.image);
    if (photo.startsWith('data:') && photo.length > 3000) photo = ''; // never store huge base64 blobs in logs

    return {
        userId,
        name,
        email,
        username,
        photo,
        userType: resolveUserType(u),
        roleRaw: first(u.role, u.userType, u.type, u.accountType),
    };
};
