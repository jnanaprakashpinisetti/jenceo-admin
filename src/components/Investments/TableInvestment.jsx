import React, { useState, useEffect } from 'react';
import editIcon from '../../assets/eidt.svg';
import deleteIcon from '../../assets/delete.svg';
import viewIcon from '../../assets/view.svg';

import firebaseDB from '../../firebase';
import InvestModal from './InvestModal';

export default function TableInvestment() {

    const [getInvestData, setGetInvestData] = useState({});
    const [showModal, setshowModal] = useState(false)

    // displaying data in UI

    useEffect(() => {
        firebaseDB.child("Investments").on("value", details => {
            setGetInvestData(details.val());
            console.log(details.val());
        })
    }, [])

    const viewData = (d) => {

    }

    // Delete data from UI
    const deleteHandler = item => {
        // Retrieve the item's data before deleting it
        firebaseDB.child(`Investments/${item}`).once('value', snapshot => {
            const deletedItemData = snapshot.val();
            alert(` You are deleting Below Data
            Name: ${deletedItemData.investor}
            Amount: ${deletedItemData.invest_amount}
            Date: ${deletedItemData.invest_date}
            `
            );

            // Remove the item from the database
            firebaseDB.child(`Investments/${item}`).remove(error => {
                if (error) {
                    // Display an alert with the item's data if deletion fails
                    alert(`Error deleting item: ${JSON.stringify(deletedItemData)}`);
                }
            });
        });
    };

    const showDeletModal = () => {
        setshowModal(!showModal)
    }

    const closeModal = () => {
        setshowModal(!showModal)
    }
    return (
        <>
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
                                {/* <td className='action' title='Delete' onClick={showDeletModal}><img src={deleteIcon} alt="Delete Icon" /></td> */}
                                <td className='action' title='Edit'><img src={editIcon} alt="edit Icon" /></td>
                                <td className='action' title='View Details' onClick={() => viewData(item)}><img src={viewIcon} alt="View Icon" /></td>
                            </tr>
                        )}
                    <tr>
                        <td colSpan={3}>Total</td>
                        <td colSpan={4}><strong></strong></td>
                    </tr>
                </tbody>

            </table>

            {showModal && <InvestModal
                cancleFun={closeModal}
                name
                amount
                date
                actionText="Delete"
                actionFun={deleteHandler}

            />}

        </>
    )
}
