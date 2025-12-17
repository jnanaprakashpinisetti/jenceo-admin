import React, { useEffect, useState, useRef } from "react";

const headerImage = "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FHeadder.svg?alt=media&token=fa65a3ab-ba03-4959-bc36-e293c6db48ae";

const Biodata = ({ formData, iframeRef, canEdit }) => {
    const safe = (v, fallback = "—") => (v !== undefined && v !== null && String(v).trim() !== "" ? v : fallback);
    const formatLine = (...parts) => parts.filter(Boolean).join(" ");
    
    // State to track which skills user has removed in preview
    const [removedSkills, setRemovedSkills] = useState({
        otherSkills: new Set(),
        nursingSkills: new Set(),
        workingSkills: new Set()
    });
    
    // Ref to track if we should refresh the iframe
    const shouldRefreshIframe = useRef(false);
    
    // Function to save removed skills to localStorage (temporary)
    const saveRemovedSkills = () => {
        localStorage.setItem('biodata_removed_skills', JSON.stringify({
            otherSkills: Array.from(removedSkills.otherSkills),
            nursingSkills: Array.from(removedSkills.nursingSkills),
            workingSkills: Array.from(removedSkills.workingSkills)
        }));
        alert("Changes saved! Removed skills will not appear in downloaded/shared biodata.");
    };
    
    // Function to load removed skills from localStorage
    const loadRemovedSkills = () => {
        const saved = localStorage.getItem('biodata_removed_skills');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setRemovedSkills({
                    otherSkills: new Set(parsed.otherSkills || []),
                    nursingSkills: new Set(parsed.nursingSkills || []),
                    workingSkills: new Set(parsed.workingSkills || [])
                });
            } catch (e) {
                console.error('Failed to load removed skills:', e);
            }
        }
    };
    
    // Function to reset removed skills
    const resetRemovedSkills = () => {
        setRemovedSkills({
            otherSkills: new Set(),
            nursingSkills: new Set(),
            workingSkills: new Set()
        });
        localStorage.removeItem('biodata_removed_skills');
        shouldRefreshIframe.current = true;
        alert("All skill removals have been reset.");
    };
    
    const buildBiodataHTML = (opts = { hideSensitive: false, isPreview: false }) => {
        const fullName = formatLine(safe(formData.firstName, ""), safe(formData.lastName, "")).trim() || "—";
        const ageText = formData.years ? `${formData.years} Years` : "—";
        const dobText = formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString() : "—";
        const gender = safe(formData.gender);
        const marital = safe(formData.maritalStatus);
        const co = safe(formData.co || formData.careOfPersonal);
        
        const ratingStarsHTML = (r) => {
            const val = Number(r || 0);
            const color = val >= 4 ? "#198754" : val === 3 ? "#ffc107" : val > 0 ? "#dc3545" : "#6c757d";
            const stars = Array.from({ length: 5 }, (_, i) => (i < val ? "★" : "☆")).join("");
            return `<span style="color:${color}; font-size:18px; letter-spacing:1px">${stars}</span>
                    <span style="color:#666; font-size:12px; margin-left:6px">(${val}/5)</span>`;
        };

        // Get skills from formData (these come from WorkerBioDataForm.js)
        const otherSkillsFromForm = Array.isArray(formData.otherSkills) ? formData.otherSkills.filter(Boolean) : [];
        const nursingSkillsFromForm = Array.isArray(formData.nursingSkills) ? formData.nursingSkills.filter(Boolean) : [];
        const workingSkillsFromForm = Array.isArray(formData.workingSkills) ? formData.workingSkills.filter(Boolean) : [];
        
        // Filter out removed skills if not in preview mode
        let otherSkillsToShow = [...otherSkillsFromForm];
        let nursingSkillsToShow = [...nursingSkillsFromForm];
        let workingSkillsToShow = [...workingSkillsFromForm];
        
        if (!opts.isPreview) {
            // For download/share, remove the skills user has marked for removal
            otherSkillsToShow = otherSkillsToShow.filter(skill => !removedSkills.otherSkills.has(skill));
            nursingSkillsToShow = nursingSkillsToShow.filter(skill => !removedSkills.nursingSkills.has(skill));
            workingSkillsToShow = workingSkillsToShow.filter(skill => !removedSkills.workingSkills.has(skill));
        }
        
        // Combine nursing and other skills for Technical Skills section
        const technicalSkills = [...nursingSkillsToShow, ...otherSkillsToShow];
        
        const permAddr = `
            <div class="addr-line">
                <div class="row">
                    <div class="col-md-4"><strong>Door No</strong></div>
                    <div class="col-md-1">:</div>
                    <div class="col-md-7">${safe(formData.permanentAddress)}</div>
                </div>
            </div>
            <div class="addr-line">
                <div class="row">
                    <div class="col-md-4"><strong>Street</strong></div>
                    <div class="col-md-1">:</div>
                    <div class="col-md-7">${safe(formData.permanentStreet)}</div>
                </div>
            </div>
            <div class="addr-line">
                <div class="row">
                    <div class="col-md-4"><strong>Landmark</strong></div>
                    <div class="col-md-1">:</div>
                    <div class="col-md-7">${safe(formData.permanentLandmark)}</div>
                </div>
            </div>
            <div class="addr-line">
                <div class="row">
                    <div class="col-md-4"><strong>Village / Town</strong></div>
                    <div class="col-md-1">:</div>
                    <div class="col-md-7">${safe(formData.permanentVillage)}</div>
                </div>
            </div>
            <div class="addr-line">
                <div class="row">
                    <div class="col-md-4"><strong>Mandal</strong></div>
                    <div class="col-md-1">:</div>
                    <div class="col-md-7">${safe(formData.permanentMandal)}</div>
                </div>
            </div>
            <div class="addr-line">
                <div class="row">
                    <div class="col-md-4"><strong>District</strong></div>
                    <div class="col-md-1">:</div>
                    <div class="col-md-7">${safe(formData.permanentDistrict)}</div>
                </div>
            </div>
            <div class="addr-line">
                <div class="row">
                    <div class="col-md-4"><strong>State</strong></div>
                    <div class="col-md-1">:</div>
                    <div class="col-md-7">${safe(formData.permanentState)}${formData.permanentPincode ? " - " + formData.permanentPincode : ""}</div>
                </div>
            </div>
        `;

        const presentAddr = `
            <div class="addr-line">
                <div class="row">
                    <div class="col-md-4"><strong>Door No</strong></div>
                    <div class="col-md-1">:</div>
                    <div class="col-md-7">${safe(formData.presentAddress)}</div>
                </div>
            </div>
            <div class="addr-line">
                <div class="row">
                    <div class="col-md-4"><strong>Street</strong></div>
                    <div class="col-md-1">:</div>
                    <div class="col-md-7">${safe(formData.presentStreet)}</div>
                </div>
            </div>
            <div class="addr-line">
                <div class="row">
                    <div class="col-md-4"><strong>Landmark</strong></div>
                    <div class="col-md-1">:</div>
                    <div class="col-md-7">${safe(formData.presentLandmark)}</div>
                </div>
            </div>
            <div class="addr-line">
                <div class="row">
                    <div class="col-md-4"><strong>Village / Town</strong></div>
                    <div class="col-md-1">:</div>
                    <div class="col-md-7">${safe(formData.presentVillage)}</div>
                </div>
            </div>
            <div class="addr-line">
                <div class="row">
                    <div class="col-md-4"><strong>Mandal</strong></div>
                    <div class="col-md-1">:</div>
                    <div class="col-md-7">${safe(formData.presentMandal)}</div>
                </div>
            </div>
            <div class="addr-line">
                <div class="row">
                    <div class="col-md-4"><strong>District</strong></div>
                    <div class="col-md-1">:</div>
                    <div class="col-md-7">${safe(formData.presentDistrict)}</div>
                </div>
            </div>
            <div class="addr-line">
                <div class="row">
                    <div class="col-md-4"><strong>State</strong></div>
                    <div class="col-md-1">:</div>
                    <div class="col-md-7">${safe(formData.presentState)}${formData.presentPincode ? " - " + formData.presentPincode : ""}</div>
                </div>
            </div>
        `;

        const qual = safe(formData.qualification);
        const college = safe(formData.schoolCollege);
        const pskill = safe(formData.primarySkill);
        const mtongue = safe(formData.motherTongue || formData.motherTung);
        const langs = safe(formData.languages);
        const workExperience = safe(formData.workExperince);
        const rightNow = new Date();
        const metaDate = rightNow.toLocaleDateString();

        const photoHtml = formData.employeePhotoUrl
            ? `<img src="${formData.employeePhotoUrl}" style="width:120px;height:120px;object-fit:cover;border-radius:6px;border:1px solid #ccc" />`
            : `<div style="width:120px;height:120px;border:1px solid #ccc;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#888;font-size:12px">No Photo</div>`;

        const section = (title, body) => `
            <div class="sec">
                <div class="sec-title">${title}</div>
                <div class="sec-body">${body}</div>
            </div>
        `;

        const addressBlock = (heading, lines) => `
            <div class="addr">
                <div class="addr-title">${heading}</div>
                ${lines}
            </div>
        `;

        const chips = (items, skillType = 'other') => {
            if (!items.length) return `<div class="muted">—</div>`;
            
            const itemsHtml = items.map((s) => {
                const itemText = String(s).trim();
                if (!opts.isPreview) {
                    return `<span class="tag">${itemText}</span>`;
                }
                // Check if this skill should be shown (not removed)
                const shouldShow = !removedSkills[skillType === 'nursing' ? 'nursingSkills' : 
                                                skillType === 'working' ? 'workingSkills' : 'otherSkills'].has(itemText);
                
                if (!shouldShow) return '';
                
                return `<span class="tag removable-tag" data-skill="${itemText.replace(/"/g, '&quot;')}" data-type="${skillType}">
                    ${itemText}
                    <button type="button" class="tag-remove-btn" onclick="removeSkill(this)">×</button>
                </span>`;
            }).join("");
            
            return itemsHtml ? `<div class="tags">${itemsHtml}</div>` : `<div class="muted">—</div>`;
        };

        // Add script for handling skill removal - SIMPLIFIED approach
        const removalScript = opts.isPreview ? `
            <script>
                function removeSkill(btn) {
                    // Prevent any default behavior
                    if (btn) {
                        if (btn.preventDefault) btn.preventDefault();
                        if (btn.stopPropagation) btn.stopPropagation();
                        btn.blur(); // Remove focus to prevent any form submission
                    }
                    
                    // Get the skill data from the parent tag
                    const tag = btn.closest('.removable-tag');
                    if (!tag) return false;
                    
                    const skill = tag.getAttribute('data-skill');
                    const skillType = tag.getAttribute('data-type');
                    
                    // Remove the tag from UI immediately
                    tag.remove();
                    
                    // Send message to parent React component
                    try {
                        window.parent.postMessage({
                            type: 'REMOVE_SKILL',
                            skill: skill,
                            skillType: skillType
                        }, '*');
                    } catch (e) {
                        console.error('Failed to send message:', e);
                    }
                    
                    // Prevent any further event propagation
                    return false;
                }
                
                // Add global click handler to catch any missed clicks
                document.addEventListener('click', function(e) {
                    if (e.target.classList.contains('tag-remove-btn')) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        removeSkill(e.target);
                        return false;
                    }
                }, true);
                
                // Also handle mousedown to catch events earlier
                document.addEventListener('mousedown', function(e) {
                    if (e.target.classList.contains('tag-remove-btn')) {
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    }
                }, true);
            </script>
        ` : '';

        const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Employee Biodata - ${fullName}</title>
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

  .h-left{flex:1; margin-top:25px}
  .title{font-size:40px;font-weight:700;letter-spacing:.4px;margin:0}
  .subtitle{font-size:12px;color:#444;margin-top:2px}
  .meta{font-size:11px;color:#555;margin-top:4px;display:flex;gap:14px;flex-wrap:wrap}
  .sec{margin-top:14px;border:1px solid #ddd;border-radius:6px;overflow:hidden}
  .sec-title{background:#a1a9e9; padding:8px 10px;font-weight:700}
  .sec-title h3{margin:0;font-size:14px}
  .sec-body{padding:10px}
  /* UNIFIED rows: label | : | value have the same width everywhere */
  .kv-row{display:grid;grid-template-columns: 240px 12px 1fr;gap:10px;align-items:start; margin-bottom:0; padding: 8px 0 2px 5px;}
  .kv-row:nth-child(even) {background-color: #f2f3fd;}
  .kv-label{font-weight:600; font-size:12px}
  .kv-colon{text-align:center}
  .kv-value{font-weight:500;word-break:break-word; font-size:12px}
  .addr{border:1px dashed #e3e3e3;border-radius:6px; padding:10px;margin-top:10px; margin-bottom:5px}
  .addr-title{font-weight:700;margin-bottom:4px; font-size:14px;color:#9b5f9a;}
  .addr-line{font-size:12px;line-height:1.4; margin-bottom:4px}
  .addr-line .row {padding-top:6px; padding-bottom:6px; border-bottom:0; margin-bottom:0}
  .addr-line:nth-child(even) {background-color:#f2f3fd;}
  /* Two even columns area */
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .tags{display:flex;flex-wrap:wrap;gap:6px}
  .tag{border:1px solid #02acf2;color:#02acf2;font-size:12px;padding:3px 8px;border-radius:999px;display:inline-flex;align-items:center;gap:4px}
  .removable-tag{position:relative;padding-right:24px}
  .tag-remove-btn{background:none;border:none;color:inherit;font-size:16px;cursor:pointer;padding:0;margin-left:4px;line-height:1;position:absolute;right:4px;top:50%;transform:translateY(-50%);}
  .tag-remove-btn:hover{color:#dc3545}
  .muted{color:#777}
  .footer{margin :20px -20px -20px -20px;font-size:10px; color:#fff;display:flex;justify-content:space-between; background-color:#02acf2; padding:10px 20px}
  .blue {color:#02acf2}
  @media print{
    .page{border:none;margin:0;width:100%}
    .tag-remove-btn{display:none !important}
  }
  .header-img{width:100%;max-height:120px;object-fit:contain;margin-bottom:6px}
  /* photo box on the right */
  .photo-box{display:block;align-items:center;text-align:center}
  .photo-box img{width:130px;height:130px;object-fit:cover;border-radius:6px;border:1px solid #ccc}
  .photo-box .no-photo{width:120px;height:120px;border:1px solid #ccc;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#888;font-size:12px}
  .heaerImg {margin: -21px -20px 10px -20px}
  .heaerImg img {width:100%}
  
  /* Mobile Responsive Styles */
  @media only screen and (max-width: 767px) {
    .page {padding: 10px; border: none; margin: 0;}
    .header {display: block; margin: 0; padding: 15px; flex-direction: column;}
    .row > div {align-content: center;}
    .h-left {margin-top: 0; text-align: center;}
    .title {font-size: 24px; text-align: center;}
    .subtitle {font-size: 10px; text-align: center;}
    .meta {justify-content: center; margin-top: 10px; margin-bottom: 15px;}
    .photo-box {margin-top: 15px;}
    .photo-box img {width: 150px !important; height: 150px !important;}
    .kv-row {display: flex; padding: 8px;}
    .kv-label {min-width:35%; font-weight: 600; margin-bottom: 5px; display: block; font-size: 12px;}
    .kv-value {font-size: 13px;}
    .two-col {display: block; grid-template-columns: 1fr;}
    .addr {padding: 8px; margin-top: 8px;}
    .addr-line {padding:0 8px; border-radius:4px}
    .addr-line .row {display: flex; padding: 6px 0;}
    .addr-line:nth-child(even) {background-color:f2f3fd; margin-bottom:6px; border-radius:5px}
    .addr-line:nth-child(odd) {background-color:transparent; margin-bottom:6px; border-radius:5px}
    .addr-line .col-md-4 {font-weight: 600; font-size: 11px;}
    .addr-line .col-md-7 {font-size: 12px;}
    .sec {margin-top: 10px;}
    .sec-title {padding: 6px 8px;}
    .sec-title h3 {font-size: 13px;}
    .sec-body {padding: 8px;}
    .footer {flex-direction: column; text-align: center; gap: 5px; padding: 10px;}
    .footer div {font-size: 9px;}
    .tag {font-size: 10px; padding: 2px 6px;}
    .heaerImg {margin: -11px -10px 5px -10px;}
    .heaerImg img {max-height: 60px;}
  }
  
 
</style>
</head>
<body>
<div class="page">
    <div class="heaerImg"><img src="${headerImage}" alt="Header" /></div>
    
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
            <div class="kv-value rating">${ratingStarsHTML(formData.rating)}</div>
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

        ${workingSkillsToShow.length > 0 ? `
        <div class="kv-row">
            <div class="kv-label">Secondary Skills</div><div class="kv-colon">:</div>
            <div class="kv-value">${chips(workingSkillsToShow, 'working')}</div>
        </div>
        ` : ''}
        
        ${technicalSkills.length > 0 ? `
        <div class="kv-row">
            <div class="kv-label">Technical Skills</div><div class="kv-colon">:</div>
            <div class="kv-value">${chips(technicalSkills, 'other')}</div>
        </div>
        ` : ''}
        
        <div class="kv-row">
            <div class="kv-label">Experience</div><div class="kv-colon">:</div>
            <div class="kv-value blue"><strong>${workExperience}</strong></div>
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
${removalScript}
</body>
</html>
`;
        return html;
    };

    const handleDownloadBiodata = () => {
        const html = buildBiodataHTML({ hideSensitive: true, isPreview: false });
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
            const html = buildBiodataHTML({ hideSensitive: true, isPreview: false });
            const blob = new Blob([html], { type: 'text/html' });

            if (navigator.share) {
                const file = new File([blob], `Employee_Biodata_${formData.idNo || formData.employeeId || 'unknown'}.html`,
                    { type: 'text/html' });
                await navigator.share({
                    title: 'Employee Biodata',
                    files: [file]
                });
            } else {
                handleDownloadBiodata();
            }
        } catch (error) {
            handleDownloadBiodata();
        }
    };
    
    // Handle skill removal from iframe - DEBOUNCED to prevent rapid re-renders
    useEffect(() => {
        const handleMessage = (event) => {
            if (event.data && event.data.type === 'REMOVE_SKILL') {
                const { skill, skillType } = event.data;
                setRemovedSkills(prev => {
                    const newSet = new Set(prev[skillType === 'nursing' ? 'nursingSkills' : 
                                           skillType === 'working' ? 'workingSkills' : 'otherSkills']);
                    newSet.add(skill);
                    return {
                        ...prev,
                        [skillType === 'nursing' ? 'nursingSkills' : 
                         skillType === 'working' ? 'workingSkills' : 'otherSkills']: newSet
                    };
                });
                
                // Instead of immediately refreshing iframe, just update the state
                // The iframe will be updated on next render cycle
            }
        };
        
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);
    
    // Load removed skills on component mount
    useEffect(() => {
        loadRemovedSkills();
    }, []);

    // Update iframe only when formData changes OR when we explicitly want to refresh
    useEffect(() => {
        if (iframeRef.current) {
            const doc = iframeRef.current;
            // Only update iframe if formData changed or we need to refresh
            if (shouldRefreshIframe.current) {
                doc.srcdoc = buildBiodataHTML({ hideSensitive: false, isPreview: true });
                shouldRefreshIframe.current = false;
            } else {
                // For skill removals, we don't refresh the iframe immediately
                // because the skill is already removed from the DOM by JavaScript
                // Only refresh if formData actually changed
                const currentSrc = doc.srcdoc;
                const newSrc = buildBiodataHTML({ hideSensitive: false, isPreview: true });
                
                // Only update iframe if content actually changed (formData changed)
                // This prevents the iframe reload when just removing skills
                if (currentSrc !== newSrc) {
                    doc.srcdoc = newSrc;
                }
            }
        }
    }, [formData, removedSkills]);

    return (
        <div className="modal-card">
            <div className="modal-card-header">
                <h4 className=" ">Biodata (Preview)</h4>
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
                        className="btn btn-outline-success btn-sm"
                        onClick={saveRemovedSkills}
                        title="Save removed skills for download/share"
                    >
                        Save Changes
                    </button>
                    <button
                        type="button"
                        className="btn btn-outline-warning btn-sm"
                        onClick={resetRemovedSkills}
                        title="Reset all skill removals"
                    >
                        Reset
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
                <div className="alert alert-info alert-sm mb-2 text-info">
                    <small>
                        <i className="bi bi-info-circle me-1"></i>
                        Click the X button to remove skills you don't want in the final biodata. 
                        Click "Save Changes" to apply removals before downloading or sharing.
                    </small>
                </div>
                <iframe
                    ref={iframeRef}
                    title="Biodata Preview"
                    style={{ width: "100%", height: "900px", border: "1px solid #e5e5e5", borderRadius: 8 }}
                    sandbox="allow-scripts allow-same-origin" // Added sandbox for better security
                />
            </div>
        </div>
    );
};

export default Biodata;