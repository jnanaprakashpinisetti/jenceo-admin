import React, { useState, useCallback } from 'react';
import { securityService } from './SecurityService';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

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
    if (!passwordForm.currentPassword) {
      setError('Please enter your current password');
      setLoading(false);
      return;
    }
    
    if (passwordForm.newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      setLoading(false);
      return;
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    if (passwordStrength < 75) {
      setError('Password is too weak. Include uppercase, lowercase, numbers, and symbols.');
      setLoading(false);
      return;
    }

    try {
      // Verify current password and update
      const result = await securityService.changePassword(
        userId,
        passwordForm.currentPassword,
        passwordForm.newPassword
      );

      if (result.success) {
        setSuccess('Password updated successfully!');
        
        // Log security event
        await securityService.logSecurityEvent({
          type: 'PASSWORD_CHANGE',
          userId: userId,
          ipAddress: await securityService.getClientIP(),
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          severity: 'HIGH'
        });

        // Auto logout after 2 seconds
        setTimeout(async () => {
          await logout();
          navigate('/login?message=password_changed');
        }, 2000);
      } else {
        setError(result.error || 'Failed to update password');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
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

  return (
    <div className="border rounded p-4">
      <h6 className="mb-3">Change Password</h6>
      
      {success && (
        <div className="alert alert-success">
          <i className="bi bi-check-circle me-2"></i>
          {success}
          <div className="mt-2">
            <small>You will be logged out automatically for security.</small>
          </div>
        </div>
      )}
      
      {error && (
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}
      
      <form onSubmit={handlePasswordChange}>
        <div className="mb-3">
          <label className="form-label">Current Password</label>
          <PasswordInputWithEye
            value={passwordForm.currentPassword}
            onChange={handleCurrentPasswordChange}
            placeholder="Enter current password"
            disabled={loading}
            show={showPassword.current}
            onToggleShow={() => toggleShowPassword('current')}
          />
        </div>
        
        <div className="mb-3">
          <label className="form-label">New Password</label>
          <PasswordInputWithEye
            value={passwordForm.newPassword}
            onChange={handleNewPasswordChange}
            placeholder="At least 8 characters"
            disabled={loading}
            show={showPassword.new}
            onToggleShow={() => toggleShowPassword('new')}
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
          <label className="form-label">Confirm New Password</label>
          <PasswordInputWithEye
            value={passwordForm.confirmPassword}
            onChange={handleConfirmPasswordChange}
            placeholder="Confirm new password"
            disabled={loading}
            show={showPassword.confirm}
            onToggleShow={() => toggleShowPassword('confirm')}
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