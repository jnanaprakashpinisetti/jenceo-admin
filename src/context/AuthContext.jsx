import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
} from "firebase/auth";

import { db } from "../firebase";

/* ============ Helpers ============ */

const norm = (s) => (s || "").trim().toLowerCase();

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

async function safeRead(path) {
  try {
    const snap = await db.ref(path).once("value");
    return snap.exists() ? snap.val() : null;
  } catch (e) {
    console.error(`Database read error for path ${path}:`, e.message);
    return null;
  }
}

// deep, case-insensitive scan for email somewhere in the object
function deepFindEmail(node, email) {
  const target = norm(email);
  const scan = (v) => {
    if (!v) return false;
    if (typeof v === "string") return v.includes("@") && norm(v) === target;
    if (Array.isArray(v)) return v.some(scan);
    if (typeof v === "object") return Object.values(v).some(scan);
    return false;
  };
  return scan(node);
}

/* ============ Constants (email store) ============ */
const EMAIL_BASE = "authentication/users";
const EMAIL_FIELDS = ["email", "Email", "userEmail", "emailId"];

/* ============ Context ============ */

const AuthContext = createContext({
  user: null,
  login: async () => { },
  logout: async () => { },
  loading: false,
  currentUser: null,
  userRole: null,
  debugDatabase: async () => { },
});

// Add this normalization function at the top level
const normalizePermissions = (perms) => {
  if (!perms || typeof perms !== 'object') return {};
  
  // Ensure all permissions are proper objects
  const normalized = {};
  Object.keys(perms).forEach(key => {
    if (typeof perms[key] === 'boolean') {
      normalized[key] = { view: perms[key], read: perms[key] };
    } else if (typeof perms[key] === 'object') {
      normalized[key] = { ...perms[key] };
    }
  });
  
  return normalized;
};

export function AuthProvider({ children }) {
  const auth = getAuth();
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("app_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Debug function to check database contents
  const debugDatabase = async () => {
    console.log("=== DATABASE DEBUG ===");

    const pathsToCheck = [
      "JenCeo-DataBase/Users",
      "Users",
      "authentication/Users",
      "jenceo-admin/Users",
      "authentication/users",
      "jenceo-admin/authentication/users"
    ];

    for (const path of pathsToCheck) {
      try {
        const data = await safeRead(path);
        console.log(`Path: ${path}`);
        if (data && typeof data === 'object') {
          console.log(`  Found ${Object.keys(data).length} entries`);
          Object.entries(data).forEach(([key, value]) => {
            console.log(`  - ${key}:`, {
              name: value?.name,
              username: value?.username,
              displayName: value?.displayName,
              email: value?.email,
              role: value?.role,
              hasPassword: !!(value?.password || value?.passwordHash || value?.pwd || value?.pwdHash)
            });
          });
        } else {
          console.log("  No data found or empty");
        }
      } catch (error) {
        console.log(`  Error reading ${path}:`, error.message);
      }
      console.log("---");
    }
  };

  // Pull role/permissions for an email from RTDB (authentication/users)
  const fetchEmailProfile = async (email) => {
    if (!email) return null;

    // Try exact child queries on common fields
    for (const f of EMAIL_FIELDS) {
      try {
        const qsnap = await db.ref(EMAIL_BASE).orderByChild(f).equalTo(email).once("value");
        if (qsnap.exists()) {
          const obj = qsnap.val() || {};
          const firstId = Object.keys(obj)[0];
          if (firstId) return obj[firstId];
        }
      } catch { }
    }

    // Fallback: read whole node and deep-match the email (handles nesting)
    const all = (await safeRead(EMAIL_BASE)) || {};
    for (const u of Object.values(all)) {
      const candidates = EMAIL_FIELDS.map((k) => (typeof u?.[k] === "string" ? norm(u[k]) : null)).filter(Boolean);
      if (candidates.includes(norm(email)) || deepFindEmail(u, email)) return u;
    }
    return null;
  };

  // React to Firebase Auth session changes (email mode)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setAuthLoading(true);
      try {
        if (!fbUser) {
          setUser(null);
          localStorage.removeItem("app_user");
          return;
        }

        // Read profile by UID first (works for anonymous username sessions)
        const profileByUid = await safeRead(`authentication/users/${fbUser.uid}`);

        // fallback: for email users, try to fetch by email if UID record not present
        let profile = profileByUid;
        if (!profile && fbUser.email) {
          profile = await fetchEmailProfile(fbUser.email);
        }

        const session = {
          uid: fbUser.uid,
          name: fbUser.displayName || profile?.name || (fbUser.email ? fbUser.email.split("@")[0] : "User"),
          email: fbUser.email || profile?.email || profile?.Email || null,
          role: profile?.role || "user",
          permissions: normalizePermissions(profile?.permissions),
          mode: fbUser.isAnonymous ? "username" : "email",
          emailVerified: fbUser.emailVerified ?? false,
          _source: fbUser.isAnonymous ? "anonymous_auth" : "firebase_auth",
        };

        setUser(session);
        localStorage.setItem("app_user", JSON.stringify(session));
      } finally {
        setAuthLoading(false);
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===== Username login: JenCeo-DataBase/Users ===== */
  const loginUsername = async (username, password) => {
    const uname = norm(username);
    const auth = getAuth();
  
    // 1) Ensure we have Firebase Auth session
    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        if (!/already/.test(String(e?.message || ""))) throw e;
      }
    }
    const uid = auth.currentUser.uid;
  
    // 2) FIRST: Try to find user by username directly in Users collection
    console.log("Searching for username:", uname);
    
    const usersSnap = await db.ref("JenCeo-DataBase/Users").once("value");
    const usersMap = usersSnap.val() || {};
    
    console.log("Available users:", Object.keys(usersMap));
    
    // Find user by username (case insensitive)
    let userKey = null;
    let userData = null;
    
    for (const [key, user] of Object.entries(usersMap)) {
      const userUsername = norm(user?.username || user?.name || '');
      const userEmail = norm(user?.email || '');
      
      console.log(`Checking ${key}: username="${userUsername}", email="${userEmail}"`);
      
      if (userUsername === uname || userEmail === uname) {
        userKey = key;
        userData = user;
        break;
      }
    }
  
    if (!userData) {
      // 3) SECOND: Try UserIndex approach if direct search fails
      console.log("Trying UserIndex approach...");
      try {
        const idxSnap = await db.ref(`JenCeo-DataBase/UserIndex/${uid}/key`).once("value");
        const key = idxSnap.val();
        
        if (key) {
          userKey = key;
          const userSnap = await db.ref(`JenCeo-DataBase/Users/${key}`).once("value");
          userData = userSnap.val();
        }
      } catch (error) {
        console.log("UserIndex approach failed:", error.message);
      }
    }
  
    // 4) If still no user found
    if (!userData) {
      throw new Error("User not found. Please check your username.");
    }
  
    console.log("Found user data:", userData);
  
    // 5) Check if account is active
    if (userData.active === false || userData.disabled === true) {
      throw new Error("Account is inactive");
    }
  
    // 6) Verify password
    const storedHash = userData.passwordHash || userData.pwdHash || null;
    const storedPlain = userData.password || userData.pwd || null;
    const incomingHash = await sha256Base64(password);
    
    console.log("Password check:", { storedHash: !!storedHash, storedPlain: !!storedPlain });
    
    const ok =
      (storedHash && storedHash === incomingHash) ||
      (storedPlain && storedPlain === password);
    
    if (!ok) throw new Error("Invalid password");
  
    // 7) Create or update profile in authentication
    const profileRef = db.ref(`authentication/users/${uid}`);

    const profile = {
      name: userData.name || userData.username || username,
      role: userData.role || "user",
      permissions: normalizePermissions(userData.permissions || {}),
      mode: "username",
      usernameLinked: userKey,
      email: userData.email || null,
      lastLogin: new Date().toISOString()
    };
    
    await profileRef.update(profile);

  
    // 8) Create session
    const session = {
      uid,
      name: profile.name,
      email: userData.email || null,
      role: profile.role,
      permissions: profile.permissions,
      mode: "username",
      _source: "jenCeo_database",
    };
  
    setUser(session);
    localStorage.setItem("app_user", JSON.stringify(session));
    return session;
  };

  /* ===== Email login: Firebase Auth + RTDB permissions ===== */
  const loginEmail = async (email, password) => {
    console.log("Attempting email login for:", email);

    // Sign into Firebase Auth first
    const cred = await signInWithEmailAndPassword(getAuth(), email, password);
    const fbUser = cred.user;
    console.log("Firebase auth successful:", fbUser.email);

    // Immediately merge with RTDB profile so LeftNav/PermissionRoute know what to show
    const profile = await fetchEmailProfile(fbUser.email);
    console.log("Fetched profile:", profile);

    const session = {
      uid: fbUser.uid,
      name: fbUser.displayName || profile?.name || fbUser.email?.split("@")[0] || "User",
      email: fbUser.email || profile?.email || profile?.Email || null,
      role: profile?.role || "user",
      permissions: normalizePermissions(profile?.permissions),
      mode: "email",
      emailVerified: fbUser.emailVerified,
      _source: "firebase_auth",
    };

    console.log("Creating email session:", session);
    setUser(session);
    localStorage.setItem("app_user", JSON.stringify(session));
    return session;
  };

  /* ===== Single entry: accepts email or username ===== */
  const login = async (identifier, password) => {
    if (!identifier || !password) throw new Error("Please enter credentials");
    setLoading(true);
    try {
      console.log("Login attempt with identifier:", identifier);

      if (identifier.includes("@")) {
        return await loginEmail(identifier.trim(), password);
      } else {
        return await loginUsername(identifier.trim(), password);
      }
    } catch (error) {
      console.error("Login error details:", error);

      // nicer Firebase errors
      if (error?.code) {
        const map = {
          "auth/invalid-email": "Invalid email address",
          "auth/user-disabled": "This account has been disabled",
          "auth/user-not-found": "No account found with this email",
          "auth/wrong-password": "Incorrect password",
          "auth/too-many-requests": "Too many failed attempts. Try again later",
        };
        throw new Error(map[error.code] || error.message || "Login failed");
      }

      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(getAuth());
    } finally {
      setUser(null);
      localStorage.removeItem("app_user");
    }
  };

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      loading: loading || authLoading,
      currentUser: user,
      userRole: user?.role || null,
      setUser,
      debugDatabase,
    }),
    [user, loading, authLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

const debugUserDatabase = async () => {
  console.log("=== USER DATABASE DEBUG ===");
  
  const paths = [
    "JenCeo-DataBase/Users",
    "JenCeo-DataBase/UserIndex", 
    "Users",
    "UserIndex",
    "authentication/users"
  ];
  
  for (const path of paths) {
    try {
      const data = await safeRead(path);
      console.log(`📁 ${path}:`, data);
      
      if (data && typeof data === 'object') {
        console.log(`   Found ${Object.keys(data).length} entries`);
        // Show first few entries for inspection
        Object.entries(data).slice(0, 3).forEach(([key, value]) => {
          console.log(`   🔑 ${key}:`, {
            username: value?.username,
            name: value?.name,
            email: value?.email,
            hasPassword: !!(value?.password || value?.passwordHash),
            role: value?.role
          });
        });
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
};