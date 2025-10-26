import React, { useState, useEffect } from 'react';
import firebaseDB from "../../firebase";

const DailyEntryModal = ({ entry, isEditing, employee, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    date: '',
    clientId: '',
    clientName: '',
    jobRole: '',
    status: 'present',
    isPublicHoliday: false,
    isEmergency: false,
    notes: ''
  });

  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [basicSalary, setBasicSalary] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [entryDataToSave, setEntryDataToSave] = useState(null);

  useEffect(() => {
    loadClients();
    if (employee) {
      setBasicSalary(employee.basicSalary || 0);
    }
    if (entry) {
      setFormData({
        date: entry.date || '',
        clientId: entry.clientId || '',
        clientName: entry.clientName || '',
        jobRole: entry.jobRole || employee?.primarySkill || '',
        status: entry.status || 'present',
        isPublicHoliday: entry.isPublicHoliday || false,
        isEmergency: entry.isEmergency || false,
        notes: entry.notes || ''
      });
      if (entry.clientName) {
        setSearchTerm(`${entry.clientId} - ${entry.clientName}`);
      }
    } else {
      const today = new Date().toISOString().split('T')[0];
      setFormData(prev => ({
        ...prev,
        date: today,
        jobRole: employee?.primarySkill || ''
      }));
    }
  }, [entry, employee]);

  const loadClients = async () => {
    try {
      const snapshot = await firebaseDB.child('ClientData').get();
      if (snapshot.exists()) {
        const clientsData = Object.entries(snapshot.val()).map(([firebaseKey, data]) => ({
          firebaseKey, // Store the Firebase key separately
          id: data.clientId || firebaseKey, // Use clientId from data, fallback to firebaseKey
          clientId: data.clientId || data.id || '', // Ensure clientId is available
          clientName: data.clientName || data.name || '',
          location: data.location || '',
          ...data
        }));
        setClients(clientsData);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const searchClients = (term) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredClients([]);
      setShowClientDropdown(false);
      return;
    }

    const filtered = clients.filter(client =>
      client.clientName?.toLowerCase().includes(term.toLowerCase()) ||
      client.clientId?.toLowerCase().includes(term.toLowerCase()) ||
      client.id?.toLowerCase().includes(term.toLowerCase())
    );
    setFilteredClients(filtered.slice(0, 8));
    setShowClientDropdown(true);
  };

  const selectClient = (client) => {
    setFormData(prev => ({
      ...prev,
      clientId: client.clientId || client.id, // Use the actual client ID
      clientName: client.clientName
    }));
    setSearchTerm(`${client.clientId || client.id} - ${client.clientName}`);
    setShowClientDropdown(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Prepare entry data
    const entryData = {
      ...formData,
      id: entry?.id || Date.now().toString(),
      dailySalary: calculateDailySalary(),
      basicSalary: basicSalary,
      employeeId: employee?.id || employee?.employeeId,
      employeeName: `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim(),
      timestamp: new Date().toISOString()
    };
    
    // Show confirmation modal instead of alert
    setEntryDataToSave(entryData);
    setShowConfirmModal(true);
  };

  const confirmSave = () => {
    if (entryDataToSave) {
      onSave(entryDataToSave);
    }
    setShowConfirmModal(false);
    setEntryDataToSave(null);
  };

  const cancelSave = () => {
    setShowConfirmModal(false);
    setEntryDataToSave(null);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateDailySalary = () => {
    return Math.round(basicSalary / 30);
  };

  return (
    <>
      <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }} tabIndex="-1">
        <div className="modal-dialog modal-lg">
          <div className="modal-content bg-dark border border-secondary">
            <div className="modal-header bg-secondary">
              <div className="d-flex align-items-center">
                {employee?.employeePhotoUrl && (
                  <img 
                    src={employee.employeePhotoUrl} 
                    alt="Employee" 
                    className="rounded-circle me-3"
                    style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                  />
                )}
                <div>
                  <h5 className="modal-title text-white mb-0">
                    {isEditing ? 'Edit Daily Entry' : 'Add Daily Entry'}
                  </h5>
                  <small className="text-light">
                    {employee?.firstName} {employee?.lastName} • {employee?.idNo || employee?.employeeId}
                  </small>
                </div>
              </div>
              <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="row g-3">
                  
                  {/* Employee Basic Salary */}
                  <div className="col-md-6">
                    <label className="form-label text-warning">
                      <strong>Basic Salary (₹)</strong>
                    </label>
                    <input
                      type="number"
                      className="form-control bg-dark text-white border-warning"
                      value={basicSalary}
                      onChange={(e) => setBasicSalary(parseFloat(e.target.value) || 0)}
                      min="0"
                      step="100"
                    />
                    <small className="text-muted">Monthly basic salary</small>
                  </div>

                  {/* Daily Salary Display */}
                  <div className="col-md-6">
                    <label className="form-label text-success">
                      <strong>Daily Salary</strong>
                    </label>
                    <div className="form-control bg-dark text-success border-success">
                      <strong>₹{calculateDailySalary()}</strong>
                      <small className="text-muted ms-2">
                        (₹{basicSalary} ÷ 30 days)
                      </small>
                    </div>
                  </div>

                  {/* Date and Job Role in one row */}
                  <div className="col-md-6">
                    <label className="form-label text-info">
                      <strong>Date</strong>
                    </label>
                    <input
                      type="date"
                      className="form-control bg-dark text-white border-secondary"
                      value={formData.date}
                      onChange={(e) => handleChange('date', e.target.value)}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-info">
                      <strong>Job Role</strong>
                    </label>
                    <select
                      className="form-select bg-dark text-white border-secondary"
                      value={formData.jobRole}
                      onChange={(e) => handleChange('jobRole', e.target.value)}
                      required
                    >
                      <option value="">Select Job Role</option>
                      <option value="Nursing">Nursing</option>
                      <option value="Patient Care">Patient Care</option>
                      <option value="Care Taker">Care Taker</option>
                      <option value="Baby Care">Baby Care</option>
                      <option value="Supporting">Supporting</option>
                      <option value="Diaper">Diaper</option>
                      <option value="Cook">Cook</option>
                      <option value="Housekeeping">Housekeeping</option>
                      <option value="Old Age Care">Old Age Care</option>
                      <option value="Any Duty">Any Duty</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>

                  {/* Client Search - Fixed version */}
                  <div className="col-12">
                    <label className="form-label text-info">
                      <strong>Search Client (ID or Name)</strong>
                    </label>
                    <div className="position-relative">
                      <input
                        type="text"
                        className="form-control bg-dark text-white border-secondary"
                        placeholder="Search by client ID (JC00001) or name..."
                        value={searchTerm}
                        onChange={(e) => searchClients(e.target.value)}
                        onFocus={() => searchTerm && setShowClientDropdown(true)}
                        onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                        required
                      />
                      
                      {showClientDropdown && filteredClients.length > 0 && (
                        <div className="position-absolute top-100 start-0 end-0 bg-dark border border-secondary mt-1 rounded shadow-lg z-3 max-h-200 overflow-auto">
                          {filteredClients.map(client => (
                            <div
                              key={client.firebaseKey}
                              className="p-2 border-bottom border-secondary hover-bg-gray-700 cursor-pointer"
                              onClick={() => selectClient(client)}
                            >
                              <div className="fw-bold text-white">
                                {client.clientId || client.id} - {client.clientName}
                              </div>
                              <small className="text-muted">
                                Location: {client.location}
                              </small>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Selected Client Display */}
                    {formData.clientName && (
                      <div className="mt-2 p-2 bg-success bg-opacity-10 border border-success rounded">
                        <small className="text-success">
                          <strong>Selected Client:</strong> {formData.clientId} - {formData.clientName}
                        </small>
                      </div>
                    )}
                  </div>

                  {/* Status and Special Conditions in one row */}
                  <div className="col-md-6">
                    <label className="form-label text-warning">
                      <strong>Status</strong>
                    </label>
                    <select
                      className="form-select bg-dark text-white border-secondary"
                      value={formData.status}
                      onChange={(e) => handleChange('status', e.target.value)}
                    >
                      <option value="present">Present</option>
                      <option value="leave">Leave</option>
                      <option value="half-day">Half Day</option>
                      <option value="holiday">Holiday</option>
                      <option value="absent">Absent</option>
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-warning">
                      <strong>Special Conditions</strong>
                    </label>
                    <div className="d-flex gap-3 mt-2">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="isPublicHoliday"
                          checked={formData.isPublicHoliday}
                          onChange={(e) => handleChange('isPublicHoliday', e.target.checked)}
                        />
                        <label className="form-check-label text-info" htmlFor="isPublicHoliday">
                          Public Holiday
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="isEmergency"
                          checked={formData.isEmergency}
                          onChange={(e) => handleChange('isEmergency', e.target.checked)}
                        />
                        <label className="form-check-label text-danger" htmlFor="isEmergency">
                          Emergency Duty
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="col-12">
                    <label className="form-label text-info">
                      <strong>Notes</strong>
                    </label>
                    <textarea
                      className="form-control bg-dark text-white border-secondary"
                      rows="3"
                      value={formData.notes}
                      onChange={(e) => handleChange('notes', e.target.value)}
                      placeholder="Any additional notes about the work..."
                    />
                  </div>

                  {/* Summary Card */}
                  <div className="col-12">
                    <div className="card bg-gray-800 border-info">
                      <div className="card-body">
                        <h6 className="card-title text-info">Entry Summary</h6>
                        <div className="row text-center">
                          <div className="col-md-3">
                            <small className="text-muted">Date</small>
                            <div className="fw-bold text-white">{formData.date || 'Not set'}</div>
                          </div>
                          <div className="col-md-3">
                            <small className="text-muted">Client ID</small>
                            <div className="fw-bold text-white">{formData.clientId || 'Not selected'}</div>
                          </div>
                          <div className="col-md-3">
                            <small className="text-muted">Client Name</small>
                            <div className="fw-bold text-white">{formData.clientName || 'Not selected'}</div>
                          </div>
                          <div className="col-md-3">
                            <small className="text-muted">Daily Salary</small>
                            <div className="fw-bold text-success">₹{calculateDailySalary()}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {isEditing ? 'Update Entry' : 'Add Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && entryDataToSave && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark border border-warning">
              <div className="modal-header border-warning">
                <h5 className="modal-title text-warning">
                  <i className="fas fa-check-circle me-2"></i>
                  Confirm Daily Entry
                </h5>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning bg-warning bg-opacity-10 border-warning">
                  <strong>Please review the entry details:</strong>
                </div>
                
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <small className="text-muted">Date</small>
                    <div className="fw-bold text-white">{entryDataToSave.date}</div>
                  </div>
                  <div className="col-6">
                    <small className="text-muted">Job Role</small>
                    <div className="fw-bold text-white">{entryDataToSave.jobRole}</div>
                  </div>
                  <div className="col-12">
                    <small className="text-muted">Client</small>
                    <div className="fw-bold text-white">
                      {entryDataToSave.clientId} - {entryDataToSave.clientName}
                    </div>
                  </div>
                  <div className="col-6">
                    <small className="text-muted">Status</small>
                    <div className="fw-bold text-capitalize text-info">{entryDataToSave.status}</div>
                  </div>
                  <div className="col-6">
                    <small className="text-muted">Daily Salary</small>
                    <div className="fw-bold text-success">₹{entryDataToSave.dailySalary}</div>
                  </div>
                  {(entryDataToSave.isPublicHoliday || entryDataToSave.isEmergency) && (
                    <div className="col-12">
                      <small className="text-muted">Special Conditions</small>
                      <div>
                        {entryDataToSave.isPublicHoliday && (
                          <span className="badge bg-info me-2">Public Holiday</span>
                        )}
                        {entryDataToSave.isEmergency && (
                          <span className="badge bg-danger">Emergency Duty</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="alert alert-info bg-info bg-opacity-10 border-info">
                  <small>
                    <strong>Employee:</strong> {entryDataToSave.employeeName} ({entryDataToSave.employeeId})
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={cancelSave}>
                  <i className="fas fa-times me-1"></i>
                  Cancel
                </button>
                <button type="button" className="btn btn-success" onClick={confirmSave}>
                  <i className="fas fa-check me-1"></i>
                  Confirm & Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .hover-bg-gray-700:hover {
          background-color: #374151 !important;
        }
        .cursor-pointer {
          cursor: pointer;
        }
        .max-h-200 {
          max-height: 200px;
        }
        .z-3 {
          z-index: 3;
        }
        .bg-gray-800 {
          background-color: #1f2937;
        }
      `}</style>
    </>
  );
};

export default DailyEntryModal;