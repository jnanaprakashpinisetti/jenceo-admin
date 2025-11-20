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

// Confirmation Modal Component
const ConfirmationModal = ({ show, title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel" }) => {
    if (!show) return null;

    return (
        <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.8)" }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content bg-dark text-light border-0 rounded-4 shadow-lg">
                    <div className="modal-header bg-warning text-dark">
                        <h5 className="modal-title">{title}</h5>
                        <button type="button" className="btn-close" onClick={onCancel}></button>
                    </div>
                    <div className="modal-body text-center">
                        <i className="fas fa-question-circle fa-3x text-warning mb-3"></i>
                        <p className="fs-5">{message}</p>
                    </div>
                    <div className="modal-footer border-0 d-flex justify-content-center">
                        <button className="btn btn-outline-light me-3" onClick={onCancel}>
                            {cancelText}
                        </button>
                        <button className="btn btn-warning text-dark fw-bold" onClick={onConfirm}>
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function ShopForm({ customer, onClose, onSave, mode = "purchase", hideAddItem = false }) {
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
        customItem: ""
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitMode, setSubmitMode] = useState("");
    const isOtherSelected = formData.mainCategory === "7 ఇతర వస్తువులు";

    // Success modal
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [savedPurchase, setSavedPurchase] = useState(null);

    // Duplicate modal
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [existingRow, setExistingRow] = useState(null);
    const [pendingPayload, setPendingPayload] = useState(null);

    // Close confirmation modal
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);

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

        const finalSubCategory = isOtherSelected && formData.customItem
            ? formData.customItem
            : formData.subCategory;

        const basePayload = {
            id: key,
            mainCategory: formData.mainCategory || '',
            subCategory: finalSubCategory || '',
            date: formData.date || '',
            quantity: qty,
            price,
            total,
            comments: formData.comments || '',
            createdAt: nowIso,
            createdById: signedInUid || '',
            createdByName: signedInName || '',
            createdByRole: signedInRole || '',
            mode: submitMode || mode
        };

        if ((submitMode === "customer" || mode === "customer") && customer) {
            basePayload.customerId = customer.id || '';
            basePayload.customerName = customer.name || '';
            basePayload.customerPhone = customer.mobileNo || customer.mobile || '';
            basePayload.customerPlace = customer.place || '';
        }

        return basePayload;
    };

    // Save functions remain the same
    const saveAsCustomerItem = async () => {
        if (!customer || !customer.id) {
            throw new Error("Customer information is missing");
        }

        // Generate a proper unique ID
        const itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const payload = buildPayload(itemId);

        // Ensure all customer fields have values
        const customerData = {
            customerId: customer.id,
            customerName: customer.name || '',
            customerPhone: customer.mobileNo || customer.mobile || '',
            customerPlace: customer.place || '',
            ...payload
        };

        const PurchaseItemsRef = firebaseDB.child(pathUnderJenCeo(`Shop/CreditData/${customer.id}/PurchaseItems`));

        // Use the generated ID instead of push()
        await PurchaseItemsRef.child(itemId).set(customerData);

        // Update balance
        const balanceRef = firebaseDB.child(pathUnderJenCeo(`Shop/CreditData/${customer.id}/Balance`));
        const snapshot = await balanceRef.once('value');
        const currentBalance = parseFloat(snapshot.val()) || 0;
        const newBalance = currentBalance + payload.total;
        await balanceRef.set(newBalance);

        // Update customer info
        const customerRef = firebaseDB.child(pathUnderJenCeo(`Shop/CreditData/${customer.id}`));
        await customerRef.update({
            customerName: customer.name || '',
            customerPhone: customer.mobileNo || customer.mobile || '',
            customerPlace: customer.place || '',
            lastUpdated: new Date().toISOString(),
            updatedBy: signedInName,
            updatedById: signedInUid
        });

        return {
            ...customerData,
            newBalance,
            saveLocation: `Shop/CreditData/${customer.id}/PurchaseItems`
        };
    };

    const saveAsRegularPurchase = async () => {
        const authObj = currentUser || user || dbUser || profile || {};
        const branchKey = resolveShopBranch(authObj);
        const listRef = firebaseDB.child(pathUnderJenCeo(`Shop/${branchKey}`));
        const newRef = listRef.push();
        const payload = buildPayload(newRef.key);

        await newRef.set(payload);
        return { ...payload, saveLocation: `Shop/${branchKey}` };
    };

    // Duplicate check functions remain the same
    const checkDuplicateForCustomerItem = async () => {
        if (!customer || !customer.id) {
            return false;
        }

        const ref = firebaseDB.child(pathUnderJenCeo(`Shop/CreditData/${customer.id}/PurchaseItems`));
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

    const handlePurchaseSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setSubmitMode("purchase");
        setIsSubmitting(true);
        try {
            const duplicateExists = await checkDuplicateForRegularPurchase();

            if (duplicateExists) {
                const dummyRefKey = "_pending_";
                const nextPayload = buildPayload(dummyRefKey);
                setExistingRow(duplicateExists);
                setPendingPayload(nextPayload);
                setShowDuplicateModal(true);
                return;
            }

            const result = await saveAsRegularPurchase();
            handleSaveSuccess(result);
        } catch (error) {
            setShowSuccessModal(true);
            setSavedPurchase({ error: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePurchaseItemsubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setSubmitMode("customer");
        setIsSubmitting(true);
        try {
            const duplicateExists = await checkDuplicateForCustomerItem();

            if (duplicateExists) {
                const dummyRefKey = "_pending_";
                const nextPayload = buildPayload(dummyRefKey);
                setExistingRow(duplicateExists);
                setPendingPayload(nextPayload);
                setShowDuplicateModal(true);
                return;
            }

            const result = await saveAsCustomerItem();
            handleSaveSuccess(result);
        } catch (error) {
            setShowSuccessModal(true);
            setSavedPurchase({ error: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveSuccess = (result) => {
        setSavedPurchase(result);
        setShowSuccessModal(true);

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

        if (onSave && typeof onSave === 'function') {
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
            setShowSuccessModal(true);
            setSavedPurchase({ error: error.message });
        }
    };

    const handleClose = () => {
        const hasData = Object.values(formData).some(value =>
            value && value !== todayISODateIST && value !== ""
        );

        if (hasData) {
            setShowCloseConfirm(true);
        } else {
            onClose();
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

        if (savedPurchase.error) {
            return (
                <>
                    <div className="text-center text-danger">
                        <i className="fas fa-exclamation-triangle fa-3x mb-3"></i>
                        <h5>Error</h5>
                        <p>{savedPurchase.error}</p>
                    </div>
                </>
            );
        }

        if (submitMode === "customer") {
            return (
                <>
                    <p><strong>{savedPurchase.subCategory}</strong> జోడించబడింది!</p>
                    <p>కస్టమర్: {savedPurchase.customerName}</p>
                    <p>తేదీ: {savedPurchase.date}</p>
                    <p>ధర ₹{savedPurchase.price}</p>
                    <p>మొత్తం ₹{savedPurchase.total}</p>
                    <p className="fw-bold text-success">కొత్త బ్యాలెన్స్: ₹{savedPurchase.newBalance?.toFixed(2)}</p>
                </>
            );
        } else {
            return (
                <>
                    <p><strong>{savedPurchase.subCategory}</strong> జోడించబడింది!</p>
                    <p>తేదీ: {savedPurchase.date}</p>
                    <p>ధర ₹{savedPurchase.price}</p>
                    <p>మొత్తం ₹{savedPurchase.total}</p>
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
                        <button type="button" className="btn-close btn-close-white" onClick={handleClose}></button>
                    </div>

                    <div className={`modal-body bg-dark text-light p-4 ${hideAddItem ? 'd-btnNone' : ''}`}>

                        <form>
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

                                    </div>
                                )}

                                {!hideAddItem && (
                                    <div className={mode !== "customer" ? "col-md-6" : "col-12"}>
                                        <button
                                            type="button"
                                            className="btn btn-success w-100 py-2"
                                            disabled={isSubmitting}
                                            onClick={handlePurchaseItemsubmit}
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

                                    </div>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Success Modal */}
            <SuccessModal
                show={showSuccessModal}
                title={savedPurchase?.error ? "Error" : (submitMode === "customer" ? "Item Added Successfully" : "Purchase Saved Successfully")}
                message={getSuccessMessage()}
                onClose={() => {
                    setShowSuccessModal(false);
                    if (!savedPurchase?.error) {
                        onClose();
                    }
                }}
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

            {/* Close Confirmation Modal */}
            <ConfirmationModal
                show={showCloseConfirm}
                title="Close Form"
                message="You have unsaved changes. Are you sure you want to close?"
                onConfirm={onClose}
                onCancel={() => setShowCloseConfirm(false)}
                confirmText="Yes, Close"
                cancelText="Continue Editing"
            />
        </div>
    );
}