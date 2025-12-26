import React, { useState, useEffect, useRef } from "react";
import firebaseDB from "../../../firebase";
import { WORKER_PATHS, CLIENT_PATHS } from "../../../utils/dataPaths";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, parseISO, addDays } from 'date-fns';

const SlotBook = ({ workers, onAllocationUpdate }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [allocations, setAllocations] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredClients, setFilteredClients] = useState([]);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotStatus, setSlotStatus] = useState("allocating");
  const [editingEndTime, setEditingEndTime] = useState(false);
  const [tempEndTime, setTempEndTime] = useState("");
  const [tempRemarks, setTempRemarks] = useState("");
  const [tempStatus, setTempStatus] = useState("completed");
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");
  const [dailySummary, setDailySummary] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState({
    workingDays: 0,
    totalHours: 0,
    leavesTaken: 0,
    utilizationRate: "0%"
  });
  const [activeWorker, setActiveWorker] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [slotType, setSlotType] = useState("working"); // New state for slot type
  
  const searchInputRef = useRef(null);
  const calendarRef = useRef(null);
  const endTimeRef = useRef(null);

  // Enhanced time slots with 30-minute intervals
  const generateTimeSlots = React.useMemo(() => {
    const slots = [];
    for (let hour = 5; hour <= 21; hour++) {
      // Add hourly slots
      slots.push({
        id: `${hour}_00`,
        hour24: hour,
        minute: 0,
        time24: `${hour.toString().padStart(2, '0')}:00`,
        time12: convertTo12Hour(`${hour.toString().padStart(2, '0')}:00`),
        isLunchBreak: hour >= 12 && hour < 14,
        displayText: convertTo12Hour(`${hour.toString().padStart(2, '0')}:00`),
        slotType: "hourly"
      });
      
      // Add half-hour slots
      if (hour < 21) {
        slots.push({
          id: `${hour}_30`,
          hour24: hour,
          minute: 30,
          time24: `${hour.toString().padStart(2, '0')}:30`,
          time12: convertTo12Hour(`${hour.toString().padStart(2, '0')}:30`),
          isLunchBreak: hour >= 12 && hour < 14,
          displayText: convertTo12Hour(`${hour.toString().padStart(2, '0')}:30`),
          slotType: "half-hour"
        });
      }
    }
    return slots;
  }, []);

  // Convert 24-hour time to 12-hour format
  function convertTo12Hour(time24) {
    const [hour, minute] = time24.split(':').map(Number);
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
  }

  // Format date for display
  function formatDate(date) {
    return format(date, 'EEEE, MMMM do, yyyy');
  }

  // Format date for summary table
  function formatDateForSummary(date) {
    return format(date, 'dd-MMM-yy');
  }

  // Get date key for Firebase
  function getDateKey(date) {
    return format(date, 'yyyy-MM-dd');
  }

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target) && 
          !event.target.closest('.btn-date-picker')) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendar]);

  // Filter clients based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredClients([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = clients.filter(client => 
      (client.name && client.name.toLowerCase().includes(query)) ||
      (client.clientId && client.clientId.toLowerCase().includes(query)) ||
      (client.phone && client.phone.toLowerCase().includes(query)) ||
      (client.location && client.location.toLowerCase().includes(query)) ||
      (client.email && client.email.toLowerCase().includes(query))
    );
    
    setFilteredClients(filtered);
  }, [searchQuery, clients]);

  // Fetch ALL clients from ALL departments
  useEffect(() => {
    fetchAllClients();
  }, []);

  // Fetch clients from ALL departments
  const fetchAllClients = async () => {
    try {
      setLoading(true);
      
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

      let allClients = [];
      
      for (const [department, path] of Object.entries(clientPaths)) {
        try {
          const snapshot = await firebaseDB.child(path).once('value');
          const clientsData = snapshot.val();
          
          if (clientsData) {
            const departmentClients = Object.entries(clientsData).map(([key, value]) => ({
              // PRIMARY IDENTITY
              clientKey: key,
              clientPath: path,
              // Display ID
              clientId: value.clientId || value.idNo || value.employeeId || key,
              // Client information
              name: `${value.firstName || ""} ${value.lastName || ""}`.trim() || 
                    value.clientName || value.name || "Unknown Client",
              location: value.address || value.location || "Unknown Location",
              department: department,
              phone: value.phone || value.mobile || value.contactNumber || "N/A",
              email: value.email || "N/A"
            }));
            allClients = [...allClients, ...departmentClients];
          }
        } catch (error) {
          console.error(`Error fetching clients from ${department}:`, error);
        }
      }
      
      setClients(allClients);
      console.log(`Fetched ${allClients.length} clients from all departments`);
    } catch (error) {
      console.error("Error fetching all clients:", error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  // FIX: Load allocations when date changes
  useEffect(() => {
    loadAllocationsForDate(selectedDate);
  }, [selectedDate, workers]);

  // Load allocations for specific date
  const loadAllocationsForDate = async (date) => {
    const dateKey = getDateKey(date);
    
    setAllocations(prev => {
      const updated = { ...prev };

      (workers || []).forEach(worker => {
        if (!updated[worker.id]) {
          updated[worker.id] = {};
        }

        const scheduleForDate = worker.schedule?.[dateKey] || {};
        Object.entries(scheduleForDate).forEach(([slotId, allocation]) => {
          updated[worker.id][slotId] = allocation;
        });
      });

      return updated;
    });
    
    calculateDailySummary();
  };

  // Calculate monthly statistics
  useEffect(() => {
    calculateMonthlyStats();
  }, [workers, allocations, selectedDate]);

  const calculateMonthlyStats = () => {
    const currentMonth = selectedDate.getMonth();
    const currentYear = selectedDate.getFullYear();
    
    let totalHours = 0;
    let workingDays = new Set();
    let leavesTaken = 0;

    workers?.forEach(worker => {
      const workerSchedule = worker.schedule || {};
      
      Object.entries(workerSchedule).forEach(([dateKey, daySchedule]) => {
        const date = parseISO(dateKey);
        
        if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
          workingDays.add(dateKey);
          
          let dayHours = 0;
          let hasWork = false;
          
          Object.values(daySchedule).forEach(allocation => {
            if (allocation.status === "completed" && allocation.duration) {
              // FIX: Ensure duration is a number
              const duration = parseFloat(allocation.duration);
              if (!isNaN(duration)) {
                dayHours += duration;
                hasWork = true;
              }
            }
          });
          
          totalHours += dayHours;
          
          if (!hasWork && date.getDay() !== 0 && date.getDay() !== 6) {
            leavesTaken++;
          }
        }
      });
    });

    const totalPossibleHours = workingDays.size * 8 * (workers?.length || 1);
    const utilizationRate = totalPossibleHours > 0 ? (totalHours / totalPossibleHours * 100).toFixed(1) : 0;

    setMonthlyStats({
      workingDays: workingDays.size,
      totalHours: parseFloat(totalHours.toFixed(2)), // Ensure it's a number
      leavesTaken,
      utilizationRate: `${utilizationRate}%`
    });
  };

  // Calculate daily summary - UPDATED with new columns
  const calculateDailySummary = () => {
    const summary = [];
    const dateKey = getDateKey(selectedDate);
    
    (workers || []).forEach(worker => {
      const workerAllocations = allocations[worker.id] || {};
      let totalHours = 0;
      let clientNames = [];
      let remarksList = [];
      
      Object.values(workerAllocations).forEach(allocation => {
        if (allocation.status === "completed" && allocation.duration) {
          const duration = parseFloat(allocation.duration);
          if (!isNaN(duration)) {
            totalHours += duration;
            clientNames.push(allocation.clientName || "No Client");
            if (allocation.remarks) {
              remarksList.push(allocation.remarks);
            }
          }
        }
      });
      
      const uniqueClients = [...new Set(clientNames.filter(name => name))];
      
      summary.push({
        workerId: worker.id,
        workerName: worker.name,
        department: worker.department,
        totalHours: parseFloat(totalHours.toFixed(2)),
        totalClients: uniqueClients.length,
        clientNames: uniqueClients,
        date: dateKey,
        remarks: remarksList.length > 0 ? remarksList.join(", ") : "No remarks"
      });
    });
    
    setDailySummary(summary);
  };

  // Check if slot should be disabled (when there's a booked slot covering it)
  const isSlotDisabled = (workerId, slot) => {
    const workerAllocations = allocations[workerId] || {};
    
    // Check if this slot is already allocated
    if (workerAllocations[slot.id]) {
      return true;
    }
    
    // Check for continuous bookings that might cover this slot
    for (const [slotId, allocation] of Object.entries(workerAllocations)) {
      if (allocation.slotType === "continuous") {
        const startSlot = generateTimeSlots.find(s => 
          s.hour24 === allocation.startHour && s.minute === allocation.startMinute
        );
        const endSlot = generateTimeSlots.find(s => 
          s.hour24 === allocation.endHour && s.minute === allocation.endMinute
        );
        
        if (startSlot && endSlot) {
          const startIndex = generateTimeSlots.findIndex(s => s.id === startSlot.id);
          const endIndex = generateTimeSlots.findIndex(s => s.id === endSlot.id);
          const currentIndex = generateTimeSlots.findIndex(s => s.id === slot.id);
          
          if (startIndex <= currentIndex && currentIndex <= endIndex) {
            return true;
          }
        }
      }
    }
    
    return false;
  };

  // Handle slot click - UPDATED with slot type selection
  const handleSlotClick = (workerId, slot) => {
    if (slot.isLunchBreak) return;
    
    // Check if slot is disabled
    if (isSlotDisabled(workerId, slot)) {
      alert("This slot is already booked or within a booked time range.");
      return;
    }
    
    const currentAllocation = allocations[workerId]?.[slot.id];
    const worker = workers?.find(w => w.id === workerId);
    setActiveWorker(worker);
    setSelectedClientId(null);
    setTempRemarks("");
    setTempStatus("completed");
    
    if (currentAllocation?.status === "completed" || currentAllocation?.status === "not-completed") {
      setSlotStatus("completed");
      setSelectedSlot({ workerId, slot, allocation: currentAllocation });
      setTempRemarks(currentAllocation.remarks || "");
      setTempStatus(currentAllocation.status || "completed");
      setShowAllocationModal(true);
    } else if (currentAllocation?.status === "allocated" || currentAllocation?.status === "in-progress") {
      setSlotStatus("in-progress");
      setSelectedSlot({ workerId, slot, allocation: currentAllocation });
      setTempEndTime(currentAllocation.endTime || "");
      setTempRemarks(currentAllocation.remarks || "");
      setShowAllocationModal(true);
    } else {
      setSlotStatus("allocating");
      setSelectedSlot({ workerId, slot });
      setSearchQuery("");
      setSlotType("working"); // Default slot type
      setShowAllocationModal(true);
      
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    }
  };

  // Handle slot type selection (for new allocations)
  const handleSlotTypeSelect = async (type) => {
    if (!selectedSlot || !selectedSlot.workerId || !selectedSlot.slot) return;
    
    const { workerId, slot } = selectedSlot;
    const dateKey = getDateKey(selectedDate);
    const worker = workers?.find(w => w.id === workerId);
    
    let newAllocation = {
      workerId: workerId,
      workerName: worker?.name || "Unknown Worker",
      // Slot details
      date: dateKey,
      slotId: slot.id,
      slotHour: slot.hour24,
      slotMinute: slot.minute,
      startTime: slot.time24,
      startTime12: slot.time12,
      endTime: null,
      status: type === "working" ? "allocated" : type,
      slotType: type,
      allocatedAt: new Date().toISOString(),
      duration: null,
      department: worker?.department,
      workerDepartment: worker?.department,
      remarks: ""
    };

    // For non-working slots, mark as completed immediately
    if (type !== "working") {
      newAllocation = {
        ...newAllocation,
        status: "completed",
        endTime: slot.time24,
        duration: 0,
        completedAt: new Date().toISOString(),
        remarks: `Marked as ${type}`
      };
    }

    // Update local state
    setAllocations(prev => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        [slot.id]: newAllocation
      }
    }));

    try {
      // Save to Worker's schedule
      await saveAllocationToWorker(workerId, newAllocation);
      
      console.log(`✅ Slot marked as ${type}`);
    } catch (error) {
      console.error("❌ Error saving slot:", error);
      alert("Failed to save slot. Please try again.");
      return;
    }

    if (onAllocationUpdate) {
      onAllocationUpdate(newAllocation);
    }

    // Set appropriate status and close modal
    if (type === "working") {
      setSlotStatus("allocated");
      // Keep modal open for client selection
    } else {
      setSlotStatus("completed");
      setSelectedSlot({ workerId, slot, allocation: newAllocation });
      setTimeout(() => {
        setShowAllocationModal(false);
        setActiveWorker(null);
      }, 1500);
    }
  };

  // Handle client selection - FIXED: Use correct phone field
  const handleClientSelect = async (client) => {
    if (!selectedSlot || !selectedSlot.workerId || !selectedSlot.slot) return;

    // Highlight the selected client
    setSelectedClientId(client.clientKey);

    const { workerId, slot } = selectedSlot;
    const dateKey = getDateKey(selectedDate);
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour + (currentMinute / 60);
    const slotTime = slot.hour24 + (slot.minute / 60);
    const worker = workers?.find(w => w.id === workerId);

    // Create allocation object
    const newAllocation = {
      workerId: workerId,
      workerName: worker?.name || "Unknown Worker",
      // Client identifiers
      clientKey: client.clientKey,
      clientPath: client.clientPath,
      clientId: client.clientId,
      clientName: client.name,
      clientLocation: client.location,
      clientPhone: client.phone || client.mobile || client.contactNumber || "N/A", // FIX: Use correct phone field
      clientEmail: client.email,
      // Slot details
      date: dateKey,
      slotId: slot.id,
      slotHour: slot.hour24,
      slotMinute: slot.minute,
      startTime: slot.time24,
      startTime12: slot.time12,
      endTime: null,
      status: currentTime >= slotTime ? "in-progress" : "allocated",
      slotType: "working",
      allocatedAt: new Date().toISOString(),
      duration: null,
      department: client.department,
      workerDepartment: worker?.department,
      remarks: ""
    };

    // Update local state
    setAllocations(prev => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        [slot.id]: newAllocation
      }
    }));

    try {
      // Save to Worker's schedule
      await saveAllocationToWorker(workerId, newAllocation);
      
      // Save to Client's schedule
      await saveAllocationToClient(client, newAllocation);
      
      console.log("✅ Allocation saved to both worker and client");
    } catch (error) {
      console.error("❌ Error saving allocation:", error);
      alert("Failed to save allocation. Please try again.");
      return;
    }

    if (onAllocationUpdate) {
      onAllocationUpdate(newAllocation);
    }

    // Don't auto-close modal. Just update status
    if (currentTime >= slotTime) {
      setSlotStatus("in-progress");
      setSelectedSlot({ workerId, slot, allocation: newAllocation });
      setEditingEndTime(true);
    } else {
      // Keep modal open with success message
      setSlotStatus("allocated");
    }
  };

  // Save allocation to Worker's Firebase path
  const saveAllocationToWorker = async (workerId, allocation) => {
    try {
      const worker = workers?.find(w => w.id === workerId);
      if (!worker) {
        console.error("Worker not found:", workerId);
        return;
      }

      const workerPath = WORKER_PATHS[worker.department] || WORKER_PATHS["Others"];
      const dateKey = allocation.date;
      const slotId = allocation.slotId;

      // Get current worker data
      const snapshot = await firebaseDB.child(`${workerPath}/${workerId}`).once('value');
      const workerData = snapshot.val() || {};

      // Initialize schedule if it doesn't exist
      const currentSchedule = workerData.schedule || {};
      const currentDateSchedule = currentSchedule[dateKey] || {};

      // Update schedule
      const updatedSchedule = {
        ...currentSchedule,
        [dateKey]: {
          ...currentDateSchedule,
          [slotId]: allocation
        }
      };

      // Update worker in Firebase
      await firebaseDB.child(`${workerPath}/${workerId}`).update({
        schedule: updatedSchedule,
        lastUpdated: new Date().toISOString(),
        lastActivity: allocation.clientName ? `Allocated to ${allocation.clientName}` : `Marked as ${allocation.slotType}`
      });

      console.log("✅ Worker schedule updated");
    } catch (error) {
      console.error("Error saving to worker schedule:", error);
      throw error;
    }
  };

  // Save allocation to Client's Firebase path - CREATE IF NOT EXISTS
  const saveAllocationToClient = async (client, allocation) => {
    try {
      const clientRef = firebaseDB.child(`${client.clientPath}/${client.clientKey}`);
      const snapshot = await clientRef.once("value");

      let clientData = snapshot.val();

      // 🔥 CREATE CLIENT IF NOT EXISTS (Walk-in support)
      if (!clientData) {
        clientData = {
          clientId: client.clientId,
          name: client.name,
          phone: client.phone,
          email: client.email,
          location: client.location,
          department: client.department,
          createdAt: new Date().toISOString(),
          schedule: {}
        };
      }

      const dateKey = allocation.date;
      const slotId = allocation.slotId;

      const updatedSchedule = {
        ...(clientData.schedule || {}),
        [dateKey]: {
          ...(clientData.schedule?.[dateKey] || {}),
          [slotId]: {
            ...allocation,
            clientKey: client.clientKey
          }
        }
      };

      await clientRef.set({
        ...clientData,
        schedule: updatedSchedule,
        lastUpdated: new Date().toISOString(),
        lastWorker: allocation.workerName
      });

      console.log("✅ Client schedule saved");
    } catch (error) {
      console.error("❌ Client save failed:", error);
      throw error;
    }
  };

  // Handle end time update - FIXED: Ensure duration is calculated properly
  const handleEndTimeUpdate = async () => {
    if (!selectedSlot || !tempEndTime) return;

    const { workerId, slot } = selectedSlot;
    const allocation = allocations[workerId]?.[slot.id];
    
    if (!allocation) return;

    // Calculate duration - FIXED: Better calculation
    const startParts = allocation.startTime.split(':');
    const endParts = tempEndTime.split(':');
    
    const startHours = parseInt(startParts[0], 10);
    const startMinutes = parseInt(startParts[1], 10);
    const endHours = parseInt(endParts[0], 10);
    const endMinutes = parseInt(endParts[1], 10);
    
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;
    
    let durationMinutes = endTotalMinutes - startTotalMinutes;
    
    if (durationMinutes <= 0) {
      alert("End time must be after start time");
      return;
    }
    
    const duration = durationMinutes / 60; // Convert to hours

    const updatedAllocation = {
      ...allocation,
      endTime: tempEndTime,
      endTime12: convertTo12Hour(tempEndTime),
      status: tempStatus,
      duration: parseFloat(duration.toFixed(2)), // Ensure it's a number
      completedAt: new Date().toISOString(),
      remarks: tempRemarks
    };

    // Update local state
    setAllocations(prev => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        [slot.id]: updatedAllocation
      }
    }));

    try {
      // Find the client
      const client = clients?.find(c => c.clientKey === allocation.clientKey);
      
      // Update worker schedule
      await saveAllocationToWorker(workerId, updatedAllocation);
      
      // Update client schedule if client exists
      if (client && allocation.clientKey && allocation.clientKey !== "WALKIN") {
        await saveAllocationToClient(client, updatedAllocation);
      }
      
      console.log("✅ Allocation completed and saved");
    } catch (error) {
      console.error("❌ Error completing allocation:", error);
      alert("Failed to save completion. Please try again.");
      return;
    }

    if (onAllocationUpdate) {
      onAllocationUpdate(updatedAllocation);
    }

    // Update slot status
    setSlotStatus("completed");
    setSelectedSlot({ workerId, slot, allocation: updatedAllocation });
    setEditingEndTime(false);
    setTempEndTime("");
    setTempRemarks("");
  };

  // Handle status update without end time (for non-working slots)
  const handleStatusUpdate = async () => {
    if (!selectedSlot) return;

    const { workerId, slot } = selectedSlot;
    const allocation = allocations[workerId]?.[slot.id];
    
    if (!allocation) return;

    const updatedAllocation = {
      ...allocation,
      status: tempStatus,
      remarks: tempRemarks,
      completedAt: new Date().toISOString()
    };

    // Update local state
    setAllocations(prev => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        [slot.id]: updatedAllocation
      }
    }));

    try {
      // Update worker schedule
      await saveAllocationToWorker(workerId, updatedAllocation);
      console.log("✅ Status updated and saved");
    } catch (error) {
      console.error("❌ Error updating status:", error);
      alert("Failed to update status. Please try again.");
      return;
    }

    if (onAllocationUpdate) {
      onAllocationUpdate(updatedAllocation);
    }

    // Update slot status
    setSlotStatus("completed");
    setSelectedSlot({ workerId, slot, allocation: updatedAllocation });
    setTempRemarks("");
  };

  // Get slot status and styling
  const getSlotStatus = (workerId, slot) => {
    const allocation = allocations[workerId]?.[slot.id];
    
    if (slot.isLunchBreak) {
      return {
        status: "lunch-break",
        className: "slot-lunch-break",
        tooltip: "Lunch Break (12 PM - 2 PM)"
      };
    }
    
    if (!allocation) {
      return {
        status: "available",
        className: "slot-available",
        tooltip: "Available - Click to allocate"
      };
    }
    
    // Check slot type for styling
    if (allocation.slotType && allocation.slotType !== "working") {
      const typeColors = {
        "leave": "slot-leave",
        "sick-leave": "slot-sick-leave",
        "holiday": "slot-holiday",
        "client-not-available": "slot-client-not-available"
      };
      
      return {
        status: allocation.slotType,
        className: typeColors[allocation.slotType] || "slot-other",
        tooltip: `${allocation.slotType.replace(/-/g, ' ').toUpperCase()}${allocation.remarks ? `\nRemarks: ${allocation.remarks}` : ''}`
      };
    }
    
    switch (allocation.status) {
      case "allocated":
        return {
          status: "allocated",
          className: "slot-allocated",
          tooltip: `Allocated to ${allocation.clientName || 'No client'}\nStart: ${allocation.startTime12}`
        };
      case "in-progress":
        return {
          status: "in-progress",
          className: "slot-in-progress",
          tooltip: `In Progress: ${allocation.clientName || 'No client'}\nStart: ${allocation.startTime12}`
        };
      case "completed":
        return {
          status: "completed",
          className: "slot-completed",
          tooltip: `Completed: ${allocation.clientName || 'No client'}\nDuration: ${allocation.duration} hours${allocation.remarks ? `\nRemarks: ${allocation.remarks}` : ''}`
        };
      case "not-completed":
        return {
          status: "not-completed",
          className: "slot-not-completed",
          tooltip: `Not Completed: ${allocation.clientName || 'No client'}${allocation.remarks ? `\nRemarks: ${allocation.remarks}` : ''}`
        };
      default:
        return {
          status: "available",
          className: "slot-available",
          tooltip: "Available"
        };
    }
  };

  // Calculate worker's total hours for the day - FIXED: Ensure it returns a number
  const calculateTotalHours = (workerId) => {
    const workerAllocations = allocations[workerId] || {};
    let totalHours = 0;
    
    Object.values(workerAllocations).forEach(allocation => {
      if (allocation.status === "completed" && allocation.duration) {
        const duration = parseFloat(allocation.duration);
        if (!isNaN(duration)) {
          totalHours += duration;
        }
      }
    });
    
    return totalHours.toFixed(2);
  };

  // Calculate total working hours for the day - FIXED: Ensure it returns a number
  const calculateTotalWorkingHours = () => {
    let total = 0;
    (workers || []).forEach(worker => {
      const hours = parseFloat(calculateTotalHours(worker.id) || 0);
      if (!isNaN(hours)) {
        total += hours;
      }
    });
    return total.toFixed(2);
  };

  // Clear slot allocation
  const handleClearSlot = async (workerId, slotId) => {
    if (!window.confirm("Are you sure you want to clear this allocation?")) return;
    
    const allocation = allocations[workerId]?.[slotId];
    if (!allocation) return;

    // Remove from local state
    setAllocations(prev => {
      const updated = { ...prev };
      if (updated[workerId]) {
        delete updated[workerId][slotId];
      }
      return updated;
    });

    try {
      // Remove from worker schedule
      const worker = workers?.find(w => w.id === workerId);
      if (worker) {
        const workerPath = WORKER_PATHS[worker.department] || WORKER_PATHS["Others"];
        const dateKey = allocation.date;
        
        const snapshot = await firebaseDB.child(`${workerPath}/${workerId}`).once('value');
        const workerData = snapshot.val() || {};
        
        if (workerData.schedule?.[dateKey]?.[slotId]) {
          const updatedSchedule = { ...workerData.schedule };
          delete updatedSchedule[dateKey][slotId];
          
          // Clean up empty date entries
          if (Object.keys(updatedSchedule[dateKey]).length === 0) {
            delete updatedSchedule[dateKey];
          }
          
          await firebaseDB.child(`${workerPath}/${workerId}`).update({
            schedule: updatedSchedule,
            lastUpdated: new Date().toISOString()
          });
        }
      }

      // Remove from client schedule
      const client = clients?.find(c => c.clientKey === allocation.clientKey);
      if (client && client.clientPath && allocation.clientKey && allocation.clientKey !== "WALKIN") {
        const snapshot = await firebaseDB.child(`${client.clientPath}/${client.clientKey}`).once('value');
        const clientData = snapshot.val() || {};
        
        if (clientData.schedule?.[allocation.date]?.[slotId]) {
          const updatedClientSchedule = { ...clientData.schedule };
          delete updatedClientSchedule[allocation.date][slotId];
          
          // Clean up empty date entries
          if (Object.keys(updatedClientSchedule[allocation.date]).length === 0) {
            delete updatedClientSchedule[allocation.date];
          }
          
          await firebaseDB.child(`${client.clientPath}/${client.clientKey}`).update({
            schedule: updatedClientSchedule,
            lastUpdated: new Date().toISOString()
          });
        }
      }

      console.log("✅ Slot cleared successfully");
    } catch (error) {
      console.error("Error clearing slot:", error);
      alert("Failed to clear slot. Please try again.");
    }
    
    setShowAllocationModal(false);
    setSelectedSlot(null);
    setActiveWorker(null);
    setSelectedClientId(null);
  };

  // Generate time options for end time dropdown
  const generateEndTimeOptions = (startTime) => {
    const options = [];
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const startTotalMinutes = startHour * 60 + startMinute;
    
    // Generate times up to 21:00 (9 PM)
    for (let hour = startHour; hour <= 21; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        // Skip times before start time
        const totalMinutes = hour * 60 + minute;
        if (totalMinutes <= startTotalMinutes && hour === startHour && minute === startMinute) {
          continue;
        }
        
        if (totalMinutes > startTotalMinutes) {
          const time24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          options.push({
            value: time24,
            label: convertTo12Hour(time24)
          });
        }
        
        // Break if we've reached 21:00
        if (hour === 21 && minute === 0) break;
      }
    }
    
    return options;
  };

  // Render allocation modal - UPDATED with new features
  const renderAllocationModal = () => {
    if (!showAllocationModal || !selectedSlot) return null;

    const { workerId, slot } = selectedSlot;
    const worker = workers?.find(w => w.id === workerId);
    const allocation = allocations[workerId]?.[slot.id];
    const endTimeOptions = allocation ? generateEndTimeOptions(allocation.startTime) : [];

    return (
      <div className="modal-overlay">
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>
              {slotStatus === "allocating" && "📅 Allocate Time Slot"}
              {slotStatus === "allocated" && "✅ Successfully Allocated"}
              {(slotStatus === "in-progress" || slotStatus === "completed") && "⚙️ Update Work Status"}
            </h3>
            <button className="modal-close" onClick={() => {
              setShowAllocationModal(false);
              setActiveWorker(null);
              setSelectedClientId(null);
              setEditingEndTime(false);
              setTempEndTime("");
              setTempRemarks("");
            }}>
              ×
            </button>
          </div>
          
          <div className="modal-body">
            <div className="info-card">
              <div className="info-row">
                <span className="label">👨‍💼 Worker:</span>
                <span className="value">{worker?.name || workerId}</span>
              </div>
              <div className="info-row">
                <span className="label">🕒 Time Slot:</span>
                <span className="value">{slot.time12}</span>
              </div>
              <div className="info-row">
                <span className="label">📅 Date:</span>
                <span className="value">{formatDate(selectedDate)}</span>
              </div>
            </div>

            {slotStatus === "allocating" && !allocation && (
              <div className="slot-type-section">
                <h4>📋 Select Slot Type</h4>
                <div className="slot-type-buttons">
                  <button className="btn-slot-type working" onClick={() => setSlotType("working")}>
                    🏢 Working
                  </button>
                  <button className="btn-slot-type leave" onClick={() => handleSlotTypeSelect("leave")}>
                    🏖️ Leave
                  </button>
                  <button className="btn-slot-type sick-leave" onClick={() => handleSlotTypeSelect("sick-leave")}>
                    🤒 Sick Leave
                  </button>
                  <button className="btn-slot-type holiday" onClick={() => handleSlotTypeSelect("holiday")}>
                    🎉 Holiday
                  </button>
                  <button className="btn-slot-type client-not-available" onClick={() => handleSlotTypeSelect("client-not-available")}>
                    👥 Client Not Available
                  </button>
                </div>
                
                {slotType === "working" && (
                  <div className="client-search-section">
                    <div className="section-header">
                      <h4>🔍 Select Client</h4>
                      {loading && <div className="loading-spinner">Loading clients...</div>}
                    </div>
                    
                    <div className="search-container">
                      <input
                        ref={searchInputRef}
                        type="text"
                        className="search-input"
                        placeholder="Search by name, ID, phone, location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && filteredClients.length > 0) {
                            handleClientSelect(filteredClients[0]);
                          }
                        }}
                      />
                      <span className="search-icon">🔍</span>
                    </div>
                    
                    {searchQuery && (
                      <div className="client-results">
                        {filteredClients.length > 0 ? (
                          <>
                            <div className="results-header">
                              <span>Found {filteredClients.length} client(s)</span>
                            </div>
                            <div className="client-list">
                              {filteredClients.slice(0, 8).map(client => (
                                <div
                                  key={client.clientKey}
                                  className={`client-card ${selectedClientId === client.clientKey ? 'selected' : ''}`}
                                  onClick={() => handleClientSelect(client)}
                                >
                                  <div className="client-header">
                                    <div className="client-id">ID: {client.clientId}</div>
                                    <div className="client-phone">📱 {client.phone}</div>
                                  </div>
                                  <div className="client-name">👤 {client.name}</div>
                                  <div className="client-details">
                                    <span className="location">📍 {client.location}</span>
                                    <span className="department">🏢 {client.department}</span>
                                  </div>
                                  {selectedClientId === client.clientKey && (
                                    <div className="selection-indicator">✓ Selected</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="no-results">
                            <p>No clients found matching "{searchQuery}"</p>
                            <button
                              className="btn-walkin"
                              onClick={() => {
                                const dummyClient = {
                                  clientKey: "WALKIN-" + Date.now(),
                                  clientPath: "ClientData/Others/Running",
                                  clientId: "WALKIN-" + Date.now(),
                                  name: "Walk-in Client",
                                  location: "On-site",
                                  phone: "N/A",
                                  email: "N/A",
                                  department: worker?.department || "Others"
                                };
                                handleClientSelect(dummyClient);
                              }}
                            >
                              ➕ Create Walk-in Client
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {slotStatus === "allocated" && allocation && (
              <div className="success-message">
                <div className="success-icon">✅</div>
                <h4>Allocation Successful!</h4>
                <div className="success-details">
                  <p><strong>Worker:</strong> {allocation.workerName}</p>
                  <p><strong>Client:</strong> {allocation.clientName || "No client"}</p>
                  <p><strong>Time:</strong> {allocation.startTime12}</p>
                  <p><strong>Status:</strong> Scheduled</p>
                </div>
                <div className="success-actions">
                  <button
                    className="btn-close-success"
                    onClick={() => {
                      setShowAllocationModal(false);
                      setSelectedSlot(null);
                      setActiveWorker(null);
                      setSelectedClientId(null);
                    }}
                  >
                    Close
                  </button>
                  <button
                    className="btn-view-details"
                    onClick={() => {
                      setSlotStatus("in-progress");
                      setEditingEndTime(true);
                    }}
                  >
                    Set End Time
                  </button>
                </div>
              </div>
            )}

            {(slotStatus === "in-progress" || slotStatus === "completed") && allocation && (
              <div className="allocation-details">
                <div className="client-info">
                  <h4>👤 Client Information</h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="label">Client ID:</span>
                      <span className="value">{allocation.clientId || "N/A"}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Name:</span>
                      <span className="value">{allocation.clientName || "N/A"}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Location:</span>
                      <span className="value">{allocation.clientLocation || "N/A"}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Phone:</span>
                      <span className="value">{allocation.clientPhone || "N/A"}</span>
                    </div>
                  </div>
                </div>
                
                <div className="work-info">
                  <h4>⚙️ Work Details</h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="label">Start Time:</span>
                      <span className="value">{allocation.startTime12}</span>
                    </div>
                    
                    <div className="info-item">
                      <span className="label">Status:</span>
                      <select 
                        className="status-select"
                        value={tempStatus}
                        onChange={(e) => setTempStatus(e.target.value)}
                      >
                        <option value="completed">✅ Completed</option>
                        <option value="not-completed">❌ Not Completed</option>
                        <option value="leave">🏖️ Leave</option>
                        <option value="sick-leave">🤒 Sick Leave</option>
                        <option value="holiday">🎉 Holiday</option>
                        <option value="client-not-available">👥 Client Not Available</option>
                      </select>
                    </div>
                    
                    {tempStatus === "completed" && allocation.slotType === "working" && (
                      <div className="info-item full-width">
                        <span className="label">End Time:</span>
                        {editingEndTime ? (
                          <div className="time-input-group">
                            <select
                              ref={endTimeRef}
                              value={tempEndTime}
                              onChange={(e) => setTempEndTime(e.target.value)}
                              className="time-select"
                            >
                              <option value="">Select end time</option>
                              {endTimeOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <div className="button-group">
                              <button
                                className="btn-save"
                                onClick={handleEndTimeUpdate}
                                disabled={!tempEndTime}
                              >
                                ✅ Save
                              </button>
                              <button
                                className="btn-cancel"
                                onClick={() => setEditingEndTime(false)}
                              >
                                ❌ Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="end-time-actions">
                            <span className="value">{allocation.endTime12 || "Not set"}</span>
                            <button
                              className="btn-set"
                              onClick={() => {
                                setEditingEndTime(true);
                                setTimeout(() => {
                                  if (endTimeRef.current) {
                                    endTimeRef.current.focus();
                                  }
                                }, 100);
                              }}
                            >
                              ⏰ {allocation.endTime ? "Change End Time" : "Set End Time"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="info-item full-width">
                      <span className="label">Remarks:</span>
                      <textarea
                        className="remarks-input"
                        value={tempRemarks}
                        onChange={(e) => setTempRemarks(e.target.value)}
                        placeholder="Add remarks here..."
                        rows="3"
                      />
                    </div>
                    
                    {allocation.status === "completed" && (
                      <>
                        <div className="info-item">
                          <span className="label">End Time:</span>
                          <span className="value">{allocation.endTime12 || "N/A"}</span>
                        </div>
                        <div className="info-item">
                          <span className="label">Duration:</span>
                          <span className="value highlight">
                            {allocation.duration || 0} hours
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="label">Completed:</span>
                          <span className="value">
                            {allocation.completedAt ? new Date(allocation.completedAt).toLocaleTimeString() : "N/A"}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="action-buttons">
                  <button
                    className="btn-save-status"
                    onClick={handleStatusUpdate}
                  >
                    💾 Save Status & Remarks
                  </button>
                  <button
                    className="btn-clear"
                    onClick={() => handleClearSlot(workerId, slot.id)}
                  >
                    🗑️ Clear Allocation
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            <button
              className="btn-close"
              onClick={() => {
                setShowAllocationModal(false);
                setActiveWorker(null);
                setSelectedClientId(null);
                setEditingEndTime(false);
                setTempEndTime("");
                setTempRemarks("");
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render worker card - UPDATED with disabled slots
  const renderWorkerCard = (worker) => {
    const totalHours = calculateTotalHours(worker.id);
    const timeSlots = generateTimeSlots;
    const completedSlots = Object.values(allocations[worker.id] || {}).filter(a => a.status === "completed").length;
    const inProgressSlots = Object.values(allocations[worker.id] || {}).filter(a => a.status === "in-progress").length;
    
    return (
      <div className={`worker-card ${activeWorker?.id === worker.id ? 'active' : ''}`} key={worker.id}>
        <div className="card-header">
          <div className="worker-avatar">
            <div className="avatar">
              {worker.name?.charAt(0) || worker.id?.charAt(0) || "W"}
            </div>
          </div>
          <div className="worker-info">
            <h4 className="worker-name">{worker.name || worker.id}</h4>
            <div className="worker-details">
              <span className="badge badge-id">ID: {worker.idNo || "N/A"}</span>
              <span className={`badge badge-dept ${worker.department?.toLowerCase().replace(/[^a-z]/g, "-")}`}>
                {worker.department || "General"}
              </span>
            </div>
          </div>
          <div className="worker-stats">
            <div className="stat">
              <div className="stat-value">{totalHours}h</div>
              <div className="stat-label">Today</div>
            </div>
          </div>
        </div>

        <div className="slots-section">
          <div className="slots-header">
            <h5>🕒 Time Slots - {format(selectedDate, 'dd-MMM-yy')}</h5>
            <div className="slot-stats">
              <span className="slot-stat completed">{completedSlots} ✅</span>
              <span className="slot-stat in-progress">{inProgressSlots} ⏳</span>
            </div>
          </div>

          <div className="time-slots-grid">
            {timeSlots.map((slot) => {
              const slotStatus = getSlotStatus(worker.id, slot);
              const allocation = allocations[worker.id]?.[slot.id];
              const isDisabled = isSlotDisabled(worker.id, slot) && !allocation;
              
              return (
                <div key={slot.id} className="slot-wrapper">
                  <div
                    className={`slot ${slotStatus.className} ${allocation ? 'allocated' : ''} ${slot.isLunchBreak ? 'lunch' : ''} ${isDisabled ? 'disabled' : ''}`}
                    onClick={() => !slot.isLunchBreak && !isDisabled && handleSlotClick(worker.id, slot)}
                    title={isDisabled ? "Slot is within a booked time range" : slotStatus.tooltip}
                  >
                    {allocation ? (
                      <div className="allocation-indicator">
                        <div className="client-indicator">
                          <p className="client-name-small">
                           <strong> {allocation.clientName?.substring(0, 10) || (allocation.slotType || "Booked")}</strong>
                          </p>
                          <p className="client-id-small">
                            {allocation.clientId?.substring(0, 8) || allocation.slotType?.substring(0, 8) || "NA"}
                          </p>
                          <p className="client-location-small">
                            {allocation.clientLocation?.substring(0, 10) || allocation.startTime12 || "NA"}
                          </p>
                          <div className="allocation-status">
                            <span className={`status-dot ${allocation.status}`}></span>
                            <span className="status-text">
                              {allocation.status === "completed" 
                                ? `${allocation.duration || 0}h` 
                                : allocation.status === "in-progress"
                                ? "⏳"
                                : allocation.slotType === "leave" ? "🏖️"
                                : allocation.slotType === "sick-leave" ? "🤒"
                                : allocation.slotType === "holiday" ? "🎉"
                                : allocation.slotType === "client-not-available" ? "👥"
                                : "📅"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : slot.isLunchBreak ? (
                      <div className="lunch-indicator">
                        <span className="lunch-icon">🍽️</span>
                        <span className="lunch-text">Lunch</span>
                      </div>
                    ) : isDisabled ? (
                      <div className="disabled-indicator">
                        <span className="disabled-icon">⛔</span>
                        <span className="time-text">{slot.time12}</span>
                      </div>
                    ) : (
                      <div className="available-indicator">
                        <span className="available-icon">+</span>
                        <span className="time-text">{slot.time12}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="quick-stats">
            <div className="stat-item">
              <span className="stat-label">Available:</span>
              <span className="stat-value">
                {timeSlots.filter(s => !s.isLunchBreak && !allocations[worker.id]?.[s.id] && !isSlotDisabled(worker.id, s)).length}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">In Progress:</span>
              <span className="stat-value">{inProgressSlots}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Completed:</span>
              <span className="stat-value">{completedSlots}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Other:</span>
              <span className="stat-value">
                {Object.values(allocations[worker.id] || {}).filter(a => 
                  a.slotType && a.slotType !== "working"
                ).length}
              </span>
            </div>
          </div>
        </div>

        <div className="card-footer">
          <div className="footer-actions">
            <button 
              className="action-btn view-details"
              onClick={() => {
                const workerAllocs = allocations[worker.id];
                alert(`Worker: ${worker.name}\nTotal Hours Today: ${totalHours}\nCompleted Jobs: ${completedSlots}`);
              }}
            >
              👁️ View Details
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render daily summary - UPDATED with new columns
  const renderDailySummary = () => (
    <div className="summary-card">
      <h3>📊 Daily Summary - {formatDateForSummary(selectedDate)}</h3>
      <div className="summary-table-container">
        <table className="summary-table">
          <thead>
            <tr>
              <th>📅 Date</th>
              <th>🏢 Department</th>
              <th>⏱️ Total Hours</th>
              <th>👥 Total Clients</th>
              <th>📝 Remarks</th>
            </tr>
          </thead>
          <tbody>
            {dailySummary.length > 0 ? (
              dailySummary.map(summary => (
                <tr key={summary.workerId}>
                  <td className="date-cell">{formatDateForSummary(selectedDate)}</td>
                  <td><span className="badge bg-secondary">{summary.department}</span></td>
                  <td className="hours-cell">{summary.totalHours}h</td>
                  <td className="clients-cell">{summary.totalClients}</td>
                  <td className="remarks-cell">
                    {summary.remarks || "No remarks"}
                    {summary.clientNames.length > 0 && (
                      <div className="clients-tooltip">
                        Clients: {summary.clientNames.join(", ")}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="no-data">📭 No work recorded for today</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="2" className="text-end"><strong>Total:</strong></td>
              <td className="hours-cell"><strong>{dailySummary.reduce((sum, s) => sum + s.totalHours, 0).toFixed(2)}h</strong></td>
              <td className="clients-cell"><strong>{dailySummary.reduce((sum, s) => sum + s.totalClients, 0)}</strong></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );

  // Date picker
  const renderDatePicker = () => (
    <div className="date-picker-container">
      <button 
        className="date-picker-btn"
        onClick={() => setShowCalendar(!showCalendar)}
      >
        <span className="picker-icon">📅</span>
        <div className="picker-details">
          <div className="picker-date">{format(selectedDate, 'dd-MMM-yy')}</div>
          <div className="picker-day">{format(selectedDate, 'EEEE')}</div>
        </div>
        <span className="picker-arrow">{showCalendar ? '▲' : '▼'}</span>
      </button>
      
      {showCalendar && (
        <div className="calendar-container" ref={calendarRef}>
          <Calendar
            onChange={(date) => {
              setSelectedDate(date);
              setShowCalendar(false);
              // Load allocations for new date
              loadAllocationsForDate(date);
            }}
            value={selectedDate}
            className="custom-calendar"
          />
          <div className="quick-dates">
            <button className="quick-btn today" onClick={() => {
              const today = new Date();
              setSelectedDate(today);
              loadAllocationsForDate(today);
            }}>
              Today
            </button>
            <button className="quick-btn" onClick={() => {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              setSelectedDate(yesterday);
              loadAllocationsForDate(yesterday);
            }}>
              Yesterday
            </button>
            <button className="quick-btn" onClick={() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              setSelectedDate(tomorrow);
              loadAllocationsForDate(tomorrow);
            }}>
              Tomorrow
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Monthly tracker - FIXED: Ensure totalHours is displayed correctly
  const renderMonthlyTracker = () => (
    <div className="monthly-tracker">
      <h4>📈 Monthly Overview - {format(selectedDate, 'MMMM yyyy')}</h4>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <div className="stat-number">{monthlyStats.workingDays}</div>
            <div className="stat-label">Working Days</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <div className="stat-number">{monthlyStats.totalHours}h</div>
            <div className="stat-label">Total Hours</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏖️</div>
          <div className="stat-content">
            <div className="stat-number">{monthlyStats.leavesTaken}</div>
            <div className="stat-label">Leaves Taken</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-number">{monthlyStats.utilizationRate}</div>
            <div className="stat-label">Utilization Rate</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="slot-book-container SlotBook">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="dashboard-title">
              <span className="title-icon">📊</span>
              Worker Allocation Dashboard
            </h1>
            <div className="view-tabs">
              <button 
                className={`tab-btn ${activeView === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveView('dashboard')}
              >
                📅 Dashboard
              </button>
              <button 
                className={`tab-btn ${activeView === 'summary' ? 'active' : ''}`}
                onClick={() => setActiveView('summary')}
              >
                📈 Summary
              </button>
              <button 
                className={`tab-btn ${activeView === 'analytics' ? 'active' : ''}`}
                onClick={() => setActiveView('analytics')}
              >
                📊 Analytics
              </button>
            </div>
          </div>
          
          <div className="header-right">
            <div className="controls">
              {renderDatePicker()}
              <div className="search-container-header">
                <input
                  type="text"
                  className="search-input-header"
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <span className="search-icon-header">🔍</span>
              </div>
            </div>
            
            <div className="header-stats">
              <div className="stat-box">
                <div className="stat-value-header">{calculateTotalWorkingHours()}</div>
                <div className="stat-label-header">Total Hours</div>
              </div>
              <div className="stat-box">
                <div className="stat-value-header">{workers?.length || 0}</div>
                <div className="stat-label-header">Workers</div>
              </div>
              <div className="stat-box">
                <div className="stat-value-header">{clients.length}</div>
                <div className="stat-label-header">Clients</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-content">
        {activeView === 'dashboard' ? (
          <>
            {renderMonthlyTracker()}
            
            <div className="workers-grid">
              {workers?.length > 0 ? (
                workers.map(renderWorkerCard)
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">👥</div>
                  <h3>No Workers Available</h3>
                  <p>Add workers to start allocating time slots</p>
                </div>
              )}
            </div>
            
            {renderDailySummary()}
          </>
        ) : activeView === 'summary' ? (
          <>
            {renderMonthlyTracker()}
            {renderDailySummary()}
          </>
        ) : (
          <div className="analytics-view">
            <h2>📊 Analytics Dashboard - {format(selectedDate, 'MMMM yyyy')}</h2>
            {renderMonthlyTracker()}
            <div className="analytics-grid">
              <div className="analytics-card">
                <h4>📈 Productivity Overview</h4>
                <div className="analytics-metrics">
                  <div className="metric">
                    <span className="metric-label">Total Hours:</span>
                    <span className="metric-value">{monthlyStats.totalHours}h</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Working Days:</span>
                    <span className="metric-value">{monthlyStats.workingDays}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Avg Daily Hours:</span>
                    <span className="metric-value">
                      {(monthlyStats.workingDays > 0 ? 
                        (parseFloat(monthlyStats.totalHours) / monthlyStats.workingDays).toFixed(2) : 0)}h
                    </span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Utilization Rate:</span>
                    <span className="metric-value">{monthlyStats.utilizationRate}</span>
                  </div>
                </div>
              </div>
              <div className="analytics-card">
                <h4>📅 Attendance & Leaves</h4>
                <div className="analytics-metrics">
                  <div className="metric">
                    <span className="metric-label">Leaves Taken:</span>
                    <span className="metric-value">{monthlyStats.leavesTaken}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Working Rate:</span>
                    <span className="metric-value">
                      {monthlyStats.workingDays > 0 ? 
                        ((monthlyStats.workingDays / (new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate())) * 100).toFixed(1) 
                        : 0}%
                    </span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Available Workers:</span>
                    <span className="metric-value">{workers?.length || 0}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Active Today:</span>
                    <span className="metric-value">
                      {workers?.filter(w => Object.values(allocations[w.id] || {}).length > 0).length || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Stats */}
      <footer className="dashboard-footer">
        <div className="footer-stats">
          <div className="footer-stat">
            <span className="footer-label">Available Slots:</span>
            <span className="footer-value">
              {generateTimeSlots.filter(s => !s.isLunchBreak).length * (workers?.length || 0)}
            </span>
          </div>
          <div className="footer-stat">
            <span className="footer-label">Lunch Break:</span>
            <span className="footer-value">12:00 PM - 2:00 PM</span>
          </div>
          <div className="footer-stat">
            <span className="footer-label">Working Hours:</span>
            <span className="footer-value">5:00 AM - 9:00 PM</span>
          </div>
          <div className="footer-stat">
            <span className="footer-label">Active Allocations:</span>
            <span className="footer-value">
              {Object.values(allocations).reduce((total, workerAllocs) => 
                total + Object.values(workerAllocs).length, 0)}
            </span>
          </div>
        </div>
        <div className="footer-legend">
          <span className="legend-item"><span className="legend-dot available"></span> Available</span>
          <span className="legend-item"><span className="legend-dot allocated"></span> Allocated</span>
          <span className="legend-item"><span className="legend-dot in-progress"></span> In Progress</span>
          <span className="legend-item"><span className="legend-dot completed"></span> Completed</span>
          <span className="legend-item"><span className="legend-dot leave"></span> Leave</span>
          <span className="legend-item"><span className="legend-dot sick-leave"></span> Sick Leave</span>
          <span className="legend-item"><span className="legend-dot holiday"></span> Holiday</span>
          <span className="legend-item"><span className="legend-dot client-not-available"></span> Client Not Available</span>
          <span className="legend-item"><span className="legend-dot disabled"></span> Disabled (Booked Range)</span>
        </div>
      </footer>

      {/* Allocation Modal */}
      {renderAllocationModal()}
    </div>
  );
};

export default SlotBook;