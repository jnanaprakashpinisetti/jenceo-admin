import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { db } from "../firebase"; // <-- IMPORTANT: match your existing imports

/* ========================= Helpers ========================= */

async function sha256Base64(text) {
  try {
    const enc = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest("SHA-256", enc);
    const bytes = new Uint8Array(hash);
    let bin = "";
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin);
  } catch {
    return btoa(unescape(encodeURIComponent(text)));
  }
}
const norm = (s) => (s || "").trim().toLowerCase();
const ILLEGAL = /[.#$\[\]]/g;
const isValidKey = (k) => typeof k === "string" && !ILLEGAL.test(k);

function emailKeyVariants(emailRaw) {
  const lower = norm(emailRaw);
  const variants = [
    lower,
    lower.replace(/\./g, ","),     // dot -> comma
    lower.replace(/\./g, "_"),     // dot -> underscore
    lower.replace(/\./g, "(dot)"), // dot -> (dot)
    lower.replace(/\./g, ""),      // remove dots
    lower.replace(/@/g, "(at)"),   // @ -> (at)
  ];
  return Array.from(new Set(variants)).filter(isValidKey);
}

async function read(path) {
  const snap = await db.ref(path).once("value");
  return snap.exists() ? snap.val() : null;
}

// read that swallows permission_denied and returns null
async function safeRead(path) {
  try {
    const snap = await db.ref(path).once("value");
    return snap.exists() ? snap.val() : null;
  } catch (e) {
    if (String(e?.message || e).includes("permission_denied")) return null;
    throw e;
  }
}

/** Deep scan for a case-insensitive email match anywhere inside the object. */
function deepFindEmail(node, targetEmail, path = "") {
  if (node == null) return null;
  if (typeof node === "string") {
    if (node.includes("@") && norm(node) === norm(targetEmail)) {
      return { matchedAt: path };
    }
    return null;
  }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const found = deepFindEmail(node[i], targetEmail, `${path}[${i}]`);
      if (found) return found;
    }
    return null;
  }
  if (typeof node === "object") {
    // fast path: common fields
    for (const key of ["email", "Email", "userEmail", "emailId", "username", "login"]) {
      const v = node[key];
      if (typeof v === "string" && norm(v) === norm(targetEmail)) {
        return { matchedAt: path ? `${path}.${key}` : key };
      }
    }
    // recursive
    for (const key of Object.keys(node)) {
      const found = deepFindEmail(node[key], targetEmail, path ? `${path}.${key}` : key);
      if (found) return found;
    }
  }
  return null;
}

/* ========================= Context ========================= */

const AuthContext = createContext({
  user: null,
  login: async () => {},
  loginEmail: async () => {},
  loginUsername: async () => {},
  logout: () => {},
  setUser: () => {},
  currentUser: null,
  userRole: null,
  loading: false,
});

const EMAIL_BASE = "jenceo-admin/authentication/users"; // <-- your real email path

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("app_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      if (user) localStorage.setItem("app_user", JSON.stringify(user));
      else localStorage.removeItem("app_user");
    } catch {}
  }, [user]);

  /* ---------- Username login (JenCeo-DataBase/Users) ---------- */
  const loginUsername = async (username, password) => {
    if (!username || !password) throw new Error("Please enter username and password");
    setLoading(true);
    try {
      const incomingHash = await sha256Base64(password);

      // requires Rules read on /JenCeo-DataBase/Users
      const map = (await read("JenCeo-DataBase/Users")) || {};
      const list = Object.keys(map).map((id) => ({ id, ...map[id] }));

      const me = list.find((u) => norm(u.name || u.username || u.displayName) === norm(username));
      if (!me) throw new Error("User not found");
      if (me.active === false || me.disabled === true) throw new Error("Account is inactive");
      if (!me.passwordHash) throw new Error("Invalid password");
      if (me.passwordHash !== incomingHash) throw new Error("Invalid password");

      const session = {
        uid: me.uid || me.id,
        name: me.name,
        email: me.email || null,
        role: me.role || "user",
        permissions: me.permissions || {},
        mode: "username",
      };
      setUser(session);
      return session;
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Email login (ONLY your known path; no extra probes) ---------- */
  const loginEmail = async (emailInput, password) => {
    if (!emailInput || !password) throw new Error("Please enter email and password");
    setLoading(true);
    try {
      const incomingHash = await sha256Base64(password);
      const EMAIL = emailInput;
      const EMAIL_LO = norm(emailInput);
      const emailFields = ["email", "Email", "userEmail", "emailId"];

      // 1) Safe read base
      const baseNode = (await safeRead(EMAIL_BASE)) || {};
      if (!baseNode || typeof baseNode !== "object" || !Object.keys(baseNode).length) {
        throw new Error("User not found");
      }

      let foundId = null;
      let foundUser = null;

      // 2) Try child queries on common fields (exact case)
      for (const field of emailFields) {
        try {
          const qsnap = await db
            .ref(EMAIL_BASE)
            .orderByChild(field)
            .equalTo(EMAIL)
            .once("value");
          if (qsnap.exists()) {
            const obj = qsnap.val() || {};
            const firstId = Object.keys(obj)[0];
            if (firstId) {
              foundId = firstId;
              foundUser = obj[firstId];
              break;
            }
          }
        } catch {
          // ignore permission/index issues; we'll deep scan below
        }
      }

      // 3) Deep scan (case-insensitive / nested)
      if (!foundUser) {
        for (const [id, u] of Object.entries(baseNode)) {
          const vals = emailFields
            .map((k) => (typeof u?.[k] === "string" ? norm(u[k]) : null))
            .filter(Boolean);
        if (vals.includes(EMAIL_LO)) {
            foundId = id;
            foundUser = u;
            break;
          }
          const hit = deepFindEmail(u, EMAIL);
          if (hit) {
            foundId = id;
            foundUser = u;
            break;
          }
        }
      }

      // 4) Key-based lookup with sanitized variants
      if (!foundUser) {
        for (const key of emailKeyVariants(EMAIL)) {
          const leaf = await safeRead(`${EMAIL_BASE}/${key}`);
          if (leaf) {
            foundId = key;
            foundUser = leaf;
            break;
          }
        }
      }

      if (!foundUser) throw new Error("User not found");
      if (foundUser.active === false || foundUser.disabled === true) throw new Error("Account is inactive");

      const storedHash = foundUser.passwordHash || foundUser.pwdHash || null;
      const storedPlain = foundUser.password || foundUser.pwd || null;
      const ok = (storedHash && storedHash === incomingHash) || (storedPlain && storedPlain === password);
      if (!ok) throw new Error("Invalid password");

      const session = {
        uid: foundUser.uid || foundId,
        name: foundUser.name || foundUser.displayName || foundUser.email || EMAIL,
        email: foundUser.email || foundUser.userEmail || foundUser.emailId || EMAIL,
        role: foundUser.role || "user",
        permissions: foundUser.permissions || {},
        mode: "email",
        _sourcePath: EMAIL_BASE,
      };
      setUser(session);
      return session;
    } finally {
      setLoading(false);
    }
  };

  // Auto for any legacy calls
  const login = (identifier, password) =>
    (identifier && identifier.includes("@") ? loginEmail(identifier, password) : loginUsername(identifier, password));

  const logout = () => setUser(null);

  const value = useMemo(
    () => ({
      user,
      login,
      loginEmail,
      loginUsername,
      logout,
      setUser,
      // legacy fields some components read:
      currentUser: user,
      userRole: user?.role || null,
      loading,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
