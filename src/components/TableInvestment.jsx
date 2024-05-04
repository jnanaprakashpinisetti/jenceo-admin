import React from 'react';
import editIcon from '../assets/eidt.svg';
import deleteIcon from '../assets/delete.svg';

export default function TableInvestment({
    sno,
    investor,
    invest_date,
    invest_amount,
    invest_comments
}) {
    return (
        <>
            <table className="table table-dark table-hover">
                <thead>
                    <tr>
                        <th>S No</th>
                        <th>Name</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Comments</th>
                        <th className='action'>Edit</th>
                        <th className='action'>Delete</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>{sno}</td>
                        <td>{investor}</td>
                        <td>{invest_date}</td>
                        <td>{invest_amount}</td>
                        <td>{invest_comments}</td>
                        <td className='action' title='Edit'><img src={editIcon} alt="edit Icon" /></td>
                        <td className='action' title='Delete'><img src={deleteIcon} alt="Delete Icon" /></td>
                    </tr>


                </tbody>
            </table>

        </>
    )
}
