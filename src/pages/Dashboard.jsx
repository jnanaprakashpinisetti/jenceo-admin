import React from 'react'
import InvestmentCard from '../components/DashBoard/InvestmentCard';
import WorkerSalaryCard from '../components/DashBoard/WorkerSalaryCard';



export default function Dashboard() {
  return (
    <div className='layout-body'>
      <div className="container-fulid">
        <div className="row">
          <div className="col-md-3">
            <InvestmentCard />
          </div>
          <div className="col-md-3">
            <WorkerSalaryCard />
          </div>
          <div className="col-md-3">
          </div>
          <div className="col-md-3">
          </div>
        </div>
      </div>
    </div>
  )
}
