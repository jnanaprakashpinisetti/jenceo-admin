import React, { useState, useEffect, useRef, useCallback } from 'react';

const HospitalModal = ({ hospital, isOpen, onClose, onSave, isEditMode }) => {
  const [activeTab, setActiveTab] = useState('hospitalDetails');
  const [hospitalData, setHospitalData] = useState({});
  const [agents, setAgents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [agentErrors, setAgentErrors] = useState([]);
  const [paymentErrors, setPaymentErrors] = useState([]);
  const [paymentIdInput, setPaymentIdInput] = useState('');
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const editedRef = useRef(false);
  const [agentSuccess, setAgentSuccess] = useState({});
  const [paymentSuccess, setPaymentSuccess] = useState({});
  const [currentAgentPage, setCurrentAgentPage] = useState(1);
  const [currentPaymentPage, setCurrentPaymentPage] = useState(1);
  const [visitTouched, setVisitTouched] = useState(false);
  const [autoVisit, setAutoVisit] = useState('');
  const [agentCommentInputs, setAgentCommentInputs] = useState({});
  const [hospitalCommentInput, setHospitalCommentInput] = useState('');
  const itemsPerPage = 5;

  // ---------- Helpers ----------
  const autoVisitFromCount = useCallback((count) => {
    if (count >= 8) return 'Visit Fully';
    if (count >= 4) return 'Visit Medium';
    if (count >= 1) return 'Visit Low';
    return '';
  }, []);

  // ---------- Load / hydrate ----------
  useEffect(() => {
    if (hospital) {
      const initialAuto = autoVisitFromCount((hospital.agents || []).length);
      setHospitalData({
        ...hospital,
        visitType: hospital.visitType || initialAuto,
        comments: Array.isArray(hospital.comments) ? hospital.comments : []
      });
      setAgents(hospital.agents || []);
      setPayments(
        (hospital.payments || []).map(p => ({
          ...p,
          date: p.date || (p.createdAt ? new Date(p.createdAt).toISOString().slice(0,10) : new Date().toISOString().slice(0,10))
        }))
      );
      setAgentErrors(hospital.agents ? hospital.agents.map(() => ({})) : []);
      setPaymentErrors(hospital.payments ? hospital.payments.map(() => ({})) : []);
      setAgentSuccess(
        hospital.agents
          ? hospital.agents.reduce((acc, _, index) => ({ ...acc, [index]: false }), {})
          : {}
      );
      setPaymentSuccess(
        hospital.payments
          ? hospital.payments.reduce((acc, _, index) => ({ ...acc, [index]: false }), {})
          : {}
      );

      setAutoVisit(initialAuto);
      setAgentCommentInputs({});
      setHospitalCommentInput('');

      // Reset edit tracking whenever the modal loads fresh data
      editedRef.current = false;
      setHasUnsavedChanges(false);
      setVisitTouched(false);
    }
  }, [hospital, autoVisitFromCount]);

  // Auto-update autoVisit (always) and visitType (only if not manually touched)
  useEffect(() => {
    const nextVisit = autoVisitFromCount(agents.length);
    setAutoVisit(nextVisit);
    if (!visitTouched) {
      setHospitalData(prev => ({ ...prev, visitType: nextVisit }));
    }
  }, [agents.length, visitTouched, autoVisitFromCount]);

  const isPaymentLocked = (payment) => payment.isLocked || payment.submittedAt;
  const isAgentLocked = (agent) => agent.isLocked || agent.submittedAt;

  const markEdited = () => {
    editedRef.current = true;
    setHasUnsavedChanges(true);
  };

  const generateAgentId = () => {
    if (!hospitalData.idNo) return '';
    const existingIds = agents.map(agent => {
      const parts = agent.id?.split('-') || [];
      return parts.length > 1 ? parseInt(parts[1]) : 0;
    });
    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    return `${hospitalData.idNo}-${maxId + 1}`;
  };

  /* --------------------- Agent Details Functions --------------------- */
  const addNewAgent = () => {
    const newAgentId = generateAgentId();
    const newAgent = {
      id: newAgentId,
      name: '',
      designation: '',
      mobileNo: '',
      upiNo: '',
      upiName: '',
      status: '',
      comments: [],
      isLocked: false,
      createdAt: new Date().toISOString()
    };
    setAgents([newAgent, ...agents]);
    setAgentErrors([{}, ...agentErrors]);
    markEdited();
  };

  const removeAgent = (index) => {
    const updatedAgents = [...agents];
    updatedAgents.splice(index, 1);
    setAgents(updatedAgents);

    const updatedErrors = [...agentErrors];
    updatedErrors.splice(index, 1);
    setAgentErrors(updatedErrors);

    const updatedSuccess = { ...agentSuccess };
    delete updatedSuccess[index];
    setAgentSuccess(updatedSuccess);

    markEdited();
  };

  const handleAgentChange = (index, field, value) => {
    const updatedAgents = [...agents];
    updatedAgents[index][field] = value;
    setAgents(updatedAgents);

    if (agentErrors[index]?.[field]) {
      const updatedErrors = [...agentErrors];
      delete updatedErrors[index][field];
      setAgentErrors(updatedErrors);
    }

    markEdited();
  };

  const addAgentComment = (agentIndex) => {
    const commentText = agentCommentInputs[agentIndex] || '';
    if (!commentText.trim()) return;

    const updatedAgents = [...agents];
    if (!updatedAgents[agentIndex].comments) {
      updatedAgents[agentIndex].comments = [];
    }
    updatedAgents[agentIndex].comments.unshift({
      text: commentText,
      date: new Date().toISOString(),
      id: Date.now() // Add unique ID for key prop
    });
    setAgents(updatedAgents);
    
    // Clear the input for this agent
    setAgentCommentInputs(prev => ({ ...prev, [agentIndex]: '' }));
    markEdited();
  };

  const validateAgent = (index) => {
    const agent = agents[index];
    const errors = {};

    if (!agent.name.trim()) errors.name = "Name is required";
    if (!agent.designation) errors.designation = "Designation is required";
    if (!agent.mobileNo.trim()) errors.mobileNo = "Mobile No is required";
    else if (!/^\d{10}$/.test(agent.mobileNo)) errors.mobileNo = "Enter valid 10-digit mobile number";

    return errors;
  };

  const handleAgentSubmit = (index) => {
    const errors = validateAgent(index);
    if (Object.keys(errors).length > 0) {
      const updatedErrors = [...agentErrors];
      updatedErrors[index] = errors;
      setAgentErrors(updatedErrors);
      return;
    }

    const updatedAgents = [...agents];
    updatedAgents[index] = {
      ...updatedAgents[index],
      isLocked: true,
      submittedAt: new Date().toISOString()
    };
    setAgents(updatedAgents);

    setAgentSuccess({ ...agentSuccess, [index]: true });
    const timer = setTimeout(() => {
      setAgentSuccess(prev => ({ ...prev, [index]: false }));
    }, 3000);
    
    // Cleanup timer on component unmount
    return () => clearTimeout(timer);
  };

  /* --------------------- Payment Details Functions --------------------- */
  const addNewPayment = () => {
    const today = new Date().toISOString().slice(0, 10);
    const newPayment = {
      id: Date.now().toString(),
      date: today,
      name: '',
      mobileNo: '',
      upiNo: '',
      clientId: '',
      clientName: '',
      serviceType: '',
      serviceCharges: '',
      commition: '',
      paymentMode: '',
      comments: '',
      isLocked: false,
      createdAt: new Date().toISOString()
    };
    setPayments([newPayment, ...payments]);
    setPaymentErrors([{}, ...paymentErrors]);
    markEdited();
  };

  const removePayment = (index) => {
    const updatedPayments = [...payments];
    updatedPayments.splice(index, 1);
    setPayments(updatedPayments);

    const updatedErrors = [...paymentErrors];
    updatedErrors.splice(index, 1);
    setPaymentErrors(updatedErrors);

    const updatedSuccess = { ...paymentSuccess };
    delete updatedSuccess[index];
    setPaymentSuccess(updatedSuccess);

    markEdited();
  };

  const handlePaymentChange = (index, field, value) => {
    // Validate numeric fields
    if (field === 'serviceCharges' || field === 'commition') {
      // Allow only numbers and decimal point
      if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;
    }
    
    const updatedPayments = [...payments];
    updatedPayments[index][field] = value;
    setPayments(updatedPayments);

    if (paymentErrors[index]?.[field]) {
      const updatedErrors = [...paymentErrors];
      delete updatedErrors[index][field];
      setPaymentErrors(updatedErrors);
    }

    markEdited();
  };

  const validatePayment = (index) => {
    const payment = payments[index];
    const errors = {};
    if (!payment.commition && payment.commition !== 0) errors.commition = "Commition is required";
    if (!payment.paymentMode) errors.paymentMode = "Payment Mode is required";
    if (!payment.date) errors.date = "Date is required";
    return errors;
  };

  const handlePaymentSubmit = (index) => {
    const errors = validatePayment(index);
    if (Object.keys(errors).length > 0) {
      const updatedErrors = [...paymentErrors];
      updatedErrors[index] = errors;
      setPaymentErrors(updatedErrors);
      return;
    }

    const updatedPayments = [...payments];
    updatedPayments[index] = {
      ...updatedPayments[index],
      isLocked: true,
      submittedAt: new Date().toISOString()
    };
    setPayments(updatedPayments);

    setPaymentSuccess({ ...paymentSuccess, [index]: true });
    const timer = setTimeout(() => {
      setPaymentSuccess(prev => ({ ...prev, [index]: false }));
    }, 3000);
    
    // Cleanup timer on component unmount
    return () => clearTimeout(timer);
  };

  const handlePaymentIdSearch = () => {
    if (!paymentIdInput) return;

    const foundAgent = agents.find(agent => agent.id === paymentIdInput);
    if (foundAgent) {
      const today = new Date().toISOString().slice(0, 10);
      const newPayment = {
        id: Date.now().toString(),
        date: today,
        name: foundAgent.name,
        mobileNo: foundAgent.mobileNo,
        upiNo: foundAgent.upiNo,
        clientId: '',
        clientName: '',
        serviceType: '',
        serviceCharges: '',
        commition: '',
        paymentMode: '',
        comments: '',
        isLocked: false,
        agentId: foundAgent.id,
        createdAt: new Date().toISOString()
      };
      setPayments([newPayment, ...payments]);
      setPaymentErrors([{}, ...paymentErrors]);
      setPaymentIdInput('');
      markEdited();
    }
  };

  /* --------------------- Hospital (header) comments --------------------- */
  const addHospitalComment = () => {
    if (!hospitalCommentInput.trim()) return;
    const text = hospitalCommentInput.trim();
    setHospitalData(prev => ({
      ...prev,
      comments: [{ text, date: new Date().toISOString(), id: Date.now() }, ...(prev.comments || [])]
    }));
    setHospitalCommentInput('');
    markEdited();
  };

  /* --------------------- Save / Close --------------------- */
  const handleSave = () => {
    const dataToSave = {
      ...hospitalData,
      agents,
      payments
    };

    onSave(dataToSave);
    // After successful save, clear dirty state
    editedRef.current = false;
    setHasUnsavedChanges(false);
  };

  const handleClose = () => {
    // Only block closing if in EDIT mode and there are unsaved edits from this session
    if (isEditMode && hasUnsavedChanges) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const confirmClose = () => {
    setShowConfirmClose(false);
    onClose();
  };

  const cancelClose = () => {
    setShowConfirmClose(false);
  };

  /* --------------------- Pagination --------------------- */
  const agentStartIndex = (currentAgentPage - 1) * itemsPerPage;
  const agentEndIndex = agentStartIndex + itemsPerPage;
  const currentAgents = agents.slice(agentStartIndex, agentEndIndex);
  const totalAgentPages = Math.ceil(agents.length / itemsPerPage);

  const paymentStartIndex = (currentPaymentPage - 1) * itemsPerPage;
  const paymentEndIndex = paymentStartIndex + itemsPerPage;
  const currentPayments = payments.slice(paymentStartIndex, paymentEndIndex);
  const totalPaymentPages = Math.ceil(payments.length / itemsPerPage);

  /* --------------------- Options & Helpers --------------------- */
  const designationOptions = [
    'Supervisor', 'Security', 'Compounder', 'Nurse', 'Attender',
    'Cleaner', 'Driver', 'Medical Shop', 'Doctor', 'Pharmacist',
    'Lab Technician', 'Receptionist', 'Accountant', 'Manager'
  ];

  const statusOptions = [
    'Very Good', 'Good', 'Average', 'Below Average', 'Not Good', 'Very Bad'
  ];

  const paymentModeOptions = [ 'Online', 'Cash', 'Gift' ];

  const visitTypeOptions = ['Visit Fully', 'Visit Medium', 'Visit Low'];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Very Good': return 'success';
      case 'Good': return 'info';
      case 'Average': return 'primary';
      case 'Below Average': return 'warning';
      case 'Not Good': return 'warning';
      case 'Very Bad': return 'danger';
      default: return 'secondary';
    }
  };

  const sumCommission = () =>
    payments.reduce((acc, p) => acc + (parseFloat(p.commition) || 0), 0);

  if (!isOpen) return null;

  return (
    <>
      {/* Confirm Close Modal (only if edit mode + unsaved changes) */}
      {showConfirmClose && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Unsaved Changes</h5>
                <button type="button" className="btn-close" onClick={cancelClose}></button>
              </div>
              <div className="modal-body">
                <p>You have unsaved changes. Are you sure you want to close without saving?</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={cancelClose}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={confirmClose}>
                  Yes, Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Modal */}
      <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header bg-secondary text-white">
              <h5 className="modal-title">
                {isEditMode ? "Edit" : "View"} Hospital - {hospitalData.idNo} - {hospitalData.hospitalName}
              </h5>
              <button type="button" className="btn-close btn-close-white" onClick={handleClose}></button>
            </div>

            <div className="modal-body">
              {/* Tabs */}
              <ul className="nav nav-tabs" id="hospitalTabs" role="tablist">
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === 'hospitalDetails' ? 'active' : ''}`}
                    onClick={() => setActiveTab('hospitalDetails')}
                  >
                    Hospital Details
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === 'agentDetails' ? 'active' : ''}`}
                    onClick={() => setActiveTab('agentDetails')}
                  >
                    Agent Details
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === 'paymentDetails' ? 'active' : ''}`}
                    onClick={() => setActiveTab('paymentDetails')}
                  >
                    Payment Details
                  </button>
                </li>
                {/* New Tabs */}
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === 'agentList' ? 'active' : ''}`}
                    onClick={() => setActiveTab('agentList')}
                  >
                    Agent List
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === 'paymentList' ? 'active' : ''}`}
                    onClick={() => setActiveTab('paymentList')}
                  >
                    Payment List
                  </button>
                </li>
              </ul>

              <div className="tab-content p-3 agent-list-table">
                {/* Hospital Details Tab (now editable + visit dropdown + comments) */}
                {activeTab === 'hospitalDetails' && (
                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label"><strong>Hospital ID</strong></label>
                      {isEditMode ? (
                        <input
                          type="text"
                          className="form-control"
                          value={hospitalData.idNo || ''}
                          onChange={(e) => { setHospitalData({ ...hospitalData, idNo: e.target.value }); markEdited(); }}
                        />
                      ) : (
                        <p>{hospitalData.idNo || 'N/A'}</p>
                      )}
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label"><strong>Hospital Name</strong></label>
                      {isEditMode ? (
                        <input
                          type="text"
                          className="form-control"
                          value={hospitalData.hospitalName || ''}
                          onChange={(e) => { setHospitalData({ ...hospitalData, hospitalName: e.target.value }); markEdited(); }}
                        />
                      ) : (
                        <p>{hospitalData.hospitalName || 'N/A'}</p>
                      )}
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label"><strong>Hospital Type</strong></label>
                      {isEditMode ? (
                        <input
                          type="text"
                          className="form-control"
                          value={hospitalData.hospitalType || ''}
                          onChange={(e) => { setHospitalData({ ...hospitalData, hospitalType: e.target.value }); markEdited(); }}
                        />
                      ) : (
                        <p>{hospitalData.hospitalType || 'N/A'}</p>
                      )}
                    </div>

                    <div className="col-md-4 mb-3">
                      <label className="form-label"><strong>Number of Beds</strong></label>
                      {isEditMode ? (
                        <input
                          type="number"
                          className="form-control"
                          value={hospitalData.noOfBeds || ''}
                          onChange={(e) => { setHospitalData({ ...hospitalData, noOfBeds: e.target.value }); markEdited(); }}
                        />
                      ) : (
                        <p>{hospitalData.noOfBeds || 'N/A'}</p>
                      )}
                    </div>

                    {/* NEW: Auto Visit (display-only) */}
                    <div className="col-md-4 mb-3">
                      <label className="form-label"><strong>Auto Visit (by Agent count)</strong></label>
                      <p className="mb-0">{autoVisit || 'N/A'}</p>
                      <small className="text-muted">1–3 Low, 4–7 Medium, 8+ Fully</small>
                    </div>

                    <div className="col-md-4 mb-3">
                      <label className="form-label"><strong>Timing</strong></label>
                      {isEditMode ? (
                        <input
                          type="text"
                          className="form-control"
                          value={hospitalData.timing || ''}
                          onChange={(e) => { setHospitalData({ ...hospitalData, timing: e.target.value }); markEdited(); }}
                        />
                      ) : (
                        <p>{hospitalData.timing || 'N/A'}</p>
                      )}
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label"><strong>Location</strong></label>
                      {isEditMode ? (
                        <input
                          type="text"
                          className="form-control"
                          value={hospitalData.location || ''}
                          onChange={(e) => { setHospitalData({ ...hospitalData, location: e.target.value }); markEdited(); }}
                        />
                      ) : (
                        <p>{hospitalData.location || 'N/A'}</p>
                      )}
                    </div>
                    <div className="col-md-9 mb-3">
                      <label className="form-label"><strong>Address</strong></label>
                      {isEditMode ? (
                        <textarea
                          className="form-control"
                          rows={2}
                          value={hospitalData.address || ''}
                          onChange={(e) => { setHospitalData({ ...hospitalData, address: e.target.value }); markEdited(); }}
                        />
                      ) : (
                        <p>{hospitalData.address || 'N/A'}</p>
                      )}
                    </div>
                    <div className="col-md-3 mb-3">
                      <label className="form-label"><strong>Visit</strong></label>
                      {isEditMode ? (
                        <select
                          className="form-select"
                          value={hospitalData.visitType || ''}
                          onChange={(e) => {
                            setVisitTouched(true);
                            setHospitalData({ ...hospitalData, visitType: e.target.value });
                            markEdited();
                          }}
                        >
                          <option value="">Select Visit</option>
                          {visitTypeOptions.map(v => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      ) : (
                        <p>{hospitalData.visitType || 'N/A'}</p>
                      )}
                      <div className="form-text">
                        Auto-set by Agent count: 1–3 Low, 4–7 Medium, 8+ Fully
                      </div>
                    </div>

                    <div className="col-12 mb-3">
                      <label className="form-label"><strong>Location Link</strong></label>
                      {isEditMode ? (
                        <input
                          type="url"
                          className="form-control"
                          value={hospitalData.locationLink || ''}
                          onChange={(e) => { setHospitalData({ ...hospitalData, locationLink: e.target.value }); markEdited(); }}
                        />
                      ) : (
                        hospitalData.locationLink ? (
                          <p>
                            <a href={hospitalData.locationLink} target="_blank" rel="noopener noreferrer">
                              {hospitalData.locationLink}
                            </a>
                          </p>
                        ) : <p>N/A</p>
                      )}
                    </div>

                    {/* Hospital Comments */}
                    <div className="col-12">
                      <label className="form-label"><strong>Comments</strong></label>
                      <div className="mb-2">
                        <textarea
                          className="form-control"
                          placeholder="Add a comment"
                          rows={3}
                          disabled={!isEditMode}
                          value={hospitalCommentInput}
                          onChange={(e) => setHospitalCommentInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              addHospitalComment();
                            }
                          }}
                        />
                        {isEditMode && (
                          <button className="btn btn-sm btn-outline-secondary mt-2" onClick={addHospitalComment}>
                            Add Comment
                          </button>
                        )}
                      </div>
                      {(hospitalData.comments && hospitalData.comments.length > 0) ? (
                        <div className="mt-2">
                          {hospitalData.comments.map((c) => (
                            <div key={c.id || c.date} className="border-bottom pb-2 mb-2">
                              <p className="mb-0">{c.text}</p>
                              <small className="text-muted">{new Date(c.date).toLocaleString()}</small>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>No comments added</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Agent Details Tab */}
                {activeTab === 'agentDetails' && (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3 agent-details">
                      <h5>Agent Details</h5>
                      {isEditMode && (
                        <button type="button" className="btn btn-primary btn-sm" onClick={addNewAgent}>
                          + Add Agent
                        </button>
                      )}
                    </div>

                    {agents.length === 0 ? (
                      <div className="text-center py-4">
                        <p>No agents added yet.</p>
                      </div>
                    ) : (
                      <>
                        {currentAgents.map((agent, index) => {
                          const originalIndex = agentStartIndex + index;
                          const locked = isAgentLocked(agent);
                          return (
                            <div key={agent.id || originalIndex} className="bg-light p-3 mb-3 rounded">
                              {agentSuccess[originalIndex] && (
                                <div className="alert alert-success alert-dismissible fade show mb-3" role="alert">
                                  Agent saved successfully!
                                  <button type="button" className="btn-close" onClick={() => setAgentSuccess({ ...agentSuccess, [originalIndex]: false })}></button>
                                </div>
                              )}

                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <h6 className="mb-0">
                                  Agent ID: {agent.id}
                                  {locked && <span className="badge bg-secondary ms-2">Saved</span>}
                                </h6>
                                {isEditMode && !locked && (
                                  <button
                                    type="button"
                                    className="btn btn-danger btn-sm"
                                    onClick={() => removeAgent(originalIndex)}
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>

                              <div className="row">
                                <div className="col-md-4 mb-2">
                                  <label className="form-label">Name<span className="text-danger">*</span></label>
                                  {isEditMode && !locked ? (
                                    <>
                                      <input
                                        type="text"
                                        className={`form-control ${agentErrors[originalIndex]?.name ? 'is-invalid' : ''}`}
                                        value={agent.name}
                                        onChange={(e) => handleAgentChange(originalIndex, 'name', e.target.value)}
                                      />
                                      {agentErrors[originalIndex]?.name && (
                                        <div className="invalid-feedback">{agentErrors[originalIndex].name}</div>
                                      )}
                                    </>
                                  ) : (
                                    <p>{agent.name || 'N/A'}</p>
                                  )}
                                </div>

                                <div className="col-md-4 mb-2">
                                  <label className="form-label">Designation<span className="text-danger">*</span></label>
                                  {isEditMode && !locked ? (
                                    <>
                                      <select
                                        className={`form-select ${agentErrors[originalIndex]?.designation ? 'is-invalid' : ''}`}
                                        value={agent.designation}
                                        onChange={(e) => handleAgentChange(originalIndex, 'designation', e.target.value)}
                                      >
                                        <option value="">Select Designation</option>
                                        {designationOptions.map(option => (
                                          <option key={option} value={option}>{option}</option>
                                        ))}
                                      </select>
                                      {agentErrors[originalIndex]?.designation && (
                                        <div className="invalid-feedback">{agentErrors[originalIndex].designation}</div>
                                      )}
                                    </>
                                  ) : (
                                    <p>{agent.designation || 'N/A'}</p>
                                  )}
                                </div>

                                <div className="col-md-4 mb-2">
                                  <label className="form-label">Status</label>
                                  {isEditMode && !locked ? (
                                    <select
                                      className="form-select"
                                      value={agent.status}
                                      onChange={(e) => handleAgentChange(originalIndex, 'status', e.target.value)}
                                    >
                                      <option value="">Select Status</option>
                                      {statusOptions.map(option => (
                                        <option key={option} value={option}>{option}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className={`badge bg-${getStatusColor(agent.status)}`}>
                                      {agent.status || 'N/A'}
                                    </span>
                                  )}
                                </div>

                                <div className="col-md-4 mb-2">
                                  <label className="form-label">Mobile No<span className="text-danger">*</span></label>
                                  {isEditMode && !locked ? (
                                    <>
                                      <input
                                        type="tel"
                                        className={`form-control ${agentErrors[originalIndex]?.mobileNo ? 'is-invalid' : ''}`}
                                        value={agent.mobileNo}
                                        onChange={(e) => handleAgentChange(originalIndex, 'mobileNo', e.target.value)}
                                        maxLength="10"
                                      />
                                      {agentErrors[originalIndex]?.mobileNo && (
                                        <div className="invalid-feedback">{agentErrors[originalIndex].mobileNo}</div>
                                      )}
                                    </>
                                  ) : (
                                    <div className="d-flex align-items-center">
                                      <span>{agent.mobileNo || 'N/A'}</span>
                                      {agent.mobileNo && (
                                        <a
                                          href={`tel:${agent.mobileNo}`}
                                          className="btn btn-sm btn-outline-primary ms-2"
                                        >
                                          Call
                                        </a>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="col-md-4 mb-2">
                                  <label className="form-label">UPI No</label>
                                  {isEditMode && !locked ? (
                                    <input
                                      type="text"
                                      className="form-control"
                                      value={agent.upiNo}
                                      onChange={(e) => handleAgentChange(originalIndex, 'upiNo', e.target.value)}
                                    />
                                  ) : (
                                    <p>{agent.upiNo || 'N/A'}</p>
                                  )}
                                </div>

                                <div className="col-md-4 mb-2">
                                  <label className="form-label">UPI Name</label>
                                  {isEditMode && !locked ? (
                                    <input
                                      type="text"
                                      className="form-control"
                                      value={agent.upiName}
                                      onChange={(e) => handleAgentChange(originalIndex, 'upiName', e.target.value)}
                                    />
                                  ) : (
                                    <p>{agent.upiName || 'N/A'}</p>
                                  )}
                                </div>

                                <div className="col-12 mb-2">
                                  <label className="form-label">Comments</label>
                                  <div>
                                    <textarea
                                      className="form-control mb-2"
                                      placeholder="Add a comment"
                                      value={agentCommentInputs[originalIndex] || ''}
                                      onChange={(e) => setAgentCommentInputs(prev => ({
                                        ...prev,
                                        [originalIndex]: e.target.value
                                      }))}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          addAgentComment(originalIndex);
                                        }
                                      }}
                                      disabled={!isEditMode}
                                      rows={3}
                                    />
                                    {isEditMode && (
                                      <button
                                        className="btn btn-sm btn-outline-secondary"
                                        onClick={() => addAgentComment(originalIndex)}
                                      >
                                        Add Comment
                                      </button>
                                    )}
                                  </div>

                                  {agent.comments && agent.comments.length > 0 ? (
                                    <div className="mt-2">
                                      {agent.comments.map((comment) => (
                                        <div key={comment.id || comment.date} className="border-bottom pb-2 mb-2">
                                          <p className="mb-0">{comment.text}</p>
                                          <small className="text-muted">
                                            {new Date(comment.date).toLocaleString()}
                                          </small>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p>No comments added</p>
                                  )}
                                </div>

                                {isEditMode && !locked && (
                                  <div className="col-12 mt-3">
                                    <button
                                      type="button"
                                      className="btn btn-success"
                                      onClick={() => handleAgentSubmit(originalIndex)}
                                    >
                                      Save Agent
                                    </button>
                                  </div>
                                )}
                              </div>
                              <hr className="mt-3" />
                            </div>
                          );
                        })}

                        {/* Agent Pagination */}
                        {totalAgentPages > 1 && (
                          <nav aria-label="Agent pagination">
                            <ul className="pagination justify-content-center">
                              <li className={`page-item ${currentAgentPage === 1 ? 'disabled' : ''}`}>
                                <button
                                  className="page-link"
                                  onClick={() => setCurrentAgentPage(currentAgentPage - 1)}
                                  disabled={currentAgentPage === 1}
                                >
                                  Previous
                                </button>
                              </li>
                              {[...Array(totalAgentPages)].map((_, i) => (
                                <li key={i} className={`page-item ${currentAgentPage === i + 1 ? 'active' : ''}`}>
                                  <button
                                    className="page-link"
                                    onClick={() => setCurrentAgentPage(i + 1)}
                                  >
                                    {i + 1}
                                  </button>
                                </li>
                              ))}
                              <li className={`page-item ${currentAgentPage === totalAgentPages ? 'disabled' : ''}`}>
                                <button
                                  className="page-link"
                                  onClick={() => setCurrentAgentPage(currentAgentPage + 1)}
                                  disabled={currentAgentPage === totalAgentPages}
                                >
                                  Next
                                </button>
                              </li>
                            </ul>
                          </nav>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Payment Details Tab */}
                {activeTab === 'paymentDetails' && (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3 payment-details">
                      <h5>Payment Details</h5>
                      {isEditMode && (
                        <div className="d-flex">
                          <input
                            type="text"
                            className="form-control me-2"
                            placeholder="Enter Agent ID (e.g., H1-1)"
                            value={paymentIdInput}
                            onChange={(e) => setPaymentIdInput(e.target.value)}
                            style={{ width: '200px' }}
                          />
                          <button
                            type="button"
                            className="btn btn-info me-2"
                            onClick={handlePaymentIdSearch}
                          >
                            Search
                          </button>
                          <button type="button" className="btn btn-primary btn-sm" onClick={addNewPayment}>
                            + Add Payment
                          </button>
                        </div>
                      )}
                    </div>

                    {payments.length === 0 ? (
                      <div className="text-center py-4">
                        <p>No payments added yet.</p>
                      </div>
                    ) : (
                      <>
                        {currentPayments.map((payment, index) => {
                          const originalIndex = paymentStartIndex + index;
                          const locked = isPaymentLocked(payment);
                          return (
                            <div key={payment.id || originalIndex} className="bg-light p-3 mb-3 rounded">
                              {paymentSuccess[originalIndex] && (
                                <div className="alert alert-success alert-dismissible fade show mb-3" role="alert">
                                  Payment submitted successfully!
                                  <button type="button" className="btn-close" onClick={() => setPaymentSuccess({ ...paymentSuccess, [originalIndex]: false })}></button>
                                </div>
                              )}

                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <h6 className="mb-0">
                                  Payment ID: {payment.id}
                                  {locked && <span className="badge bg-secondary ms-2">Submitted</span>}
                                </h6>
                                {isEditMode && !locked && (
                                  <button
                                    type="button"
                                    className="btn btn-danger btn-sm"
                                    onClick={() => removePayment(originalIndex)}
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>

                              <div className="row">
                                <div className="col-md-3 mb-2">
                                  <label className="form-label"><strong>Date</strong></label>
                                  {isEditMode && !locked ? (
                                    <>
                                      <input
                                        type="date"
                                        className={`form-control ${paymentErrors[originalIndex]?.date ? 'is-invalid' : ''}`}
                                        value={payment.date || ''}
                                        onChange={(e) => handlePaymentChange(originalIndex, 'date', e.target.value)}
                                      />
                                      {paymentErrors[originalIndex]?.date && (
                                        <div className="invalid-feedback">{paymentErrors[originalIndex].date}</div>
                                      )}
                                    </>
                                  ) : (
                                    <p>{payment.date || 'N/A'}</p>
                                  )}
                                </div>

                                <div className="col-md-3 mb-2">
                                  <label className="form-label"><strong>Agent Name</strong></label>
                                  {isEditMode && !locked ? (
                                    <input
                                      type="text"
                                      className="form-control"
                                      value={payment.name}
                                      onChange={(e) => handlePaymentChange(originalIndex, 'name', e.target.value)}
                                    />
                                  ) : (
                                    <p>{payment.name || 'N/A'}</p>
                                  )}
                                </div>

                                <div className="col-md-3 mb-2">
                                  <label className="form-label"><strong>Agent Mobile No</strong></label>
                                  {isEditMode && !locked ? (
                                    <input
                                      type="tel"
                                      className="form-control"
                                      value={payment.mobileNo}
                                      onChange={(e) => handlePaymentChange(originalIndex, 'mobileNo', e.target.value)}
                                    />
                                  ) : (
                                    <div className="d-flex align-items-center">
                                      <span>{payment.mobileNo || 'N/A'}</span>
                                      {payment.mobileNo && (
                                        <a
                                          href={`tel:${payment.mobileNo}`}
                                          className="btn btn-sm btn-outline-primary ms-2"
                                        >
                                          Call
                                        </a>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="col-md-3 mb-2">
                                  <label className="form-label"><strong>Agent UPI No</strong></label>
                                  {isEditMode && !locked ? (
                                    <input
                                      type="text"
                                      className="form-control"
                                      value={payment.upiNo}
                                      onChange={(e) => handlePaymentChange(originalIndex, 'upiNo', e.target.value)}
                                    />
                                  ) : (
                                    <p>{payment.upiNo || 'N/A'}</p>
                                  )}
                                </div>

                                <div className="col-md-3 mb-2">
                                  <label className="form-label"><strong>Client ID</strong></label>
                                  {isEditMode && !locked ? (
                                    <input
                                      type="text"
                                      className="form-control"
                                      value={payment.clientId}
                                      onChange={(e) => handlePaymentChange(originalIndex, 'clientId', e.target.value)}
                                    />
                                  ) : (
                                    <p>{payment.clientId || 'N/A'}</p>
                                  )}
                                </div>

                                <div className="col-md-3 mb-2">
                                  <label className="form-label"><strong>Client Name</strong></label>
                                  {isEditMode && !locked ? (
                                    <input
                                      type="text"
                                      className="form-control"
                                      value={payment.clientName}
                                      onChange={(e) => handlePaymentChange(originalIndex, 'clientName', e.target.value)}
                                    />
                                  ) : (
                                    <p>{payment.clientName || 'N/A'}</p>
                                  )}
                                </div>

                                <div className="col-md-3 mb-2">
                                  <label className="form-label">Service Type</label>
                                  {isEditMode && !locked ? (
                                    <input
                                      type="text"
                                      className="form-control"
                                      value={payment.serviceType}
                                      onChange={(e) => handlePaymentChange(originalIndex, 'serviceType', e.target.value)}
                                    />
                                  ) : (
                                    <p>{payment.serviceType || 'N/A'}</p>
                                  )}
                                </div>

                                <div className="col-md-3 mb-2">
                                  <label className="form-label"><strong>Service Charges</strong></label>
                                  {isEditMode && !locked ? (
                                    <input
                                      type="number"
                                      className="form-control"
                                      value={payment.serviceCharges}
                                      onChange={(e) => handlePaymentChange(originalIndex, 'serviceCharges', e.target.value)}
                                    />
                                  ) : (
                                    <p>{payment.serviceCharges || 'N/A'}</p>
                                  )}
                                </div>

                                <div className="col-md-3 mb-2">
                                  <label className="form-label"><strong>Commition</strong><span className="text-danger">*</span></label>
                                  {isEditMode && !locked ? (
                                    <>
                                      <input
                                        type="number"
                                        className={`form-control ${paymentErrors[originalIndex]?.commition ? 'is-invalid' : ''}`}
                                        value={payment.commition}
                                        onChange={(e) => handlePaymentChange(originalIndex, 'commition', e.target.value)}
                                      />
                                      {paymentErrors[originalIndex]?.commition && (
                                        <div className="invalid-feedback">{paymentErrors[originalIndex].commition}</div>
                                      )}
                                    </>
                                  ) : (
                                    <p>{payment.commition || 'N/A'}</p>
                                  )}
                                </div>

                                <div className="col-md-3 mb-2">
                                  <label className="form-label"><strong>Payment Mode</strong><span className="text-danger">*</span></label>
                                  {isEditMode && !locked ? (
                                    <>
                                      <select
                                        className={`form-select ${paymentErrors[originalIndex]?.paymentMode ? 'is-invalid' : ''}`}
                                        value={payment.paymentMode}
                                        onChange={(e) => handlePaymentChange(originalIndex, 'paymentMode', e.target.value)}
                                      >
                                        <option value="">Select Payment Mode</option>
                                        {paymentModeOptions.map(option => (
                                          <option key={option} value={option}>{option}</option>
                                        ))}
                                      </select>
                                      {paymentErrors[originalIndex]?.paymentMode && (
                                        <div className="invalid-feedback">{paymentErrors[originalIndex].paymentMode}</div>
                                      )}
                                    </>
                                  ) : (
                                    <p>{payment.paymentMode || 'N/A'}</p>
                                  )}
                                </div>

                                <div className="col-12 mb-2">
                                  <label className="form-label"><strong>Comments</strong></label>
                                  {isEditMode && !locked ? (
                                    <textarea
                                      className="form-control"
                                      value={payment.comments}
                                      onChange={(e) => handlePaymentChange(originalIndex, 'comments', e.target.value)}
                                      rows="2"
                                    />
                                  ) : (
                                    <p>{payment.comments || 'N/A'}</p>
                                  )}
                                </div>

                                {/* Submit/Lock button for payments */}
                                {isEditMode && !locked && (
                                  <div className="col-12 mt-3">
                                    <button
                                      type="button"
                                      className="btn btn-success"
                                      onClick={() => handlePaymentSubmit(originalIndex)}
                                    >
                                      Submit Payment
                                    </button>
                                  </div>
                                )}

                                {/* Show submission date if locked */}
                                {locked && payment.submittedAt && (
                                  <div className="col-12 mt-2">
                                    <small className="text-muted">
                                      Submitted on: {new Date(payment.submittedAt).toLocaleString()}
                                    </small>
                                  </div>
                                )}
                              </div>
                              <hr className="mt-3" />
                            </div>
                          );
                        })}

                        {/* Payment Pagination */}
                        {totalPaymentPages > 1 && (
                          <nav aria-label="Payment pagination">
                            <ul className="pagination justify-content-center">
                              <li className={`page-item ${currentPaymentPage === 1 ? 'disabled' : ''}`}>
                                <button
                                  className="page-link"
                                  onClick={() => setCurrentPaymentPage(currentPaymentPage - 1)}
                                  disabled={currentPaymentPage === 1}
                                >
                                  Previous
                                </button>
                              </li>
                              {[...Array(totalPaymentPages)].map((_, i) => (
                                <li key={i} className={`page-item ${currentPaymentPage === i + 1 ? 'active' : ''}`}>
                                  <button
                                    className="page-link"
                                    onClick={() => setCurrentPaymentPage(i + 1)}
                                  >
                                    {i + 1}
                                  </button>
                                </li>
                              ))}
                              <li className={`page-item ${currentPaymentPage === totalPaymentPages ? 'disabled' : ''}`}>
                                <button
                                  className="page-link"
                                  onClick={() => setCurrentPaymentPage(currentPaymentPage + 1)}
                                  disabled={currentPaymentPage === totalPaymentPages}
                                >
                                  Next
                                </button>
                              </li>
                            </ul>
                          </nav>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* NEW: Agent List Tab */}
                {activeTab === 'agentList' && (
                  <div>
                    <h5 className="mb-3">Agent List</h5>
                    <div className="table-responsive">
                      <table className="table table-bordered table-striped align-middle">
                        <thead className="table-light">
                          <tr>
                            <th style={{width:'120px'}}>ID NO</th>
                            <th>Name</th>
                            <th>Designation</th>
                            <th>Status</th>
                            <th style={{width:'220px'}}>Mobile No</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agents.length === 0 ? (
                            <tr><td colSpan="5" className="text-center py-4">No agents</td></tr>
                          ) : (
                            agents.map((a, idx) => (
                              <tr key={a.id || idx}>
                                <td>{a.id || '—'}</td>
                                <td>{a.name || '—'}</td>
                                <td>{a.designation || '—'}</td>
                                <td>
                                  {a.status
                                    ? <span className={`badge bg-${getStatusColor(a.status)}`}>{a.status}</span>
                                    : '—'}
                                </td>
                                <td>
                                  <div className="d-flex align-items-center">
                                    <span>{a.mobileNo || '—'}</span>
                                    {a.mobileNo && (
                                      <a href={`tel:${a.mobileNo}`} className="btn btn-sm btn-outline-primary ms-2">
                                        Call
                                      </a>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* NEW: Payment List Tab */}
                {activeTab === 'paymentList' && (
                  <div>
                    <h5 className="mb-3">Payment List</h5>
                    <div className="table-responsive">
                      <table className="table table-bordered table-striped align-middle">
                        <thead className="table-light">
                          <tr>
                            <th style={{width:'130px'}}>Date</th>
                            <th>Agent Name</th>
                            <th>Client Name</th>
                            <th style={{width:'150px'}}>Commition</th>
                            <th style={{width:'160px'}}>Payment Mode</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.length === 0 ? (
                            <tr><td colSpan="5" className="text-center py-4">No payments</td></tr>
                          ) : (
                            <>
                              {payments.map((p, idx) => (
                                <tr key={p.id || idx}>
                                  <td>{p.date || (p.createdAt ? new Date(p.createdAt).toISOString().slice(0,10) : '—')}</td>
                                  <td>{p.name || '—'}</td>
                                  <td>{p.clientName || '—'}</td>
                                  <td>{(p.commition !== undefined && p.commition !== null && p.commition !== '') ? Number(p.commition) : '—'}</td>
                                  <td>{p.paymentMode || '—'}</td>
                                </tr>
                              ))}
                              {/* Total Row */}
                              <tr className="fw-bold">
                                <td colSpan="3" className="text-end">Total Amount</td>
                                <td>{sumCommission()}</td>
                                <td></td>
                              </tr>
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={handleClose}>
                Close
              </button>
              {isEditMode && (
                <button type="button" className="btn btn-primary" onClick={handleSave}>
                  Save All Changes
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HospitalModal;