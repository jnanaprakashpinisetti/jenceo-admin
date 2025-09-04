import React, { useState, useEffect } from 'react';
import InvestForm from '../components/Investments/InvestForm';
import Card from '../components/Card';
import TableInvestment from '../components/Investments/TableInvestment';



export default function Investments() {


  return (
    <div className="layout-body">
      <div className="container-fluid investments">
        <div className="row">
          <div className="col-md-3">
            <h4>Add Investment Details</h4>
            <InvestForm />
          </div>
          <div className="col-md-2">
            <h4>Individual Details</h4>
            <Card
              amount={"Suresh"}
              title1={"Jan"}
              amount1={2000}
              title2={"Feb"}
              amount2={2000}
              title3={"Mar"}
              amount3={1000}
            />
            <Card
              amount={"Suresh"}
              title1={"Jan"}
              amount1={2000}
              title2={"Feb"}
              amount2={2000}
              title3={"Mar"}
              amount3={1000}
            />
            <Card
              amount={"Suresh"}
              title1={"Jan"}
              amount1={2000}
              title2={"Feb"}
              amount2={2000}
              title3={"Mar"}
              amount3={1000}
            />
          </div>
          <div className="col-md-7">
            <h4>All Investment Details</h4>
            <TableInvestment />
          </div>
        </div>
      </div>

    </div>
  )
}
