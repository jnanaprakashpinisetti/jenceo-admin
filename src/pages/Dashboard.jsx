import React from 'react'
 import firebaseDB from "../firebase";
import InvestmentCard from '../components/DashBoard/InvestmentCard';
import WorkerSalaryCard from '../components/DashBoard/WorkerSalaryCard';
import ClientPaymentCard from '../components/DashBoard/ClientPaymentCard';
import PettyCashCard from '../components/DashBoard/PettyCashCard';
import StaffSalaryCard from '../components/DashBoard/StaffSalaryCard';
import AssetsCard from '../components/DashBoard/AssetsCard';
import ResultsCard from '../components/DashBoard/ResultsCard';







export default function Dashboard() {
  return (
    <div className='layout-body'>
      <div className="container-fulid">
        <div className="row">
          <div className="col-md-4">
            <InvestmentCard />
          </div>
          <div className="col-md-4">
            <WorkerSalaryCard />
          </div>
          <div className="col-md-4">
            <ClientPaymentCard />
          </div>
          <div className="col-md-4">
            <PettyCashCard />
          </div>
          <div className="col-md-4">
            <StaffSalaryCard />
          </div>
          <div className="col-md-4">
            <AssetsCard />
          </div>
          <div className="col-md-6">
            <ResultsCard />
          </div>
        </div>
      </div>
    </div>
  )
}
