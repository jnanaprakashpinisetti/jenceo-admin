import React, { useState } from 'react';
import WorkerBioDataForm from '../components/WorkerBioData/WorkerBioDataForm'
import DisplayWorkers from '../components/WorkerBioData/DisplayWorkers'

export default function Employees() {
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  return (
    <div className="layout-body">
      <div className="container-fulid">
        <div className="row">

          <div className="col-md-12">

            <div className='text-center'>
              <button onClick={() => setShowWorkerModal(true)} className="btn btn-warning mb-4">
                Add Worker
              </button>

              {/* Pass isOpen and onClose props */}
              <WorkerBioDataForm
                isOpen={showWorkerModal}
                onClose={() => setShowWorkerModal(false)}
              />
            </div>
            <DisplayWorkers />
          </div>
        </div>
      </div>
    </div>
  )
}
