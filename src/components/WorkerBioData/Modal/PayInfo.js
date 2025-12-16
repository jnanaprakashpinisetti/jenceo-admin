import React from "react";

const PayInfo = ({ formData }) => {
    const hasPayments = () => Array.isArray(formData.payments) && formData.payments.length > 0;
    const hasWorkDetails = () => Array.isArray(formData.workDetails) && formData.workDetails.length > 0;

    return (
        <div className="modal-card">
            <div className="modal-card-header">
                <h4 className="mb-0">Payment Information </h4>
            </div>
            <div className="modal-card-body">
                <h5>Payment Details</h5>
                {hasPayments() ? (
                    <div className="table-responsive mb-3">
                        <table className="table table-sm table-bordered table-dark table-hover">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Client</th>
                                    <th>Days</th>
                                    <th>Amount</th>
                                    <th>Balance</th>
                                    <th>Type</th>
                                    <th>Receipt</th>
                                    <th>Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(formData.payments || []).map((p, i) => (
                                    <tr key={i}>
                                        <td>{p.date || "N/A"}</td>
                                        <td>{p.clientName || "N/A"}</td>
                                        <td>{p.days || "N/A"}</td>
                                        <td>{p.amount || 0}</td>
                                        <td>{p.balanceAmount || 0}</td>
                                        <td>{p.typeOfPayment || "N/A"}</td>
                                        <td>{p.receiptNo || "N/A"}</td>
                                        <td>{p.remarks || "N/A"}</td>
                                    </tr>
                                ))}

                                {(formData.payments || []).length > 0 && (() => {
                                    const totalAmount = (formData.payments || []).reduce(
                                        (sum, p) => sum + (parseFloat(p.amount) || 0),
                                        0
                                    );
                                    const totalBalance = (formData.payments || []).reduce(
                                        (sum, p) => sum + (parseFloat(p.balanceAmount) || 0),
                                        0
                                    );
                                    const count = (formData.payments || []).length;

                                    return (
                                        <tr className="fw-bold">
                                            <td colSpan="3" className="text-end">Totals:</td>
                                            <td>{totalAmount}</td>
                                            <td>{totalBalance}</td>
                                            <td colSpan="3">Payments Count: {count}</td>
                                        </tr>
                                    );
                                })()}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-muted">No payment records available.</div>
                )}

                <h5>Work Details</h5>
                {hasWorkDetails() ? (
                    <div className="table-responsive mb-3">
                        <table className="table table-sm table-bordered table-dark table-hover">
                            <thead>
                                <tr>
                                    <th>Client ID</th>
                                    <th>Client Name</th>
                                    <th>Location</th>
                                    <th>From</th>
                                    <th>To</th>
                                    <th>Days</th>
                                    <th>Service</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(formData.workDetails || []).map((w, i) => (
                                    <tr key={i}>
                                        <td>{w.clientId || 'N/A'}</td>
                                        <td>{w.clientName || 'N/A'}</td>
                                        <td>{w.location || 'N/A'}</td>
                                        <td>{w.fromDate || 'N/A'}</td>
                                        <td>{w.toDate || 'N/A'}</td>
                                        <td>{w.days || 'N/A'}</td>
                                        <td>{w.serviceType || 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-muted">No work records available.</div>
                )}
            </div>
        </div>
    );
};

export default PayInfo;