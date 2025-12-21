import React, { useState, useEffect } from "react";

const WorkersTab = ({
  formData,
  editMode,
  handleChange,
  removeWorker,
  addWorker,
  usersMap,
  client,
  effectiveUserName,
  formatDDMMYY,
  formatTime12h,
  formatINR,
  updateWorker,
}) => {
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [newWorkerData, setNewWorkerData] = useState({
    workerIdNo: "",
    cName: "",
    basicSalary: "",
    mobile1: "",
    mobile2: "",
    startingDate: new Date().toISOString().split('T')[0],
    endingDate: "",
    totalDays: "",
    remarks: "",
    extraAmount: "0",
    totalAmount: ""
  });
  const [isLoadingWorker, setIsLoadingWorker] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  const resolveAddedByFromUsers = (obj, users) => {
    if (!obj || !users) return effectiveUserName || "System";
    
    const candidateIds = [
      obj.user_key, obj.userKey, obj.userId, obj.uid,
      obj.addedById, obj.createdById, obj.addedByUid, obj.createdByUid,
      obj.key, obj.ownerId
    ].filter(Boolean);
    
    for (const id of candidateIds) {
      if (users[id]) {
        const u = users[id];
        const name = u.name || u.displayName || u.username || u.email || "";
        if (name) return String(name).trim().replace(/@.*/, "");
      }
    }
    
    return effectiveUserName || "System";
  };

  const resolveUserName = (obj, fallback) => {
    if (!obj) return fallback || effectiveUserName || "System";
    
    const tryKeys = [
      "addedByName", "addedBy", "userName", "username", "createdByName", "createdBy",
      "enteredBy", "enteredByName", "created_user", "updatedBy", "ownerName",
    ];
    
    for (const k of tryKeys) {
      const v = obj[k];
      if (v && String(v).trim()) return String(v).trim().replace(/@.*/, "");
    }
    
    const u = obj.user;
    if (u) {
      const tryUser = [u.name, u.displayName, u.username, u.email];
      for (const t of tryUser) {
        if (t && String(t).trim()) return String(t).trim().replace(/@.*/, "");
      }
    }
    
    return fallback || effectiveUserName || "System";
  };

  const fetchWorkerData = async (idNo) => {
    if (!idNo || idNo.length < 2) return;
    
    setIsLoadingWorker(true);
    try {
      const response = await fetch(`/api/EmployeeBioData/key/${idNo}`);
      
      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const workerData = await response.json();
          
          if (workerData) {
            const fullName = `${workerData.firstName || ""} ${workerData.lastName || ""}`.trim();
            const basicSalary = workerData.basicSalary || "";
            const mobile1 = workerData.mobile || workerData.phone || workerData.contact || "";
            const extraAmount = newWorkerData.extraAmount || "0";
            const totalAmount = (parseFloat(basicSalary) || 0) + (parseFloat(extraAmount) || 0);
            
            setNewWorkerData(prev => ({
              ...prev,
              cName: fullName || prev.cName,
              basicSalary: basicSalary || prev.basicSalary,
              mobile1: mobile1 || prev.mobile1,
              totalAmount: totalAmount.toString(),
            }));
          }
        } else {
          console.log("Worker API returned non-JSON response");
          const workers = formData.workers || [];
          const localWorkerData = workers.find(w => w.workerIdNo === idNo);
          if (localWorkerData) {
            setNewWorkerData(prev => ({
              ...prev,
              cName: localWorkerData.cName || prev.cName,
              basicSalary: localWorkerData.basicSalary || prev.basicSalary,
              mobile1: localWorkerData.mobile1 || prev.mobile1,
            }));
          }
        }
      } else {
        console.log("Worker not found with ID:", idNo);
      }
    } catch (error) {
      console.log("Error fetching worker data:", error);
      const workers = formData.workers || [];
      const localWorkerData = workers.find(w => w.workerIdNo === idNo);
      if (localWorkerData) {
        setNewWorkerData(prev => ({
          ...prev,
          cName: localWorkerData.cName || prev.cName,
          basicSalary: localWorkerData.basicSalary || prev.basicSalary,
          mobile1: localWorkerData.mobile1 || prev.mobile1,
        }));
      }
    } finally {
      setIsLoadingWorker(false);
    }
  };

  const calculateTotalDays = (startDate, endDate) => {
    if (!startDate || !endDate) return "";
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) return "0";
    
    const timeDiff = end.getTime() - start.getTime();
    const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    
    return dayDiff.toString();
  };

  const isWorkerCompleted = (worker) => {
    if (!worker.endingDate) return false;
    const endingDate = new Date(worker.endingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return endingDate < today;
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (newWorkerData.workerIdNo && newWorkerData.workerIdNo.length >= 2) {
        fetchWorkerData(newWorkerData.workerIdNo);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [newWorkerData.workerIdNo]);

  useEffect(() => {
    const basic = parseFloat(newWorkerData.basicSalary) || 0;
    const extra = parseFloat(newWorkerData.extraAmount) || 0;
    const total = basic + extra;
    
    setNewWorkerData(prev => ({
      ...prev,
      totalAmount: total.toString()
    }));
  }, [newWorkerData.basicSalary, newWorkerData.extraAmount]);

  useEffect(() => {
    if (newWorkerData.startingDate && newWorkerData.endingDate) {
      const totalDays = calculateTotalDays(newWorkerData.startingDate, newWorkerData.endingDate);
      setNewWorkerData(prev => ({
        ...prev,
        totalDays
      }));
    }
  }, [newWorkerData.startingDate, newWorkerData.endingDate]);

  const handleNewWorkerChange = (e) => {
    const { name, value } = e.target;
    setNewWorkerData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const validateWorkerData = () => {
    const errors = {};
    
    if (!newWorkerData.workerIdNo?.trim()) {
      errors.workerIdNo = "Worker ID is required";
    }
    
    if (!newWorkerData.cName?.trim()) {
      errors.cName = "Name is required";
    }
    
    if (!newWorkerData.basicSalary || parseFloat(newWorkerData.basicSalary) <= 0) {
      errors.basicSalary = "Valid basic salary is required";
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddWorker = () => {
    if (!validateWorkerData()) {
      alert("Please fix the validation errors");
      return;
    }
    
    const totalDays = newWorkerData.totalDays || 
      (newWorkerData.startingDate && newWorkerData.endingDate 
        ? calculateTotalDays(newWorkerData.startingDate, newWorkerData.endingDate) 
        : "");
    
    // Create the complete worker object
    const worker = {
      id: Date.now(), // Always use new ID
      workerIdNo: newWorkerData.workerIdNo,
      cName: newWorkerData.cName,
      basicSalary: newWorkerData.basicSalary,
      mobile1: newWorkerData.mobile1 || "",
      mobile2: newWorkerData.mobile2 || "",
      startingDate: newWorkerData.startingDate,
      endingDate: newWorkerData.endingDate || "",
      totalDays: totalDays,
      remarks: newWorkerData.remarks || "",
      extraAmount: newWorkerData.extraAmount || "0",
      totalAmount: newWorkerData.totalAmount || newWorkerData.basicSalary,
      addedById: null,
      addedByName: effectiveUserName,
      addedAt: new Date().toISOString(),
    };
    
    // Handle both ADD and EDIT
    if (editingIndex !== null) {
      // UPDATE existing worker
      const updatedWorkers = [...(formData.workers || [])];
      updatedWorkers[editingIndex] = worker;
      handleChange({
        target: {
          name: 'workers',
          value: updatedWorkers
        }
      });
    } else {
      // ADD new worker
      const updatedWorkers = [...(formData.workers || []), worker];
      handleChange({
        target: {
          name: 'workers',
          value: updatedWorkers
        }
      });
    }
    
    handleModalClose();
  };

  const handleEditWorker = (index) => {
    const workers = formData.workers || [];
    if (index >= 0 && index < workers.length) {
      const worker = workers[index];
      setNewWorkerData({
        workerIdNo: worker.workerIdNo || "",
        cName: worker.cName || "",
        basicSalary: worker.basicSalary || "",
        mobile1: worker.mobile1 || "",
        mobile2: worker.mobile2 || "",
        startingDate: worker.startingDate || new Date().toISOString().split('T')[0],
        endingDate: worker.endingDate || "",
        totalDays: worker.totalDays || "",
        remarks: worker.remarks || "",
        extraAmount: worker.extraAmount || "0",
        totalAmount: worker.totalAmount || worker.basicSalary || ""
      });
      setEditingIndex(index);
      setValidationErrors({});
      setShowWorkerModal(true);
    }
  };

  const handleRemoveWorker = (index) => {
    if (typeof removeWorker === 'function') {
      removeWorker(index);
    } else {
      // Fallback if removeWorker is not provided
      const updatedWorkers = (formData.workers || []).filter((_, i) => i !== index);
      handleChange({
        target: {
          name: 'workers',
          value: updatedWorkers
        }
      });
    }
  };

  const handleModalClose = () => {
    setShowWorkerModal(false);
    setEditingIndex(null);
    setValidationErrors({});
    setNewWorkerData({
      workerIdNo: "",
      cName: "",
      basicSalary: "",
      mobile1: "",
      mobile2: "",
      startingDate: new Date().toISOString().split('T')[0],
      endingDate: "",
      totalDays: "",
      remarks: "",
      extraAmount: "0",
      totalAmount: ""
    });
  };

  const workers = formData.workers || [];

  // Calculate totals
  const totalBasicSalary = workers.reduce((sum, w) => sum + (Number(w.basicSalary) || 0), 0);
  const totalExtraAmount = workers.reduce((sum, w) => sum + (Number(w.extraAmount) || 0), 0);
  const totalAmount = workers.reduce((sum, w) => sum + (Number(w.totalAmount) || (Number(w.basicSalary) || 0) + (Number(w.extraAmount) || 0)), 0);
  const totalDays = workers.reduce((sum, w) => sum + (Number(w.totalDays) || 0), 0);

  // Sort workers in reverse order
  const sortedWorkers = [...workers].reverse();

  return (
    <div>
      {/* Stats Overview Cards */}
      <div className="row mb-4">
        <div className="col-md-3 col-sm-6 mb-3">
          <div className="card text-white shadow border-0" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-white-50 mb-1">Total Workers</h6>
                  <h4 className="mb-0">{workers.length}</h4>
                </div>
                <div className="icon-circle" style={{backgroundColor: 'rgba(255,255,255,0.2)'}}>
                  <i className="bi bi-people text-white"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-3 col-sm-6 mb-3">
          <div className="card text-white shadow border-0" style={{background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'}}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-white-50 mb-1">Total Salary</h6>
                  <h4 className="mb-0">
                    {formatINR(totalAmount)}
                  </h4>
                </div>
                <div className="icon-circle" style={{backgroundColor: 'rgba(255,255,255,0.2)'}}>
                  <i className="bi bi-wallet2 text-white"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-3 col-sm-6 mb-3">
          <div className="card text-white shadow border-0" style={{background: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)'}}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-white-50 mb-1">Basic Salary</h6>
                  <h4 className="mb-0">
                    {formatINR(totalBasicSalary)}
                  </h4>
                </div>
                <div className="icon-circle" style={{backgroundColor: 'rgba(255,255,255,0.2)'}}>
                  <i className="bi bi-cash-coin text-white"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-3 col-sm-6 mb-3">
          <div className="card text-white shadow border-0" style={{background: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)'}}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-white-50 mb-1">Total Days</h6>
                  <h4 className="mb-0">
                    {totalDays}
                  </h4>
                </div>
                <div className="icon-circle" style={{backgroundColor: 'rgba(255,255,255,0.2)'}}>
                  <i className="bi bi-calendar-day text-white"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      {editMode && (
        <div className="row mb-4">
          <div className="col-md-12">
            <button 
              className="btn btn-primary btn-lg w-100 d-flex align-items-center justify-content-center"
              onClick={() => {
                setEditingIndex(null);
                setShowWorkerModal(true);
              }}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Add New Worker
            </button>
          </div>
        </div>
      )}

      {/* Workers Table - Tabs Layout */}
      <div className="card shadow-sm border-light">
        <div className="card-header bg-light">
          <ul className="nav nav-tabs card-header-tabs" role="tablist">
            <li className="nav-item" role="presentation">
              <button 
                className="nav-link active" 
                data-bs-toggle="tab" 
                data-bs-target="#all-workers"
                type="button"
              >
                <i className="bi bi-people me-1"></i>
                All Workers ({workers.length})
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button 
                className="nav-link" 
                data-bs-toggle="tab" 
                data-bs-target="#active-workers"
                type="button"
              >
                <i className="bi bi-person-check me-1"></i>
                Active Workers ({workers.filter(w => !isWorkerCompleted(w)).length})
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button 
                className="nav-link" 
                data-bs-toggle="tab" 
                data-bs-target="#completed"
                type="button"
              >
                <i className="bi bi-person-x me-1"></i>
                Completed ({workers.filter(isWorkerCompleted).length})
              </button>
            </li>
          </ul>
        </div>
        
        <div className="card-body">
          <div className="tab-content">
            {/* All Workers Tab - FIXED: Pure card layout */}
            <div className="tab-pane fade show active" id="all-workers">
              {workers.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-people text-muted" style={{ fontSize: '3rem' }}></i>
                  <h5 className="mt-3 text-muted">No Workers Yet</h5>
                  <p className="text-muted">Start by adding your first worker</p>
                  {editMode && (
                    <button 
                      className="btn btn-primary mt-2"
                      onClick={() => setShowWorkerModal(true)}
                    >
                      <i className="bi bi-plus-circle me-1"></i>
                      Add First Worker
                    </button>
                  )}
                </div>
              ) : (
                <div className="row g-3">
                  {sortedWorkers.map((w, idx) => {
                    const originalIndex = workers.length - 1 - idx;
                    const addedByDisplay = w.addedByName || 
                      resolveUserName(w) ||
                      resolveAddedByFromUsers(w, usersMap) ||
                      effectiveUserName || 
                      "System";

                    const addedAtDisplay = w.addedAt || w.createdAt || w.startingDate || new Date().toISOString();
                    const totalAmount = w.totalAmount || 
                      ((parseFloat(w.basicSalary) || 0) + (parseFloat(w.extraAmount) || 0));
                    const completed = isWorkerCompleted(w);
                    const isActive = !w.endingDate || new Date(w.endingDate) > new Date();

                    return (
                      <div key={w.id || idx} className="col-md-6 col-lg-4">
                        <div className={`card h-100 border ${completed ? 'border-secondary' : isActive ? 'border-success' : 'border-warning'} shadow-sm hover-lift`}>
                          <div className="card-header d-flex justify-content-between align-items-center py-2" 
                               style={{ 
                                 background: completed ? 'linear-gradient(135deg, #6c757d 0%, #495057 100%)' : 
                                         isActive ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' :
                                         'linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)',
                                 color: 'white'
                               }}>
                            <div className="d-flex align-items-center gap-2">
                              <span className="badge bg-dark">#{originalIndex + 1}</span>
                              {completed ? (
                                <span className="badge bg-dark">
                                  <i className="bi bi-person-x me-1"></i>
                                  Completed
                                </span>
                              ) : isActive ? (
                                <span className="badge bg-light text-dark">
                                  <i className="bi bi-person-check me-1"></i>
                                  Active
                                </span>
                              ) : (
                                <span className="badge bg-warning text-dark">
                                  <i className="bi bi-clock me-1"></i>
                                  Upcoming
                                </span>
                              )}
                            </div>
                            {editMode && (
                              <button 
                                className="btn btn-sm btn-outline-light"
                                onClick={() => handleRemoveWorker(originalIndex)}
                                title="Remove worker"
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            )}
                          </div>
                          
                          <div className="card-body p-3">
                            {/* Worker ID and Name */}
                            <div className="row g-2 mb-3">
                              <div className="col-6">
                                <small className="text-muted d-block">ID No</small>
                                <div className="fw-semibold text-primary">
                                  {w.workerIdNo || "—"}
                                </div>
                              </div>
                              <div className="col-6">
                                <small className="text-muted d-block">Name</small>
                                <h6 className="text-dark mb-0">
                                  {w.cName || "—"}
                                </h6>
                              </div>
                            </div>
                            
                            <hr className="my-2" />
                            
                            {/* Salary Information */}
                            <div className="row g-2 mb-3">
                              <div className="col-6">
                                <small className="text-muted d-block">Basic Salary</small>
                                <h6 className="text-success mb-0">
                                  {formatINR(w.basicSalary)}
                                </h6>
                              </div>
                              <div className="col-6">
                                <small className="text-muted d-block">Extra Amount</small>
                                <h6 className="text-warning mb-0">
                                  {formatINR(w.extraAmount)}
                                </h6>
                              </div>
                            </div>
                            
                            <div className="row g-2 mb-3">
                              <div className="col-12">
                                <small className="text-muted d-block">Total Amount</small>
                                <h5 className="text-primary mb-0">
                                  {formatINR(totalAmount)}
                                </h5>
                              </div>
                            </div>
                            
                            <hr className="my-2" />
                            
                            {/* Contact Information */}
                            <div className="row g-2 mb-3">
                              <div className="col-6">
                                <small className="text-muted d-block">Mobile-1</small>
                                <div className="fw-semibold">
                                  <a href={`tel:${w.mobile1}`} className="text-decoration-none text-dark">
                                    {w.mobile1 || "—"}
                                  </a>
                                </div>
                              </div>
                              <div className="col-6">
                                <small className="text-muted d-block">Mobile-2</small>
                                <div className="fw-semibold">
                                  {w.mobile2 ? (
                                    <a href={`tel:${w.mobile2}`} className="text-decoration-none text-dark">
                                      {w.mobile2}
                                    </a>
                                  ) : "—"}
                                </div>
                              </div>
                            </div>
                            
                            <hr className="my-2" />
                            
                            {/* Date Information */}
                            <div className="mb-3">
                              <small className="text-muted d-block mb-2">Work Period</small>
                              <div className="d-flex justify-content-between align-items-center bg-light p-2 rounded">
                                <div>
                                  <small className="text-muted d-block">From</small>
                                  <div className="small fw-semibold">
                                    {w.startingDate ? formatDDMMYY(w.startingDate) : "—"}
                                  </div>
                                </div>
                                <div className="mx-2">
                                  <i className="bi bi-arrow-right text-muted"></i>
                                </div>
                                <div>
                                  <small className="text-muted d-block">To</small>
                                  <div className="small fw-semibold">
                                    {w.endingDate ? formatDDMMYY(w.endingDate) : "—"}
                                  </div>
                                </div>
                                <div className="vr mx-2"></div>
                                <div>
                                  <small className="text-muted d-block">Days</small>
                                  <div className="small fw-semibold text-info">
                                    {w.totalDays || "—"}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Remarks */}
                            {w.remarks && (
                              <div className="mt-3 pt-2 border-top">
                                <small className="text-muted d-block">Remarks</small>
                                <div className="small text-muted bg-light p-2 rounded mt-1" 
                                     style={{maxHeight: '80px', overflowY: 'auto'}}>
                                  {w.remarks}
                                </div>
                              </div>
                            )}
                            
                            <hr className="my-2" />
                            
                            {/* Added By Information */}
                            <div className="mt-2 pt-2">
                              <small className="text-muted d-flex align-items-center">
                                <i className="bi bi-person-circle me-1"></i>
                                <span>Added by: <strong className="text-dark">{addedByDisplay}</strong></span>
                              </small>
                              <small className="text-muted d-flex align-items-center mt-1">
                                <i className="bi bi-clock me-1"></i>
                                <span>{formatDDMMYY(addedAtDisplay)} {formatTime12h(addedAtDisplay)}</span>
                              </small>
                            </div>
                          </div>
                          
                          {editMode && (
                            <div className="card-footer bg-white py-2 border-top">
                              <div className="d-flex justify-content-between align-items-center w-100">
                                <small className="text-muted">
                                  {editMode ? "Click edit to modify" : "View only"}
                                </small>
                                <button 
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => handleEditWorker(originalIndex)}
                                >
                                  <i className="bi bi-pencil me-1"></i> Edit
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Active Workers Tab - Table view */}
            <div className="tab-pane fade" id="active-workers">
              {workers.filter(w => !isWorkerCompleted(w)).length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-person-check text-muted" style={{ fontSize: '3rem' }}></i>
                  <h5 className="mt-3 text-muted">No Active Workers</h5>
                  {editMode && (
                    <button 
                      className="btn btn-primary mt-2"
                      onClick={() => setShowWorkerModal(true)}
                    >
                      <i className="bi bi-plus-circle me-1"></i>
                      Add Worker
                    </button>
                  )}
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover table-striped">
                    <thead className="table-primary">
                      <tr>
                        <th>#</th>
                        <th>ID No</th>
                        <th>Name</th>
                        <th>Basic Salary</th>
                        <th>Total Amount</th>
                        <th>Work Period</th>
                        <th>Total Days</th>
                        <th>Remarks</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workers.filter(w => !isWorkerCompleted(w)).map((w, idx) => (
                        <tr key={idx} className="align-middle">
                          <td>{idx + 1}</td>
                          <td><strong>{w.workerIdNo || "—"}</strong></td>
                          <td><strong className="text-dark">{w.cName || "—"}</strong></td>
                          <td>{formatINR(w.basicSalary)}</td>
                          <td className="text-primary fw-bold">
                            {formatINR(w.totalAmount || ((parseFloat(w.basicSalary) || 0) + (parseFloat(w.extraAmount) || 0)))}
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <span>{w.startingDate ? formatDDMMYY(w.startingDate) : "—"}</span>
                              <i className="bi bi-arrow-right text-muted"></i>
                              <span>{w.endingDate ? formatDDMMYY(w.endingDate) : "—"}</span>
                            </div>
                          </td>
                          <td><span className="badge bg-info">{w.totalDays || "—"}</span></td>
                          <td>
                            <div className="text-truncate" style={{maxWidth: '150px'}} title={w.remarks}>
                              {w.remarks || "—"}
                            </div>
                          </td>
                          <td>
                            {!w.endingDate || new Date(w.endingDate) > new Date() ? (
                              <span className="badge bg-success">Active</span>
                            ) : (
                              <span className="badge bg-warning text-dark">Upcoming</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {/* Completed Workers Tab - Table view */}
            <div className="tab-pane fade" id="completed">
              {workers.filter(isWorkerCompleted).length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-person-x text-muted" style={{ fontSize: '3rem' }}></i>
                  <h5 className="mt-3 text-muted">No Completed Workers</h5>
                  <p className="text-muted">Workers whose end date has passed will appear here</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-secondary">
                      <tr>
                        <th>#</th>
                        <th>ID No</th>
                        <th>Name</th>
                        <th>Basic Salary</th>
                        <th>Total Amount</th>
                        <th>Work Period</th>
                        <th>Total Days</th>
                        <th>Remarks</th>
                        <th>Completed On</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workers.filter(isWorkerCompleted).map((w, idx) => (
                        <tr key={idx} className="align-middle">
                          <td>{idx + 1}</td>
                          <td>{w.workerIdNo || "—"}</td>
                          <td>{w.cName || "—"}</td>
                          <td>{formatINR(w.basicSalary)}</td>
                          <td className="text-primary fw-bold">
                            {formatINR(w.totalAmount || ((parseFloat(w.basicSalary) || 0) + (parseFloat(w.extraAmount) || 0)))}
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <span>{w.startingDate ? formatDDMMYY(w.startingDate) : "—"}</span>
                              <i className="bi bi-arrow-right text-muted"></i>
                              <span>{w.endingDate ? formatDDMMYY(w.endingDate) : "—"}</span>
                            </div>
                          </td>
                          <td><span className="badge bg-secondary">{w.totalDays || "—"}</span></td>
                          <td>
                            <div className="text-truncate" style={{maxWidth: '150px'}} title={w.remarks}>
                              {w.remarks || "—"}
                            </div>
                          </td>
                          <td>
                            <span className="badge bg-dark">
                              {w.endingDate ? formatDDMMYY(w.endingDate) : "—"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Worker Modal */}
      {showWorkerModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="bi bi-plus-circle me-2"></i>
                  {editingIndex !== null ? "Edit Worker" : "Add New Worker"}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={handleModalClose}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label"><strong>ID No *</strong></label>
                    <div className="input-group">
                      <input 
                        className={`form-control ${validationErrors.workerIdNo ? 'is-invalid' : ''}`}
                        name="workerIdNo"
                        value={newWorkerData.workerIdNo}
                        onChange={handleNewWorkerChange}
                        placeholder="Enter Worker ID"
                      />
                      {isLoadingWorker && (
                        <span className="input-group-text">
                          <div className="spinner-border spinner-border-sm" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                        </span>
                      )}
                    </div>
                    {validationErrors.workerIdNo && (
                      <div className="invalid-feedback d-block">{validationErrors.workerIdNo}</div>
                    )}
                    <small className="text-info">Enter ID to auto-fill worker details</small>
                  </div>
                  
                  <div className="col-md-6">
                    <label className="form-label"><strong>Name *</strong></label>
                    <input 
                      className={`form-control ${validationErrors.cName ? 'is-invalid' : ''}`}
                      name="cName"
                      value={newWorkerData.cName}
                      onChange={handleNewWorkerChange}
                      placeholder="Worker name"
                    />
                    {validationErrors.cName && (
                      <div className="invalid-feedback d-block">{validationErrors.cName}</div>
                    )}
                  </div>
                  
                  <div className="col-md-4">
                    <label className="form-label"><strong>Basic Salary *</strong></label>
                    <input 
                      className={`form-control ${validationErrors.basicSalary ? 'is-invalid' : ''}`}
                      name="basicSalary"
                      type="number"
                      placeholder="Basic salary"
                      value={newWorkerData.basicSalary}
                      onChange={handleNewWorkerChange}
                      min="0"
                      step="0.01"
                    />
                    {validationErrors.basicSalary && (
                      <div className="invalid-feedback d-block">{validationErrors.basicSalary}</div>
                    )}
                  </div>
                  
                  <div className="col-md-4">
                    <label className="form-label"><strong>Extra Amount</strong></label>
                    <input 
                      className="form-control"
                      name="extraAmount"
                      type="number"
                      placeholder="Extra amount"
                      value={newWorkerData.extraAmount}
                      onChange={handleNewWorkerChange}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div className="col-md-4">
                    <label className="form-label"><strong>Total Amount</strong></label>
                    <input 
                      className="form-control bg-light"
                      name="totalAmount"
                      type="number"
                      value={newWorkerData.totalAmount}
                      readOnly
                      style={{ fontWeight: 'bold' }}
                    />
                  </div>
                  
                  <div className="col-md-6">
                    <label className="form-label"><strong>Mobile-1</strong></label>
                    <input 
                      className="form-control"
                      name="mobile1"
                      type="tel"
                      placeholder="Primary mobile"
                      value={newWorkerData.mobile1}
                      onChange={handleNewWorkerChange}
                    />
                  </div>
                  
                  <div className="col-md-6">
                    <label className="form-label"><strong>Mobile-2</strong></label>
                    <input 
                      className="form-control"
                      name="mobile2"
                      type="tel"
                      placeholder="Alternate mobile"
                      value={newWorkerData.mobile2}
                      onChange={handleNewWorkerChange}
                    />
                  </div>
                  
                  <div className="col-md-4">
                    <label className="form-label"><strong>Starting Date</strong></label>
                    <input 
                      className="form-control"
                      name="startingDate"
                      type="date"
                      value={newWorkerData.startingDate}
                      onChange={handleNewWorkerChange}
                    />
                  </div>
                  
                  <div className="col-md-4">
                    <label className="form-label"><strong>Ending Date</strong></label>
                    <input 
                      className="form-control"
                      name="endingDate"
                      type="date"
                      value={newWorkerData.endingDate}
                      onChange={handleNewWorkerChange}
                    />
                  </div>
                  
                  <div className="col-md-4">
                    <label className="form-label"><strong>Total Days</strong></label>
                    <input 
                      className="form-control bg-light"
                      name="totalDays"
                      type="number"
                      value={newWorkerData.totalDays}
                      readOnly
                    />
                  </div>
                  
                  <div className="col-md-12">
                    <label className="form-label"><strong>Remarks</strong></label>
                    <textarea 
                      className="form-control"
                      name="remarks"
                      value={newWorkerData.remarks}
                      onChange={handleNewWorkerChange}
                      placeholder="Any remarks about this worker"
                      rows="3"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  className="btn btn-secondary"
                  onClick={handleModalClose}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleAddWorker}
                >
                  <i className="bi bi-check-circle me-1"></i>
                  {editingIndex !== null ? "Update Worker" : "Save Worker"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .icon-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .hover-lift {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          border: 1px solid #dee2e6 !important;
        }
        
        .hover-lift:hover {
          box-shadow: 0 5px 15px rgba(0,0,0,0.1) !important;
        }
        
        .table-hover tbody tr:hover {
          background-color: rgba(0, 123, 255, 0.05);
        }
        
        .badge {
          padding: 0.35em 0.65em;
          font-size: 0.75em;
          font-weight: 600;
        }
        
        .card {
          border-radius: 8px;
          overflow: hidden;
        }
        
        .card-header {
          border-bottom: 2px solid rgba(0,0,0,0.1);
        }
        
        .card-footer {
          border-top: 1px solid #dee2e6;
        }
        
        .vr {
          width: 1px;
          background-color: #dee2e6;
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
};

export default WorkersTab;
 