// ClientSlotTab.js
import React, { useState, useEffect, useMemo, useRef } from "react";
import firebaseDB from "../../../../firebase";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, differenceInHours, differenceInMinutes, isValid, isToday, isThisMonth } from 'date-fns';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
  const [editingRemarks, setEditingRemarks] = useState({});
  const [monthlyReportData, setMonthlyReportData] = useState([]);
  const [workerPhotos, setWorkerPhotos] = useState({}); // Store worker photos

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

  // Memoize the client key to prevent unnecessary re-renders
  const clientKey = useMemo(() => 
    client?.clientKey || client?.id || client?.clientId, 
    [client]
  );

  // Cache for fetched data
  const dataCache = useRef({});

  useEffect(() => {
    if (clientKey) {
      fetchClientSlotData();
    }
  }, [clientKey, selectedMonth, selectedDate, viewMode]);

  useEffect(() => {
    if (slotData.length > 0 && viewMode === "monthly") {
      prepareMonthlyReport();
    }
  }, [slotData, selectedMonth, viewMode]);

  // Fetch worker photos from Firebase
  const fetchWorkerPhoto = async (workerId) => {
    if (!workerId) return null;
    
    try {
      const photoRef = firebaseDB.child(`workerPhotos/${workerId}`);
      const snapshot = await photoRef.once('value');
      return snapshot.val()?.photoUrl || null;
    } catch (error) {
      console.error("Error fetching worker photo:", error);
      return null;
    }
  };

  const prepareMonthlyReport = () => {
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    
    // Filter slots for the selected month
    const monthSlots = slotData.filter(slot => 
      slot.scheduleDate >= monthStart && slot.scheduleDate <= monthEnd
    );

    // Group by date and worker
    const groupedData = [];
    let serialNo = 1;

    monthSlots.forEach((slot, index) => {
      // Get worker photo URL
      const workerPhotoUrl = workerPhotos[slot.workerId] || null;
      
      groupedData.push({
        sNo: serialNo++,
        date: slot.formattedDate,
        dayOfWeek: slot.dayOfWeek,
        empPhoto: workerPhotoUrl 
          ? <img src={workerPhotoUrl} alt={slot.workerName} className="employee-photo-img" />
          : <div className="employee-photo-placeholder">{slot.workerName?.charAt(0) || 'W'}</div>,
        empName: slot.workerName,
        empId: slot.workerId,
        slot: slot.slotType || 'working',
        startTime: slot.startTime12 || convertTo12Hour(slot.startTime),
        endTime: slot.endTime12 || convertTo12Hour(slot.endTime),
        hours: parseFloat(slot.duration || 0).toFixed(2),
        status: slot.status,
        remarks: slot.remarks || '',
        slotId: slot.slotId,
        workerPhotoUrl,
        originalIndex: index
      });
    });

    // Sort by date and time
    groupedData.sort((a, b) => {
      const dateA = new Date(a.date.split('-').reverse().join('-'));
      const dateB = new Date(b.date.split('-').reverse().join('-'));
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }
      return a.startTime.localeCompare(b.startTime);
    });

    // Update serial numbers after sorting
    groupedData.forEach((item, index) => {
      item.sNo = index + 1;
    });

    setMonthlyReportData(groupedData);
  };

  // Optimize data fetching with caching
  const fetchClientSlotData = async () => {
    try {
      setLoading(true);
      
      // Check cache first
      const cacheKey = `${clientKey}-${format(selectedMonth, 'yyyy-MM')}-${viewMode}`;
      if (dataCache.current[cacheKey] && viewMode === 'dashboard') {
        const cached = dataCache.current[cacheKey];
        setSlotData(cached.allSlots);
        setWorkerDetails(cached.workerMap);
        calculateStats(cached.allSlots, cached.workerMap);
        setLoading(false);
        return;
      }

      let allSlots = [];
      const workerMap = {};
      const photoPromises = [];
      
      if (!clientKey) {
        console.error("No client key found");
        setLoading(false);
        return;
      }

      console.log("Fetching slot data for client:", clientKey);

      // Only fetch from Home Care since that's where data is found according to logs
      const department = "Home Care";
      const path = clientPaths[department];
      
      try {
        // Try the exact path from logs
        const clientPath = `${path}/${clientKey}/schedule`;
        
        const snapshot = await firebaseDB.child(clientPath).once('value');
        const clientData = snapshot.val();

        if (clientData) {
          console.log(`Found data in ${clientPath} for ${department}:`, clientData);
          
          // Process schedule data
          Object.entries(clientData).forEach(([dateKey, daySchedule]) => {
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
                      // Convert to 12-hour format
                      startTime12: convertTo12Hour(allocation.startTime || allocation.start || ''),
                      endTime12: convertTo12Hour(allocation.endTime || allocation.end || ''),
                      // Status
                      status: allocation.status || 'unknown',
                      // Slot type
                      slotType: allocation.slotType || allocation.type || 'working',
                      // Remarks
                      remarks: allocation.remarks || allocation.note || '',
                      // Worker photo
                      workerPhotoUrl: allocation.workerPhotoUrl || null
                    };

                    allSlots.push(slotInfo);

                    // Track worker details with unique key
                    const workerKey = `${slotInfo.workerId}-${slotInfo.workerName}`;
                    if (slotInfo.workerId) {
                      if (!workerMap[workerKey]) {
                        workerMap[workerKey] = {
                          workerId: slotInfo.workerId,
                          workerName: slotInfo.workerName,
                          totalHours: 0,
                          totalSlots: 0,
                          dates: new Set(),
                          departments: new Set(),
                          allocations: [],
                          photoUrl: slotInfo.workerPhotoUrl
                        };
                        
                        // Fetch worker photo if not already fetched
                        if (slotInfo.workerId && !workerPhotos[slotInfo.workerId]) {
                          photoPromises.push(
                            fetchWorkerPhoto(slotInfo.workerId).then(photoUrl => {
                              if (photoUrl) {
                                setWorkerPhotos(prev => ({
                                  ...prev,
                                  [slotInfo.workerId]: photoUrl
                                }));
                              }
                            })
                          );
                        }
                      }
                      
                      workerMap[workerKey].totalHours += slotInfo.duration;
                      workerMap[workerKey].totalSlots++;
                      workerMap[workerKey].dates.add(dateKey);
                      workerMap[workerKey].departments.add(department);
                      workerMap[workerKey].allocations.push(slotInfo);
                      
                      // Update photo URL if available
                      if (slotInfo.workerPhotoUrl) {
                        workerMap[workerKey].photoUrl = slotInfo.workerPhotoUrl;
                      }
                    }
                  }
                });
              }
            } catch (error) {
              console.error(`Error processing date ${dateKey}:`, error);
            }
          });
        }
      } catch (error) {
        console.error(`Error fetching from ${department}:`, error);
      }

      // Wait for all photo fetches to complete
      await Promise.all(photoPromises);
      
      console.log("Total slots found:", allSlots.length);
      console.log("Worker map:", Object.keys(workerMap).length);
      
      // Cache the results for dashboard view
      if (viewMode === 'dashboard') {
        dataCache.current[cacheKey] = { allSlots, workerMap };
      }
      
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
      
      // Get unique workers for this day with their details
      const dayWorkersMap = {};
      daySlots.forEach(slot => {
        if (slot.workerId) {
          const workerKey = `${slot.workerId}-${slot.workerName}`;
          if (!dayWorkersMap[workerKey]) {
            dayWorkersMap[workerKey] = {
              id: slot.workerId,
              name: slot.workerName,
              hours: 0,
              photoUrl: slot.workerPhotoUrl
            };
          }
          dayWorkersMap[workerKey].hours += slot.duration || 0;
        }
      });
      
      return {
        date: dayKey,
        formattedDate: format(day, 'dd-MMM'),
        dayOfWeek: format(day, 'EEE'),
        totalHours: dayHours,
        totalSlots: daySlots.length,
        workers: Object.values(dayWorkersMap),
        workersDetails: dayWorkersMap, // Keep detailed worker info
        isToday: isToday(day),
        isEmpty: daySlots.length === 0
      };
    });

    // Get top workers with photos
    const workerArray = Object.values(workers);
    const topWorkers = workerArray
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, 5)
      .map(worker => ({
        ...worker,
        photoUrl: worker.photoUrl || workerPhotos[worker.workerId]
      }));

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
          .reduce((sum, s) => sum + (s.duration || 0), 0),
        photoUrl: slot.workerPhotoUrl || workerPhotos[slot.workerId]
      })))].filter(w => w.id),
      slotDetails: dailySlots.map(slot => ({
        ...slot,
        duration: parseFloat(slot.duration || 0).toFixed(2)
      })),
      timeDistribution
    });
  };

  // Export functions - Improved PDF generation
  const exportToPDF = async () => {
    try {
      // Create a temporary container for the entire report
      const tempContainer = document.createElement('div');
      tempContainer.style.cssText = `
        position: fixed;
        left: -9999px;
        top: 0;
        width: 1000px;
        background: white;
        padding: 20px;
      `;
      
      // Clone the report content
      const reportElement = document.querySelector('.monthly-analytics-report');
      if (!reportElement) {
        alert('Report content not found!');
        return;
      }
      
      const clonedReport = reportElement.cloneNode(true);
      
      // Apply print styles
      clonedReport.style.cssText = `
        width: 100%;
        margin: 0;
        padding: 0;
        background: white;
        color: black;
        font-family: Arial, sans-serif;
      `;
      
      // Fix images for PDF
      const images = clonedReport.querySelectorAll('img');
      images.forEach(img => {
        img.style.maxWidth = '50px';
        img.style.height = 'auto';
      });
      
      tempContainer.appendChild(clonedReport);
      document.body.appendChild(tempContainer);
      
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: tempContainer.offsetWidth,
        height: tempContainer.offsetHeight
      });
      
      // Clean up
      document.body.removeChild(tempContainer);
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const imgWidth = 280;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      
      // Add metadata
      pdf.setProperties({
        title: `Monthly Report - ${format(selectedMonth, 'MMMM yyyy')}`,
        subject: `Client Slot Analytics for ${client?.name || 'Client'}`,
        author: 'Client Management System',
        keywords: 'report, analytics, slots, workers'
      });
      
      pdf.save(`monthly-report-${format(selectedMonth, 'MMMM-yyyy')}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  const exportToHTML = () => {
    const element = document.querySelector('.monthly-analytics-report');
    if (!element) return;
    
    // Clone the element to avoid modifying the original
    const clone = element.cloneNode(true);
    
    // Add inline styles for HTML export
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        margin: 20px;
        background: #f8fafc;
        color: #334155;
      }
      
      .monthly-analytics-report {
        background: white;
        border-radius: 16px;
        padding: 30px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        max-width: 1200px;
        margin: 0 auto;
      }
      
      .monthly-header {
        text-align: center;
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 2px solid #e2e8f0;
      }
      
      .monthly-header h2 {
        color: #1e293b;
        font-size: 28px;
        margin-bottom: 15px;
      }
      
      .month-nav {
        display: flex;
        justify-content: center;
        gap: 15px;
        margin-top: 20px;
      }
      
      .btn-nav, .btn-today {
        padding: 10px 20px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        font-size: 14px;
        transition: all 0.3s ease;
      }
      
      .btn-nav {
        background: #f1f5f9;
        color: #64748b;
        border: 1px solid #cbd5e1;
      }
      
      .btn-today {
        background: #3b82f6;
        color: white;
      }
      
      .monthly-stats-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 20px;
        margin-bottom: 30px;
      }
      
      .stat-card {
        background: white;
        border-radius: 12px;
        padding: 20px;
        border: 1px solid #e2e8f0;
        border-left: 4px solid;
      }
      
      .stat-card-primary { border-left-color: #3b82f6; }
      .stat-card-success { border-left-color: #10b981; }
      .stat-card-info { border-left-color: #0ea5e9; }
      .stat-card-warning { border-left-color: #f59e0b; }
      
      .stat-value {
        font-size: 32px;
        font-weight: 700;
        color: #1e293b;
        margin: 10px 0 5px;
      }
      
      .stat-title {
        color: #64748b;
        font-weight: 500;
        margin: 0;
      }
      
      .worker-performance-cards {
        margin: 30px 0;
      }
      
      .performance-cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 20px;
      }
      
      .performance-card {
        background: white;
        border-radius: 12px;
        padding: 20px;
        border: 1px solid #e2e8f0;
        transition: all 0.3s ease;
      }
      
      .performance-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
      }
      
      .monthly-report-table {
        margin-top: 30px;
      }
      
      .report-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }
      
      .report-actions {
        display: flex;
        gap: 10px;
      }
      
      .btn-action {
        padding: 10px 20px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s ease;
      }
      
      .btn-download { background: #3b82f6; color: white; }
      .btn-html { background: #10b981; color: white; }
      .btn-print { background: #f59e0b; color: white; }
      .btn-share { background: #8b5cf6; color: white; }
      
      table.monthly-table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
      }
      
      table.monthly-table th {
        background: #f1f5f9;
        padding: 15px;
        text-align: left;
        font-weight: 600;
        color: #475569;
        border-bottom: 2px solid #cbd5e1;
      }
      
      table.monthly-table td {
        padding: 15px;
        border-bottom: 1px solid #e2e8f0;
      }
      
      table.monthly-table tr:hover {
        background: #f8fafc;
      }
      
      .employee-photo-img {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid #e2e8f0;
      }
      
      .employee-photo-placeholder {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 600;
        font-size: 18px;
      }
      
      .slot-badge {
        background: #dbeafe;
        color: #1d4ed8;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
      }
      
      .hours-badge {
        background: #d1fae5;
        color: #065f46;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
      }
      
      .status-badge {
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
      }
      
      .status-completed {
        background: #d1fae5;
        color: #065f46;
      }
      
      .status-in-progress {
        background: #fef3c7;
        color: #92400e;
      }
      
      .status-cancelled {
        background: #fee2e2;
        color: #991b1b;
      }
      
      .remarks-input {
        width: 100%;
        padding: 8px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font-size: 14px;
      }
      
      .btn-sm {
        padding: 6px 12px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        margin: 0 2px;
      }
      
      .btn-save { background: #10b981; color: white; }
      .btn-cancel { background: #ef4444; color: white; }
      .btn-edit { background: #f59e0b; color: white; }
      
      .report-summary {
        margin-top: 30px;
        padding: 20px;
        background: #f8fafc;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
      }
      
      .summary-items {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 20px;
      }
      
      @media print {
        body { margin: 0; padding: 10px; }
        .no-print { display: none !important; }
        .btn-action { display: none; }
      }
    `;
    
    // Create the full HTML document
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Monthly Report - ${format(selectedMonth, 'MMMM yyyy')}</title>
        ${style.outerHTML}
      </head>
      <body>
        <div class="no-print" style="text-align: center; margin-bottom: 20px; padding: 20px; background: #f1f5f9; border-radius: 10px;">
          <h3 style="margin: 0; color: #334155;">📊 Client Slot Analytics Report</h3>
          <p style="margin: 10px 0; color: #64748b;">Generated on ${format(new Date(), 'dd MMM yyyy HH:mm:ss')}</p>
        </div>
        ${clone.outerHTML}
        <div class="no-print" style="margin-top: 40px; padding: 20px; background: #f8fafc; border-radius: 12px; text-align: center;">
          <p style="color: #64748b; margin-bottom: 10px;">
            Report generated for <strong>${client?.name || 'Client'}</strong> | 
            Client ID: <strong>${client?.clientId || 'N/A'}</strong>
          </p>
          <p style="color: #94a3b8; font-size: 14px;">
            This report contains confidential information. Please do not share without authorization.
          </p>
        </div>
      </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly-report-${format(selectedMonth, 'MMMM-yyyy')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const printReport = () => {
    const printContent = document.querySelector('.monthly-analytics-report');
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    const styles = Array.from(document.styleSheets)
      .map(sheet => {
        try {
          return Array.from(sheet.cssRules).map(rule => rule.cssText).join('');
        } catch {
          return '';
        }
      })
      .join('');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Monthly Report - ${format(selectedMonth, 'MMMM yyyy')}</title>
        <style>
          ${styles}
          @media print {
            @page {
              size: landscape;
              margin: 15mm;
            }
            body {
              margin: 0;
              padding: 0;
              background: white;
            }
            .btn-action, .no-print {
              display: none !important;
            }
            .monthly-analytics-report {
              box-shadow: none !important;
              border: 1px solid #ddd !important;
            }
          }
          .monthly-analytics-report {
            transform: scale(0.95);
            transform-origin: top left;
          }
        </style>
      </head>
      <body onload="window.print(); setTimeout(() => window.close(), 1000);">
        ${printContent.outerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const shareReport = () => {
    if (navigator.share) {
      navigator.share({
        title: `Monthly Report - ${format(selectedMonth, 'MMMM yyyy')}`,
        text: `Monthly analytics report for ${client?.name || 'Client'}`,
        url: window.location.href
      });
    } else {
      // Fallback: Show modal with options
      const shareModal = document.createElement('div');
      shareModal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;">
          <div style="background: white; padding: 20px; border-radius: 10px; max-width: 400px; width: 90%;">
            <h3 style="margin-top: 0;">Share Report</h3>
            <p>Select an export option:</p>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
              <button onclick="exportToPDF()" style="padding: 10px; background: #dc2626; color: white; border: none; border-radius: 5px; cursor: pointer;">PDF</button>
              <button onclick="exportToHTML()" style="padding: 10px; background: #059669; color: white; border: none; border-radius: 5px; cursor: pointer;">HTML</button>
              <button onclick="window.print()" style="padding: 10px; background: #d97706; color: white; border: none; border-radius: 5px; cursor: pointer;">Print</button>
              <button onclick="this.parentElement.parentElement.parentElement.remove()" style="padding: 10px; background: #6b7280; color: white; border: none; border-radius: 5px; cursor: pointer;">Cancel</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(shareModal);
    }
  };

  // Handle remarks editing
  const handleRemarksEdit = (index, value) => {
    setEditingRemarks(prev => ({
      ...prev,
      [index]: value
    }));
  };

  const saveRemarks = async (slotId, remarks) => {
    try {
      // Find the slot to update
      const slotToUpdate = monthlyReportData.find(item => item.slotId === slotId);
      if (!slotToUpdate) {
        alert("Slot not found!");
        return;
      }

      // Update in Firebase
      const department = "Home Care";
      const path = clientPaths[department];
      const dateKey = format(parseISO(slotToUpdate.date), 'yyyy-MM-dd');
      const clientPath = `${path}/${clientKey}/schedule/${dateKey}/${slotId}/remarks`;
      
      await firebaseDB.child(clientPath).set(remarks);
      
      alert("✅ Remarks saved successfully!");
      
      // Refresh data
      await fetchClientSlotData();
    } catch (error) {
      console.error("Error saving remarks:", error);
      alert("❌ Failed to save remarks");
    }
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

  // Render Worker Cards for Monthly Analytics
  const renderWorkerPerformanceCards = () => {
    const workerArray = Object.values(workerDetails)
      .sort((a, b) => b.totalHours - a.totalHours);

    return (
      <div className="worker-performance-cards">
        <h3>👥 Worker Performance Details</h3>
        <div className="performance-cards-grid">
          {workerArray.map((worker, index) => {
            const photoUrl = worker.photoUrl || workerPhotos[worker.workerId];
            
            return (
              <div className="performance-card" key={`${worker.workerId}-${index}`}>
                <div className="performance-card-header">
                  <div className="worker-avatar-large">
                    {photoUrl ? (
                      <img 
                        src={photoUrl} 
                        alt={worker.workerName}
                        className="worker-avatar-img"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="worker-avatar-fallback">
                      {worker.workerName?.charAt(0) || worker.workerId?.charAt(0) || "W"}
                    </div>
                  </div>
                  <div className="worker-rank-badge">#{index + 1}</div>
                </div>
                
                <div className="performance-card-body">
                  <h4 className="worker-fullname">{worker.workerName}</h4>
                  <div className="worker-id-small">ID: {worker.workerId}</div>
                  
                  <div className="performance-stats">
                    <div className="performance-stat">
                      <span className="stat-label">Total Hours:</span>
                      <span className="stat-value">{worker.totalHours.toFixed(2)}h</span>
                    </div>
                    <div className="performance-stat">
                      <span className="stat-label">Working Days:</span>
                      <span className="stat-value">{worker.dates.size} days</span>
                    </div>
                    
                    <div className="performance-stat">
                      <span className="stat-label">Total Slots:</span>
                      <span className="stat-value">{worker.totalSlots}</span>
                    </div>
                  </div>
                  
                  <div className="performance-footer">
                    <div className="departments">
                      <span className="dept-label">Departments:</span>
                      <span className="dept-value">
                        {Array.from(worker.departments).join(', ')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Monthly Report Table with proper styling
  const renderMonthlyReportTable = () => {
    return (
      <div className="monthly-report-table">
         
        <div className="report-header">
          <div className="report-actions">
            <button className="btn-action btn-download" onClick={exportToPDF}>
              📥 PDF
            </button>
            <button className="btn-action btn-html" onClick={exportToHTML}>
              🌐 HTML
            </button>
            <button className="btn-action btn-print" onClick={printReport}>
              🖨️ Print
            </button>
            <button className="btn-action btn-share" onClick={shareReport}>
              🔗 Share
            </button>
          </div>
        </div>
        
        <div className="table-responsive">
        <h3 className="p-2">📋 Monthly Report - {format(selectedMonth, 'MMMM yyyy')} -  <span className="text-primary">{client?.name || client?.clientName || "Client"} Garu</span></h3>
          <table className="monthly-table w-100">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Date</th>
                <th>Emp Photo</th>
                <th>Emp Name</th>
                <th>Hours</th>
                <th>Status</th>
                <th>Remarks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {monthlyReportData.length > 0 ? (
                monthlyReportData.map((item, index) => (
                  <tr key={`${item.slotId}-${index}`}>
                    <td className="text-center">{item.sNo}</td>
                    <td className="date-cell">
                      <div className="date-display">
                        <div className="date">{item.date}</div>
                        <div className="day">{item.dayOfWeek}</div>
                      </div>
                      <div className="time-range">
                        {item.startTime} - {item.endTime}
                      </div>
                    </td>
                    <td className="photo-cell">
                      {typeof item.empPhoto === 'object' ? (
                        item.empPhoto
                      ) : (
                        <div className="employee-photo">
                          {item.workerPhotoUrl ? (
                            <img 
                              src={item.workerPhotoUrl} 
                              alt={item.empName}
                              className="employee-photo-img"
                            />
                          ) : (
                            <div className="employee-photo-placeholder">
                              {item.empName?.charAt(0) || 'W'}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="employee-cell">
                      <div className="employee-name">{item.empName}</div>
                      <div className="employee-id">ID: {item.empId}</div>
                    </td>
                    
                    <td className="hours-cell">
                      <span className="hours-badge">{item.hours}h</span>
                    </td>
                    <td>
                      <span className={`status-badge status-${item.status}`}>
                        {item.status === 'completed' ? '✅' : 
                         item.status === 'in-progress' ? '⏳' : 
                         item.status === 'cancelled' ? '❌' : '📅'} 
                        {item.status}
                      </span>
                    </td>
                    <td className="remarks-cell">
                      {editingRemarks[index] !== undefined ? (
                        <div className="remarks-edit">
                          <input
                            type="text"
                            value={editingRemarks[index]}
                            onChange={(e) => handleRemarksEdit(index, e.target.value)}
                            className="remarks-input"
                            placeholder="Enter remarks..."
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div className="remarks-display" onClick={() => handleRemarksEdit(index, item.remarks)}>
                          {item.remarks || <span className="text-muted">Click to add remarks</span>}
                        </div>
                      )}
                    </td>
                    <td className="actions-cell">
                      {editingRemarks[index] !== undefined ? (
                        <>
                          <button 
                            className="btn-save btn-sm"
                            onClick={() => {
                              saveRemarks(item.slotId, editingRemarks[index]);
                              handleRemarksEdit(index, undefined);
                            }}
                            title="Save remarks"
                          >
                            💾 Save
                          </button>
                          <button 
                            className="btn-cancel btn-sm"
                            onClick={() => handleRemarksEdit(index, undefined)}
                            title="Cancel"
                          >
                            ❌ Cancel
                          </button>
                        </>
                      ) : (
                        <button 
                          className="btn-edit btn-sm"
                          onClick={() => handleRemarksEdit(index, item.remarks)}
                          title="Edit remarks"
                        >
                          ✏️ Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="no-data">
                    📭 No data available for selected month
                  </td>
                </tr>
              )}
            </tbody>
            {monthlyReportData.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan="4" className="text-end"><strong>Monthly Totals:</strong></td>
                  <td>
                    <strong>{monthlyReportData.length} slots</strong>
                  </td>
                  <td className="total-hours">
                    <strong>
                      {monthlyReportData.reduce((sum, item) => sum + parseFloat(item.hours || 0), 0).toFixed(2)}h
                    </strong>
                  </td>
                  <td colSpan="3">
                    <strong>
                      {new Set(monthlyReportData.map(item => item.empName)).size} employees
                    </strong>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
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
              key={`${day.date}-${index}`} 
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
                      <div key={`${worker.id}-${i}`} className="worker-tag" title={`${worker.name} (ID: ${worker.id}) - ${worker.hours.toFixed(1)}h`}>
                        {worker.name.split(' ')[0]}
                      </div>
                    ))}
                    {day.workers.length > 2 && (
                      <div className="more-tag" title={`${day.workers.slice(2).map(w => `${w.name} (${w.id})`).join(', ')}`}>
                        +{day.workers.length - 2}
                      </div>
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
                  <th>S.No</th>
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
                  slotsToShow.map((slot, index) => {
                    const workerPhoto = workerPhotos[slot.workerId];
                    
                    return (
                      <tr key={`${slot.slotId}-${index}`}>
                        <td className="text-center">{index + 1}</td>
                        <td className="date-cell">
                          <div className="date-display">
                            <div className="date">{slot.formattedDate}</div>
                            <div className="day">{slot.dayOfWeek}</div>
                          </div>
                        </td>
                        <td className="worker-cell">
                          <div className="worker-info-with-photo">
                            {workerPhoto ? (
                              <img 
                                src={workerPhoto} 
                                alt={slot.workerName}
                                className="worker-photo-small"
                              />
                            ) : (
                              <div className="worker-photo-placeholder-small">
                                {slot.workerName?.charAt(0) || 'W'}
                              </div>
                            )}
                            <div className="worker-details-small">
                              <div className="worker-name-small">{slot.workerName}</div>
                              <div className="worker-id-small">ID: {slot.workerId}</div>
                            </div>
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
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="9" className="no-data">
                      📭 No slot data found for selected period
                    </td>
                  </tr>
                )}
              </tbody>
              {slotsToShow.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan="5" className="text-end"><strong>Total:</strong></td>
                    <td className="total-hours">
                      <strong>{slotsToShow.reduce((sum, slot) => sum + parseFloat(slot.duration || 0), 0).toFixed(2)} hours</strong>
                    </td>
                    <td colSpan="4">
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

  // New Features
  const handleDownloadCSV = () => {
    const headers = ['S.No', 'Date', 'Employee Name', 'Employee ID', 'Slot Type', 'Start Time', 'End Time', 'Hours', 'Status', 'Remarks'];
    const csvData = monthlyReportData.map(item => [
      item.sNo,
      item.date,
      item.empName,
      item.empId,
      item.slot,
      item.startTime,
      item.endTime,
      item.hours,
      item.status,
      item.remarks || ''
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly-report-${format(selectedMonth, 'MMMM-yyyy')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
                      monthlyStats.topWorkers.map((worker, index) => {
                        const photoUrl = worker.photoUrl || workerPhotos[worker.workerId];
                        
                        return (
                          <div key={`${worker.workerId}-${index}`} className="top-worker">
                            <div className="worker-rank">{index + 1}</div>
                            {photoUrl ? (
                              <img 
                                src={photoUrl} 
                                alt={worker.workerName}
                                className="worker-avatar-small-img"
                              />
                            ) : (
                              <div className="worker-avatar-small">
                                {worker.workerName?.charAt(0) || worker.workerId?.charAt(0) || "W"}
                              </div>
                            )}
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
                        );
                      })
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
                    <div className="quick-stat">
                      <span className="stat-label">Utilization Rate:</span>
                      <span className="stat-value">
                        {(monthlyStats.utilizationRate * 100).toFixed(1)}%
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
              {renderStatCard("⏰", "Avg. Duration", 
                dailyStats.totalSlots > 0 
                  ? (dailyStats.totalHours / dailyStats.totalSlots).toFixed(2) + "h" 
                  : "0h", 
                "Per slot", "warning")}
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
                        <div key={`${worker.id}-${index}`} className="worker-card-small">
                          <div className="worker-info-with-photo-small">
                            {worker.photoUrl ? (
                              <img 
                                src={worker.photoUrl} 
                                alt={worker.name}
                                className="worker-photo-tiny"
                              />
                            ) : (
                              <div className="worker-photo-placeholder-tiny">
                                {worker.name?.charAt(0) || 'W'}
                              </div>
                            )}
                            <div className="worker-info-small">
                              <div className="worker-name-small">
                                {worker.name} 
                                <span className="hours-badge-small">{worker.hours.toFixed(1)}h</span>
                              </div>
                              <div className="worker-id-small">ID: {worker.id}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-data">No workers assigned today</div>
                    )}
                  </div>
                </div>

                {/* Daily Summary */}
                <div className="sidebar-card">
                  <h3>📊 Daily Summary</h3>
                  <div className="quick-stats">
                    <div className="quick-stat">
                      <span className="stat-label">First Slot:</span>
                      <span className="stat-value">
                        {dailyStats.slotDetails.length > 0 
                          ? dailyStats.slotDetails.reduce((earliest, slot) => 
                              slot.startTime12 < earliest.startTime12 ? slot : earliest
                            ).startTime12 
                          : "N/A"}
                      </span>
                    </div>
                    <div className="quick-stat">
                      <span className="stat-label">Last Slot:</span>
                      <span className="stat-value">
                        {dailyStats.slotDetails.length > 0 
                          ? dailyStats.slotDetails.reduce((latest, slot) => 
                              slot.endTime12 > latest.endTime12 ? slot : latest
                            ).endTime12 
                          : "N/A"}
                      </span>
                    </div>
                    <div className="quick-stat">
                      <span className="stat-label">Busiest Hour:</span>
                      <span className="stat-value">
                        {dailyStats.timeDistribution.reduce((max, hour) => 
                          hour.totalHours > max.totalHours ? hour : max, 
                          { totalHours: 0, hour12: "N/A" }
                        ).hour12}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          // Monthly Analytics View
          <div className="monthly-analytics-report">
            <div className="monthly-header">
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

           

            

            {/* Monthly Detailed Report */}
            {renderMonthlyReportTable()}
          </div>
        )}
      </div>

      {/* Footer Summary */}
      <div className="dashboard-footer">
        
        <div className="footer-actions">
          <button className="btn-export" onClick={handleDownloadCSV}>
            📥 Export as CSV
          </button>
          <button className="btn-export" onClick={exportToPDF}>
            📄 Export as PDF
          </button>
          <button className="btn-refresh" onClick={fetchClientSlotData}>
            🔄 Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientSlotTab;