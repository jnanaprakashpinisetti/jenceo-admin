import React, { useState, useCallback } from 'react';
import { securityService } from './SecurityService';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getAuth, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

// Move PasswordInputWithEye component outside to prevent re-renders
const PasswordInputWithEye = React.memo(({ value, onChange, placeholder, disabled, show, onToggleShow }) => (
  <div className="input-group">
    <input
      type={show ? "text" : "password"}
      className="form-control"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required
      disabled={disabled}
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
  
  const { logout } = useAuth();
  const navigate = useNavigate();
  const auth = getAuth();

  const validatePassword = useCallback((password) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    return Math.min(strength, 100);
  }, []);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

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
      const user = auth.currentUser;
      if (!user) {
        setError("No authenticated user found");
        setLoading(false);
        return;
      }

      console.log("Attempting password change for user:", user.email);
      console.log("Has email provider?", user.providerData.some(p => p.providerId === 'password'));

      // Check if user has email provider
      const hasEmailProvider = user.providerData.some(
        provider => provider.providerId === 'password'
      );

      // If user has email provider AND current password is provided, re-authenticate
      if (hasEmailProvider && passwordForm.currentPassword) {
        try {
          console.log("Attempting re-authentication with current password");
          const credential = EmailAuthProvider.credential(
            user.email,
            passwordForm.currentPassword
          );
          await reauthenticateWithCredential(user, credential);
          console.log("Re-authentication successful");
        } catch (reauthError) {
          console.error("Re-authentication error:", reauthError);
          setError('Current password is incorrect');
          setLoading(false);
          return;
        }
      } else if (hasEmailProvider && !passwordForm.currentPassword) {
        console.log("Email provider detected but no current password provided");
        // If user has email auth but didn't provide current password, warn them
        setError('Please enter your current password to change it');
        setLoading(false);
        return;
      }

      // IMPORTANT: Check if user needs reauthentication
      // Firebase requires recent login for password changes
      try {
        console.log("Attempting to update password...");
        await updatePassword(user, passwordForm.newPassword);
        console.log("Password update successful!");
      } catch (updateError) {
        console.error("Password update error:", updateError);
        
        if (updateError.code === 'auth/requires-recent-login') {
          setError('For security, you need to sign in again recently. Please sign out and sign back in, then try changing your password.');
          setLoading(false);
          return;
        } else if (updateError.code === 'auth/weak-password') {
          setError('Password is too weak. Please use a stronger password.');
          setLoading(false);
          return;
        } else {
          throw updateError; // Re-throw to be caught by outer catch
        }
      }
      
      // Show success message
      setSuccess('Password updated successfully! Logging you out for security...');

      // NON-BLOCKING security logging
      try {
        await securityService.logSecurityEvent({
          type: 'PASSWORD_CHANGE',
          userId: user.uid,
          ipAddress: await securityService.getClientIP().catch(() => 'unknown'),
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          severity: 'HIGH'
        });
      } catch (logError) {
        console.warn('Security log failed (non-critical):', logError);
      }

      // Clear form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      // AUTO-LOGOUT after 2 seconds
      setTimeout(async () => {
        try {
          // Try to log security event before logout
          try {
            await securityService.logSecurityEvent({
              type: 'AUTO_LOGOUT_AFTER_PASSWORD_CHANGE',
              userId: user.uid,
              timestamp: new Date().toISOString(),
              severity: 'HIGH'
            });
          } catch (logError2) {
            console.warn('Second security log failed:', logError2);
          }
          
          // Logout current user
          await logout();
          
          // Redirect to login page with message
          navigate('/login?message=password_changed_logout');
        } catch (logoutError) {
          console.error('Error during auto-logout:', logoutError);
          // Force redirect anyway
          navigate('/login?message=password_changed_logout');
        }
      }, 2000);
      
    } catch (err) {
      console.error('Password change error:', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      
      if (err.code === 'auth/requires-recent-login') {
        setError('Security policy requires recent login. Please sign out, sign in again, and try changing your password immediately after logging in.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use at least 6 characters.');
      } else if (err.code === 'auth/requires-recent-login') {
        setError('For security reasons, you need to sign in again recently to change your password.');
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

  // Check if user is signed in with email/password
  const isEmailUser = () => {
    const user = auth.currentUser;
    return user && user.providerData.some(provider => provider.providerId === 'password');
  };

  return (
    <div className="border rounded p-4">
      <h6 className="mb-3">Change Password</h6>
      
      {success && (
        <div className="alert alert-success">
          <i className="bi bi-check-circle me-2"></i>
          {success}
        </div>
      )}
      
      {error && (
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}
      
      {isEmailUser() && (
        <div className="alert alert-info mb-3">
          <i className="bi bi-info-circle me-2"></i>
          <strong>Note:</strong> Since you signed in with email/password, you must enter your current password to change it.
        </div>
      )}
      
      <form onSubmit={handlePasswordChange}>
        {isEmailUser() && (
          <div className="mb-3">
            <label className="form-label">Current Password *</label>
            <PasswordInputWithEye
              value={passwordForm.currentPassword}
              onChange={handleCurrentPasswordChange}
              placeholder="Enter current password"
              disabled={loading}
              show={showPassword.current}
              onToggleShow={() => toggleShowPassword('current')}
              required
            />
            <small className="text-muted">
              Required for email/password users. This is a security requirement.
            </small>
          </div>
        )}
        
        {!isEmailUser() && (
          <div className="mb-3">
            <label className="form-label">Current Password (Optional)</label>
            <PasswordInputWithEye
              value={passwordForm.currentPassword}
              onChange={handleCurrentPasswordChange}
              placeholder="Enter current password (if you have one)"
              disabled={loading}
              show={showPassword.current}
              onToggleShow={() => toggleShowPassword('current')}
            />
            <small className="text-muted">
              If you signed in with a different method (like phone auth), you may not have a current password.
            </small>
          </div>
        )}
        
        <div className="mb-3">
          <label className="form-label">New Password *</label>
          <PasswordInputWithEye
            value={passwordForm.newPassword}
            onChange={handleNewPasswordChange}
            placeholder="At least 6 characters"
            disabled={loading}
            show={showPassword.new}
            onToggleShow={() => toggleShowPassword('new')}
            required
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
          <label className="form-label">Confirm New Password *</label>
          <PasswordInputWithEye
            value={passwordForm.confirmPassword}
            onChange={handleConfirmPasswordChange}
            placeholder="Confirm new password"
            disabled={loading}
            show={showPassword.confirm}
            onToggleShow={() => toggleShowPassword('confirm')}
            required
          />
        </div>
        
        <div className="d-flex gap-2">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                Updating...
              </>
            ) : 'Update Password'}
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