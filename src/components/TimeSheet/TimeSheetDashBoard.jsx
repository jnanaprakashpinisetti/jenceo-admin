import React, { useState, useEffect } from 'react';
import firebaseDB from '../../firebase';

export default function TimeSheetDashBoard() {
    // State declarations
    const [timesheets, setTimesheets] = useState([]);
    const [filteredTimesheets, setFilteredTimesheets] = useState([]);
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('all');
    const [selectedTimesheet, setSelectedTimesheet] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [clarificationText, setClarificationText] = useState('');
    const [showClarificationInput, setShowClarificationInput] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Initialize current user and years
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('currentUser')) || {
            uid: 'admin',
            displayName: 'Admin User',
            email: 'admin@system.com',
            role: 'admin'
        };
        setCurrentUser(user);

        // Set current year
        const current = new Date();
        setSelectedYear(current.getFullYear().toString());
    }, []);

    // Fetch all timesheets from EmployeeBioData path
    useEffect(() => {
        fetchTimesheets();
    }, []);

    // Filter timesheets when year/month/search/status changes
    useEffect(() => {
        filterTimesheets();
    }, [timesheets, selectedYear, selectedMonth, searchTerm, statusFilter]);

    // Fetch timesheets from EmployeeBioData structure
    const fetchTimesheets = async () => {
        setLoading(true);
        try {
            const snapshot = await firebaseDB.child("EmployeeBioData").once('value');
            if (snapshot.exists()) {
                const employeesData = snapshot.val();
                const allTimesheets = [];

                // Iterate through all employees
                Object.entries(employeesData).forEach(([employeeId, employeeData]) => {
                    if (employeeData.timesheets) {
                        // Iterate through timesheets for each employee
                        Object.entries(employeeData.timesheets).forEach(([timesheetId, timesheetData]) => {
                            allTimesheets.push({
                                id: timesheetId,
                                employeeId: employeeId,
                                employeeData: employeeData,
                                employeeName: timesheetData.employeeName || `${employeeData.firstName || ''} ${employeeData.lastName || ''}`.trim(),
                                ...timesheetData
                            });
                        });
                    }
                });

                setTimesheets(allTimesheets);
            }
        } catch (error) {
            console.error('Error fetching timesheets:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterTimesheets = () => {
        let filtered = timesheets;

        // Filter by year
        if (selectedYear) {
            filtered = filtered.filter(timesheet => {
                let sheetYear;
                if (timesheet.period && timesheet.period.includes('-')) {
                    sheetYear = timesheet.period.split('-')[0];
                } else if (timesheet.startDate) {
                    sheetYear = timesheet.startDate.split('-')[0];
                } else {
                    return false;
                }
                return sheetYear === selectedYear;
            });
        }

        // Filter by month (if not 'all')
        if (selectedMonth !== 'all') {
            filtered = filtered.filter(timesheet => {
                let sheetMonth;
                if (timesheet.period && timesheet.period.includes('-')) {
                    sheetMonth = timesheet.period.split('-')[1];
                } else if (timesheet.startDate) {
                    sheetMonth = timesheet.startDate.split('-')[1];
                } else {
                    return false;
                }
                return sheetMonth === selectedMonth;
            });
        }

        // Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(timesheet =>
                timesheet.employeeName?.toLowerCase().includes(term) ||
                timesheet.employeeData?.employeeId?.toLowerCase().includes(term) ||
                timesheet.employeeData?.idNo?.toLowerCase().includes(term) ||
                timesheet.period?.toLowerCase().includes(term)
            );
        }

        // Filter by status
        if (statusFilter !== 'all') {
            filtered = filtered.filter(timesheet => timesheet.status === statusFilter);
        }

        setFilteredTimesheets(filtered);
    };

    const getTimesheetCountForMonth = (monthNumber) => {
        if (monthNumber === 'all') {
            return timesheets.filter(ts => {
                const sheetYear = ts.period?.split('-')[0] || ts.startDate?.split('-')[0];
                return sheetYear === selectedYear;
            }).length;
        }

        return timesheets.filter(ts => {
            const sheetYear = ts.period?.split('-')[0] || ts.startDate?.split('-')[0];
            const sheetMonth = ts.period?.split('-')[1] || ts.startDate?.split('-')[1];
            return sheetYear === selectedYear && sheetMonth === monthNumber;
        }).length;
    };

    const getAvailableYears = () => {
        const years = new Set();
        timesheets.forEach(timesheet => {
            if (timesheet.period && timesheet.period.includes('-')) {
                years.add(timesheet.period.split('-')[0]);
            } else if (timesheet.startDate) {
                years.add(timesheet.startDate.split('-')[0]);
            }
        });
        return Array.from(years).sort((a, b) => b - a);
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            draft: { class: 'bg-warning', text: 'Draft' },
            submitted: { class: 'bg-info', text: 'Submitted' },
            approved: { class: 'bg-success', text: 'Approved' },
            rejected: { class: 'bg-danger', text: 'Rejected' },
            clarification: { class: 'bg-warning', text: 'Needs Clarification' },
            assigned: { class: 'bg-primary', text: 'Assigned' }
        };

        const config = statusConfig[status] || { class: 'bg-secondary', text: status };
        return <span className={`badge ${config.class}`}>{config.text}</span>;
    };

    const handleViewDetails = async (timesheetId, employeeId) => {
        setLoading(true);
        try {
            // Fetch timesheet data from EmployeeBioData path
            const snapshot = await firebaseDB.child(`EmployeeBioData/${employeeId}/timesheets/${timesheetId}`).once('value');
            if (snapshot.exists()) {
                const timesheetData = snapshot.val();

                // Fetch daily entries from the same path
                const entriesSnapshot = await firebaseDB.child(`EmployeeBioData/${employeeId}/timesheets/${timesheetId}/dailyEntries`).once('value');

                let dailyEntries = [];
                if (entriesSnapshot.exists()) {
                    dailyEntries = Object.entries(entriesSnapshot.val()).map(([date, entry]) => ({
                        id: date,
                        date: date,
                        ...entry
                    })).sort((a, b) => new Date(a.date) - new Date(b.date));
                }

                // Fetch advances
                const advancesSnapshot = await firebaseDB.child('Advances')
                    .orderByChild('timesheetId')
                    .equalTo(timesheetId)
                    .once('value');

                let advances = [];
                if (advancesSnapshot.exists()) {
                    advances = Object.values(advancesSnapshot.val());
                }

                // Fetch employee data
                const employeeSnapshot = await firebaseDB.child(`EmployeeBioData/${employeeId}`).once('value');
                const employeeData = employeeSnapshot.exists() ? employeeSnapshot.val() : {};

                setSelectedTimesheet({
                    id: timesheetId,
                    employeeId: employeeId,
                    employeeData: employeeData,
                    ...timesheetData,
                    dailyEntries,
                    advances
                });
                setShowDetailModal(true);
                setShowClarificationInput(false);
                setClarificationText('');
            }
        } catch (error) {
            console.error('Error fetching timesheet details:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateTimesheetStatus = async (status, clarification = '') => {
        if (!selectedTimesheet) return;

        setLoading(true);
        try {
            const updateData = {
                status,
                updatedBy: currentUser?.uid,
                updatedByName: currentUser?.displayName,
                updatedAt: new Date().toISOString()
            };

            // Add clarification data if needed
            if (status === 'clarification') {
                updateData.clarificationRequest = {
                    text: clarification,
                    requestedBy: currentUser?.uid,
                    requestedByName: currentUser?.displayName,
                    requestedAt: new Date().toISOString(),
                    resolved: false
                };
            } else if (status === 'approved' || status === 'rejected') {
                updateData.reviewedBy = currentUser?.uid;
                updateData.reviewedByName = currentUser?.displayName;
                updateData.reviewedAt = new Date().toISOString();

                // Clear clarification if exists
                if (selectedTimesheet.clarificationRequest) {
                    updateData.clarificationRequest = {
                        ...selectedTimesheet.clarificationRequest,
                        resolved: true,
                        resolvedBy: currentUser?.uid,
                        resolvedByName: currentUser?.displayName,
                        resolvedAt: new Date().toISOString()
                    };
                }
            }

            // Update in EmployeeBioData path
            await firebaseDB.child(`EmployeeBioData/${selectedTimesheet.employeeId}/timesheets/${selectedTimesheet.id}`).update(updateData);

            // Refresh data
            await fetchTimesheets();
            setShowDetailModal(false);
            setSelectedTimesheet(null);
            setClarificationText('');
            setShowClarificationInput(false);

        } catch (error) {
            console.error('Error updating timesheet status:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusAction = (status) => {
        if (status === 'clarification') {
            setShowClarificationInput(true);
        } else {
            updateTimesheetStatus(status);
        }
    };

    const submitClarification = () => {
        if (clarificationText.trim()) {
            updateTimesheetStatus('clarification', clarificationText.trim());
        }
    };

    // Calculate statistics
    const getStatistics = () => {
        const totalAmount = filteredTimesheets.reduce((sum, ts) => sum + (ts.totalSalary || 0), 0);
        const approvedAmount = filteredTimesheets
            .filter(ts => ts.status === 'approved')
            .reduce((sum, ts) => sum + (ts.totalSalary || 0), 0);

        const pendingCount = filteredTimesheets.filter(ts =>
            ts.status === 'submitted' || ts.status === 'clarification' || ts.status === 'assigned'
        ).length;

        return { totalAmount, approvedAmount, pendingCount };
    };

    const statistics = getStatistics();
    return (
        <>
            <div className="container-fluid py-4">
                {/* Header */}
                <div className="row mb-4">
                    <div className="col-12">
                        <div className="card bg-dark border-secondary">
                            <div className="card-body">
                                <div className="row align-items-center">
                                    <div className="col-md-3">
                                        <h4 className="text-white mb-0">
                                            <i className="bi bi-speedometer2 me-2 text-warning"></i>
                                            Timesheet Dashboard
                                        </h4>
                                        <small className="text-muted">Manage and review employee timesheets</small>
                                    </div>
                                    <div className="col-md-9 text-end">
                                        <div className="row">
                                            <div className="col-md-10 text-center">
                                                <label className="form-label text-info">
                                                    <strong>Select Month</strong>
                                                </label>
                                                <div className="d-flex flex-wrap gap-2 justify-content-center">
                                                    {/* All Button */}
                                                    <button
                                                        className={`btn ${selectedMonth === 'all' ? 'btn-primary' : 'btn-outline-primary'} btn-sm position-relative`}
                                                        onClick={() => setSelectedMonth('all')}
                                                        style={{ minWidth: '60px' }}
                                                    >
                                                        All
                                                        {getTimesheetCountForMonth('all') > 0 && (
                                                            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                                                                {getTimesheetCountForMonth('all')}
                                                                <span className="visually-hidden">timesheets</span>
                                                            </span>
                                                        )}
                                                    </button>

                                                    {/* Month Buttons */}
                                                    {Array.from({ length: 12 }, (_, i) => {
                                                        const monthNum = (i + 1).toString().padStart(2, '0');
                                                        const monthName = new Date(2023, i).toLocaleString('en', { month: 'short' });
                                                        const isActive = monthNum === selectedMonth;
                                                        const timesheetCount = getTimesheetCountForMonth(monthNum);

                                                        return (
                                                            <button
                                                                key={monthNum}
                                                                className={`btn ${isActive ? 'btn-info' : 'btn-outline-info'} btn-sm position-relative`}
                                                                onClick={() => setSelectedMonth(monthNum)}
                                                                style={{ minWidth: '60px' }}
                                                            >
                                                                {monthName}
                                                                {timesheetCount > 0 && (
                                                                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-success">
                                                                        {timesheetCount}
                                                                        <span className="visually-hidden">timesheets</span>
                                                                    </span>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className="col-md-2 text-center">
                                                <label className="form-label text-info">
                                                    <strong>Select Year</strong>
                                                </label>
                                                <select
                                                    className="form-select bg-dark text-white border-secondary"
                                                    value={selectedYear}
                                                    onChange={(e) => setSelectedYear(e.target.value)}
                                                >
                                                    <option value="">Select Year</option>
                                                    {getAvailableYears().map(year => (
                                                        <option key={year} value={year}>{year}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search and Filter Section */}
                <div className="row mb-4">
                    <div className="col-md-8">
                        <div className="card bg-dark border-secondary">
                            <div className="card-body">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label text-info">Search Timesheets</label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-dark border-secondary">
                                                <i className="bi bi-search text-warning"></i>
                                            </span>
                                            <input
                                                type="text"
                                                className="form-control bg-dark text-white border-secondary"
                                                placeholder="Search by employee name, ID, or period..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label text-info">Filter by Status</label>
                                        <select
                                            className="form-select bg-dark text-white border-secondary"
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                        >
                                            <option value="all">All Status</option>
                                            <option value="draft">Draft</option>
                                            <option value="submitted">Submitted</option>
                                            <option value="assigned">Assigned</option>
                                            <option value="approved">Approved</option>
                                            <option value="rejected">Rejected</option>
                                            <option value="clarification">Needs Clarification</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="card bg-dark border-warning">
                            <div className="card-body text-center">
                                <h6 className="text-warning d-block">Quick Actions</h6>
                                <div className="btn-group w-100">
                                    <button
                                        className="btn btn-outline-info btn-sm"
                                        onClick={fetchTimesheets}
                                        disabled={loading}
                                    >
                                        <i className="bi bi-arrow-clockwise me-1"></i>
                                        Refresh
                                    </button>
                                    <button
                                        className="btn btn-outline-success btn-sm"
                                        onClick={() => {
                                            setSearchTerm('');
                                            setStatusFilter('all');
                                        }}
                                    >
                                        <i className="bi bi-filter-circle me-1"></i>
                                        Clear Filters
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="row mb-4">
                    <div className="col-xl-2 col-md-4 col-6 mb-3">
                        <div className="card bg-dark border-info">
                            <div className="card-body text-center">
                                <h6 className="text-info d-block">Total Timesheets</h6>
                                <h3 className="text-white">{filteredTimesheets.length}</h3>
                                <small className="text-muted">Selected period</small>
                            </div>
                        </div>
                    </div>
                    <div className="col-xl-2 col-md-4 col-6 mb-3">
                        <div className="card bg-dark border-success">
                            <div className="card-body text-center">
                                <h6 className="text-success d-block">Approved</h6>
                                <h3 className="text-white">
                                    {filteredTimesheets.filter(ts => ts.status === 'approved').length}
                                </h3>
                                <small className="text-muted">Ready for payment</small>
                            </div>
                        </div>
                    </div>
                    <div className="col-xl-2 col-md-4 col-6 mb-3">
                        <div className="card bg-dark border-warning">
                            <div className="card-body text-center">
                                <h6 className="text-warning d-block">Pending</h6>
                                <h3 className="text-white">
                                    {statistics.pendingCount}
                                </h3>
                                <small className="text-muted">Awaiting review</small>
                            </div>
                        </div>
                    </div>
                    <div className="col-xl-2 col-md-4 col-6 mb-3">
                        <div className="card bg-dark border-danger">
                            <div className="card-body text-center">
                                <h6 className="text-danger d-block">Rejected</h6>
                                <h3 className="text-white">
                                    {filteredTimesheets.filter(ts => ts.status === 'rejected').length}
                                </h3>
                                <small className="text-muted">Needs revision</small>
                            </div>
                        </div>
                    </div>
                    <div className="col-xl-2 col-md-4 col-6 mb-3">
                        <div className="card bg-dark border-primary">
                            <div className="card-body text-center">
                                <h6 className="text-primary d-block">Total Amount</h6>
                                <h3 className="text-warning">₹{statistics.totalAmount.toLocaleString()}</h3>
                                <small className="text-muted">All timesheets</small>
                            </div>
                        </div>
                    </div>
                    <div className="col-xl-2 col-md-4 col-6 mb-3">
                        <div className="card bg-dark border-success">
                            <div className="card-body text-center">
                                <h6 className="text-success d-block">Approved Amount</h6>
                                <h3 className="text-warning">₹{statistics.approvedAmount.toLocaleString()}</h3>
                                <small className="text-muted">Ready to pay</small>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timesheets Table */}
                <div className="row">
                    <div className="col-12">
                        <div className="card bg-dark border-secondary">
                            <div className="card-header bg-secondary d-flex justify-content-between align-items-center">
                                <h5 className="card-title mb-0 text-white">
                                    {selectedMonth === 'all'
                                        ? `All Timesheets - ${selectedYear}`
                                        : `Timesheets - ${selectedMonth && new Date(2023, parseInt(selectedMonth) - 1).toLocaleString('en', { month: 'long' })} ${selectedYear}`
                                    }
                                </h5>
                                <div>
                                    <span className="badge bg-primary me-2">{filteredTimesheets.length} records</span>
                                    {loading && (
                                        <div className="spinner-border spinner-border-sm text-light" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="card-body p-0">
                                {loading ? (
                                    <div className="text-center py-5">
                                        <div className="spinner-border text-info mb-3" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                        <p className="text-muted">Loading timesheets...</p>
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-dark table-hover mb-0">
                                            <thead>
                                                <tr>
                                                    <th className="border-secondary">Employee</th>
                                                    <th className="border-secondary">Period</th>
                                                    <th className="border-secondary text-center">Days</th>
                                                    <th className="border-secondary text-end">Amount</th>
                                                    <th className="border-secondary">Status</th>
                                                    <th className="border-secondary">Submitted</th>
                                                    <th className="border-secondary">Last Updated</th>
                                                    <th className="border-secondary text-center">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredTimesheets.map(timesheet => (
                                                    <tr key={timesheet.id} className={timesheet.status === 'approved' ? 'table-success' : timesheet.status === 'rejected' ? 'table-danger' : ''}>
                                                        <td className="border-secondary">
                                                            <div className="d-flex align-items-center">
                                                                {timesheet.employeeData?.employeePhotoUrl ? (
                                                                    <img
                                                                        src={timesheet.employeeData.employeePhotoUrl}
                                                                        alt="Employee"
                                                                        className="rounded-circle me-2"
                                                                        style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                                                                    />
                                                                ) : (
                                                                    <div
                                                                        className="rounded-circle bg-secondary d-flex align-items-center justify-content-center me-2"
                                                                        style={{ width: '40px', height: '40px' }}
                                                                    >
                                                                        <i className="bi bi-person text-white"></i>
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <div className="fw-bold text-white">{timesheet.employeeName}</div>
                                                                    <small className="text-muted">
                                                                        {timesheet.employeeData?.employeeId || timesheet.employeeData?.idNo}
                                                                    </small>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="border-secondary">
                                                            <small className="text-info">{timesheet.period}</small>
                                                            <br />
                                                            <small className="text-muted">
                                                                {timesheet.useDateRange ? 'Custom Range' : 'Monthly'}
                                                            </small>
                                                        </td>
                                                        <td className="border-secondary text-center">
                                                            <div>
                                                                <span className="fw-bold text-white">{timesheet.totalDays || 0}</span>
                                                                <br />
                                                                <small className="text-muted">
                                                                    W: {timesheet.workingDays || 0} | L: {timesheet.leaves || 0}
                                                                </small>
                                                            </div>
                                                        </td>
                                                        <td className="border-secondary text-end">
                                                            <div>
                                                                <strong className="text-success">₹{(timesheet.totalSalary || 0).toLocaleString()}</strong>
                                                                <br />
                                                                <small className="text-muted">
                                                                    Net: ₹{(timesheet.netPayable || 0).toLocaleString()}
                                                                </small>
                                                            </div>
                                                        </td>
                                                        <td className="border-secondary">
                                                            {getStatusBadge(timesheet.status)}
                                                            {timesheet.clarificationRequest && !timesheet.clarificationRequest.resolved && (
                                                                <i className="bi bi-exclamation-triangle text-warning ms-1" title="Clarification Requested"></i>
                                                            )}
                                                        </td>
                                                        <td className="border-secondary">
                                                            {timesheet.submittedAt ? (
                                                                <div>
                                                                    <small className="text-white">
                                                                        {new Date(timesheet.submittedAt).toLocaleDateString('en-IN')}
                                                                    </small>
                                                                    <br />
                                                                    <small className="text-muted">
                                                                        {timesheet.submittedByName}
                                                                    </small>
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted">Not submitted</span>
                                                            )}
                                                        </td>
                                                        <td className="border-secondary">
                                                            <small className="text-muted">
                                                                {timesheet.updatedAt ? new Date(timesheet.updatedAt).toLocaleDateString('en-IN') : 'N/A'}
                                                            </small>
                                                        </td>
                                                        <td className="border-secondary text-center">
                                                            <button
                                                                className="btn btn-sm btn-outline-info"
                                                                onClick={() => handleViewDetails(timesheet.id, timesheet.employeeId)}
                                                                title="View Details"
                                                                disabled={loading}
                                                            >
                                                                <i className="bi bi-eye"></i> View
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {filteredTimesheets.length === 0 && (
                                                    <tr>
                                                        <td colSpan="8" className="text-center py-4 text-muted border-secondary">
                                                            <i className="bi bi-inbox display-4 d-block mb-2 opacity-50"></i>
                                                            No timesheets found for the selected criteria.
                                                            <br />
                                                            <small>Try changing your filters or search terms.</small>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timesheet Detail Modal */}
                {showDetailModal && selectedTimesheet && (
                    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }} tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered modal-xl">
                            <div className="modal-content bg-dark border border-secondary">
                                <div className="modal-header border-secondary">
                                    <h5 className="modal-title text-info">
                                        <i className="bi bi-file-text me-2"></i>
                                        Timesheet Details - {selectedTimesheet.employeeName}
                                    </h5>
                                    <button
                                        type="button"
                                        className="btn-close btn-close-white"
                                        onClick={() => setShowDetailModal(false)}
                                        disabled={loading}
                                    ></button>
                                </div>
                                <div className="modal-body">
                                    {/* Header Summary */}
                                    <div className="row mb-4">
                                        <div className="col-md-4">
                                            <div className="card  border-secondary bg-secondary bg-opacity-10 h-100">
                                                <div className="card-body text-center">
                                                    {selectedTimesheet.employeeData?.employeePhotoUrl ? (
                                                        <img
                                                            src={selectedTimesheet.employeeData.employeePhotoUrl}
                                                            alt="Employee"
                                                            className="rounded-circle mb-3"
                                                            style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                                                        />
                                                    ) : (
                                                        <div
                                                            className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mx-auto mb-3"
                                                            style={{ width: '100px', height: '100px' }}
                                                        >
                                                            <i className="bi bi-person text-white fs-1"></i>
                                                        </div>
                                                    )}
                                                    <h6 className="text-white d-block">{selectedTimesheet.employeeName}</h6>
                                                    <small className="text-muted d-block">
                                                        ID: {selectedTimesheet.employeeData?.employeeId || selectedTimesheet.employeeData?.idNo}
                                                    </small>
                                                    <small className="text-info">{selectedTimesheet.employeeData?.primarySkill}</small>
                                                    <div className="mt-2">
                                                        <small className="text-warning">
                                                            Basic: ₹{selectedTimesheet.employeeData?.basicSalary || 'N/A'}
                                                        </small>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-8">
                                            <div className="card bg-dark border-secondary h-100">
                                                <div className="card-body">
                                                    <div className="row text-center">
                                                        <div className="col-4 mb-3">
                                                            <div className="border rounded border-info p-2 h-100">
                                                                <h6 className="text-info d-block">Total Days</h6>
                                                                <p className="h4 text-white">{selectedTimesheet.totalDays || 0}</p>
                                                            </div>
                                                        </div>
                                                        <div className="col-4 mb-3">
                                                            <div className="border border-success rounded p-2 h-100">
                                                                <h6 className="text-success d-block">Working Days</h6>
                                                                <p className="h4 text-white">{selectedTimesheet.workingDays || 0}</p>
                                                            </div>
                                                        </div>
                                                        <div className="col-4 mb-3">
                                                            <div className="border border-warning rounded p-2 h-100">
                                                                <h6 className="text-warning d-block">Leaves</h6>
                                                                <p className="h4 text-white">{selectedTimesheet.leaves || 0}</p>
                                                            </div>
                                                        </div>
                                                        <div className="col-4 mb-3">
                                                            <div className="border border-primary rounded p-2 h-100">
                                                                <h6 className="text-primary d-block">Holidays</h6>
                                                                <p className="h4 text-white">{selectedTimesheet.holidays || 0}</p>
                                                            </div>
                                                        </div>
                                                        <div className="col-4 mb-3">
                                                            <div className="border border-danger rounded p-2 h-100">
                                                                <h6 className="text-danger d-block">Advances</h6>
                                                                <p className="h4 text-white">₹{selectedTimesheet.advances || 0}</p>
                                                            </div>
                                                        </div>
                                                        <div className="col-4 mb-3">
                                                            <div className="border border-success rounded p-2 h-100">
                                                                <h6 className="text-success d-block">Net Payable</h6>
                                                                <p className="h4 text-warning">₹{selectedTimesheet.netPayable || 0}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="row mt-3">
                                                        <div className="col-12 text-center">
                                                            <small className="text-muted">Period: {selectedTimesheet.period}</small>
                                                            <span className="mx-2">•</span>
                                                            <small className="text-muted">
                                                                Status: {getStatusBadge(selectedTimesheet.status)}
                                                            </small>
                                                            <span className="mx-2">•</span>
                                                            <small className="text-muted">
                                                                Timesheet ID: {selectedTimesheet.timesheetId}
                                                            </small>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Daily Entries Table */}
                                    <div className="row mb-4">
                                        <div className="col-12">
                                            <div className="d-flex justify-content-between align-items-center mb-3">
                                                <h6 className="text-white mb-0">Daily Entries ({selectedTimesheet.dailyEntries?.length || 0})</h6>
                                                <small className="text-muted">Total Salary: ₹{selectedTimesheet.totalSalary || 0}</small>
                                            </div>
                                            <div className="table-responsive" style={{ maxHeight: '400px' }}>
                                                <table className="table table-dark table-sm table-striped">
                                                    <thead className="sticky-top">
                                                        <tr>
                                                            <th>Date</th>
                                                            <th>Client</th>
                                                            <th>Position</th>
                                                            <th>Status</th>
                                                            <th className="text-end">Salary</th>
                                                            <th>Notes</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {selectedTimesheet.dailyEntries?.map(entry => (
                                                            <tr key={entry.id}>
                                                                <td>
                                                                    <small>
                                                                        {new Date(entry.date).toLocaleDateString('en-IN', {
                                                                            weekday: 'short',
                                                                            day: 'numeric',
                                                                            month: 'short'
                                                                        })}
                                                                    </small>
                                                                </td>
                                                                <td>
                                                                    <div>
                                                                        <div>{entry.clientName}</div>
                                                                        <small className="text-muted">{entry.clientId}</small>
                                                                    </div>
                                                                </td>
                                                                <td>{entry.jobRole}</td>
                                                                <td>
                                                                    <span className={`badge ${entry.status === 'present' ? 'bg-success' :
                                                                        entry.status === 'leave' ? 'bg-warning' :
                                                                            entry.status === 'absent' ? 'bg-danger' :
                                                                                entry.isPublicHoliday ? 'bg-primary' : 'bg-secondary'
                                                                        }`}>
                                                                        {entry.status}
                                                                        {entry.isHalfDay && ' (½)'}
                                                                        {entry.isEmergency && ' ⚡'}
                                                                        {entry.isPublicHoliday && ' 🎉'}
                                                                    </span>
                                                                </td>
                                                                <td className="text-end">
                                                                    <span className={entry.dailySalary > 0 ? 'text-success' : 'text-muted'}>
                                                                        ₹{entry.dailySalary || 0}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    {entry.notes ? (
                                                                        <small className="text-info" title={entry.notes}>
                                                                            <i className="bi bi-chat-left-text"></i>
                                                                        </small>
                                                                    ) : (
                                                                        <span className="text-muted">-</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Advances Section */}
                                    {selectedTimesheet.advances && selectedTimesheet.advances.length > 0 && (
                                        <div className="row mb-4">
                                            <div className="col-12">
                                                <h6 className="text-white mb-3">Advances ({selectedTimesheet.advances.length})</h6>
                                                <div className="table-responsive">
                                                    <table className="table table-dark table-sm">
                                                        <thead>
                                                            <tr>
                                                                <th>Date</th>
                                                                <th>Amount</th>
                                                                <th>Purpose</th>
                                                                <th>Approved By</th>
                                                                <th>Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {selectedTimesheet.advances.map(advance => (
                                                                <tr key={advance.id}>
                                                                    <td>{new Date(advance.date).toLocaleDateString('en-IN')}</td>
                                                                    <td className="text-danger">₹{advance.amount}</td>
                                                                    <td>{advance.purpose}</td>
                                                                    <td>{advance.approvedByName}</td>
                                                                    <td>
                                                                        <span className={`badge ${advance.status === 'approved' ? 'bg-success' : 'bg-warning'}`}>
                                                                            {advance.status}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Clarification Input */}
                                    {showClarificationInput && (
                                        <div className="row mb-3">
                                            <div className="col-12">
                                                <div className="card bg-dark border-warning">
                                                    <div className="card-body">
                                                        <h6 className="text-warning">
                                                            <i className="bi bi-question-circle me-2"></i>
                                                            Request Clarification
                                                        </h6>
                                                        <textarea
                                                            className="form-control bg-dark text-white border-warning"
                                                            rows="3"
                                                            placeholder="Please specify what information you need from the employee..."
                                                            value={clarificationText}
                                                            onChange={(e) => setClarificationText(e.target.value)}
                                                        />
                                                        <div className="mt-2">
                                                            <button
                                                                className="btn btn-warning btn-sm me-2"
                                                                onClick={submitClarification}
                                                                disabled={!clarificationText.trim() || loading}
                                                            >
                                                                <i className="bi bi-send me-1"></i>
                                                                Submit Request
                                                            </button>
                                                            <button
                                                                className="btn btn-secondary btn-sm"
                                                                onClick={() => setShowClarificationInput(false)}
                                                                disabled={loading}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Existing Clarification Request */}
                                    {selectedTimesheet.clarificationRequest && !selectedTimesheet.clarificationRequest.resolved && (
                                        <div className="row mb-3">
                                            <div className="col-12">
                                                <div className="card bg-dark border-warning">
                                                    <div className="card-body">
                                                        <h6 className="text-warning">
                                                            <i className="bi bi-exclamation-triangle me-2"></i>
                                                            Clarification Requested
                                                        </h6>
                                                        <p className="text-white">{selectedTimesheet.clarificationRequest.text}</p>
                                                        <small className="text-muted">
                                                            Requested by: {selectedTimesheet.clarificationRequest.requestedByName} on{' '}
                                                            {new Date(selectedTimesheet.clarificationRequest.requestedAt).toLocaleString('en-IN')}
                                                        </small>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer border-secondary">
                                    <div className="d-flex justify-content-between w-100 align-items-center">
                                        <div>
                                            <small className="text-muted">
                                                Submitted: {selectedTimesheet.submittedAt ? new Date(selectedTimesheet.submittedAt).toLocaleString('en-IN') : 'Not submitted'}
                                                {selectedTimesheet.submittedByName && ` by ${selectedTimesheet.submittedByName}`}
                                            </small>
                                        </div>
                                        <div>
                                            {selectedTimesheet.status !== 'approved' && selectedTimesheet.status !== 'rejected' && (
                                                <>
                                                    <button
                                                        className="btn btn-success me-2"
                                                        onClick={() => handleStatusAction('approved')}
                                                        disabled={loading}
                                                    >
                                                        <i className="bi bi-check-circle me-1"></i>
                                                        Approve
                                                    </button>
                                                    <button
                                                        className="btn btn-danger me-2"
                                                        onClick={() => handleStatusAction('rejected')}
                                                        disabled={loading}
                                                    >
                                                        <i className="bi bi-x-circle me-1"></i>
                                                        Reject
                                                    </button>
                                                    <button
                                                        className="btn btn-warning me-2"
                                                        onClick={() => handleStatusAction('clarification')}
                                                        disabled={loading}
                                                    >
                                                        <i className="bi bi-question-circle me-1"></i>
                                                        Clarification
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => setShowDetailModal(false)}
                                                disabled={loading}
                                            >
                                                Close
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

        </>
    )
}
