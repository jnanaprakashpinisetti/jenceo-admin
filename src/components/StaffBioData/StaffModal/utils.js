import { storageRef, uploadFile, getDownloadURL } from "../../../firebase";
import firebaseDB from "../../../firebase";

export const headerImage = "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FHeadder.svg?alt=media&token=fa65a3ab-ba03-4959-bc36-e293c6db48ae";
export const headerImageSecond = "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FHeadder-2.svg?alt=media&token=83a00c4b-a170-418b-b38b-63c4155b4d6b";

// Date helpers
export const today = new Date();
export const toISO = (d) =>
    d instanceof Date ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : "";
export const minusYears = (y) => new Date(today.getFullYear() - y, today.getMonth(), today.getDate());

export const DOB_MIN = toISO(minusYears(60));
export const DOB_MAX = toISO(minusYears(18));
export const DOM_MIN = toISO(minusYears(40));
export const DOM_MAX = toISO(today);
export const PAY_MIN = toISO(minusYears(1));
export const PAY_MAX = toISO(today);

// Payment and Work templates
export const blankPayment = () => ({
    date: "",
    clientName: "",
    days: "",
    amount: "",
    balanceAmount: "",
    typeOfPayment: "",
    bookNo: "",
    status: "",
    receiptNo: "",
    remarks: "",
    __locked: false,
});

export const blankWork = () => ({
    clientId: "",
    clientName: "",
    location: "",
    days: "",
    fromDate: "",
    toDate: "",
    serviceType: "",
    remarks: "",
    __locked: false,
});

// Helper functions
export const hasAnyValue = (row) =>
    Object.entries(row).some(([k, v]) => k !== "__locked" && v !== null && v !== undefined && String(v).trim() !== "");

export const lockIfFilled = (arr = []) =>
    Array.isArray(arr) ? arr.map((r) => (hasAnyValue(r) ? { ...r, __locked: true } : { ...r, __locked: false })) : [];

// Dot-path setter for nested fields
export const setNested = (obj, path, value) => {
    const keys = path.split(".");
    const next = { ...obj };
    let cur = next;
    for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        cur[k] = typeof cur[k] === "object" && cur[k] !== null ? { ...cur[k] } : {};
        cur = cur[k];
    }
    cur[keys[keys.length - 1]] = value;
    return next;
};

// Safe value formatter
export const safe = (v, fallback = "—") => (v !== undefined && v !== null && String(v).trim() !== "" ? v : fallback);
export const formatLine = (...parts) => parts.filter(Boolean).join(" ");

// Get download URL for Firebase Storage
export const getDownloadUrl = (storagePath) => {
    if (!storagePath) return "";

    // If it's already a download URL, return it
    if (storagePath.includes('firebasestorage.googleapis.com')) {
        return storagePath;
    }

    // If it's a storage reference (gs://...), convert to download URL
    if (storagePath.startsWith('gs://')) {
        const matches = storagePath.match(/gs:\/\/([^\/]+)\/(.+)/);
        if (matches) {
            const bucket = matches[1];
            const filePath = matches[2];
            const encodedPath = encodeURIComponent(filePath);
            return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
        }
    }

    // If it's a storage reference without gs://
    if (storagePath.includes('/staff-photos/')) {
        let cleanPath = storagePath.replace('gs://jenceo-admin.firebasestorage.app/', '');
        if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
        const encodedPath = encodeURIComponent(cleanPath);
        return `https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/${encodedPath}?alt=media`;
    }

    return storagePath;
};