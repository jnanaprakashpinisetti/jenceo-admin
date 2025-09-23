// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          // Try common user nodes for role
          const snap = await db.ref(`Users/${user.uid}`).once("value");
          let data = snap && snap.val();
          if (!data) {
            const snap2 = await db.ref(`users/${user.uid}`).once("value");
            data = snap2 && snap2.val();
          }
          const role = data?.role || data?.type || "user";
          setUserRole(role);
        } catch (e) {
          console.error("Failed to load user role:", e);
          setUserRole("user");
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function login(email, password) {
    // try firebase auth
    return auth.signInWithEmailAndPassword(email, password);
  }

  async function logout() {
    try {
      await auth.signOut();
    } catch (e) {
      console.warn("Logout fallback:", e);
    }
    setCurrentUser(null);
    setUserRole(null);
  }

  const value = {
    currentUser,
    userRole,
    login,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
