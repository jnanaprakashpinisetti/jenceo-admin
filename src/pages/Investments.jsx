import React, { useState, useEffect } from 'react';
import InvestForm from '../components/Investments/InvestForm';
import Card from '../components/Card';
import TableInvestment from '../components/Investments/TableInvestment';




export default function Investments() {
  const [showInvestModal, setShowInvestModal] = useState(false);


  return (
    <div className="layout-body">
      <div className="investments">
          <div className="m-auto text-center ">
            <button className="btn btn-warning mmt-3" onClick={() => setShowInvestModal(true)}>
              + New Investment
            </button>
            <InvestForm
              show={showInvestModal}
              onClose={() => setShowInvestModal(false)}
              title="Add New Investment"
              currentUser="Admin"
            />
          </div>
          <hr></hr>

        <div className="row">


          <div className="col-md-12">
            <TableInvestment />
          </div>
        </div>
      </div>

    </div>
  )
}
