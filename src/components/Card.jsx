import React from 'react';
import invest from '../assets/invest-blue.svg';

export default function Card({
  icon,
  iconALt,
  title,
  amount,
  title1,
  amount1,
  title2,
  amount2,
  title3,
  amount3
}) {
  return (
    <div className='card'>
      <div className="card-header">
        <h6><img src={icon} alt={iconALt} /> {title}</h6>
        <h3>{amount}</h3>
      </div>
      <div className="card-footer">
        <div>
          <span>{title1}</span>
          <p> {amount1} </p>
        </div>
        <div>
          <span>{title2}</span>
          <p> {amount2} </p>
        </div>
        <div>
          <span>{title3}</span>
          <p> {amount3} </p>
        </div>
      </div>

    </div>
  )
}
