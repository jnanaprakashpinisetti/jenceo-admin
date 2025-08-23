import React from 'react';
import ClientInfoForm from '../components/clientInfo/ClientInfoForm';
import DisplayClient from '../components/clientInfo/DisplayClient';



export default function ClientInfo() {
  return (
    <div className="layout-body">
      <div className='container-flude'>
        <div className='row'>
          <div className='col-md-4'>
            <ClientInfoForm/>
          </div>
          <div className='col-md-8'>
            <DisplayClient />

          </div>
        </div>

      </div>
    </div>
  )
}
