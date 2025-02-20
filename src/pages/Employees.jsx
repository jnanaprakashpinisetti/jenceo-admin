import React from 'react';
import EmployeeInfoForm from "../components/EmployeeInfoForm"

export default function Employees() {
  return (
    <div className="layout-body">
      <div className="container-fulid">
        <div className="row">
          <div className="col-md-3">
            <h4>Employee Basic Info</h4>
            <EmployeeInfoForm/>
          </div>
          <div className="col-md-9">Emp</div>


        </div>
      </div>
    </div>
  )
}
