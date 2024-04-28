import React from 'react'
import InvestForm from '../components/InvestForm'
import Card from '../components/Card'
import TableInvestment from '../components/TableInvestment'

export default function Investments() {
  return (
    <div className="layout-body">
      <div className="container-fluid investments">
        <div className="row">
          <div className="col-md-3">
            <InvestForm />
          </div>
          <div className="col-md-6">
          <div className="card-wrapper">
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
          <TableInvestment/>
          </div>
        </div>
      </div>

    </div>
  )
}
