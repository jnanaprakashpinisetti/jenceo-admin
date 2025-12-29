import React, { useRef, useState, useMemo, useEffect } from 'react';
import firebaseDB from '../../../../firebase';
import { COMPANY_PATHS } from '../../../../utils/dataPaths';

const CompanyInvoice = ({
    company,
    worker = null,
    payments = [],
    billTitle = 'Company Invoice',
    billNumber = '',
    getTranslation
}) => {
    const iframeRef = useRef(null);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [showCustomInvoiceForm, setShowCustomInvoiceForm] = useState(false);
    const [showThankYouMessageForm, setShowThankYouMessageForm] = useState(false);
    const [selectedThankYouType, setSelectedThankYouType] = useState('default');
    const [customThankYouMessage, setCustomThankYouMessage] = useState('');
    const [invoiceHistory, setInvoiceHistory] = useState(() => {
        const savedHistory = localStorage.getItem(`companyInvoiceHistory_${company?.companyId}`);
        return savedHistory ? JSON.parse(savedHistory) : [];
    });
    const [deletedInvoices, setDeletedInvoices] = useState(() => {
        const savedDeleted = localStorage.getItem(`deletedCompanyInvoices_${company?.companyId}`);
        return savedDeleted ? JSON.parse(savedDeleted) : [];
    });
    const [activeTab, setActiveTab] = useState('preview');
    const [invoiceCounter, setInvoiceCounter] = useState(() => {
        const savedCounter = localStorage.getItem(`companyInvoiceCounter_${company?.companyId}`);
        return savedCounter ? parseInt(savedCounter) : 0;
    });
    const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState(null);
    const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
    const [invoiceToRestore, setInvoiceToRestore] = useState(null);
    const [workers, setWorkers] = useState([]);
    const [selectedWorkerId, setSelectedWorkerId] = useState('');

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
        nextPaymentDate: '',
        thankYouType: 'default',
        customThankYou: '',
        workerId: '',
        workerName: '',
        workerDepartment: '',
        workerPhone: '',
        invoiceNumber: ''
    });

    const [isEditingExisting, setIsEditingExisting] = useState(false);
    const [editingInvoiceId, setEditingInvoiceId] = useState(null);

    const headerImage = "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/Shop-Images%2FJenCeo-Trades.svg?alt=media&token=da7ab6ec-826f-41b2-ba2a-0a7d0f405997";
    const defaultCompanyPhoto = "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FSample-Photo.jpg?alt=media&token=01855b47-c9c2-490e-b400-05851192dde7";

    const findCompanyKey = async (companyId) => {
        if (!companyId) return null;
        
        const categories = Object.keys(COMPANY_PATHS);
        
        for (const category of categories) {
            const basePath = COMPANY_PATHS[category];
            
            try {
                const companiesRef = firebaseDB.child(basePath);
                const snapshot = await companiesRef
                    .orderByChild("companyId")
                    .equalTo(companyId)
                    .once('value');
                
                const data = snapshot.val();
                
                if (data) {
                    const key = Object.keys(data)[0];
                    return { 
                        key: key, 
                        category: category,
                        path: basePath
                    };
                }
            } catch (error) {
                continue;
            }
        }
        
        return null;
    };

    const normalizeWorker = (w = {}) => ({
        workerId: w.workerId || w.idNo || "",
        workerName: w.workerName || 
                   `${w.firstName || ""} ${w.lastName || ""}`.trim() || 
                   w.name || "",
        department: w.department || "",
        phone: w.workerCell1 || w.mobileNo1 || "",
    });

    const loadWorkers = async () => {
        if (!company?.companyId) {
            return;
        }

        try {
            const companyInfo = await findCompanyKey(company.companyId);
            
            if (!companyInfo) {
                setWorkers([]);
                return;
            }
            
            const workersPath = `${companyInfo.path}/${companyInfo.key}/WorkerData`;
            
            const workersRef = firebaseDB.child(workersPath);
            const snapshot = await workersRef.once('value');
            
            const workersData = snapshot.val();
            
            if (workersData) {
                const workersArray = Object.entries(workersData).map(([key, value]) => ({
                    key,
                    ...value
                }));
                
                setWorkers(workersArray);
                
                if (worker?.idNo || worker?.workerId) {
                    const workerIdToMatch = worker.idNo || worker.workerId;
                    const foundWorker = workersArray.find(w => 
                        w.idNo === workerIdToMatch || 
                        w.workerId === workerIdToMatch
                    );
                    
                    if (foundWorker) {
                        const normalized = normalizeWorker(foundWorker);
                        const workerId = normalized.workerId;
                        setSelectedWorkerId(workerId);
                        
                        setInvoiceData(prev => ({
                            ...prev,
                            workerId: workerId,
                            workerName: normalized.workerName,
                            workerDepartment: normalized.department,
                            workerPhone: normalized.phone
                        }));
                    }
                }
            } else {
                setWorkers([]);
            }
        } catch (error) {
            setWorkers([]);
        }
    };

    const formatWorkerName = (worker) => {
        if (worker.workerName) return worker.workerName;
        if (worker.firstName || worker.lastName) {
            return `${worker.firstName || ""} ${worker.lastName || ""}`.trim();
        }
        if (worker.name) return worker.name;
        return "";
    };

    const thankYouMessages = {
        default: {
            title: "Thank You for Your Partnership!",
            message: `
                Dear <strong>${company?.companyName || 'Company'}</strong>,
                <br>
                We truly appreciate your trust and partnership with JenCeo Home Care Services.
                <br>
                We're here to support you whenever needed and look forward to our continued collaboration.
            `
        },
        homeCare: {
            title: "Appreciating Our Home Care Partnership!",
            message: `
                Dear <strong>${company?.companyName || 'Company'}</strong>,
                <br>
                Thank you for partnering with us in providing quality home care services.
                <br>
                We value our collaboration and are committed to maintaining the highest standards of care and service.
            `
        },
        housekeeping: {
            title: "Thank You for Choosing Our Housekeeping Services!",
            message: `
                Dear <strong>${company?.companyName || 'Company'}</strong>,
                <br>
                We appreciate your trust in our housekeeping and maintenance services.
                <br>
                Our team is dedicated to ensuring your premises remain clean, organized, and well-maintained.
            `
        },
        security: {
            title: "Grateful for Our Security Partnership!",
            message: `
                Dear <strong>${company?.companyName || 'Company'}</strong>,
                <br>
                Thank you for entrusting us with your security needs.
                <br>
                We are committed to providing reliable and professional security services to protect your assets and premises.
            `
        },
        custom: {
            title: "Thank You Message",
            message: ""
        }
    };

    const determineServiceType = () => {
        const serviceType = company?.companyType?.toLowerCase() || '';

        if (serviceType.includes('home care') || serviceType.includes('healthcare') || serviceType.includes('hospital')) {
            return 'homeCare';
        } else if (serviceType.includes('housekeeping') || serviceType.includes('cleaning') || serviceType.includes('maid')) {
            return 'housekeeping';
        } else if (serviceType.includes('security') || serviceType.includes('guard')) {
            return 'security';
        } else {
            return 'default';
        }
    };

    const getCurrentThankYouMessage = () => {
        if (invoiceData.thankYouType === 'custom' && invoiceData.customThankYou) {
            return {
                title: "Thank You Message",
                message: invoiceData.customThankYou
            };
        }
        return thankYouMessages[invoiceData.thankYouType] || thankYouMessages.default;
    };

    useEffect(() => {
        if (company?.companyId) {
            loadWorkers();
            
            setInvoiceData(prev => ({
                ...prev,
                invoiceAmount: company?.serviceCharges || '',
                thankYouType: determineServiceType(),
                invoiceNumber: ''
            }));
        }
    }, [company]);

    useEffect(() => {
        if (company?.companyId) {
            localStorage.setItem(`companyInvoiceHistory_${company.companyId}`, JSON.stringify(invoiceHistory));
            localStorage.setItem(`deletedCompanyInvoices_${company.companyId}`, JSON.stringify(deletedInvoices));
        }
    }, [invoiceHistory, deletedInvoices, company]);

    useEffect(() => {
        if (company?.companyId) {
            localStorage.setItem(`companyInvoiceCounter_${company.companyId}`, invoiceCounter.toString());
        }
    }, [invoiceCounter, company]);

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
        const invoiceAmount = parseFloat(data.invoiceAmount) || parseFloat(company?.serviceCharges) || 0;
        const travelingCharges = parseFloat(data.travelingCharges) || 0;
        const extraCharges = parseFloat(data.extraCharges) || 0;
        return invoiceAmount + travelingCharges + extraCharges;
    };

    const isDuplicateInvoice = (invoiceData) => {
        if (!invoiceData.serviceDate) return false;

        return invoiceHistory.some(invoice => {
            return invoice.data.serviceDate === invoiceData.serviceDate &&
                invoice.companyId === company?.companyId &&
                invoice.id !== editingInvoiceId;
        });
    };

    const findExistingInvoiceByServiceDate = (serviceDate) => {
        if (!serviceDate) return null;
        return invoiceHistory.find(invoice =>
            invoice.data.serviceDate === serviceDate &&
            invoice.companyId === company?.companyId
        );
    };

    const saveInvoiceToHistory = async () => {
        const totalAmount = calculateTotalAmount(invoiceData);
    
        if (isEditingExisting && editingInvoiceId) {
            const existingInvoice = invoiceHistory.find(inv => inv.id === editingInvoiceId);
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
    
            setTimeout(() => {
                if (iframeRef.current) {
                    iframeRef.current.srcdoc = buildInvoiceHTML();
                }
            }, 100);
    
            return;
        }
    
        if (editingInvoiceId && !isEditingExisting) {
            setSaveMessage({
                type: 'info',
                text: 'You are viewing an existing invoice. Click "Edit" to make changes or "Save Invoice to History" to create a new one.'
            });
            setTimeout(() => setSaveMessage({ type: '', text: '' }), 3000);
            return;
        }
        
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
            companyName: company?.companyName || '',
            companyId: company?.companyId || '',
            workerName: invoiceData.workerName || worker?.firstName ? `${worker.firstName} ${worker.lastName}`.trim() : '',
            workerId: invoiceData.workerId || worker?.idNo || '',
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
            setInvoiceData({
                ...formData,
                thankYouType: existingInvoice.data.thankYouType || invoiceData.thankYouType,
                customThankYou: existingInvoice.data.customThankYou || invoiceData.customThankYou,
                workerId: existingInvoice.data.workerId || invoiceData.workerId,
                workerName: existingInvoice.data.workerName || invoiceData.workerName,
                workerDepartment: existingInvoice.data.workerDepartment || invoiceData.workerDepartment,
                workerPhone: existingInvoice.data.workerPhone || invoiceData.workerPhone,
                invoiceNumber: existingInvoice.invoiceNumber
            });
        } else {
            setIsEditingExisting(false);
            setEditingInvoiceId(null);
            setInvoiceData({
                ...formData,
                thankYouType: invoiceData.thankYouType,
                customThankYou: invoiceData.customThankYou,
                workerId: invoiceData.workerId,
                workerName: invoiceData.workerName,
                workerDepartment: invoiceData.workerDepartment,
                workerPhone: invoiceData.workerPhone,
                invoiceNumber: ''
            });
        }

        setShowCustomInvoiceForm(false);

        setTimeout(() => {
            if (iframeRef.current) {
                iframeRef.current.srcdoc = buildInvoiceHTML();
            }
        }, 100);
    };

    const handleThankYouTypeChange = (type) => {
        setSelectedThankYouType(type);
        setInvoiceData(prev => ({
            ...prev,
            thankYouType: type
        }));

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

        const serviceCharges = parseFloat(company?.serviceCharges) || 0;
        const currentBalance = Math.max(0, serviceCharges - totalPaid);

        let nextPaymentDate = null;
        if (lastPayment && lastPayment.date) {
            try {
                const lastDate = new Date(lastPayment.date);
                lastDate.setDate(lastDate.getDate() + 29);
                nextPaymentDate = lastDate;
            } catch (e) {
            }
        } else if (company?.contractStartDate) {
            try {
                const startDate = new Date(company.contractStartDate);
                startDate.setDate(startDate.getDate() + 29);
                nextPaymentDate = startDate;
            } catch (e) {
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
        
        if (editingInvoiceId) {
            const existingInvoice = invoiceHistory.find(inv => inv.id === editingInvoiceId);
            if (existingInvoice) return existingInvoice.invoiceNumber;
        }
        
        if (invoiceData.invoiceNumber && invoiceData.invoiceNumber.trim() !== '') {
            return invoiceData.invoiceNumber;
        }
        
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = now.toLocaleString('en-US', { month: 'short' });
        const companyId = company?.companyId || 'CO-HC-01';
    
        const currentMonthYear = `${month}-${year}`;
        const monthInvoices = invoiceHistory.filter(inv =>
            inv.invoiceNumber.includes(currentMonthYear) && !inv.isDeleted
        );
        const monthIndex = monthInvoices.length + 1;
    
        return `${companyId}-${month}-${year}${monthIndex > 1 ? `-${monthIndex}` : ''}`;
    }, [billNumber, company, invoiceHistory, editingInvoiceId, invoiceData.invoiceNumber]);

    useEffect(() => {
        if (invoiceHistory.length > 0 && !isEditingExisting) {
            const latestInvoice = invoiceHistory[0];
            if (latestInvoice && latestInvoice.invoiceNumber === generatedInvoiceNumber) {
                const currentMonthYear = new Date().toLocaleString('en-US', { month: 'short' }) + '-' + new Date().getFullYear().toString().slice(-2);
                const monthInvoices = invoiceHistory.filter(inv =>
                    inv.invoiceNumber.includes(currentMonthYear) && !inv.isDeleted
                );
                setInvoiceCounter(monthInvoices.length);
            }
        }
    }, [invoiceHistory, generatedInvoiceNumber, isEditingExisting]);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            const day = date.getDate().toString().padStart(2, '0');
            const month = date.toLocaleString('en-US', { month: 'short' });
            const year = date.getFullYear().toString().slice(-2);
            return `${day}-${month}-${year}`;
        } catch (error) {
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

    const buildCompanyDetailsTable = () => {
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

        const companyPhone = safe(
            company?.officialPhone || 
            company?.primaryMobile || 
            company?.primaryContactPhone
        );
        
        const primaryContact = safe(
            company?.primaryContactName || 
            company?.primaryContact
        );
        
        const primaryMobile = safe(
            company?.primaryMobile || 
            company?.primaryContactPhone
        );
        
        const financeContact = safe(
            company?.financeContactName || 
            company?.financeContact
        );
        
        const financeMobile = safe(
            company?.financeMobile || 
            company?.financeContactPhone
        );
        
        const companyLocation = safe(
            company?.registeredDistrict || 
            company?.registeredVillage || 
            company?.registeredState
        );

        return `
            <div class="company-section" style="margin: 20px 0;">
                <h4 style="background: linear-gradient(135deg, #02acf2 0%, #0266f2 100%); color: white; padding: 12px 15px; margin: 0; font-size: 16px; border-radius: 5px 5px 0 0;">Company Details</h4>
                <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-top: none; border-radius: 0 0 5px 5px; padding: 15px;">
                    
                    <div class="section-header" style="background: #e9ecef; padding: 8px 12px; margin: -15px -15px 12px -15px; font-weight: bold; color: #0266f2; border-bottom: 1px solid #dee2e6;">
                        Basic Information
                    </div>
                    
                    <div class="grid-layout" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px; margin-bottom: 20px;">
                        <div class="info-item" style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #e5e5e5;">
                            <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Company ID</div>
                            <div style="font-size: 12px; font-weight: bold; color: #333;">${safe(company?.companyId)}</div>
                        </div>
                        <div class="info-item" style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #e5e5e5;">
                            <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Company Name</div>
                            <div style="font-size: 12px; font-weight: bold; color: #333;">${safe(company?.companyName)}</div>
                        </div>
                        <div class="info-item" style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #e5e5e5;">
                            <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Company Type</div>
                            <div style="font-size: 12px; font-weight: bold; color: #333;">${safe(company?.companyType)}</div>
                        </div>

                        <div class="info-item" style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #e5e5e5;">
                            <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Official Phone</div>
                            <div style="font-size: 12px; font-weight: bold; color: #333;">${companyPhone}</div>
                        </div>
                        <div class="info-item" style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #e5e5e5;">
                            <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Official Email</div>
                            <div style="font-size: 12px; font-weight: bold; color: #333;">${safe(company?.officialEmail)}</div>
                        </div>
                        <div class="info-item" style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #e5e5e5;">
                            <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Website</div>
                            <div style="font-size: 12px; font-weight: bold; color: #333;">${safe(company?.websiteUrl)}</div>
                        </div>
                    </div>
                    
                    <div class="section-header" style="background: #e9ecef; padding: 8px 12px; margin: 0 -15px 12px -15px; font-weight: bold; color: #0266f2; border-bottom: 1px solid #dee2e6;">
                        Address & Contact Details
                    </div>
                    
                    <div class="grid-layout" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px;">
                        <div class="info-item" style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #e5e5e5;">
                            <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Registered Address</div>
                            <div style="font-size: 12px; font-weight: bold; color: #333;">
                                ${safe(company?.registeredBuilding)} ${safe(company?.registeredStreet)}, 
                                ${safe(company?.registeredVillage)}, ${companyLocation}
                            </div>
                        </div>
                        <div class="info-item" style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #e5e5e5; background: linear-gradient(135deg, #f0f8ff 0%, #e6f2ff 100%);">
                            <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Primary Contact</div>
                            <div style="font-size: 12px; font-weight: bold; color: #0266f2; font-size: 14px;">${primaryContact}</div>
                            <div style="font-size: 11px; color: #666;">${primaryMobile}</div>
                        </div>
                        <div class="info-item" style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #e5e5e5;">
                            <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Finance Contact</div>
                            <div style="font-size: 12px; font-weight: bold; color: #333;">${financeContact}</div>
                            <div style="font-size: 11px; color: #666;">${financeMobile}</div>
                        </div>
                        ${invoiceData.workerName ? `
                        <div class="info-item" style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #e5e5e5; background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);">
                            <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Assigned Worker</div>
                            <div style="font-size: 12px; font-weight: bold; color: #2e7d32;">${safe(invoiceData.workerName)}</div>
                            <div style="font-size: 11px; color: #666;">
                                ID: ${safe(invoiceData.workerId)} | 
                                Dept: ${safe(invoiceData.workerDepartment)} |
                                Phone: ${safe(invoiceData.workerPhone)}
                            </div>
                        </div>
                        ` : ''}
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
                        .company-section {
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
        const companyName = company?.companyName || 'Company';
        const companyId = company?.companyId || 'N/A';
        
        const companyLocation = company?.registeredDistrict || 
                               company?.registeredVillage || 
                               company?.registeredState || 
                               'N/A';
        
        const companyPhone = company?.officialPhone || 
                           company?.primaryMobile || 
                           company?.primaryContactPhone || 
                           'N/A';
        
        const serviceType = company?.companyType || 'N/A';
        const primaryContact = company?.primaryContactName || 
                              company?.primaryContact || 
                              'N/A';
        
        const serviceCharges = company?.serviceCharges || '0';
        const contractStartDate = company?.contractStartDate ? formatDate(company.contractStartDate) : 'N/A';

        const gapInfo = invoiceData.gapIfAny || 'None';
        const travelingCharges = parseFloat(invoiceData.travelingCharges) || 0;
        const extraCharges = parseFloat(invoiceData.extraCharges) || 0;
        const serviceDate = invoiceData.serviceDate ? formatDate(invoiceData.serviceDate) : contractStartDate;
        const autoFillDate = invoiceData.serviceDate ? formatDate(calculateAutoFillDate(invoiceData.serviceDate)) : (company?.contractStartDate ? formatDate(calculateAutoFillDate(company.contractStartDate)) : 'N/A');
        const invoiceDate = invoiceData.invoiceDate ? formatDate(invoiceData.invoiceDate) : currentDate;
        const invoiceAmount = parseFloat(invoiceData.invoiceAmount) || parseFloat(company?.serviceCharges) || 0;

        const totalAmount = calculateTotalAmount(invoiceData);
        const totalPaid = paymentDetails.totalPaid || 0;
        const dueAmount = Math.max(0, totalAmount - totalPaid);

        const nextPaymentDate = invoiceData.nextPaymentDate ? formatDate(invoiceData.nextPaymentDate) :
            (paymentDetails.nextPaymentDate ? formatDate(paymentDetails.nextPaymentDate.toISOString()) : 'N/A');

        const thankYouMessage = getCurrentThankYouMessage();

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

        const companyLogo = (company?.companyLogo && company.companyLogo.trim() !== '') 
            ? company.companyLogo 
            : defaultCompanyPhoto;

        const workerDetailsHTML = invoiceData.workerName ? `
            <div class="sec">
                <div class="sec-title"><h3><i class="bi bi-person-badge me-2"></i>Assigned Worker Details</h3></div>
                <div class="sec-body">
                    <div class="worker-details-card" style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 8px; padding: 15px; border-left: 4px solid #0266f2;">
                        <div class="row align-items-center">
                            <div class="col-md-2 text-center">
                                ${(() => {
                                    const foundWorker = workers.find(w => 
                                        w.workerId === invoiceData.workerId || 
                                        w.idNo === invoiceData.workerId
                                    );
                                    const workerPhoto = foundWorker?.profilePhoto || foundWorker?.photo || '';
                                    
                                    if (workerPhoto && workerPhoto.trim() !== '') {
                                        return `
                                            <img src="${workerPhoto}" alt="${invoiceData.workerName}" 
                                                 style="width: 80px; height: 80px; object-fit: cover; border-radius: 50%; border: 3px solid #0266f2;">
                                        `;
                                    } else {
                                        return `
                                            <div style="width: 80px; height: 80px; background: #0266f2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto;">
                                                <i class="bi bi-person" style="font-size: 32px; color: white;"></i>
                                            </div>
                                        `;
                                    }
                                })()}
                            </div>
                            <div class="col-md-10">
                                <div class="row">
                                    <div class="col-md-3 mb-2">
                                        <div style="font-size: 12px; color: #666;">Employee ID</div>
                                        <div style="font-weight: bold; font-size: 14px;">${invoiceData.workerId || 'N/A'}</div>
                                    </div>
                                    <div class="col-md-3 mb-2">
                                        <div style="font-size: 12px; color: #666;">Employee Name</div>
                                        <div style="font-weight: bold; font-size: 14px;">${invoiceData.workerName || 'N/A'}</div>
                                    </div>
                                    <div class="col-md-3 mb-2">
                                        <div style="font-size: 12px; color: #666;">Department</div>
                                        <div style="font-weight: bold; font-size: 14px;">${invoiceData.workerDepartment || 'N/A'}</div>
                                    </div>
                                    <div class="col-md-3 mb-2">
                                        <div style="font-size: 12px; color: #666;">Contact No</div>
                                        <div style="font-weight: bold; font-size: 14px;">${invoiceData.workerPhone || 'N/A'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ` : '';

        const html = `
<!doctype html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice - ${companyName}</title>
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
        
        .company-section {
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
        
        .thank-you-type-indicator {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: bold;
            margin-left: 8px;
            vertical-align: middle;
        }
        
        .type-homeCare {
            background: #d4edda;
            color: #155724;
            max-width:max-content;
        }
        
        .type-housekeeping {
            background: #cce5ff;
            color: #004085;
        }
        
        .type-security {
            background: #fff3cd;
            color: #856404;
        }
        
        .type-custom {
            background: #f8d7da;
            color: #721c24;
        }
        
        .type-default {
            background: #e2e3e5;
            color: #383d41;
        }
        
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
            <h1 class="title">COMPANY SERVICE INVOICE</h1>
            <div class="subtitle">JenCeo Home Care Services & Traders</div>
            <div class="meta">
                <div><strong>Invoice Date:</strong> ${invoiceDate}</div>
                <div><strong>Invoice Number:</strong> ${generatedInvoiceNumber} 
                ${invoiceData.thankYouType && invoiceData.thankYouType !== 'default' ? `<span class="thank-you-type-indicator type-${invoiceData.thankYouType}" style="margin-left: 8px;">${invoiceData.thankYouType.toUpperCase()}</span>` : ''}
                </div>
                <div><strong>Company ID:</strong> ${companyId}</div>
            </div>
        </div>
        <div class="photo-box">
            <img src="${companyLogo}" alt="Company Logo" />
            <div class="rating" style="margin-top: 8px; padding:4px">
                <strong>${companyName}</strong>
            </div>
        </div>
    </div>
    
    ${buildCompanyDetailsTable()}
    
    ${workerDetailsHTML}
    
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
        a.download = `CompanyInvoice_${generatedInvoiceNumber}_${company?.companyName || 'company'}.html`;
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
              `CompanyInvoice_${generatedInvoiceNumber}.html`,
              { type: 'text/html' }
            );
      
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: `Company Invoice - ${generatedInvoiceNumber}`,
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
        const invoiceAmount = parseFloat(invoiceData.invoiceAmount) || parseFloat(company?.serviceCharges) || 0;
        const travelingCharges = parseFloat(invoiceData.travelingCharges) || 0;
        const extraCharges = parseFloat(invoiceData.extraCharges) || 0;
        const totalAmount = calculateTotalAmount(invoiceData);
        const totalPaid = paymentDetails.totalPaid || 0;
        const dueAmount = Math.max(0, totalAmount - totalPaid);
    
        const message = `*Company Invoice Details*\n\n` +
            `*Company:* ${company?.companyName || 'N/A'}\n` +
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
            `Thank you for your partnership!`;
    
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
        window.open(whatsappUrl, '_blank');
    };

    const handleDeleteInvoice = (invoice) => {
        setInvoiceToDelete(invoice);
        setShowDeleteConfirm(true);
    };

    const confirmDeleteInvoice = async () => {
        if (invoiceToDelete) {
            const updatedInvoice = {
                ...invoiceToDelete,
                isDeleted: true,
                deletedAt: new Date().toISOString(),
                deletedBy: 'User'
            };

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

    const handleRestoreInvoice = (invoice) => {
        setInvoiceToRestore(invoice);
        setShowRestoreConfirm(true);
    };

    const confirmRestoreInvoice = async () => {
        if (invoiceToRestore) {
            const restoredInvoice = {
                ...invoiceToRestore,
                isDeleted: false,
                deletedAt: null,
                deletedBy: null
            };

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

    const ThankYouMessageForm = ({ onClose }) => {
        const [tempThankYouType, setTempThankYouType] = useState(invoiceData.thankYouType || 'default');
        const [tempCustomMessage, setTempCustomMessage] = useState(invoiceData.customThankYou || '');

        useEffect(() => {
            if (showThankYouMessageForm) {
                setTempThankYouType(invoiceData.thankYouType || 'default');
                setTempCustomMessage(invoiceData.customThankYou || '');
            }
        }, [showThankYouMessageForm]);

        const handleTypeChange = (type) => {
            setTempThankYouType(type);
            if (type !== 'custom') {
                setTempCustomMessage('');
            }
        };

        const handleApply = () => {
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

            setShowThankYouMessageForm(false);

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
                                            <small className="d-block text-muted">Generic thank you message for all companies</small>
                                        </label>
                                    </div>

                                    <div className="form-check mb-2">
                                        <input
                                            className="form-check-input"
                                            type="radio"
                                            name="thankYouType"
                                            id="homeCare"
                                            value="homeCare"
                                            checked={tempThankYouType === 'homeCare'}
                                            onChange={(e) => handleTypeChange(e.target.value)}
                                        />
                                        <label className="form-check-label" htmlFor="homeCare">
                                            <strong>Home Care</strong>
                                            <small className="d-block text-muted">For home care and healthcare companies</small>
                                        </label>
                                    </div>

                                    <div className="form-check mb-2">
                                        <input
                                            className="form-check-input"
                                            type="radio"
                                            name="thankYouType"
                                            id="housekeeping"
                                            value="housekeeping"
                                            checked={tempThankYouType === 'housekeeping'}
                                            onChange={(e) => handleTypeChange(e.target.value)}
                                        />
                                        <label className="form-check-label" htmlFor="housekeeping">
                                            <strong>Housekeeping</strong>
                                            <small className="d-block text-muted">For cleaning and maintenance companies</small>
                                        </label>
                                    </div>

                                    <div className="form-check mb-2">
                                        <input
                                            className="form-check-input"
                                            type="radio"
                                            name="thankYouType"
                                            id="security"
                                            value="security"
                                            checked={tempThankYouType === 'security'}
                                            onChange={(e) => handleTypeChange(e.target.value)}
                                        />
                                        <label className="form-check-label" htmlFor="security">
                                            <strong>Security</strong>
                                            <small className="d-block text-muted">For security services companies</small>
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
                                                    {tempThankYouType === 'custom' ? 'Thank You Message' : thankYouMessages[tempThankYouType]?.title || 'Thank You for Your Partnership!'}
                                                </h5>
                                                <div dangerouslySetInnerHTML={{
                                                    __html: getMessagePreview().replace(
                                                        company?.companyName || 'Company',
                                                        `<strong>${company?.companyName || 'Company'}</strong>`
                                                    )
                                                }} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3">
                                        <div className="alert alert-info text-info">
                                            <i className="bi bi-info-circle me-2"></i>
                                            <strong>Current Company Type:</strong> {company?.companyType || 'Not specified'}
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

    const CustomInvoiceForm = ({ invoiceData, onApply, onClose }) => {
        const [formData, setFormData] = useState(invoiceData);
        const [existingInvoice, setExistingInvoice] = useState(null);
        const [searchValue, setSearchValue] = useState('');

        useEffect(() => {
            if (showCustomInvoiceForm) {
                setFormData(invoiceData);
                setSearchValue(invoiceData.workerName || '');
                if (invoiceData.serviceDate) {
                    const existing = findExistingInvoiceByServiceDate(invoiceData.serviceDate);
                    setExistingInvoice(existing);
                }
            }
        }, [showCustomInvoiceForm, invoiceData]);

        const handleSearchChange = (e) => {
            const value = e.target.value;
            setSearchValue(value);
            
            if (!value.trim()) {
                setFormData(prev => ({
                    ...prev,
                    workerId: '',
                    workerName: '',
                    workerDepartment: '',
                    workerPhone: ''
                }));
            }
        };

        const handleSearchKeyPress = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (searchValue.trim()) {
                    const foundWorker = workers.find(w => 
                        (w.idNo && w.idNo.toLowerCase().includes(searchValue.toLowerCase())) ||
                        (w.workerId && w.workerId.toLowerCase().includes(searchValue.toLowerCase())) ||
                        formatWorkerName(w).toLowerCase().includes(searchValue.toLowerCase())
                    );
                    
                    if (foundWorker) {
                        const normalized = normalizeWorker(foundWorker);
                        
                        setFormData(prev => ({
                            ...prev,
                            workerId: normalized.workerId,
                            workerName: normalized.workerName,
                            workerDepartment: normalized.department,
                            workerPhone: normalized.phone
                        }));
                        
                        setSearchValue(normalized.workerName);
                    }
                }
            }
        };

        const handleWorkerSelect = (workerItem) => {
            const normalized = normalizeWorker(workerItem);
            
            setFormData(prev => ({
                ...prev,
                workerId: normalized.workerId,
                workerName: normalized.workerName,
                workerDepartment: normalized.department,
                workerPhone: normalized.phone
            }));
            
            setSearchValue(normalized.workerName);
        };

        const handleServiceDateChange = (e) => {
            const serviceDate = e.target.value;
            const autoFillDate = calculateAutoFillDate(serviceDate);
            const nextPaymentDate = new Date(autoFillDate);
            nextPaymentDate.setDate(nextPaymentDate.getDate());
        
            const existing = findExistingInvoiceByServiceDate(serviceDate);
            setExistingInvoice(existing);
        
            const updatedData = {
                serviceDate,
                autoFillDate,
                nextPaymentDate: nextPaymentDate.toISOString().split('T')[0],
                invoiceAmount: existing ? (existing.data.invoiceAmount || formData.invoiceAmount) : formData.invoiceAmount,
                travelingCharges: existing ? (existing.data.travelingCharges || formData.travelingCharges) : formData.travelingCharges,
                extraCharges: existing ? (existing.data.extraCharges || formData.extraCharges) : formData.extraCharges,
                gapIfAny: existing ? (existing.data.gapIfAny || formData.gapIfAny) : formData.gapIfAny,
                remarks: existing ? (existing.data.remarks || formData.remarks) : formData.remarks,
                additionalComments: existing ? (existing.data.additionalComments || formData.additionalComments) : formData.additionalComments,
                thankYouType: existing ? (existing.data.thankYouType || formData.thankYouType) : formData.thankYouType,
                customThankYou: existing ? (existing.data.customThankYou || formData.customThankYou) : formData.customThankYou,
            };
        
            if (existing && existing.data.workerId) {
                updatedData.workerId = existing.data.workerId || formData.workerId;
                updatedData.workerName = existing.data.workerName || formData.workerName;
                updatedData.workerDepartment = existing.data.workerDepartment || formData.workerDepartment;
                updatedData.workerPhone = existing.data.workerPhone || formData.workerPhone;
            }
        
            setFormData(prev => ({
                ...prev,
                ...updatedData
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

        const filteredWorkers = searchValue ? workers.filter(w => 
            (w.idNo && w.idNo.toLowerCase().includes(searchValue.toLowerCase())) ||
            (w.workerId && w.workerId.toLowerCase().includes(searchValue.toLowerCase())) ||
            formatWorkerName(w).toLowerCase().includes(searchValue.toLowerCase())
        ).slice(0, 5) : [];

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
                                <div className="alert alert-warning alert-dismissible fade show text-dark" role="alert">
                                    <i className="bi bi-info-circle me-2"></i>
                                    <strong>Editing existing invoice:</strong> Invoice #{existingInvoice.invoiceNumber} for service date {formatDate(existingInvoice.data.serviceDate)}.
                                    Changes will update the existing invoice.
                                </div>
                            )}

                            <div className="row g-3">
                                <div className="col-md-12">
                                    <div className="card mb-3">
                                        <div className="card-header bg-light">
                                            <strong><i className="bi bi-person-badge me-2"></i>Select Assigned Worker</strong>
                                        </div>
                                        <div className="card-body">
                                            <div className="row g-3">
                                                <div className="col-md-6">
                                                    <label className="form-label"><strong>Search Worker</strong></label>
                                                    <div className="input-group">
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            value={searchValue}
                                                            onChange={handleSearchChange}
                                                            onKeyPress={handleSearchKeyPress}
                                                            placeholder="Search by ID or Name..."
                                                        />
                                                        <button
                                                            className="btn btn-outline-secondary"
                                                            type="button"
                                                            onClick={() => {
                                                                setSearchValue('');
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    workerId: '',
                                                                    workerName: '',
                                                                    workerDepartment: '',
                                                                    workerPhone: ''
                                                                }));
                                                            }}
                                                        >
                                                            <i className="bi bi-x"></i>
                                                        </button>
                                                    </div>
                                                    
                                                    {searchValue && filteredWorkers.length > 0 && (
                                                        <div className="mt-2">
                                                            <small className="text-muted">Available Workers:</small>
                                                            <div className="list-group mt-1" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                                                {filteredWorkers.map((workerItem) => (
                                                                    <button
                                                                        key={workerItem.key}
                                                                        type="button"
                                                                        className="list-group-item list-group-item-action py-2"
                                                                        onClick={() => handleWorkerSelect(workerItem)}
                                                                    >
                                                                        <div className="d-flex justify-content-between align-items-center">
                                                                            <div>
                                                                                <strong>{formatWorkerName(workerItem)}</strong>
                                                                                <small className="d-block text-muted">
                                                                                    ID: {workerItem.workerId || workerItem.idNo || 'N/A'} | 
                                                                                    Dept: {workerItem.department || 'N/A'}
                                                                                </small>
                                                                            </div>
                                                                            <i className="bi bi-chevron-right"></i>
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div className="col-md-6">
                                                    <div className="card bg-light">
                                                        <div className="card-body">
                                                            <h6 className="card-title">
                                                                <i className="bi bi-person-check me-2"></i>
                                                                Selected Worker
                                                            </h6>
                                                            {formData.workerName ? (
                                                                <div className="row g-2">
                                                                    <div className="col-12">
                                                                        <div className="d-flex align-items-center mb-2">
                                                                            <div className="me-2">
                                                                                <i className="bi bi-person-circle" style={{ fontSize: '24px', color: '#0266f2' }}></i>
                                                                            </div>
                                                                            <div>
                                                                                <strong>{formData.workerName}</strong>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="col-md-6">
                                                                        <small className="text-muted d-block">Worker ID</small>
                                                                        <div className="fw-bold">{formData.workerId || 'N/A'}</div>
                                                                    </div>
                                                                    <div className="col-md-6">
                                                                        <small className="text-muted d-block">Department</small>
                                                                        <div className="fw-bold">{formData.workerDepartment || 'N/A'}</div>
                                                                    </div>
                                                                    <div className="col-12">
                                                                        <small className="text-muted d-block">Contact Number</small>
                                                                        <div className="fw-bold">{formData.workerPhone || 'N/A'}</div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="text-center py-3">
                                                                    <i className="bi bi-person-x display-6 text-muted"></i>
                                                                    <p className="mt-2 small text-muted">No worker selected</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

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
                                        Default: ₹{formatAmount(parseFloat(company?.serviceCharges) || 0)}
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

    const InvoiceHistoryTable = () => (
        <div className="invoice-history-table p-3">
            <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <table className="table table-sm table-hover" style={{ fontSize: '12px' }}>
                    <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                        <tr>
                            <th>Invoice #</th>
                            <th>Date</th>
                            <th>Company</th>
                            <th>Amount</th>
                            <th>Service Date</th>
                            <th>Worker</th>
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
                                    <td>{invoice.companyName}</td>
                                    <td className="text-success">
                                        <div>₹{formatAmount(invoiceTotal)}</div>
                                        <small className="small-text text-warning">
                                            Base: ₹{formatAmount(invoice.data.invoiceAmount || company?.serviceCharges || 0)}
                                        </small>
                                    </td>
                                    <td>{formatDate(invoice.data.serviceDate)}</td>
                                    <td>{invoice.data.workerName || invoice.workerName || 'N/A'}</td>
                                    <td>
                                        <button
                                            className="btn btn-sm btn-outline-info me-1"
                                            onClick={() => {
                                                setInvoiceData(invoice.data);
                                                setIsEditingExisting(false);
                                                setEditingInvoiceId(null);
                                                setSelectedWorkerId(invoice.data.workerId || '');
                                                setActiveTab('preview');
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
                                        
                                        <button
                                            className="btn btn-sm btn-outline-primary me-1"
                                            onClick={() => {
                                                setInvoiceData(invoice.data);
                                                setIsEditingExisting(true);
                                                setEditingInvoiceId(invoice.id);
                                                setSelectedWorkerId(invoice.data.workerId || '');
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
                                <th>Company</th>
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
                                        <td>{invoice.companyName}</td>
                                        <td className="text-success">
                                            <div>₹{formatAmount(invoiceTotal)}</div>
                                            <small className="small-text text-warning">
                                                Base: ₹{formatAmount(invoice.data.invoiceAmount || company?.serviceCharges || 0)}
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
                    <h5 className="mb-3">Company Invoice Generation</h5>
                    <p className="small-text text-warning mb-4">Generate and share invoice for this company</p>
                    <button
                        type="button"
                        className="btn btn-primary btn-lg"
                        onClick={handleOpenInvoice}
                    >
                        <i className="bi bi-receipt me-2"></i>
                        Generate Company Invoice
                    </button>
                </div>
            );
        }

        return (
            <>
                {showDeleteConfirm && (
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
                                                <p className="card-text mb-1"><strong>Company:</strong> {invoiceToDelete.companyName}</p>
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
                )}

                {showRestoreConfirm && (
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
                                                <p className="card-text mb-1"><strong>Company:</strong> {invoiceToRestore.companyName}</p>
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
                )}

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
                            Company Invoice - {generatedInvoiceNumber}
                            {isEditingExisting && (
                                <span className="badge bg-warning ms-2">
                                    <i className="bi bi-pencil me-1"></i>
                                    Editing
                                </span>
                            )}
                            {invoiceData.thankYouType && invoiceData.thankYouType !== 'default' && (
                                <span className={`badge ${invoiceData.thankYouType === 'homeCare' ? 'bg-success' :
                                        invoiceData.thankYouType === 'housekeeping' ? 'bg-info' :
                                            invoiceData.thankYouType === 'security' ? 'bg-warning text-dark' :
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
                                    title="Company Invoice Preview"
                                    style={{
                                        width: "100%",
                                        height: "650px",
                                        border: "1px solid #e5e5e5",
                                        borderRadius: 8,
                                        background: "white"
                                    }}
                                />

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
                                                setSelectedWorkerId('');
                                                setInvoiceData({
                                                    serviceDate: '',
                                                    invoiceDate: new Date().toISOString().split('T')[0],
                                                    invoiceAmount: company?.serviceCharges || '',
                                                    gapIfAny: '',
                                                    travelingCharges: '',
                                                    extraCharges: '',
                                                    remarks: '',
                                                    additionalComments: '',
                                                    serviceRemarks: '',
                                                    nextPaymentDate: '',
                                                    thankYouType: determineServiceType(),
                                                    customThankYou: '',
                                                    workerId: '',
                                                    workerName: '',
                                                    workerDepartment: '',
                                                    workerPhone: '',
                                                    invoiceNumber: ''
                                                });

                                                if (showThankYouMessageForm) {
                                                    setShowThankYouMessageForm(false);
                                                }

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

    export default CompanyInvoice;