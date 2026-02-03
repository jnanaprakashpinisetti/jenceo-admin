import { useEffect, useState } from "react";
import { getRef, isFn } from "./utils/firebaseHelpers";

export const useUsers = () => {
  const [users, setUsers] = useState({});

  useEffect(() => {
    const backendOK = true;
    if (!backendOK) return;

    const REF_PATHS = [
      "Users", 
      "JenCeo/Users",
    ];
    const priority = new Map(REF_PATHS.map((p, i) => [p, i]));

    const isSystemRow = (key, u) => {
      const k = String(key || "").toLowerCase();
      const name = String(u?.name || "").toLowerCase();
      const role = String(u?.role || "").toLowerCase();

      if (k.startsWith("_")) return true;
      if (role.includes("service") || role.includes("system")) return true;
      if (name === "system administrator") return true;
      return false;
    };

    const accumById = {};
    const mergeUser = (path, key, raw) => {
      const user = {
        id: raw?.uid || raw?.id || key,
        name: (raw?.name || raw?.displayName || raw?.username || key || "").trim(),
        role: String(raw?.role || raw?.userRole || "user").toLowerCase(),
        photoURL: raw?.photoURL || raw?.avatar || "",
        _prio: priority.get(path) ?? 999,
      };
      if (!user.name) user.name = user.id;

      if (isSystemRow(key, user)) return;

      const existing = accumById[user.id];
      if (!existing) {
        accumById[user.id] = user;
      } else {
        const better = (user.photoURL && !existing.photoURL) || user._prio < existing._prio
          ? user
          : existing;
        accumById[user.id] = better;
      }
    };

    const pushToState = () => {
      const byDisplay = {};
      Object.values(accumById).forEach((u) => {
        const sig = (u.name + "|" + u.role).toLowerCase();
        if (!byDisplay[sig] || (u.photoURL && !byDisplay[sig].photoURL)) {
          byDisplay[sig] = u;
        }
      });

      const finalMap = {};
      Object.values(byDisplay).forEach((u) => {
        finalMap[u.id] = { name: u.name, role: u.role, photoURL: u.photoURL };
      });

      setUsers(finalMap);
    };

    const unsubs = [];
    REF_PATHS.forEach((path) => {
      const ref = getRef(path);
      if (!ref) return;
      const cb = (snap) => {
        const obj = (snap?.val && snap.val()) || snap?.val || {};
        Object.entries(obj || {}).forEach(([k, v]) => mergeUser(path, k, v));
        pushToState();
      };
      try {
        if (isFn(ref.on)) {
          ref.on("value", cb);
          unsubs.push(() => ref.off("value", cb));
        } else {
          ref.once?.("value", cb);
        }
      } catch { }
    });

    return () => unsubs.forEach((u) => u?.());
  }, []);

  return { users };
};