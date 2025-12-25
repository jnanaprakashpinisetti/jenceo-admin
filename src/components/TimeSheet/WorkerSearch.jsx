import React, { useEffect, useMemo, useState } from "react";
import firebaseDB from "../../firebase";
import { WORKER_PATHS } from "../../utils/dataPaths";

const WorkerSearch = ({ onSelectEmployee, selectedEmployee }) => {
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // 🔥 LOAD WORKERS FROM ALL DEPARTMENTS
  useEffect(() => {
    const loadWorkers = async () => {
      const allWorkers = [];

      for (const path of Object.values(WORKER_PATHS)) {
        try {
          const snap = await firebaseDB.child(path).get();
          if (snap.exists()) {
            Object.entries(snap.val()).forEach(([id, data]) => {
              allWorkers.push({ id, ...data });
            });
          }
        } catch (e) {
          console.error("Worker load error:", path, e);
        }
      }

      setEmployees(allWorkers);
    };

    loadWorkers();
  }, []);

  const filteredEmployees = useMemo(() => {
    if (!searchTerm) return employees;
    const term = searchTerm.toLowerCase();
    return employees.filter(emp =>
      emp.firstName?.toLowerCase().includes(term) ||
      emp.lastName?.toLowerCase().includes(term) ||
      emp.employeeId?.toLowerCase().includes(term) ||
      emp.idNo?.toLowerCase().includes(term) ||
      emp.primarySkill?.toLowerCase().includes(term)
    );
  }, [employees, searchTerm]);

  return (
    <div className="position-relative">
      <input
        className="form-control"
        placeholder="Search worker..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setShowDropdown(true);
        }}
      />

      {showDropdown && (
        <div className="dropdown-menu show w-100">
          {filteredEmployees.map(emp => (
            <div
              key={emp.id}
              className="dropdown-item"
              onClick={() => {
                onSelectEmployee(emp.id);
                setSearchTerm(`${emp.firstName} ${emp.lastName}`);
                setShowDropdown(false);
              }}
            >
              {emp.firstName} {emp.lastName} ({emp.employeeId || emp.idNo})
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkerSearch;
