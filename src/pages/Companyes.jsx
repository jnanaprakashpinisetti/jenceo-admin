import React, {useState} from 'react'

import CompanyRegForm from '../components/Companyes/CompanyRegForm'
import DisplayCompany from '../components/Companyes/DisplayCompany'
export default function Companyes() {
    const [showFormModal, setShowFormModal] = useState(false);
  return (
    <div className="layout-body client-info">
    <div className='row'>
      <div className='col-md-12'>
        <div className='mmt-3'>
        <div className='text-center'>
          <button
            className="btn btn-warning"
            onClick={() => setShowFormModal(true)}
          >
            Add New Company
          </button>
          </div>

          {showFormModal && (
            <CompanyRegForm
              isOpen={showFormModal}
              onClose={() => setShowFormModal(false)}
            />
          )}
        </div>
        <hr></hr>
        <DisplayCompany/>
      </div>
    </div>

  </div>
  )
}
