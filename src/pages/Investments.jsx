import React, { useState, useEffect } from 'react';
import InvestForm from '../components/InvestForm';
import Card from '../components/Card';
import TableInvestment from '../components/TableInvestment';

import editIcon from '../assets/eidt.svg';
import deleteIcon from '../assets/delete.svg';
import viewIcon from '../assets/view.svg';

import firebaseDB from '../firebase';


export default function Investments() {

  const [getInvestData, setGetInvestData] = useState({});

  // displaying data in UI
  
  useEffect(() => {
    firebaseDB.child("Investments").on("value", details => {
      setGetInvestData(details.val());
      console.log(details.val());
    })
  }, [])

 // Delete data from UI
  const deleteHandler = item => {
    firebaseDB.child(`Investments/${item}`).remove(
      error => {
        if(error) {
          alert("Error")
        }
      }
    );
  }

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

            {/* {Object.keys(getInvestData).map(item =>
              <TableInvestment
                key={item}
                investor={getInvestData[item].investor}
                invest_date={getInvestData[item].invest_date}
                invest_amount={getInvestData[item].invest_amount}
                invest_comments={getInvestData[item].invest_comments}
              />
            )} */}
            <table className="table table-dark table-hover">
              <thead>
                <tr>
                  <th className='sno'>S No</th>
                  <th className='name'>Name</th>
                  <th className='date'>Date</th>
                  <th className='amount'>Amount</th>
                  <th className='action'>Delete</th>
                  <th className='action'>Edit</th>
                  <th className='action'>View</th>
                </tr>
              </thead>
              <tbody>
                {getInvestData &&

                  Object.keys(getInvestData).map((item, index) =>
                    <tr key={index}>
                      <td className='sno'> {index + 1}</td>
                      <td className='name'>{getInvestData[item].investor}</td>
                      <td className='date'>{getInvestData[item].invest_date}</td>
                      <td className='amount'>{getInvestData[item].invest_amount}</td>
                      <td className='action' title='Delete' onClick={() => deleteHandler(item)}><img src={deleteIcon} alt="Delete Icon" /></td>
                      <td className='action' title='Edit'><img src={editIcon} alt="edit Icon" /></td>
                      <td className='action' title='View Details'><img src={viewIcon} alt="View Icon" /></td>
                    </tr>
                  )}
                <tr>
                  <td colSpan={3}>Total</td>
                  <td colSpan={4}><strong></strong></td>
                </tr>
              </tbody>

            </table>


          </div>
        </div>
      </div>

    </div>
  )
}
