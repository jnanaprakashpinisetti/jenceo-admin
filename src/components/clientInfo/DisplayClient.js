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

  // Get reminder date from client
  const getReminderDate = (c) => {
    return parseDate(c?.paymentReminderDate) || null;
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

    fetchClients();
    return () => {
      firebaseDB.child('ClientData').off('value');
    };
  }, []);

  useEffect(() => {
    setTotalPages(Math.ceil(clients.length / rowsPerPage));
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [clients, rowsPerPage, totalPages, currentPage]);

  const indexOfLastClient = currentPage * rowsPerPage;
  const indexOfFirstClient = indexOfLastClient - rowsPerPage;
  const currentClients = clients.slice(indexOfFirstClient, indexOfLastClient);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const formatDate = (d) => {
    if (!d) return '—';
    const dt = parseDate(d);
    if (!dt) return '—';
    return dt.toLocaleDateString('en-GB');
  };

  // Reminder count calculation
  const reminderCount = clients.filter((c) => {
    const d = getReminderDate(c);
    const du = daysUntil(d);
    return du <= 2;
  }).length;

  // View/Edit handlers
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

  // Delete handlers
  const openDeleteConfirm = (client) => {
    setClientToDelete(client);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setClientToDelete(null);
  };

  const handleDeleteConfirmed = async () => {
    if (!clientToDelete) return;
    const { id, ...payload } = clientToDelete;

    try {
      const movedAt = new Date().toISOString();
      await firebaseDB.child(`ExitClients/${id}`).set({
        ...payload,
        originalId: id,
        movedAt,
      });

      await firebaseDB.child(`ClientData/${id}`).remove();

      closeDeleteConfirm();
      setShowMovedModal(true);
    } catch (err) {
      setError('Error moving client: ' + err.message);
      closeDeleteConfirm();
    }
  };

  // Save handler
  const handleSave = async (updatedClient) => {
    try {
      await firebaseDB.child(`ClientData/${updatedClient.id}`).update(updatedClient);
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

  if (loading) return <div className="text-center my-5">Loading clients...</div>;
  if (error) return <div className="alert alert-danger">Error: {error}</div>;
  if (clients.length === 0) return <div className="alert alert-info">No clients found</div>;

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap" style={{ gap: '10px' }}>
        <div className="d-flex align-items-center">
          <span className="me-2">Show</span>
          <select
            className="form-select form-select-sm"
            style={{ width: '80px' }}
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(parseInt(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={30}>30</option>
            <option value={40}>40</option>
            <option value={50}>50</option>
          </select>
          <span className="ms-2">entries</span>
        </div>
        <div className="reminder-pill">Reminder Clients: {reminderCount}</div>
        <div>
          Showing {indexOfFirstClient + 1} to {Math.min(indexOfLastClient, clients.length)} of {clients.length} entries
        </div>
      </div>

      {/* Table */}
      <div className="table-responsive">
        <table className="table table-dark table-hover">
          <thead>
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
                  <td><strong>{client.idNo || 'N/A'}</strong></td>
                  <td>{client.clientName || 'N/A'}</td>
                  <td>{client.location || 'N/A'}</td>
                  <td>{client.typeOfService || 'N/A'}</td>
                  <td>{formatDate(rDate)}</td>
                  <td>
                    {client.mobileNo1 ? (
                      <span>
                        {client.mobileNo1}  &nbsp;  &nbsp;
                        <a href={`tel:${client.mobileNo1}`} className="btn btn-sm p-0 btn-info ">
                           Call
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
                        <img src={viewIcon} alt="view Icon" width="18" height="18" />
                      </button>
                      <button className="btn btn-sm me-2" title="Edit" onClick={() => handleEdit(client)}>
                        <img src={editIcon} alt="edit Icon" width="15" height="15" />
                      </button>
                      <button className="btn btn-sm" title="Delete" onClick={() => openDeleteConfirm(client)}>
                        <img src={deleteIcon} alt="delete Icon" width="14" height="14" />
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
        <nav aria-label="Client pagination" className="pagination-wrapper">
          <ul className="pagination justify-content-center">
            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}>
                Previous
              </button>
            </li>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <li key={num} className={`page-item ${currentPage === num ? 'active' : ''}`}>
                <button className="page-link" onClick={() => paginate(num)}>{num}</button>
              </li>
            ))}
            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages}>
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
                <small className="text-muted">This will move the record to the <strong>ExitClients</strong> section.</small>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeDeleteConfirm}>Cancel</button>
                <button type="button" className="btn btn-danger" onClick={handleDeleteConfirmed}>Yes, Move & Delete</button>
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
                <p>The client has been moved to the <strong>ExitClients</strong> section.</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-success" onClick={() => setShowMovedModal(false)}>OK</button>
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
                <button type="button" className="btn btn-success" onClick={() => setShowSaveModal(false)}>OK</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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