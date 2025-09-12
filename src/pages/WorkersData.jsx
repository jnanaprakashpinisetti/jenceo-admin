import React from 'react';
import WorkerBioDataForm from '../components/WorkerBioData/WorkerBioDataForm'
import DisplayWorkers from '../components/WorkerBioData/DisplayWorkers'

export default function Employees() {
  return (
    <div className="layout-body">
      <div className="container-fulid">
        <div className="row">
          <div className="col-md-4">
            <WorkerBioDataForm />
          </div>
          <div className="col-md-8">
            <DisplayWorkers />
          </div>
        </div>
      </div>
    </div>
  )
}
