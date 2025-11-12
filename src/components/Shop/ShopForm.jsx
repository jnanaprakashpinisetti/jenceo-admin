import React, { useState, useEffect } from "react";
import firebaseDB from "../../firebase";
import SuccessModal from "../common/SuccessModal";
import { useAuth } from "../../context/AuthContext";

/* ---------------- Helpers ---------------- */
const norm = (s) => String(s || "").trim().toLowerCase();

const pathUnderJenCeo = (relative) => {
    const refStr = typeof firebaseDB?.toString === "function" ? firebaseDB.toString() : "";
    const isScoped =
        (firebaseDB && firebaseDB.key === "JenCeo-DataBase") ||
        (refStr && /\/JenCeo-DataBase\/?$/.test(refStr));

    if (isScoped) return relative.replace(/^\/?JenCeo-DataBase\//, "");
    return `JenCeo-DataBase/${relative.replace(/^\/?JenCeo-DataBase\//, "")}`;
};

// Enhanced category map with English and Hindi translations
const categoryMap = {
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

// Resolve shop branch based on user role
const resolveShopBranch = (authUser, fallback = "users") => {
    const roleRaw = String(authUser?.role || "").toLowerCase();
    if (roleRaw.includes("admin")) return "admin";
    const id = authUser?.uiId || authUser?.uid || authUser?.id || authUser?.email;
    return id ? String(id).replace(/[^\w-]/g, "_") : fallback;
};

export default function ShopForm({ customer, onClose, onSave, mode = "purchase" }) {
    const authCtx = useAuth() || {};
    const { currentUser, user, dbUser, profile } = authCtx;

    const today = new Date();
    const signedInName =
        dbUser?.name ||
        user?.name ||
        profile?.name ||
        currentUser?.displayName ||
        (currentUser?.email ? currentUser.email.split("@")[0] : "") ||
        "User";

    const todayISODateIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const signedInUid = currentUser?.uid || user?.uid || dbUser?.uid || null;
    const signedInRole = dbUser?.role || user?.role || profile?.role || "User";

    const [formData, setFormData] = useState({
        mainCategory: "",
        subCategory: "",
        date: todayISODateIST,
        quantity: "",
        price: "",
        total: "",
        comments: "",
        customItem: "" // For custom items in "Other" category
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitMode, setSubmitMode] = useState(""); // "purchase" or "customer"
    const isOtherSelected = formData.mainCategory === "7 ఇతర వస్తువులు";

    // Success modal
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [savedPurchase, setSavedPurchase] = useState(null);

    // Duplicate modal
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [existingRow, setExistingRow] = useState(null);
    const [pendingPayload, setPendingPayload] = useState(null);

    useEffect(() => {
        const qty = parseFloat(formData.quantity) || 0;
        const price = parseFloat(formData.price) || 0;
        setFormData((prev) => ({ ...prev, total: (qty * price).toString() }));
    }, [formData.quantity, formData.price]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const updated = { ...formData, [name]: value };
        if (name === "mainCategory") {
            updated.subCategory = "";
            updated.customItem = "";
        }
        setFormData(updated);
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.mainCategory) newErrors.mainCategory = "ప్రధాన కేటగిరీ తప్పనిసరి";
        if (!formData.subCategory && !(isOtherSelected && formData.customItem)) {
            newErrors.subCategory = "ఉప కేటగిరీ తప్పనిసరి";
        }
        if (!formData.date) newErrors.date = "తేదీ తప్పనిసరి";
        if (!formData.quantity) newErrors.quantity = "మొత్తం తప్పనిసరి";
        if (!formData.price) newErrors.price = "ధర తప్పనిసరి";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const buildPayload = (key) => {
        const qty = Number(formData.quantity) || 0;
        const price = Number(formData.price) || 0;
        const total = qty * price;
        const nowIso = new Date().toISOString();

        // Use custom item if provided, otherwise use selected subcategory
        const finalSubCategory = isOtherSelected && formData.customItem 
            ? formData.customItem 
            : formData.subCategory;

        const basePayload = {
            id: key,
            mainCategory: formData.mainCategory,
            subCategory: finalSubCategory,
            date: formData.date,
            quantity: qty,
            price,
            total,
            comments: formData.comments || "",
            createdAt: nowIso,
            createdById: signedInUid,
            createdByName: signedInName,
            createdByRole: signedInRole,
            mode: submitMode || mode
        };

        // Add customer info if in customer mode or when using Add Item button
        if ((submitMode === "customer" || mode === "customer") && customer) {
            basePayload.customerId = customer.id;
            basePayload.customerName = customer.name;
            basePayload.customerPhone = customer.mobileNo || customer.mobile;
            basePayload.customerPlace = customer.place;
        }

        return basePayload;
    };

    // ========== SEPARATE SAVE FUNCTIONS ==========

    // 1. SAVE AS CUSTOMER ITEM (Add Item button) - Save ONLY to Shop/CreditData/key/CustomerItems
    const saveAsCustomerItem = async () => {
        if (!customer || !customer.id) {
            throw new Error("Customer information is missing");
        }

        // Build the payload
        const payload = buildPayload(`customer_${Date.now()}`);
        
        // Save to CustomerItems under CreditData
        const customerItemsRef = firebaseDB.child(pathUnderJenCeo(`Shop/CreditData/${customer.id}/CustomerItems`));
        const newRef = customerItemsRef.push();
        await newRef.set(payload);

        // Get current balance
        const balanceRef = firebaseDB.child(pathUnderJenCeo(`Shop/CreditData/${customer.id}/Balance`));
        const snapshot = await balanceRef.once('value');
        const currentBalance = parseFloat(snapshot.val()) || 0;
        
        // Calculate new balance
        const newBalance = currentBalance + payload.total;
        
        // Update balance in CreditData
        await balanceRef.set(newBalance);

        // Also update customer info in CreditData
        const customerRef = firebaseDB.child(pathUnderJenCeo(`Shop/CreditData/${customer.id}`));
        await customerRef.update({
            customerName: customer.name,
            customerPhone: customer.mobileNo || customer.mobile,
            customerPlace: customer.place,
            lastUpdated: new Date().toISOString(),
            updatedBy: signedInName,
            updatedById: signedInUid
        });

        return { 
            ...payload, 
            newBalance, 
            saveLocation: `Shop/CreditData/${customer.id}/CustomerItems` 
        };
    };

    // 2. SAVE AS REGULAR PURCHASE (కొనుగోలు button) - Save ONLY to existing logic
    const saveAsRegularPurchase = async () => {
        const authObj = currentUser || user || dbUser || profile || {};
        const branchKey = resolveShopBranch(authObj);
        const listRef = firebaseDB.child(pathUnderJenCeo(`Shop/${branchKey}`));
        const newRef = listRef.push();
        const payload = buildPayload(newRef.key);
        
        await newRef.set(payload);
        return { ...payload, saveLocation: `Shop/${branchKey}` };
    };

    // ========== SEPARATE DUPLICATE CHECK FUNCTIONS ==========

    const checkDuplicateForCustomerItem = async () => {
        if (!customer || !customer.id) {
            alert("Customer information is missing");
            return false;
        }

        const ref = firebaseDB.child(pathUnderJenCeo(`Shop/CreditData/${customer.id}/CustomerItems`));
        const snap = await ref.once("value");
        const raw = snap.val() || {};

        const finalSubCategory = isOtherSelected && formData.customItem 
            ? formData.customItem 
            : formData.subCategory;

        const exists = Object.values(raw).find(
            (r) => norm(r?.date) === norm(formData.date) && norm(r?.subCategory) === norm(finalSubCategory)
        );

        return exists;
    };

    const checkDuplicateForRegularPurchase = async () => {
        const authObj = currentUser || user || dbUser || profile || {};
        const branchKey = resolveShopBranch(authObj);
        const ref = firebaseDB.child(pathUnderJenCeo(`Shop/${branchKey}`));
        const snap = await ref.once("value");
        const raw = snap.val() || {};

        const finalSubCategory = isOtherSelected && formData.customItem 
            ? formData.customItem 
            : formData.subCategory;

        const exists = Object.values(raw).find(
            (r) => norm(r?.date) === norm(formData.date) && norm(r?.subCategory) === norm(finalSubCategory)
        );

        return exists;
    };

    // ========== SEPARATE SUBMIT HANDLERS ==========

    const handlePurchaseSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        
        setSubmitMode("purchase");
        setIsSubmitting(true);
        try {
            // Check duplicate for regular purchase
            const duplicateExists = await checkDuplicateForRegularPurchase();
            
            if (duplicateExists) {
                const dummyRefKey = "_pending_";
                const nextPayload = buildPayload(dummyRefKey);
                setExistingRow(duplicateExists);
                setPendingPayload(nextPayload);
                setShowDuplicateModal(true);
                return;
            }

            // Save as regular purchase ONLY
            const result = await saveAsRegularPurchase();
            handleSaveSuccess(result);
        } catch (error) {
            console.error("Error saving purchase:", error);
            alert("Error saving purchase: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCustomerItemSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        
        setSubmitMode("customer");
        setIsSubmitting(true);
        try {
            // Check duplicate for customer item
            const duplicateExists = await checkDuplicateForCustomerItem();
            
            if (duplicateExists) {
                const dummyRefKey = "_pending_";
                const nextPayload = buildPayload(dummyRefKey);
                setExistingRow(duplicateExists);
                setPendingPayload(nextPayload);
                setShowDuplicateModal(true);
                return;
            }

            // Save as customer item ONLY
            const result = await saveAsCustomerItem();
            handleSaveSuccess(result);
        } catch (error) {
            console.error("Error saving customer item:", error);
            alert("Error saving customer item: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveSuccess = (result) => {
        setSavedPurchase(result);
        setShowSuccessModal(true);

        // Reset form but keep main category
        setFormData({
            mainCategory: formData.mainCategory,
            subCategory: "",
            date: todayISODateIST,
            quantity: "",
            price: "",
            total: "",
            comments: "",
            customItem: ""
        });

        // Call onSave callback if provided
        if (onSave) {
            onSave(result);
        }
    };

    const performSaveAfterDuplicate = async () => {
        try {
            let result;
            if (submitMode === "customer") {
                result = await saveAsCustomerItem();
            } else {
                result = await saveAsRegularPurchase();
            }
            handleSaveSuccess(result);
        } catch (error) {
            console.error("Error saving after duplicate:", error);
            alert("Error saving: " + error.message);
        }
    };

    const getModalTitle = () => {
        if (mode === "customer") {
            return `Add Items - ${customer?.name || 'Customer'}`;
        } else {
            return "Shop Purchase Form";
        }
    };

    const getSuccessMessage = () => {
        if (!savedPurchase) return <p>Saved successfully</p>;

        if (submitMode === "customer") {
            return (
                <>
                    <p><strong>{savedPurchase.subCategory}</strong> జోడించబడింది!</p>
                    <p>కస్టమర్: {savedPurchase.customerName}</p>
                    <p>తేదీ: {savedPurchase.date}</p>
                    <p>ధర ₹{savedPurchase.price}</p>
                    <p>మొత్తం ₹{savedPurchase.total}</p>
                    <p className="fw-bold text-success">కొత్త బ్యాలెన్స్: ₹{savedPurchase.newBalance?.toFixed(2)}</p>
                    <p className="small text-muted">Saved to: {savedPurchase.saveLocation}</p>
                </>
            );
        } else {
            return (
                <>
                    <p><strong>{savedPurchase.subCategory}</strong> జోడించబడింది!</p>
                    <p>తేదీ: {savedPurchase.date}</p>
                    <p>ధర ₹{savedPurchase.price}</p>
                    <p>మొత్తం ₹{savedPurchase.total}</p>
                    <p className="small text-muted">Saved to: {savedPurchase.saveLocation}</p>
                </>
            );
        }
    };

    return (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.9)" }}>
            <div className="modal-dialog modal-md modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg rounded-4">
                    <div className="modal-header bg-dark text-white">
                        <h5 className="modal-title">
                            {getModalTitle()}
                            {mode === "customer" && (
                                <span className="badge bg-info ms-2">Customer Mode</span>
                            )}
                        </h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>

                    <div className="modal-body bg-dark text-light p-4">
                        {/* Customer Info Display */}
                        {mode === "customer" && customer && (
                            <div className="alert alert-info mb-3">
                                <div className="d-flex align-items-center">
                                    <i className="fas fa-user-circle me-2"></i>
                                    <div>
                                        <strong>{customer.name}</strong>
                                        {customer.mobileNo && <span className="ms-2">📞 {customer.mobileNo}</span>}
                                        {customer.place && <span className="ms-2">📍 {customer.place}</span>}
                                    </div>
                                </div>
                            </div>
                        )}

                        <form>
                            {/* Form fields remain the same */}
                            {/* Date Input */}
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">తేదీ</label>
                                    <input
                                        name="date"
                                        type="date"
                                        className="form-control"
                                        value={formData.date}
                                        onChange={handleChange}
                                    />
                                    {errors.date && <div className="text-danger small">{errors.date}</div>}
                                </div>

                                <div className="col-md-6 mb-3">
                                    <label className="form-label">ప్రధాన కేటగిరీ</label>
                                    <select
                                        name="mainCategory"
                                        className="form-select"
                                        value={formData.mainCategory}
                                        onChange={handleChange}
                                    >
                                        <option value="">ఎంచుకోండి</option>
                                        {Object.keys(categoryMap).map((cat) => (
                                            <option key={cat} value={cat}>
                                                {cat}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.mainCategory && <div className="text-danger small">{errors.mainCategory}</div>}
                                </div>
                            </div>

                            {/* Sub Category */}
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">ఉప కేటగిరీ</label>
                                    {isOtherSelected ? (
                                        <>
                                            <input
                                                name="customItem"
                                                type="text"
                                                className="form-control"
                                                value={formData.customItem}
                                                onChange={handleChange}
                                                placeholder="ఇతర వస్తువు పేరు టైప్ చేయండి"
                                                list="other-suggestions"
                                            />
                                            <datalist id="other-suggestions">
                                                {Object.keys(categoryMap["7 ఇతర వస్తువులు"].subCategories).map((v) => (
                                                    <option key={v} value={v} />
                                                ))}
                                            </datalist>
                                        </>
                                    ) : (
                                        <select
                                            name="subCategory"
                                            className="form-select"
                                            value={formData.subCategory}
                                            onChange={handleChange}
                                        >
                                            <option value="">ఎంచుకోండి</option>
                                            {formData.mainCategory &&
                                                Object.keys(categoryMap[formData.mainCategory].subCategories).map((v) => (
                                                    <option key={v} value={v}>
                                                        {v}
                                                    </option>
                                                ))}
                                        </select>
                                    )}
                                    {errors.subCategory && (
                                        <div className="text-danger small">{errors.subCategory}</div>
                                    )}
                                </div>

                                <div className="col-md-6 mb-3">
                                    <label className="form-label">మొత్తం (K.G)</label>
                                    <input
                                        name="quantity"
                                        type="number"
                                        className="form-control"
                                        value={formData.quantity}
                                        onChange={handleChange}
                                        step="0.01"
                                    />
                                    {errors.quantity && <div className="text-danger small">{errors.quantity}</div>}
                                </div>
                            </div>

                            {/* Price and Total */}
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">ధర</label>
                                    <input
                                        name="price"
                                        type="number"
                                        className="form-control"
                                        value={formData.price}
                                        onChange={handleChange}
                                        step="0.01"
                                    />
                                    {errors.price && <div className="text-danger small">{errors.price}</div>}
                                </div>

                                <div className="col-md-6 mb-3">
                                    <label className="form-label">మొత్తం</label>
                                    <input
                                        name="total"
                                        type="number"
                                        className="form-control bg-secondary text-white"
                                        value={formData.total}
                                        disabled
                                    />
                                </div>
                            </div>

                            <div className="row">
                                <div className="col-12 mb-3">
                                    <label className="form-label">కామెంట్స్</label>
                                    <textarea
                                        name="comments"
                                        rows="2"
                                        className="form-control"
                                        value={formData.comments}
                                        onChange={handleChange}
                                    ></textarea>
                                </div>
                            </div>

                            {/* DUAL SUBMIT BUTTONS WITH SEPARATE HANDLERS */}
                            <div className="row g-2">
                                {mode !== "customer" && (
                                    <div className="col-md-6">
                                        <button 
                                            type="button"
                                            className="btn btn-primary w-100 py-2" 
                                            disabled={isSubmitting}
                                            onClick={handlePurchaseSubmit}
                                        >
                                            {isSubmitting && submitMode === "purchase" ? (
                                                <><i className="fas fa-spinner fa-spin me-2"></i>Submitting...</>
                                            ) : (
                                                <>
                                                    <i className="fas fa-shopping-cart me-2"></i>
                                                    కొనుగోలు
                                                </>
                                            )}
                                        </button>
                                        <div className="form-text text-center text-muted small mt-1">
                                            Save to: Shop/[user-branch]
                                        </div>
                                    </div>
                                )}
                                
                                <div className={mode !== "customer" ? "col-md-6" : "col-12"}>
                                    <button 
                                        type="button"
                                        className="btn btn-success w-100 py-2" 
                                        disabled={isSubmitting}
                                        onClick={handleCustomerItemSubmit}
                                    >
                                        {isSubmitting && submitMode === "customer" ? (
                                            <><i className="fas fa-spinner fa-spin me-2"></i>Adding...</>
                                        ) : (
                                            <>
                                                <i className="fas fa-plus me-2"></i>
                                                Add Item
                                            </>
                                        )}
                                    </button>
                                    <div className="form-text text-center text-muted small mt-1">
                                        Save to: {customer ? `Shop/CreditData/${customer.id}/CustomerItems` : 'Customer Credit Data'}
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Success Modal */}
            <SuccessModal
                show={showSuccessModal}
                title={submitMode === "customer" ? "Item Added Successfully" : "Purchase Saved Successfully"}
                message={getSuccessMessage()}
                onClose={() => setShowSuccessModal(false)}
            />

            {/* Duplicate Confirmation Modal */}
            {showDuplicateModal && (
                <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.8)" }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content bg-dark text-light border-0 rounded-4 shadow-lg">
                            <div className="modal-header bg-warning text-dark">
                                <h5 className="modal-title">ఇప్పటికే జోడించబడింది</h5>
                                <button type="button" className="btn-close" onClick={() => setShowDuplicateModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <p>
                                    <strong className="text-warning">{pendingPayload?.subCategory}</strong> కు{" "}
                                    <strong>{pendingPayload?.date}</strong> తేదీకి ఇప్పటికే ఒక ఎంట్రీ ఉంది.
                                </p>

                                <table className="table table-bordered table-dark text-center">
                                    <thead>
                                        <tr>
                                            <th>ఫీల్డ్</th>
                                            <th>ఇప్పటికే ఉన్నది</th>
                                            <th>కొత్తది</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>తేదీ</td>
                                            <td className="text-info">{existingRow?.date}</td>
                                            <td className="text-warning">{pendingPayload?.date}</td>
                                        </tr>
                                        <tr>
                                            <td>కొన్నవి</td>
                                            <td className="text-info">{existingRow?.quantity}</td>
                                            <td className="text-warning">{pendingPayload?.quantity}</td>
                                        </tr>
                                        <tr>
                                            <td>ధర</td>
                                            <td className="text-info">₹{existingRow?.price}</td>
                                            <td className="text-warning">₹{pendingPayload?.price}</td>
                                        </tr>
                                        <tr>
                                            <td>మొత్తం</td>
                                            <td className="text-info">₹{existingRow?.total}</td>
                                            <td className="text-warning">₹{pendingPayload?.total}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                <div className="alert alert-secondary text-dark text-center">
                                    ఈ అంశాన్ని మళ్లీ ఎంటర్ చెయ్యలా ?
                                </div>
                            </div>
                            <div className="modal-footer border-0 d-flex justify-content-between">
                                <button className="btn btn-outline-light" onClick={() => setShowDuplicateModal(false)}>
                                    వద్దు
                                </button>
                                <button
                                    className="btn btn-warning text-dark fw-bold"
                                    onClick={async () => {
                                        setShowDuplicateModal(false);
                                        await performSaveAfterDuplicate();
                                    }}
                                >
                                    మళ్లీ ఎంటర్ చెయ్యి
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}