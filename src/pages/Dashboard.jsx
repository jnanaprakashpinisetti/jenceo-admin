import React from 'react'
import InvestmentCard from '../components/DashBoard/InvestmentCard';
import WorkerSalaryCard from '../components/DashBoard/WorkerSalaryCard';
import ClientPaymentCard from '../components/DashBoard/ClientPaymentCard';
import PettyCashCard from '../components/DashBoard/PettyCashCard';





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
            <ClientPaymentCard />
          </div>
          <div className="col-md-3">
            <PettyCashCard />
          </div>
        </div>
      </div>
    </div>
  )
}
