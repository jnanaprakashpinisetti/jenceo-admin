import React, { useState, useEffect } from 'react';
import firebaseDB from "../../../../firebase";
import { COMPANY_PATHS } from "../../../../utils/dataPaths";
import WorkerModal from "./WorkerModal";
import DeleteConfirmationModal from "./DeleteConfirmationModal";

export default function WorkerTab({ companyData = null }) {
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [activeWorkers, setActiveWorkers] = useState([]);
  const [exitedWorkers, setExitedWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingWorker, setEditingWorker] = useState(null);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [companyKey, setCompanyKey] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'exited'
  const [searchTerm, setSearchTerm] = useState('');
  const [exitMode, setExitMode] = useState(false);

  // Helper to find company key by companyId
  const findCompanyKey = async (companyId) => {
    if (!companyId) return null;
    
    const categories = Object.keys(COMPANY_PATHS);
    
    for (const category of categories) {
      const basePath = COMPANY_PATHS[category];
      const companiesRef = firebaseDB.child(basePath);
      const snapshot = await companiesRef
        .orderByChild("companyId")
        .equalTo(companyId)
        .once('value');
      
      const data = snapshot.val();
      if (data) {
        return { 
          key: Object.keys(data)[0], 
          category: category,
          path: basePath 
        };
      }
    }
    
    return null;
  };

  // Load workers from Firebase
  const loadWorkers = async () => {
    if (!companyData?.companyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Find company details
      const companyInfo = await findCompanyKey(companyData.companyId);
      
      if (!companyInfo) {
        console.warn("Company not found in database");
        setWorkers([]);
        setActiveWorkers([]);
        setExitedWorkers([]);
        setLoading(false);
        return;
      }
      
      setCompanyKey(companyInfo.key);
      
      // Load workers from the correct path
      const workersRef = firebaseDB.child(`${companyInfo.path}/${companyInfo.key}/WorkerData`);
      
      const snapshot = await workersRef.once('value');
      const workersData = snapshot.val();
      
      if (workersData) {
        const workersArray = Object.entries(workersData).map(([key, value]) => ({
          key,
          ...value
        }));
        
        setWorkers(workersArray);
        
        // Filter active and exited workers
        const active = workersArray.filter(worker => 
          !worker.status || worker.status === 'active'
        ).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        
        const exited = workersArray.filter(worker => 
          worker.status === 'exited'
        ).sort((a, b) => new Date(b.exitDate || 0) - new Date(a.exitDate || 0));
        
        setActiveWorkers(active);
        setExitedWorkers(exited);
      } else {
        setWorkers([]);
        setActiveWorkers([]);
        setExitedWorkers([]);
      }
    } catch (error) {
      console.error("Error loading workers:", error);
      setWorkers([]);
      setActiveWorkers([]);
      setExitedWorkers([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle save worker
  const handleSaveWorker = async (workerData, workerKey = null, isExit = false) => {
    if (!companyData?.companyId) {
      alert("Company data is required");
      return;
    }

    try {
      // Find company info
      const companyInfo = await findCompanyKey(companyData.companyId);
      
      if (!companyInfo) {
        throw new Error("Company not found in database");
      }
      
      if (isExit) {
        // Update worker as exited
        await firebaseDB
          .child(`${companyInfo.path}/${companyInfo.key}/WorkerData/${workerKey}`)
          .update(workerData);
      } else if (workerKey) {
        // Update existing worker
        await firebaseDB
          .child(`${companyInfo.path}/${companyInfo.key}/WorkerData/${workerKey}`)
          .update(workerData);
      } else {
        // Add new worker
        const workersRef = firebaseDB
          .child(`${companyInfo.path}/${companyInfo.key}/WorkerData`);
        await workersRef.push(workerData);
      }
      
      // Refresh workers list
      await loadWorkers();
      
      return true;
    } catch (error) {
      console.error("Error saving worker:", error);
      throw error;
    }
  };

  // Handle exit worker
  const handleExitWorker = async (workerKey, remarks) => {
    if (!companyData?.companyId || !workerKey) {
      alert("Unable to exit worker");
      return;
    }

    try {
      // Find company info
      const companyInfo = await findCompanyKey(companyData.companyId);
      
      if (!companyInfo) {
        alert("Company not found");
        return;
      }
      
      // Get worker data
      const workerRef = firebaseDB
        .child(`${companyInfo.path}/${companyInfo.key}/WorkerData/${workerKey}`);
      
      const snapshot = await workerRef.once('value');
      const workerData = snapshot.val();
      
      if (!workerData) {
        alert("Worker not found");
        return;
      }
      
      // Update worker status to exited
      const exitData = {
        status: 'exited',
        exitDate: new Date().toISOString(),
        exitBy: 'Admin',
        exitRemarks: remarks,
        updatedAt: new Date().toISOString()
      };
      
      await workerRef.update(exitData);
      
      await loadWorkers();
      
      alert("Worker exited successfully");
    } catch (error) {
      console.error("Error exiting worker:", error);
      alert("Failed to exit worker");
      throw error;
    }
  };

  // Handle delete worker permanently
  const handleDeleteWorker = async (workerKey) => {
    if (!companyData?.companyId || !workerKey) {
      alert("Unable to delete worker");
      return;
    }

    try {
      // Find company info
      const companyInfo = await findCompanyKey(companyData.companyId);
      
      if (!companyInfo) {
        alert("Company not found");
        return;
      }
      
      await firebaseDB
        .child(`${companyInfo.path}/${companyInfo.key}/WorkerData/${workerKey}`)
        .remove();
      
      await loadWorkers();
      
      alert("Worker deleted permanently");
    } catch (error) {
      console.error("Error deleting worker:", error);
      alert("Failed to delete worker");
      throw error;
    }
  };

  // Handle restore worker
  const handleRestoreWorker = async (workerKey) => {
    if (!window.confirm("Are you sure you want to restore this worker?")) {
      return;
    }

    if (!companyData?.companyId || !workerKey) {
      alert("Unable to restore worker");
      return;
    }

    try {
      // Find company info
      const companyInfo = await findCompanyKey(companyData.companyId);
      
      if (!companyInfo) {
        alert("Company not found");
        return;
      }
      
      // Update worker status to active
      const restoreData = {
        status: 'active',
        restoredDate: new Date().toISOString(),
        restoredBy: 'Admin',
        updatedAt: new Date().toISOString(),
        exitDate: "",
        exitBy: "",
        exitRemarks: ""
      };
      
      await firebaseDB
        .child(`${companyInfo.path}/${companyInfo.key}/WorkerData/${workerKey}`)
        .update(restoreData);
      
      await loadWorkers();
      
      alert("Worker restored successfully");
    } catch (error) {
      console.error("Error restoring worker:", error);
      alert("Failed to restore worker");
    }
  };

  // Handle edit worker
  const handleEditWorker = (worker) => {
    setSelectedWorker(worker);
    setExitMode(false);
    setShowWorkerModal(true);
  };

  // Handle exit worker confirmation
  const handleExitClick = (worker) => {
    setSelectedWorker(worker);
    setExitMode(true);
    setShowDeleteModal(true);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Format worker name for display
  const formatWorkerName = (worker) => {
    if (worker.workerName) return worker.workerName;
    if (worker.firstName || worker.lastName) {
      return `${worker.firstName || ""} ${worker.lastName || ""}`.trim();
    }
    return "-";
  };

  // Filter workers based on search term
  const filterWorkers = (workersList) => {
    if (!searchTerm.trim()) return workersList;
    
    const term = searchTerm.toLowerCase();
    return workersList.filter(worker => 
      (worker.workerId && worker.workerId.toLowerCase().includes(term)) ||
      (worker.workerName && worker.workerName.toLowerCase().includes(term)) ||
      (formatWorkerName(worker).toLowerCase().includes(term)) ||
      (worker.department && worker.department.toLowerCase().includes(term)) ||
      (worker.workerCell1 && worker.workerCell1.includes(term)) ||
      (worker.workerCell2 && worker.workerCell2.includes(term))
    );
  };

  // Auto-load when companyData changes
  useEffect(() => {
    if (companyData) {
      loadWorkers();
    }
  }, [companyData]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading workers...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Stats and Add Worker button */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-0">Worker Management</h4>
          <small className="small-text">
            Active: {activeWorkers.length} | Exited: {exitedWorkers.length} | 
            Total: {workers.length} workers for {companyData?.companyName || "Company"}
          </small>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => {
            setSelectedWorker(null);
            setExitMode(false);
            setShowWorkerModal(true);
          }}
        >
          <i className="bi bi-person-plus me-2"></i>
          Add New Worker
        </button>
      </div>

      {/* Search Bar */}
      <div className="row mb-3">
        <div className="col-md-6">
          <div className="input-group">
            <span className="input-group-text">
              <i className="bi bi-search"></i>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search by ID, Name, Department, or Phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="btn btn-outline-secondary"
                onClick={() => setSearchTerm('')}
              >
                <i className="bi bi-x"></i>
              </button>
            )}
          </div>
        </div>
        <div className="col-md-6 text-end">
          <button 
            className="btn btn-outline-secondary me-2"
            onClick={loadWorkers}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            <i className="bi bi-person-check me-1"></i>
            Active Workers ({activeWorkers.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'exited' ? 'active' : ''}`}
            onClick={() => setActiveTab('exited')}
          >
            <i className="bi bi-person-x me-1"></i>
            Exited Workers ({exitedWorkers.length})
          </button>
        </li>
      </ul>

      {/* Active Workers Tab */}
      {activeTab === 'active' && (
        <>
          {filterWorkers(activeWorkers).length === 0 ? (
            <div className="text-center py-5 border rounded bg-light">
              {searchTerm ? (
                <>
                  <i className="bi bi-search fa-3x small-text mb-3"></i>
                  <h5>No Workers Found</h5>
                  <p className="small-text">No active workers match your search criteria</p>
                </>
              ) : (
                <>
                  <i className="bi bi-people fa-3x small-text mb-3"></i>
                  <h5>No Active Workers</h5>
                  <p className="small-text">Click "Add New Worker" to add workers to this company</p>
                </>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-striped">
                <thead className="table-dark">
                  <tr>
                    <th>#</th>
                    <th>Photo</th>
                    <th>Worker ID</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Contact No</th>
                    <th>Starting Date</th>
                    <th>Ending Date</th>
                    <th>Contract Details</th>
                    <th>Supervisor</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filterWorkers(activeWorkers).map((worker, index) => (
                    <tr key={worker.key}>
                      <td>{index + 1}</td>
<td>
  {worker.photo ? (
    <img 
      src={worker.photo} 
      alt={formatWorkerName(worker)}
      className="rounded-circle"
      style={{ width: '40px', height: '40px', objectFit: 'cover' }}
      onError={(e) => {
        e.target.onerror = null;
        e.target.style.display = 'none';
        e.target.parentNode.innerHTML = `
          <div class="rounded-circle bg-light d-flex align-items-center justify-content-center"
            style="width: 40px; height: 40px">
            <i class="bi bi-person text-muted"></i>
          </div>
        `;
      }}
    />
  ) : (
    <div className="rounded-circle bg-light d-flex align-items-center justify-content-center"
      style={{ width: '40px', height: '40px' }}>
      <i className="bi bi-person text-muted"></i>
    </div>
  )}
</td>


                      <td>
                        <strong className="text-primary">{worker.workerId || worker.idNo || "N/A"}</strong>
                      </td>
                      <td>
                        <strong>{formatWorkerName(worker)}</strong>
                        {worker.basicSalary && (
                          <div className="small small-text">
                            Salary: ₹{parseInt(worker.basicSalary).toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>
                      <td>{worker.department || "-"}</td>
                      <td>
                        <div>
                          <a href={`tel:${worker.workerCell1 || worker.mobileNo1}`} className="text-decoration-none">
                            {worker.workerCell1 || worker.mobileNo1 || "-"}
                          </a>
                        </div>
                        {(worker.workerCell2 || worker.mobileNo2) && (
                          <div className="small small-text">
                            Alt: {worker.workerCell2 || worker.mobileNo2}
                          </div>
                        )}
                      </td>
                      <td>{formatDate(worker.startingDate || worker.joiningDate)}</td>
                      <td>
                        {formatDate(worker.endingDate)}
                        {worker.endingDate && new Date(worker.endingDate) < new Date() && (
                          <span className="badge bg-warning ms-1">Expired</span>
                        )}
                      </td>
                      <td>
                        {worker.contractFor || "-"}
                        {worker.contractAmount && (
                          <div className="small small-text">
                            ₹{parseInt(worker.contractAmount).toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>
                      <td>
                        {worker.supervisorName || "-"}
                        {worker.supervisorCell && (
                          <div className="small small-text">
                            {worker.supervisorCell}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-primary"
                            onClick={() => handleEditWorker(worker)}
                            title="Edit"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-outline-warning"
                            onClick={() => handleExitClick(worker)}
                            title="Exit Worker"
                          >
                            <i className="bi bi-person-dash"></i>
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => {
                              setSelectedWorker(worker);
                              setExitMode(false);
                              setShowDeleteModal(true);
                            }}
                            title="Delete Permanently"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Exited Workers Tab */}
      {activeTab === 'exited' && (
        <>
          {filterWorkers(exitedWorkers).length === 0 ? (
            <div className="text-center py-5 border rounded bg-light">
              {searchTerm ? (
                <>
                  <i className="bi bi-search fa-3x small-text mb-3"></i>
                  <h5>No Workers Found</h5>
                  <p className="small-text">No exited workers match your search criteria</p>
                </>
              ) : (
                <>
                  <i className="bi bi-person-x fa-3x small-text mb-3"></i>
                  <h5>No Exited Workers</h5>
                  <p className="small-text">No workers have been exited from this company</p>
                </>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-secondary">
                  <tr>
                    <th>#</th>
                    <th>Photo</th>
                    <th>Worker ID</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Exit Date</th>
                    <th>Exit Remarks</th>
                    <th>Exit By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filterWorkers(exitedWorkers).map((worker, index) => (
                    <tr key={worker.key} className="table-light">
                      <td>{index + 1}</td>
                      <td>
  {worker.photo ? (
    <img 
      src={worker.photo} 
      alt={formatWorkerName(worker)}
      className="rounded-circle"
      style={{ width: '40px', height: '40px', objectFit: 'cover' }}
      onError={(e) => {
        e.target.onerror = null;
        e.target.style.display = 'none';
        e.target.parentNode.innerHTML = `
          <div class="rounded-circle bg-light d-flex align-items-center justify-content-center"
            style="width: 40px; height: 40px">
            <i class="bi bi-person text-muted"></i>
          </div>
        `;
      }}
    />
  ) : (
    <div className="rounded-circle bg-light d-flex align-items-center justify-content-center"
      style={{ width: '40px', height: '40px' }}>
      <i className="bi bi-person text-muted"></i>
    </div>
  )}
</td>
                      <td>
                        <strong className="text-secondary">{worker.workerId || worker.idNo || "N/A"}</strong>
                      </td>
                      <td>
                        <strong>{formatWorkerName(worker)}</strong>
                        <div className="small small-text">
                          Started: {formatDate(worker.startingDate || worker.joiningDate)}
                        </div>
                      </td>
                      <td>{worker.department || "-"}</td>
                      <td>{formatDate(worker.exitDate)}</td>
                      <td>
                        <span className="badge bg-danger rounded-pill">
                          {worker.exitRemarks || "Not specified"}
                        </span>
                      </td>
                      <td>{worker.exitBy || "-"}</td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-success"
                            onClick={() => handleRestoreWorker(worker.key)}
                            title="Restore Worker"
                          >
                            <i className="bi bi-arrow-counterclockwise"></i> Restore
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => {
                              setSelectedWorker(worker);
                              setExitMode(false);
                              setShowDeleteModal(true);
                            }}
                            title="Delete Permanently"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Worker Modal */}
      <WorkerModal
        isOpen={showWorkerModal}
        onClose={() => {
          setShowWorkerModal(false);
          setSelectedWorker(null);
          setExitMode(false);
        }}
        onSave={handleSaveWorker}
        companyData={companyData}
        currentWorker={selectedWorker}
        isEditMode={!!selectedWorker}
        exitMode={false}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedWorker(null);
          setExitMode(false);
        }}
        onConfirm={async (remarks) => {
          if (exitMode && selectedWorker) {
            // Exit worker
            await handleExitWorker(selectedWorker.key, remarks);
          } else if (selectedWorker) {
            // Delete permanently
            await handleDeleteWorker(selectedWorker.key);
          }
        }}
        workerName={selectedWorker ? formatWorkerName(selectedWorker) : ""}
        workerId={selectedWorker ? (selectedWorker.workerId || selectedWorker.idNo || "") : ""}
        isExitMode={exitMode}
      />
    </div>
  );
}