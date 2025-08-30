import React, { useState } from 'react';
import ClientInfoForm from '../components/clientInfo/ClientInfoForm';
import DisplayClient from '../components/clientInfo/DisplayClient';



export default function ClientInfo() {
  const [showFormModal, setShowFormModal] = useState(false);
  return (
    <div className="layout-body">
      <div className='container-flude'>
        <div className='row'>
          <div className='col-md-12'>
            {/* <ClientInfoForm/> */}
            <div className='text-center'>
              <button
                className="btn btn-warning"
                onClick={() => setShowFormModal(true)}
              >
                Add New Client
              </button>

              {showFormModal && (
                <ClientInfoForm
                  isOpen={showFormModal}
                  onClose={() => setShowFormModal(false)}
                />
              )}
            </div>
            <hr></hr>
          <DisplayClient />

          </div>


        </div>
      </div>

    </div>
  )
}
