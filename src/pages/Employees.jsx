import React from 'react';
import EmployeeBioDataForm from '../components/WorkerBioData/EmployeeBioDataForm'
import DisplayEmployee from '../components/WorkerBioData/DisplayEmployee'

export default function Employees() {
  return (
    <div className="layout-body">
      <div className="container-fulid">
        <div className="row">
          <div className="col-md-4">
            <EmployeeBioDataForm />
          </div>
          <div className="col-md-8">
            <DisplayEmployee />
          </div>
        </div>
      </div>
    </div>
  )
}
