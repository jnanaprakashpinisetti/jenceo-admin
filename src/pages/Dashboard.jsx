import React from 'react';
import { NavLink } from 'react-router-dom';

import Card from '../components/Card'

export default function Dashboard() {
  return (
    <div className="layout-body">

      <h2>JenCeo Admin Dash Board</h2>
      <div className="card-wrapper">
        <NavLink to='Investments'>  <Card /></NavLink>
        <Card />
        <Card />
        <Card />
        <Card />
        <Card />
      </div>

    </div>
  )
}
