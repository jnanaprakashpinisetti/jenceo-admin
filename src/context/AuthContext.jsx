// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getAuth, onAuthStateChanged, signInAnonymously, signOut } from "firebase/auth";
import { firebaseDB } from "../firebase";

// Utilities
const normalizeText = (text) => (text ? String(text).trim().toLowerCase() : "");
const getCurrentTimestamp = () => new Date().toISOString();

// Password hashing
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
    return null;
  }
}

async function databaseSet(path, data) {
  try {
    await firebaseDB.child(path).set(data);
    return true;
  } catch (error) {
    return false;
  }
}

async function databaseUpdate(path, data) {
  try {
    await firebaseDB.child(path).update(data);
    return true;
  } catch (error) {
    return false;
  }
}

async function databasePush(path, data) {
  try {
    // Safety guard: Do not allow creating half-empty Users
    if (String(path || "").startsWith("Users")) {
      const nameOk = !!data && typeof data.name === "string" && data.name.trim().length > 0;
      const usernameOk = !!data && typeof data.username === "string" && /^[A-Za-z0-9._-]{3,}$/.test(data.username);
      if (!nameOk || !usernameOk) {
        throw new Error("Invalid user payload: 'name' and 'username' are required");
      }
    }
    const newRef = await firebaseDB.child(path).push(data);
    return newRef.key;
  } catch (error) {
    return null;
  }
}


async function databaseRemove(path) {
  try {
    await firebaseDB.child(path).remove();
    return true;
  } catch (error) {
    return false;
  }
}

// Permission management
const normalizePermissions = (permissions) => {
  if (!permissions || typeof permissions !== "object") return {};

  const normalized = {};
  Object.keys(permissions).forEach((key) => {
    const value = permissions[key];
    if (typeof value === "boolean") {
      normalized[key] = { view: value, read: value };
    } else if (value && typeof value === "object") {
      normalized[key] = { ...value };
    }
  });
  return normalized;
};

// Default admin permissions
const DEFAULT_ADMIN_PERMISSIONS = {
  Dashboard: true,
  Investments: true,
  Task: true,
  Accounts: true,
  Admin: true,
  Staff: true,
  "Staff Data": true,
  "Existing Staff": true,
  "Workers Data": true,
  "Existing Workers": true,
  "Worker Agreement": true,
  "Worker Call Data": true,
  "Worker Call Delete": true,
  "Client Data": true,
  "Client Exit": true,
  Enquiries: true,
  "Enquiry Exit": true,
  "Hospital List": true,
  "Hospital Delete List": true,
  Expenses: true,
  "Expence Delete": true,
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
    sessionVersion: Number(userData?.requiredSessionVersion || 0),
  };
}

// Session validation
const validateUserSession = async (userDatabaseId) => {
  try {
    if (!userDatabaseId) return false;
    const userData = await databaseGet(`Users/${userDatabaseId}`);
    if (!userData) return false;
    if (userData.isActive === false) return false;
    return true;
  } catch (error) {
    return false;
  }
};

// Enhanced logout
const enhancedLogout = async (auth, preventReauth = false) => {
  try {
    await signOut(auth);
  } catch (error) {
    // Silent catch
  } finally {
    try {
      localStorage?.clear?.();
      sessionStorage?.clear?.();
    } catch {}
    if (!preventReauth) {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        // Silent catch
      }
    }
  }
};

// Real-time session monitoring
const setupSessionMonitoring = (userDatabaseId, onInvalidSession, onPermissionsUpdate, getCurrentSessionVersion) => {
  if (!userDatabaseId) return () => {};

  const userRef = firebaseDB.child(`Users/${userDatabaseId}`);
  const versionRef = firebaseDB.child(`Users/${userDatabaseId}/requiredSessionVersion`);

  const onUserChange = userRef.on("value", (snapshot) => {
    if (!snapshot.exists()) {
      onInvalidSession?.(true);
      return;
    }

    const val = snapshot.val();

    // Check user activation status
    const isActiveFlag = Object.prototype.hasOwnProperty.call(val || {}, "isActive") ? val.isActive : true;
    const activeFlag = Object.prototype.hasOwnProperty.call(val || {}, "active") ? val.active : true;
    const statusFlag = (val?.status || "").toLowerCase() !== "deactivated";

    if (isActiveFlag === false || activeFlag === false || !statusFlag) {
      onInvalidSession?.(true);
      return;
    }

    // Handle permission updates
    if (onPermissionsUpdate && val && typeof val === "object" && val.permissions) {
      onPermissionsUpdate(val);
    }
  });

  const onVersionChange = versionRef.on("value", (snapshot) => {
    const required = Number(snapshot.val() || 0);
    const current = Number(getCurrentSessionVersion?.() || 0);
    if (required > current) {
      onInvalidSession?.(true);
    }
  });

  return () => {
    userRef.off("value", onUserChange);
    versionRef.off("value", onVersionChange);
  };
};

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
  updateUser: async () => {},
  deleteUser: async () => {},
  getAllUsers: async () => {},
  initializeDefaultAdmin: async () => {},
  changePassword: async () => {},
  hasPermission: () => false,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

export function AuthProvider({ children }) {
  const auth = getAuth();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [sessionMonitor, setSessionMonitor] = useState(null);
  const sessionVersionRef = useRef(0);

  // Session version bump helper
  const bumpSessionVersion = async (userId) => {
    const current = Number((await databaseGet(`Users/${userId}/requiredSessionVersion`)) || 0);
    await databaseUpdate(`Users/${userId}`, { 
      requiredSessionVersion: current + 1, 
      updatedAt: getCurrentTimestamp() 
    });
  };

  // User state persistence
  const cacheUser = (userData) => {
    setUser(userData);

    // Clean up previous session monitor
    if (sessionMonitor && typeof sessionMonitor === "function") {
      sessionMonitor();
    }

    try {
      if (userData) {
        sessionVersionRef.current = Number(userData.sessionVersion || 0);
        sessionStorage.setItem("auth:user", JSON.stringify(userData));

        // Start monitoring this user's session
        const cleanupMonitor = setupSessionMonitoring(
          userData.dbId,
          (preventReauth) => handleLogout(preventReauth),
          (updatedUserData) => handlePermissionsUpdate(updatedUserData),
          () => sessionVersionRef.current
        );
        setSessionMonitor(() => cleanupMonitor);
      } else {
        sessionStorage.removeItem("auth:user");
        if (user?.dbId) sessionStorage.removeItem(`avatar:${user.dbId}`);
        setSessionMonitor(null);
      }
    } catch (error) {
      // Silent catch
    }
  };

  // Handle logout
  const handleLogout = async (preventReauth = false) => {
    try {
      if (auth.currentUser) {
        await databaseRemove(`authentication/users/${auth.currentUser.uid}`);
      }
    } catch (err) {
      // Silent catch
    }
    await enhancedLogout(auth, preventReauth);
    cacheUser(null);
  };

  // Handle permission updates
  const handlePermissionsUpdate = (updatedUserData) => {
    if (!user) return;
    
    const updatedSession = createUserSession(user.dbId, updatedUserData, user.uid);

    // Force logout on ANY permissions change
    const before = JSON.stringify(user.permissions || {});
    const after = JSON.stringify(updatedUserData.permissions || {});
    if (before !== after) {
      handleLogout(true);
      return;
    }

    // Update session version
    sessionVersionRef.current = Number(updatedSession.sessionVersion || 0);
    cacheUser(updatedSession);
  };

  // Authentication state management
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        const storedUser = sessionStorage.getItem("auth:user");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          const isValid = await validateUserSession(parsedUser.dbId);
          
          if (isValid) {
            setUser(parsedUser);
            sessionVersionRef.current = Number(parsedUser.sessionVersion || 0);
            
            const cleanupMonitor = setupSessionMonitoring(
              parsedUser.dbId,
              () => handleLogout(true),
              (updatedUserData) => handlePermissionsUpdate(updatedUserData),
              () => sessionVersionRef.current
            );
            setSessionMonitor(() => cleanupMonitor);
          } else {
            sessionStorage.removeItem("auth:user");
            if (parsedUser?.dbId) sessionStorage.removeItem(`avatar:${parsedUser.dbId}`);
            setUser(null);
          }
        }
      } catch (error) {
        sessionStorage.removeItem("auth:user");
        if (user?.dbId) sessionStorage.removeItem(`avatar:${user.dbId}`);
      }
      
      setReady(true);
      
      // Establish anonymous authentication if needed
      if (!firebaseUser || !user) {
        signInAnonymously(auth).catch(() => {});
      }
    });

    return () => {
      unsubscribe();
      if (sessionMonitor && typeof sessionMonitor === "function") sessionMonitor();
    };
  }, [auth]);

  // Refresh user data
  const refreshUser = async () => {
    if (!user?.dbId) return null;
    const userData = await databaseGet(`Users/${user.dbId}`);
    if (!userData) return null;
    const session = createUserSession(user.dbId, userData, user.uid);
    sessionVersionRef.current = Number(session.sessionVersion || 0);
    cacheUser(session);
    return session;
  };

  // Permission checker
  const hasPermission = (permissionKey, action = "view") => {
    if (!user) return false;
    if (user.role === "admin") return true;
    
    const userPermissions = user.permissions || {};
    const permission = userPermissions[permissionKey];
    
    if (!permission) return false;
    if (typeof permission === "boolean") return permission;
    if (typeof permission === "object") return permission[action] === true;
    
    return false;
  };

  // Initialize default admin
  const initializeDefaultAdmin = async () => {
    try {
      const allUsers = await databaseGet("Users");
      let adminExists = false;
      let existingAdminId = null;
      
      if (allUsers) {
        for (const [userId, userData] of Object.entries(allUsers)) {
          if (userData?.username === "admin" || userData?.role === "admin") {
            adminExists = true;
            existingAdminId = userId;
            break;
          }
        }
      }
      
      if (!adminExists) {
        const adminId = await databasePush("Users", {
          username: "admin",
          name: "System Administrator",
          email: "admin@jenceo.com",
          role: "admin",
          permissions: DEFAULT_ADMIN_PERMISSIONS,
          passwordHash: await generatePasswordHash("admin123"),
          createdAt: getCurrentTimestamp(),
          updatedAt: getCurrentTimestamp(),
          isActive: true,
          requiredSessionVersion: 0,
        });
        
        if (adminId) return { success: true, userId: adminId };
        throw new Error("Failed to create admin user in database");
      } else {
        return { success: true, userId: existingAdminId, exists: true };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Create user
  const createUser = async (userData) => {
    const { username, email, name, role = "user", permissions = {}, password } = userData || {};
    
    if (!username || !name || !password) {
      throw new Error("Username, name, and password are required");
    }
    
    const allUsers = await databaseGet("Users");
    if (allUsers) {
      const usernameExists = Object.values(allUsers).some((u) => u?.username === username);
      if (usernameExists) throw new Error("Username already exists");
    }
    
    const userId = await databasePush("Users", {
      username: username.trim(),
      email: email?.trim() || "",
      name: name.trim(),
      role,
      permissions: role === "admin" ? DEFAULT_ADMIN_PERMISSIONS : permissions,
      passwordHash: await generatePasswordHash(password),
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
      isActive: true,
      requiredSessionVersion: 0,
    });
    
    if (!userId) throw new Error("Failed to create user in database");
    return { success: true, userId };
  };

  // Update user
  const updateUser = async (userId, updates) => {
    try {
      if (!userId) throw new Error("User ID is required");
      
      const payload = { ...updates, updatedAt: getCurrentTimestamp() };
      
      if (payload.password) {
        payload.passwordHash = await generatePasswordHash(payload.password);
        delete payload.password;
      }
      
      const success = await databaseUpdate(`Users/${userId}`, payload);
      if (!success) throw new Error("Failed to update user in database");

      // Bump session version for sensitive changes
      const sensitiveChange = (
        Object.prototype.hasOwnProperty.call(updates, "permissions") ||
        Object.prototype.hasOwnProperty.call(updates, "isActive") ||
        Object.prototype.hasOwnProperty.call(payload, "passwordHash")
      );
      
      if (sensitiveChange) {
        await bumpSessionVersion(userId);
      }
      
      // Handle self-updates
      if (user?.dbId === userId && updates.isActive === false) {
        await handleLogout(true);
      }
      
      if (user?.dbId === userId && updates.isActive !== false) {
        await refreshUser();
      }
      
      return { success: true };
    } catch (error) {
      throw error;
    }
  };

  // Delete user
  const deleteUser = async (userId) => {
    if (!userId) throw new Error("User ID is required");
    if (user?.dbId === userId) throw new Error("Cannot delete your own account");
    
    const success = await databaseRemove(`Users/${userId}`);
    if (!success) throw new Error("Failed to delete user from database");
    
    sessionStorage.removeItem(`avatar:${userId}`);
    return { success: true };
  };

  // Get all users
  const getAllUsers = async () => {
    const users = await databaseGet("Users");
    return users || {};
  };

  // Change password
  const changePassword = async (userId, currentPassword, newPassword) => {
    if (!userId || !currentPassword || !newPassword) {
      throw new Error("All password fields are required");
    }
    
    const userData = await databaseGet(`Users/${userId}`);
    if (!userData) throw new Error("User not found");
    
    const currentPasswordHash = await generatePasswordHash(currentPassword);
    if (userData.passwordHash !== currentPasswordHash) {
      throw new Error("Current password is incorrect");
    }
    
    const newPasswordHash = await generatePasswordHash(newPassword);
    const success = await databaseUpdate(`Users/${userId}`, {
      passwordHash: newPasswordHash,
      updatedAt: getCurrentTimestamp(),
    });
    
    if (!success) throw new Error("Failed to update password");
    
    await bumpSessionVersion(userId);
    
    if (user?.dbId === userId) {
      await handleLogout(true);
    }
    
    return { success: true };
  };

  // Login
  const login = async (identifier, password) => {
    const normalizedIdentifier = normalizeText(identifier);
    setLoading(true);
    
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      
      const allUsers = await databaseGet("Users");
      if (!allUsers) throw new Error("User not found");
      
      let userDatabaseId = null;
      let userData = null;
      
      for (const [databaseId, dbUser] of Object.entries(allUsers)) {
        if (!dbUser) continue;
        
        const dbUsername = normalizeText(dbUser.username);
        const dbName = normalizeText(dbUser.name);
        const dbEmail = normalizeText(dbUser.email);
        
        if (dbUsername === normalizedIdentifier || 
            dbName === normalizedIdentifier || 
            dbEmail === normalizedIdentifier) {
          userDatabaseId = databaseId;
          userData = dbUser;
          break;
        }
      }
      
      if (!userData) throw new Error("User not found");
      if (userData.isActive === false) throw new Error("Account is deactivated");
      
      let storedPasswordHash = userData.passwordHash;
      
      // Create password hash if none exists
      if (!storedPasswordHash) {
        storedPasswordHash = await generatePasswordHash(password);
        await databaseUpdate(`Users/${userDatabaseId}`, {
          passwordHash: storedPasswordHash,
          updatedAt: getCurrentTimestamp(),
        });
      }
      
      const enteredPasswordHash = await generatePasswordHash(password);
      if (storedPasswordHash !== enteredPasswordHash) {
        throw new Error("Invalid password");
      }
      
      // Update authentication mapping
      await databaseSet(`authentication/users/${auth.currentUser.uid}`, {
        dbId: userDatabaseId,
        at: new Date().toISOString(),
        active: true,
      });
      
      const session = createUserSession(userDatabaseId, userData, auth.currentUser?.uid);
      sessionVersionRef.current = Number(session.sessionVersion || 0);
      cacheUser(session);
      
      await databaseUpdate(`Users/${userDatabaseId}`, {
        lastLogin: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      });
      
      return session;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout
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
    hasPermission,
  }), [ready, user, loading]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}