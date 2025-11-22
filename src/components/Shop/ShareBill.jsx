import React, { useRef, useState, useMemo } from 'react';

const ShareBill = ({
  customer,
  PurchaseItems,
  totalAmount,
  paymentHistory = [],
  selectedItems = [],
  billNumber = '',
  billTitle = 'Customer Bill',
  categoryTranslations = {},
  getTranslation
}) => {
  const iframeRef = useRef(null);
  const [language, setLanguage] = useState('en');
  const [showBillModal, setShowBillModal] = useState(false);
  const [billPayload, setBillPayload] = useState(null);

  const headerImage = "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/Shop-Images%2FJenCeo-Trades.svg?alt=media&token=da7ab6ec-826f-41b2-ba2a-0a7d0f405997";
  const defaultCustomerPhoto = "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FSample-Photo.jpg?alt=media&token=01855b47-c9c2-490e-b400-05851192dde7";

  const enhancedCategoryTranslations = {
    "1 కూరగాయలు": {
      en: "1 Vegetables",
      hi: "1 सब्जियाँ",
      te: "1 కూరగాయలు",
      subCategories: {
        "టమాటలు": { en: "Tomatoes", hi: "टमाटर", te: "టమాటలు" },
        "వంకాయలు": { en: "Brinjals", hi: "बैंगन", te: "వంకాయలు" },
        "బెండకాయలు": { en: "Okra", hi: "भिंडी", te: "బెండకాయలు" },
      }
    },
    ...categoryTranslations
  };

  const enhancedGetTranslation = (text, lang, isSubCategory = false, mainCategory = '') => {
    if (!text || text === 'N/A') return 'N/A';

    if (getTranslation) {
      const result = getTranslation(text, lang, isSubCategory, mainCategory);
      if (result !== text) return result;
    }

    if (enhancedCategoryTranslations[text] && enhancedCategoryTranslations[text][lang]) {
      return enhancedCategoryTranslations[text][lang];
    }

    if (isSubCategory && mainCategory && enhancedCategoryTranslations[mainCategory]) {
      const subCategoryTranslations = enhancedCategoryTranslations[mainCategory].subCategories;
      if (subCategoryTranslations && subCategoryTranslations[text] && subCategoryTranslations[text][lang]) {
        return subCategoryTranslations[text][lang];
      }
    }

    if (isSubCategory && !mainCategory) {
      for (const mainCat in enhancedCategoryTranslations) {
        const subCategoryTranslations = enhancedCategoryTranslations[mainCat].subCategories;
        if (subCategoryTranslations && subCategoryTranslations[text] && subCategoryTranslations[text][lang]) {
          return subCategoryTranslations[text][lang];
        }
      }
    }

    return text;
  };

  const handleOpenBill = ({ items, billNumber, title }) => {
    setBillPayload({ items, billNumber, title });
    setShowBillModal(true);
  };

  const billItems = useMemo(() => {
    if (selectedItems && selectedItems.length > 0) {
      return selectedItems.map(item => {
        const itemData = item.data || item;

        return {
          id: itemData.id || Math.random().toString(36).substr(2, 9),
          subCategory: itemData.subCategory || 'Unknown Item',
          mainCategory: itemData.mainCategory || 'General',
          quantity: itemData.quantity || 0,
          price: itemData.price || 0,
          total: itemData.total || 0,
          date: itemData.date || new Date().toISOString(),
          comments: itemData.comments || '',
          status: itemData.status || 'pending',
          data: itemData
        };
      });
    }
    return [];
  }, [selectedItems]);

  const billTotal = useMemo(() => {
    return billItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
  }, [billItems]);

  // FIX: Check if any item in the bill is pending
  const invoiceIsPending = useMemo(() => {
    return Array.isArray(billItems) && billItems.some(item => {
      const status = (item?.status || "").toLowerCase();
      return status !== "paid";
    });
  }, [billItems]);

  const getPaymentDetails = () => {
    const lastPayment = paymentHistory.length > 0 ? paymentHistory[paymentHistory.length - 1] : null;

    const totalPurchase = PurchaseItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);

    const totalPaid = paymentHistory.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);

    const currentBalance = totalPurchase - totalPaid;

    return {
      lastPayment: lastPayment ? {
        amount: lastPayment.amount || 0,
        date: lastPayment.date,
        mode: lastPayment.method || lastPayment.mode || 'Cash'
      } : null,
      currentBalance: Math.max(0, currentBalance),
      totalPayments: totalPaid,
      totalPurchase: totalPurchase,
      previousPending: customer?.previousPending || 0
    };
  };

  const paymentDetails = getPaymentDetails();

  const generatedBillNumber = useMemo(() => {
    if (billNumber) return billNumber;
    const timestamp = new Date().getTime().toString().slice(-6);
    const itemCount = billItems.length.toString().padStart(3, '0');
    const customerId = customer?.idNo?.substring(0, 4) || 'C-01';
    return `${customerId}-BILL-${timestamp}-${itemCount}`;
  }, [billNumber, billItems, customer]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN');
    } catch (error) {
      return dateString;
    }
  };

  const handleShareToWhatsApp = () => {
    const paymentDetails = getPaymentDetails();
    const message = `*Bill Details*\n\n` +
      `*Customer:* ${customer?.name || 'N/A'}\n` +
      `*Bill Number:* ${generatedBillNumber}\n` +
      `*Total Amount:* ₹${billTotal.toFixed(2)}\n` +
      `*Items Count:* ${billItems.length}\n` +
      `*Current Balance:* ₹${paymentDetails.currentBalance.toFixed(2)}\n` +
      `*Last Payment:* ${paymentDetails.lastPayment ? `₹${paymentDetails.lastPayment.amount.toFixed(2)} on ${formatDate(paymentDetails.lastPayment.date)}` : 'No payments'}\n` +
      `*Generated Date:* ${new Date().toLocaleDateString()}\n\n` +
      `Thank you for your business!`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
  };

  const getItemData = (item, key) => {
    if (!item) return 'N/A';

    if (item[key] !== undefined && item[key] !== null) {
      return item[key];
    }

    if (item.data && item.data[key] !== undefined && item.data[key] !== null) {
      return item.data[key];
    }

    return 'N/A';
  };

  const languageContent = {
    en: {
      title: "INVOICE",
      subtitle: "JenCeo Home Care Services & Traders",
      customerInfo: "Customer Information",
      paymentSummary: "Payment Summary",
      billDetails: "Bill Details",
      paymentHistory: "Payment History",
      thankYou: "Thank You!",
      ourProducts: "Our Products",
      lastPayment: "Last Payment",
      currentBalance: "Current Balance",
      totalPayments: "Total Payments",
      totalPurchase: "Total Purchase",
      currentBill: "Current Bill Amount",
      previousPending: "Previous Pending",
      customerMessage: `Dear ${customer?.name || 'Customer'}, Thank you for being a valued customer of JenCeo Home Care Services. We appreciate your trust in us and are committed to providing you with the highest quality service.`,
      paymentDue: "Payment Due",
      statusPending: "Pending",
      statusPaid: "Paid",
      itemDescription: "Item Description",
      quantity: "Quantity",
      price: "Price",
      total: "Total",
      subTotal: "Sub Total",
      grandTotal: "GRAND TOTAL",
      billNumber: "Bill Number",
      paymentMode: "Payment Mode"
    },
    hi: {
      title: "बिल",
      subtitle: "जेनसीओ होम केयर सर्विसेज एंड ट्रेडर्स - " + (billTitle === 'Customer Bill' ? 'ग्राहक बिल' : billTitle),
      customerInfo: "ग्राहक जानकारी",
      paymentSummary: "भुगतान सारांश",
      billDetails: "बिल विवरण",
      paymentHistory: "भुगतान इतिहास",
      thankYou: "धन्यवाद!",
      ourProducts: "हमारे उत्पाद",
      lastPayment: "अंतिम भुगतान",
      currentBalance: "वर्तमान शेष",
      totalPayments: "कुल भुगतान",
      totalPurchase: "कुल खरीद",
      currentBill: "वर्तमान बिल राशि",
      previousPending: "पिछला बकाया",
      customerMessage: `प्रिय ${customer?.name || 'ग्राहक'}, जेनसीओ होम केयर सर्विसेज के एक मूल्यवान ग्राहक होने के लिए धन्यवाद। हम आपके विश्वास की सराहना करते हैं और आपको उच्चतम गुणवत्ता वाली सेवा प्रदान करने के लिए प्रतिबद्ध हैं।`,
      paymentDue: "भुगतान देय",
      statusPending: "लंबित",
      statusPaid: "भुगतान किया गया",
      itemDescription: "वस्तु विवरण",
      quantity: "मात्रा",
      price: "मूल्य",
      total: "कुल",
      subTotal: "उप कुल",
      grandTotal: "कुल योग",
      billNumber: "बिल नंबर",
      paymentMode: "भुगतान मोड"
    },
    te: {
      title: "బిల్",
      subtitle: "జెన్సియో హోమ్ కేర్ సర్వీసెస్ & ట్రేడర్స్ - " + (billTitle === 'Customer Bill' ? 'కస్టమర్ బిల్' : billTitle),
      customerInfo: "కస్టమర్ సమాచారం",
      paymentSummary: "చెల్లింపు సారాంశం",
      billDetails: "బిల్ వివరాలు",
      paymentHistory: "చెల్లింపు చరిత్ర",
      thankYou: "ధన్యవాదాలు!",
      ourProducts: "మా ఉత్పత్తులు",
      lastPayment: "చివరి చెల్లింపు",
      currentBalance: "ప్రస్తుత బ్యాలెన్స్",
      totalPayments: "మొత్తం చెల్లింపులు",
      totalPurchase: "మొత్తం కొనుగోలు",
      currentBill: "ప్రస్తుత బిల్ మొత్తం",
      previousPending: "మునుపటి బకాయి",
      customerMessage: `ప్రియ ${customer?.name || 'కస్టమర్'}, జెన్సియో హోమ్ కేర్ సర్వీసెస్ యొక్క విలువైన కస్టమర్ అయినందుకు ధన్యవాదాలు. మీరు మాపై ఉంచిన నమ్మకాన్ని మేము అభినందిస్తున్నాము మరియు మీకు అత్యుత్తమ నాణ్యత సేవలను అందించడానికి ప్రతిబద్ధత కలిగి ఉన్నాము.`,
      paymentDue: "చెల్లింపు బకాయి",
      statusPending: "పెండింగ్",
      statusPaid: "చెల్లించబడింది",
      itemDescription: "ఐటెమ్ వివరణ",
      quantity: "పరిమాణం",
      price: "ధర",
      total: "మొత్తం",
      subTotal: "ఉప మొత్తం",
      grandTotal: "మొత్తం బిల్",
      billNumber: "బిల్ నంబర్",
      paymentMode: "చెల్లింపు మోడ్"
    }
  };

  const buildBillHTML = () => {
    const currentDate = new Date().toLocaleDateString();
    const customerName = customer?.name || 'Customer';
    const customerId = customer?.idNo || 'N/A';
    const customerPlace = customer?.place || 'N/A';
    const customerGender = customer?.gender ? customer.gender.charAt(0).toUpperCase() + customer.gender.slice(1) : 'N/A';

    const content = languageContent[language];

    // FIX: Use the invoiceIsPending variable to determine status
    const statusBadgeHTML = invoiceIsPending
      ? `<span class="status-badge status-pending">${content.statusPending}</span>`
      : `<span class="status-badge status-paid">${content.statusPaid}</span>`;

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
  .footer{margin :20px -20px -20px -20px;font-size:10px; color:#fff;display:flex;justify-content:space-between; background:linear-gradient(135deg, #02acf2 0%, #0266f2 100%); padding:10px 20px}
  .blue {color:#02acf2}
  @media print{.page{border:none;margin:0;width:100%}}
  .header-img{width:100%;max-height:120px;object-fit:contain;margin-bottom:6px}
  .photo-box{display:block;align-items:center;text-align:center}
  .photo-box .rating{background: #f5f5f5; padding: 3px; border-radius: 5px;}
  .photo-box img{width:130px;height:130px;object-fit:cover;border-radius:6px;border:1px solid #ccc}
  .photo-box .no-photo{width:120px;height:120px;border:1px solid #ccc;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#888;font-size:12px}
  .heaerImg {margin: -21px -20px 10px -20px}
  .heaerImg img {width:100%}
  
  .payment-summary {display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0}
  .payment-card {background: white; border-radius: 8px; padding: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-left: 4px solid}
  .payment-card.last-payment {border-left-color: #51cf66; background: linear-gradient(135deg, #f0fff4 0%, #e6f7ea 100%)}
  .payment-card.current-balance {border-left-color: #ff6b6b; background: linear-gradient(135deg, #fff5f5 0%, #ffecec 100%)}
  .payment-card.current-bill {border-left-color: #339af0; background: linear-gradient(135deg, #f0f8ff 0%, #e6f2ff 100%)}
  .payment-card.total-payments {border-left-color: #ff922b; background: linear-gradient(135deg, #fff4e6 0%, #ffebd6 100%)}
  .payment-card.total-purchase {border-left-color: #cc5de8; background: linear-gradient(135deg, #f8f0fc 0%, #f3d9fa 100%)}
  .payment-label {font-size: 12px; color: #666; margin-bottom: 5px}
  .payment-amount {font-size: 18px; font-weight: bold}
  .payment-amount.last-payment {color: #51cf66}
  .payment-amount.current-balance {color: #ff6b6b}
  .payment-amount.current-bill {color: #339af0}
  .payment-amount.total-payments {color: #ff922b}
  .payment-amount.total-purchase {color: #cc5de8}
  
  .bill-table {width:100%; border-collapse:collapse; margin:20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1)}
  .bill-table th {background:linear-gradient(135deg, #02acf2 0%, #0266f2 100%); color:white; padding:12px 8px; text-align:center; font-size:12px}
  .bill-table td {padding:10px 8px; border-bottom:1px solid #e5e5e5; font-size:12px; text-align:center}
  .bill-table tr:nth-child(even) {background:#f8f9fa}
  .bill-table .total-row {background:#e3f2fd !important; font-weight:bold}
  .bill-table .grand-total {background:linear-gradient(135deg, #02acf2 0%, #0266f2 100%) !important; color:white; font-size:14px}
  
  .customer-message {background:#e8f5e8; padding:15px; border-radius:8px; margin:20px 0; border-left:4px solid #4caf50}
  .thank-you {text-align:center; padding:20px; background:linear-gradient(135deg, #e3f2fd 0%, #f0f8ff 100%); border-radius:8px; margin:20px 0; border: 1px solid #c6e5f1}
  
  .customer-grid {display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0}
  .customer-item {padding: 8px; border-radius: 6px}
  .customer-item.bg {background-color: #f2f3fd}
  .customer-label {font-weight: 600; font-size: 12px; color: #555; margin-bottom: 10px}
  .customer-value {font-weight: 500; font-size: 12px}
  
  .payment-history {margin-top: 20px}
  .payment-item {display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #e5e5e5}
  .payment-item:last-child {border-bottom: none}
  .payment-item:nth-child(even) {background: #f8f9fa}
  .payment-date {font-size: 11px; color: #666}
  .payment-amount {font-weight: bold; color: #51cf66}
  .payment-mode {font-size: 10px; color: #888; background: #e9ecef; padding: 2px 6px; border-radius: 4px}
  
  .language-tags {flex-direction: column; gap: 2px; margin-top: 4px}
  .lang-tag {font-size: 10px; color: #666; line-height: 1.2}
  
  .status-badge {padding: 4px 8px; border-radius: 12px; font-size: 10px; font-weight: bold}
  .status-pending {background: #fff5f5; color: #ff6b6b; border: 1px solid #ff6b6b}
  .status-paid {background: #f0fff4; color: #51cf66; border: 1px solid #51cf66}

  .products { display:flex; align-item:center; text-align:center}
  .products img {width:80%; display:block; margin:auto; border:1px solid #ebebebff;  border-radius:10px}
  .p-title {background-color:#02acf2; margin-bottom:20px; text-align:center; color:#fff; padding:5px}
  
  .language-selector {display: flex; gap: 10px; margin-bottom: 15px; justify-content: center}
  .lang-btn {padding: 5px 10px; border: 1px solid #02acf2; background: white; color: #02acf2; border-radius: 5px; cursor: pointer; font-size: 12px}
  .lang-btn.active {background: #02acf2; color: white}
  
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
        .products {flex-wrap: wrap}
        .language-selector {flex-wrap: wrap}
  }
</style>
</head>
<body>
<div class="page">
<div class="heaerImg"><img src="${headerImage}" alt="Header" /></div>

<!-- Language Selector -->
<div class="language-selector">
  <button class="lang-btn ${language === 'en' ? 'active' : ''}" onclick="changeLanguage('en')">English</button>
  <button class="lang-btn ${language === 'hi' ? 'active' : ''}" onclick="changeLanguage('hi')">हिन्दी</button>
  <button class="lang-btn ${language === 'te' ? 'active' : ''}" onclick="changeLanguage('te')">తెలుగు</button>
</div>
 
  <div class="header">
    <div class="h-left">
      <h1 class="title">${content.title}</h1>
      <div class="subtitle">${content.subtitle}</div>
      <div class="meta">
        <div><strong>Bill Date:</strong> ${currentDate}</div>
        <div><strong>${content.billNumber}:</strong> ${generatedBillNumber}</div>
        <div><strong>Customer ID:</strong> ${customerId}</div>
      </div>
      <br>
      <!-- FIX: Use the dynamic status badge -->
      <div style="color:#444"><strong>Status:</strong> ${statusBadgeHTML}</div>
    </div>
    <div class="photo-box">
      <img src="${defaultCustomerPhoto}" alt="Customer" style="width:120px;height:120px;object-fit:cover;border-radius:6px;border:1px solid #ccc" />
      <div class="kv-value rating" style="margin-top: 8px">
        <strong>${customerName}</strong>
      </div>
    </div>
  </div>

  ${section(
      `<h3>${content.paymentSummary}</h3>`,
      `
    <div class="payment-summary">
      ${paymentDetails.lastPayment ? `
      <div class="payment-card last-payment">
        <div class="payment-label">${content.lastPayment}</div>
        <div class="payment-amount last-payment">₹${paymentDetails.lastPayment.amount.toFixed(2)}</div>
        <small class="muted">${formatDate(paymentDetails.lastPayment.date)} • ${paymentDetails.lastPayment.mode}</small>
      </div>
      ` : `
      <div class="payment-card last-payment">
        <div class="payment-label">${content.lastPayment}</div>
        <div class="payment-amount last-payment">₹0.00</div>
        <small class="muted">No payments recorded</small>
      </div>
      `}
      
      <div class="payment-card current-balance">
        <div class="payment-label">${content.currentBill}</div>
        <div class="payment-amount current-balance">₹${billTotal.toFixed(2)}</div>
        <small class="muted">Current outstanding amount</small>
      </div>
    </div>
    `
    )}

  ${section(
      `<h3>${content.customerInfo}</h3>`,
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
    ${content.customerMessage}
    ${paymentDetails.currentBalance > 0 ? `<br><br><strong>${content.paymentDue}:</strong> ₹${paymentDetails.currentBalance.toFixed(2)} (Please settle at your earliest convenience)` : ''}
  </div>

  ${billItems.length > 0 ? section(
      `<h3>${content.billDetails}</h3>`,
      `
  <table class="bill-table">
    <thead>
      <tr>
        <th>S.No</th>
        <th>Date</th>
        <th>${content.itemDescription}</th>
        <th>${content.quantity}</th>
        <th>${content.price}</th>
        <th>${content.total}</th>
      </tr>
    </thead>
    <tbody>
      ${billItems.map((item, index) => {
        const mainCategory = getItemData(item, 'mainCategory');
        const subCategory = getItemData(item, 'subCategory');
        const quantity = getItemData(item, 'quantity') || '0';
        const price = getItemData(item, 'price') || '0';
        const total = getItemData(item, 'total') || '0';
        const date = formatDate(getItemData(item, 'date'));
        const comments = getItemData(item, 'comments');

        const teluguName = subCategory && subCategory !== 'N/A' ? subCategory : mainCategory;
        const displayName = enhancedGetTranslation(teluguName, language, true, mainCategory);

        return `
          <tr>
            <td>${index + 1}</td>
            <td>${date}</td>
            <td style="text-align: left;">
              <strong>${displayName}</strong>
              ${language === 'en' ? `
                <div class="language-tags">
                  <span class="lang-tag">Telugu: ${teluguName}</span>
                  <span class="lang-tag">Hindi: ${enhancedGetTranslation(teluguName, 'hi', true, mainCategory)}</span>
                </div>
              ` : language === 'hi' ? `
                <div class="language-tags">
                  <span class="lang-tag">English: ${enhancedGetTranslation(teluguName, 'en', true, mainCategory)}</span>
                  <span class="lang-tag">Telugu: ${teluguName}</span>
                </div>
              ` : `
                <div class="language-tags">
                  <span class="lang-tag">English: ${enhancedGetTranslation(teluguName, 'en', true, mainCategory)}</span>
                  <span class="lang-tag">Hindi: ${enhancedGetTranslation(teluguName, 'hi', true, mainCategory)}</span>
                </div>
              `}
              ${comments && comments !== 'N/A' ? `<small class="muted" style="display:block; margin-top: 4px">Comments: ${comments}</small>` : ''}
            </td>
            <td>${quantity} KG</td>
            <td>₹${parseFloat(price).toFixed(2)}</td>
            <td><strong>₹${parseFloat(total).toFixed(2)}</strong></td>
          </tr>
        `;
      }).join('')}
      
      <tr class="total-row">
        <td colspan="5" style="text-align:right"><strong>${content.subTotal}:</strong></td>
        <td><strong>₹${billTotal.toFixed(2)}</strong></td>
      </tr>
      
      <tr class="grand-total">
        <td colspan="5" style="text-align:right;"><strong>${content.grandTotal}:</strong></td>
        <td style="color:yellow; font-size:16px"><strong>₹${billTotal.toFixed(2)}</strong></td>
      </tr>
    </tbody>
  </table>
`
    ) : `
    <div class="customer-message" style="background: #fff3cd; border-left: 4px solid #ffc107;">
      <strong>No Items Selected</strong><br>
      This bill contains only payment summary information. No specific items are included in this bill.
    </div>
  `}

  

  <div class="thank-you">
    <h3 style="color:#02acf2; margin-bottom:10px">${content.thankYou}</h3>
    <p style="margin:0">We appreciate your business and look forward to serving you again.</p>
    <p style="margin:5px 0 0 0"><strong>JenCeo Home Care & Traders</strong></p>
    <p style="margin:0; font-size:11px; color:#666">Quality Service | Trusted Care | Customer Satisfaction</p>
  </div>

  <h3 class="p-title">${content.ourProducts}</h3>
  <div class="products">
    <div class="p-img col-md-3"> 
      <img src="https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/Shop-Images%2FCoconut-1.jpg?alt=media&token=6f8e3e72-9fa6-4fb7-b91b-cbe6a1832065" alt="Coconuts" /> 
      <h5>Coconuts</h5>
    </div>
    <div class="p-img col-md-3"> 
      <img src="https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/Shop-Images%2FVigitables.jpg?alt=media&token=5ce15750-f8b1-4f90-b26e-843886f60d4f" alt="Vegetables" /> 
      <h5>Fresh Vegetables</h5>
    </div>
    <div class="p-img col-md-3"> 
      <img src="https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/Shop-Images%2FBananas.jpg?alt=media&token=96e5930a-fe41-47e8-a026-1d3f4689a12f" alt="Bananas" /> 
      <h5>Bananas</h5>
    </div>
    <div class="p-img col-md-3"> 
      <a href="https://jenceo.com/" target="_blank">
        <img src="https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/Shop-Images%2FJenCeo-Home-Care.jpg?alt=media&token=6a72abef-b1e2-4fb6-ad63-9ae2e772abfe" alt="Home Care" /> 
      </a>
      <h5>Home Care / Baby Care / Patient Care</h5>
    </div>
  </div>

  <div class="footer">
    <div>Bill Ref: ${generatedBillNumber}</div>
    <div>Generated On: ${currentDate}</div>
    <div>Page 1 of 1</div>
  </div>
</div>
<script>
  function changeLanguage(lang) {
    window.parent.postMessage({ type: 'CHANGE_LANGUAGE', language: lang }, '*');
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const langParam = urlParams.get('lang');
  if (langParam && ['en', 'hi', 'te'].includes(langParam)) {
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.textContent.includes(langParam === 'en' ? 'English' : langParam === 'hi' ? 'हिन्दी' : 'తెలుగు')) {
        btn.classList.add('active');
      }
    });
  }
  
  window.focus && window.focus();
</script>
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

  const handleDownloadBill = () => {
    const html = buildBillHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `Bill_${generatedBillNumber}_${customer?.name || 'customer'}.html`;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const handleShareBill = async () => {
    try {
      const html = buildBillHTML();
      const blob = new Blob([html], { type: 'text/html' });

      if (navigator.share && navigator.canShare) {
        const file = new File([blob], `Bill_${generatedBillNumber}_${customer?.name || 'customer'}.html`, { type: 'text/html' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Bill - ${customer?.name || 'Customer'} - ${generatedBillNumber}`,
            text: `Bill for ${customer?.name || 'Customer'} - Total: ₹${billTotal.toFixed(2)}`,
            files: [file]
          });
        } else {
          await navigator.share({
            title: `Bill - ${customer?.name || 'Customer'} - ${generatedBillNumber}`,
            text: `Bill for ${customer?.name || 'Customer'} - Total: ₹${billTotal.toFixed(2)}\nBill Number: ${generatedBillNumber}`
          });
        }
      } else {
        handleDownloadBill();
      }
    } catch (error) {
      handleDownloadBill();
    }
  };

  const handlePrintBill = () => {
    const html = buildBillHTML();
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();

    printWindow.onload = () => {
      printWindow.print();
      setTimeout(() => {
        printWindow.close();
      }, 100);
    };
  };

  React.useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = buildBillHTML();
    }
  }, [customer, PurchaseItems, totalAmount, paymentHistory, language, selectedItems, generatedBillNumber, invoiceIsPending]);

  React.useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'CHANGE_LANGUAGE') {
        setLanguage(event.data.language);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="modal-card">
      <div className="modal-card-header d-flex align-items-center justify-content-between">
        <h4 className="mb-0 text-info opacity-50">Bill Preview - {generatedBillNumber}</h4>
        <div className="d-flex gap-2 align-items-center">
          <div className="btn-group btn-group-sm">
            <button
              type="button"
              className={`btn ${language === 'en' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setLanguage('en')}
            >
              EN
            </button>
            <button
              type="button"
              className={`btn ${language === 'hi' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setLanguage('hi')}
            >
              HI
            </button>
            <button
              type="button"
              className={`btn ${language === 'te' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setLanguage('te')}
            >
              TE
            </button>
          </div>

          <button
            type="button"
            className="btn btn-outline-info btn-sm"
            onClick={handlePrintBill}
          >
            <i className="bi bi-printer me-1"></i>
            Print
          </button>
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={handleDownloadBill}
          >
            <i className="bi bi-download me-1"></i>
            Download Bill
          </button>
          <button
            type="button"
            className="btn btn-outline-success btn-sm"
            onClick={handleShareBill}
          >
            <i className="bi bi-share me-1"></i>
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
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-success btn-sm"
            onClick={handleShareToWhatsApp}
          >
            <i className="bi bi-whatsapp me-1"></i>
            Share to WhatsApp
          </button>
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={handleDownloadBill}
          >
            <i className="bi bi-download me-1"></i>
            Download
          </button>
        </div>
        <small className="text-muted">
          Bill: <strong className="text-primary">{generatedBillNumber}</strong> |
          Status: <strong className={invoiceIsPending ? 'text-warning' : 'text-success'}>
            {invoiceIsPending ? 'Pending' : 'Paid'}
          </strong> |
          Balance: <strong className="text-success">₹{paymentDetails.currentBalance.toFixed(2)}</strong>
        </small>
      </div>
    </div>
  );
};

export default ShareBill;