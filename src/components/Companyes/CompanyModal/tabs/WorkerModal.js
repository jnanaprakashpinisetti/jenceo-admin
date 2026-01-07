import React, { useState, useEffect, useRef } from "react";
import firebaseDB from "../../../../firebase";
import { WORKER_PATHS } from "../../../../utils/dataPaths";

const WorkerModal = ({
  isOpen = false,
  onClose = () => { },
  onSave = () => { },
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
  const [workerId, setWorkerId] = useState("");
  const [workerData, setWorkerData] = useState(null);

  const searchRequestRef = useRef(0);
  const debounceTimerRef = useRef(null);

  const departmentsList = [
    "HomeCare",
    "Housekeeping",
    "Office",
    "Customer",
    "Management",
    "Security",
    "Driving",
    "Technical",
    "Retail",
    "Industrial",
    "Others"
  ];


  const handleWorkerIdChange = (e) => {
    const value = e.target.value.trim();

    setWorkerId(value);

    setFormData(prev => ({
      ...prev,
      workerId: value
    }));

    if (!value) {
      setWorkerPhoto("");
      setWorkerData(null);
      setPhotoLoaded(false);
    }
  };


  // Helper function to extract photo from worker data (FIXED)
  const extractPhotoUrl = (workerData) => {
    return workerData?.employeePhotoUrl ||
      workerData?.employeePhoto ||
      workerData?.photo ||
      "";
  };

  // Load worker data if in edit mode (FIXED)
  useEffect(() => {
    if (!workerId || workerId.length < 4) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const requestId = ++searchRequestRef.current;
      searchWorkerById(workerId, requestId);
    }, 400);

    return () => clearTimeout(debounceTimerRef.current);
  }, [workerId]);




  // Function to search for worker by ID in the global worker database (FIXED)
  const searchWorkerById = async (id, requestId) => {

    let foundWorker = null;

    for (const dept of departmentsList) {
      const ref = firebaseDB.child(`WorkerData/${dept}/Running`);

      // 🔍 1️⃣ Search by workerId
      let snapshot = await ref
        .orderByChild("workerId")
        .equalTo(id)
        .once("value");

      if (requestId !== searchRequestRef.current) return;

      if (!snapshot.exists()) {
        // 🔍 2️⃣ Fallback search by idNo
        snapshot = await ref
          .orderByChild("idNo")
          .equalTo(id)
          .once("value");
      }

      if (requestId !== searchRequestRef.current) return;

      if (snapshot.exists()) {
        const data = snapshot.val();
        foundWorker = data[Object.keys(data)[0]];
        break;
      }
    }

    if (requestId !== searchRequestRef.current) return;

    if (foundWorker) {
      const photo = extractPhotoUrl(foundWorker);


      setWorkerData(foundWorker);
      setWorkerPhoto(photo);
      setPhotoLoaded(true);

      // ✅ Auto-fill form
      setFormData(prev => ({
        ...prev,

        // IDs
        workerId: foundWorker.workerId || foundWorker.idNo || id,

        // Name
        workerName:
          foundWorker.workerName ||
          `${foundWorker.firstName || ""} ${foundWorker.lastName || ""}`.trim(),

        // Salary
        basicSalary: foundWorker.basicSalary || foundWorker.salary || "",

        // Department
        department: foundWorker.department || foundWorker.dept || "",

        // Phones (IMPORTANT FIX)
        workerCell1:
          foundWorker.workerCell1 ||
          foundWorker.mobileNo1 ||
          foundWorker.phone1 ||
          "",

        workerCell2:
          foundWorker.workerCell2 ||
          foundWorker.mobileNo2 ||
          foundWorker.phone2 ||
          "",

        // Dates (IMPORTANT FIX)
        startingDate:
          foundWorker.startingDate ||
          foundWorker.joiningDate ||
          "",

        endingDate: foundWorker.endingDate || "",

        // Contract
        contractAmount: foundWorker.contractAmount || "",
        contractFor: foundWorker.contractFor || "",

        // Supervisor
        supervisorName: foundWorker.supervisorName || "",
        supervisorCell:
          foundWorker.supervisorCell ||
          foundWorker.supervisorMobile ||
          "",

        photo
      }));

    } else {
      console.warn("❌ No worker found with ID:", id);
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
                            console.error("Failed to load photo:", workerPhoto);
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
                    <div className="small-text">
                      {photoLoaded && workerPhoto && (
                        <span className="badge bg-success">Photo loaded</span>
                      )}
                      {photoLoaded && !workerPhoto && (
                        <div className="alert alert-warning small">
                          <i className="bi bi-info-circle me-1"></i>
                          No photo found in database
                        </div>
                      )}
                    </div>
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
                        value={workerId}
                        onChange={handleWorkerIdChange}
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