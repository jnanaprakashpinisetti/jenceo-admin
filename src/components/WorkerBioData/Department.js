// Department.js
import React, { useEffect, useState, useMemo } from "react";
import firebaseDB from "../../firebase";

const Department = ({
  formData,
  errors,
  handleChange,
  handleBlur,
  nextStep,
  setErrors,
}) => {
  const [supervisorData, setSupervisorData] = useState(null);
  const [loadingSupervisor, setLoadingSupervisor] = useState(false);
  
  // Role options based on department
  const roleOptions = {
    "Home Care": [
      "Nursing", "Patient Care", "Care Taker", "Old Age Care", "Baby Care", 
      "Bedside Attender", "Supporting", "Compounder", "Diaper", "Elder Care"
    ],
    "Housekeeping": [
      "Maid", "Cook", "House Keeper", "Chauffeur", "Cleaner", "Gardeen", "Dishwasher"
    ],
    "Office & Administrative": [
      "Computer Operating", "Data Entry", "Office Assistant", "Receptionist",
      "Front Desk Executive", "Admin Assistant", "Office Boy", "Peon", "Office Attendant"
    ],
    "Customer Service": [
      "Tele Calling", "Customer Support", "Telemarketing", "BPO Executive",
      "Call Center Agent", "Customer Care Executive"
    ],
    "Management & Supervision": [
      "Supervisor", "Manager", "Team Leader", "Site Supervisor", "Project Coordinator"
    ],
    "Security": [
      "Security Guard", "Security Supervisor", "Gatekeeper", "Watchman"
    ],
    "Driving & Logistics": [
      "Driving", "Delivery Boy", "Delivery Executive", "Rider", "Driver",
      "Car Driver", "Bike Rider", "Logistics Helper"
    ],
    "Technical & Maintenance": [
      "Electrician", "Plumber", "Carpenter", "Painter", "Mason", "AC Technician",
      "Mechanic", "Maintenance Staff", "House Keeping", "Housekeeping Supervisor"
    ],
    "Retail & Sales": [
      "Sales Boy", "Sales Girl", "Store Helper", "Retail Assistant", "Shop Attendant"
    ],
    "Industrial & Labor": [
      "Labour", "Helper", "Loading Unloading", "Warehouse Helper",
      "Factory Worker", "Production Helper", "Packaging Staff"
    ],
    "Others": []
  };

  // Department options
  const departmentOptions = [
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

  // Auto-generate Employee ID based on department
  const generateEmployeeId = async (department) => {
    if (!department) return "";
    
    // Map department to prefix
    const prefixMap = {
      "Home Care": "JW",
      "Housekeeping": "HKW-",
      "Office & Administrative": "OW-",
      "Customer Service": "CW-",
      "Management & Supervision": "MW-",
      "Security": "SW-",
      "Driving & Logistics": "DW-",
      "Technical & Maintenance": "TW-",
      "Retail & Sales": "RW-",
      "Industrial & Labor": "IW-",
      "Others": "OW-"
    };
    
    const prefix = prefixMap[department] || "JW";
    
    try {
      // Determine which database node to check based on department
      let dbNode = "EmployeeBioData"; // Default for Home Care
      const nodeMap = {
        "Home Care": "EmployeeBioData",
        "Housekeeping": "WorkerData/Housekeeping",
        "Office & Administrative": "WorkerData/Office",
        "Customer Service": "WorkerData/Customer",
        "Management & Supervision": "WorkerData/Management",
        "Security": "WorkerData/Security",
        "Driving & Logistics": "WorkerData/Driving",
        "Technical & Maintenance": "WorkerData/Technical",
        "Retail & Sales": "WorkerData/Retail",
        "Industrial & Labor": "WorkerData/Industrial",
        "Others": "WorkerData/Others"
      };
      
      dbNode = nodeMap[department] || "EmployeeBioData";
      
      // Get existing IDs
      const snapshot = await firebaseDB.child(dbNode).once("value");
      const data = snapshot.val();
      
      if (!data) {
        return `${prefix}01`;
      }
      
      // Extract IDs and find max
      const ids = Object.values(data).map(emp => emp.idNo || emp.employeeId || "").filter(Boolean);
      let maxNum = 0;
      
      ids.forEach(id => {
        const match = id.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxNum) maxNum = num;
        }
      });
      
      const nextNum = maxNum + 1;
      const formattedNum = nextNum.toString().padStart(2, '0');
      
      return `${prefix}${formattedNum}`;
      
    } catch (error) {
      console.error("Error generating employee ID:", error);
      return `${prefix}01`;
    }
  };

  // Fetch supervisor data when supervisorId changes
  const fetchSupervisorData = async (supervisorId) => {
    if (!supervisorId) {
      setSupervisorData(null);
      return;
    }
    
    setLoadingSupervisor(true);
    try {
      // Search in StaffBioData
      const snapshot = await firebaseDB
        .child("StaffBioData")
        .orderByChild("idNo")
        .equalTo(supervisorId)
        .once("value");
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const firstKey = Object.keys(data)[0];
        const supervisor = data[firstKey];
        
        setSupervisorData({
          name: `${supervisor.firstName || ""} ${supervisor.lastName || ""}`.trim(),
          photo: supervisor.employeePhoto || ""
        });
        
        // Auto-fill supervisor name
        handleChange({
          target: {
            name: "supervisorName",
            value: `${supervisor.firstName || ""} ${supervisor.lastName || ""}`.trim()
          }
        });
      } else {
        setSupervisorData(null);
        handleChange({
          target: {
            name: "supervisorName",
            value: ""
          }
        });
      }
    } catch (error) {
      console.error("Error fetching supervisor data:", error);
    } finally {
      setLoadingSupervisor(false);
    }
  };

  // Handle department change
  const handleDepartmentChange = async (e) => {
    const department = e.target.value;
    
    // Update form data
    handleChange(e);
    
    // Clear role when department changes
    handleChange({
      target: {
        name: "role",
        value: ""
      }
    });
    
    // Generate employee ID
    if (department) {
      const generatedId = await generateEmployeeId(department);
      handleChange({
        target: {
          name: "idNo",
          value: generatedId
        }
      });
    }
  };

  // Handle supervisor ID blur
  const handleSupervisorIdBlur = async (e) => {
    const supervisorId = e.target.value;
    if (supervisorId) {
      await fetchSupervisorData(supervisorId);
    }
    handleBlur(e);
  };

  // Set current date for joining date
  useEffect(() => {
    if (!formData.joiningDate) {
      const today = new Date().toISOString().split("T")[0];
      handleChange({
        target: {
          name: "joiningDate",
          value: today
        }
      });
    }
  }, []);

  return (
    <div>
      <div className="form-card-header mb-4">
        <h3 className="text-center">Department & Joining Details</h3>
      </div>
      <hr />
      <div className="row g-3">
        {/* Department */}
        <div className="col-md-6">
          <label htmlFor="department" className="form-label">
            Department <span className="star">*</span>
          </label>
          <select
            className={`form-select ${errors.department ? "is-invalid" : ""}`}
            id="department"
            name="department"
            value={formData.department || ""}
            onChange={handleDepartmentChange}
            onBlur={handleBlur}
          >
            <option value="">Select Department</option>
            {departmentOptions.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
          {errors.department && (
            <div className="invalid-feedback">{errors.department}</div>
          )}
        </div>

        {/* Role */}
        <div className="col-md-6">
          <label htmlFor="role" className="form-label">
            Role <span className="star">*</span>
          </label>
          {formData.department === "Others" ? (
            <input
              type="text"
              className={`form-control ${errors.role ? "is-invalid" : ""}`}
              id="role"
              name="role"
              value={formData.role || ""}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter role"
            />
          ) : (
            <select
              className={`form-select ${errors.role ? "is-invalid" : ""}`}
              id="role"
              name="role"
              value={formData.role || ""}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={!formData.department}
            >
              <option value="">Select Role</option>
              {roleOptions[formData.department]?.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          )}
          {errors.role && (
            <div className="invalid-feedback">{errors.role}</div>
          )}
        </div>

        {/* Employee ID (auto-generated) */}
        <div className="col-md-6">
          <label htmlFor="idNo" className="form-label">
            Employee ID <span className="star">*</span>
          </label>
          <input
            type="text"
            className={`form-control bg-light ${errors.idNo ? "is-invalid" : ""}`}
            id="idNo"
            name="idNo"
            value={formData.idNo || ""}
            readOnly
          />
          <small className="text-muted">Auto-generated based on department</small>
          {errors.idNo && (
            <div className="invalid-feedback">{errors.idNo}</div>
          )}
        </div>

        {/* Joining Date */}
        <div className="col-md-6">
          <label htmlFor="joiningDate" className="form-label">
            Joining Date <span className="star">*</span>
          </label>
          <input
            type="date"
            className={`form-control ${errors.joiningDate ? "is-invalid" : ""}`}
            id="joiningDate"
            name="joiningDate"
            value={formData.joiningDate || ""}
            onChange={handleChange}
            onBlur={handleBlur}
            max={new Date().toISOString().split("T")[0]}
          />
          {errors.joiningDate && (
            <div className="invalid-feedback">{errors.joiningDate}</div>
          )}
        </div>

        {/* Supervisor ID */}
        <div className="col-md-6">
          <label htmlFor="supervisorId" className="form-label">
            Supervisor ID
          </label>
          <input
            type="text"
            className={`form-control ${errors.supervisorId ? "is-invalid" : ""}`}
            id="supervisorId"
            name="supervisorId"
            value={formData.supervisorId || ""}
            onChange={handleChange}
            onBlur={handleSupervisorIdBlur}
            placeholder="Enter Supervisor ID"
          />
          {loadingSupervisor && (
            <small className="text-info">Loading supervisor data...</small>
          )}
          {errors.supervisorId && (
            <div className="invalid-feedback">{errors.supervisorId}</div>
          )}
        </div>

        {/* Supervisor Name (auto-filled) */}
        <div className="col-md-6">
          <label htmlFor="supervisorName" className="form-label">
            Supervisor Name
          </label>
          <input
            type="text"
            className="form-control bg-light"
            id="supervisorName"
            name="supervisorName"
            value={formData.supervisorName || ""}
            readOnly
          />
          {supervisorData?.photo && (
            <div className="mt-2">
              <small>Supervisor Photo:</small>
              <div>
                <img
                  src={supervisorData.photo}
                  alt="Supervisor"
                  style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "5px" }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Department;