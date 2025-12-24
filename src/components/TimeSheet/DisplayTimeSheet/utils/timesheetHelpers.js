// Timesheet/DisplayTimeSheet/utils/timesheetHelpers.js
import firebaseDB from '../../../../firebase';
import {empPath} from './pathHelpers'

// Build human ID like JW1-01-25 or JW1-01-25-2
export const buildTimesheetId = async (emp, periodKey) => {
  const base = shortEmpCode(
    emp?.basicInfo?.employeeId || emp?.employeeId || emp?.idNo || "EMP"
  );
  let mm = "01", yy = "00";
  if (/^\d{4}-\d{2}$/.test(periodKey)) {
    ({ mm, yy } = monthParts(periodKey));
  } else {
    const [start = "2000-01-01"] = String(periodKey).split("_to_");
    ({ mm, yy } = monthParts(start.slice(0, 7)));
  }
  const idBase = `${base}-${yy}-${mm}`;

  const allTsSnap = await firebaseDB.child(`${empPath(emp.id)}/timesheets`).get();
  if (!allTsSnap.exists()) return idBase;

  const all = Object.values(allTsSnap.val() || {});
  const samePrefix = all.filter((t) => (t.timesheetId || "").startsWith(idBase));
  if (samePrefix.length === 0) return idBase;

  const thisPeriod = all.find((t) => t.periodKey === periodKey);
  if (thisPeriod?.timesheetId) return thisPeriod.timesheetId;

  return `${idBase}-${samePrefix.length + 1}`;
};

// Short employee code from JW00001 -> JW1 (used in timesheetId)
export const shortEmpCode = (code) => {
  const raw = String(code || "");
  const m = raw.match(/^([A-Za-z]+)0*([0-9]+)/);
  return m ? `${m[1]}${parseInt(m[2], 10)}` : raw.replace(/[^A-Za-z0-9]/g, "");
};

export const monthParts = (yyyyMm) => {
  const [y, m] = (yyyyMm || "").split("-");
  return { mm: m || "01", yy: (y || "").slice(-2) };
};

export const pruneUndefined = (obj = {}) =>
  Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));

export const norm = (s) => String(s || '').trim().toLowerCase();

export const isSubmittedLike = (s) => ['submitted', 'submit', 'assigned'].includes(norm(s));

export const monthShort = (yyyyMm) => {
  if (!/^\d{4}-\d{2}$/.test(yyyyMm)) return yyyyMm || '';
  const [y, m] = yyyyMm.split('-');
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(m, 10) - 1] || m;
  return `${month}-${String(y).slice(-2)}`;
};

export const formatPeriodLabel = (periodKey) => {
  if (!periodKey) return '';
  if (periodKey.includes('_to_')) {
    const [s, e] = periodKey.split('_to_');
    const [sy, sm, sd] = s.split('-');
    const [ey, em, ed] = e.split('-');
    const smon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(sm, 10) - 1];
    const emon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(em, 10) - 1];
    const yy = String(ey).slice(-2);
    return `${smon}-${sd} to ${emon}-${ed} '${yy}`;
  }
  return monthShort(periodKey);
};

export const endOfMonth = (yyyyMm) => {
  if (!/^\d{4}-\d{2}$/.test(yyyyMm)) return '';
  const [y, m] = yyyyMm.split('-').map(Number);
  const d = new Date(y, m, 0);
  return `${yyyyMm}-${String(d.getDate()).padStart(2, '0')}`;
};

export const getCurrentPeriodKey = (useDateRange, startDate, endDate, selectedMonth) => {
  return useDateRange && startDate && endDate
    ? `${startDate}_to_${endDate}`
    : (selectedMonth || '');
};

export const hydrateEntriesWithTsMeta = (rows, tsId, tsStatus) =>
  (rows || []).map(r => ({
    ...r,
    timesheetId: r.timesheetId || tsId || '',
    timesheetStatus: r.timesheetStatus || String(tsStatus || 'draft'),
  }));