// Timesheet/DisplayTimeSheet/hooks/useTimesheetOperations.jsx
import { useState, useCallback } from 'react';
import firebaseDB from '../../../../firebase';
import { useTimesheet } from '../context/TimesheetContext';

export const useTimesheetOperations = () => {
  const {
    selectedEmployee,
    currentTimesheet,
    setCurrentTimesheet,
    setTimesheets,
    toggleModal,
    showToast,
    setIsEditing,
    setCurrentEntry
  } = useTimesheet();

  const [saving, setSaving] = useState(false);

  const handleSaveEntry = useCallback(async (entryData) => {
    if (!selectedEmployee || !currentTimesheet) {
      showToast('error', 'No employee or timesheet selected');
      return;
    }

    setSaving(true);
    try {
      const employeeId = selectedEmployee;
      const timesheetId = currentTimesheet.id;

      // Build the entry data
      const entryToSave = {
        ...entryData,
        employeeId,
        timesheetId,
        lastUpdated: new Date().toISOString(),
      };

      // Save to Firebase
      const entryPath = `EmployeeBioData/${employeeId}/timesheets/${timesheetId}/dailyEntries/${entryData.date}`;
      await firebaseDB.child(entryPath).set(entryToSave);

      // Update local state
      setCurrentTimesheet(prev => ({
        ...prev,
        dailyEntries: {
          ...prev.dailyEntries,
          [entryData.date]: entryToSave
        }
      }));

      // Update timesheets list
      setTimesheets(prev => prev.map(ts => 
        ts.id === timesheetId 
          ? {
              ...ts,
              dailyEntries: {
                ...ts.dailyEntries,
                [entryData.date]: entryToSave
              }
            }
          : ts
      ));

      showToast('success', `Entry saved successfully for ${entryData.date}`);
      
      // Close the modal using toggleModal (not showModal)
      toggleModal('showEntryModal', false);
      setIsEditing(false);
      setCurrentEntry(null);

    } catch (error) {
      console.error('Error saving entry:', error);
      showToast('error', 'Failed to save entry: ' + error.message);
    } finally {
      setSaving(false);
    }
  }, [selectedEmployee, currentTimesheet, setCurrentTimesheet, setTimesheets, toggleModal, showToast, setIsEditing, setCurrentEntry]);

  // Other operations...
  const handleDeleteEntry = useCallback(async (date) => {
    // Delete implementation...
  }, [/* dependencies */]);

  const handleCreateTimesheet = useCallback(async (periodData) => {
    // Create timesheet implementation...
  }, [/* dependencies */]);

  return {
    handleSaveEntry,
    handleDeleteEntry,
    handleCreateTimesheet,
    saving,
  };
};