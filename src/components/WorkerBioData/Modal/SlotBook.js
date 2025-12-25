import React, { useState, useEffect, useRef } from "react";
import firebaseDB from "../../../firebase";
import { WORKER_PATHS, CLIENT_PATHS, getClientPathByDepartment } from "../../../utils/dataPaths";
import Calendar from 'react-calendar';
import SimpleCalendar from './SimpleCalendar';
import { format, addDays, isSameDay, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, eachMonthOfInterval, differenceInHours, parse } from 'date-fns';

const SlotBook = ({ workers, onAllocationUpdate }) => {
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("day"); // day, week, month
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
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [activeView, setActiveView] = useState("dashboard"); // dashboard, summary, analytics
  const [weeklyHours, setWeeklyHours] = useState({});
  const [dailySummary, setDailySummary] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState({
    workingDays: 0,
    totalHours: 0,
    leavesTaken: 0,
    utilizationRate: "0%"
  });
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
          !event.target.closest('.btn-calendar')) {
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

  // Fetch clients based on worker's department
  useEffect(() => {
    if (selectedSlot && selectedSlot.workerId) {
      const worker = workers?.find(w => w.id === selectedSlot.workerId);
      if (worker?.department) {
        fetchClientsByDepartment(worker.department);
      }
    } else if (workers?.length > 0) {
      const firstWorker = workers[0];
      if (firstWorker?.department) {
        fetchClientsByDepartment(firstWorker.department);
      }
    }
  }, [selectedSlot, workers]);

  // Fetch clients from Firebase with correct paths
  const fetchClientsByDepartment = async (department) => {
    try {
      setLoading(true);
      
      // Define client paths based on your provided structure
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

      const clientPath = clientPaths[department] || clientPaths["Others"];
      if (!clientPath) {
        console.error("No client path found for department:", department);
        setClients([]);
        return;
      }

      const snapshot = await firebaseDB.child(clientPath).once('value');
      const clientsData = snapshot.val();
      
      if (clientsData) {
        const clientsArray = Object.entries(clientsData).map(([key, value]) => ({
          id: key,
          clientId: value.clientId || value.idNo || value.employeeId || key,
          name: `${value.firstName || ""} ${value.lastName || ""}`.trim() || value.clientName || value.name || "Unknown Client",
          location: value.address || value.location || "Unknown Location",
          department: department,
          phone: value.phone || value.mobile || value.contactNumber || "N/A",
          email: value.email || "N/A",
          ...value
        }));
        setClients(clientsArray);
      } else {
        setClients([]);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
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

    // Check all workers' allocations for the current month
    workers?.forEach(worker => {
      const workerSchedule = worker.schedule || {};
      
      Object.entries(workerSchedule).forEach(([dateKey, daySchedule]) => {
        const date = parseISO(dateKey);
        
        // Only consider dates in current month
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
          
          // If no work done on a weekday, count as leave
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

  // Handle slot click
  const handleSlotClick = (workerId, slot) => {
    if (slot.isLunchBreak) return;
    
    const currentAllocation = allocations[workerId]?.[slot.id];
    
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

  // Handle client selection
  const handleClientSelect = async (client) => {
    if (!selectedSlot || !selectedSlot.workerId || !selectedSlot.slot) return;

    const { workerId, slot } = selectedSlot;
    const dateKey = getDateKey(selectedDate);
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour + (currentMinute / 60);
    const slotTime = slot.hour24 + (slot.minute / 60);

    const newAllocation = {
      workerId: workerId,
      clientId: client.clientId || client.id,
      clientName: client.name,
      clientLocation: client.location,
      clientPhone: client.phone,
      clientEmail: client.email,
      date: dateKey,
      slotId: slot.id,
      slotHour: slot.hour24,
      slotMinute: slot.minute,
      startTime: slot.time24,
      endTime: null,
      status: currentTime >= slotTime ? "in-progress" : "allocated",
      allocatedAt: new Date().toISOString(),
      duration: null,
      department: client.department
    };

    // Update local allocations
    setAllocations(prev => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        [slot.id]: newAllocation
      }
    }));

    // Save to Firebase - both worker and client schedules
    await saveAllocationToFirebase(workerId, newAllocation);
    await saveToClientSchedule(client, newAllocation);

    if (onAllocationUpdate) {
      onAllocationUpdate(newAllocation);
    }

    if (currentTime >= slotTime) {
      setSlotStatus("in-progress");
      setEditingEndTime(true);
    } else {
      setShowAllocationModal(false);
      setSelectedSlot(null);
    }
  };

  // Save allocation to Firebase - Worker schedule
  const saveAllocationToFirebase = async (workerId, allocation) => {
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

      // Update schedule
      const updatedSchedule = {
        ...workerData.schedule,
        [dateKey]: {
          ...workerData.schedule?.[dateKey],
          [slotId]: allocation
        }
      };

      // Update worker data in Firebase
      await firebaseDB.child(`${workerPath}/${workerId}`).update({
        schedule: updatedSchedule,
        lastUpdated: new Date().toISOString(),
        lastActivity: "Slot allocation updated"
      });

      console.log("Allocation saved to worker schedule:", allocation);
    } catch (error) {
      console.error("Error saving allocation to Firebase:", error);
      throw error;
    }
  };

  // Save to client schedule
  const saveToClientSchedule = async (client, allocation) => {
    try {
      // Define client paths based on your provided structure
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

      const clientPath = clientPaths[client.department] || clientPaths["Others"];
      const dateKey = allocation.date;
      const slotId = allocation.slotId;

      // Get current client data
      const snapshot = await firebaseDB.child(`${clientPath}/${client.id}`).once('value');
      const clientData = snapshot.val() || {};

      // Update client schedule
      const clientSchedule = {
        ...clientData.schedule,
        [dateKey]: {
          ...clientData.schedule?.[dateKey],
          [slotId]: {
            ...allocation,
            workerId: allocation.workerId,
            workerName: workers?.find(w => w.id === allocation.workerId)?.name || "Unknown"
          }
        }
      };

      // Update client data in Firebase
      await firebaseDB.child(`${clientPath}/${client.id}`).update({
        schedule: clientSchedule,
        lastUpdated: new Date().toISOString(),
        lastService: new Date().toISOString()
      });

      console.log("Allocation saved to client schedule:", allocation);
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

    const updatedAllocation = {
      ...allocation,
      endTime: tempEndTime,
      status: "completed",
      duration: duration.toFixed(2),
      completedAt: new Date().toISOString()
    };

    // Update local allocations
    setAllocations(prev => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        [slot.id]: updatedAllocation
      }
    }));

    // Save to Firebase
    await saveAllocationToFirebase(workerId, updatedAllocation);
    
    // Also update client schedule
    const client = clients?.find(c => c.clientId === allocation.clientId);
    if (client) {
      await saveToClientSchedule(client, updatedAllocation);
    }

    if (onAllocationUpdate) {
      onAllocationUpdate(updatedAllocation);
    }

    setShowAllocationModal(false);
    setSelectedSlot(null);
    setEditingEndTime(false);
    setTempEndTime("");
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

  // Filter workers based on search and department
  const filteredWorkers = React.useMemo(() => {
    let filtered = workers || [];
    
    if (selectedDepartment !== "All") {
      filtered = filtered.filter(worker => worker.department === selectedDepartment);
    }
    
    if (searchQuery.trim()) {
      filtered = filtered.filter(worker =>
        worker.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        worker.idNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        worker.department?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [workers, selectedDepartment, searchQuery]);

  // Calculate total working hours for the day
  const calculateTotalWorkingHours = () => {
    let total = 0;
    filteredWorkers.forEach(worker => {
      total += parseFloat(calculateTotalHours(worker.id) || 0);
    });
    return total.toFixed(2);
  };

  // Render allocation modal
  const renderAllocationModal = () => {
    if (!showAllocationModal || !selectedSlot) return null;

    const { workerId, slot } = selectedSlot;
    const worker = workers?.find(w => w.id === workerId);
    const allocation = allocations[workerId]?.[slot.id];

    return (
      <div className="slotBook slot-allocation-modal-overlay" onClick={() => setShowAllocationModal(false)}>
        <div className="slot-allocation-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">
              {slotStatus === "allocating" && "Allocate Time Slot"}
              {slotStatus === "in-progress" && "Update Work Status"}
              {slotStatus === "completed" && "Work Details"}
            </h3>
            <button className="modal-close" onClick={() => setShowAllocationModal(false)}>
              ×
            </button>
          </div>
          
          <div className="modal-body">
            <div className="worker-info-section">
              <div className="info-row">
                <span className="label">Worker:</span>
                <span className="value">
                  {worker?.name || workerId} ({worker?.idNo || "N/A"})
                </span>
              </div>
              <div className="info-row">
                <span className="label">Time Slot:</span>
                <span className="value">{slot.time12}</span>
              </div>
              <div className="info-row">
                <span className="label">Date:</span>
                <span className="value">{formatDate(selectedDate)}</span>
              </div>
            </div>

            {slotStatus === "allocating" && (
              <div className="client-search-section">
                <div className="section-header">
                  <h4>Select Client</h4>
                  {loading && <span className="loading-indicator">Loading clients...</span>}
                </div>
                
                <div className="search-input-wrapper">
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="client-search-input"
                    placeholder="Search client by name, ID, phone, or location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setShowAllocationModal(false);
                      if (e.key === 'Enter' && filteredClients.length > 0) {
                        handleClientSelect(filteredClients[0]);
                      }
                    }}
                  />
                  <span className="search-icon" style={{ pointerEvents: 'none' }}>🔍</span>
                </div>
                
                {searchQuery && (
                  <div className="client-results">
                    {filteredClients.length > 0 ? (
                      <>
                        <div className="results-header">
                          <span>Found {filteredClients.length} clients</span>
                        </div>
                        <ul className="client-list">
                          {filteredClients.slice(0, 10).map(client => (
                            <li
                              key={client.id}
                              className="client-item"
                              onClick={() => handleClientSelect(client)}
                            >
                              <div className="client-header">
                                <div className="client-id">{client.clientId}</div>
                                <div className="client-phone">{client.phone}</div>
                              </div>
                              <div className="client-name">{client.name}</div>
                              <div className="client-location">{client.location}</div>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <div className="no-results">
                        <p>No clients found</p>
                        <button
                          className="btn-quick-client"
                          onClick={() => {
                            const dummyClient = {
                              id: "WALKIN-" + Date.now(),
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
                          Create Walk-in Client
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {(slotStatus === "in-progress" || slotStatus === "completed") && allocation && (
              <div className="allocation-details-section">
                <div className="client-details">
                  <h4>Client Information</h4>
                  <div className="info-row">
                    <span className="label">Client ID:</span>
                    <span className="value">{allocation.clientId}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Client Name:</span>
                    <span className="value">{allocation.clientName}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Location:</span>
                    <span className="value">{allocation.clientLocation}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Phone:</span>
                    <span className="value">{allocation.clientPhone}</span>
                  </div>
                </div>
                
                <div className="work-details">
                  <h4>Work Details</h4>
                  <div className="info-row">
                    <span className="label">Start Time:</span>
                    <span className="value">{allocation.startTime}</span>
                  </div>
                  
                  {slotStatus === "in-progress" && (
                    <div className="end-time-section">
                      <div className="info-row">
                        <span className="label">End Time:</span>
                        {editingEndTime ? (
                          <div className="end-time-input">
                            <input
                              type="time"
                              value={tempEndTime}
                              onChange={(e) => setTempEndTime(e.target.value)}
                              min={allocation.startTime}
                              max="21:00"
                            />
                            <button
                              className="btn-save"
                              onClick={handleEndTimeUpdate}
                              disabled={!tempEndTime}
                            >
                              Save
                            </button>
                            <button
                              className="btn-cancel"
                              onClick={() => setEditingEndTime(false)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="end-time-actions">
                            <span className="value">Not set</span>
                            <button
                              className="btn-edit"
                              onClick={() => setEditingEndTime(true)}
                            >
                              Set End Time
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {slotStatus === "completed" && (
                    <>
                      <div className="info-row">
                        <span className="label">End Time:</span>
                        <span className="value">{allocation.endTime}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Duration:</span>
                        <span className="value highlight">
                          {allocation.duration} hours
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="label">Completed At:</span>
                        <span className="value">
                          {new Date(allocation.completedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            <button
              className="btn-secondary"
              onClick={() => setShowAllocationModal(false)}
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
    
    return (
      <div className="worker-card-modern" key={worker.id}>
        {/* Modern Header */}
        <div className="worker-card-header-modern">
          <div className="worker-header-left">
            <div className="worker-avatar">
              <div className="avatar-circle">
                {worker.name?.charAt(0) || worker.id?.charAt(0) || "W"}
              </div>
            </div>
            <div className="worker-info-modern">
              <h4 className="worker-name-modern">{worker.name || worker.id}</h4>
              <div className="worker-meta-modern">
                <div className="meta-item">
                  <span className="meta-label">ID:</span>
                  <span className="meta-value">{worker.idNo || "N/A"}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Dept:</span>
                  <span className={`department-tag ${worker.department?.toLowerCase().replace(/[^a-z]/g, "-") || "general"}`}>
                    {worker.department || "General"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="worker-header-right">
            <div className="stats-card">
              <div className="stat-icon">⏱️</div>
              <div className="stat-content">
                <div className="stat-value-modern">{totalHours}h</div>
                <div className="stat-label-modern">Today's Hours</div>
              </div>
            </div>
          </div>
        </div>

        {/* Integrated Time Slots */}
        <div className="integrated-slots-section">
          <div className="slots-header-modern">
            <div className="slots-title">
              <span className="slots-icon">🕒</span>
              <h5>Time Slots</h5>
            </div>
            <div className="slots-info">
              <span className="info-badge">
                {Object.values(allocations[worker.id] || {}).filter(a => a.status === "completed").length} completed
              </span>
            </div>
          </div>

          <div className="integrated-slots-grid">
            <div className="time-indicators">
              {['Morning', 'Noon', 'Afternoon', 'Evening'].map((period) => (
                <div key={period} className="time-period">{period}</div>
              ))}
            </div>

            <div className="slots-container-modern">
              {timeSlots.map((slot, index) => {
                const slotStatus = getSlotStatus(worker.id, slot);
                const allocation = allocations[worker.id]?.[slot.id];
                const isHourMark = slot.minute === 0;
                
                return (
                  <div key={slot.id} className="slot-item-wrapper">
              
                    
                    <div
                      className={`slot-item ${slotStatus.className} ${allocation ? 'has-allocation' : ''} ${slot.isLunchBreak ? 'lunch-slot' : ''}`}
                      onClick={() => !slot.isLunchBreak && handleSlotClick(worker.id, slot)}
                      title={slotStatus.tooltip}
                    >
                      {allocation ? (
                        <div className="allocation-badge">
                          <div className="client-badge">
                            <span className="client-initial">
                              {allocation.clientName?.charAt(0) || "C"}
                            </span>
                            <div className="allocation-status">
                              <span className={`status-dot ${allocation.status}`}></span>
                              <span className="status-text">
                                {allocation.status === "completed" 
                                  ? `${allocation.duration}h` 
                                  : allocation.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : slot.isLunchBreak ? (
                        <div className="lunch-badge">
                          <span className="lunch-icon">🍽️</span>
                          <span className="lunch-text">Lunch</span>
                        </div>
                      ) : (
                        <div className="available-slot">
                          <span className="available-icon">+</span>
                          <span className="time-label">{slot.time12}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Half-hour indicator */}
                    {slot.minute === 30 && (
                      <div className="half-hour-indicator"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="slot-quick-stats">
            <div className="stat-pill">
              <span className="stat-pill-label">Available:</span>
              <span className="stat-pill-value">
                {timeSlots.filter(s => !s.isLunchBreak && !allocations[worker.id]?.[s.id]).length}
              </span>
            </div>
            <div className="stat-pill">
              <span className="stat-pill-label">Allocated:</span>
              <span className="stat-pill-value">
                {Object.values(allocations[worker.id] || {}).filter(a => a.status === "allocated").length}
              </span>
            </div>
            <div className="stat-pill">
              <span className="stat-pill-label">In Progress:</span>
              <span className="stat-pill-value">
                {Object.values(allocations[worker.id] || {}).filter(a => a.status === "in-progress").length}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="card-footer-modern">
          <div className="footer-actions">
            <button 
              className="action-btn quick-view"
              onClick={() => {
                // Quick view all allocations
                const workerAllocs = allocations[worker.id];
                if (workerAllocs) {
                  console.log("Worker allocations:", workerAllocs);
                  // You could implement a modal here
                }
              }}
            >
              <span className="action-icon">👁️</span>
              Quick View
            </button>
            <button 
              className="action-btn allocate-multiple"
              onClick={() => {
                // Implement bulk allocation
                setSelectedWorker(worker);
                setShowAllocationModal(true);
              }}
            >
              <span className="action-icon">⏰</span>
              Bulk Allocate
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render daily summary
  const renderDailySummary = () => (
    <div className="daily-summary">
      <h3>Daily Summary - {formatDate(selectedDate)}</h3>
      <div className="summary-table">
        <table>
          <thead>
            <tr>
              <th>Worker</th>
              <th>Department</th>
              <th>Total Hours</th>
              <th>Clients</th>
            </tr>
          </thead>
          <tbody>
            {dailySummary.length > 0 ? (
              dailySummary.map(summary => (
                <tr key={summary.workerId}>
                  <td>{summary.workerName}</td>
                  <td><span className="badge">{summary.department}</span></td>
                  <td className="hours-cell">{summary.totalHours}h</td>
                  <td className="clients-cell">
                    {summary.clientNames.slice(0, 3).map((name, idx) => (
                      <span key={idx} className="client-tag">{name}</span>
                    ))}
                    {summary.clientNames.length > 3 && (
                      <span className="more-clients">+{summary.clientNames.length - 3} more</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="no-data">No completed work for today</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Combined date and time button
  const renderDatePicker = () => (
    <div className="date-time-picker">
      <button 
        className="btn-date-picker"
        onClick={() => setShowCalendar(!showCalendar)}
      >
        <span className="picker-icon">📅</span>
        <div className="picker-content">
          <div className="picker-date">{format(selectedDate, 'MMM d, yyyy')}</div>
          <div className="picker-time">{format(selectedDate, 'h:mm a')}</div>
        </div>
        <span className="picker-arrow">{showCalendar ? '▲' : '▼'}</span>
      </button>
      
      {showCalendar && (
        <div className="calendar-popup" ref={calendarRef}>
          <Calendar
            onChange={(date) => {
              setSelectedDate(date);
              setShowCalendar(false);
            }}
            value={selectedDate}
            className="react-calendar"
          />
          <div className="calendar-quick-actions">
            <button className="btn-quick-today" onClick={() => {
              setSelectedDate(new Date());
              setShowCalendar(false);
            }}>Today</button>
            <button className="btn-quick-yesterday" onClick={() => {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              setSelectedDate(yesterday);
              setShowCalendar(false);
            }}>Yesterday</button>
            <button className="btn-quick-tomorrow" onClick={() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              setSelectedDate(tomorrow);
              setShowCalendar(false);
            }}>Tomorrow</button>
          </div>
        </div>
      )}
    </div>
  );

  // Render monthly tracker
  const renderMonthlyTracker = () => (
    <div className="monthly-tracker">
      <h4>Monthly Overview - {format(selectedDate, 'MMMM yyyy')}</h4>
      <div className="monthly-stats-grid">
        <div className="monthly-stat">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <div className="stat-value">{monthlyStats.workingDays}</div>
            <div className="stat-label">Working Days</div>
          </div>
        </div>
        <div className="monthly-stat">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <div className="stat-value">{monthlyStats.totalHours}h</div>
            <div className="stat-label">Total Hours</div>
          </div>
        </div>
        <div className="monthly-stat">
          <div className="stat-icon">🏖️</div>
          <div className="stat-content">
            <div className="stat-value">{monthlyStats.leavesTaken}</div>
            <div className="stat-label">Leaves Taken</div>
          </div>
        </div>
        <div className="monthly-stat">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{monthlyStats.utilizationRate}</div>
            <div className="stat-label">Utilization Rate</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="slotBook slot-book-container">
      <div className="slot-book-header">
        <div className="header-left">
          <h2 className="page-title">
            <span className="title-icon">📊</span>
            Worker Allocation Dashboard
          </h2>
          <div className="view-switcher">
            <button 
              className={`view-btn ${activeView === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveView('dashboard')}
            >
              <span className="btn-icon">📅</span> Dashboard
            </button>
            <button 
              className={`view-btn ${activeView === 'summary' ? 'active' : ''}`}
              onClick={() => setActiveView('summary')}
            >
              <span className="btn-icon">📈</span> Summary
            </button>
            <button 
              className={`view-btn ${activeView === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveView('analytics')}
            >
              <span className="btn-icon">📊</span> Analytics
            </button>
          </div>
        </div>
        
        <div className="header-right">
          <div className="filters">
            <div className="search-box">
              <input
                type="text"
                className="filter-input"
                placeholder="Search workers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="search-icon" style={{ pointerEvents: 'none' }}>🔍</span>
            </div>
            <select 
              className="filter-select"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
            >
              <option value="All">All Departments</option>
              <option value="Home Care">Home Care</option>
              <option value="Housekeeping">Housekeeping</option>
              <option value="Office & Administrative">Office & Administrative</option>
              <option value="Customer Service">Customer Service</option>
              <option value="Management & Supervision">Management & Supervision</option>
              <option value="Security">Security</option>
              <option value="Driving & Logistics">Driving & Logistics</option>
              <option value="Technical & Maintenance">Technical & Maintenance</option>
              <option value="Retail & Sales">Retail & Sales</option>
              <option value="Industrial & Labor">Industrial & Labor</option>
              <option value="Others">Others</option>
            </select>
            {renderDatePicker()}
          </div>
          
          <div className="stats-summary">
            <div className="stat-box">
              <div className="stat-number">{calculateTotalWorkingHours()}</div>
              <div className="stat-label">Total Hours Today</div>
            </div>
            <div className="stat-box">
              <div className="stat-number">{filteredWorkers.length}</div>
              <div className="stat-label">Active Workers</div>
            </div>
            <div className="stat-box">
              <div className="stat-number">
                {Object.values(allocations).reduce((total, workerAllocs) => {
                  return total + Object.values(workerAllocs).filter(a => a.status === "completed").length;
                }, 0)}
              </div>
              <div className="stat-label">Completed Jobs</div>
            </div>
          </div>
        </div>
      </div>

      <div className="main-content">
        {activeView === 'dashboard' ? (
          <>
            {renderMonthlyTracker()}
            
            <div className="worker-cards-grid">
              {filteredWorkers.length > 0 ? (
                filteredWorkers.map(renderWorkerCard)
              ) : (
                <div className="no-workers-message">
                  <div className="empty-state">
                    <div className="empty-icon">👥</div>
                    <h3>No Workers Found</h3>
                    <p>Try adjusting your filters or add workers to start allocating time slots</p>
                  </div>
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
            <h3>Analytics Dashboard - {format(selectedDate, 'MMMM yyyy')}</h3>
            {renderMonthlyTracker()}
            <div className="analytics-cards">
              <div className="analytics-card">
                <h4>Productivity Overview</h4>
                <div className="metric">Total Hours: {monthlyStats.totalHours}h</div>
                <div className="metric">Working Days: {monthlyStats.workingDays}</div>
                <div className="metric">Average Daily Hours: {(monthlyStats.workingDays > 0 ? monthlyStats.totalHours / monthlyStats.workingDays : 0).toFixed(2)}h</div>
                <div className="metric">Utilization Rate: {monthlyStats.utilizationRate}</div>
              </div>
              <div className="analytics-card">
                <h4>Attendance & Leaves</h4>
                <div className="metric">Leaves Taken: {monthlyStats.leavesTaken}</div>
                <div className="metric">Working Rate: {monthlyStats.workingDays > 0 ? ((monthlyStats.workingDays / (new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate())) * 100).toFixed(1) : 0}%</div>
                <div className="metric">Available Workers: {workers?.length || 0}</div>
                <div className="metric">Active Today: {filteredWorkers.length}</div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {renderAllocationModal()}
      
      <div className="quick-stats-bar">
        <div className="stats-container">
          <div className="stat-item">
            <span className="stat-label">Available Slots:</span>
            <span className="stat-value">
              {generateTimeSlots.filter(s => !s.isLunchBreak).length * (workers?.length || 0)}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Lunch Break:</span>
            <span className="stat-value">12:00 PM - 2:00 PM</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Working Hours:</span>
            <span className="stat-value">5:00 AM - 9:00 PM</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Clients:</span>
            <span className="stat-value">{clients.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlotBook;