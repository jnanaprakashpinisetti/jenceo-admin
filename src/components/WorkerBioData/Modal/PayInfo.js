import React from "react";

const PayInfo = ({ formData }) => {
    const payments = Array.isArray(formData?.payments) ? formData.payments : [];
    const workDetails = Array.isArray(formData?.workDetails) ? formData.workDetails : [];
    
    const hasPayments = payments.length > 0;
    const hasWorkDetails = workDetails.length > 0;

    // Calculate payment totals
    const calculatePaymentTotals = () => {
        const totals = payments.reduce((acc, payment) => {
            acc.totalAmount += parseFloat(payment.amount) || 0;
            acc.totalBalance += parseFloat(payment.balanceAmount) || 0;
            return acc;
        }, { totalAmount: 0, totalBalance: 0 });
        
        return totals;
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        try {
            return new Date(dateString).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch {
            return dateString;
        }
    };

    return (
        <div className="card">
            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                <h4 className="mb-0">Payment Information</h4>
                <div className="badge bg-light text-dark">
                    {payments.length} Payments • {workDetails.length} Work Records
                </div>
            </div>
            
            <div className="card-body">
                {/* Payment Details Section */}
                <section className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="mb-0 text-primary">
                            <i className="bi bi-credit-card me-2"></i>
                            Payment Details
                        </h5>
                        {hasPayments && (
                            <div className="text-muted small">
                                Total Amount: <strong>{formatCurrency(calculatePaymentTotals().totalAmount)}</strong>
                            </div>
                        )}
                    </div>

                    {hasPayments ? (
                        <>
                            <div className="table-responsive mb-4">
                                <table className="table table-hover table-bordered table-striped">
                                    <thead className="table-dark">
                                        <tr>
                                            <th width="10%">Date</th>
                                            <th width="15%">Client</th>
                                            <th width="8%">Days</th>
                                            <th width="12%">Amount</th>
                                            <th width="12%">Balance</th>
                                            <th width="10%">Type</th>
                                            <th width="12%">Receipt No</th>
                                            <th width="21%">Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payments.map((payment, index) => (
                                            <tr key={index} className="align-middle">
                                                <td className="text-nowrap">{formatDate(payment.date)}</td>
                                                <td>
                                                    <div className="fw-semibold">{payment.clientName || "N/A"}</div>
                                                    <small className="text-muted">{payment.clientId || ""}</small>
                                                </td>
                                                <td className="text-center">{payment.days || "N/A"}</td>
                                                <td className="text-end fw-semibold text-success">
                                                    {formatCurrency(payment.amount)}
                                                </td>
                                                <td className="text-end fw-semibold">
                                                    <span className={payment.balanceAmount > 0 ? "text-danger" : "text-success"}>
                                                        {formatCurrency(payment.balanceAmount)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`badge ${payment.typeOfPayment === 'Cash' ? 'bg-success' : 'bg-info'}`}>
                                                        {payment.typeOfPayment || "N/A"}
                                                    </span>
                                                </td>
                                                <td>
                                                    {payment.receiptNo && payment.receiptNo !== "N/A" ? (
                                                        <span className="badge bg-secondary">
                                                            #{payment.receiptNo}
                                                        </span>
                                                    ) : (
                                                        "N/A"
                                                    )}
                                                </td>
                                                <td className="small">
                                                    <div className="text-truncate" title={payment.remarks}>
                                                        {payment.remarks || "No remarks"}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="table-active">
                                        <tr className="fw-bold">
                                            <td colSpan="3" className="text-end">Totals:</td>
                                            <td className="text-end text-success">{formatCurrency(calculatePaymentTotals().totalAmount)}</td>
                                            <td className="text-end">
                                                <span className={calculatePaymentTotals().totalBalance > 0 ? "text-danger" : "text-success"}>
                                                    {formatCurrency(calculatePaymentTotals().totalBalance)}
                                                </span>
                                            </td>
                                            <td colSpan="3" className="text-center">
                                                <span className="badge bg-dark">
                                                    Total Payments: {payments.length}
                                                </span>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* Summary Cards */}
                            <div className="row g-3">
                                <div className="col-md-4">
                                    <div className="card bg-light">
                                        <div className="card-body text-center p-3">
                                            <div className="text-muted small">Total Amount</div>
                                            <div className="h4 text-success fw-bold">
                                                {formatCurrency(calculatePaymentTotals().totalAmount)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div className="card bg-light">
                                        <div className="card-body text-center p-3">
                                            <div className="text-muted small">Total Balance</div>
                                            <div className={`h4 fw-bold ${calculatePaymentTotals().totalBalance > 0 ? 'text-danger' : 'text-success'}`}>
                                                {formatCurrency(calculatePaymentTotals().totalBalance)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div className="card bg-light">
                                        <div className="card-body text-center p-3">
                                            <div className="text-muted small">Payment Count</div>
                                            <div className="h4 text-primary fw-bold">{payments.length}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="alert alert-info text-info d-flex align-items-center">
                            <i className="bi bi-info-circle me-2"></i>
                            <span>No payment records available for this employee.</span>
                        </div>
                    )}
                </section>

                {/* Work Details Section */}
                <section className="mt-5">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="mb-0 text-primary">
                            <i className="bi bi-briefcase me-2"></i>
                            Work Details
                        </h5>
                        {hasWorkDetails && (
                            <div className="text-muted small">
                                Total Records: <strong>{workDetails.length}</strong>
                            </div>
                        )}
                    </div>

                    {hasWorkDetails ? (
                        <div className="table-responsive">
                            <table className="table table-hover table-bordered">
                                <thead className="table-info">
                                    <tr>
                                        <th width="12%">Client ID</th>
                                        <th width="18%">Client Name</th>
                                        <th width="15%">Location</th>
                                        <th width="12%">From Date</th>
                                        <th width="12%">To Date</th>
                                        <th width="8%">Days</th>
                                        <th width="23%">Service Type</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {workDetails.map((work, index) => (
                                        <tr key={index} className="align-middle">
                                            <td>
                                                {work.clientId ? (
                                                    <span className="badge bg-dark">#{work.clientId}</span>
                                                ) : (
                                                    "N/A"
                                                )}
                                            </td>
                                            <td className="fw-semibold">{work.clientName || "N/A"}</td>
                                            <td>
                                                <div>{work.location || "N/A"}</div>
                                                {work.mandal && (
                                                    <small className="text-muted">{work.mandal}</small>
                                                )}
                                            </td>
                                            <td className="text-nowrap">{formatDate(work.fromDate)}</td>
                                            <td className="text-nowrap">{formatDate(work.toDate)}</td>
                                            <td className="text-center">
                                                <span className="badge bg-primary">{work.days || "N/A"}</span>
                                            </td>
                                            <td>
                                                <span className="badge bg-warning text-dark">
                                                    {work.serviceType || "N/A"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="alert alert-warning d-flex align-items-center">
                            <i className="bi bi-exclamation-triangle me-2"></i>
                            <span>No work records available for this employee.</span>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default PayInfo;