// Department.js
import React, { useEffect, useState } from "react";
import firebaseDB from "../../firebase";

const Department = ({
  formData,
  errors,
  handleChange,
  handleBlur,
  nextStep,
  setErrors,
}) => {
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

  // Services based on department
  const services = {
    "Home Care": ["Nurse", "Caregiver", "Nursing Assistant", "Senior Nurse", "Head Nurse"],
    "Housekeeping": ["Cleaner","Cooking", "Cleaning", "Cooking & Cleaning", "Dish Wash", "Cooking & Dishwash", "Cooking & Cleaning & Dishwash", "Housekeeping Assistant"],
    "Office & Administrative": ["Clerk", "Coordinator", "Manager", "Admin Assistant", "Receptionist"],
    "Customer Service": ["CS Representative", "Support Executive", "Team Lead", "Manager"],
    "Management & Supervision": ["Supervisor", "Manager", "Team Lead", "Department Head"],
    "Security": ["Security Guard", "Security Officer", "Security Supervisor", "Security Manager"],
    "Driving & Logistics": ["Driver", "Delivery Executive", "Logistics Coordinator", "Fleet Manager"],
    "Technical & Maintenance": ["Technician", "Electrician", "Plumber", "Maintenance Supervisor"],
    "Retail & Sales": ["Sales Executive", "Store Assistant", "Sales Manager", "Retail Supervisor"],
    "Industrial & Labor": ["Laborer", "Machine Operator", "Production Supervisor", "Factory Worker"],
    "Others": ["General Worker", "Trainee", "Intern", "Contract Worker"]
  };

  // Time slots from 5 AM to 9 PM
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 5; hour <= 21; hour++) {
      const period = hour < 12 ? 'AM' : hour < 24 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const nextHour = hour === 23 ? 0 : hour + 1;
      const nextDisplayHour = nextHour > 12 ? nextHour - 12 : nextHour === 0 ? 12 : nextHour;
      const nextPeriod = nextHour < 12 ? 'AM' : nextHour < 24 ? 'PM' : 'AM';
      
      slots.push(`${displayHour}${period} - ${nextDisplayHour}${nextPeriod}`);
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Auto-generate Client ID based on department
  const generateClientId = async (department) => {
    if (!department) return "";
    
    // Map department to prefix
    const prefixMap = {
      "Home Care": "JC-HC-",
      "Housekeeping": "JC-HK-",
      "Office & Administrative": "JC-OF-",
      "Customer Service": "JC-CS-",
      "Management & Supervision": "JC-MA-",
      "Security": "JC-SE-",
      "Driving & Logistics": "JC-DR-",
      "Technical & Maintenance": "JC-TE-",
      "Retail & Sales": "JC-RE-",
      "Industrial & Labor": "JC-IN-",
      "Others": "JC-OT-"
    };
    
    const prefix = prefixMap[department] || "JC-HC-";
    
    try {
      // Determine which database node to check based on department
      const dbNodeMap = {
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
      
      const dbNode = dbNodeMap[department] || "ClientData/HomeCare/Running";
      
      // Get existing IDs
      const snapshot = await firebaseDB.child(dbNode).once("value");
      const data = snapshot.val();
      
      if (!data) {
        return `${prefix}01`;
      }
      
      // Extract IDs and find max
      const ids = Object.values(data).map(client => client.idNo || "").filter(Boolean);
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
      console.error("Error generating client ID:", error);
      return `${prefix}01`;
    }
  };

  // Handle department change
  const handleDepartmentChange = async (e) => {
    const department = e.target.value;
    
    // Update form data
    handleChange(e);
    
    // Clear service when department changes
    handleChange({
      target: {
        name: "service",
        value: ""
      }
    });
    
    // Generate client ID
    if (department) {
      const generatedId = await generateClientId(department);
      handleChange({
        target: {
          name: "idNo",
          value: generatedId
        }
      });
    }
  };

  // Handle service time slot change
  const handleServiceSlotChange = (e) => {
    const value = e.target.value;
    handleChange(e);
    
    // If custom time is selected, clear the dropdown
    if (value === "custom") {
      handleChange({
        target: {
          name: "serviceSlot",
          value: ""
        }
      });
    }
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
        <h3 className="text-center">Department & Service Details</h3>
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

        {/* Service */}
        <div className="col-md-6">
          <label htmlFor="service" className="form-label">
            Service <span className="star">*</span>
          </label>
          <select
            className={`form-select ${errors.service ? "is-invalid" : ""}`}
            id="service"
            name="service"
            value={formData.service || ""}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={!formData.department}
          >
            <option value="">Select Service</option>
            {services[formData.department]?.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
            <option value="custom">Custom (Specify below)</option>
          </select>
          {errors.service && (
            <div className="invalid-feedback">{errors.service}</div>
          )}
          
          {/* Custom service input */}
          {formData.service === "custom" && (
            <div className="mt-2">
              <input
                type="text"
                className="form-control"
                placeholder="Enter custom service"
                name="customService"
                value={formData.customService || ""}
                onChange={handleChange}
                onBlur={handleBlur}
              />
            </div>
          )}
        </div>

        {/* Client ID (auto-generated) */}
        <div className="col-md-6">
          <label htmlFor="idNo" className="form-label">
            Client ID <span className="star">*</span>
          </label>
          <input
            type="text"
            className={`form-control bg-secondary bg-opacity-50 ${errors.idNo ? "is-invalid" : ""}`}
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

        {/* Service Time Slot */}
        <div className="col-md-6">
          <label htmlFor="serviceSlot" className="form-label">
            Service Time Slot <span className="star">*</span>
          </label>
          <select
            className={`form-select ${errors.serviceSlot ? "is-invalid" : ""}`}
            id="serviceSlot"
            name="serviceSlot"
            value={formData.serviceSlot || ""}
            onChange={handleServiceSlotChange}
            onBlur={handleBlur}
          >
            <option value="">Select Time Slot</option>
            {timeSlots.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
            <option value="custom">Custom Time</option>
          </select>
          
          {/* Custom time input */}
          {(formData.serviceSlot === "custom" || !formData.serviceSlot) && (
            <div className="mt-2">
              <input
                type="text"
                className={`form-control ${errors.serviceSlot && !formData.serviceSlot ? "is-invalid" : ""}`}
                placeholder="e.g., 8:30 AM - 5:30 PM"
                name="customServiceSlot"
                value={formData.customServiceSlot || ""}
                onChange={handleChange}
                onBlur={handleBlur}
              />
            </div>
          )}
          
          {errors.serviceSlot && (
            <div className="invalid-feedback">{errors.serviceSlot}</div>
          )}
        </div>

 

        {/* Additional Notes */}
        <div className="col-md-12">
          <label htmlFor="notes" className="form-label">
            Additional Notes
          </label>
          <textarea
            className="form-control"
            id="notes"
            name="notes"
            value={formData.notes || ""}
            onChange={handleChange}
            onBlur={handleBlur}
            rows="2"
            placeholder="Any special requirements or notes..."
          />
        </div>
      </div>
    </div>
  );
};

export default Department;