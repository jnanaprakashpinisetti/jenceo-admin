// utils/getUserIP.js
export const getUserIP = async () => {
    try {
        // Method 1: Try external service
        const response = await fetch('https://api.ipify.org?format=json');
        if (!response.ok) throw new Error('API response not ok');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        try {
            // Method 2: Try another service
            const response = await fetch('https://api64.ipify.org?format=json');
            if (!response.ok) throw new Error('API response not ok');
            const data = await response.json();
            return data.ip;
        } catch (error2) {
            console.error('Could not fetch IP:', error2);
            // Fallback to local IP detection
            try {
                const response = await fetch('https://icanhazip.com/');
                if (response.ok) {
                    const ip = await response.text();
                    return ip.trim();
                }
            } catch (error3) {
                // Final fallback
                console.error('All IP services failed:', error3);
                return 'unknown';
            }
            return 'unknown';
        }
    }
};

