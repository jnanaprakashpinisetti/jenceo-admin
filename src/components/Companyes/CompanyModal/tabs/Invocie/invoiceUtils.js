// Utility functions for invoice operations

export const resolvePhoto = (photo, defaultPhoto) => {
  if (!photo) return defaultPhoto;

  // Direct URL
  if (typeof photo === "string" && photo.startsWith("http")) {
    return photo;
  }

  // Object with url
  if (photo?.url && typeof photo.url === "string") {
    return photo.url;
  }

  // Reject invalid objects
  return defaultPhoto;
};

export const normalizeWorker = (w = {}) => ({
  workerId: w.workerId || w.idNo || "",
  workerName: w.workerName ||
    `${w.firstName || ""} ${w.lastName || ""}`.trim() ||
    w.name || "",
  department: w.department || "",
  phone: w.workerCell1 || w.mobileNo1 || "",
  photo: w.photo || w.profilePhoto || w.employeePhoto || ""
});

export const calculateDaysCount = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  } catch (error) {
    return 0;
  }
};

export const calculateInvoiceAmount = (daysCount, dayAmount) => {
  const days = parseFloat(daysCount) || 0;
  const amount = parseFloat(dayAmount) || 0;
  return days * amount;
};

export const calculateTotalAmount = (data) => {
  const startDate = data.serviceDate;
  const endDate = data.endDate;
  const daysCount = calculateDaysCount(startDate, endDate);
  const invoiceAmount = calculateInvoiceAmount(daysCount, data.dayAmount);
  const travelingCharges = parseFloat(data.travelingCharges) || 0;
  const extraCharges = parseFloat(data.extraCharges) || 0;
  return invoiceAmount + travelingCharges + extraCharges;
};

export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  } catch (error) {
    if (typeof dateString === 'string') {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts;
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = monthNames[parseInt(month) - 1];
        return `${day}-${monthName}-${year.slice(-2)}`;
      }
    }
    return dateString;
  }
};

export const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  } catch (error) {
    return formatDate(dateString);
  }
};

export const formatINR = (value) => {
  const n = Number(value || 0);
  if (!isFinite(n)) return "₹0.00";
  try {
    return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch {
    return "₹" + n.toFixed(2);
  }
};

export const formatAmount = (value) => {
  const n = Number(value || 0);
  if (!isFinite(n)) return "0.00";
  try {
    return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch {
    return n.toFixed(2);
  }
};

export const formatWorkerName = (worker) => {
  if (!worker) return "";
  if (worker.workerName) return worker.workerName;
  if (worker.firstName || worker.lastName) {
    return `${worker.firstName || ""} ${worker.lastName || ""}`.trim();
  }
  if (worker.name) return worker.name;
  return "";
};

export const thankYouMessages = {
  default: {
    title: "Thank You for Your Partnership!",
    message: `
      Dear <strong>${'Company'}</strong>,
      <br>
      We truly appreciate your trust and partnership with JenCeo Home Care Services.
      <br>
      We're here to support you whenever needed and look forward to our continued collaboration.
    `
  },
  homeCare: {
    title: "Appreciating Our Home Care Partnership!",
    message: `
      Dear <strong>${'Company'}</strong>,
      <br>
      Thank you for partnering with us in providing quality home care services.
      <br>
      We value our collaboration and are committed to maintaining the highest standards of care and service.
    `
  },
  housekeeping: {
    title: "Thank You for Choosing Our Housekeeping Services!",
    message: `
      Dear <strong>${'Company'}</strong>,
      <br>
      We appreciate your trust in our housekeeping and maintenance services.
      <br>
      Our team is dedicated to ensuring your premises remain clean, organized, and well-maintained.
    `
  },
  security: {
    title: "Grateful for Our Security Partnership!",
    message: `
      Dear <strong>${'Company'}</strong>,
      <br>
      Thank you for entrusting us with your security needs.
      <br>
      We are committed to providing reliable and professional security services to protect your assets and premises.
    `
  },
  custom: {
    title: "Thank You Message",
    message: ""
  }
};

export const determineServiceType = (companyType) => {
  const serviceType = (companyType || '').toLowerCase();

  if (serviceType.includes('home care') || serviceType.includes('healthcare') || serviceType.includes('hospital')) {
    return 'homeCare';
  } else if (serviceType.includes('housekeeping') || serviceType.includes('cleaning') || serviceType.includes('maid')) {
    return 'housekeeping';
  } else if (serviceType.includes('security') || serviceType.includes('guard')) {
    return 'security';
  } else {
    return 'default';
  }
};

export const getCurrentThankYouMessage = (thankYouType, customThankYou, companyName) => {
  if (thankYouType === 'custom' && customThankYou) {
    return {
      title: "Thank You Message",
      message: customThankYou.replace('Company', `<strong>${companyName || 'Company'}</strong>`)
    };
  }
  
  const message = thankYouMessages[thankYouType] || thankYouMessages.default;
  return {
    ...message,
    message: message.message.replace('Company', `<strong>${companyName || 'Company'}</strong>`)
  };
};

export const getPaymentDetails = (payments, company) => {
  const validPayments = payments.filter(p => p && !p.__adjustment);
  const lastPayment = validPayments.length > 0 ? validPayments[validPayments.length - 1] : null;

  const totalPaid = validPayments.reduce((sum, payment) => {
    const amount = parseFloat(payment.paidAmount) || 0;
    return sum + amount;
  }, 0);

  const serviceCharges = parseFloat(company?.serviceCharges) || 0;
  const currentBalance = Math.max(0, serviceCharges - totalPaid);

  let nextPaymentDate = null;
  if (lastPayment && lastPayment.date) {
    try {
      const lastDate = new Date(lastPayment.date);
      lastDate.setDate(lastDate.getDate() + 29);
      nextPaymentDate = lastDate;
    } catch (e) {
      // Do nothing
    }
  } else if (company?.contractStartDate) {
    try {
      const startDate = new Date(company.contractStartDate);
      startDate.setDate(startDate.getDate() + 29);
      nextPaymentDate = startDate;
    } catch (e) {
      // Do nothing
    }
  }

  return {
    lastPayment: lastPayment ? {
      amount: parseFloat(lastPayment.paidAmount) || 0,
      date: lastPayment.date,
      method: lastPayment.paymentMethod || 'Cash'
    } : null,
    currentBalance: currentBalance,
    totalPaid: totalPaid,
    serviceCharges: serviceCharges,
    nextPaymentDate: nextPaymentDate,
    presentDate: new Date().toLocaleDateString('en-IN')
  };
};