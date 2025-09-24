// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebase"; // uses your current firebase exports

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

/**
 * AuthProvider
 * - currentUser: firebase auth user object
 * - currentUserRecord: user object read from /Users/{uid} (includes role, active, permissions)
 * - login(email,password), logout()
 * - createUser(payload) => calls Cloud Function (secure) to create a new user, returns created uid
 *
 * Important:
 * - createUser uses the Cloud Function endpoint (server-side) for secure admin creation.
 * - Put CREATE_USER_ENDPOINT into .env.local as REACT_APP_CREATE_USER_URL
 */
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null); // firebase auth user
  const [currentUserRecord, setCurrentUserRecord] = useState(null); // DB /Users/{uid}
  const [loading, setLoading] = useState(true);
  const [userRecordListener, setUserRecordListener] = useState(null);

  useEffect(() => {
    // Subscribe to auth state
    const unsubAuth = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      setLoading(true);

      // detach previous listener
      try {
        if (userRecordListener && typeof userRecordListener === "function") userRecordListener();
      } catch (e) {}

      if (!user) {
        setCurrentUserRecord(null);
        setLoading(false);
        return;
      }

      // Attach DB listener to /Users/{uid}
      try {
        const userRef = db.ref(`Users/${user.uid}`);
        const cb = userRef.on("value", (snap) => {
          const val = snap && typeof snap.val === "function" ? snap.val() : (snap || null);
          setCurrentUserRecord(val);
          setLoading(false);
        });
        // store off function to detach later
        setUserRecordListener(() => () => {
          try { userRef.off("value"); } catch (e) {}
        });
      } catch (e) {
        console.error("AuthProvider: db listener error", e);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      try {
        if (userRecordListener && typeof userRecordListener === "function") userRecordListener();
      } catch (e) {}
    };
  }, []); // run once

  // login
  async function login(email, password) {
    return auth.signInWithEmailAndPassword(email, password);
  }

  // logout
  async function logout() {
    try { await auth.signOut(); } catch (e) {}
    setCurrentUser(null);
    setCurrentUserRecord(null);
  }

  // create user via Cloud Function (secure)
  // payload: { email, password, name, role, templatePermissions (optional) }
  async function createUser(payload) {
    // Must be logged in as admin
    if (!currentUser) throw new Error("Not authenticated");
    const endpoint = process.env.REACT_APP_CREATE_USER_URL;
    if (!endpoint) throw new Error("CREATE_USER_URL not configured (REACT_APP_CREATE_USER_URL)");

    const token = await currentUser.getIdToken(true);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Create user failed: ${res.status} ${text}`);
    }
    const data = await res.json();
    return data;
  }

  const value = useMemo(() => ({
    currentUser,
    currentUserRecord,
    login,
    logout,
    createUser,
    loading,
  }), [currentUser, currentUserRecord, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
