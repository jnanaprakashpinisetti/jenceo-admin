
import React, { useMemo, useRef, useState } from "react";
import firebaseDB from "../firebase"; // ensure default export points to database.ref()

/* =============================
   Helpers
   ============================= */
const HEADER_IMG =
  "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FHeadder.svg?alt=media&token=fa65a3ab-ba03-4959-bc36-e293c6db48ae";

const HEADER_IMG_SECOND =
  "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FHeadder-2.svg?alt=media&token=83a00c4b-a170-418b-b38b-63c4155b4d6b";

// utils/numberToWords.js
export function numberToWords(num) {
  if (num === 0) return "Zero";

  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
    "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty",
    "Sixty", "Seventy", "Eighty", "Ninety"
  ];

  const toWords = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    if (n < 1000)
      return (
        a[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? " " + toWords(n % 100) : "")
      );
    if (n < 1000000)
      return (
        toWords(Math.floor(n / 1000)) +
        " Thousand" +
        (n % 1000 ? " " + toWords(n % 1000) : "")
      );
    if (n < 1000000000)
      return (
        toWords(Math.floor(n / 1000000)) +
        " Million" +
        (n % 1000000 ? " " + toWords(n % 1000000) : "")
      );
    return (
      toWords(Math.floor(n / 1000000000)) +
      " Billion" +
      (n % 1000000000 ? " " + toWords(n % 1000000000) : "")
    );
  };

  return toWords(num);
}


const safe = (v, fb = "—") =>
  v !== undefined && v !== null && String(v).trim() !== "" ? v : fb;

const fullName = (e) =>
  [safe(e?.firstName, ""), safe(e?.lastName, "")]
    .filter(Boolean)
    .join(" ")
    .trim() || "—";

const toDateText = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString();
};

/* =============================
   FULL DATA (A4, 2 pages)
   ============================= */
function rowKV(label, value, alt = false, colorClass = "") {
  return `<div class="kv-row${alt ? " alt" : ""}">
    <div class="kv-label">${label}</div><div class="kv-colon">:</div>
    <div class="kv-value ${colorClass}">${safe(value)}</div>
  </div>`;
}

const htmlFullData = (data) => {
  const nameText = fullName(data);
  const ageText = data.years ? `${data.years} Years` : "—";
  const dobText = toDateText(data.dateOfBirth);
  const gender = safe(data.gender);
  const marital = safe(data.maritalStatus);
  const co = safe(data.co || data.careOfPersonal);

  const permAddrLines = [
    rowKV("Door No", data.permanentAddress),
    rowKV("Street", data.permanentStreet, true),
    rowKV("Landmark", data.permanentLandmark),
    rowKV("Village / Town", data.permanentVillage, true),
    rowKV("Mandal", data.permanentMandal),
    rowKV("District", data.permanentDistrict, true),
    rowKV(
      "State",
      `${safe(data.permanentState)}${data.permanentPincode ? " - " + data.permanentPincode : ""
      }`
    ),
  ].join("");

  const presentAddrLines = [
    rowKV("Door No", data.presentAddress),
    rowKV("Street", data.presentStreet, true),
    rowKV("Landmark", data.presentLandmark),
    rowKV("Village / Town", data.presentVillage, true),
    rowKV("Mandal", data.presentMandal),
    rowKV("District", data.presentDistrict, true),
    rowKV(
      "State",
      `${safe(data.presentState)}${data.presentPincode ? " - " + data.presentPincode : ""
      }`
    ),
  ].join("");

  const qual = safe(data.qualification);
  const college = safe(data.schoolCollege);
  const pskill = safe(data.primarySkill);
  const salary = safe(data.basicSalary);
  const health = Array.isArray(data.healthIssues)
    ? data.healthIssues.filter(Boolean)
    : [];

  const emergency1 = data.emergencyContact1 || {};
  const emergency2 = data.emergencyContact2 || {};
  const emergency3 = data.emergencyContact3 || {};

  const bank = {
    accountNo: safe(data.accountNo),
    bankName: safe(data.bankName),
    branchName: safe(data.branchName),
    ifsc: safe(data.ifscCode),
    phonePayNo: safe(data.phonePayNo),
    phonePayName: safe(data.phonePayName),
    googlePayNo: safe(data.googlePayNo),
    googlePayName: safe(data.googlePayName),
  };

  const photoHtml = data.employeePhotoUrl
    ? `<img src="${data.employeePhotoUrl}" style="width:120px;height:120px;object-fit:cover;border-radius:6px;border:1px solid #ccc" />`
    : `<div style="width:120px;height:120px;border:1px dashed #8aa0d6;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#6b7280;font-size:12px">No Photo</div>`;

  const metaDate = new Date().toLocaleDateString();

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Employee Full-Data - ${nameText}</title>
<style>
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#111;background:#f6f6f6}
  @page { size: A4; margin: 8mm; }
  .container{ max-width:900px; margin:auto; padding:10px; }
  .page{
    background:#fff;border:1px solid #e5e5e5;padding:16px;margin-bottom:10px;
    page-break-after:always;border-radius:6px;height:281mm;overflow:hidden
  }
  .page:last-child{ page-break-after:auto }
  .heaerImg img{width:100%}
  .heaerImg{margin:-10px -10px 10px -10px}
  .header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-bottom:2px solid #92a9fb;padding-bottom:10px;margin-bottom:8px;background:#c7d1f5;border-radius:6px}
  .title{font-size:25px;font-weight:700;margin:0;padding:12px 10px;margin-top:20px}
  .subtitle{font-size:11px;color:#444;padding-left:10px}
  .meta{font-size:12px;color:#555;padding:12px 10px}
  .kv-row{display:grid;grid-template-columns:150px 12px 1fr;gap:6px;align-items:start;padding:7px 10px;border-radius:5px}
  .kv-row.alt{background:#f0ebf5}
  .kv-label{font-weight:600;font-size:13px}
  .kv-colon{text-align:center}
  .kv-value{font-weight:500;font-size:13px}
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .addr{border:1px dashed #c9c9c9;border-radius:6px;padding:8px;background:#fff}
  .sec{margin-top:16px}
  .sec-title{background:#cae1ef;padding:8px 10px;font-weight:700;border-radius:4px}
  .photo-box{display:flex;align-items:center;justify-content:center;padding:12px}
  .footer{margin-top:10px;font-size:12px;color:#fff;display:flex;justify-content:space-between;align-items:center;background:#02acf2;padding:8px;border-radius:6px}
  .decleration{margin-top:20px;font-size:13px;padding:15px}
  .blue{color:#02acf2;font-weight:700}
  @media print{
    body{background:#fff}
    .container{max-width:100%;margin:0}
    .page{border:none;margin:0;padding:6mm;border-radius:0;height:281mm}
  }
  @media (max-width:767px){
    .header{display:block;text-align:center;padding-top:10px}
    .two-col{display:block}
    .kv-row{grid-template-columns:80px 12px 1fr}
  }
</style>
</head>
<body>
<div class="container">

  <!-- PAGE 1 -->
  <div class="page" id="page1">
    <div class="heaerImg"><img src="${HEADER_IMG}" alt="Header" /></div>
    <div class="header">
      <div class="header-inner">
        <div class="title">EMPLOYEE INFORMATION</div>
        <div class="subtitle">H.R Department (Reg No: SEA/HYD/ALO/26/1040178/2025)</div>
        <div class="meta"><strong>ID:</strong> ${safe(data.idNo || data.employeeId)} &nbsp; | &nbsp; <strong>Date:</strong> ${metaDate}</div>
      </div>
      <div class="photo-box">${photoHtml}</div>
    </div>

    <div class="sec">
      <div class="sec-title">Basic Information</div>
      <div class="sec-body" style="padding-top:10px">
        <div class="two-col">
          <div>
            ${rowKV("Full Name", nameText, false, "blue")}
            ${rowKV("Gender", gender, true, "blue")}
            ${rowKV("Date of Birth", dobText)}
            ${rowKV("Age", ageText, true, "blue")}
            ${rowKV("Care of", co)}
            ${rowKV("Marital Status", marital, true, "blue")}
          </div>
          <div>
            ${rowKV("Aadhar No", data.aadharNo)}
            ${rowKV("Local ID", data.localId, true)}
            ${rowKV("Date of Joining", data.date || data.dateOfJoining)}
            ${rowKV("Page No", data.pageNo, true)}
            ${rowKV("Mobile-1", data.mobileNo1)}
            ${rowKV("Mobile-2", data.mobileNo2, true)}
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
            ${rowKV("Husband / Wife", data.careOfPersonal)}
            ${rowKV("Children", [safe(data.childName1), safe(data.childName2)].filter(Boolean).join(", "), true)}
            ${rowKV("Religion", data.religion)}
            ${rowKV("Caste", data.cast, true)}
            ${rowKV("Sub Caste", data.subCast)}
          </div>
          <div>
            ${rowKV("Qualification", qual, false, "blue")}
            ${rowKV("School / College", college, true)}
            ${rowKV("Primary Skill", pskill, false, "blue")}
            ${rowKV("Experience", data.workExperince, true, "blue")}
          </div>
        </div>
      </div>
    </div>

    <div class="footer">
      <div><strong>Doc Ref:</strong> JC-HR-01&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Revision: 1&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Date: 1st May 2025</div>
      <div>Page 1 of 2</div>
    </div>
  </div>

  <!-- PAGE 2 -->
  <div class="page" id="page2">
    <div class="heaerImg" style="margin-top:15px; margin-bottom:25px"><img src="${HEADER_IMG_SECOND}" alt="Header" /></div>

    <div class="sec">
      <div class="sec-title">Health Info</div>
      <div class="sec-body" style="padding-top:10px">
        <div class="two-col">
          <div>
            ${rowKV("Health Issues", health.length ? health.join(", ") : "No Health Issues")}
            ${rowKV("Other Issues", data.otherIssues, true)}
            ${rowKV("Blood Group", data.bloodGroup)}
          </div>
          <div>
            ${rowKV("Height", data.height)}
            ${rowKV("Weight", data.weight, true)}
            ${rowKV("Health Card No", data.healthCardNo)}
          </div>
        </div>
      </div>
    </div>

    <div class="sec">
      <div class="sec-title">Emergency Contacts (1 & 2)</div>
      <div class="sec-body" style="padding-top:10px">
        <div class="two-col">
          <div>
            ${rowKV("Name", emergency1.name)}
            ${rowKV("Relation", emergency1.relation, true)}
            ${rowKV("Mobile 1", emergency1.mobile1)}
            ${rowKV("Mobile 2", emergency1.mobile2, true)}
            ${rowKV("Address", [emergency1.address, emergency1.village, emergency1.mandal, emergency1.state].filter(Boolean).join(", "))}
          </div>
          <div>
            ${rowKV("Name", emergency2.name)}
            ${rowKV("Relation", emergency2.relation, true)}
            ${rowKV("Mobile 1", emergency2.mobile1)}
            ${rowKV("Mobile 2", emergency2.mobile2, true)}
            ${rowKV("Address", [emergency2.address, emergency2.village, emergency2.mandal, emergency2.state].filter(Boolean).join(", "))}
          </div>
        </div>
      </div>
    </div>

    <div class="sec">
      <div class="sec-title">Emergency Contact 3 & Bank Details</div>
      <div class="sec-body" style="padding-top:10px">
        <div class="two-col">
          <div>
            ${rowKV("Name", emergency3.name)}
            ${rowKV("Relation", emergency3.relation, true)}
            ${rowKV("Mobile 1", emergency3.mobile1)}
            ${rowKV("Mobile 2", emergency3.mobile2, true)}
            ${rowKV("Address", [emergency3.address, emergency3.village, emergency3.mandal, emergency3.state].filter(Boolean).join(", "))}
          </div>
          <div>
            ${rowKV("Account No", bank.accountNo)}
            ${rowKV("Bank Name", bank.bankName, true)}
            ${rowKV("Branch", bank.branchName)}
            ${rowKV("IFSC", bank.ifsc, true)}
            ${rowKV("PhonePe", (bank.phonePayNo || "") + (bank.phonePayName ? " / " + bank.phonePayName : ""))}
            ${rowKV("GooglePay", (bank.googlePayNo || "") + (bank.googlePayName ? " / " + bank.googlePayName : ""), true)}
          </div>
        </div>
      </div>
    </div>

    <div class="decleration">
      <p><strong>Declaration:</strong> I hereby declare that the information provided in this document regarding my personal information, experience, skills, health reports and qualifications is true, complete, and accurate to the best of my knowledge. I understand that any misrepresentation or omission of facts may result in legal consequences or disqualification from consideration for employment.</p>
      <p style="text-align:right; font-style:italic; font-weight:700; margin-top:20px">Signature of the Employee</p>
    </div>

    <div class="footer">
      <div><strong>Doc Ref:</strong> JC-HR-01&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Revision: 1&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Date: 1st May 2025</div>
      <div>Page 2 of 2</div>
    </div>
  </div>

</div>
</body>
</html>`;
};

/* =============================
   Shared CSS for Agg/Offer tabs
   ============================= */
const commonHeadCSS = `
  @page { size: A4 portrait; margin: 18mm; }
  html, body { font-family: Arial, Helvetica, sans-serif; font-size: 12pt; color: #141414; }
  .a4-wrap{border:1px solid #e6e6e6;border-radius:10px;background:#fff;overflow:hidden}
  .header-img{margin:-6px -6px 6px -6px}
  .header-img img{width:100%;height:auto;object-fit:contain}
  .mast{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;background:#b8c0e9;padding:14px 16px;border-bottom:1px solid #dfe3f4; border-radius: 10px; margin:0 10px}
  .mast .title{font-size:22pt;font-weight:800;margin:0;letter-spacing:0.3px}
  .mast .sub{font-size:10pt;color:#4d4f56;margin-top:4px}
  .meta{font-size:10pt;color:#333;margin-top:6px}
  .photo{display:flex;align-items:center;justify-content:center}
  .photo img{width:120px;height:145px;object-fit:cover;border-radius:8px;border:1px solid #8aa0d6;background:#fafbff}
  .no-photo{width:120px;height:145px;border:1px dashed #8aa0d6;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#6b7280;font-size:10pt}
  .section{margin:12px;border:1px solid #e9ebf5;border-radius:10px;overflow:hidden;box-shadow:0 0 0 1px rgba(17,24,39,0.02)}
  .section .hd{background:#dcd3f5;padding:8px 12px;font-weight:700;color:#1f2a55}
  .section .bd{padding:12px}
  .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .kv-row{display:grid;grid-template-columns:100px 14px 1fr;gap:8px;align-items:start;padding:6px 8px}
  .kv-row.alt{background:#ebeff7}
  .kv-label{font-weight:600}
  .kv-colon{text-align:center}
  .kv-value{font-weight:500}
  .tag{border:1px solid #0a84ff;color:#0a84ff;font-size:10pt;padding:2px 8px;border-radius:999px;margin-right:6px;display:inline-block;margin-bottom:4px;background:#f0f7ff}
  .prose{font-size:11.5pt;line-height:1.5;color:#202124}
  .prose h4{margin:0 0 6px 0;font-size:13pt;color:#1f2a55}
  .prose p{margin:0 0 8px 0}
  .prose ul{margin:0 0 8px 18px}
  p, li {font-size: 11px}
  .fot {display:flex; justify-content: space-between; margin-bottom:10px; padding: 0 15px;}
  .footer {padding:3px; background:#0a84ff; color:#fff; font-size:8px; text-align:center}
  .p-3 {padding:5px}
  .mb-0 {margin-bottom:0}
  .telugu { font-family: 'Ramabhadra', sans-serif;}
  @media print { .no-print { display:none !important; } }
  @media (max-width: 768px){
    .grid-2{display:block}
    .kv-row{grid-template-columns:140px 14px 1fr}
    .mast{display:block;text-align:center}
    .photo{margin-top:10px}
  }
`;

const addrKV = (label, value) =>
  `<div class="kv-row"><div class="kv-label">${label}</div><div class="kv-colon">:</div><div class="kv-value">${safe(
    value
  )}</div></div>`;

const buildTemplate = (heading, sub, data, trailingContentHTML) => {
  const metaDate = new Date().toLocaleDateString();
  const nameText = fullName(data);
  const age = data.years ? `${data.years} Years` : "—";
  const dob = toDateText(data.dateOfBirth);
  const gender = safe(data.gender);
  const marital = safe(data.maritalStatus);
  const co = safe(data.co || data.careOfPersonal);
  const photoHtml = data.employeePhotoUrl
    ? `<img src="${data.employeePhotoUrl}" alt="photo" />`
    : `<div class="no-photo">No Photo</div>`;

  return `
  <style>${commonHeadCSS}</style>
  <div class="a4-wrap">
    <div class="header-img"><img src="${HEADER_IMG}" alt="Header"/></div>
    <div class="mast">
      <div>
        <div class="title">${heading}</div>
        <div class="sub">${sub}</div>
        <div class="meta"><strong>ID:</strong> ${safe(
    data.idNo || data.employeeId
  )} &nbsp; | &nbsp; <strong>Date:</strong> ${metaDate}</div>
      </div>
      <div class="photo">${photoHtml}</div>
    </div>

    <div class="section">
      <div class="hd">Basic Information</div>
      <div class="bd">
        <div class="grid-2">
          <div>
            ${addrKV("Full Name", nameText)}
            <div class="kv-row alt"><div class="kv-label">Gender</div><div class="kv-colon">:</div><div class="kv-value">${gender}</div></div>
          </div>
          <div>
            ${addrKV("Aadhar No", data.aadharNo)}
            <div class="kv-row alt"><div class="kv-label">Care Of</div><div class="kv-colon">:</div><div class="kv-value">${co}</div></div>

       </div>
          
          </div>
        </div>
      </div>
    </div>

    ${trailingContentHTML}
  </div>
  `;
};

/* =============================
   Agreement / Offer tab HTMLs
   ============================= */
const htmlAggEng = (data) =>
  buildTemplate(
    "WORKER AGREEMENT",
    "H.R Department (Reg No: SEA/HYD/ALO/26/1040178/2025)",
    data,
    `<div class="section">
  <div class="hd">1. Terms & Conditions</div>
  <div class="bd">
    <div class="prose">
      <p>This agreement is made between JenCeo Home Care Services and <strong>${fullName(data)}</strong> (Employee ID:
        <strong>${safe(data.idNo || data.employeeId)}</strong>) for employment as
        <strong>${safe(data.primarySkill)}</strong> under the following terms:</p>
      <p>I, Shri/Srimati/Kumari <strong>${fullName(data)}</strong> , hereby declare that I have voluntarily joined
        JenCeo Homecare
        as a <strong>${safe(data.primarySkill)}</strong>, I assure that I will abide by the rules and regulations of
        JenCeo Homecare and will
        perform my duties at the assigned location with utmost dedication, sincerity, and integrity. I pledge to work
        wholeheartedly, with
        complete commitment, a service-oriented mindset, and with purity in thought, word, and action. I promise to
        fulfill my responsibilities
        with 100% fairness, guided by my conscience and with God as my witness.</p>
      <ol>
        <li>The salary of each employee will be paid after the completion of 30 working days. No advance payment will be
          provided
          within this 30-day period.</li>
        <li>Employees must perform only the duties assigned by the organization. They are prohibited from engaging in
          any private
          arrangements with clients for personal gain.</li>
        <li>Employees must conduct themselves in a manner that does not interfere with the client's personal, family,
          religious, or
          cultural practices.</li>
        <li>Employees are strictly prohibited from touching or taking any valuables belonging to the client, including
          money, gold, mobile
          phones, laptops, or any other valuable items.</li>
        <li>Employees must perform their duties diligently and treat clients with respect and courtesy at all times.
        </li>
        <li>If an employee behaves inappropriately towards a client or is involved in theft of any item, legal action
          will be taken. The
          company will not bear any responsibility in such cases.</li>
        <li>If an employee wishes to resign, they must inform the organization at least 5 days in advance.</li>
        <li>In any situation, an employee must not leave their duties / patient without obtaining proper permission.
        </li>
        <li>If a patient passes away, it should be reported to the office without delay.</li>
        <li>If complaints are received from clients, or if the employee fails to perform their duties properly or
          behaves inappropriately,
          they will be terminated immediately.</li>
      </ol>
      <h4>2. Employee Acknowledgment Section </h4>
      <p>I have read/heard and fully understood the terms and conditions mentioned above. I wholeheartedly agree to
        abide by them and
        accept full responsibility for my actions. I acknowledge that if I violate any of the company's rules and
        regulations, I will comply with
        any disciplinary or legal actions taken by the company.</p>
      <p>By signing this agreement, I confirm that I grant JenCeo all rights and authorities necessary to enforce these
        terms.</p>
    </div>
  </div>
</div>
<div class="p-3">
  <div class="fot">
    <div>
      <p class="mb-0"><strong>Employee Signature</strong></p>
      <p class="mb-0">Date: ________________</p>
    </div>
    <div>
      <p class="mb-0"><strong>Authorized Signatory</strong></p>
      <p class="mb-0">JenCeo Home Care Services</p>
    </div>
  </div>
</div>
<div class="footer">
  <div><strong>Doc Ref:</strong> JC-HR-02 | Revision: 1 | Date: 1st May 2025 | Page 1 of 1 </div>
</div>`
  );

const htmlAggTel = (data) =>
  buildTemplate(
    "ఉద్యోగి ఒప్పందం",
    "హెచ్.ఆర్ విభాగం (Reg No: SEA/HYD/ALO/26/1040178/2025)",
    data,
    `<div class="section">
      <div class="hd telugu">నియమ నిబంధనలు మరియు షరతులు</div>
      <div class="bd">
        <div class="prose">
          <h5 class="telugu">ఈ ఒప్పందం జెన్‌సియో హోంకేర్ సర్వీసెస్ మరియు <strong>${fullName(data)}</strong> (Employee ID: ${safe(data.idNo || data.employeeId)}) మధ్య కుదిరినది.</h5>
          <p class="telugu">శ్రీ / శ్రీమతి / కుమారి <strong>${fullName(data)}</strong> అను నేను JenCeo Homecare నందు  <strong>${safe(data.primarySkill)}</strong> గా పనిచ చేయుటకు నా సొంత ఆసక్తి తో కుదిరినాను. నేను JenCeo Homecare నియమ
నిబంధనలకు కట్టుబడి, కంపెనీ నియమంచిన చోట మనసా, వాచా, కర్మణా, త్రికరణ శుద్దితో, అంకిత భావముతో, సేవా భావముతో నియమంచిన పని చేస్తూ,
నూటికి నూరుపాళ్ళు న్యాయం చేస్తానని, నా మనసాక్షిగా, దైవసాక్షిగా హామీ ఇస్తున్నాను.</p>
          <h4 class="telugu">నియమ నిబంధనలు</h4>
          <ol class="telugu">
          <li>ప్రతీ ఉద్యోగీ తన నెల జీతం 30 రోజులు పూర్తి అయిన తరువాత చెల్లంచబడును, మరియు 30 రోజుల లోపు ఎటువంటి అడ్వానుసులు ఇవ్వబడవు</li>
          <li>సంస్థ ద్వార్య నియమంచబడిన పనిని సంస్థకు మాత్రమే చేయాలి, ఉద్యోగి ఆ ఆపని స్వలాభం కోసం క్లంట్ తో పని కుదుర్చుకోకూడదు</li>
          <li>క్లంట్ యొక్క వ్యక్తిగత / కుటుంబ / మతపర / ఆచార వ్యవహారాలకు ఎలాంటి బంగం కలగకుండా నడుచుకోవాలి</li>
          <li>క్లంట్ కి సంబందించిన డబ్బు / బంగారము/ సెల్ ఫోనులు / ల్యాప్టాప్ / మరియు ఏ ఇతర విలువైన వస్తువులు తాకరాదు / తీసుకోరాదు</li>
          <li>ఇచ్చిన పని సక్రమముగా చేస్తూ క్లంట్ పట్ల గౌరవ మర్యాదలతో వుండాలి</li>
          <li>క్లంట్ పట్ల చెడుగా ప్రవర్తించినా / ఏదైనా వస్తువు దొంగాలించినా చట్టబద్ధమైన చర్యలు తీసుకొనబడును. కంపెనీ ఎట్టవంటి బాధ్యతా వహించదు</li>
          <li>డ్యూటీ దిగాలి అనుకున్న యడల సంస్థకు 5 రోజుల ముందుగా తెలపాలి</li>
          <li>ఎటువంటి పరిస్థితులలోనూ సరైన అనుమతి లేకుండా ఉద్యోగి తన పని గాని / పేషెంట్ ని గాని విడిచి పెట్టి వెళ్ళకూడదు.</li>
          <li>ఒకవేళ పేషంట్ మరణిచినట్లు అయితే వెంటనే ఆఫీసుకు తెలియజేయాలి</li>
          <li> క్లంట్ నుండి పిర్యాదులు వచ్చినా / పని సరిగా చేయక పోయినా/ ప్రవర్తన సరిగా లేకపోయినా ఉద్యోగం నుండి తక్షణమే తొలగించడం జరుగును</li>
          </ol>
          <h4 class="telugu">ఉద్యోగి అంగీకార విభాగం</h4>
          <p>పైన తెలిపిన నీయమాలు, నిబంధనలు, సూచనలు చదివి / విని అందులోని చిక్కులను అర్ధం చేసుకుని మనస్పుర్తినా అంగీకరిస్తూ పూర్తి బాధ్యతగా ఉంటానని, నేను
కంపెనీ నియమ నిబంధనలు అతిక్రమంచిన యడల కంపెనీ తీసుకునే ఎటువంటి క్రమశిక్షణా / చట్టపరమైన చర్యలకు కట్టుబడి ఉంటానని, ఇందుకు గాను JenCeo వారికి సర్వ హక్కులు, అధికారాలు కలవని అంగీకరిస్తూ ఇస్తున్న వీలునామా పత్రం.
.</p>
        </div>
      </div>
    </div>
    <div class="p-3">
      <div class="fot">
        <div>
          <p class="mb-0"><strong>ఉద్యోగి సంతకం</strong></p>
          <p class="mb-0">తేదీ: ________________</p>
        </div>
        <div>
          <p class="mb-0"><strong>అధికార ప్రతినిధి</strong></p>
          <p class="mb-0">JenCeo Home Care Services</p>
        </div>
      </div>
    </div>
    <div class="footer">
    <div><strong>Doc Ref:</strong> JC-HR-02 | Revision: 1 | Date: 1st May 2025 | Page 1 of 1 </div>
    </div>`
  );

const htmlAggHin = (data) =>
  buildTemplate(
    "कर्मचारी अनुबंध — हिंदी",
    "एच.आर विभाग (Reg No: SEA/HYD/ALO/26/1040178/2025)",
    data,
    `<div class="section">
      <div class="hd">नियम एवं शर्तें</div>
      <div class="bd">
        <div class="prose">
          <h4>1. नियुक्ति</h4>
          <p>${fullName(data)} (Employee ID: ${safe(
      data.idNo || data.employeeId
    )}) को निम्न शर्तों के साथ नियुक्त किया जाता है।</p>
          <h4>2. वेतन एवं लाभ</h4>
          <p>कंपनी नीति के अनुसार।</p>
          <h4>3. कार्य समय</h4>
          <p>8 घंटे प्रतिदिन, 6 दिन प्रति सप्ताह।</p>
        </div>
      </div>
    </div>
    <div class="p-3">
      <div class="fot">
        <div>
          <p class="mb-0"><strong>कर्मचारी हस्ताक्षर</strong></p>
          <p class="mb-0">दिनांक: ________________</p>
        </div>
        <div>
          <p class="mb-0"><strong>अधिकृत हस्ताक्षरी</strong></p>
          <p class="mb-0">JenCeo Home Care Services</p>
        </div>
      </div>
    </div>
    <div class="footer">
      <div><strong>Doc Ref:</strong> JC-HR-02 | Revision: 1 | Date: 1st May 2025 | Page 1 of 1 </div>
    </div>`
  );

/* === Offer Letters: EN/TEL/HI (own HTML, same layout wrapper) === */
const today = new Date().toLocaleDateString()
const htmlOffEng = (data) =>
  buildTemplate(
    "OFFER LETTER",
    "Official offer letter preview with employee information.",
    data,
    `<div class="section">
      <div class="hd">Offer Details</div>
      <div class="bd prose">
        <h5> Dear Mr. / Mrs. / Kumari. <strong>${fullName(data)}</strong> We are pleased to offer you the position of <strong>${safe(data.primarySkill)} </strong>at JenCeo Homecare, and compensation are as per HR confirmation.</h5>
        <p> Joining date <strong>${today} </strong></p>
        <p>Salary: <strong>${safe(data.basicSalary)}</strong> <small> in words (${numberToWords(Number(data.basicSalary))} Only)</small></p>
        <h4>Employee Benefits</h4>
        <ol>
          <li>An employee who completes six months of continuous service will be eligible for a bonus of Rs.6,000/-.</li>
          <li>An employee who completes twelve months of continuous service will be eligible for a bonus of Rs.15,000/- and an increment </li>
          <li>An employee who completes six months of continuous service will be provided with travel expenses to visit their home.</li>
          <li>An employee who completes one year of continuous service will receive a salary increment ranging from Rs.1,000/- to Rs.3,000/- starting from the following month</li>
        </ol>
        <h4>Employee Acknowledgment</h4>
        <p>I have carefully read/heard and understood the above-mentioned guidelines. I wholeheartedly agree to them and assure full responsibility for adhering to these terms.</p>
<div class="p-3">
<br><br>
  <div class="fot">
    <div>
      <p class="mb-0"><strong>Employee Signature</strong></p>
      <p class="mb-0">Date: ________________</p>
    </div>
    <div>
      <p class="mb-0"><strong>Authorized Signatory</strong></p>
      <p class="mb-0">JenCeo Home Care Services</p>
    </div>
  </div>
  <br><br><br>
  <p>This document serves as a formal agreement between the employee and JenCeo Homecare, ensuring clarity, professionalism, and
mutual understanding of the terms and conditions of employment</p>
</div>
      </div>
      <br><br>
   
    </div>
    <div class="footer">
      <div><strong>Doc Ref:</strong> JC-HR-02 | Revision: 1 | Date: 1st May 2025 | Page 1 of 1 </div>
    </div>`
  );

const htmlOffTel = (data) =>
  buildTemplate(
    "ఆఫర్ లెటర్ — తెలుగు",
    "ఉద్యోగి వివరాలతో ఆఫర్ లెటర్ ప్రివ్యూ.",
    data,
    `<div class="section">
      <div class="hd">ఆఫర్ వివరాలు</div>
      <div class="bd prose">
        <p><strong>${fullName(data)}</strong> గారికి <strong>${safe(
      data.primarySkill
    )}</strong> హోదాతో ఉద్యోగ ఆఫర్ ఇస్తున్నాము.</p>
        <ul>
          <li>జాయినింగ్ & వేతనం HR ధృవీకరణపై</li>
          <li>కంపెనీ పాలసీలను పాటించాలి</li>
        </ul>
      </div>
    </div>
    <div class="footer"><div><strong>Doc Ref:</strong> JC-HR-OFF-TE</div></div>`
  );

const htmlOffHin = (data) =>
  buildTemplate(
    "ऑफ़र लेटर — हिंदी",
    "कर्मचारी विवरण सहित ऑफर लेटर।",
    data,
    `<div class="section">
      <div class="hd">ऑफ़र विवरण</div>
      <div class="bd prose">
        <p><strong>${fullName(data)}</strong> को <strong>${safe(
      data.primarySkill
    )}</strong> पद हेतु नियुक्ति का प्रस्ताव।</p>
        <ul>
          <li>जॉइनिंग एवं वेतन HR पुष्टि के अनुसार</li>
          <li>कंपनी नीतियों का पालन अनिवार्य</li>
        </ul>
      </div>
    </div>
    <div class="footer"><div><strong>Doc Ref:</strong> JC-HR-OFF-HI</div></div>`
  );

/* =============================
   Main Component
   ============================= */
const WorkerAggrement = () => {
  const [activeTab, setActiveTab] = useState("Full Data");
  const [idNo, setIdNo] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const iframeRef = useRef(null);

  const tabs = ["Full Data", "Agg-Eng", "Agg-Tel", "Agg-Hin", "Off-Eng", "Off-Tel", "Off-Hin"];

  const fetchData = async () => {
    const key = idNo.trim();
    if (!key) {
      setError("Please enter an ID number");
      return;
    }

    setLoading(true);
    setError("");
    try {
      // IMPORTANT: uses EmployeeBioData/idNo
      const snapshot = await firebaseDB
        .child("EmployeeBioData")
        .orderByChild("idNo")
        .equalTo(key)
        .once("value");

      if (!snapshot.exists()) {
        setError("No employee found with this ID");
        setData(null);
        return;
      }
      const obj = snapshot.val();
      const first = obj[Object.keys(obj)[0]];
      setData(first);
    } catch (err) {
      console.error("Error fetching employee:", err);
      setError("Failed to fetch employee data");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") fetchData();
  };

  // Build the current tab's HTML for preview/print
  const currentHTML = useMemo(() => {
    if (!data) return "";
    switch (activeTab) {
      case "Full Data":
        return htmlFullData(data);
      case "Agg-Eng":
        return htmlAggEng(data);
      case "Agg-Tel":
        return htmlAggTel(data);
      case "Agg-Hin":
        return htmlAggHin(data);
      case "Off-Eng":
        return htmlOffEng(data);
      case "Off-Tel":
        return htmlOffTel(data);
      case "Off-Hin":
        return htmlOffHin(data);
      default:
        return htmlFullData(data);
    }
  }, [data, activeTab]);

  // Keep the iframe preview in sync
  const previewSrcDoc = currentHTML;

  const printDocument = () => {
    if (!data) {
      alert("No data to print");
      return;
    }
    const html = currentHTML;
    const w = window.open("", "_blank", "width=1024,height=768");
    if (!w) {
      alert("Popup blocked! Please allow popups for this site.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();

    // Wait for all images/styles to load before print
    const whenReady = () =>
      new Promise((resolve) => {
        const imgs = Array.from(w.document.images || []);
        if (imgs.length === 0) return resolve();
        let done = 0;
        imgs.forEach((img) => {
          if (img.complete) {
            if (++done === imgs.length) resolve();
          } else {
            img.addEventListener("load", () => {
              if (++done === imgs.length) resolve();
            });
            img.addEventListener("error", () => {
              if (++done === imgs.length) resolve();
            });
          }
        });
        setTimeout(resolve, 1200); // fallback
      });

    whenReady().then(() => {
      w.focus();
      w.print(); // user can close window
    });
  };

  return (
    <div className="container-fluid py-3">
      {/* Toolbar with input-group button inside the field */}
      <style>{`
        .soft{background:#ffffff;border:1px solid #eaecef;border-radius:12px;padding:12px 14px;box-shadow:0 3px 18px rgba(16,24,40,0.05)}
        .tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
        .tab-btn{border:1px solid #e1e6f9;background:#f7f9ff;color:#1f2a55;border-radius:999px;padding:6px 12px;font-weight:600}
        .tab-btn.active{background:#304ffe;color:#fff;border-color:#304ffe;box-shadow:0 4px 14px rgba(48,79,254,0.25)}
        .actions{display:flex;gap:8px;flex-wrap:wrap}
        .btn-lite{border:1px solid #dfe3f4;background:#fff;border-radius:10px;padding:8px 14px;font-weight:600}
        .btn-pri{background:#304ffe;border-color:#304ffe;color:#fff}
        .panel{border:1px dashed #ccd5ff;border-radius:14px;padding:10px;background:linear-gradient(180deg,#fbfdff,#ffffff)}
        .help{font-size:12px;color:#6b7280;margin-top:4px}
        .input-group>.form-control{border-top-left-radius:10px;border-bottom-left-radius:10px}
        .input-group .btn{border-top-right-radius:10px;border-bottom-right-radius:10px}
      `}</style>

      <div className="soft" style={{ marginBottom: 12 }}>
        <div className="row g-3 align-items-end">
          <div className="col-md-6">
            <label className="form-label fw-semibold text-black">Employee ID Number</label>
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                placeholder="Enter ID (idNo)"
                value={idNo}
                onChange={(e) => setIdNo(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button className="btn btn-primary" type="button" onClick={fetchData} disabled={loading}>
                {loading ? "Loading…" : "Load"}
              </button>
            </div>
            <div className="help">Searches Firebase → EmployeeBioData / idNo</div>
            {error && <div className="help" style={{ color: "#d11" }}>{error}</div>}
          </div>
          <div className="col-md-6 d-flex justify-content-end align-items-end">
            {data && (
              <button type="button" className="btn-lite" onClick={printDocument}>
                <i className="bi bi-printer me-1" /> Print
              </button>
            )}
          </div>
        </div>
      </div>

      {data && (
        <>
          <div className="tabs">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                className={`tab-btn ${activeTab === t ? "active" : ""}`}
                onClick={() => setActiveTab(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {/* True preview using iframe (so styles are isolated and accurate) */}
          <div className="panel">
            <iframe
              ref={iframeRef}
              title="agreement-preview"
              style={{ width: "100%", height: "900px", border: "none", background: "#fff", borderRadius: 10 }}
              srcDoc={currentHTML}
            />
          </div>
        </>
      )}

      {/* Icons (optional) */}
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css"
      />
    </div>
  );
};

export default WorkerAggrement;
