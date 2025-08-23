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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Delete flow
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [showMovedModal, setShowMovedModal] = useState(false);

  // Save flow
  const [showSaveModal, setShowSaveModal] = useState(false);

  useEffect(() => {
    const fetchClients = () => {
      try {
        firebaseDB.child('ClientData').on('value', (snapshot) => {
          if (snapshot.exists()) {
            const clientsData = [];
            snapshot.forEach((childSnapshot) => {
              clientsData.push({
                id: childSnapshot.key,
                ...childSnapshot.val(),
              });
            });

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
      firebaseDB.child('ClientData').off('value');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setTotalPages(Math.ceil(clients.length / rowsPerPage));
    setCurrentPage(1);
  }, [clients, rowsPerPage]);

  const sortClientsDescending = (clientsData) => {
    return clientsData.sort((a, b) => {
      const idA = a.idNo || '';
      const idB = b.idNo || '';

      // Pattern JC00001
      if (idA.startsWith('JC') && idB.startsWith('JC')) {
        const numA = parseInt(idA.replace('JC', '')) || 0;
        const numB = parseInt(idB.replace('JC', '')) || 0;
        return numB - numA;
      }

      // Numeric IDs
      if (!isNaN(idA) && !isNaN(idB)) {
        return parseInt(idB) - parseInt(idA);
      }

      // String IDs
      return idB.localeCompare(idA);
    });
  };

  // Pagination
  const indexOfLastClient = currentPage * rowsPerPage;
  const indexOfFirstClient = indexOfLastClient - rowsPerPage;
  const currentClients = clients.slice(indexOfFirstClient, indexOfLastClient);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const handleRowsPerPageChange = (e) => setRowsPerPage(parseInt(e.target.value));

  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);

  const getDisplayedPageNumbers = () => {
    if (totalPages <= 7) return pageNumbers;
    if (currentPage <= 4) return [1, 2, 3, 4, 5, '...', totalPages];
    if (currentPage >= totalPages - 3)
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  // View/Edit
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

  // Delete flow: open/close confirm
  const openDeleteConfirm = (client) => {
    setClientToDelete(client);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setClientToDelete(null);
  };

  // Delete confirmed → move to ExitClients, then remove from ClientData
  const handleDeleteConfirmed = async () => {
    if (!clientToDelete) return;
    const { id, ...payload } = clientToDelete;

    try {
      // Move to ExitClients/<id>
      const movedAt = new Date().toISOString();
      await firebaseDB.child(`ExitClients/${id}`).set({
        ...payload,
        originalId: id,
        movedAt,
      });

      // Remove from ClientData/<id>
      await firebaseDB.child(`ClientData/${id}`).remove();

      closeDeleteConfirm();
      setShowMovedModal(true);
    } catch (err) {
      setError('Error moving client: ' + err.message);
      closeDeleteConfirm();
    }
  };

  // Save (Edit) → close edit modal and show success modal
  const handleSave = async (updatedClient) => {
    try {
      await firebaseDB.child(`ClientData/${updatedClient.id}`).update(updatedClient);
      setIsModalOpen(false);      // close edit/view modal
      setShowSaveModal(true);     // show success modal instead of alert
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
      {/* Header: rows-per-page */}
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
                    <button className="btn btn-sm me-2" title="View" onClick={() => handleView(client)}>
                      <img src={viewIcon} alt="view Icon" style={{ opacity: 0.6, width: '18px', height: '18px' }} />
                    </button>
                    <button className="btn btn-sm me-2" title="Edit" onClick={() => handleEdit(client)}>
                      <img src={editIcon} alt="edit Icon" style={{ width: '15px', height: '15px' }} />
                    </button>
                    <button className="btn btn-sm" title="Delete" onClick={() => openDeleteConfirm(client)}>
                      <img src={deleteIcon} alt="delete Icon" style={{ width: '14px', height: '14px' }} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav aria-label="Client pagination" className="pagination-wrapper">
          <ul className="pagination justify-content-center">
            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}>
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
                  <button className="page-link" onClick={() => paginate(number)}>
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

      {/* Client View/Edit Modal */}
      {selectedClient && (
        <ClientModal
          client={selectedClient}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSave}
          onDelete={() => {}}
          isEditMode={isEditMode}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && clientToDelete && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button type="button" className="btn-close" onClick={closeDeleteConfirm}></button>
              </div>
              <div className="modal-body">
                <p className="mb-0">Are you sure you want to delete this client?</p>
                <p className="mt-2">
                  <strong>ID:</strong> {clientToDelete.idNo || clientToDelete.id} <br />
                  <strong>Name:</strong> {clientToDelete.clientName || 'N/A'}
                </p>
                <small className="text-muted">
                  This will move the record to the <strong>ExitClients</strong> section.
                </small>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeDeleteConfirm}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger" onClick={handleDeleteConfirmed}>
                  Yes, Move & Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Moved Success Modal */}
      {showMovedModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Moved Successfully</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowMovedModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  The client has been moved to the <strong>ExitClients</strong> section.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-success" onClick={() => setShowMovedModal(false)}>
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Success Modal */}
      {showSaveModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Saved Successfully</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowSaveModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>Client details have been updated.</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-success" onClick={() => setShowSaveModal(false)}>
                  OK
                </button>
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
    case 'Running':
      return 'bg-success';
    case 'Closed':
      return 'bg-secondary';
    case 'Stop':
      return 'bg-warning';
    case 'Re-open':
      return 'bg-info';
    case 'Re-start':
      return 'bg-primary';
    case 'Re-place':
      return 'bg-dark';
    default:
      return 'bg-info';
  }
};
