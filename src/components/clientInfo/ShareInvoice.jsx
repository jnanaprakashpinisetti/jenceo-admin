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
    const [deletedInvoices, setDeletedInvoices] = useState(() => {
        // Load deleted invoices from localStorage
        const savedDeleted = localStorage.getItem(`deletedInvoices_${client?.idNo}`);
        return savedDeleted ? JSON.parse(savedDeleted) : [];
    });
    const [activeTab, setActiveTab] = useState('preview'); // 'preview', 'history', or 'deleted'
    const [invoiceCounter, setInvoiceCounter] = useState(() => {
        // Load counter from localStorage
        const savedCounter = localStorage.getItem(`invoiceCounter_${client?.idNo}`);
        return savedCounter ? parseInt(savedCounter) : 0;
    });
    const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState(null);
    const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
    const [invoiceToRestore, setInvoiceToRestore] = useState(null);

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
        nextPaymentDate: '' // NEW: Custom next payment date
    });

    const [isEditingExisting, setIsEditingExisting] = useState(false);
    const [editingInvoiceId, setEditingInvoiceId] = useState(null);

    const headerImage = "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/Shop-Images%2FJenCeo-Trades.svg?alt=media&token=da7ab6ec-826f-41b2-ba2a-0a7d0f405997";
    const defaultCustomerPhoto = "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FSample-Photo.jpg?alt=media&token=01855b47-c9c2-490e-b400-05851192dde7";

    // Save history to localStorage whenever it changes
    useEffect(() => {
        if (client?.idNo) {
            localStorage.setItem(`invoiceHistory_${client.idNo}`, JSON.stringify(invoiceHistory));
            localStorage.setItem(`deletedInvoices_${client.idNo}`, JSON.stringify(deletedInvoices));
        }
    }, [invoiceHistory, deletedInvoices, client]);

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
        date.setDate(date.getDate() + 29);
        return date.toISOString().split('T')[0];
    };

    const calculateTotalAmount = (data) => {
        const invoiceAmount = parseFloat(data.invoiceAmount) || parseFloat(client?.serviceCharges) || 0;
        const travelingCharges = parseFloat(data.travelingCharges) || 0;
        const extraCharges = parseFloat(data.extraCharges) || 0;
        return invoiceAmount + travelingCharges + extraCharges;
    };

    const isDuplicateInvoice = (invoiceData) => {
        // Only check for duplicate based on service date
        if (!invoiceData.serviceDate) return false;
        
        return invoiceHistory.some(invoice => {
            return invoice.data.serviceDate === invoiceData.serviceDate &&
                   invoice.clientId === client?.idNo &&
                   invoice.id !== editingInvoiceId; // Exclude current invoice being edited
        });
    };

    const findExistingInvoiceByServiceDate = (serviceDate) => {
        if (!serviceDate) return null;
        return invoiceHistory.find(invoice => 
            invoice.data.serviceDate === serviceDate && 
            invoice.clientId === client?.idNo
        );
    };

    const saveInvoiceToHistory = () => {
        const totalAmount = calculateTotalAmount(invoiceData);
        
        // Check if we're editing an existing invoice
        if (isEditingExisting && editingInvoiceId) {
            // Update existing invoice
            setInvoiceHistory(prev => prev.map(invoice => {
                if (invoice.id === editingInvoiceId) {
                    const updatedInvoice = {
                        ...invoice,
                        amount: totalAmount,
                        data: { ...invoiceData },
                        paymentDetails: { ...paymentDetails },
                        updatedAt: new Date().toISOString().split('T')[0]
                    };
                    return updatedInvoice;
                }
                return invoice;
            }));
            
            setSaveMessage({
                type: 'success',
                text: 'Invoice updated successfully!'
            });
            setTimeout(() => setSaveMessage({ type: '', text: '' }), 3000);
            
            // Refresh the preview after update
            setTimeout(() => {
                if (iframeRef.current) {
                    iframeRef.current.srcdoc = buildInvoiceHTML();
                }
            }, 100);
            
            return;
        }

        // Check for duplicate invoice based only on service date
        if (isDuplicateInvoice(invoiceData)) {
            setSaveMessage({
                type: 'error',
                text: `Invoice with service date ${formatDate(invoiceData.serviceDate)} already exists! Update existing invoice instead.`
            });
            setTimeout(() => setSaveMessage({ type: '', text: '' }), 5000);
            return;
        }

        const newInvoice = {
            id: Date.now(),
            invoiceNumber: generatedInvoiceNumber,
            date: new Date().toISOString().split('T')[0],
            amount: totalAmount,
            clientName: client?.clientName || '',
            clientId: client?.idNo || '',
            data: { ...invoiceData },
            paymentDetails: { ...paymentDetails },
            createdAt: new Date().toISOString().split('T')[0],
            updatedAt: new Date().toISOString().split('T')[0],
            isDeleted: false,
            deletedAt: null,
            deletedBy: null
        };

        setInvoiceHistory(prev => [newInvoice, ...prev]);
        
        setSaveMessage({
            type: 'success',
            text: 'Invoice saved successfully to history!'
        });
        
        setTimeout(() => setSaveMessage({ type: '', text: '' }), 5000);
    };

    const handleApplyCustomInvoice = (formData) => {
        const existingInvoice = findExistingInvoiceByServiceDate(formData.serviceDate);
        
        if (existingInvoice) {
            setIsEditingExisting(true);
            setEditingInvoiceId(existingInvoice.id);
            // Keep the original invoice number when editing
            setInvoiceData(formData);
        } else {
            setIsEditingExisting(false);
            setEditingInvoiceId(null);
            setInvoiceData(formData);
        }
        
        setShowCustomInvoiceForm(false);

        // Immediately update the preview
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
                lastDate.setDate(lastDate.getDate() + 29);
                nextPaymentDate = lastDate;
            } catch (e) {
                console.warn("Invalid last payment date:", lastPayment.date);
            }
        } else if (client?.startingDate) {
            try {
                const startDate = new Date(client.startingDate);
                startDate.setDate(startDate.getDate() + 29);
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
        if (isEditingExisting && editingInvoiceId) {
            // Keep original invoice number when editing
            const existingInvoice = invoiceHistory.find(inv => inv.id === editingInvoiceId);
            if (existingInvoice) return existingInvoice.invoiceNumber;
        }

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
    }, [billNumber, client, invoiceHistory, isEditingExisting, editingInvoiceId]);

    // Increment counter when a new invoice is saved
    useEffect(() => {
        if (invoiceHistory.length > 0 && !isEditingExisting) {
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
    }, [invoiceHistory, generatedInvoiceNumber, isEditingExisting]);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-IN');
        } catch (error) {
            return dateString;
        }
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
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
            <div class="biodata-section" style="margin: 20px 0;">
                <h4 style="background: linear-gradient(135deg, #02acf2 0%, #0266f2 100%); color: white; padding: 12px 15px; margin: 0; font-size: 16px; border-radius: 5px 5px 0 0;">Client Details</h4>
                <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-top: none; border-radius: 0 0 5px 5px; padding: 15px;">
                    
                    <!-- Basic Information Section -->
                    <div class="section-header" style="background: #e9ecef; padding: 8px 12px; margin: -15px -15px 12px -15px; font-weight: bold; color: #0266f2; border-bottom: 1px solid #dee2e6;">
                        Basic Information
                    </div>
                    
                    <div class="grid-layout" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px; margin-bottom: 20px;">
                        <div class="info-item" style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #e5e5e5;">
                            <div style="font-size: 11px; color: #666; margin-bottom: 4px;">ID No</div>
                            <div style="font-weight: bold; color: #333;">${safe(client?.idNo)}</div>
                        </div>
                        <div class="info-item" style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #e5e5e5;">
                            <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Client Name</div>
                            <div style="font-weight: bold; color: #333;">${safe(client?.clientName)} Gaaru</div>
                        </div>
                        <div class="info-item" style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #e5e5e5;">
                            <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Gender</div>
                            <div style="font-weight: bold; color: #333;">${safe(client?.gender)}</div>
                        </div>

                        <div class="info-item" style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #e5e5e5;">
                            <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Mobile No 1</div>
                            <div style="font-weight: bold; color: #333;">${safe(client?.mobileNo1)}</div>
                        </div>
                        <div class="info-item" style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #e5e5e5;">
                            <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Mobile No 2</div>
                            <div style="font-weight: bold; color: #333;">${safe(client?.mobileNo2)}</div>
                        </div>

                           <div class="info-item" style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #e5e5e5;">
                            <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Location</div>
                            <div style="font-weight: bold; color: #333;">${safe(client?.location)}</div>
                        </div>
                  
                    </div>
                    
                    <!-- Service Details Section -->
                    <div class="section-header" style="background: #e9ecef; padding: 8px 12px; margin: 0 -15px 12px -15px; font-weight: bold; color: #0266f2; border-bottom: 1px solid #dee2e6;">
                        Service Details
                    </div>
                    
                    <div class="grid-layout" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px;">
                        <div class="info-item" style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #e5e5e5;">
                            <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Type of Service</div>
                            <div style="font-weight: bold; color: #333;">${safe(client?.typeOfService)}</div>
                        </div>
                        <div class="info-item" style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #e5e5e5; background: linear-gradient(135deg, #f0f8ff 0%, #e6f2ff 100%);">
                            <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Service Charges</div>
                            <div style="font-weight: bold; color: #0266f2; font-size: 14px;">${formatINR(client?.serviceCharges)} <span style="font-size: 10px; color: #666;">for 30 Days</span></div>
                        </div>
                        <div class="info-item" style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #e5e5e5;">
                            <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Starting Date</div>
                            <div style="font-weight: bold; color: #333;">${safe(client?.startingDate)}</div>
                        </div>
                        <div class="info-item" style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #e5e5e5;">
                            <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Ending Date</div>
                            <div style="font-weight: bold; color: #333;">${safe(client?.endingDate)}</div>
                        </div>
                        <div class="info-item" style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #e5e5e5;">
                            <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Service Status</div>
                            <div style="font-weight: bold; color: #333; text-transform: capitalize;">${safe(client?.serviceStatus)}</div>
                        </div>
                        <div class="info-item" style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #e5e5e5;">
                            <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Dropper Name</div>
                            <div style="font-weight: bold; color: #333;">${safe(client?.dropperName)}</div>
                        </div>
                    </div>
                    
                </div>
                
                <style>
                    @media (max-width: 768px) {
                        .grid-layout {
                            grid-template-columns: 1fr !important;
                        }
                        .info-item {
                            margin-bottom: 8px;
                        }
                        .biodata-section {
                            margin: 15px 0 !important;
                        }
                    }
                    @media (max-width: 480px) {
                        .info-item {
                            padding: 8px !important;
                        }
                    }
                </style>
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
        const patentName = client?.patientName || 'N/A';
        const serviceCharges = client?.serviceCharges || '0';
        const startingDate = client?.startingDate ? formatDate(client.startingDate) : 'N/A';

        // Use custom invoice data if available
        const gapInfo = invoiceData.gapIfAny || client?.gapIfAny || 'None';
        const travelingCharges = parseFloat(invoiceData.travelingCharges) || 0;
        const extraCharges = parseFloat(invoiceData.extraCharges) || 0;
        const serviceDate = invoiceData.serviceDate ? formatDate(invoiceData.serviceDate) : startingDate;
        const autoFillDate = invoiceData.serviceDate ? formatDate(calculateAutoFillDate(invoiceData.serviceDate)) : (client?.startingDate ? formatDate(calculateAutoFillDate(client.startingDate)) : 'N/A');
        const invoiceDate = invoiceData.invoiceDate ? formatDate(invoiceData.invoiceDate) : currentDate;
        const invoiceAmount = parseFloat(invoiceData.invoiceAmount) || parseFloat(client?.serviceCharges) || 0;
        
        // Calculate total amount (Invoice Amount + Traveling Charges + Extra Charges)
        const totalAmount = calculateTotalAmount(invoiceData);
        
        const totalPaid = paymentDetails.totalPaid || 0;
        const dueAmount = Math.max(0, totalAmount - totalPaid);
        
        // Use custom next payment date if provided, otherwise use calculated one
        const nextPaymentDate = invoiceData.nextPaymentDate ? formatDate(invoiceData.nextPaymentDate) : 
                               (paymentDetails.nextPaymentDate ? formatDate(paymentDetails.nextPaymentDate.toISOString()) : 'N/A');

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
        
        .biodata-section {
            margin: 15px 0;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            overflow: hidden;
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
        
        /* Total amount section */
        .total-amount-section {
            margin-top: 15px;
            padding: 15px;
            background: linear-gradient(135deg, #fff5f5 0%, #ffecec 100%);
            border-radius: 8px;
            border: 2px solid #ff6b6b;
        }
        
        .total-amount-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        
        .total-item {
            padding: 10px;
            background: white;
            border-radius: 6px;
            text-align: center;
        }
        
        .total-label {
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
        }
        
        .total-value {
            font-size: 18px;
            font-weight: bold;
        }
        
        .grand-total {
            font-size: 22px;
            font-weight: bold;
            color: #ff6b6b;
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
        
        .invoice-status {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
        }
        
        .status-editing {
            background: #fff3cd;
            color: #856404;
        }
        
        .status-new {
            background: #d4edda;
            color: #155724;
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
            .total-amount-grid { grid-template-columns: 1fr; }
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
            .total-item {
                padding: 8px;
            }
            .grand-total {
                font-size: 18px;
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
                <div><strong>Invoice Number:</strong> ${generatedInvoiceNumber} 
                    ${isEditingExisting ? '<span class="invoice-status status-editing" style="margin-left: 8px;">EDITING</span>' : ''}
                </div>
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
                    <div class="payment-amount next-payment">${nextPaymentDate}</div>
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
                        <div class="custom-invoice-value" style="color: #0266f2; font-weight: bold;">${formatINR(invoiceAmount)}</div>
                    </div>
                    <div class="custom-invoice-item">
                        <div class="custom-invoice-label">Gap if Any</div>
                        <div class="custom-invoice-value">${gapInfo}</div>
                    </div>
                    <div class="custom-invoice-item">
                        <div class="custom-invoice-label">Traveling Charges</div>
                        <div class="custom-invoice-value" style="color: #0266f2;">${formatINR(travelingCharges)}</div>
                    </div>
                    <div class="custom-invoice-item">
                        <div class="custom-invoice-label">Extra Charges</div>
                        <div class="custom-invoice-value" style="color: #0266f2;">${formatINR(extraCharges)}</div>
                    </div>
                    <div class="custom-invoice-item">
                        <div class="total-label">Grand Total</div>
                        <div class="total-value grand-total">${formatINR(totalAmount)}</div>
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
        <p style="margin:0; font-size: 12px;">Dear <strong>${clientName}</strong> Gaaru</p>
        <p style="margin:5px 0; font-size: 12px;">It was our privilege to support you during this time for <strong>${patentName}, (${serviceType})</strong></p>
        <p style="margin:5px 0; font-size: 12px;">We wholeheartedly wish you a complete recovery and pray to God for your good health, strength, and a peaceful, happy family life.</p>
        <p style="margin:5px 0 0 0; font-size: 14px;"><strong>JenCeo Home Care & Management</strong></p>
        <p style="margin:0; font-size:10px; color:#02acf2; margin-top:10px">Quality Service | Trusted Care | Client Satisfaction</p>
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
        const travelingCharges = parseFloat(invoiceData.travelingCharges) || 0;
        const extraCharges = parseFloat(invoiceData.extraCharges) || 0;
        const totalAmount = calculateTotalAmount(invoiceData);
        const totalPaid = paymentDetails.totalPaid || 0;
        const dueAmount = Math.max(0, totalAmount - totalPaid);

        const message = `*Invoice Details*\n\n` +
            `*Client:* ${client?.clientName || 'N/A'}\n` +
            `*Invoice Number:* ${generatedInvoiceNumber}\n` +
            `*Service Date:* ${formatDate(invoiceData.serviceDate)}\n` +
            `*Invoice Amount:* ₹${formatAmount(invoiceAmount)}\n` +
            `*Traveling Charges:* ₹${formatAmount(travelingCharges)}\n` +
            `*Extra Charges:* ₹${formatAmount(extraCharges)}\n` +
            `*Total Amount:* ₹${formatAmount(totalAmount)}\n` +
            `*Total Paid:* ₹${formatAmount(totalPaid)}\n` +
            `*Due Amount:* ₹${formatAmount(dueAmount)}\n` +
            `*Last Payment:* ${paymentDetails.lastPayment ? `₹${formatAmount(paymentDetails.lastPayment.amount)} on ${formatDate(paymentDetails.lastPayment.date)}` : 'No payments'}\n` +
            `*Next Payment Due:* ${invoiceData.nextPaymentDate ? formatDate(invoiceData.nextPaymentDate) : (paymentDetails.nextPaymentDate ? formatDate(paymentDetails.nextPaymentDate.toISOString()) : 'N/A')}\n` +
            `*Generated Date:* ${new Date().toLocaleDateString()}\n\n` +
            `Thank you for your trust in our services!`;

        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;

        window.open(whatsappUrl, '_blank');
    };

    // Handle delete invoice with confirmation
    const handleDeleteInvoice = (invoice) => {
        setInvoiceToDelete(invoice);
        setShowDeleteConfirm(true);
    };

    // Confirm delete invoice
    const confirmDeleteInvoice = () => {
        if (invoiceToDelete) {
            // Perform soft delete
            const updatedInvoice = {
                ...invoiceToDelete,
                isDeleted: true,
                deletedAt: new Date().toISOString(),
                deletedBy: 'User'
            };

            // Remove from history and add to deleted invoices
            setInvoiceHistory(prev => prev.filter(inv => inv.id !== invoiceToDelete.id));
            setDeletedInvoices(prev => [updatedInvoice, ...prev]);

            setSaveMessage({
                type: 'success',
                text: `Invoice #${invoiceToDelete.invoiceNumber} moved to deleted invoices.`
            });
            setTimeout(() => setSaveMessage({ type: '', text: '' }), 5000);
        }
        
        setShowDeleteConfirm(false);
        setInvoiceToDelete(null);
    };

    // Handle restore invoice with confirmation
    const handleRestoreInvoice = (invoice) => {
        setInvoiceToRestore(invoice);
        setShowRestoreConfirm(true);
    };

    // Confirm restore invoice
    const confirmRestoreInvoice = () => {
        if (invoiceToRestore) {
            // Perform restore
            const restoredInvoice = {
                ...invoiceToRestore,
                isDeleted: false,
                deletedAt: null,
                deletedBy: null
            };

            // Remove from deleted and add back to history
            setDeletedInvoices(prev => prev.filter(inv => inv.id !== invoiceToRestore.id));
            setInvoiceHistory(prev => [restoredInvoice, ...prev]);

            setSaveMessage({
                type: 'success',
                text: `Invoice #${invoiceToRestore.invoiceNumber} restored successfully.`
            });
            setTimeout(() => setSaveMessage({ type: '', text: '' }), 5000);
        }
        
        setShowRestoreConfirm(false);
        setInvoiceToRestore(null);
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
    }, [showInvoiceModal, invoiceData, isEditingExisting]);

    // Reset editing state when closing modal or changing tabs
    useEffect(() => {
        if (!showInvoiceModal) {
            setIsEditingExisting(false);
            setEditingInvoiceId(null);
        }
    }, [showInvoiceModal]);

    // Delete Confirmation Modal
    const DeleteConfirmationModal = () => (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 1070 }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header bg-danger text-white">
                        <h5 className="modal-title">
                            <i className="bi bi-exclamation-triangle me-2"></i>
                            Confirm Delete
                        </h5>
                    </div>
                    <div className="modal-body">
                        <div className="alert alert-danger">
                            <i className="bi bi-exclamation-triangle-fill me-2"></i>
                            <strong>Warning!</strong> Are you sure you want to delete this invoice?
                        </div>
                        
                        {invoiceToDelete && (
                            <div className="card">
                                <div className="card-body">
                                    <h6 className="card-title">Invoice Details</h6>
                                    <p className="card-text mb-1"><strong>Invoice #:</strong> {invoiceToDelete.invoiceNumber}</p>
                                    <p className="card-text mb-1"><strong>Client:</strong> {invoiceToDelete.clientName}</p>
                                    <p className="card-text mb-1"><strong>Amount:</strong> ₹{formatAmount(invoiceToDelete.amount)}</p>
                                    <p className="card-text mb-0"><strong>Service Date:</strong> {formatDate(invoiceToDelete.data.serviceDate)}</p>
                                </div>
                            </div>
                        )}
                        
                        <div className="alert alert-info mt-3 text-info">
                            <i className="bi bi-info-circle me-2"></i>
                            <strong>Note:</strong> This will move the invoice to the deleted archive. You can restore it later if needed.
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                                setShowDeleteConfirm(false);
                                setInvoiceToDelete(null);
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-danger"
                            onClick={confirmDeleteInvoice}
                        >
                            <i className="bi bi-trash me-1"></i>
                            Delete Invoice
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    // Restore Confirmation Modal
    const RestoreConfirmationModal = () => (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 1070 }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header bg-success text-white">
                        <h5 className="modal-title">
                            <i className="bi bi-check-circle me-2"></i>
                            Confirm Restore
                        </h5>
                    </div>
                    <div className="modal-body">
                        <div className="alert alert-success">
                            <i className="bi bi-check-circle-fill me-2"></i>
                            <strong>Restore Invoice</strong> Are you sure you want to restore this invoice?
                        </div>
                        
                        {invoiceToRestore && (
                            <div className="card">
                                <div className="card-body">
                                    <h6 className="card-title">Invoice Details</h6>
                                    <p className="card-text mb-1"><strong>Invoice #:</strong> {invoiceToRestore.invoiceNumber}</p>
                                    <p className="card-text mb-1"><strong>Client:</strong> {invoiceToRestore.clientName}</p>
                                    <p className="card-text mb-1"><strong>Amount:</strong> ₹{formatAmount(invoiceToRestore.amount)}</p>
                                    <p className="card-text mb-0"><strong>Deleted On:</strong> {formatDate(invoiceToRestore.deletedAt)}</p>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                                setShowRestoreConfirm(false);
                                setInvoiceToRestore(null);
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-success"
                            onClick={confirmRestoreInvoice}
                        >
                            <i className="bi bi-arrow-counterclockwise me-1"></i>
                            Restore Invoice
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    // Custom Invoice Form Component
    const CustomInvoiceForm = ({ invoiceData, onApply, onClose }) => {
        const [formData, setFormData] = useState(invoiceData);
        const [existingInvoice, setExistingInvoice] = useState(null);

        useEffect(() => {
            setFormData(invoiceData);
            // Check if there's an existing invoice for this service date
            if (invoiceData.serviceDate) {
                const existing = findExistingInvoiceByServiceDate(invoiceData.serviceDate);
                setExistingInvoice(existing);
            }
        }, [invoiceData]);

        const handleServiceDateChange = (e) => {
            const serviceDate = e.target.value;
            const autoFillDate = calculateAutoFillDate(serviceDate);
            const nextPaymentDate = new Date(autoFillDate);
            nextPaymentDate.setDate(nextPaymentDate.getDate());

            // Check for existing invoice
            const existing = findExistingInvoiceByServiceDate(serviceDate);
            setExistingInvoice(existing);

            setFormData(prev => ({
                ...prev,
                serviceDate,
                autoFillDate,
                nextPaymentDate: nextPaymentDate.toISOString().split('T')[0],
                // If editing existing invoice, keep original values
                invoiceAmount: existing ? (existing.data.invoiceAmount || prev.invoiceAmount) : prev.invoiceAmount,
                travelingCharges: existing ? (existing.data.travelingCharges || prev.travelingCharges) : prev.travelingCharges,
                extraCharges: existing ? (existing.data.extraCharges || prev.extraCharges) : prev.extraCharges,
                gapIfAny: existing ? (existing.data.gapIfAny || prev.gapIfAny) : prev.gapIfAny,
                remarks: existing ? (existing.data.remarks || prev.remarks) : prev.remarks,
                additionalComments: existing ? (existing.data.additionalComments || prev.additionalComments) : prev.additionalComments
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

        const calculateNextPaymentDate = () => {
            const autoFillDate = calculateFormAutoFillDate();
            if (autoFillDate) {
                const nextDate = new Date(autoFillDate);
                nextDate.setDate(nextDate.getDate() + 1);
                return nextDate.toISOString().split('T')[0];
            }
            return '';
        };

        return (
            <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 1060 }}>
                <div className="modal-dialog modal-lg modal-dialog-centered">
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header bg-primary text-white">
                            <h5 className="modal-title">
                                {existingInvoice ? 'Edit Invoice' : 'Custom Invoice Details'}
                                {existingInvoice && (
                                    <span className="badge bg-warning ms-2">
                                        Editing Existing Invoice
                                    </span>
                                )}
                            </h5>
                            <button
                                type="button"
                                className="btn-close btn-close-white"
                                onClick={onClose}
                            />
                        </div>
                        <div className="modal-body">
                            {existingInvoice && (
                                <div className="alert alert-danger alert-dismissible fade show text-black" role="alert">
                                    <i className="bi bi-info-circle me-2"></i>
                                    <strong>Editing existing invoice:</strong> Invoice #{existingInvoice.invoiceNumber} for service date {formatDate(existingInvoice.data.serviceDate)}. 
                                    Changes will update the existing invoice.
                                </div>
                            )}
                            
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="form-label"><strong>Service Date *</strong></label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        name="serviceDate"
                                        value={formData.serviceDate}
                                        onChange={handleServiceDateChange}
                                        required
                                    />
                                    {existingInvoice && (
                                        <small className="form-text text-danger text-bold">
                                            <i className="bi bi-exclamation-triangle me-1"></i>
                                            <strong>Invoice for this date already exists. Editing will update it.</strong>
                                        </small>
                                    )}
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
                                <div className="col-md-6">
                                    <label className="form-label"><strong>Next Payment Due Date</strong></label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        name="nextPaymentDate"
                                        value={formData.nextPaymentDate || calculateNextPaymentDate()}
                                        onChange={handleInputChange}
                                        placeholder="Select next payment due date"
                                    />
                                    <small className="form-text small-text">
                                        Default: Day after auto-fill date
                                    </small>
                                </div>
                                <div className="col-md-6">
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
                                <div className="col-md-6">
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
                                <div className="col-md-6">
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
                                <div className="col-md-12">
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
                                <div className="col-md-12">
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
                                className={`btn ${existingInvoice ? 'btn-warning' : 'btn-primary'}`}
                                onClick={handleApply}
                            >
                                {existingInvoice ? 'Update Invoice' : 'Apply to Invoice'}
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
            <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <table className="table table-sm table-hover" style={{ fontSize: '12px' }}>
                    <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                        <tr>
                            <th>Invoice #</th>
                            <th>Date</th>
                            <th>Client</th>
                            <th>Amount</th>
                            <th>Service Date</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoiceHistory.map((invoice) => {
                            const invoiceTotal = calculateTotalAmount(invoice.data);
                            return (
                                <tr key={invoice.id}>
                                    <td><strong>{invoice.invoiceNumber}</strong></td>
                                    <td>{formatDate(invoice.date)}</td>
                                    <td>{invoice.clientName}</td>
                                    <td className="text-success">
                                        <div>₹{formatAmount(invoiceTotal)}</div>
                                        <small className="small-text text-warning">
                                            Base: ₹{formatAmount(invoice.data.invoiceAmount || client?.serviceCharges || 0)}
                                        </small>
                                    </td>
                                    <td>{formatDate(invoice.data.serviceDate)}</td>
                                    <td>
                                        <span className="badge bg-success">Active</span>
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-sm btn-outline-primary me-1"
                                            onClick={() => {
                                                setInvoiceData(invoice.data);
                                                setIsEditingExisting(true);
                                                setEditingInvoiceId(invoice.id);
                                                setActiveTab('preview');
                                                setTimeout(() => {
                                                    if (iframeRef.current) {
                                                        iframeRef.current.srcdoc = buildInvoiceHTML();
                                                    }
                                                }, 100);
                                            }}
                                            title="Edit this invoice"
                                        >
                                            <i className="bi bi-pencil"></i>
                                        </button>
                                        <button
                                            className="btn btn-sm btn-outline-success me-1"
                                            onClick={() => {
                                                setInvoiceData(invoice.data);
                                                handleDownloadInvoice();
                                            }}
                                            title="Download this invoice"
                                        >
                                            <i className="bi bi-download"></i>
                                        </button>
                                        <button
                                            className="btn btn-sm btn-outline-danger"
                                            onClick={() => handleDeleteInvoice(invoice)}
                                            title="Delete this invoice"
                                        >
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {invoiceHistory.length === 0 && (
                            <tr>
                                <td colSpan="7" className="text-center small-text text-warning py-4">
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

    // Deleted Invoices Table Component
    const DeletedInvoicesTable = () => (
        <div className="deleted-invoices-table p-3">
            <div className="alert alert-warning mb-3">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                <strong>Deleted Invoices Archive</strong> - These invoices have been soft-deleted and can be restored.
            </div>
            
            <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <table className="table table-sm table-hover" style={{ fontSize: '12px' }}>
                    <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                        <tr>
                            <th>Invoice #</th>
                            <th>Date</th>
                            <th>Client</th>
                            <th>Amount</th>
                            <th>Service Date</th>
                            <th>Deleted On</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {deletedInvoices.map((invoice) => {
                            const invoiceTotal = calculateTotalAmount(invoice.data);
                            return (
                                <tr key={invoice.id} className="table-secondary">
                                    <td><strong>{invoice.invoiceNumber}</strong></td>
                                    <td>{formatDate(invoice.date)}</td>
                                    <td>{invoice.clientName}</td>
                                    <td className="text-success">
                                        <div>₹{formatAmount(invoiceTotal)}</div>
                                        <small className="small-text text-warning">
                                            Base: ₹{formatAmount(invoice.data.invoiceAmount || client?.serviceCharges || 0)}
                                        </small>
                                    </td>
                                    <td>{formatDate(invoice.data.serviceDate)}</td>
                                    <td>
                                        <div>{formatDate(invoice.deletedAt)}</div>
                                        <small className="small-text">By: {invoice.deletedBy || 'User'}</small>
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-sm btn-outline-success me-1"
                                            onClick={() => handleRestoreInvoice(invoice)}
                                            title="Restore this invoice"
                                        >
                                            <i className="bi bi-arrow-counterclockwise"></i>
                                        </button>
                                        <button
                                            className="btn btn-sm btn-outline-info"
                                            onClick={() => {
                                                setInvoiceData(invoice.data);
                                                handleDownloadInvoice();
                                            }}
                                            title="Download this invoice"
                                        >
                                            <i className="bi bi-download"></i>
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {deletedInvoices.length === 0 && (
                            <tr>
                                <td colSpan="7" className="text-center small-text text-warning py-4">
                                    <i className="bi bi-trash me-2"></i>
                                    No deleted invoices found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {deletedInvoices.length > 0 && (
                <div className="alert alert-info mt-3 text-info">
                    <i className="bi bi-info-circle me-2"></i>
                    <strong>Note:</strong> {deletedInvoices.length} invoice(s) in deleted archive. 
                    These are soft-deleted and can be restored if needed.
                </div>
            )}
        </div>
    );

    if (!showInvoiceModal) {
        return (
            <div className="text-center p-4">
                <h5 className="mb-3">Invoice Generation</h5>
                <p className="small-text text-warning mb-4">Generate and share invoice for this client</p>
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
            {showDeleteConfirm && <DeleteConfirmationModal />}
            {showRestoreConfirm && <RestoreConfirmationModal />}
            
            {showCustomInvoiceForm && (
                <CustomInvoiceForm
                    invoiceData={invoiceData}
                    onApply={handleApplyCustomInvoice}
                    onClose={() => setShowCustomInvoiceForm(false)}
                />
            )}

            <div className="modal-card">
                <div className="mb-3">
                    <h4 className="text-info">
                        Invoice - {generatedInvoiceNumber}
                        {isEditingExisting && (
                            <span className="badge bg-warning ms-2">
                                <i className="bi bi-pencil me-1"></i>
                                Editing
                            </span>
                        )}
                    </h4>
                    <div className="d-flex flex-wrap gap-2 align-items-center">
                        <button
                            type="button"
                            className={`btn btn-sm ${isEditingExisting ? 'btn-warning' : 'btn-primary'}`}
                            onClick={() => setShowCustomInvoiceForm(true)}
                        >
                            <i className="bi bi-pencil-square me-1"></i>
                            {isEditingExisting ? 'Edit Invoice' : 'Custom Invoice'}
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
                            className="btn btn-outline-info btn-sm"
                            onClick={handlePrintInvoice}
                        >
                            <i className="bi bi-printer me-1"></i>
                            Print
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline-warning btn-sm"
                            onClick={handleShareToWhatsApp}
                        >
                            <i className="bi bi-whatsapp me-1"></i>
                            WhatsApp
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => {
                                setIsEditingExisting(false);
                                setEditingInvoiceId(null);
                                setShowInvoiceModal(false);
                            }}
                        >
                            <i className="bi bi-x me-1"></i>
                            Close
                        </button>
                    </div>
                </div>

                {/* Tabs for Preview, History, and Deleted */}
                <div className="border-bottom">
                    <ul className="nav nav-tabs">
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'preview' ? 'active' : ''}`}
                                onClick={() => setActiveTab('preview')}
                            >
                                <i className="bi bi-eye me-1"></i>
                                Preview
                                {isEditingExisting && (
                                    <span className="badge bg-warning ms-1">Editing</span>
                                )}
                            </button>
                        </li>
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'history' ? 'active' : ''}`}
                                onClick={() => {
                                    setActiveTab('history');
                                    setIsEditingExisting(false);
                                    setEditingInvoiceId(null);
                                }}
                            >
                                <i className="bi bi-clock-history me-1"></i>
                                History ({invoiceHistory.length})
                            </button>
                        </li>
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'deleted' ? 'active' : ''}`}
                                onClick={() => {
                                    setActiveTab('deleted');
                                    setIsEditingExisting(false);
                                    setEditingInvoiceId(null);
                                }}
                            >
                                <i className="bi bi-trash me-1"></i>
                                Deleted ({deletedInvoices.length})
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
                            
                            {/* Moved Save Message Alert here - above the save button */}
                            {saveMessage.text && (
                                <div className={`alert alert-${saveMessage.type === 'error' ? 'danger' : 'success'} alert-dismissible fade show mt-3`} role="alert" style={{ maxWidth: '600px', margin: '15px auto' }}>
                                    {saveMessage.type === 'error' ? (
                                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                    ) : (
                                        <i className="bi bi-check-circle-fill me-2"></i>
                                    )}
                                    {saveMessage.text}
                                    <button type="button" className="btn-close" onClick={() => setSaveMessage({ type: '', text: '' })}></button>
                                </div>
                            )}
                            
                            <div className="mt-3 text-center">
                                <button
                                    type="button"
                                    className={`btn ${isEditingExisting ? 'btn-warning' : 'btn-primary'}`}
                                    onClick={saveInvoiceToHistory}
                                >
                                    <i className="bi bi-save me-1"></i>
                                    {isEditingExisting ? 'Update Invoice' : 'Save Invoice to History'}
                                </button>
                                {isEditingExisting && (
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary ms-2"
                                        onClick={() => {
                                            setIsEditingExisting(false);
                                            setEditingInvoiceId(null);
                                            // Reset to default invoice data
                                            setInvoiceData({
                                                serviceDate: '',
                                                invoiceDate: new Date().toISOString().split('T')[0],
                                                invoiceAmount: '',
                                                gapIfAny: '',
                                                travelingCharges: '',
                                                extraCharges: '',
                                                remarks: '',
                                                additionalComments: '',
                                                serviceRemarks: '',
                                                nextPaymentDate: ''
                                            });
                                            setTimeout(() => {
                                                if (iframeRef.current) {
                                                    iframeRef.current.srcdoc = buildInvoiceHTML();
                                                }
                                            }, 100);
                                        }}
                                    >
                                        <i className="bi bi-x-circle me-1"></i>
                                        Cancel Edit
                                    </button>
                                )}
                            </div>
                        </>
                    ) : activeTab === 'history' ? (
                        <>
                            {/* Save Message for History Tab */}
                            {saveMessage.text && (
                                <div className={`alert alert-${saveMessage.type === 'error' ? 'danger' : 'success'} alert-dismissible fade show mb-3`} role="alert">
                                    {saveMessage.type === 'error' ? (
                                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                    ) : (
                                        <i className="bi bi-check-circle-fill me-2"></i>
                                    )}
                                    {saveMessage.text}
                                    <button type="button" className="btn-close" onClick={() => setSaveMessage({ type: '', text: '' })}></button>
                                </div>
                            )}
                            <InvoiceHistoryTable />
                        </>
                    ) : (
                        <>
                            {/* Save Message for Deleted Tab */}
                            {saveMessage.text && (
                                <div className={`alert alert-${saveMessage.type === 'error' ? 'danger' : 'success'} alert-dismissible fade show mb-3`} role="alert">
                                    {saveMessage.type === 'error' ? (
                                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                    ) : (
                                        <i className="bi bi-check-circle-fill me-2"></i>
                                    )}
                                    {saveMessage.text}
                                    <button type="button" className="btn-close" onClick={() => setSaveMessage({ type: '', text: '' })}></button>
                                </div>
                            )}
                            <DeletedInvoicesTable />
                        </>
                    )}
                </div>
            </div>
        </>
    );
};

export default ShareInvoice;