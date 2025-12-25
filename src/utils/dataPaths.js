// ===== DEPARTMENT → FIREBASE PATH MAP =====

export const CLIENT_PATHS = {
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
  "Others": "ClientData/Others/Running",
};

export const WORKER_PATHS = {
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
  "Others": "WorkerData/Others/Running",
};

// ===== SAFE HELPERS =====

export const getClientPathByDepartment = (dept) =>
  CLIENT_PATHS[dept] || CLIENT_PATHS["Others"];

export const getWorkerPathByDepartment = (dept) =>
  WORKER_PATHS[dept] || WORKER_PATHS["Others"];