import React from 'react'
import InputText from '../formElements/InputText';
import Button from '../formElements/Button';

export default function EmergencyContact3() {
    return (
        <div id='emergencyContact3'>
            <div className="row">
                <InputText
                    htmlFor="contact3"
                     // star="*"
                    labelName=" Contact-3"
                    type="text"
                    idName="contact3"
                    inputName="contact3"
                    // inputVal=""
                    // required="required"
                // eventHandler = ""
                />
                <InputText
                    htmlFor="contact3Relation"
                     // star="*"
                    labelName="Relation"
                    type="text"
                    idName="contact3Relation"
                    inputName="contact3Relation"
                    // inputVal=""
                    // required="required"
                // eventHandler = ""
                />
            </div>

            <div className="row">
                <InputText
                    htmlFor="contact3DNo"
                     // star="*"
                    labelName=" D.No / Street"
                    type="text"
                    idName="contact3DNo"
                    inputName="contact3DNo"
                    // inputVal=""
                    // required="required"
                // eventHandler = ""
                />

                <InputText
                    htmlFor="contact3Village"
                     // star="*"
                    labelName=" Village / Town"
                    type="text"
                    idName="contact3Village"
                    inputName="contact3Village"
                    // inputVal=""
                    // required="required"
                // eventHandler = ""
                />
            </div>

            <div className="row">
                <InputText
                    htmlFor="contact3Mandal"
                     // star="*"
                    labelName=" Mandal"
                    type="text"
                    idName="contact3Mandal"
                    inputName="contact3Mandal"
                    // inputVal=""
                    // required="required"
                // eventHandler = ""
                />

                <InputText
                    htmlFor="contact3State"
                     // star="*"
                    labelName="State"
                    type="text"
                    idName="contact3State"
                    inputName="contact3State"
                    // inputVal=""
                    // required="required"
                // eventHandler = ""
                />
            </div>

            <div className="row">
                <InputText
                    htmlFor="contact3Mobile1"
                     // star="*"
                    labelName="Mobile-1"
                    type="number"
                    idName="contact3Mobile1"
                    inputName="contact3Mobile1"
                    // inputVal=""
                    // required="required"
                // eventHandler = ""
                />
                <InputText
                    htmlFor="contact3Mobile2"
                     // star="*"
                    labelName="Mobile-2"
                    type="number"
                    idName="contact3Mobile2"
                    inputName="contact3Mobile2"
                    // inputVal=""
                    // required="required"
                // eventHandler = ""
                />
            </div>
            <Button
                btnType="button"
                btnID="contact3NextBtn"
                btnClass="btn primery"
                btnText="Next"
                 // clickHandler = {}
            />

            <Button
                btnType="button"
                btnID="contact3PreBtn"
                btnClass="btn primery"
                btnText="Previous"
                 // clickHandler = {}
            />



        </div>
    )
}
