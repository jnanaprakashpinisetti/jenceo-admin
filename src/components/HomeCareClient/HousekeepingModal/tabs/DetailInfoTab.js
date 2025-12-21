import React from "react";

const DetailInfoTab = ({ formData, formatINR, parseDateSafe }) => {
  return (
    <div>
      <h6><strong>Payment Details</strong></h6>
      <div className="table-responsive mb-3">
        <table className="table table-sm table-hover invest-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Payment</th>
              <th>Added By</th>
              <th>Balance</th>
              <th>Method</th>
              <th>Receipt</th>
            </tr>
          </thead>
          <tbody>
            {((formData.payments || []).filter(p => !p?.__adjustment || p?.__type === "balance")).map((p, i) => {
              const d = p.date ? parseDateSafe(p.date) : null;
              const dateStr = d ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}` : (p.date || "-");
              const method = p.paymentMethod || "-";
              const paid = Number(p.paidAmount) || 0;
              const bal = Number(p.balance) || 0;
              const receipt = p.receptNo || "-";
              return (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{dateStr}</td>
                  <td>{formatINR(paid)}</td>
                  <td>{(p.addedByName || p.addByName || p.createdByName)}</td>
                  <td>{formatINR(bal)}</td>
                  <td>{method}</td>
                  <td>{receipt}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan={2}>Totals</th>
              <th>{formatINR((formData.payments || []).reduce((s, p) => s + (Number(p.paidAmount) || 0), 0))}</th>
              <th></th>
              <th>{formatINR((formData.payments || []).reduce((s, p) => s + (Number(p.balance) || 0), 0))}</th>
              <th colSpan={2}></th>
            </tr>
          </tfoot>
        </table>
      </div>

      <h6 className="mt-3"><strong>Refund Details</strong></h6>
      <div className="table-responsive mb-3">
        <table className="table table-sm table-hover invest-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Payment #</th>
              <th>Refund Date</th>
              <th>Refund Amount</th>
              <th>Refund Method</th>
              <th>Refund Remarks</th>
              <th>Receipt</th>
            </tr>
          </thead>
          <tbody>
            {(formData.payments || []).filter(p => p.refund || Number(p.refundAmount || 0) > 0).map((p, i) => {
              const d = p.refundDate ? parseDateSafe(p.refundDate) : (p.date ? parseDateSafe(p.date) : null);
              const dateStr = d ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}` : (p.refundDate || "-");
              return (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{(formData.payments || []).indexOf(p) + 1}</td>
                  <td>{dateStr}</td>
                  <td><span className="refund-amount">{formatINR(p.refundAmount)}</span></td>
                  <td>{p.refundPaymentMethod || "-"}</td>
                  <td>{p.refundRemarks || "-"}</td>
                  <td>{p.receptNo || "-"}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan={3}>Total Refund</th>
              <th>{formatINR((formData.payments || []).reduce((s, p) => s + (Number(p.refundAmount) || 0), 0))}</th>
              <th colSpan={3}></th>
            </tr>
          </tfoot>
        </table>
      </div>

      <h6 className="mt-3"><strong>Workers Details</strong></h6>
      <div className="table-responsive">
        <table className="table table-sm table-hover invest-table">
          <thead>
            <tr>
              <th>#</th>
              <th>ID No</th>
              <th>Name</th>
              <th>Basic Salary</th>
              <th>From</th>
              <th>To</th>
              <th>Total Days</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {(formData.workers || []).map((w, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{w.workerIdNo || "-"}</td>
                <td>{w.cName || "-"}</td>
                <td>{formatINR(w.basicSalary)}</td>
                <td>{w.startingDate || "-"}</td>
                <td>{w.endingDate || "-"}</td>
                <td>{w.totalDays || "-"}</td>
                <td>{w.remarks || "-"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan={3}>Totals</th>
              <th>{formatINR((formData.workers || []).reduce((s, w) => s + (Number(w.basicSalary) || 0), 0))}</th>
              <th colSpan={1}></th>
              <th colSpan={1}></th>
              <th>{(formData.workers || []).reduce((s, w) => s + (Number(w.totalDays) || 0), 0)}</th>
              <th></th>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default DetailInfoTab;
 