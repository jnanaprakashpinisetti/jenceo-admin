// src/utils/perm.js
export const hasPerm = (user, component, action = "view") => {
  const perms = user?.permissions || {};
  const p = perms[component];
  return !!(p && p[action]);
};
