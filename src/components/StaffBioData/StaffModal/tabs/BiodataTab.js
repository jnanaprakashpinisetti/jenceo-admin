import React, { useEffect } from "react";
import { headerImage, safe, formatLine } from "../utils";

const BiodataTab = ({ formData, iframeRef }) => {
    const buildBiodataHTML = (opts = { hideSensitive: false }) => {
        const fullName = formatLine(safe(formData.firstName, ""), safe(formData.lastName, "")).trim() || "—";
        const ageText = formData.years ? `${formData.years} Years` : "—";
        const dobText = formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString() : "—";
        const gender = safe(formData.gender);
        const marital = safe(formData.maritalStatus);
        const co = safe(formData.co || formData.careOfPersonal);

        const permAddr = `
  <div class="row">
    <div class="col-md-4"><strong>Door No</strong></div>
    <div class="col-md-1">:</div>
    <div class="col-md-7">${safe(formData.permanentAddress)}</div>
</div>
<div class="row">
    <div class="col-md-4"><strong>Street</strong></div>
    <div class="col-md-1">:</div>
    <div class="col-md-7">${safe(formData.permanentStreet)}</div>
</div>
<div class="row">
    <div class="col-md-4"><strong>Landmark</strong></div>
    <div class="col-md-1">:</div>
    <div class="col-md-7">${safe(formData.permanentLandmark)}</div>
</div>
<div class="row">
    <div class="col-md-4"><strong>Village / Town</strong></div>
    <div class="col-md-1">:</div>
    <div class="col-md-7">${safe(formData.permanentVillage)}</div>
</div>
<div class="row">
    <div class="col-md-4"><strong>Mandal</strong></div>
    <div class="col-md-1">:</div>
    <div class="col-md-7">${safe(formData.permanentMandal)}</div>
</div>
<div class="row">
    <div class="col-md-4"><strong>District</strong></div>
    <div class="col-md-1">:</div>
    <div class="col-md-7">${safe(formData.permanentDistrict)}</div>
</div>
<div class="row">
    <div class="col-md-4"><strong>State</strong></div>
    <div class="col-md-1">:</div>
    <div class="col-md-7">${safe(formData.permanentState)}${formData.permanentPincode ? " - " + formData.permanentPincode : ""}</div>
  </div>
`;

        const presentAddr = `
<div class="row">
    <div class="col-md-4"><strong>Door No</strong></div>
    <div class="col-md-1">:</div>
    <div class="col-md-7">${safe(formData.presentAddress)}</div>
</div>
<div class="row">
    <div class="col-md-4"><strong>Street</strong></div>
    <div class="col-md-1">:</div>
    <div class="col-md-7">${safe(formData.presentStreet)}</div>
</div>
<div class="row">
    <div class="col-md-4"><strong>Landmark</strong></div>
    <div class="col-md-1">:</div>
    <div class="col-md-7">${safe(formData.presentLandmark)}</div>
</div>
<div class="row">
    <div class="col-md-4"><strong>Village / Town</strong></div>
    <div class="col-md-1">:</div>
    <div class="col-md-7">${safe(formData.presentVillage)}</div>
</div>
<div class="row">
    <div class="col-md-4"><strong>Mandal</strong></div>
    <div class="col-md-1">:</div>
    <div class="col-md-7">${safe(formData.presentMandal)}</div>
</div>
<div class="row">
    <div class="col-md-4"><strong>District</strong></div>
    <div class="col-md-1">:</div>
    <div class="col-md-7">${safe(formData.presentDistrict)}</div>
</div>
<div class="row">
    <div class="col-md-4"><strong>State</strong></div>
    <div class="col-md-1">:</div>
    <div class="col-md-7">${safe(formData.presentState)}${formData.presentPincode ? " - " + formData.presentPincode : ""}</div>
  </div>
`;

        const qual = safe(formData.qualification);
        const college = safe(formData.schoolCollege);
        const pskill = safe(formData.primarySkill);
        const mtongue = safe(formData.motherTongue || formData.motherTung);
        const langs = safe(formData.languages);
        const otherSkills = Array.isArray(formData.workingSkills) ? formData.workingSkills.filter(Boolean) : [];
        const health = Array.isArray(formData.healthIssues) ? formData.healthIssues.filter(Boolean) : [];
        const rightNow = new Date();
        const metaDate = rightNow.toLocaleDateString();

        const photoHtml = formData.employeePhotoUrl
            ? `<img src="${formData.employeePhotoUrl}" style="width:120px;height:120px;object-fit:cover;border-radius:6px;border:1px solid #ccc" />`
            : `<div style="width:120px;height:120px;border:1px solid #ccc;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#888;font-size:12px">No Photo</div>`;

        const section = (title, body) => `
      <div class="sec">
        <div class="sec-title">${title}</div>
        <div class="sec-body">
          ${body}
        </div>
      </div>
    `;

        const addressBlock = (heading, lines) => `
      <div class="addr">
        <div class="addr-title">${heading}</div>
        ${lines}
      </div>
    `;

        const chips = (items) =>
            items.length
                ? `<div class="tags">${items.map((s) => `<span class="tag">${String(s).trim()}</span>`).join("")}</div>`
                : `<div class="muted">—</div>`;

        const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Staff Biodata - ${fullName}</title>
<style>
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#111}
  .page{ max-width:900px; margin:auto;background:#fff;border:1px solid #e5e5e5;padding:20px}
  .header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-bottom:2px solid #b7b4b4; padding:20px; margin:0 -20px; background: #c7d1f5; border-radius: 5px;}
  .row { display: flex; flex-wrap: wrap; margin-left: -6px; margin-right: -6px; border-bottom:1px solid #f1f1f1; margin-bottom:6px }
  .row > div { padding-left: 6px; padding-right: 6px; }
  .col-md-1 { flex: 0 0 8.3333%;  max-width: 8.3333%; }
  .col-md-4 { flex: 0 0 33.3333%; max-width: 33.3333%; }
  .col-md-7 { flex: 0 0 58.3333%; max-width: 58.3333%; }

  .biodataHeader {display:flex; justify-content:space-between; align-items: stretch; color:#fff; margin: -20px -20px 20px -20px}
  .logoSection {flex: 0 0 40%; align-content: center; border-bottom:10px solid #02acf2 }
  .logoSection h1 {color:#FCC603; margin:0; font-size:40px; margin-left:50px; font-weight:900; line-height:1}
  .logoSection h1 spane {color:#02acf2; margin:0; font-size:100px; }
  .logoSection .subText {color:#817f7f; margin-left:65px; font-size:12px; font-weight:bold; letter-spacing:3px  }
  .dataSection {background:#02acf2; flex: 1;  padding:10px 20px; border-top-left-radius: 125px; padding-left: 70px; }
  .dataSection * {margin:0; }
  .dataSection span {font-size:10px; }

  .h-left{flex:1; margin-top:25px}
  .title{font-size:40px;font-weight:700;letter-spacing:.4px;margin:0}
  .subtitle{font-size:12px;color:#444;margin-top:2px}
  .meta{font-size:11px;color:#555;margin-top:4px;display:flex;gap:14px;flex-wrap:wrap}
  .sec{margin-top:14px;border:1px solid #ddd;border-radius:6px;overflow:hidden}
  .sec-title{background:#dfe2f5; padding:8px 10px;font-weight:700}
  .sec-title h3{margin:0;font-size:14px}
  .sec-body{padding:10px}
  .kv-row{display:grid;grid-template-columns: 240px 12px 1fr;gap:10px;align-items:start; margin-bottom:0; padding: 8px 0 2px 5px;}
  .kv-row:nth-child(even) {background-color: #f2f3fd;}
  .kv-label{font-weight:600; font-size:12px}
  .kv-colon{text-align:center}
  .kv-value{font-weight:500;word-break:break-word; font-size:12px}
  .addr{border:1px dashed #c9c9c9;border-radius:6px; padding:10px;margin-top:10px; margin-bottom:5px}
  .addr-title{font-weight:700;margin-bottom:4px; font-size:14px}
  .addr-line{font-size:10px;line-height:1; margin-bottom:5px}
  .addr-line .row {padding-top:10px; padding-bottom:10px; border-bottom:0; margin-bottom:0}
  .addr-line .row:nth-child(odd) {background-color:#f2f3fd;}
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .tags{display:flex;flex-wrap:wrap;gap:6px}
  .tag{border:1px solid #02acf2;color:#02acf2;font-size:12px;padding:3px 8px;border-radius:999px}
  .muted{color:#777}
  .footer{margin :20px -20px -20px -20px;font-size:10px; color:#fff;display:flex;justify-content:space-between; background-color:#02acf2; padding:10px 20px}
  .blue {color:#02acf2}
  @media print{.page{border:none;margin:0;width:100%}}
  .header-img{width:100%;max-height:120px;object-fit:contain;margin-bottom:6px}
  .photo-box{display:flex;align-items:center;justify-content:center}
  .photo-box img{width:120px;height:120px;object-fit:cover;border-radius:6px;border:1px solid #ccc}
  .photo-box .no-photo{width:120px;height:120px;border:1px solid #ccc;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#888;font-size:12px}
  .heaerImg {margin: -21px -20px 10px -20px}
  .heaerImg img {width:100%}
  
  @media only screen and (max-width: 992px) {
        .biodataHeader {display:none}
        .header {display:block}
        .header .h-left {text-align:center; margin-top:10px}
        .header .meta {justify-content:center; margin-bottom:15px}
        .title {font-size: 20px}
        .kv-row {display:block}
        .kv-colon {display:none}
        .kv-label {margin-bottom:5px}
        .two-col {display:block}
        .col-md-1 { display:none}
        .col-md-4 { flex: 0 0 100%; max-width: 100%; }
        .col-md-7 { flex: 0 0 100%; max-width: 100%; }
        .addr-title {font-size:12px}
        .addr-line .col-md-4 {padding-bottom:5px}
  }
</style>
</head>
<body>
<div class="page">
<div class="heaerImg"><img src="${headerImage}" alt="Header" />
  <div class="header">
    <div class="h-left">
      <h1 class="title">EMPLOYEE BIO-DATA</h1>
      <div class="subtitle">H.R Department (Reg No: SEA/HYD/ALO/26/1040178/2025)</div>
      <div class="meta">
        <div><strong>ID:</strong> ${safe(formData.idNo || formData.employeeId)}</div>
        <div><strong>Date:</strong> ${metaDate}</div>
      </div>
    </div>
    <div class="photo-box">
      ${photoHtml}
    </div>
  </div>

  ${section(
            "<h3>Basic Information</h3>",
            `
      <div class="kv-row">
        <div class="kv-label ">Full Name</div><div class="kv-colon">:</div>
        <div class="kv-value blue"><strong>${fullName}</strong></div>
      </div>
      <div class="kv-row">
        <div class="kv-label">Gender</div><div class="kv-colon">:</div>
        <div class="kv-value blue">${gender}</div>
      </div>
      <div class="kv-row">
        <div class="kv-label">Date of Birth</div><div class="kv-colon">:</div>
        <div class="kv-value">${dobText}</div>
      </div>
      <div class="kv-row">
        <div class="kv-label">Age</div><div class="kv-colon">:</div>
        <div class="kv-value blue">${ageText}</div>
      </div>
      <div class="kv-row">
        <div class="kv-label">Care of</div><div class="kv-colon">:</div>
        <div class="kv-value">${co}</div>
      </div>
      <div class="kv-row">
        <div class="kv-label">Marital Status</div><div class="kv-colon">:</div>
        <div class="kv-value blue">${marital}</div>
      </div>
    `
        )}

  ${section(
            "<h3>Addresses</h3>",
            `
      <div class="two-col">
        <div>${addressBlock("Permanent Address", permAddr)}</div>
        <div>${addressBlock("Present Address", presentAddr)}</div>
      </div>
    `
        )}

  ${section(
            "<h3>Qualification & Skills</h3>",
            `
      <div class="kv-row">
        <div class="kv-label">Qualification</div><div class="kv-colon">:</div>
        <div class="kv-value blue">${qual}</div>
      </div>
      <div class="kv-row">
        <div class="kv-label">College / School</div><div class="kv-colon">:</div>
        <div class="kv-value">${college}</div>
      </div>
      <div class="kv-row">
        <div class="kv-label">Primary Skill</div><div class="kv-colon">:</div>
        <div class="kv-value blue"><strong>${pskill}</strong></div>
      </div>

      <div class="kv-row">
        <div class="kv-label">Other Skills</div><div class="kv-colon">:</div>
        <div class="kv-value">${chips(otherSkills)}</div>
      </div>
      <div class="kv-row">
        <div class="kv-label">Experience</div><div class="kv-colon">:</div>
        <div class="kv-value blue"><strong>${safe(formData.workExperince)}</strong></div>
      </div>

      <div class="kv-row">
        <div class="kv-label">Mother Tongue</div><div class="kv-colon">:</div>
        <div class="kv-value">${mtongue}</div>
      </div>
      <div class="kv-row">
        <div class="kv-label">Languages</div><div class="kv-colon">:</div>
        <div class="kv-value">${langs}</div>
      </div>
    `
        )}

  <div class="footer">
    <div>Doc Ref: JC-HR-07</div>
    <div>Revision: 1</div>
    <div>Date: 1st May 2025</div>
    <div>Page 1 of 1</div>
  </div>
</div>
<script>window.focus && window.focus();</script>
</body>
</html>
`;
        return html;
    };

    const handleDownloadBiodata = () => {
        const html = buildBiodataHTML({ hideSensitive: true });
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Employee_Biodata_${formData.idNo || formData.employeeId || 'unknown'}.html`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    };

    const handleShareBiodata = async () => {
        try {
            const html = buildBiodataHTML({ hideSensitive: true });
            const blob = new Blob([html], { type: 'text/html' });

            if (navigator.share) {
                const file = new File([blob], `Employee_Biodata_${formData.idNo || formData.employeeId || 'unknown'}.html`,
                    { type: 'text/html' });

                await navigator.share({
                    title: 'Staff Biodata',
                    files: [file]
                });
            } else {
                handleDownloadBiodata();
            }
        } catch (error) {
            console.error('Error sharing:', error);
            handleDownloadBiodata();
        }
    };

    useEffect(() => {
        if (iframeRef.current) {
            const doc = iframeRef.current;
            doc.srcdoc = buildBiodataHTML({ hideSensitive: false });
        }
    }, [formData]);

    return (
        <div className="modal-card ">
            <div className="modal-card-header d-flex align-items-center justify-content-between">
                <h4 className="mb-0">Biodata (Preview)</h4>
                <div className="d-flex gap-2">
                    <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={handleDownloadBiodata}
                    >
                        Download
                    </button>
                    <button
                        type="button"
                        className="btn btn-outline-info btn-sm"
                        onClick={handleShareBiodata}
                    >
                        Share
                    </button>
                </div>
            </div>

            <div className="modal-card-body biodata-wrapper">
                <iframe
                    ref={iframeRef}
                    title="Biodata Preview"
                    style={{ width: "100%", height: "900px", border: "1px solid #e5e5e5", borderRadius: 8 }}
                />
            </div>
        </div>
    );
};

export default BiodataTab;