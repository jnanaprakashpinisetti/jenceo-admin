export function getEffectiveUserId(u) {
    return u?.dbId || u?.uid || u?.id || u?.key || null;
}

export function getEffectiveUserName(u, fallback = "System") {
    const raw =
        u?.name ||
        u?.displayName ||
        u?.dbName ||
        u?.username ||
        u?.email ||
        fallback ||
        "System";
    return String(raw).trim().replace(/@.*/, "") || "System";
}

export const toISO = (d) =>
    d instanceof Date ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : "";

export const formatDDMMYY = (iso) => {
    if (!iso) return "—";
    try {
        const d = new Date(iso);
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yy = String(d.getFullYear()).slice(-2);
        return `${dd}-${mm}-${yy}`;
    } catch {
        return "—";
    }
};

export const formatTime12h = (iso) => {
    if (!iso) return "";
    try {
        let h = new Date(iso).getHours();
        const m = String(new Date(iso).getMinutes()).padStart(2, "0");
        const ampm = h >= 12 ? "PM" : "AM";
        h = h % 12 || 12;
        return `${h}:${m} ${ampm}`;
    } catch {
        return "";
    }
};

export const blankPayment = () => ({
    date: "",
    clientName: "",
    days: "",
    amount: "",
    balanceAmount: "",
    typeOfPayment: "",
    timesheetID: "",
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

export const stampAuthorOnRow = (row, userName, nowISO = new Date().toISOString()) => {
    const name =
        row.addedByName ||
        row.addByName ||
        row.createdByName ||
        userName ||
        "System";

    const when =
        row.addedAt ||
        row.addAt ||
        row.createdAt ||
        nowISO;

    return {
        ...row,
        addedByName: name,
        addedAt: when,
        createdByName: name,
        createdAt: when,
        addByName: name,
        addAt: when,
    };
};