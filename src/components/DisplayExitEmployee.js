import React, { useState, useEffect } from 'react';
import firebaseDB from '../firebase';
import editIcon from '../assets/eidt.svg';
import viewIcon from '../assets/view.svg';
import deleteIcon from '../assets/delete.svg';
import returnIcon from '../assets/return.svg';
import EmployeeModal from './EmployeeModal';

export default function DisplayEmployee() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    useEffect(() => {
        const fetchEmployees = () => {
            try {
                firebaseDB.child("ExitEmployees").on('value', (snapshot) => {
                    if (snapshot.exists()) {
                        const employeesData = [];
                        snapshot.forEach((childSnapshot) => {
                            employeesData.push({
                                id: childSnapshot.key,
                                ...childSnapshot.val()
                            });
                        });

                        // Sort employees by ID number in descending order
                        const sortedEmployees = employeesData.sort((a, b) => {
                            // Extract numeric part from ID (JW00001 -> 1, JW00025 -> 25)
                            const getNumericId = (emp) => {
                                const id = emp.idNo || emp.employeeId || '';
                                if (id.startsWith('JW')) {
                                    return parseInt(id.replace('JW', '')) || 0;
                                }
                                return 0;
                            };

                            return getNumericId(b) - getNumericId(a);
                        });

                        setEmployees(sortedEmployees);
                    } else {
                        setEmployees([]);
                    }
                    setLoading(false);
                });
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };

        fetchEmployees();

        return () => {
            firebaseDB.child("ExitEmployees").off('value'); // Fixed: Changed from EmployeeBioData to ExitEmployees
        };
    }, []);

    const handleView = (employee) => {
        setSelectedEmployee(employee);
        setIsEditMode(false);
        setIsModalOpen(true);
    };

    const handleEdit = (employee) => {
        setSelectedEmployee(employee);
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    const returnBack = async (employeeId) => {
        try {
            // Reference to the employee in ExitEmployees
            const exitEmployeeRef = firebaseDB.child(`ExitEmployees/${employeeId}`);
            const snapshot = await exitEmployeeRef.once('value');
            const employeeData = snapshot.val();

            if (employeeData) {
                // Move data to EmployeeBioData
                await firebaseDB.child(`EmployeeBioData/${employeeId}`).set(employeeData);
                
                // Remove from ExitEmployees
                await exitEmployeeRef.remove();
                
                alert('Employee moved back to EmployeeBioData successfully!');
            } else {
                alert('Employee not found in ExitEmployees!');
            }
        } catch (err) {
            setError('Error moving employee: ' + err.message);
            console.error('Error moving employee:', err);
        }
    };

    const handleSave = async (updatedEmployee) => {
        try {
            // FIX: Update in ExitEmployees instead of EmployeeBioData
            await firebaseDB.child(`ExitEmployees/${updatedEmployee.id}`).update(updatedEmployee);
            setIsModalOpen(false);
            alert('Employee details updated successfully!');
            
            // Optional: Force refresh the data
            const snapshot = await firebaseDB.child("ExitEmployees").once('value');
            if (snapshot.exists()) {
                const employeesData = [];
                snapshot.forEach((childSnapshot) => {
                    employeesData.push({
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    });
                });
                setEmployees(sortEmployeesDescending(employeesData));
            }
        } catch (err) {
            setError('Error updating employee: ' + err.message);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedEmployee(null);
        setIsEditMode(false);
    };

    // Alternative simpler sorting method
    const sortEmployeesDescending = (employeesData) => {
        return employeesData.sort((a, b) => {
            // Get the ID numbers
            const idA = a.idNo || a.employeeId || '';
            const idB = b.idNo || b.employeeId || '';

            // For JW00001 pattern
            if (idA.startsWith('JW') && idB.startsWith('JW')) {
                const numA = parseInt(idA.replace('JW', '')) || 0;
                const numB = parseInt(idB.replace('JW', '')) || 0;
                return numB - numA;
            }

            // For numeric IDs
            if (!isNaN(idA) && !isNaN(idB)) {
                return parseInt(idB) - parseInt(idA);
            }

            // For string IDs
            return idB.localeCompare(idA);
        });
    };

    if (loading) return <div className="text-center my-5">Loading employees...</div>;
    if (error) return <div className="alert alert-danger">Error: {error}</div>;
    if (employees.length === 0) return <div className="alert alert-info">No employees found</div>;

    return (
        <div>
            <div className="table-responsive">
                <table className="table table-dark table-hover">
                    <thead className="table-dark">
                        <tr>
                            <th>ID No ↓</th>
                            <th>Name</th>
                            <th>Gender</th>
                            <th>Primary Skill</th>
                            <th>Experience</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {employees.map((employee) => (
                            <tr key={employee.id}>
                                <td>
                                    <strong>{employee.employeeId || employee.idNo || 'N/A'}</strong>
                                </td>
                                <td>{employee.firstName} {employee.lastName}</td>
                                <td>{employee.gender || 'N/A'}</td>
                                <td>{employee.primarySkill || 'N/A'}</td>
                                <td>{employee.workExperince ? `${employee.workExperince}` : 'N/A'}</td>
                                <td>
                                    <span className={`badge ${getStatusBadgeClass(employee.status)}`}>
                                        {employee.status || 'On Duty'}
                                    </span>
                                </td>
                                <td>
                                    <div className="d-flex">
                                        <button
                                            className="btn btn-sm me-2"
                                            title="View"
                                            onClick={() => handleView(employee)}
                                        >
                                            <img src={viewIcon} alt="view Icon" style={{ opacity: 0.6, width: '18px', height: '18px' }} />
                                        </button>
                                        <button
                                            className="btn btn-sm me-2"
                                            title="Edit"
                                            onClick={() => handleEdit(employee)}
                                        >
                                            <img src={editIcon} alt="edit Icon" style={{ width: '15px', height: '15px' }} />
                                        </button>
                                        <button
                                            className="btn btn-sm"
                                            title="Return Back"
                                            onClick={() => returnBack(employee.id)}
                                        >
                                            <img src={returnIcon} alt="return Icon" style={{ width: '14px', height: '18px' }} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedEmployee && (
                <EmployeeModal
                    employee={selectedEmployee}
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSave}
                    onReturn={returnBack}
                    isEditMode={isEditMode}
                />
            )}
        </div>
    );
}

// Helper function for status badge styling
const getStatusBadgeClass = (status) => {
    switch (status) {
        case 'On Duty': return 'bg-success';
        case 'Off Duty': return 'bg-secondary';
        case 'Resigned': return 'bg-warning';
        case 'Absconder': return 'bg-danger';
        case 'Terminated': return 'bg-dark';
        default: return 'bg-info';
    }
};