import React, { useState, useEffect } from 'react';
import InvestForm from '../components/Investments/InvestForm';
import Card from '../components/Card';
import TableInvestment from '../components/Investments/TableInvestment';



export default function Investments() {


  return (
    <div className="layout-body">
      <div className="investments">
        <div className="row">
          <div className="col-md-4">
            <h4>Add Investment Details</h4>
            <InvestForm />
          </div>
          
          <div className="col-md-8">
            <h4>All Investment Details</h4>
            <TableInvestment />
          </div>
        </div>
      </div>

    </div>
  )
}
