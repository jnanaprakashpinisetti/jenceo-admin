import React from 'react'
import EnquiryForm from '../components/Enquiry/EnquiryForm'
import EnquiriesDisplay from '../components/Enquiry/EnquiriesDisplay'




export default function Accounts() {
  return (
    <div className="layout-body">
      <div className="row">
        <div className="col-md-4">
          <EnquiryForm />
        </div>
        <div className="col-md-8">
          <EnquiriesDisplay />
        </div>
      </div>
    </div>
  )
}
