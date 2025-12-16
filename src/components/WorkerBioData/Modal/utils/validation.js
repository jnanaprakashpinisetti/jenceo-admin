import { toISO } from "./helpers";

export const validateBasic = (formData, { DOB_MIN, DOB_MAX }) => {
    const errs = [];
    if (formData.dateOfBirth) {
        const dob = new Date(formData.dateOfBirth);
        if (toISO(dob) < DOB_MIN || toISO(dob) > DOB_MAX) {
            errs.push("Age must be between 18 and 60 years.");
        }
    }
    const mobilePattern = /^[0-9]{10}$/;
    if (formData.mobileNo1 && !mobilePattern.test(String(formData.mobileNo1))) errs.push("Mobile 1 must be a 10-digit number.");
    if (formData.mobileNo2 && !mobilePattern.test(String(formData.mobileNo2))) errs.push("Mobile 2 must be a 10-digit number.");

    const aadhaarPattern = /^[0-9]{12}$/;
    if (formData.aadharNo && !aadhaarPattern.test(String(formData.aadharNo))) errs.push("Aadhaar must be a 12-digit number.");
    return { ok: errs.length === 0, errs };
};

export const validateAddress = (formData) => {
    const errs = [];
    const pinPattern = /^[0-9]{6}$/;
    if (formData.permanentPincode && !pinPattern.test(String(formData.permanentPincode)))
        errs.push("Permanent pincode must be a 6-digit number.");
    if (formData.presentPincode && !pinPattern.test(String(formData.presentPincode)))
        errs.push("Present pincode must be a 6-digit number.");
    return { ok: errs.length === 0, errs };
};

export const validatePersonal = (formData, { DOM_MIN, DOM_MAX }) => {
    const errs = [];
    if (formData.maritalStatus === "Married" && formData.dateOfMarriage) {
        const dom = new Date(formData.dateOfMarriage);
        if (toISO(dom) < DOM_MIN || toISO(dom) > DOM_MAX) {
            errs.push("Date of marriage must be within the last 40 years.");
        }
    }
    return { ok: errs.length === 0, errs };
};

export const validatePayments = (formData, { PAY_MIN, PAY_MAX }) => {
    const hasAnyValue = (row) =>
        Object.entries(row).some(([k, v]) => k !== "__locked" && v !== null && v !== undefined && String(v).trim() !== "");

    let ok = true;
    const pErrs = (formData.payments || []).map((p) => {
        if (!hasAnyValue(p)) return {};
        const e = {};
        if (!p.date) {
            e.date = "Date is required";
        } else {
            const d = new Date(p.date);
            const iso = toISO(d);
            if (iso < PAY_MIN || iso > PAY_MAX) e.date = "Payment date must be within the last 1 year";
        }
        if (!p.clientName) e.clientName = "Client name is required";
        if (!p.days) e.days = "Days is required";
        else if (Number(p.days) <= 0 || isNaN(Number(p.days))) e.days = "Days must be a positive number";

        const amountDigits = String(p.amount || "").replace(/\D/g, "");
        if (!amountDigits) e.amount = "Amount is required";
        else if (!/^[0-9]{1,5}$/.test(amountDigits) || Number(amountDigits) <= 0)
            e.amount = "Amount must be a positive number up to 5 digits";

        if (p.balanceAmount && !/^[0-9]+$/.test(String(p.balanceAmount))) e.balanceAmount = "Enter a valid balance amount";
        if (!p.typeOfPayment) e.typeOfPayment = "Type of payment is required";
        if (!p.status) e.status = "Status is required";
        if (Object.keys(e).length) ok = false;
        return e;
    });
    return ok;
};

export const validateWork = (formData) => {
    const hasAnyValue = (row) =>
        Object.entries(row).some(([k, v]) => k !== "__locked" && v !== null && v !== undefined && String(v).trim() !== "");

    let ok = true;
    const wErrs = (formData.workDetails || []).map((w) => {
        if (!hasAnyValue(w)) return {};
        const e = {};
        if (!w.clientId) e.clientId = "Client ID is required";
        if (!w.clientName) e.clientName = "Client name is required";
        if (!w.days) e.days = "Days is required";
        else if (Number(w.days) <= 0 || isNaN(Number(w.days))) e.days = "Days must be a positive number";
        if (!w.fromDate) e.fromDate = "From date is required";
        if (!w.toDate) e.toDate = "To date is required";
        if (w.fromDate && w.toDate && new Date(w.fromDate) > new Date(w.toDate)) {
            e.toDate = "To date must be after From date";
        }
        if (!w.serviceType) e.serviceType = "Service type is required";
        if (Object.keys(e).length) ok = false;
        return e;
    });
    return ok;
};