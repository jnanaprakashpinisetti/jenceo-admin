import React, { useState, useEffect } from 'react';
import firebaseDB from '../firebase';
import editIcon from '../assets/eidt.svg';
import viewIcon from '../assets/view.svg';
import deleteIcon from '../assets/delete.svg';
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
                firebaseDB.child("EmployeeBioData").on('value', (snapshot) => {
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
            firebaseDB.child("EmployeeBioData").off('value');
        };
    }, []);

    // Alternative simpler sorting method if IDs are simple numbers
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

    // Rest of your component remains the same...
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

    const handleDelete = async (employeeId) => {
        try {
            const employeeRef = firebaseDB.child(`EmployeeBioData/${employeeId}`);
            const snapshot = await employeeRef.once('value');
            const employeeData = snapshot.val();

            if (employeeData) {
                await firebaseDB.child(`ExitEmployees/${employeeId}`).set(employeeData);
                await employeeRef.remove();
                alert('Employee moved to ExitEmployees successfully!');
            }
        } catch (err) {
            setError('Error deleting employee: ' + err.message);
        }
    };

    const handleSave = async (updatedEmployee) => {
        try {
            await firebaseDB.child(`EmployeeBioData/${updatedEmployee.id}`).update(updatedEmployee);
            setIsModalOpen(false);
            alert('Employee details updated successfully!');
        } catch (err) {
            setError('Error updating employee: ' + err.message);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedEmployee(null);
        setIsEditMode(false);
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
                                            <img src={viewIcon} alt="view Icon" style={{ opacity: 0.6, width: '20px', height: '20px' }} />
                                        </button>
                                        <button
                                            className="btn btn-sm me-2"
                                            title="Edit"
                                            onClick={() => handleEdit(employee)}
                                        >
                                            <img src={editIcon} alt="edit Icon" style={{ width: '20px', height: '20px' }} />
                                        </button>
                                        <button
                                            className="btn btn-sm"
                                            title="Delete"
                                            onClick={() => handleDelete(employee.id)}
                                        >
                                            <img src={deleteIcon} alt="delete Icon" style={{ width: '20px', height: '20px' }} />
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
                    onDelete={handleDelete}
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