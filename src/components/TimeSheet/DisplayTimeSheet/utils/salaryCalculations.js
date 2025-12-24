// Timesheet/DisplayTimeSheet/utils/salaryCalculations.js
export const dailyRateFor = (emp) => {
  const basic = Number(emp?.basicSalary) || 0;
  return basic / 30;
};

export const getEmergencyAmount = (src) => {
  const v = src?.emergencyAmount ?? src?.emergencySalary ?? src?.emergencyPay ?? 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const salaryForEntry = (emp, entryLike) => {
  // 1) manual/override wins
  if (entryLike?.manualDailyEnabled && entryLike?.manualDailyAmount) {
    const manualAmount = Number(entryLike.manualDailyAmount) || 0;
    return manualAmount;
  }

  // 2) compute the daily rate from edited basic or employee basic
  const basicSalary = Number(entryLike?.editedBasicSalary) || Number(emp?.basicSalary) || 0;
  const rate = basicSalary / 30;

  const status = String(entryLike?.status || 'present').toLowerCase();
  const isHalf = !!entryLike?.isHalfDay;
  const isEmergency = !!entryLike?.isEmergency;

  const emergencyAdd = getEmergencyAmount(entryLike);

  if (isEmergency) {
    const base = isHalf ? rate / 2 : rate;
    return base + emergencyAdd;
  }

  if (status !== 'present') return 0;

  return isHalf ? rate / 2 : rate;
};

export const calculateSummary = (entries, advancesData, employee) => {
  const fullDays = entries.filter(e => e.status === 'present' && !e.isPublicHoliday && !e.isHalfDay).length;
  const halfDays = entries.filter(e => e.status === 'present' && !e.isPublicHoliday && e.isHalfDay).length;
  const workingDays = fullDays + (halfDays * 0.5);
  const holidays = entries.filter(e => e.isPublicHoliday || e.status === 'holiday').length;
  const emergencies = entries.filter(e => e.isEmergency).length;
  const leaves = entries.filter(e => e.status === 'leave').length;
  const absents = entries.filter(e => e.status === 'absent').length;
  const totalSalary = entries.reduce((s, e) => s + (parseFloat(e.dailySalary) || 0), 0);

  const advancesList = Array.isArray(advancesData) ? advancesData : Object.values(advancesData || {});
  const totalAdv = advancesList.reduce((sum, a) => sum + (parseFloat(a?.amount) || 0), 0);

  const netPayable = Math.round(totalSalary - totalAdv);

  return {
    workingDays,
    fullDays,
    halfDays,
    leaves,
    holidays,
    emergencies,
    absents,
    totalDays: entries.length,
    totalSalary,
    advancesTotal: totalAdv,
    netPayable,
  };
};