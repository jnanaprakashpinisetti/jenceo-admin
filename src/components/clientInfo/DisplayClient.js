// src/pages/clients/DisplayClient.js
import React, { useState, useEffect, useRef } from 'react';
import firebaseDB from '../../firebase';
import editIcon from '../../assets/eidt.svg';
import viewIcon from '../../assets/view.svg';
import deleteIcon from '../../assets/delete.svg';
import ClientModal from './ClientModal/ClientModal';

// Department configuration
const DEPARTMENTS = {
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

const DEPARTMENT_ORDER = [
  "Home Care",
  "Housekeeping",
  "Office & Administrative",
  "Customer Service",
  "Management & Supervision",
  "Security",
  "Driving & Logistics",
  "Technical & Maintenance",
  "Retail & Sales",
  "Industrial & Labor",
  "Others"
];

// Status options
const STATUS_OPTIONS = ["Running", "Closed", "Stop", "Re-open", "Re-start", "Re-place"];

// Reminder badge types
const REMINDER_TYPES = [
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "upcoming", label: "Upcoming" }
];

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (error) {
    return 'Invalid Date';
  }
};

// Helper function to check if date is overdue
const isDateOverdue = (dateString) => {
  if (!dateString) return false;
  try {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date < today;
  } catch (error) {
    return false;
  }
};

// Helper function to get reminder type for a date
const getReminderType = (dateString) => {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Set hours to 0 for comparison
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    
    const tomorrowStart = new Date(tomorrow);
    tomorrowStart.setHours(0, 0, 0, 0);
    
    if (dateStart.getTime() === todayStart.getTime()) {
      return 'today';
    } else if (dateStart.getTime() === tomorrowStart.getTime()) {
      return 'tomorrow';
    } else if (dateStart < todayStart) {
      return 'overdue';
    } else if (dateStart > todayStart) {
      return 'upcoming';
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

export default function DisplayClient() {
  const [allClients, setAllClients] = useState({});
  const [filteredClients, setFilteredClients] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState("Home Care");

  // Reminder states
  const [reminderCounts, setReminderCounts] = useState({
    overdue: 0,
    today: 0,
    tomorrow: 0,
    upcoming: 0
  });
  const [activeReminder, setActiveReminder] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilters, setGenderFilters] = useState({
    Male: false,
    Female: false
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [clientCounts, setClientCounts] = useState({});

  // Delete states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [showDeleteReasonModal, setShowDeleteReasonModal] = useState(false);
  const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [reasonError, setReasonError] = useState(null);
  const [commentError, setCommentError] = useState(null);
  const [deleteReasonForm, setDeleteReasonForm] = useState({ reasonType: "", comment: "" });

  // Refs for validation
  const reasonSelectRef = useRef(null);
  const commentRef = useRef(null);

  // Fetch all clients from all departments
  useEffect(() => {
    const fetchAllClients = async () => {
      setLoading(true);
      try {
        const clientsByDept = {};
        const counts = {};
        
        for (const [deptName, dbPath] of Object.entries(DEPARTMENTS)) {
          try {
            const snapshot = await firebaseDB.child(dbPath).once('value');
            if (snapshot.exists()) {
              const clientsData = [];
              snapshot.forEach((childSnapshot) => {
                const clientData = childSnapshot.val();
                
                // Extract reminder dates from client data
                const nextFollowUpDate = clientData.nextFollowUpDate || 
                                        clientData.reminderDate || 
                                        (clientData.payments && clientData.payments[0] && clientData.payments[0].reminderDate);
                
                const nextPaymentDate = clientData.nextPaymentDate || 
                                       (clientData.payments && clientData.payments[0] && clientData.payments[0].date);
                
                clientsData.push({
                  id: childSnapshot.key,
                  department: deptName,
                  dbPath: dbPath,
                  nextFollowUpDate,
                  nextPaymentDate,
                  ...clientData
                });
              });
              
              // Sort clients by ID number in descending order
              const sortedClients = sortClientsDescending(clientsData);
              clientsByDept[deptName] = sortedClients;
              counts[deptName] = sortedClients.length;
            } else {
              clientsByDept[deptName] = [];
              counts[deptName] = 0;
            }
          } catch (err) {
            console.error(`Error fetching ${deptName}:`, err);
            clientsByDept[deptName] = [];
            counts[deptName] = 0;
          }
        }
        
        setAllClients(clientsByDept);
        setFilteredClients(clientsByDept);
        setClientCounts(counts);
        
        // Calculate reminder counts
        calculateReminderCounts(clientsByDept);
        
        // Calculate total pages for active tab
        const activeClients = clientsByDept[activeTab] || [];
        setTotalPages(Math.ceil(activeClients.length / rowsPerPage));
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchAllClients();
  }, []);

  // Calculate reminder counts
  const calculateReminderCounts = (clientsByDept) => {
    let overdue = 0;
    let today = 0;
    let tomorrow = 0;
    let upcoming = 0;
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = tomorrowDate.toISOString().split('T')[0];
    
    // Flatten all clients
    const allClientsArray = Object.values(clientsByDept).flat();
    
    allClientsArray.forEach(client => {
      const reminders = [];
      
      // Check for nextFollowUpDate
      if (client.nextFollowUpDate) {
        reminders.push(client.nextFollowUpDate);
      }
      
      // Check for nextPaymentDate
      if (client.nextPaymentDate) {
        reminders.push(client.nextPaymentDate);
      }
      
      // Check payment array for reminder dates
      if (client.payments && Array.isArray(client.payments)) {
        client.payments.forEach(payment => {
          if (payment.reminderDate) {
            reminders.push(payment.reminderDate);
          }
        });
      }
      
      // Remove duplicates and process each reminder date
      const uniqueReminders = [...new Set(reminders.filter(Boolean))];
      
      uniqueReminders.forEach(reminderDate => {
        const date = new Date(reminderDate);
        if (isNaN(date.getTime())) return;
        
        const dateStr = date.toISOString().split('T')[0];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);
        
        if (date < today && dateStr !== todayStr) {
          overdue++;
        } else if (dateStr === todayStr) {
          today++;
        } else if (dateStr === tomorrowStr) {
          tomorrow++;
        } else if (date > today) {
          upcoming++;
        }
      });
    });
    
    setReminderCounts({
      overdue,
      today,
      tomorrow,
      upcoming
    });
  };

  // Filter clients based on search term and filters
  useEffect(() => {
    const applyFilters = (clients) => {
      let filtered = [...clients];

      // — Search —
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter((client) =>
          (client.clientName && client.clientName.toLowerCase().includes(term)) ||
          (client.idNo && client.idNo.toLowerCase().includes(term)) ||
          (client.location && client.location.toLowerCase().includes(term)) ||
          (client.typeOfService && client.typeOfService.toLowerCase().includes(term)) ||
          (client.mobileNo1 && client.mobileNo1.toLowerCase().includes(term))
        );
      }

      // — Gender —
      const activeGenderFilters = Object.keys(genderFilters).filter((key) => genderFilters[key]);
      if (activeGenderFilters.length > 0) {
        filtered = filtered.filter(
          (client) => client.gender && activeGenderFilters.includes(client.gender)
        );
      }

      // — Status filter —
      if (statusFilter !== "All") {
        filtered = filtered.filter((c) => (c.serviceStatus || "Running") === statusFilter);
      }

      // — Reminder filter —
      if (activeReminder) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        filtered = filtered.filter(client => {
          const reminders = [];
          
          // Collect all reminder dates
          if (client.nextFollowUpDate) reminders.push(client.nextFollowUpDate);
          if (client.nextPaymentDate) reminders.push(client.nextPaymentDate);
          if (client.payments && Array.isArray(client.payments)) {
            client.payments.forEach(payment => {
              if (payment.reminderDate) reminders.push(payment.reminderDate);
            });
          }
          
          // Check if any reminder matches the active filter
          return reminders.some(reminderDate => {
            if (!reminderDate) return false;
            
            const date = new Date(reminderDate);
            date.setHours(0, 0, 0, 0);
            
            if (activeReminder === 'overdue') {
              return date < now;
            } else if (activeReminder === 'today') {
              return date.getTime() === now.getTime();
            } else if (activeReminder === 'tomorrow') {
              return date.getTime() === tomorrow.getTime();
            } else if (activeReminder === 'upcoming') {
              return date > now;
            }
            
            return false;
          });
        });
      }

      return filtered;
    };

    // Apply filters to all departments
    const newFiltered = {};
    Object.keys(allClients).forEach(dept => {
      newFiltered[dept] = applyFilters(allClients[dept]);
    });
    
    setFilteredClients(newFiltered);
    
    // Calculate total pages for active tab
    const activeClients = newFiltered[activeTab] || [];
    setTotalPages(Math.ceil(activeClients.length / rowsPerPage));
    setCurrentPage(1);
  }, [
    allClients,
    searchTerm,
    genderFilters,
    statusFilter,
    activeReminder,
    activeTab
  ]);

  // Update total pages when active tab or rowsPerPage changes
  useEffect(() => {
    const activeClients = filteredClients[activeTab] || [];
    setTotalPages(Math.ceil(activeClients.length / rowsPerPage));
    setCurrentPage(1);
  }, [filteredClients, activeTab, rowsPerPage]);

  const sortClientsDescending = (clientsData) => {
    return [...clientsData].sort((a, b) => {
      const getNumber = (id) => {
        if (!id) return 0;
        const match = String(id).match(/(\d+)(?!.*\d)/); // last number
        return match ? parseInt(match[1], 10) : 0;
      };

      const idA = a.idNo || a.clientId || '';
      const idB = b.idNo || b.clientId || '';

      const numA = getNumber(idA);
      const numB = getNumber(idB);

      // DESC order
      if (numA !== numB) return numB - numA;

      // fallback string compare
      return idB.localeCompare(idA);
    });
  };

  // Calculate current clients to display
  const currentClients = () => {
    const clients = filteredClients[activeTab] || [];
    const indexOfLastClient = currentPage * rowsPerPage;
    const indexOfFirstClient = indexOfLastClient - rowsPerPage;
    return clients.slice(indexOfFirstClient, indexOfLastClient);
  };

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Handle rows per page change
  const handleRowsPerPageChange = (e) => {
    setRowsPerPage(parseInt(e.target.value));
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle gender filter change
  const handleGenderFilterChange = (gender) => {
    setGenderFilters(prev => ({
      ...prev,
      [gender]: !prev[gender]
    }));
  };

  // Handle reminder badge click
  const handleReminderClick = (reminderKey) => {
    if (activeReminder === reminderKey) {
      setActiveReminder(null); // Deactivate if clicked again
    } else {
      setActiveReminder(reminderKey); // Activate
    }
  };

  // Generate page numbers for pagination
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  // Show limited page numbers with ellipsis for many pages
  const getDisplayedPageNumbers = () => {
    if (totalPages <= 7) {
      return pageNumbers;
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const handleView = (client) => {
    setSelectedClient(client);
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleEdit = (client) => {
    setSelectedClient(client);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const openDeleteConfirm = (client) => {
    setClientToDelete(client);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
  };

  // Check if any filter is active
  const hasActiveFilters = Boolean(
    Object.values(genderFilters).some(Boolean) ||
    statusFilter !== "All" ||
    activeReminder ||
    searchTerm
  );

  // Reset all filters
  const resetFilters = () => {
    setGenderFilters({});
    setStatusFilter("All");
    setActiveReminder(null);
    setSearchTerm("");
  };

  // When user confirms on the first confirm -> open reason modal
  const handleDeleteConfirmProceed = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setShowDeleteConfirm(false);
    setDeleteReasonForm({ reasonType: "", comment: "" });
    setDeleteError(null);
    setReasonError(null);
    setCommentError(null);
    setShowDeleteReasonModal(true);

    setTimeout(() => {
      if (reasonSelectRef.current) reasonSelectRef.current.focus();
    }, 50);
  };

  // Validate locally and show inline errors
  const validateDeleteForm = () => {
    let ok = true;
    setReasonError(null);
    setCommentError(null);

    if (!deleteReasonForm.reasonType) {
      setReasonError("Please select a reason.");
      ok = false;
    }
    if (!deleteReasonForm.comment || !deleteReasonForm.comment.trim()) {
      setCommentError("Comment is mandatory.");
      ok = false;
    }

    setTimeout(() => {
      if (!ok) {
        if (reasonError && reasonSelectRef.current) {
          reasonSelectRef.current.focus();
          reasonSelectRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        if (commentError && commentRef.current) {
          commentRef.current.focus();
          commentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        if (!deleteReasonForm.reasonType && reasonSelectRef.current) {
          reasonSelectRef.current.focus();
          reasonSelectRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if ((!deleteReasonForm.comment || !deleteReasonForm.comment.trim()) && commentRef.current) {
          commentRef.current.focus();
          commentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 0);

    return ok;
  };

  // When user submits reason -> actually perform delete / move
  const handleDeleteSubmitWithReason = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    // local validation first
    const ok = validateDeleteForm();
    if (!ok) {
      return;
    }

    if (!clientToDelete) {
      setDeleteError("No client selected for deletion.");
      return;
    }

    const { id, dbPath } = clientToDelete;
    try {
      // read client data
      const snapshot = await firebaseDB.child(`${dbPath}/${id}`).once("value");
      const clientData = snapshot.val();
      if (!clientData) {
        setDeleteError("Client data not found");
        return;
      }

      // Create exit path by replacing "Running" with "ExitClients"
      const exitPath = dbPath.replace("/Running", "/ExitClients");
      
      // attach removal metadata
      const payloadToExit = { 
        ...clientData,
        originalId: id,
        movedAt: new Date().toISOString()
      };

      // Save client record under ExitClients
      await firebaseDB.child(`${exitPath}/${id}`).set(payloadToExit);

      // push removal entry into the item's removalHistory array
      const removalEntry = {
        removedAt: new Date().toISOString(),
        removedBy: (deleteReasonForm && deleteReasonForm.by) || 'UI',
        removalReason: deleteReasonForm.reasonType || '',
        removalComment: deleteReasonForm.comment ? deleteReasonForm.comment.trim() : ''
      };
      await firebaseDB.child(`${exitPath}/${id}/removalHistory`).push(removalEntry);
      
      // Remove from original location
      await firebaseDB.child(`${dbPath}/${id}`).remove();
      
      // Update local state
      setAllClients(prev => ({
        ...prev,
        [clientToDelete.department]: prev[clientToDelete.department].filter(client => client.id !== id)
      }));
      
      // Recalculate reminder counts
      calculateReminderCounts({
        ...allClients,
        [clientToDelete.department]: allClients[clientToDelete.department].filter(client => client.id !== id)
      });
      
      // success -> close modal, clear states and show success modal
      setShowDeleteReasonModal(false);
      setClientToDelete(null);
      setShowDeleteSuccessModal(true);
      setDeleteError(null);
      setReasonError(null);
      setCommentError(null);
    } catch (err) {
      console.error(err);
      setDeleteError('Error deleting client: ' + (err.message || err));
    }
  };

  const handleSave = async (updatedClient) => {
    try {
      await firebaseDB.child(`${updatedClient.dbPath}/${updatedClient.id}`).update(updatedClient);
      setIsModalOpen(false);
      
      // Refresh data to update reminder counts
      const snapshot = await firebaseDB.child(updatedClient.dbPath).once('value');
      if (snapshot.exists()) {
        const clientsData = [];
        snapshot.forEach((childSnapshot) => {
          const clientData = childSnapshot.val();
          const nextFollowUpDate = clientData.nextFollowUpDate || 
                                  clientData.reminderDate || 
                                  (clientData.payments && clientData.payments[0] && clientData.payments[0].reminderDate);
          
          const nextPaymentDate = clientData.nextPaymentDate || 
                                 (clientData.payments && clientData.payments[0] && clientData.payments[0].date);
          
          clientsData.push({
            id: childSnapshot.key,
            department: updatedClient.department,
            dbPath: updatedClient.dbPath,
            nextFollowUpDate,
            nextPaymentDate,
            ...clientData
          });
        });
        
        const sortedClients = sortClientsDescending(clientsData);
        setAllClients(prev => ({
          ...prev,
          [updatedClient.department]: sortedClients
        }));
        
        calculateReminderCounts({
          ...allClients,
          [updatedClient.department]: sortedClients
        });
      }
    } catch (err) {
      setError('Error updating client: ' + err.message);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedClient(null);
    setIsEditMode(false);
  };

  // Status badge styling
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Running': return 'bg-success';
      case 'Closed': return 'bg-secondary';
      case 'Stop': return 'bg-warning';
      case 'Re-open': return 'bg-info';
      case 'Re-start': return 'bg-primary';
      case 'Re-place': return 'bg-dark';
      default: return 'bg-info';
    }
  };

  // Get reminder badge class based on active state
  const getReminderBadgeClass = (reminderKey) => {
    const baseClass = 'reminder-badge';
    const activeClass = activeReminder === reminderKey ? 'active' : '';
    return `${baseClass} ${reminderKey} ${activeClass}`;
  };

  // Get badge class for reminder date
  const getReminderDateBadgeClass = (dateString) => {
    if (!dateString) return 'bg-secondary';
    
    const reminderType = getReminderType(dateString);
    switch (reminderType) {
      case 'overdue': return 'bg-danger';
      case 'today': return 'bg-warning';
      case 'tomorrow': return 'bg-info';
      case 'upcoming': return 'bg-success';
      default: return 'bg-secondary';
    }
  };

  // Get next reminder date for a client
  const getNextReminderDate = (client) => {
    const reminders = [];
    
    if (client.nextFollowUpDate) reminders.push(client.nextFollowUpDate);
    if (client.nextPaymentDate) reminders.push(client.nextPaymentDate);
    
    // Check payment array for reminder dates
    if (client.payments && Array.isArray(client.payments)) {
      client.payments.forEach(payment => {
        if (payment.reminderDate) reminders.push(payment.reminderDate);
      });
    }
    
    // Sort dates ascending and get the earliest one
    const validDates = reminders.filter(date => {
      try {
        const d = new Date(date);
        return !isNaN(d.getTime());
      } catch {
        return false;
      }
    });
    
    if (validDates.length === 0) return null;
    
    validDates.sort((a, b) => new Date(a) - new Date(b));
    return validDates[0];
  };

  // Get reminder type for display
  const getReminderTypeForDate = (dateString) => {
    const reminderType = getReminderType(dateString);
    switch (reminderType) {
      case 'overdue': return 'Overdue';
      case 'today': return 'Today';
      case 'tomorrow': return 'Tomorrow';
      case 'upcoming': return 'Upcoming';
      default: return 'Scheduled';
    }
  };

  if (loading) return <div className="text-center my-5">Loading clients...</div>;
  if (error) return <div className="alert alert-danger">Error: {error}</div>;

  // Get current tab clients
  const activeClients = filteredClients[activeTab] || [];
  const currentTabClients = currentClients();
  const totalFiltered = activeClients.length;

  return (
    <div className='displayClient'>
      {/* Reminder Badges */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="alert alert-info text-info d-flex justify-content-around flex-wrap reminder-badges mb-4">
            {REMINDER_TYPES.map((reminder) => (
              <span 
                key={reminder.key}
                role="button" 
                className={getReminderBadgeClass(reminder.key)}
                onClick={() => handleReminderClick(reminder.key)}
              >
                {reminder.label}: <strong>{reminderCounts[reminder.key]}</strong>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Department Tabs */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="p-3 bg-dark border border-secondary rounded-3 border-opacity-">
            <h5 className="mb-3 text-center text-warning">Departments</h5>
            <div className="d-flex flex-wrap gap-2 justify-content-center">
              {DEPARTMENT_ORDER.map(dept => {
                const count = clientCounts[dept] || 0;
                const filteredCount = (filteredClients[dept] || []).length;
                const isActive = activeTab === dept;
                return (
                  <button
                    key={dept}
                    type="button"
                    className={`btn btn-sm ${isActive ? "btn-warning" : "btn-outline-warning"} position-relative`}
                    onClick={() => {
                      setActiveTab(dept);
                      setCurrentPage(1);
                    }}
                  >
                    {dept}
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                      {filteredCount}
                      <span className="visually-hidden">clients</span>
                    </span>
                    {!isActive && count > 0 && (
                      <small className="d-block text-muted">Total: {count}</small>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Active Department Info */}
      <div className="row mb-3">
        <div className="col-12">
          <div className="p-3 bg-dark border border-warning rounded-3 border-opacity-25">
            <div className="row align-items-center">
              <div className="col-md-3">
                <h4 className="text-warning mb-0">{activeTab}</h4>
                <p className="text-info mb-0">
                  Total: {clientCounts[activeTab] || 0} | 
                  Showing: {totalFiltered} {totalFiltered !== (clientCounts[activeTab] || 0) ? `(Filtered)` : ''}
                </p>
              </div>
              <div className="col-md-9">
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control search-bar"
                    placeholder={`Search ${activeTab} clients...`}
                    value={searchTerm}
                    onChange={handleSearchChange}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Filters Row */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="p-3 bg-dark border border-secondary rounded-3 border-opacity-25 clientFilter">
            <div className="row g-3 align-items-center justify-content-center">
              {/* Gender */}
              <div className="col-lg-2 col-md-3 text-center">
                <label className="form-label text-warning small mb-2">Gender</label>
                <div className="d-flex gap-2 justify-content-center">
                  {["Male", "Female"].map(g => {
                    const on = !!genderFilters[g];
                    return (
                      <button
                        key={g}
                        type="button"
                        className={`btn ${on ? "btn-warning" : "btn-outline-warning"} btn-sm`}
                        onClick={() => handleGenderFilterChange(g)}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status filter */}
              <div className="col-lg-3 col-md-4 text-center">
                <label className="form-label text-info small mb-2">Status</label>
                <div className="d-flex gap-2 justify-content-center">
                  {[
                    { label: "All", value: "All" },
                    { label: "Running", value: "Running" },
                    { label: "Closed", value: "Closed" },
                    { label: "Stop", value: "Stop" }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`btn ${statusFilter === opt.value ? "btn-info" : "btn-outline-info"} btn-sm`}
                      onClick={() => setStatusFilter(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset filter */}
              <div className="col-lg-2 col-md-4 text-center">
                <label className="form-label small mb-2 text-warning">Reset Filters</label>
                <div className="d-flex flex-column align-items-center gap-2">
                  <button
                    type="button"
                    className={`btn btn-outline-warning btn-sm mt-2 reset-btn ${hasActiveFilters ? "btn-pulse" : ""}`}
                    onClick={resetFilters}
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="chec-box-card">
            <div className="card-body py-2 filter-wrapper">
              <div className="row w-100">
                <div className="col-md-3 d-flex align-items-center">
                  <p className='text-warning mb-0'>
                    Showing: {(currentPage - 1) * rowsPerPage + 1} - {Math.min(currentPage * rowsPerPage, totalFiltered)} / {totalFiltered}
                  </p>
                </div>

                <div className="col-md-6 d-flex align-items-center justify-content-center">
                  {totalPages > 1 && (
                    <nav aria-label="Client pagination" className="pagination-wrapper">
                      <ul className="pagination justify-content-center align-items-center">
                        {/* First page button */}
                        <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                          <button
                            type="button"
                            className="page-link"
                            aria-label="First"
                            onClick={() => paginate(1)}
                            disabled={currentPage === 1}
                          >
                            «
                          </button>
                        </li>

                        {/* Previous page */}
                        <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                          <button
                            type="button"
                            className="page-link"
                            aria-label="Previous"
                            onClick={() => paginate(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            ‹
                          </button>
                        </li>

                        {/* Page numbers */}
                        {getDisplayedPageNumbers().map((number, index) => (
                          <li
                            key={index}
                            className={`page-item ${number === currentPage ? "active" : ""} ${number === "..." ? "disabled" : ""
                              }`}
                          >
                            {number === "..." ? (
                              <span className="page-link">…</span>
                            ) : (
                              <button
                                type="button"
                                className="page-link"
                                onClick={() => paginate(number)}
                              >
                                {number}
                              </button>
                            )}
                          </li>
                        ))}

                        {/* Next page */}
                        <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                          <button
                            type="button"
                            className="page-link"
                            aria-label="Next"
                            onClick={() => paginate(currentPage + 1)}
                            disabled={currentPage === totalPages}
                          >
                            ›
                          </button>
                        </li>

                        {/* Last page button */}
                        <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                          <button
                            type="button"
                            className="page-link"
                            aria-label="Last"
                            onClick={() => paginate(totalPages)}
                            disabled={currentPage === totalPages}
                          >
                            »
                          </button>
                        </li>
                      </ul>
                    </nav>
                  )}
                </div>
                <div className="col-md-3 d-flex align-items-center justify-content-end">
                  <span className="me-2">Show</span>
                  <select
                    className="form-select form-select-sm"
                    style={{ width: '80px' }}
                    value={rowsPerPage}
                    onChange={handleRowsPerPageChange}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                    <option value={40}>40</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="ms-2">entries</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="table-responsive mb-3">
        <table className="table table-dark table-hover">
          <thead className="table-dark">
            <tr>
              <th>ID No ↓</th>
              <th>Client Name</th>
              <th>Location</th>
              <th>Type of Service</th>
              <th>Mobile No</th>
              <th>Next Follow-up</th>
              <th>Next Payment</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentTabClients.length > 0 ? (
              currentTabClients.map((client) => {
                const nextReminder = getNextReminderDate(client);
                return (
                  <tr key={client.id} onClick={(e) => { e.stopPropagation(); handleView(client); }} style={{ cursor: 'pointer' }}>
                    <td>
                      <strong>{client.idNo || client.clientId || 'N/A'}</strong>
                      <small className="small-text d-block mt-1 text-info opacity-75">
                        By <strong>{client.createdByName || "System"}</strong>
                      </small>
                    </td>
                    <td>
                      {client.clientName || 'N/A'}
                      {nextReminder && (
                        <div className="mt-1">
                          <span className={`badge ${getReminderDateBadgeClass(nextReminder)}`}>
                            {getReminderTypeForDate(nextReminder)}
                          </span>
                        </div>
                      )}
                    </td>
                    <td>{client.location || 'N/A'}</td>
                    <td>{client.typeOfService || 'N/A'}</td>
                    <td>
                      {client.mobileNo1 ? (
                        <div className="d-flex flex-column">
                          <span>{client.mobileNo1}</span>
                          <div className="mt-1">
                            <a href={`tel:${client.mobileNo1}`} className="btn btn-sm btn-info me-1" onClick={(e) => e.stopPropagation()}>
                              Call
                            </a>
                            <a
                              className="btn btn-sm btn-warning"
                              href={`https://wa.me/${client.mobileNo1.replace(/\D/g, '')}?text=${encodeURIComponent(
                                'Hello, This is Sudheer From JenCeo Home Care Services'
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              WAP
                            </a>
                          </div>
                        </div>
                      ) : 'N/A'}
                    </td>
                    <td>
                      {client.nextFollowUpDate ? (
                        <div className="d-flex flex-column">
                          <span className={isDateOverdue(client.nextFollowUpDate) ? 'text-danger fw-bold' : ''}>
                            {formatDate(client.nextFollowUpDate)}
                          </span>
                          <span className={`badge ${getReminderDateBadgeClass(client.nextFollowUpDate)}`}>
                            {getReminderTypeForDate(client.nextFollowUpDate)}
                          </span>
                        </div>
                      ) : 'N/A'}
                    </td>
                    <td>
                      {client.nextPaymentDate ? (
                        <div className="d-flex flex-column">
                          <span className={isDateOverdue(client.nextPaymentDate) ? 'text-danger fw-bold' : ''}>
                            {formatDate(client.nextPaymentDate)}
                          </span>
                          <span className={`badge ${getReminderDateBadgeClass(client.nextPaymentDate)}`}>
                            {getReminderTypeForDate(client.nextPaymentDate)}
                          </span>
                        </div>
                      ) : 'N/A'}
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(client.serviceStatus)}`}>
                        {client.serviceStatus || 'Running'}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex">
                        <button
                          type="button"
                          className="btn btn-sm me-2"
                          title="View"
                          onClick={(e) => { e.stopPropagation(); handleView(client); }}
                        >
                          <img src={viewIcon} alt="view Icon" style={{ opacity: 0.6, width: '18px', height: '18px' }} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm me-2"
                          title="Edit"
                          onClick={(e) => { e.stopPropagation(); handleEdit(client); }}
                        >
                          <img src={editIcon} alt="edit Icon" style={{ width: '15px', height: '15px' }} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          title="Delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            setClientToDelete(client);
                            setShowDeleteConfirm(true);
                          }}
                        >
                          <img src={deleteIcon} alt="delete Icon" style={{ width: '14px', height: '14px' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="9" className="text-center py-4">
                  No clients found in {activeTab} matching your search criteria
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Pagination */}
      <div className='d-flex align-items-center justify-content-center'>
        {totalPages > 1 && (
          <nav aria-label="Client pagination" className="pagination-wrapper">
            <ul className="pagination justify-content-center align-items-center">
              {/* First page button */}
              <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                <button
                  type="button"
                  className="page-link"
                  aria-label="First"
                  onClick={() => paginate(1)}
                  disabled={currentPage === 1}
                >
                  «
                </button>
              </li>

              {/* Previous page */}
              <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                <button
                  type="button"
                  className="page-link"
                  aria-label="Previous"
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  ‹
                </button>
              </li>

              {/* Page numbers */}
              {getDisplayedPageNumbers().map((number, index) => (
                <li
                  key={index}
                  className={`page-item ${number === currentPage ? "active" : ""} ${number === "..." ? "disabled" : ""
                    }`}
                >
                  {number === "..." ? (
                    <span className="page-link">…</span>
                  ) : (
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => paginate(number)}
                    >
                      {number}
                    </button>
                  )}
                </li>
              ))}

              {/* Next page */}
              <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                <button
                  type="button"
                  className="page-link"
                  aria-label="Next"
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  ›
                </button>
              </li>

              {/* Last page button */}
              <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                <button
                  type="button"
                  className="page-link"
                  aria-label="Last"
                  onClick={() => paginate(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  »
                </button>
              </li>
            </ul>
          </nav>
        )}
      </div>

      {/* Delete Success Modal */}
      {showDeleteSuccessModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Moved Successfully</h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteSuccessModal(false)}></button>
              </div>
              <div className="modal-body">
                Client moved to ExitClients successfully.
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-success" onClick={() => setShowDeleteSuccessModal(false)}>Done</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global delete/server error */}
      {deleteError && !showDeleteReasonModal && (
        <div className="alert alert-danger mt-2">{deleteError}</div>
      )}

      {selectedClient && (
        <ClientModal
          client={selectedClient}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSave}
          isEditMode={isEditMode}
        />
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && clientToDelete && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteConfirm(false)}></button>
              </div>
              <div className="modal-body">
                <p>Do you want to delete the Client ?</p>
                <p><strong>ID:</strong> {clientToDelete.idNo || clientToDelete.clientId || clientToDelete.id}</p>
                <p><strong>Name:</strong> {clientToDelete.clientName}</p>
                <p><strong>Department:</strong> {clientToDelete.department}</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                <button type="button" className="btn btn-danger" onClick={handleDeleteConfirmProceed}>Yes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Reason Modal */}
      {showDeleteReasonModal && clientToDelete && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-danger">
                <h5 className="modal-title text-white">Reason for Removing Client</h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteReasonModal(false)}></button>
              </div>
              <div className="modal-body">
                {deleteError && <div className="alert alert-danger">{deleteError}</div>}

                <div className="mb-3">
                  <label className="form-label"><strong>Reason</strong></label>
                  <select
                    ref={reasonSelectRef}
                    className={`form-select ${reasonError ? 'is-invalid' : ''}`}
                    value={deleteReasonForm.reasonType}
                    onChange={(e) => {
                      setDeleteReasonForm(prev => ({ ...prev, reasonType: e.target.value }));
                      setReasonError(null);
                    }}
                  >
                    <option value="">Select Reason</option>
                    <option value="Contract Closed">Contract Closed</option>
                    <option value="Contract Terminated">Contract Terminated</option>
                    <option value="Contract Stopped">Contract Stopped</option>
                  </select>
                  {reasonError && <div className="invalid-feedback" style={{ display: 'block' }}>{reasonError}</div>}
                </div>
                <div className="mb-3">
                  <label className="form-label"><strong>Comment (mandatory)</strong></label>
                  <textarea
                    ref={commentRef}
                    className={`form-control ${commentError ? 'is-invalid' : ''}`}
                    rows={4}
                    value={deleteReasonForm.comment}
                    onChange={(e) => {
                      setDeleteReasonForm(prev => ({ ...prev, comment: e.target.value }));
                      setCommentError(null);
                    }}
                  />
                  {commentError && <div className="invalid-feedback" style={{ display: 'block' }}>{commentError}</div>}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteReasonModal(false)}>Cancel</button>
                <button type="button" className="btn btn-danger" onClick={handleDeleteSubmitWithReason}>Remove Client</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}