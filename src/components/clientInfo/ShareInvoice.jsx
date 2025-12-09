import React, { useRef, useState, useMemo, useEffect } from 'react';

const ShareInvoice = ({
    client,
    payments = [],
    billTitle = 'Client Invoice',
    billNumber = '',
    getTranslation
}) => {
    const iframeRef = useRef(null);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [showCustomInvoiceForm, setShowCustomInvoiceForm] = useState(false);
    const [invoiceHistory, setInvoiceHistory] = useState(() => {
        // Load from localStorage to persist history
        const savedHistory = localStorage.getItem(`invoiceHistory_${client?.idNo}`);
        return savedHistory ? JSON.parse(savedHistory) : [];
    });
    const [activeTab, setActiveTab] = useState('preview'); // 'preview' or 'history'
    const [invoiceCounter, setInvoiceCounter] = useState(() => {
        // Load counter from localStorage
        const savedCounter = localStorage.getItem(`invoiceCounter_${client?.idNo}`);
        return savedCounter ? parseInt(savedCounter) : 0;
    });

    const [invoiceData, setInvoiceData] = useState({
        serviceDate: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        invoiceAmount: '',
        gapIfAny: '',
        travelingCharges: '',
        extraCharges: '',
        remarks: '',
        additionalComments: '',
        serviceRemarks: '',
    });

    const headerImage = "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/Shop-Images%2FJenCeo-Trades.svg?alt=media&token=da7ab6ec-826f-41b2-ba2a-0a7d0f405997";
    const defaultCustomerPhoto = "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FSample-Photo.jpg?alt=media&token=01855b47-c9c2-490e-b400-05851192dde7";

    // Save history to localStorage whenever it changes
    useEffect(() => {
        if (client?.idNo) {
            localStorage.setItem(`invoiceHistory_${client.idNo}`, JSON.stringify(invoiceHistory));
        }
    }, [invoiceHistory, client]);

    // Save counter to localStorage whenever it changes
    useEffect(() => {
        if (client?.idNo) {
            localStorage.setItem(`invoiceCounter_${client.idNo}`, invoiceCounter.toString());
        }
    }, [invoiceCounter, client]);

    const handleOpenInvoice = () => {
        setShowInvoiceModal(true);
    };

    const calculateAutoFillDate = (serviceDate) => {
        if (!serviceDate) return '';
        const date = new Date(serviceDate);
        date.setDate(date.getDate() + 30);
        return date.toISOString().split('T')[0];
    };

    const saveInvoiceToHistory = () => {
        const newInvoice = {
            id: Date.now(),
            invoiceNumber: generatedInvoiceNumber,
            date: new Date().toISOString().split('T')[0],
            amount: parseFloat(invoiceData.invoiceAmount) || parseFloat(client?.serviceCharges) || 0,
            clientName: client?.clientName || '',
            clientId: client?.idNo || '',
            data: { ...invoiceData },
            paymentDetails: { ...paymentDetails }
        };

        setInvoiceHistory(prev => [newInvoice, ...prev]);
    };

    const handleApplyCustomInvoice = (formData) => {
        setInvoiceData(formData);
        setShowCustomInvoiceForm(false);

        setTimeout(() => {
            if (iframeRef.current) {
                iframeRef.current.srcdoc = buildInvoiceHTML();
            }
        }, 100);
    };

    const getPaymentDetails = () => {
        const validPayments = payments.filter(p => p && !p.__adjustment);
        const lastPayment = validPayments.length > 0 ? validPayments[validPayments.length - 1] : null;

        const totalPaid = validPayments.reduce((sum, payment) => {
            const amount = parseFloat(payment.paidAmount) || 0;
            return sum + amount;
        }, 0);

        const serviceCharges = parseFloat(client?.serviceCharges) || 0;
        const currentBalance = Math.max(0, serviceCharges - totalPaid);

        let nextPaymentDate = null;
        if (lastPayment && lastPayment.date) {
            try {
                const lastDate = new Date(lastPayment.date);
                lastDate.setDate(lastDate.getDate() + 30);
                nextPaymentDate = lastDate;
            } catch (e) {
                console.warn("Invalid last payment date:", lastPayment.date);
            }
        } else if (client?.startingDate) {
            try {
                const startDate = new Date(client.startingDate);
                startDate.setDate(startDate.getDate() + 30);
                nextPaymentDate = startDate;
            } catch (e) {
                console.warn("Invalid starting date:", client.startingDate);
            }
        }

        return {
            lastPayment: lastPayment ? {
                amount: parseFloat(lastPayment.paidAmount) || 0,
                date: lastPayment.date,
                method: lastPayment.paymentMethod || 'Cash'
            } : null,
            currentBalance: currentBalance,
            totalPaid: totalPaid,
            serviceCharges: serviceCharges,
            nextPaymentDate: nextPaymentDate,
            presentDate: new Date().toLocaleDateString('en-IN')
        };
    };

    const paymentDetails = getPaymentDetails();

    const generatedInvoiceNumber = useMemo(() => {
        if (billNumber) return billNumber;

        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = now.toLocaleString('en-US', { month: 'short' });
        const clientId = client?.idNo || '01';

        // Count invoices for this month to add index
        const currentMonthYear = `${month}-${year}`;
        const monthInvoices = invoiceHistory.filter(inv =>
            inv.invoiceNumber.includes(currentMonthYear)
        );
        const monthIndex = monthInvoices.length + 1;

        // Format: JC00062-Dec-25, JC00062-Dec-25-2, JC00062-Dec-25-3, etc.
        return `${clientId}-${month}-${year}${monthIndex > 1 ? `-${monthIndex}` : ''}`;
    }, [billNumber, client, invoiceHistory]);

    // Increment counter when a new invoice is saved
    useEffect(() => {
        if (invoiceHistory.length > 0) {
            const latestInvoice = invoiceHistory[0];
            if (latestInvoice && latestInvoice.invoiceNumber === generatedInvoiceNumber) {
                // Only increment if this is a brand new invoice (not from history)
                const currentMonthYear = new Date().toLocaleString('en-US', { month: 'short' }) + '-' + new Date().getFullYear().toString().slice(-2);
                const monthInvoices = invoiceHistory.filter(inv =>
                    inv.invoiceNumber.includes(currentMonthYear)
                );
                setInvoiceCounter(monthInvoices.length);
            }
        }
    }, [invoiceHistory, generatedInvoiceNumber]);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-IN');
        } catch (error) {
            return dateString;
        }
    };

    const buildClientBiodataTable = () => {
        const safe = (v, d = "—") => (v == null || v === "" ? d : String(v));
        const formatINR = (value) => {
            const n = Number(value || 0);
            if (!isFinite(n)) return "₹0";
            try {
                return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
            } catch {
                return "₹" + String(n);
            }
        };

        return `
            <div class="biodata-table-section" style="margin: 20px 0;">
                <h4 style="background: linear-gradient(135deg, #02acf2 0%, #0266f2 100%); color: white; padding: 12px 15px; margin: 0; font-size: 16px; border-radius: 5px 5px 0 0;">Client Details</h4>
                <div class="table-responsive" style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px; background: #f8f9fa; min-width: 600px;">
                        <tbody>
                            <!-- Basic Info -->
                            <tr style="background: #e9ecef;">
                                <td colspan="4" style="padding: 8px; font-weight: bold; border: 1px solid #dee2e6; color:#0266f2">Basic Information</td>
                            </tr>
                            <tr>
                                <td style="width: 25%; padding: 8px; border: 1px solid #dee2e6; font-weight: bold; background: #f1f3f4;">ID No</td>
                                <td style="width: 25%; padding: 8px; border: 1px solid #dee2e6;">${safe(client?.idNo)}</td>
                                <td style="width: 25%; padding: 8px; border: 1px solid #dee2e6; font-weight: bold; background: #f1f3f4;">Client Name</td>
                                <td style="width: 25%; padding: 8px; border: 1px solid #dee2e6;">${safe(client?.clientName)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold; background: #f1f3f4;">Mobile No 2</td>
                                <td style="padding: 8px; border: 1px solid #dee2e6;">${safe(client?.mobileNo2)}</td>
                                <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold; background: #f1f3f4;">Gender</td>
                                <td style="padding: 8px; border: 1px solid #dee2e6;">${safe(client?.gender)}</td>
                            </tr>
                            
                            <!-- Service Details -->
                            <tr style="background: #e9ecef;">
                                <td colspan="4" style="padding: 8px; font-weight: bold; border: 1px solid #dee2e6; color:#0266f2">Service Details</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold; background: #f1f3f4;">Type of Service</td>
                                <td style="padding: 8px; border: 1px solid #dee2e6;">${safe(client?.typeOfService)}</td>
                                <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold; background: #f1f3f4;">Service Charges</td>
                                <td style="padding: 8px; border: 1px solid #dee2e6; color:#0266f2"><strong>${formatINR(client?.serviceCharges)}</strong> for 30 Days</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold; background: #f1f3f4;">Starting Date</td>
                                <td style="padding: 8px; border: 1px solid #dee2e6;">${safe(client?.startingDate)}</td>
                                <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold; background: #f1f3f4;">Ending Date</td>
                                <td style="padding: 8px; border: 1px solid #dee2e6;">${safe(client?.endingDate)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold; background: #f1f3f4;">Service Status</td>
                                <td style="padding: 8px; border: 1px solid #dee2e6;">${safe(client?.serviceStatus)}</td>
                                <td style="padding: 8px; border: 1px solid #dee2e6; font-weight: bold; background: #f1f3f4;">Dropper Name</td>
                                <td style="padding: 8px; border: 1px solid #dee2e6;">${safe(client?.dropperName)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    };

    const formatINR = (value) => {
        const n = Number(value || 0);
        if (!isFinite(n)) return "₹0.00";
        try {
            return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } catch {
            return "₹" + n.toFixed(2);
        }
    };

    const formatAmount = (value) => {
        const n = Number(value || 0);
        if (!isFinite(n)) return "0.00";
        try {
            return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } catch {
            return n.toFixed(2);
        }
    };

    const buildInvoiceHTML = () => {
        const currentDate = new Date().toLocaleDateString('en-IN');
        const clientName = client?.clientName || 'Client';
        const clientId = client?.idNo || 'N/A';
        const clientLocation = client?.location || 'N/A';
        const clientMobile = client?.mobileNo1 || 'N/A';
        const serviceType = client?.typeOfService || 'N/A';
        const serviceCharges = client?.serviceCharges || '0';
        const startingDate = client?.startingDate ? formatDate(client.startingDate) : 'N/A';

        // Use custom invoice data if available
        const gapInfo = invoiceData.gapIfAny || client?.gapIfAny || 'None';
        const travelingCharges = invoiceData.travelingCharges ? formatINR(invoiceData.travelingCharges) : '₹0.00';
        const extraCharges = invoiceData.extraCharges ? formatINR(invoiceData.extraCharges) : '₹0.00';
        const serviceDate = invoiceData.serviceDate ? formatDate(invoiceData.serviceDate) : startingDate;
        const autoFillDate = invoiceData.serviceDate ? formatDate(calculateAutoFillDate(invoiceData.serviceDate)) : (client?.startingDate ? formatDate(calculateAutoFillDate(client.startingDate)) : 'N/A');
        const invoiceDate = invoiceData.invoiceDate ? formatDate(invoiceData.invoiceDate) : currentDate;

        // Calculate due amount
        const invoiceAmount = parseFloat(invoiceData.invoiceAmount) || parseFloat(client?.serviceCharges) || 0;
        const totalPaid = paymentDetails.totalPaid || 0;
        const dueAmount = Math.max(0, invoiceAmount - totalPaid);

        // Build payment summary HTML
        const paymentSummaryHTML = paymentDetails.lastPayment ? `
            <div class="payment-card last-payment">
                <div class="payment-label">Last Payment</div>
                <div class="payment-amount last-payment">${formatINR(paymentDetails.lastPayment.amount)}</div>
                <small class="muted">${paymentDetails.lastPayment.date ? formatDate(paymentDetails.lastPayment.date) : 'N/A'} • ${paymentDetails.lastPayment.method}</small>
            </div>
        ` : `
            <div class="payment-card last-payment">
                <div class="payment-label">Last Payment</div>
                <div class="payment-amount last-payment">₹0.00</div>
                <small class="muted">No payments recorded</small>
            </div>
        `;

        const html = `
<!doctype html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice - ${clientName}</title>
    <style>
        *{box-sizing:border-box}
        html,body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#111}
        .page{ max-width:900px; margin:auto;background:#fff;border:1px solid #e5e5e5;padding:15px}
        .header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-bottom:2px solid #b7b4b4; padding:15px; margin:0 -15px; background: linear-gradient(135deg, #c7d1f5 0%, #e3e8ff 100%); border-radius: 5px;}
        
        .h-left{flex:1; margin-top:15px}
        .title{font-size:32px;font-weight:700;letter-spacing:.4px;margin:0;background:linear-gradient(135deg, #02acf2 0%, #0266f2 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .subtitle{font-size:12px;color:#444;margin-top:2px; font-weight:900}
        .meta{font-size:11px;color:#555;margin-top:4px;}
        .meta div {margin: 8px 0}
        .sec{margin-top:14px;border:1px solid #ddd;border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.1)}
        .sec-title{background:linear-gradient(135deg, #02acf2 0%, #0266f2 100%); padding:10px;font-weight:700;color:white}
        .sec-title h3{margin:0;font-size:14px}
        .sec-body{padding:12px}
        
        /* Responsive tables */
        .table-responsive {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            margin: 10px 0;
        }
        
        .biodata-table-section table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            min-width: 600px;
        }
        
        .custom-invoice-section {
            background: #e3f1fdff;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 12px;
        }
        
        .custom-invoice-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 12px;
            margin-top: 8px;
        }
        
        .custom-invoice-item {
            padding: 8px;
            background: white;
            border-radius: 6px;
            border: 1px solid #e5e5e5;
            word-break: break-word;
        }
        
        .custom-invoice-label {
            font-weight: 600;
            font-size: 11px;
            color: #555;
            margin-bottom: 4px;
        }
        
        .custom-invoice-value {
            font-weight: 500;
            font-size: 12px;
            color: #333;
        }
        
        .muted{color:#777; font-size: 11px;}
        .footer{margin :15px -15px -15px -15px;font-size:10px; color:#fff;display:flex;justify-content:space-between; background:linear-gradient(135deg, #02acf2 0%, #0266f2 100%); padding:8px 15px}
        .blue {color:#02acf2}
        
        @media print{
            .page{border:none;margin:0;width:100%}
            .table-responsive {overflow: visible;}
        }
        
        .header-img{width:100%;max-height:100px;object-fit:contain;margin-bottom:6px}
        .photo-box{display:block;align-items:center;text-align:center}
        .photo-box .rating{background: #f5f5f5; padding: 3px; border-radius: 5px; font-size:12px}
        .photo-box img{width:100px;height:100px;object-fit:cover;border-radius:6px;border:1px solid #ccc}
        
        .payment-summary {
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 12px; 
            margin: 15px 0
        }
        
        .payment-card {
            background: white; 
            border-radius: 8px; 
            padding: 12px; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
            border-left: 4px solid
        }
        
        .payment-card.last-payment {border-left-color: #51cf66; background: linear-gradient(135deg, #f0fff4 0%, #e6f7ea 100%)}
        .payment-card.due-amount {border-left-color: #ff6b6b; background: linear-gradient(135deg, #fff5f5 0%, #ffecec 100%)}
        .payment-card.next-payment {border-left-color: #339af0; background: linear-gradient(135deg, #f0f8ff 0%, #e6f2ff 100%)}
        .payment-card.service-charges {border-left-color: #ff922b; background: linear-gradient(135deg, #fff4e6 0%, #ffebd6 100%)}
        .payment-card.total-paid {border-left-color: #cc5de8; background: linear-gradient(135deg, #f8f0fc 0%, #f3d9fa 100%)}
        
        .payment-label {font-size: 11px; color: #666; margin-bottom: 4px}
        .payment-amount {font-size: 16px; font-weight: bold}
        .payment-amount.last-payment {color: #51cf66}
        .payment-amount.due-amount {color: #ff6b6b}
        .payment-amount.next-payment {color: #339af0}
        .payment-amount.service-charges {color: #ff922b}
        .payment-amount.total-paid {color: #cc5de8}
        
        .biodata-table-section {
            margin: 15px 0;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .biodata-table-section h4 {
            background: linear-gradient(135deg, #02acf2 0%, #0266f2 100%);
            color: white;
            padding: 10px 12px;
            margin: 0;
            font-size: 14px;
        }
        
        .thank-you {
            text-align:center; 
            padding:15px; 
            background:linear-gradient(135deg, #e3fde7 0%, #d3f8e1ff 100%); 
            border-radius:8px; 
            margin:15px 0; 
            border: 1px solid #c6e5f1
        }
        
        .comments-section {
            margin-top: 15px; 
            padding: 12px; 
            background: #f9f9f9; 
            border-radius: 8px; 
            border-left: 4px solid #02acf2
        }
        
        .comments-title {
            font-weight: bold; 
            margin-bottom: 8px; 
            color: #333
        }
        
        .comments-content {
            font-size: 11px; 
            line-height: 1.5; 
            color: #555
        }
        
        /* Save button styles */
        .save-section {
            margin: 20px 0;
            text-align: center;
        }
        
        .save-button {
            background: linear-gradient(135deg, #02acf2 0%, #0266f2 100%);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .save-button:hover {
            background: linear-gradient(135deg, #0266f2 0%, #02acf2 100%);
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(2, 102, 242, 0.3);
        }
        
        .save-button:active {
            transform: translateY(0);
        }
        
        /* Mobile Responsive */
        @media only screen and (max-width: 767px) {
            .page { padding: 10px; }
            .header { 
                display: block; 
                padding: 10px; 
                margin: 0 -10px;
            }
            .header .h-left { 
                text-align: center; 
                margin-top: 10px; 
            }
            .title { font-size: 22px; }
            .photo-box img { 
                width: 80px; 
                height: 80px; 
                margin: 0 auto;
            }
            .payment-summary { grid-template-columns: 1fr; }
            .custom-invoice-grid { grid-template-columns: 1fr; }
            .meta div { margin: 4px 0; }
            .sec { margin-top: 10px; }
            .sec-body { padding: 10px; }
            .footer { 
                margin: 10px -10px -10px -10px; 
                padding: 6px 10px; 
                font-size: 9px;
                flex-direction: column;
                text-align: center;
                gap: 4px;
            }
            .footer div { margin: 2px 0; }
        }
        
        @media only screen and (max-width: 480px) {
            .title { font-size: 18px; }
            .photo-box img { 
                width: 70px; 
                height: 70px; 
            }
            .custom-invoice-item {
                padding: 6px;
            }
            .thank-you {
                padding: 10px;
            }
            .thank-you h3 {
                font-size: 16px;
            }
        }
    </style>
</head>
<body>
<div class="page">
    <div style="margin: -16px -15px 8px -15px"><img src="${headerImage}" alt="Header" style="width:100%; object-fit: contain;" /></div>
    
    <div class="header">
        <div class="h-left">
            <h1 class="title">SERVICE INVOICE</h1>
            <div class="subtitle">JenCeo Home Care Services & Traders</div>
            <div class="meta">
                <div><strong>Invoice Date:</strong> ${invoiceDate}</div>
                <div><strong>Invoice Number:</strong> ${generatedInvoiceNumber}</div>
                <div><strong>Client ID:</strong> ${clientId}</div>
            </div>
        </div>
        <div class="photo-box">
            <img src="${defaultCustomerPhoto}" alt="Client" />
            <div class="rating" style="margin-top: 8px; padding:4px">
                Mr / Mrs / Kum. <strong>${clientName}</strong>
            </div>
        </div>
    </div>
    
    ${buildClientBiodataTable()}
    
    <div class="sec">
        <div class="sec-title"><h3>Payment Summary</h3></div>
        <div class="sec-body">
            <div class="payment-summary">
                ${paymentSummaryHTML}
                
                <div class="payment-card next-payment">
                    <div class="payment-label">Next Payment Due</div>
                    <div class="payment-amount next-payment">${paymentDetails.nextPaymentDate ? formatDate(paymentDetails.nextPaymentDate.toISOString()) : 'N/A'}</div>
                    <small class="muted">Every 30 days Cycle</small>
                </div>
            </div>
        </div>
    </div>

    <div class="sec">
        <div class="sec-title"><h3>Current Invoice Details <strong>from ${serviceDate} to ${autoFillDate}</strong></h3></div>
        <div class="sec-body">
            <div class="custom-invoice-section">
                <div class="custom-invoice-grid">
                    <div class="custom-invoice-item">
                        <div class="custom-invoice-label">Service Start Date</div>
                        <div class="custom-invoice-value">${serviceDate}</div>
                    </div>
                    <div class="custom-invoice-item">
                        <div class="custom-invoice-label">30 days End Date</div>
                        <div class="custom-invoice-value">${autoFillDate}</div>
                    </div>
                    <div class="custom-invoice-item">
                        <div class="custom-invoice-label">Invoice Date</div>
                        <div class="custom-invoice-value">${invoiceDate}</div>
                    </div>
                    <div class="custom-invoice-item">
                        <div class="custom-invoice-label">Invoice Amount</div>
                        <div class="custom-invoice-value" style="color: red; font-weight: bold;">${formatINR(invoiceAmount)}</div>
                    </div>
                    <div class="custom-invoice-item">
                        <div class="custom-invoice-label">Gap if Any</div>
                        <div class="custom-invoice-value">${gapInfo}</div>
                    </div>
                    <div class="custom-invoice-item">
                        <div class="custom-invoice-label">Traveling Charges</div>
                        <div class="custom-invoice-value" style="color: #0266f2;">${travelingCharges}</div>
                    </div>
                    <div class="custom-invoice-item">
                        <div class="custom-invoice-label">Extra Charges</div>
                        <div class="custom-invoice-value" style="color: #0266f2;">${extraCharges}</div>
                    </div>
                </div>
                ${invoiceData.remarks ? `
                <div style="margin-top: 12px; padding: 8px; background: white; border-radius: 6px; border: 1px solid #e5e5e5;">
                    <div style="font-weight: 600; font-size: 11px; color: #555; margin-bottom: 4px;">Remarks</div>
                    <div style="font-size: 12px; color: #333;">${invoiceData.remarks}</div>
                </div>
                ` : ''}
            </div>
        </div>
    </div>

    ${invoiceData.additionalComments ? `
    <div class="sec">
        <div class="sec-title"><h3>Additional Comments</h3></div>
        <div class="sec-body">
            <div class="comments-section">
                <div class="comments-content">${invoiceData.additionalComments}</div>
            </div>
        </div>
    </div>
    ` : ''}

    <div class="thank-you">
        <h3 style="color:#02acf2; margin-bottom:8px; font-size: 18px;">Thank You for Your Trust!</h3>
        <p style="margin:0; font-size: 12px;">Dear <strong>${clientName}</strong> (ID: ${clientId}),</p>
        <p style="margin:5px 0; font-size: 12px;">We appreciate your trust in our <strong>${serviceType}</strong> services and look forward to continuing to serve you.</p>
        <p style="margin:5px 0 0 0; font-size: 14px;"><strong>JenCeo Home Care & Traders</strong></p>
        <p style="margin:0; font-size:10px; color:#666">Quality Service | Trusted Care | Client Satisfaction</p>
    </div>

 

    <div class="footer">
        <div>Invoice Ref: ${generatedInvoiceNumber}</div>
        <div>Generated On: ${currentDate}</div>
        <div>Page 1 of 1</div>
    </div>
</div>
</body>
</html>
`;

        return html;
    };

    const handleDownloadInvoice = () => {
        saveInvoiceToHistory();
        const html = buildInvoiceHTML();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice_${generatedInvoiceNumber}_${client?.clientName || 'client'}.html`;
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    };

    const handleShareInvoice = async () => {
        try {
            saveInvoiceToHistory();
            const html = buildInvoiceHTML();
            const blob = new Blob([html], { type: 'text/html' });

            if (navigator.share && navigator.canShare) {
                const file = new File([blob], `Invoice_${generatedInvoiceNumber}_${client?.clientName || 'client'}.html`, { type: 'text/html' });

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: `Invoice - ${client?.clientName || 'Client'} - ${generatedInvoiceNumber}`,
                        text: `Invoice for ${client?.clientName || 'Client'} - Invoice Amount: ₹${formatAmount(invoiceData.invoiceAmount || client?.serviceCharges || 0)} - Due: ₹${formatAmount(paymentDetails.currentBalance || 0)}`,
                        files: [file]
                    });
                } else {
                    await navigator.share({
                        title: `Invoice - ${client?.clientName || 'Client'} - ${generatedInvoiceNumber}`,
                        text: `Invoice for ${client?.clientName || 'Client'} - Invoice Amount: ₹${formatAmount(invoiceData.invoiceAmount || client?.serviceCharges || 0)} - Due: ₹${formatAmount(paymentDetails.currentBalance || 0)}\nInvoice Number: ${generatedInvoiceNumber}`
                    });
                }
            } else {
                handleDownloadInvoice();
            }
        } catch (error) {
            handleDownloadInvoice();
        }
    };

    const handlePrintInvoice = () => {
        saveInvoiceToHistory();
        const html = buildInvoiceHTML();
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

    const handleShareToWhatsApp = () => {
        saveInvoiceToHistory();
        const invoiceAmount = parseFloat(invoiceData.invoiceAmount) || parseFloat(client?.serviceCharges) || 0;
        const totalPaid = paymentDetails.totalPaid || 0;
        const dueAmount = Math.max(0, invoiceAmount - totalPaid);

        const message = `*Invoice Details*\n\n` +
            `*Client:* ${client?.clientName || 'N/A'}\n` +
            `*Invoice Number:* ${generatedInvoiceNumber}\n` +
            `*Invoice Amount:* ₹${formatAmount(invoiceAmount)}\n` +
            `*Total Paid:* ₹${formatAmount(totalPaid)}\n` +
            `*Due Amount:* ₹${formatAmount(dueAmount)}\n` +
            `*Last Payment:* ${paymentDetails.lastPayment ? `₹${formatAmount(paymentDetails.lastPayment.amount)} on ${formatDate(paymentDetails.lastPayment.date)}` : 'No payments'}\n` +
            `*Next Payment Due:* ${paymentDetails.nextPaymentDate ? formatDate(paymentDetails.nextPaymentDate.toISOString()) : 'N/A'}\n` +
            `*Generated Date:* ${new Date().toLocaleDateString()}\n\n` +
            `Thank you for your trust in our services!`;

        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;

        window.open(whatsappUrl, '_blank');
    };

    // Handle message from iframe for saving invoice
    useEffect(() => {
        const handleMessage = (event) => {
            if (event.data.type === 'SAVE_INVOICE') {
                saveInvoiceToHistory();
            }
        };

        window.addEventListener('message', handleMessage);
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [saveInvoiceToHistory]);

    // Initialize iframe content when modal opens or invoiceData changes
    useEffect(() => {
        if (showInvoiceModal && iframeRef.current) {
            iframeRef.current.srcdoc = buildInvoiceHTML();
        }
    }, [showInvoiceModal, invoiceData]);

    // Custom Invoice Form Component
    const CustomInvoiceForm = ({ invoiceData, onApply, onClose }) => {
        const [formData, setFormData] = useState(invoiceData);

        useEffect(() => {
            setFormData(invoiceData);
        }, [invoiceData]);

        const handleServiceDateChange = (e) => {
            const serviceDate = e.target.value;
            const autoFillDate = calculateAutoFillDate(serviceDate);

            setFormData(prev => ({
                ...prev,
                serviceDate,
                autoFillDate
            }));
        };

        const handleInputChange = (e) => {
            const { name, value } = e.target;
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        };

        const handleApply = () => {
            onApply(formData);
        };

        const calculateFormAutoFillDate = () => {
            return formData.serviceDate ? calculateAutoFillDate(formData.serviceDate) : '';
        };

        return (
            <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 1060 }}>
                <div className="modal-dialog modal-lg modal-dialog-centered">
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header bg-primary text-white">
                            <h5 className="modal-title">Custom Invoice Details</h5>
                            <button
                                type="button"
                                className="btn-close btn-close-white"
                                onClick={onClose}
                            />
                        </div>
                        <div className="modal-body">
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="form-label"><strong>Service Date</strong></label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        name="serviceDate"
                                        value={formData.serviceDate}
                                        onChange={handleServiceDateChange}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label"><strong>Auto-fill (30 days from Service Date)</strong></label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={calculateFormAutoFillDate()}
                                        disabled
                                        readOnly
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label"><strong>Invoice Date</strong></label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        name="invoiceDate"
                                        value={formData.invoiceDate}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label"><strong>Invoice Amount (₹)</strong></label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        name="invoiceAmount"
                                        value={formData.invoiceAmount}
                                        onChange={handleInputChange}
                                        placeholder="Enter invoice amount"
                                        step="0.01"
                                        min="0"
                                    />
                                    <small className="form-text text-danger">
                                        Default: ₹{formatAmount(parseFloat(client?.serviceCharges) || 0)}
                                    </small>
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label"><strong>Gap if any</strong></label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="gapIfAny"
                                        value={formData.gapIfAny}
                                        onChange={handleInputChange}
                                        placeholder="Enter any service gaps..."
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label"><strong>Traveling Charges (₹)</strong></label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        name="travelingCharges"
                                        value={formData.travelingCharges}
                                        onChange={handleInputChange}
                                        placeholder="₹0.00"
                                        step="0.01"
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label"><strong>Extra Charges (₹)</strong></label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        name="extraCharges"
                                        value={formData.extraCharges}
                                        onChange={handleInputChange}
                                        placeholder="₹0.00"
                                        step="0.01"
                                    />
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label"><strong>Additional Comments</strong></label>
                                    <textarea
                                        className="form-control"
                                        rows="3"
                                        name="additionalComments"
                                        value={formData.additionalComments}
                                        onChange={handleInputChange}
                                        placeholder="Enter any additional comments or notes..."
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label"><strong>Remarks</strong></label>
                                    <textarea
                                        className="form-control"
                                        rows="3"
                                        name="remarks"
                                        value={formData.remarks}
                                        onChange={handleInputChange}
                                        placeholder="Enter remarks..."
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={onClose}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleApply}
                            >
                                Apply to Invoice
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Invoice History Table Component
    const InvoiceHistoryTable = () => (
        <div className="invoice-history-table p-3">
            <h5 className="mb-3">Invoice History ({invoiceHistory.length})</h5>
            <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <table className="table table-sm table-hover" style={{ fontSize: '12px' }}>
                    <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                        <tr>
                            <th>Invoice #</th>
                            <th>Date</th>
                            <th>Client</th>
                            <th>Amount</th>
                            <th>Service Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoiceHistory.map((invoice) => (
                            <tr key={invoice.id}>
                                <td><strong>{invoice.invoiceNumber}</strong></td>
                                <td>{formatDate(invoice.date)}</td>
                                <td>{invoice.clientName}</td>
                                <td className="text-success">₹{formatAmount(invoice.amount)}</td>
                                <td>{formatDate(invoice.data.serviceDate)}</td>
                                <td>
                                    <button
                                        className="btn btn-sm btn-outline-primary me-1"
                                        onClick={() => {
                                            setInvoiceData(invoice.data);
                                            setActiveTab('preview');
                                            // Force rebuild of iframe with the selected invoice data
                                            setTimeout(() => {
                                                if (iframeRef.current) {
                                                    iframeRef.current.srcdoc = buildInvoiceHTML();
                                                }
                                            }, 100);
                                        }}
                                    >
                                        View
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {invoiceHistory.length === 0 && (
                            <tr>
                                <td colSpan="6" className="text-center text-muted py-4">
                                    <i className="bi bi-receipt me-2"></i>
                                    No invoices generated yet
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    if (!showInvoiceModal) {
        return (
            <div className="text-center p-4">
                <h5 className="mb-3">Invoice Generation</h5>
                <p className="text-muted mb-4">Generate and share invoice for this client</p>
                <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    onClick={handleOpenInvoice}
                >
                    <i className="bi bi-receipt me-2"></i>
                    Generate Invoice
                </button>
            </div>
        );
    }

    return (
        <>
            {showCustomInvoiceForm && (
                <CustomInvoiceForm
                    invoiceData={invoiceData}
                    onApply={handleApplyCustomInvoice}
                    onClose={() => setShowCustomInvoiceForm(false)}
                />
            )}

            <div className="modal-card">
                <div className="mb-3">
                    <h4 className="text-info">Invoice - {generatedInvoiceNumber}</h4>
                    <div className="d-flex gap-2 align-items-center">
                        <button
                            type="button"
                            className="btn btn-warning btn-sm"
                            onClick={() => setShowCustomInvoiceForm(true)}
                        >
                            <i className="bi bi-pencil-square me-1"></i>
                            Custom Invoice
                        </button>

                        <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            onClick={handleDownloadInvoice}
                        >
                            <i className="bi bi-download me-1"></i>
                            Download
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline-success btn-sm"
                            onClick={handleShareInvoice}
                        >
                            <i className="bi bi-share me-1"></i>
                            Share
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => setShowInvoiceModal(false)}
                        >
                            <i className="bi bi-x me-1"></i>
                            Close
                        </button>
                    </div>
                </div>

                {/* Tabs for Preview and History */}
                <div className="border-bottom">
                    <ul className="nav nav-tabs">
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'preview' ? 'active' : ''}`}
                                onClick={() => setActiveTab('preview')}
                            >
                                <i className="bi bi-eye me-1"></i>
                                Preview
                            </button>
                        </li>
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'history' ? 'active' : ''}`}
                                onClick={() => setActiveTab('history')}
                            >
                                <i className="bi bi-clock-history me-1"></i>
                                History ({invoiceHistory.length})
                            </button>
                        </li>
                    </ul>
                </div>

                <div className="modal-card-body bill-wrapper">
                    {activeTab === 'preview' ? (
                        <>
                            <iframe
                                ref={iframeRef}
                                title="Invoice Preview"
                                style={{
                                    width: "100%",
                                    height: "650px",
                                    border: "1px solid #e5e5e5",
                                    borderRadius: 8,
                                    background: "white"
                                }}
                            />
                            <div className="mt-3 text-center">
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={saveInvoiceToHistory}
                                >
                                    <i className="bi bi-save me-1"></i>
                                    Save Invoice to History
                                </button>
                            </div>
                        </>
                    ) : (
                        <InvoiceHistoryTable />
                    )}
                </div>
            </div>
        </>
    );
};

export default ShareInvoice;