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
  const [today] = useState(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  });

  const parseDate = (v) => {
    if (!v) return null;

    // Handle Firebase timestamp objects
    if (v && typeof v === 'object' && v.hasOwnProperty('seconds')) {
      return new Date(v.seconds * 1000);
    }

    // Handle string dates
    if (typeof v === 'string') {
      const s = v.trim();
      if (!s) return null;

      // Try ISO format (yyyy-mm-dd)
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        const parts = s.split('-');
        const date = new Date(parts[0], parts[1] - 1, parts[2]);
        return isNaN(date.getTime()) ? null : date;
      }

      // Try dd/mm/yyyy format
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
        const [dd, mm, yyyy] = s.split('/').map(Number);
        const date = new Date(yyyy, mm - 1, dd);
        return isNaN(date.getTime()) ? null : date;
      }

      // Try any other format that Date can parse
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }

    // Handle Date objects
    if (v instanceof Date) {
      return isNaN(v.getTime()) ? null : v;
    }

    return null;
  };

  // Get the most recent reminder date from client payments
  const getReminderDate = (c) => {
    if (!c || !Array.isArray(c.payments)) return null;

    // Filter out empty/null reminder dates and sort by date (most recent first)
    const validReminders = c.payments
      .filter(p => p.reminderDate && p.reminderDate.trim() !== '')
      .map(p => parseDate(p.reminderDate))
      .filter(d => d !== null)
      .sort((a, b) => b - a); // Most recent first

    return validReminders.length > 0 ? validReminders[0] : null;
  };

  // Calculate days until reminder
  const daysUntil = (d) => {
    if (!d) return Infinity;

    const reminderDate = new Date(d);
    reminderDate.setHours(0, 0, 0, 0);

    const timeDiff = reminderDate.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  };

  // Get urgency class based on days until reminder
  const getUrgencyClass = (client) => {
    const d = getReminderDate(client);
    if (!d) return '';

    const du = daysUntil(d);
    if (du < 0) return 'reminder-overdue';
    if (du === 0) return 'reminder-today';
    if (du === 1) return 'reminder-tomorrow';
    if (du === 2) return 'reminder-upcoming';
    return '';
  };

  // Sort clients with urgent reminders first, then by ID
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
      const dA = getReminderDate(a);
      const dB = getReminderDate(b);
      const duA = daysUntil(dA);
      const duB = daysUntil(dB);

      const urgentA = duA <= 2;
      const urgentB = duB <= 2;

      // Both are urgent, sort by date (earliest first)
      if (urgentA && urgentB) {
        return dA - dB;
      }

      // Only one is urgent, put it first
      if (urgentA && !urgentB) return -1;
      if (!urgentA && urgentB) return 1;

      // Neither is urgent, sort by ID
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
        console.error('Error fetching exit clients:', err);
      }
    };

    fetchExitClients();
    return () => {
      firebaseDB.child('ExitClients').off('value');
    };
  }, []);

  useEffect(() => {
    setTotalPages(Math.ceil(clients.length / rowsPerPage));
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [clients, rowsPerPage, totalPages, currentPage]);

  // Pagination
  const indexOfLastClient = currentPage * rowsPerPage;
  const indexOfFirstClient = indexOfLastClient - rowsPerPage;
  const currentClients = clients.slice(indexOfFirstClient, indexOfLastClient);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const handleRowsPerPageChange = (e) => {
    const newRowsPerPage = parseInt(e.target.value);
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1); // Reset to first page when changing rows per page
  };

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
    const dt = parseDate(d);
    if (!dt) return '—';
    return dt.toLocaleDateString('en-GB'); // DD/MM/YYYY format
  };

  // Reminder count calculation
  const reminderCount = clients.filter((c) => {
    const d = getReminderDate(c);
    if (!d) return false;

    const du = daysUntil(d);
    return du <= 2; // Show reminders for today, tomorrow, and day after tomorrow
  }).length;

  if (loading) return <div className="text-center my-5">Loading exit clients...</div>;
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
        <div className="reminder-pill">
          Reminder Clients: {reminderCount}
        </div>

        <div>
          Showing {indexOfFirstClient + 1} to {Math.min(indexOfLastClient, clients.length)} of {clients.length} entries
        </div>
      </div>

      <div className="table-responsive exit-client">
        <table className="table table-dark table-hover">
          <thead className="table-dark">
            <tr>
              <th>ID No ↓</th>
              <th>Client Name</th>
              <th>Location</th>
              <th>Type of Service</th>
              <th>Reminder Date</th>
              <th>Mobile No</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentClients.map((client) => {
              const rDate = getReminderDate(client);
              const urgencyClass = getUrgencyClass(client);

              return (
                <tr key={client.id} className={urgencyClass}>
                  <td>
                    <strong>{client.idNo || 'N/A'}</strong>
                  </td>
                  <td>{client.clientName || 'N/A'}</td>
                  <td>{client.location || 'N/A'}</td>
                  <td>{client.typeOfService || 'N/A'}</td>

                  <td>
                    {formatDate(rDate)}
                    {rDate && (
                      <small className="d-block text-muted">
                        {daysUntil(rDate) === 0 ? 'Today' :
                          daysUntil(rDate) === 1 ? 'Tomorrow' :
                            daysUntil(rDate) < 0 ? `${Math.abs(daysUntil(rDate))} days ago` :
                              `${daysUntil(rDate)} days`}
                      </small>
                    )}
                  </td>
                  <td>
                    {client.mobileNo1 ? (
                      <span>
                        {client.mobileNo1} &nbsp;  &nbsp;
                        <a href={`tel:${client.mobileNo1}`} className="btn btn-sm btn-info "> Call
                        </a>
                      </span>
                    ) : 'N/A'}
                  </td>
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
          onSave={handleSave}
          onDelete={() => { }}
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