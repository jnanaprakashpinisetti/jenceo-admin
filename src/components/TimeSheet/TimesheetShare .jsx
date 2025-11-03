import React from 'react';

const TimesheetShare = ({ timesheet, dailyEntries, advances, employee, previousTimesheets, onClose }) => {
    
    // Enhanced debug logging
    console.log('=== TIMESHEET SHARE DEBUG ===');
    console.log('Timesheet:', timesheet);
    console.log('Daily Entries:', dailyEntries);
    console.log('Employee:', employee);
    console.log('Advances:', advances);
    console.log('Previous Timesheets:', previousTimesheets);
    console.log('============================');

    // Enhanced employee data extraction
    const getEmployeeData = () => {
        console.log('=== EMPLOYEE DATA EXTRACTION ===');
        console.log('Raw employee:', employee);
        console.log('Raw timesheet:', timesheet);
        
        let extractedData = {
            photo: '',
            firstName: 'Employee',
            lastName: '',
            designation: 'Employee',
            employeeId: 'N/A',
            basicSalary: 0,
            dailyRate: 0
        };

        // Try to get data from employee object first
        if (employee && typeof employee === 'object') {
            console.log('Using employee object data');
            extractedData = {
                photo: employee.employeePhotoUrl || employee.photo || employee.profilePicture || '',
                firstName: employee.firstName || employee.basicInfo?.firstName || 'Employee',
                lastName: employee.lastName || employee.basicInfo?.lastName || '',
                designation: employee.designation || employee.jobRole || employee.primarySkill || employee.position || 'Employee',
                employeeId: employee.employeeId || employee.idNo || employee.empId || employee.basicInfo?.employeeId || 'N/A',
                basicSalary: employee.basicSalary || employee.salary || employee.salaryInfo?.basicSalary || 0,
                dailyRate: Math.round((employee.basicSalary || employee.salary || employee.salaryInfo?.basicSalary || 0) / 30)
            };
        }
        // Fallback to timesheet data
        else if (timesheet) {
            console.log('Using timesheet data as fallback');
            const nameParts = (timesheet.employeeName || '').split(' ');
            extractedData = {
                photo: '',
                firstName: nameParts[0] || 'Employee',
                lastName: nameParts.slice(1).join(' ') || '',
                designation: timesheet.designation || timesheet.jobRole || 'Employee',
                employeeId: timesheet.employeeId || 'N/A',
                basicSalary: timesheet.basicSalary || 0,
                dailyRate: Math.round((timesheet.basicSalary || 0) / 30)
            };
        }

        console.log('Extracted employee data:', extractedData);
        return extractedData;
    };

    const employeeData = getEmployeeData();
    
    // Check data availability
    const hasValidData = dailyEntries && dailyEntries.length > 0;
    const hasEmployeeData = employeeData.firstName !== 'Employee' || employeeData.employeeId !== 'N/A';

    console.log('Data Status:', {
        hasValidData,
        hasEmployeeData,
        dailyEntriesCount: dailyEntries?.length,
        employeeData
    });

    const generateWhatsAppHTML = () => {
        const totalSalary = dailyEntries?.reduce((sum, entry) => sum + (parseFloat(entry.dailySalary) || 0), 0) || 0;
        const totalAdvances = advances?.reduce((sum, advance) => sum + (parseFloat(advance.amount) || 0), 0) || 0;
        const netPayable = totalSalary - totalAdvances;

        // Calculate summary statistics
        const presentDays = dailyEntries?.filter(entry => entry.status === 'present').length || 0;
        const absentDays = dailyEntries?.filter(entry => entry.status === 'absent').length || 0;
        const leaveDays = dailyEntries?.filter(entry => entry.status === 'leave').length || 0;
        const holidayDays = dailyEntries?.filter(entry => entry.status === 'holiday' || entry.isPublicHoliday).length || 0;
        const totalDays = dailyEntries?.length || 0;

        console.log('Generated HTML with stats:', {
            totalSalary,
            totalAdvances,
            netPayable,
            presentDays,
            absentDays,
            leaveDays,
            holidayDays,
            totalDays
        });

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Timesheet - ${timesheet?.employeeName || employeeData.firstName}</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .timesheet-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            overflow: hidden;
        }
        .header-section {
            background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
            color: white;
            padding: 30px;
            display: flex;
            align-items: center;
            gap: 25px;
        }
        .employee-photo {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            border: 4px solid white;
            object-fit: cover;
            background: #ecf0f1;
        }
        .photo-placeholder {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            border: 4px solid white;
            background: #ecf0f1;
            display: flex;
            justify-content: center;
            align-items: center;
            color: #7f8c8d;
            font-size: 12px;
        }
        .employee-info {
            flex: 1;
        }
        .employee-name {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 5px;
        }
        .employee-designation {
            font-size: 18px;
            opacity: 0.9;
            margin-bottom: 10px;
        }
        .employee-details {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
        }
        .detail-item {
            background: rgba(255,255,255,0.2);
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 14px;
        }
        .main-content {
            padding: 30px;
        }
        .section-title {
            font-size: 20px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #3498db;
        }
        .timesheet-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .timesheet-table th {
            background: #34495e;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
            font-size: 14px;
        }
        .timesheet-table td {
            padding: 12px 15px;
            border-bottom: 1px solid #ecf0f1;
            font-size: 14px;
        }
        .timesheet-table tr:hover {
            background: #f8f9fa;
        }
        .status-present { 
            background: #d4edda; 
            color: #155724;
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: 600;
        }
        .status-absent { 
            background: #f8d7da; 
            color: #721c24;
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: 600;
        }
        .status-leave { 
            background: #fff3cd; 
            color: #856404;
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: 600;
        }
        .status-holiday { 
            background: #cce7ff; 
            color: #004085;
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: 600;
        }
        .summary-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            border-left: 5px solid #3498db;
        }
        .summary-card.attendance {
            border-left-color: #e74c3c;
        }
        .summary-card.financial {
            border-left-color: #27ae60;
        }
        .card-title {
            font-size: 18px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
        }
        .stat-item {
            text-align: center;
            padding: 15px;
            border-radius: 8px;
            background: #f8f9fa;
        }
        .stat-value {
            font-size: 24px;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 5px;
        }
        .stat-label {
            font-size: 12px;
            color: #7f8c8d;
            font-weight: 600;
        }
        .financial-stats {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        .financial-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            border-radius: 8px;
            background: #f8f9fa;
        }
        .financial-item.total {
            background: #d4edda;
            border-left: 4px solid #27ae60;
        }
        .financial-item.advances {
            background: #f8d7da;
            border-left: 4px solid #e74c3c;
        }
        .financial-item.net {
            background: #fff3cd;
            border-left: 4px solid #f39c12;
        }
        .financial-label {
            font-size: 14px;
            font-weight: 600;
            color: #2c3e50;
        }
        .financial-value {
            font-size: 18px;
            font-weight: 700;
        }
        .footer {
            text-align: center;
            padding: 20px;
            background: #ecf0f1;
            color: #7f8c8d;
            font-size: 12px;
            border-top: 1px solid #bdc3c7;
        }
        .badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            margin-left: 5px;
        }
        .badge-halfday {
            background: #ffc107;
            color: #000;
        }
        .badge-emergency {
            background: #dc3545;
            color: white;
        }
        @media (max-width: 768px) {
            .header-section {
                flex-direction: column;
                text-align: center;
                padding: 20px;
            }
            .employee-details {
                justify-content: center;
            }
            .summary-section {
                grid-template-columns: 1fr;
            }
            .stats-grid {
                grid-template-columns: 1fr;
            }
            .timesheet-table {
                font-size: 12px;
            }
            .timesheet-table th,
            .timesheet-table td {
                padding: 8px 10px;
            }
        }
    </style>
</head>
<body>
    <div class="timesheet-container">
        <!-- Header Section with Employee Photo and Basic Info -->
        <div class="header-section">
            ${employeeData.photo ? `
                <img src="${employeeData.photo}" 
                     alt="Employee Photo" 
                     class="employee-photo"
                     onerror="this.style.display='none'; document.getElementById('photo-placeholder').style.display='flex';">
                <div id="photo-placeholder" class="photo-placeholder" style="display: none;">
                    <span>No Photo</span>
                </div>
            ` : `
                <div class="photo-placeholder">
                    <span>No Photo</span>
                </div>
            `}
            <div class="employee-info">
                <div class="employee-name">${employeeData.firstName} ${employeeData.lastName}</div>
                <div class="employee-designation">${employeeData.designation}</div>
                <div class="employee-details">
                    <div class="detail-item">ID: ${employeeData.employeeId}</div>
                    <div class="detail-item">Basic Salary: ₹${employeeData.basicSalary}</div>
                    <div class="detail-item">Daily Rate: ₹${employeeData.dailyRate}</div>
                    <div class="detail-item">Period: ${timesheet?.period || 'N/A'}</div>
                </div>
            </div>
        </div>

        <div class="main-content">
            <!-- Timesheet Table -->
            <h3 class="section-title">📅 Daily Timesheet Entries</h3>
            ${dailyEntries && dailyEntries.length > 0 ? `
            <table class="timesheet-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Client Name</th>
                        <th>Job Role</th>
                        <th>Status</th>
                        <th>Salary</th>
                        <th>Comments</th>
                    </tr>
                </thead>
                <tbody>
                    ${dailyEntries.map(entry => `
                        <tr>
                            <td><strong>${new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></td>
                            <td>${entry.clientName || '-'}</td>
                            <td>${entry.jobRole || '-'}</td>
                            <td>
                                <span class="status-${entry.status}">
                                    ${entry.status}
                                    ${entry.isHalfDay ? '<span class="badge badge-halfday">½ Day</span>' : ''}
                                    ${entry.isEmergency ? '<span class="badge badge-emergency">Emergency</span>' : ''}
                                </span>
                            </td>
                            <td>₹${(entry.dailySalary || 0).toFixed(2)}</td>
                            <td>${entry.notes || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ` : `
            <div style="text-align: center; padding: 40px; background: #f8f9fa; border-radius: 10px;">
                <h4 style="color: #6c757d;">No Daily Entries Found</h4>
                <p style="color: #6c757d;">There are no timesheet entries to display.</p>
            </div>
            `}

            <!-- Summary Section -->
            <div class="summary-section">
                <!-- Attendance Summary -->
                <div class="summary-card attendance">
                    <div class="card-title">
                        📊 Attendance Summary
                    </div>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-value">${presentDays}</div>
                            <div class="stat-label">Present Days</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${absentDays}</div>
                            <div class="stat-label">Absent Days</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${leaveDays}</div>
                            <div class="stat-label">Leave Days</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${holidayDays}</div>
                            <div class="stat-label">Holidays</div>
                        </div>
                        <div class="stat-item" style="grid-column: span 2;">
                            <div class="stat-value">${totalDays}</div>
                            <div class="stat-label">Total Days</div>
                        </div>
                    </div>
                </div>

                <!-- Financial Summary -->
                <div class="summary-card financial">
                    <div class="card-title">
                        💰 Financial Summary
                    </div>
                    <div class="financial-stats">
                        <div class="financial-item">
                            <div class="financial-label">Basic Salary</div>
                            <div class="financial-value">₹${employeeData.basicSalary}</div>
                        </div>
                        <div class="financial-item">
                            <div class="financial-label">Daily Rate</div>
                            <div class="financial-value">₹${employeeData.dailyRate}</div>
                        </div>
                        <div class="financial-item total">
                            <div class="financial-label">Total Salary</div>
                            <div class="financial-value">₹${totalSalary.toFixed(2)}</div>
                        </div>
                        <div class="financial-item advances">
                            <div class="financial-label">Advances</div>
                            <div class="financial-value">₹${totalAdvances.toFixed(2)}</div>
                        </div>
                        <div class="financial-item net">
                            <div class="financial-label">Net Payable</div>
                            <div class="financial-value">₹${netPayable.toFixed(2)}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>Generated on ${new Date().toLocaleString('en-IN')} | Timesheet ID: ${timesheet?.timesheetId || 'N/A'}</p>
            <p>© ${new Date().getFullYear()} JenCeo</p>
        </div>
    </div>
</body>
</html>
        `;
    };

    // Enhanced debug info component
    const DebugInfo = () => (
        <div className="card mb-3 bg-warning bg-opacity-10">
            <div className="card-body">
                <h6 className="text-warning">🔧 Debug Information</h6>
                <div className="row small">
                    <div className="col-md-4">
                        <strong>Employee Data:</strong><br/>
                        Name: {employeeData.firstName} {employeeData.lastName}<br/>
                        ID: {employeeData.employeeId}<br/>
                        Designation: {employeeData.designation}<br/>
                        Salary: ₹{employeeData.basicSalary}
                    </div>
                    <div className="col-md-4">
                        <strong>Timesheet Data:</strong><br/>
                        Entries: {dailyEntries?.length || 0}<br/>
                        Advances: {advances?.length || 0}<br/>
                        Timesheet ID: {timesheet?.timesheetId || 'None'}<br/>
                        Period: {timesheet?.period || 'N/A'}
                    </div>
                    <div className="col-md-4">
                        <strong>Data Status:</strong><br/>
                        Has Employee: {!!employee}<br/>
                        Has Timesheet: {!!timesheet}<br/>
                        Has Entries: {hasValidData ? 'Yes' : 'No'}<br/>
                        Entries Count: {dailyEntries?.length || 0}
                    </div>
                </div>
                {dailyEntries && dailyEntries.length > 0 && (
                    <div className="mt-2">
                        <strong>First Entry Sample:</strong> 
                        <pre className="small bg-dark text-white p-2 mt-1" style={{fontSize: '10px', maxHeight: '100px', overflow: 'auto'}}>
                            {JSON.stringify(dailyEntries[0], null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="container-fluid p-4">
            <div className="row">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h3 className="text-primary">
                            <i className="bi bi-share me-2"></i>
                            Share Timesheet
                        </h3>
                        <button className="btn btn-secondary" onClick={onClose}>
                            <i className="bi bi-x-lg me-2"></i>
                            Close
                        </button>
                    </div>

                    <DebugInfo />

                    {/* Action Buttons */}
                    <div className="card mb-4">
                        <div className="card-body">
                            <div className="d-flex gap-3">
                                <button 
                                    className="btn btn-success"
                                    // onClick={downloadHTMLFile}
                                    disabled={!dailyEntries || dailyEntries.length === 0}
                                >
                                    <i className="bi bi-download me-2"></i>
                                    Download HTML
                                </button>
                                <button 
                                    className="btn btn-success"
                                    // onClick={shareViaWhatsApp}
                                    disabled={!dailyEntries || dailyEntries.length === 0}
                                >
                                    <i className="bi bi-whatsapp me-2"></i>
                                    Share via WhatsApp
                                </button>
                            </div>
                        </div>
                    </div>
                  
                    {/* Preview Section */}
                    <div className="card">
                        <div className="card-header">
                            <h5 className="card-title mb-0">
                                <i className="bi bi-eye me-2"></i>
                                Timesheet Preview
                            </h5>
                        </div>
                        <div className="card-body">
                            <div 
                                dangerouslySetInnerHTML={{ 
                                    __html: generateWhatsAppHTML() 
                                }} 
                                style={{ 
                                    maxHeight: '600px', 
                                    overflow: 'auto',
                                    border: '1px solid #ddd',
                                    borderRadius: '8px'
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TimesheetShare;