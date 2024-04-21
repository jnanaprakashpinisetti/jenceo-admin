import React from 'react'
import InvestForm from '../components/InvestForm'

export default function Investments() {
  return (
    <div className="layout-body">
      <div className="container-fluid">
        <div className="row">
          <div className="col-md-3">
            <InvestForm />
          </div>
        </div>
      </div>

    </div>
  )
}
