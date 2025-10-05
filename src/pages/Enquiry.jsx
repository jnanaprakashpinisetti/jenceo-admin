import React, { useState } from 'react'
import EnquiryForm from '../components/Enquiry/EnquiryForm'
import EnquiriesDisplay from '../components/Enquiry/EnquiriesDisplay'

export default function Accounts() {
  const [showEnquiryModal, setShowEnquiryModal] = useState(false);
  return (
    <div className="layout-body enquiry">
      <div className="row">
        <div className="col-md-12">
          <div className=" m-auto text-center ">
            <button className="btn btn-warning mmt-3" onClick={() => setShowEnquiryModal(true)}>+ New Enquiry </button>
            <EnquiryForm
              show={showEnquiryModal}
              onClose={() => setShowEnquiryModal(false)}
              title="Add New Enquiry"
            />
          </div>
          <hr></hr>
          <EnquiriesDisplay />
        </div>
      </div>

    </div>
  )
}
