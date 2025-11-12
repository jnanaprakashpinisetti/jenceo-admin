// src/components/Customer/CustomerModal.jsx
import React, { useState, useEffect } from 'react';
import firebaseDB from '../../firebase';
import ShopForm from '../Shop/ShopForm';
import ShareBill from '../Shop/ShareBill';

const CustomerModal = ({ customer, onClose }) => {
    const [activeTab, setActiveTab] = useState("basic");
    const [customerItems, setCustomerItems] = useState([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [showShopForm, setShowShopForm] = useState(false); // State to control ShopForm modal

    // Enhanced language mapping for categories with English and Hindi
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

    // Load customer items
    useEffect(() => {
        if (customer && customer.id) {
            loadCustomerItems(customer.id);
        }
    }, [customer]);

const loadCustomerItems = async (customerId) => {
    setLoadingItems(true);
    try {
        // Try this path first - based on your description
        const ref = firebaseDB.child(`Shop/CreditData/${customerId}/CustomerItems`);
        const snapshot = await ref.once('value');
        const itemsData = snapshot.val() || {};

        // If no data found, try the original path as fallback
        if (Object.keys(itemsData).length === 0) {
            const fallbackRef = firebaseDB.child(`Shop/CustomerItems/${customerId}`);
            const fallbackSnapshot = await fallbackRef.once('value');
            const fallbackData = fallbackSnapshot.val() || {};
            
            const itemsList = Object.entries(fallbackData).map(([itemId, item]) => ({
                id: itemId,
                ...item
            }));
            setCustomerItems(itemsList);
        } else {
            const itemsList = Object.entries(itemsData).map(([itemId, item]) => ({
                id: itemId,
                ...item
            }));
            setCustomerItems(itemsList);
        }
    } catch (error) {
        console.error("Error loading customer items:", error);
        // Try alternative paths if main path fails
        try {
            const alternativeRef = firebaseDB.child(`Shop/CustomerItems/${customerId}`);
            const alternativeSnapshot = await alternativeRef.once('value');
            const alternativeData = alternativeSnapshot.val() || {};
            
            const itemsList = Object.entries(alternativeData).map(([itemId, item]) => ({
                id: itemId,
                ...item
            }));
            setCustomerItems(itemsList);
        } catch (fallbackError) {
            console.error("Fallback path also failed:", fallbackError);
            setCustomerItems([]);
        }
    } finally {
        setLoadingItems(false);
    }
};

    // Calculate total
    const totalAmount = customerItems.reduce((sum, item) => sum + (item.total || 0), 0);

    // Function to get translation
    const getTranslation = (text, language, isSubCategory = false, mainCategory = '') => {
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

        return text;
    };

    // Get character badge color and label
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

    // Handle shop form submission
    const handleShopFormSubmit = async (formData) => {
        try {
            // Add customer ID to form data
            const itemData = {
                ...formData,
                customerId: customer.id,
                date: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
                timestamp: Date.now()
            };

            // Save to Firebase under the customer's items
            const ref = firebaseDB.child(`Shop/CustomerItems/${customer.id}`);
            const newItemRef = ref.push();
            await newItemRef.set(itemData);

            // Reload customer items to show the new item
            await loadCustomerItems(customer.id);

            // Close the shop form
            setShowShopForm(false);

            console.log('Item added successfully:', itemData);
        } catch (error) {
            console.error('Error adding item:', error);
            alert('Error adding item. Please try again.');
        }
    };

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
                        {/* Header */}
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

                        {/* Tabs Navigation */}
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

                        {/* Tab Content */}
                        <div className="modal-body p-4">
                            {activeTab === "basic" && (
                                <div className="row g-4">
                                    <div className="col-md-6">
                                        <div className="card bg-dark border-secondary h-100">
                                            <div className="card-header bg-primary bg-opacity-25">
                                                <h6 className="mb-0 text-white">
                                                    <i className="fas fa-info-circle me-2"></i>
                                                    Personal Information
                                                </h6>
                                            </div>
                                            <div className="card-body">
                                                <div className="row g-3">
                                                    <div className="col-6">
                                                        <label className="text-muted small">ID No</label>
                                                        <div className="text-white fw-semibold">
                                                            {customer?.idNo || 'N/A'}
                                                        </div>
                                                    </div>
                                                    <div className="col-6">
                                                        <label className="text-muted small">Gender</label>
                                                        <div className="text-white fw-semibold">
                                                            {customer?.gender ? customer.gender.charAt(0).toUpperCase() + customer.gender.slice(1) : 'N/A'}
                                                        </div>
                                                    </div>
                                                    <div className="col-12">
                                                        <label className="text-muted small">Name</label>
                                                        <div className="text-white fw-semibold fs-5">
                                                            {customer?.name || 'N/A'}
                                                        </div>
                                                    </div>
                                                    <div className="col-12">
                                                        <label className="text-muted small">Place</label>
                                                        <div className="text-white fw-semibold">
                                                            {customer?.place || 'N/A'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="card bg-dark border-secondary h-100">
                                            <div className="card-header bg-success bg-opacity-25">
                                                <h6 className="mb-0 text-white">
                                                    <i className="fas fa-phone me-2"></i>
                                                    Contact Information
                                                </h6>
                                            </div>
                                            <div className="card-body">
                                                <div className="row g-3">
                                                    <div className="col-12">
                                                        <label className="text-muted small">Mobile No</label>
                                                        <div className="text-white fw-semibold">
                                                            {customer?.mobileNo || 'N/A'}
                                                        </div>
                                                    </div>
                                                    <div className="col-12">
                                                        <label className="text-muted small">Alternate Mobile</label>
                                                        <div className="text-white fw-semibold">
                                                            {customer?.mobileNo2 || 'N/A'}
                                                        </div>
                                                    </div>
                                                    <div className="col-12">
                                                        <label className="text-muted small">Email</label>
                                                        <div className="text-white fw-semibold">
                                                            {customer?.email || 'N/A'}
                                                        </div>
                                                    </div>
                                                    <div className="col-12">
                                                        <label className="text-muted small">Address</label>
                                                        <div className="text-white fw-semibold">
                                                            {customer?.address || 'N/A'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-12">
                                        <div className="card bg-dark border-secondary">
                                            <div className="card-header bg-warning bg-opacity-25">
                                                <h6 className="mb-0 text-white">
                                                    <i className="fas fa-chart-line me-2"></i>
                                                    Customer Rating & Status
                                                </h6>
                                            </div>
                                            <div className="card-body">
                                                <div className="row g-3">
                                                    <div className="col-md-4">
                                                        <label className="text-muted small">Character Rating</label>
                                                        <div>
                                                            <span className={`badge bg-${characterInfo.color} fs-6`}>
                                                                {characterInfo.label}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-4">
                                                        <label className="text-muted small">Status</label>
                                                        <div>
                                                            <span className={`badge ${customer?.status === 'active' ? 'bg-success' : 'bg-danger'} fs-6`}>
                                                                {customer?.status ? customer.status.charAt(0).toUpperCase() + customer.status.slice(1) : 'Active'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-4">
                                                        <label className="text-muted small">Member Since</label>
                                                        <div className="text-white fw-semibold">
                                                            {customer?.date || 'N/A'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                         {activeTab === "items" && (
    <div>
        <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="text-warning mb-0">
                <i className="fas fa-shopping-cart me-2"></i>
                Items List
            </h5>
            <div className="d-flex align-items-center gap-2">
                <span className="badge bg-primary fs-6 me-2">
                    Total: ₹{totalAmount.toFixed(2)}
                </span>
                <button
                    className="btn btn-success btn-sm fw-bold"
                    onClick={() => setShowShopForm(true)}
                    style={{
                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        border: "none",
                        borderRadius: "10px",
                        padding: "8px 16px"
                    }}
                >
                    <i className="fas fa-plus me-2"></i>
                    Add Items
                </button>
            </div>
        </div>

        {loadingItems ? (
            <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2 text-muted">Loading items...</p>
            </div>
        ) : customerItems.length === 0 ? (
            <div className="text-center py-5">
                <div className="text-muted mb-3">
                    <i className="fas fa-shopping-cart fa-3x"></i>
                </div>
                <h5 className="text-muted">No Items Found</h5>
                <p className="text-muted">No items have been added for this customer yet.</p>
                <button
                    className="btn btn-success mt-3"
                    onClick={() => setShowShopForm(true)}
                    style={{
                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        border: "none",
                        borderRadius: "10px",
                        padding: "10px 20px"
                    }}
                >
                    <i className="fas fa-plus me-2"></i>
                    Add First Item
                </button>
            </div>
        ) : (
            <div className="table-responsive">
                <table className="table table-dark table-bordered table-hover align-middle">
                    <thead>
                        <tr style={{
                            background: "linear-gradient(135deg, #059669 0%, #047857 100%)"
                        }}>
                            <th className="text-center">
                                <input 
                                    type="checkbox" 
                                    className="form-check-input"
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        const updatedItems = customerItems.map(item => ({
                                            ...item,
                                            selected: checked
                                        }));
                                        setCustomerItems(updatedItems);
                                    }}
                                />
                            </th>
                            <th className="text-center">S. No</th>
                            <th className="text-center">Date</th>
                            {/* <th>Main Category</th> */}
                            <th>Sub Category</th>
                            <th className="text-center">Qty (KG)</th>
                            <th className="text-center">Price</th>
                            <th className="text-center">Total</th>
                            {/* <th>Comments</th> */}
                        </tr>
                    </thead>
                    <tbody>
                        {customerItems.map((item, index) => (
                            <tr key={item.id} style={{
                                background: index % 2 === 0
                                    ? "rgba(30, 41, 59, 0.7)"
                                    : "rgba(51, 65, 85, 0.7)"
                            }}>
                                <td className="text-center">
                                    <input 
                                        type="checkbox" 
                                        className="form-check-input"
                                        checked={item.selected || false}
                                        onChange={(e) => {
                                            const updatedItems = [...customerItems];
                                            updatedItems[index] = {
                                                ...updatedItems[index],
                                                selected: e.target.checked
                                            };
                                            setCustomerItems(updatedItems);
                                        }}
                                    />
                                </td>
                                <td className="text-center fw-bold">{index + 1}</td>
                                <td className="text-center">
                                    <span className="text-light">
                                        {item.date}
                                    </span>
                                </td>
                                {/* <td>
                                    <div>
                                        <div className="fw-semibold text-warning">
                                            {item.mainCategory}
                                        </div>
                                        <div className="small text-muted">
                                            {getTranslation(item.mainCategory, 'en')} / {getTranslation(item.mainCategory, 'hi')}
                                        </div>
                                    </div>
                                </td> */}
                                <td>
                                    <div>
                                        <div className="fw-semibold text-warning">
                                            {item.subCategory}
                                        </div>
                                        <div className="small text-muted">
                                            {getTranslation(item.subCategory, 'en', true, item.mainCategory)} / {getTranslation(item.subCategory, 'hi', true, item.mainCategory)}
                                        </div>
                                    </div>
                                </td>
                                <td className="text-center fw-bold">
                                    {item.quantity}
                                </td>
                                <td className="text-center text-success fw-bold">
                                    ₹{item.price}
                                </td>
                                <td className="text-center text-warning fw-bold">
                                    ₹{item.total}
                                </td>
                                {/* <td>
                                    <small className="text-muted">
                                        {item.comments || "No comments"}
                                    </small>
                                </td> */}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr style={{
                            background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)"
                        }}>
                            <td colSpan="6" className="text-end fw-bold text-white">
                                GRAND TOTAL:
                            </td>
                            <td colSpan="3" className="text-center fw-bold text-white fs-5">
                                ₹{totalAmount.toFixed(2)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        )}
    </div>
)}

                            {activeTab === "bill" && (
                                <div className="text-center py-5">
                                    <ShareBill
                                        customer={customer}
                                        customerItems={customerItems}
                                        totalAmount={totalAmount}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Footer */}
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

            {/* Shop Form Modal */}
            {showShopForm && (
                <ShopForm
                    customer={customer}
                    onClose={() => setShowShopForm(false)}
                    onSubmit={handleShopFormSubmit}
                />
            )}
        </>
    );
};

export default CustomerModal;