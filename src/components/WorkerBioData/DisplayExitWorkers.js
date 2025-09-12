import React, { useState, useEffect, useRef } from 'react';
import firebaseDB from '../../firebase';
import editIcon from '../../assets/eidt.svg';
import viewIcon from '../../assets/view.svg';
import deleteIcon from '../../assets/delete.svg'; // (not used but kept if you use elsewhere)
import returnIcon from '../../assets/return.svg';
import WorkerModal from './WorkerModal';

export default function DisplayExitWorkers() {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilters, setGenderFilters] = useState({
    Male: false,
    Female: false
  });
  const [skillFilters, setSkillFilters] = useState({
    Nursing: false,
    Diaper: false,
    'Patent Care': false,
    'Baby Care': false,
    Cook: false
  });

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Return flow modals & validation
  const [showReturnConfirm, setShowReturnConfirm] = useState(false);
  const [employeeToReturn, setEmployeeToReturn] = useState(null);
  const [showReturnedModal, setShowReturnedModal] = useState(false);
  const [showReturnReasonModal, setShowReturnReasonModal] = useState(false);
  const [returnReasonForm, setReturnReasonForm] = useState({ reasonType: "", comment: "" });

  const [returnError, setReturnError] = useState(null); // server/general error shown at top of modal
  const [reasonError, setReasonError] = useState(null); // inline validation for select
  const [commentError, setCommentError] = useState(null); // inline validation for textarea

  // Save success modal
  const [showSaveModal, setShowSaveModal] = useState(false);

  // refs for focusing invalid controls
  const reasonSelectRef = useRef(null);
  const commentRef = useRef(null);

  useEffect(() => {
    const fetchEmployees = () => {
      try {
        firebaseDB.child('ExitEmployees').on('value', (snapshot) => {
          if (snapshot.exists()) {
            const employeesData = [];
            snapshot.forEach((childSnapshot) => {
              employeesData.push({
                id: childSnapshot.key,
                ...childSnapshot.val(),
              });
            });

            const sortedEmployees = sortEmployeesDescending(employeesData);
            setEmployees(sortedEmployees);
            setFilteredEmployees(sortedEmployees);
            setTotalPages(Math.ceil(sortedEmployees.length / rowsPerPage));
          } else {
            setEmployees([]);
            setFilteredEmployees([]);
            setTotalPages(1);
          }
          setLoading(false);
        });
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchEmployees();

    return () => {
      firebaseDB.child('ExitEmployees').off('value');
    };
  }, []); // eslint-disable-line

  // Filter employees based on search term and filters
  useEffect(() => {
    let filtered = employees;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(employee =>
        (employee.firstName && employee.firstName.toLowerCase().includes(term)) ||
        (employee.lastName && employee.lastName.toLowerCase().includes(term)) ||
        (employee.idNo && employee.idNo.toLowerCase().includes(term)) ||
        (employee.employeeId && employee.employeeId.toLowerCase().includes(term)) ||
        (employee.primarySkill && employee.primarySkill.toLowerCase().includes(term)) ||
        (employee.gender && employee.gender.toLowerCase().includes(term))
      );
    }

    // Apply gender filters
    const activeGenderFilters = Object.keys(genderFilters).filter(key => genderFilters[key]);
    if (activeGenderFilters.length > 0) {
      filtered = filtered.filter(employee =>
        employee.gender && activeGenderFilters.includes(employee.gender)
      );
    }

    // Apply skill filters
    const activeSkillFilters = Object.keys(skillFilters).filter(key => skillFilters[key]);
    if (activeSkillFilters.length > 0) {
      filtered = filtered.filter(employee =>
        employee.primarySkill && activeSkillFilters.includes(employee.primarySkill)
      );
    }

    setFilteredEmployees(filtered);
    setTotalPages(Math.ceil(filtered.length / rowsPerPage));
    setCurrentPage(1);
  }, [employees, searchTerm, genderFilters, skillFilters, rowsPerPage]);

  useEffect(() => {
    setTotalPages(Math.ceil(filteredEmployees.length / rowsPerPage));
  }, [filteredEmployees, rowsPerPage]);

  const sortEmployeesDescending = (employeesData) => {
    return employeesData.sort((a, b) => {
      const aId = (a.employeeId || a.idNo || '').toString().replace(/\D/g, '');
      const bId = (b.employeeId || b.idNo || '').toString().replace(/\D/g, '');
      const aNum = parseInt(aId || '0', 10);
      const bNum = parseInt(bId || '0', 10);
      return bNum - aNum;
    });
  };

  const indexOfLastEmployee = currentPage * rowsPerPage;
  const indexOfFirstEmployee = indexOfLastEmployee - rowsPerPage;
  const currentEmployees = filteredEmployees.slice(indexOfFirstEmployee, indexOfLastEmployee);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const getDisplayedPageNumbers = () => {
    const numbers = [];
    const maxPagesToShow = 5;
    const half = Math.floor(maxPagesToShow / 2);

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) numbers.push(i);
      return numbers;
    }

    if (currentPage <= half + 1) {
      for (let i = 1; i <= maxPagesToShow; i++) numbers.push(i);
      numbers.push('...', totalPages);
    } else if (currentPage >= totalPages - half) {
      numbers.push(1, '...');
      for (let i = totalPages - maxPagesToShow + 1; i <= totalPages; i++) numbers.push(i);
    } else {
      numbers.push(1, '...');
      for (let i = currentPage - half; i <= currentPage + half; i++) numbers.push(i);
      numbers.push('...', totalPages);
    }

    return numbers;
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle gender filter change
  const handleGenderFilterChange = (gender) => {
    setGenderFilters(prev => ({
      ...prev,
      [gender]: !prev[gender]
    }));
  };

  // Handle skill filter change
  const handleSkillFilterChange = (skill) => {
    setSkillFilters(prev => ({
      ...prev,
      [skill]: !prev[skill]
    }));
  };

  const handleView = (employee) => {
    setSelectedEmployee(employee);
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleEdit = (employee) => {
    setSelectedEmployee(employee);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  // Return flow open/close confirm
  const openReturnConfirm = (employee) => {
    setEmployeeToReturn(employee);
    setShowReturnConfirm(true);
  };

  const closeReturnConfirm = () => {
    setShowReturnConfirm(false);
    setEmployeeToReturn(null);
    setReturnError(null);
    setReasonError(null);
    setCommentError(null);
  };

  // Confirm → instead of immediate move, open reason modal to collect return comment
  const handleReturnConfirmed = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!employeeToReturn) return;
    setShowReturnConfirm(false);
    setReturnReasonForm({ reasonType: "", comment: "" });
    setReturnError(null);
    setReasonError(null);
    setCommentError(null);
    setShowReturnReasonModal(true);

    // focus the select after a tiny delay to ensure mounted
    setTimeout(() => {
      if (reasonSelectRef.current) reasonSelectRef.current.focus();
    }, 50);
  };

  // local validation for return reason modal
  const validateReturnForm = () => {
    let ok = true;
    setReasonError(null);
    setCommentError(null);

    if (!returnReasonForm.reasonType) {
      setReasonError('Please select a reason for return.');
      ok = false;
    }
    if (!returnReasonForm.comment || !String(returnReasonForm.comment).trim()) {
      setCommentError('Please enter a comment for return (mandatory).');
      ok = false;
    }

    // focus first invalid
    setTimeout(() => {
      if (!ok) {
        if (!returnReasonForm.reasonType && reasonSelectRef.current) {
          reasonSelectRef.current.focus();
          reasonSelectRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        if ((!returnReasonForm.comment || !String(returnReasonForm.comment).trim()) && commentRef.current) {
          commentRef.current.focus();
          commentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 0);

    return ok;
  };

  // Submit return with reason: move back to EmployeeBioData and save comment
  const submitReturnWithReason = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!employeeToReturn) {
      setReturnError('No employee selected to return.');
      return;
    }

    if (!validateReturnForm()) {
      // keep modal open, inline errors are set
      return;
    }

    const { id, ...payload } = employeeToReturn;
    try {
      const returnedAt = new Date().toISOString();
      const payloadToActive = {
        ...payload,
        status: 'On Duty',
        returnedAt,
        __returnInfo: {
          reasonType: returnReasonForm.reasonType,
          comment: returnReasonForm.comment.trim(),
          returnedAt,
        }
      };

      await firebaseDB.child(`EmployeeBioData/${id}`).set(payloadToActive);
      // also update ExitEmployees node to keep history (store revert info)
      await firebaseDB.child(`ExitEmployees/${id}`).update({ revertedAt: returnedAt, revertReason: returnReasonForm.reasonType, revertComment: returnReasonForm.comment.trim() });

      await firebaseDB.child(`ExitEmployees/${id}`).remove();

      setShowReturnReasonModal(false);
      setShowReturnedModal(true);
      setReturnError(null);
      setReasonError(null);
      setCommentError(null);
      setEmployeeToReturn(null);
    } catch (err) {
      console.error(err);
      // show server error at top and keep modal open for retry
      setReturnError('Error returning employee: ' + (err.message || err));
    }
  };

  const closeReturnedModal = () => {
    setShowReturnedModal(false);
  };

  const handleSave = async (updatedEmployee) => {
    try {
      await firebaseDB.child(`ExitEmployees/${updatedEmployee.id}`).update(updatedEmployee);
      setIsModalOpen(false);
      setShowSaveModal(true);
    } catch (err) {
      setError('Error updating employee: ' + err.message);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
  };

  const handleRowsPerPageChange = (e) => {
    setRowsPerPage(Number(e.target.value));
  };

  if (loading) {
    return <div className="container py-4">Loading...</div>;
  }

  // Note: keep the top-level error behavior (you can change to inline banner if you prefer)
  if (error) {
    return <div className="container py-4 text-danger">Error: {error}</div>;
  }

  return (
    <div className="container-fluid py-4">
      {/* Search Bar */}
      <div className="row mb-3">
        <div className="col-md-6 m-auto">
          <div className="input-group">
            <span className="input-group-text">
              <i className="bi bi-search"></i>
            </span>
            <input
              type="text"
              className="form-control search-bar"
              placeholder="Search by name, ID, skill, or gender..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
        </div>
      </div>

      {/* Filter Checkboxes */}
      <div className="row mb-3">
        <div className="col-md-8 m-auto">
          <div className="chec-box-card">
            <div className="card-body py-2 justify-content-between filter-wrapper">
              <div className="row w-100">
                <div className="col-md-3">
                  <strong className="me-2">Gender:</strong>
                  {Object.keys(genderFilters).map(gender => (
                    <div className="form-check form-check-inline" key={gender}>
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={genderFilters[gender]}
                        onChange={() => handleGenderFilterChange(gender)}
                        id={`exit-gender-${gender}`}
                      />
                      <label className="form-check-label" htmlFor={`exit-gender-${gender}`}>
                        {gender}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="col-md-9">
                  <strong className="me-2">Skills:</strong>
                  {Object.keys(skillFilters).map(skill => (
                    <div className="form-check form-check-inline" key={skill}>
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={skillFilters[skill]}
                        onChange={() => handleSkillFilterChange(skill)}
                        id={`exit-skill-${skill}`}
                      />
                      <label className="form-check-label" htmlFor={`exit-skill-${skill}`}>
                        {skill}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <hr />

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Exit Employees</h4>

        <div className="d-flex align-items-center">
          <label className="me-2 mb-0">Rows:</label>
          <select
            className="form-select form-select-sm"
            style={{ width: '80px' }}
            value={rowsPerPage}
            onChange={handleRowsPerPageChange}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
          </select>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-dark table-hover">
          <thead className="table-dark">
            <tr>
              <th>Photo</th>
              <th>ID No ↓</th>
              <th>Name</th>
              <th>Gender</th>
              <th>Primary Skill</th>
              <th>Experience</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentEmployees.length > 0 ? (
              currentEmployees.map((employee) => (
                <tr key={employee.id}>
                  {/* Photo column */}
                  <td>
                    {employee.employeePhoto ? (
                      <img
                        src={employee.employeePhoto}
                        alt="Employee"
                        style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '50%' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '50px',
                          height: '50px',
                          backgroundColor: '#4c4b4b',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      />
                    )}
                  </td>

                  {/* ID */}
                  <td>
                    <strong>{employee.employeeId || employee.idNo || 'N/A'}</strong>
                  </td>

                  {/* Name */}
                  <td>{employee.firstName} {employee.lastName}</td>

                  {/* Gender */}
                  <td>{employee.gender || 'N/A'}</td>

                  {/* Primary Skill */}
                  <td>{employee.primarySkill || 'N/A'}</td>

                  {/* Experience */}
                  <td>{employee.workExperince ? `${employee.workExperince}` : 'N/A'}</td>

                  {/* Status */}
                  <td>
                    <span className={`badge ${getStatusBadgeClass(employee.status)}`}>
                      {employee.status || 'On Duty'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td>
                    <div className="d-flex">
                      <button
                        type="button"
                        className="btn btn-sm me-2"
                        title="View"
                        onClick={() => handleView(employee)}
                      >
                        <img src={viewIcon} alt="view Icon" style={{ opacity: 0.6, width: '18px', height: '18px' }} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm me-2"
                        title="Edit"
                        onClick={() => handleEdit(employee)}
                      >
                        <img src={editIcon} alt="edit Icon" style={{ width: '15px', height: '15px' }} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        title="Return Back"
                        onClick={() => openReturnConfirm(employee)}
                      >
                        <img src={returnIcon} alt="return Icon" style={{ width: '14px', height: '18px' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="text-center py-4">
                  No exit employees found matching your search criteria
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <nav aria-label="Page navigation" className="mt-3 pagination-wrapper">
        <ul className="pagination justify-content-center">
          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
            <button
              type="button"
              className="page-link"
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>
          </li>

          {getDisplayedPageNumbers().map((number, index) => (
            <li
              key={index}
              className={`page-item ${number === currentPage ? 'active' : ''} ${number === '...' ? 'disabled' : ''}`}
            >
              {number === '...' ? (
                <span className="page-link">...</span>
              ) : (
                <button
                  type="button"
                  className="page-link"
                  onClick={() => paginate(number)}
                >
                  {number}
                </button>
              )}
            </li>
          ))}

          <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
            <button
              type="button"
              className="page-link"
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </li>
        </ul>
      </nav>

      {/* View/Edit Modal */}
      {isModalOpen && (
        <WorkerModal
          employee={selectedEmployee}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSave}
          isEditMode={isEditMode}
        />
      )}

      {/* Return Confirm Modal */}
      {showReturnConfirm && employeeToReturn && (
        <div
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Return</h5>
                <button type="button" className="btn-close" onClick={closeReturnConfirm}></button>
              </div>
              <div className="modal-body">
                <p className="mb-0">Move this employee back to active employees?</p>
                <p className="mt-2">
                  <strong>ID:</strong> {employeeToReturn.employeeId || employeeToReturn.idNo || employeeToReturn.id} <br />
                  <strong>Name:</strong> {employeeToReturn.firstName} {employeeToReturn.lastName}
                </p>
                <small className="text-muted">
                  This will move the record from <strong>ExitEmployees</strong> to <strong>EmployeeBioData</strong>.
                </small>

                {/* show top-level return/server error inside confirm modal if present */}
                {returnError && <div className="text-danger mt-2">{returnError}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeReturnConfirm}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleReturnConfirmed}>Yes, Return</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Return Reason Modal */}
      {showReturnReasonModal && employeeToReturn && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Reason for Returning Worker</h5>
                <button type="button" className="btn-close" onClick={() => setShowReturnReasonModal(false)}></button>
              </div>
              <div className="modal-body">
                {/* server/general error at top of modal */}
                {returnError && <div className="alert alert-danger">{returnError}</div>}

                <div className="mb-3">
                  <label className="form-label"><strong>Reason</strong></label>
                  <select
                    ref={reasonSelectRef}
                    className={`form-select ${reasonError ? 'is-invalid' : ''}`}
                    value={returnReasonForm.reasonType}
                    onChange={(e) => { setReturnReasonForm(prev => ({ ...prev, reasonType: e.target.value })); setReasonError(null); setReturnError(null); }}
                  >
                    <option value="">Select Reason</option>
                    <option value="Re-Join">Re-Join</option>
                    <option value="Return">Return</option>
                    <option value="Good attitude">Good attitude</option>
                    <option value="One more chance">One more chance</option>
                    <option value="Recommendation">Recommendation</option>
                  </select>
                  {reasonError && <div className="invalid-feedback" style={{ display: 'block' }}>{reasonError}</div>}
                </div>
                <div className="mb-3">
                  <label className="form-label"><strong>Comment (mandatory)</strong></label>
                  <textarea
                    ref={commentRef}
                    className={`form-control ${commentError ? 'is-invalid' : ''}`}
                    rows={4}
                    value={returnReasonForm.comment}
                    onChange={(e) => { setReturnReasonForm(prev => ({ ...prev, comment: e.target.value })); setCommentError(null); setReturnError(null); }}
                  />
                  {commentError && <div className="invalid-feedback" style={{ display: 'block' }}>{commentError}</div>}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowReturnReasonModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={submitReturnWithReason}>Submit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Returned Success Modal */}
      {showReturnedModal && (
        <div
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Employee Returned</h5>
                <button type="button" className="btn-close" onClick={closeReturnedModal}></button>
              </div>
              <div className="modal-body">
                Employee moved back to <strong>Existing Employees</strong>.
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-success" onClick={closeReturnedModal}>Done</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Success Modal (when editing inside ExitEmployees) */}
      {showSaveModal && (
        <div
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Saved</h5>
                <button type="button" className="btn-close" onClick={() => setShowSaveModal(false)}></button>
              </div>
              <div className="modal-body">Employee details updated successfully.</div>
              <div className="modal-footer">
                <button type="button" className="btn btn-success" onClick={() => setShowSaveModal(false)}>Done</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function for status badge styling
const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'On Duty': return 'bg-success';
    case 'Off Duty': return 'bg-secondary';
    case 'Resigned': return 'bg-warning';
    case 'Absconder': return 'bg-danger';
    case 'Terminated': return 'bg-dark';
    default: return 'bg-info';
  }
};
