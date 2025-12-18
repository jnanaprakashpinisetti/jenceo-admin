import React from "react";

const PayInfoTab = ({ formData, hasPayments, hasWorkDetails }) => {
    return (
        <div className="modal-card ">
            <div className="modal-card-header">
                <h4 className="mb-0">Full Info - Salary, Payments & Work Details</h4>
            </div>
            <div className="modal-card-body">
                {/* Salary Breakdown Section */}
                <div className="salary-breakdown-section mb-4">
                    <h5 className="border-bottom pb-2 mb-3">Salary Breakdown</h5>

                    <div className="row">
                        {/* Earnings */}
                        <div className="col-md-6">
                            <div className="card h-100">
                                <div className="card-header bg-success text-white">
                                    <strong>Earnings</strong>
                                </div>
                                <div className="card-body">
                                    <div className="row mb-2">
                                        <div className="col-6">Basic Salary:</div>
                                        <div className="col-6 text-end">
                                            ₹{parseFloat(formData.basicSalary || 0).toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="row mb-2">
                                        <div className="col-6">HRA:</div>
                                        <div className="col-6 text-end">
                                            ₹{parseFloat(formData.hra || 0).toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="row mb-2">
                                        <div className="col-6">Allowance:</div>
                                        <div className="col-6 text-end">
                                            ₹{parseFloat(formData.allowance || 0).toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="row mb-2">
                                        <div className="col-6">Travel Allowance:</div>
                                        <div className="col-6 text-end">
                                            ₹{parseFloat(formData.travelAllowance || 0).toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="row mb-2">
                                        <div className="col-6">Medical Allowance:</div>
                                        <div className="col-6 text-end">
                                            ₹{parseFloat(formData.medicalAllowance || 0).toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="row mb-2">
                                        <div className="col-6">Special Allowance:</div>
                                        <div className="col-6 text-end">
                                            ₹{parseFloat(formData.specialAllowance || 0).toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="row mb-2">
                                        <div className="col-6">Incentives:</div>
                                        <div className="col-6 text-end">
                                            ₹{parseFloat(formData.incentives || 0).toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="row mb-2">
                                        <div className="col-6">Bonus:</div>
                                        <div className="col-6 text-end">
                                            ₹{parseFloat(formData.bonus || 0).toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="row mb-2">
                                        <div className="col-6">Overtime Pay:</div>
                                        <div className="col-6 text-end">
                                            ₹{parseFloat(formData.overtimePay || 0).toFixed(2)}
                                        </div>
                                    </div>
                                    <hr />
                                    <div className="row fw-bold">
                                        <div className="col-6">Total Earnings:</div>
                                        <div className="col-6 text-end text-success">
                                            ₹{(parseFloat(formData.basicSalary || 0) +
                                                parseFloat(formData.hra || 0) +
                                                parseFloat(formData.allowance || 0) +
                                                parseFloat(formData.travelAllowance || 0) +
                                                parseFloat(formData.medicalAllowance || 0) +
                                                parseFloat(formData.specialAllowance || 0) +
                                                parseFloat(formData.incentives || 0) +
                                                parseFloat(formData.bonus || 0) +
                                                parseFloat(formData.overtimePay || 0)).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Deductions */}
                        <div className="col-md-6">
                            <div className="card h-100">
                                <div className="card-header bg-danger text-white">
                                    <strong>Deductions</strong>
                                </div>
                                <div className="card-body">
                                    <div className="row mb-2">
                                        <div className="col-6">PF Contribution (Employee):</div>
                                        <div className="col-6 text-end">
                                            ₹{parseFloat(formData.pfEmployee || 0).toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="row mb-2">
                                        <div className="col-6">ESI Contribution (Employee):</div>
                                        <div className="col-6 text-end">
                                            ₹{parseFloat(formData.esiEmployee || 0).toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="row mb-2">
                                        <div className="col-6">Professional Tax:</div>
                                        <div className="col-6 text-end">
                                            ₹{parseFloat(formData.professionalTax || 0).toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="row mb-2">
                                        <div className="col-6">Income Tax (TDS):</div>
                                        <div className="col-6 text-end">
                                            ₹{parseFloat(formData.tds || 0).toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="row mb-2">
                                        <div className="col-6">Advance Deduction:</div>
                                        <div className="col-6 text-end">
                                            ₹{parseFloat(formData.advanceDeduction || 0).toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="row mb-2">
                                        <div className="col-6">Loan Deduction:</div>
                                        <div className="col-6 text-end">
                                            ₹{parseFloat(formData.loanDeduction || 0).toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="row mb-2">
                                        <div className="col-6">Other Deductions:</div>
                                        <div className="col-6 text-end">
                                            ₹{parseFloat(formData.otherDeductions || 0).toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="row mb-2">
                                        <div className="col-6">Leave Deduction:</div>
                                        <div className="col-6 text-end">
                                            ₹{parseFloat(formData.leaveDeduction || 0).toFixed(2)}
                                        </div>
                                    </div>
                                    <hr />
                                    <div className="row fw-bold">
                                        <div className="col-6">Total Deductions:</div>
                                        <div className="col-6 text-end text-danger">
                                            ₹{(parseFloat(formData.pfEmployee || 0) +
                                                parseFloat(formData.esiEmployee || 0) +
                                                parseFloat(formData.professionalTax || 0) +
                                                parseFloat(formData.tds || 0) +
                                                parseFloat(formData.advanceDeduction || 0) +
                                                parseFloat(formData.loanDeduction || 0) +
                                                parseFloat(formData.otherDeductions || 0) +
                                                parseFloat(formData.leaveDeduction || 0)).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Net Salary Summary */}
                    <div className="row mt-4">
                        <div className="col-md-12">
                            <div className="card">
                                <div className="card-header bg-primary text-white">
                                    <strong>Net Salary Summary</strong>
                                </div>
                                <div className="card-body">
                                    <div className="row">
                                        <div className="col-md-4 text-center">
                                            <div className="p-3 bg-light rounded h-100 align-content-center">
                                                <div className="text-muted">Gross Salary</div>
                                                <div className="h4 fw-bold text-success">
                                                    ₹{(() => {
                                                        const basic = parseFloat(formData.basicSalary || 0);
                                                        const hra = parseFloat(formData.hra || 0);
                                                        const allowance = parseFloat(formData.allowance || 0);
                                                        const travel = parseFloat(formData.travelAllowance || 0);
                                                        const medical = parseFloat(formData.medicalAllowance || 0);
                                                        const special = parseFloat(formData.specialAllowance || 0);
                                                        const incentives = parseFloat(formData.incentives || 0);
                                                        const bonus = parseFloat(formData.bonus || 0);
                                                        const overtime = parseFloat(formData.overtimePay || 0);
                                                        return (basic + hra + allowance + travel + medical + special + incentives + bonus + overtime).toFixed(2);
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-4 text-center">
                                            <div className="p-3 bg-light rounded h-100 align-content-center">
                                                <div className="text-muted">Total Deductions</div>
                                                <div className="h4 fw-bold text-danger">
                                                    ₹{(() => {
                                                        const pf = parseFloat(formData.pfEmployee || 0);
                                                        const esi = parseFloat(formData.esiEmployee || 0);
                                                        const ptax = parseFloat(formData.professionalTax || 0);
                                                        const tds = parseFloat(formData.tds || 0);
                                                        const advance = parseFloat(formData.advanceDeduction || 0);
                                                        const loan = parseFloat(formData.loanDeduction || 0);
                                                        const other = parseFloat(formData.otherDeductions || 0);
                                                        const leave = parseFloat(formData.leaveDeduction || 0);
                                                        return (pf + esi + ptax + tds + advance + loan + other + leave).toFixed(2);
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-4 text-center">
                                            <div className="p-3 bg-primary rounded text-white">
                                                <div>Net Payable Salary</div>
                                                <div className="h4 fw-bold">
                                                    ₹{(() => {
                                                        const gross = parseFloat(formData.basicSalary || 0) +
                                                            parseFloat(formData.hra || 0) +
                                                            parseFloat(formData.allowance || 0) +
                                                            parseFloat(formData.travelAllowance || 0) +
                                                            parseFloat(formData.medicalAllowance || 0) +
                                                            parseFloat(formData.specialAllowance || 0) +
                                                            parseFloat(formData.incentives || 0) +
                                                            parseFloat(formData.bonus || 0) +
                                                            parseFloat(formData.overtimePay || 0);

                                                        const deductions = parseFloat(formData.pfEmployee || 0) +
                                                            parseFloat(formData.esiEmployee || 0) +
                                                            parseFloat(formData.professionalTax || 0) +
                                                            parseFloat(formData.tds || 0) +
                                                            parseFloat(formData.advanceDeduction || 0) +
                                                            parseFloat(formData.loanDeduction || 0) +
                                                            parseFloat(formData.otherDeductions || 0) +
                                                            parseFloat(formData.leaveDeduction || 0);

                                                        return (gross - deductions).toFixed(2);
                                                    })()}
                                                </div>
                                                <small>Payable after all deductions</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Employer Contributions */}
                    <div className="row mt-4">
                        <div className="col-md-12">
                            <div className="card">
                                <div className="card-header bg-info text-white">
                                    <strong>Employer Contributions</strong>
                                </div>
                                <div className="card-body">
                                    <div className="row">
                                        <div className="col-md-4">
                                            <div className="row mb-2">
                                                <div className="col-8">PF (Employer 12%):</div>
                                                <div className="col-4 text-end">
                                                    ₹{parseFloat(formData.pfEmployer || 0).toFixed(2)}
                                                </div>
                                            </div>
                                            <div className="row mb-2">
                                                <div className="col-8">ESI (Employer 3.25%):</div>
                                                <div className="col-4 text-end">
                                                    ₹{parseFloat(formData.esiEmployer || 0).toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="row mb-2">
                                                <div className="col-8">Gratuity:</div>
                                                <div className="col-4 text-end">
                                                    ₹{parseFloat(formData.gratuity || 0).toFixed(2)}
                                                </div>
                                            </div>
                                            <div className="row mb-2">
                                                <div className="col-8">Bonus (Employer):</div>
                                                <div className="col-4 text-end">
                                                    ₹{parseFloat(formData.employerBonus || 0).toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="p-3 bg-light rounded">
                                                <div className="text-muted">Total Employer Cost</div>
                                                <div className="h5 fw-bold text-info">
                                                    ₹{(() => {
                                                        const pfEmp = parseFloat(formData.pfEmployer || 0);
                                                        const esiEmp = parseFloat(formData.esiEmployer || 0);
                                                        const gratuity = parseFloat(formData.gratuity || 0);
                                                        const empBonus = parseFloat(formData.employerBonus || 0);
                                                        return (pfEmp + esiEmp + gratuity + empBonus).toFixed(2);
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payment Details */}
                <h5 className="border-bottom pb-2 mb-3">Payment Details</h5>
                {hasPayments() ? (
                    <div className="table-responsive mb-4">
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
                                    <th>Added By</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(formData.payments || []).map((p, i) => (
                                    <tr key={i}>
                                        <td>{p.date || "N/A"}</td>
                                        <td>{p.clientName || "N/A"}</td>
                                        <td>{p.days || "N/A"}</td>
                                        <td>₹{p.amount || 0}</td>
                                        <td>₹{p.balanceAmount || 0}</td>
                                        <td>{p.typeOfPayment || "N/A"}</td>
                                        <td>{p.receiptNo || "N/A"}</td>
                                        <td>{p.remarks || "N/A"}</td>
                                        <td>
                                            {p.createdByName || "—"}{" "}
                                            {p.createdAt ? (
                                                <small className="text-muted">
                                                    ({new Date(p.createdAt).toLocaleString()})
                                                </small>
                                            ) : null}
                                        </td>
                                    </tr>
                                ))}

                                {/* Totals Row */}
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
                                        <tr className="fw-bold table-active">
                                            <td colSpan="3" className="text-end">Totals:</td>
                                            <td>₹{totalAmount.toFixed(2)}</td>
                                            <td>₹{totalBalance.toFixed(2)}</td>
                                            <td colSpan="4">Payments Count: {count}</td>
                                        </tr>
                                    );
                                })()}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="alert alert-warning mb-4">
                        No payment records available.
                    </div>
                )}

                {/* Work Details */}
                <h5 className="border-bottom pb-2 mb-3">Work Details</h5>
                {hasWorkDetails() ? (
                    <div className="table-responsive">
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
                                    <th>Remarks</th>
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
                                        <td>{w.remarks || 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="alert alert-warning">
                        No work records available.
                    </div>
                )}
            </div>
        </div>
    );
};

export default PayInfoTab;