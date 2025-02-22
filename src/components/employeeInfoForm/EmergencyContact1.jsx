import React from 'react'
import InputText from '../formElements/InputText';
import Button from '../formElements/Button';

export default function EmergencyContact1() {
    return (
        <div id='emergencyContact1'>
            <h4>Emergency Contact-1</h4>
            <hr></hr>
            <div className="row">
                <InputText
                    htmlFor="contact1"
                    star="*"
                    labelName=" Contact-1"
                    type="text"
                    idName="contact1"
                    inputName="contact1"
                    // inputVal=""
                    required="required"
                // eventHandler = ""
                />
                <InputText
                    htmlFor="contact1Relation"
                    star="*"
                    labelName="Relation"
                    type="text"
                    idName="contact1Relation"
                    inputName="contact1Relation"
                    // inputVal=""
                    required="required"
                // eventHandler = ""
                />
            </div>

            <div className="row">
                <InputText
                    htmlFor="contact1DNo"
                    star="*"
                    labelName=" D.No / Street"
                    type="text"
                    idName="contact1DNo"
                    inputName="contact1DNo"
                    // inputVal=""
                    required="required"
                // eventHandler = ""
                />

                <InputText
                    htmlFor="contact1Village"
                    star="*"
                    labelName=" Village / Town"
                    type="text"
                    idName="contact1Village"
                    inputName="contact1Village"
                    // inputVal=""
                    required="required"
                // eventHandler = ""
                />
            </div>

            <div className="row">
                <InputText
                    htmlFor="contact1Mandal"
                    star="*"
                    labelName=" Mandal"
                    type="text"
                    idName="contact1Mandal"
                    inputName="contact1Mandal"
                    // inputVal=""
                    required="required"
                // eventHandler = ""
                />

                <InputText
                    htmlFor="contact1State"
                    star="*"
                    labelName="State"
                    type="text"
                    idName="contact1State"
                    inputName="contact1State"
                    // inputVal=""
                    required="required"
                // eventHandler = ""
                />
            </div>

            <div className="row">
                <InputText
                    htmlFor="contact1Mobile1"
                    star="*"
                    labelName="Mobile-1"
                    type="number"
                    idName="contact1Mobile1"
                    inputName="contact1Mobile1"
                    // inputVal=""
                    required="required"
                // eventHandler = ""
                />
                <InputText
                    htmlFor="contact1Mobile2"
                    star="*"
                    labelName="Mobile-2"
                    type="number"
                    idName="contact1Mobile2"
                    inputName="contact1Mobile2"
                    // inputVal=""
                    required="required"
                // eventHandler = ""
                />
            </div>
            <Button
                btnType="button"
                btnID="contact1NextBtn"
                btnClass="btn primery"
                btnText="Next"
            // clickHandler = {}
            />

            <Button
                btnType="button"
                btnID="contact1PreBtn"
                btnClass="btn primery"
                btnText="Previous"
            // clickHandler = {}
            />



        </div>
    )
}
