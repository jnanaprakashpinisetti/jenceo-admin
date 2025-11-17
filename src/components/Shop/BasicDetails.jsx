// src/components/Customer/BasicDetails.jsx
import React, { useMemo } from 'react';

const BasicDetails = ({ customer, totalAmount, paymentHistory, customerItems }) => {
    
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

    // Calculate financial summary from payment history and customer items
    const financialSummary = useMemo(() => {
        let totalPurchase = 0;
        let totalPaid = 0;
        let totalPending = 0;
        let lastPaymentDate = 'N/A';
        let paymentCount = 0;

        // Calculate from payment history if available
        if (paymentHistory && paymentHistory.length > 0) {
            paymentCount = paymentHistory.length;
            totalPaid = paymentHistory.reduce((sum, payment) => sum + (parseFloat(payment.paidAmount) || 0), 0);
            totalPurchase = paymentHistory.reduce((sum, payment) => sum + (parseFloat(payment.totalAmount) || 0), 0);
            
            // Find last payment date
            const sortedPayments = [...paymentHistory].sort((a, b) => 
                new Date(b.paymentDate) - new Date(a.paymentDate)
            );
            if (sortedPayments.length > 0) {
                lastPaymentDate = new Date(sortedPayments[0].paymentDate).toLocaleDateString();
            }
        } 
        // Calculate from customer items if no payment history
        else if (customerItems && customerItems.length > 0) {
            totalPurchase = customerItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
            
            const paidItems = customerItems.filter(item => item.status === 'paid');
            const pendingItems = customerItems.filter(item => item.status !== 'paid');
            
            totalPaid = paidItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
            paymentCount = paidItems.length;
            
            // Find last payment date from paid items
            if (paidItems.length > 0) {
                const sortedPaidItems = [...paidItems].sort((a, b) => 
                    new Date(b.lastPaymentDate || b.date) - new Date(a.lastPaymentDate || a.date)
                );
                lastPaymentDate = new Date(sortedPaidItems[0].lastPaymentDate || sortedPaidItems[0].date).toLocaleDateString();
            }
        } 
        // Use totalAmount as fallback
        else {
            totalPurchase = parseFloat(totalAmount) || 0;
            totalPaid = 0;
            paymentCount = 0;
        }

        totalPending = totalPurchase - totalPaid;

        return {
            totalPurchase,
            totalPaid,
            totalPending,
            lastPaymentDate,
            paymentCount
        };
    }, [paymentHistory, customerItems, totalAmount]);

    // Group payment history by month - FIXED VERSION
    const monthlyPayments = useMemo(() => {
        if (!paymentHistory || paymentHistory.length === 0) {
            return [];
        }

        const monthlyData = {};
        
        paymentHistory.forEach(payment => {
            if (!payment.paymentDate) return;
            
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
            
            monthlyData[monthYear].totalAmount += parseFloat(payment.totalAmount) || 0;
            monthlyData[monthYear].paidAmount += parseFloat(payment.paidAmount) || 0;
            monthlyData[monthYear].balance = monthlyData[monthYear].totalAmount - monthlyData[monthYear].paidAmount;
            monthlyData[monthYear].payments.push(payment);
        });

        const monthlyArray = Object.values(monthlyData);
        
        // Sort by date descending
        monthlyArray.sort((a, b) => {
            const dateA = new Date(a.payments[0].paymentDate);
            const dateB = new Date(b.payments[0].paymentDate);
            return dateB - dateA;
        });

        return monthlyArray;
    }, [paymentHistory]);

    // Calculate total purchases count from customer items
    const totalPurchasesCount = useMemo(() => {
        if (customerItems && customerItems.length > 0) {
            return customerItems.length;
        }
        return customer?.totalPurchases || 0;
    }, [customerItems, customer]);

    const characterInfo = getCharacterInfo(customer?.character);

    return (
        <div className="row g-4">
            {/* Customer Information */}
            <div className="col-md-6">
                <div className="card border-0 shadow-lg h-100" style={{
                    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)",
                    borderRadius: "12px",
                    border: "1px solid rgba(99, 102, 241, 0.4)",
                    backdropFilter: "blur(10px)"
                }}>
                    <div className="card-header border-0 py-3" style={{
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        borderRadius: "12px 12px 0 0",
                        borderBottom: "2px solid rgba(255, 255, 255, 0.2)"
                    }}>
                        <h6 className="text-white mb-0 fw-bold d-flex align-items-center">
                            <i className="fas fa-user-circle me-2 fs-5"></i>
                            Customer Information
                        </h6>
                    </div>
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-dark table-borderless align-middle mb-0" style={{
                                background: "transparent"
                            }}>
                                <tbody>
                                    <tr style={{
                                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                                        background: "rgba(99, 102, 241, 0.1)"
                                    }}>
                                        <td className="ps-4 py-3" style={{ width: '40%', borderRight: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                            <span className="text-light fw-semibold d-flex align-items-center">
                                                <i className="fas fa-signature me-2 text-info fs-6"></i>
                                                Full Name
                                            </span>
                                        </td>
                                        <td className="py-3 pe-4">
                                            <span className="text-warning fw-bold fs-6">{customer?.name || 'N/A'}</span>
                                        </td>
                                    </tr>
                                    <tr style={{
                                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
                                    }}>
                                        <td className="ps-4 py-3" style={{ width: '40%', borderRight: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                            <span className="text-light fw-semibold d-flex align-items-center">
                                                <i className="fas fa-id-card me-2 text-primary fs-6"></i>
                                                ID Number
                                            </span>
                                        </td>
                                        <td className="py-3 pe-4">
                                            <span className="text-info fw-bold fs-6">{customer?.idNo || 'N/A'}</span>
                                        </td>
                                    </tr>
                                    <tr style={{
                                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                                        background: "rgba(99, 102, 241, 0.1)"
                                    }}>
                                        <td className="ps-4 py-3" style={{ width: '40%', borderRight: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                            <span className="text-light fw-semibold d-flex align-items-center">
                                                <i className="fas fa-phone me-2 text-success fs-6"></i>
                                                Phone Number
                                            </span>
                                        </td>
                                        <td className="py-3 pe-4">
                                            <span className="text-light fw-bold">{customer?.phone || 'N/A'}</span>
                                        </td>
                                    </tr>
                                    <tr style={{
                                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
                                    }}>
                                        <td className="ps-4 py-3" style={{ width: '40%', borderRight: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                            <span className="text-light fw-semibold d-flex align-items-center">
                                                <i className="fas fa-map-marker-alt me-2 text-warning fs-6"></i>
                                                Address
                                            </span>
                                        </td>
                                        <td className="py-3 pe-4">
                                            <span className="text-light fw-bold text-end" style={{ maxWidth: '200px', lineHeight: '1.2' }}>
                                                {customer?.address || 'N/A'}
                                            </span>
                                        </td>
                                    </tr>
                                    <tr style={{
                                        background: "rgba(99, 102, 241, 0.1)"
                                    }}>
                                        <td className="ps-4 py-3" style={{ width: '40%', borderRight: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                            <span className="text-light fw-semibold d-flex align-items-center">
                                                <i className="fas fa-star me-2 text-warning fs-6"></i>
                                                Character Rating
                                            </span>
                                        </td>
                                        <td className="py-3 pe-4">
                                            <span className={`badge bg-${characterInfo.color} fw-bold px-3 py-2`} style={{
                                                fontSize: '0.75rem',
                                                borderRadius: '20px'
                                            }}>
                                                {characterInfo.label}
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial Summary */}
            <div className="col-md-6">
                <div className="card border-0 shadow-lg h-100" style={{
                    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)",
                    borderRadius: "12px",
                    border: "1px solid rgba(16, 185, 129, 0.4)",
                    backdropFilter: "blur(10px)"
                }}>
                    <div className="card-header border-0 py-3" style={{
                        background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                        borderRadius: "12px 12px 0 0",
                        borderBottom: "2px solid rgba(255, 255, 255, 0.2)"
                    }}>
                        <h6 className="text-white mb-0 fw-bold d-flex align-items-center">
                            <i className="fas fa-chart-bar me-2 fs-5"></i>
                            Financial Summary
                        </h6>
                    </div>
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-dark table-borderless align-middle mb-0" style={{
                                background: "transparent"
                            }}>
                                <tbody>
                                    <tr style={{
                                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                                        background: "rgba(16, 185, 129, 0.1)"
                                    }}>
                                        <td className="ps-4 py-3" style={{ width: '40%', borderRight: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                            <span className="text-light fw-semibold d-flex align-items-center">
                                                <i className="fas fa-shopping-cart me-2 text-warning fs-6"></i>
                                                Total Purchase
                                            </span>
                                        </td>
                                        <td className="py-3 pe-4">
                                            <span className="text-warning fw-bold fs-6 d-flex align-items-center justify-content-end">
                                                ₹{financialSummary.totalPurchase.toFixed(2)}
                                                <i className="fas fa-arrow-up text-success ms-2 fs-7"></i>
                                            </span>
                                        </td>
                                    </tr>
                                    <tr style={{
                                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
                                    }}>
                                        <td className="ps-4 py-3" style={{ width: '40%', borderRight: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                            <span className="text-light fw-semibold d-flex align-items-center">
                                                <i className="fas fa-credit-card me-2 text-success fs-6"></i>
                                                Total Paid
                                            </span>
                                        </td>
                                        <td className="py-3 pe-4">
                                            <span className="text-success fw-bold fs-6 d-flex align-items-center justify-content-end">
                                                ₹{financialSummary.totalPaid.toFixed(2)}
                                                <i className="fas fa-check-circle text-success ms-2 fs-7"></i>
                                            </span>
                                        </td>
                                    </tr>
                                    <tr style={{
                                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                                        background: "rgba(16, 185, 129, 0.1)"
                                    }}>
                                        <td className="ps-4 py-3" style={{ width: '40%', borderRight: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                            <span className="text-light fw-semibold d-flex align-items-center">
                                                <i className="fas fa-clock me-2 text-danger fs-6"></i>
                                                Pending Amount
                                            </span>
                                        </td>
                                        <td className="py-3 pe-4">
                                            <span className="text-danger fw-bold fs-6 d-flex align-items-center justify-content-end">
                                                ₹{financialSummary.totalPending.toFixed(2)}
                                                <i className="fas fa-exclamation-triangle text-danger ms-2 fs-7"></i>
                                            </span>
                                        </td>
                                    </tr>
                                    <tr style={{
                                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
                                    }}>
                                        <td className="ps-4 py-3" style={{ width: '40%', borderRight: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                            <span className="text-light fw-semibold d-flex align-items-center">
                                                <i className="fas fa-calendar-check me-2 text-info fs-6"></i>
                                                Last Payment
                                            </span>
                                        </td>
                                        <td className="py-3 pe-4">
                                            <span className="text-light fw-bold d-flex align-items-center justify-content-end">
                                                {financialSummary.lastPaymentDate}
                                                <i className="fas fa-history text-info ms-2 fs-7"></i>
                                            </span>
                                        </td>
                                    </tr>
                                    <tr style={{
                                        background: "rgba(16, 185, 129, 0.1)"
                                    }}>
                                        <td className="ps-4 py-3" style={{ width: '40%', borderRight: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                            <span className="text-light fw-semibold d-flex align-items-center">
                                                <i className="fas fa-receipt me-2 text-primary fs-6"></i>
                                                Total Payments
                                            </span>
                                        </td>
                                        <td className="py-3 pe-4">
                                            <span className="text-info fw-bold d-flex align-items-center justify-content-end">
                                                {financialSummary.paymentCount}
                                                <i className="fas fa-file-invoice-dollar text-primary ms-2 fs-7"></i>
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
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
                                        {totalPurchasesCount}
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