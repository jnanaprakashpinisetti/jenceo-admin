// utils/trackUserLogin.js - Enhanced version with comprehensive security features
import firebaseDB from '../../firebase';

// Main login tracking function with IP restriction
export const trackUserLogin = async (userData, ipAddress = 'Unknown') => {
    try {
        // Validate user data
        if (!userData) {
            console.error('No user data provided for login tracking');
            return { success: false, error: 'No user data provided' };
        }

        // Check IP restriction before allowing login
        const restrictionCheck = await checkIPRestriction(ipAddress);
        if (restrictionCheck.restricted) {
            console.warn(`Login blocked for IP: ${ipAddress} - ${restrictionCheck.reason}`);
            
            // Track blocked login attempt
            await firebaseDB.child('SecurityEvents').push({
                type: 'BLOCKED_LOGIN',
                userId: userData.uid || userData.userId || 'unknown',
                email: userData.email || 'unknown@example.com',
                ipAddress: ipAddress,
                reason: restrictionCheck.reason,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                severity: 'HIGH'
            });

            // Update IP threat intelligence
            await updateIPThreatLevel(ipAddress, 'BLOCKED_ATTEMPT');
            
            return { 
                success: false, 
                error: 'Access denied', 
                reason: restrictionCheck.reason,
                restricted: true 
            };
        }


        // Check for suspicious activity
        const suspiciousCheck = await checkSuspiciousActivity(userData, ipAddress);
        if (suspiciousCheck.isSuspicious) {
            console.warn(`Suspicious login detected: ${suspiciousCheck.reason}`);
            
            await firebaseDB.child('SecurityEvents').push({
                type: 'SUSPICIOUS_LOGIN',
                userId: userData.uid,
                email: userData.email,
                ipAddress: ipAddress,
                reason: suspiciousCheck.reason,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                severity: 'MEDIUM',
                details: suspiciousCheck.details
            });
        }

        // Get enhanced location data
        const locationData = await getEnhancedLocationFromIP(ipAddress);
        
        // Get additional security context
        const securityContext = await getSecurityContext(userData, ipAddress);
        
        const loginData = {
            // User Information
            userId: userData.uid || userData.userId || 'unknown',
            email: userData.email || 'unknown@example.com',
            displayName: userData.displayName || userData.name || userData.username || 'Unknown User',
            
            // Network Information
            ipAddress: ipAddress,
            userAgent: navigator.userAgent,
            
            // Timing Information
            loginTime: new Date().toISOString(),
            timestamp: Date.now(),
            
            // Location Information
            location: locationData,
            country: locationData.country || 'Unknown',
            city: locationData.city || 'Unknown',
            region: locationData.region || 'Unknown',
            timezone: locationData.timezone || 'Unknown',
            isp: locationData.isp || 'Unknown',
            coordinates: locationData.coordinates,
            
            // Security Context - FIXED: Ensure no undefined values
            securityScore: securityContext.securityScore || 50,
            riskLevel: securityContext.riskLevel || 'MEDIUM',
            isSuspicious: suspiciousCheck.isSuspicious || false,
            suspiciousReason: suspiciousCheck.reason || null,
            
            // Device and Browser Info
            browser: getBrowserInfo(navigator.userAgent),
            deviceType: getDeviceType(navigator.userAgent),
            platform: navigator.platform,
            language: navigator.language,
            
            // Session Information
            sessionId: generateSessionId(),
            userType: userData.userType || 'regular', // admin, moderator, regular
            
            // Status
            status: suspiciousCheck.isSuspicious ? 'SUSPICIOUS' : 'SUCCESS'
        };


        // Store login data in LoginData only
        const result = await firebaseDB.child('LoginData').push(loginData);
        
        if (result && result.key) {
            
            // Update user login history in LoginData
            await updateUserLoginHistory(userData.uid, {
                loginId: result.key,
                ipAddress,
                timestamp: loginData.timestamp,
                location: locationData
            });

            // Update IP analytics in LoginData
            await updateIPAnalytics(ipAddress, userData.uid, locationData);
            
            return { 
                success: true, 
                loginId: result.key,
                securityScore: securityContext.securityScore || 50,
                riskLevel: securityContext.riskLevel || 'MEDIUM'
            };
        } else {
            console.error('Failed to push login data to Firebase');
            return { success: false, error: 'Database error' };
        }
    } catch (error) {
        console.error('Error tracking login:', error);
        
        // Log the error as a security event in LoginData
        await firebaseDB.child('LoginData').push({
            type: 'TRACKING_ERROR',
            error: error.message,
            timestamp: new Date().toISOString(),
            loginTime: new Date().toISOString(),
            severity: 'LOW',
            status: 'ERROR'
        });
        
        return { success: false, error: error.message };
    }
};

// Enhanced IP restriction check
export const checkIPRestriction = async (ipAddress) => {
    try {
        // Get restriction setting
        const restrictionSetting = await ipWhitelistManager.getRestrictionSetting();
        
        // If restriction is disabled, allow all IPs
        if (!restrictionSetting.enabled) {
            return { restricted: false };
        }

        // Check if IP is whitelisted
        const isWhitelisted = await ipWhitelistManager.isIPWhitelisted(ipAddress);
        
        if (!isWhitelisted) {
            return { 
                restricted: true, 
                reason: 'IP_NOT_WHITELISTED' 
            };
        }

        // Check if IP is blacklisted
        const isBlacklisted = await ipWhitelistManager.isIPBlacklisted(ipAddress);
        if (isBlacklisted) {
            return { 
                restricted: true, 
                reason: 'IP_BLACKLISTED' 
            };
        }

        // Check IP threat level
        const threatLevel = await getIPThreatLevel(ipAddress);
        if (threatLevel === 'HIGH') {
            return { 
                restricted: true, 
                reason: 'HIGH_RISK_IP' 
            };
        }

        return { restricted: false };
    } catch (error) {
        console.error('Error checking IP restriction:', error);
        // In case of error, allow access to prevent locking users out
        return { restricted: false };
    }
};

// Check for suspicious activity
export const checkSuspiciousActivity = async (userData, ipAddress) => {
    try {
        const checks = [];
        const details = {};

        // 1. Check for rapid successive logins
        const rapidLoginCheck = await checkRapidSuccessiveLogins(userData.uid, ipAddress);
        if (rapidLoginCheck.isSuspicious) {
            checks.push('RAPID_SUCCESSIVE_LOGINS');
            details.rapidLogin = rapidLoginCheck.details;
        }

        // 2. Check geographic anomalies
        const geoCheck = await checkGeographicAnomaly(userData.uid, ipAddress);
        if (geoCheck.isSuspicious) {
            checks.push('GEOGRAPHIC_ANOMALY');
            details.geoAnomaly = geoCheck.details;
        }

        // 3. Check new device/browser
        const deviceCheck = await checkNewDevice(userData.uid, navigator.userAgent);
        if (deviceCheck.isSuspicious) {
            checks.push('NEW_DEVICE');
            details.newDevice = deviceCheck.details;
        }

        // 4. Check unusual hours
        const timeCheck = await checkUnusualLoginTime();
        if (timeCheck.isSuspicious) {
            checks.push('UNUSUAL_TIME');
            details.unusualTime = timeCheck.details;
        }

        // 5. Check IP reputation
        const ipReputation = await getIPThreatLevel(ipAddress);
        if (ipReputation === 'MEDIUM' || ipReputation === 'HIGH') {
            checks.push('SUSPICIOUS_IP');
            details.ipReputation = ipReputation;
        }

        if (checks.length > 0) {
            return {
                isSuspicious: true,
                reason: checks.join(', '),
                details: details
            };
        }

        return { isSuspicious: false };
    } catch (error) {
        console.error('Error checking suspicious activity:', error);
        return { isSuspicious: false };
    }
};

// Enhanced IP Whitelist management with additional security features
export const ipWhitelistManager = {
    // Check if IP is whitelisted
    async isIPWhitelisted(ipAddress) {
        try {
            const snapshot = await firebaseDB.child('IPWhitelist').once('value');
            if (!snapshot.exists()) return false;
            
            const whitelist = snapshot.val();
            return Object.values(whitelist).some(entry => 
                entry.ip === ipAddress && entry.active === true
            );
        } catch (error) {
            console.error('Error checking IP whitelist:', error);
            return false;
        }
    },

    // Check if IP is blacklisted
    async isIPBlacklisted(ipAddress) {
        try {
            const snapshot = await firebaseDB.child('IPBlacklist').once('value');
            if (!snapshot.exists()) return false;
            
            const blacklist = snapshot.val();
            return Object.values(blacklist).some(entry => 
                entry.ip === ipAddress && entry.active === true
            );
        } catch (error) {
            console.error('Error checking IP blacklist:', error);
            return false;
        }
    },

    // Add IP to whitelist
    async addToWhitelist(ipAddress, description = '', addedBy = 'system') {
        try {
            const result = await firebaseDB.child('IPWhitelist').push({
                ip: ipAddress,
                description: description,
                active: true,
                createdAt: new Date().toISOString(),
                createdBy: addedBy,
                lastModified: new Date().toISOString()
            });

            // Log the security event in LoginData
            await firebaseDB.child('LoginData').push({
                type: 'IP_WHITELIST_ADDED',
                ipAddress: ipAddress,
                description: description,
                addedBy: addedBy,
                timestamp: new Date().toISOString(),
                loginTime: new Date().toISOString(),
                severity: 'LOW',
                status: 'INFO'
            });

            return { success: true, id: result.key };
        } catch (error) {
            console.error('Error adding IP to whitelist:', error);
            return { success: false, error: error.message };
        }
    },

    // Remove IP from whitelist
    async removeFromWhitelist(ipId, removedBy = 'system') {
        try {
            const snapshot = await firebaseDB.child(`IPWhitelist/${ipId}`).once('value');
            const ipData = snapshot.val();
            
            await firebaseDB.child(`IPWhitelist/${ipId}`).remove();

            // Log the security event in LoginData
            await firebaseDB.child('LoginData').push({
                type: 'IP_WHITELIST_REMOVED',
                ipAddress: ipData?.ip,
                ipId: ipId,
                removedBy: removedBy,
                timestamp: new Date().toISOString(),
                loginTime: new Date().toISOString(),
                severity: 'LOW',
                status: 'INFO'
            });

            return { success: true };
        } catch (error) {
            console.error('Error removing IP from whitelist:', error);
            return { success: false, error: error.message };
        }
    },

    // Get all whitelisted IPs
    async getWhitelistedIPs() {
        try {
            const snapshot = await firebaseDB.child('IPWhitelist').once('value');
            if (!snapshot.exists()) return {};
            
            const whitelist = snapshot.val();
            const formattedList = {};
            
            Object.entries(whitelist).forEach(([id, data]) => {
                formattedList[id] = {
                    id,
                    ...data
                };
            });
            
            return formattedList;
        } catch (error) {
            console.error('Error getting whitelisted IPs:', error);
            return {};
        }
    },

    // Toggle IP active status
    async toggleIPStatus(ipId, isActive, modifiedBy = 'system') {
        try {
            await firebaseDB.child(`IPWhitelist/${ipId}/active`).set(isActive);
            await firebaseDB.child(`IPWhitelist/${ipId}/lastModified`).set(new Date().toISOString());

            // Log the security event in LoginData
            await firebaseDB.child('LoginData').push({
                type: 'IP_WHITELIST_TOGGLED',
                ipId: ipId,
                newStatus: isActive,
                modifiedBy: modifiedBy,
                timestamp: new Date().toISOString(),
                loginTime: new Date().toISOString(),
                severity: 'LOW',
                status: 'INFO'
            });

            return { success: true };
        } catch (error) {
            console.error('Error toggling IP status:', error);
            return { success: false, error: error.message };
        }
    },

    // Get restriction setting
    async getRestrictionSetting() {
        try {
            const snapshot = await firebaseDB.child('IPRestrictionSettings').once('value');
            if (snapshot.exists()) {
                return snapshot.val();
            }
            // Default setting
            return { enabled: false, strictMode: false };
        } catch (error) {
            console.error('Error getting restriction setting:', error);
            return { enabled: false, strictMode: false };
        }
    },

    // Set restriction setting
    async setRestrictionSetting(enabled, strictMode = false) {
        try {
            await firebaseDB.child('IPRestrictionSettings').set({ 
                enabled, 
                strictMode,
                lastModified: new Date().toISOString()
            });

            // Log the security event in LoginData
            await firebaseDB.child('LoginData').push({
                type: 'IP_RESTRICTION_CHANGED',
                enabled: enabled,
                strictMode: strictMode,
                timestamp: new Date().toISOString(),
                loginTime: new Date().toISOString(),
                severity: 'MEDIUM',
                status: 'INFO'
            });

            return { success: true };
        } catch (error) {
            console.error('Error setting restriction:', error);
            return { success: false, error: error.message };
        }
    },

    // Add IP to blacklist
    async addToBlacklist(ipAddress, reason = '', addedBy = 'system') {
        try {
            const result = await firebaseDB.child('IPBlacklist').push({
                ip: ipAddress,
                reason: reason,
                active: true,
                createdAt: new Date().toISOString(),
                createdBy: addedBy,
                threatLevel: 'HIGH'
            });

            // Log the security event in LoginData
            await firebaseDB.child('LoginData').push({
                type: 'IP_BLACKLISTED',
                ipAddress: ipAddress,
                reason: reason,
                addedBy: addedBy,
                timestamp: new Date().toISOString(),
                loginTime: new Date().toISOString(),
                severity: 'HIGH',
                status: 'BLOCKED'
            });

            return { success: true, id: result.key };
        } catch (error) {
            console.error('Error adding IP to blacklist:', error);
            return { success: false, error: error.message };
        }
    }
};


// Enhanced location detection
export const getEnhancedLocationFromIP = async (ipAddress) => {
    try {
        if (!ipAddress || ipAddress === 'Unknown') {
            return getDefaultLocationData();
        }

        // Use only reliable IP geolocation service
        try {
            const response = await fetch(`https://ipapi.co/${ipAddress}/json/`);
            const data = await response.json();
            
            if (data.country || data.city) {
                return {
                    country: data.country_name || data.country || 'Unknown',
                    city: data.city || 'Unknown',
                    region: data.region || data.regionName || 'Unknown',
                    timezone: data.timezone || 'Unknown',
                    isp: data.org || data.isp || 'Unknown',
                    coordinates: data.latitude && data.longitude ? {
                        lat: parseFloat(data.latitude),
                        lng: parseFloat(data.longitude)
                    } : null,
                    asn: data.asn || 'Unknown',
                    reverseDNS: data.reverse || 'Unknown'
                };
            }
        } catch (error) {
            console.warn('Primary IP geolocation failed, using fallback');
        }

        // Fallback service
        try {
            const response = await fetch(`https://api.country.is/${ipAddress}`);
            const data = await response.json();
            
            return {
                country: data.country || 'Unknown',
                city: 'Unknown',
                region: 'Unknown',
                timezone: 'Unknown',
                isp: 'Unknown',
                coordinates: null,
                asn: 'Unknown',
                reverseDNS: 'Unknown'
            };
        } catch (error) {
            console.warn('Fallback IP geolocation failed');
        }

        return getDefaultLocationData();
    } catch (error) {
        console.error('Error getting enhanced location from IP:', error);
        return getDefaultLocationData();
    }
};

// Security context analysis
export const getSecurityContext = async (userData, ipAddress) => {
    try {
        let securityScore = 100; // Start with perfect score
        let riskFactors = [];

        // 1. Check user role (admins have higher scrutiny)
        const isAdmin = userData.userType === 'admin' || userData.isAdmin;
        if (isAdmin) {
            securityScore -= 10; // Admin accounts are higher risk
            riskFactors.push('ADMIN_ACCOUNT');
        }

        // 2. Check IP threat level
        const ipThreatLevel = await getIPThreatLevel(ipAddress);
        if (ipThreatLevel === 'HIGH') {
            securityScore -= 30;
            riskFactors.push('HIGH_RISK_IP');
        } else if (ipThreatLevel === 'MEDIUM') {
            securityScore -= 15;
            riskFactors.push('MEDIUM_RISK_IP');
        }

        // 3. Check login frequency
        const loginFrequency = await getUserLoginFrequency(userData.uid);
        if (loginFrequency > 10) { // More than 10 logins in last hour
            securityScore -= 20;
            riskFactors.push('HIGH_LOGIN_FREQUENCY');
        }

        // 4. Check geographic consistency
        const geoConsistency = await checkGeographicConsistency(userData.uid, ipAddress);
        if (!geoConsistency.isConsistent) {
            securityScore -= 25;
            riskFactors.push('GEOGRAPHIC_INCONSISTENCY');
        }

        // Determine risk level
        let riskLevel = 'LOW';
        if (securityScore < 60) riskLevel = 'HIGH';
        else if (securityScore < 80) riskLevel = 'MEDIUM';

        return {
            securityScore: Math.max(0, securityScore), // Ensure non-negative
            riskLevel,
            riskFactors,
            isAdmin
        };
    } catch (error) {
        console.error('Error getting security context:', error);
        return {
            securityScore: 50, // Default medium score on error
            riskLevel: 'MEDIUM',
            riskFactors: ['ERROR_IN_ANALYSIS'],
            isAdmin: false
        };
    }
};

// Helper functions
const getDefaultLocationData = () => ({
    country: 'Unknown',
    city: 'Unknown',
    region: 'Unknown',
    timezone: 'Unknown',
    isp: 'Unknown',
    coordinates: null,
    asn: 'Unknown',
    reverseDNS: 'Unknown'
});

export const getClientIP = async () => {
    try {
        // Try multiple IP detection services
        const ipServices = [
            'https://api.ipify.org?format=json',
            'https://api64.ipify.org?format=json',
            'https://icanhazip.com/'
        ];

        for (const service of ipServices) {
            try {
                const response = await fetch(service);
                if (service.includes('icanhazip')) {
                    const text = await response.text();
                    return text.trim();
                } else {
                    const data = await response.json();
                    return data.ip;
                }
            } catch (error) {
                console.warn(`IP service failed: ${service}`, error);
                continue;
            }
        }
        return 'Unknown';
    } catch (error) {
        console.error('Error getting client IP:', error);
        return 'Unknown';
    }
};

const getBrowserInfo = (userAgent) => {
    if (!userAgent) return 'Unknown';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    return 'Other';
};

const getDeviceType = (userAgent) => {
    if (!userAgent) return 'Unknown';
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) return 'Mobile';
    if (/Tablet/.test(userAgent)) return 'Tablet';
    return 'Desktop';
};

const generateSessionId = () => {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
};

// Security analysis functions
const checkRapidSuccessiveLogins = async (userId, ipAddress) => {
    try {
        const oneMinuteAgo = Date.now() - 60000;
        const snapshot = await firebaseDB.child('LoginLogs')
            .orderByChild('userId')
            .equalTo(userId)
            .once('value');

        if (snapshot.exists()) {
            const logins = snapshot.val();
            const recentLogins = Object.values(logins).filter(login => 
                login.userId === userId && login.timestamp > oneMinuteAgo
            );

            if (recentLogins.length >= 3) {
                return {
                    isSuspicious: true,
                    details: `${recentLogins.length} logins in last minute`
                };
            }
        }
        return { isSuspicious: false };
    } catch (error) {
        console.error('Error checking rapid logins:', error);
        return { isSuspicious: false };
    }
};

const checkGeographicAnomaly = async (userId, currentIp) => {
    try {
        // Get user's last 5 logins
        const snapshot = await firebaseDB.child('LoginLogs')
            .orderByChild('userId')
            .equalTo(userId)
            .limitToLast(5)
            .once('value');

        if (snapshot.exists()) {
            const logins = Object.values(snapshot.val());
            const uniqueCountries = new Set(logins.map(login => login.country));
            
            if (uniqueCountries.size >= 3) {
                return {
                    isSuspicious: true,
                    details: `Logged in from ${uniqueCountries.size} different countries recently`
                };
            }
        }
        return { isSuspicious: false };
    } catch (error) {
        console.error('Error checking geographic anomaly:', error);
        return { isSuspicious: false };
    }
};

const checkNewDevice = async (userId, userAgent) => {
    try {
        const snapshot = await firebaseDB.child('LoginLogs')
            .orderByChild('userId')
            .equalTo(userId)
            .limitToLast(10)
            .once('value');

        if (snapshot.exists()) {
            const logins = Object.values(snapshot.val());
            const previousUserAgents = new Set(logins.map(login => login.userAgent));
            
            if (!previousUserAgents.has(userAgent) && previousUserAgents.size > 0) {
                return {
                    isSuspicious: true,
                    details: 'New device/browser detected'
                };
            }
        }
        return { isSuspicious: false };
    } catch (error) {
        console.error('Error checking new device:', error);
        return { isSuspicious: false };
    }
};

const checkUnusualLoginTime = () => {
    const now = new Date();
    const hour = now.getHours();
    
    // Consider 10 PM to 5 AM as unusual hours
    if (hour >= 22 || hour <= 5) {
        return {
            isSuspicious: true,
            details: `Login at unusual hour: ${hour}:00`
        };
    }
    return { isSuspicious: false };
};

const getIPThreatLevel = async (ipAddress) => {
    try {
        // Check if IP has been involved in suspicious activities
        const snapshot = await firebaseDB.child('SecurityEvents')
            .orderByChild('ipAddress')
            .equalTo(ipAddress)
            .once('value');

        if (snapshot.exists()) {
            const events = Object.values(snapshot.val());
            const blockedEvents = events.filter(event => 
                event.type === 'BLOCKED_LOGIN' || event.type === 'SUSPICIOUS_LOGIN'
            ).length;

            if (blockedEvents >= 3) return 'HIGH';
            if (blockedEvents >= 1) return 'MEDIUM';
        }
        return 'LOW';
    } catch (error) {
        console.error('Error getting IP threat level:', error);
        return 'LOW';
    }
};

const updateIPThreatLevel = async (ipAddress, eventType) => {
    try {
        await firebaseDB.child('IPThreatIntelligence').child(ipAddress).set({
            lastEvent: eventType,
            lastSeen: new Date().toISOString(),
            eventCount: firebaseDB.database.ServerValue.increment(1)
        });
    } catch (error) {
        console.error('Error updating IP threat level:', error);
    }
};

// Update user login history to use LoginData
const updateUserLoginHistory = async (userId, loginData) => {
    try {
        await firebaseDB.child('LoginData').child(userId).push(loginData);

        // Keep only last 50 logins per user
        const snapshot = await firebaseDB.child('LoginData').child(userId)
            .orderByKey()
            .limitToLast(50)
            .once('value');

        const logins = snapshot.val();
        if (logins && Object.keys(logins).length > 50) {
            const keys = Object.keys(logins);
            const keysToDelete = keys.slice(0, keys.length - 50);
            const updates = {};
            keysToDelete.forEach(key => {
                updates[key] = null;
            });
            await firebaseDB.child('LoginData').child(userId).update(updates);
        }
    } catch (error) {
        console.error('Error updating user login history:', error);
    }
};


// Update IP analytics to use LoginData
const updateIPAnalytics = async (ipAddress, userId, locationData) => {
    try {
        const ipKey = ipAddress.replace(/[\.\:]/g, '_');
        await firebaseDB.child('LoginData').child('IPAnalytics').child(ipKey).set({
            ip: ipAddress,
            lastSeen: new Date().toISOString(),
            totalLogins: firebaseDB.database.ServerValue.increment(1),
            uniqueUsers: firebaseDB.database.ServerValue.increment(1),
            country: locationData.country,
            city: locationData.city,
            isp: locationData.isp,
            lastUserId: userId
        });
    } catch (error) {
        console.error('Error updating IP analytics:', error);
    }
};

const getUserLoginFrequency = async (userId) => {
    try {
        const oneHourAgo = Date.now() - 3600000;
        const snapshot = await firebaseDB.child('LoginLogs')
            .orderByChild('userId')
            .equalTo(userId)
            .once('value');

        if (!snapshot.exists()) return 0;
        
        const logins = snapshot.val();
        const recentLogins = Object.values(logins).filter(login => 
            login.timestamp > oneHourAgo
        );
        
        return recentLogins.length;
    } catch (error) {
        console.error('Error getting user login frequency:', error);
        return 0;
    }
};

const checkGeographicConsistency = async (userId, currentIp) => {
    try {
        const snapshot = await firebaseDB.child('LoginLogs')
            .orderByChild('userId')
            .equalTo(userId)
            .limitToLast(5)
            .once('value');

        if (snapshot.exists()) {
            const logins = Object.values(snapshot.val());
            const countries = logins.map(login => login.country);
            const uniqueCountries = new Set(countries);
            
            return {
                isConsistent: uniqueCountries.size <= 2,
                countryCount: uniqueCountries.size,
                countries: Array.from(uniqueCountries)
            };
        }
        return { isConsistent: true, countryCount: 0, countries: [] };
    } catch (error) {
        console.error('Error checking geographic consistency:', error);
        return { isConsistent: true, countryCount: 0, countries: [] };
    }
};

// Export additional utility functions
export const securityUtils = {
    checkRapidSuccessiveLogins,
    checkGeographicAnomaly,
    checkNewDevice,
    checkUnusualLoginTime,
    getIPThreatLevel,
    getUserLoginFrequency,
    checkGeographicConsistency
};

export default {
    trackUserLogin,
    checkIPRestriction,
    checkSuspiciousActivity,
    ipWhitelistManager,
    getEnhancedLocationFromIP,
    getSecurityContext,
    getClientIP,
    securityUtils
};