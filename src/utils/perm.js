// utils/perm.js
export const hasPerm = (user, componentName, action = "view") => {
  if (!user) return false;
  
  // Admin has all permissions
  if (user.role === 'admin') return true;
  
  const permissions = user.permissions || {};
  const componentPerms = permissions[componentName];
  
  if (!componentPerms) return false;
  
  // Handle different permission formats
  if (typeof componentPerms === 'boolean') {
    return componentPerms;
  }
  
  if (typeof componentPerms === 'object') {
    // Check for view/read permissions
    if (action === 'view') {
      return componentPerms.view === true || componentPerms.read === true;
    }
    // Check for specific action
    return componentPerms[action] === true;
  }
  
  return false;
};

// Get all accessible routes for a user
export const getAccessibleRoutes = (user) => {
  if (!user) return [];
  
  const allRoutes = [
    { key: 'Dashboard', path: '/' },
    { key: 'Investments', path: 'Investments' },
    { key: 'Staff', path: 'StaffData' },
    { key: 'Staff', path: 'ExistingStaff' },
    { key: 'Workers Data', path: 'WorkersData' },
    { key: 'Workers Data', path: 'ExistingEmployees' },
    { key: 'Workers Data', path: 'WorkerCallsData' },
    { key: 'Workers Data', path: 'WorkerCallDelete' },
    { key: 'Workers Data', path: 'EmployeeAggrement' },
    { key: 'Client Data', path: 'ClientInfo' },
    { key: 'Client Data', path: 'ClientExit' },
    { key: 'Enquiries', path: 'Enquiry' },
    { key: 'Enquiries', path: 'EnquiryExit' },
    { key: 'Hospital List', path: 'HospitalList' },
    { key: 'Hospital List', path: 'HospitalDeleteList' },
    { key: 'Expenses', path: 'Expenses' },
    { key: 'Expenses', path: 'ExpenceDelete' },
    { key: 'Task', path: 'Task' },
    { key: 'Admin', path: 'Admin' },
    { key: 'Accounts', path: 'Accounts' }
  ];
  
  return allRoutes.filter(route => hasPerm(user, route.key));
};