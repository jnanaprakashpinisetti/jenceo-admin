// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getAuth, onAuthStateChanged, signInAnonymously, signOut } from "firebase/auth";
import firebaseDB from "../firebase";

// Utility functions
const normalizeText = (text) => (text ? String(text).trim().toLowerCase() : "");
const getCurrentTimestamp = () => new Date().toISOString();

// Password hashing utilities
async function generateSHA256Hash(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hashBuffer);
}

function convertToBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

async function generatePasswordHash(password) {
  const hashBytes = await generateSHA256Hash(password);
  return convertToBase64(hashBytes);
}

// Database operations
async function databaseGet(path) {
  try {
    const snapshot = await firebaseDB.child(path).get();
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error("Database read error:", path, error?.message || error);
    return null;
  }
}

async function databaseSet(path, data) {
  try {
    await firebaseDB.child(path).set(data);
    return true;
  } catch (error) {
    console.error("Database write error:", path, error?.message || error);
    return false;
  }
}

async function databaseUpdate(path, data) {
  try {
    await firebaseDB.child(path).update(data);
    return true;
  } catch (error) {
    console.error("Database update error:", path, error?.message || error);
    return false;
  }
}

// Permission management
const normalizePermissions = (permissions) => {
  if (!permissions || typeof permissions !== "object") return {};
  
  const normalized = {};
  Object.keys(permissions).forEach(key => {
    const value = permissions[key];
    if (typeof value === "boolean") {
      normalized[key] = { view: value, read: value };
    } else if (value && typeof value === "object") {
      normalized[key] = { ...value };
    }
  });
  
  return normalized;
};

// Default admin permissions configuration
const DEFAULT_ADMIN_PERMISSIONS = {
  "Dashboard": true,
  "Investments": true,
  "Task": true,
  "Accounts": true,
  "Admin": true,
  "Staff": true,
  "Staff Data": true,
  "Existing Staff": true,
  "Workers Data": true,
  "Existing Workers": true,
  "Worker Agreement": true,
  "Worker Call Data": true,
  "Worker Call Delete": true,
  "Client Data": true,
  "Client Exit": true,
  "Enquiries": true,
  "Enquiry Exit": true,
  "Hospital List": true,
  "Hospital Delete List": true,
  "Expenses": true,
  "Expence Delete": true
};

// Session management
function createUserSession(databaseId, userData, authUserId) {
  const displayName = userData?.name || userData?.username || "User";
  
  return {
    dbId: databaseId,
    uid: authUserId,
    username: userData?.username || "",
    name: displayName,
    email: userData?.email || "",
    role: userData?.role || "user",
    permissions: normalizePermissions(userData?.permissions || {}),
    photoURL: userData?.photoURL || userData?.profile?.photoURL || "",
    mode: "username",
    lastSync: getCurrentTimestamp(),
  };
}

// Context definition
const AuthContext = createContext({
  ready: false,
  user: null,
  loading: false,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
  setUser: () => {},
  createUser: async () => {},
  initializeDefaultAdmin: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export function AuthProvider({ children }) {
  const auth = getAuth();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  // User state persistence
  const cacheUser = (userData) => {
    setUser(userData);
    try {
      if (userData) {
        sessionStorage.setItem("auth:user", JSON.stringify(userData));
      } else {
        sessionStorage.removeItem("auth:user");
      }
    } catch (error) {
      console.warn("Session storage error:", error);
    }
  };

  // Authentication state initialization
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser ? "User logged in" : "No user");
      
      // Restore session from storage if available
      try {
        const storedUser = sessionStorage.getItem("auth:user");
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.warn("Failed to restore session:", error);
      }
      
      setReady(true);
      
      // Establish anonymous authentication if no user is logged in
      if (!firebaseUser) {
        signInAnonymously(auth).catch(console.error);
      }
    });

    return unsubscribe;
  }, [auth]);

  // User data refresh
  const refreshUser = async () => {
    if (!user?.dbId) return null;
    
    const userData = await databaseGet(`Users/${user.dbId}`);
    if (!userData) return null;
    
    const session = createUserSession(user.dbId, userData, user.uid);
    cacheUser(session);
    return session;
  };

  // Default admin initialization
  const initializeDefaultAdmin = async () => {
    try {
      console.log("🛠️ Checking for existing admin user...");
      
      const allUsers = await databaseGet("Users");
      let adminExists = false;
      let existingAdminId = null;
      
      if (allUsers) {
        for (const [userId, userData] of Object.entries(allUsers)) {
          if (userData?.username === "admin" || userData?.role === "admin") {
            adminExists = true;
            existingAdminId = userId;
            console.log("✅ Admin user already exists:", userId);
            break;
          }
        }
      }
      
      if (!adminExists) {
        console.log("🛠️ Creating default admin user...");
        const adminId = `admin_${Date.now()}`;
        const passwordHash = await generatePasswordHash("admin123");
        
        const adminUser = {
          username: "admin",
          name: "System Administrator",
          email: "admin@jenceo.com",
          role: "admin",
          permissions: DEFAULT_ADMIN_PERMISSIONS,
          passwordHash: passwordHash,
          createdAt: getCurrentTimestamp(),
          updatedAt: getCurrentTimestamp(),
          isActive: true
        };
        
        const success = await databaseSet(`Users/${adminId}`, adminUser);
        if (success) {
          console.log("✅ Default admin user created!");
          console.log("🔑 Username: admin");
          console.log("🔑 Password: admin123");
          console.log("🔑 User ID:", adminId);
          return { success: true, userId: adminId };
        } else {
          throw new Error("Failed to create admin user in database");
        }
      } else {
        console.log("ℹ️ Admin user already exists:", existingAdminId);
        return { success: true, userId: existingAdminId, exists: true };
      }
    } catch (error) {
      console.error("❌ Error initializing default admin:", error);
      return { success: false, error: error.message };
    }
  };

  // User creation
  const createUser = async (userData) => {
    try {
      const { username, email, name, role = "user", permissions = {}, password } = userData;
      
      console.log("🛠️ Creating user with data:", { 
        username, 
        email, 
        name, 
        role, 
        hasPassword: !!password 
      });
      
      // Input validation
      if (!username || !name || !password) {
        throw new Error("Username, name, and password are required");
      }
      
      // Check for existing username
      const allUsers = await databaseGet("Users");
      if (allUsers) {
        const usernameExists = Object.values(allUsers).some(
          existingUser => existingUser?.username === username
        );
        
        if (usernameExists) {
          throw new Error("Username already exists");
        }
      }
      
      // Generate unique user ID
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create password hash
      const passwordHash = await generatePasswordHash(password);
      
      const newUser = {
        username: username.trim(),
        email: email?.trim() || "",
        name: name.trim(),
        role,
        permissions: role === "admin" ? DEFAULT_ADMIN_PERMISSIONS : permissions,
        passwordHash,
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
        isActive: true
      };
      
      console.log("💾 Saving user to database:", userId, newUser);
      
      const success = await databaseSet(`Users/${userId}`, newUser);
      if (!success) {
        throw new Error("Failed to create user in database");
      }
      
      console.log("✅ User created successfully:", userId);
      return { success: true, userId };
    } catch (error) {
      console.error("🚨 USER CREATION ERROR:", error.message);
      throw error;
    }
  };

  // User authentication
  const login = async (identifier, password) => {
    const normalizedIdentifier = normalizeText(identifier);
    setLoading(true);
    
    try {
      // Ensure Firebase authentication
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      console.log("🔍 Searching for user:", identifier);

      // Retrieve all users from database
      const allUsers = await databaseGet("Users");
      
      if (!allUsers) {
        console.log("❌ No users found in database");
        throw new Error("User not found");
      }

      console.log("🔍 Total users in database:", Object.keys(allUsers).length);
      
      // Find matching user
      let userDatabaseId = null;
      let userData = null;
      
      for (const [databaseId, dbUser] of Object.entries(allUsers)) {
        const dbUsername = normalizeText(dbUser?.username);
        const dbName = normalizeText(dbUser?.name);
        const dbEmail = normalizeText(dbUser?.email);
        
        if (dbUsername === normalizedIdentifier || 
            dbName === normalizedIdentifier || 
            dbEmail === normalizedIdentifier) {
          userDatabaseId = databaseId;
          userData = dbUser;
          console.log("✅ Found user:", databaseId, "with username:", dbUser?.username);
          break;
        }
      }

      if (!userData) {
        console.log("❌ No matching user found for:", identifier);
        throw new Error("User not found");
      }

      // Password management
      let storedPasswordHash = userData.passwordHash;

      // Create password hash if none exists (first-time login)
      if (!storedPasswordHash) {
        console.log("⚠️ No password found. Creating authentication...");
        storedPasswordHash = await generatePasswordHash(password);
        
        await databaseUpdate(`Users/${userDatabaseId}`, {
          passwordHash: storedPasswordHash,
          updatedAt: getCurrentTimestamp()
        });
        
        console.log("✅ Password stored in user data");
      }

      // Password validation
      const enteredPasswordHash = await generatePasswordHash(password);
      
      console.log("=== 🔐 Password Verification ===");
      console.log("Stored hash:", storedPasswordHash);
      console.log("Entered hash:", enteredPasswordHash);

      if (storedPasswordHash !== enteredPasswordHash) {
        throw new Error("Invalid password");
      }

      // Successful login
      console.log("✅ Login successful!");
      const session = createUserSession(userDatabaseId, userData, auth.currentUser?.uid);
      cacheUser(session);

      // Update last login timestamp
      await databaseUpdate(`Users/${userDatabaseId}`, {
        lastLogin: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp()
      });
      
      return session;
    } catch (error) {
      console.error("🚨 Login error:", error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // User logout
  const logout = async () => {
    try { 
      await signOut(auth); 
      // Maintain Firebase connection with anonymous auth
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
    cacheUser(null);
  };

  // Context value
  const contextValue = useMemo(() => ({
    ready,
    user, 
    loading,
    login,
    logout,
    refreshUser,
    setUser: cacheUser,
    createUser,
    initializeDefaultAdmin
  }), [ready, user, loading]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}