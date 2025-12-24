// Timesheet/DisplayTimeSheet/index.jsx (updated)
import React from 'react';
import { TimesheetProvider } from './context/TimesheetContext';
import TimesheetLayout from './TimesheetLayout';

// Export components for external use if needed
export { default as TimesheetSummary } from './components/TimesheetSummary';
export { default as DailyEntriesTable } from './components/DailyEntriesTable';
export { default as PreviousTimesheetsTable } from './components/PreviousTimesheetsTable';
export { useTimesheet } from './context/TimesheetContext';

const DisplayTimeSheet = () => {
  return (
    <TimesheetProvider>
      <TimesheetLayout />
    </TimesheetProvider>
  );
};

export default DisplayTimeSheet;