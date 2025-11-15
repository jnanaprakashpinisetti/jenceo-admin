// src/components/Customer/BasicDetails.jsx
import React, { useMemo } from 'react';

const BasicDetails = ({ customer, totalAmount, paymentHistory }) => {
    
    // Get character badge color and label
    const getCharacterInfo = (character) => {
        switch (character) {
            case 'very-good': return { color: 'success', label: 'Very Good' };
            case 'good': return { color: 'info', label: 'Good' };
            case 'average': return { color: 'warning', label: 'Average' };
            case 'bad': return { color: 'danger', label: 'Bad' };
            case 'worst': return { color: 'dark', label: 'Worst' };
            default: return { color: 'secondary', label: 'Not Rated' };
        }
    };

    // Calculate financial summary from payment history
    const financialSummary = useMemo(() => {
        if (!paymentHistory || paymentHistory.length === 0) {
            return {
                totalPurchase: 0,
                totalPaid: 0,
                totalPending: totalAmount,
                lastPaymentDate: 'N/A',
                paymentCount: 0
            };
        }

        const totalPaid = paymentHistory.reduce((sum, payment) => sum + payment.paidAmount, 0);
        const totalPurchase = paymentHistory.reduce((sum, payment) => sum + payment.totalAmount, 0);
        const lastPayment = paymentHistory.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))[0];

        return {
            totalPurchase,
            totalPaid,
            totalPending: totalPurchase - totalPaid,
            lastPaymentDate: lastPayment ? new Date(lastPayment.paymentDate).toLocaleDateString() : 'N/A',
            paymentCount: paymentHistory.length
        };
    }, [paymentHistory, totalAmount]);

    // Group payment history by month
    const monthlyPayments = useMemo(() => {
        if (!paymentHistory) return [];

        const monthlyData = {};
        
        paymentHistory.forEach(payment => {
            const date = new Date(payment.paymentDate);
            const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
            
            if (!monthlyData[monthYear]) {
                monthlyData[monthYear] = {
                    month: monthName,
                    totalAmount: 0,
                    paidAmount: 0,
                    balance: 0,
                    payments: []
                };
            }
            
            monthlyData[monthYear].totalAmount += payment.totalAmount;
            monthlyData[monthYear].paidAmount += payment.paidAmount;
            monthlyData[monthYear].balance = monthlyData[monthYear].totalAmount - monthlyData[monthYear].paidAmount;
            monthlyData[monthYear].payments.push(payment);
        });

        return Object.values(monthlyData).sort((a, b) => {
            const dateA = new Date(a.payments[0].paymentDate);
            const dateB = new Date(b.payments[0].paymentDate);
            return dateB - dateA;
        });
    }, [paymentHistory]);

    const characterInfo = getCharacterInfo(customer?.character);

    return (
        <div className="row g-4">
            {/* Customer Basic Information */}
            <div className="col-md-6">
                <div className="card border-0 shadow-lg h-100" style={{
                    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)",
                    borderRadius: "15px",
                    border: "1px solid rgba(99, 102, 241, 0.3)"
                }}>
                    <div className="card-header border-0" style={{
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        borderRadius: "15px 15px 0 0"
                    }}>
                        <h6 className="text-white mb-0 fw-bold">
                            <i className="fas fa-user me-2"></i>
                            Customer Information
                        </h6>
                    </div>
                    <div className="card-body">
                        <div className="space-y-3">
                            <div className="d-flex justify-content-between align-items-center">
                                <span className="text-light fw-semibold">Name:</span>
                                <span className="text-warning fw-bold">{customer?.name || 'N/A'}</span>
                            </div>
                            <div className="d-flex justify-content-between align-items-center">
                                <span className="text-light fw-semibold">ID Number:</span>
                                <span className="text-info fw-bold">{customer?.idNo || 'N/A'}</span>
                            </div>
                            <div className="d-flex justify-content-between align-items-center">
                                <span className="text-light fw-semibold">Phone:</span>
                                <span className="text-light fw-bold">{customer?.phone || 'N/A'}</span>
                            </div>
                            <div className="d-flex justify-content-between align-items-center">
                                <span className="text-light fw-semibold">Address:</span>
                                <span className="text-light fw-bold text-end" style={{ maxWidth: '200px' }}>
                                    {customer?.address || 'N/A'}
                                </span>
                            </div>
                            <div className="d-flex justify-content-between align-items-center">
                                <span className="text-light fw-semibold">Character:</span>
                                <span className={`badge bg-${characterInfo.color} fw-bold`}>
                                    {characterInfo.label}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial Summary */}
            <div className="col-md-6">
                <div className="card border-0 shadow-lg h-100" style={{
                    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)",
                    borderRadius: "15px",
                    border: "1px solid rgba(99, 102, 241, 0.3)"
                }}>
                    <div className="card-header border-0" style={{
                        background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                        borderRadius: "15px 15px 0 0"
                    }}>
                        <h6 className="text-white mb-0 fw-bold">
                            <i className="fas fa-chart-line me-2"></i>
                            Financial Summary
                        </h6>
                    </div>
                    <div className="card-body">
                        <div className="space-y-3">
                            <div className="d-flex justify-content-between align-items-center">
                                <span className="text-light fw-semibold">Total Purchase:</span>
                                <span className="text-warning fw-bold fs-6">₹{financialSummary.totalPurchase.toFixed(2)}</span>
                            </div>
                            <div className="d-flex justify-content-between align-items-center">
                                <span className="text-light fw-semibold">Total Paid:</span>
                                <span className="text-success fw-bold fs-6">₹{financialSummary.totalPaid.toFixed(2)}</span>
                            </div>
                            <div className="d-flex justify-content-between align-items-center">
                                <span className="text-light fw-semibold">Pending Amount:</span>
                                <span className="text-danger fw-bold fs-6">₹{financialSummary.totalPending.toFixed(2)}</span>
                            </div>
                            <div className="d-flex justify-content-between align-items-center">
                                <span className="text-light fw-semibold">Last Payment:</span>
                                <span className="text-light fw-bold">
                                    {financialSummary.lastPaymentDate}
                                </span>
                            </div>
                            <div className="d-flex justify-content-between align-items-center">
                                <span className="text-light fw-semibold">Total Payments:</span>
                                <span className="text-info fw-bold">
                                    {financialSummary.paymentCount}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Monthly Payment History */}
            <div className="col-12">
                <div className="card border-0 shadow-lg" style={{
                    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)",
                    borderRadius: "15px",
                    border: "1px solid rgba(99, 102, 241, 0.3)"
                }}>
                    <div className="card-header border-0" style={{
                        background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                        borderRadius: "15px 15px 0 0"
                    }}>
                        <h6 className="text-white mb-0 fw-bold">
                            <i className="fas fa-history me-2"></i>
                            Monthly Payment History
                        </h6>
                    </div>
                    <div className="card-body">
                        {monthlyPayments.length === 0 ? (
                            <div className="text-center py-4 text-muted">
                                <i className="fas fa-receipt fa-2x mb-3"></i>
                                <p>No payment history available</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-dark table-hover align-middle mb-0">
                                    <thead>
                                        <tr style={{
                                            background: "linear-gradient(135deg, #0369a1 0%, #0c4a6e 100%)"
                                        }}>
                                            <th className="text-center">Month</th>
                                            <th className="text-center">Total Amount</th>
                                            <th className="text-center">Paid Amount</th>
                                            <th className="text-center">Balance</th>
                                            <th className="text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {monthlyPayments.map((monthData, index) => (
                                            <tr key={index} style={{
                                                background: index % 2 === 0
                                                    ? "rgba(30, 41, 59, 0.7)"
                                                    : "rgba(51, 65, 85, 0.7)"
                                            }}>
                                                <td className="text-center fw-bold text-warning">
                                                    {monthData.month}
                                                </td>
                                                <td className="text-center text-light fw-bold">
                                                    ₹{monthData.totalAmount.toFixed(2)}
                                                </td>
                                                <td className="text-center text-success fw-bold">
                                                    ₹{monthData.paidAmount.toFixed(2)}
                                                </td>
                                                <td className="text-center fw-bold">
                                                    <span className={monthData.balance === 0 ? 'text-success' : 'text-warning'}>
                                                        ₹{monthData.balance.toFixed(2)}
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    <span className={`badge ${monthData.balance === 0 ? 'bg-success' : 'bg-warning'}`}>
                                                        {monthData.balance === 0 ? (
                                                            <><i className="fas fa-check me-1"></i>Paid</>
                                                        ) : (
                                                            <><i className="fas fa-clock me-1"></i>Pending</>
                                                        )}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Additional Details */}
            <div className="col-12">
                <div className="card border-0 shadow-lg" style={{
                    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)",
                    borderRadius: "15px",
                    border: "1px solid rgba(99, 102, 241, 0.3)"
                }}>
                    <div className="card-header border-0" style={{
                        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                        borderRadius: "15px 15px 0 0"
                    }}>
                        <h6 className="text-white mb-0 fw-bold">
                            <i className="fas fa-info-circle me-2"></i>
                            Additional Information
                        </h6>
                    </div>
                    <div className="card-body">
                        <div className="row g-4">
                            <div className="col-md-4">
                                <div className="text-center p-3 rounded" style={{
                                    background: "rgba(99, 102, 241, 0.1)",
                                    border: "1px solid rgba(99, 102, 241, 0.3)"
                                }}>
                                    <i className="fas fa-shopping-cart fa-2x text-primary mb-2"></i>
                                    <h6 className="text-light mb-1">Total Purchases</h6>
                                    <span className="text-warning fw-bold fs-5">
                                        {customer?.totalPurchases || 0}
                                    </span>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="text-center p-3 rounded" style={{
                                    background: "rgba(34, 197, 94, 0.1)",
                                    border: "1px solid rgba(34, 197, 94, 0.3)"
                                }}>
                                    <i className="fas fa-credit-card fa-2x text-success mb-2"></i>
                                    <h6 className="text-light mb-1">Payments Made</h6>
                                    <span className="text-success fw-bold fs-5">
                                        {financialSummary.paymentCount}
                                    </span>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="text-center p-3 rounded" style={{
                                    background: "rgba(249, 115, 22, 0.1)",
                                    border: "1px solid rgba(249, 115, 22, 0.3)"
                                }}>
                                    <i className="fas fa-star fa-2x text-warning mb-2"></i>
                                    <h6 className="text-light mb-1">Customer Rating</h6>
                                    <span className="text-warning fw-bold fs-5">
                                        {customer?.rating || '4.5'}/5
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notes Section */}
            <div className="col-12">
                <div className="card border-0 shadow-lg" style={{
                    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)",
                    borderRadius: "15px",
                    border: "1px solid rgba(99, 102, 241, 0.3)"
                }}>
                    <div className="card-header border-0 d-flex justify-content-between align-items-center" style={{
                        background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                        borderRadius: "15px 15px 0 0"
                    }}>
                        <h6 className="text-white mb-0 fw-bold">
                            <i className="fas fa-sticky-note me-2"></i>
                            Customer Notes
                        </h6>
                        <button className="btn btn-sm btn-light">
                            <i className="fas fa-edit me-1"></i>
                            Edit
                        </button>
                    </div>
                    <div className="card-body">
                        <p className="text-light mb-0">
                            {customer?.notes || 'No notes available for this customer. Click edit to add notes.'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BasicDetails;