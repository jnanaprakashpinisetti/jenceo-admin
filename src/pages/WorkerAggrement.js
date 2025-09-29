
import React, { useEffect, useMemo, useState } from "react";
import firebaseDB from "../firebase"; // If you export { firebaseDB }, change this import accordingly.

/* =============================
   Static & helpers
   ============================= */
const HEADER_IMG =
  "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FHeadder.svg?alt=media&token=fa65a3ab-ba03-4959-bc36-e293c6db48ae";

const safe = (v, fb = "—") =>
  v !== undefined && v !== null && String(v).trim() !== "" ? v : fb;
const fullName = (e) =>
  [safe(e?.firstName, ""), safe(e?.lastName, "")].filter(Boolean).join(" ").trim() || "—";
const toDateText = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString();
};

const addrBlock = (data, prefix) => {
  const rows = [
    ["Door No", safe(data[`${prefix}Address`])],
    ["Street", safe(data[`${prefix}Street`])],
    ["Landmark", safe(data[`${prefix}Landmark`])],
    ["Village / Town", safe(data[`${prefix}Village`])],
    ["Mandal", safe(data[`${prefix}Mandal`])],
    ["District", safe(data[`${prefix}District`])],
    ["State", `${safe(data[`${prefix}State`])}${data[`${prefix}Pincode`] ? " - " + data[`${prefix}Pincode`] : ""}`],
  ];
  return rows
    .map(
      ([k, v], i) => `
    <div class="kv-row ${i % 2 ? "alt" : ""}">
      <div class="kv-label">${k}</div><div class="kv-colon">:</div>
      <div class="kv-value">${v}</div>
    </div>`
    )
    .join("");
};

const skillTags = (data) =>
  Array.isArray(data.workingSkills) && data.workingSkills.length
    ? data.workingSkills.filter(Boolean).map((s) => `<span class="tag">${s}</span>`).join("")
    : `<span class="muted">—</span>`;

/* =============================
   Variant-specific HTML builders
   Each one returns a complete printable A4 block
   ============================= */
const commonHeadCSS = `
  @page { size: A4 portrait; margin: 18mm; }
  html, body { font-family: Arial, Helvetica, sans-serif; font-size: 12pt; color: #141414; }
  .a4-wrap{border:1px solid #e6e6e6;border-radius:10px;background:#fff;overflow:hidden}
  .header-img{margin:-6px -6px 6px -6px}
  .header-img img{width:100%;height:auto;object-fit:contain}
  .mast{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;background:linear-gradient(180deg,#eef3ff, #f7f9ff);padding:14px 16px;border-bottom:1px solid #dfe3f4}
  .mast .title{font-size:22pt;font-weight:800;margin:0;letter-spacing:0.3px}
  .mast .sub{font-size:10pt;color:#4d4f56;margin-top:4px}
  .meta{font-size:10pt;color:#333;margin-top:6px}
  .photo{display:flex;align-items:center;justify-content:center}
  .photo img{width:120px;height:145px;object-fit:cover;border-radius:8px;border:1px solid #8aa0d6;background:#fafbff}
  .no-photo{width:120px;height:145px;border:1px dashed #8aa0d6;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#6b7280;font-size:10pt}
  .section{margin:12px;border:1px solid #e9ebf5;border-radius:10px;overflow:hidden;box-shadow:0 0 0 1px rgba(17,24,39,0.02)}
  .section .hd{background:#f3f6ff;padding:8px 12px;font-weight:700;color:#1f2a55}
  .section .bd{padding:12px}
  .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .kv-row{display:grid;grid-template-columns:120px 14px 1fr;gap:8px;align-items:start; font-size:11px}
  .kv-row.alt{background:#f9fbff}
  .kv-label{font-weight:600}
  .kv-colon{text-align:center}
  .kv-value{font-weight:500}
  .tag{border:1px solid #0a84ff;color:#0a84ff;font-size:10pt;padding:2px 8px;border-radius:999px;margin-right:6px;display:inline-block;margin-bottom:4px;background:#f0f7ff}
  .muted{color:#777}
  .prose{font-size:11.5pt;line-height:1.5;color:#202124}
  .prose h4{margin:0 0 6px 0;font-size:13pt;color:#1f2a55}
  .prose p{margin:0 0 8px 0}
  .prose ul{margin:0 0 8px 18px}
  p, li {font-size: 11px}
  .fot {display:flex; justify-content: space-between;}
  .footer {padding:3px; background:#0a84ff; color:#fff; font-size:8px; text-align:center}
  .p-3 {padding:5px};
  .mb-0 {margin-bottom:0}
  @media print { .no-print { display:none !important; } }
  @media (max-width: 768px){
    .grid-2{display:block}
    .kv-row{grid-template-columns:140px 14px 1fr}
    .mast{display:block;text-align:center}
    .photo{margin-top:10px}
  }
`;

const buildTemplate = (heading, sub, data, trailingContentHTML) => {
  const metaDate = new Date().toLocaleDateString();
  const name = fullName(data);
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
        <div class="meta"><strong>ID:</strong> ${safe(data.idNo || data.employeeId)} &nbsp; | &nbsp; <strong>Date:</strong> ${metaDate}</div>
      </div>
      <div class="photo">${photoHtml}</div>
    </div>

    <div class="section">
      <div class="hd">Basic Information</div>
      <div class="bd">
        <div class="grid-2">
          <div>
            <div class="kv-row"><div class="kv-label">Full Name</div><div class="kv-colon">:</div><div class="kv-value">${name}</div></div>
            <div class="kv-row alt"><div class="kv-label">Gender</div><div class="kv-colon">:</div><div class="kv-value">${gender}</div></div>
            <div class="kv-row"><div class="kv-label">Date of Birth</div><div class="kv-colon">:</div><div class="kv-value">${dob}</div></div>
            <div class="kv-row"><div class="kv-label">Care of</div><div class="kv-colon">:</div><div class="kv-value">${co}</div></div>
          </div>
          <div>
            <div class="kv-row"><div class="kv-label">Aadhar No</div><div class="kv-colon">:</div><div class="kv-value">${safe(data.aadharNo)}</div></div>
            <div class="kv-row alt"><div class="kv-label">Local ID</div><div class="kv-colon">:</div><div class="kv-value">${safe(data.localId)}</div></div>
            <div class="kv-row"><div class="kv-label">Date of Joining</div><div class="kv-colon">:</div><div class="kv-value">${safe(data.date || data.dateOfJoining)}</div></div>
            <div class="kv-row"><div class="kv-label">Mobile-1</div><div class="kv-colon">:</div><div class="kv-value">${safe(data.mobileNo1)}</div></div>
          </div>
        </div>
      </div>
    </div>

 

    ${trailingContentHTML}
  </div>
  `;
};

/* === Variant content blocks (really different HTML per tab) === */
const htmlAggEng = (data) =>
  buildTemplate(
    "EMPLOYMENT AGREEMENT (English)",
    "H.R Department (Reg No: SEA/HYD/ALO/26/1040178/2025).",
    data,
    `
    <div class="section p-3">
   <p>This is an agreement entered into between Mr./Mrs./Ms  <strong>${fullName(data)}</strong> and <strong> JenCeo Homecare </strong>.</p>
   <p>I, Shri/Srimati/Kumar <strong>${fullName(data)}</strong> hereby declare that I have voluntarily joined JenCeo Homecare
as a <strong>${safe(data.primarySkill)}</strong> .. I assure that I will abide by the rules and regulations of JenCeo Homecare and will
perform my duties at the assigned location with utmost dedication, sincerity, and integrity. I pledge to work wholeheartedly,  with
complete commitment, a service-oriented mindset, and with purity in thought, word, and action. I promise to fulfill my responsibilities
with 100% fairness, guided by my conscience and with God as my witness.</p>
 
      <div class="hd">Terms and Conditions </div>
      <div class="bd prose">
               <ol class="mb-0">
             <li>The salary of each employee will be paid after the completion of 30 working days. No advance payment
                 will be provided
                 within this 30-day period. </li>
             <li>Employees must perform only the duties assigned by the organization. They are prohibited from engaging
                 in any private
                 arrangements with clients for personal gain.</li>
             <li>Employees must conduct themselves in a manner that does not interfere with the client's personal,
                 family, religious, or
                 cultural practices.</li>
             <li>Employees are strictly prohibited from touching or taking any valuables belonging to the client,
                 including money, gold, mobile
                 phones, laptops, or any other valuable items. </li>
             <li>Employees must perform their duties diligently and treat clients with respect and courtesy at all
                 times. </li>
             <li>If an employee behaves inappropriately towards a client or is involved in theft of any item, legal
                 action will be taken. The
                 company will not bear any responsibility in such cases.</li>
             <li>If an employee wishes to resign, they must inform the organization at least 5 days in advance</li>
             <li>In any situation, an employee must not leave their duties / patient without obtaining proper permission
             </li>
             <li>If a patient passes away, it should be reported to the office without delay.
             </li>
             <li>If complaints are received from clients, or if the employee fails to perform their duties properly or
                 behaves inappropriately,
                 they will be terminated immediately</li>
         </ol>
      </div>
      <div class="hd">Employee Acknowledgment Section </div>
      <p>I have read/heard and fully understood the terms and conditions mentioned above. I wholeheartedly agree to abide by them and
accept full responsibility for my actions. I acknowledge that if I violate any of the company's rules and regulations, I will comply with
any disciplinary or legal actions taken by the company.</p>
<p>By signing this agreement, I confirm that I grant JenCeo all rights and authorities necessary to enforce these terms.</p>

<div class="fot" >
<div>
<p><strong>Witness</strong></p>
<p>1)…………………………………………</p>
<p>2)…………………………………………</p>
</div>
<div>
<p>Employee Name: <strong>${fullName(data)} </p>
<p>Signature: ………………………………………………</p>
</div>

</div>

<p clalss="smalll">This document is a formal agreement between the employee and JenCeo Homecare, ensuring professionalism, accountability, and adherence to
organizational policies.</p>

<div class="footer">
Doc Ref: JC-HR-02     |     Revision: 1     |     Date: 1st May 2025     |     Page 1 of 1     </div>
</div>
    `
  );

const htmlAggTel = (data) =>
  buildTemplate(
     "ఉద్యోగి ఒప్పందం (Telugu)",
 "H. R Department (Reg No: SEA/HYD/ALO/26/1040178/2025)",
 data,
 `
 <div class="section">
     <p>ఇది శ్రీ / శ్రీమతి / కుమారి ${fullName(data)} మరియు JenCeo Homecare సంస్థ మద్య వ్రాసుకున్న అగ్రిమంట్.</p>
     <p>నేను, JenCeo Homecare నందు <strong>${safe(data.primarySkill)} గా ప్పనిచేయుటకు నా సొంత ఆసక్తి తో కుదిరినాను. నేను
             JenCeo Homecare నియమ నిబంధనలకు కట్టుబడి, కంపెనీ నియమంచిన చోట మనసా, వాచా, కర్మణా, త్రికర్ణ శుద్దితో, అంకిత భావముతో, సేవా భావముతో
             నియమించిన పని చేస్తానని, నూటికి నూరుపాళ్ళు న్యాయం చేస్తానాని, నా మన్సాాక్షిగా, దైవసాక్షిగా హామీ ఇస్తున్నన్ను. </p>
     <div class="hd">నియమ నిబంధనలు</div>
     <div class="bd prose">
         <ol class="mb-0">
             <li>ప్రతీ ఉద్యోగీ తన నెల జీతం 30 రోజులు పూర్తి అయిన తరువాత చెల్లించబడును, మరియు 30 రోజుల లోపు ఎటువంటి అడ్వాన్సు ఇవ్వబడదు</li>
             <li>సంసథ ద్వార్య నియమంచబడిన పని సంస్థకు మాత్రమే చేయాలి, ఉద్యోగి ఆ ఆ పనిని స్వలాభం కోసం క్లంట్ తో పని కుదుర్చుకోకూడదు</li>
             <li>క్లంట్ యొక్క వ్యక్తిగత / కుట్టంబ / మతపర / ఆచార వ్యహారాలకు ఎలాంటి బంగం కలగకుండా నడుచుకోవాలి</li>
             <li>క్లంట్ కి సంబందించిన డబ్బు / బంగారం / సెల్ ఫోనులు / లాప్టాప్ లు / మరియు ఏ ఇతర్ విలువైన్ వస్తువులు తాకరాదూ/ తీసుకోరాదు</li>
             <li>ఇచ్చిన పనిని సక్రమముగా చేస్తూ క్లంట్ పట్ల గౌరవ మర్యాదలతో వుండాలి</li>
             <li>క్లంట్ పట్ల చేదుగా ప్రవర్తించినా / ఏదైనా వసుివు దొంగలించినా చట్టబద్దమైన చర్యలు తీసుకొనబడును. కంపెనీ ఎటువంటి భాద్యతా వహించదు</li>
             <li>డ్యూటీ  దిగాలి అనుకున్న యెడల సంస్థకు 5 రోజుల ముందుగా తెలియబరచవలెను</li>
             <li>ఎటువంటి పరిస్థితిలోను సరైన అనుమతి లేకుండా ఉద్యోగి తన పనిని గాని / పేషంట్ని గాని విడిచి పెట్టి వెళ్ళకూడదు</li>
             <li>ఒకవేళ పేటెంట్ మరణించిన యెడల  వెంటనే ఆఫీసుకు తెలియజేయవలెను</li>
             <li>క్లంట్ నుండి పిరియాదులు వచ్చినా / పని సరిగా చేయకపోయినా/ ప్రవర్తన సరిగా లేకపోయినా ఉద్యోగం నుండి తక్షణమే
                 తొలగించడం జరుగును</li>
         </ol>
     </div>
     <div class="hd">ఉద్యోగి అంగీకార్ విభాగం</div>
     <p>పైన్ తెల్పిన నిబంధనలను  సూచనలను  చదివి / విని అందులోని చిక్కులను అర్ధం చేసుకుని మనస్పూర్తిగా అంగీకరిస్తూ పూర్తి బాధ్యతతో ఉంటానని, నేను
         కంపెనీ నియమ నిబంధనలు అతిక్రమంచిన యడల కంపెనీ తీసుకునే ఎటువంటి క్రమ శిక్షణ / చట్టపరమైన చర్యలకు  కట్టుబడి
         ఉంటానని. ఇందుకు గాను JenCeo వారికీ సర్వ హక్కులు, అధికారాలు కలవని అంగీకరిస్తూ ఇస్తున్న  వీలునామా పత్రం.</p>
     <div class="fot">
         <div>
             <p><strong>సాక్షులు</strong></p>
             <p>1)…………………………………………</p>
             <p>2)…………………………………………</p>
         </div>
         <div>
             <p>ఇట్లు తమ విదేయురాలు / వేదేయుడు : <strong>${fullName(data)} </p>
             <p>సంతకం: ………………………………………………</p>
         </div>

     </div>

     <br>

     <div class="footer">
         Doc Ref: JC-HR-02 | Revision: 1 | Date: 1st May 2025 | Page 1 of 1 </div>
 </div>
 `
  );

const htmlOffEng = (data) =>
  buildTemplate(
    "OFFER LETTER (English)",
    "Official offer letter preview with employee information.",
    data,
    `
    <div class="section">
      <div class="hd">Offer Details — English</div>
      <div class="bd prose">
        <p>We are pleased to offer you employment with our organization. Your joining date, role, and compensation are outlined below.</p>
        <ul>
          <li><strong>Role:</strong> As mutually agreed</li>
          <li><strong>Joining:</strong> Subject to HR confirmation</li>
          <li><strong>Compensation:</strong> As per policy</li>
        </ul>
        <p>Please sign and return a copy of this offer as acceptance.</p>
      </div>
    </div>
    `
  );

const htmlOffTel = (data) =>
  buildTemplate(
    "ఆఫర్ లెటర్ (Telugu)",
    "ఉద్యోగి వివరాలతో ఆఫర్ లెటర్ ప్రివ్యూ.",
    data,
    `
    <div class="section">
      <div class="hd">ఆఫర్ వివరాలు — తెలుగు</div>
      <div class="bd prose">
        <p>మా సంస్థలో ఉద్యోగం కోసం మిమ్మల్ని ఆహ్వానిస్తున్నాము. మీ జాయినింగ్ తేదీ, బాధ్యతలు మరియు పారితోషికం క్రింద ఇవ్వబడినవి.</p>
        <ul>
          <li><strong>పాత్ర:</strong> పరస్పరం అంగీకరించిన విధంగా</li>
          <li><strong>జాయినింగ్:</strong> హెచ్ ఆర్ నిర్ధారణకు లోబడి</li>
          <li><strong>పారితోషికం:</strong> పాలసీ ప్రకారం</li>
        </ul>
        <p>దయచేసి ఈ ఆఫర్‌ను అంగీకరించినట్లు సంతకం చేసి ఒక కాపీ తిరిగి పంపించండి.</p>
      </div>
    </div>
    `
  );

/* =============================
   Main Component (no Bootstrap cards)
   ============================= */
const WorkerAggrement = () => {
  const [active, setActive] = useState("Agg-Eng");
  const [employeeId, setEmployeeId] = useState("");
  const [employee, setEmployee] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const tabs = [
    { key: "Agg-Eng", label: "Agg-Eng" },
    { key: "Agg-Tel", label: "Agg-Tel" },
    { key: "Off-Eng", label: "Off-Eng" },
    { key: "Off-Tel", label: "Off-Tel" },
  ];

  const fetchById = async (id) => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const snap = await firebaseDB
        .child("EmployeeBioData")
        .orderByChild("idNo")
        .equalTo(id)
        .once("value");
      if (snap.exists()) {
        const val = snap.val();
        const key = Object.keys(val)[0];
        const data = val[key] || {};
        setEmployee({ ...data, idNo: data.idNo || id, _key: key });
      } else {
        setEmployee({});
        setError("No employee found for this ID.");
      }
    } catch (e) {
      console.error(e);
      setError("Error loading data. Check console.");
    } finally {
      setLoading(false);
    }
  };

  // Build variant HTML for preview (per tab)
  const variantHTML = useMemo(() => {
    const m = {
      "Agg-Eng": htmlAggEng,
      "Agg-Tel": htmlAggTel,
      "Off-Eng": htmlOffEng,
      "Off-Tel": htmlOffTel,
    };
    const fn = m[active] || htmlAggEng;
    return fn(employee);
  }, [active, employee]);

  // Robust print: open new window with full HTML & print
  const handlePrint = () => {
    const w = window.open("", "_blank", "width=1024,height=768");
    if (!w) return;
    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${active}</title>
</head>
<body>
${variantHTML}
<script>
  window.focus();
  setTimeout(function(){
    window.print();
    // Increased timeout to prevent immediate closing
    setTimeout(function(){ 
      // Only close if not in print dialog (some browsers block window.close during print)
      try { window.close(); } catch(e) { /* ignore */ }
    }, 1000); // Increased from 200ms to 1000ms
  }, 300);
</script>
</body>
</html>`;
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const handleDownloadPdf = async () => {
    if (!("jsPDF" in window)) {
      await new Promise((resolve) => {
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        s.onload = resolve;
        document.head.appendChild(s);
      });
    }
    const { jsPDF } = window.jspdf || window;
    if (!jsPDF) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    let y = 48;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`Worker Document — ${active}`, 40, y);
    y += 24;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const lines = [
      `Employee ID: ${safe(employee.idNo || employee.employeeId)}`,
      `Name: ${fullName(employee)} | Gender: ${safe(employee.gender)} | DOB: ${toDateText(employee.dateOfBirth)}`,
      `Mobile: ${safe(employee.mobileNo1)} | Primary Skill: ${safe(employee.primarySkill)}`,
      `Present: ${safe(employee.presentState)} / ${safe(employee.presentDistrict)}`,
      `Permanent: ${safe(employee.permanentState)} / ${safe(employee.permanentDistrict)}`,
      `Generated: ${new Date().toLocaleString()}`,
    ];
    lines.forEach((t) => { doc.text(t, 40, y); y += 16; });
    doc.save(`Worker_${safe(employee.idNo || employeeId)}_${active}.pdf`);
  };

  return (
    <div className="container-fluid py-3">
      {/* Inline minimal styles to avoid card; make it elegant */}
      <style>{`
        .toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;margin-bottom:12px}
        .soft{background:#ffffff;border:1px solid #eaecef;border-radius:12px;padding:12px 14px;box-shadow:0 3px 18px rgba(16,24,40,0.05)}
        .tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
        .tab-btn{border:1px solid #e1e6f9;background:#f7f9ff;color:#1f2a55;border-radius:999px;padding:6px 12px;font-weight:600}
        .tab-btn.active{background:#304ffe;color:#fff;border-color:#304ffe;box-shadow:0 4px 14px rgba(48,79,254,0.25)}
        .actions{display:flex;gap:8px;flex-wrap:wrap}
        .btn{border:1px solid #dfe3f4;background:#fff;border-radius:10px;padding:8px 14px;font-weight:600}
        .btn.primary{background:#304ffe;border-color:#304ffe;color:#fff}
        .panel-preview{border:1px dashed #ccd5ff;border-radius:14px;padding:10px;background:linear-gradient(180deg,#fbfdff,#ffffff)}
        .input{border:1px solid #d5d9e8;border-radius:10px;padding:8px 10px;min-width:260px}
        .help{font-size:12px;color:#6b7280;margin-top:4px}
      `}</style>

      <div className="toolbar soft">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",   }}>
          <div>
            <label className="form-label fw-semibold">Employee ID Number</label>
            <input
              type="text"
              className="input"
              placeholder="Enter ID (idNo)"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") fetchById(employeeId.trim()); }}
            />
            <div className="help">Looks in Firebase → EmployeeBioData / idNo</div>
          </div>
          <button className="btn primary mb-3" onClick={() => fetchById(employeeId.trim())}>
            Load Employee
          </button>
          {loading && <span className="help">Loading…</span>}
          {error && <span className="help" style={{ color: "#d11" }}>{error}</span>}
        </div>
      </div>

      <div className="tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`tab-btn ${active === t.key ? "active" : ""}`}
            onClick={() => setActive(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="soft actions mb-3" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="help">Preview below is A4-ready. Use the buttons to print or export PDF.</div>
        <div className="actions no-print">
          <button className="btn" onClick={handlePrint}><i className="bi bi-printer me-1"></i> Print</button>
          <button className="btn primary" onClick={handleDownloadPdf}><i className="bi bi-download me-1"></i> PDF</button>
        </div>
      </div>

      {/* Preview */}
      <div id="variant-preview" className="panel-preview" dangerouslySetInnerHTML={{ __html: variantHTML }} />

      {/* Icons (optional) */}
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" />
    </div>
  );
};

export default WorkerAggrement;
