import React, { useState, useEffect } from 'react';
import firebaseDB from '../firebase';
import editIcon from '../assets/eidt.svg';
import viewIcon from '../assets/view.svg';
import deleteIcon from '../assets/delete.svg';
import EmployeeModal from './EmployeeModal';

export default function DisplayEmployee() {
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
        Nursing: false,
        Diaper: false,
        'Patent Care': false,
        'Baby Care': false,
        Cook: false
    });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        const fetchEmployees = () => {
            try {
                firebaseDB.child("EmployeeBioData").on('value', (snapshot) => {
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
            firebaseDB.child("EmployeeBioData").off('value');
        };
    }, []);

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

    // Update total pages when rowsPerPage changes
    useEffect(() => {
        setTotalPages(Math.ceil(filteredEmployees.length / rowsPerPage));
    }, [filteredEmployees, rowsPerPage]);

    const sortEmployeesDescending = (employeesData) => {
        return employeesData.sort((a, b) => {
            // Get the ID numbers
            const idA = a.idNo || a.employeeId || '';
            const idB = b.idNo || b.employeeId || '';

            // For JW00001 pattern
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

    const handleDelete = async (employeeId) => {
        try {
            const employeeRef = firebaseDB.child(`EmployeeBioData/${employeeId}`);
            const snapshot = await employeeRef.once('value');
            const employeeData = snapshot.val();

            if (employeeData) {
                await firebaseDB.child(`ExitEmployees/${employeeId}`).set(employeeData);
                await employeeRef.remove();
                alert('Employee moved to ExitEmployees successfully!');
            }
        } catch (err) {
            setError('Error deleting employee: ' + err.message);
        }
    };

    const handleSave = async (updatedEmployee) => {
        try {
            await firebaseDB.child(`EmployeeBioData/${updatedEmployee.id}`).update(updatedEmployee);
            setIsModalOpen(false);
        } catch (err) {
            setError('Error updating employee: ' + err.message);
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
                <div className="col-md-12">
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
                    Showing {indexOfFirstEmployee + 1} to {Math.min(indexOfLastEmployee, filteredEmployees.length)} of {filteredEmployees.length} entries
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
                                            >
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <strong>{employee.employeeId || employee.idNo || 'N/A'}</strong>
                                    </td>
                                    <td>{employee.firstName} {employee.lastName}</td>
                                    <td>{employee.gender || 'N/A'}</td>
                                    <td>{employee.primarySkill || 'N/A'}</td>
                                    <td>{employee.workExperince ? `${employee.workExperince}` : 'N/A'}</td>
                                    <td>
                                        <span className={`badge ${getStatusBadgeClass(employee.status)}`}>
                                            {employee.status || 'On Duty'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="d-flex">
                                            <button
                                                className="btn btn-sm me-2"
                                                title="View"
                                                onClick={() => handleView(employee)}
                                            >
                                                <img src={viewIcon} alt="view Icon" style={{ opacity: 0.6, width: '18px', height: '18px' }} />
                                            </button>
                                            <button
                                                className="btn btn-sm me-2"
                                                title="Edit"
                                                onClick={() => handleEdit(employee)}
                                            >
                                                <img src={editIcon} alt="edit Icon" style={{ width: '15px', height: '15px' }} />
                                            </button>
                                            <button
                                                className="btn btn-sm"
                                                title="Delete"
                                                onClick={() => handleDelete(employee.id)}
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
                <nav aria-label="Employee pagination" className='pagination-wrapper'>
                    <ul className="pagination justify-content-center">
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                            <button
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

            {selectedEmployee && (
                <EmployeeModal
                    employee={selectedEmployee}
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    isEditMode={isEditMode}
                />
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