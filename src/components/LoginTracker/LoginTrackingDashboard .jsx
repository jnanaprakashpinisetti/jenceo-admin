// components/DashBoard/LoginTrackingDashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import firebaseDB from '../../firebase';
import IPWhitelistManager from './IPWhitelistManager';
import IPUsageAnalytics from './IPUsageAnalytics ';

const LoginTrackingDashboard = () => {
    // State declarations
    const [loginLogs, setLoginLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [displayedLogs, setDisplayedLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        startDate: '',
        endDate: ''
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [currentView, setCurrentView] = useState('all');
    const [stats, setStats] = useState({
        totalLogins: 0,
        uniqueUsers: 0,
        uniqueIPs: 0,
        todayLogins: 0
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [cardFilter, setCardFilter] = useState(null);

    // Pagination
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    useEffect(() => {
        setDisplayedLogs(filteredLogs.slice(startIndex, endIndex));
    }, [filteredLogs, currentPage, itemsPerPage]);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleItemsPerPageChange = (value) => {
        setItemsPerPage(Number(value));
        setCurrentPage(1);
    };

    // Fetch login logs from Firebase
    const fetchLoginLogs = async () => {
        setLoading(true);
        try {
            const snapshot = await firebaseDB.child('LoginLogs').once('value');
            if (snapshot.exists()) {
                const logsData = snapshot.val();
                const logsArray = Object.entries(logsData).map(([id, data]) => ({
                    id,
                    ...data,
                    loginTime: data.loginTime || data.timestamp || data.createdAt
                })).sort((a, b) => new Date(b.loginTime) - new Date(a.loginTime));

                setLoginLogs(logsArray);
                setFilteredLogs(logsArray);
                calculateStats(logsArray);
            } else {
                setLoginLogs([]);
                setFilteredLogs([]);
            }
        } catch (error) {
            console.error('Error fetching login logs:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate statistics
    const calculateStats = (logs) => {
        const uniqueUsers = new Set(logs.map(log => log.userId || log.email));
        const uniqueIPs = new Set(logs.map(log => log.ipAddress));

        const today = new Date().toDateString();
        const todayLogins = logs.filter(log =>
            new Date(log.loginTime).toDateString() === today
        ).length;

        setStats({
            totalLogins: logs.length,
            uniqueUsers: uniqueUsers.size,
            uniqueIPs: uniqueIPs.size,
            todayLogins
        });
    };

    // Filter logs based on search and date range
    const applyFilters = useMemo(() => {
        return () => {
            let filtered = [...loginLogs];

            // Apply card filter
            if (cardFilter) {
                switch (cardFilter) {
                    case 'totalLogins':
                        // No additional filter needed
                        break;
                    case 'uniqueUsers':
                        const userMap = new Map();
                        filtered = filtered.filter(log => {
                            const userKey = log.userId || log.email;
                            if (!userMap.has(userKey)) {
                                userMap.set(userKey, true);
                                return true;
                            }
                            return false;
                        });
                        break;
                    case 'uniqueIPs':
                        const ipMap = new Map();
                        filtered = filtered.filter(log => {
                            if (!ipMap.has(log.ipAddress)) {
                                ipMap.set(log.ipAddress, true);
                                return true;
                            }
                            return false;
                        });
                        break;
                    case 'todayLogins':
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        filtered = filtered.filter(log => new Date(log.loginTime) >= today);
                        break;
                    default:
                        break;
                }
            }

            // Apply date range filter
            if (dateRange.startDate && dateRange.endDate) {
                filtered = filtered.filter(log => {
                    const logDate = new Date(log.loginTime);
                    const start = new Date(dateRange.startDate);
                    const end = new Date(dateRange.endDate);
                    end.setHours(23, 59, 59, 999);
                    return logDate >= start && logDate <= end;
                });
            }

            // Apply time view filter
            const now = new Date();
            switch (currentView) {
                case 'today':
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    filtered = filtered.filter(log => new Date(log.loginTime) >= today);
                    break;
                case 'week':
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    filtered = filtered.filter(log => new Date(log.loginTime) >= weekAgo);
                    break;
                case 'month':
                    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                    filtered = filtered.filter(log => new Date(log.loginTime) >= monthAgo);
                    break;
                default:
                    break;
            }

            // Apply search filter
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                filtered = filtered.filter(log =>
                    (log.userId && log.userId.toLowerCase().includes(term)) ||
                    (log.email && log.email.toLowerCase().includes(term)) ||
                    (log.displayName && log.displayName.toLowerCase().includes(term)) ||
                    (log.ipAddress && log.ipAddress.includes(term)) ||
                    (log.userAgent && log.userAgent.toLowerCase().includes(term))
                );
            }

            setFilteredLogs(filtered);
            setCurrentPage(1);
        };
    }, [loginLogs, dateRange, currentView, searchTerm, cardFilter]);

    useEffect(() => {
        applyFilters();
    }, [applyFilters]);

    useEffect(() => {
        fetchLoginLogs();
    }, []);

    // Real-time listener for new logins
    useEffect(() => {
        const ref = firebaseDB.child('LoginLogs');
        const handleData = (snapshot) => {
            if (snapshot.exists()) {
                fetchLoginLogs();
            }
        };

        ref.on('value', handleData);
        return () => ref.off('value', handleData);
    }, []);

    // Card click handlers
    const handleCardClick = (cardType) => {
        setCardFilter(cardFilter === cardType ? null : cardType);
    };

    // Format date for display
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    // Get browser/device info from userAgent
    const getBrowserInfo = (userAgent) => {
        if (!userAgent) return 'Unknown';
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        return 'Other';
    };

    // Get device type from userAgent
    const getDeviceType = (userAgent) => {
        if (!userAgent) return 'Unknown';
        if (/Mobile|Android|iPhone|iPad/.test(userAgent)) return 'Mobile';
        return 'Desktop';
    };

    // Export to CSV
    const exportToCSV = () => {
        const headers = ['User ID', 'Email', 'Display Name', 'IP Address', 'Login Time', 'Browser', 'Device Type', 'Country', 'City', 'ISP'];
        const csvData = filteredLogs.map(log => [
            log.userId || 'N/A',
            log.email || 'N/A',
            log.displayName || 'N/A',
            log.ipAddress || 'N/A',
            formatDate(log.loginTime),
            getBrowserInfo(log.userAgent),
            getDeviceType(log.userAgent),
            log.country || 'Unknown',
            log.city || 'Unknown',
            log.isp || 'Unknown'
        ]);

        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.map(field => `"${field}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `login-logs-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    // Clear all filters
    const clearFilters = () => {
        setDateRange({ startDate: '', endDate: '' });
        setSearchTerm('');
        setCurrentView('all');
        setCardFilter(null);
    };

    if (loading) {
        return (
            <div className="container-fluid py-4">
                <div className="row">
                    <div className="col-12">
                        <div className="card bg-dark border-secondary text-center">
                            <div className="card-body py-5">
                                <div className="spinner-border text-info mb-3" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                                <h5 className="text-white">Loading Login Tracking Dashboard...</h5>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container py-4 bg-secondary bg-opacity-10 rounded-4">
            {/* Header */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="card bg-dark border-primary">
                        <div className="card-header bg-primary bg-opacity-25 border-primary">
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h4 className="card-title mb-0 text-info">
                                        <i className="bi bi-shield-check me-2"></i>
                                        Login Tracking Dashboard
                                    </h4>
                                    <small className="text-warning">
                                        Monitor user login activity and IP addresses
                                    </small>
                                </div>
                                <button
                                    className="btn btn-outline-info"
                                    onClick={fetchLoginLogs}
                                    title="Refresh Data"
                                >
                                    <i className="bi bi-arrow-clockwise"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="row mb-4">
                <div className="col-xl-3 col-md-6 mb-4">
                    <div
                        className={`card h-100 ${cardFilter === 'totalLogins' ? 'border-success border-3' : 'border-success'}`}
                        style={{ cursor: 'pointer', backgroundColor: cardFilter === 'totalLogins' ? 'rgba(25, 135, 84, 0.1)' : '' }}
                        onClick={() => handleCardClick('totalLogins')}
                    >
                        <div className="card-body">
                            <div className="d-flex justify-content-between">
                                <div>
                                    <h6 className="card-title text-muted">Total Logins</h6>
                                    <h3 className="text-success">{stats.totalLogins}</h3>
                                </div>
                                <div className="align-self-center">
                                    <i className="bi bi-box-arrow-in-right fa-2x text-success opacity-50"></i>
                                </div>
                            </div>
                            {cardFilter === 'totalLogins' && (
                                <small className="text-success">
                                    <i className="bi bi-funnel me-1"></i>
                                    Filtering by total logins
                                </small>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-xl-3 col-md-6 mb-4">
                    <div
                        className={`card h-100 ${cardFilter === 'uniqueUsers' ? 'border-info border-3' : 'border-info'}`}
                        style={{ cursor: 'pointer', backgroundColor: cardFilter === 'uniqueUsers' ? 'rgba(13, 202, 240, 0.1)' : '' }}
                        onClick={() => handleCardClick('uniqueUsers')}
                    >
                        <div className="card-body">
                            <div className="d-flex justify-content-between">
                                <div>
                                    <h6 className="card-title text-muted">Unique Users</h6>
                                    <h3 className="text-info">{stats.uniqueUsers}</h3>
                                </div>
                                <div className="align-self-center">
                                    <i className="fas fa-users fa-2x text-info opacity-50"></i>
                                </div>
                            </div>
                            {cardFilter === 'uniqueUsers' && (
                                <small className="text-info">
                                    <i className="bi bi-funnel me-1"></i>
                                    Filtering by unique users
                                </small>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-xl-3 col-md-6 mb-4">
                    <div
                        className={`card h-100 ${cardFilter === 'uniqueIPs' ? 'border-warning border-3' : 'border-warning'}`}
                        style={{ cursor: 'pointer', backgroundColor: cardFilter === 'uniqueIPs' ? 'rgba(255, 193, 7, 0.1)' : '' }}
                        onClick={() => handleCardClick('uniqueIPs')}
                    >
                        <div className="card-body">
                            <div className="d-flex justify-content-between">
                                <div>
                                    <h6 className="card-title text-muted">Unique IPs</h6>
                                    <h3 className="text-warning">{stats.uniqueIPs}</h3>
                                </div>
                                <div className="align-self-center">
                                    <i className="bi bi-diagram-3 fa-2x text-warning opacity-50"></i>
                                </div>
                            </div>
                            {cardFilter === 'uniqueIPs' && (
                                <small className="text-warning">
                                    <i className="bi bi-funnel me-1"></i>
                                    Filtering by unique IPs
                                </small>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-xl-3 col-md-6 mb-4">
                    <div
                        className={`card h-100 ${cardFilter === 'todayLogins' ? 'border-primary border-3' : 'border-primary'}`}
                        style={{ cursor: 'pointer', backgroundColor: cardFilter === 'todayLogins' ? 'rgba(13, 110, 253, 0.1)' : '' }}
                        onClick={() => handleCardClick('todayLogins')}
                    >
                        <div className="card-body">
                            <div className="d-flex justify-content-between">
                                <div>
                                    <h6 className="card-title text-muted">Today's Logins</h6>
                                    <h3 className="text-primary">{stats.todayLogins}</h3>
                                </div>
                                <div className="align-self-center">
                                    <i className="bi bi-calendar-date fa-2x text-primary opacity-50"></i>
                                </div>
                            </div>
                            {cardFilter === 'todayLogins' && (
                                <small className="text-primary">
                                    <i className="bi bi-funnel me-1"></i>
                                    Filtering by today's logins
                                </small>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* IP Usage Analytics */}
            <div className="row mb-4">
                <div className="col-12">
                    <IPUsageAnalytics loginLogs={loginLogs} />
                </div>
            </div>

            {/* IP Whitelist Manager */}
            <div className="row mb-4">
                <div className="col-12">
                    <IPWhitelistManager />
                </div>
            </div>

            {/* Rest of the component remains the same with pagination added to table */}
            {/* Filters and Controls */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="card bg-dark border-secondary">
                        <div className="card-header bg-info bg-opacity-25 border-info">
                            <h6 className="mb-0 text-white">
                                <i className="bi bi-funnel me-2"></i>
                                Filters & Controls
                            </h6>
                        </div>
                        <div className="card-body">
                            <div className="row g-3">
                                <div className="col-md-2">
                                    <label className="form-label text-warning">Quick View</label>
                                    <select
                                        className="form-select bg-dark text-white border-secondary"
                                        value={currentView}
                                        onChange={(e) => setCurrentView(e.target.value)}
                                    >
                                        <option value="all">All Time</option>
                                        <option value="today">Today</option>
                                        <option value="week">Last 7 Days</option>
                                        <option value="month">Last 30 Days</option>
                                    </select>
                                </div>

                                <div className="col-md-2">
                                    <label className="form-label text-warning">Start Date</label>
                                    <input
                                        type="date"
                                        className="form-control bg-dark text-white border-secondary"
                                        value={dateRange.startDate}
                                        onChange={(e) => setDateRange(prev => ({
                                            ...prev,
                                            startDate: e.target.value
                                        }))}
                                    />
                                </div>

                                <div className="col-md-2">
                                    <label className="form-label text-warning">End Date</label>
                                    <input
                                        type="date"
                                        className="form-control bg-dark text-white border-secondary"
                                        value={dateRange.endDate}
                                        onChange={(e) => setDateRange(prev => ({
                                            ...prev,
                                            endDate: e.target.value
                                        }))}
                                    />
                                </div>

                                <div className="col-md-3">
                                    <label className="form-label text-warning">Search</label>
                                    <input
                                        type="text"
                                        className="form-control bg-dark text-white border-secondary"
                                        placeholder="Search users, IPs..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                <div className="col-md-3">
                                    <label className="form-label text-warning">Filters</label>
                                    <div className="d-flex gap-2">
                                        <button
                                            className="btn btn-outline-info"
                                            onClick={clearFilters}
                                        >
                                            Clear Filters
                                        </button>
                                        <button
                                            className="btn btn-outline-success"
                                            onClick={exportToCSV}
                                            disabled={filteredLogs.length === 0}
                                        >
                                            Export <span className='text-warning'>({filteredLogs.length})</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Login Logs Table with Pagination */}
            <div className="row">
                <div className="col-12">
                    <div className="card bg-dark border-secondary">
                        <div className="card-header bg-info bg-opacity-25 border-info d-flex justify-content-between align-items-center">
                            <h6 className="mb-0 text-white">
                                <i className="bi bi-list me-2"></i>
                                Login Activity ({filteredLogs.length} records)
                                {cardFilter && (
                                    <span className="badge bg-warning ms-2">
                                        Filtered
                                    </span>
                                )}
                            </h6>
                            <div className="d-flex align-items-center gap-3">
                                <span className="badge bg-warning">
                                    Last updated: {new Date().toLocaleTimeString('en-IN')}
                                </span>

                                {/* Items per page selector */}
                                <select
                                    className="form-select form-select-sm bg-dark text-white border-secondary"
                                    style={{ width: 'auto' }}
                                    value={itemsPerPage}
                                    onChange={(e) => handleItemsPerPageChange(e.target.value)}
                                >
                                    <option value="10">10 per page</option>
                                    <option value="20">20 per page</option>
                                    <option value="50">50 per page</option>
                                    <option value="100">100 per page</option>
                                </select>
                            </div>
                        </div>
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-dark table-hover mb-0">
                                    <thead>
                                        <tr>
                                            <th>User</th>
                                            <th>IP Address</th>
                                            <th>Login Time</th>
                                            <th>Browser</th>
                                            <th>Device</th>
                                            <th>Country</th>
                                            <th>City</th>
                                            <th>ISP</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayedLogs.length === 0 ? (
                                            <tr>
                                                <td colSpan="9" className="text-center py-4">
                                                    <i className="bi bi-inbox fa-2x text-muted mb-3"></i>
                                                    <p className="text-muted">No login records found</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            displayedLogs.map((log) => (
                                                <tr key={log.id}>
                                                    <td>
                                                        <div>
                                                            <strong className="text-info">
                                                                {log.displayName || log.email || log.userId || 'Unknown User'}
                                                            </strong>
                                                            {log.email && (
                                                                <br />
                                                            )}
                                                            <small className="text-muted opacity-75">
                                                                {log.email}
                                                            </small>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <code className="text-warning">{log.ipAddress || 'N/A'}</code>
                                                    </td>
                                                    <td>
                                                        <small className="text-white small-text">
                                                            {formatDate(log.loginTime)}
                                                        </small>
                                                    </td>
                                                    <td>
                                                        <span className="badge bg-primary">
                                                            {getBrowserInfo(log.userAgent)}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className="badge bg-secondary">
                                                            {getDeviceType(log.userAgent)}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <small className="text-muted">
                                                            {log.country || 'Unknown'}
                                                        </small>
                                                    </td>
                                                    <td>
                                                        <small className="text-muted">
                                                            {log.city || 'Unknown'}
                                                        </small>
                                                    </td>
                                                    <td>
                                                        <small className="text-muted">
                                                            {log.isp || 'Unknown'}
                                                        </small>
                                                    </td>
                                                    <td>
                                                        <span className="badge bg-success">
                                                            <i className="bi bi-check me-1"></i>
                                                            Success
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <>
                                    <small className="  text-warning text-center d-block m-2">
                                        Showing {startIndex + 1} to {Math.min(endIndex, filteredLogs.length)} of {filteredLogs.length} entries
                                    </small>
                                    <div className="card-footer bg-secondary bg-opacity-10 justify-content-center">
                                        <div className="d-flex  align-items-center">
                                            <nav style={{ backgroundColor: "transparent", padding: 0, margin: 'auto' }}>
                                                <ul className="pagination pagination-sm mb-0 justify-content-center">
                                                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                                        <button
                                                            className="page-link bg-dark text-white border-secondary"
                                                            onClick={() => handlePageChange(currentPage - 1)}
                                                        >
                                                            Previous
                                                        </button>
                                                    </li>

                                                    {[...Array(totalPages)].map((_, index) => {
                                                        const page = index + 1;
                                                        if (
                                                            page === 1 ||
                                                            page === totalPages ||
                                                            (page >= currentPage - 1 && page <= currentPage + 1)
                                                        ) {
                                                            return (
                                                                <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                                                                    <button
                                                                        className="page-link bg-dark text-white border-secondary"
                                                                        onClick={() => handlePageChange(page)}
                                                                    >
                                                                        {page}
                                                                    </button>
                                                                </li>
                                                            );
                                                        } else if (
                                                            page === currentPage - 2 ||
                                                            page === currentPage + 2
                                                        ) {
                                                            return (
                                                                <li key={page} className="page-item disabled">
                                                                    <span className="page-link bg-dark text-muted border-secondary">...</span>
                                                                </li>
                                                            );
                                                        }
                                                        return null;
                                                    })}

                                                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                                        <button
                                                            className="page-link bg-dark text-white border-secondary"
                                                            onClick={() => handlePageChange(currentPage + 1)}
                                                        >
                                                            Next
                                                        </button>
                                                    </li>
                                                </ul>
                                            </nav>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Real-time Update Indicator */}
            <div className="row mt-3">
                <div className="col-12">
                    <div className="text-center">
                        <small className="text-muted">
                            <i className="bi bi-circle text-success me-1"></i>
                            Real-time updates active • Auto-refreshing every 30 seconds
                        </small>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginTrackingDashboard;