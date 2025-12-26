import React, { useState, useEffect, useRef } from "react";
import firebaseDB from "../../../firebase";
import { WORKER_PATHS, CLIENT_PATHS } from "../../../utils/dataPaths";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, parseISO } from 'date-fns';

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
  const [selectedClientId, setSelectedClientId] = useState(null); // NEW: Track selected client
  
  const searchInputRef = useRef(null);
  const calendarRef = useRef(null);

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

  // Filter clients based on search query - FIXED
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

  // ✅ FIXED: Fetch clients from ALL departments
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

  // Initialize allocations from workers data
  useEffect(() => {
    const initialAllocations = {};
    const dateKey = getDateKey(selectedDate);
    
    (workers || []).forEach(worker => {
      const scheduleForDate = worker.schedule?.[dateKey] || {};
      const workerAllocations = {};
      
      Object.entries(scheduleForDate).forEach(([slotId, allocation]) => {
        workerAllocations[slotId] = allocation;
      });
      
      initialAllocations[worker.id] = workerAllocations;
    });
    
    setAllocations(initialAllocations);
    calculateDailySummary();
  }, [workers, selectedDate]);

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
              dayHours += parseFloat(allocation.duration);
              hasWork = true;
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
      totalHours: totalHours.toFixed(2),
      leavesTaken,
      utilizationRate: `${utilizationRate}%`
    });
  };

  // Calculate daily summary
  const calculateDailySummary = () => {
    const summary = [];
    const dateKey = getDateKey(selectedDate);
    
    (workers || []).forEach(worker => {
      const workerAllocations = allocations[worker.id] || {};
      let totalHours = 0;
      let clientNames = [];
      
      Object.values(workerAllocations).forEach(allocation => {
        if (allocation.status === "completed" && allocation.duration) {
          totalHours += allocation.duration;
          clientNames.push(allocation.clientName);
        }
      });
      
      if (totalHours > 0) {
        summary.push({
          workerId: worker.id,
          workerName: worker.name,
          department: worker.department,
          totalHours: totalHours.toFixed(2),
          clientNames: [...new Set(clientNames)],
          date: dateKey
        });
      }
    });
    
    setDailySummary(summary);
  };

  // Handle slot click - FIXED: Clear selectedClientId when opening modal
  const handleSlotClick = (workerId, slot) => {
    if (slot.isLunchBreak) return;
    
    const currentAllocation = allocations[workerId]?.[slot.id];
    const worker = workers?.find(w => w.id === workerId);
    setActiveWorker(worker);
    setSelectedClientId(null); // Clear previous selection
    
    if (currentAllocation?.status === "completed") {
      setSlotStatus("completed");
      setSelectedSlot({ workerId, slot, allocation: currentAllocation });
      setShowAllocationModal(true);
    } else if (currentAllocation?.status === "allocated" || currentAllocation?.status === "in-progress") {
      setSlotStatus("in-progress");
      setSelectedSlot({ workerId, slot, allocation: currentAllocation });
      setTempEndTime(currentAllocation.endTime || "");
      setShowAllocationModal(true);
    } else {
      setSlotStatus("allocating");
      setSelectedSlot({ workerId, slot });
      setSearchQuery("");
      setShowAllocationModal(true);
      
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    }
  };

  // ✅ FIXED: Handle client selection with proper saving and highlighting
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
      clientPhone: client.phone,
      clientEmail: client.email,
      // Slot details
      date: dateKey,
      slotId: slot.id,
      slotHour: slot.hour24,
      slotMinute: slot.minute,
      startTime: slot.time24,
      endTime: null,
      status: currentTime >= slotTime ? "in-progress" : "allocated",
      allocatedAt: new Date().toISOString(),
      duration: null,
      department: client.department,
      workerDepartment: worker?.department
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
      // ✅ Save to Worker's schedule
      await saveAllocationToWorker(workerId, newAllocation);
      
      // ✅ Save to Client's schedule
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

    if (currentTime >= slotTime) {
      setSlotStatus("in-progress");
      setEditingEndTime(true);
    } else {
      // Wait a moment to show the selection, then close modal
      setTimeout(() => {
        setShowAllocationModal(false);
        setSelectedSlot(null);
        setActiveWorker(null);
        setSelectedClientId(null);
      }, 500);
    }
  };

  // ✅ Save allocation to Worker's Firebase path
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
        lastActivity: `Allocated to ${allocation.clientName}`
      });

      console.log("✅ Worker schedule updated");
    } catch (error) {
      console.error("Error saving to worker schedule:", error);
      throw error;
    }
  };

  // ✅ Save allocation to Client's Firebase path
  const saveAllocationToClient = async (client, allocation) => {
    try {
      const dateKey = allocation.date;
      const slotId = allocation.slotId;

      // Get current client data
      const snapshot = await firebaseDB.child(`${client.clientPath}/${client.clientKey}`).once('value');
      const clientData = snapshot.val() || {};

      // Initialize schedule if it doesn't exist
      const currentSchedule = clientData.schedule || {};
      const currentDateSchedule = currentSchedule[dateKey] || {};

      // Update client schedule
      const clientSchedule = {
        ...currentSchedule,
        [dateKey]: {
          ...currentDateSchedule,
          [slotId]: {
            ...allocation,
            workerId: allocation.workerId,
            workerName: allocation.workerName,
            clientKey: client.clientKey,
            clientId: client.clientId
          }
        }
      };

      // Update client in Firebase
      await firebaseDB.child(`${client.clientPath}/${client.clientKey}`).update({
        schedule: clientSchedule,
        lastUpdated: new Date().toISOString(),
        lastService: new Date().toISOString(),
        lastWorker: allocation.workerName
      });

      console.log("✅ Client schedule updated");
    } catch (error) {
      console.error("Error saving to client schedule:", error);
      throw error;
    }
  };

  // Handle end time update
  const handleEndTimeUpdate = async () => {
    if (!selectedSlot || !tempEndTime) return;

    const { workerId, slot } = selectedSlot;
    const allocation = allocations[workerId]?.[slot.id];
    
    if (!allocation) return;

    // Calculate duration
    const startTime = parseFloat(allocation.startTime.split(':')[0]) + (parseInt(allocation.startTime.split(':')[1]) / 60);
    const [endHour, endMinute] = tempEndTime.split(':').map(Number);
    const endTime = endHour + (endMinute / 60);
    const duration = endTime - startTime;

    if (duration <= 0) {
      alert("End time must be after start time");
      return;
    }

    const updatedAllocation = {
      ...allocation,
      endTime: tempEndTime,
      status: "completed",
      duration: duration.toFixed(2),
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
      // Find the client
      const client = clients?.find(c => c.clientKey === allocation.clientKey);
      if (!client) {
        console.error("Client not found for update:", allocation);
        throw new Error("Client not found");
      }

      // Update worker schedule
      await saveAllocationToWorker(workerId, updatedAllocation);
      
      // Update client schedule
      await saveAllocationToClient(client, updatedAllocation);
      
      console.log("✅ Allocation completed and saved");
    } catch (error) {
      console.error("❌ Error completing allocation:", error);
      alert("Failed to save completion. Please try again.");
      return;
    }

    if (onAllocationUpdate) {
      onAllocationUpdate(updatedAllocation);
    }

    setShowAllocationModal(false);
    setSelectedSlot(null);
    setEditingEndTime(false);
    setTempEndTime("");
    setActiveWorker(null);
  };

  // Get slot status and styling - FIXED
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
    
    switch (allocation.status) {
      case "allocated":
        return {
          status: "allocated",
          className: "slot-allocated",
          tooltip: `Allocated to ${allocation.clientName}\nStart: ${allocation.startTime}`
        };
      case "in-progress":
        return {
          status: "in-progress",
          className: "slot-in-progress",
          tooltip: `In Progress: ${allocation.clientName}\nStart: ${allocation.startTime}`
        };
      case "completed":
        return {
          status: "completed",
          className: "slot-completed",
          tooltip: `Completed: ${allocation.clientName}\nDuration: ${allocation.duration} hours`
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
    let totalHours = 0;
    
    Object.values(workerAllocations).forEach(allocation => {
      if (allocation.status === "completed" && allocation.duration) {
        totalHours += parseFloat(allocation.duration);
      }
    });
    
    return totalHours.toFixed(2);
  };

  // Calculate total working hours for the day
  const calculateTotalWorkingHours = () => {
    let total = 0;
    (workers || []).forEach(worker => {
      total += parseFloat(calculateTotalHours(worker.id) || 0);
    });
    return total.toFixed(2);
  };

  // Clear slot allocation - FIXED
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
      if (client && client.clientPath) {
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
  };

  // Render allocation modal - IMPROVED with client highlighting
  const renderAllocationModal = () => {
    if (!showAllocationModal || !selectedSlot) return null;

    const { workerId, slot } = selectedSlot;
    const worker = workers?.find(w => w.id === workerId);
    const allocation = allocations[workerId]?.[slot.id];

    return (
      <div className="modal-overlay" onClick={() => setShowAllocationModal(false)}>
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>
              {slotStatus === "allocating" && "📅 Allocate Time Slot"}
              {slotStatus === "in-progress" && "⏳ Update Work Status"}
              {slotStatus === "completed" && "✅ Work Details"}
            </h3>
            <button className="modal-close" onClick={() => {
              setShowAllocationModal(false);
              setActiveWorker(null);
              setSelectedClientId(null);
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

            {slotStatus === "allocating" && (
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
                      if (e.key === 'Escape') {
                        setShowAllocationModal(false);
                        setSelectedClientId(null);
                      }
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

            {(slotStatus === "in-progress" || slotStatus === "completed") && allocation && (
              <div className="allocation-details">
                <div className="client-info">
                  <h4>👤 Client Information</h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="label">Client ID:</span>
                      <span className="value">{allocation.clientId}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Name:</span>
                      <span className="value">{allocation.clientName}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Location:</span>
                      <span className="value">{allocation.clientLocation}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Phone:</span>
                      <span className="value">{allocation.clientPhone}</span>
                    </div>
                  </div>
                </div>
                
                <div className="work-info">
                  <h4>⚙️ Work Details</h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="label">Start Time:</span>
                      <span className="value">{allocation.startTime}</span>
                    </div>
                    
                    {slotStatus === "in-progress" && (
                      <div className="info-item full-width">
                        <span className="label">End Time:</span>
                        {editingEndTime ? (
                          <div className="time-input-group">
                            <input
                              type="time"
                              value={tempEndTime}
                              onChange={(e) => setTempEndTime(e.target.value)}
                              min={allocation.startTime}
                              max="21:00"
                              className="time-input"
                            />
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
                            <span className="value">Not set</span>
                            <button
                              className="btn-set"
                              onClick={() => setEditingEndTime(true)}
                            >
                              ⏰ Set End Time
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {slotStatus === "completed" && (
                      <>
                        <div className="info-item">
                          <span className="label">End Time:</span>
                          <span className="value">{allocation.endTime}</span>
                        </div>
                        <div className="info-item">
                          <span className="label">Duration:</span>
                          <span className="value highlight">
                            {allocation.duration} hours
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="label">Completed:</span>
                          <span className="value">
                            {new Date(allocation.completedAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="action-buttons">
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
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render worker card - IMPROVED
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
            <h5>🕒 Time Slots</h5>
            <div className="slot-stats">
              <span className="slot-stat completed">{completedSlots} ✅</span>
              <span className="slot-stat in-progress">{inProgressSlots} ⏳</span>
            </div>
          </div>

          <div className="time-slots-grid">
            {timeSlots.map((slot) => {
              const slotStatus = getSlotStatus(worker.id, slot);
              const allocation = allocations[worker.id]?.[slot.id];
              
              return (
                <div key={slot.id} className="slot-wrapper">
                  <div
                    className={`slot ${slotStatus.className} ${allocation ? 'allocated' : ''} ${slot.isLunchBreak ? 'lunch' : ''}`}
                    onClick={() => !slot.isLunchBreak && handleSlotClick(worker.id, slot)}
                    title={slotStatus.tooltip}
                  >
                    {allocation ? (
                      <div className="allocation-indicator">
                        <div className="client-indicator">
                          <span className="client-initial">
                            {allocation.clientName?.charAt(0) || "C"}
                          </span>
                          <div className="allocation-status">
                            <span className={`status-dot ${allocation.status}`}></span>
                            <span className="status-text">
                              {allocation.status === "completed" 
                                ? `${allocation.duration}h` 
                                : allocation.status === "in-progress"
                                ? "⏳"
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
                {timeSlots.filter(s => !s.isLunchBreak && !allocations[worker.id]?.[s.id]).length}
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
            <button 
              className="action-btn quick-allocate"
              onClick={() => {
                setActiveWorker(worker);
                alert(`Quick allocate for ${worker.name}`);
              }}
            >
              ⚡ Quick Allocate
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render daily summary
  const renderDailySummary = () => (
    <div className="summary-card">
      <h3>📊 Daily Summary - {formatDate(selectedDate)}</h3>
      <div className="summary-table-container">
        <table className="summary-table">
          <thead>
            <tr>
              <th>👨‍💼 Worker</th>
              <th>🏢 Department</th>
              <th>⏱️ Total Hours</th>
              <th>👥 Clients</th>
            </tr>
          </thead>
          <tbody>
            {dailySummary.length > 0 ? (
              dailySummary.map(summary => (
                <tr key={summary.workerId}>
                  <td className="worker-cell">{summary.workerName}</td>
                  <td><span className="badge">{summary.department}</span></td>
                  <td className="hours-cell">{summary.totalHours}h</td>
                  <td className="clients-cell">
                    {summary.clientNames.slice(0, 2).map((name, idx) => (
                      <span key={idx} className="client-tag">{name}</span>
                    ))}
                    {summary.clientNames.length > 2 && (
                      <span className="more-clients">+{summary.clientNames.length - 2}</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="no-data">📭 No completed work for today</td>
              </tr>
            )}
          </tbody>
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
          <div className="picker-date">{format(selectedDate, 'MMM d, yyyy')}</div>
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
            }}
            value={selectedDate}
            className="custom-calendar"
          />
          <div className="quick-dates">
            <button className="quick-btn today" onClick={() => setSelectedDate(new Date())}>
              Today
            </button>
            <button className="quick-btn" onClick={() => {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              setSelectedDate(yesterday);
            }}>
              Yesterday
            </button>
            <button className="quick-btn" onClick={() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              setSelectedDate(tomorrow);
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
      </footer>

      {/* Allocation Modal */}
      {renderAllocationModal()}
    </div>
  );
};

export default SlotBook;