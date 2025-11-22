import React, { useState, useEffect, useCallback, useMemo } from 'react';
import firebaseDB from '../../firebase';
import ShopForm from '../Shop/ShopForm';
import ShareBill from './ShareBill'; // FIXED: Changed from '../ShareBill' to './ShareBill'
import ItemsList from './ItemsList';
import PaymentModal from './PaymentModal';
import BasicDetails from './BasicDetails';

const CustomerModal = ({ customer, onClose, onDataUpdate }) => {
    const [activeTab, setActiveTab] = useState("basic");
    const [PurchaseItems, setPurchaseItems] = useState([]);
    const [Payments, setPayments] = useState([]);
    const [Balance, setBalance] = useState(null);
    const [loadingItems, setLoadingItems] = useState(false);
    const [showShopForm, setShowShopForm] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedItemsForPayment, setSelectedItemsForPayment] = useState([]);
    const [selectedTotalForPayment, setSelectedTotalForPayment] = useState(0);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [billPayload, setBillPayload] = useState(null);

    const categoryTranslations = {
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

   const loadCustomerData = useCallback(async (customerId) => {
    if (!customerId) {
        return;
    }

    setLoadingItems(true);
    try {
        const purchaseItemsPath = `Shop/CreditData/${customerId}/PurchaseItems`;
        const purchaseItemsRef = firebaseDB.child(purchaseItemsPath);
        const purchaseItemsSnapshot = await purchaseItemsRef.once('value');
        const purchaseItemsData = purchaseItemsSnapshot.val() || {};
        
        const itemsList = Object.entries(purchaseItemsData).map(([itemId, item]) => ({
            id: itemId,
            ...item,
            status: item.status || 'pending',
            total: item.total || '0',
            price: item.price || '0',
            quantity: item.quantity || '0'
        }));

        itemsList.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        setPurchaseItems(itemsList);

        const paymentsPath = `Shop/CreditData/${customerId}/Payments`;
        const paymentsRef = firebaseDB.child(paymentsPath);
        const paymentsSnapshot = await paymentsRef.once('value');
        const paymentsData = paymentsSnapshot.val() || {};
        
        const paymentsList = Object.entries(paymentsData).map(([paymentId, payment]) => ({
            id: paymentId,
            ...payment
        }));

        paymentsList.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        setPayments(paymentsList);

        const balancePath = `Shop/CreditData/${customerId}/Balance`;
        const balanceRef = firebaseDB.child(balancePath);
        const balanceSnapshot = await balanceRef.once('value');
        const balanceData = balanceSnapshot.val() || null;
        setBalance(balanceData);
        
    } catch (error) {
        setPurchaseItems([]);
        setPayments([]);
        setBalance(null);
        showError('Failed to load customer data. Please try again.');
    } finally {
        setLoadingItems(false);
    }
}, []);

    useEffect(() => {
        if (customer && customer.id) {
            loadCustomerData(customer.id);
        } else {
            setPurchaseItems([]);
            setPayments([]);
            setBalance(null);
        }
    }, [customer, refreshTrigger, loadCustomerData]);

    const totalAmount = useMemo(() => {
        return PurchaseItems.reduce((sum, item) => {
            if (item.status !== "paid") {
                return sum + (parseFloat(item.total) || 0);
            }
            return sum;
        }, 0);
    }, [PurchaseItems]);

    const getTranslation = (text, language, isSubCategory = false, mainCategory = '') => {
        if (categoryTranslations[text] && categoryTranslations[text][language]) {
            return categoryTranslations[text][language];
        }

        if (isSubCategory && mainCategory && categoryTranslations[mainCategory]) {
            const subCategoryTranslations = categoryTranslations[mainCategory].subCategories;
            if (subCategoryTranslations && subCategoryTranslations[text] && subCategoryTranslations[text][language]) {
                return subCategoryTranslations[text][language];
            }
        }

        return text;
    };

    const getCharacterInfo = (character) => {
        switch (character) {
            case 'very-good': return { color: 'success', label: 'Very Good' };
            case 'good': return { color: 'info', label: 'Good' };
            case 'average': return { color: 'warning', label: 'Average' };
            case 'bad': return { color: 'danger', label: 'Bad' };
            case 'worst': return { color: 'dark', label: 'Worst' };
            default: return { color: 'secondary', label: 'Not Rated' };
        }
    };

    const handleAddItem = () => {
        setShowShopForm(true);
    };

    const handleShopFormSubmit = useCallback(async (savedData) => {
        try {
            setShowShopForm(false);
            setRefreshTrigger(prev => prev + 1);
            if (onDataUpdate) onDataUpdate();
            showSuccess('Item added successfully!');
        } catch (error) {
            showError('Error adding item. Please try again.');
        }
    }, [onDataUpdate]);

    const handlePayAmount = (items, total) => {
        setSelectedItemsForPayment(items);
        setSelectedTotalForPayment(total);
        setShowPaymentModal(true);
    };

    const handlePaymentSuccess = async (paymentInfo, isFullPayment) => {
        try {
            setSelectedItemsForPayment([]);
            setSelectedTotalForPayment(0);
            setShowPaymentModal(false);

            await loadCustomerData(customer.id);
            setRefreshTrigger(prev => prev + 1);
            
            if (onDataUpdate) onDataUpdate();

            if (isFullPayment) {
                showSuccess(`Payment of ₹${paymentInfo.amount.toFixed(2)} recorded successfully! ${paymentInfo.items.length} items marked as paid.`);
            } else {
                showSuccess(`Partial payment of ₹${paymentInfo.amount.toFixed(2)} recorded successfully!`);
            }

        } catch (error) {
            showError('Error updating payment status. Please refresh the page.');
        }
    };

    const handleCreateBill = (payload) => {
        try {
            if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
                setActiveTab('bill');
                setBillPayload(null);
                return;
            }

            setBillPayload({
                items: payload.items,
                billNumber: payload.billNumber || '',
                billTitle: payload.title || 'Customer Bill'
            });

            setActiveTab('bill');

        } catch (err) {
            setActiveTab('bill');
            setBillPayload(null);
        }
    };

    const handleRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
        if (onDataUpdate) onDataUpdate();
    };

    const showSuccess = (message) => {
        setSuccessMessage(message);
        setShowSuccessModal(true);
    };

    const showError = (message) => {
        setErrorMessage(message);
        setShowErrorModal(true);
    };

    const forceRefreshAllData = useCallback(async () => {
        if (customer?.id) {
            await loadCustomerData(customer.id);
            setRefreshTrigger(prev => prev + 1);
            if (onDataUpdate) onDataUpdate();
        }
    }, [customer, loadCustomerData, onDataUpdate]);

    const characterInfo = getCharacterInfo(customer?.character);

    return (
        <>
            <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.8)", backdropFilter: "blur(5px)" }}>
                <div className="modal-dialog modal-xl modal-dialog-centered">
                    <div className="modal-content overflow-hidden border-0 shadow-lg" style={{
                        background: "linear-gradient(135deg, #1f2937 0%, #111827 100%)",
                        borderRadius: "20px",
                        border: "2px solid rgba(99, 102, 241, 0.3)",
                        boxShadow: "0 25px 50px -12px rgba(99, 102, 241, 0.25)"
                    }}>
                        <div className="modal-header border-0 p-3" style={{
                            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            padding: "2rem 2rem 1.5rem 2rem"
                        }}>
                            <div className="d-flex align-items-center w-100">
                                <div className="flex-shrink-0">
                                    <i className="fas fa-user-circle fa-2x text-white"></i>
                                </div>
                                <div className="flex-grow-1 ms-3">
                                    <h4 className="modal-title text-white fw-bold mb-1">
                                        {customer?.name || 'Customer Details'}
                                    </h4>
                                    <div className="d-flex flex-wrap gap-2 align-items-center">
                                        <span className="badge bg-light text-dark">
                                            <i className="fas fa-id-card me-1"></i>
                                            ID: {customer?.idNo || 'N/A'}
                                        </span>
                                        <span className={`badge bg-${characterInfo.color}`}>
                                            <i className="fas fa-star me-1"></i>
                                            {characterInfo.label}
                                        </span>
                                        <span className="badge bg-warning text-dark">
                                            <i className="fas fa-rupee-sign me-1"></i>
                                            Balance: ₹{totalAmount.toFixed(2)}
                                        </span>
                                        <span className="badge bg-info">
                                            <i className="fas fa-shopping-cart me-1"></i>
                                            Items: {PurchaseItems.length}
                                        </span>
                                        <span className="badge bg-success">
                                            <i className="fas fa-credit-card me-1"></i>
                                            Payments: {Payments.length}
                                        </span>
                                        <span className="badge bg-secondary" title="Debug info">
                                            <i className="fas fa-bug me-1"></i>
                                            {loadingItems ? 'Loading...' : `${PurchaseItems.length} items`}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white flex-shrink-0"
                                    onClick={onClose}
                                    style={{ filter: "brightness(0.8)" }}
                                ></button>
                            </div>
                        </div>

                        <div className="px-4 pt-3">
                            <ul className="nav nav-pills nav-justified gap-2" style={{
                                background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)",
                                borderRadius: "15px",
                                padding: "10px",
                                border: "1px solid rgba(99, 102, 241, 0.3)"
                            }}>
                                {[
                                    { id: "basic", label: "Basic Details", icon: "user" },
                                    { id: "items", label: "Items List", icon: "list" },
                                    { id: "bill", label: "Bill", icon: "credit-card" }
                                ].map(tab => (
                                    <li className="nav-item" key={tab.id}>
                                        <button
                                            className={`nav-link ${activeTab === tab.id ? 'active' : ''} d-flex align-items-center justify-content-center gap-2`}
                                            onClick={() => setActiveTab(tab.id)}
                                            style={{
                                                background: activeTab === tab.id
                                                    ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                                                    : "transparent",
                                                border: "none",
                                                color: activeTab === tab.id ? "white" : "#cbd5e1",
                                                borderRadius: "10px",
                                                padding: "12px 20px",
                                                fontWeight: "600",
                                                transition: "all 0.3s ease"
                                            }}
                                        >
                                            <i className={`fas fa-${tab.icon}`}></i>
                                            {tab.label}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="modal-body p-4">
                            {activeTab === "basic" && (
                                <BasicDetails
                                    customer={customer}
                                    totalAmount={totalAmount}
                                    PurchaseItems={PurchaseItems}
                                    Payments={Payments}
                                    Balance={Balance}
                                    refreshTrigger={refreshTrigger}
                                />
                            )}

                            {activeTab === "items" && (
                                <ItemsList
                                    PurchaseItems={PurchaseItems}
                                    loadingItems={loadingItems}
                                    totalAmount={totalAmount}
                                    onAddItem={handleAddItem}
                                    onRefresh={handleRefresh}
                                    categoryTranslations={categoryTranslations}
                                    getTranslation={getTranslation}
                                    onPayAmount={handlePayAmount}
                                    onCreateBill={handleCreateBill}
                                    onShareBill={(items, billNumber, title) => {
                                        handleCreateBill({ items, billNumber, title });
                                    }}
                                    refreshTrigger={refreshTrigger}
                                />
                            )}

                            {activeTab === "bill" && (
                                <div className="text-center py-5">
                                    <ShareBill
                                        customer={customer}
                                        PurchaseItems={PurchaseItems}
                                        totalAmount={totalAmount}
                                        paymentHistory={Payments}
                                        selectedItems={billPayload?.items || []}
                                        billNumber={billPayload?.billNumber || ''}
                                        billTitle={billPayload?.billTitle || 'Customer Bill'}
                                        categoryTranslations={categoryTranslations}
                                        getTranslation={getTranslation}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="modal-footer border-0 pt-0 px-4 pb-4">
                            <button
                                type="button"
                                className="btn flex-fill py-3 fw-bold border-0"
                                onClick={onClose}
                                style={{
                                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                    color: "white",
                                    borderRadius: "15px",
                                    transition: "all 0.3s ease"
                                }}
                            >
                                <i className="bi bi-times me-2"></i>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {showShopForm && (
                <ShopForm
                    customer={customer}
                    onClose={() => setShowShopForm(false)}
                    onSave={handleShopFormSubmit}
                    mode="customer"
                />
            )}

            {showPaymentModal && (
                <PaymentModal
                    isOpen={showPaymentModal}
                    onClose={() => setShowPaymentModal(false)}
                    selectedItems={selectedItemsForPayment}
                    selectedTotal={selectedTotalForPayment}
                    onPaymentSuccess={handlePaymentSuccess}
                    customerId={customer?.id}
                    customerData={customer}
                    PurchaseItems={PurchaseItems}
                />
            )}

            {showSuccessModal && (
                <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.8)" }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header border-0 bg-success text-white">
                                <h5 className="modal-title fw-bold">
                                    <i className="fas fa-check-circle me-2"></i>
                                    Success
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    onClick={() => setShowSuccessModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body py-4">
                                <p className="mb-0">{successMessage}</p>
                            </div>
                            <div className="modal-footer border-0">
                                <button
                                    type="button"
                                    className="btn btn-success"
                                    onClick={() => setShowSuccessModal(false)}
                                >
                                    Continue
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showErrorModal && (
                <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.8)" }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header border-0 bg-danger text-white">
                                <h5 className="modal-title fw-bold">
                                    <i className="fas fa-exclamation-triangle me-2"></i>
                                    Error
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    onClick={() => setShowErrorModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body py-4">
                                <p className="mb-0">{errorMessage}</p>
                            </div>
                            <div className="modal-footer border-0">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowErrorModal(false)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CustomerModal;