// LoginTracker/UserAvatar.jsx
// Photo (or initials), name, email and Admin / User / Guest badge — used across the dashboard.
import React, { useState } from 'react';

const COLORS = ['#6f42c1', '#0d6efd', '#198754', '#fd7e14', '#d63384', '#20c997', '#0aa2c0', '#dc3545'];
const colorFor = (s = '') => COLORS[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];

export const initials = (name = '') => {
    const parts = String(name).replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
    return ((parts[0] || '?')[0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
};

export const TYPE_STYLES = {
    superadmin: { cls: 'bg-danger', label: 'Super Admin', icon: 'bi-shield-fill-check' },
    admin: { cls: 'bg-warning text-dark', label: 'Admin', icon: 'bi-shield-lock' },
    manager: { cls: 'bg-info text-dark', label: 'Manager', icon: 'bi-briefcase' },
    employee: { cls: 'bg-primary', label: 'Employee', icon: 'bi-person-badge' },
    guest: { cls: 'bg-dark border border-secondary', label: 'Guest', icon: 'bi-person-dash' },
    viewer: { cls: 'bg-secondary', label: 'Viewer', icon: 'bi-eye' },
    approver: { cls: 'bg-success', label: 'Approver', icon: 'bi-check2-circle' },
};

export const deviceIcon = (kind = '') =>
    ({ Mobile: 'bi-phone', Tablet: 'bi-tablet', Desktop: 'bi-pc-display' }[kind] || 'bi-question-circle');

export const TypeBadge = ({ type }) => {
    const s = TYPE_STYLES[type] || TYPE_STYLES.employee;
    return (
        <span className={`badge ${s.cls}`}>
            <i className={`bi ${s.icon} me-1`} />
            {s.label}
        </span>
    );
};

// Only http(s) and image data URLs are used as photos
const safePhoto = (p) => (/^(https?:\/\/|data:image\/)/i.test(String(p || '')) ? p : '');

const UserAvatar = ({ name, photo, size = 36 }) => {
    const [broken, setBroken] = useState(false);
    const src = safePhoto(photo);
    const box = { width: size, height: size, borderRadius: '50%', flex: '0 0 auto' };
    if (src && !broken) {
        return <img src={src} alt={name || 'user'} referrerPolicy="no-referrer" onError={() => setBroken(true)} style={{ ...box, objectFit: 'cover' }} />;
    }
    return (
        <div
            style={{ ...box, background: colorFor(name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 600 }}
            aria-label={name}
        >
            {initials(name)}
        </div>
    );
};

export const UserCell = ({ name, email, photo, type, size = 36, showEmail = true }) => (
    <div className="d-flex align-items-center gap-2">
        <UserAvatar name={name} photo={photo} size={size} />
        <div style={{ minWidth: 0 }}>
            <div className="d-flex align-items-center gap-2">
                <strong className="text-info text-truncate" style={{ maxWidth: 180 }}>{name || 'Unknown User'}</strong>
                {type && <TypeBadge type={type} />}
            </div>
            {showEmail && email && <small className="text-muted d-block text-truncate" style={{ maxWidth: 220 }}>{email}</small>}
        </div>
    </div>
);

export default UserAvatar;
