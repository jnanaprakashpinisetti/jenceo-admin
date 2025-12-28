import React, { useState, useEffect } from 'react';
import firebaseDB from "../../../../firebase";
import { COMPANY_PATHS } from "../../../../utils/dataPaths";
import WorkerModal from "./WorkerModal";

export default function WorkerTab({ companyData = null }) {
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingWorker, setEditingWorker] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [companyKey, setCompanyKey] = useState(null);

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
        setLoading(false);
        return;
      }
      
      setCompanyKey(companyInfo.key);
      
      // Now load workers from the correct path
      const workersRef = firebaseDB.child(`${companyInfo.path}/${companyInfo.key}/WorkerData`);
      
      const snapshot = await workersRef.once('value');
      const workersData = snapshot.val();
      
      if (workersData) {
        const workersArray = Object.entries(workersData).map(([key, value]) => ({
          key,
          ...value
        })).sort((a, b) => {
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
        
        setWorkers(workersArray);
      } else {
        setWorkers([]);
      }
    } catch (error) {
      console.error("Error loading workers:", error);
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle save worker
  const handleSaveWorker = async (workerData, workerKey = null) => {
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
      
      // Use the correct path
      if (isEditMode && workerKey) {
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

  // Handle delete worker
  const handleDeleteWorker = async (workerKey) => {
    if (!window.confirm("Are you sure you want to delete this worker?")) {
      return;
    }

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
      
      alert("Worker deleted successfully");
    } catch (error) {
      console.error("Error deleting worker:", error);
      alert("Failed to delete worker");
    }
  };

  // Handle edit worker
  const handleEditWorker = (worker) => {
    setSelectedWorker(worker);
    setIsEditMode(true);
    setShowWorkerModal(true);
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

  // Format worker name for display (handles both workerName and firstName/lastName)
  const formatWorkerName = (worker) => {
    if (worker.workerName) return worker.workerName;
    if (worker.firstName || worker.lastName) {
      return `${worker.firstName || ""} ${worker.lastName || ""}`.trim();
    }
    return "-";
  };

  // Format contact for display
  const formatContact = (worker) => {
    if (worker.workerCell1) return worker.workerCell1;
    if (worker.mobileNo1) return worker.mobileNo1;
    return "-";
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
      {/* Header with Add Worker button */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-0">Workers</h4>
          <small className="small-text">
            {workers.length} worker(s) for {companyData?.companyName || "Company"}
          </small>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => {
            setSelectedWorker(null);
            setIsEditMode(false);
            setShowWorkerModal(true);
          }}
        >
          <i className="bi bi-person-plus me-2"></i>
          Add Worker
        </button>
      </div>

      {/* Workers Table */}
      {workers.length === 0 ? (
        <div className="text-center py-5 border rounded bg-light">
          <i className="bi bi-people fa-3x small-text mb-3"></i>
          <h5>No Workers Found</h5>
          <p className="small-text">Click "Add Worker" to add workers to this company</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover table-striped">
            <thead className="table-dark">
              <tr>
                <th>#</th>
                <th>Worker ID</th>
                <th>Name</th>
                <th>Department</th>
                <th>Contact No</th>
                <th>Starting Date</th>
                <th>Ending Date</th>
                <th>Contract For</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((worker, index) => (
                <tr key={worker.key}>
                  <td>{index + 1}</td>
                  <td>
                    <strong>{worker.workerId || worker.idNo || "N/A"}</strong>
                  </td>
                  <td>{formatWorkerName(worker)}</td>
                  <td>{worker.department || "-"}</td>
                  <td>
                    {formatContact(worker)}
                    {(worker.workerCell2 || worker.mobileNo2) && (
                      <div className="small small-text">
                        Alt: {worker.workerCell2 || worker.mobileNo2}
                      </div>
                    )}
                  </td>
                  <td>{formatDate(worker.startingDate || worker.joiningDate)}</td>
                  <td>{formatDate(worker.endingDate)}</td>
                  <td>
                    {worker.contractFor || "-"}
                    {worker.contractAmount && (
                      <div className="small small-text">
                        ₹{parseInt(worker.contractAmount).toLocaleString('en-IN')}
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
                        className="btn btn-outline-danger"
                        onClick={() => handleDeleteWorker(worker.key)}
                        title="Delete"
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

      {/* Worker Modal */}
      <WorkerModal
        isOpen={showWorkerModal}
        onClose={() => {
          setShowWorkerModal(false);
          setSelectedWorker(null);
          setIsEditMode(false);
        }}
        onSave={handleSaveWorker}
        companyData={companyData}
        currentWorker={selectedWorker}
        isEditMode={isEditMode}
      />
    </div>
  );
}