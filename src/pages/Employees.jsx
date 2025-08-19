import React from 'react';
import EmployeeBioDataForm from '../components/EmployeeBioDataForm'
import DisplayEmployee from '../components/DisplayEmployee'

export default function Employees() {
  return (
    <div className="layout-body">
      <div className="container-fulid">
        <div className="row">
          <div className="col-md-5">
            <EmployeeBioDataForm />
          </div>
          <div className="col-md-7">
            <DisplayEmployee />
          </div>


        </div>
      </div>
    </div>
  )
}
