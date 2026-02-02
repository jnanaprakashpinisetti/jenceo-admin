import React, { useState, useEffect, useRef } from "react";
import firebaseDB from "../../../firebase";
import { WORKER_PATHS, CLIENT_PATHS } from "../../../utils/dataPaths";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, parseISO, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { useAuth } from "../../../context/AuthContext";

const SlotBook = ({ workers, onAllocationUpdate }) => {
  const { user } = useAuth();
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
  const [slotType, setSlotType] = useState("working");
  const [alertModal, setAlertModal] = useState({ show: false, message: "", title: "", onConfirm: null });
  const [summaryStartDate, setSummaryStartDate] = useState(subDays(new Date(), 7));
  const [summaryEndDate, setSummaryEndDate] = useState(new Date());
  const [viewMode, setViewMode] = useState(false);
  const [modalProcessing, setModalProcessing] = useState(false);
  
  const searchInputRef = useRef(null);
  const calendarRef = useRef(null);
  const endTimeRef = useRef(null);
  const modalLockRef = useRef(false);

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
    if (!time24) return "";
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

  // FIX 1: Safe modal close function
  const closeAllocationModal = () => {
    if (modalProcessing) return;
    
    modalLockRef.current = false;
    setShowAllocationModal(false);
    setSelectedSlot(null);
    setActiveWorker(null);
    setSelectedClientId(null);
    setEditingEndTime(false);
    setTempEndTime("");
    setTempRemarks("");
    setViewMode(false);
    setSlotStatus("allocating");
    setSlotType("working");
    setSearchQuery("");
    setModalProcessing(false);
  };

  // Show alert modal
  const showAlert = (title, message, onConfirm = null) => {
    setAlertModal({ show: true, title, message, onConfirm });
  };

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

  // Filter clients based on search query (only for allocation modal)
  useEffect(() => {
    if (!searchQuery.trim() || !showAllocationModal) {
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
  }, [searchQuery, clients, showAllocationModal]);

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
              email: value.email || "N/A",
              // Store mobile number specifically
              mobile: value.mobile || value.phone || value.contactNumber || "N/A"
            }));
            allClients = [...allClients, ...departmentClients];
          }
        } catch (error) {
          console.error(`Error fetching clients from ${department}:`, error);
        }
      }
      
      setClients(allClients);
    } catch (error) {
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  // Load allocations when date changes (with modal lock protection)
  useEffect(() => {
    if (modalLockRef.current) return;
    
    if (workers && workers.length > 0) {
      loadAllocationsForDate(selectedDate);
    }
  }, [selectedDate, workers]);

  // Load allocations for specific date
  const loadAllocationsForDate = async (date) => {
    if (!workers || workers.length === 0) return;
    
    const dateKey = getDateKey(date);
    
    const newAllocations = {};
    
    try {
      // Clear previous allocations for this date
      workers.forEach(worker => {
        if (!newAllocations[worker.id]) {
          newAllocations[worker.id] = {};
        }
      });
      
      // Load from each worker's schedule for this specific date
      for (const worker of workers) {
        if (worker.schedule && worker.schedule[dateKey]) {
          // Only load allocations for the selected date
          Object.entries(worker.schedule[dateKey]).forEach(([slotId, allocation]) => {
            if (allocation && allocation.date === dateKey) {
              newAllocations[worker.id][slotId] = allocation;
            }
          });
        }
      }
      
      setAllocations(newAllocations);
      
    } catch (error) {
      // Still set empty allocations to clear previous date's data
      workers.forEach(worker => {
        if (!newAllocations[worker.id]) {
          newAllocations[worker.id] = {};
        }
      });
      setAllocations(newAllocations);
    }
    
    // Calculate summary after loading allocations
    setTimeout(() => {
      calculateDailySummary();
    }, 100);
  };

  // Calculate monthly statistics
  useEffect(() => {
    calculateMonthlyStats();
  }, [workers, selectedDate]);

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
            if (allocation && allocation.status === "completed" && allocation.duration) {
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
      totalHours: parseFloat(totalHours.toFixed(2)),
      leavesTaken,
      utilizationRate: `${utilizationRate}%`
    });
  };

  // Calculate daily summary
  const calculateDailySummary = () => {
    if (!workers || workers.length === 0) {
      setDailySummary([]);
      return;
    }

    const summaryMap = {};
    
    // Get all dates in range
    const datesInRange = eachDayOfInterval({ start: summaryStartDate, end: summaryEndDate });
    
    datesInRange.forEach(date => {
      const dateKey = getDateKey(date);
      
      workers.forEach(worker => {
        const workerSchedule = worker.schedule || {};
        const daySchedule = workerSchedule[dateKey] || {};
        
        let dayHours = 0;
        let clientNames = [];
        let remarksList = [];
        
        Object.values(daySchedule).forEach(allocation => {
          if (allocation && allocation.status === "completed" && allocation.duration) {
            const duration = parseFloat(allocation.duration);
            if (!isNaN(duration)) {
              dayHours += duration;
              if (allocation.clientName && allocation.clientName !== "No Client") {
                clientNames.push(allocation.clientName);
              }
              if (allocation.remarks) {
                remarksList.push(allocation.remarks);
              }
            }
          }
        });
        
        if (dayHours > 0) {
          const workerKey = `${worker.id}-${dateKey}`;
          summaryMap[workerKey] = {
            workerId: worker.id,
            workerName: worker.name,
            department: worker.department,
            totalHours: parseFloat(dayHours.toFixed(2)),
            totalClients: [...new Set(clientNames.filter(name => name))].length,
            clientNames: [...new Set(clientNames.filter(name => name))],
            date: dateKey,
            formattedDate: formatDateForSummary(date),
            remarks: remarksList.length > 0 ? remarksList.join(", ") : "No remarks"
          };
        }
      });
    });
    
    setDailySummary(Object.values(summaryMap));
  };

  // Calculate unique clients served today
  const calculateTodayClients = () => {
    const dateKey = getDateKey(selectedDate);
    const clientSet = new Set();
    
    Object.values(allocations).forEach(workerAllocations => {
      Object.values(workerAllocations).forEach(allocation => {
        if (allocation && allocation.date === dateKey && allocation.clientName && allocation.clientName !== "No Client") {
          clientSet.add(allocation.clientName);
        }
      });
    });
    
    return clientSet.size;
  };

  // Calculate average hours per worker
  const calculateAverageHours = () => {
    const dateKey = getDateKey(selectedDate);
    let totalHours = 0;
    let workersWithHours = 0;
    
    Object.entries(allocations).forEach(([workerId, workerAllocations]) => {
      let workerTotal = 0;
      Object.values(workerAllocations).forEach(allocation => {
        if (allocation && allocation.date === dateKey && allocation.status === "completed" && allocation.duration) {
          workerTotal += parseFloat(allocation.duration) || 0;
        }
      });
      if (workerTotal > 0) {
        totalHours += workerTotal;
        workersWithHours++;
      }
    });
    
    return workersWithHours > 0 ? (totalHours / workersWithHours).toFixed(2) : "0.00";
  };

  // Calculate productivity score (percentage of available slots used)
  const calculateProductivityScore = () => {
    const dateKey = getDateKey(selectedDate);
    let usedSlots = 0;
    let totalAvailableSlots = 0;
    
    workers?.forEach(worker => {
      const workerAllocations = allocations[worker.id] || {};
      const slotsUsed = Object.values(workerAllocations).filter(a => 
        a && a.date === dateKey && a.status === "completed"
      ).length;
      usedSlots += slotsUsed;
      totalAvailableSlots += generateTimeSlots.filter(s => !s.isLunchBreak).length;
    });
    
    const score = totalAvailableSlots > 0 ? (usedSlots / totalAvailableSlots * 100).toFixed(1) : 0;
    return `${score}%`;
  };

  // Check if slot should be disabled
  const isSlotDisabled = (workerId, slot) => {
    const workerAllocations = allocations[workerId] || {};
    const dateKey = getDateKey(selectedDate);
    
    // Check if this slot is already allocated for today
    if (workerAllocations[slot.id]) {
      return true;
    }
    
    // Check for continuous bookings
    for (const [slotId, allocation] of Object.entries(workerAllocations)) {
      if (allocation && allocation.slotType === "continuous" && allocation.date === dateKey) {
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

  // Handle slot click
  const handleSlotClick = (workerId, slot) => {
    if (slot.isLunchBreak) return;
    
    const currentAllocation = allocations[workerId]?.[slot.id];
    const worker = workers?.find(w => w.id === workerId);
    setActiveWorker(worker);
    
    if (currentAllocation) {
      // Existing allocation - open in view/edit mode
      setTempEndTime(currentAllocation.endTime || "");
      setTempRemarks(currentAllocation.remarks || "");
      setTempStatus(currentAllocation.status || "completed");
      
      // Set view mode based on user role and allocation status
      const isAdmin = user?.role === "admin";
      const isCompleted = currentAllocation.status === "completed";
      setViewMode(!isAdmin && isCompleted); // Non-admins can only view completed allocations
      
      setSlotStatus(currentAllocation.status || "completed");
      setSelectedSlot({ workerId, slot, allocation: currentAllocation });
      
      modalLockRef.current = true;
      setShowAllocationModal(true);
    } else {
      // New slot allocation
      setViewMode(false);
      setSlotStatus("allocating");
      setSelectedSlot({ workerId, slot });
      setSearchQuery("");
      setSlotType("working");
      setTempEndTime("");
      setTempRemarks("");
      setTempStatus("completed");
      setSelectedClientId(null);
      
      modalLockRef.current = true;
      setShowAllocationModal(true);
      
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    }
  };

  // Handle slot type selection
  const handleSlotTypeSelect = async (type) => {
    if (!selectedSlot || !selectedSlot.workerId || !selectedSlot.slot) return;
    
    setModalProcessing(true);
    const { workerId, slot } = selectedSlot;
    const dateKey = getDateKey(selectedDate);
    const worker = workers?.find(w => w.id === workerId);
    
    let newAllocation = {
      workerId: workerId,
      workerName: worker?.name || "Unknown Worker",
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
      remarks: type !== "working" ? `Marked as ${type}` : "",
      createdBy: user?.name || user?.username || "System",
      createdById: user?.dbId || "system",
      createdAt: new Date().toISOString(),
      lastUpdatedBy: user?.name || user?.username || "System",
      lastUpdatedById: user?.dbId || "system",
      lastUpdatedAt: new Date().toISOString()
    };

    // For non-working slots, mark as completed immediately
    if (type !== "working") {
      newAllocation = {
        ...newAllocation,
        status: "completed",
        endTime: slot.time24,
        duration: 0,
        completedAt: new Date().toISOString()
      };
    }

    try {
      // Update local state first
      setAllocations(prev => ({
        ...prev,
        [workerId]: {
          ...prev[workerId],
          [slot.id]: newAllocation
        }
      }));

      // Save to Firebase
      await saveAllocationToWorker(workerId, newAllocation);
      
      
      // Update slot status
      if (type === "working") {
        setSlotStatus("allocated");
      } else {
        setSlotStatus("completed");
        setSelectedSlot({ workerId, slot, allocation: newAllocation });
      }
      
      if (onAllocationUpdate) {
        onAllocationUpdate(newAllocation);
      }
      
    } catch (error) {
      console.error("❌ Error saving slot:", error);
      showAlert("Save Failed", "Failed to save slot. Please try again.");
    } finally {
      setModalProcessing(false);
    }
  };

  // Handle client selection
  const handleClientSelect = async (client) => {
    if (!selectedSlot || !selectedSlot.workerId || !selectedSlot.slot) return;
    
    setModalProcessing(true);
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
      clientKey: client.clientKey,
      clientPath: client.clientPath,
      clientId: client.clientId,
      clientName: client.name,
      clientLocation: client.location,
      clientPhone: client.mobile || client.phone || "N/A",
      clientEmail: client.email,
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
      remarks: "",
      createdBy: user?.name || user?.username || "System",
      createdById: user?.dbId || "system",
      createdAt: new Date().toISOString(),
      lastUpdatedBy: user?.name || user?.username || "System",
      lastUpdatedById: user?.dbId || "system",
      lastUpdatedAt: new Date().toISOString()
    };

    try {
      // Update local state
      setAllocations(prev => ({
        ...prev,
        [workerId]: {
          ...prev[workerId],
          [slot.id]: newAllocation
        }
      }));

      // Save to Firebase
      await saveAllocationToWorker(workerId, newAllocation);
      
      // Save to client if not walk-in
      if (!client.clientKey.startsWith("WALKIN-")) {
        await saveAllocationToClient(client, newAllocation);
      }
      
      
      // Update UI state - DON'T close modal!
      if (currentTime >= slotTime) {
        setSlotStatus("in-progress");
        setSelectedSlot({ workerId, slot, allocation: newAllocation });
        setEditingEndTime(true);
      } else {
        setSlotStatus("allocated");
        // Reset search but keep modal open
        setSearchQuery("");
      }
      
      if (onAllocationUpdate) {
        onAllocationUpdate(newAllocation);
      }
      
    } catch (error) {
      console.error("❌ Error saving allocation:", error);
      showAlert("Save Failed", "Failed to save allocation. Please try again.");
    } finally {
      setModalProcessing(false);
    }
  };

  // Save allocation to Worker's Firebase path
  const saveAllocationToWorker = async (workerId, allocation) => {
    try {
      const worker = workers?.find(w => w.id === workerId);
      if (!worker) {
        console.error("Worker not found:", workerId);
        throw new Error("Worker not found");
      }

      const workerPath = WORKER_PATHS[worker.department] || WORKER_PATHS["Others"];
      const dateKey = allocation.date;
      const slotId = allocation.slotId;

      // Get current worker data
      const snapshot = await firebaseDB.child(`${workerPath}/${workerId}`).once('value');
      const workerData = snapshot.val() || {};

      // Initialize schedule
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

      return true;
    } catch (error) {
      throw error;
    }
  };

  // Save allocation to Client's Firebase path
  const saveAllocationToClient = async (client, allocation) => {
    try {
      const clientRef = firebaseDB.child(`${client.clientPath}/${client.clientKey}`);
      const snapshot = await clientRef.once("value");

      let clientData = snapshot.val();

      if (!clientData) {
        clientData = {
          clientId: client.clientId,
          name: client.name,
          phone: client.phone,
          mobile: client.mobile,
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

      return true;
    } catch (error) {
      throw error;
    }
  };

  // Handle end time update
  const handleEndTimeUpdate = async () => {
    if (!selectedSlot || !tempEndTime) return;
    
    setModalProcessing(true);
    const { workerId, slot } = selectedSlot;
    const allocation = allocations[workerId]?.[slot.id];
    
    if (!allocation) return;

    // Calculate duration
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
      showAlert("Invalid Time", "End time must be after start time");
      setModalProcessing(false);
      return;
    }
    
    const duration = durationMinutes / 60;

    const updatedAllocation = {
      ...allocation,
      endTime: tempEndTime,
      endTime12: convertTo12Hour(tempEndTime),
      status: tempStatus,
      duration: parseFloat(duration.toFixed(2)),
      completedAt: new Date().toISOString(),
      remarks: tempRemarks,
      lastUpdatedBy: user?.name || user?.username || "System",
      lastUpdatedById: user?.dbId || "system",
      lastUpdatedAt: new Date().toISOString()
    };

    try {
      // Update local state
      setAllocations(prev => ({
        ...prev,
        [workerId]: {
          ...prev[workerId],
          [slot.id]: updatedAllocation
        }
      }));

      // Find the client
      const client = clients?.find(c => c.clientKey === allocation.clientKey);
      
      // Update worker schedule
      await saveAllocationToWorker(workerId, updatedAllocation);
      
      // Update client schedule if client exists and not walk-in
      if (client && allocation.clientKey && !allocation.clientKey.startsWith("WALKIN-")) {
        await saveAllocationToClient(client, updatedAllocation);
      }
      
      
      // Update UI state
      setSlotStatus("completed");
      setSelectedSlot({ workerId, slot, allocation: updatedAllocation });
      setEditingEndTime(false);
      setTempEndTime("");
      setTempRemarks("");
      
      if (onAllocationUpdate) {
        onAllocationUpdate(updatedAllocation);
      }
      
    } catch (error) {
      console.error("❌ Error completing allocation:", error);
      showAlert("Save Failed", "Failed to save completion. Please try again.");
    } finally {
      setModalProcessing(false);
    }
  };

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!selectedSlot) return;
    
    setModalProcessing(true);
    const { workerId, slot } = selectedSlot;
    const allocation = allocations[workerId]?.[slot.id];
    
    if (!allocation) return;

    const updatedAllocation = {
      ...allocation,
      status: tempStatus,
      remarks: tempRemarks,
      completedAt: new Date().toISOString(),
      lastUpdatedBy: user?.name || user?.username || "System",
      lastUpdatedById: user?.dbId || "system",
      lastUpdatedAt: new Date().toISOString()
    };

    try {
      // Update local state
      setAllocations(prev => ({
        ...prev,
        [workerId]: {
          ...prev[workerId],
          [slot.id]: updatedAllocation
        }
      }));

      // Update worker schedule
      await saveAllocationToWorker(workerId, updatedAllocation);
      
      
      // Update UI
      setSlotStatus("completed");
      setSelectedSlot({ workerId, slot, allocation: updatedAllocation });
      setTempRemarks("");
      
      if (onAllocationUpdate) {
        onAllocationUpdate(updatedAllocation);
      }
      
    } catch (error) {
      console.error("❌ Error updating status:", error);
      showAlert("Update Failed", "Failed to update status. Please try again.");
    } finally {
      setModalProcessing(false);
    }
  };

  // Get slot status and styling
  const getSlotStatus = (workerId, slot) => {
    const allocation = allocations[workerId]?.[slot.id];
    const dateKey = getDateKey(selectedDate);
    
    if (allocation && allocation.date !== dateKey) {
      return {
        status: "available",
        className: "slot-available",
        tooltip: "Available - Click to allocate"
      };
    }
    
    if (slot.isLunchBreak) {
      return {
        status: "lunch-break",
        className: "slot-lunch-break",
        tooltip: "Lunch Break (12 PM - 2 PM)"
      };
    }
    
    if (!allocation || allocation.date !== dateKey) {
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
        tooltip: `${allocation.slotType.replace(/-/g, ' ').toUpperCase()}${allocation.remarks ? `\nRemarks: ${allocation.remarks}` : ''}\nCreated by: ${allocation.createdBy || 'System'}\nAt: ${allocation.createdAt ? new Date(allocation.createdAt).toLocaleString() : 'N/A'}`
      };
    }
    
    switch (allocation.status) {
      case "allocated":
        return {
          status: "allocated",
          className: "slot-allocated",
          tooltip: `Allocated to ${allocation.clientName || 'No client'}\nStart: ${allocation.startTime12}\nMobile: ${allocation.clientPhone || 'N/A'}\nCreated by: ${allocation.createdBy || 'System'}\nAt: ${allocation.createdAt ? new Date(allocation.createdAt).toLocaleString() : 'N/A'}`
        };
      case "in-progress":
        return {
          status: "in-progress",
          className: "slot-in-progress",
          tooltip: `In Progress: ${allocation.clientName || 'No client'}\nStart: ${allocation.startTime12}\nMobile: ${allocation.clientPhone || 'N/A'}\nCreated by: ${allocation.createdBy || 'System'}\nAt: ${allocation.createdAt ? new Date(allocation.createdAt).toLocaleString() : 'N/A'}`
        };
      case "completed":
        return {
          status: "completed",
          className: "slot-completed",
          tooltip: `Completed: ${allocation.clientName || 'No client'}\nDuration: ${allocation.duration} hours\nMobile: ${allocation.clientPhone || 'N/A'}${allocation.remarks ? `\nRemarks: ${allocation.remarks}` : ''}\nCreated by: ${allocation.createdBy || 'System'}\nAt: ${allocation.createdAt ? new Date(allocation.createdAt).toLocaleString() : 'N/A'}\nLast updated by: ${allocation.lastUpdatedBy || 'System'}\nAt: ${allocation.lastUpdatedAt ? new Date(allocation.lastUpdatedAt).toLocaleString() : 'N/A'}`
        };
      case "not-completed":
        return {
          status: "not-completed",
          className: "slot-not-completed",
          tooltip: `Not Completed: ${allocation.clientName || 'No client'}\nMobile: ${allocation.clientPhone || 'N/A'}${allocation.remarks ? `\nRemarks: ${allocation.remarks}` : ''}\nCreated by: ${allocation.createdBy || 'System'}\nAt: ${allocation.createdAt ? new Date(allocation.createdAt).toLocaleString() : 'N/A'}`
        };
      default:
        return {
          status: "available",
          className: "slot-available",
          tooltip: "Available"
        };
    }
  };

  // Calculate worker's total hours for the day
  const calculateTotalHours = (workerId) => {
    const workerAllocations = allocations[workerId] || {};
    const dateKey = getDateKey(selectedDate);
    let totalHours = 0;
    
    Object.values(workerAllocations).forEach(allocation => {
      if (allocation && allocation.date === dateKey && allocation.status === "completed" && allocation.duration) {
        const duration = parseFloat(allocation.duration);
        if (!isNaN(duration)) {
          totalHours += duration;
        }
      }
    });
    
    return totalHours.toFixed(2);
  };

  // Calculate total working hours for the day
  const calculateTotalWorkingHours = () => {
    let total = 0;
    const dateKey = getDateKey(selectedDate);
    
    (workers || []).forEach(worker => {
      const workerAllocations = allocations[worker.id] || {};
      Object.values(workerAllocations).forEach(allocation => {
        if (allocation && allocation.date === dateKey && allocation.status === "completed" && allocation.duration) {
          const duration = parseFloat(allocation.duration);
          if (!isNaN(duration)) {
            total += duration;
          }
        }
      });
    });
    
    return total.toFixed(2);
  };

  // Clear slot allocation
  const handleClearSlot = async (workerId, slotId) => {
    showAlert(
      "Confirm Clear",
      "Are you sure you want to clear this allocation?",
      () => proceedWithClearSlot(workerId, slotId)
    );
  };

  const proceedWithClearSlot = async (workerId, slotId) => {
    setModalProcessing(true);
    const allocation = allocations[workerId]?.[slotId];
    if (!allocation) return;

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

      // Remove from client schedule if client exists
      const client = clients?.find(c => c.clientKey === allocation.clientKey);
      if (client && client.clientPath && allocation.clientKey && !allocation.clientKey.startsWith("WALKIN-")) {
        const snapshot = await firebaseDB.child(`${client.clientPath}/${client.clientKey}`).once('value');
        const clientData = snapshot.val() || {};
        
        if (clientData.schedule?.[allocation.date]?.[slotId]) {
          const updatedClientSchedule = { ...clientData.schedule };
          delete updatedClientSchedule[allocation.date][slotId];
          
          if (Object.keys(updatedClientSchedule[allocation.date]).length === 0) {
            delete updatedClientSchedule[allocation.date];
          }
          
          await firebaseDB.child(`${client.clientPath}/${client.clientKey}`).update({
            schedule: updatedClientSchedule,
            lastUpdated: new Date().toISOString()
          });
        }
      }

      // Update local state
      setAllocations(prev => {
        const updated = { ...prev };
        if (updated[workerId]) {
          delete updated[workerId][slotId];
        }
        return updated;
      });

      closeAllocationModal();
      showAlert("Success", "Slot cleared successfully");
      
    } catch (error) {
      console.error("Error clearing slot:", error);
      showAlert("Error", "Failed to clear slot. Please try again.");
    } finally {
      setModalProcessing(false);
    }
  };

  // Generate time options for end time dropdown
  const generateEndTimeOptions = (startTime) => {
    const options = [];
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const startTotalMinutes = startHour * 60 + startMinute;
    
    // Generate times up to 21:00 (9 PM)
    for (let hour = startHour; hour <= 21; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
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
        
        if (hour === 21 && minute === 0) break;
      }
    }
    
    return options;
  };

  // Render alert modal
  const renderAlertModal = () => {
    if (!alertModal.show) return null;

    const handleConfirm = () => {
      if (alertModal.onConfirm) {
        alertModal.onConfirm();
      }
      setAlertModal({ show: false, message: "", title: "", onConfirm: null });
    };

    const handleCancel = () => {
      setAlertModal({ show: false, message: "", title: "", onConfirm: null });
    };

    return (
      <div className="modal-overlay alert-overlay">
        <div className="modal-container alert-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{alertModal.title}</h3>
            <button className="modal-close" onClick={handleCancel}>×</button>
          </div>
          
          <div className="modal-body">
            <div className="alert-message">
              <p>{alertModal.message}</p>
            </div>
          </div>
          
          <div className="modal-footer">
            {alertModal.onConfirm ? (
              <>
                <button className="btn btn-confirm" onClick={handleConfirm}>Confirm</button>
                <button className="btn btn-cancel" onClick={handleCancel}>Cancel</button>
              </>
            ) : (
              <button className="btn btn-close" onClick={handleCancel}>OK</button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render allocation modal
  const renderAllocationModal = () => {
    if (!showAllocationModal || !selectedSlot) return null;

    const { workerId, slot } = selectedSlot;
    const worker = workers?.find(w => w.id === workerId);
    const allocation = allocations[workerId]?.[slot.id];
    const endTimeOptions = allocation ? generateEndTimeOptions(allocation.startTime) : [];
    const isAdmin = user?.role === "admin";
    const canEdit = isAdmin || !viewMode;

    return (
      <div className="modal-overlay">
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>
              {viewMode ? "👁️ View Slot Details" : 
               slotStatus === "allocating" ? "📅 Allocate Time Slot" :
               slotStatus === "allocated" ? "✅ Successfully Allocated" :
               "⚙️ Update Work Status"}
            </h3>
            <button className="modal-close" onClick={closeAllocationModal} disabled={modalProcessing}>
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

            {/* Audit trail */}
            {allocation && (
              <div className="audit-trail-section">
                <h4>📋 Audit Trail</h4>
                <div className="audit-grid">
                  <div className="audit-item">
                    <span className="audit-label">Created by: </span>
                    <span className="audit-value">{allocation.createdBy || "System"}</span>
                  </div>
                  <div className="audit-item">
                    <span className="audit-label">Created at: </span>
                    <span className="audit-value">
                      {allocation.createdAt ? new Date(allocation.createdAt).toLocaleString() : "N/A"}
                    </span>
                  </div>
                  <div className="audit-item">
                    <span className="audit-label">Last updated by: </span>
                    <span className="audit-value">{allocation.lastUpdatedBy || "System"}</span>
                  </div>
                  <div className="audit-item">
                    <span className="audit-label">Last updated at: </span>
                    <span className="audit-value">
                      {allocation.lastUpdatedAt ? new Date(allocation.lastUpdatedAt).toLocaleString() : "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {slotStatus === "allocating" && !allocation && !viewMode && (
              <div className="slot-type-section">
                <h4>📋 Select Slot Type</h4>
                <div className="slot-type-buttons">
                  <button className="slot-btn slot-btn-working" onClick={() => setSlotType("working")}>
                    🏢 Working
                  </button>
                  <button className="slot-btn slot-btn-leave" onClick={() => handleSlotTypeSelect("leave")}>
                    🏖️ Leave
                  </button>
                  <button className="slot-btn slot-btn-sick" onClick={() => handleSlotTypeSelect("sick-leave")}>
                    🤒 Sick Leave
                  </button>
                  <button className="slot-btn slot-btn-holiday" onClick={() => handleSlotTypeSelect("holiday")}>
                    🎉 Holiday
                  </button>
                  <button className="slot-btn slot-btn-client-na" onClick={() => handleSlotTypeSelect("client-not-available")}>
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
                        disabled={modalProcessing}
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
                                  onClick={() => !modalProcessing && handleClientSelect(client)}
                                >
                                  <div className="client-header">
                                    <div className="client-id">ID: {client.clientId}</div>
                                    <div className="client-phone">📱 {client.mobile || client.phone || "N/A"}</div>
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
                              className="slot-btn slot-btn-walkin"
                              onClick={() => {
                                const dummyClient = {
                                  clientKey: "WALKIN-" + Date.now(),
                                  clientPath: "ClientData/Others/Running",
                                  clientId: "WALKIN-" + Date.now(),
                                  name: "Walk-in Client",
                                  location: "On-site",
                                  phone: "N/A",
                                  mobile: "N/A",
                                  email: "N/A",
                                  department: worker?.department || "Others"
                                };
                                handleClientSelect(dummyClient);
                              }}
                              disabled={modalProcessing}
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

            {slotStatus === "allocated" && allocation && !viewMode && (
              <div className="success-message">
                <div className="success-icon">✅</div>
                <h4>Allocation Successful!</h4>
                <div className="success-details">
                  <p><strong>Worker:</strong> {allocation.workerName}</p>
                  <p><strong>Client:</strong> {allocation.clientName || "No client"}</p>
                  <p><strong>Mobile:</strong> {allocation.clientPhone || "N/A"}</p>
                  <p><strong>Time:</strong> {allocation.startTime12}</p>
                  <p><strong>Status:</strong> Scheduled</p>
                </div>
                <div className="success-actions">
                  <button
                    className="slot-btn slot-btn-close"
                    onClick={closeAllocationModal}
                    disabled={modalProcessing}
                  >
                    Close
                  </button>
                  <button
                    className="slot-btn slot-btn-primary"
                    onClick={() => {
                      setSlotStatus("in-progress");
                      setEditingEndTime(true);
                    }}
                    disabled={modalProcessing}
                  >
                    Set End Time
                  </button>
                </div>
              </div>
            )}

            {(slotStatus === "in-progress" || slotStatus === "completed" || viewMode) && allocation && (
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
                      <span className="label">Mobile:</span>
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
                      {canEdit ? (
                        <select 
                          className="status-select"
                          value={tempStatus}
                          onChange={(e) => setTempStatus(e.target.value)}
                          disabled={viewMode || modalProcessing}
                        >
                          <option value="completed">✅ Completed</option>
                          <option value="not-completed">❌ Not Completed</option>
                          <option value="leave">🏖️ Leave</option>
                          <option value="sick-leave">🤒 Sick Leave</option>
                          <option value="holiday">🎉 Holiday</option>
                          <option value="client-not-available">👥 Client Not Available</option>
                        </select>
                      ) : (
                        <span className="value">
                          {allocation.status === "completed" ? "✅ Completed" :
                           allocation.status === "not-completed" ? "❌ Not Completed" :
                           allocation.status === "leave" ? "🏖️ Leave" :
                           allocation.status === "sick-leave" ? "🤒 Sick Leave" :
                           allocation.status === "holiday" ? "🎉 Holiday" :
                           allocation.status === "client-not-available" ? "👥 Client Not Available" :
                           allocation.status}
                        </span>
                      )}
                    </div>
                    
                    <div className="info-item full-width">
                      <span className="label">End Time:</span>
                      {editingEndTime && canEdit ? (
                        <div className="time-input-group">
                          <select
                            ref={endTimeRef}
                            value={tempEndTime}
                            onChange={(e) => setTempEndTime(e.target.value)}
                            className="time-select"
                            disabled={viewMode || modalProcessing}
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
                              className="slot-btn slot-btn-primary"
                              onClick={handleEndTimeUpdate}
                              disabled={!tempEndTime || modalProcessing}
                            >
                              ✅ Save
                            </button>
                            <button
                              className="slot-btn slot-btn-secondary"
                              onClick={() => setEditingEndTime(false)}
                              disabled={modalProcessing}
                            >
                              ❌ Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="end-time-actions">
                          <span className="value">
                            {allocation.endTime12 || convertTo12Hour(allocation.endTime) || "Not set"}
                          </span>
                          {canEdit && !viewMode && (
                            <button
                              className="slot-btn slot-btn-primary"
                              onClick={() => {
                                setEditingEndTime(true);
                                setTimeout(() => {
                                  if (endTimeRef.current) {
                                    endTimeRef.current.focus();
                                  }
                                }, 100);
                              }}
                              disabled={modalProcessing}
                            >
                              ⏰ {allocation.endTime ? "Change End Time" : "Set End Time"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="info-item full-width">
                      <span className="label">Remarks:</span>
                      {canEdit ? (
                        <textarea
                          className="remarks-input"
                          value={tempRemarks}
                          onChange={(e) => setTempRemarks(e.target.value)}
                          placeholder="Add remarks here..."
                          rows="3"
                          disabled={viewMode || modalProcessing}
                        />
                      ) : (
                        <div className="remarks-display">
                          {allocation.remarks || "No remarks"}
                        </div>
                      )}
                    </div>
                    
                    {allocation.status === "completed" && (
                      <>
                        <div className="info-item">
                          <span className="label">End Time:</span>
                          <span className="value">
                            {allocation.endTime12 || convertTo12Hour(allocation.endTime) || "N/A"}
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="label">Duration:</span>
                          <span className="value highlight">
                            {allocation.duration || 0} hours
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="label">Entered at :</span>
                          <span className="value">
                            {allocation.completedAt ? new Date(allocation.completedAt).toLocaleTimeString() : "N/A"}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="action-buttons">
                  {!viewMode && canEdit && (
                    <>
                      <button
                        className="slot-btn slot-btn-primary"
                        onClick={handleStatusUpdate}
                        disabled={modalProcessing}
                      >
                        💾 Save Status & Remarks
                      </button>
                      <button
                        className="slot-btn slot-btn-danger"
                        onClick={() => handleClearSlot(workerId, slot.id)}
                        disabled={modalProcessing}
                      >
                        🗑️ Clear Allocation
                      </button>
                    </>
                  )}
                  
                  {viewMode && isAdmin && (
                    <button
                      className="slot-btn slot-btn-primary"
                      onClick={() => {
                        setViewMode(false);
                        setEditingEndTime(false);
                      }}
                      disabled={modalProcessing}
                    >
                      ✏️ Edit Allocation
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            <button
              className="slot-btn slot-btn-secondary"
              onClick={closeAllocationModal}
              disabled={modalProcessing}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render worker card
  const renderWorkerCard = (worker) => {
    const totalHours = calculateTotalHours(worker.id);
    const timeSlots = generateTimeSlots;
    const completedSlots = Object.values(allocations[worker.id] || {}).filter(a => 
      a && a.date === getDateKey(selectedDate) && a.status === "completed"
    ).length;
    const inProgressSlots = Object.values(allocations[worker.id] || {}).filter(a => 
      a && a.date === getDateKey(selectedDate) && a.status === "in-progress"
    ).length;
    
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
              const dateKey = getDateKey(selectedDate);
              const isDisabled = isSlotDisabled(worker.id, slot) && (!allocation || allocation.date !== dateKey);
              
              return (
                <div key={slot.id} className="slot-wrapper">
                  <div
                    className={`slot ${slotStatus.className} ${allocation && allocation.date === dateKey ? 'allocated' : ''} ${slot.isLunchBreak ? 'lunch' : ''} ${isDisabled ? 'disabled' : ''}`}
                    onClick={() => !slot.isLunchBreak && handleSlotClick(worker.id, slot)}
                    title={isDisabled ? "Slot is within a booked time range" : slotStatus.tooltip}
                  >
                    {allocation && allocation.date === dateKey ? (
                      <div className="allocation-indicator">
                        <div className="client-indicator">
                          <p className="client-name-small">
                           <strong> {allocation.clientName?.substring(0, 10) || (allocation.slotType || "Booked")}</strong>
                          </p>
                          <p className="client-id-small">
                            {allocation.clientId?.substring(0, 8) || allocation.slotType?.substring(0, 8) || "NA"}
                          </p>
                          <p className="client-location-small">
                            {allocation.clientLocation|| "NA"}
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
                  a && a.date === getDateKey(selectedDate) && a.slotType && a.slotType !== "working"
                ).length}
              </span>
            </div>
          </div>
        </div>

        <div className="card-footer">
          <div className="footer-actions">
            <button 
              className="slot-btn slot-btn-secondary"
              onClick={() => {
                showAlert(
                  "Worker Details",
                  `Worker: ${worker.name}\nTotal Hours Today: ${totalHours}\nCompleted Jobs: ${completedSlots}\nDepartment: ${worker.department || "N/A"}`
                );
              }}
            >
              👁️ View Details
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render daily summary
  const renderDailySummary = () => {
    const handleDateRangeChange = (start, end) => {
      setSummaryStartDate(start);
      setSummaryEndDate(end);
      calculateDailySummary();
    };

    return (
      <div className="summary-card">
        <div className="summary-header">
          <h3>📊 Daily Summary</h3>
          <div className="date-range-selector">
            <div className="date-range-inputs">
              <div className="date-input-group">
                <label>From:</label>
                <input
                  type="date"
                  value={format(summaryStartDate, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    const newStart = new Date(e.target.value);
                    handleDateRangeChange(newStart, summaryEndDate);
                  }}
                  className="date-input"
                />
              </div>
              <div className="date-input-group">
                <label>To:</label>
                <input
                  type="date"
                  value={format(summaryEndDate, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    const newEnd = new Date(e.target.value);
                    handleDateRangeChange(summaryStartDate, newEnd);
                  }}
                  className="date-input"
                />
              </div>
              <div className="quick-range-buttons">
                <button className="slot-btn slot-btn-secondary" onClick={() => {
                  const today = new Date();
                  const weekAgo = subDays(today, 7);
                  handleDateRangeChange(weekAgo, today);
                }}>
                  Last 7 Days
                </button>
                <button className="slot-btn slot-btn-secondary" onClick={() => {
                  const today = new Date();
                  const monthStart = startOfMonth(today);
                  handleDateRangeChange(monthStart, today);
                }}>
                  This Month
                </button>
                <button className="slot-btn slot-btn-secondary" onClick={() => {
                  const today = new Date();
                  handleDateRangeChange(today, today);
                }}>
                  Today
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="loading-summary">Loading summary data...</div>
        ) : (
          <div className="summary-table-container">
            <table className="summary-table">
              <thead>
                <tr>
                  <th>📅 Date</th>
                  <th>🏢 Department</th>
                  <th>⏱️ Total Hours</th>
                  <th>👥 Clients</th>
                  <th>📝 Remarks</th>
                </tr>
              </thead>
              <tbody>
                {dailySummary.length > 0 ? (
                  dailySummary.map(summary => (
                    <tr key={`${summary.workerId}-${summary.date}`}>
                      <td className="date-cell">{summary.formattedDate}</td>
                      <td><span className="badge bg-secondary">{summary.department}</span></td>
                      <td className="hours-cell">{summary.totalHours}h</td>
                      <td className="clients-cell">
                        {summary.clientNames.length > 0 ? (
                          <div className="clients-list">
                            {summary.clientNames.map((name, index) => (
                                <span className="client-name">{name} ,</span>
                            ))}
                          </div>
                        ) : (
                          "No clients"
                        )}
                      </td>
                      <td className="remarks-cell">
                        {summary.remarks || "No remarks"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="no-data">📭 No work recorded for selected period</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="2" className="text-end"><strong>Total:</strong></td>
                  <td className="hours-cell"><strong>{dailySummary.reduce((sum, s) => sum + s.totalHours, 0).toFixed(2)}h</strong></td>
                  <td className="clients-cell"><strong>{dailySummary.reduce((sum, s) => sum + s.totalClients, 0)} clients</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    );
  };

  // Date picker
  const renderDatePicker = () => (
    <div className="date-picker-container">
      <button 
        className="slot-btn slot-btn-primary"
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
              loadAllocationsForDate(date);
            }}
            value={selectedDate}
            className="custom-calendar"
          />
          <div className="quick-dates">
            <button className="slot-btn slot-btn-secondary" onClick={() => {
              const today = new Date();
              setSelectedDate(today);
              loadAllocationsForDate(today);
            }}>
              Today
            </button>
            <button className="slot-btn slot-btn-secondary" onClick={() => {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              setSelectedDate(yesterday);
              loadAllocationsForDate(yesterday);
            }}>
              Yesterday
            </button>
            <button className="slot-btn slot-btn-secondary" onClick={() => {
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

  // Monthly tracker
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
    <div className="slot-book-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-top-row">
          <div className="header-brand">
            <h1 className="dashboard-title">
              <span className="title-icon">🗓️</span>
              Worker Allocation Dashboard
            </h1>
            <div className="user-info">
              <span className="user-role-badge">{user?.role || "Guest"}</span>
              <span className="user-name">Welcome, {user?.name || user?.username || "User"}</span>
            </div>
          </div>
          
          <div className="header-actions">
            <div className="controls">
              {renderDatePicker()}
              <div className="view-tabs">
                <button 
                  className={`slot-btn ${activeView === 'dashboard' ? 'slot-btn-primary' : 'slot-btn-secondary'}`}
                  onClick={() => setActiveView('dashboard')}
                >
                  📅 Dashboard
                </button>
                <button 
                  className={`slot-btn ${activeView === 'summary' ? 'slot-btn-primary' : 'slot-btn-secondary'}`}
                  onClick={() => setActiveView('summary')}
                >
                  📈 Summary
                </button>
                <button 
                  className={`slot-btn ${activeView === 'analytics' ? 'slot-btn-primary' : 'slot-btn-secondary'}`}
                  onClick={() => setActiveView('analytics')}
                >
                  📊 Analytics
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="header-bottom-row">
          <div className="header-stats">
            <div className="stat-box">
              <div className="stat-icon-header">⏱️</div>
              <div className="stat-content-header">
                <div className="stat-value-header">{calculateTotalWorkingHours()}</div>
                <div className="stat-label-header">Total Hours Today</div>
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-icon-header">👥</div>
              <div className="stat-content-header">
                <div className="stat-value-header">{calculateTodayClients()}</div>
                <div className="stat-label-header">Clients Today</div>
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-icon-header">📊</div>
              <div className="stat-content-header">
                <div className="stat-value-header">{calculateProductivityScore()}</div>
                <div className="stat-label-header">Productivity Score</div>
              </div>
            </div>
            
            <div className="stat-box">
              <div className="stat-icon-header">📅</div>
              <div className="stat-content-header">
                <div className="stat-value-header">{format(selectedDate, 'dd-MMM')}</div>
                <div className="stat-label-header">Selected Date</div>
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
                      {workers?.filter(w => Object.values(allocations[w.id] || {}).filter(a => 
                        a && a.date === getDateKey(selectedDate)).length > 0).length || 0}
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
                total + Object.values(workerAllocs).filter(a => 
                  a && a.date === getDateKey(selectedDate)).length, 0)}
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

      {/* Alert Modal */}
      {renderAlertModal()}
    </div>
  );
};

export default SlotBook;