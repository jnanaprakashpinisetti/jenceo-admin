import React, { useState, useEffect } from "react";
import firebaseDB from "../../firebase";
import SuccessModal from "../common/SuccessModal";
import { useAuth } from "../../context/AuthContext";

// Build a path that never duplicates "JenCeo-DataBase"
const pathUnderJenCeo = (relative) => {
  const refStr = typeof firebaseDB?.toString === "function" ? firebaseDB.toString() : "";
  const isScoped =
    (firebaseDB && firebaseDB.key === "JenCeo-DataBase") ||
    (refStr && /\/JenCeo-DataBase\/?$/.test(refStr));

  // always pass a relative path to the scoped ref
  if (isScoped) {
    return relative.replace(/^\/?JenCeo-DataBase\//, "");   // strip if caller added it
  }
  // db is root → add the prefix
  return `JenCeo-DataBase/${relative.replace(/^\/?JenCeo-DataBase\//, "")}`;
};


const categoryMap = {
    "1 కూరగాయలు": [
        "టమాట", "వంకాయ", "బెండకాయ", "దోసకాయ", "కాకరకాయ", "బీరకాయ", "పొట్లకాయ", "సొరకాయ", "దొండకాయ", "గుమ్మడికాయ", "బూడిద గుమ్మడికాయ", "మునగకాయ", "పచ్చిమిరపకాయ", "గోరుచిక్కుడు", "బీన్స్", "చిక్కుడు", "అరటికాయ", "మామిడికాయ", "క్యాబేజీ", "కాలిఫ్లవర్",
    ],
    "2 వేరు కూరగాయలు": [
        "ఉల్లిపాయ", "వెల్లుల్లి", "కేరట్", "బీట్ రూట్", "ముల్లంగి", "బంగాళాదుంప", "చిలకడదుంప", "చెమదుంప", "అల్లం",
    ],
    "3 ఆకుకూరలు": [
        "పాలకూర", "తోటకూర", "మెంతికూర", "కొత్తిమీర", "పుదీనా", "కరివేపాకు", "గోంగూర",
    ],
    "4 అరటి పళ్ళు": ["కర్పూరం", "పచ్చ చేక్కరకేళి", "ఎర్ర చేక్కరకేళి", "అమృతపాణి", "త్రయ అరిటి పళ్ళు"],
    "5 పువ్వులు": ["బంతి పువ్వులు", "పసుపు చామంతి", "తెల్ల చామంతి", "గులాబీ", "మలబార్", "మల్లె పువ్వులు", "మల్లె పూలదండ", "సన్నజాజులు", "సన్నజాజుల దండ"],
    "6 కొబ్బరిబొండాలు": ["కేరళ బొండాలు", "ఆంధ్ర బొండాలు"],
    "7 ఇతర వస్తువులు": ["కొబ్బరికాయలు", "బెల్లం", "తేనే పాకం"],
};

export default function ShopForm({ onClose }) {
    const authCtx = useAuth() || {};
    const { currentUser, user, dbUser, profile } = authCtx;
    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(today.getDate() - 1000);

    // Robust name resolver across common shapes your AuthContext may expose
    const signedInName =
        dbUser?.name ||
        dbUser?.username ||
        profile?.name ||
        profile?.username ||
        user?.name ||
        user?.username ||
        currentUser?.displayName ||
        currentUser?.name ||
        currentUser?.username ||
        (currentUser?.email ? currentUser.email.split("@")[0] : "") ||
        "User";

    // Local YYYY-MM-DD in IST (so max/min and defaults match your UI)
    const todayISODateIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

    // Also a robust UID (covers different shapes)
    const signedInUid =
        currentUser?.uid || currentUser?.dbId || user?.uid || user?.dbId || null;

    // Resolve role from any of the common places in your auth/profile
    const signedInRole =
        dbUser?.role ||
        profile?.role ||
        user?.role ||
        currentUser?.role ||
        "User";

    const [formData, setFormData] = useState({
        mainCategory: "",
        subCategory: "",
        date: todayISODateIST,
        quantity: "",
        price: "",
        total: "",
        comments: "",
        approval: "Pending",
    });

    const [errors, setErrors] = useState({});
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [savedPurchase, setSavedPurchase] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const resolveShopBranch = (authUser, fallback = "users") => {
        const roleRaw = String(authUser?.role || authUser?.userRole || "").toLowerCase();
        if (roleRaw.includes("super")) return "admin";
        if (roleRaw.includes("admin")) return "admin";
        if (roleRaw.includes("manager")) return "admin";
        // put non-admins under their uiId or name; never "undefined"
        const id = authUser?.uiId || authUser?.uid || authUser?.id || authUser?.email || authUser?.displayName;
        return id ? String(id).replace(/[^\w-]/g, "_") : fallback;
    };

    useEffect(() => {
        const qty = parseFloat(formData.quantity) || 0;
        const price = parseFloat(formData.price) || 0;
        setFormData(prev => ({
            ...prev,
            total: (qty * price).toString()
        }));
    }, [formData.quantity, formData.price]);

    /* -------------------------
       Handlers
       ------------------------- */
    const handleChange = (e) => {
        const { name, value } = e.target;
        const updated = { ...formData, [name]: value };

        // If mainCategory changed, reset subCategory
        if (name === "mainCategory") {
            updated.subCategory = "";
        }

        setFormData(updated);
    };

    const handleBlur = (e) => {
        const { name } = e.target;
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    /* -------------------------
       Validation
       ------------------------- */
    const validateForm = () => {
        const newErrors = {};

        if (!formData.mainCategory) newErrors.mainCategory = "ప్రధాన కేటగిరీ తప్పనిసరి";
        if (!formData.subCategory) newErrors.subCategory = "ఉప కేటగిరీ తప్పనిసరి";

        if (!formData.date) newErrors.date = "తేదీ తప్పనిసరి";
        else {
            const selectedDate = new Date(formData.date);
            if (selectedDate < minDate || selectedDate > today) {
                newErrors.date = "తేదీ గత 5 రోజుల్లో ఉండాలి";
            }
        }

        if (!formData.quantity && formData.quantity !== 0) newErrors.quantity = "మొత్తం తప్పనిసరి";
        if (!formData.price && formData.price !== 0) newErrors.price = "ధర తప్పనిసరి";
        // if (!formData.comments) newErrors.comments = "వ్యాఖ్యలు తప్పనిసరి";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    /* -------------------------
       Submit
       ------------------------- */
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSubmitting(true);

        try {
            // Get current user info
            const authObj = currentUser || user || dbUser || profile || {};
            const branchKey = resolveShopBranch(authObj, "users");

            console.log("Saving shop data for branch:", branchKey);
            console.log("User info:", { signedInName, signedInUid, signedInRole });

            // Prepare data for Firebase
            const nowIso = new Date().toISOString();
            const dataToSave = {
                // Form data
                mainCategory: formData.mainCategory,
                subCategory: formData.subCategory,
                date: formData.date,
                quantity: parseFloat(formData.quantity) || 0,
                price: parseFloat(formData.price) || 0,
                total: parseFloat(formData.total) || 0,
                comments: formData.comments,

                // Approval status
                approval: "Pending",

                // Metadata
                employeeName: signedInName,
                createdAt: nowIso,
                createdById: signedInUid,
                createdByName: signedInName,
                createdByRole: signedInRole,

                // Timestamp for sorting
                timestamp: Date.now()
            };

            // Use proper Firebase path structure
           const finalPath = pathUnderJenCeo(`Shop/${branchKey}`);
console.log("[ShopForm] Writing to:", finalPath);
const listRef = firebaseDB.child(finalPath);
const newRef  = listRef.push();

            console.log("Saving to path:", finalPath);

            // Create reference and push data
          const istDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const payload = {
  id: newRef.key,
  mainCategory: formData.mainCategory,
  subCategory: formData.subCategory,
  date: formData.date || istDate,               // yyyy-mm-dd (IST default)
  quantity: Number(formData.quantity) || 0,
  price: Number(formData.price) || 0,
  total: (Number(formData.quantity) || 0) * (Number(formData.price) || 0),
  comments: formData.comments || "",
  approval: "Pending",
  // user meta
  createdAt: new Date().toISOString(),
  createdById: signedInUid || "unknown",
  createdByName: signedInName || "System",
  createdByRole: signedInRole || "employee",
  timestamp: Date.now(),
};

await newRef.set(payload);
console.log("Shop data saved:", payload);
setSavedPurchase(payload);
setShowSuccessModal(true);

            const record = { id: newRef.key, ...payload };

            // Create the purchase object with ID
            const purchaseObj = {
                id: newRef.key,
                ...dataToSave
            };



            await newRef.set(payload);
            console.log("Shop data saved successfully:", payload);

            console.log("Shop data saved successfully:", purchaseObj);

            // Set success state
            setSavedPurchase(purchaseObj);
            setShowSuccessModal(true);

            // Reset form
            setFormData({
                mainCategory: "",
                subCategory: "",
                date: todayISODateIST,
                quantity: "",
                price: "",
                total: "",
                comments: "",
                approval: "Pending",
            });
            setErrors({});

        } catch (err) {
            console.error("Error saving shop purchase:", err);
            alert(`Error saving shop purchase: ${err?.message || "Check console for details"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatMonth = (date) => date.toLocaleString("en-US", { month: "long", year: "numeric" });

    return (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.6)" }}>
            <div className="modal-dialog modal-md modal-dialog-centered bg-dark">
                <div className="modal-content shadow-lg rounded-4 border-0">
                    <div className="modal-header bg-dark text-white">
                        <h5 className="modal-title">Shop Purchase Form</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>

                    <div className="modal-body bg-dark p-4 rounded">
                        {/* Header similar to PettyCashForm */}
                        <div className="d-flex justify-content-between align-items-center p-3 opacity-75 bg-secondary rounded mb-4">
                            <p className="mb-0 fw-bold text-light">{signedInName}</p>
                            <p className="mb-0 fw-bold text-light">{formatMonth(today)}</p>
                        </div>

                        <form onSubmit={handleSubmit} noValidate className="pb-3">
                            {/* Main & Sub Category */}
                            <div className="row mb-0">
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">
                                        <strong>
                                            ప్రధాన కేటగిరీ <span className="star">*</span>
                                        </strong>
                                    </label>
                                    <select
                                        name="mainCategory"
                                        className={`form-select ${errors.mainCategory ? "is-invalid" : ""}`}
                                        value={formData.mainCategory}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    >
                                        <option value="">కేటగిరీ ఎంచుకోండి</option>
                                        {Object.keys(categoryMap).map((cat, idx) => (
                                            <option key={idx} value={cat}>
                                                {cat}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.mainCategory && <div className="invalid-feedback">{errors.mainCategory}</div>}
                                </div>

                                <div className="col-md-6 mb-3">
                                    <label className="form-label">
                                        <strong>
                                            ఉప కేటగిరీ <span className="star">*</span>
                                        </strong>
                                    </label>
                                    <select
                                        name="subCategory"
                                        className={`form-select ${errors.subCategory ? "is-invalid" : ""}`}
                                        value={formData.subCategory}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        disabled={!formData.mainCategory}
                                    >
                                        <option value="">ఉప కేటగిరీ ఎంచుకోండి</option>
                                        {formData.mainCategory &&
                                            (categoryMap[formData.mainCategory] || []).map((sub, idx) => (
                                                <option key={idx} value={sub}>
                                                    {sub}
                                                </option>
                                            ))}
                                    </select>
                                    {errors.subCategory && <div className="invalid-feedback">{errors.subCategory}</div>}
                                </div>
                            </div>

                            {/* Date */}
                            {/* <div className="row mb-0">
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">
                                        <strong>
                                            తేదీ <span className="star">*</span>
                                        </strong>
                                    </label>
                                    <input
                                        type="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        className={`form-control ${errors.date ? "is-invalid" : ""}`}
                                        min={minDate.toISOString().split("T")[0]}
                                        max={today.toISOString().split("T")[0]}
                                    />
                                    {errors.date && <div className="invalid-feedback">{errors.date}</div>}
                                </div>
                            </div> */}

                            {/* Quantity, Price, Total */}
                            <div className="row mb-0">
                                <div className="col-md-4 mb-3">
                                    <label className="form-label">
                                        <strong>
                                            కొన్నవి (K.G) <span className="star">*</span>
                                        </strong>
                                    </label>
                                    <input
                                        type="number"
                                        name="quantity"
                                        value={formData.quantity}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        className={`form-control ${errors.quantity ? "is-invalid" : ""}`}
                                    />
                                    {errors.quantity && <div className="invalid-feedback">{errors.quantity}</div>}
                                </div>
                                <div className="col-md-4 mb-3">
                                    <label className="form-label">
                                        <strong>
                                            ధర  <span className="star">*</span>
                                        </strong>
                                    </label>
                                    <input
                                        type="number"
                                        name="price"
                                        value={formData.price}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        className={`form-control ${errors.price ? "is-invalid" : ""}`}
                                    />
                                    {errors.price && <div className="invalid-feedback">{errors.price}</div>}
                                </div>
                                <div className="col-md-4 mb-3">
                                    <label className="form-label">
                                        <strong>మొత్తం (Total)</strong>
                                    </label>
                                    <input
                                        type="number"
                                        name="total"
                                        value={formData.total}
                                        className="form-control bg-light"
                                        disabled
                                    />
                                </div>
                            </div>

                            {/* Comments */}
                            <div className="mb-3">
                                <label className="form-label">
                                    <strong>
                                        కామెంట్స్
                                    </strong>
                                </label>
                                <textarea
                                    name="comments"
                                    value={formData.comments}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    className={`form-control ${errors.comments ? "is-invalid" : ""}`}
                                    rows="3"
                                ></textarea>
                                {errors.comments && <div className="invalid-feedback">{errors.comments}</div>}
                            </div>

                            <div className="d-flex justify-content-between">
                                <button type="button" className="btn btn-secondary" onClick={onClose}>
                                    Close
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-success"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? "Submitting..." : "Submit"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Success Modal */}
            <SuccessModal
                show={showSuccessModal}
                title="Purchase Saved"
                message={
                    savedPurchase ? (
                        <>
                            <p>
                                Thank you! <strong>{savedPurchase.subCategory}</strong> has been added.
                            </p>
                            <p>
                                <strong>Price:</strong> ₹{savedPurchase.price}
                            </p>
                            <p>
                                <strong>Total:</strong> ₹{savedPurchase.total}
                            </p>
                        </>
                    ) : (
                        <p>Purchase saved successfully</p>
                    )
                }
                onClose={() => {
                    setShowSuccessModal(false);
                    onClose();
                }}
            />
        </div>
    );
}