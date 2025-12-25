import React, { useState, useEffect, useRef } from "react";
import firebaseDB from "../../../firebase";
import { WORKER_PATHS, CLIENT_PATHS, getClientPathByDepartment } from "../../../utils/dataPaths";

const SlotBook = ({ workers, onAllocationUpdate }) => {
  const [selectedWorker, setSelectedWorker] = useState(null);
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
  const searchInputRef = useRef(null);

  // Generate time slots
  const generateTimeSlots = React.useMemo(() => {
    const slots = [];
    for (let hour = 5; hour <= 21; hour++) {
      const time24 = hour.toString().padStart(2, '0') + ":00";
      const time12 = convertTo12Hour(time24);
      const isLunchBreak = hour >= 12 && hour < 14;
      
      slots.push({
        id: hour,
        hour24: hour,
        time24: time24,
        time12: time12,
        isLunchBreak: isLunchBreak,
        displayText: time12
      });
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
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Get date key for Firebase
  function getDateKey(date) {
    return date.toISOString().split('T')[0];
  }

  // Fetch clients based on worker's department
  useEffect(() => {
    if (selectedSlot && selectedSlot.workerId) {
      const worker = workers?.find(w => w.id === selectedSlot.workerId);
      if (worker?.department) {
        fetchClientsByDepartment(worker.department);
      }
    } else if (workers?.length > 0) {
      // Default to first worker's department
      const firstWorker = workers[0];
      if (firstWorker?.department) {
        fetchClientsByDepartment(firstWorker.department);
      }
    }
  }, [selectedSlot, workers]);

  // Fetch clients from Firebase
  const fetchClientsByDepartment = async (department) => {
    try {
      setLoading(true);
      const clientPath = getClientPathByDepartment(department);
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
          clientId: value.clientId || value.idNo || key,
          name: `${value.firstName || ""} ${value.lastName || ""}`.trim() || value.clientName || "Unknown Client",
          location: value.address || value.location || "Unknown Location",
          department: department,
          phone: value.phone || value.mobile || "N/A",
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

  // Filter clients based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredClients(clients || []);
    } else {
      const filtered = (clients || []).filter(client =>
        client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.clientId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone?.includes(searchQuery)
      );
      setFilteredClients(filtered);
    }
  }, [searchQuery, clients]);

  // Initialize allocations from workers data
  useEffect(() => {
    const initialAllocations = {};
    const dateKey = getDateKey(selectedDate);
    
    (workers || []).forEach(worker => {
      // Get schedule for this date
      const scheduleForDate = worker.schedule?.[dateKey] || {};
      
      // Convert schedule object to allocations
      const workerAllocations = {};
      Object.entries(scheduleForDate).forEach(([slotHour, allocation]) => {
        workerAllocations[parseInt(slotHour)] = allocation;
      });
      
      initialAllocations[worker.id] = workerAllocations;
    });
    
    setAllocations(initialAllocations);
  }, [workers, selectedDate]);

  // Handle slot click
  const handleSlotClick = (workerId, slot) => {
    if (slot.isLunchBreak) return;
    
    const currentAllocation = allocations[workerId]?.[slot.hour24];
    
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
    const currentTime = now.getHours() + (now.getMinutes() / 60);

    const newAllocation = {
      workerId: workerId,
      clientId: client.clientId || client.id,
      clientName: client.name,
      clientLocation: client.location,
      clientPhone: client.phone,
      clientEmail: client.email,
      date: dateKey,
      slotHour: slot.hour24,
      startTime: slot.time24,
      endTime: null,
      status: currentTime >= slot.hour24 ? "in-progress" : "allocated",
      allocatedAt: new Date().toISOString(),
      duration: null,
      department: client.department
    };

    // Update local allocations
    setAllocations(prev => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        [slot.hour24]: newAllocation
      }
    }));

    // Save to Firebase
    await saveAllocationToFirebase(workerId, newAllocation);

    // Notify parent component
    if (onAllocationUpdate) {
      onAllocationUpdate(newAllocation);
    }

    // If slot has started, go directly to end time editing
    if (currentTime >= slot.hour24) {
      setSlotStatus("in-progress");
      setEditingEndTime(true);
    } else {
      setShowAllocationModal(false);
      setSelectedSlot(null);
    }
  };

  // Save allocation to Firebase
  const saveAllocationToFirebase = async (workerId, allocation) => {
    try {
      const worker = workers?.find(w => w.id === workerId);
      if (!worker) {
        console.error("Worker not found:", workerId);
        return;
      }

      const workerPath = WORKER_PATHS[worker.department] || WORKER_PATHS["Others"];
      const dateKey = allocation.date;
      const slotHour = allocation.slotHour;

      // Get current worker data
      const snapshot = await firebaseDB.child(`${workerPath}/${workerId}`).once('value');
      const workerData = snapshot.val() || {};

      // Update schedule
      const updatedSchedule = {
        ...workerData.schedule,
        [dateKey]: {
          ...workerData.schedule?.[dateKey],
          [slotHour]: allocation
        }
      };

      // Update worker data in Firebase
      await firebaseDB.child(`${workerPath}/${workerId}`).update({
        schedule: updatedSchedule,
        lastUpdated: new Date().toISOString(),
        lastActivity: "Slot allocation updated"
      });

      console.log("Allocation saved to Firebase:", allocation);
    } catch (error) {
      console.error("Error saving allocation to Firebase:", error);
      throw error;
    }
  };

  // Handle end time update
  const handleEndTimeUpdate = async () => {
    if (!selectedSlot || !tempEndTime) return;

    const { workerId, slot } = selectedSlot;
    const allocation = allocations[workerId]?.[slot.hour24];
    
    if (!allocation) return;

    // Calculate duration
    const startHour = parseFloat(allocation.startTime.split(':')[0]);
    const endHour = parseFloat(tempEndTime.split(':')[0]);
    const duration = endHour - startHour;

    const updatedAllocation = {
      ...allocation,
      endTime: tempEndTime,
      status: "completed",
      duration: duration,
      completedAt: new Date().toISOString()
    };

    // Update local allocations
    setAllocations(prev => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        [slot.hour24]: updatedAllocation
      }
    }));

    // Save to Firebase
    await saveAllocationToFirebase(workerId, updatedAllocation);

    // Notify parent component
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
    const allocation = allocations[workerId]?.[slot.hour24];
    
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
        totalHours += allocation.duration;
      }
    });
    
    return totalHours.toFixed(1);
  };

  // Filter workers based on search
  const filteredWorkers = workers || [];

  // Render allocation modal
  const renderAllocationModal = () => {
    if (!showAllocationModal || !selectedSlot) return null;

    const { workerId, slot } = selectedSlot;
    const worker = workers?.find(w => w.id === workerId);
    const allocation = allocations[workerId]?.[slot.hour24];

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
                  <span className="search-icon">🔍</span>
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
            
            {slotStatus === "allocating" && filteredClients.length === 0 && !searchQuery && (
              <button
                className="btn-primary"
                onClick={() => {
                  // Refresh clients
                  const worker = workers?.find(w => w.id === selectedSlot?.workerId);
                  if (worker?.department) {
                    fetchClientsByDepartment(worker.department);
                  }
                }}
              >
                Refresh Clients
              </button>
            )}
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
      <div className="worker-card" key={worker.id}>
        <div className="worker-card-header">
          <div className="worker-info">
            <h4 className="worker-name">{worker.name || worker.id}</h4>
            <div className="worker-meta">
              <span className="badge badge-id">{worker.idNo || "N/A"}</span>
              <span className="badge badge-department">{worker.department || "General"}</span>
            </div>
          </div>
          <div className="worker-stats">
            <div className="stat-total-hours">
              <span className="stat-label">Total Hours:</span>
              <span className="stat-value">{totalHours}h</span>
            </div>
          </div>
        </div>
        
        <div className="time-slots-grid">
          <div className="time-slots-header">
            {timeSlots.map(slot => (
              <div key={slot.id} className="slot-header">
                {slot.time12}
              </div>
            ))}
          </div>
          
          <div className="time-slots-body">
            {timeSlots.map(slot => {
              const slotStatus = getSlotStatus(worker.id, slot);
              const allocation = allocations[worker.id]?.[slot.hour24];
              
              return (
                <button
                  key={slot.id}
                  className={`time-slot ${slotStatus.className}`}
                  onClick={() => handleSlotClick(worker.id, slot)}
                  disabled={slot.isLunchBreak}
                  title={slotStatus.tooltip}
                >
                  {allocation ? (
                    <div className="slot-content">
                      <div className="client-initials">
                        {allocation.clientName?.substring(0, 2).toUpperCase() || "CL"}
                      </div>
                      {allocation.status === "completed" && (
                        <div className="slot-duration">
                          {allocation.duration}h
                        </div>
                      )}
                    </div>
                  ) : slot.isLunchBreak ? (
                    <span className="lunch-icon">🍽️</span>
                  ) : (
                    <span className="slot-plus">+</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="worker-card-footer">
          <div className="slot-legend">
            <div className="legend-item">
              <div className="legend-color available"></div>
              <span>Available</span>
            </div>
            <div className="legend-item">
              <div className="legend-color allocated"></div>
              <span>Allocated</span>
            </div>
            <div className="legend-item">
              <div className="legend-color in-progress"></div>
              <span>In Progress</span>
            </div>
            <div className="legend-item">
              <div className="legend-color completed"></div>
              <span>Completed</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="slotBook slot-book-container">
      <div className="slot-book-header">
        <div className="header-left">
          <h2 className="page-title">Worker Allocation Dashboard</h2>
          <div className="date-selector">
            <button
              className="btn-date-nav"
              onClick={() => {
                const prevDay = new Date(selectedDate);
                prevDay.setDate(prevDay.getDate() - 1);
                setSelectedDate(prevDay);
              }}
            >
              ←
            </button>
            <div className="current-date">
              {formatDate(selectedDate)}
            </div>
            <button
              className="btn-date-nav"
              onClick={() => {
                const nextDay = new Date(selectedDate);
                nextDay.setDate(nextDay.getDate() + 1);
                setSelectedDate(nextDay);
              }}
            >
              →
            </button>
            <button
              className="btn-today"
              onClick={() => setSelectedDate(new Date())}
            >
              Today
            </button>
          </div>
        </div>
        
        <div className="header-right">
          <div className="filters">
            <input
              type="text"
              className="filter-input"
              placeholder="Filter workers..."
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select className="filter-select">
              <option value="">All Departments</option>
              <option value="Home Care">Home Care</option>
              <option value="Housekeeping">Housekeeping</option>
              <option value="Technical & Maintenance">Technical</option>
              <option value="Others">Others</option>
            </select>
          </div>
          
          <div className="stats-summary">
            <div className="stat-box">
              <div className="stat-number">{workers?.length || 0}</div>
              <div className="stat-label">Total Workers</div>
            </div>
            <div className="stat-box">
              <div className="stat-number">
                {Object.values(allocations).reduce((total, workerAllocs) => {
                  return total + Object.values(workerAllocs).filter(a => a.status === "completed").length;
                }, 0)}
              </div>
              <div className="stat-label">Completed Slots</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="worker-cards-grid">
        {filteredWorkers.length > 0 ? (
          filteredWorkers.map(renderWorkerCard)
        ) : (
          <div className="no-workers-message">
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <h3>No Workers Available</h3>
              <p>Add workers to start allocating time slots</p>
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