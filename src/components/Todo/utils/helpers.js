export const cn = (...xs) => xs.filter(Boolean).join(" ");
export const safeVal = (v, d = "") => (v === null || v === undefined ? d : v);

export const fmtDT = (ts) => {
  try {
    if (!ts) return "Recent";
    const d = typeof ts === "number" ? new Date(ts) : new Date(String(ts));
    return d.toLocaleString("en-GB", { hour12: true });
  } catch {
    return "Recent";
  }
};

export const todayYMD = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const anyFilterActive = (state) => {
  const { activeTab, qtext, cat, prio, assignee, issueType, sort, projectId } = state;
  return !(
    activeTab === "all" &&
    qtext === "" &&
    cat === "ALL" &&
    prio === "ALL" &&
    assignee === "ALL" &&
    issueType === "ALL" &&
    sort === "createdAt_desc" &&
    projectId === "ALL"
  );
};

export const generateProjectKey = (title) => {
  // Extract first 4 letters, uppercase, remove non-alphabet chars
  const base = title.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase();
  return base || "PROJ";
};

// src/utils/helpers.js
export const isFn = (fn) => typeof fn === 'function';
export const isObj = (obj) => obj && typeof obj === 'object' && !Array.isArray(obj);
export const isStr = (str) => typeof str === 'string';
export const isNum = (num) => typeof num === 'number' && !isNaN(num);