import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import firebaseDB from '../../firebase';
import { getUserIP } from '../../utils/getUserIP';

export const securityService = {
  // ✅ CORRECT: Change password using Firebase Auth reauthentication
  async changePassword(userId, currentPassword, newPassword) {
    try {
      console.log('=== CHANGE PASSWORD DEBUG ===');
      console.log('User ID:', userId);
      
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        return { success: false, error: "User not logged in" };
      }

      console.log('Current user object:', user);
      console.log('User provider data:', user.providerData);

      // 🔥 CHECK: If user is phone authenticated
      if (user.providerData && user.providerData.length > 0) {
        const isPhoneAuth = user.providerData.some(provider => provider.providerId === 'phone');
        if (isPhoneAuth) {
          return { 
            success: false, 
            error: "Phone-authenticated users cannot change password via this method. Please use phone verification or contact support." 
          };
        }
      }

      let userEmail = null;
      
      // Try to get email from database first
      try {
        const userSnapshot = await firebaseDB.child(`JenCeo-DataBase/Users/${userId}`).once('value');
        const userData = userSnapshot.val();
        
        if (userData) {
          // Try different possible email field names
          userEmail = userData.email || userData.Email || userData.userEmail || userData.emailAddress;
          console.log('Got email from database:', userEmail);
        }
      } catch (dbError) {
        console.warn('Could not fetch email from database:', dbError);
      }

      // If still no email, try from user object
      if (!userEmail) {
        userEmail = user.email;
        console.log('Got email from user object:', userEmail);
      }

      // If still no email, try provider data
      if (!userEmail && user.providerData && user.providerData.length > 0) {
        for (const provider of user.providerData) {
          if (provider.email) {
            userEmail = provider.email;
            console.log('Got email from provider data:', userEmail);
            break;
          }
        }
      }

      if (!userEmail) {
        return { 
          success: false, 
          error: "Email not found. You might be using phone authentication. Please contact support to change password or use the password reset feature." 
        };
      }

      console.log('Using email for reauthentication:', userEmail);
      
      // ✅ Re-authenticate with Firebase Auth
      try {
        const credential = EmailAuthProvider.credential(
          userEmail,
          currentPassword
        );

        await reauthenticateWithCredential(user, credential);
        console.log('Reauthentication successful');
      } catch (reauthError) {
        console.error('Reauthentication error:', reauthError);
        
        if (reauthError.code === "auth/wrong-password") {
          return { success: false, error: "Current password is incorrect" };
        }
        
        if (reauthError.code === "auth/invalid-credential") {
          return { success: false, error: "Invalid credentials. Please check your current password." };
        }
        
        if (reauthError.code === "auth/user-mismatch") {
          return { success: false, error: "User mismatch. Please log out and log in again." };
        }
        
        return { success: false, error: `Authentication failed: ${reauthError.message}` };
      }

      // ✅ Update password in Firebase Auth
      try {
        await updatePassword(user, newPassword);
        console.log('Password updated in Firebase Auth');
      } catch (updateError) {
        console.error('Password update error:', updateError);
        
        if (updateError.code === "auth/weak-password") {
          return { success: false, error: "Password is too weak. Use at least 6 characters." };
        }
        
        if (updateError.code === "auth/requires-recent-login") {
          return { success: false, error: "Please log in again to change your password." };
        }
        
        return { success: false, error: `Failed to update password: ${updateError.message}` };
      }

      // ✅ Log security event to database
      await this.logSecurityEvent({
        type: 'PASSWORD_CHANGE',
        userId: userId,
        severity: 'HIGH',
        details: 'Password changed successfully via Firebase Auth'
      });

      // ✅ Also update metadata in database
      try {
        await firebaseDB.child(`JenCeo-DataBase/Users/${userId}`).update({
          passwordChangedAt: new Date().toISOString(),
          lastPasswordChange: Date.now()
        });
        console.log('Metadata updated in database');
      } catch (dbError) {
        console.warn('Could not update metadata in database:', dbError);
        // Continue anyway - Firebase Auth update was successful
      }

      console.log('Password change process completed successfully');
      return { success: true };

    } catch (error) {
      console.error("Change password error:", error);

      // Handle specific Firebase Auth errors
      if (error.code === "auth/wrong-password") {
        return { success: false, error: "Current password is incorrect" };
      }

      if (error.code === "auth/too-many-requests") {
        return { success: false, error: "Too many attempts. Try again later." };
      }

      if (error.code === "auth/requires-recent-login") {
        return { success: false, error: "Please log in again to change your password." };
      }

      if (error.code === "auth/weak-password") {
        return { success: false, error: "Password is too weak. Use at least 6 characters." };
      }

      if (error.code === "auth/network-request-failed") {
        return { success: false, error: "Network error. Please check your connection." };
      }

      return { success: false, error: error.message || "Failed to update password" };
    }
  },

  // ✅ Log security event
  async logSecurityEvent(event) {
    try {
      const ipAddress = await getUserIP();
      const enhancedEvent = {
        ...event,
        ipAddress,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        browser: this.parseUserAgent(navigator.userAgent).browser,
        device: this.parseUserAgent(navigator.userAgent).deviceType,
        os: this.parseUserAgent(navigator.userAgent).os
      };

      const result = await firebaseDB.child('JenCeo-DataBase/SecurityEvents').push(enhancedEvent);
      
      // Also log to user's security log
      if (event.userId) {
        await firebaseDB.child(`JenCeo-DataBase/Users/${event.userId}/securityLogs`).push({
          ...enhancedEvent,
          eventId: result.key
        });
      }

      return { success: true, id: result.key };
    } catch (error) {
      console.error('Error logging security event:', error);
      return { success: false, error: error.message };
    }
  },

  // ✅ Parse user agent string
  parseUserAgent(userAgent) {
    if (!userAgent) return { browser: 'Unknown', deviceType: 'Unknown', os: 'Unknown' };

    const ua = userAgent.toLowerCase();
    
    // Browser detection
    let browser = 'Unknown';
    if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
    else if (ua.includes('edg')) browser = 'Edge';
    else if (ua.includes('opera')) browser = 'Opera';

    // Device detection
    let deviceType = 'Desktop';
    if (ua.match(/mobile|android|iphone|ipad|ipod/)) {
      if (ua.match(/tablet|ipad/)) deviceType = 'Tablet';
      else deviceType = 'Mobile';
    }

    // OS detection
    let os = 'Unknown';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac os')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('ios') || ua.includes('iphone')) os = 'iOS';

    return { browser, deviceType, os };
  },

  // ✅ Get client IP
  async getClientIP() {
    return getUserIP();
  },

  // ✅ Get user email from database (helper function)
  async getUserEmail(userId) {
    try {
      const userSnapshot = await firebaseDB.child(`JenCeo-DataBase/Users/${userId}`).once('value');
      const userData = userSnapshot.val();
      
      if (!userData) {
        console.warn('User not found in database:', userId);
        return null;
      }
      
      // Try different possible email field names
      const email = userData.email || userData.Email || userData.userEmail;
      
      if (!email) {
        console.warn('No email field found for user:', userId, 'Available fields:', Object.keys(userData));
        return null;
      }
      
      return email;
    } catch (error) {
      console.error('Error getting user email:', error);
      return null;
    }
  },

  // ✅ Calculate security score
  async calculateSecurityScore(userId) {
    try {
      let score = 100;

      // Get user data with correct path
      const [userSnapshot, securitySnapshot] = await Promise.all([
        firebaseDB.child(`JenCeo-DataBase/Users/${userId}`).once('value'),
        firebaseDB.child(`JenCeo-DataBase/Users/${userId}/securityLogs`).limitToLast(100).once('value')
      ]);

      const userData = userSnapshot.val();
      const securityLogs = securitySnapshot.val() || {};

      // Password age penalty
      if (userData?.passwordChangedAt) {
        const lastChange = new Date(userData.passwordChangedAt);
        const daysSinceChange = (Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceChange > 90) score -= 20;
        else if (daysSinceChange > 180) score -= 40;
      }

      // Failed login attempts penalty
      const failedLogins = Object.values(securityLogs).filter(log => 
        log.type === 'FAILED_LOGIN'
      ).length;
      score -= Math.min(failedLogins * 5, 30);

      // Suspicious activity penalty
      const suspiciousActivities = Object.values(securityLogs).filter(log => 
        log.type === 'SUSPICIOUS_LOGIN'
      ).length;
      score -= Math.min(suspiciousActivities * 10, 40);

      // No 2FA penalty
      if (!userData?.has2FA) score -= 15;

      return Math.max(0, Math.min(100, score));
    } catch (error) {
      console.error('Error calculating security score:', error);
      return 50;
    }
  },

  // ✅ Get failed login attempts
  async getFailedLoginAttempts(userId, period = '30d') {
    try {
      const snapshot = await firebaseDB.child(`JenCeo-DataBase/Users/${userId}/securityLogs`)
        .orderByChild('timestamp')
        .startAt(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .once('value');

      if (!snapshot.exists()) return 0;

      const logs = snapshot.val();
      return Object.values(logs).filter(log => log.type === 'FAILED_LOGIN').length;
    } catch (error) {
      console.error('Error getting failed attempts:', error);
      return 0;
    }
  },

  // ✅ Get last security review
  async getLastSecurityReview(userId) {
    try {
      const snapshot = await firebaseDB.child(`JenCeo-DataBase/Users/${userId}/lastSecurityReview`).once('value');
      const lastReview = snapshot.val();
      return lastReview ? new Date(lastReview) : new Date();
    } catch (error) {
      console.error('Error getting last security review:', error);
      return new Date();
    }
  },

  // ✅ Get user security data
  async getUserSecurityData(userId) {
    try {
      const [score, attempts, lastReview, activeSessions] = await Promise.all([
        this.calculateSecurityScore(userId),
        this.getFailedLoginAttempts(userId),
        this.getLastSecurityReview(userId),
        this.getActiveSessionCount(userId)
      ]);

      return {
        securityScore: score,
        failedAttempts: attempts,
        lastReview,
        activeSessions
      };
    } catch (error) {
      console.error('Error getting user security data:', error);
      return {
        securityScore: 50,
        failedAttempts: 0,
        lastReview: new Date(),
        activeSessions: 0
      };
    }
  },

  // ✅ Get active session count
  async getActiveSessionCount(userId) {
    try {
      const snapshot = await firebaseDB.child(`JenCeo-DataBase/UserSessions/${userId}`).once('value');
      
      if (!snapshot.exists()) return 0;
      
      const sessions = snapshot.val();
      const activeSessions = Object.values(sessions).filter(session => 
        session.active === true && session.terminated !== true
      );
      
      return activeSessions.length;
    } catch (error) {
      console.error('Error getting active session count:', error);
      return 0;
    }
  },

  // ✅ Terminate session
  async terminateSession(userId, sessionId) {
    try {
      await firebaseDB.child(`JenCeo-DataBase/UserSessions/${userId}/${sessionId}`).update({
        terminated: true,
        terminatedAt: new Date().toISOString(),
        terminatedBy: userId
      });

      await this.logSecurityEvent({
        type: 'SESSION_TERMINATED',
        userId,
        sessionId,
        severity: 'MEDIUM'
      });

      return { success: true };
    } catch (error) {
      console.error('Error terminating session:', error);
      return { success: false, error: error.message };
    }
  },

  // ✅ Terminate all other sessions
  async terminateAllOtherSessions(userId, currentSessionId) {
    try {
      const snapshot = await firebaseDB.child(`JenCeo-DataBase/UserSessions/${userId}`).once('value');
      if (!snapshot.exists()) return { success: true };

      const sessions = snapshot.val();
      const updates = {};

      Object.keys(sessions).forEach(sessionId => {
        if (sessionId !== currentSessionId) {
          updates[`${sessionId}/terminated`] = true;
          updates[`${sessionId}/terminatedAt`] = new Date().toISOString();
          updates[`${sessionId}/terminatedBy`] = userId;
        }
      });

      await firebaseDB.child(`JenCeo-DataBase/UserSessions/${userId}`).update(updates);

      await this.logSecurityEvent({
        type: 'ALL_OTHER_SESSIONS_TERMINATED',
        userId,
        currentSessionId,
        terminatedCount: Object.keys(sessions).length - 1,
        severity: 'HIGH'
      });

      return { success: true };
    } catch (error) {
      console.error('Error terminating all other sessions:', error);
      return { success: false, error: error.message };
    }
  },

  // ✅ Terminate all sessions
  async terminateAllSessions(userId) {
    try {
      const snapshot = await firebaseDB.child(`JenCeo-DataBase/UserSessions/${userId}`).once('value');
      if (!snapshot.exists()) return { success: true };

      const sessions = snapshot.val();
      const updates = {};

      Object.keys(sessions).forEach(sessionId => {
        updates[`${sessionId}/terminated`] = true;
        updates[`${sessionId}/terminatedAt`] = new Date().toISOString();
        updates[`${sessionId}/terminatedBy`] = userId;
      });

      await firebaseDB.child(`JenCeo-DataBase/UserSessions/${userId}`).update(updates);

      await this.logSecurityEvent({
        type: 'ALL_SESSIONS_TERMINATED',
        userId,
        terminatedCount: Object.keys(sessions).length,
        severity: 'HIGH'
      });

      return { success: true };
    } catch (error) {
      console.error('Error terminating all sessions:', error);
      return { success: false, error: error.message };
    }
  },

  // ✅ Detect simultaneous logins
  async detectSimultaneousLogins(userId) {
    try {
      const snapshot = await firebaseDB.child(`JenCeo-DataBase/UserSessions/${userId}`).once('value');

      if (!snapshot.exists()) return { hasSimultaneous: false, count: 0 };

      const sessions = snapshot.val();
      const activeSessions = Object.values(sessions).filter(session => 
        session.active === true && session.terminated !== true
      );

      return {
        hasSimultaneous: activeSessions.length > 1,
        count: activeSessions.length,
        sessions: activeSessions
      };
    } catch (error) {
      console.error('Error detecting simultaneous logins:', error);
      return { hasSimultaneous: false, count: 0, sessions: [] };
    }
  },

  // ✅ Warn on new device login
  async checkNewDevice(userId, userAgent) {
    try {
      const snapshot = await firebaseDB.child(`JenCeo-DataBase/UserDevices/${userId}`).once('value');
      
      if (!snapshot.exists()) {
        // First device, add it
        await firebaseDB.child(`JenCeo-DataBase/UserDevices/${userId}`).push({
          userAgent,
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          trusted: true
        });
        return { isNew: true, isTrusted: false };
      }

      const devices = snapshot.val();
      const deviceKeys = Object.keys(devices);
      const existingDevice = deviceKeys.find(key => 
        devices[key].userAgent === userAgent
      );

      if (!existingDevice) {
        // New device detected
        await firebaseDB.child(`JenCeo-DataBase/UserDevices/${userId}`).push({
          userAgent,
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          trusted: false
        });

        // Log warning
        await this.logSecurityEvent({
          type: 'NEW_DEVICE_DETECTED',
          userId,
          userAgent,
          severity: 'MEDIUM'
        });

        return { isNew: true, isTrusted: false };
      }

      // Update last seen for existing device
      await firebaseDB.child(`JenCeo-DataBase/UserDevices/${userId}/${existingDevice}/lastSeen`).set(new Date().toISOString());

      return { 
        isNew: false, 
        isTrusted: devices[existingDevice].trusted 
      };
    } catch (error) {
      console.error('Error checking new device:', error);
      return { isNew: false, isTrusted: false };
    }
  },

  // ✅ Trust a device
  async trustDevice(userId, deviceId) {
    try {
      await firebaseDB.child(`JenCeo-DataBase/UserDevices/${userId}/${deviceId}/trusted`).set(true);
      
      await this.logSecurityEvent({
        type: 'DEVICE_TRUSTED',
        userId,
        deviceId,
        severity: 'LOW'
      });

      return { success: true };
    } catch (error) {
      console.error('Error trusting device:', error);
      return { success: false, error: error.message };
    }
  },

  // ✅ NEW: Report suspicious activity
  async reportSuspiciousActivity(userId, activityData) {
    try {
      const reportData = {
        ...activityData,
        userId,
        reportedAt: new Date().toISOString(),
        ipAddress: await this.getClientIP(),
        userAgent: navigator.userAgent,
        status: 'PENDING_REVIEW'
      };

      const result = await firebaseDB.child('JenCeo-DataBase/SuspiciousActivityReports').push(reportData);

      // Also log as security event
      await this.logSecurityEvent({
        type: 'SUSPICIOUS_ACTIVITY_REPORTED',
        userId,
        reportId: result.key,
        details: activityData.description,
        severity: 'HIGH'
      });

      return { success: true, reportId: result.key };
    } catch (error) {
      console.error('Error reporting suspicious activity:', error);
      return { success: false, error: error.message };
    }
  },

  // ✅ NEW: Enable/Disable 2FA
  async toggleTwoFactorAuth(userId, enable) {
    try {
      await firebaseDB.child(`JenCeo-DataBase/Users/${userId}`).update({
        has2FA: enable,
        twoFactorEnabledAt: enable ? new Date().toISOString() : null
      });

      await this.logSecurityEvent({
        type: enable ? '2FA_ENABLED' : '2FA_DISABLED',
        userId,
        severity: enable ? 'HIGH' : 'MEDIUM'
      });

      return { success: true };
    } catch (error) {
      console.error('Error toggling 2FA:', error);
      return { success: false, error: error.message };
    }
  },

  // ✅ NEW: Get security recommendations
  async getSecurityRecommendations(userId) {
    try {
      const [securityData, activities] = await Promise.all([
        this.getUserSecurityData(userId),
        firebaseDB.child(`JenCeo-DataBase/LoginData`).orderByChild('userId').equalTo(userId).limitToLast(50).once('value')
      ]);

      const recommendations = [];
      
      // Check password age
      if (securityData.lastReview) {
        const daysSinceReview = (Date.now() - new Date(securityData.lastReview).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceReview > 90) {
          recommendations.push({
            id: 'password-review',
            title: 'Review Password Security',
            description: 'It has been more than 90 days since your last password review.',
            severity: 'warning',
            action: 'change_password'
          });
        }
      }

      // Check for failed attempts
      if (securityData.failedAttempts > 3) {
        recommendations.push({
          id: 'failed-attempts',
          title: 'Multiple Failed Login Attempts',
          description: `${securityData.failedAttempts} failed login attempts detected recently.`,
          severity: 'danger',
          action: 'review_activity'
        });
      }

      // Check active sessions
      if (securityData.activeSessions > 1) {
        recommendations.push({
          id: 'multiple-sessions',
          title: 'Multiple Active Sessions',
          description: `You have ${securityData.activeSessions} active sessions.`,
          severity: 'warning',
          action: 'review_sessions'
        });
      }

      // Check security score
      if (securityData.securityScore < 70) {
        recommendations.push({
          id: 'low-score',
          title: 'Low Security Score',
          description: `Your security score is ${securityData.securityScore}/100.`,
          severity: securityData.securityScore < 50 ? 'danger' : 'warning',
          action: 'improve_security'
        });
      }

      return recommendations;
    } catch (error) {
      console.error('Error getting security recommendations:', error);
      return [];
    }
  }
};