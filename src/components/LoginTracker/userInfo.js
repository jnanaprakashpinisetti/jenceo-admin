// LoginTracker/userInfo.js
// Turns whatever your login() returns into one clean shape: id, name, photo, type.

const ADMIN_WORDS = ['admin', 'administrator', 'superadmin', 'super admin', 'super_admin', 'owner', 'root'];
const GUEST_WORDS = ['guest', 'visitor', 'viewer', 'demo', 'readonly', 'read-only'];

const first = (...vals) => {
    for (const v of vals) {
        if (v === null || v === undefined || typeof v === 'object') continue;
        const s = String(v).trim();
        if (s) return s;
    }
    return '';
};

/** admin | user | guest */
export const resolveUserType = (u = {}) => {
    const raw = String(u.role ?? u.userType ?? u.type ?? u.accountType ?? u.userRole ?? '').trim().toLowerCase();
    if (u.isAdmin === true || u.admin === true || ADMIN_WORDS.includes(raw) || raw.includes('admin')) return 'admin';
    if (u.isGuest === true || GUEST_WORDS.includes(raw) || raw.includes('guest')) return 'guest';
    return 'user';
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
