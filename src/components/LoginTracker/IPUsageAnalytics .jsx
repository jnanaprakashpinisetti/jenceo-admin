// components/DashBoard/IPUsageAnalytics.jsx
import React, { useMemo, useState } from 'react';

const IPUsageAnalytics = ({ loginLogs }) => {
    const [selectedIP, setSelectedIP] = useState(null);
    const [showModal, setShowModal] = useState(false);


    // Improved data extraction functions
    const getActualUsers = (ipData) => {
        try {
            if (!ipData.users) return [];

            // Handle object case where keys are usernames
            if (typeof ipData.users === 'object' && !Array.isArray(ipData.users)) {
                return Object.entries(ipData.users).map(([username, count]) => ({
                    username: username,
                    count: count || 1
                }));
            }

            // Handle array case
            if (Array.isArray(ipData.users)) {
                const userCounts = {};
                ipData.users.forEach(user => {
                    userCounts[user] = (userCounts[user] || 0) + 1;
                });
                return Object.entries(userCounts).map(([username, count]) => ({
                    username,
                    count
                }));
            }

            return [];
        } catch (error) {
            console.error('Error parsing users:', error);
            return [];
        }
    };

    const getActualBrowsers = (ipData) => {
        try {
            if (!ipData.browsers) return [];

            if (typeof ipData.browsers === 'object' && !Array.isArray(ipData.browsers)) {
                return Object.entries(ipData.browsers).map(([browser, count]) => ({
                    name: browser,
                    count: count || 1
                }));
            }

            if (Array.isArray(ipData.browsers)) {
                const browserCounts = {};
                ipData.browsers.forEach(browser => {
                    browserCounts[browser] = (browserCounts[browser] || 0) + 1;
                });
                return Object.entries(browserCounts).map(([name, count]) => ({
                    name,
                    count
                }));
            }

            return [];
        } catch (error) {
            console.error('Error parsing browsers:', error);
            return [];
        }
    };

    const getActualDevices = (ipData) => {
        try {
            if (!ipData.devices) return [];

            let devicesArray = [];

            // Handle different data structures
            if (typeof ipData.devices === 'object' && !Array.isArray(ipData.devices)) {
                devicesArray = Object.keys(ipData.devices);
            } else if (Array.isArray(ipData.devices)) {
                devicesArray = ipData.devices;
            } else {
                return [];
            }

            const deviceCounts = {};
            devicesArray.forEach(device => {
                deviceCounts[device] = (deviceCounts[device] || 0) + 1;
            });

            return Object.entries(deviceCounts).map(([userAgent, count]) => ({
                userAgent,
                type: detectDeviceType(userAgent),
                count
            }));
        } catch (error) {
            console.error('Error parsing devices:', error);
            return [];
        }
    };

    // Improved device info extraction
    const extractDeviceInfo = (userAgent) => {
        if (!userAgent) return 'Unknown Device';

        const ua = userAgent.toLowerCase();

        // Extract OS
        let os = 'Unknown OS';
        if (ua.includes('windows')) os = 'Windows';
        else if (ua.includes('mac os')) os = 'macOS';
        else if (ua.includes('linux')) os = 'Linux';
        else if (ua.includes('android')) os = 'Android';
        else if (ua.includes('ios') || ua.includes('iphone')) os = 'iOS';

        // Extract browser
        let browser = 'Unknown Browser';
        if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
        else if (ua.includes('firefox')) browser = 'Firefox';
        else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
        else if (ua.includes('edg')) browser = 'Edge';

        return `${os} • ${browser}`;
    };

    // Browser icons
    const getBrowserIcon = (browser) => {
        const browserMap = {
            'chrome': 'bi-browser-chrome',
            'firefox': 'bi-browser-firefox',
            'safari': 'bi-browser-safari',
            'edge': 'bi-browser-edge',
            'opera': 'bi-browser-opera'
        };

        const lowerBrowser = browser.toLowerCase();
        for (const [key, value] of Object.entries(browserMap)) {
            if (lowerBrowser.includes(key)) return value;
        }

        return 'bi-browser';
    };

    // Add this CSS for hover effects
    <style jsx>{`
    .hover-glow:hover {
        box-shadow: 0 0 15px rgba(255, 255, 255, 0.1);
        transition: all 0.3s ease;
    }
    .table-borderless td, .table-borderless th {
        border: none;
    }
`}</style>

    const getBrowserInfo = (userAgent) => {
        if (!userAgent) return 'Unknown';
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        return 'Other';
    };

    // Add these helper functions to your component

    // Extract unique users from the data
    const getUniqueUsers = (ipData) => {
        if (!ipData.users || typeof ipData.users === 'string') return [];
        if (Array.isArray(ipData.users)) return [...new Set(ipData.users)];
        if (typeof ipData.users === 'object') return Object.keys(ipData.users);
        return [];
    };

    // Get user login statistics
    const getUserLoginStats = (ipData) => {
        const users = getUniqueUsers(ipData);
        return users.map(username => ({
            username,
            count: ipData.userLoginCounts?.[username] || 1
        }));
    };

    // Extract and format browsers
    const getUniqueBrowsers = (ipData) => {
        if (!ipData.browsers) return [];
        if (Array.isArray(ipData.browsers)) return [...new Set(ipData.browsers)];
        if (typeof ipData.browsers === 'object') return Object.keys(ipData.browsers);
        return [];
    };

    // Get browser statistics
    const getBrowserStats = (ipData) => {
        const browsers = getUniqueBrowsers(ipData);
        return browsers.map(browser => ({
            name: browser,
            count: ipData.browserCounts?.[browser] || 1
        }));
    };

    // Format browser name for display
    const formatBrowserName = (browser) => {
        const browserMap = {
            'chrome': 'Chrome',
            'firefox': 'Firefox',
            'safari': 'Safari',
            'edge': 'Edge',
            'opera': 'Opera',
            'ie': 'Internet Explorer'
        };

        const lowerBrowser = browser.toLowerCase();
        for (const [key, value] of Object.entries(browserMap)) {
            if (lowerBrowser.includes(key)) return value;
        }

        return browser;
    };

    // Extract unique devices
    const getUniqueDevices = (ipData) => {
        if (!ipData.devices) return [];
        if (Array.isArray(ipData.devices)) return [...new Set(ipData.devices)];
        if (typeof ipData.devices === 'object') return Object.keys(ipData.devices);
        return [];
    };

    // Get device statistics with proper type detection
    const getDeviceStats = (ipData) => {
        const devices = getUniqueDevices(ipData);
        return devices.map(userAgent => ({
            userAgent,
            type: detectDeviceType(userAgent),
            count: ipData.deviceCounts?.[userAgent] || 1
        }));
    };

    // Improved device type detection
    const detectDeviceType = (userAgent) => {
        if (!userAgent) return 'Unknown';

        const ua = userAgent.toLowerCase();

        if (ua.match(/mobile|android|iphone|ipad|ipod/)) {
            if (ua.match(/tablet|ipad/)) return 'Tablet';
            return 'Mobile';
        }

        if (ua.match(/tablet|ipad/)) return 'Tablet';
        if (ua.match(/desktop|laptop|macintosh|windows/)) return 'Desktop';
        if (ua.match(/bot|crawler|spider/)) return 'Bot';
        if (ua.match(/smart-tv|tv|hbbtv|netcast/)) return 'Smart TV';

        return 'Desktop'; // Default assumption
    };

    // Device type badge colors
    const getDeviceTypeBadge = (deviceType) => {
        const badgeMap = {
            'Mobile': 'bg-primary',
            'Tablet': 'bg-info',
            'Desktop': 'bg-success',
            'Bot': 'bg-danger',
            'Smart TV': 'bg-purple',
            'Unknown': 'bg-secondary'
        };
        return badgeMap[deviceType] || 'bg-secondary';
    };

    // Device icons
    const getDeviceIcon = (deviceType) => {
        const iconMap = {
            'Mobile': 'bi-phone',
            'Tablet': 'bi-tablet',
            'Desktop': 'bi-pc',
            'Bot': 'bi-robot',
            'Smart TV': 'bi-tv',
            'Unknown': 'bi-question-circle'
        };
        return iconMap[deviceType] || 'bi-question-circle';
    };

    const ipAnalytics = useMemo(() => {
        const ipMap = new Map();

        loginLogs.forEach(log => {
            if (log.ipAddress && log.ipAddress !== 'Unknown') {
                if (ipMap.has(log.ipAddress)) {
                    const existing = ipMap.get(log.ipAddress);
                    const users = existing.users.add(log.userId || log.email);
                    const devices = existing.devices.add(log.userAgent || 'Unknown');
                    const browsers = existing.browsers.add(getBrowserInfo(log.userAgent));

                    ipMap.set(log.ipAddress, {
                        ...existing,
                        count: existing.count + 1,
                        lastSeen: new Date(log.loginTime) > new Date(existing.lastSeen) ? log.loginTime : existing.lastSeen,
                        users,
                        devices,
                        browsers
                    });
                } else {
                    ipMap.set(log.ipAddress, {
                        ip: log.ipAddress,
                        count: 1,
                        firstSeen: log.loginTime,
                        lastSeen: log.loginTime,
                        country: log.country || 'Unknown',
                        city: log.city || 'Unknown',
                        isp: log.isp || 'Unknown',
                        users: new Set([log.userId || log.email]),
                        devices: new Set([log.userAgent || 'Unknown']),
                        browsers: new Set([getBrowserInfo(log.userAgent)])
                    });
                }
            }
        });

        return Array.from(ipMap.values())
            .map(ip => ({
                ...ip,
                users: Array.from(ip.users),
                devices: Array.from(ip.devices),
                browsers: Array.from(ip.browsers),
                uniqueUsers: ip.users.size,
                uniqueDevices: ip.devices.size,
                uniqueBrowsers: ip.browsers.size
            }))
            .sort((a, b) => b.count - a.count);
    }, [loginLogs]);



    const handleIPClick = (ipData) => {
        setSelectedIP(ipData);
        setShowModal(true);
    };

    const getDeviceType = (userAgent) => {
        if (!userAgent) return 'Unknown';
        if (/Mobile|Android|iPhone|iPad/.test(userAgent)) return 'Mobile';
        return 'Desktop';
    };

    return (
        <>
            <div className="card bg-dark border-info">
                <div className="card-header bg-info bg-opacity-25 border-info">
                    <h6 className="mb-0 text-white">
                        <i className="fas fa-chart-bar me-2"></i>
                        IP Usage Analytics
                    </h6>
                </div>
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="table table-dark table-hover">
                            <thead>
                                <tr>
                                    <th>IP Address</th>
                                    <th>Total Logins</th>
                                    <th>Unique Users</th>
                                    <th>Devices</th>
                                    <th>Browsers</th>
                                    <th>Country</th>
                                    <th>City</th>
                                    <th>ISP</th>
                                    <th>First Seen</th>
                                    <th>Last Seen</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ipAnalytics.length === 0 ? (
                                    <tr>
                                        <td colSpan="10" className="text-center py-4">
                                            <i className="fas fa-inbox fa-2x text-muted mb-2"></i>
                                            <p className="text-muted">No IP usage data available</p>
                                        </td>
                                    </tr>
                                ) : (
                                    ipAnalytics.map((ip, index) => (
                                        <tr key={index} style={{ cursor: 'pointer' }} onClick={() => handleIPClick(ip)}>
                                            <td>
                                                <code className="text-warning">{ip.ip}</code>
                                            </td>
                                            <td>
                                                <span className="badge bg-primary">{ip.count}</span>
                                            </td>
                                            <td>
                                                <span className="badge bg-info">{ip.uniqueUsers}</span>
                                            </td>
                                            <td>
                                                <span className="badge bg-secondary">{ip.uniqueDevices}</span>
                                            </td>
                                            <td>
                                                <span className="badge bg-warning text-dark">{ip.uniqueBrowsers}</span>
                                            </td>
                                            <td>
                                                <small className="text-muted">{ip.country}</small>
                                            </td>
                                            <td>
                                                <small className="text-muted">{ip.city}</small>
                                            </td>
                                            <td>
                                                <small className="text-muted">{ip.isp}</small>
                                            </td>
                                            <td>
                                                <small className="text-white small-text">
                                                    {new Date(ip.firstSeen).toLocaleString()}
                                                </small>
                                            </td>
                                            <td>
                                                <small className="text-white small-text">
                                                    {new Date(ip.lastSeen).toLocaleString()}
                                                </small>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* IP Details Modal */}
            {showModal && selectedIP && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
                    <div className="modal-dialog modal-xl">
                        <div className="modal-content bg-dark border border-light   border-opacity-10 rounded-4">
                            <div className="modal-header border-bottom border-light   border-opacity-10">
                                <h5 className="modal-title text-light">
                                    <i className="bi bi-globe me-2 text-primary"></i>
                                    IP Address Analysis: <span className="text-warning">{selectedIP.ip}</span>
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    onClick={() => setShowModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                {/* Summary Cards - Clean Design */}
                                <div className="row mb-4">
                                    <div className="col-md-3 mb-3">
                                        <div className="card text-center hover-glow border-secondary  border-opacity-10 bg-secondary bg-opacity-10">
                                            <div className="card-body py-3">
                                                <i className="bi bi-person-check fs-3 text-primary mb-2"></i>
                                                <h6 className="text-light opacity-75 d-block">Total Logins</h6>
                                                <h3 className="text-primary mb-0">{selectedIP.count || 0}</h3>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-3 mb-3">
                                        <div className="card bg-primary bg-opacity-10   border-opacity-10 border-primary text-center hover-glow">
                                            <div className="card-body py-3">
                                                <i className="bi bi-people fs-3 text-info mb-2"></i>
                                                <h6 className="text-light opacity-75 d-block">Unique Users</h6>
                                                <h3 className="text-info mb-0">{selectedIP.uniqueUsers || 0}</h3>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-3 mb-3">
                                        <div className="card bg-success bg-opacity-10   border-opacity-10 border-success text-center hover-glow">
                                            <div className="card-body py-3">
                                                <i className="bi bi-phone fs-3 text-success mb-2"></i>
                                                <h6 className="text-light opacity-75 d-block">Unique Devices</h6>
                                                <h3 className="text-success mb-0">{selectedIP.uniqueDevices || 0}</h3>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-3 mb-3">
                                        <div className="card bg-warning bg-opacity-10   border-opacity-10 border-warning text-center hover-glow">
                                            <div className="card-body py-3">
                                                <i className="bi bi-browser-chrome fs-3 text-warning mb-2"></i>
                                                <h6 className="text-light opacity-75 d-block">Unique Browsers</h6>
                                                <h3 className="text-warning mb-0">{selectedIP.uniqueBrowsers || 0}</h3>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Location Information */}
                                <div className="card bg-transparent border border-secondary  border-opacity-50 mb-4">
                                    <div className="card-header bg-secondary bg-opacity-10  ">
                                        <h6 className="mb-0 text-light">
                                            <i className="bi bi-pin-map me-2 text-info"></i>
                                            Geographic Information
                                        </h6>
                                    </div>
                                    <div className="card-body">
                                        <div className="row text-center">
                                            <div className="col-md-4 mb-3">
                                                <div className="border-end border-secondary pe-3">
                                                    <small className="text-info opacity-75">COUNTRY</small>
                                                    <div className="text-light fs-6">{selectedIP.country || 'Not Available'}</div>
                                                </div>
                                            </div>
                                            <div className="col-md-4 mb-3">
                                                <div className="border-end border-secondary pe-3">
                                                    <small className="text-info opacity-75">CITY</small>
                                                    <div className="text-light fs-6">{selectedIP.city || 'Not Available'}</div>
                                                </div>
                                            </div>
                                            <div className="col-md-4 mb-3">
                                                <small className="text-info opacity-75">INTERNET PROVIDER</small>
                                                <div className="text-light fs-6">{selectedIP.isp || 'Not Available'}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="row">
    {/* Users Card Layout */}
    <div className="col-md-6 mb-4">
        <div className="card bg-transparent border border-info border-opacity-10 h-100">
            <div className="card-header bg-info bg-opacity-10 border-bottom border-opacity-10 border-info d-flex justify-content-between align-items-center">
                <h6 className="mb-0 text-info">
                    <i className="bi bi-person-badge me-2"></i>
                    User Accounts
                </h6>
                <span className="badge bg-info">{getActualUsers(selectedIP).length}</span>
            </div>
            <div className="card-body">
                <div className="row g-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {getActualUsers(selectedIP).slice(0, 12).map((user, index) => (
                        <div key={index} className="col-6">
                            <div className="card bg-dark bg-opacity-25 border border-secondary border-opacity-25 hover-lift">
                                <div className="card-body py-2 px-3">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div className="d-flex align-items-center">
                                            <i className="bi bi-person-circle me-2 text-info fs-6"></i>
                                            <small className="text-light text-truncate" style={{ maxWidth: '80px' }}>
                                                {user.username}
                                            </small>
                                        </div>
                                        <span className="badge bg-info bg-opacity-25 text-info border border-info fs-7">
                                            {user.count}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {getActualUsers(selectedIP).length > 12 && (
                    <div className="text-center mt-3">
                        <small className="text-info">
                            <i className="bi bi-chevron-down me-1"></i>
                            +{getActualUsers(selectedIP).length - 12} more users
                        </small>
                    </div>
                )}
            </div>
        </div>
    </div>

    {/* Browsers Card Layout */}
    <div className="col-md-6 mb-4">
        <div className="card bg-transparent border border-warning bg-info border-opacity-10 h-100">
            <div className="card-header bg-warning bg-opacity-10 border-bottom bg-info bg-opacity-10 border-warning border-opacity-10 d-flex justify-content-between align-items-center">
                <h6 className="mb-0 text-warning">
                    <i className="bi bi-browser-edge me-2 "></i>
                    Web Browsers
                </h6>
                <span className="badge bg-warning text-dark">{getActualBrowsers(selectedIP).length}</span>
            </div>
            <div className="card-body">
                <div className="row g-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {getActualBrowsers(selectedIP).slice(0, 12).map((browser, index) => (
                        <div key={index} className="col-6">
                            <div className="card bg-dark bg-opacity-25 border border-secondary border-opacity-25 hover-lift">
                                <div className="card-body py-2 px-3">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div className="d-flex align-items-center">
                                            <i className={`bi ${getBrowserIcon(browser.name)} me-2 text-warning fs-6`}></i>
                                            <small className="text-light text-truncate" style={{ maxWidth: '80px' }}>
                                                {formatBrowserName(browser.name)}
                                            </small>
                                        </div>
                                        <span className="badge bg-warning bg-opacity-25 text-warning border border-warning fs-7">
                                            {browser.count}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {getActualBrowsers(selectedIP).length > 12 && (
                    <div className="text-center mt-3">
                        <small className="text-warning">
                            <i className="bi bi-chevron-down me-1"></i>
                            +{getActualBrowsers(selectedIP).length - 12} more browsers
                        </small>
                    </div>
                )}
            </div>
        </div>
    </div>
</div>

{/* Device Types Card Layout */}
<div className="card bg-transparent border border-success border-opacity-50 mb-4">
    <div className="card-header bg-success bg-opacity-10 border-bottom border-success d-flex justify-content-between align-items-center border-opacity-50">
        <h6 className="mb-0 text-success">
            <i className="bi bi-devices me-2"></i>
            Device Information
        </h6>
        <span className="badge bg-success">{getActualDevices(selectedIP).length}</span>
    </div>
    <div className="card-body">
        <div className="row g-3" style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {getActualDevices(selectedIP).slice(0, 15).map((device, index) => (
                <div key={index} className="col-md-6 col-lg-4">
                    <div className="card bg-dark bg-opacity-25 border border-secondary border-opacity-25 hover-lift h-100">
                        <div className="card-body">
                            {/* Device Type Badge */}
                            <div className="d-flex justify-content-between align-items-start mb-2">
                                <span className={`badge ${getDeviceTypeBadge(device.type)} px-2 py-1`}>
                                    <i className={`bi ${getDeviceIcon(device.type)} me-1`}></i>
                                    {device.type}
                                </span>
                                <span className="badge bg-success bg-opacity-25 text-white border border-success fs-7">
                                    {device.count} sessions
                                </span>
                            </div>
                            
                            {/* Device Info */}
                            <div className="mt-2">
                                <small className="text-muted d-block">
                                    <i className="bi bi-laptop me-1"></i>
                                    {extractDeviceInfo(device.userAgent).split(' • ')[0]}
                                </small>
                                <small className="text-muted d-block mt-1">
                                    <i className="bi bi-browser-chrome me-1"></i>
                                    {extractDeviceInfo(device.userAgent).split(' • ')[1]}
                                </small>
                            </div>
                            
                            {/* User Agent Preview */}
                            <div className="mt-2">
                                <small className="text-muted font-monospace d-block text-truncate" style={{ maxWidth: '100%' }}>
                                    {device.userAgent.substring(0, 40)}...
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
        {getActualDevices(selectedIP).length > 15 && (
            <div className="text-center mt-3">
                <small className="text-success">
                    <i className="bi bi-chevron-down me-1"></i>
                    Showing 15 of {getActualDevices(selectedIP).length} devices
                </small>
            </div>
        )}
    </div>
</div>
                            </div>
                            <div className="modal-footer border-top border-light   border-opacity-10">
                                <button
                                    type="button"
                                    className="btn btn-outline-light"
                                    onClick={() => setShowModal(false)}
                                >
                                    <i className="bi bi-x-lg me-2"></i>
                                    Close Analysis
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default IPUsageAnalytics;