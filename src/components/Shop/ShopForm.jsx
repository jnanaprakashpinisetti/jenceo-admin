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

const categoryMap = {
    "1 కూరగాయలు": [
        "టమాట", "వంకాయ", "బెండకాయ", "దోసకాయ", "కాకరకాయ", "బీరకాయ", "పొట్లకాయ", "సొరకాయ", "దొండకాయ",
        "గుమ్మడికాయ", "బూడిద గుమ్మడికాయ", "మునగకాయ", "పచ్చిమిరపకాయ", "గోరుచిక్కుడు", "బీన్స్", "చిక్కుడు",
        "అరటికాయ", "మామిడికాయ", "క్యాబేజీ", "కాలిఫ్లవర్",
    ],
    "2 వేరు కూరగాయలు": ["ఉల్లిపాయ", "వెల్లుల్లి", "కేరట్", "బీట్ రూట్", "ముల్లంగి", "బంగాళాదుంప", "చిలకడదుంప", "చెమదుంప", "అల్లం"],
    "3 ఆకుకూరలు": ["పాలకూర", "తోటకూర", "మెంతికూర", "కొత్తిమీర", "పుదీనా", "కరివేపాకు", "గోంగూర"],
    "4 అరటి పళ్ళు": ["కర్పూరం", "పచ్చ చేక్కరకేళి", "ఎర్ర చేక్కరకేళి", "అమృతపాణి", "త్రయ అరిటి పళ్ళు"],
    "5 పువ్వులు": ["బంతి పువ్వులు", "పసుపు చామంతి", "తెల్ల చామంతి", "గులాబీ", "మల్లె పువ్వులు"],
    "6 కొబ్బరిబొండాలు": ["కేరళ బొండాలు", "ఆంధ్ర బొండాలు"],
    "7 ఇతర వస్తువులు": ["కొబ్బరికాయలు", "బెల్లం", "తేనే పాకం"],
};

export default function ShopForm({ onClose }) {
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

    const resolveShopBranch = (authUser, fallback = "users") => {
        const roleRaw = String(authUser?.role || "").toLowerCase();
        if (roleRaw.includes("admin")) return "admin";
        const id = authUser?.uiId || authUser?.uid || authUser?.id || authUser?.email;
        return id ? String(id).replace(/[^\w-]/g, "_") : fallback;
    };

    const [formData, setFormData] = useState({
        mainCategory: "",
        subCategory: "",
        date: todayISODateIST,
        quantity: "",
        price: "",
        total: "",
        comments: "",
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

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
        if (name === "mainCategory") updated.subCategory = "";
        setFormData(updated);
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.mainCategory) newErrors.mainCategory = "ప్రధాన కేటగిరీ తప్పనిసరి";
        if (!formData.subCategory) newErrors.subCategory = "ఉప కేటగిరీ తప్పనిసరి";
        if (!formData.quantity) newErrors.quantity = "మొత్తం తప్పనిసరి";
        if (!formData.price) newErrors.price = "ధర తప్పనిసరి";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const buildPayload = (key, branchKey) => {
        const qty = Number(formData.quantity) || 0;
        const price = Number(formData.price) || 0;
        const total = qty * price;
        const nowIso = new Date().toISOString();

        return {
            id: key,
            mainCategory: formData.mainCategory,
            subCategory: formData.subCategory,
            date: formData.date,
            quantity: qty,
            price,
            total,
            comments: formData.comments || "",
            createdAt: nowIso,
            createdById: signedInUid,
            createdByName: signedInName,
            createdByRole: signedInRole,
            _branch: branchKey,
        };
    };

    const performSave = async (branchKey, duplicateOfId = null) => {
        const listRef = firebaseDB.child(pathUnderJenCeo(`Shop/${branchKey}`));
        const newRef = listRef.push();
        const payload = buildPayload(newRef.key, branchKey);
        if (duplicateOfId) payload.duplicateOf = duplicateOfId;

        await newRef.set(payload);
        setSavedPurchase(payload);
        setShowSuccessModal(true);

        setFormData({
            mainCategory: formData.mainCategory,
            subCategory: "",
            date: todayISODateIST,
            quantity: "",
            price: "",
            total: "",
            comments: "",
        });
    };

    const checkDuplicateThenSave = async () => {
        const authObj = currentUser || user || dbUser || profile || {};
        const branchKey = resolveShopBranch(authObj);
        const listRef = firebaseDB.child(pathUnderJenCeo(`Shop/${branchKey}`));
        const snap = await listRef.once("value");
        const raw = snap.val() || {};

        const exists = Object.values(raw).find(
            (r) => norm(r?.date) === norm(formData.date) && norm(r?.subCategory) === norm(formData.subCategory)
        );

        const dummyRefKey = "_pending_";
        const nextPayload = buildPayload(dummyRefKey, branchKey);

        if (exists) {
            setExistingRow(exists);
            setPendingPayload(nextPayload);
            setShowDuplicateModal(true);
            return;
        }

        await performSave(branchKey);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        setIsSubmitting(true);
        try {
            await checkDuplicateThenSave();
        } catch (err) {
            alert("Error saving: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.9)" }}>
            <div className="modal-dialog modal-md modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg rounded-4">
                    <div className="modal-header bg-dark text-white">
                        <h5 className="modal-title">Shop Purchase Form</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>

                    <div className="modal-body bg-dark text-light p-4">
                        <form onSubmit={handleSubmit}>
                            {/* Category */}
                            <div className="row">
                                <div className="col-md-6  mb-3">
                                    <label className="form-label">ప్రధాన కేటగిరీ</label>
                                    <select
                                        name="mainCategory"
                                        className="form-select"
                                        value={formData.mainCategory}
                                        onChange={handleChange}
                                    >
                                        <option value="">ఎంచుకోండి</option>
                                        {Object.keys(categoryMap).map((cat) => (
                                            <option key={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-md-6  mb-3">
                                    <label className="form-label">ఉప కేటగిరీ</label>
                                    <select
                                        name="subCategory"
                                        className="form-select"
                                        value={formData.subCategory}
                                        onChange={handleChange}
                                    >
                                        <option value="">ఎంచుకోండి</option>
                                        {formData.mainCategory &&
                                            categoryMap[formData.mainCategory]?.map((v) => (
                                                <option key={v}>{v}</option>
                                            ))}
                                    </select>
                                </div>
                            </div>

                            {/* Inputs */}
                            <div className="row  ">
                                <div className="col-md-4  mb-3">
                                    <label className="form-label">మొత్తం (K.G)</label>
                                    <input
                                        name="quantity"
                                        type="number"
                                        className="form-control"
                                        value={formData.quantity}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="col-md-4  mb-3">
                                    <label className="form-label">ధర</label>
                                    <input
                                        name="price"
                                        type="number"
                                        className="form-control"
                                        value={formData.price}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="col-md-4  mb-3">
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

                            <div className="mb-3">
                                <label className="form-label">కామెంట్స్</label>
                                <textarea
                                    name="comments"
                                    rows="2"
                                    className="form-control"
                                    value={formData.comments}
                                    onChange={handleChange}
                                ></textarea>
                            </div>

                            <div className="text-end mb-5">
                                <button className="btn btn-success" disabled={isSubmitting}>
                                    {isSubmitting ? "Submitting..." : "Submit"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* ✅ Success Modal (main form stays open) */}
            <SuccessModal
                show={showSuccessModal}
                title="Saved Successfully"
                message={
                    savedPurchase ? (
                        <>
                            <p><strong>{savedPurchase.subCategory}</strong> జోడించబడింది!</p>
                            <p>ధర ₹{savedPurchase.price}</p>
                            <p>మొత్తం ₹{savedPurchase.total}</p>
                        </>
                    ) : (
                        <p>సేవ్ విజయవంతమైంది</p>
                    )
                }
                onClose={() => setShowSuccessModal(false)}
            />

            {/* ✅ Duplicate Confirmation Modal */}
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
                                        await performSave(pendingPayload._branch, existingRow?.id || null);
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
