import React, { useState, useEffect } from 'react';
import firebaseDB from '../../firebase';
import editIcon from '../../assets/eidt.svg';
import viewIcon from '../../assets/view.svg';
import returnIcon from '../../assets/return.svg';
import ClientModal from './ClientModal';

export default function DisplayExitClient() {
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

  // Return flow (ExitClients -> ClientData)
  const [showReturnConfirm, setShowReturnConfirm] = useState(false);
  const [clientToReturn, setClientToReturn] = useState(null);
  const [showReturnedModal, setShowReturnedModal] = useState(false);

  // Save flow for edit on ExitClients
  const [showSaveModal, setShowSaveModal] = useState(false);

  // --- Reminder helpers ---
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const parseDate = (v) => {
    if (!v) return null;
    if (typeof v === 'string') {
      const s = v.trim();
      if (!s) return null;
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        const d = new Date(s);
        return isNaN(d) ? null : d;
      }
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
        const [dd, mm, yyyy] = s.split('/').map(Number);
        const d = new Date(yyyy, mm - 1, dd);
        return isNaN(d) ? null : d;
      }
      const d = new Date(s);
      return isNaN(d) ? null : d;
    }
    if (v instanceof Date) return v;
    return null;
  };

  const getReminderDate = (c) =>
    parseDate(c?.reminderDate) || parseDate(c?.reminder) || parseDate(c?.nextVisitDate) || null;

  const daysUntil = (d) => {
    if (!d) return Infinity;
    const onlyDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const ms = onlyDate - startOfToday;
    return ms / (1000 * 60 * 60 * 24);
  };

  const getUrgencyGroup = (c) => {
    const d = getReminderDate(c);
    const du = daysUntil(d);
    if (du < 1) return 0; // red
    if (du < 2) return 1; // brown
    return 2;
  };

  const sortClientsWithUrgency = (data) => {
    const byIdDesc = (a, b) => {
      const idA = a.idNo || '';
      const idB = b.idNo || '';
      if (idA.startsWith('JC') && idB.startsWith('JC')) {
        const numA = parseInt(idA.replace('JC', '')) || 0;
        const numB = parseInt(idB.replace('JC', '')) || 0;
        return numB - numA;
      }
      if (!isNaN(idA) && !isNaN(idB)) return parseInt(idB) - parseInt(idA);
      return idB.localeCompare(idA);
    };

    return [...data].sort((a, b) => {
      const ua = getUrgencyGroup(a);
      const ub = getUrgencyGroup(b);
      if (ua !== ub) return ua - ub;
      const da = getReminderDate(a);
      const db = getReminderDate(b);
      const tda = da ? da.getTime() : Number.MAX_SAFE_INTEGER;
      const tdb = db ? db.getTime() : Number.MAX_SAFE_INTEGER;
      if (tda !== tdb) return tda - tdb;
      return byIdDesc(a, b);
    });
  };

  useEffect(() => {
    const fetchExitClients = () => {
      try {
        firebaseDB.child('ExitClients').on('value', (snapshot) => {
          if (snapshot.exists()) {
            const clientsData = [];
            snapshot.forEach((childSnapshot) => {
              clientsData.push({
                id: childSnapshot.key,
                ...childSnapshot.val(),
              });
            });

            const sorted = sortClientsWithUrgency(clientsData);
            setClients(sorted);
            setTotalPages(Math.ceil(sorted.length / rowsPerPage));
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

    fetchExitClients();
    return () => {
      firebaseDB.child('ExitClients').off('value');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setTotalPages(Math.ceil(clients.length / rowsPerPage));
    setCurrentPage(1);
  }, [clients, rowsPerPage]);

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

  // Open/close return confirm
  const openReturnConfirm = (client) => {
    setClientToReturn(client);
    setShowReturnConfirm(true);
  };

  const closeReturnConfirm = () => {
    setShowReturnConfirm(false);
    setClientToReturn(null);
  };

  // Return confirmed
  const handleReturnConfirmed = async () => {
    if (!clientToReturn) return;
    const { id, ...payload } = clientToReturn;

    try {
      const returnedAt = new Date().toISOString();

      await firebaseDB.child(`ClientData/${id}`).set({
        ...payload,
        restoredFromExit: true,
        returnedAt,
      });

      await firebaseDB.child(`ExitClients/${id}`).remove();

      closeReturnConfirm();
      setShowReturnedModal(true);
    } catch (err) {
      setError('Error returning client: ' + err.message);
      closeReturnConfirm();
    }
  };

  // Save (Edit) → update in ExitClients
  const handleSave = async (updatedClient) => {
    try {
      await firebaseDB.child(`ExitClients/${updatedClient.id}`).update(updatedClient);
      setIsModalOpen(false);
      setShowSaveModal(true);
    } catch (err) {
      setError('Error updating client: ' + err.message);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedClient(null);
    setIsEditMode(false);
  };

  const formatDate = (d) => {
    if (!d) return '—';
    const dt = d instanceof Date ? d : parseDate(d);
    if (!dt) return '—';
    return dt.toLocaleDateString();
  };

  const reminderCount = clients.filter((c) => {
    const d = getReminderDate(c);
    const du = daysUntil(d);
    return du < 2;
  }).length;

  const rowStyleFor = (c) => {
    const g = getUrgencyGroup(c);
    if (g === 0) {
      return { backgroundColor: '#b91c1c', color: '#fff' };
    }
    if (g === 1) {
      return { backgroundColor: '#a52a2a', color: '#fff' };
    }
    return {};
  };

  if (loading) return <div className="text-center my-5">Loading clients...</div>;
  if (error) return <div className="alert alert-danger">Error: {error}</div>;
  if (clients.length === 0) return <div className="alert alert-info">No exit clients found</div>;

  return (
    <div>
      {/* Header: rows-per-page + Reminder badge + showing entries */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap" style={{ gap: '10px' }}>
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

        {/* Reminder Clients pill */}
        <div
          className="px-3 py-1 rounded-pill"
          style={{
            background: 'linear-gradient(90deg,#b91c1c,#a52a2a)',
            color: '#fff',
            fontWeight: 600,
            boxShadow: '0 2px 6px rgba(0,0,0,.2)',
          }}
        >
          Reminder Clients: {reminderCount}
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
              <th>Reminder Date</th>{/* NEW */}
              <th>Mobile No</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentClients.map((client) => {
              const rDate = getReminderDate(client) || null;

              return (
                <tr key={client.id} style={rowStyleFor(client)}>
                  <td>
                    <strong>{client.idNo || 'N/A'}</strong>
                  </td>
                  <td>{client.clientName || 'N/A'}</td>
                  <td>{client.location || 'N/A'}</td>
                  <td>{client.typeOfService || 'N/A'}</td>
                  <td>{formatDate(rDate)}</td>
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
                      <button className="btn btn-sm" title="Return to Active" onClick={() => openReturnConfirm(client)}>
                        <img src={returnIcon} alt="return Icon" style={{ width: '18px', height: '18px' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav aria-label="Exit client pagination" className="pagination-wrapper">
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
          onSave={handleSave}          // edits apply to ExitClients
          onDelete={() => {}}          // not used here
          isEditMode={isEditMode}
        />
      )}

      {/* Return Confirmation Modal */}
      {showReturnConfirm && clientToReturn && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Return</h5>
                <button type="button" className="btn-close" onClick={closeReturnConfirm}></button>
              </div>
              <div className="modal-body">
                <p className="mb-0">Move this client back to active clients?</p>
                <p className="mt-2">
                  <strong>ID:</strong> {clientToReturn.idNo || clientToReturn.id} <br />
                  <strong>Name:</strong> {clientToReturn.clientName || 'N/A'}
                </p>
                <small className="text-muted">
                  This will move the record from <strong>ExitClients</strong> to <strong>ClientData</strong>.
                </small>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeReturnConfirm}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={handleReturnConfirmed}>
                  Yes, Return to Active
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Returned Success Modal */}
      {showReturnedModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Returned Successfully</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowReturnedModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  The client has been moved back to the <strong>ClientData</strong> section.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-success" onClick={() => setShowReturnedModal(false)}>
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Success Modal (for edits on ExitClients) */}
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
                <p>Exit client details have been updated.</p>
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
