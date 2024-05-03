import React, { useState } from "react";
import InvestModal from "./InvestModal";
import ThankyouModal from "./ThankyouModal";

import firebaseDB from '../firebase';

export default function InvestForm() {

    // Form Empty Data
    const emptyFormData = {
        investor: "",
        invest_date: "",
        invest_amount: "",
        invest_to: "",
        invest_reference: "",
        invest_purpose: "",
        invest_comments: "",
    }

    const [formData, setFormData] = useState(emptyFormData);

    // max date validation is today
    const today = new Date().toISOString().split('T')[0];

    const { investor, invest_date, invest_amount, invest_to, invest_reference, invest_purpose, invest_comments } = formData;


    const chandHandler = (e) => {
        setFormData({ ...formData, [e.target.name]: [e.target.value] });
    }
    const blurHandler = (e) => {
        const changeCls = e.target.parentNode.classList;
        if (e.target.value === "") {
            changeCls.add("error")
        } else if (e.target.name === "invest_amount" && e.target.value <= 0) {
            changeCls.add("error");

        } else {
            changeCls.remove("error")
        }

    }

    const [showModal, setShowModal] = useState(false);
    const [showThankModal, setShowThankModal] = useState(false)
    const addModalClass = "modal show";


    // Form Submit and show confirmation modal
    const submitForm = e => {
        e.preventDefault();
        setShowModal(!showModal)
    }

    // To Remove Invest modal form the dom
    const closeModal = () => {
        setShowModal(false);
        document.getElementById("investor").focus();
    }

    // Save Data to Database function
    // todo: Database funcanality still in progress

    const saveFuncation = async (e) => {
        e.preventDefault();
        await firebaseDB.child("Investments").push(formData, 
        err => {
            if(err) {
                alert("Error")
            }
        }
        );
        setShowThankModal(!showThankModal);
        setShowModal(false);
        setFormData(emptyFormData);
    }

    // close Thank modal
    const closeThankyou = (e) => {
        e.preventDefault();
        setShowThankModal(!showThankModal)
    }



    return (
        <div className='form-wrapper'>
            <form name="investForm" id="investForm" onSubmit={submitForm}>
                <div className="row">
                    <div className="col">
                        {/* Investro Name */}
                        <label htmlFor="investor" className="form-label"><span className="star">*</span>Select Investor</label>
                        <select className="form-select" required id="investor" name="investor" value={investor} onChange={chandHandler} onBlur={blurHandler}>
                            <option value="">Select Investor</option>
                            <option value="Suresh">Suresh</option>
                            <option value="Prakash">Prakash</option>
                            <option value="Sudheer">Sudheer</option>
                            <option value="Others">Others</option>
                        </select>
                        <p className="error-msg">Select Investor</p>
                    </div>
                    <div className="col">
                        {/* Investment Date */}
                        <label htmlFor="invest_date" className="form-label"><span className="star">*</span>Investment Date:</label>
                        <input type="date" className="form-control" id="invest_date" name="invest_date" required value={invest_date} min="2023-12-01" max={today} onChange={chandHandler} onBlur={blurHandler} />
                        <p className="error-msg">Select Date</p>
                    </div>
                </div>

                <div className="row">
                    <div className="col">
                        {/* Investment Amount */}
                        <label htmlFor="invest_amount" className="form-label"><span className="star">*</span>Amount:</label>
                        <input type="number" min={0} className="form-control " id="invest_amount" name="invest_amount" required value={invest_amount} onChange={chandHandler} onBlur={blurHandler} />
                        <p className="error-msg">Enter Valid Amount</p>
                    </div>
                    <div className="col">
                        {/* Invest to which bank */}
                        <label htmlFor="invest_to" className="form-label"><span className="star">*</span>To:</label>
                        <select className="form-select" required id="invest_to" name="invest_to" value={invest_to} onChange={chandHandler} onBlur={blurHandler}>
                            <option value="">Select To</option>
                            <option value="sbiValluru">S.B.I Valluru</option>
                            <option value="sbiHyd">S.B.I Hyd</option>
                            <option value="hdfc">HDFC</option>
                            <option value="others">Others</option>
                        </select>
                        <p className="error-msg">Select Transfer to</p>
                    </div>
                </div>

                <div className="row">
                    <div className="col">
                        {/* Investment Reference No */}
                        <label htmlFor="invest_reference" className="form-label">Reference No:</label>
                        <input type="text" className="form-control" id="invest_reference" name="invest_reference" value={invest_reference} onChange={chandHandler} />
                    </div>
                    <div className="col">
                        {/* Investment Purpose */}
                        <label htmlFor="invest_purpose" className="form-label">Purpose:</label>
                        <input type="text" className="form-control" id="invest_purpose" name="invest_purpose" value={invest_purpose} onChange={chandHandler} />
                    </div>

                </div>

                <div className="row">
                    <div className="col">
                        <label htmlFor="invest_comments">Comments:</label>
                        <textarea className="form-control" rows="5" id="invest_comments" name="invest_comments" value={invest_comments} onChange={chandHandler}></textarea>
                    </div>
                </div>

                <div className="row">
                    <div className="col">
                        <button type="submit" className="btn">Submit</button>

                    </div>
                </div>
            </form>

            {showModal &&
                <InvestModal
                    modalClass={addModalClass}
                    cancleFun={closeModal}
                    saveFun={saveFuncation}
                    name={formData.investor}
                    amount={formData.invest_amount}
                    date={formData.invest_date}
                />}

            {showThankModal &&
                <ThankyouModal
                    modalClass={addModalClass}
                    cancleFun={closeThankyou}
                />}
        </div>
    )
}
