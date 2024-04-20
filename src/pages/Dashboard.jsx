import React from 'react';
import { NavLink } from 'react-router-dom';

import invest from '../assets/invest-blue.svg';
import profit from '../assets/profit-blue.svg';
import due from '../assets/due-blue.svg';
import stock from '../assets/stock-blue.svg';

import Card from '../components/Card';
import Table from '../components/Table';

export default function Dashboard() {
  return (
    <div className="layout-body">

      <h2>JenCeo Admin Dash Board</h2>
      <div className="card-wrapper">
        <NavLink to='Investments'>
          <Card
            icon={invest}
            title='Investment'
            amount={5000}
            title1='Name-1'
            amount1={5000}
            title2='Name-2'
            amount2={5000}
            title3='Name-3'
            amount3={5000} 
          />
        </NavLink>
        <Card
            icon={invest}
            title='Investment'
            amount={5000}
            title1='Name-1'
            amount1={5000}
            title2='Name-2'
            amount2={5000}
            title3='Name-3'
            amount3={5000} 
          />
                    <Card
            icon={invest}
            title='Investment'
            amount={5000}
            title1='Name-1'
            amount1={5000}
            title2='Name-2'
            amount2={5000}
            title3='Name-3'
            amount3={5000} 
          />
                    <Card
            icon={invest}
            title='Investment'
            amount={5000}
            title1='Name-1'
            amount1={5000}
            title2='Name-2'
            amount2={5000}
            title3='Name-3'
            amount3={5000} 
          />
                    <Card
            icon={invest}
            title='Investment'
            amount={5000}
            title1='Name-1'
            amount1={5000}
            title2='Name-2'
            amount2={5000}
            title3='Name-3'
            amount3={5000} 
          />
                    <Card
            icon={invest}
            title='Investment'
            amount={5000}
            title1='Name-1'
            amount1={5000}
            title2='Name-2'
            amount2={5000}
            title3='Name-3'
            amount3={5000} 
          />
        
      </div>

      <Table/>

    </div>
  )
}
