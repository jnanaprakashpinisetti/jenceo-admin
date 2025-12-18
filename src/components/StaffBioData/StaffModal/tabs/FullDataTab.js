import React, { useEffect } from "react";
import { headerImage, headerImageSecond, safe, formatLine } from "../utils";

const FullDataTab = ({ formData, iframeRef }) => {
    const buildFulldataHTML = (opts = { hideSensitive: false }) => {
        const fullName = formatLine(safe(formData.firstName, ""), safe(formData.lastName, "")).trim() || "—";
        const ageText = formData.years ? `${formData.years} Years` : "—";
        const dobText = formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString() : "—";
        const gender = safe(formData.gender);
        const marital = safe(formData.maritalStatus);
        const co = safe(formData.co || formData.careOfPersonal);

        const permAddrLines = [
            `<div class="kv-row"><div class="kv-label">Door No</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.permanentAddress)}</div></div>`,
            `<div class="kv-row"><div class="kv-label">Street</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.permanentStreet)}</div></div>`,
            `<div class="kv-row"><div class="kv-label">Landmark</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.permanentLandmark)}</div></div>`,
            `<div class="kv-row"><div class="kv-label">Village / Town</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.permanentVillage)}</div></div>`,
            `<div class="kv-row"><div class="kv-label">Mandal</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.permanentMandal)}</div></div>`,
            `<div class="kv-row"><div class="kv-label">District</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.permanentDistrict)}</div></div>`,
            `<div class="kv-row"><div class="kv-label">State</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.permanentState)}${formData.permanentPincode ? " - " + formData.permanentPincode : ""}</div></div>`
        ].join("");

        const presentAddrLines = [
            `<div class="kv-row"><div class="kv-label">Door No</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.presentAddress)}</div></div>`,
            `<div class="kv-row"><div class="kv-label">Street</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.presentStreet)}</div></div>`,
            `<div class="kv-row"><div class="kv-label">Landmark</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.presentLandmark)}</div></div>`,
            `<div class="kv-row"><div class="kv-label">Village / Town</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.presentVillage)}</div></div>`,
            `<div class="kv-row"><div class="kv-label">Mandal</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.presentMandal)}</div></div>`,
            `<div class="kv-row"><div class="kv-label">District</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.presentDistrict)}</div></div>`,
            `<div class="kv-row"><div class="kv-label">State</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.presentState)}${formData.presentPincode ? " - " + formData.presentPincode : ""}</div></div>`
        ].join("");

        const qual = safe(formData.qualification);
        const college = safe(formData.schoolCollege);
        const pskill = safe(formData.primarySkill);
        const mtongue = safe(formData.motherTongue || formData.motherTung);
        const langs = safe(formData.languages);
        const otherSkills = Array.isArray(formData.workingSkills) ? formData.workingSkills.filter(Boolean) : [];
        const health = Array.isArray(formData.healthIssues) ? formData.healthIssues.filter(Boolean) : [];

        const emergency1 = formData.emergencyContact1 || {};
        const emergency2 = formData.emergencyContact2 || {};
        const emergency3 = formData.emergencyContact3 || {};

        const bank = {
            accountNo: safe(formData.accountNo),
            bankName: safe(formData.bankName),
            branchName: safe(formData.branchName),
            ifsc: safe(formData.ifscCode),
            phonePayNo: safe(formData.phonePayNo),
            phonePayName: safe(formData.phonePayName),
            googlePayNo: safe(formData.googlePayNo),
            googlePayName: safe(formData.googlePayName),
        };

        const photoHtml = formData.employeePhotoUrl
            ? `<img src="${formData.employeePhotoUrl}" style="width:120px;height:120px;object-fit:cover;border-radius:6px;border:1px solid #ccc" />`
            : `<div style="width:120px;height:120px;border:1px solid #ccc;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#888;font-size:12px">No Photo</div>`;

        const rightNow = new Date();
        const metaDate = rightNow.toLocaleDateString();

        const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Staff Full-Data - ${fullName}</title>
<style>
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#111;background:#f6f6f6}
  @page { margin: 6mm; }
  .container{ max-width:900px; margin:auto; padding:10px; }
  .toolbar{ display:flex; gap:8px; justify-content:flex-end; margin-bottom:8px }
  .toolbar button{ padding:6px 10px; font-size:13px; border-radius:4px; border:1px solid #ccc; background:#fff; cursor:pointer }
  .page{ background:#fff; border:1px solid #e5e5e5; padding:16px; margin-bottom:10px; page-break-after:always; border-radius:6px }
  .page:last-child{ page-break-after:auto }
  .header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-bottom:2px solid #92a9fb;padding-bottom:10px;margin-bottom:8px; background: #c7d1f5; border-radius:6px;}
  .title{font-size:25px;font-weight:700;margin:0;padding:12px 10px; margin-top:20px}
  .subtitle{font-size:11px;color:#444;padding-left:10px}
  .meta{font-size:12px;color:#555;padding:12px 10px}
  .kv-row{display:grid;grid-template-columns: 150px 12px 1fr;gap:6px;align-items:start;padding:7px 0 4px 10px; border-radius:5px}
  .kv-row:nth-child(even){background-color:#f0ebf5}
  .kv-label{font-weight:600; font-size:13px}
  .kv-colon{text-align:center}
  .kv-value{font-weight:500; font-size:13px}
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .addr{border:1px dashed #c9c9c9;border-radius:6px;padding:8px;background:#fff}
  .sec{margin-top:20px}
  .sec-title{background:#cae1ef;padding:8px 10px;font-weight:700;border-radius:4px}
  .tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
  .tag{border:1px solid #02acf2;color:#02acf2;font-size:12px;padding:3px 8px;border-radius:999px}
  .photo-box{display:flex;align-items:center;justify-content:center;padding:12px}
  .footer{margin-top:10px;font-size:12px;color:#fff;display:flex;justify-content:space-between;align-items:center;background-color:#02acf2;padding:8px;border-radius:6px}
  .muted{color:#777}
  .heaerImg img {width:100%}
  .heaerImg {margin:-15px -15px 15px -15px}
  .decleration {margin-top:20px; font-size:13px; padding:15px}
  .blue {color:#02acf2; font-weight:700}
  .hedder-inner {display:flex;flex-direction:column;justify-content:center}
 
  @media print {
    body{background:#fff}
    .toolbar{display:none}
    .container{max-width:100%;margin:0}
    .page{border:none;margin:0;padding:6mm;border-radius:0}
  }

 @media (max-width: 776px) {
  .header {display:block; text-align:center; padding-top:10px}
  .header-inner {display:block}
  .two-col {display:block}
  .kv-row {grid-template-columns:80px 12px 1fr}
  }
</style>
</head>
<body>
<div class="container">
  <div class="toolbar">
    <button onclick="window.print()">Print</button>
    <button id="downloadBtn">Download</button>
  </div>

  <!-- PAGE 1 -->
  <div class="page" id="page1">
  <div class="heaerImg"><img src="${headerImage}" alt="Header" /></div>
    <div class="header">
      <div class="header-inner">
        <div class="title">EMPLOYEE INFORMATION</div>
        <div class="subtitle">H.R Department (Reg No: SEA/HYD/ALO/26/1040178/2025)</div>
        <div class="meta"><strong>ID:</strong> ${safe(formData.idNo || formData.employeeId)} &nbsp; | &nbsp; <strong>Date:</strong> ${metaDate}</div>
      </div>
      <div class="photo-box">${photoHtml}</div>
    </div>

    <div class="sec">
      <div class="sec-title">Basic Information</div>
      <div class="sec-body" style="padding-top:10px">
      <div class="two-col">
      <div>
        <div class="kv-row"><div class="kv-label">Full Name</div><div class="kv-colon">:</div><div class="kv-value blue">${fullName}</div></div>
        <div class="kv-row"><div class="kv-label">Gender</div><div class="kv-colon">:</div><div class="kv-value blue">${gender}</div></div>
         <div class="kv-row"><div class="kv-label">Date of Birth</div><div class="kv-colon">:</div><div class="kv-value">${dobText}</div></div>
        <div class="kv-row"><div class="kv-label">Age</div><div class="kv-colon">:</div><div class="kv-value blue">${ageText}</div></div>
        <div class="kv-row"><div class="kv-label">Care of</div><div class="kv-colon">:</div><div class="kv-value">${co}</div></div>
         <div class="kv-row"><div class="kv-label">Marital Status</div><div class="kv-colon">:</div><div class="kv-value blue">${marital}</div></div>
         </div>
         <div>
         <div class="kv-row"><div class="kv-label">Aadhar No</div><div class="kv-colon">:</div><div class="kv-value">${opts.hideSensitive ? "—" : safe(formData.aadharNo)}</div></div>
        <div class="kv-row"><div class="kv-label">Local ID</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.localId)}</div></div>
        <div class="kv-row"><div class="kv-label">Date of Joining</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.date || formData.dateOfJoining)}</div></div>
        <div class="kv-row"><div class="kv-label">Page No</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.pageNo)}</div></div>
        <div class="kv-row"><div class="kv-label">Mobile-1</div><div class="kv-colon">:</div><div class="kv-value blue">${opts.hideSensitive ? "—" : `${formData.mobileNo1 ? + safe(formData.mobileNo1) : ""}`}</div></div>
        <div class="kv-row"><div class="kv-label">Mobile-2</div><div class="kv-colon">:</div><div class="kv-value blue">${opts.hideSensitive ? "—" : `${formData.mobileNo2 ? + safe(formData.mobileNo2) : ""}`}</div></div>
      </div>
         </div>
      </div>
    </div>

    <div class="sec" style="margin-top:14px">
      <div class="sec-title">Present & Permanent Address</div>
      <div class="sec-body" style="padding-top:10px">
        <div class="two-col">
          <div>
            <div style="font-weight:700;margin-bottom:6px">Permanent Address</div>
            <div class="addr">${permAddrLines}</div>
          </div>
          <div>
            <div style="font-weight:700;margin-bottom:6px">Present Address</div>
            <div class="addr">${presentAddrLines}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="sec" style="margin-top:14px">
      <div class="sec-title">Personal Info & Skills</div>
      <div class="sec-body" style="padding-top:10px">
        <div class="two-col">
          <div>
            <div class="kv-row"><div class="kv-label">Husband / Wife</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.careOfPersonal)}</div></div>
            <div class="kv-row"><div class="kv-label">Children</div><div class="kv-colon">:</div><div class="kv-value">${[safe(formData.childName1), safe(formData.childName2)].filter(Boolean).join(", ") || "—"}</div></div>
            <div class="kv-row"><div class="kv-label">Religion</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.religion)}</div></div>
            <div class="kv-row"><div class="kv-label">Caste</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.cast)}</div></div>
            <div class="kv-row"><div class="kv-label">Sub Caste</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.subCast)}</div></div>
          </div>
          <div>
            <div class="kv-row"><div class="kv-label">Qualification</div><div class="kv-colon">:</div><div class="kv-value blue">${qual}</div></div>
            <div class="kv-row"><div class="kv-label">School / College</div><div class="kv-colon">:</div><div class="kv-value">${college}</div></div>
            <div class="kv-row"><div class="kv-label">Primary Skill</div><div class="kv-colon">:</div><div class="kv-value blue">${pskill}</div></div>
            <div class="kv-row"><div class="kv-label">Other Skills</div><div class="kv-colon">:</div><div class="kv-value blue">${otherSkills.length ? otherSkills.join(", ") : "—"}</div></div>
            <div class="kv-row"><div class="kv-label">Experience</div><div class="kv-colon">:</div><div class="kv-value blue">${safe(formData.workExperince)}</div></div>
          </div>
        </div>
      </div>
    </div>

      <div class="footer">
      <div><strong>Doc Ref:</strong> JC-HR-01&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Revision: 1&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Date: 1st May 2025 </div>
      <div>Page 1 of 2</div>
    </div>
  </div>

  <!-- PAGE 2 -->
  <div class="page" id="page2">
  <div class="heaerImg" style="margin-top:15px; margin-bottom:25px"><img src="${headerImageSecond}" alt="Header" /></div>
      <div class="sec" style="margin-top:14px">
      <div class="sec-title">Health Info</div>
      <div class="sec-body" style="padding-top:10px">
      <div class="two-col">
      <div>
        <div class="kv-row"><div class="kv-label">Health Issues</div><div class="kv-colon">:</div><div class="kv-value">${health.length ? health.join(", ") : "No Health Issues"}</div></div>
        <div class="kv-row"><div class="kv-label">Other Issues</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.otherIssues)}</div></div>
        <div class="kv-row"><div class="kv-label">Blood Group</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.bloodGroup)}</div></div>
        </div>
        <div>
        <div class="kv-row"><div class="kv-label">Height</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.height)}</div></div>
        <div class="kv-row"><div class="kv-label">Weight</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.weight)}</div></div>
        <div class="kv-row"><div class="kv-label">Health Card No</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.healthCardNo)}</div></div>
      </div>
      </div>
      </div>
      </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div style="font-weight:700; margin-top:20px">Emergency Contacts & Bank Details</div>
    </div>

    <div class="sec">
      <div class="sec-title">Emergency Contacts (1 & 2)</div>
      <div class="sec-body" style="padding-top:10px">
        <div class="two-col">
          <div>
            <div class="kv-row"><div class="kv-label">Name</div><div class="kv-colon">:</div><div class="kv-value">${safe(emergency1.name)}</div></div>
            <div class="kv-row"><div class="kv-label">Relation</div><div class="kv-colon">:</div><div class="kv-value">${safe(emergency1.relation)}</div></div>
            <div class="kv-row"><div class="kv-label">Mobile 1</div><div class="kv-colon">:</div><div class="kv-value">${opts.hideSensitive ? "" : safe(emergency1.mobile1)}</div></div>
            <div class="kv-row"><div class="kv-label">Mobile 2</div><div class="kv-colon">:</div><div class="kv-value">${opts.hideSensitive ? "" : safe(emergency1.mobile2)}</div></div>
            <div class="kv-row"><div class="kv-label">Address</div><div class="kv-colon">:</div><div class="kv-value">${safe(emergency1.address)}, ${safe(emergency1.village)}, ${safe(emergency1.mandal)}, ${safe(emergency1.state)}</div></div>
          </div>
          <div>
            <div class="kv-row"><div class="kv-label">Name</div><div class="kv-colon">:</div><div class="kv-value">${safe(emergency2.name)}</div></div>
            <div class="kv-row"><div class="kv-label">Relation</div><div class="kv-colon">:</div><div class="kv-value">${safe(emergency2.relation)}</div></div>
            <div class="kv-row"><div class="kv-label">Mobile 1</div><div class="kv-colon">:</div><div class="kv-value">${opts.hideSensitive ? "" : safe(emergency2.mobile1)}</div></div>
            <div class="kv-row"><div class="kv-label">Mobile 2</div><div class="kv-colon">:</div><div class="kv-value">${opts.hideSensitive ? "" : safe(emergency2.mobile2)}</div></div>
            <div class="kv-row"><div class="kv-label">Address</div><div class="kv-colon">:</div><div class="kv-value">${safe(emergency2.address)}, ${safe(emergency2.village)}, ${safe(emergency2.mandal)}, ${safe(emergency2.state)}</div></div>
          </div>
        </div>
      </div>
    </div>

    <div class="sec" style="margin-top:12px">
    <div class="sec" style="margin-top:12px">
  <div class="sec-title">Job &amp; Bank Details</div>
  <div class="sec-body" style="padding-top:10px">
    <div class="two-col">
      <div>
        <div class="kv-row"><div class="kv-label">Department</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.department)}</div></div>
        <div class="kv-row"><div class="kv-label">Designation</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.designation)}</div></div>
        <div class="kv-row"><div class="kv-label">PAN No</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.panNo)}</div></div>
        <div class="kv-row"><div class="kv-label">PF No</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.pfNo)}</div></div>
        <div class="kv-row"><div class="kv-label">Insurance No</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.insuranceNo)}</div></div>
        <div class="kv-row"><div class="kv-label">Health Card No</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.healthCardNo)}</div></div>
        <div class="kv-row"><div class="kv-label">Role</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.role)}</div></div>
        <div class="kv-row"><div class="kv-label">Page No</div><div class="kv-colon">:</div><div class="kv-value">${safe(formData.pageNo)}</div></div>
      </div>
      <div>
        <div class="kv-row"><div class="kv-label">Account No</div><div class="kv-colon">:</div><div class="kv-value">${opts.hideSensitive ? "—" : bank.accountNo}</div></div>
        <div class="kv-row"><div class="kv-label">Bank Name</div><div class="kv-colon">:</div><div class="kv-value">${bank.bankName}</div></div>
        <div class="kv-row"><div class="kv-label">Branch</div><div class="kv-colon">:</div><div class="kv-value">${bank.branchName}</div></div>
        <div class="kv-row"><div class="kv-label">IFSC</div><div class="kv-colon">:</div><div class="kv-value">${opts.hideSensitive ? "—" : bank.ifsc}</div></div>
        <div class="kv-row"><div class="kv-label">PhonePe</div><div class="kv-colon">:</div><div class="kv-value">${opts.hideSensitive ? "—" : bank.phonePayNo + (bank.phonePayName ? " / " + bank.phonePayName : "")}</div></div>
        <div class="kv-row"><div class="kv-label">GooglePay</div><div class="kv-colon">:</div><div class="kv-value">${opts.hideSensitive ? "—" : bank.googlePayNo + (bank.googlePayName ? " / " + bank.googlePayName : "")}</div></div>
      </div>
    </div>
  </div>
</div>

    <div class="decleration">
        <p><strong>Declaration:</strong> I hereby declare that the information provided in this document regarding my personal information, experience, skills,
    health reports and qualifications is true, complete, and accurate to the best of my knowledge. I understand that any misrepresentation
    or omission of facts may result in legal consequences or disqualification from consideration for employment</p>
    <p style="text-align:right; font-style:italic; font-weight:700; margin-top:20px">Signature of the Staff</p>
    </div>
    

    <div class="footer">
      <div><strong>Doc Ref:</strong> JC-HR-01&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Revision: 1&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Date: 1st May 2025 </div>
      <div>Page 2 of 2</div>
    </div>
  </div>
</div>
 </div>

<script>
  document.getElementById('downloadBtn').addEventListener('click', function(){
    const docHtml = '<!doctype html>' + document.documentElement.outerHTML;
    const blob = new Blob([docHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Employee_FullData_${safe(formData.idNo || formData.employeeId || "unknown")}.html';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 150);
  });
</script>
</body>
</html>`;

        return html;
    };

    useEffect(() => {
        if (iframeRef.current) {
            const doc = iframeRef.current;
            doc.srcdoc = buildFulldataHTML({ hideSensitive: false });
        }
    }, [formData]);

    return (
        <div className="modal-card ">
            <div className="modal-card-header d-flex align-items-center justify-content-between">
                <h4 className="mb-0">Biodata Full Details (Preview)</h4>
            </div>

            <div className="modal-card-body biodata-wrapper">
                <iframe
                    ref={iframeRef}
                    title="Full Data Preview"
                    style={{ width: "100%", height: "900px", border: "1px solid #e5e5e5", borderRadius: 8 }}
                />
            </div>
        </div>
    );
};

export default FullDataTab;