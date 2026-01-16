import React, { useState, useEffect } from 'react';
import { activityService } from './ActivityService';
import { securityService } from './SecurityService';

const ActivityTable = ({ userId }) => {
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    deviceType: 'all',
    browser: 'all',
    location: 'all',
    status: 'all'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadActivities();
  }, [userId]);

  useEffect(() => {
    applyFilters();
  }, [activities, filters, searchTerm]);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const userActivities = await activityService.getUserActivities(userId, 100);
      const enhancedActivities = await Promise.all(
        userActivities.map(async (activity) => ({
          ...activity,
          deviceInfo: securityService.parseUserAgent(activity.userAgent)
        }))
      );
      setActivities(enhancedActivities);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...activities];

    // Date filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(a => new Date(a.loginTime) >= fromDate);
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(a => new Date(a.loginTime) <= toDate);
    }

    // Device type filter
    if (filters.deviceType !== 'all') {
      filtered = filtered.filter(a => a.deviceInfo.deviceType === filters.deviceType);
    }

    // Browser filter
    if (filters.browser !== 'all') {
      filtered = filtered.filter(a => a.deviceInfo.browser === filters.browser);
    }

    // Location filter
    if (filters.location !== 'all') {
      filtered = filtered.filter(a => a.country === filters.location);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        a.ipAddress.includes(term) ||
        a.city.toLowerCase().includes(term) ||
        a.country.toLowerCase().includes(term) ||
        a.deviceInfo.browser.toLowerCase().includes(term)
      );
    }

    setFilteredActivities(filtered);
    setCurrentPage(1);
  };

  const getUniqueValues = (key) => {
    const values = activities.map(a => a[key]).filter(Boolean);
    return [...new Set(values)];
  };

  const exportToCSV = () => {
    const headers = ['Login Time', 'IP Address', 'Browser', 'Device', 'OS', 'Country', 'City', 'Status'];
    const csvData = filteredActivities.map(activity => [
      new Date(activity.loginTime).toLocaleString(),
      activity.ipAddress,
      activity.deviceInfo.browser,
      activity.deviceInfo.deviceType,
      activity.deviceInfo.os,
      activity.country,
      activity.city,
      activity.status || 'SUCCESS'
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    const jsonData = filteredActivities.map(activity => ({
      loginTime: activity.loginTime,
      ipAddress: activity.ipAddress,
      browser: activity.deviceInfo.browser,
      device: activity.deviceInfo.deviceType,
      os: activity.deviceInfo.os,
      location: `${activity.city}, ${activity.country}`,
      status: activity.status
    }));

    const jsonString = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-log-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const paginatedActivities = filteredActivities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-info" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2 text-muted">Loading activity logs...</p>
      </div>
    );
  }

  return (
    <div className="card border-0 shadow-soft">
      <div className="card-body p-0">
        {/* Filters */}
        <div className="p-4 border-bottom">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label small">From Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small">To Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label small">Device Type</label>
              <select
                className="form-select form-select-sm"
                value={filters.deviceType}
                onChange={(e) => setFilters(prev => ({ ...prev, deviceType: e.target.value }))}
              >
                <option value="all">All Devices</option>
                {getUniqueValues('deviceInfo').map(device => (
                  <option key={device.deviceType} value={device.deviceType}>
                    {device.deviceType}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small">Browser</label>
              <select
                className="form-select form-select-sm"
                value={filters.browser}
                onChange={(e) => setFilters(prev => ({ ...prev, browser: e.target.value }))}
              >
                <option value="all">All Browsers</option>
                {getUniqueValues('deviceInfo').map(device => (
                  <option key={device.browser} value={device.browser}>
                    {device.browser}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small">Actions</label>
              <div className="d-flex gap-2">
                <button className="btn btn-outline-secondary btn-sm" onClick={loadActivities}>
                  <i className="bi bi-arrow-clockwise"></i>
                </button>
                <div className="dropdown">
                  <button className="btn btn-outline-success btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown">
                    Export ({filteredActivities.length})
                  </button>
                  <ul className="dropdown-menu">
                    <li><button className="dropdown-item" onClick={exportToCSV}>CSV</button></li>
                    <li><button className="dropdown-item" onClick={exportToJSON}>JSON</button></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <div className="row mt-3">
            <div className="col-md-6">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search by IP, location, browser..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="col-md-6 text-end">
              <small className="text-muted">
                Showing {filteredActivities.length} of {activities.length} total records
              </small>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="bg-light">
              <tr>
                <th>Login Time</th>
                <th>IP Address</th>
                <th>Browser & Device</th>
                <th>Operating System</th>
                <th>Location</th>
                <th>Status</th>
                <th>Method</th>
              </tr>
            </thead>
            <tbody>
              {paginatedActivities.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4">
                    <i className="bi bi-inbox display-5 text-muted"></i>
                    <p className="text-muted mt-2">No activity records found</p>
                  </td>
                </tr>
              ) : (
                paginatedActivities.map((activity) => (
                  <tr key={activity.id}>
                    <td>
                      <small className="text-muted d-block">
                        {new Date(activity.loginTime).toLocaleDateString()}
                      </small>
                      <small>
                        {new Date(activity.loginTime).toLocaleTimeString()}
                      </small>
                    </td>
                    <td>
                      <code className="text-primary">{activity.ipAddress}</code>
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        <i className={`bi ${getBrowserIcon(activity.deviceInfo.browser)} me-2 text-info`}></i>
                        <div>
                          <div>{activity.deviceInfo.browser}</div>
                          <small className="text-muted">{activity.deviceInfo.deviceType}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <small>{activity.deviceInfo.os}</small>
                    </td>
                    <td>
                      <div>
                        <div>{activity.city}</div>
                        <small className="text-muted">{activity.country}</small>
                      </div>
                    </td>
                    <td>
                      <span className={`badge bg-${activity.status === 'SUCCESS' ? 'success' : 'danger'}`}>
                        {activity.status}
                      </span>
                    </td>
                    <td>
                      <small className="text-muted">{activity.loginMethod || 'Password'}</small>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 border-top">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <small className="text-muted">
                  Page {currentPage} of {totalPages} • {itemsPerPage} per page
                </small>
                <select
                  className="form-select form-select-sm ms-2 d-inline-block w-auto"
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
              <nav>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setCurrentPage(1)}>
                      <i className="bi bi-chevron-double-left"></i>
                    </button>
                  </li>
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setCurrentPage(currentPage - 1)}>
                      <i className="bi bi-chevron-left"></i>
                    </button>
                  </li>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                        <button className="page-link" onClick={() => setCurrentPage(pageNum)}>
                          {pageNum}
                        </button>
                      </li>
                    );
                  })}
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setCurrentPage(currentPage + 1)}>
                      <i className="bi bi-chevron-right"></i>
                    </button>
                  </li>
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setCurrentPage(totalPages)}>
                      <i className="bi bi-chevron-double-right"></i>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

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

export default ActivityTable;