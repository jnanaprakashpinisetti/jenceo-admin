import React, { useEffect } from "react";

const BiodataTab = ({ formData, bioIframeRef, headerImage }) => {
  // Function to build the HTML for biodata
  const buildClientBiodataHTML = () => {
    const safe = (v, d = "—") => (v == null || v === "" ? d : String(v));
    const fullName = safe(formData.clientName);
    const metaDate = new Date().toLocaleDateString();

    const formatINR = (value) => {
      const n = Number(value || 0);
      if (!isFinite(n)) return "\u20B90";
      try {
        return "\u20B9" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
      } catch {
        return "\u20B9" + String(n);
      }
    };

    const parseDateSafe = (v) => {
      if (!v && v !== 0) return null;
      if (v instanceof Date && !isNaN(v)) return v;
      if (v && typeof v === "object" && ("seconds" in v || "nanoseconds" in v)) {
        const ms = (Number(v.seconds || 0) * 1000) + Math.round(Number(v.nanoseconds || 0) / 1e6);
        const d = new Date(ms);
        return isNaN(d) ? null : d;
      }
      if (typeof v === "number" || (/^\d+$/.test(String(v)))) {
        const d = new Date(Number(v));
        return isNaN(d) ? null : d;
      }
      const s = String(v).trim();
      const mDMY = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (mDMY) return new Date(Number(mDMY[3]), Number(mDMY[2]) - 1, Number(mDMY[1]));
      const mYMD = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (mYMD) return new Date(Number(mYMD[1]), Number(mYMD[2]) - 1, Number(mYMD[3]));
      const d = new Date(s);
      return isNaN(d) ? null : d;
    };

    const basicFields = [
      ["ID No", safe(formData.idNo)],
      ["Client Name", safe(formData.clientName)],
      ["Location", safe(formData.location)],
      ["Mobile 1", safe(formData.mobileNo1)],
      ["Mobile 2", safe(formData.mobileNo2)],
      ["Gender", safe(formData.gender)],
      ["Service Type", safe(formData.typeOfService)],
      ["Service Charges", safe(formData.serviceCharges)],
    ];

    const addressFields = [
      ["Door No", safe(formData.dNo)],
      ["Landmark", safe(formData.landMark)],
      ["Street", safe(formData.street)],
      ["Village/Town", safe(formData.villageTown)],
      ["Mandal", safe(formData.mandal)],
      ["District", safe(formData.district)],
      ["State", safe(formData.state)],
      ["Pincode", safe(formData.pincode)],
    ];

    const careFields = [
      ["Care Recipient Name", safe(formData.patientName)],
      ["Age", safe(formData.patientAge)],
      ["Service Status", safe(formData.serviceStatus)],
      ["Dropper Name", safe(formData.dropperName)],
      ["About Patient", safe(formData.aboutPatient)],
      ["Care Notes", safe(formData.aboutWork)],
    ];

    const renderPairs = (fields) => {
      let html = "";
      for (let i = 0; i < fields.length; i += 2) {
        const first = fields[i];
        const second = fields[i + 1];
        if (second) {
          html += `<tr><th style="width:15%">${first[0]}</th><td style="width:35%">${first[1]}</td><th style="width:15%">${second[0]}</th><td style="width:35%">${second[1]}</td></tr>`;
        } else {
          html += `<tr><th style="width:15%">${first[0]}</th><td style="width:35%">${first[1]}</td><th style="width:15%"></th><td style="width:35%"></td></tr>`;
        }
      }
      return html;
    };

    const workersRows =
      (Array.isArray(formData.workers) ? formData.workers : [])
        .map(
          (w, i) =>
            `<tr><td>${i + 1}</td><td>${safe(w.workerIdNo)}</td><td>${safe(w.cName)}</td><td>${formatINR(
              w.basicSalary
            )}</td><td>${safe(w.startingDate)}</td><td>${safe(w.endingDate)}</td><td>${safe(w.totalDays)}</td><td>${safe(w.remarks)}</td></tr>`
        )
        .join("") || "<tr><td colspan='8'>No workers</td></tr>";

    const paymentsRows =
      (Array.isArray(formData.payments) ? formData.payments : [])
        .map((p, i) => {
          const d = p.date ? parseDateSafe(p.date) : null;
          const dateStr = d ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}` : safe(p.date);
          return `<tr><td>${i + 1}</td><td>${dateStr}</td><td>${safe(p.paymentMethod)}</td><td>${formatINR(p.paidAmount).replace('\u20B9', '&#8377;')}</td><td>${formatINR(p.balance).replace('\u20B9', '&#8377;')}</td><td>${safe(
            p.receptNo
          )}</td><td><span style="color:#b00020;font-weight:600;">${p.refund ? formatINR(p.refundAmount).replace('\u20B9', '&#8377;') : "-"}</span></span></span></td></tr>`;
        })
        .join("") || "<tr><td colspan='7'>No payments</td></tr>";

    const totalPaid = (Array.isArray(formData.payments) ? formData.payments.reduce((s, p) => s + (Number(p.paidAmount) || 0), 0) : 0);
    const totalBalance = (Array.isArray(formData.payments) ? formData.payments.reduce((s, p) => s + (Number(p.balance) || 0), 0) : 0);
    const totalRefund = (Array.isArray(formData.payments) ? formData.payments.reduce((s, p) => s + (p.refundAmount ? Number(p.refundAmount) : 0), 0) : 0);

    return `<!doctype html><html><head><meta charset="utf-8"><title>Client Biodata - ${fullName}</title>
      <style>
        @page { size: A4 portrait; margin: 15px; }
        html,body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
        body{font-family:Arial,Helvetica,sans-serif;color:#111;background:#f5f7fb;margin:0;padding:0}
        .page{width:calc(100% - 30px); margin:0 auto; background:#fff; padding:12px; border-radius:6px;}
        .header{display:flex;gap:12px;align-items:center; justify-content:center}
        .header img{max-width:100%; height:auto; display:block}
        h1{margin:6px 0 4px 0; color:#0b66a3;text-align:center; font-size:20px}
        .section{margin-top:12px;padding:10px;border-radius:4px;background:transparent;border:1px solid #eef3fb}
        table{width:100%;border-collapse:collapse; font-size:12px}
        th,td{padding:6px;border:1px solid #e6eef8;font-size:12px;text-align:left;vertical-align:top}
        th{background:#eef6ffd9; font-weight:600}
        td { word-break: break-word; white-space: normal; }
        .workers-table th, .workers-table td, .payments-table th, .payments-table td { font-size:11px; padding:6px }
        @media print {
          .page{box-shadow:none; border-radius:0; padding:8px}
        }
      </style>
    </head><body>
    <div class="page">
      <div class="header"><img src="${headerImage || "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FHeadder.svg?alt=media&token=fa65a3ab-ba03-4959-bc36-e293c6db48ae"}" alt="Header" /></div>
      <div><h1>Client Biodata</h1><div class="muted" style="text-align:center">${metaDate}</div></div>

      <div class="section">
        <h3>Basic Info</h3>
         <div className="table-responsive">
        <table><tbody>${renderPairs(basicFields)}</tbody></table>
      </div>
      </div>

      <div class="section">
        <h3>Address</h3>
         <div className="table-responsive">
        <table><tbody>${renderPairs(addressFields)}</tbody></table>
      </div>
      </div>

      <div class="section">
        <h3>Care Recipient Details</h3>
         <div className="table-responsive">
        <table><tbody>${renderPairs(careFields)}</tbody></table>
      </div>
      </div>

      <div class="section">
        <h3>Workers</h3>
         <div className="table-responsive">
        <table class="workers-table"><thead><tr><th>#</th><th>ID No</th><th>Name</th><th>Basic Salary</th><th>From</th><th>To</th><th>Total Days</th><th>Remarks</th></tr></thead><tbody>${workersRows}</tbody></table>
      </div>
      </div>

      <div class="section">
        <h3>Payments</h3>
         <div className="table-responsive">
        <table class="payments-table"><thead><tr><th>#</th><th>Date</th><th>Method</th><th>Paid</th><th>Balance</th><th>Receipt</th><th>Refund</th></tr></thead><tbody>${paymentsRows}</tbody>
        <tfoot><tr><th colspan="3">Totals</th><th>${formatINR(totalPaid).replace('\u20B9', '&#8377;')}</th><th>${formatINR(totalBalance).replace('\u20B9', '&#8377;')}</th><th></th><th>${formatINR(totalRefund).replace('\u20B9', '&#8377;')}</th></tr></tfoot></table>
      </div>
      </div>

    </div>
    
      <div class="biodata-footer" style="position:fixed;left:0;right:0;bottom:0;width:100%;background:#05b6ff;color:#fff;font-size:10px;padding:6px 8px;text-align:center;">
        Doc Ref: JC-HR-06 &nbsp;&nbsp;|&nbsp;&nbsp; Revision: 1 &nbsp;&nbsp;|&nbsp;&nbsp; Date: 1<sup>st</sup> May 2025 &nbsp;&nbsp;|&nbsp;&nbsp; Page 1 of 1
      </div>
    
    </body></html>`;
  };

  // Update iframe content when tab is active
  useEffect(() => {
    if (bioIframeRef.current) {
      bioIframeRef.current.srcdoc = buildClientBiodataHTML();
    }
  }, [formData]);

  const handleDownload = () => {
    const html = buildClientBiodataHTML();
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(formData.clientName || "client").replace(/\s+/g, "_")}_biodata.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const handlePrint = () => {
    const html = buildClientBiodataHTML();
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.print();
  };

  return (
    <div>
      <div className="d-flex justify-content-end gap-2 mb-2">
        <button className="btn btn-outline-secondary btn-sm" onClick={handleDownload}>
          Download
        </button>
        <button className="btn btn-primary btn-sm" onClick={handlePrint}>
          Print
        </button>
      </div>

      <iframe
        ref={bioIframeRef}
        title="biodata"
        style={{ width: "100%", height: 520, border: "1px solid #e5e5e5", borderRadius: 6 }}
      />
    </div>
  );
};

export default BiodataTab;