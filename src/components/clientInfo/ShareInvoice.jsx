import React, { useRef, useState, useMemo, useEffect } from 'react';
import firebaseDB from '../../firebase'; // Import Firebase

const ShareInvoice = ({
    formData,
    clientKey, // Must be Firebase push key, NOT idNo
    departmentPath, // Full Firebase path from getClientPathByDepartment()
    firebaseKey, // Alternative prop name for clientKey
    key, // React key prop
    onLoadInvoices, // optional callback
    client,
    payments = [],
    billTitle = 'Client Invoice',
    billNumber = '',
    getTranslation,
}) => {
    const iframeRef = useRef(null);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [showCustomInvoiceForm, setShowCustomInvoiceForm] = useState(false);
    const [showThankYouMessageForm, setShowThankYouMessageForm] = useState(false);
    const [selectedThankYouType, setSelectedThankYouType] = useState('default');
    const [customThankYouMessage, setCustomThankYouMessage] = useState('');
    const [invoiceHistory, setInvoiceHistory] = useState([]);
    const [deletedInvoices, setDeletedInvoices] = useState([]);
    const [activeTab, setActiveTab] = useState('preview'); // 'preview', 'history', or 'deleted'
    const [invoiceCounter, setInvoiceCounter] = useState(0);
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
        nextPaymentDate: '', // NEW: Custom next payment date
        thankYouType: 'default', // NEW: Store selected thank you type
        customThankYou: '' // NEW: Store custom thank you message
    });

    const [isEditingExisting, setIsEditingExisting] = useState(false);
    const [editingInvoiceId, setEditingInvoiceId] = useState(null);

    const headerImage = "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/Shop-Images%2FJenCeo-Trades.svg?alt=media&token=da7ab6ec-826f-41b2-ba2a-0a7d0f405997";
    const defaultCustomerPhoto = "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FSample-Photo.jpg?alt=media&token=01855b47-c9c2-490e-b400-05851192dde7";

    // Use firebaseKey if clientKey is undefined
    const actualClientKey = clientKey || firebaseKey;

    // Thank You Messages for different service types
    const thankYouMessages = {
        default: {
            title: "Thank You for Your Trust!",
            message: `
                Dear <strong>${client?.clientName || 'Client'}</strong> Gaaru,
                <br>
                We truly appreciate your trust and the opportunity to serve <strong>${client?.patientName || 'N/A'}, (${client?.typeOfService || 'N/A'})</strong>.
                <br>
                We're here to support you whenever needed and look forward to our continued collaboration.
            `
        },
        patientCare: {
            title: "Wishing You a Speedy Recovery!",
            message: `
                Dear <strong>${client?.clientName || 'Client'}</strong> Gaaru,
                <br>
                We are honored to have been able to provide care for <strong>${client?.patientName || 'N/A'}</strong> during this important time.
                <br>
                Our team wishes you and your loved one renewed health and comfort. May each day bring more strength and healing. 
                We are here to support you every step of the way.
                <br>
                <em>"Care that comes from the heart, stays in the heart."</em>
            `
        },
        babyCare: {
            title: "Cherishing Precious Moments!",
            message: `
                Dear <strong>${client?.clientName || 'Client'}</strong> Gaaru,
                <br>
                It has been a joy for us to help care for your little bundle of joy, <strong>${client?.patientName || 'the baby'}</strong>.
                <br>
                We wish your baby continued growth, health, and endless smiles. May your home always be filled with laughter, 
                and may you create beautiful memories together.
                <br>
                <em>"Tiny hands, big hearts, precious moments."</em>
            `
        },
        houseMaid: {
            title: "Appreciation for Your Home!",
            message: `
                Dear <strong>${client?.clientName || 'Client'}</strong> Gaaru,
                <br>
                Thank you for allowing us to serve your household. We hope our services have brought convenience and comfort to your daily life.
                <br>
                We wish your home continues to be a place of peace, happiness, and harmony for you and your family.
                <br>
                <em>"A clean home is a happy home, and we're glad to be part of yours."</em>
            `
        },
        elderlyCare: {
            title: "Honoring Wisdom and Experience!",
            message: `
                Dear <strong>${client?.clientName || 'Client'}</strong> Gaaru,
                <br>
                It has been our privilege to care for <strong>${client?.patientName || 'your loved one'}</strong>. We deeply respect the wisdom and experience they bring.
                <br>
                We wish them continued comfort, dignity, and joy in their golden years. May they be surrounded by love, care, and happy moments every day.
                <br>
                <em>"Respect for age is reverence for life's journey."</em>
            `
        },
        custom: {
            title: "Thank You Message",
            message: ""
        }
    };

    // Determine service type from client data
    const determineServiceType = () => {
        const serviceType = client?.typeOfService?.toLowerCase() || '';

        if (serviceType.includes('baby') || serviceType.includes('child') || serviceType.includes('infant')) {
            return 'babyCare';
        } else if (serviceType.includes('maid') || serviceType.includes('housekeeping') || serviceType.includes('house maid')) {
            return 'houseMaid';
        } else if (serviceType.includes('elder') || serviceType.includes('senior') || serviceType.includes('old age')) {
            return 'elderlyCare';
        } else if (serviceType.includes('patient') || serviceType.includes('care') || serviceType.includes('nursing')) {
            return 'patientCare';
        } else {
            return 'default';
        }
    };

    // Get current thank you message based on selection
    const getCurrentThankYouMessage = () => {
        if (invoiceData.thankYouType === 'custom' && invoiceData.customThankYou) {
            return {
                title: "Thank You Message",
                message: invoiceData.customThankYou
            };
        }
        return thankYouMessages[invoiceData.thankYouType] || thankYouMessages.default;
    };

    // Initialize with auto-detected thank you type
    useEffect(() => {
        if (client && !invoiceData.thankYouType) {
            const serviceType = determineServiceType();
            setInvoiceData(prev => ({
                ...prev,
                thankYouType: serviceType
            }));
        }
    }, [client]);

    // Add helper function for debugging Firebase paths
    const logFirebasePaths = () => {
        if (actualClientKey && departmentPath) {
            const cleanDepartmentPath = departmentPath.replace(/\/$/, '');
            const invoicePath = `${cleanDepartmentPath}/${actualClientKey}/Invoice`;

        }
    };

    // Validate required props - CRITICAL FIX
    useEffect(() => {
        if (!actualClientKey) {

            setSaveMessage({
                type: 'error',
                text: 'Cannot load invoices: Client Firebase key is missing. Please refresh the page.'
            });
        }

        if (!departmentPath) {

            setSaveMessage({
                type: 'error',
                text: 'Cannot load invoices: Department path is missing. Please refresh the page.'
            });
        }

        if (actualClientKey && departmentPath) {
            logFirebasePaths();
        }
    }, [actualClientKey, departmentPath, clientKey, firebaseKey]);

    // FIXED: Direct path loading with correct departmentPath
    const loadInvoicesFromFirebase = async () => {
        try {
            // CRITICAL VALIDATION
            if (!actualClientKey) {
                setSaveMessage({
                    type: 'error',
                    text: 'Cannot load invoices: Client Firebase key is missing.'
                });
                return;
            }

            if (!departmentPath) {
                setSaveMessage({
                    type: 'error',
                    text: 'Cannot load invoices: Department path is missing.'
                });
                return;
            }

            // FIXED: Use same path structure as save function
            const cleanDepartmentPath = departmentPath.replace(/\/$/, '');
            const invoicePath = `${cleanDepartmentPath}/${actualClientKey}/Invoice`;


            const invoiceSnap = await firebaseDB
                .child(invoicePath)
                .once("value");

            if (invoiceSnap.exists()) {
                const firebaseInvoices = invoiceSnap.val();

                // Convert object to array
                let invoicesArray = [];
                if (firebaseInvoices) {
                    invoicesArray = Object.keys(firebaseInvoices).map(key => ({
                        ...firebaseInvoices[key],
                        firebaseKey: key
                    }));
                }

                if (invoicesArray.length > 0) {
                    // Separate active and deleted invoices
                    const activeInvoices = invoicesArray.filter(inv => !inv.isDeleted);
                    const deletedInvoices = invoicesArray.filter(inv => inv.isDeleted);

                    setInvoiceHistory(activeInvoices);
                    setDeletedInvoices(deletedInvoices);

                    // Call the callback if provided
                    if (onLoadInvoices && typeof onLoadInvoices === 'function') {
                        onLoadInvoices(activeInvoices);
                    }
                } else {
                    setInvoiceHistory([]);
                    setDeletedInvoices([]);
                }
            } else {
                setInvoiceHistory([]);
                setDeletedInvoices([]);
            }
        } catch (error) {
            console.error("❌ Error loading invoices from Firebase:", error);
            console.error("Error details:", error.message, error.stack);
            setSaveMessage({
                type: 'error',
                text: `Failed to load invoices: ${error.message}`
            });
        }
    };

    // Load invoice history from Firebase when component mounts or client changes
    useEffect(() => {
        if (client?.idNo && actualClientKey && departmentPath) {
            loadInvoicesFromFirebase();
        }
    }, [client?.idNo, actualClientKey, departmentPath]);

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

    // Helper function to generate invoice number
    const generateNewInvoiceNumber = () => {
        if (billNumber) return billNumber;

        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = now.toLocaleString('en-US', { month: 'short' });
        const clientId = client?.idNo || '01';

        // Count invoices for this month to add index
        const currentMonthYear = `${month}-${year}`;
        const monthInvoices = invoiceHistory.filter(inv =>
            inv.invoiceNumber.includes(currentMonthYear) && !inv.isDeleted
        );
        const monthIndex = monthInvoices.length + 1;

        return `${clientId}-${month}-${year}${monthIndex > 1 ? `-${monthIndex}` : ''}`;
    };

    // ✅ FIXED: Save invoice to Firebase with correct departmentPath
    const saveInvoiceToFirebase = async (invoice) => {
        try {
            // CRITICAL VALIDATION - DO NOT REMOVE
            if (!actualClientKey) {
                setSaveMessage({
                    type: 'error',
                    text: 'Cannot save invoice: Missing client Firebase key.'
                });
                return null;
            }

            if (!departmentPath) {
                setSaveMessage({
                    type: 'error',
                    text: 'Cannot save invoice: Missing department path.'
                });
                return null;
            }

            // ✅ FIXED: Use departmentPath directly without modifications
            // Remove any trailing slashes from departmentPath
            const cleanDepartmentPath = departmentPath.replace(/\/$/, '');

            // Construct the full path
            const invoicePath = `${cleanDepartmentPath}/${actualClientKey}/Invoice/${invoice.id}`;



            // Save the entire invoice object to Firebase
            await firebaseDB
                .child(invoicePath)
                .set(invoice);

            return invoice;

        } catch (error) {
            console.error("❌ Error saving invoice to Firebase:", error);
            console.error("Error details:", error.message, error.stack);
            setSaveMessage({
                type: 'error',
                text: `Failed to save invoice to database: ${error.message}`
            });
            throw error;
        }
    };

    // ✅ FIXED: Save invoice function with proper departmentPath
    const saveInvoiceToHistory = async () => {
        // CRITICAL: Check for required parameters
        if (!actualClientKey) {
            setSaveMessage({
                type: 'error',
                text: 'Cannot save invoice: Missing client Firebase key. Please refresh and try again.'
            });
            return;
        }

        if (!departmentPath) {
            setSaveMessage({
                type: 'error',
                text: 'Cannot save invoice: Missing department path. Please refresh and try again.'
            });
            return;
        }

        const totalAmount = calculateTotalAmount(invoiceData);
        const now = new Date();

        // Determine if this is an update or new invoice
        const isUpdate = Boolean(editingInvoiceId);

        try {
            if (isUpdate) {
                // ✅ UPDATE EXISTING INVOICE
                const existingInvoice = invoiceHistory.find(inv => inv.id === editingInvoiceId);
                if (!existingInvoice) {
                    setSaveMessage({
                        type: 'error',
                        text: 'Cannot find invoice to update.'
                    });
                    return;
                }

                // Create updated invoice object
                const updatedInvoice = {
                    ...existingInvoice,
                    amount: totalAmount,
                    data: { ...invoiceData },
                    updatedAt: now.toISOString()
                };

                // Update in Firebase first
                await saveInvoiceToFirebase(updatedInvoice);

                // Then update local state
                const updatedHistory = invoiceHistory.map(invoice =>
                    invoice.id === editingInvoiceId ? updatedInvoice : invoice
                );
                setInvoiceHistory(updatedHistory);

                setSaveMessage({
                    type: 'success',
                    text: 'Invoice updated successfully!'
                });

                setIsEditingExisting(false);
                setEditingInvoiceId(null);
            } else {
                // ✅ CREATE NEW INVOICE
                // Check for duplicate invoice based only on service date
                if (isDuplicateInvoice(invoiceData)) {
                    setSaveMessage({
                        type: 'error',
                        text: `Invoice with service date ${formatDate(invoiceData.serviceDate)} already exists! Update existing invoice instead.`
                    });
                    setTimeout(() => setSaveMessage({ type: '', text: '' }), 5000);
                    return;
                }

                // Generate new invoice number
                const newInvoiceNumber = generateNewInvoiceNumber();

                // Generate a unique ID for the invoice
                const invoiceId = `INV_${Date.now()}`;

                const newInvoice = {
                    id: invoiceId, // Use our generated ID
                    invoiceNumber: newInvoiceNumber,
                    date: now.toISOString().split('T')[0],
                    amount: totalAmount,
                    clientName: client?.clientName || '',
                    clientId: client?.idNo || '',
                    data: { ...invoiceData },
                    createdAt: now.toISOString(),
                    updatedAt: now.toISOString(),
                    isDeleted: false,
                    deletedAt: null,
                    deletedBy: null
                };

                // Save to Firebase first
                await saveInvoiceToFirebase(newInvoice);

                // Then update local state
                const updatedHistory = [newInvoice, ...invoiceHistory];
                setInvoiceHistory(updatedHistory);

                setSaveMessage({
                    type: 'success',
                    text: 'Invoice saved successfully!'
                });
            }

            setTimeout(() => setSaveMessage({ type: '', text: '' }), 3000);

            // Refresh the preview
            setTimeout(() => {
                if (iframeRef.current) {
                    iframeRef.current.srcdoc = buildInvoiceHTML();
                }
            }, 100);

        } catch (error) {
            setSaveMessage({
                type: 'error',
                text: `Failed to save invoice: ${error.message}`
            });
            setTimeout(() => setSaveMessage({ type: '', text: '' }), 5000);
        }
    };

    const handleApplyCustomInvoice = (formData) => {
        const existingInvoice = findExistingInvoiceByServiceDate(formData.serviceDate);

        if (existingInvoice) {
            setIsEditingExisting(true);
            setEditingInvoiceId(existingInvoice.id);
            // Keep the original invoice number when editing
            setInvoiceData({
                ...formData,
                thankYouType: existingInvoice.data.thankYouType || invoiceData.thankYouType,
                customThankYou: existingInvoice.data.customThankYou || invoiceData.customThankYou
            });
        } else {
            setIsEditingExisting(false);
            setEditingInvoiceId(null);
            setInvoiceData({
                ...formData,
                thankYouType: invoiceData.thankYouType,
                customThankYou: invoiceData.customThankYou
            });
        }

        setShowCustomInvoiceForm(false);

        // Immediately update the preview
        setTimeout(() => {
            if (iframeRef.current) {
                iframeRef.current.srcdoc = buildInvoiceHTML();
            }
        }, 100);
    };

    // Handle thank you message selection
    const handleThankYouTypeChange = (type) => {
        setSelectedThankYouType(type);
        setInvoiceData(prev => ({
            ...prev,
            thankYouType: type
        }));

        // If not custom, clear custom message
        if (type !== 'custom') {
            setCustomThankYouMessage('');
            setInvoiceData(prev => ({
                ...prev,
                customThankYou: ''
            }));
        }
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
        if (editingInvoiceId) {
            // If editing, use the existing invoice number
            const existingInvoice = invoiceHistory.find(inv => inv.id === editingInvoiceId);
            if (existingInvoice) return existingInvoice.invoiceNumber;
        }

        // Otherwise generate new one
        return generateNewInvoiceNumber();
    }, [billNumber, client, invoiceHistory, editingInvoiceId]);

    // FIXED: Date formatting function to show "12-Dec-25" format
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            const day = date.getDate().toString().padStart(2, '0');
            const month = date.toLocaleString('en-US', { month: 'short' });
            const year = date.getFullYear().toString().slice(-2);
            return `${day}-${month}-${year}`;
        } catch (error) {
            // Try alternative date parsing
            if (typeof dateString === 'string') {
                const parts = dateString.split('-');
                if (parts.length === 3) {
                    const [year, month, day] = parts;
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const monthName = monthNames[parseInt(month) - 1];
                    return `${day}-${monthName}-${year.slice(-2)}`;
                }
            }
            return dateString;
        }
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            const day = date.getDate().toString().padStart(2, '0');
            const month = date.toLocaleString('en-US', { month: 'short' });
            const year = date.getFullYear().toString().slice(-2);
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${day}-${month}-${year} ${hours}:${minutes}`;
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
                            <div style="font-weight: bold; color: #333;">${formatDate(client?.startingDate)}</div>
                        </div>
                        <div class="info-item" style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #e5e5e5;">
                            <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Ending Date</div>
                            <div style="font-weight: bold; color: #333;">${formatDate(client?.endingDate)}</div>
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
        const currentDate = formatDate(new Date());
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

        // Get thank you message based on selection
        const thankYouMessage = getCurrentThankYouMessage();

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
        .photo-box .rating{ font-size:12px}
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
        
        /* Save button styles - REMOVED FROM HTML, ONLY IN REACT */
        .save-section {
            margin: 20px 0;
            text-align: center;
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
        
        /* Thank you message type indicator */
        .thank-you-type-indicator {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: bold;
            margin-left: 8px;
            vertical-align: middle;
        }
        
        .type-patientCare {
            background: #d4edda;
            color: #155724;
        }
        
        .type-babyCare {
            background: #cce5ff;
            color: #004085;
        }
        
        .type-houseMaid {
            background: #fff3cd;
            color: #856404;
        }
        
        .type-elderlyCare {
            background: #d1ecf1;
            color: #0c5460;
        }
        
        .type-custom {
            background: #f8d7da;
            color: #721c24;
        }
        
        .type-default {
            background: #e2e3e5;
            color: #383d41;
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
            .thank-you-type-indicator {
                display: block;
                margin: 5px 0 0 0;
            }
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
                ${invoiceData.thankYouType && invoiceData.thankYouType !== 'default' ? `<span class="thank-you-type-indicator type-${invoiceData.thankYouType}" style="margin-left: 8px;">${invoiceData.thankYouType.toUpperCase()}</span>` : ''}
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
        <h3 style="color:#02acf2; margin-bottom:8px; font-size: 18px;">${thankYouMessage.title}</h3>
        <div style="margin:0; font-size: 12px; line-height: 1.6; text-align: center; padding: 0 10px;">
            ${thankYouMessage.message}
        </div>
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
            const html = buildInvoiceHTML();
            const blob = new Blob([html], { type: 'text/html' });

            if (navigator.share && navigator.canShare) {
                const file = new File(
                    [blob],
                    `Invoice_${generatedInvoiceNumber}.html`,
                    { type: 'text/html' }
                );

                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: `Invoice - ${generatedInvoiceNumber}`,
                        files: [file]
                    });
                    return;
                }
            }

            handleDownloadInvoice();
        } catch (e) {
            handleDownloadInvoice();
        }
    };


    const handlePrintInvoice = () => {
        const html = buildInvoiceHTML();
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();

        printWindow.onload = () => {
            printWindow.print();
            setTimeout(() => printWindow.close(), 100);
        };
    };


    const handleShareToWhatsApp = () => {

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
            `*Generated Date:* ${formatDate(new Date())}\n\n` +
            `Thank you for your trust in our services!`;

        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;

        window.open(whatsappUrl, '_blank');
    };

    // ✅ FIXED: Update invoice in Firebase with departmentPath
    const updateInvoiceInFirebase = async (invoice) => {
        try {
            if (!actualClientKey) {
                return;
            }

            if (!departmentPath) {
                return;
            }

            // ✅ FIXED: Use the same path structure as saveInvoiceToFirebase
            const cleanDepartmentPath = departmentPath.replace(/\/$/, '');
            const invoicePath = `${cleanDepartmentPath}/${actualClientKey}/Invoice/${invoice.id}`;


            // Update the invoice in Firebase
            await firebaseDB
                .child(invoicePath)
                .update(invoice);

        } catch (error) {
            console.error("❌ Error updating invoice in Firebase:", error);
            console.error("Error details:", error.message, error.stack);
            throw error;
        }
    };

    // Handle delete invoice with confirmation
    const handleDeleteInvoice = (invoice) => {
        setInvoiceToDelete(invoice);
        setShowDeleteConfirm(true);
    };

    // Confirm delete invoice
    const confirmDeleteInvoice = async () => {
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

            // Update Firebase - ONLY update the existing record
            await updateInvoiceInFirebase(updatedInvoice);

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
    const confirmRestoreInvoice = async () => {
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

            // Update Firebase - ONLY update the existing record
            await updateInvoiceInFirebase(restoredInvoice);

            setSaveMessage({
                type: 'success',
                text: `Invoice #${invoiceToRestore.invoiceNumber} restored successfully.`
            });
            setTimeout(() => setSaveMessage({ type: '', text: '' }), 5000);
        }

        setShowRestoreConfirm(false);
        setInvoiceToRestore(null);
    };

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

    // Thank You Message Form Component
    const ThankYouMessageForm = ({ onClose }) => {
        // Use local state that doesn't interfere with parent
        const [tempThankYouType, setTempThankYouType] = useState(invoiceData.thankYouType || 'default');
        const [tempCustomMessage, setTempCustomMessage] = useState(invoiceData.customThankYou || '');

        // Sync with parent ONLY when modal opens
        useEffect(() => {
            if (showThankYouMessageForm) {
                setTempThankYouType(invoiceData.thankYouType || 'default');
                setTempCustomMessage(invoiceData.customThankYou || '');
            }
        }, [showThankYouMessageForm]);

        const handleTypeChange = (type) => {
            setTempThankYouType(type);
            // Clear custom message if switching away from custom type
            if (type !== 'custom') {
                setTempCustomMessage('');
            }
        };

        const handleApply = () => {
            // Update parent state directly WITHOUT triggering re-render cycles
            setInvoiceData(prev => {
                if (tempThankYouType === 'custom' && tempCustomMessage.trim()) {
                    return {
                        ...prev,
                        thankYouType: 'custom',
                        customThankYou: tempCustomMessage
                    };
                } else {
                    return {
                        ...prev,
                        thankYouType: tempThankYouType,
                        customThankYou: ''
                    };
                }
            });

            // Close the modal first
            setShowThankYouMessageForm(false);

            // Wait for modal to close, then update preview
            setTimeout(() => {
                if (iframeRef.current) {
                    iframeRef.current.srcdoc = buildInvoiceHTML();
                }
            }, 50);
        };

        const getMessagePreview = () => {
            if (tempThankYouType === 'custom') {
                return tempCustomMessage || 'Enter your custom message...';
            }
            return thankYouMessages[tempThankYouType]?.message || thankYouMessages.default.message;
        };

        return (
            <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 1060 }}>
                <div className="modal-dialog modal-lg modal-dialog-centered invoiceRadio">
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header bg-primary text-white">
                            <h5 className="modal-title">
                                <i className="bi bi-chat-heart me-2"></i>
                                Select Thank You Message
                            </h5>
                            <button
                                type="button"
                                className="btn-close btn-close-white"
                                onClick={onClose}
                            />
                        </div>
                        <div className="modal-body">
                            <div className="row">
                                <div className="col-md-6">
                                    <h6 className="mb-3">Select Message Type</h6>
                                    <div className="form-check mb-2">
                                        <input
                                            className="form-check-input"
                                            type="radio"
                                            name="thankYouType"
                                            id="defaultType"
                                            value="default"
                                            checked={tempThankYouType === 'default'}
                                            onChange={(e) => handleTypeChange(e.target.value)}
                                        />
                                        <label className="form-check-label" htmlFor="defaultType">
                                            <strong>Default Message</strong>
                                            <small className="d-block text-muted">Generic thank you message for all services</small>
                                        </label>
                                    </div>

                                    <div className="form-check mb-2">
                                        <input
                                            className="form-check-input"
                                            type="radio"
                                            name="thankYouType"
                                            id="patientCare"
                                            value="patientCare"
                                            checked={tempThankYouType === 'patientCare'}
                                            onChange={(e) => handleTypeChange(e.target.value)}
                                        />
                                        <label className="form-check-label" htmlFor="patientCare">
                                            <strong>Patient Care</strong>
                                            <small className="d-block text-muted">For nursing and patient care services</small>
                                        </label>
                                    </div>

                                    <div className="form-check mb-2">
                                        <input
                                            className="form-check-input"
                                            type="radio"
                                            name="thankYouType"
                                            id="babyCare"
                                            value="babyCare"
                                            checked={tempThankYouType === 'babyCare'}
                                            onChange={(e) => handleTypeChange(e.target.value)}
                                        />
                                        <label className="form-check-label" htmlFor="babyCare">
                                            <strong>Baby Care</strong>
                                            <small className="d-block text-muted">For infant and child care services</small>
                                        </label>
                                    </div>

                                    <div className="form-check mb-2">
                                        <input
                                            className="form-check-input"
                                            type="radio"
                                            name="thankYouType"
                                            id="houseMaid"
                                            value="houseMaid"
                                            checked={tempThankYouType === 'houseMaid'}
                                            onChange={(e) => handleTypeChange(e.target.value)}
                                        />
                                        <label className="form-check-label" htmlFor="houseMaid">
                                            <strong>House Maid</strong>
                                            <small className="d-block text-muted">For housekeeping and maid services</small>
                                        </label>
                                    </div>

                                    <div className="form-check mb-2">
                                        <input
                                            className="form-check-input"
                                            type="radio"
                                            name="thankYouType"
                                            id="elderlyCare"
                                            value="elderlyCare"
                                            checked={tempThankYouType === 'elderlyCare'}
                                            onChange={(e) => handleTypeChange(e.target.value)}
                                        />
                                        <label className="form-check-label" htmlFor="elderlyCare">
                                            <strong>Elderly Care</strong>
                                            <small className="d-block text-muted">For senior citizen care services</small>
                                        </label>
                                    </div>

                                    <div className="form-check mb-3">
                                        <input
                                            className="form-check-input"
                                            type="radio"
                                            name="thankYouType"
                                            id="custom"
                                            value="custom"
                                            checked={tempThankYouType === 'custom'}
                                            onChange={(e) => handleTypeChange(e.target.value)}
                                        />
                                        <label className="form-check-label" htmlFor="custom">
                                            <strong>Custom Message</strong>
                                            <small className="d-block text-muted">Write your own thank you message</small>
                                        </label>
                                    </div>

                                    {tempThankYouType === 'custom' && (
                                        <div className="mb-3">
                                            <label className="form-label">
                                                <strong>Custom Thank You Message</strong>
                                            </label>
                                            <textarea
                                                className="form-control"
                                                rows="6"
                                                value={tempCustomMessage}
                                                onChange={(e) => setTempCustomMessage(e.target.value)}
                                                placeholder="Enter your custom thank you message here..."
                                            />
                                            <small className="text-muted">
                                                You can use HTML tags like &lt;strong&gt;, &lt;br&gt;, &lt;em&gt; for formatting
                                            </small>
                                        </div>
                                    )}
                                </div>

                                <div className="col-md-6">
                                    <h6 className="mb-3">Message Preview</h6>
                                    <div className="card">
                                        <div className="card-header bg-light">
                                            <strong>Preview</strong>
                                        </div>
                                        <div className="card-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                            <div className="thank-you-preview">
                                                <h5 style={{ color: '#02acf2', marginBottom: '15px' }}>
                                                    {tempThankYouType === 'custom' ? 'Thank You Message' : thankYouMessages[tempThankYouType]?.title || 'Thank You for Your Trust!'}
                                                </h5>
                                                <div dangerouslySetInnerHTML={{
                                                    __html: getMessagePreview().replace(
                                                        client?.clientName || 'Client',
                                                        `<strong>${client?.clientName || 'Client'}</strong>`
                                                    )
                                                }} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3">
                                        <div className="alert alert-info text-info">
                                            <i className="bi bi-info-circle me-2"></i>
                                            <strong>Current Service Type:</strong> {client?.typeOfService || 'Not specified'}
                                            <br />
                                            <strong>Auto-detected:</strong> {determineServiceType().toUpperCase()}
                                            <br />
                                            <strong>Selected Type:</strong> {tempThankYouType.toUpperCase()}
                                        </div>
                                    </div>
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
                                <i className="bi bi-check-lg me-1"></i>
                                Apply Message
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

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
                additionalComments: existing ? (existing.data.additionalComments || prev.additionalComments) : prev.additionalComments,
                thankYouType: existing ? (existing.data.thankYouType || prev.thankYouType) : prev.thankYouType,
                customThankYou: existing ? (existing.data.customThankYou || prev.customThankYou) : prev.customThankYou
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

    // FIXED: Invoice History Table Component with View Icon
    const InvoiceHistoryTable = () => {
        // Calculate total of all invoices
        const calculateTotal = () => {
            return invoiceHistory.reduce((sum, invoice) => {
                const invoiceTotal = calculateTotalAmount(invoice.data);
                return sum + invoiceTotal;
            }, 0);
        };

        // Calculate count of invoices
        const invoiceCount = invoiceHistory.length;
        const totalAmount = calculateTotal();

        return (
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
                                <th>Message Type</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoiceHistory.map((invoice) => {
                                const invoiceTotal = calculateTotalAmount(invoice.data);
                                const thankYouType = invoice.data.thankYouType || 'default';
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
                                            <span className={`badge ${thankYouType === 'patientCare' ? 'bg-success' :
                                                thankYouType === 'babyCare' ? 'bg-info' :
                                                    thankYouType === 'houseMaid' ? 'bg-warning text-dark' :
                                                        thankYouType === 'elderlyCare' ? 'bg-secondary' :
                                                            thankYouType === 'custom' ? 'bg-danger' :
                                                                'bg-light text-dark'
                                                }`}>
                                                {thankYouType.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>
                                            {/* View Button - Only loads invoice for preview without editing */}
                                            <button
                                                className="btn btn-sm btn-outline-info me-1"
                                                onClick={() => {
                                                    // Just load the invoice data for viewing
                                                    setInvoiceData(invoice.data);
                                                    setIsEditingExisting(false); // Set to false for view-only mode
                                                    setEditingInvoiceId(null); // Clear editing ID
                                                    setActiveTab('preview');
                                                    // Force refresh the iframe with the existing invoice data
                                                    setTimeout(() => {
                                                        if (iframeRef.current) {
                                                            iframeRef.current.srcdoc = buildInvoiceHTML();
                                                        }
                                                    }, 100);
                                                }}
                                                title="View this invoice"
                                            >
                                                <i className="bi bi-eye"></i>
                                            </button>

                                            {/* Edit Button - Sets editing mode */}
                                            <button
                                                className="btn btn-sm btn-outline-primary me-1"
                                                onClick={() => {
                                                    setInvoiceData(invoice.data);
                                                    setIsEditingExisting(true); // Set to true for editing
                                                    setEditingInvoiceId(invoice.id); // Set the invoice ID for editing
                                                    setActiveTab('preview');
                                                    // Force refresh the iframe
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

                            {/* Total Row - Always shows even if no invoices */}
                            <tr className="table-info" style={{ position: 'sticky', bottom: 0, zIndex: 1 }}>
                                <td colSpan="3" className="text-end fw-bold">
                                    <div>Total Invoices: {invoiceCount}</div>
                                    {invoiceCount > 0 && (
                                        <small className="text-muted">Average: ₹{formatAmount(totalAmount / invoiceCount)}</small>
                                    )}
                                </td>
                                <td className="fw-bold text-success" style={{ fontSize: '13px' }}>
                                    <div className="d-flex flex-column">
                                        <span>₹{formatAmount(totalAmount)}</span>
                                        {totalAmount > 0 && (
                                            <small className="text-warning">
                                                Base Total: ₹{formatAmount(invoiceHistory.reduce((sum, inv) =>
                                                    sum + (parseFloat(inv.data.invoiceAmount) || parseFloat(client?.serviceCharges) || 0), 0
                                                ))}
                                            </small>
                                        )}
                                    </div>
                                </td>
                                <td colSpan="3" className="text-center">
                                    <div className="text-muted small">
                                        <i className="bi bi-calculator me-1"></i>
                                        Invoice Summary
                                    </div>
                                </td>
                            </tr>

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

                {/* Summary Card - Shows outside the table for better visibility */}
                {invoiceCount > 0 && (
                    <div className="card mt-3 border-primary">
                        <div className="card-body p-2">
                            <div className="row text-center">
                                <div className="col-md-4">
                                    <div className="text-primary fw-bold">Total Invoices</div>
                                    <div className="h5">{invoiceCount}</div>
                                </div>
                                <div className="col-md-4">
                                    <div className="text-success fw-bold">Total Amount</div>
                                    <div className="h5 text-success">₹{formatAmount(totalAmount)}</div>
                                </div>
                                <div className="col-md-4">
                                    <div className="text-warning fw-bold">Average Invoice</div>
                                    <div className="h5 text-warning">₹{formatAmount(totalAmount / invoiceCount)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

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
                                            className="btn btn-sm btn-outline-info me-1"
                                            onClick={() => {
                                                setInvoiceData(invoice.data);
                                                handleDownloadInvoice();
                                            }}
                                            title="Download this invoice"
                                        >
                                            <i className="bi bi-download"></i>
                                        </button>
                                        <button
                                            className="btn btn-sm btn-outline-primary"
                                            onClick={() => {
                                                setInvoiceData(invoice.data);
                                                setIsEditingExisting(true);
                                                setEditingInvoiceId(invoice.id);
                                                setActiveTab('preview');
                                                // Force refresh the iframe
                                                setTimeout(() => {
                                                    if (iframeRef.current) {
                                                        iframeRef.current.srcdoc = buildInvoiceHTML();
                                                    }
                                                }, 100);
                                            }}
                                            title="View this invoice"
                                        >
                                            <i className="bi bi-eye"></i>
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

            {showThankYouMessageForm && (
                <ThankYouMessageForm
                    onClose={() => setShowThankYouMessageForm(false)}
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
                        {invoiceData.thankYouType && invoiceData.thankYouType !== 'default' && (
                            <span className={`badge ${invoiceData.thankYouType === 'patientCare' ? 'bg-success' :
                                invoiceData.thankYouType === 'babyCare' ? 'bg-info' :
                                    invoiceData.thankYouType === 'houseMaid' ? 'bg-warning text-dark' :
                                        invoiceData.thankYouType === 'elderlyCare' ? 'bg-secondary' :
                                            invoiceData.thankYouType === 'custom' ? 'bg-danger' :
                                                'bg-light text-dark'
                                } ms-2`}>
                                {invoiceData.thankYouType && invoiceData.thankYouType.toUpperCase()} MESSAGE
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
                            className="btn btn-sm btn-info"
                            onClick={() => {
                                // Set the form to show
                                setShowThankYouMessageForm(true);
                            }}
                        >
                            <i className="bi bi-chat-heart me-1"></i>
                            Thank You Message
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
                                                nextPaymentDate: '',
                                                thankYouType: determineServiceType(), // Reset to auto-detected type
                                                customThankYou: ''
                                            });

                                            // Clear any custom thank you message form state if open
                                            if (showThankYouMessageForm) {
                                                setShowThankYouMessageForm(false);
                                            }

                                            // Refresh the preview
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