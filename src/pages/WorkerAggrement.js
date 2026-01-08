import React, { useMemo, useRef, useState } from "react";
import firebaseDB from "../firebase"; // ensure default export points to database.ref()

// Import the department paths
import { WORKER_PATHS } from "../utils/dataPaths";  

/* =============================
   Helpers
   ============================= */
const HEADER_IMG =
  "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FHeadder.svg?alt=media&token=fa65a3ab-ba03-4959-bc36-e293c6db48ae";

const HEADER_IMG_SECOND =
  "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FHeadder-2.svg?alt=media&token=83a00c4b-a170-418b-b38b-63c4155b4d6b";

const today = new Date().toLocaleDateString()
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
        (n % 1000000000 ? " " + toWords(n % 1000000) : "")
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
<div>

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
   <br>
    <br>
    <div class="decleration">
      <p><strong>Declaration:</strong> I hereby declare that the information provided in this document regarding my personal information, experience, skills, health reports and qualifications is true, complete, and accurate to the best of my knowledge. I understand that any misrepresentation or omission of facts may result in legal consequences or disqualification from consideration for employment.</p>
      <p style="text-align:right; font-style:italic; font-weight:700; margin-top:20px">Signature of the Employee</p>
    </div>
 
    <br>
    <br>
    <br>
    <br>
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
  .med {font-size: 13px}
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
            <div class="kv-row alt">
            <div class="kv-label">Gender</div>
            <div class="kv-colon">:</div>
            <div class="kv-value">${gender}</div></div>
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
          <h4 class="telugu">ఈ ఒప్పందం జెన్‌సియో హోంకేర్ సర్వీసెస్ మరియు <strong>${fullName(data)}</strong> (Employee ID: ${safe(data.idNo || data.employeeId)}) మధ్య కుదిరినది.</h4>
          <p class="telugu med">శ్రీ / శ్రీమతి / కుమారి <strong>${fullName(data)}</strong> అను నేను JenCeo Homecare నందు  <strong>${safe(data.primarySkill)}</strong> గా పనిచ చేయుటకు నా సొంత ఆసక్తి తో కుదిరినాను. నేను JenCeo Homecare నియమ
నిబంధనలకు కట్టుబడి, కంపెనీ నియమంచిన చోట మనసా, వాచా, కర్మణా, త్రికరణ శుద్దితో, అంకిత భావముతో, సేవా భావముతో నియమంచిన పని చేస్తూ,
నూటికి నూరుపాళ్ళు న్యాయం చేస్తానని, నా మనసాక్షిగా, దైవసాక్షిగా హామీ ఇస్తున్నాను.</p>
          <h4 class="telugu">నియమ నిబంధనలు</h4>
          <ol class="telugu med">
          <li class="med">ప్రతీ ఉద్యోగీ తన నెల జీతం 30 రోజులు పూర్తి అయిన తరువాత చెల్లంచబడును, మరియు 30 రోజుల లోపు ఎటువంటి అడ్వానుసులు ఇవ్వబడవు</li>
          <li class="med">సంస్థ ద్వార్య నియమంచబడిన పనిని సంస్థకు మాత్రమే చేయాలి, ఉద్యోగి ఆ ఆపని స్వలాభం కోసం క్లంట్ తో పని కుదుర్చుకోకూడదు</li>
          <li class="med">క్లంట్ యొక్క వ్యక్తిగత / కుటుంబ / మతపర / ఆచార వ్యవహారాలకు ఎలాంటి బంగం కలగకుండా నడుచుకోవాలి</li>
          <li class="med">క్లంట్ కి సంబందించిన డబ్బు / బంగారము/ సెల్ ఫోనులు / ల్యాప్టాప్ / మరియు ఏ ఇతర విలువైన వస్తువులు తాకరాదు / తీసుకోరాదు</li>
          <li class="med">ఇచ్చిన పని సక్రమముగా చేస్తూ క్లంట్ పట్ల గౌరవ మర్యాదలతో వుండాలి</li>
          <li class="med">క్లంట్ పట్ల చెడుగా ప్రవర్తించినా / ఏదైనా వస్తువు దొంగాలించినా చట్టబద్ధమైన చర్యలు తీసుకొనబడును. కంపెనీ ఎట్టవంటి బాధ్యతా వహించదు</li>
          <li class="med">డ్యూటీ దిగాలి అనుకున్న యడల సంస్థకు 5 రోజుల ముందుగా తెలపాలి</li>
          <li class="med">ఎటువంటి పరిస్థితులలోనూ సరైన అనుమతి లేకుండా ఉద్యోగి తన పని గాని / పేషెంట్ ని గాని విడిచి పెట్టి వెళ్ళకూడదు.</li>
          <li class="med">ఒకవేళ పేషంట్ మరణిచినట్లు అయితే వెంటనే ఆఫీసుకు తెలియజేయాలి</li>
          <li class="med"> క్లంట్ నుండి పిర్యాదులు వచ్చినా / పని సరిగా చేయక పోయినా/ ప్రవర్తన సరిగా లేకపోయినా ఉద్యోగం నుండి తక్షణమే తొలగించడం జరుగును</li>
          </ol>
          <h4 class="telugu">ఉద్యోగి అంగీకార విభాగం</h4>
          <p class="med">పైన తెలిపిన నీయమాలు, నిబంధనలు, సూచనలు చదివి / విని అందులోని చిక్కులను అర్ధం చేసుకుని మనస్పుర్తినా అంగీకరిస్తూ పూర్తి బాధ్యతగా ఉంటానని, నేను
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
    "कर्मचारी अनुबंध",
    "मानव संसाधन विभाग (Reg No: SEA/HYD/ALO/26/1040178/2025)",
    data,
    `<div class="section">
  <div class="hd">1. नियम एवं शर्तें</div>
  <div class="bd">
    <div class="prose">
      <p>यह अनुबंध JenCeo Home Care Services और <strong>${fullName(data)}</strong> (कर्मचारी आईडी:
        <strong>${safe(data.idNo || data.employeeId)}</strong>) के बीच
        <strong>${safe(data.primarySkill)}</strong> पद के लिए निम्नलिखित शर्तों पर किया गया है:</p>
      <p>मैं, श्री/श्रीमती/कुमारी <strong>${fullName(data)}</strong>, यह घोषित करता/करती हूँ कि मैंने स्वेच्छा से JenCeo Homecare
        में <strong>${safe(data.primarySkill)}</strong> के रूप में जॉइन किया है। मैं आश्वस्त करता/करती हूँ कि JenCeo Homecare
        के नियमों एवं विनियमों का पालन करूंगा/करूंगी और मुझे दिए गए स्थान पर अपनी ड्यूटी पूरी निष्ठा, ईमानदारी और सच्चाई के साथ निभाऊंगा/निभाऊंगी।  
        मैं संपूर्ण समर्पण, सेवा भाव और विचार, वचन तथा कर्म की पवित्रता के साथ कार्य करूंगा/करूंगी।  
        मैं अपने दायित्वों को 100% निष्पक्षता से निभाने का वचन देता/देती हूँ, अपनी अंतरात्मा और ईश्वर को साक्षी मानकर।</p>
      <ol>
        <li>प्रत्येक कर्मचारी का वेतन 30 कार्य दिवस पूरे होने के बाद दिया जाएगा। इस 30-दिन की अवधि के भीतर कोई अग्रिम भुगतान नहीं दिया जाएगा।</li>
        <li>कर्मचारियों को केवल वही कार्य करना होगा जो संगठन द्वारा सौंपा गया है। किसी भी निजी लाभ के लिए ग्राहकों के साथ व्यक्तिगत समझौते करना वर्जित है।</li>
        <li>कर्मचारी ऐसे किसी आचरण में शामिल नहीं होंगे जिससे ग्राहक के व्यक्तिगत, पारिवारिक, धार्मिक या सांस्कृतिक कार्यों में हस्तक्षेप हो।</li>
        <li>कर्मचारियों को ग्राहक की किसी भी मूल्यवान वस्तु, जैसे पैसा, सोना, मोबाइल, लैपटॉप आदि को छूना या लेना सख्त मना है।</li>
        <li>कर्मचारी को अपने कार्य ईमानदारी से करने होंगे और हमेशा ग्राहकों के साथ सम्मान एवं शिष्टाचार से पेश आना होगा।</li>
        <li>यदि कोई कर्मचारी ग्राहक के साथ अनुचित व्यवहार करता है या किसी वस्तु की चोरी में शामिल पाया जाता है, तो उसके खिलाफ कानूनी कार्रवाई की जाएगी। ऐसी स्थिति में कंपनी कोई जिम्मेदारी नहीं लेगी।</li>
        <li>यदि कोई कर्मचारी इस्तीफा देना चाहता है, तो उसे कम से कम 5 दिन पहले संगठन को सूचित करना होगा।</li>
        <li>किसी भी परिस्थिति में कर्मचारी बिना अनुमति के अपनी ड्यूटी/मरीज को नहीं छोड़ सकते।</li>
        <li>यदि मरीज की मृत्यु हो जाती है, तो इसे तुरंत कार्यालय को सूचित करना अनिवार्य है।</li>
        <li>यदि ग्राहकों से शिकायतें प्राप्त होती हैं, या कर्मचारी अपनी ड्यूटी ठीक से नहीं करता/करती है या अनुचित व्यवहार करता/करती है, तो उसे तुरंत बर्खास्त कर दिया जाएगा।</li>
      </ol>
      <h4>2. कर्मचारी स्वीकृति अनुभाग</h4>
      <p>मैंने उपरोक्त नियमों और शर्तों को ध्यानपूर्वक पढ़ा/सुना और पूर्ण रूप से समझा है।  
        मैं पूरे मन से इन्हें मानने और अपने कार्यों की पूरी जिम्मेदारी लेने के लिए सहमत हूँ।  
        मैं स्वीकार करता/करती हूँ कि यदि मैं कंपनी के किसी भी नियम या विनियम का उल्लंघन करता/करती हूँ, तो कंपनी द्वारा लिए गए किसी भी अनुशासनात्मक या कानूनी कार्यवाही का पालन करूंगा/करूंगी।</p>
      <p>इस अनुबंध पर हस्ताक्षर करके, मैं पुष्टि करता/करती हूँ कि मैं JenCeo को इन शर्तों को लागू करने के लिए सभी अधिकार और शक्तियाँ प्रदान करता/करती हूँ।</p>
    </div>
  </div>
</div>
<div class="p-3">
  <div class="fot">
    <div>
      <p class="mb-0"><strong>कर्मचारी हस्ताक्षर</strong></p>
      <p class="mb-0">तिथि: ________________</p>
    </div>
    <div>
      <p class="mb-0"><strong>अधिकृत हस्ताक्षरकर्ता</strong></p>
      <p class="mb-0">JenCeo Home Care Services</p>
    </div>
  </div>
</div>
<div class="footer">
  <div><strong>दस्तावेज़ संदर्भ:</strong> JC-HR-02 | संशोधन: 1 | तिथि: 1 मई 2025 | पृष्ठ 1 का 1 </div>
</div>`
  );


/* === Offer Letters: EN/TEL/HI (own HTML, same layout wrapper) === */
const htmlOffEng = (data) =>
  buildTemplate(
    "OFFER LETTER",
    "H.R Department (Reg No: SEA/HYD/ALO/26/1040178/2025)",
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
    "ఉద్యోగ నియామక పత్రం",
    "H.R Department (Reg No: SEA/HYD/ALO/26/1040178/2025)",
    data,
    `<div class="section">
      <div class="hd">ఉద్యోగి ప్రయోజనాలు</div>
      <div class="bd prose">
        <h4 class ="telugu"> గౌరవనీయులైన శ్రీ / శ్రీమతి / కుమారి. <strong>${fullName(data)}</strong> మీకు <strong>${safe(data.primarySkill)} </strong> యొకక స్థానాన్ని అందించడానికి మేము సంతోషిస్తున్నాము.</h4>
        <p class="med"> Joining date <strong>${today} </strong></p>
        <p class="med">జీతము: <strong>${safe(data.basicSalary)}</strong> <small> అక్షరాలా(${numberToWords(Number(data.basicSalary))} Only)</small></p>
        <h4>ఉద్యోగి ప్రయోజనాలు</h4>
        <ol>
           <li class="med">ఆరు నెలలు నిరంతరాయంగా ఉద్యోగం చేసినవారికి 6,000/- రూపాయిలు బోనస్ గా ఇవ్వబడును</li>
           <li class="med">పెన్నెండు నెలలు నిరంతరాయంగా ఉద్యోగం చేసినవారికి 15,000/- రూపాయిలు బోనస్ ఇవ్వబడును 3,000/- వరకు ఇంక్రిమంట్ ఇవ్వబడును</li>
           <li class="med">నిరంతరాయంగా ఆరు నెలలు మించి పని చేసిన ఉద్యోగికి ఇంటికి వెళ్ళుటకు చార్జీలు ఇవ్వబడును</li>
           <li class="med">నిరంతరాయంగా ఒక సమవస్త్సరం చేసినవారికి తదుపరి నెల నుండి 1,000/- నుండి 3,000/- వరకు జీతం పెంచబడును</li>
        </ol>
        <h4>ఉద్యోగి అంగీకార విభాగం</h4>
        <p class="med">పైన తెలపిన సూచనలను శ్రద్దగా చదివి / విని అర్ధం చేసుకుని మనస్పూర్తిగా అంగీకరిస్తూ పూర్తి బాధ్యతగా ఉంటానని హామీ ఇస్తున్నాను.</p>
<div class="p-3">
<br><br>
  <div class="fot">
    <div>
      <p class="mb-0"><strong>ఉద్యోగి సంతకం</strong></p>
      <p class="mb-0">తేది: ________________</p>
    </div>
    <div>
      <p class="mb-0"><strong>Authorized Signatory</strong></p>
      <p class="mb-0">JenCeo Home Care Services</p>
    </div>
  </div>
  <br><br><br>
  <p>ఇది ఉద్యోగి మరియు JenCeo Homecare మధ్య ఉన్న ఒక అధికారిక ఒప్పంద పత్రం. ఈ పత్రం ఉద్యోగ నిబంధనలు మరియు షరతులపై స్పష్టత, వృత్తిపరమైన దృక్పథం, మరియు పరస్పర అవగాహనను నిర్ధారిస్తుంది</p>
</div>
      </div>
      <br><br>
   
    </div>
    <div class="footer">
      <div><strong>Doc Ref:</strong> JC-HR-02 | Revision: 1 | Date: 1st May 2025 | Page 1 of 1 </div>
    </div>`
  );

/* === Offer Letters: EN/TEL/HI (own HTML, same layout wrapper) === */
const htmlOffHin = (data) =>
  buildTemplate(
    "नियुक्ति पत्र",
    "मानव संसाधन विभाग (Reg No: SEA/HYD/ALO/26/1040178/2025)",
    data,
    `<div class="section">
      <div class="hd">प्रस्ताव विवरण</div>
      <div class="bd prose">
        <h5> श्री / श्रीमती / कुमारी <strong>${fullName(data)}</strong>,  
        हमें आपको <strong>${safe(data.primarySkill)} </strong> के पद पर JenCeo Homecare में नियुक्त करने में अत्यंत प्रसन्नता हो रही है। वेतन और भत्ते एच.आर. पुष्टि के अनुसार होंगे।</h5>
        <p>कार्यग्रहण तिथि: <strong>${today} </strong></p>
        <p>वेतन: <strong>${safe(data.basicSalary)}</strong> <small> शब्दों में (${numberToWords(Number(data.basicSalary))} केवल)</small></p>
        <h4>कर्मचारी लाभ</h4>
        <ol>
          <li>एक कर्मचारी जो छह माह की निरंतर सेवा पूरी करता है, उसे ₹6,000/- का बोनस प्राप्त होगा।</li>
          <li>एक कर्मचारी जो बारह माह की निरंतर सेवा पूरी करता है, उसे ₹15,000/- का बोनस एवं वेतन वृद्धि प्राप्त होगी।</li>
          <li>एक कर्मचारी जो छह माह की निरंतर सेवा पूरी करता है, उसे अपने घर जाने हेतु यात्रा व्यय दिया जाएगा।</li>
          <li>एक कर्मचारी जो एक वर्ष की निरंतर सेवा पूरी करता है, उसे अगले माह से ₹1,000/- से ₹3,000/- तक की वेतन वृद्धि प्राप्त होगी।</li>
        </ol>
        <h4>कर्मचारी स्वीकृति</h4>
        <p>मैंने उपरोक्त निर्देशों को ध्यानपूर्वक पढ़ा/सुना और समझा है। मैं उन्हें पूर्ण रूप से स्वीकार करता/करती हूँ और इन शर्तों का पालन करने की संपूर्ण जिम्मेदारी लेता/लेती हूँ।</p>
<div class="p-3">
<br><br>
  <div class="fot">
    <div>
      <p class="mb-0"><strong>कर्मचारी हस्ताक्षर</strong></p>
      <p class="mb-0">तिथि: ________________</p>
    </div>
    <div>
      <p class="mb-0"><strong>अधिकृत हस्ताक्षरकर्ता</strong></p>
      <p class="mb-0">JenCeo Home Care Services</p>
    </div>
  </div>
  <br><br><br>
  <p>यह दस्तावेज़ कर्मचारी और JenCeo Homecare के बीच एक औपचारिक समझौते के रूप में कार्य करता है,  
  जो स्पष्टता, व्यावसायिकता और रोजगार की शर्तों एवं नियमों की पारस्परिक समझ सुनिश्चित करता है।</p>
</div>
      </div>
      <br><br>
   
    </div>
    <div class="footer">
      <div><strong>दस्तावेज़ संदर्भ:</strong> JC-HR-02 | संशोधन: 1 | तिथि: 1 मई 2025 | पृष्ठ: 1 का 1 </div>
</div>`
  );

/* =============================
 Agg/Off — Tamil (Tem)
 ============================= */
const htmlAggTem = (data) =>
  buildTemplate(
    "பணியாளர் ஒப்பந்தம்",
    "மனிதவளத் துறை (Reg No: SEA/HYD/ALO/26/1040178/2025)",
    data,
    `<div class="section">
  <div class="hd">1. விதிமுறைகள் & நிபந்தனைகள்</div>
  <div class="bd">
    <div class="prose">
      <p>இந்த ஒப்பந்தம் JenCeo Home Care Services மற்றும் <strong>${fullName(data)}</strong> (உழைப்பாளர் ஐடி:
        <strong>${safe(data.idNo || data.employeeId)}</strong>) ஆகியோருக்கிடையே <strong>${safe(data.primarySkill)}</strong> பதவிக்கான வேலைவாய்ப்பிற்காக மேற்கொள்ளப்படுகிறது.</p>
      <p>நான், திரு/திருமதி/செல்வி <strong>${fullName(data)}</strong>, விருப்பத்துடன் JenCeo Homecare நிறுவனத்தில்
        <strong>${safe(data.primarySkill)}</strong> ஆக இணைகிறேன் என்பதை உறுதிப்படுத்துகிறேன். நிறுவன விதிமுறைகளையும் ஒழுங்குகளையும் கடைப்பிடிப்பேன்;
        ஒதுக்கப்பட்ட இடத்தில் முழு நேர்மை, தீர்க்கத் தன்மை, சேவை மனப்பான்மை மற்றும் ஒழுக்கத்துடன் பணியாற்றுவேன். நன் மனச்சாட்சி முன்பும் இறைவன் சாட்சி முன்பும்
        100% நியாயத்துடன் என் பொறுப்புகளை நிறைவேற்றுவேன் என்று உறுதியளிக்கிறேன்.</p>
      <ol>
        <li>ஒவ்வொரு பணியாளரின் சம்பளம் 30 வேலை நாட்கள் முடிந்தபின் வழங்கப்படும். இந்த காலத்தில் முன்னெச்சரிக்கை/அட்வான்ஸ் வழங்கப்படாது.</li>
        <li>நிறுவனம் ஒதுக்கிய பணிகளை மட்டும் செய்ய வேண்டும். தனி லாபத்திற்காக வாடிக்கையாளர்களுடன் தனிப்பட்ட ஒப்பந்தங்கள் செய்யக்கூடாது.</li>
        <li>வாடிக்கையாளரின் தனிப்பட்ட/குடும்ப/மத/நெறி வழக்கங்களுக்கு இடையூறு ஏற்படும் வகையில் நடந்து கொள்ளக்கூடாது.</li>
        <li>வாடிக்கையாளரின் பணம், தங்கம், மொபைல், லாப்டாப் உள்ளிட்ட எந்தவொரு மதிப்புள்ள பொருளையும் தொடவோ எடுக்கவோ கூடாது.</li>
        <li>எப்போதும் மரியாதையுடனும் பணிவுடனும் செயல்பட வேண்டும்.</li>
        <li>தகாத நடத்தை அல்லது திருட்டில் ஈடுபட்டால் சட்ட நடவடிக்கை எடுக்கப்படும்; இத்தகைய வழக்குகளில் நிறுவனம் பொறுப்பேற்காது.</li>
        <li>ராஜினாமா செய்ய விரும்பினால் குறைந்தது 5 நாட்களுக்கு முன் நிறுவனத்திற்கு தெரியப்படுத்த வேண்டும்.</li>
        <li>எந்த சூழலிலும் உரிய அனுமதி இன்றி கடமை/நோயாளியை விட்டு வெளியேறக்கூடாது.</li>
        <li>நோயாளி மரணமடைந்தால் உடனடியாக அலுவலகத்திற்கு தகவல் தர வேண்டும்.</li>
        <li>வாடிக்கையாளர்களிடமிருந்து புகார் வந்தாலோ, கடமையை சரிவர செய்யாதாலோ அல்லது தகாத நடத்தை இருந்தாலோ உடனடியாக பணிநீக்கம் செய்யப்படும்.</li>
      </ol>
      <h4>2. பணியாளர் உறுதிமொழி</h4>
      <p>மேலே கூறிய விதிமுறைகள் மற்றும் நிபந்தனைகளை கவனமாகப் படித்து/கேட்டு முழுமையாகப் புரிந்துள்ளேன். அவற்றை கடைப்பிடிக்கவும்,
        என் செயல்களுக்கு முழுப் பொறுப்பும் ஏற்கவும் சம்மதிக்கிறேன். நிறுவன விதிகளை மீறினால் மேற்கொள்ளப்படும் எந்த ஒழுங்கு/சட்ட நடவடிக்கையையும் இணங்குவேன்.</p>
      <p>இந்த ஒப்பந்தத்தில் கையொப்பமிடுவதன் மூலம், மேற்கண்ட நிபந்தனைகளை அமல்படுத்த JenCeo நிறுவனத்திற்கு தேவையான அனைத்து உரிமைகளையும் அதிகாரங்களையும் வழங்குகிறேன்.</p>
    </div>
  </div>
</div>
<div class="p-3">
  <div class="fot">
    <div>
      <p class="mb-0"><strong>பணியாளர் கையொப்பம்</strong></p>
      <p class="mb-0">தேதி: ________________</p>
    </div>
    <div>
      <p class="mb-0"><strong>அங்கீகரிக்கப்பட்ட கையொப்பம்</strong></p>
      <p class="mb-0">JenCeo Home Care Services</p>
    </div>
  </div>
</div>
<div class="footer">
  <div><strong>Doc Ref:</strong> JC-HR-02 | Revision: 1 | Date: 1st May 2025 | Page 1 of 1 </div>
</div>`
  );

const htmlOffTem = (data) =>
  buildTemplate(
    "நியமனக் கடிதம்",
    "மனிதவளத் துறை (Reg No: SEA/HYD/ALO/26/1040178/2025)",
    data,
    `<div class="section">
      <div class="hd">Offer விவரங்கள்</div>
      <div class="bd prose">
        <h5> அய்யா / அம்மையார் / செல்வி <strong>${fullName(data)}</strong>,  
        JenCeo Homecare நிறுவனத்தில் <strong>${safe(data.primarySkill)}</strong> பதவியை வழங்குவதில் மகிழ்ச்சி அடைகிறோம். சம்பளம் மற்றும் சலுகைகள் HR உறுதிப்படுத்தலின் படி இருக்கும்.</h5>
        <p>சேரும் தேதி: <strong>${today}</strong></p>
        <p>சம்பளம்: <strong>${safe(data.basicSalary)}</strong> <small> (எழுத்தில்: ${numberToWords(Number(data.basicSalary))} Only)</small></p>
        <h4>பணியாளர் நலன்</h4>
        <ol>
          <li>தொடர்ச்சியாக 6 மாத சேவையை நிறைவு செய்த பணியாளருக்கு ₹6,000/- போனஸ் வழங்கப்படும்.</li>
          <li>12 மாத சேவையை நிறைவு செய்த பணியாளருக்கு ₹15,000/- போனஸ் மற்றும் உயர்வு வழங்கப்படும்.</li>
          <li>6 மாத சேவை நிறைவு செய்தவருக்கு வீட்டிற்கு செல்வதற்கான பயணச் செலவு வழங்கப்படும்.</li>
          <li>ஒரு வருட சேவை நிறைவிற்குப் பிறகு அடுத்த மாதம் முதல் ₹1,000/- முதல் ₹3,000/- வரை சம்பள உயர்வு வழங்கப்படும்.</li>
        </ol>
        <h4>பணியாளர் உறுதி</h4>
        <p>மேலே உள்ள வழிகாட்டுதல்களை கவனமாகப் படித்து/கேட்டு புரிந்துள்ளேன். இவற்றை முழுமையாக ஏற்றுக்கொள்கிறேன் மற்றும் விதிமுறைகளைக் கடைப்பிடிப்பதற்குப் பொறுப்பேற்கிறேன்.</p>
<div class="p-3">
<br><br>
  <div class="fot">
    <div>
      <p class="mb-0"><strong>பணியாளர் கையொப்பம்</strong></p>
      <p class="mb-0">தேதி: ________________</p>
    </div>
    <div>
      <p class="mb-0"><strong>அங்கீகரிக்கப்பட்ட கையொப்பம்</strong></p>
      <p class="mb-0">JenCeo Home Care Services</p>
    </div>
  </div>
  <br><br><br>
  <p>இந்த ஆவணம் பணியாளரும் JenCeo Homecare நிறுவனமும் இடையிலான ஒரு முறையான ஒப்பந்தமாகும்; இது தெளிவு, தொழில்முறைத் தன்மை மற்றும் வேலை நிபந்தனைகள் குறித்த பரஸ்பர புரிதலை உறுதிப்படுத்துகிறது.</p>
</div>
      </div>
      <br><br>
   
    </div>
    <div class="footer">
      <div><strong>Doc Ref:</strong> JC-HR-02 | Revision: 1 | Date: 1st May 2025 | Page 1 of 1 </div>
    </div>`
  );

/* =============================
   Agg/Off — Kannada (Kan)
   ============================= */
const htmlAggKan = (data) =>
  buildTemplate(
    "ಕಾರ್ಮಿಕ ಒಪ್ಪಂದ",
    "ಮಾನವ ಸಂಪನ್ಮೂಲ ವಿಭಾಗ (Reg No: SEA/HYD/ALO/26/1040178/2025)",
    data,
    `<div class="section">
  <div class="hd">1. ನಿಯಮಗಳು ಮತ್ತು ಷರತ್ತುಗಳು</div>
  <div class="bd">
    <div class="prose">
      <p>ಈ ಒಪ್ಪಂದವು JenCeo Home Care Services ಮತ್ತು <strong>${fullName(data)}</strong> (Employee ID:
        <strong>${safe(data.idNo || data.employeeId)}</strong>) ಇವರ ನಡುವೆ <strong>${safe(data.primarySkill)}</strong> ಹುದ್ದೆಗೆ ಸಂಬಂಧಿಸಿದೆ.</p>
      <p>ನಾನು, ಶ್ರೀ/ಶ್ರೀಮತಿ/ಕುಮಾರಿ <strong>${fullName(data)}</strong>, ಸ್ವಯಂ ಪ್ರೇರಣೆಯಿಂದ JenCeo Homecare ಗೆ
        <strong>${safe(data.primarySkill)}</strong> ಆಗ ಸೇರಿದ್ದೇನೆ. ಸಂಸ್ಥೆಯ ನಿಯಮಾವಳಿ ಪಾಲಿಸುತ್ತೇನೆ; ನಿಯೋಜಿತ ಸ್ಥಳದಲ್ಲಿ ಪ್ರಾಮಾಣಿಕತೆ,
        ಸಮರ್ಪಣೆ ಮತ್ತು ಸೇವಾ ಮನೋಭಾವದಿಂದ 100% ನ್ಯಾಯದೊಂದಿಗೆ ಕರ್ತವ್ಯ ನಿರ್ವಹಿಸುತ್ತೇನೆ ಎಂದು ಭರವಸೆ ನೀಡುತ್ತೇನೆ.</p>
      <ol>
        <li>ಪ್ರತಿ ಉದ್ಯೋಗಿಯ ವೇತನವನ್ನು 30 ಕೆಲಸದ ದಿನಗಳು ಪೂರ್ಣಗೊಂಡ ನಂತರ ನೀಡಲಾಗುವುದು. ಈ ಅವಧಿಯಲ್ಲಿ ಮುಂಗಡ ನೀಡಲಾಗುವುದಿಲ್ಲ.</li>
        <li>ಸಂಸ್ಥೆ ನೀಡಿದ ಕರ್ತವ್ಯಗಳನ್ನು ಮಾತ್ರ ನಿರ್ವಹಿಸಬೇಕು; ವೈಯಕ್ತಿಕ ಲಾಭಕ್ಕಾಗಿ ಗ್ರಾಹಕರೊಂದಿಗೆ ಖಾಸಗಿ ಒಪ್ಪಂದ ಮಾಡಿಕೊಳ್ಳಬಾರದು.</li>
        <li>ಗ್ರಾಹಕರ ವೈಯಕ್ತಿಕ/ಕುಟುಂಬ/ಧಾರ್ಮಿಕ/ಸಾಂಸ್ಕೃತಿಕ ಆಚರಣೆಗಳಿಗೆ ವ್ಯತ್ಯಯ ಉಂಟುಮಾಡಬಾರದು.</li>
        <li>ಗ್ರಾಹಕರ ಹಣ/ಬಂಗಾರ/ಮೊಬೈಲ್/ಲ್ಯಾಪ್‌ಟಾಪ್ ಮುಂತಾದ ಬೆಲೆಬಾಳುವ ವಸ್ತುಗಳನ್ನು ಮುಟ್ಟಬಾರದು/ತೆಗೆದುಕೊಳ್ಳಬಾರದು.</li>
        <li>ಯಾವಾಗಲೂ ಗೌರವ ಮತ್ತು ಸ್ನೇಹಪೂರ್ವಕವಾಗಿ ವರ್ತಿಸಬೇಕು.</li>
        <li>ಅಸಭ್ಯ ವರ್ತನೆ/ಕಳ್ಳತನ ಕಂಡುಬಂದಲ್ಲಿ ಕಾನೂನು ಕ್ರಮ ಕೈಗೊಳ್ಳಲಾಗುತ್ತದೆ; ಅಂತಹ ಸಂದರ್ಭಗಳಲ್ಲಿ ಕಂಪನಿ ಜವಾಬ್ದಾರಿಯಾಗಿರುವುದಿಲ್ಲ.</li>
        <li>ರಾಜೀನಾಮೆ ಕೊಡಲು ಕನಿಷ್ಠ 5 ದಿನಗಳ ಮುಂಚಿತವಾಗಿ ಸಂಸ್ಥೆಗೆ ತಿಳಿಸಬೇಕು.</li>
        <li>ಯಾವುದೇ ಸಂದರ್ಭದಲ್ಲಿ ಸರಿಯಾದ ಅನುಮತಿ ಇಲ್ಲದೆ ಕರ್ತವ್ಯ/ರೋಗಿಯನ್ನು ಬಿಟ್ಟು ಹೋಗಬಾರದು.</li>
        <li>ರೋಗಿ ಮೃತಪಟ್ಟರೆ ತಕ್ಷಣ ಕಛೇರಿಗೆ ತಿಳಿಸಬೇಕು.</li>
        <li>ಗ್ರಾಹಕರಿಂದ ದೂರಣೆಗಳು ಬಂದಲ್ಲಿ ಅಥವಾ ಕರ್ತವ್ಯ ನಿರ್ವಹಣೆ ಸರಿಯಾಗಿರದಿದ್ದರೆ ತಕ್ಷಣವೇ ಸೇವೆಯಿಂದ ತೆಗೆಯಲಾಗುತ್ತದೆ.</li>
      </ol>
      <h4>2. ಉದ್ಯೋಗಿ ಘೋಷಣೆ</h4>
      <p>ಮೇಲಿನ ನಿಯಮಗಳು ಮತ್ತು ಷರತ್ತುಗಳನ್ನು ತಿಳಿದು, ಸಂಪೂರ್ಣವಾಗಿ ಒಪ್ಪುತ್ತೇನೆ. ಅವುಗಳನ್ನು ಪಾಲಿಸಲು ಮತ್ತು ನನ್ನ ಕ್ರಿಯೆಗಳ ಹೊಣೆಗಾರಿಕೆಯನ್ನು ಸ್ವೀಕರಿಸುತ್ತೇನೆ.
        ಕಂಪನಿಯ ನಿಯಮ ಉಲ್ಲಂಘನೆ ಮಾಡಿದಲ್ಲಿ ಕೈಗೊಳ್ಳುವ ಯಾವುದೇ ಕ್ರಮಗಳಿಗೆ ನಾನು ಅನುಸರಿಸುತ್ತೇನೆ.</p>
      <p>ಈ ಒಪ್ಪಂದಕ್ಕೆ ಸಹಿ ಮಾಡುವುದರ ಮೂಲಕ, ಮೇಲ್ಕಂಡ ಷರತ್ತುಗಳನ್ನು ಜಾರಿಗೊಳಿಸಲು JenCeo ಗೆ ಅಗತ್ಯವಾದ ಎಲ್ಲಾ ಹಕ್ಕುಗಳನ್ನು ನೀಡುತ್ತೇನೆ.</p>
    </div>
  </div>
</div>
<div class="p-3">
  <div class="fot">
    <div>
      <p class="mb-0"><strong>ಉದ್ಯೋಗಿಯ ಸಹಿ</strong></p>
      <p class="mb-0">ದಿನಾಂಕ: ________________</p>
    </div>
    <div>
      <p class="mb-0"><strong>ಅಧಿಕೃತ ಸಹಿ</strong></p>
      <p class="mb-0">JenCeo Home Care Services</p>
    </div>
  </div>
</div>
<div class="footer">
  <div><strong>Doc Ref:</strong> JC-HR-02 | Revision: 1 | Date: 1st May 2025 | Page 1 of 1 </div>
</div>`
  );

const htmlOffKan = (data) =>
  buildTemplate(
    "ನೇಮಕ ಪತ್ರ",
    "ಮಾನವ ಸಂಪನ್ಮೂಲ ವಿಭಾಗ (Reg No: SEA/HYD/ALO/26/1040178/2025)",
    data,
    `<div class="section">
      <div class="hd">ಆಫರ್ ವಿವರಗಳು</div>
      <div class="bd prose">
        <h5> ಶ್ರೀ/ಶ್ರೀಮತಿ/ಕುಮಾರಿ <strong>${fullName(data)}</strong> ಅವರೇ, JenCeo Homecare ನಲ್ಲಿ <strong>${safe(data.primarySkill)}</strong> ಹುದ್ದೆಯನ್ನು ನೀಡುವುದರಲ್ಲಿ ನಮಗೆ ಸಂತೋಷವಾಗಿದೆ. ವೇತನ ಮತ್ತು ಸೌಲಭ್ಯಗಳು HR ದೃಢೀಕರಣದಂತೆ ಇರುತ್ತವೆ.</h5>
        <p>ಜೋಯಿನ್ ದಿನಾಂಕ: <strong>${today}</strong></p>
        <p>ವೇತನ: <strong>${safe(data.basicSalary)}</strong> <small> (ಪದಗಳಲ್ಲಿ: ${numberToWords(Number(data.basicSalary))} Only)</small></p>
        <h4>ಉದ್ಯೋಗಿ ಪ್ರಯೋಜನಗಳು</h4>
        <ol>
          <li>6 ತಿಂಗಳು ನಿರಂತರ ಸೇವೆ ಮಾಡಿದವರಿಗೆ ₹6,000/- ಬೋನಸ್.</li>
          <li>12 ತಿಂಗಳು ಸೇವೆ ಮಾಡಿದವರಿಗೆ ₹15,000/- ಬೋನಸ್ ಮತ್ತು ವೇತನವೃದ್ಧಿ.</li>
          <li>6 ತಿಂಗಳು ಸೇವೆಯ ನಂತರ ಮನೆಗೆ ಭೇಟಿ ನೀಡಲು ಪ್ರಯಾಣ ವೆಚ್ಚ.</li>
          <li>ಒಂದು ವರ್ಷದ ಸೇವೆಯ ನಂತರ ಮುಂದಿನ ತಿಂಗಳಿಂದ ₹1,000/- ರಿಂದ ₹3,000/- ವೇತನವೃದ್ಧಿ.</li>
        </ol>
        <h4>ಉದ್ಯೋಗಿ ದೃಢೀಕರಣ</h4>
        <p>ನಾನು ಮೇಲಿನ ಸೂಚನೆಗಳನ್ನು ಓದಿ/ಕೆಳಗಿ ಅರ್ಥಮಾಡಿಕೊಂಡಿದ್ದೇನೆ. ಅವನ್ನು ಪಾಲಿಸಲು ಮತ್ತು ಹೊಣೆ ಹೊರುವುದಾಗಿ ಒಪ್ಪುತ್ತೇನೆ.</p>
<div class="p-3">
<br><br>
  <div class="fot">
    <div>
      <p class="mb-0"><strong>ಉದ್ಯೋಗಿಯ ಸಹಿ</strong></p>
      <p class="mb-0">ದಿನಾಂಕ: ________________</p>
    </div>
    <div>
      <p class="mb-0"><strong>ಅಧಿಕೃತ ಸಹಿ</strong></p>
      <p class="mb-0">JenCeo Home Care Services</p>
    </div>
  </div>
  <br><br><br>
  <p>ಈ ದಾಖಲೆ ಉದ್ಯೋಗಿ ಮತ್ತು JenCeo Homecare ನಡುವಿನ ಅಧಿಕೃತ ಒಪ್ಪಂದವಾಗಿದ್ದು, ಸ್ಪಷ್ಟತೆ, ವೃತ್ತಿಪರತೆ ಮತ್ತು ಉದ್ಯೋಗದ ನಿಯಮ-ಷರತ್ತುಗಳ ಪರಸ್ಪರ ಅರ್ಥೈಸಿಕೆಯನ್ನು ಖಚಿತಪಡಿಸುತ್ತದೆ.</p>
</div>
      </div>
      <br><br>
   
    </div>
    <div class="footer">
      <div><strong>Doc Ref:</strong> JC-HR-02 | Revision: 1 | Date: 1st May 2025 | Page 1 of 1 </div>
    </div>`
  );

/* =============================
   Agg/Off — Bengali (Ben)
   ============================= */
const htmlAggBen = (data) =>
  buildTemplate(
    "কর্মচারী চুক্তিপত্র",
    "এইচ.আর. বিভাগ (Reg No: SEA/HYD/ALO/26/1040178/2025)",
    data,
    `<div class="section">
  <div class="hd">১. শর্তাবলী ও বিধি</div>
  <div class="bd">
    <div class="prose">
      <p>এই চুক্তি JenCeo Home Care Services এবং <strong>${fullName(data)}</strong> (কর্মী আইডি:
        <strong>${safe(data.idNo || data.employeeId)}</strong>)-এর মধ্যে <strong>${safe(data.primarySkill)}</strong> পদে নিয়োগের জন্য সম্পাদিত হলো।</p>
      <p>আমি, জনাব/জনাবা/কুমারী <strong>${fullName(data)}</strong>, স্বেচ্ছায় JenCeo Homecare-এ
        <strong>${safe(data.primarySkill)}</strong> হিসেবে যোগদান করছি। প্রতিষ্ঠানের সকল নিয়ম-কানুন মেনে দায়িত্বশীলভাবে, সততা
        ও নিষ্ঠার সাথে কর্মসম্পাদন করবো—বিবেক ও সর্বশক্তিমানকে সাক্ষী রেখে ১০০% ন্যায়নিষ্ঠার প্রতিশ্রুতি দিচ্ছি।</p>
      <ol>
        <li>৩০ কার্যদিবস পূর্ণ হওয়ার পরই বেতন প্রদান করা হবে; এর আগে কোনো অগ্রিম প্রদান করা হবে না।</li>
        <li>প্রতিষ্ঠান কর্তৃক নির্ধারিত কাজ ব্যতীত ব্যক্তিগত লাভের জন্য ক্লায়েন্টের সঙ্গে কোনও ব্যক্তিগত সমঝোতা করা যাবে না।</li>
        <li>ক্লায়েন্টের ব্যক্তিগত/পারিবারিক/ধর্মীয়/সাংস্কৃতিক আচরণে হস্তক্ষেপ করা যাবে না।</li>
        <li>ক্লায়েন্টের টাকা, সোনা, মোবাইল, ল্যাপটপ ইত্যাদি মূল্যবান জিনিস স্পর্শ/গ্রহণ করা সম্পূর্ণ নিষিদ্ধ।</li>
        <li>সবসময় ভদ্রতা ও সম্মান বজায় রাখতে হবে।</li>
        <li>অশোভন আচরণ বা চুরির প্রমাণ পাওয়া গেলে আইনানুগ ব্যবস্থা নেওয়া হবে; এ ক্ষেত্রে কোম্পানি দায়ী থাকবে না।</li>
        <li>পদত্যাগ করতে চাইলে কমপক্ষে ৫ দিন আগে প্রতিষ্ঠানকে জানাতে হবে।</li>
        <li>কোনও পরিস্থিতিতেই যথাযথ অনুমতি ছাড়া দায়িত্ব/রোগীকে ছেড়ে যাওয়া যাবে না।</li>
        <li>রোগী মৃত্যুবরণ করলে বিলম্ব না করে অফিসে জানাতে হবে।</li>
        <li>ক্লায়েন্টের অভিযোগ প্রাপ্ত হলে বা কাজ যথাযথভাবে না করলে, অথবা অশোভন আচরণ করলে, চাকরি তাৎক্ষণিকভাবে বাতিল করা হবে।</li>
      </ol>
      <h4>২. কর্মচারীর স্বীকৃতি</h4>
      <p>উপরোক্ত শর্তাবলী ও বিধি মনোযোগসহকারে পড়ে/শুনে সম্পূর্ণরূপে বুঝেছি। এগুলো মেনে চলতে এবং নিজের কার্যকলাপের সম্পূর্ণ দায়িত্ব নিতে সম্মত।</p>
      <p>এই চুক্তিতে স্বাক্ষরের মাধ্যমে, উল্লিখিত শর্তাবলী কার্যকর করতে JenCeo-কে প্রয়োজনীয় সকল ক্ষমতা ও অধিকার প্রদান করছি।</p>
    </div>
  </div>
</div>
<div class="p-3">
  <div class="fot">
    <div>
      <p class="mb-0"><strong>কর্মচারীর স্বাক্ষর</strong></p>
      <p class="mb-0">তারিখ: ________________</p>
    </div>
    <div>
      <p class="mb-0"><strong>অনুমোদিত স্বাক্ষরকারী</strong></p>
      <p class="mb-0">JenCeo Home Care Services</p>
    </div>
  </div>
</div>
<div class="footer">
  <div><strong>Doc Ref:</strong> JC-HR-02 | Revision: 1 | Date: 1st May 2025 | Page 1 of 1 </div>
</div>`
  );

const htmlOffBen = (data) =>
  buildTemplate(
    "নিয়োগপত্র",
    "এইচ.আর. বিভাগ (Reg No: SEA/HYD/ALO/26/1040178/2025)",
    data,
    `<div class="section">
      <div class="hd">প্রস্তাবের বিবরণ</div>
      <div class="bd prose">
        <h5> জনাব / জনাবা / কুমারী <strong>${fullName(data)}</strong>, JenCeo Homecare-এ <strong>${safe(data.primarySkill)}</strong> পদে আপনাকে নিয়োগ দিতে পেরে আমরা আনন্দিত। বেতন ও সুবিধা HR-এর নিশ্চয়তা অনুযায়ী হবে।</h5>
        <p>যোগদানের তারিখ: <strong>${today}</strong></p>
        <p>বেতন: <strong>${safe(data.basicSalary)}</strong> <small> (কথায়: ${numberToWords(Number(data.basicSalary))} Only)</small></p>
        <h4>কর্মচারী সুবিধাসমূহ</h4>
        <ol>
          <li>৬ মাস নিরবচ্ছিন্ন সেবার পর ₹6,000/- বোনাস।</li>
          <li>১২ মাসের পরে ₹15,000/- বোনাস এবং ইনক্রিমেন্ট।</li>
          <li>৬ মাসের পরে বাড়ি যাওয়ার জন্য যাতায়াত ব্যয়।</li>
          <li>১ বছর পূর্ণ হলে পরের মাস থেকে ₹1,000/- থেকে ₹3,000/- পর্যন্ত বেতন বৃদ্ধি।</li>
        </ol>
        <h4>কর্মচারীর স্বীকৃতি</h4>
        <p>উপরে বর্ণিত নির্দেশনা মনোযোগ দিয়ে পড়ে/শুনে বুঝেছি এবং সেগুলো মেনে চলতে সম্মত।</p>
<div class="p-3">
<br><br>
  <div class="fot">
    <div>
      <p class="mb-0"><strong>কর্মচারীর স্বাক্ষর</strong></p>
      <p class="mb-0">তারিখ: ________________</p>
    </div>
    <div>
      <p class="mb-0"><strong>অনুমোদিত স্বাক্ষরকারী</strong></p>
      <p class="mb-0">JenCeo Home Care Services</p>
    </div>
  </div>
  <br><br><br>
  <p>এই নথিটি কর্মচারী এবং JenCeo Homecare-এর মধ্যে একটি আনুষ্ঠানিক চুক্তি হিসেবে বিবেচিত হবে, যা স্বচ্ছতা, পেশাদারিত্ব এবং চাকরির শর্তাবলী সম্পর্কে পারস্পরিক বোঝাপড়া নিশ্চিত করে।</p>
</div>
      </div>
      <br><br>
   
    </div>
    <div class="footer">
      <div><strong>Doc Ref:</strong> JC-HR-02 | Revision: 1 | Date: 1st May 2025 | Page 1 of 1 </div>
    </div>`
  );

/* =============================
   Agg/Off — Urdu (Urd)  (RTL)
   ============================= */
const htmlAggUrd = (data) =>
  buildTemplate(
    "ملازم کا معاہدہ",
    "محکمہ برائے انسانی وسائل (Reg No: SEA/HYD/ALO/26/1040178/2025)",
    data,
    `<div class="section">
  <div class="hd" style="direction:rtl;text-align:right">۱۔ شرائط و ضوابط</div>
  <div class="bd">
    <div class="prose" style="direction:rtl;text-align:right">
      <p>یہ معاہدہ JenCeo Home Care Services اور <strong>${fullName(data)}</strong> (ملازم آئی ڈی:
        <strong>${safe(data.idNo || data.employeeId)}</strong>) کے درمیان <strong>${safe(data.primarySkill)}</strong> کی ملازمت کے لیے کیا جا رہا ہے۔</p>
      <p>میں، جناب/محترمہ/کمہاری <strong>${fullName(data)}</strong>، بذاتِ خود JenCeo Homecare میں
        <strong>${safe(data.primarySkill)}</strong> کے طور پر شامل ہوتا/ہوتی ہوں۔ ادارے کے قواعد و ضوابط پر مکمل طور پر عمل کرنے
        اور مقررہ مقام پر دیانت داری، اخلاص اور خدمت کے جذبے کے ساتھ ۱۰۰٪ انصاف کے ساتھ فرائض انجام دینے کا عہد کرتا/کرتی ہوں۔</p>
      <ol>
        <li>ہر ملازم کی تنخواہ 30 ورکنگ ڈیز مکمل ہونے کے بعد ادا کی جائے گی؛ اس دوران کسی قسم کی ایڈوانس ادائیگی نہیں ہوگی۔</li>
        <li>صرف ادارے کی جانب سے تفویض کردہ ذمہ داریاں انجام دی جائیں؛ ذاتی فائدے کے لیے کلائنٹس سے کوئی نجی معاہدہ نہیں ہوگا۔</li>
        <li>کلائنٹ کے ذاتی، خاندانی، مذہبی یا ثقافتی امور میں مداخلت سے گریز کیا جائے۔</li>
        <li>کلائنٹ کی رقم، سونا، موبائل، لیپ ٹاپ یا کوئی قیمتی شے چھونا/لینا سخت منع ہے۔</li>
        <li>ہمیشہ احترام اور شائستگی کے ساتھ پیش آیا جائے۔</li>
        <li>غلط رویّہ یا چوری کی صورت میں قانونی کارروائی کی جائے گی؛ اس صورت میں کمپنی ذمہ دار نہیں ہوگی۔</li>
        <li>استعفیٰ دینا ہو تو کم از کم 5 دن پہلے ادارے کو اطلاع دینا ضروری ہے۔</li>
        <li>کسی بھی صورت میں مناسب اجازت کے بغیر ڈیوٹی/مریض کو چھوڑ کر جانا منع ہے۔</li>
        <li>اگر مریض کا انتقال ہو جائے تو فوراً دفتر کو اطلاع دی جائے۔</li>
        <li>کلائنٹ کی شکایات یا فرائض میں کوتاہی/نامناسب رویّہ کی صورت میں ملازمت فوری طور پر ختم کی جا سکتی ہے۔</li>
      </ol>
      <h4>۲۔ ملازم کی توثیق</h4>
      <p>میں نے اوپر درج شرائط و ضوابط بغور پڑھ/سن کر مکمل طور پر سمجھ لیے ہیں اور ان پر عمل کرنے اور اپنے افعال کی مکمل ذمہ داری قبول کرتا/کرتی ہوں۔</p>
      <p>اس معاہدے پر دستخط کر کے میں تصدیق کرتا/کرتی ہوں کہ JenCeo کو ان شرائط کے نفاذ کے لیے تمام ضروری اختیارات حاصل ہوں گے۔</p>
    </div>
  </div>
</div>
<div class="p-3" style="direction:rtl;text-align:right">
  <div class="fot" style="flex-direction:row-reverse">
    <div>
      <p class="mb-0"><strong>ملازم کے دستخط</strong></p>
      <p class="mb-0">تاریخ: ________________</p>
    </div>
    <div>
      <p class="mb-0"><strong>مجاز دستخط کنندہ</strong></p>
      <p class="mb-0">JenCeo Home Care Services</p>
    </div>
  </div>
</div>
<div class="footer">
  <div><strong>Doc Ref:</strong> JC-HR-02 | Revision: 1 | Date: 1st May 2025 | Page 1 of 1 </div>
</div>`
  );

const htmlOffUrd = (data) =>
  buildTemplate(
    "تقرری نامہ",
    "محکمہ برائے انسانی وسائل (Reg No: SEA/HYD/ALO/26/1040178/2025)",
    data,
    `<div class="section">
      <div class="hd" style="direction:rtl;text-align:right">آفر کی تفصیلات</div>
      <div class="bd prose" style="direction:rtl;text-align:right">
        <h5> جناب / محترمہ / کمہاری <strong>${fullName(data)}</strong>,  
        ہمیں خوشی ہے کہ JenCeo Homecare میں آپ کو <strong>${safe(data.primarySkill)}</strong> کے عہدے کی پیشکش کی جا رہی ہے۔ معاوضہ HR کی توثیق کے مطابق ہوگا۔</h5>
        <p>شمولیتی تاریخ: <strong>${today}</strong></p>
        <p>تنخواہ: <strong>${safe(data.basicSalary)}</strong> <small> (الفاظ میں: ${numberToWords(Number(data.basicSalary))} Only)</small></p>
        <h4>ملازم کے فوائد</h4>
        <ol>
          <li>مسلسل 6 ماہ کی خدمت پر ₹6,000/- بونس۔</li>
          <li>12 ماہ مکمل ہونے پر ₹15,000/- بونس اور انکریمنٹ۔</li>
          <li>6 ماہ مکمل کرنے پر گھر آنے جانے کے سفری اخراجات۔</li>
          <li>ایک سال مکمل ہونے پر اگلے مہینے سے ₹1,000/- تا ₹3,000/- تنخواہ میں اضافہ۔</li>
        </ol>
        <h4>ملازم کی توثیق</h4>
        <p>میں نے مذکورہ ہدایات بغور پڑھ/سن کر سمجھ لی ہیں اور ان پر عمل کرنے کی مکمل ذمہ داری قبول کرتا/کرتی ہوں۔</p>
<div class="p-3">
<br><br>
  <div class="fot" style="direction:rtl;flex-direction:row-reverse">
    <div>
      <p class="mb-0"><strong>ملازم کے دستخط</strong></p>
      <p class="mb-0">تاریخ: ________________</p>
    </div>
    <div>
      <p class="mb-0"><strong>مجاز دستخط کنندہ</strong></p>
      <p class="mb-0">JenCeo Home Care Services</p>
    </div>
  </div>
  <br><br><br>
  <p style="direction:rtl;text-align:right">یہ دستاویز ملازم اور JenCeo Homecare کے درمیان ایک باقاعدہ معاہدہ ہے جو وضاحت، پیشہ ورانہ طرزِعمل اور ملازمت کی شرائط و ضوابط کے باہمی فہم کو یقینی بناتا ہے۔</p>
</div>
      </div>
      <br><br>
   
    </div>
    <div class="footer">
      <div><strong>Doc Ref:</strong> JC-HR-02 | Revision: 1 | Date: 1st May 2025 | Page 1 of 1 </div>
    </div>`
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

  const tabs = [
    "Full Data",
    "Agg-Eng",
    "Off-Eng",
    "Agg-Tel",
    "Off-Tel",
    "Agg-Hin",
    "Off-Hin",
    "Agg-Tem",
    "Off-Tem",
    "Agg-Kan",
    "Off-Kan",
    "Agg-Ben",
    "Off-Ben",
    "Agg-Urd",
    "Off-Urd",
  ];

  // Function to search for employee across all department paths
  const fetchData = async () => {
    const raw = (idNo || "").trim();
    if (!raw) {
      setError("Please enter an ID number");
      return;
    }

    const key = raw;                 // original casing
    const lower = raw.toLowerCase(); // normalized for case-insensitive compare

    setLoading(true);
    setError("");
    setData(null);

    try {
      let foundData = null;
      let foundPath = null;

      // Search through all department paths
      const departmentPaths = Object.values(WORKER_PATHS);
      
      for (const path of departmentPaths) {
        if (foundData) break; // Stop searching if already found
        
        try {
          // 1) Try exact match on idNo
          let snapshot = await firebaseDB
            .child(path)
            .orderByChild("idNo")
            .equalTo(key)
            .once("value");

          // 2) If not found, try case-insensitive via idNoLower
          if (!snapshot.exists()) {
            snapshot = await firebaseDB
              .child(path)
              .orderByChild("idNoLower")
              .equalTo(lower)
              .once("value");
          }

          // 3) If still not found, fallback: scan and compare case-insensitively
          if (!snapshot.exists()) {
            const allSnap = await firebaseDB.child(path).once("value");
            if (allSnap.exists()) {
              allSnap.forEach((child) => {
                const v = child.val() || {};
                const idRaw = String(v.idNo ?? "").trim();
                const idLower = String(v.idNoLower ?? "").trim();
                if (idRaw.toLowerCase() === lower || idLower === lower) {
                  foundData = v;
                  foundPath = path;
                  return true; // stop iteration
                }
                return false;
              });
            }
          } else {
            // Found in exact or case-insensitive search
            const obj = snapshot.val();
            foundData = obj[Object.keys(obj)[0]];
            foundPath = path;
          }
        } catch (err) {
          console.error(`Error searching in ${path}:`, err);
          // Continue searching other paths
        }
      }

      if (foundData) {
        console.log(`Found employee in path: ${foundPath}`);
        setData(foundData);
      } else {
        setError("No employee found with this ID across all departments");
      }
    } catch (err) {
      console.error("Error fetching employee:", err);
      setError("Failed to fetch employee data");
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
      case "Full Data": return htmlFullData(data);
      case "Agg-Eng": return htmlAggEng(data);
      case "Off-Eng": return htmlOffEng(data);
      case "Agg-Tel": return htmlAggTel(data);
      case "Off-Tel": return htmlOffTel(data);
      case "Agg-Hin": return htmlAggHin(data);
      case "Off-Hin": return htmlOffHin(data);
      case "Agg-Tem": return htmlAggTem(data);
      case "Off-Tem": return htmlOffTem(data);
      case "Agg-Kan": return htmlAggKan(data);
      case "Off-Kan": return htmlOffKan(data);
      case "Agg-Ben": return htmlAggBen(data);
      case "Off-Ben": return htmlOffBen(data);
      case "Agg-Urd": return htmlAggUrd(data);
      case "Off-Urd": return htmlOffUrd(data);
      default: return htmlFullData(data);
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

         @media (max-width: 992px) {
         .soft {margin-top: 100px}
         }

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
            <div className="help">Searches across all department paths in WorkerData/*/Running</div>
            {error && <div className="help" style={{ color: "#d11" }}>{error}</div>}
          </div>
          <div className="col-md-6 d-flex justify-content-end align-items-end">
            {data && (
              <button type="button" className="btn btn-warning" onClick={printDocument}>
                <i className="bi bi-printer me-1" /> <strong>Print</strong>
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