// src/utils/getUserIP.js
export const getUserIP = async () => {
    try {
        // Try multiple IP detection services with fallbacks
        const ipServices = [
            {
                url: 'https://api.ipify.org?format=json',
                parser: async (response) => {
                    const data = await response.json();
                    return data.ip;
                }
            },
            {
                url: 'https://api64.ipify.org?format=json',
                parser: async (response) => {
                    const data = await response.json();
                    return data.ip;
                }
            },
            {
                url: 'https://icanhazip.com/',
                parser: async (response) => {
                    const text = await response.text();
                    return text.trim();
                }
            },
            {
                url: 'https://api.my-ip.io/ip.json',
                parser: async (response) => {
                    const data = await response.json();
                    return data.ip;
                }
            }
        ];

        // Try each service sequentially
        for (const service of ipServices) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
                
                const response = await fetch(service.url, { 
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    const ip = await service.parser(response);
                    if (ip && ip !== '0.0.0.0' && ip !== '127.0.0.1') {
                        console.log('IP detected via', service.url, ':', ip);
                        return ip;
                    }
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.warn(`IP service ${service.url} failed:`, error.message);
                }
                continue;
            }
        }

        // Fallback to local IP detection using WebRTC (client-side only)
        try {
            const localIP = await getLocalIP();
            if (localIP) {
                console.log('Using local IP from WebRTC:', localIP);
                return localIP;
            }
        } catch (error) {
            console.warn('WebRTC IP detection failed:', error);
        }

        // Ultimate fallback: use window.location for internal apps
        if (typeof window !== 'undefined') {
            const hostname = window.location.hostname;
            if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
                return hostname;
            }
        }

        return 'unknown';
    } catch (error) {
        console.error('All IP detection methods failed:', error);
        return 'unknown';
    }
};

// WebRTC local IP detection
const getLocalIP = () => {
    return new Promise((resolve, reject) => {
        // Skip WebRTC if not in browser or privacy settings block it
        if (typeof window === 'undefined' || !window.RTCPeerConnection) {
            reject(new Error('WebRTC not available'));
            return;
        }

        const RTCPeerConnection = window.RTCPeerConnection || 
                                 window.mozRTCPeerConnection || 
                                 window.webkitRTCPeerConnection;
        
        if (!RTCPeerConnection) {
            reject(new Error('RTCPeerConnection not supported'));
            return;
        }

        const pc = new RTCPeerConnection({ iceServers: [] });
        const ips = new Set();
        
        pc.createDataChannel(''); // Create a data channel
        pc.createOffer()
            .then(offer => pc.setLocalDescription(offer))
            .catch(reject);
        
        pc.onicecandidate = (event) => {
            if (!event.candidate) {
                // All ICE candidates gathered
                if (ips.size > 0) {
                    resolve(Array.from(ips)[0]);
                } else {
                    reject(new Error('No IP found via WebRTC'));
                }
                return;
            }
            
            const candidate = event.candidate.candidate;
            const regex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
            const match = candidate.match(regex);
            
            if (match) {
                const ip = match[1];
                // Filter out internal and invalid IPs
                if (!ip.startsWith('0.') && 
                    !ip.startsWith('127.') && 
                    !ip.startsWith('169.254.') && 
                    !ip.startsWith('255.')) {
                    ips.add(ip);
                }
            }
        };
        
        // Timeout after 3 seconds
        setTimeout(() => {
            if (ips.size > 0) {
                resolve(Array.from(ips)[0]);
            } else {
                reject(new Error('WebRTC timeout'));
            }
            pc.close();
        }, 3000);
    });
};

// Alternative: Get IP from headers (for server-side or proxy scenarios)
export const getIPFromHeaders = (headers = {}) => {
    // Common header names used by proxies and load balancers
    const headerNames = [
        'x-forwarded-for',
        'x-real-ip',
        'cf-connecting-ip', // Cloudflare
        'fastly-client-ip', // Fastly
        'true-client-ip', // Akamai
        'x-cluster-client-ip',
        'x-forwarded',
        'forwarded-for',
        'forwarded'
    ];
    
    // If headers object is provided (server-side)
    if (headers && typeof headers === 'object') {
        for (const header of headerNames) {
            const value = headers[header] || headers[header.toLowerCase()];
            if (value) {
                // Handle comma-separated lists (x-forwarded-for: client, proxy1, proxy2)
                const ips = value.split(',').map(ip => ip.trim());
                // Return the first non-internal IP
                for (const ip of ips) {
                    if (ip && ip !== '127.0.0.1' && ip !== '::1' && !ip.startsWith('192.168.')) {
                        return ip;
                    }
                }
            }
        }
    }
    
    return null;
};

// Utility function to validate IP address format
export const isValidIP = (ip) => {
    if (!ip || typeof ip !== 'string') return false;
    
    // IPv4 pattern
    const ipv4Pattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    
    // IPv6 pattern (simplified)
    const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
};

// Get enhanced IP info including location
export const getEnhancedIPInfo = async (ipAddress) => {
    if (!ipAddress || ipAddress === 'unknown' || !isValidIP(ipAddress)) {
        return {
            ip: ipAddress || 'unknown',
            isValid: false,
            location: null,
            isp: null,
            threatLevel: 'UNKNOWN'
        };
    }
    
    try {
        // Try ipapi.co first (free tier, 1000 requests/day)
        const response = await fetch(`https://ipapi.co/${ipAddress}/json/`, {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            return {
                ip: ipAddress,
                isValid: true,
                location: {
                    country: data.country_name || data.country,
                    countryCode: data.country_code,
                    region: data.region || data.region_code,
                    city: data.city,
                    postal: data.postal,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    timezone: data.timezone
                },
                isp: data.org || data.asn,
                asn: data.asn,
                threatLevel: await checkIPThreatLevel(ipAddress)
            };
        }
    } catch (error) {
        console.warn('ipapi.co failed, trying fallback:', error);
    }
    
    // Fallback to ipinfo.io
    try {
        const response = await fetch(`https://ipinfo.io/${ipAddress}/json`);
        if (response.ok) {
            const data = await response.json();
            const [lat, lng] = data.loc ? data.loc.split(',') : [null, null];
            
            return {
                ip: ipAddress,
                isValid: true,
                location: {
                    country: data.country,
                    region: data.region,
                    city: data.city,
                    postal: data.postal,
                    latitude: lat ? parseFloat(lat) : null,
                    longitude: lng ? parseFloat(lng) : null,
                    timezone: data.timezone
                },
                isp: data.org,
                asn: data.asn,
                threatLevel: await checkIPThreatLevel(ipAddress)
            };
        }
    } catch (error) {
        console.warn('ipinfo.io failed:', error);
    }
    
    // Minimal info if all APIs fail
    return {
        ip: ipAddress,
        isValid: true,
        location: null,
        isp: null,
        threatLevel: 'UNKNOWN'
    };
};

// Check IP threat level from local database
const checkIPThreatLevel = async (ipAddress) => {
    try {
        // In a real application, you would check against your threat database
        // For now, return a mock threat level
        const suspiciousPatterns = [
            /^185\./, // Known VPN ranges
            /^192\./, // Internal
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Internal
            /^10\./, // Internal
            /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./, // CGNAT
        ];
        
        // Check if IP matches suspicious patterns
        for (const pattern of suspiciousPatterns) {
            if (pattern.test(ipAddress)) {
                return 'MEDIUM';
            }
        }
        
        return 'LOW';
    } catch (error) {
        return 'UNKNOWN';
    }
};

// Cache IP to avoid repeated API calls
const ipCache = new Map();

export const getCachedIP = async () => {
    const cacheKey = 'user_ip';
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
        return cached;
    }
    
    const ip = await getUserIP();
    if (ip && ip !== 'unknown') {
        sessionStorage.setItem(cacheKey, ip);
        // Cache for 1 hour
        setTimeout(() => {
            sessionStorage.removeItem(cacheKey);
        }, 60 * 60 * 1000);
    }
    
    return ip;
};

export default getUserIP;