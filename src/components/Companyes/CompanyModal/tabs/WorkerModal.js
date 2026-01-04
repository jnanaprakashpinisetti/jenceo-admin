import React, { useState, useEffect } from "react";
import firebaseDB from "../../../../firebase";
import { WORKER_PATHS } from "../../../../utils/dataPaths";

const WorkerModal = ({ 
  isOpen = false, 
  onClose = () => {},
  onSave = () => {},
  companyData = null,
  currentWorker = null,
  isEditMode = false,
  exitMode = false
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
    photo: "",
    status: "active",
    exitRemarks: ""
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchingWorker, setSearchingWorker] = useState(false);
  const [workerPhoto, setWorkerPhoto] = useState("");
  const [photoLoaded, setPhotoLoaded] = useState(false);

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
        photo: currentWorker.photo || "",
        status: currentWorker.status || "active",
        exitRemarks: currentWorker.exitRemarks || ""
      });
      setWorkerPhoto(currentWorker.photo || "");
      setPhotoLoaded(true);
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
        photo: "",
        status: "active",
        exitRemarks: ""
      });
      setWorkerPhoto("");
      setPhotoLoaded(false);
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
          
          // Get photo if available
          if (workerData.photo) {
            workerData.photo = workerData.photo;
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
          photo: workerData.photo || "",
          // Also populate the workerId from idNo if needed
          workerId: workerData.workerId || workerData.idNo || value,
        }));
        
        // Set the photo URL if available
        if (workerData.photo) {
          setWorkerPhoto(workerData.photo);
        } else {
          setWorkerPhoto("");
        }
        
        setPhotoLoaded(true);
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
    
    if (exitMode && !formData.exitRemarks?.trim()) {
      newErrors.exitRemarks = "Exit remarks are required";
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
        exitDate: exitMode ? new Date().toISOString() : (currentWorker?.exitDate || ""),
        exitBy: exitMode ? "Admin" : (currentWorker?.exitBy || ""),
        restoredBy: exitMode ? "" : (currentWorker?.restoredBy || ""),
        restoredDate: exitMode ? "" : (currentWorker?.restoredDate || ""),
        createdAt: isEditMode ? (currentWorker?.createdAt || new Date().toISOString()) : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        companyId: companyData?.companyId || "",
        companyName: companyData?.companyName || "",
      };
      
      if (exitMode) {
        workerData.status = "exited";
      }
      
      // Call onSave with worker data
      await onSave(workerData, isEditMode ? currentWorker.key : null, exitMode);
      
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
        photo: "",
        status: "active",
        exitRemarks: ""
      });
      setWorkerPhoto("");
      setPhotoLoaded(false);
      
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
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <div className={`modal-header ${exitMode ? 'bg-danger' : 'bg-primary'} text-white`}>
            <h5 className="modal-title">
              {exitMode ? "Exit Worker" : (isEditMode ? "Edit Worker" : "Add New Worker")}
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
                {/* Photo Display Section */}
                <div className="col-md-3 mb-4">
                  <div className="text-center">
                    <div className="mb-3">
                      {workerPhoto ? (
                        <img 
                          src={workerPhoto} 
                          alt="Worker" 
                          className="img-fluid rounded-circle border"
                          style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                            e.target.parentNode.innerHTML = `
                              <div class="rounded-circle border d-flex align-items-center justify-content-center"
                                style="width: 150px; height: 150px; margin: 0 auto; background-color: #f8f9fa">
                                <i class="bi bi-person text-muted" style="font-size: 4rem"></i>
                              </div>
                            `;
                          }}
                        />
                      ) : (
                        <div className="rounded-circle border d-flex align-items-center justify-content-center"
                          style={{ width: '150px', height: '150px', margin: '0 auto', backgroundColor: '#f8f9fa' }}>
                          <i className="bi bi-person text-muted" style={{ fontSize: '4rem' }}></i>
                        </div>
                      )}
                    </div>
                    {photoLoaded && !workerPhoto && (
                      <div className="alert alert-warning small">
                        <i className="bi bi-info-circle me-1"></i>
                        No photo available in database
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Form Fields */}
                <div className="col-md-9">
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
                        disabled={isEditMode || exitMode}
                      />
                      {errors.workerId && (
                        <div className="invalid-feedback">{errors.workerId}</div>
                      )}
                      <small className="small-text text-info">
                        Enter existing Worker ID to auto-populate details from database
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
                    
                    {/* Exit Remarks Section */}
                    {exitMode && (
                      <div className="col-12 mb-3">
                        <label className="form-label">
                          Exit Remarks <span className="text-danger">*</span>
                        </label>
                        <textarea
                          name="exitRemarks"
                          value={formData.exitRemarks}
                          onChange={handleChange}
                          className={`form-control ${errors.exitRemarks ? 'is-invalid' : ''}`}
                          placeholder="Enter reason for exit (e.g., Contract completed, Resigned, Transferred, etc.)"
                          rows="3"
                        />
                        {errors.exitRemarks && (
                          <div className="invalid-feedback">{errors.exitRemarks}</div>
                        )}
                      </div>
                    )}
                  </div>
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
                className={`btn ${exitMode ? 'btn-danger' : 'btn-primary'}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    {exitMode ? 'Exiting...' : (isEditMode ? 'Updating...' : 'Adding...')}
                  </>
                ) : (
                  exitMode ? 'Exit Worker' : (isEditMode ? 'Update Worker' : 'Add Worker')
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