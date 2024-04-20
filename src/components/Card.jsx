import React from 'react'

export default function Card(props) {
  return (
    <div className='card'>
        <div className="card-header">
           <h4><img src={props.invest} alt={props.investAlt} /> Investment</h4>
        </div>
        <div className="card-footer">
            asdf
        </div>
      
    </div>
  )
}
