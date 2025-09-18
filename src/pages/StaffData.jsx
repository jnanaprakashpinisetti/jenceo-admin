import React, { useState } from 'react';
import StaffBioDataForm from '../components/StaffBioData/StaffBioDataForm'
import DisplayStaffs from '../components/StaffBioData/DisplayStaffs'

export default function Employees() {
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  return (
    <div className="layout-body">
      <div className="container-fulid">
        <div className="row">

          <div className="col-md-12">

            <div className='text-center'>
              <button onClick={() => setShowWorkerModal(true)} className="btn btn-warning mb-4">
                Add Employee
              </button>

              {/* Pass isOpen and onClose props */}
              <StaffBioDataForm
                isOpen={showWorkerModal}
                onClose={() => setShowWorkerModal(false)}
              />
            </div>
            <DisplayStaffs />
          </div>
        </div>
      </div>
    </div>
  )
}
