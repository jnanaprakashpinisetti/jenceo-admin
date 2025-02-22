import React from 'react'
import InputText from '../formElements/InputText';
import Button from '../formElements/Button';

export default function EmergencyContact2() {
    return (
        <div id='emergencyContact2'>
            <h4>Emergency Contact-2</h4>
            <hr></hr>
            <div className="row">
                <InputText
                    htmlFor="contact2"
                    // star="*"
                    labelName=" Contact-2"
                    type="text"
                    idName="contact2"
                    inputName="contact2"
                // inputVal=""
                // required="required"
                // eventHandler = ""
                />
                <InputText
                    htmlFor="contact2Relation"
                    // star="*"
                    labelName="Relation"
                    type="text"
                    idName="contact2Relation"
                    inputName="contact2Relation"
                // inputVal=""
                // required="required"
                // eventHandler = ""
                />
            </div>

            <div className="row">
                <InputText
                    htmlFor="contact2DNo"
                    // star="*"
                    labelName=" D.No / Street"
                    type="text"
                    idName="contact2DNo"
                    inputName="contact2DNo"
                // inputVal=""
                // required="required"
                // eventHandler = ""
                />

                <InputText
                    htmlFor="contact2Village"
                    // star="*"
                    labelName=" Village / Town"
                    type="text"
                    idName="contact2Village"
                    inputName="contact2Village"
                // inputVal=""
                // required="required"
                // eventHandler = ""
                />
            </div>

            <div className="row">
                <InputText
                    htmlFor="contact2Mandal"
                    // star="*"
                    labelName=" Mandal"
                    type="text"
                    idName="contact2Mandal"
                    inputName="contact2Mandal"
                // inputVal=""
                // required="required"
                // eventHandler = ""
                />

                <InputText
                    htmlFor="contact2State"
                    // star="*"
                    labelName="State"
                    type="text"
                    idName="contact2State"
                    inputName="contact2State"
                // inputVal=""
                // required="required"
                // eventHandler = ""
                />
            </div>

            <div className="row">
                <InputText
                    htmlFor="contact2Mobile1"
                    // star="*"
                    labelName="Mobile-1"
                    type="number"
                    idName="contact2Mobile1"
                    inputName="contact2Mobile1"
                // inputVal=""
                // required="required"
                // eventHandler = ""
                />
                <InputText
                    htmlFor="contact2Mobile2"
                    // star="*"
                    labelName="Mobile-2"
                    type="number"
                    idName="contact2Mobile2"
                    inputName="contact2Mobile2"
                // inputVal=""
                // required="required"
                // eventHandler = ""
                />
            </div>
            <Button
                btnType="button"
                btnID="contact2NextBtn"
                btnClass="btn primery"
                btnText="Next"
            // clickHandler = {}
            />

            <Button
                btnType="button"
                btnID="contact2PreBtn"
                btnClass="btn primery"
                btnText="Previous"
            // clickHandler = {}
            />



        </div>
    )
}
