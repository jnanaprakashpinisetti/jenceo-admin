import React from 'react';

const DeletedInvoicesTable = ({ 
  deletedInvoices, 
  handleRestoreInvoice, 
  handleViewInvoice,
  handleDownloadInvoice,
  formatDate, 
  formatDateTime, 
  formatAmount,
  calculateTotalAmount
}) => {
  return (
    <div className="deleted-invoices-table p-3">
      <div className="alert alert-warning mb-3">
        <i className="bi bi-exclamation-triangle-fill me-2"></i>
        <strong>Deleted Invoices Archive</strong> - These invoices have been soft-deleted and can be restored.
      </div>

      <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
        <table className="table table-sm table-hover" style={{ fontSize: '12px' }}>
          <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              <th>Invoice #</th>
              <th>Date</th>
              <th>Company</th>
              <th>Amount</th>
              <th>Service Date</th>
              <th>Deleted On</th>
              <th>Reason</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {deletedInvoices.map((invoice) => {
              const invoiceTotal = calculateTotalAmount(invoice.data);
              const workerSnapshot = invoice.data.workerSnapshot || {};
              return (
                <tr key={invoice.id} className="table-secondary">
                  <td><strong>{invoice.invoiceNumber}</strong></td>
                  <td>{formatDate(invoice.date)}</td>
                  <td>{invoice.companyName}</td>
                  <td className="text-success">
                    <div>₹{formatAmount(invoiceTotal)}</div>
                    <small className="small-text text-warning">
                      Base: ₹{formatAmount(parseFloat(invoice.data.dayAmount) || 0)}
                    </small>
                  </td>
                  <td>
                    {formatDate(invoice.data.serviceDate)}
                    {invoice.data.endDate && (
                      <div>
                        <small className="small small-text opacity-50">to {formatDate(invoice.data.endDate)}</small>
                      </div>
                    )}
                  </td>
                  <td>
                    <div>{formatDateTime(invoice.deletedAt)}</div>
                    <small className="small-text">By: {invoice.deletedBy || 'User'}</small>
                  </td>
                  <td>
                    <small className="text-danger">{invoice.deletedReason || 'No reason provided'}</small>
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-success me-1"
                      onClick={() => handleRestoreInvoice(invoice)}
                      title="Restore this invoice"
                    >
                      <i className="bi bi-arrow-counterclockwise"></i>
                    </button>
                    <button
                      className="btn btn-sm btn-outline-info me-1"
                      onClick={() => handleDownloadInvoice(invoice)}
                      title="Download this invoice"
                    >
                      <i className="bi bi-download"></i>
                    </button>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => handleViewInvoice(invoice)}
                      title="View this invoice"
                    >
                      <i className="bi bi-eye"></i>
                    </button>
                  </td>
                </tr>
              );
            })}
            {deletedInvoices.length === 0 && (
              <tr>
                <td colSpan="8" className="text-center small-text text-warning py-4">
                  <i className="bi bi-trash me-2"></i>
                  No deleted invoices found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {deletedInvoices.length > 0 && (
        <div className="alert alert-info mt-3 text-info">
          <i className="bi bi-info-circle me-2"></i>
          <strong>Note:</strong> {deletedInvoices.length} invoice(s) in deleted archive.
          These are soft-deleted and can be restored if needed.
        </div>
      )}
    </div>
  );
};

export default DeletedInvoicesTable;