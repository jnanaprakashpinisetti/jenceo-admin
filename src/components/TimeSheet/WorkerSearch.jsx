import React, { useState, useMemo } from 'react';

const WorkerSearch = ({ employees, onSelectEmployee, selectedEmployee }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

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

  

  const selectedEmp = employees.find(emp => emp.id === selectedEmployee);

  return (
    <div className="position-relative">
      <div className="input-group">
        <span className="input-group-text bg-dark border-secondary">
          <i className="bi bi-search text-warning"></i>
        </span>
        <input
          type="text"
          className="form-control bg-dark text-white border-secondary"
          placeholder="Search by name, ID, or skill..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
        />
        {selectedEmp && (
          <span className="input-group-text bg-success text-dark border-success">
            <i className="bi bi-check-lg"></i>
          </span>
        )}
      </div>

      {showDropdown && searchTerm && (
        <div 
          className="position-absolute top-100 start-0 end-0 bg-dark border border-secondary rounded mt-1 z-3"
          style={{ maxHeight: '300px', overflowY: 'auto' }}
        >
          {filteredEmployees.map(emp => (
            <div
              key={emp.id}
              className={`p-3 border-bottom border-secondary cursor-pointer ${
                selectedEmployee === emp.id ? 'bg-primary' : 'hover-bg-secondary'
              }`}
              onClick={() => {
                onSelectEmployee(emp.id);
                setSearchTerm(`${emp.firstName} ${emp.lastName} (${emp.employeeId || emp.idNo})`);
                setShowDropdown(false);
              }}
            >
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <strong className="text-white">{emp.firstName} {emp.lastName}</strong>
                  <div className="text-info small">
                    ID: {emp.employeeId || emp.idNo} | {emp.primarySkill} | {emp.gender}
                  </div>
                </div>
                <div className="text-end">
                  <div className="text-warning small">{emp.workExperince} yrs exp</div>
                  <div className="text-success small">{emp.status || 'On Duty'}</div>
                </div>
              </div>
            </div>
          ))}
          {filteredEmployees.length === 0 && (
            <div className="p-3 text-muted text-center">No employees found</div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {showDropdown && (
        <div 
          className="position-fixed top-0 left-0 w-100 h-100" 
          style={{ zIndex: 2 }}
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default WorkerSearch;