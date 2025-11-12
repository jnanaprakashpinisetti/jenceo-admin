// utils/loginTracker.js - Updated version with location tracking
import firebaseDB from '../../firebase';

export const trackUserLogin = async (userData, ipAddress = 'Unknown') => {
    try {
        // Ensure we have valid user data
        if (!userData) {
            console.error('No user data provided for login tracking');
            return false;
        }

        // Get location data based on IP
        const locationData = await getLocationFromIP(ipAddress);
        
        const loginData = {
            userId: userData.uid || userData.userId || 'unknown',
            email: userData.email || 'unknown@example.com',
            displayName: userData.displayName || userData.name || userData.username || 'Unknown User',
            ipAddress: ipAddress,
            userAgent: navigator.userAgent,
            loginTime: new Date().toISOString(),
            timestamp: Date.now(),
            location: locationData,
            country: locationData.country || 'Unknown',
            city: locationData.city || 'Unknown',
            region: locationData.region || 'Unknown',
            timezone: locationData.timezone || 'Unknown',
            isp: locationData.isp || 'Unknown'
        };

        console.log('Tracking login:', loginData);

        const result = await firebaseDB.child('LoginLogs').push(loginData);
        
        if (result && result.key) {
            console.log('Login tracked successfully with ID:', result.key);
            return true;
        } else {
            console.error('Failed to push login data to Firebase');
            return false;
        }
    } catch (error) {
        console.error('Error tracking login:', error);
        return false;
    }
};

export const getClientIP = async () => {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Error getting IP:', error);
        return 'Unknown';
    }
};

// New function to get location from IP
export const getLocationFromIP = async (ipAddress) => {
    try {
        if (!ipAddress || ipAddress === 'Unknown') {
            return {
                country: 'Unknown',
                city: 'Unknown',
                region: 'Unknown',
                timezone: 'Unknown',
                isp: 'Unknown'
            };
        }

        // Using ipapi.co for location data (free tier available)
        const response = await fetch(`https://ipapi.co/${ipAddress}/json/`);
        const data = await response.json();
        
        return {
            country: data.country_name || 'Unknown',
            city: data.city || 'Unknown',
            region: data.region || 'Unknown',
            timezone: data.timezone || 'Unknown',
            isp: data.org || 'Unknown',
            latitude: data.latitude,
            longitude: data.longitude
        };
    } catch (error) {
        console.error('Error getting location from IP:', error);
        return {
            country: 'Unknown',
            city: 'Unknown',
            region: 'Unknown',
            timezone: 'Unknown',
            isp: 'Unknown'
        };
    }
};

// IP Whitelist management
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

    // Add IP to whitelist
    async addToWhitelist(ipAddress, description = '') {
        try {
            const result = await firebaseDB.child('IPWhitelist').push({
                ip: ipAddress,
                description: description,
                active: true,
                createdAt: new Date().toISOString(),
                createdBy: 'admin' // You might want to pass user info here
            });
            return { success: true, id: result.key };
        } catch (error) {
            console.error('Error adding IP to whitelist:', error);
            return { success: false, error: error.message };
        }
    },

    // Remove IP from whitelist
    async removeFromWhitelist(ipId) {
        try {
            await firebaseDB.child(`IPWhitelist/${ipId}`).remove();
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
    async toggleIPStatus(ipId, isActive) {
        try {
            await firebaseDB.child(`IPWhitelist/${ipId}/active`).set(isActive);
            return { success: true };
        } catch (error) {
            console.error('Error toggling IP status:', error);
            return { success: false, error: error.message };
        }
    }
};