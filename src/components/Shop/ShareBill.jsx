// src/components/Customer/ShareBill.jsx
import React, { useRef } from 'react';

const ShareBill = ({ customer, customerItems, totalAmount, paymentHistory = [] }) => {
    const iframeRef = useRef(null);

    const headerImage = "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/Shop-Images%2FJenCeo-Trades.svg?alt=media&token=da7ab6ec-826f-41b2-ba2a-0a7d0f405997";
    const defaultCustomerPhoto = "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FSample-Photo.jpg?alt=media&token=01855b47-c9c2-490e-b400-05851192dde7";

    // Enhanced language mapping for categories with English and Hindi (same as CustomerModal)
    const categoryTranslations = {
        // Main Categories
        "1 కూరగాయలు": {
            en: "1 Vegetables",
            hi: "1 सब्जियाँ",
            subCategories: {
                "టమాటలు": { en: "Tomatoes", hi: "टमाटर" },
                "వంకాయలు": { en: "Brinjals", hi: "बैंगन" },
                "బెండకాయలు": { en: "Okra", hi: "भिंडी" },
                "దోసకాయలు": { en: "Bottle Gourd", hi: "लौकी" },
                "కాకరకాయలు": { en: "Ridge Gourd", hi: "तोरी" },
                "బీరకాయలు": { en: "Field Beans", hi: "सेम" },
                "పొట్లకాయలు": { en: "Snake Gourd", hi: "चिचिंडा" },
                "సొరకాయలు": { en: "Sponge Gourd", hi: "गिलकी" },
                "దొండకాయలు": { en: "Ivy Gourd", hi: "तेंडली" },
                "గుమ్మడికాయ": { en: "Pumpkin", hi: "कद्दू" },
                "బూడిద గుమ్మడికాయ": { en: "Ash Gourd", hi: "पेठा" },
                "మునగకాయలు": { en: "Drumsticks", hi: "सहजन" },
                "పచ్చిమిరపకాయలు": { en: "Green Chillies", hi: "हरी मिर्च" },
                "గోరుచిక్కుడు": { en: "Cluster Beans", hi: "गवार फली" },
                "బీన్స్": { en: "Beans", hi: "फलियाँ" },
                "చిక్కుడు": { en: "Tamarind", hi: "इमली" },
                "అరటికాయలు": { en: "Raw Bananas", hi: "कच्चे केले" },
                "మామిడికాయలు": { en: "Raw Mangoes", hi: "कच्चे आम" },
                "క్యాబేజీ": { en: "Cabbage", hi: "पत्ता गोभी" },
                "కాలిఫ్లవర్": { en: "Cauliflower", hi: "फूल गोभी" }
            }
        },
        "2 వేరు కూరగాయలు": {
            en: "2 Root Vegetables",
            hi: "2 जड़ वाली सब्जियाँ",
            subCategories: {
                "ఉల్లిపాయలు": { en: "Onions", hi: "प्याज" },
                "వెల్లుల్లి": { en: "Garlic", hi: "लहसुन" },
                "కేరట్": { en: "Carrot", hi: "गाजर" },
                "బీట్ రూట్": { en: "Beetroot", hi: "चुकंदर" },
                "ముల్లంగి": { en: "Radish", hi: "मूली" },
                "బంగాళాదుంపలు": { en: "Potatoes", hi: "आलू" },
                "చిలకడదుంపలు": { en: "Sweet Potato", hi: "शकरकंद" },
                "చెమదుంపలు": { en: "Tapioca", hi: "कसावा" },
                "అల్లం": { en: "Ginger", hi: "अदरक" }
            }
        },
        "3 ఆకుకూరలు": {
            en: "3 Leafy Greens",
            hi: "3 पत्तेदार सब्जियाँ",
            subCategories: {
                "పాలకూర": { en: "Spinach", hi: "पालक" },
                "తోటకూర": { en: "Gongura", hi: "अम्बाडी" },
                "మెంతికూర": { en: "Fenugreek Leaves", hi: "मेथी" },
                "కొత్తిమీర": { en: "Coriander Leaves", hi: "धनिया" },
                "పుదీనా": { en: "Mint", hi: "पुदीना" },
                "కరివేపాకు": { en: "Curry Leaves", hi: "कड़ी पत्ता" },
                "గోంగూర": { en: "Amaranth", hi: "चौलाई" }
            }
        },
        "4 అరటి పళ్ళు": {
            en: "4 Bananas",
            hi: "4 केले",
            subCategories: {
                "కర్పూరం": { en: "Karpooram Banana", hi: "कर्पूरम केला" },
                "పచ్చ చేక్కరకేళి": { en: "Green Chekkara Banana", hi: "हरा चेक्करा केला" },
                "ఎర్ర చేక్కరకేళి": { en: "Red Chekkara Banana", hi: "लाल चेक्करा केला" },
                "అమృతపాణి": { en: "Amruthapani Banana", hi: "अमृतपाणी केला" },
                "ట్రే అరిటి పళ్ళు": { en: "Tray Banana", hi: "ट्रे केला" }
            }
        },
        "5 పువ్వులు": {
            en: "5 Flowers",
            hi: "5 फूल",
            subCategories: {
                "బంతి పువ్వులు": { en: "Marigold", hi: "गेंदा" },
                "పసుపు చామంతి": { en: "Yellow Chrysanthemum", hi: "पीला गुलदाउदी" },
                "తెల్ల చామంతి": { en: "White Chrysanthemum", hi: "सफेद गुलदाउदी" },
                "గులాబీ": { en: "Rose", hi: "गुलाब" },
                "మలబార్": { en: "Malabar", hi: "मालाबार" },
                "మల్లె పువ్వులు": { en: "Jasmine", hi: "चमेली" },
                "మల్లె పూలదండ": { en: "Jasmine Garland", hi: "चमेली की माला" },
                "సన్నజాజులు": { en: "Small Jasmine", hi: "छोटी चमेली" },
                "సన్నజాజుల దండ": { en: "Small Jasmine Garland", hi: "छोटी चमेली की माला" }
            }
        },
        "6 కొబ్బరిబొండాలు": {
            en: "6 Coconuts",
            hi: "6 नारियल",
            subCategories: {
                "కేరళ బొండాలు": { en: "Kerala Coconuts", hi: "केरल नारियल" },
                "కేరళ నెంబర్ కాయ": { en: "Kerala Number Coconut", hi: "केरल नंबर नारियल" },
                "కేరళ గ్రేడ్ కాయ": { en: "Kerala Grade Coconut", hi: "केरल ग्रेड नारियल" },
                "ఆంధ్ర బొండాలు": { en: "Andhra Coconuts", hi: "आंध्र नारियल" },
                "ఆంధ్ర నెంబర్ కాయ": { en: "Andhra Number Coconut", hi: "आंध्र नंबर नारियल" },
                "ఆంధ్ర గ్రేడ్ కాయ": { en: "Andhra Grade Coconut", hi: "आंध्र ग्रेड नारियल" }
            }
        },
        "7 ఇతర వస్తువులు": {
            en: "7 Other Items",
            hi: "7 अन्य वस्तुएं",
            subCategories: {
                "కొబ్బరికాయలు": { en: "Coconuts", hi: "नारियल" },
                "బెల్లం": { en: "Jaggery", hi: "गुड़" },
                "తేనే పాకం": { en: "Honey", hi: "शहद" },
                "ఇతరం": { en: "Others", hi: "अन्य" }
            }
        },
    };

    // Function to get translation (same as CustomerModal)
    const getTranslation = (text, language, isSubCategory = false, mainCategory = '') => {
        if (!text || text === 'N/A') return 'N/A';

        // For main categories
        if (categoryTranslations[text] && categoryTranslations[text][language]) {
            return categoryTranslations[text][language];
        }

        // For sub categories
        if (isSubCategory && mainCategory && categoryTranslations[mainCategory]) {
            const subCategoryTranslations = categoryTranslations[mainCategory].subCategories;
            if (subCategoryTranslations && subCategoryTranslations[text] && subCategoryTranslations[text][language]) {
                return subCategoryTranslations[text][language];
            }
        }

        // Try to find in any subcategory if mainCategory is not provided
        if (isSubCategory && !mainCategory) {
            for (const mainCat in categoryTranslations) {
                const subCategoryTranslations = categoryTranslations[mainCat].subCategories;
                if (subCategoryTranslations && subCategoryTranslations[text] && subCategoryTranslations[text][language]) {
                    return subCategoryTranslations[text][language];
                }
            }
        }

        return text;
    };

    // Function to format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-IN');
        } catch (error) {
            return dateString;
        }
    };

    // Function to safely get item data
    const getItemData = (item, key) => {
        if (!item) return 'N/A';

        // Handle different data structures
        if (item[key] !== undefined) {
            return item[key];
        }

        // Handle nested data from /Shop/CreditData/key/CustomerItems/-key path
        if (item.data && item.data[key] !== undefined) {
            return item.data[key];
        }

        return 'N/A';
    };

    // Calculate payment summary
    const calculatePaymentSummary = () => {
        const previousPending = customer?.previousPending || 0;
        const previousPayments = paymentHistory.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        const currentBill = totalAmount;
        const totalAmountDue = previousPending + currentBill - previousPayments;
        
        return {
            previousPending,
            previousPayments,
            currentBill,
            totalAmountDue
        };
    };

    const paymentSummary = calculatePaymentSummary();

    // Build bill HTML with professional styling
    const buildBillHTML = () => {
        const currentDate = new Date().toLocaleDateString();
        const customerName = customer?.name || 'Customer';
        const customerId = customer?.idNo || 'N/A';
        const customerPlace = customer?.place || 'N/A';
        const customerGender = customer?.gender ? customer.gender.charAt(0).toUpperCase() + customer.gender.slice(1) : 'N/A';

        const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Bill - ${customerName}</title>
<style>
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#111}
  .page{ max-width:900px; margin:auto;background:#fff;border:1px solid #e5e5e5;padding:20px}
  .header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-bottom:2px solid #b7b4b4; padding:20px; margin:0 -20px; background: linear-gradient(135deg, #c7d1f5 0%, #e3e8ff 100%); border-radius: 5px;}
  .row { display: flex; flex-wrap: wrap; margin-left: -6px; margin-right: -6px; margin-bottom:6px }
  .row > div { padding-left: 6px; padding-right: 6px; }
  .col-md-1 { flex: 0 0 8.3333%;  max-width: 8.3333%; }
  .col-md-2 { flex: 0 0 16.6667%; max-width: 16.6667%; }
  .col-md-3 { flex: 0 0 25%; max-width: 25%; }
  .col-md-4 { flex: 0 0 33.3333%; max-width: 33.3333%; }
  .col-md-6 { flex: 0 0 50%; max-width: 50%; }
  .col-md-7 { flex: 0 0 58.3333%; max-width: 58.3333%; }
  .col-md-8 { flex: 0 0 66.6667%; max-width: 66.6667%; }

  .biodataHeader {display:flex; justify-content:space-between; align-items: stretch; color:#fff; margin: -20px -20px 20px -20px}
  .logoSection {flex: 0 0 40%; align-content: center; border-bottom:10px solid #02acf2 }
  .logoSection h1 {color:#FCC603; margin:0; font-size:40px; margin-left:50px; font-weight:900; line-height:1}
  .logoSection h1 spane {color:#02acf2; margin:0; font-size:100px; }
  .logoSection .subText {color:#817f7f; margin-left:65px; font-size:12px; font-weight:bold; letter-spacing:3px  }
  .dataSection {background:#02acf2; flex: 1;  padding:10px 20px; border-top-left-radius: 125px; padding-left: 70px; }
  .dataSection * {margin:0; }
  .dataSection span {font-size:10px; }

  .h-left{flex:1; margin-top:25px}
  .title{font-size:40px;font-weight:700;letter-spacing:.4px;margin:0;background:linear-gradient(135deg, #02acf2 0%, #0266f2 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
  .subtitle{font-size:12px;color:#444;margin-top:2px}
  .meta{font-size:11px;color:#555;margin-top:4px;display:flex;gap:14px;flex-wrap:wrap}
  .sec{margin-top:14px;border:1px solid #ddd;border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.1)}
  .sec-title{background:linear-gradient(135deg, #02acf2 0%, #0266f2 100%); padding:12px 10px;font-weight:700;color:white}
  .sec-title h3{margin:0;font-size:14px}
  .sec-body{padding:15px}
  /* UNIFIED rows: label | : | value have the same width everywhere */
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
  /* Two even columns area */
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .tags{display:flex;flex-wrap:wrap;gap:6px}
  .tag{border:1px solid #02acf2;color:#02acf2;font-size:12px;padding:3px 8px;border-radius:999px}
  .muted{color:#777}
  .footer{margin :20px -20px -20px -20px;font-size:10px; color:#fff;display:flex;justify-content:space-between; background:linear-gradient(135deg, #02acf2 0%, #0266f2 100%); padding:10px 20px}
  .blue {color:#02acf2}
  @media print{.page{border:none;margin:0;width:100%}}
  .header-img{width:100%;max-height:120px;object-fit:contain;margin-bottom:6px}
  /* photo box on the right */
  .photo-box{display:block;align-items:center;text-align:center}
  .photo-box .rating{background: #f5f5f5; padding: 3px; border-radius: 5px;}
  .photo-box img{width:130px;height:130px;object-fit:cover;border-radius:6px;border:1px solid #ccc}
  .photo-box .no-photo{width:120px;height:120px;border:1px solid #ccc;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#888;font-size:12px}
  .heaerImg {margin: -21px -20px 10px -20px}
  .heaerImg img {width:100%}
  
  /* Payment summary styles */
  .payment-summary {display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0}
  .payment-card {background: white; border-radius: 8px; padding: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-left: 4px solid}
  .payment-card.pending {border-left-color: #ff6b6b; background: linear-gradient(135deg, #fff5f5 0%, #ffecec 100%)}
  .payment-card.paid {border-left-color: #51cf66; background: linear-gradient(135deg, #f0fff4 0%, #e6f7ea 100%)}
  .payment-card.current {border-left-color: #339af0; background: linear-gradient(135deg, #f0f8ff 0%, #e6f2ff 100%)}
  .payment-card.total {border-left-color: #ff922b; background: linear-gradient(135deg, #fff4e6 0%, #ffebd6 100%)}
  .payment-label {font-size: 12px; color: #666; margin-bottom: 5px}
  .payment-amount {font-size: 18px; font-weight: bold}
  .payment-amount.pending {color: #ff6b6b}
  .payment-amount.paid {color: #51cf66}
  .payment-amount.current {color: #339af0}
  .payment-amount.total {color: #ff922b}
  
  /* Bill specific styles */
  .bill-table {width:100%; border-collapse:collapse; margin:20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1)}
  .bill-table th {background:linear-gradient(135deg, #02acf2 0%, #0266f2 100%); color:white; padding:12px 8px; text-align:center; font-size:12px}
  .bill-table td {padding:10px 8px; border-bottom:1px solid #e5e5e5; font-size:12px; text-align:center}
  .bill-table tr:nth-child(even) {background:#f8f9fa}
  .bill-table .total-row {background:#e3f2fd !important; font-weight:bold}
  .bill-table .grand-total {background:linear-gradient(135deg, #02acf2 0%, #0266f2 100%) !important; color:white; font-size:14px}
  
  .customer-message {background:#e8f5e8; padding:15px; border-radius:8px; margin:20px 0; border-left:4px solid #4caf50}
  .thank-you {text-align:center; padding:20px; background:linear-gradient(135deg, #e3f2fd 0%, #f0f8ff 100%); border-radius:8px; margin:20px 0; border: 1px solid #c6e5f1}
  
  /* Customer info grid */
  .customer-grid {display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0}
  .customer-item {padding: 8px; border-radius: 6px}
  .customer-item.bg {background-color: #f2f3fd}
  .customer-label {font-weight: 600; font-size: 12px; color: #555; margin-bottom: 10px}
  .customer-value {font-weight: 500; font-size: 12px}
  
  /* Payment history */
  .payment-history {margin-top: 20px}
  .payment-item {display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #e5e5e5}
  .payment-item:last-child {border-bottom: none}
  .payment-item:nth-child(even) {background: #f8f9fa}
  .payment-date {font-size: 11px; color: #666}
  .payment-amount {font-weight: bold; color: #51cf66}
  .payment-mode {font-size: 10px; color: #888; background: #e9ecef; padding: 2px 6px; border-radius: 4px}
  
  /* Language tags */
  .language-tags {display: flex; flex-direction: column; gap: 2px; margin-top: 4px}
  .lang-tag {font-size: 10px; color: #666; line-height: 1.2}
  
  /* Status badges */
  .status-badge {padding: 4px 8px; border-radius: 12px; font-size: 10px; font-weight: bold}
  .status-pending {background: #fff5f5; color: #ff6b6b; border: 1px solid #ff6b6b}
  .status-paid {background: #f0fff4; color: #51cf66; border: 1px solid #51cf66}


  /*Products*/
  .products { display:flex; align-item:center; text-align:center}
  .products img {width:80%; display:block; margin:auto; border:1px solid #ebebebff;  border-radius:10px}
  .p-title {background-color:#02acf2; margin-bottom:20px; text-align:center; color:#fff; padding:5px}
  
  @media only screen and (max-width: 767px) {
        .biodataHeader {display:none}
        .header {display:block}
        .header .h-left {text-align:center; margin-top:10px}
        .header .meta {justify-content:center; margin-bottom:15px}
        .title {font-size: 20px}
        .kv-row {display:block}
        .kv-colon {display:none}
        .kv-label {margin-bottom:5px}
        .two-col {display:block}
        .payment-summary {grid-template-columns: 1fr}
        .col-md-1 { display:none}
        .col-md-2, .col-md-3, .col-md-4, .col-md-6, .col-md-7, .col-md-8 { 
            flex: 0 0 100%; max-width: 100%; 
        }
        .addr-title {font-size:12px}
        .addr-line .col-md-4 {padding-bottom:5px}
        .bill-table {font-size:10px}
        .bill-table th, .bill-table td {padding:6px 4px}
        .customer-grid {grid-template-columns: 1fr}
  }
</style>
</head>
<body>
<div class="page">
<div class="heaerImg"><img src="${headerImage}" alt="Header" /></div>
 
  <div class="header">
    <div class="h-left">
      <h1 class="title">INVOICE</h1>
      <div class="subtitle">JenCeo Home Care Services & Traders - Customer Bill</div>
      <div class="meta">
        <div><strong>Bill Date:</strong> ${currentDate}</div>
        <div><strong>Customer ID:</strong> ${customerId}</div>
      </div>
      <br>
      <div style="color:#444"><strong>Status:</strong> ${paymentSummary.totalAmountDue > 0 ? '<span class="status-badge status-pending">Pending</span>' : '<span class="status-badge status-paid">Paid</span>'}</div>
    </div>
    <div class="photo-box">
      <img src="${defaultCustomerPhoto}" alt="Customer" style="width:120px;height:120px;object-fit:cover;border-radius:6px;border:1px solid #ccc" />
      <div class="kv-value rating" style="margin-top: 8px">
        <strong>${customerName}</strong>
      </div>
    </div>
  </div>

  <!-- Payment Summary Section -->
  ${section(
    "<h3>Payment Summary</h3>",
    `
    <div class="payment-summary">
      <div class="payment-card pending">
        <div class="payment-label">Previous Pending</div>
        <div class="payment-amount pending">₹${paymentSummary.previousPending.toFixed(2)}</div>
        <small class="muted">Amount carried from previous bills</small>
      </div>
      
      <div class="payment-card paid">
        <div class="payment-label">Previous Payments</div>
        <div class="payment-amount paid">₹${paymentSummary.previousPayments.toFixed(2)}</div>
        <small class="muted">Total payments received</small>
      </div>
      
      <div class="payment-card current">
        <div class="payment-label">Current Bill Amount</div>
        <div class="payment-amount current">₹${paymentSummary.currentBill.toFixed(2)}</div>
        <small class="muted">Amount for current purchases</small>
      </div>
      
      <div class="payment-card total">
        <div class="payment-label">Total Amount Due</div>
        <div class="payment-amount total">₹${paymentSummary.totalAmountDue.toFixed(2)}</div>
        <small class="muted">Final amount to be paid</small>
      </div>
    </div>
    `
  )}

  ${section(
            "<h3>Customer Information</h3>",
            `
      <div class="customer-grid">
        <div class="customer-item bg">
          <div class="customer-label">Customer Name</div>
          <div class="customer-value blue"><strong>${customerName}</strong></div>
        </div>
        <div class="customer-item bg">
          <div class="customer-label">Customer ID</div>
          <div class="customer-value">${customerId}</div>
        </div>
        <div class="customer-item">
          <div class="customer-label">Gender</div>
          <div class="customer-value blue">${customerGender}</div>
        </div>
        <div class="customer-item">
          <div class="customer-label">Place</div>
          <div class="customer-value">${customerPlace}</div>
        </div>
        <div class="customer-item bg">
          <div class="customer-label">Mobile No</div>
          <div class="customer-value blue">${customer?.mobileNo || 'N/A'}</div>
        </div>
        <div class="customer-item bg">
          <div class="customer-label">Email</div>
          <div class="customer-value">${customer?.email || 'N/A'}</div>
        </div>
      </div>
    `
        )}

  <div class="customer-message">
    <strong>Dear ${customerName},</strong><br>
    Thank you for being a valued customer of JenCeo Home Care Services. We appreciate your trust in us and are committed to providing you with the highest quality service.
    ${paymentSummary.totalAmountDue > 0 ? `<br><br><strong>Payment Due:</strong> ₹${paymentSummary.totalAmountDue.toFixed(2)} (Please settle at your earliest convenience)` : ''}
  </div>

  ${section(
            "<h3>Bill Details</h3>",
            `
  <table class="bill-table">
    <thead>
      <tr>
        <th>S.No</th>
        <th>Date</th>
        <th>Item Description</th>
        <th>Quantity</th>
        <th>Price</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${customerItems.map((item, index) => {
                const mainCategory = getItemData(item, 'mainCategory');
                const subCategory = getItemData(item, 'subCategory');
                const quantity = getItemData(item, 'quantity') || '0';
                const price = getItemData(item, 'price') || '0';
                const total = getItemData(item, 'total') || '0';
                const date = formatDate(getItemData(item, 'date'));
                const comments = getItemData(item, 'comments');

                // Get translations using the same function as CustomerModal
                const teluguName = subCategory && subCategory !== 'N/A' ? subCategory : mainCategory;
                const englishName = getTranslation(teluguName, 'en', true, mainCategory);
                const hindiName = getTranslation(teluguName, 'hi', true, mainCategory);

                return `
          <tr>
            <td>${index + 1}</td>
            <td>${date}</td>
            <td>
              <strong>${teluguName}</strong>
              <div class="language-tags">
                <span>  ${englishName} / ${hindiName}</span>
              </div>
              ${comments && comments !== 'N/A' ? `<small class="muted" style="display:block; margin-top: 4px">Comments: ${comments}</small>` : ''}
            </td>
            <td>${quantity} KG</td>
            <td>₹${price}</td>
            <td><strong>₹${total}</strong></td>
          </tr>
        `;
            }).join('')}
      
      <tr class="total-row">
        <td colspan="5" style="text-align:right"><strong>Sub Total:</strong></td>
        <td><strong>₹${totalAmount.toFixed(2)}</strong></td>
      </tr>
      
      <tr class="grand-total">
        <td colspan="5" style="text-align:right;"><strong>GRAND TOTAL:</strong></td>
        <td style="color:yellow; font-size:16px"><strong>₹${totalAmount.toFixed(2)}</strong></td>
      </tr>
    </tbody>
  </table>
`
        )}

  <!-- Payment History Section -->
  ${paymentHistory.length > 0 ? section(
    "<h3>Payment History</h3>",
    `
    <div class="payment-history">
      ${paymentHistory.map((payment, index) => `
        <div class="payment-item">
          <div>
            <div><strong>Payment ${index + 1}</strong></div>
            <div class="payment-date">${formatDate(payment.date)}</div>
            <div class="payment-mode">${payment.mode || 'Cash'}</div>
          </div>
          <div class="payment-amount">₹${payment.amount?.toFixed(2) || '0.00'}</div>
        </div>
      `).join('')}
    </div>
    `
  ) : ''}

  <div class="thank-you">
    <h3 style="color:#02acf2; margin-bottom:10px">Thank You!</h3>
    <p style="margin:0">We appreciate your business and look forward to serving you again.</p>
    <p style="margin:5px 0 0 0"><strong>JenCeo Home Care & Traders</strong></p>
    <p style="margin:0; font-size:11px; color:#666">Quality Service | Trusted Care | Customer Satisfaction</p>
  </div>

  <h3 class="p-title">Our Products</h3>
  <div class="products">
  <div class="p-img col-md-3"> 
    <img src="https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/Shop-Images%2FCoconut-1.jpg?alt=media&token=6f8e3e72-9fa6-4fb7-b91b-cbe6a1832065" alt="Coconuts" /> 
      <h5>Cocunets</h5>
  </div>
  <div class="p-img col-md-3"> 
    <img src="https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/Shop-Images%2FVigitables.jpg?alt=media&token=5ce15750-f8b1-4f90-b26e-843886f60d4f" alt="Flowers" /> 
      <h5>Fresh Vegitables</h5>
  </div>
  <div class="p-img col-md-3"> 
    <img src="https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/Shop-Images%2FBananas.jpg?alt=media&token=96e5930a-fe41-47e8-a026-1d3f4689a12f" alt="Bananas" /> 
      <h5>Bananas</h5>
  </div>
  <div class="p-img col-md-3"> 
  <a href="https://jenceo.com/" target="_blank">
    <img src="https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/Shop-Images%2FJenCeo-Home-Care.jpg?alt=media&token=6a72abef-b1e2-4fb6-ad63-9ae2e772abfe" alt="Flowers" /> 
    </a>
      <h5>Home Care / Baby Care / Patent Care</h5>
  </div>
        
      </div>

  <div class="footer">
    <div>Bill Ref: JC-BILL-001</div>
    <div>Generated On: ${currentDate}</div>
    <div>Page 1 of 1</div>
  </div>
</div>
<script>window.focus && window.focus();</script>
</body>
</html>
`;

        function section(title, body) {
            return `
      <div class="sec">
        <div class="sec-title">${title}</div>
        <div class="sec-body">
          ${body}
        </div>
      </div>
    `;
        }

        return html;
    };

    // Download bill as HTML file
    const handleDownloadBill = () => {
        const html = buildBillHTML();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `Bill_${customer?.idNo || customer?.name || 'customer'}_${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    };

    // Share bill
    const handleShareBill = async () => {
        try {
            const html = buildBillHTML();
            const blob = new Blob([html], { type: 'text/html' });

            if (navigator.share) {
                const file = new File([blob], `Bill_${customer?.idNo || customer?.name || 'customer'}.html`, { type: 'text/html' });
                await navigator.share({
                    title: `Bill - ${customer?.name}`,
                    files: [file]
                });
            } else {
                // Fallback to download if share is not supported
                handleDownloadBill();
            }
        } catch (error) {
            console.error('Error sharing bill:', error);
            handleDownloadBill();
        }
    };

    // Set iframe content when component mounts/updates
    React.useEffect(() => {
        if (iframeRef.current) {
            iframeRef.current.srcdoc = buildBillHTML();
        }
    }, [customer, customerItems, totalAmount, paymentHistory]);

    return (
        <div className="modal-card">
            <div className="modal-card-header d-flex align-items-center justify-content-between">
                <h4 className="mb-0">Bill Preview</h4>
                <div className="d-flex gap-2">
                    <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={handleDownloadBill}
                    >
                        <i className="fas fa-download me-1"></i>
                        Download Bill
                    </button>
                    <button
                        type="button"
                        className="btn btn-outline-success btn-sm"
                        onClick={handleShareBill}
                    >
                        <i className="fas fa-share me-1"></i>
                        Share Bill
                    </button>
                </div>
            </div>

            <div className="modal-card-body bill-wrapper">
                <iframe
                    ref={iframeRef}
                    title="Bill Preview"
                    style={{
                        width: "100%",
                        height: "800px",
                        border: "1px solid #e5e5e5",
                        borderRadius: 8,
                        background: "white"
                    }}
                />
            </div>

            <div className="modal-card-footer d-flex justify-content-between align-items-center p-3 border-top">
                <small className="text-muted">
                    Total Amount Due: <strong className="text-success">₹{paymentSummary.totalAmountDue.toFixed(2)}</strong> |
                    Items: <strong>{customerItems.length}</strong> |
                    Payments: <strong>{paymentHistory.length}</strong>
                </small>
                <small className="text-muted">
                    Generated on: {new Date().toLocaleDateString()}
                </small>
            </div>
        </div>
    );
};

export default ShareBill;