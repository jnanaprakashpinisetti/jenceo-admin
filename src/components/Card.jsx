import React from 'react';
import invest from '../assets/invest-blue.svg';

export default function Card(props) {
  return (
    <div className='card'>
      <div className="card-header">
        <h6><img src={props.icon} alt={props.iconALt} /> {props.title}</h6>
        <h3>{props.amount}</h3>
      </div>
      <div className="card-footer">
        <div>
          <span>{props.title1}</span>
          <p> {props.amount1} </p>
        </div>
        <div>
          <span>{props.title2}</span>
          <p> {props.amount2} </p>
        </div>
        <div>
          <span>{props.title3}</span>
          <p> {props.amount3} </p>
        </div>
      </div>

    </div>
  )
}
