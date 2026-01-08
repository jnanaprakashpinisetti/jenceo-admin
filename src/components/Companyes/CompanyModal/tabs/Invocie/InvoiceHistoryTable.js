import React from 'react';

const InvoiceHistoryTable = ({ 
  invoiceHistory, 
  deletedInvoices,
  handleViewInvoice, 
  handleEditInvoice, 
  handleDeleteInvoice, 
  handleRestoreInvoice,
  handleDownloadInvoice,
  formatDate, 
  formatDateTime, 
  formatAmount,
  calculateDaysCount,
  calculateTotalAmount,
  calculateInvoiceAmount,
  resolvePhoto,
  downloadHistoryHTML
}) => {
  const totalDays = invoiceHistory.reduce((sum, inv) => {
    const rawStartDate = inv.data.serviceDate;
    const rawEndDate = inv.data.endDate;
    return sum + calculateDaysCount(rawStartDate, rawEndDate);
  }, 0);

  const totalAmount = invoiceHistory.reduce((sum, inv) => {
    return sum + calculateTotalAmount(inv.data);
  }, 0);

  const defaultCompanyPhoto = "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FSample-Photo.jpg?alt=media&token=01855b47-c9c2-490e-b400-05851192dde7";

  return (
    <div className="invoice-history-table p-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Invoice History</h5>
        <div>
          <button
            className="btn btn-sm btn-warning"
            onClick={downloadHistoryHTML}
            title="Download History as HTML"
          >
            <i className="bi bi-download me-1"></i>
            Download History
          </button>
        </div>
      </div>

      <div id="history-table-container">
        <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <table className="table table-sm table-hover" style={{ fontSize: '12px' }}>
            <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr>
                <th>Invoice #</th>
                <th>Invoice Date</th>
                <th>Service Date</th>
                <th>Days Count</th>
                <th>Day Amount</th>
                <th>Amount</th>
                <th>Worker</th>
                <th>Photo</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoiceHistory.map((invoice) => {
                const invoiceTotal = calculateTotalAmount(invoice.data);
                const workerSnapshot = invoice.data.workerSnapshot || {};
                const workerPhoto = resolvePhoto(workerSnapshot.photo || invoice.data.workerPhoto);
                const rawStartDate = invoice.data.serviceDate;
                const rawEndDate = invoice.data.endDate;
                const daysCount = calculateDaysCount(rawStartDate, rawEndDate);

                return (
                  <tr key={invoice.id}>
                    <td>
                      <div><strong>{invoice.invoiceNumber}</strong></div>
                      <small className="text-info">
                        <i className="bi bi-person-fill me-1"></i>
                        By: {invoice.createdBy || "System"}
                      </small>
                    </td>
                    <td>
                      <div>{formatDate(invoice.date)}</div>
                      <small className="small small-text opacity-50">
                        {formatDateTime(invoice.createdAt)}
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
                      <strong style={{ color: '#02acf2' }}>{daysCount} days</strong>
                    </td>
                    <td>
                      <span style={{ color: '#2e02f2ff', fontWeight: 'bold' }}>₹{formatAmount(invoice.data.dayAmount || 0)}</span>
                    </td>
                    <td className="text-success">
                      <div>₹{formatAmount(invoiceTotal)}</div>
                      <small className="small-text text-warning">
                        Base: ₹{formatAmount(calculateInvoiceAmount(daysCount, invoice.data.dayAmount || 0))}
                      </small>
                    </td>
                    <td>
                      <div>{workerSnapshot.workerName || invoice.data.workerName || invoice.workerName || 'N/A'}</div>
                      <small className="small small-text opacity-50">ID: {workerSnapshot.workerId || invoice.data.workerId || 'N/A'}</small>
                    </td>
                    <td className="text-center">
                      <img
                        src={workerPhoto}
                        alt="Worker"
                        style={{
                          width: 45,
                          height: 45,
                          borderRadius: 6,
                          objectFit: 'cover',
                          border: '1px solid #ccc'
                        }}
                        onError={(e) => {
                          e.target.src = defaultCompanyPhoto;
                        }}
                      />
                    </td>

                    <td>
                      <button
                        className="btn btn-sm btn-outline-info me-1"
                        onClick={() => handleViewInvoice(invoice)}
                        title="View this invoice"
                      >
                        <i className="bi bi-eye"></i>
                      </button>

                      <button
                        className="btn btn-sm btn-outline-primary me-1"
                        onClick={() => handleEditInvoice(invoice)}
                        title="Edit this invoice"
                      >
                        <i className="bi bi-pencil"></i>
                      </button>

                      <button
                        className="btn btn-sm btn-outline-success me-1"
                        onClick={() => handleDownloadInvoice(invoice)}
                        title="Download this invoice"
                      >
                        <i className="bi bi-download"></i>
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDeleteInvoice(invoice)}
                        title="Delete this invoice"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {invoiceHistory.length === 0 && (
                <tr>
                  <td colSpan="10" className="text-center small-text text-warning py-4">
                    <i className="bi bi-receipt me-2"></i>
                    No invoices generated yet
                  </td>
                </tr>
              )}
            </tbody>
            {invoiceHistory.length > 0 && (
              <tfoot className="table-dark">
                <tr>
                  <td colSpan="3"><strong>GRAND TOTAL</strong></td>
                  <td className='text-info'><strong>{totalDays} days</strong></td>
                  <td><strong></strong></td>
                  <td className='text-warning'><strong>₹{formatAmount(totalAmount)}</strong></td>
                  <td colSpan="4"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default InvoiceHistoryTable;