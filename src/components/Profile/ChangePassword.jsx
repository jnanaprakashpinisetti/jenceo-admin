import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import firebaseDB from '../../firebase';

// Move PasswordInputWithEye component outside to prevent re-renders
const PasswordInputWithEye = React.memo(({ value, onChange, placeholder, disabled, show, onToggleShow, required = true }) => (
  <div className="input-group">
    <input
      type={show ? "text" : "password"}
      className="form-control"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      autoComplete={placeholder.includes('current') ? 'current-password' : 'new-password'}
    />
    <button
      className="btn btn-outline-secondary mb-0"
      type="button"
      onClick={onToggleShow}
      disabled={disabled}
    >
      <i className={`bi bi-eye${show ? '-slash' : ''}`}></i>
    </button>
  </div>
));

// Helper function to hash password (same as in AdminMain.jsx)
async function sha256Base64(text) {
  try {
    const enc = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest("SHA-256", enc);
    const b = String.fromCharCode(...new Uint8Array(hash));
    return btoa(b);
  } catch {
    // Fallback for older browsers
    return btoa(unescape(encodeURIComponent(text)));
  }
}

// Function to find user in database (like admin does)
async function findUserInDatabase(uid) {
  try {
    // Try different possible database paths with priority to Users collection
    const paths = [
      `Users/${uid}`,  // First priority
      `JenCeo-DataBase/Users/${uid}`,
      `authentication/users/${uid}`
    ];

    for (const path of paths) {
      try {
        const snapshot = await firebaseDB.child(path).once('value');
        const userData = snapshot.val();
        
        if (userData) {
          // If found in authentication path, we need to find the actual user record in Users collection
          if (path.startsWith('authentication/')) {
            // Try to find user by uid in Users collection
            const userSnapshot = await firebaseDB.child(`Users`).orderByChild('uid').equalTo(uid).once('value');
            if (userSnapshot.exists()) {
              const users = userSnapshot.val();
              const userId = Object.keys(users)[0];
              return { 
                data: users[userId], 
                path: `Users/${userId}`,
                dbId: userId,
                originalUid: uid
              };
            }
            
            // If not found by uid, try by dbId from authentication
            if (userData.dbId) {
              const dbUserSnapshot = await firebaseDB.child(`Users/${userData.dbId}`).once('value');
              if (dbUserSnapshot.exists()) {
                return { 
                  data: dbUserSnapshot.val(), 
                  path: `Users/${userData.dbId}`,
                  dbId: userData.dbId,
                  originalUid: uid
                };
              }
            }
            
            // If still not found, return the authentication record
            return { data: userData, path, dbId: uid, originalUid: uid };
          }
          return { data: userData, path, dbId: uid };
        }
      } catch (error) {
        // Silently continue to next path
        continue;
      }
    }

    // If not found by uid directly, search all Users for matching uid or dbId
    try {
      const allUsersSnapshot = await firebaseDB.child('Users').once('value');
      if (allUsersSnapshot.exists()) {
        const allUsers = allUsersSnapshot.val();
        
        // Search for user with matching uid or dbId
        for (const [userId, userData] of Object.entries(allUsers)) {
          if (userData.uid === uid || userData.dbId === uid || userId === uid) {
            return { 
              data: userData, 
              path: `Users/${userId}`,
              dbId: userId,
              originalUid: uid
            };
          }
        }
      }
    } catch (error) {
      // Silently handle error
    }

    return null;
  } catch (error) {
    return null;
  }
}

// Safe update function (like admin uses)
async function safeUpdate(path, payload) {
  try {
    await firebaseDB.child(path).update(payload);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e };
  }
}

// Safe set function
async function safeSet(path, payload) {
  try {
    await firebaseDB.child(path).set(payload);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e };
  }
}

const ChangePassword = ({ onCancel, onSuccess, userId }) => {
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [userData, setUserData] = useState(null);
  const [userDbPath, setUserDbPath] = useState('');
  const [userDbId, setUserDbId] = useState('');
  const [userUid, setUserUid] = useState('');
  const [logoutTimeout, setLogoutTimeout] = useState(null);
  
  const { logout, currentUser, user: userFromCtx } = useAuth();
  const navigate = useNavigate();

  const validatePassword = useCallback((password) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    return Math.min(strength, 100);
  }, []);

  // Find user data on component mount
  useEffect(() => {
    let isMounted = true;

    const findUserData = async () => {
      const user = currentUser || userFromCtx;
      const uid = user?.uid || userId;
      
      if (!uid) {
        if (isMounted) setError('No user logged in');
        return;
      }

      if (isMounted) setUserUid(uid);

      try {
        const result = await findUserInDatabase(uid);
        
        if (isMounted) {
          if (result) {
            setUserData(result.data);
            setUserDbPath(result.path);
            setUserDbId(result.dbId || uid);
          } else {
            setError('User not found in database. Please contact admin.');
          }
        }
      } catch (error) {
        if (isMounted) setError('Error loading user data. Please try again.');
      }
    };

    findUserData();

    return () => {
      isMounted = false;
    };
  }, [currentUser, userFromCtx, userId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (logoutTimeout) {
        clearTimeout(logoutTimeout);
      }
    };
  }, [logoutTimeout]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Get current user from auth context
    const user = currentUser || userFromCtx;
    if (!user) {
      setError('No user logged in');
      setLoading(false);
      return;
    }

    const uid = userUid || user.uid || userId;
    if (!uid) {
      setError('User ID not found');
      setLoading(false);
      return;
    }

    // Check if user data was found
    if (!userData || !userDbPath) {
      setError('User data not loaded. Please refresh and try again.');
      setLoading(false);
      return;
    }

    // Validation
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      // Verify current password if user has password
      const userPassword = userData.password || userData.passwordHash;
      
      if (userPassword) {
        if (!passwordForm.currentPassword) {
          setError('Please enter your current password');
          setLoading(false);
          return;
        }

        // Hash current password for comparison
        const currentPasswordHash = await sha256Base64(passwordForm.currentPassword);
        
        // Check both password and passwordHash fields
        const isPasswordMatch = 
          (userData.password && userData.password === passwordForm.currentPassword) ||
          (userData.passwordHash && userData.passwordHash === currentPasswordHash);
        
        if (!isPasswordMatch) {
          setError('Current password is incorrect');
          setLoading(false);
          return;
        }
      } else {
        // User doesn't have password - this is first time setting password
        // Allow empty current password for first-time setup
        if (passwordForm.currentPassword) {
          setError('You don\'t have an existing password. Leave current password empty.');
          setLoading(false);
          return;
        }
      }

      // Hash the new password
      const newPasswordHash = await sha256Base64(passwordForm.newPassword);

      // Always update in Users collection if found there
      let updatePath = userDbPath;
      
      // If we're updating authentication path but have a dbId, update Users collection instead
      if (userDbPath.startsWith('authentication/') && userDbId) {
        updatePath = `Users/${userDbId}`;
      }
      
      // Update password in database - ONLY update passwordHash
      const updates = {
        passwordHash: newPasswordHash, // Only update passwordHash
        passwordChangedAt: new Date().toISOString(),
        lastPasswordChange: Date.now(),
        updatedAt: new Date().toISOString(),
        lastSync: null // Force re-sync
      };

      // Update at the determined path
      const res = await safeUpdate(updatePath, updates);
      
      if (!res.ok) {
        throw new Error(`Failed to update password. Please try again.`);
      }

      // Show success message
      setSuccess('Password updated successfully! Logging you out for security...');

      // Log the change
      try {
        await firebaseDB.child(`UserActivityLogs/${userDbId || uid}`).push({
          action: 'password_change',
          timestamp: Date.now(),
          changedAt: new Date().toISOString(),
          changedBy: userDbId || uid,
          source: 'profile_page'
        });
      } catch (logError) {
        // Silently ignore log errors
      }

      // Clear form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      // Force logout user
      try {
        // Clear session storage
        const sessionKeys = ["auth:user", "firebase:authUser", "userSession", "currentUser"];
        sessionKeys.forEach(key => sessionStorage.removeItem(key));
        
        // Clear local storage
        const localKeys = ["firebaseToken", "userToken", "impersonateUid"];
        localKeys.forEach(key => localStorage.removeItem(key));
        
        // Update database to force logout
        await firebaseDB.child(updatePath).update({
          lastSync: null,
          lastLogout: Date.now(),
          forceLogout: Date.now()
        });
        
        // Increment session version to force logout
        await firebaseDB.child(`${updatePath}/requiredSessionVersion`).transaction(v => (Number(v) || 0) + 1);
        
      } catch (logoutError) {
        // Silently ignore logout errors
      }

      // Logout current user and redirect
      const timeout = setTimeout(async () => {
        try {
          await logout();
          navigate('/login?message=password_changed_logout');
        } catch (logoutError) {
          navigate('/login?message=password_changed_logout');
        }
      }, 2000);
      
      setLogoutTimeout(timeout);
      
    } catch (err) {
      if (err.message?.includes('permission_denied') || err.code === 'PERMISSION_DENIED') {
        setError('Permission denied. You may not have permission to change password. Please contact admin.');
      } else if (err.message?.includes('network')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(err.message || 'An error occurred while changing password. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleNewPasswordChange = useCallback((e) => {
    const newPassword = e.target.value;
    setPasswordForm(prev => ({ ...prev, newPassword }));
    setPasswordStrength(validatePassword(newPassword));
  }, [validatePassword]);

  const handleCurrentPasswordChange = useCallback((e) => {
    setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }));
  }, []);

  const handleConfirmPasswordChange = useCallback((e) => {
    setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }));
  }, []);

  const getStrengthColor = useCallback(() => {
    if (passwordStrength >= 75) return 'success';
    if (passwordStrength >= 50) return 'warning';
    return 'danger';
  }, [passwordStrength]);

  const getStrengthText = useCallback(() => {
    if (passwordStrength >= 75) return 'Strong';
    if (passwordStrength >= 50) return 'Medium';
    if (passwordStrength >= 25) return 'Weak';
    return 'Very Weak';
  }, [passwordStrength]);

  const toggleShowPassword = useCallback((field) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  }, []);

  // Check if user has password (from database)
  const hasPassword = userData && (userData.password || userData.passwordHash);

  return (
    <div className="bg-secondary bg-opacity-25 rounded p-4">
      <h6 className="mb-3">Change Password</h6>
      
      {success && (
        <div className="alert alert-success">
          <i className="bi bi-check-circle me-2"></i>
          {success}
          <div className="mt-2 small">
            <i className="bi bi-info-circle me-1"></i>
            You will be automatically logged out for security.
          </div>
        </div>
      )}
      
      {error && (
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}
      
      {userData && !hasPassword && (
        <div className="alert alert-info mb-3">
          <i className="bi bi-info-circle me-2"></i>
          <strong>Note:</strong> You don't have a password set yet. Please enter a new password and leave current password empty.
        </div>
      )}
      
      {!userData && !error && (
        <div className="alert alert-warning mb-3">
          <i className="bi bi-hourglass-split me-2"></i>
          Loading user data...
        </div>
      )}
      
      <form onSubmit={handlePasswordChange} className='bg-transparent'>
        {/* Hidden username field for accessibility */}
        <input 
          type="hidden" 
          autoComplete="username" 
          value={userData?.username || userData?.email || userUid} 
        />
        
        {hasPassword && (
          <div className="mb-3">
            <label className="form-label">Current Password <span className='star'>*</span></label>
            <PasswordInputWithEye
              value={passwordForm.currentPassword}
              onChange={handleCurrentPasswordChange}
              placeholder="Enter current password"
              disabled={loading || !userData}
              show={showPassword.current}
              onToggleShow={() => toggleShowPassword('current')}
              required={true}
            />
            <small className="text-muted">
              Required for security verification.
            </small>
          </div>
        )}
        
        <div className="mb-3">
          <label className="form-label">New Password  <span className='star'>*</span></label>
          <PasswordInputWithEye
            value={passwordForm.newPassword}
            onChange={handleNewPasswordChange}
            placeholder="At least 6 characters"
            disabled={loading || !userData}
            show={showPassword.new}
            onToggleShow={() => toggleShowPassword('new')}
            required={true}
          />
          {passwordForm.newPassword && (
            <div className="mt-2">
              <div className="d-flex justify-content-between align-items-center">
                <small>Password Strength: </small>
                <small className={`text-${getStrengthColor()}`}>
                  {getStrengthText()}
                </small>
              </div>
              <div className="progress mt-1" style={{ height: '4px' }}>
                <div 
                  className={`progress-bar bg-${getStrengthColor()}`}
                  style={{ width: `${passwordStrength}%` }}
                ></div>
              </div>
              <small className="text-muted">
                Include uppercase, lowercase, numbers, and symbols for stronger password.
              </small>
            </div>
          )}
        </div>
        
        <div className="mb-4">
          <label className="form-label">Confirm New Password  <span className='star'>*</span></label>
          <PasswordInputWithEye
            value={passwordForm.confirmPassword}
            onChange={handleConfirmPasswordChange}
            placeholder="Confirm new password"
            disabled={loading || !userData}
            show={showPassword.confirm}
            onToggleShow={() => toggleShowPassword('confirm')}
            required={true}
          />
        </div>
        
        <div className="d-flex gap-2">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading || !userData}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                Updating...
              </>
            ) : !userData ? 'Loading...' : 'Update Password'}
          </button>
          <button 
            type="button" 
            className="btn btn-outline-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChangePassword;