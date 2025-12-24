// Timesheet/DisplayTimeSheet/utils/pathHelpers.js
// Single source of truth for timesheet paths

// Employee category paths (for reading)
export const employeeCategoryPaths = {
  "Home Care": "WorkerData/HomeCare/Running",
  "Housekeeping": "WorkerData/Housekeeping/Running",
  "Office & Administrative": "WorkerData/Office/Running",
  "Customer Service": "WorkerData/Customer/Running",
  "Management & Supervision": "WorkerData/Management/Running",
  "Security": "WorkerData/Security/Running",
  "Driving & Logistics": "WorkerData/Driving/Running",
  "Technical & Maintenance": "WorkerData/Technical/Running",
  "Retail & Sales": "WorkerData/Retail/Running",
  "Industrial & Labor": "WorkerData/Industrial/Running",
  "Others": "WorkerData/Others/Running"
};

// Get category path by category name
export const getCategoryPath = (category) => employeeCategoryPaths[category];

// Get all category paths
export const getAllCategoryPaths = () => Object.values(employeeCategoryPaths);

// Get all category names
export const getAllCategories = () => Object.keys(employeeCategoryPaths);

// Check if category exists
export const isValidCategory = (category) => category in employeeCategoryPaths;

// === TIMESHEET SAVING PATHS ===
// These paths save timesheet data within the employee's own node

// Get base employee path
export const empPath = (empId) => `EmployeeBioData/${empId}`;

// Timesheet node path for saving
export const empTimesheetsNode = (empId) => 
  `EmployeeBioData/${empId}/timesheets`;

// Specific timesheet path
export const empTimesheetById = (empId, tsId) => 
  `EmployeeBioData/${empId}/timesheets/${tsId}`;

// Daily entries path for a timesheet
export const empDailyEntriesNode = (empId, tsId) => 
  `EmployeeBioData/${empId}/timesheets/${tsId}/dailyEntries`;

// Specific daily entry path
export const empDailyEntryByDate = (empId, tsId, dateStr) => 
  `EmployeeBioData/${empId}/timesheets/${tsId}/dailyEntries/${dateStr}`;

// Advances path for a timesheet
export const empAdvancesNode = (empId, tsId) => 
  `EmployeeBioData/${empId}/timesheets/${tsId}/advances`;

// Specific advance entry
export const empAdvanceById = (empId, tsId, advanceId) => 
  `EmployeeBioData/${empId}/timesheets/${tsId}/advances/${advanceId}`;

// === LEGACY PATHS (keeping for compatibility) ===
export const empTsNode = (empId, tsId = '') =>
  `EmployeeBioData/${empId}/timesheets${tsId ? `/${tsId}` : ''}`;

export const empTsEntriesNode = (empId, tsId, dateStr = '') =>
  `${empTsNode(empId, tsId)}/dailyEntries${dateStr ? `/${dateStr}` : ''}`;

export const empTsById = empTimesheetById;

export const empEntryById = empDailyEntryByDate;

export const entryNodeByDate = empDailyEntryByDate;

export const advancesNode = empAdvancesNode;

// Helper to get employee data path (for updating employee info)
export const empDataPath = (empId) => `EmployeeBioData/${empId}/employeeData`;

// Helper to check if path is for timesheet saving (vs category reading)
export const isTimesheetSavePath = (path) => 
  path.includes('EmployeeBioData/') && path.includes('/timesheets/');