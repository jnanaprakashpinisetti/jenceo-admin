import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { db } from "../firebase";

const AuthContext = createContext({
  user: null,
  login: async () => {},
  logout: () => {},
  loading: false,
});

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
  const [authLoading, setAuthLoading] = useState(true);
  const auth = getAuth();

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthLoading(true);
      if (firebaseUser) {
        try {
          // Get additional user data from database
          const userData = await getUserDataFromDatabase(firebaseUser.uid);
          
          const session = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || userData?.name || firebaseUser.email?.split('@')[0] || 'User',
            email: firebaseUser.email,
            role: userData?.role || "user",
            permissions: userData?.permissions || {},
            emailVerified: firebaseUser.emailVerified,
          };
          setUser(session);
          localStorage.setItem("app_user", JSON.stringify(session));
        } catch (error) {
          console.error("Error fetching user data:", error);
          const session = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            email: firebaseUser.email,
            role: "user",
            permissions: {},
            emailVerified: firebaseUser.emailVerified,
          };
          setUser(session);
          localStorage.setItem("app_user", JSON.stringify(session));
        }
      } else {
        setUser(null);
        localStorage.removeItem("app_user");
      }
      setAuthLoading(false);
    });

    return unsubscribe;
  }, [auth]);

  // Helper to get additional user data from database
  const getUserDataFromDatabase = async (uid) => {
    try {
      const snap = await db.ref(`JenCeo-DataBase/Users/${uid}`).once("value");
      if (snap.exists()) {
        return snap.val();
      }
      return null;
    } catch (error) {
      console.error("Error getting user data from database:", error);
      return null;
    }
  };

  // Unified login function
  const login = async (identifier, password) => {
    if (!identifier || !password) throw new Error("Please enter username/email and password");
    setLoading(true);
    
    try {
      // First try Firebase Authentication (email login)
      if (identifier.includes("@")) {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, identifier, password);
          const firebaseUser = userCredential.user;
          const userData = await getUserDataFromDatabase(firebaseUser.uid);

          const session = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || userData?.name || firebaseUser.email?.split('@')[0] || 'User',
            email: firebaseUser.email,
            role: userData?.role || "user",
            permissions: userData?.permissions || {},
            emailVerified: firebaseUser.emailVerified,
          };
          
          setUser(session);
          localStorage.setItem("app_user", JSON.stringify(session));
          return session;
        } catch (firebaseError) {
          // If Firebase auth fails, continue to username login
          console.log("Firebase auth failed, trying username login:", firebaseError.message);
        }
      }

      // Username login (JenCeo-DataBase/Users)
      const usersRef = db.ref("JenCeo-DataBase/Users");
      const snapshot = await usersRef.once("value");
      const usersMap = snapshot.val() || {};

      const usersList = Object.keys(usersMap).map((id) => ({
        id,
        ...usersMap[id]
      }));

      // Find user by username, name, or displayName (case-insensitive)
      const norm = (s) => (s || "").trim().toLowerCase();
      const me = usersList.find((user) => {
        const userIdentifier = norm(user.name || user.username || user.displayName);
        const inputIdentifier = norm(identifier);
        return userIdentifier === inputIdentifier;
      });

      if (!me) throw new Error("User not found");
      
      if (me.active === false || me.disabled === true) {
        throw new Error("Account is inactive");
      }

      // Password check
      const storedHash = me.passwordHash || me.pwdHash || null;
      const storedPlain = me.password || me.pwd || null;

      let passwordValid = false;

      if (storedHash) {
        // Compare hashed passwords
        const incomingHash = await sha256Base64(password);
        passwordValid = storedHash === incomingHash;
      } else if (storedPlain) {
        // Compare plain text passwords
        passwordValid = storedPlain === password;
      } else {
        throw new Error("Invalid password configuration");
      }

      if (!passwordValid) {
        throw new Error("Invalid password");
      }

      // Create user session
      const session = {
        uid: me.id,
        name: me.name || me.username || me.displayName || identifier,
        email: me.email || null,
        role: me.role || "user",
        permissions: me.permissions || {},
      };

      setUser(session);
      localStorage.setItem("app_user", JSON.stringify(session));
      return session;

    } catch (error) {
      console.error("Login error:", error);
      
      // User-friendly error messages
      if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address');
      } else if (error.code === 'auth/user-disabled') {
        throw new Error('This account has been disabled');
      } else if (error.code === 'auth/user-not-found') {
        throw new Error('No account found');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Please try again later');
      } else {
        throw new Error(error.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      localStorage.removeItem("app_user");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      currentUser: user,
      userRole: user?.role || null,
      loading: loading || authLoading,
    }),
    [user, loading, authLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Helper function for password hashing
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

export function useAuth() {
  return useContext(AuthContext);
}