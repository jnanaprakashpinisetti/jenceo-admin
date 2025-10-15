// src/components/PettyCash/PettyCashForm.jsx
import React, { useState } from "react";
import firebaseDB from "../../firebase";
import SuccessModal from "../common/SuccessModal";
import { useAuth } from "../../context/AuthContext";

export default function PettyCashForm() {
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
  const todayISODateIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const [formData, setFormData] = useState({
    mainCategory: "",
    subCategory: "",
    date: todayISODateIST,
    description: "",
    quantity: "",
    price: "",
    total: "",
    comments: "",
    approval: "pending",
    // support up to 4 extra fields for flexible asset types
    extraField1: "",
    extraField2: "",
    extraField3: "",
    extraField4: "",
  });

  const [errors, setErrors] = useState({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedExpense, setSavedExpense] = useState(null);

  /* -------------------------
     Category lists (existing + new Assets)
     ------------------------- */
  const categories = {
    Food: [
      "Groceries",
      "Vegetables",
      "Fruits",
      "Non-Veg",
      "Curd / Milk",
      "Tiffins",
      "Meals",
      "Curries",
      "Rice Bag",
      "Water Cans",
      "Client Food",
      "Snacks",
    ],
    "Transport & Travel": [
      "Petrol",
      "Staff Transport",
      "Worker Transport",
      "Business Trips",
      "Vehicle Maintenance",
      "Vehicle Insurance",
      "Vehicle Documents",
      "Vehicle Fine",
    ],
    "Office Maintenance": [
      "Office Rent",
      "Electricity Bill",
      "Water Bill",
      "Internet Bill",
      "Mobile Bill",
      "Repairs & Maintenance",
      "Waste Disposal",
    ],
    Stationery: [
      "Books",
      "Files",
      "Papers",
      "Stationery",
      "Office Equipment",
      "IT Accessories",
      "Others",
    ],
    Marketing: [
      "Apana Fee",
      "Worker India Fee",
      "Lamination Covers",
      "Printings",
      "Digital Marketing",
      "Offline Marketing",
      "Adds",
      "Mrkt-Food",
      "Mrkt-Snacks",
      "Mrkt-Breakfast",
      "Mrkt-Lunch",
      "Mrkt-Dinner",
      "Mrkt-Staying",
      "Mrkt-Petrol",
      "Mrkt-Transport",
      "Mrkt-Health",
      "Mrkt-Others",
    ],
    Medical: ["For Staff", "For Workers", "First Aid", "Tablets", "Insurance"],
    Welfare: ["Team Outings", "Team Lunch", "Movies", "Gifts", "Festivals", "Entertainment"],

    // NEW: Assets main category and its subcategories (spellings checked / corrected)
    Assets: [
      "Furniture",
      "Electronics",
      "IT Equipment",
      "Kitchen Items",
      "Vehicles",
      "Lands",
      "Properties",
      "Domain",
      "Investments",
      "Software",
      "Advances",
    ],

    // NEW top-level "Others" main category requested by user
    Others: [],
  };

  /* -------------------------
     Extra fields configuration for specific subcategories.
     Each value is an array of label strings (up to 4).
     ------------------------- */
  const extraFieldsConfig = {
    Petrol: ["Bike No", "Reading", "Rec No", "Bunk Name"],
    "Staff Transport": ["From", "To"],
    "Worker Transport": ["Client Name", "Location"],
    "Business Trips": ["From", "Reason"],
    "Vehicle Maintenance": ["Vehicle No", "Issue"],
    "Vehicle Insurance": ["Vehicle No", "Insurance Name"],
    "Vehicle Documents": ["Document Name", "Renewal Date"],
    "Vehicle Fine": ["Vehicle No", "Fine Ref No"],
    "Mobile Bill": ["Mobile No", "Brand Name"],
    "Repairs & Maintenance": ["Repair", "Reason"],
    "IT Accessories": ["Item Name", "Item For"],
    Others: ["Name", "For"],
    "Digital Marketing": ["Social Media Name", "Days"],
    Adds: ["Add In", "Add For"],
    Health: ["For", "Problem"],
    Transport: ["Name", "To"],

    // NEW mappings for Assets subcategories:
    Furniture: ["Furniture Name", "For"],
    Electronics: ["Electronics Name", "For"],
    "IT Equipment": ["Equipment Name", "For"],
    "Kitchen Items": ["Kitchen Item Name", "Details"],
    Vehicles: ["Vehicle No", "For"],

    // Lands requires 4 fields: Location, Sqfts, Reg No, Reg Name
    Lands: ["Location", "Sqfts", "Reg No", "Reg Name"],

    Properties: ["Location", "Reg No", "Reg Name", "Details"],
    Domain: ["Domain Name", "Renewal Date"],

    Investments: ["Name", "Ref No", "Company Name", "Value"],
    Software: ["Software Name", "Licence No"],

    // Advances (singular form used in labels): Advance For, To Whom
    Advances: ["Advance For", "To Whom"],
  };

  /* -------------------------
     Handlers
     ------------------------- */
  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };

    // Recompute total if quantity or price changed
    if (name === "quantity" || name === "price") {
      const qty = parseFloat(updated.quantity) || 0;
      const price = parseFloat(updated.price) || 0;
      updated.total = qty * price;
    }

    // If mainCategory changed, reset subCategory + extras
    if (name === "mainCategory") {
      updated.subCategory = "";
      updated.extraField1 = "";
      updated.extraField2 = "";
      updated.extraField3 = "";
      updated.extraField4 = "";
    }

    // If subCategory changed, clear extra fields
    if (name === "subCategory") {
      updated.extraField1 = "";
      updated.extraField2 = "";
      updated.extraField3 = "";
      updated.extraField4 = "";
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

    if (!formData.mainCategory) newErrors.mainCategory = "Main Category is required";

    // For mainCategory === "Others" we expect the subCategory text input to be filled.
    if (!formData.subCategory) newErrors.subCategory = "Sub Category is required";

    if (!formData.date) newErrors.date = "Date is required";
    else {
      const selectedDate = new Date(formData.date);
      if (selectedDate < minDate || selectedDate > today) {
        newErrors.date = "Date must be within last 5 days including today";
      }
    }

    if (!formData.description) newErrors.description = "Description is required";

    if (!formData.quantity && formData.quantity !== 0) newErrors.quantity = "Quantity is required";
    if (!formData.price && formData.price !== 0) newErrors.price = "Price is required";
    if (!formData.comments) newErrors.comments = "Comments are required";

    // Validate dynamic extra fields based on config
    const config = extraFieldsConfig[formData.subCategory];
    if (config && Array.isArray(config)) {
      config.forEach((label, idx) => {
        const fieldName = `extraField${idx + 1}`;
        if (!formData[fieldName]) {
          newErrors[fieldName] = `${label} is required"`;
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* -------------------------
     Submit
     ------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    // --- GLOBAL AUTH KEYS (fix userKey usage before refs) ---
    const userKey = currentUser?.uid
    const superiorId =
      currentUser?.superiorId ||
      dbUser?.superiorId ||
      user?.superiorId ||
      profile?.superiorId ||
      null;


    const nowIso = new Date().toISOString();
    const dataToSave = {
      ...formData,
      // creator metadata
      createdAt: nowIso,
      createdById: signedInUid || userKey,
      createdByName: signedInName || "Unknown",
      createdByRole: signedInRole,          // <-- ✅ role captured
      // keep existing display field you were using
      employeeName: signedInName || "Unknown",
      // workflow fields (keep your "approval" field as-is for UI)
      status: "pending",
      approvedById: null,
      approvedAt: null,
      superiorId,
    };

    try {
      // push under user's list
      const listRef = firebaseDB.child(`PettyCash/${userKey}`);
      const newRef = listRef.push();
      const expenseObj = { id: newRef.key, ...dataToSave };

      // fan-out to superior inbox if exists, single multipath update
      const updates = {};
      updates[`/PettyCash/${userKey}/${expenseObj.id}`] = expenseObj;
      if (superiorId) {
        updates[`/PettyCashInbox/${superiorId}/${expenseObj.id}`] = expenseObj;
      }
      await firebaseDB.update(updates);

      setSavedExpense(expenseObj);
      setShowSuccessModal(true);

      // reset
      setFormData({
        mainCategory: "",
        subCategory: "",
        date: "",
        description: "",
        quantity: "",
        price: "",
        total: "",
        comments: "",
        approval: "pending",
        extraField1: "",
        extraField2: "",
        extraField3: "",
        extraField4: "",
      });
      setErrors({});
    } catch (err) {
      console.error("Error saving expense:", err);
      alert("Error saving expense. See console for details.");
    }
  };

  const formatMonth = (date) => date.toLocaleString("en-US", { month: "long", year: "numeric" });

  /* Helper for rendering extra fields */
  const renderExtraFields = () => {
    const config = extraFieldsConfig[formData.subCategory];
    if (!config || !Array.isArray(config)) return null;

    return (
      <div className="row mb-0">
        {config.map((label, idx) => {
          const fieldName = `extraField${idx + 1}`;
          const isDate =
            label.toLowerCase().includes("date") ||
            label.toLowerCase().includes("renewal");
          return (
            <div key={fieldName} className="col-md-6 mb-3">
              <label>
                <strong>
                  {label}
                  <span className="star">*</span>
                </strong>
              </label>
              <input
                type={isDate ? "date" : "text"}
                name={fieldName}
                value={formData[fieldName] || ""}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`form-control ${errors[fieldName] ? "is-invalid" : ""}`}
              />
              {errors[fieldName] && <div className="invalid-feedback">{errors[fieldName]}</div>}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mt-4 client-form">
      <h3 className="mb-4 text-center opacity-75 text-white">Petty Cash Form</h3>
      <hr className="text-white" />
      <div className="d-flex justify-content-between align-items-center p-3 opacity-75">
        {/* Show signed-in user instead of hardcoded Admin */}
        <p className="text-white">{signedInName}</p>

        <p className="text-white">{formatMonth(today)}</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="pb-5">
        {/* Main & Sub Category */}
        <div className="row mb-0">
          <div className="col-md-6 mb-3">
            <label>
              <strong>
                Main Category <span className="star">*</span>
              </strong>
            </label>
            <select
              name="mainCategory"
              className={`form-select ${errors.mainCategory ? "is-invalid" : ""}`}
              value={formData.mainCategory}
              onChange={handleChange}
              onBlur={handleBlur}
            >
              <option value="">Select Category</option>
              {Object.keys(categories).map((cat, idx) => (
                <option key={idx} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {errors.mainCategory && <div className="invalid-feedback">{errors.mainCategory}</div>}
          </div>

          <div className="col-md-6 mb-3">
            {/* If main category is "Others" show a text input for subcategory name */}
            {formData.mainCategory === "Others" ? (
              <>
                <label>
                  <strong>
                    Sub Category Name <span className="star">*</span>
                  </strong>
                </label>
                <input
                  type="text"
                  name="subCategory"
                  value={formData.subCategory}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`form-control ${errors.subCategory ? "is-invalid" : ""}`}
                  placeholder="Enter sub category name"
                />
                {errors.subCategory && <div className="invalid-feedback">{errors.subCategory}</div>}
              </>
            ) : (
              <>
                <label>
                  <strong>
                    Sub Category <span className="star">*</span>
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
                  <option value="">Select Sub Category</option>
                  {formData.mainCategory &&
                    (categories[formData.mainCategory] || []).map((sub, idx) => (
                      <option key={idx} value={sub}>
                        {sub}
                      </option>
                    ))}
                </select>
                {errors.subCategory && <div className="invalid-feedback">{errors.subCategory}</div>}
              </>
            )}
          </div>
        </div>

        {/* Extra Fields (dynamic) */}
        {renderExtraFields()}

        {/* Date & Description */}
        <div className="row mb-0">
          <div className="col-md-6 mb-3">
            <label>
              <strong>
                Date <span className="star">*</span>
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
          <div className="col-md-6 mb-3">
            <label>
              <strong>
                Description <span className="star">*</span>
              </strong>
            </label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`form-control ${errors.description ? "is-invalid" : ""}`}
            />
            {errors.description && <div className="invalid-feedback">{errors.description}</div>}
          </div>
        </div>

        {/* Quantity, Price, Total */}
        <div className="row mb-0">
          <div className="col-md-4 mb-3">
            <label>
              <strong>
                Quantity <span className="star">*</span>
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
            <label>
              <strong>
                Price <span className="star">*</span>
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
            <label>
              <strong>Total</strong>
            </label>
            <input type="number" name="total" value={formData.total} className="form-control" disabled />
          </div>
        </div>

        {/* Comments */}
        <div className="mb-3">
          <label>
            <strong>
              Comments <span className="star">*</span>
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

        <button type="submit" className="btn btn-success">
          Submit
        </button>
      </form>

      {/* Success Modal */}
      <SuccessModal
        show={showSuccessModal}
        title="Expense Saved"
        message={
          savedExpense ? (
            <>
              <p>
                Thank you! <strong>{savedExpense.subCategory}</strong> has been added.
              </p>
              <p>
                <strong>Price:</strong> ₹{savedExpense.price}
              </p>
              <p>
                <strong>Total:</strong> ₹{savedExpense.total}
              </p>
            </>
          ) : (
            <p>Expense saved successfully</p>
          )
        }
        onClose={() => setShowSuccessModal(false)}
      />
    </div>
  );
}

// We got conflits so i am pushting this code again