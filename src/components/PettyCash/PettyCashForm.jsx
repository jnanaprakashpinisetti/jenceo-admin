import React, { useState } from "react";
import firebaseDB from "../../firebase";
import SuccessModal from "../common/SuccessModal";

export default function PettyCashForm() {
  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(today.getDate() - 5);

  const [formData, setFormData] = useState({
    mainCategory: "",
    subCategory: "",
    date: "",
    description: "",
    quantity: "",
    price: "",
    total: "",
    comments: "",
    extraField1: "",
    extraField2: "",
  });

  const [errors, setErrors] = useState({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedExpense, setSavedExpense] = useState(null);

  const categories = {
    Food: ["Groceries","Vegetables","Fruits","Non-Veg","Curd / Milk","Tiffins","Meals","Curries","Rice Bag","Water Cans","Client Food","Snacks"],
    "Transport & Travel": ["Petrol","Staff Transport","Worker Transport","Business Trips","Vehicle Maintenance","Vehicle Insurance","Vehicle Documents","Vehicle Fine"],
    "Office Maintenance": ["Office Rent","Electricity Bill","Water Bill","Internet Bill","Mobile Bill","Repairs & Maintenance","Waste Disposal"],
    Stationery: ["Books","Files","Papers","Stationery","Office Equipment","IT Accessories","Others"],
    Marketing: ["Apana Fee","Worker India Fee","Lamination Covers","Printings","Digital Marketing","Offline Marketing","Adds","Off-Food","Off-Snacks","Off-Breakfast","Off-Lunch","Off-Dinner","Off-Staying","Petrol","Transport","Health","Others"],
    Medical: ["For Staff","For Workers","First Aid","Tablets","Insurance"],
    Welfare: ["Team Outings","Team Lunch","Movies","Gifts","Festivals","Entertainment"],
  };

  const extraFieldsConfig = {
    Petrol: ["Bike No", "Reading"],
    "Staff Transport": ["From", "To"],
    "Worker Transport": ["Client Name", "Location"],
    "Business Trips": ["From", "Reason"],
    "Vehicle Maintenance": ["Vehicle No", "Issue"],
    "Vehicle Insurance": ["Vehicle No", "Insurance Name"],
    "Vehicle Documents": ["Document Name", "Renewal Date"],
    "Vehicle Fine": ["Vehicle No", "Fine Rep No"],
    "Mobile Bill": ["Mobile No", "Brand Name"],
    "Repairs & Maintenance": ["Repair", "Reason"],
    "IT Accessories": ["Item Name", "Item For"],
    Others: ["Name", "For"],
    "Digital Marketing": ["Social Media Name", "Days"],
    Adds: ["Add In", "Add For"],
    Health: ["For", "Problem"],
    Transport: ["Name", "To"],
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    if (name === "quantity" || name === "price") {
      const qty = parseFloat(updated.quantity) || 0;
      const price = parseFloat(updated.price) || 0;
      updated.total = qty * price;
    }
    setFormData(updated);
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.mainCategory) newErrors.mainCategory = "Main Category is required";
    if (!formData.subCategory) newErrors.subCategory = "Sub Category is required";
    if (!formData.date) newErrors.date = "Date is required";
    else {
      const selectedDate = new Date(formData.date);
      if (selectedDate < minDate || selectedDate > today) {
        newErrors.date = "Date must be within last 5 days including today";
      }
    }
    if (!formData.description) newErrors.description = "Description is required";
    if (!formData.quantity) newErrors.quantity = "Quantity is required";
    if (!formData.price) newErrors.price = "Price is required";
    if (!formData.comments) newErrors.comments = "Comments are required";

    if (extraFieldsConfig[formData.subCategory]) {
      if (!formData.extraField1)
        newErrors.extraField1 = `${extraFieldsConfig[formData.subCategory][0]} is required`;
      if (!formData.extraField2)
        newErrors.extraField2 = `${extraFieldsConfig[formData.subCategory][1]} is required`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const dataToSave = {
      ...formData,
      createdAt: new Date().toISOString(),
      employeeName: "Admin",
    };

    try {
      const newRef = await firebaseDB.child("PettyCash/admin").push(dataToSave);
      const expenseObj = { id: newRef.key, ...dataToSave };
      setSavedExpense(expenseObj);
      setShowSuccessModal(true);

      setFormData({
        mainCategory: "",
        subCategory: "",
        date: "",
        description: "",
        quantity: "",
        price: "",
        total: "",
        comments: "",
        extraField1: "",
        extraField2: "",
      });
    } catch (err) {
      console.error("Error saving expense:", err);
    }
  };

  const formatMonth = (date) =>
    date.toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="container mt-4">
      <h3 className="mb-4">Petty Cash Form</h3>
      <p><strong>Employee:</strong> Admin</p>
      <p><strong>Current Month:</strong> {formatMonth(today)}</p>

      <form onSubmit={handleSubmit} noValidate>
        {/* Main & Sub Category */}
        <div className="row mb-3">
          <div className="col-md-6">
            <label><strong>Main Category <span className="star">*</span></strong></label>
            <select
              name="mainCategory"
              className={`form-select ${errors.mainCategory ? "is-invalid" : ""}`}
              value={formData.mainCategory}
              onChange={handleChange}
              onBlur={handleBlur}
            >
              <option value="">Select Category</option>
              {Object.keys(categories).map((cat, idx) => (
                <option key={idx} value={cat}>{cat}</option>
              ))}
            </select>
            {errors.mainCategory && <div className="invalid-feedback">{errors.mainCategory}</div>}
          </div>
          <div className="col-md-6">
            <label><strong>Sub Category <span className="star">*</span></strong></label>
            <select
              name="subCategory"
              className={`form-select ${errors.subCategory ? "is-invalid" : ""}`}
              value={formData.subCategory}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={!formData.mainCategory}
            >
              <option value="">Select Sub Category</option>
              {formData.mainCategory && categories[formData.mainCategory].map((sub, idx) => (
                <option key={idx} value={sub}>{sub}</option>
              ))}
            </select>
            {errors.subCategory && <div className="invalid-feedback">{errors.subCategory}</div>}
          </div>
        </div>

        {/* Extra Fields */}
        {extraFieldsConfig[formData.subCategory] && (
          <div className="row mb-3">
            <div className="col-md-6">
              <label><strong>{extraFieldsConfig[formData.subCategory][0]} <span className="star">*</span></strong></label>
              <input
                type="text"
                name="extraField1"
                value={formData.extraField1}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`form-control ${errors.extraField1 ? "is-invalid" : ""}`}
              />
              {errors.extraField1 && <div className="invalid-feedback">{errors.extraField1}</div>}
            </div>
            <div className="col-md-6">
              <label><strong>{extraFieldsConfig[formData.subCategory][1]} <span className="star">*</span></strong></label>
              <input
                type="text"
                name="extraField2"
                value={formData.extraField2}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`form-control ${errors.extraField2 ? "is-invalid" : ""}`}
              />
              {errors.extraField2 && <div className="invalid-feedback">{errors.extraField2}</div>}
            </div>
          </div>
        )}

        {/* Date & Description */}
        <div className="row mb-3">
          <div className="col-md-6">
            <label><strong>Date <span className="star">*</span></strong></label>
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
          <div className="col-md-6">
            <label><strong>Description <span className="star">*</span></strong></label>
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
        <div className="row mb-3">
          <div className="col-md-4">
            <label><strong>Quantity <span className="star">*</span></strong></label>
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
          <div className="col-md-4">
            <label><strong>Price <span className="star">*</span></strong></label>
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
          <div className="col-md-4">
            <label><strong>Total</strong></label>
            <input type="number" name="total" value={formData.total} className="form-control" disabled />
          </div>
        </div>

        {/* Comments */}
        <div className="mb-3">
          <label><strong>Comments <span className="star">*</span></strong></label>
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

        <button type="submit" className="btn btn-success">Submit</button>
      </form>

      {/* Success Modal */}
      <SuccessModal
        show={showSuccessModal}
        title="Expense Saved"
        message={
          savedExpense ? (
            <>
              <p>Thank you! <strong>{savedExpense.subCategory}</strong> has been added.</p>
              <p><strong>Price:</strong> ₹{savedExpense.price}</p>
            </>
          ) : <p>Expense saved successfully</p>
        }
        onClose={() => setShowSuccessModal(false)}
      />
    </div>
  );
}
