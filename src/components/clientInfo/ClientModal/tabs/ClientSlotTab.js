import React, { useState, useEffect, useMemo } from "react";
import firebaseDB from "../../../../firebase";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, differenceInHours, differenceInMinutes, isValid, isToday, isThisMonth } from 'date-fns';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const ClientSlotTab = ({ client }) => {
  const [loading, setLoading] = useState(true);
  const [slotData, setSlotData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState("dashboard"); // dashboard, daily, monthly
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthlyStats, setMonthlyStats] = useState({
    totalHours: 0,
    totalDays: 0,
    totalWorkers: 0,
    avgDailyHours: 0,
    utilizationRate: 0,
    topWorkers: [],
    slotDistribution: {},
    dailyBreakdown: []
  });
  const [dailyStats, setDailyStats] = useState({
    date: new Date(),
    totalHours: 0,
    totalSlots: 0,
    workers: [],
    slotDetails: [],
    timeDistribution: []
  });
  const [workerDetails, setWorkerDetails] = useState({});
  const [activeTab, setActiveTab] = useState("overview");

  // Define client paths (same as SlotBook.js)
  const clientPaths = {
    "Home Care": "ClientData/HomeCare/Running",
    "Housekeeping": "ClientData/Housekeeping/Running",
    "Office & Administrative": "ClientData/Office/Running",
    "Customer Service": "ClientData/Customer/Running",
    "Management & Supervision": "ClientData/Management/Running",
    "Security": "ClientData/Security/Running",
    "Driving & Logistics": "ClientData/Driving/Running",
    "Technical & Maintenance": "ClientData/Technical/Running",
    "Retail & Sales": "ClientData/Retail/Running",
    "Industrial & Labor": "ClientData/Industrial/Running",
    "Others": "ClientData/Others/Running"
  };

  // Color palette for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

  useEffect(() => {
    if (client?.clientKey || client?.id || client?.clientId) {
      fetchClientSlotData();
    }
  }, [client, selectedMonth, selectedDate, viewMode]);

  const fetchClientSlotData = async () => {
    try {
      setLoading(true);
      
      let allSlots = [];
      const workerMap = {};
      
      // Get client key from different possible fields
      const clientKey = client?.clientKey || client?.id || client?.clientId;
      
      if (!clientKey) {
        console.error("No client key found");
        setLoading(false);
        return;
      }

      console.log("Fetching slot data for client:", clientKey);

      // Check all departments for this client's slot data
      for (const [department, path] of Object.entries(clientPaths)) {
        try {
          // Try different path structures
          const possiblePaths = [
            `${path}/${clientKey}/schedule`,
            `${path}/${clientKey}`,
            `ScheduleData/${department}/${clientKey}`,
            `ScheduleData/${clientKey}`
          ];

          for (const clientPath of possiblePaths) {
            try {
              const snapshot = await firebaseDB.child(clientPath).once('value');
              const clientData = snapshot.val();

              if (clientData) {
                console.log(`Found data in ${clientPath} for ${department}:`, clientData);
                
                // Handle different data structures
                const scheduleData = clientData.schedule || clientData;
                
                if (scheduleData && typeof scheduleData === 'object') {
                  Object.entries(scheduleData).forEach(([dateKey, daySchedule]) => {
                    try {
                      // Try to parse the date key
                      let scheduleDate;
                      try {
                        scheduleDate = parseISO(dateKey);
                      } catch {
                        scheduleDate = new Date(dateKey);
                      }
                      
                      if (!isValid(scheduleDate)) {
                        console.warn(`Invalid date format: ${dateKey}`);
                        return;
                      }

                      // Apply filtering based on view mode
                      if (viewMode === "dashboard") {
                        // For dashboard, show all data
                      } else if (viewMode === "monthly") {
                        // Filter by selected month
                        const monthStart = startOfMonth(selectedMonth);
                        const monthEnd = endOfMonth(selectedMonth);
                        if (scheduleDate < monthStart || scheduleDate > monthEnd) {
                          return;
                        }
                      } else if (viewMode === "daily") {
                        // Filter by selected date
                        if (!isSameDay(scheduleDate, selectedDate)) {
                          return;
                        }
                      }

                      // Process the slots for this day
                      if (daySchedule && typeof daySchedule === 'object') {
                        Object.entries(daySchedule).forEach(([slotId, allocation]) => {
                          if (allocation && allocation.status) {
                            const slotInfo = {
                              ...allocation,
                              date: dateKey,
                              formattedDate: format(scheduleDate, 'dd-MMM-yyyy'),
                              dayOfWeek: format(scheduleDate, 'EEE'),
                              department: department,
                              slotId: slotId,
                              scheduleDate: scheduleDate,
                              // Ensure duration is a number
                              duration: parseFloat(allocation.duration) || 0,
                              // Ensure worker info
                              workerId: allocation.workerId || allocation.workerID || '',
                              workerName: allocation.workerName || allocation.worker || `Worker ${allocation.workerId || ''}`,
                              // Time fields
                              startTime: allocation.startTime || allocation.start || '',
                              endTime: allocation.endTime || allocation.end || '',
                              // Status
                              status: allocation.status || 'unknown',
                              // Slot type
                              slotType: allocation.slotType || allocation.type || 'working',
                              // Remarks
                              remarks: allocation.remarks || allocation.note || ''
                            };

                            allSlots.push(slotInfo);

                            // Track worker details
                            if (slotInfo.workerId) {
                              if (!workerMap[slotInfo.workerId]) {
                                workerMap[slotInfo.workerId] = {
                                  workerId: slotInfo.workerId,
                                  workerName: slotInfo.workerName,
                                  totalHours: 0,
                                  totalSlots: 0,
                                  dates: new Set(),
                                  departments: new Set(),
                                  allocations: []
                                };
                              }
                              
                              workerMap[slotInfo.workerId].totalHours += slotInfo.duration;
                              workerMap[slotInfo.workerId].totalSlots++;
                              workerMap[slotInfo.workerId].dates.add(dateKey);
                              workerMap[slotInfo.workerId].departments.add(department);
                              workerMap[slotInfo.workerId].allocations.push(slotInfo);
                            }
                          }
                        });
                      }
                    } catch (error) {
                      console.error(`Error processing date ${dateKey}:`, error);
                    }
                  });
                }
                
                // Break if we found data in this path
                break;
              }
            } catch (error) {
              // Continue to next path if this one fails
              continue;
            }
          }
        } catch (error) {
          console.error(`Error fetching from ${department}:`, error);
        }
      }

      console.log("Total slots found:", allSlots.length);
      console.log("Worker map:", Object.keys(workerMap).length);
      
      setSlotData(allSlots);
      setWorkerDetails(workerMap);
      calculateStats(allSlots, workerMap);
    } catch (error) {
      console.error("Error fetching client slot data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (slots, workers) => {
    console.log("Calculating stats for", slots.length, "slots");
    
    // Monthly Stats
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    const monthSlots = slots.filter(slot => 
      slot.scheduleDate >= monthStart && slot.scheduleDate <= monthEnd
    );

    console.log("Monthly slots:", monthSlots.length);

    const totalHours = monthSlots.reduce((sum, slot) => sum + (slot.duration || 0), 0);
    const uniqueDays = new Set(monthSlots.map(slot => slot.date)).size;
    const uniqueWorkers = new Set(monthSlots.map(slot => slot.workerId).filter(Boolean)).size;

    // Calculate daily breakdown
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const dailyBreakdown = daysInMonth.map(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      const daySlots = monthSlots.filter(slot => slot.date === dayKey);
      const dayHours = daySlots.reduce((sum, slot) => sum + (slot.duration || 0), 0);
      
      return {
        date: dayKey,
        formattedDate: format(day, 'dd-MMM'),
        dayOfWeek: format(day, 'EEE'),
        totalHours: dayHours,
        totalSlots: daySlots.length,
        workers: [...new Set(daySlots.map(slot => slot.workerName))].filter(Boolean),
        isToday: isToday(day),
        isEmpty: daySlots.length === 0
      };
    });

    // Get top workers
    const workerArray = Object.values(workers);
    const topWorkers = workerArray
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, 5);

    // Slot distribution by status/type
    const slotDistribution = monthSlots.reduce((acc, slot) => {
      const type = slot.slotType || 'working';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    setMonthlyStats({
      totalHours: parseFloat(totalHours.toFixed(2)),
      totalDays: uniqueDays,
      totalWorkers: uniqueWorkers,
      avgDailyHours: uniqueDays > 0 ? parseFloat((totalHours / uniqueDays).toFixed(2)) : 0,
      utilizationRate: parseFloat((totalHours / (uniqueDays * 8)).toFixed(2)), // Assuming 8 hours/day as max
      topWorkers,
      slotDistribution,
      dailyBreakdown
    });

    // Daily Stats (for selected date)
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const dailySlots = slots.filter(slot => slot.date === dateKey);
    const dailyTotalHours = dailySlots.reduce((sum, slot) => sum + (slot.duration || 0), 0);
    
    // Time distribution for the day
    const timeDistribution = Array.from({ length: 24 }, (_, hour) => {
      const hourSlots = dailySlots.filter(slot => {
        if (!slot.startTime) return false;
        const slotHour = parseInt(slot.startTime.split(':')[0]) || 0;
        return slotHour === hour;
      });
      const hourHours = hourSlots.reduce((sum, slot) => sum + (slot.duration || 0), 0);
      
      return {
        hour: `${hour}:00`,
        hour12: `${hour % 12 || 12}:00 ${hour >= 12 ? 'PM' : 'AM'}`,
        totalSlots: hourSlots.length,
        totalHours: parseFloat(hourHours.toFixed(2))
      };
    }).filter(item => item.totalSlots > 0);

    setDailyStats({
      date: selectedDate,
      totalHours: parseFloat(dailyTotalHours.toFixed(2)),
      totalSlots: dailySlots.length,
      workers: [...new Set(dailySlots.map(slot => ({
        id: slot.workerId,
        name: slot.workerName,
        hours: dailySlots
          .filter(s => s.workerId === slot.workerId)
          .reduce((sum, s) => sum + (s.duration || 0), 0)
      })))].filter(w => w.id),
      slotDetails: dailySlots.map(slot => ({
        ...slot,
        duration: parseFloat(slot.duration || 0).toFixed(2)
      })),
      timeDistribution
    });
  };
  // Render Stats Cards
  const renderStatCard = (icon, title, value, subtitle, color = "primary") => {
    return (
      <div className={`stat-card stat-card-${color}`}>
        <div className="stat-icon">{icon}</div>
        <div className="stat-content">
          <h3 className="stat-value">{value}</h3>
          <p className="stat-title">{title}</p>
          {subtitle && <p className="stat-subtitle">{subtitle}</p>}
        </div>
      </div>
    );
  };

  // Render Worker Cards
  const renderWorkerCard = (worker, index) => {
    return (
      <div className="worker-card" key={worker.workerId}>
        <div className="worker-header">
          <div className="worker-avatar">
            {worker.workerName?.charAt(0) || worker.workerId?.charAt(0) || "W"}
          </div>
          <div className="worker-info">
            <h4 className="worker-name">{worker.workerName}</h4>
            <div className="worker-id">ID: {worker.workerId}</div>
          </div>
          <div className="worker-stats">
            <span className="worker-hours">{worker.totalHours.toFixed(2)}h</span>
            <span className="worker-slots">{worker.totalSlots} slots</span>
          </div>
        </div>
        <div className="worker-details">
          <div className="detail-row">
            <span className="detail-label">Worked Days:</span>
            <span className="detail-value">{worker.dates.size}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Departments:</span>
            <span className="detail-value">{Array.from(worker.departments).join(', ')}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Avg Hours/Day:</span>
            <span className="detail-value">
              {(worker.totalHours / worker.dates.size || 0).toFixed(2)}h
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Render Daily Timeline
  const renderDailyTimeline = () => {
    return (
      <div className="timeline-container">
        <h3>📅 Daily Timeline - {format(selectedDate, 'dd MMM yyyy')}</h3>
        <div className="timeline">
          {dailyStats.timeDistribution.length > 0 ? (
            dailyStats.timeDistribution.map((timeSlot, index) => (
              <div className="timeline-item" key={index}>
                <div className="timeline-time">{timeSlot.hour12}</div>
                <div className="timeline-content">
                  <div className="timeline-bar">
                    <div 
                      className="timeline-progress"
                      style={{ 
                        width: `${(timeSlot.totalHours / Math.max(...dailyStats.timeDistribution.map(t => t.totalHours)) * 100)}%` 
                      }}
                    >
                      <span className="timeline-hours">{timeSlot.totalHours}h</span>
                    </div>
                  </div>
                  <div className="timeline-slots">{timeSlot.totalSlots} slots</div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-data">No slots booked for this day</div>
          )}
        </div>
      </div>
    );
  };

  // Render Monthly Calendar View
  const renderMonthlyCalendar = () => {
    return (
      <div className="calendar-container">
        <div className="calendar-header">
          <h3>{format(selectedMonth, 'MMMM yyyy')}</h3>
          <div className="calendar-nav">
            <button 
              className="btn-nav"
              onClick={() => setSelectedMonth(prev => {
                const newDate = new Date(prev);
                newDate.setMonth(newDate.getMonth() - 1);
                return newDate;
              })}
            >
              ◀ Prev
            </button>
            <button 
              className="btn-today"
              onClick={() => setSelectedMonth(new Date())}
            >
              Today
            </button>
            <button 
              className="btn-nav"
              onClick={() => setSelectedMonth(prev => {
                const newDate = new Date(prev);
                newDate.setMonth(newDate.getMonth() + 1);
                return newDate;
              })}
            >
              Next ▶
            </button>
          </div>
        </div>
        <div className="calendar-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="calendar-day-header">{day}</div>
          ))}
          {monthlyStats.dailyBreakdown.map((day, index) => (
            <div 
              key={day.date} 
              className={`calendar-day ${day.isEmpty ? 'empty' : ''} ${day.isToday ? 'today' : ''}`}
              onClick={() => {
                setSelectedDate(parseISO(day.date));
                setViewMode("daily");
              }}
            >
              <div className="day-number">{format(parseISO(day.date), 'd')}</div>
              {!day.isEmpty && (
                <>
                  <div className="day-hours">{day.totalHours.toFixed(1)}h</div>
                  <div className="day-slots">{day.totalSlots} slots</div>
                  <div className="day-workers">
                    {day.workers.slice(0, 2).map((worker, i) => (
                      <span key={i} className="worker-tag">{worker.split(' ')[0]}</span>
                    ))}
                    {day.workers.length > 2 && (
                      <span className="more-tag">+{day.workers.length - 2}</span>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render Slot Details Table
  const renderSlotTable = () => {
    const slotsToShow = viewMode === "daily" ? dailyStats.slotDetails : slotData.filter(
      slot => slot.scheduleDate >= startOfMonth(selectedMonth) && 
              slot.scheduleDate <= endOfMonth(selectedMonth)
    );

    return (
      <div className="slot-table-container">
        <div className="table-header">
          <h3>📋 Slot Details</h3>
          <div className="table-actions">
            <button 
              className={`btn-tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={`btn-tab ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              Details
            </button>
          </div>
        </div>
        
        {activeTab === 'overview' ? (
          <div className="overview-grid">
            <div className="chart-container">
              <h4>Hours Distribution by Worker</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={monthlyStats.topWorkers}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="totalHours"
                  >
                    {monthlyStats.topWorkers.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} hours`, 'Total Hours']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="chart-container">
              <h4>Daily Hours Trend</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={monthlyStats.dailyBreakdown.filter(day => !day.isEmpty)}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="formattedDate" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} hours`, 'Total Hours']} />
                  <Legend />
                  <Bar dataKey="totalHours" name="Hours" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="slot-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Worker</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Duration</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {slotsToShow.length > 0 ? (
                  slotsToShow.map((slot, index) => (
                    <tr key={index}>
                      <td className="date-cell">
                        <div className="date-display">
                          <div className="date">{slot.formattedDate}</div>
                          <div className="day">{slot.dayOfWeek}</div>
                        </div>
                      </td>
                      <td className="worker-cell">
                        <div className="worker-info-small">
                          <div className="worker-name-small">{slot.workerName}</div>
                          <div className="worker-id-small">ID: {slot.workerId}</div>
                        </div>
                      </td>
                      <td>{slot.startTime12 || convertTo12Hour(slot.startTime)}</td>
                      <td>{slot.endTime12 || convertTo12Hour(slot.endTime)}</td>
                      <td className="duration-cell">
                        <span className="duration-badge">{slot.duration}h</span>
                      </td>
                      <td>
                        <span className="dept-badge">{slot.department}</span>
                      </td>
                      <td>
                        <span className={`status-badge status-${slot.status}`}>
                          {slot.status === 'completed' ? '✅' : slot.status === 'in-progress' ? '⏳' : '📅'} 
                          {slot.status}
                        </span>
                      </td>
                      <td className="remarks-cell">
                        {slot.remarks || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="no-data">
                      No slot data found for selected period
                    </td>
                  </tr>
                )}
              </tbody>
              {slotsToShow.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan="4" className="text-end"><strong>Total:</strong></td>
                    <td className="total-hours">
                      <strong>{slotsToShow.reduce((sum, slot) => sum + parseFloat(slot.duration || 0), 0).toFixed(2)} hours</strong>
                    </td>
                    <td colSpan="3">
                      <strong>{slotsToShow.length} slots</strong>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    );
  };

  // Helper function to convert time
  const convertTo12Hour = (time24) => {
    if (!time24) return "";
    const [hour, minute] = time24.split(':').map(Number);
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading slot data...</p>
      </div>
    );
  }

  return (
    <div className="client-slot-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-top">
          <h1 className="dashboard-title">
            <span className="title-icon">📊</span>
            Client Slot Analytics
          </h1>
          <div className="client-info">
            <h2>{client?.name || client?.clientName || "Client"}</h2>
            <div className="client-meta">
              <span className="client-id">ID: {client?.clientId}</span>
              <span className="client-location">📍 {client?.location || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="view-tabs">
          <button 
            className={`view-tab ${viewMode === 'dashboard' ? 'active' : ''}`}
            onClick={() => setViewMode('dashboard')}
          >
            📊 Dashboard
          </button>
          <button 
            className={`view-tab ${viewMode === 'daily' ? 'active' : ''}`}
            onClick={() => setViewMode('daily')}
          >
            📅 Daily View
          </button>
          <button 
            className={`view-tab ${viewMode === 'monthly' ? 'active' : ''}`}
            onClick={() => setViewMode('monthly')}
          >
            📈 Monthly Analytics
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-content">
        {viewMode === 'dashboard' ? (
          <>
            {/* Stats Overview */}
            <div className="stats-grid">
              {renderStatCard("⏱️", "Total Hours", monthlyStats.totalHours + "h", "This month", "primary")}
              {renderStatCard("📅", "Work Days", monthlyStats.totalDays, "Days with slots", "success")}
              {renderStatCard("👥", "Total Workers", monthlyStats.totalWorkers, "Unique workers", "info")}
              {renderStatCard("📊", "Avg Daily Hours", monthlyStats.avgDailyHours + "h/day", "Per work day", "warning")}
              {renderStatCard("⚡", "Utilization Rate", (monthlyStats.utilizationRate * 100).toFixed(1) + "%", "Based on 8h/day", "danger")}
              {renderStatCard("🎯", "Current Streak", 
                monthlyStats.dailyBreakdown
                  .reverse()
                  .findIndex(day => day.isEmpty) || monthlyStats.dailyBreakdown.length, 
                "Consecutive work days", "secondary"
              )}
            </div>

            {/* Charts and Tables */}
            <div className="content-grid">
              <div className="main-column">
                {renderMonthlyCalendar()}
                {renderSlotTable()}
              </div>
              
              <div className="sidebar-column">
                {/* Top Workers */}
                <div className="sidebar-card">
                  <h3>👥 Top Workers This Month</h3>
                  <div className="workers-list">
                    {monthlyStats.topWorkers.length > 0 ? (
                      monthlyStats.topWorkers.map((worker, index) => (
                        <div key={worker.workerId} className="top-worker">
                          <div className="worker-rank">{index + 1}</div>
                          <div className="worker-avatar-small">
                            {worker.workerName?.charAt(0) || worker.workerId?.charAt(0)}
                          </div>
                          <div className="worker-details-small">
                            <div className="worker-name-small">{worker.workerName}</div>
                            <div className="worker-stats-small">
                              <span className="hours-small">{worker.totalHours.toFixed(1)}h</span>
                              <span className="slots-small">{worker.totalSlots} slots</span>
                            </div>
                          </div>
                          <div className="worker-percentage">
                            {((worker.totalHours / monthlyStats.totalHours) * 100).toFixed(1)}%
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-data">No worker data available</div>
                    )}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="sidebar-card">
                  <h3>📈 Quick Statistics</h3>
                  <div className="quick-stats">
                    <div className="quick-stat">
                      <span className="stat-label">Peak Day:</span>
                      <span className="stat-value">
                        {monthlyStats.dailyBreakdown.reduce((max, day) => 
                          day.totalHours > max.totalHours ? day : max, 
                          { totalHours: 0 }
                        ).formattedDate || "N/A"}
                      </span>
                    </div>
                    <div className="quick-stat">
                      <span className="stat-label">Most Active Hour:</span>
                      <span className="stat-value">
                        {dailyStats.timeDistribution.reduce((max, hour) => 
                          hour.totalHours > max.totalHours ? hour : max, 
                          { totalHours: 0, hour12: "N/A" }
                        ).hour12}
                      </span>
                    </div>
                    <div className="quick-stat">
                      <span className="stat-label">Avg Slot Duration:</span>
                      <span className="stat-value">
                        {slotData.length > 0 
                          ? (slotData.reduce((sum, slot) => sum + parseFloat(slot.duration || 0), 0) / slotData.length).toFixed(2) 
                          : "0"}h
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : viewMode === 'daily' ? (
          <>
            {/* Daily View Header */}
            <div className="daily-header">
              <div className="date-navigation">
                <button 
                  className="btn-nav"
                  onClick={() => setSelectedDate(prev => {
                    const newDate = new Date(prev);
                    newDate.setDate(newDate.getDate() - 1);
                    return newDate;
                  })}
                >
                  ◀ Previous Day
                </button>
                <h2 className="date-display-large">
                  {format(selectedDate, 'EEEE, MMMM do, yyyy')}
                  {isToday(selectedDate) && <span className="today-badge">Today</span>}
                </h2>
                <button 
                  className="btn-nav"
                  onClick={() => setSelectedDate(prev => {
                    const newDate = new Date(prev);
                    newDate.setDate(newDate.getDate() + 1);
                    return newDate;
                  })}
                >
                  Next Day ▶
                </button>
              </div>
            </div>

            {/* Daily Stats */}
            <div className="stats-grid">
              {renderStatCard("⏱️", "Total Hours", dailyStats.totalHours + "h", "Today", "primary")}
              {renderStatCard("📋", "Total Slots", dailyStats.totalSlots, "Bookings", "success")}
              {renderStatCard("👥", "Workers", dailyStats.workers.length, "Assigned", "info")}
              {renderStatCard("📊", "Avg Duration", 
                dailyStats.totalSlots > 0 ? (dailyStats.totalHours / dailyStats.totalSlots).toFixed(2) + "h" : "0h", 
                "Per slot", "warning"
              )}
            </div>

            {/* Daily Content */}
            <div className="content-grid">
              <div className="main-column">
                {renderDailyTimeline()}
                {renderSlotTable()}
              </div>
              
              <div className="sidebar-column">
                {/* Today's Workers */}
                <div className="sidebar-card">
                  <h3>👥 Today's Workers</h3>
                  <div className="workers-list">
                    {dailyStats.workers.length > 0 ? (
                      dailyStats.workers.map((worker, index) => (
                        <div key={worker.id} className="worker-card-small">
                          <div className="worker-avatar-small">
                            {worker.name?.charAt(0) || worker.id?.charAt(0)}
                          </div>
                          <div className="worker-info-small">
                            <div className="worker-name-small">{worker.name}</div>
                            <div className="worker-hours-small">
                              <span className="hours-badge">{worker.hours.toFixed(1)}h</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-data">No workers assigned today</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          // Monthly Analytics View
          <>
            <div className="monthly-header">
              <h2>📈 Monthly Analytics - {format(selectedMonth, 'MMMM yyyy')}</h2>
              <div className="month-nav">
                <button 
                  className="btn-nav"
                  onClick={() => setSelectedMonth(prev => {
                    const newDate = new Date(prev);
                    newDate.setMonth(newDate.getMonth() - 1);
                    return newDate;
                  })}
                >
                  ◀ Previous Month
                </button>
                <button 
                  className="btn-today"
                  onClick={() => setSelectedMonth(new Date())}
                >
                  Current Month
                </button>
                <button 
                  className="btn-nav"
                  onClick={() => setSelectedMonth(prev => {
                    const newDate = new Date(prev);
                    newDate.setMonth(newDate.getMonth() + 1);
                    return newDate;
                  })}
                >
                  Next Month ▶
                </button>
              </div>
            </div>

            {/* Monthly Insights */}
            <div className="insights-grid">
              <div className="insight-card">
                <h4>📊 Hour Distribution</h4>
                <div className="hour-distribution">
                  {Object.entries(monthlyStats.slotDistribution).map(([type, count]) => (
                    <div key={type} className="distribution-item">
                      <span className="dist-type">{type.replace(/-/g, ' ')}:</span>
                      <span className="dist-count">{count} slots</span>
                      <div className="dist-bar">
                        <div 
                          className="dist-progress"
                          style={{ 
                            width: `${(count / slotData.length) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="insight-card">
                <h4>📅 Weekly Pattern</h4>
                <div className="weekly-pattern">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => {
                    const daySlots = monthlyStats.dailyBreakdown.filter(d => 
                      format(parseISO(d.date), 'EEE') === day
                    );
                    const dayHours = daySlots.reduce((sum, d) => sum + d.totalHours, 0);
                    const avgHours = daySlots.length > 0 ? dayHours / daySlots.length : 0;
                    
                    return (
                      <div key={day} className="day-pattern">
                        <div className="day-label">{day}</div>
                        <div className="day-bar">
                          <div 
                            className="day-progress"
                            style={{ 
                              height: `${Math.min(avgHours * 20, 100)}%` 
                            }}
                            title={`Avg: ${avgHours.toFixed(1)}h`}
                          ></div>
                        </div>
                        <div className="day-total">{dayHours.toFixed(1)}h</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Worker Performance */}
            <div className="worker-performance">
              <h3>👥 Worker Performance</h3>
              <div className="performance-grid">
                {Object.values(workerDetails)
                  .sort((a, b) => b.totalHours - a.totalHours)
                  .slice(0, 8)
                  .map(renderWorkerCard)}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer Summary */}
      <div className="dashboard-footer">
        <div className="footer-summary">
          <div className="summary-item">
            <span className="summary-label">Total Hours Tracked:</span>
            <span className="summary-value">{slotData.reduce((sum, slot) => sum + parseFloat(slot.duration || 0), 0).toFixed(2)} hours</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total Slots:</span>
            <span className="summary-value">{slotData.length} bookings</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Unique Workers:</span>
            <span className="summary-value">{Object.keys(workerDetails).length} workers</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Time Period:</span>
            <span className="summary-value">
              {slotData.length > 0 
                ? `${format(new Date(Math.min(...slotData.map(s => new Date(s.date).getTime()))), 'dd MMM')} - ${format(new Date(Math.max(...slotData.map(s => new Date(s.date).getTime()))), 'dd MMM yyyy')}`
                : 'No data'
              }
            </span>
          </div>
        </div>
        <div className="footer-actions">
          <button className="btn-export" onClick={() => alert('Export feature coming soon!')}>
            📥 Export Data
          </button>
          <button className="btn-refresh" onClick={fetchClientSlotData}>
            🔄 Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientSlotTab;