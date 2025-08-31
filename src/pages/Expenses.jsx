import React from 'react'
import PettyCashForm from '../components/PettyCash/PettyCashForm'
import PettyCashReport from '../components/PettyCash/PettyCashReport'



export default function Expenses() {
  return (
    <div className="layout-body">
      <div className="row">
        <div className="col-md-3">
          <PettyCashForm />
        </div>
        <div className="col-md-9">
        <PettyCashReport />
        </div>
      </div>

    </div>
  )
}
