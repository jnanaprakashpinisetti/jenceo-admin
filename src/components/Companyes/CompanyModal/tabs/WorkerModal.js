import React, { useState, useEffect } from "react";
import firebaseDB from "../../../../firebase";
import { WORKER_PATHS } from "../../../../utils/dataPaths";

const WorkerModal = ({ 
  isOpen = false, 
  onClose = () => {},
  onSave = () => {},
  companyData = null,
  currentWorker = null,
  isEditMode = false
}) => {
  const [formData, setFormData] = useState({
    workerId: "",
    workerName: "",
    basicSalary: "",
    department: "",
    workerCell1: "",
    workerCell2: "",
    startingDate: "",
    endingDate: "",
    contractAmount: "",
    contractFor: "",
    supervisorName: "",
    supervisorCell: "",
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchingWorker, setSearchingWorker] = useState(false);

  // Load worker data if in edit mode
  useEffect(() => {
    if (isEditMode && currentWorker) {
      setFormData({
        workerId: currentWorker.workerId || "",
        workerName: currentWorker.workerName || "",
        basicSalary: currentWorker.basicSalary || "",
        department: currentWorker.department || "",
        workerCell1: currentWorker.workerCell1 || "",
        workerCell2: currentWorker.workerCell2 || "",
        startingDate: currentWorker.startingDate || "",
        endingDate: currentWorker.endingDate || "",
        contractAmount: currentWorker.contractAmount || "",
        contractFor: currentWorker.contractFor || "",
        supervisorName: currentWorker.supervisorName || "",
        supervisorCell: currentWorker.supervisorCell || "",
      });
    } else {
      // Reset form when opening in add mode
      setFormData({
        workerId: "",
        workerName: "",
        basicSalary: "",
        department: "",
        workerCell1: "",
        workerCell2: "",
        startingDate: "",
        endingDate: "",
        contractAmount: "",
        contractFor: "",
        supervisorName: "",
        supervisorCell: "",
      });
    }
  }, [currentWorker, isEditMode]);

  // Function to search for worker by ID in the global worker database
  const searchWorkerById = async (workerId) => {
    if (!workerId || workerId.trim() === "") return null;
    
    try {
      setSearchingWorker(true);
      
      // Search across all worker departments
      const departments = Object.keys(WORKER_PATHS);
      
      for (const department of departments) {
        const path = WORKER_PATHS[department];
        const workersRef = firebaseDB.child(path);
        
        // Try searching by workerId first (for WorkerModal created workers)
        let snapshot = await workersRef
          .orderByChild("workerId")
          .equalTo(workerId.trim())
          .once('value');
        
        let data = snapshot.val();
        
        // If not found, try searching by idNo (for WorkerBioDataForm created workers)
        if (!data) {
          snapshot = await workersRef
            .orderByChild("idNo")
            .equalTo(workerId.trim())
            .once('value');
          
          data = snapshot.val();
        }
        
        if (data) {
          const workerKey = Object.keys(data)[0];
          const workerData = { ...data[workerKey], key: workerKey, department: department };
          
          // Map idNo to workerId for compatibility
          if (workerData.idNo && !workerData.workerId) {
            workerData.workerId = workerData.idNo;
          }
          
          // Map firstName/lastName to workerName
          if ((workerData.firstName || workerData.lastName) && !workerData.workerName) {
            workerData.workerName = `${workerData.firstName || ""} ${workerData.lastName || ""}`.trim();
          }
          
          // Map mobileNo1/2 to workerCell1/2
          if (workerData.mobileNo1 && !workerData.workerCell1) {
            workerData.workerCell1 = workerData.mobileNo1;
          }
          if (workerData.mobileNo2 && !workerData.workerCell2) {
            workerData.workerCell2 = workerData.mobileNo2;
          }
          
          // Map joiningDate to startingDate
          if (workerData.joiningDate && !workerData.startingDate) {
            workerData.startingDate = workerData.joiningDate;
          }
          
          return workerData;
        }
      }
      
      return null;
    } catch (error) {
      console.error("Error searching worker:", error);
      return null;
    } finally {
      setSearchingWorker(false);
    }
  };

  const handleChange = async (e) => {
    const { name, value } = e.target;
    
    // Update the field
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
    
    // Auto-populate worker data when Worker ID is entered
    if (name === "workerId" && value && value.trim().length > 3 && !isEditMode) {
      const workerData = await searchWorkerById(value.trim());
      
      if (workerData) {
        // Auto-fill the form with worker data, mapping different field names
        setFormData(prev => ({
          ...prev,
          workerName: workerData.workerName || workerData.firstName || workerData.name || "",
          basicSalary: workerData.basicSalary || "",
          department: workerData.department || "",
          workerCell1: workerData.workerCell1 || workerData.mobileNo1 || "",
          workerCell2: workerData.workerCell2 || workerData.mobileNo2 || "",
          startingDate: workerData.startingDate || workerData.joiningDate || "",
          endingDate: workerData.endingDate || "",
          contractAmount: workerData.contractAmount || "",
          contractFor: workerData.contractFor || "",
          supervisorName: workerData.supervisorName || "",
          supervisorCell: workerData.supervisorCell || "",
          // Also populate the workerId from idNo if needed
          workerId: workerData.workerId || workerData.idNo || value,
        }));
        
        console.log("Worker data auto-populated from global database");
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.workerId?.trim()) newErrors.workerId = "Worker ID is required";
    if (!formData.startingDate) newErrors.startingDate = "Starting Date is required";
    if (!formData.workerCell1?.trim()) newErrors.workerCell1 = "Worker Cell-1 is required";
    if (formData.workerCell1 && !/^\d{10}$/.test(formData.workerCell1)) {
      newErrors.workerCell1 = "Worker Cell-1 must be 10 digits";
    }
    if (formData.supervisorCell && !/^\d{10}$/.test(formData.supervisorCell)) {
      newErrors.supervisorCell = "Supervisor Cell must be 10 digits";
    }
    if (formData.startingDate && formData.endingDate) {
      if (new Date(formData.endingDate) < new Date(formData.startingDate)) {
        newErrors.endingDate = "Ending date cannot be before starting date";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Prepare worker data
      const workerData = {
        ...formData,
        createdAt: isEditMode ? (currentWorker?.createdAt || new Date().toISOString()) : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        companyId: companyData?.companyId || "",
        companyName: companyData?.companyName || "",
      };
      
      // Call onSave with worker data
      await onSave(workerData, isEditMode ? currentWorker.key : null);
      
      // Reset form and close modal
      setFormData({
        workerId: "",
        workerName: "",
        basicSalary: "",
        department: "",
        workerCell1: "",
        workerCell2: "",
        startingDate: "",
        endingDate: "",
        contractAmount: "",
        contractFor: "",
        supervisorName: "",
        supervisorCell: "",
      });
      
      onClose();
    } catch (error) {
      console.error("Error saving worker:", error);
      setErrors({ submit: "Failed to save worker. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.9)" }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">
              {isEditMode ? "Edit Worker" : "Add New Worker"}
            </h5>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              onClick={onClose}
              disabled={isSubmitting}
            />
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {errors.submit && (
                <div className="alert alert-danger">{errors.submit}</div>
              )}
              
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    Worker ID <span className="text-danger">*</span>
                    {searchingWorker && (
                      <span className="ms-2 spinner-border spinner-border-sm text-primary" role="status">
                        <span className="visually-hidden">Searching...</span>
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    name="workerId"
                    value={formData.workerId}
                    onChange={handleChange}
                    className={`form-control ${errors.workerId ? 'is-invalid' : ''}`}
                    placeholder="Enter Worker ID"
                    disabled={isEditMode}
                  />
                  {errors.workerId && (
                    <div className="invalid-feedback">{errors.workerId}</div>
                  )}
                  <small className="small-text text-info">
                    Enter existing Worker ID to auto-populate details (searches both workerId and idNo fields)
                  </small>
                </div>
                
                <div className="col-md-6 mb-3">
                  <label className="form-label">Worker Name</label>
                  <input
                    type="text"
                    name="workerName"
                    value={formData.workerName}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Worker Name"
                    disabled
                  />
                </div>
                
                <div className="col-md-6 mb-3">
                  <label className="form-label">Basic Salary</label>
                  <input
                    type="number"
                    name="basicSalary"
                    value={formData.basicSalary}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Basic Salary"
                    disabled
                  />
                </div>
                
                <div className="col-md-6 mb-3">
                  <label className="form-label">Department</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Department"
                    disabled
                  />
                </div>
                
                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    Worker Cell-1 <span className="text-danger">*</span>
                  </label>
                  <input
                    type="tel"
                    name="workerCell1"
                    value={formData.workerCell1}
                    onChange={handleChange}
                    className={`form-control ${errors.workerCell1 ? 'is-invalid' : ''}`}
                    placeholder="10-digit mobile number"
                    maxLength="10"
                    disabled
                  />
                  {errors.workerCell1 && (
                    <div className="invalid-feedback">{errors.workerCell1}</div>
                  )}
                </div>
                
                <div className="col-md-6 mb-3">
                  <label className="form-label">Worker Cell-2</label>
                  <input
                    type="tel"
                    name="workerCell2"
                    value={formData.workerCell2}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Alternate mobile number"
                    maxLength="10"
                    disabled
                  />
                </div>
                
                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    Starting Date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    name="startingDate"
                    value={formData.startingDate}
                    onChange={handleChange}
                    className={`form-control ${errors.startingDate ? 'is-invalid' : ''}`}
                  />
                  {errors.startingDate && (
                    <div className="invalid-feedback">{errors.startingDate}</div>
                  )}
                </div>
                
                <div className="col-md-6 mb-3">
                  <label className="form-label">Ending Date</label>
                  <input
                    type="date"
                    name="endingDate"
                    value={formData.endingDate}
                    onChange={handleChange}
                    className={`form-control ${errors.endingDate ? 'is-invalid' : ''}`}
                  />
                  {errors.endingDate && (
                    <div className="invalid-feedback">{errors.endingDate}</div>
                  )}
                </div>
                
                <div className="col-md-6 mb-3">
                  <label className="form-label">Service charges</label>
                  <input
                    type="number"
                    name="contractAmount"
                    value={formData.contractAmount}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Service charges"
                  />
                </div>
                
                <div className="col-md-6 mb-3">
                  <label className="form-label">Contract For</label>
                  <input
                    type="text"
                    name="contractFor"
                    value={formData.contractFor}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="e.g., 6 months, 1 year"
                  />
                </div>
                
                <div className="col-md-6 mb-3">
                  <label className="form-label">Supervisor Name</label>
                  <input
                    type="text"
                    name="supervisorName"
                    value={formData.supervisorName}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Supervisor Name"
                  />
                </div>
                
                <div className="col-md-6 mb-3">
                  <label className="form-label">Supervisor Cell</label>
                  <input
                    type="tel"
                    name="supervisorCell"
                    value={formData.supervisorCell}
                    onChange={handleChange}
                    className={`form-control ${errors.supervisorCell ? 'is-invalid' : ''}`}
                    placeholder="10-digit mobile number"
                    maxLength="10"
                  />
                  {errors.supervisorCell && (
                    <div className="invalid-feedback">{errors.supervisorCell}</div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Saving...
                  </>
                ) : (
                  isEditMode ? "Update Worker" : "Add Worker"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default WorkerModal;