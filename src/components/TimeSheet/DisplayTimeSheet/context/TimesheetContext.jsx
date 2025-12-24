// Timesheet/DisplayTimeSheet/context/TimesheetContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';

const TimesheetContext = createContext();

export const useTimesheet = () => {
  const context = useContext(TimesheetContext);
  if (!context) {
    throw new Error('useTimesheet must be used within TimesheetProvider');
  }
  return context;
};

export const TimesheetProvider = ({ children }) => {
  // Main state objects
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [currentTimesheet, setCurrentTimesheet] = useState(null);
  const [timesheets, setTimesheets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showClarifyReplyModal, setShowClarifyReplyModal] = useState(false);
  const [showRejectMsgModal, setShowRejectMsgModal] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [showReadOnlyModal, setShowReadOnlyModal] = useState(false);
  
  // Entry states
  const [isEditing, setIsEditing] = useState(false);
  const [currentEntry, setCurrentEntry] = useState(null);
  
  // Other states
  const [dailyEntries, setDailyEntries] = useState([]);
  const [selectedEntries, setSelectedEntries] = useState([]);
  const [previousTimesheets, setPreviousTimesheets] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [clarifyText, setClarifyText] = useState('');
  const [clarifyThread, setClarifyThread] = useState([]);
  const [rejectMsg, setRejectMsg] = useState(null);
  const [duplicateEntries, setDuplicateEntries] = useState([]);
  const [prevTsToDelete, setPrevTsToDelete] = useState(null);
  const [assignTo, setAssignTo] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [useDateRange, setUseDateRange] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSubmittedError, setShowSubmittedError] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  
  // Toast notification
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  // Modal toggle function
  const toggleModal = useCallback((modalName, show) => {
    switch (modalName) {
      case 'showEntryModal':
        setShowEntryModal(show);
        break;
      case 'showConfirmModal':
        setShowConfirmModal(show);
        break;
      case 'showDeleteModal':
        setShowDeleteModal(show);
        break;
      case 'showAssignModal':
        setShowAssignModal(show);
        break;
      case 'showClarifyReplyModal':
        setShowClarifyReplyModal(show);
        break;
      case 'showRejectMsgModal':
        setShowRejectMsgModal(show);
        break;
      case 'showDuplicateWarning':
        setShowDuplicateWarning(show);
        break;
      case 'showReadOnlyModal':
        setShowReadOnlyModal(show);
        break;
      default:
        console.warn(`Unknown modal: ${modalName}`);
    }
  }, []);

  // Toast notification function
  const showToast = useCallback((type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => {
      setToast({ show: false, type: '', message: '' });
    }, 3000);
  }, []);

  // Load timesheet function
  const loadTimesheet = async () => {
    if (!selectedEmployee) return;
    
    setLoading(true);
    try {
      // Implement actual timesheet loading logic here
      console.log(`Loading timesheet for employee: ${selectedEmployee}`);
      // Example: const fetchedTimesheet = await fetchTimesheetData(selectedEmployee);
      setLoading(false);
    } catch (error) {
      console.error('Error loading timesheet:', error);
      showToast('error', 'Failed to load timesheet');
      setLoading(false);
    }
  };

  const value = {
    // State
    selectedEmployee,
    currentTimesheet,
    timesheets,
    employees,
    clients,
    loading,
    
    // Modal states
    showEntryModal,
    showConfirmModal,
    showDeleteModal,
    showAssignModal,
    showClarifyReplyModal,
    showRejectMsgModal,
    showDuplicateWarning,
    showReadOnlyModal,
    
    // Entry states
    isEditing,
    currentEntry,
    
    // Other states
    dailyEntries,
    selectedEntries,
    previousTimesheets,
    advances,
    clarifyText,
    clarifyThread,
    rejectMsg,
    duplicateEntries,
    prevTsToDelete,
    assignTo,
    userSearch,
    selectedMonth,
    startDate,
    endDate,
    useDateRange,
    isSaving,
    hasUnsavedChanges,
    showSubmittedError,
    isReadOnly,
    toast,
    
    // Setters
    setSelectedEmployee,
    setCurrentTimesheet,
    setTimesheets,
    setEmployees,
    setClients,
    setLoading,
    setIsEditing,
    setCurrentEntry,
    setDailyEntries,
    setSelectedEntries,
    setPreviousTimesheets,
    setAdvances,
    setClarifyText,
    setClarifyThread,
    setRejectMsg,
    setDuplicateEntries,
    setPrevTsToDelete,
    setAssignTo,
    setUserSearch,
    setSelectedMonth,
    setStartDate,
    setEndDate,
    setUseDateRange,
    setIsSaving,
    setHasUnsavedChanges,
    setShowSubmittedError,
    setIsReadOnly,
    
    // Functions
    loadTimesheet,
    toggleModal,
    showToast,
  };
  
  return (
    <TimesheetContext.Provider value={value}>
      {children}
    </TimesheetContext.Provider>
  );
};