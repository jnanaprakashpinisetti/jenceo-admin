import React, { useState, useEffect } from 'react';
import firebaseDB from '../../firebase';
import viewIcon from '../../assets/view.svg';
import editIcon from '../../assets/eidt.svg';
import HospitalModal from './HospitalModal';

export default function DisplayHospital() {
    const [hospitals, setHospitals] = useState([]);
    const [filteredHospitals, setFilteredHospitals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedHospital, setSelectedHospital] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Search state
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        const fetchHospitals = () => {
            try {
                firebaseDB.child("HospitalData").on('value', (snapshot) => {
                    if (snapshot.exists()) {
                        const hospitalsData = [];
                        snapshot.forEach((childSnapshot) => {
                            hospitalsData.push({
                                id: childSnapshot.key,
                                ...childSnapshot.val()
                            });
                        });

                        // Sort hospitals by ID number in descending order
                        const sortedHospitals = sortHospitalsDescending(hospitalsData);
                        setHospitals(sortedHospitals);
                        setFilteredHospitals(sortedHospitals);
                        setTotalPages(Math.ceil(sortedHospitals.length / rowsPerPage));
                    } else {
                        setHospitals([]);
                        setFilteredHospitals([]);
                        setTotalPages(1);
                    }
                    setLoading(false);
                });
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };

        fetchHospitals();

        return () => {
            firebaseDB.child("HospitalData").off('value');
        };
    }, []);

    // Filter hospitals based on search term
    useEffect(() => {
        let filtered = hospitals;
        
        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(hospital => 
                (hospital.hospitalName && hospital.hospitalName.toLowerCase().includes(term)) ||
                (hospital.idNo && hospital.idNo.toLowerCase().includes(term)) ||
                (hospital.location && hospital.location.toLowerCase().includes(term)) ||
                (hospital.hospitalType && hospital.hospitalType.toLowerCase().includes(term))
            );
        }

        setFilteredHospitals(filtered);
        setTotalPages(Math.ceil(filtered.length / rowsPerPage));
        setCurrentPage(1);
    }, [hospitals, searchTerm, rowsPerPage]);

    // Update total pages when rowsPerPage changes
    useEffect(() => {
        setTotalPages(Math.ceil(filteredHospitals.length / rowsPerPage));
    }, [filteredHospitals, rowsPerPage]);

    const sortHospitalsDescending = (hospitalsData) => {
        return hospitalsData.sort((a, b) => {
            // Get the ID numbers
            const idA = a.idNo || '';
            const idB = b.idNo || '';

            // For H1, H2 pattern
            if (idA.startsWith('H') && idB.startsWith('H')) {
                const numA = parseInt(idA.replace('H', '')) || 0;
                const numB = parseInt(idB.replace('H', '')) || 0;
                return numB - numA;
            }

            // For string IDs
            return idB.localeCompare(idA);
        });
    };

    // Calculate current hospitals to display
    const indexOfLastHospital = currentPage * rowsPerPage;
    const indexOfFirstHospital = indexOfLastHospital - rowsPerPage;
    const currentHospitals = filteredHospitals.slice(indexOfFirstHospital, indexOfLastHospital);

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

    const handleView = (hospital) => {
        setSelectedHospital(hospital);
        setIsEditMode(false);
        setIsModalOpen(true);
    };

    const handleEdit = (hospital) => {
        setSelectedHospital(hospital);
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    const handleSave = async (updatedData) => {
        try {
            await firebaseDB.child(`HospitalData/${updatedData.id}`).update(updatedData);
            setIsModalOpen(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            setError('Error updating hospital: ' + err.message);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedHospital(null);
        setIsEditMode(false);
    };

    if (loading) return <div className="text-center my-5">Loading hospitals...</div>;
    if (error) return <div className="alert alert-danger">Error: {error}</div>;

    return (
        <div className="container-fluid py-4">
            {/* Success Message */}
            {saveSuccess && (
                <div className="alert alert-success alert-dismissible fade show" role="alert">
                    Hospital details updated successfully!
                    <button type="button" className="btn-close" onClick={() => setSaveSuccess(false)}></button>
                </div>
            )}

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
                            placeholder="Search by name, ID, or location..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                        />
                    </div>
                </div>
            </div>

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
                    Showing {indexOfFirstHospital + 1} to {Math.min(indexOfLastHospital, filteredHospitals.length)} of {filteredHospitals.length} entries
                </div>
            </div>

            <div className="table-responsive">
                <table className="table table-dark table-hover">
                    <thead className="table-dark">
                        <tr>
                            <th>ID No ↓</th>
                            <th>Hospital Name</th>
                            <th>Location</th>
                            <th>Type</th>
                            <th>No of Beds</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentHospitals.length > 0 ? (
                            currentHospitals.map((hospital) => (
                                <tr key={hospital.id}>
                                    <td>
                                        <strong>{hospital.idNo || 'N/A'}</strong>
                                    </td>
                                    <td>{hospital.hospitalName || 'N/A'}</td>
                                    <td>{hospital.location || 'N/A'}</td>
                                    <td>{hospital.hospitalType || 'N/A'}</td>
                                    <td>{hospital.noOfBeds || 'N/A'}</td>
                                    <td>
                                        <div className="d-flex">
                                            <button
                                                className="btn btn-sm me-2"
                                                title="View"
                                                onClick={() => handleView(hospital)}
                                            >
                                                <img src={viewIcon} alt="view Icon" style={{ opacity: 0.6, width: '18px', height: '18px' }} />
                                            </button>
                                            <button
                                                className="btn btn-sm me-2"
                                                title="Edit"
                                                onClick={() => handleEdit(hospital)}
                                            >
                                                <img src={editIcon} alt="edit Icon" style={{ width: '15px', height: '15px' }} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="text-center py-4">
                                    No hospitals found {searchTerm ? 'matching your search criteria' : ''}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
                <nav aria-label="Hospital pagination" className='pagination-wrapper'>
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

            {/* Hospital Modal */}
            <HospitalModal
                hospital={selectedHospital}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSave}
                isEditMode={isEditMode}
            />
        </div>
    );
}