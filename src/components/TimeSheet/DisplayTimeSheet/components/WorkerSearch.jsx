// Timesheet/DisplayTimeSheet/components/WorkerSearch.jsx
import React, { useState, useMemo, useEffect } from 'react';

const WorkerSearch = ({ employees, onSelectEmployee, selectedEmployee }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [displayedEmployees, setDisplayedEmployees] = useState([]);

  useEffect(() => {
    // Initialize with selected employee at top when available
    if (selectedEmployee && employees.length > 0) {
      const selectedEmp = employees.find(e => e.id === selectedEmployee);
      if (selectedEmp) {
        setSearchTerm(`${selectedEmp.firstName} ${selectedEmp.lastName} (${selectedEmp.employeeId || selectedEmp.idNo || 'N/A'})`);
      }
    }
  }, [selectedEmployee, employees]);

  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) {
      // When no search, show selected employee first, then up to 10 others
      const otherEmployees = employees.filter(emp => emp.id !== selectedEmployee);
      const result = selectedEmployee 
        ? [employees.find(emp => emp.id === selectedEmployee), ...otherEmployees.slice(0, 9)]
        : employees.slice(0, 10);
      return result.filter(Boolean); // Remove any undefined entries
    }
    
    const term = searchTerm.toLowerCase().trim();
    return employees.filter(emp => {
      const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
      const employeeId = (emp.employeeId || '').toLowerCase();
      const idNo = (emp.idNo || '').toLowerCase();
      const department = (emp.department || '').toLowerCase();
      
      return fullName.includes(term) ||
             employeeId.includes(term) ||
             idNo.includes(term) ||
             department.includes(term) ||
             emp.id.toLowerCase().includes(term);
    }).slice(0, 20);
  }, [searchTerm, employees, selectedEmployee]);

  const selectedEmp = employees.find(e => e.id === selectedEmployee);

  const handleEmployeeSelect = (emp) => {
    onSelectEmployee(emp.id);
    setSearchTerm(`${emp.firstName} ${emp.lastName} (${emp.employeeId || emp.idNo || emp.id})`);
    setIsDropdownOpen(false);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    onSelectEmployee(null);
    setIsDropdownOpen(false);
  };

  return (
    <div className="position-relative">
      <div className="input-group">
        <span className="input-group-text bg-dark border-secondary">
          <i className="fas fa-user text-warning"></i>
        </span>
        <input
          type="text"
          className="form-control bg-dark text-white border-secondary"
          placeholder="Search by name, ID, or department..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsDropdownOpen(true);
          }}
          onFocus={() => setIsDropdownOpen(true)}
          onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
        />
        {selectedEmp ? (
          <button
            className="btn btn-danger border-danger"
            type="button"
            onClick={handleClearSearch}
            title="Clear selection"
          >
            <i className="fas fa-times"></i>
          </button>
        ) : (
          <span className="input-group-text bg-dark border-secondary">
            <i className="fas fa-search text-info"></i>
          </span>
        )}
      </div>

      {isDropdownOpen && (
        <div
          className="position-absolute top-100 start-0 end-0 bg-dark border border-secondary rounded mt-1 z-3 shadow-lg"
          style={{ maxHeight: '400px', overflowY: 'auto' }}
        >
          {filteredEmployees.length > 0 ? (
            <>
              <div className="p-2 border-bottom border-secondary bg-secondary bg-opacity-25">
                <small className="text-muted">
                  Found {filteredEmployees.length} employee(s)
                </small>
              </div>
              {filteredEmployees.map(emp => (
                <div
                  key={emp.id}
                  className={`p-3 border-bottom border-secondary cursor-pointer ${selectedEmployee === emp.id ? 'bg-primary bg-opacity-25' : 'hover-bg-secondary'
                    }`}
                  onClick={() => handleEmployeeSelect(emp)}
                  onMouseDown={(e) => e.preventDefault()} // Prevent blur on click
                >
                  <div className="d-flex align-items-center">
                    {emp.employeePhotoUrl ? (
                      <img
                        src={emp.employeePhotoUrl}
                        alt={emp.firstName}
                        className="rounded-circle me-3"
                        style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="rounded-circle bg-secondary me-3 d-flex align-items-center justify-content-center"
                        style={{ width: '40px', height: '40px' }}>
                        <i className="fas fa-user text-muted"></i>
                      </div>
                    )}
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <strong className="text-white">{emp.firstName} {emp.lastName}</strong>
                          <div className="text-info small">
                            ID: {emp.employeeId || emp.idNo || emp.id.slice(0, 8)} 
                            {emp.department && ` • ${emp.department}`}
                          </div>
                        </div>
                        <div className="text-end">
                          <div className="text-warning small">₹{emp.basicSalary || 0}</div>
                          {selectedEmployee === emp.id && (
                            <span className="badge bg-success">Selected</span>
                          )}
                        </div>
                      </div>
                      {emp.category && (
                        <small className="text-muted">
                          Category: {emp.category}
                        </small>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="p-3 text-muted text-center">
              <i className="fas fa-users-slash me-2"></i>
              No employees found
            </div>
          )}
        </div>
      )}

      {isDropdownOpen && (
        <div
          className="position-fixed top-0 left-0 w-100 h-100"
          style={{ zIndex: 2 }}
          onClick={() => setIsDropdownOpen(false)}
        />
      )}

      {selectedEmp && !isDropdownOpen && (
        <div className="mt-2 p-2 bg-dark border border-info rounded">
          <div className="d-flex align-items-center">
            {selectedEmp.employeePhotoUrl && (
              <img
                src={selectedEmp.employeePhotoUrl}
                alt={selectedEmp.firstName}
                className="rounded-circle me-2"
                style={{ width: '30px', height: '30px', objectFit: 'cover' }}
              />
            )}
            <div>
              <small className="text-info">
                <strong>Selected:</strong> {selectedEmp.firstName} {selectedEmp.lastName} • 
                ID: {selectedEmp.employeeId || selectedEmp.idNo} • 
                Salary: ₹{selectedEmp.basicSalary || 0}
              </small>
              <br />
              <small className="text-muted">
                Category: {selectedEmp.category || 'Not specified'} • 
                Department: {selectedEmp.department || 'Not specified'}
              </small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerSearch;