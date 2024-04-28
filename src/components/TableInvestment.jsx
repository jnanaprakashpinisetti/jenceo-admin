import React from 'react';
import editIcon from '../assets/eidt.svg';

export default function TableInvestment() {
    return (
        <>
            <table className="table table-dark table-hover">
                <thead>
                    <tr>
                        <th>S No</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>To</th>
                        <th>Ref No</th>
                        <th>Purpose</th>
                        <th>Comments</th>
                        <th>Edit</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>1</td>
                        <td>12-05-2024</td>
                        <td>2000</td>
                        <td>S.B.I</td>
                        <td>123</td>
                        <td>Invest</td>
                        <td>Loremipusm</td>
                        <td><img src={editIcon} alt="edit Icon" /></td>
                    </tr>
                    <tr>
                        <td>1</td>
                        <td>12-05-2024</td>
                        <td>2000</td>
                        <td>S.B.I</td>
                        <td>123</td>
                        <td>Invest</td>
                        <td>Loremipusm</td>
                        <td><img src={editIcon} alt="edit Icon" /></td>
                    </tr>
                    <tr>
                        <td>1</td>
                        <td>12-05-2024</td>
                        <td>2000</td>
                        <td>S.B.I</td>
                        <td>123</td>
                        <td>Invest</td>
                        <td>Loremipusm</td>
                        <td><img src={editIcon} alt="edit Icon" /></td>
                    </tr>
                    <tr>
                        <td>1</td>
                        <td>12-05-2024</td>
                        <td>2000</td>
                        <td>S.B.I</td>
                        <td>123</td>
                        <td>Invest</td>
                        <td>Loremipusm</td>
                        <td><img src={editIcon} alt="edit Icon" /></td>
                    </tr>

                </tbody>
            </table>

        </>
    )
}
