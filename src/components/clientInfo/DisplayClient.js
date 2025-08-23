import React, { useState, useEffect } from 'react';
import firebaseDB from '../../firebase';
import editIcon from '../../assets/eidt.svg';
import viewIcon from '../../assets/view.svg';
import deleteIcon from '../../assets/delete.svg';
import ClientModal from './ClientModal';

export default function DisplayClient() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedClient, setSelectedClient] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        const fetchClients = () => {
            try {
                firebaseDB.child("ClientData").on('value', (snapshot) => {
                    if (snapshot.exists()) {
                        const clientsData = [];
                        snapshot.forEach((childSnapshot) => {
                            clientsData.push({
                                id: childSnapshot.key,
                                ...childSnapshot.val()
                            });
                        });

                        // Sort clients by ID number in descending order
                        const sortedClients = sortClientsDescending(clientsData);
                        setClients(sortedClients);
                        setTotalPages(Math.ceil(sortedClients.length / rowsPerPage));
                    } else {
                        setClients([]);
                        setTotalPages(1);
                    }
                    setLoading(false);
                });
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };

        fetchClients();

        return () => {
            firebaseDB.child("ClientData").off('value');
        };
    }, []);

    // Update total pages when rowsPerPage changes
    useEffect(() => {
        setTotalPages(Math.ceil(clients.length / rowsPerPage));
        setCurrentPage(1); // Reset to first page when rows per page changes
    }, [clients, rowsPerPage]);

    const sortClientsDescending = (clientsData) => {
        return clientsData.sort((a, b) => {
            // Get the ID numbers
            const idA = a.idNo || '';
            const idB = b.idNo || '';

            // For JC00001 pattern
            if (idA.startsWith('JC') && idB.startsWith('JC')) {
                const numA = parseInt(idA.replace('JC', '')) || 0;
                const numB = parseInt(idB.replace('JC', '')) || 0;
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

    // Calculate current clients to display
    const indexOfLastClient = currentPage * rowsPerPage;
    const indexOfFirstClient = indexOfLastClient - rowsPerPage;
    const currentClients = clients.slice(indexOfFirstClient, indexOfLastClient);

    // Change page
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    // Handle rows per page change
    const handleRowsPerPageChange = (e) => {
        setRowsPerPage(parseInt(e.target.value));
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

    const handleView = (client) => {
        setSelectedClient(client);
        setIsEditMode(false);
        setIsModalOpen(true);
    };

    const handleEdit = (client) => {
        setSelectedClient(client);
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    const handleDelete = async (clientId) => {
        if (window.confirm('Are you sure you want to delete this client?')) {
            try {
                await firebaseDB.child(`ClientData/${clientId}`).remove();
                alert('Client deleted successfully!');
            } catch (err) {
                setError('Error deleting client: ' + err.message);
            }
        }
    };

    const handleSave = async (updatedClient) => {
        try {
            await firebaseDB.child(`ClientData/${updatedClient.id}`).update(updatedClient);
            setIsModalOpen(false);
            alert('Client details updated successfully!');
        } catch (err) {
            setError('Error updating client: ' + err.message);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedClient(null);
        setIsEditMode(false);
    };

    if (loading) return <div className="text-center my-5">Loading clients...</div>;
    if (error) return <div className="alert alert-danger">Error: {error}</div>;
    if (clients.length === 0) return <div className="alert alert-info">No clients found</div>;

    return (
        <div>
            {/* Rows per page selector */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center">
                    <span className="me-2">Show</span>
                    <select 
                        className="form-select form-select-sm" 
                        style={{width: '80px'}}
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
                    Showing {indexOfFirstClient + 1} to {Math.min(indexOfLastClient, clients.length)} of {clients.length} entries
                </div>
            </div>

            <div className="table-responsive">
                <table className="table table-dark table-hover">
                    <thead className="table-dark">
                        <tr>
                            <th>ID No ↓</th>
                            <th>Client Name</th>
                            <th>Location</th>
                            <th>Type of Service</th>
                            <th>Mobile No</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentClients.map((client) => (
                            <tr key={client.id}>
                                <td>
                                    <strong>{client.idNo || 'N/A'}</strong>
                                </td>
                                <td>{client.clientName || 'N/A'}</td>
                                <td>{client.location || 'N/A'}</td>
                                <td>{client.typeOfService || 'N/A'}</td>
                                <td>{client.mobileNo1 || 'N/A'}</td>
                                <td>
                                    <span className={`badge ${getStatusBadgeClass(client.serviceStatus)}`}>
                                        {client.serviceStatus || 'Running'}
                                    </span>
                                </td>
                                <td>
                                    <div className="d-flex">
                                        <button
                                            className="btn btn-sm me-2"
                                            title="View"
                                            onClick={() => handleView(client)}
                                        >
                                            <img src={viewIcon} alt="view Icon" style={{ opacity: 0.6, width: '18px', height: '18px' }} />
                                        </button>
                                        <button
                                            className="btn btn-sm me-2"
                                            title="Edit"
                                            onClick={() => handleEdit(client)}
                                        >
                                            <img src={editIcon} alt="edit Icon" style={{ width: '15px', height: '15px' }} />
                                        </button>
                                        <button
                                            className="btn btn-sm"
                                            title="Delete"
                                            onClick={() => handleDelete(client.id)}
                                        >
                                            <img src={deleteIcon} alt="delete Icon" style={{ width: '14px', height: '14px' }} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
                <nav aria-label="Client pagination" className='pagination-wrapper'>
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

            {selectedClient && (
                <ClientModal
                    client={selectedClient}
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
        case 'Running': return 'bg-success';
        case 'Closed': return 'bg-secondary';
        case 'Stop': return 'bg-warning';
        case 'Re-open': return 'bg-info';
        case 'Re-start': return 'bg-primary';
        case 'Re-place': return 'bg-dark';
        default: return 'bg-info';
    }
};