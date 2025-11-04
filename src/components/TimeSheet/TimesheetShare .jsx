import React, { useState } from 'react';

const TimesheetShare = ({ timesheet, dailyEntries, advances, employee, previousTimesheets, onClose }) => {
    const [activeTab, setActiveTab] = useState('preview');

    const getEmployeeData = () => {
        let extractedData = {
            photo: '',
            firstName: 'Employee',
            lastName: '',
            designation: 'Employee',
            employeeId: 'N/A',
            basicSalary: 0,
            dailyRate: 0
        };

        if (!employee && !timesheet) {
            return extractedData;
        }

        if (employee && typeof employee === 'object') {
            extractedData = {
                photo: employee.employeePhotoUrl || employee.photo || employee.profilePicture || employee.image || '',
                firstName: employee.firstName || employee.basicInfo?.firstName || employee.name?.split(' ')[0] || 'Employee',
                lastName: employee.lastName || employee.basicInfo?.lastName || employee.name?.split(' ').slice(1).join(' ') || '',
                designation: employee.designation || employee.jobRole || employee.primarySkill || employee.position || employee.role || 'Employee',
                employeeId: employee.employeeId || employee.idNo || employee.empId || employee.basicInfo?.employeeId || employee.id || 'N/A',
                basicSalary: employee.basicSalary || employee.salary || employee.salaryInfo?.basicSalary || employee.monthlySalary || 0,
                dailyRate: Math.round((employee.basicSalary || employee.salary || employee.salaryInfo?.basicSalary || employee.monthlySalary || 0) / 30)
            };
        } else if (timesheet && typeof timesheet === 'object') {
            const nameParts = (timesheet.employeeName || timesheet.employee?.name || '').split(' ');
            extractedData = {
                photo: timesheet.employeePhoto || timesheet.photo || '',
                firstName: nameParts[0] || 'Employee',
                lastName: nameParts.slice(1).join(' ') || '',
                designation: timesheet.designation || timesheet.jobRole || timesheet.employee?.designation || 'Employee',
                employeeId: timesheet.employeeId || timesheet.employee?.employeeId || 'N/A',
                basicSalary: timesheet.basicSalary || timesheet.salary || timesheet.employee?.basicSalary || 0,
                dailyRate: Math.round((timesheet.basicSalary || timesheet.salary || timesheet.employee?.basicSalary || 0) / 30)
            };
        }

        return extractedData;
    };

    const employeeData = getEmployeeData();
    
    const getValidDailyEntries = () => {
        if (!dailyEntries) return [];
        if (Array.isArray(dailyEntries)) {
            return dailyEntries.filter(entry => 
                entry && typeof entry === 'object' && entry.date
            );
        }
        return [];
    };

    const validDailyEntries = getValidDailyEntries();
    const hasValidData = validDailyEntries.length > 0;

    const calculateSummary = () => {
        const totalSalary = validDailyEntries.reduce((sum, entry) => {
            const salary = parseFloat(entry.dailySalary) || parseFloat(entry.salary) || 0;
            return sum + salary;
        }, 0);
        
        const totalAdvances = advances && Array.isArray(advances) 
            ? advances.reduce((sum, advance) => sum + (parseFloat(advance.amount) || 0), 0) 
            : 0;
            
        const netPayable = totalSalary - totalAdvances;

        const presentDays = validDailyEntries.filter(entry => 
            entry.status === 'present' || entry.attendanceStatus === 'present'
        ).length;
        
        const absentDays = validDailyEntries.filter(entry => 
            entry.status === 'absent' || entry.attendanceStatus === 'absent'
        ).length;
        
        const leaveDays = validDailyEntries.filter(entry => 
            entry.status === 'leave' || entry.attendanceStatus === 'leave'
        ).length;
        
        const holidayDays = validDailyEntries.filter(entry => 
            entry.status === 'holiday' || entry.isPublicHoliday || entry.attendanceStatus === 'holiday'
        ).length;
        
        const totalDays = validDailyEntries.length;

        return {
            totalSalary,
            totalAdvances,
            netPayable,
            presentDays,
            absentDays,
            leaveDays,
            holidayDays,
            totalDays
        };
    };

    const summary = calculateSummary();

    const generateWhatsAppHTML = () => {
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
            font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .timesheet-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header-section {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            display: flex;
            align-items: center;
            gap: 30px;
            position: relative;
            overflow: hidden;
        }
        .header-section::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 100%;
            height: 200%;
            background: rgba(255,255,255,0.1);
            transform: rotate(45deg);
        }
        .employee-photo {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            border: 4px solid white;
            object-fit: cover;
            background: #ecf0f1;
            position: relative;
            z-index: 2;
            box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        }
        .photo-placeholder {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            border: 4px solid white;
            background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            color: white;
            font-size: 14px;
            font-weight: 600;
            position: relative;
            z-index: 2;
            box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        }
        .employee-info {
            flex: 1;
            position: relative;
            z-index: 2;
        }
        .employee-name {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 8px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .employee-designation {
            font-size: 20px;
            opacity: 0.95;
            margin-bottom: 15px;
            font-weight: 500;
        }
        .employee-details {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
        }
        .detail-item {
            background: rgba(255,255,255,0.2);
            backdrop-filter: blur(10px);
            padding: 10px 20px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: 500;
            border: 1px solid rgba(255,255,255,0.3);
        }
        .main-content {
            padding: 40px;
        }
        .section-title {
            font-size: 24px;
            font-weight: 700;
            color: #2d3436;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 3px solid #667eea;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        /* Desktop Table Styles */
        .timesheet-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 40px;
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
            font-size: 14px;
            display: table;
        }
        .timesheet-table th {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 18px 20px;
            text-align: left;
            font-weight: 600;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .timesheet-table td {
            padding: 16px 20px;
            border-bottom: 1px solid #f1f3f4;
            color: #2d3436;
            transition: all 0.3s ease;
        }
        .timesheet-table tr:hover td {
            background: #f8f9fa;
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .timesheet-table tr:last-child td {
            border-bottom: none;
        }
            .timesheet-table tr:nth-child(even) td {
            background-color:#ebf2fd
            }
        
        /* Mobile Card Styles */
        .timesheet-cards {
            display: none;
            flex-direction: column;
            gap: 15px;
            margin-bottom: 40px;
        }
        .timesheet-card {
            background: white;
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
            border-left: 5px solid #667eea;
            transition: all 0.3s ease;
        }
        .timesheet-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 30px rgba(0,0,0,0.15);
        }
        .card-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid #f1f3f4;
        }
        .card-row:last-child {
            margin-bottom: 0;
            padding-bottom: 0;
            border-bottom: none;
        }
        .card-label {
            font-weight: 600;
            color: #636e72;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            min-width: 100px;
        }
        .card-value {
            flex: 1;
            text-align: right;
            font-weight: 500;
            color: #2d3436;
        }
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 2px solid #f1f3f4;
        }
        .card-date {
            font-weight: 700;
            font-size: 16px;
            color: #2d3436;
        }
        
        .status-present { 
            background: linear-gradient(135deg, #00b894 0%, #00a085 100%);
            color: white;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            display: inline-block;
        }
        .status-absent { 
            background: linear-gradient(135deg, #ff7675 0%, #d63031 100%);
            color: white;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            display: inline-block;
        }
        .status-leave { 
            background: linear-gradient(135deg, #fdcb6e 0%, #e17055 100%);
            color: white;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            display: inline-block;
        }
        .status-holiday { 
            background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
            color: white;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            display: inline-block;
        }
        .summary-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 40px;
        }
        .summary-card {
            background: white;
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
            border-left: 5px solid #667eea;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .summary-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 35px rgba(0,0,0,0.15);
        }
        .summary-card.attendance {
            border-left-color: #00b894;
        }
        .summary-card.financial {
            border-left-color: #fd79a8;
        }
        .card-title {
            font-size: 20px;
            font-weight: 700;
            color: #2d3436;
            margin-bottom: 25px;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
        }
        .stat-item {
            text-align: center;
            padding: 20px;
            border-radius: 12px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            transition: all 0.3s ease;
        }
        .stat-item:hover {
            transform: translateY(-3px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .stat-value {
            font-size: 28px;
            font-weight: 800;
            color: #2d3436;
            margin-bottom: 8px;
        }
        .stat-label {
            font-size: 13px;
            color: #636e72;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .financial-stats {
            display: flex;
            flex-direction: column;
            gap: 18px;
        }
        .financial-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 18px;
            border-radius: 12px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            transition: all 0.3s ease;
        }
        .financial-item:hover {
            transform: translateX(5px);
        }
        .financial-item.total {
            background: linear-gradient(135deg, #00b894 0%, #00a085 100%);
            color: white;
        }
        .financial-item.advances {
            background: linear-gradient(135deg, #ff7675 0%, #d63031 100%);
            color: white;
        }
        .financial-item.net {
            background: linear-gradient(135deg, #fdcb6e 0%, #e17055 100%);
            color: white;
        }
        .financial-label {
            font-size: 15px;
            font-weight: 600;
        }
        .financial-value {
            font-size: 20px;
            font-weight: 800;
        }
        .footer {
            text-align: center;
            padding: 25px;
            background: linear-gradient(135deg, #2d3436 0%, #636e72 100%);
            color: white;
            font-size: 13px;
        }
        .badge {
            padding: 4px 10px;
            border-radius: 15px;
            font-size: 10px;
            font-weight: 700;
            margin-left: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .badge-halfday {
            background: #fdcb6e;
            color: #000;
        }
        .badge-emergency {
            background: #e17055;
            color: white;
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
        .summary-card {
        width:100%}
            .header-section {
                flex-direction: column;
                text-align: center;
                padding: 30px 20px;
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
                display: none;
            }
            .timesheet-cards {
                display: flex;
            }
            .main-content {
                padding: 25px;
            }
        }
        
        @media (min-width: 769px) {
            .timesheet-table {
                display: table;
            }
            .timesheet-cards {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="timesheet-container">
        <div class="header-section">
            ${employeeData.photo ? `
                <img src="${employeeData.photo}" 
                     alt="Employee Photo" 
                     class="employee-photo"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="photo-placeholder" style="display: none;">
                    <span>📷</span>
                </div>
            ` : `
                <div class="photo-placeholder">
                    <span>👤</span>
                </div>
            `}
            <div class="employee-info">
                <div class="employee-name">${employeeData.firstName} ${employeeData.lastName}</div>
                <div class="employee-designation">${employeeData.designation}</div>
                <div class="employee-details">
                    <div class="detail-item">🆔 ${employeeData.employeeId}</div>
                    <div class="detail-item">💰 ₹${employeeData.basicSalary}</div>
                    <div class="detail-item">📅 ₹${employeeData.dailyRate}/day</div>
                    <div class="detail-item">📊 ${timesheet?.period || 'N/A'}</div>
                </div>
            </div>
        </div>

        <div class="main-content">
            <h3 class="section-title">📅 Daily Timesheet Entries</h3>
            ${validDailyEntries.length > 0 ? `
            <!-- Desktop Table -->
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
                    ${validDailyEntries.map(entry => {
                        const date = entry.date ? new Date(entry.date).toLocaleDateString('en-IN', { 
                            day: '2-digit', 
                            month: 'short', 
                            year: 'numeric' 
                        }) : 'Invalid Date';
                        
                        const salary = parseFloat(entry.dailySalary) || parseFloat(entry.salary) || 0;
                        const status = entry.status || entry.attendanceStatus || 'unknown';
                        
                        return `
                        <tr>
                            <td><strong>${date}</strong></td>
                            <td>${entry.clientName || entry.client || '-'}</td>
                            <td>${entry.jobRole || entry.role || '-'}</td>
                            <td>
                                <span class="status-${status}">
                                    ${status.charAt(0).toUpperCase() + status.slice(1)}
                                    ${entry.isHalfDay ? '<span class="badge badge-halfday">½ Day</span>' : ''}
                                    ${entry.isEmergency ? '<span class="badge badge-emergency">Emergency</span>' : ''}
                                </span>
                            </td>
                            <td><strong>₹${salary.toFixed(2)}</strong></td>
                            <td><em>${entry.notes || entry.comments || '-'}</em></td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            
            <!-- Mobile Cards -->
            <div class="timesheet-cards">
                ${validDailyEntries.map(entry => {
                    const date = entry.date ? new Date(entry.date).toLocaleDateString('en-IN', { 
                        day: '2-digit', 
                        month: 'short', 
                        year: 'numeric' 
                    }) : 'Invalid Date';
                    
                    const salary = parseFloat(entry.dailySalary) || parseFloat(entry.salary) || 0;
                    const status = entry.status || entry.attendanceStatus || 'unknown';
                    
                    return `
                    <div class="timesheet-card">
                        <div class="card-header">
                            <div class="card-date">${date}</div>
                            <div>
                                <span class="status-${status}">
                                    ${status.charAt(0).toUpperCase() + status.slice(1)}
                                    ${entry.isHalfDay ? '<span class="badge badge-halfday">½ Day</span>' : ''}
                                    ${entry.isEmergency ? '<span class="badge badge-emergency">Emergency</span>' : ''}
                                </span>
                            </div>
                        </div>
                        <div class="card-row">
                            <div class="card-label">Client</div>
                            <div class="card-value">${entry.clientName || entry.client || '-'}</div>
                        </div>
                        <div class="card-row">
                            <div class="card-label">Job Role</div>
                            <div class="card-value">${entry.jobRole || entry.role || '-'}</div>
                        </div>
                        <div class="card-row">
                            <div class="card-label">Salary</div>
                            <div class="card-value"><strong>₹${salary.toFixed(2)}</strong></div>
                        </div>
                        <div class="card-row">
                            <div class="card-label">Comments</div>
                            <div class="card-value"><em>${entry.notes || entry.comments || '-'}</em></div>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
            ` : `
            <div style="text-align: center; padding: 60px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 15px; border: 2px dashed #dee2e6;">
                <div style="font-size: 48px; margin-bottom: 20px;">📊</div>
                <h4 style="color: #6c757d; margin-bottom: 10px;">No Daily Entries Found</h4>
                <p style="color: #6c757d;">There are no timesheet entries to display.</p>
            </div>
            `}

            <div class="summary-section">
                <div class="summary-card attendance">
                    <div class="card-title">
                        📊 Attendance Summary
                    </div>
                    <div class="stats-grid">
                        <div class="stat-item">
                        <div class="stat-value">${summary.totalDays}</div>
                            <div class="stat-label">DAYS</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${summary.absentDays}</div>
                            <div class="stat-label">Absent</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${summary.leaveDays}</div>
                            <div class="stat-label">Leave</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${summary.holidayDays}</div>
                            <div class="stat-label">Holidays</div>
                        </div>
                        <div class="stat-item " style="grid-column: span 2;">
                        <div class="stat-value text-info">${summary.presentDays}</div>
                            <div class="stat-label">Working Days</div>
                        </div>
                    </div>
                </div>

                <div class="summary-card financial">
                    <div class="card-title">
                        💰 Financial Summary
                    </div>
                    <div class="financial-stats">
                        <div class="financial-item text-black">
                            <div class="financial-label">Basic Salary</div>
                            <div class="financial-value">₹${employeeData.basicSalary}</div>
                        </div>
                        <div class="financial-item text-black">
                            <div class="financial-label">Daily Rate</div>
                            <div class="financial-value">₹${employeeData.dailyRate}</div>
                        </div>
                        <div class="financial-item total">
                            <div class="financial-label">Total Salary</div>
                            <div class="financial-value">₹${summary.totalSalary.toFixed(2)}</div>
                        </div>
                        <div class="financial-item advances">
                            <div class="financial-label">Advances</div>
                            <div class="financial-value">₹${summary.totalAdvances.toFixed(2)}</div>
                        </div>
                        <div class="financial-item net">
                            <div class="financial-label">Net Payable</div>
                            <div class="financial-value">₹${summary.netPayable.toFixed(2)}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>Generated on ${new Date().toLocaleString('en-IN')} | Timesheet ID: ${timesheet?.timesheetId || timesheet?.id || 'N/A'}</p>
            <p>© ${new Date().getFullYear()} JenCeo - Timesheet Management System</p>
        </div>
    </div>
</body>
</html>
        `;
    };

    const downloadHTMLFile = () => {
        const htmlContent = generateWhatsAppHTML();
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `timesheet-${employeeData.employeeId}-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const shareViaWhatsApp = () => {
        const htmlContent = generateWhatsAppHTML();
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const message = `📊 Timesheet Summary for ${employeeData.firstName} ${employeeData.lastName}\n\n` +
                       `👤 Employee: ${employeeData.firstName} ${employeeData.lastName}\n` +
                       `🆔 ID: ${employeeData.employeeId}\n` +
                       `💼 Designation: ${employeeData.designation}\n` +
                       `📅 Period: ${timesheet?.period || 'N/A'}\n` +
                       `💰 Net Payable: ₹${summary.netPayable.toFixed(2)}\n\n` +
                       `Download full timesheet: ${url}`;
        
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <div className="container-fluid p-4 bg-light min-vh-100">
            <div className="row justify-content-center">
                <div className="col-12">
                    {/* Header */}
                    <div className="card border-0 shadow-lg mb-4">
                        <div className="card-header bg-gradient-primary text-white py-4">
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h2 className="mb-1">
                                        <i className="bi bi-share-fill me-3"></i>
                                        Share Timesheet
                                    </h2>
                                    <p className="mb-0 opacity-75">
                                        Share and export timesheet for ${employeeData.firstName} ${employeeData.lastName}
                                    </p>
                                </div>
                                <button 
                                    className="btn btn-light btn-sm"
                                    onClick={onClose}
                                >
                                    <i className="bi bi-x-lg me-2"></i>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Action Cards */}
                    <div className="row mb-4">
                        <div className="col-md-6 mb-3">
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-body text-center p-4">
                                    <div className="text-success mb-3">
                                        <i className="bi bi-file-earmark-arrow-down display-4"></i>
                                    </div>
                                    <h5 className="card-title">Download HTML</h5>
                                    <p className="card-text text-muted">
                                        Download timesheet as a beautiful HTML file
                                    </p>
                                    <button 
                                        className="btn btn-success px-4"
                                        onClick={downloadHTMLFile}
                                        disabled={!hasValidData}
                                    >
                                        <i className="bi bi-download me-2"></i>
                                        Download
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="col-md-6 mb-3">
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-body text-center p-4">
                                    <div className="text-success mb-3">
                                        <i className="bi bi-whatsapp display-4"></i>
                                    </div>
                                    <h5 className="card-title">Share via WhatsApp</h5>
                                    <p className="card-text text-muted">
                                        Share timesheet summary via WhatsApp
                                    </p>
                                    <button 
                                        className="btn btn-success px-4"
                                        onClick={shareViaWhatsApp}
                                        disabled={!hasValidData}
                                    >
                                        <i className="bi bi-whatsapp me-2"></i>
                                        Share
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Preview Section */}
                    <div className="card border-0 shadow-lg">
                        <div className="card-header bg-white py-3">
                            <h5 className="card-title mb-0">
                                <i className="bi bi-eye me-2"></i>
                                Timesheet Preview
                            </h5>
                        </div>
                        <div className="card-body p-0">
                            <div 
                                dangerouslySetInnerHTML={{ 
                                    __html: generateWhatsAppHTML() 
                                }} 
                                style={{ 
                                    maxHeight: '70vh', 
                                    overflow: 'auto',
                                    borderRadius: '0 0 8px 8px'
                                }}
                            />
                        </div>
                    </div>

                    {/* Status Info */}
                    {!hasValidData && (
                        <div className="alert alert-warning mt-4 border-0 shadow-sm">
                            <div className="d-flex align-items-center">
                                <i className="bi bi-exclamation-triangle me-3 fs-4"></i>
                                <div>
                                    <h6 className="alert-heading mb-1">No Data Available</h6>
                                    <p className="mb-0">There are no timesheet entries to display or share.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TimesheetShare;