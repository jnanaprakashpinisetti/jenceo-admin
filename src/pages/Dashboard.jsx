import React from 'react'
import InvestmentCard from '../components/DashBoard/InvestmentCard'


export default function Dashboard() {
  return (
    <div className='layout-body'>
      <div className="container-fulid">
        <div className="row">
          <div className="col-md-12">

          <InvestmentCard />
          </div>
        </div>
      </div>
    </div>
  )
}
