import firebaseDB from '../../firebase';

export const activityService = {
  // Get user activities with pagination
  async getUserActivities(userId, limit = 50) {
    try {
      const snapshot = await firebaseDB.child('LoginData')
        .orderByChild('userId')
        .equalTo(userId)
        .limitToLast(limit)
        .once('value');

      if (!snapshot.exists()) return [];

      const activities = snapshot.val();
      return Object.entries(activities)
        .map(([id, data]) => ({
          id,
          ...data
        }))
        .sort((a, b) => new Date(b.loginTime) - new Date(a.loginTime));
    } catch (error) {
      console.error('Error getting user activities:', error);
      return [];
    }
  },

  // Get user sessions
  async getUserSessions(userId) {
    try {
      const activities = await this.getUserActivities(userId, 100);
      
      // Group by session ID
      const sessionMap = new Map();
      activities.forEach(activity => {
        if (activity.sessionId) {
          if (!sessionMap.has(activity.sessionId) || 
              new Date(activity.loginTime) > new Date(sessionMap.get(activity.sessionId).loginTime)) {
            sessionMap.set(activity.sessionId, activity);
          }
        }
      });

      return Array.from(sessionMap.values())
        .sort((a, b) => new Date(b.loginTime) - new Date(a.loginTime));
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return [];
    }
  },

  // Log activity event
  async logActivity(event) {
    try {
      const result = await firebaseDB.child('ActivityLogs').push({
        ...event,
        timestamp: new Date().toISOString()
      });
      return { success: true, id: result.key };
    } catch (error) {
      console.error('Error logging activity:', error);
      return { success: false, error: error.message };
    }
  },

  // Get activity statistics
  async getActivityStats(userId, period = '30d') {
    try {
      const activities = await this.getUserActivities(userId, 1000);
      const now = new Date();
      let cutoffDate;

      switch (period) {
        case '7d':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffDate = new Date(0); // All time
      }

      const filteredActivities = activities.filter(a => new Date(a.loginTime) >= cutoffDate);

      const stats = {
        total: filteredActivities.length,
        uniqueDevices: new Set(filteredActivities.map(a => a.userAgent)).size,
        uniqueLocations: new Set(filteredActivities.map(a => `${a.city}, ${a.country}`)).size,
        suspiciousCount: filteredActivities.filter(a => a.status === 'SUSPICIOUS').length,
        failedCount: filteredActivities.filter(a => a.status === 'FAILED').length,
        byHour: this.groupByHour(filteredActivities),
        byDay: this.groupByDay(filteredActivities)
      };

      return stats;
    } catch (error) {
      console.error('Error getting activity stats:', error);
      return null;
    }
  },

  // Helper methods for grouping
  groupByHour(activities) {
    const hours = Array(24).fill(0);
    activities.forEach(activity => {
      const hour = new Date(activity.loginTime).getHours();
      hours[hour]++;
    });
    return hours;
  },

  groupByDay(activities) {
    const days = {};
    activities.forEach(activity => {
      const date = new Date(activity.loginTime).toDateString();
      days[date] = (days[date] || 0) + 1;
    });
    return days;
  },

  // Search activities
  async searchActivities(userId, query, filters = {}) {
    try {
      let activities = await this.getUserActivities(userId, 1000);

      // Apply filters
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        activities = activities.filter(a => new Date(a.loginTime) >= fromDate);
      }
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        activities = activities.filter(a => new Date(a.loginTime) <= toDate);
      }
      if (filters.deviceType) {
        activities = activities.filter(a => a.deviceInfo?.deviceType === filters.deviceType);
      }
      if (filters.browser) {
        activities = activities.filter(a => a.deviceInfo?.browser === filters.browser);
      }
      if (filters.status) {
        activities = activities.filter(a => a.status === filters.status);
      }

      // Apply search query
      if (query) {
        const term = query.toLowerCase();
        activities = activities.filter(a => 
          a.ipAddress.includes(term) ||
          a.city?.toLowerCase().includes(term) ||
          a.country?.toLowerCase().includes(term) ||
          a.deviceInfo?.browser?.toLowerCase().includes(term)
        );
      }

      return activities;
    } catch (error) {
      console.error('Error searching activities:', error);
      return [];
    }
  }
};