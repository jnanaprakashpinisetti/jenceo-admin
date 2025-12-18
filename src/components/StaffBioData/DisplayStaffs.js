import React, { useState, useEffect, useRef } from 'react';
import firebaseDB from '../../firebase';
import editIcon from '../../assets/eidt.svg';
import viewIcon from '../../assets/view.svg';
import deleteIcon from '../../assets/delete.svg';
import StaffModal from './StaffModal/StaffModal';

export default function DisplayWorkers() {
    const [employees, setEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Search and filters
    const [searchTerm, setSearchTerm] = useState('');
    const [genderFilters, setGenderFilters] = useState({
        Male: false,
        Female: false
    });
    const [skillFilters, setSkillFilters] = useState({
        Admin: false,
        Coordinator: false,
        Manager: false,
        HR:false,
        Operations:false,
        Accounts:false,
        User:false
       
    });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        const fetchEmployees = () => {
            try {
                firebaseDB.child("StaffBioData").on('value', (snapshot) => {
                    if (snapshot.exists()) {
                        const employeesData = [];
                        snapshot.forEach((childSnapshot) => {
                            employeesData.push({
                                id: childSnapshot.key,
                                ...childSnapshot.val()
                            });
                        });

                        // Sort employees by ID number in descending order
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
            firebaseDB.child("StaffBioData").off('value');
        };
    }, []); // eslint-disable-line

    // Filter employees based on search term and filters
    useEffect(() => {
        let filtered = employees;

        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(staff =>
                (staff.firstName && staff.firstName.toLowerCase().includes(term)) ||
                (staff.lastName && staff.lastName.toLowerCase().includes(term)) ||
                (staff.idNo && staff.idNo.toLowerCase().includes(term)) ||
                (staff.employeeId && staff.employeeId.toLowerCase().includes(term)) ||
                (staff.primarySkill && staff.primarySkill.toLowerCase().includes(term)) ||
                (staff.gender && staff.gender.toLowerCase().includes(term))
            );
        }

        // Apply gender filters
        const activeGenderFilters = Object.keys(genderFilters).filter(key => genderFilters[key]);
        if (activeGenderFilters.length > 0) {
            filtered = filtered.filter(staff =>
                staff.gender && activeGenderFilters.includes(staff.gender)
            );
        }

        // Apply skill filters
        const activeSkillFilters = Object.keys(skillFilters).filter(key => skillFilters[key]);
        if (activeSkillFilters.length > 0) {
            filtered = filtered.filter(staff =>
                staff.primarySkill && activeSkillFilters.includes(staff.primarySkill)
            );
        }

        setFilteredEmployees(filtered);
        setTotalPages(Math.ceil(filtered.length / rowsPerPage));
        setCurrentPage(1);
    }, [employees, searchTerm, genderFilters, skillFilters, rowsPerPage]);

    // Update total pages when rowsPerPage changes
    useEffect(() => {
        setTotalPages(Math.ceil(filteredEmployees.length / rowsPerPage));
    }, [filteredEmployees, rowsPerPage]);

    const sortEmployeesDescending = (employeesData) => {
        return employeesData.sort((a, b) => {
            // Get the ID numbers
            const idA = a.idNo || a.employeeId || '';
            const idB = b.idNo || b.employeeId || '';

            // For ST00001 pattern
            if (idA.startsWith('JW') && idB.startsWith('JW')) {
                const numA = parseInt(idA.replace('JW', '')) || 0;
                const numB = parseInt(idB.replace('JW', '')) || 0;
                return numB - numA;
            }

            // For numeric IDs
            if (!isNaN(idA) && !isNaN(idB)) {
                return parseInt(idB) - parseInt(idA);
            }

            // For string IDs
            return idB.localeCompare(idA);
        });
    };

    // Calculate current employees to display
    const indexOfLastEmployee = currentPage * rowsPerPage;
    const indexOfFirstEmployee = indexOfLastEmployee - rowsPerPage;
    const currentEmployees = filteredEmployees.slice(indexOfFirstEmployee, indexOfLastEmployee);

    // Change page
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    // Handle rows per page change
    const handleRowsPerPageChange = (e) => {
        setRowsPerPage(parseInt(e.target.value));
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

    // Generate page numbers for pagination
    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
    }

    // Show limited page numbers with ellipsis for many pages
    const getDisplayedPageNumbers = () => {
        if (totalPages <= 7) {
            return pageNumbers;
        }

        if (currentPage <= 4) {
            return [1, 2, 3, 4, 5, '...', totalPages];
        }

        if (currentPage >= totalPages - 3) {
            return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        }

        return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
    };

    const handleView = (staff) => {
        setSelectedEmployee(staff);
        setIsEditMode(false);
        setIsModalOpen(true);
    };

    const handleEdit = (staff) => {
        setSelectedEmployee(staff);
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    // Delete states + inline validation states
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState(null);
    const [showDeleteReasonModal, setShowDeleteReasonModal] = useState(false);
    const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);
    const [deleteError, setDeleteError] = useState(null); // server/general error
    const [reasonError, setReasonError] = useState(null); // inline for select
    const [commentError, setCommentError] = useState(null); // inline for textarea
    const [deleteReasonForm, setDeleteReasonForm] = useState({ reasonType: "", comment: "" });

    // refs for validation focusing
    const reasonSelectRef = useRef(null);
    const commentRef = useRef(null);

    // call to open confirmation first
    const openDeleteConfirm = (staff) => {
        setEmployeeToDelete(staff);
        setShowDeleteConfirm(true);
    };

    const closeDeleteConfirm = () => {
        setShowDeleteConfirm(false);
        // keep employeeToDelete until modal closed/handled
    };

    // When user confirms on the first confirm -> open reason modal
    const handleDeleteConfirmProceed = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setShowDeleteConfirm(false);
        setDeleteReasonForm({ reasonType: "", comment: "" });
        setDeleteError(null); // CLEAR previous server errors when opening reason modal
        setReasonError(null);
        setCommentError(null);
        setShowDeleteReasonModal(true);

        // focus the select (reason) short delay to ensure element mounted
        setTimeout(() => {
            if (reasonSelectRef.current) reasonSelectRef.current.focus();
        }, 50);
    };

    // Validate locally and show inline errors
    const validateDeleteForm = () => {
        let ok = true;
        setReasonError(null);
        setCommentError(null);

        if (!deleteReasonForm.reasonType) {
            setReasonError("Please select a reason.");
            ok = false;
        }
        if (!deleteReasonForm.comment || !deleteReasonForm.comment.trim()) {
            setCommentError("Comment is mandatory.");
            ok = false;
        }

        // focus first invalid field and scroll into view
        setTimeout(() => {
            if (!ok) {
                if (reasonError && reasonSelectRef.current) {
                    reasonSelectRef.current.focus();
                    reasonSelectRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }
                if (commentError && commentRef.current) {
                    commentRef.current.focus();
                    commentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }
                // If errors set in this tick, choose based on current form fields:
                if (!deleteReasonForm.reasonType && reasonSelectRef.current) {
                    reasonSelectRef.current.focus();
                    reasonSelectRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else if ((!deleteReasonForm.comment || !deleteReasonForm.comment.trim()) && commentRef.current) {
                    commentRef.current.focus();
                    commentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }, 0);

        return ok;
    };

    // When user submits reason -> actually perform delete / move
    const handleDeleteSubmitWithReason = async (e) => {
        if (e && e.preventDefault) e.preventDefault();

        // local validation first
        const ok = validateDeleteForm();
        if (!ok) {
            return;
        }

        if (!employeeToDelete) {
            setDeleteError("No staff selected for deletion.");
            return;
        }

        const { id } = employeeToDelete;
        try {
            // read staff data
            const snapshot = await firebaseDB.child(`StaffBioData/${id}`).once("value");
            const employeeData = snapshot.val();
            if (!employeeData) {
                setDeleteError("Staff data not found");
                // keep modal open for user
                return;
            }

            // attach removal metadata
            const payloadToExit = { ...employeeData };

            // Save staff record under ExitStaffs (without top-level removal fields)
            await firebaseDB.child(`ExitStaffs/${id}`).set(payloadToExit);

            // push removal entry into the item's removalHistory array
            const removalEntry = {
                removedAt: new Date().toISOString(),
                removedBy: (deleteReasonForm && deleteReasonForm.by) || 'UI',
                removalReason: deleteReasonForm.reasonType || '',
                removalComment: deleteReasonForm.comment ? deleteReasonForm.comment.trim() : ''
            };
            await firebaseDB.child(`ExitStaffs/${id}/removalHistory`).push(removalEntry);
            await firebaseDB.child(`StaffBioData/${id}`).remove();
// success -> close modal, clear states and show success modal
            setShowDeleteReasonModal(false);
            setEmployeeToDelete(null);
            setShowDeleteSuccessModal(true);
            setDeleteError(null);
            setReasonError(null);
            setCommentError(null);
        } catch (err) {
            console.error(err);
            // keep the reason modal open and show server error (and allow retry)
            setDeleteError('Error deleting staff: ' + (err.message || err));
        }
    };

    const handleDelete = async (employeeId) => {
        try {
            const employeeRef = firebaseDB.child(`StaffBioData/${employeeId}`);
            const snapshot = await employeeRef.once('value');
            const employeeData = snapshot.val();

            if (employeeData) {
                await firebaseDB.child(`ExitStaffs/${employeeId}`).set(employeeData);
                const removalEntrySimple = { removedAt: new Date().toISOString(), removedBy: 'UI', removalReason: '', removalComment: '' };
                await firebaseDB.child(`ExitStaffs/${employeeId}/removalHistory`).push(removalEntrySimple);
                
                await employeeRef.remove();
                alert('Staff moved to ExitStaffs successfully!');
            }
        } catch (err) {
            setError('Error deleting staff: ' + err.message);
        }
    };

    const handleSave = async (updatedEmployee) => {
        try {
            await firebaseDB.child(`StaffBioData/${updatedEmployee.id}`).update(updatedEmployee);
            setIsModalOpen(false);
        } catch (err) {
            setError('Error updating staff: ' + err.message);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedEmployee(null);
        setIsEditMode(false);
    };

    if (loading) return <div className="text-center my-5">Loading employees...</div>;
    if (error) return <div className="alert alert-danger">Error: {error}</div>;

    return (
        <div>
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
                <div className="col-12">
                    <div className="chec-box-card">
                        <div className="card-body py-2 filter-wrapper">
                            <div className="row w-100">
                                <div className="col-md-3">
                                    <strong className="me-2">Gender :</strong>
                                    {Object.keys(genderFilters).map(gender => (
                                        <div className="form-check form-check-inline" key={gender}>
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                checked={genderFilters[gender]}
                                                onChange={() => handleGenderFilterChange(gender)}
                                                id={`gender-${gender}`}
                                            />
                                            <label className="form-check-label" htmlFor={`gender-${gender}`}>
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
                                                id={`skill-${skill}`}
                                            />
                                            <label className="form-check-label" htmlFor={`skill-${skill}`}>
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

            <hr></hr>

            {/* Rows per page selector */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center">
                    <span className="me-2">Show</span>
                    <select
                        className="form-select form-select-sm"
                        style={{ width: '80px' }}
                        value={rowsPerPage}
                        onChange={handleRowsPerPageChange}
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={30}>30</option>
                        <option value={40}>40</option>
                        <option value={50}>50</option>
                    </select>
                    <span className="ms-2">entries</span>
                </div>
                <div>
                    Showing: {indexOfFirstEmployee + 1} - {Math.min(indexOfLastEmployee, filteredEmployees.length)} / {filteredEmployees.length}
                </div>
            </div>

            <div className="table-responsive mb-3">
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
                            currentEmployees.map((staff) => (
                                <tr key={staff.id} onClick={(e)=>{e.stopPropagation(); handleView(staff);}} style={{ cursor: 'pointer' }}>
                                    <td>
                                        {staff.employeePhoto ? (
                                            <img
                                                src={staff.employeePhoto}
                                                alt="Staff"
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
                                            >
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <strong>{staff.employeeId || staff.idNo || 'N/A'}</strong>
                                    </td>
                                    <td>{staff.firstName} {staff.lastName}</td>
                                    <td>{staff.gender || 'N/A'}</td>
                                    <td>{staff.primarySkill || 'N/A'}</td>
                                    <td>{staff.workExperince ? `${staff.workExperince}` : 'N/A'}</td>
                                    <td>
                                        <span className={`badge ${getStatusBadgeClass(staff.status)}`}>
                                            {staff.status || 'On Duty'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="d-flex">
                                            <button
                                                type="button"
                                                className="btn btn-sm me-2"
                                                title="View"
                                                onClick={(e)=>{e.stopPropagation(); handleView(staff);}}
                                            >
                                                <img src={viewIcon} alt="view Icon" style={{ opacity: 0.6, width: '18px', height: '18px' }} />
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-sm me-2"
                                                title="Edit"
                                                onClick={(e)=>{e.stopPropagation(); handleEdit(staff);}}
                                            >
                                                <img src={editIcon} alt="edit Icon" style={{ width: '15px', height: '15px' }} />
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-sm"
                                                title="Delete"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEmployeeToDelete(staff);
                                                    setShowDeleteConfirm(true);
                                                }}
                                            >
                                                <img src={deleteIcon} alt="delete Icon" style={{ width: '14px', height: '14px' }} />
                                            </button>

                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="8" className="text-center py-4">
                                    No employees found matching your search criteria
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
                <nav aria-label="Staff pagination" className='pagination-wrapper'>
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
            )}


      {/* Delete Success Modal */}
      {showDeleteSuccessModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Deleted</h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteSuccessModal(false)}></button>
              </div>
              <div className="modal-body">
                Staff moved to ExitStaffs successfully.
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-success" onClick={() => setShowDeleteSuccessModal(false)}>Done</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global delete/server error (keeps showing outside modals) */}
      {deleteError && !showDeleteReasonModal && (
        <div className="alert alert-danger mt-2">{deleteError}</div>
      )}
    
      {selectedEmployee && (
        <StaffModal
            staff={selectedEmployee}
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            onSave={handleSave}
            onDelete={handleDelete}
            isEditMode={isEditMode}
        />
      )}

            {/* Delete Confirm Modal */}
            {showDeleteConfirm && employeeToDelete && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1" role="dialog" aria-modal="true">
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Confirm Delete</h5>
                                <button type="button" className="btn-close" onClick={() => setShowDeleteConfirm(false)}></button>
                            </div>
                            <div className="modal-body">
                                <p>Do you want to delete the Staff ?</p>
                                <p><strong>ID:</strong> {employeeToDelete.employeeId || employeeToDelete.idNo || employeeToDelete.id}</p>
                                <p><strong>Name:</strong> {employeeToDelete.firstName} {employeeToDelete.lastName}</p>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                                <button type="button" className="btn btn-danger" onClick={handleDeleteConfirmProceed}>Yes</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Reason Modal (mandatory comment + dropdown) */}
            {showDeleteReasonModal && employeeToDelete && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1" role="dialog" aria-modal="true">
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Reason for Removing Staff</h5>
                                <button type="button" className="btn-close" onClick={() => setShowDeleteReasonModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                {/* show server/general error at top of modal if exists */}
                                {deleteError && <div className="alert alert-danger">{deleteError}</div>}

                                <div className="mb-3">
                                    <label className="form-label"><strong>Reason</strong></label>
                                    <select
                                        ref={reasonSelectRef}
                                        className={`form-select ${reasonError ? 'is-invalid' : ''}`}
                                        value={deleteReasonForm.reasonType}
                                        onChange={(e) => {
                                            setDeleteReasonForm(prev => ({ ...prev, reasonType: e.target.value }));
                                            setReasonError(null);
                                        }}
                                    >
                                        <option value="">Select Reason</option>
                                        <option value="Resign">Resign</option>
                                        <option value="Termination">Termination</option>
                                        <option value="Absconder">Absconder</option>
                                    </select>
                                    {reasonError && <div className="invalid-feedback" style={{ display: 'block' }}>{reasonError}</div>}
                                </div>
                                <div className="mb-3">
                                    <label className="form-label"><strong>Comment (mandatory)</strong></label>
                                    <textarea
                                        ref={commentRef}
                                        className={`form-control ${commentError ? 'is-invalid' : ''}`}
                                        rows={4}
                                        value={deleteReasonForm.comment}
                                        onChange={(e) => {
                                            setDeleteReasonForm(prev => ({ ...prev, comment: e.target.value }));
                                            setCommentError(null);
                                        }}
                                    />
                                    {commentError && <div className="invalid-feedback" style={{ display: 'block' }}>{commentError}</div>}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteReasonModal(false)}>Cancel</button>
                                <button type="button" className="btn btn-danger" onClick={handleDeleteSubmitWithReason}>Remove Staff</button>
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
