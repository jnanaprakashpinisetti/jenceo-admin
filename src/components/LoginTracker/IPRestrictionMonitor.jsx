// components/IPRestrictionMonitor.jsx
import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { checkIPRestriction, getClientIP } from './trackUserLogin';

const IPRestrictionMonitor = () => {
  const { currentUser, logout } = useAuth();

  useEffect(() => {
    const checkRestriction = async () => {
      if (currentUser) {
        try {
          const clientIP = await getClientIP();
          const restrictionCheck = await checkIPRestriction(clientIP);
          
          if (restrictionCheck.restricted) {
            // Auto-logout and show message
            await logout();
            
            // You can use a notification system here
            alert(`Your session has been terminated because your IP address (${clientIP}) is no longer authorized. Please contact administrator.`);
            
            // Redirect to login page
            window.location.href = '/login?message=ip_restricted';
          }
        } catch (error) {
          console.error('Error checking IP restriction:', error);
        }
      }
    };

    // Check on component mount
    checkRestriction();

    // Set up interval for ongoing monitoring
    const intervalId = setInterval(checkRestriction, 30000); // Check every 30 seconds

    return () => clearInterval(intervalId);
  }, [currentUser, logout]);

  return null; // This component doesn't render anything
};

export default IPRestrictionMonitor;