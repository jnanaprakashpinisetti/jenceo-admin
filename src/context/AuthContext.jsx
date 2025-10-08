// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getAuth, onAuthStateChanged, signInAnonymously, signOut } from "firebase/auth";
import {firebaseDB} from "../firebase";
import { get, ref, set, remove, update } from "firebase/database";

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

async function databasePush(path, data) {
  try {
    const newRef = await firebaseDB.child(path).push(data);
    return newRef.key;
  } catch (error) {
    console.error("Database push error:", path, error?.message || error);
    return null;
  }
}

async function databaseRemove(path) {
  try {
    await firebaseDB.child(path).remove();
    return true;
  } catch (error) {
    console.error("Database remove error:", path, error?.message || error);
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

// ========== SECURITY FUNCTIONS ==========

// Session validation function
const validateUserSession = async (userDatabaseId) => {
  try {
    if (!userDatabaseId) return false;

    const userData = await databaseGet(`Users/${userDatabaseId}`);

    // Check if user exists and is active
    if (!userData) {
      console.log("❌ User not found in database");
      return false;
    }

    if (userData.isActive === false) {
      console.log("❌ User account is deactivated");
      return false;
    }

    return true;
  } catch (error) {
    console.error("Session validation error:", error);
    return false;
  }
};

// Enhanced logout function
const enhancedLogout = async (auth, preventReauth = false) => {
  try {
    // Sign out from Firebase Auth
    await signOut(auth);

    // Only re-establish anonymous auth if not prevented
    if (!preventReauth) {
      await signInAnonymously(auth);
      console.log("✅ User logged out successfully, anonymous auth maintained");
    } else {
      console.log("✅ User logged out successfully, no re-authentication");
    }
  } catch (error) {
    console.error("Logout error:", error);
  }
};

// Real-time session monitoring
const setupSessionMonitoring = (userDatabaseId, onInvalidSession, onPermissionsUpdate) => {
  if (!userDatabaseId) return () => { };

  // Listen for changes in user data
  const userRef = firebaseDB.child(`Users/${userDatabaseId}`);

  const onUserChange = userRef.on('value', (snapshot) => {
    if (!snapshot.exists()) {
      console.log("🚨 User deleted from database - forcing logout WITHOUT re-auth");
      onInvalidSession(true);
      return;
    }

    const userData = snapshot.val();

    // Check if user is deactivated
    if (userData.isActive === false) {
      console.log("🚨 User deactivated - forcing logout WITHOUT re-auth");
      onInvalidSession(true);
      return;
    }

    // Check for permission updates
    if (onPermissionsUpdate && userData.permissions) {
      console.log("🔄 User permissions updated - refreshing session");
      onPermissionsUpdate(userData);
    }
  });

  return () => userRef.off('value', onUserChange);
};

// Context definition
const AuthContext = createContext({
  ready: false,
  user: null,
  loading: false,
  login: async () => { },
  logout: async () => { },
  refreshUser: async () => { },
  setUser: () => { },
  createUser: async () => { },
  updateUser: async () => { },
  deleteUser: async () => { },
  getAllUsers: async () => { },
  initializeDefaultAdmin: async () => { },
  changePassword: async () => { },
  hasPermission: () => false,
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
  const [sessionMonitor, setSessionMonitor] = useState(null);

  // User state persistence
  const cacheUser = (userData) => {
    setUser(userData);

    // Clean up previous session monitor
    if (sessionMonitor && typeof sessionMonitor === 'function') {
      sessionMonitor();
    }

    try {
      if (userData) {
        sessionStorage.setItem("auth:user", JSON.stringify(userData));

        // Start monitoring this user's session
        const cleanupMonitor = setupSessionMonitoring(
          userData.dbId,
          (preventReauth) => {
            console.log("🛡️ Session invalidated - logging out", preventReauth ? "WITHOUT re-auth" : "");
            handleLogout(preventReauth);
          },
          (updatedUserData) => {
            console.log("🔄 Permissions updated - refreshing user session");
            handlePermissionsUpdate(updatedUserData);
          }
        );
        setSessionMonitor(() => cleanupMonitor);
      } else {
        sessionStorage.removeItem("auth:user");
        if (user?.dbId) {
          sessionStorage.removeItem(`avatar:${user.dbId}`);
        }
        setSessionMonitor(null);
      }
    } catch (error) {
      console.warn("Session storage error:", error);
    }
  };

  // Handle logout with cleanup
  const handleLogout = async (preventReauth = false) => {
    await enhancedLogout(auth, preventReauth);
    cacheUser(null);
  };

  // Handle permission updates
  const handlePermissionsUpdate = (updatedUserData) => {
    if (!user) return;

    const updatedSession = createUserSession(user.dbId, updatedUserData, user.uid);
    cacheUser(updatedSession);
    console.log("✅ User permissions updated in real-time");
  };

  // Enhanced authentication state initialization
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser ? "User logged in" : "No user");

      // Restore session from storage with validation
      try {
        const storedUser = sessionStorage.getItem("auth:user");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);

          // Validate the stored session
          const isValid = await validateUserSession(parsedUser.dbId);

          if (isValid) {
            setUser(parsedUser);
            console.log("✅ Valid session restored for user:", parsedUser.username);

            // Start monitoring this session
            const cleanupMonitor = setupSessionMonitoring(parsedUser.dbId, () => {
              console.log("🛡️ Session invalidated - logging out");
              handleLogout();
            });
            setSessionMonitor(() => cleanupMonitor);
          } else {
            console.log("❌ Invalid session - clearing storage");
            sessionStorage.removeItem("auth:user");
            sessionStorage.removeItem(`avatar:${parsedUser.dbId}`);
            setUser(null);
          }
        }
      } catch (error) {
        console.warn("Failed to restore session:", error);
        sessionStorage.removeItem("auth:user");
        if (user?.dbId) {
          sessionStorage.removeItem(`avatar:${user.dbId}`);
        }
      }

      setReady(true);

      // Establish anonymous authentication if no valid user is logged in
      if (!firebaseUser || !user) {
        signInAnonymously(auth).catch(console.error);
      }
    });

    return () => {
      unsubscribe();
      // Clean up session monitor on unmount
      if (sessionMonitor && typeof sessionMonitor === 'function') {
        sessionMonitor();
      }
    };
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

  // Permission checker
  const hasPermission = (permissionKey, action = "view") => {
    if (!user) return false;

    // Admin has all permissions
    if (user.role === "admin") return true;

    const userPermissions = user.permissions || {};
    const permission = userPermissions[permissionKey];

    if (!permission) return false;

    if (typeof permission === "boolean") {
      return permission;
    }

    if (typeof permission === "object") {
      return permission[action] === true;
    }

    return false;
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
        // Use Firebase push to generate proper key that matches existing structure
        const adminId = await databasePush("Users", {
          username: "admin",
          name: "System Administrator",
          email: "admin@jenceo.com",
          role: "admin",
          permissions: DEFAULT_ADMIN_PERMISSIONS,
          passwordHash: await generatePasswordHash("admin123"),
          createdAt: getCurrentTimestamp(),
          updatedAt: getCurrentTimestamp(),
          isActive: true
        });

        if (adminId) {
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

  // User creation - FIXED: Use databasePush to match existing structure
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

      // ✅ FIXED: Use databasePush to generate Firebase push key (like -Ob1V8s2B78uJpvAgYXe)
      const userId = await databasePush("Users", {
        username: username.trim(),
        email: email?.trim() || "",
        name: name.trim(),
        role,
        permissions: role === "admin" ? DEFAULT_ADMIN_PERMISSIONS : permissions,
        passwordHash: await generatePasswordHash(password),
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
        isActive: true
      });

      if (!userId) {
        throw new Error("Failed to create user in database");
      }

      console.log("✅ User created successfully with ID:", userId);
      return { success: true, userId };
    } catch (error) {
      console.error("🚨 USER CREATION ERROR:", error.message);
      throw error;
    }
  };

  // Update user
  const updateUser = async (userId, updates) => {
    try {
      if (!userId) {
        throw new Error("User ID is required");
      }

      const updateData = {
        ...updates,
        updatedAt: getCurrentTimestamp()
      };

      // Don't update password hash unless specifically provided
      if (updateData.password) {
        updateData.passwordHash = await generatePasswordHash(updateData.password);
        delete updateData.password;
      }

      const success = await databaseUpdate(`Users/${userId}`, updateData);

      if (!success) {
        throw new Error("Failed to update user in database");
      }

      // Refresh current user session if updating self
      if (user?.dbId === userId) {
        await refreshUser();
      }

      return { success: true };
    } catch (error) {
      console.error("🚨 USER UPDATE ERROR:", error.message);
      throw error;
    }
  };

  // Delete user - FIXED: Proper cleanup
  const deleteUser = async (userId) => {
    try {
      if (!userId) {
        throw new Error("User ID is required");
      }

      // Prevent self-deletion
      if (user?.dbId === userId) {
        throw new Error("Cannot delete your own account");
      }

      const success = await databaseRemove(`Users/${userId}`);
      
      if (!success) {
        throw new Error("Failed to delete user from database");
      }

      // Clean up avatar from session storage
      sessionStorage.removeItem(`avatar:${userId}`);

      console.log(`✅ User ${userId} deleted from database`);
      return { success: true };
    } catch (error) {
      console.error("🚨 USER DELETE ERROR:", error.message);
      throw error;
    }
  };

  // Get all users
  const getAllUsers = async () => {
    try {
      const users = await databaseGet("Users");
      return users || {};
    } catch (error) {
      console.error("🚨 GET ALL USERS ERROR:", error.message);
      throw error;
    }
  };

  // Change password
  const changePassword = async (userId, currentPassword, newPassword) => {
    try {
      if (!userId || !currentPassword || !newPassword) {
        throw new Error("All password fields are required");
      }

      // Verify current password
      const userData = await databaseGet(`Users/${userId}`);
      if (!userData) {
        throw new Error("User not found");
      }

      const currentPasswordHash = await generatePasswordHash(currentPassword);
      if (userData.passwordHash !== currentPasswordHash) {
        throw new Error("Current password is incorrect");
      }

      // Update to new password
      const newPasswordHash = await generatePasswordHash(newPassword);
      const success = await databaseUpdate(`Users/${userId}`, {
        passwordHash: newPasswordHash,
        updatedAt: getCurrentTimestamp()
      });

      if (!success) {
        throw new Error("Failed to update password");
      }

      return { success: true };
    } catch (error) {
      console.error("🚨 PASSWORD CHANGE ERROR:", error.message);
      throw error;
    }
  };

  // User authentication - FIXED: Handle both old and new user structures
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
      console.log("🔍 Available users:", Object.keys(allUsers).map(id => ({
        id,
        username: allUsers[id]?.username,
        name: allUsers[id]?.name,
        email: allUsers[id]?.email
      })));

      // Find matching user - FIXED: Better search with case-insensitive comparison
      let userDatabaseId = null;
      let userData = null;

      for (const [databaseId, dbUser] of Object.entries(allUsers)) {
        if (!dbUser) continue;

        const dbUsername = normalizeText(dbUser.username);
        const dbName = normalizeText(dbUser.name);
        const dbEmail = normalizeText(dbUser.email);

        console.log(`🔍 Checking user: ${databaseId}`, {
          username: dbUsername,
          name: dbName,
          email: dbEmail,
          target: normalizedIdentifier
        });

        if (dbUsername === normalizedIdentifier ||
          dbName === normalizedIdentifier ||
          dbEmail === normalizedIdentifier) {
          userDatabaseId = databaseId;
          userData = dbUser;
          console.log("✅ Found matching user:", databaseId, "with username:", dbUser.username);
          break;
        }
      }

      if (!userData) {
        console.log("❌ No matching user found for:", identifier);
        throw new Error("User not found");
      }

      // Check if user is active
      if (userData.isActive === false) {
        throw new Error("Account is deactivated");
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
      console.log("Match:", storedPasswordHash === enteredPasswordHash);

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
    await handleLogout();
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
    updateUser,
    deleteUser,
    getAllUsers,
    initializeDefaultAdmin,
    changePassword,
    hasPermission
  }), [ready, user, loading]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}