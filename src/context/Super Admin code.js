
    // Current signed-in admin (from your AuthContext)
    const { user: authUser } = useAuth() || {};

    // Consider someone super admin if role === 'superadmin',
    // OR if you keep a root admin flag via permissions.
    const isSuperAdmin =
        String(authUser?.role || "").toLowerCase() === "superadmin" ||
        authUser?.isSuperAdmin === true ||
        authUser?.permissions?.canManageAll === true;

    // Toggle that a super admin can flip to enable editing sensitive fields
    const [superAdminUnlock, setSuperAdminUnlock] = React.useState(false);

    // These locks are true unless a super admin flips the switch
    const lockBasic = isEditMode && (!isSuperAdmin || !superAdminUnlock);
    const lockJob = isEditMode && (!isSuperAdmin || !superAdminUnlock);
