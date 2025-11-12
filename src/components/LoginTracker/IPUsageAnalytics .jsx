// components/DashBoard/IPUsageAnalytics.jsx
import React, { useMemo } from 'react';

const IPUsageAnalytics = ({ loginLogs }) => {
    const ipAnalytics = useMemo(() => {
        const ipMap = new Map();
        
        loginLogs.forEach(log => {
            if (log.ipAddress && log.ipAddress !== 'Unknown') {
                if (ipMap.has(log.ipAddress)) {
                    const existing = ipMap.get(log.ipAddress);
                    ipMap.set(log.ipAddress, {
                        ...existing,
                        count: existing.count + 1,
                        lastSeen: new Date(log.loginTime) > new Date(existing.lastSeen) ? log.loginTime : existing.lastSeen,
                        users: existing.users.add(log.userId || log.email)
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
                        users: new Set([log.userId || log.email])
                    });
                }
            }
        });

        return Array.from(ipMap.values())
            .map(ip => ({
                ...ip,
                users: Array.from(ip.users),
                uniqueUsers: ip.users.size
            }))
            .sort((a, b) => b.count - a.count);
    }, [loginLogs]);

    return (
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
                                    <td colSpan="8" className="text-center py-4">
                                        <i className="fas fa-inbox fa-2x text-muted mb-2"></i>
                                        <p className="text-muted">No IP usage data available</p>
                                    </td>
                                </tr>
                            ) : (
                                ipAnalytics.map((ip, index) => (
                                    <tr key={index}>
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
                                            <small className="text-muted">{ip.country}</small>
                                        </td>
                                        <td>
                                            <small className="text-muted">{ip.city}</small>
                                        </td>
                                        <td>
                                            <small className="text-muted">{ip.isp}</small>
                                        </td>
                                        <td>
                                            <small className="text-white">
                                                {new Date(ip.firstSeen).toLocaleDateString()}
                                            </small>
                                        </td>
                                        <td>
                                            <small className="text-white">
                                                {new Date(ip.lastSeen).toLocaleDateString()}
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
    );
};

export default IPUsageAnalytics;