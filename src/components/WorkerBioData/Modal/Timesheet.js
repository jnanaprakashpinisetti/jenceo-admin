import React from "react";
import TimesheetTable from "../TimesheetTable.jsx";

const Timesheet = ({ employee }) => {
    return (
        <div className="modal-card bg-dark p-3 rounded-4">
            <div className="modal-card-header border-0">
                <h4 className="mb-0">Timesheet Management</h4>
            </div>
            <div className="modal-card-body">
                <TimesheetTable employee={employee} />
            </div>
        </div>
    );
};

export default Timesheet;