// Timesheet/DisplayTimeSheet/hooks/useTimesheetData.js
import firebaseDB from '../../../../firebase';
import { getAllCategoryPaths } from '../utils/pathHelpers';
import { useTimesheet } from '../context/TimesheetContext';

export const useTimesheetData = () => {
  const { setEmployees, setLoading } = useTimesheet();

  const fetchEmployees = async () => {
    setLoading(true);

    try {
      const paths = getAllCategoryPaths();
      const allEmployees = [];

      for (const path of paths) {
        const snap = await firebaseDB.child(path).get();
        if (!snap.exists()) continue;

        Object.entries(snap.val()).forEach(([id, emp]) => {
          allEmployees.push({
            id,
            ...emp,
            category: emp.category || path.split('/')[1],
          });
        });
      }

      setEmployees(allEmployees);
      console.log('✅ Employees loaded:', allEmployees.length);
    } catch (err) {
      console.error('❌ Failed to load employees', err);
    } finally {
      setLoading(false);
    }
  };

  return { fetchEmployees };
};
